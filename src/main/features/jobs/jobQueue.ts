import { BrowserWindow } from 'electron';
import { Job, JobStatus, RewriteMode, Template } from '../../../shared/types';
import { getAiRewriter } from '../ai/aiRewriter';
import { getHeadlineAnalyzer } from '../ai/HeadlineAnalyzer';
import { getDownloader } from '../downloader/ytDlpDownloader';
import { getCropEngine } from '../crop/motionCropEngine';
import { getOcrEngine } from '../ocr/tesseractOcrEngine';
import { getRenderer } from '../renderer/ffmpegRenderer';
import { getConfigStore } from '../storage/configStore';
import { getTemplateStore } from '../storage/templateStore';
import { getProcessRegistry } from './processRegistry';
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

  public createJobsFromLocalFiles(filePaths: string[], templateId: string, rewriteMode: RewriteMode): void {
    const template = getTemplateStore().getTemplate(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    const newJobs: Job[] = filePaths.map((filePath) => ({
      id: `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      status: 'Waiting',
      sourceUrl: `local://${path.basename(filePath)}`,
      localVideoPath: filePath,
      downloadPath: filePath, // pre-set so runJob skips download
      selectedTemplateId: templateId,
      rewriteMode: rewriteMode,
      progress: 0,
      logs: [`Job initialized from local file: ${path.basename(filePath)}. Template: ${template.name}`],
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
      getProcessRegistry().kill(id);
      if (job.status === 'Downloading' || job.status === 'Cropping' || job.status === 'OCR' || job.status === 'Rewriting' || job.status === 'Rendering') {
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

    // Ignore progress updates if job was already terminated
    if (job.status === 'Failed' || job.status === 'Completed') {
      return;
    }

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
      let videoPath: string;

      if (job.localVideoPath && job.downloadPath) {
        // Local file upload — skip download phase entirely
        videoPath = job.localVideoPath;
        this.updateJobStatus(job.id, 'Cropping', 0, `Using local file: ${path.basename(videoPath)}`);
      } else {
        // 1. Download Phase
        this.updateJobStatus(job.id, 'Downloading', 0, 'Starting video download...');
        const downloader = getDownloader();
        videoPath = await downloader.download(job.sourceUrl, job.id, (prog) => {
          this.updateJobStatus(
            job.id,
            'Downloading',
            Math.round(prog.percentage),
            `Downloading: ${prog.percentage}% (${prog.speed}, ETA: ${prog.eta})`
          );
        });
        job.downloadPath = videoPath;
        this.updateJobStatus(job.id, 'Downloading', 100, `Download finished. Saved to: ${videoPath}`);

        if (this.isJobCancelled(job.id)) return;
      }

      // 2. Crop Phase
      this.updateJobStatus(job.id, 'Cropping', 0, 'Detecting active video area...');
      const cropEngine = getCropEngine();
      const activeArea = await cropEngine.detectActiveVideoArea(videoPath, job.id);
      this.updateJobStatus(
        job.id,
        'Cropping',
        50,
        `Active area detected: x=${activeArea.x}, y=${activeArea.y}, w=${activeArea.width}, h=${activeArea.height}. Cropping video...`
      );

      const croppedPath = path.join(path.dirname(videoPath), `${job.id}_cropped.mp4`);
      await cropEngine.cropVideo(videoPath, activeArea, croppedPath, job.id);
      job.croppedVideoPath = croppedPath;
      this.updateJobStatus(job.id, 'Cropping', 100, `Cropping completed successfully. Saved to: ${croppedPath}`);

      if (this.isJobCancelled(job.id)) return;

      // 3. OCR Phase
      this.updateJobStatus(job.id, 'OCR', 0, 'Extracting headline from video using OCR...');
      const ocrEngine = getOcrEngine();
      const headline = await ocrEngine.extractText(videoPath, activeArea, job.id);
      job.headline = headline || 'Untitled Reel';
      this.updateJobStatus(job.id, 'OCR', 100, `OCR successful. Extracted headline: "${job.headline}"`);

      if (this.isJobCancelled(job.id)) return;

      // 4. AI Rewrite & Structure Analysis Phase
      this.updateJobStatus(job.id, 'Rewriting', 0, `Processing headline rewrite (mode: ${job.rewriteMode})...`);
      let textToAnalyze = job.headline || '';

      const template = getTemplateStore().getTemplate(job.selectedTemplateId);
      if (!template) {
        throw new Error(`Template not found: ${job.selectedTemplateId}`);
      }

      if (job.rewriteMode !== 'Original') {
        const aiRewriter = getAiRewriter();
        textToAnalyze = await aiRewriter.rewrite(textToAnalyze, job.rewriteMode, {
          aiModel: template.headline.aiModel,
          aiService: template.headline.aiService,
        });
      }

      this.updateJobStatus(job.id, 'Rewriting', 50, `Analyzing and structuring word highlighting...`);
      const headlineAnalyzer = getHeadlineAnalyzer();
      const structuredHeadline = await headlineAnalyzer.analyze(textToAnalyze, {
        customPrompt: template.headline.customPrompt,
        aiModel: template.headline.aiModel,
        aiService: template.headline.aiService,
      });
      job.structuredHeadline = structuredHeadline;
      job.rewrittenHeadline = structuredHeadline.headline;
      this.updateJobStatus(
        job.id,
        'Rewriting',
        100,
        `Headline cleaned and structured successfully: "${job.rewrittenHeadline}"`
      );

      if (this.isJobCancelled(job.id)) return;

      // 5. Render Phase
      this.updateJobStatus(job.id, 'Rendering', 0, 'Composing final video using FFmpeg...');
      const config = getConfigStore().getConfig();
      const outputDir = config.defaultExportDir;
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      const outputVideoPath = path.join(outputDir, `${job.id}_rendered.mp4`);

      // Inject the AI-analyzed word styles into the template for final rendering
      const updatedTemplate = JSON.parse(JSON.stringify(template)) as Template;
      let headlineText = job.rewrittenHeadline || job.headline || '';

      if (job.structuredHeadline) {
        // Flatten all segments to get a single array of styles
        const flatStyles: ('regular' | 'bold' | 'brand-bold')[] = [];
        for (const line of job.structuredHeadline.lines) {
          for (const segment of line) {
            const styleMap: Record<string, 'regular' | 'bold' | 'brand-bold'> = {
              'Regular': 'regular',
              'Bold': 'bold',
              'Brand': 'brand-bold'
            };
            flatStyles.push(styleMap[segment.style] || 'regular');
          }
        }
        updatedTemplate.headline.wordStyles = flatStyles;

        // Use the exact line breaks returned by Gemini by joining lines with newlines
        headlineText = job.structuredHeadline.lines
          .map((line) => line.map((seg) => seg.text).join(' '))
          .join('\n');
      }

      const renderer = getRenderer();
      await renderer.render(
        updatedTemplate,
        job.croppedVideoPath || videoPath,
        headlineText,
        outputVideoPath,
        (progress) => {
          this.updateJobStatus(job.id, 'Rendering', progress, `Rendering: ${progress}%`);
        },
        job.id
      );

      job.outputVideoPath = outputVideoPath;
      this.updateJobStatus(job.id, 'Completed', 100, `Rendering finished! Output saved: ${outputVideoPath}`);
    } catch (error: any) {
      if (this.isJobCancelled(job.id)) return;
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
