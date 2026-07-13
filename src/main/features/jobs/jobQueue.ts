import { BrowserWindow } from 'electron';
import { Job, JobStatus, RewriteMode } from '../../../shared/types';
import { getAiRewriter } from '../ai/aiRewriter';
import { getDownloader } from '../downloader/ytDlpDownloader';
import { getCropEngine } from '../crop/motionCropEngine';
import { getOcrEngine } from '../ocr/tesseractOcrEngine';
import { getRenderer } from '../renderer/ffmpegRenderer';
import { getConfigStore } from '../storage/configStore';
import { getTemplateStore } from '../storage/templateStore';
import * as path from 'path';
import * as fs from 'fs';

export class JobQueue {
  private jobs: Job[] = [];
  private activeJobsCount = 0;
  private isProcessing = false;

  public getJobs(): Job[] {
    return [...this.jobs];
  }

  public createJobs(urls: string[], templateId: string, rewriteMode: RewriteMode): void {
    const template = getTemplateStore().getTemplate(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    const newJobs: Job[] = urls.map((url) => ({
      id: `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      status: 'Waiting',
      sourceUrl: url,
      selectedTemplateId: templateId,
      rewriteMode: rewriteMode,
      progress: 0,
      logs: [`Job initialized. Selected template: ${template.name}`],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }));

    this.jobs.push(...newJobs);
    this.broadcastJobs();
    this.processQueue();
  }

  public controlJob(id: string, action: 'pause' | 'resume' | 'cancel' | 'retry'): void {
    const job = this.jobs.find((j) => j.id === id);
    if (!job) return;

    job.logs.push(`Action requested: ${action}`);
    
    if (action === 'cancel') {
      if (job.status === 'Downloading' || job.status === 'Cropping' || job.status === 'OCR' || job.status === 'Rewriting' || job.status === 'Rendering') {
        // In real app, we would kill the subprocesses here.
        job.status = 'Failed';
        job.errorMessage = 'Job cancelled by user';
        job.logs.push('Job execution cancelled.');
        this.activeJobsCount = Math.max(0, this.activeJobsCount - 1);
      } else {
        job.status = 'Failed';
        job.errorMessage = 'Job cancelled';
      }
    } else if (action === 'retry') {
      if (job.status === 'Failed' || job.status === 'Completed') {
        job.status = 'Waiting';
        job.progress = 0;
        job.errorMessage = undefined;
        job.logs.push('Retrying job...');
      }
    }
    
    job.updatedAt = Date.now();
    this.broadcastJobs();
    this.processQueue();
  }

  public clearCompleted(): Job[] {
    this.jobs = this.jobs.filter((j) => j.status !== 'Completed' && j.status !== 'Failed');
    this.broadcastJobs();
    return this.jobs;
  }

  private broadcastJobs(): void {
    const windows = BrowserWindow.getAllWindows();
    windows.forEach((win) => {
      win.webContents.send('jobs:changed', this.getJobs());
    });
  }

  private updateJobStatus(jobId: string, status: JobStatus, progress: number, log?: string, error?: string): void {
    const job = this.jobs.find((j) => j.id === jobId);
    if (!job) return;

    job.status = status;
    job.progress = progress;
    if (log) {
      job.logs.push(log);
    }
    if (error) {
      job.errorMessage = error;
      job.logs.push(`Error: ${error}`);
    }
    job.updatedAt = Date.now();
    this.broadcastJobs();
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const config = getConfigStore().getConfig();
      const maxConcurrency = config.concurrency || 1;

      while (this.activeJobsCount < maxConcurrency) {
        const nextJob = this.jobs.find((j) => j.status === 'Waiting');
        if (!nextJob) break;

        this.activeJobsCount++;
        this.runJob(nextJob).finally(() => {
          this.activeJobsCount = Math.max(0, this.activeJobsCount - 1);
          this.processQueue();
        });
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private async runJob(job: Job): Promise<void> {
    try {
      // 1. Download Phase
      this.updateJobStatus(job.id, 'Downloading', 0, 'Starting video download...');
      const downloader = getDownloader();
      const videoPath = await downloader.download(job.sourceUrl, job.id, (prog) => {
        // Update download progress
        this.updateJobStatus(
          job.id,
          'Downloading',
          Math.round(prog.percentage),
          `Downloading: ${prog.percentage}% (${prog.speed}, ETA: ${prog.eta})`
        );
      });
      job.downloadPath = videoPath;
      this.updateJobStatus(job.id, 'Downloading', 100, `Download finished. Saved to: ${videoPath}`);

      // Check if job was cancelled during download
      if (this.isJobCancelled(job.id)) return;

      // 2. Crop Phase
      this.updateJobStatus(job.id, 'Cropping', 0, 'Detecting active video area...');
      const cropEngine = getCropEngine();
      const activeArea = await cropEngine.detectActiveVideoArea(videoPath);
      this.updateJobStatus(
        job.id,
        'Cropping',
        50,
        `Active area detected: x=${activeArea.x}, y=${activeArea.y}, w=${activeArea.width}, h=${activeArea.height}. Cropping video...`
      );

      const croppedPath = path.join(path.dirname(videoPath), `${job.id}_cropped.mp4`);
      await cropEngine.cropVideo(videoPath, activeArea, croppedPath);
      job.croppedVideoPath = croppedPath;
      this.updateJobStatus(job.id, 'Cropping', 100, `Cropping completed successfully. Saved to: ${croppedPath}`);

      if (this.isJobCancelled(job.id)) return;

      // 3. OCR Phase
      this.updateJobStatus(job.id, 'OCR', 0, 'Extracting headline from video using OCR...');
      const ocrEngine = getOcrEngine();
      const headline = await ocrEngine.extractText(videoPath, activeArea);
      job.headline = headline || 'Untitled Reel';
      this.updateJobStatus(job.id, 'OCR', 100, `OCR successful. Extracted headline: "${job.headline}"`);

      if (this.isJobCancelled(job.id)) return;

      // 4. AI Rewrite Phase
      this.updateJobStatus(job.id, 'Rewriting', 0, `Rewriting headline using mode: ${job.rewriteMode}...`);
      const aiRewriter = getAiRewriter();
      const rewritten = await aiRewriter.rewrite(job.headline || '', job.rewriteMode);
      job.rewrittenHeadline = rewritten;
      this.updateJobStatus(job.id, 'Rewriting', 100, `Headline ready: "${job.rewrittenHeadline}"`);

      if (this.isJobCancelled(job.id)) return;

      // 5. Render Phase
      this.updateJobStatus(job.id, 'Rendering', 0, 'Composing final video using FFmpeg...');
      const config = getConfigStore().getConfig();
      const outputDir = config.defaultExportDir;
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      const outputVideoPath = path.join(outputDir, `${job.id}_rendered.mp4`);

      const template = getTemplateStore().getTemplate(job.selectedTemplateId);
      if (!template) {
        throw new Error(`Template not found: ${job.selectedTemplateId}`);
      }

      const renderer = getRenderer();
      await renderer.render(
        template,
        job.croppedVideoPath || videoPath,
        job.rewrittenHeadline || job.headline || '',
        outputVideoPath,
        (progress) => {
          this.updateJobStatus(job.id, 'Rendering', progress, `Rendering: ${progress}%`);
        }
      );

      job.outputVideoPath = outputVideoPath;
      this.updateJobStatus(job.id, 'Completed', 100, `Rendering finished! Output saved: ${outputVideoPath}`);
    } catch (error: any) {
      this.updateJobStatus(job.id, 'Failed', 100, undefined, error.message || 'Unknown job failure');
    }
  }

  private isJobCancelled(jobId: string): boolean {
    const job = this.jobs.find((j) => j.id === jobId);
    return !job || job.status === 'Failed';
  }
}

// Singleton
let instance: JobQueue | null = null;
export function getJobQueue(): JobQueue {
  if (!instance) {
    instance = new JobQueue();
  }
  return instance;
}
