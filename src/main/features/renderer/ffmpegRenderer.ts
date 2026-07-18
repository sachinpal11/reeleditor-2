import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { app } from 'electron';
import sharp from 'sharp';
import { IRenderer } from '../../../core/ports/IRenderer';
import { Template } from '../../../shared/types';
import { getConfigStore } from '../storage/configStore';
import { getProcessRegistry } from '../jobs/processRegistry';

export class FfmpegRenderer implements IRenderer {
  private tempDir: string;

  constructor() {
    const userDataPath = app.getPath('userData');
    this.tempDir = path.join(userDataPath, 'temp_render');
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  private cleanTempDir(): void {
    if (fs.existsSync(this.tempDir)) {
      const files = fs.readdirSync(this.tempDir);
      for (const file of files) {
        try {
          fs.unlinkSync(path.join(this.tempDir, file));
        } catch (e) {}
      }
    }
  }

  private escapeXml(unsafe: string): string {
    return unsafe.replace(/[<>&'"]/g, (c) => {
      switch (c) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '&': return '&amp;';
        case '\'': return '&apos;';
        case '"': return '&quot;';
        default: return c;
      }
    });
  }

  private calculateHeadlineHeight(text: string, size: number, width: number): number {
    const avgCharWidth = size * 0.52;
    const maxChars = Math.max(5, Math.floor(width / avgCharWidth));
    
    const lines: string[][] = [];
    if (text.includes('\n')) {
      const textLines = text.split('\n');
      for (const lineText of textLines) {
        const lineWords = lineText.trim().split(/\s+/).filter(Boolean);
        if (lineWords.length > 0) {
          lines.push(lineWords);
        }
      }
    } else {
      const words = text.trim().split(/\s+/).filter(Boolean);
      let currentLine: string[] = [];
      let currentLineLength = 0;
      
      for (const word of words) {
        const wordLen = word.length;
        const spaceLen = currentLine.length > 0 ? 1 : 0;
        if (currentLineLength + spaceLen + wordLen <= maxChars) {
          currentLine.push(word);
          currentLineLength += spaceLen + wordLen;
        } else {
          if (currentLine.length > 0) {
            lines.push(currentLine);
          }
          currentLine = [word];
          currentLineLength = wordLen;
        }
      }
      if (currentLine.length > 0) {
        lines.push(currentLine);
      }
    }
    
    const lineHeight = size * 1.35;
    return Math.round((lines.length - 1) * lineHeight + size * 1.2);
  }

  private async generateHeadlinePng(
    text: string,
    headlineConfig: Template['headline'],
    brandColor: string,
    outputPath: string
  ): Promise<void> {
    const { font, size, color, align, width, height, weight, textStyle, wordStyles = [] } = headlineConfig;
    const avgCharWidth = size * 0.52;
    const maxChars = Math.max(5, Math.floor(width / avgCharWidth));
    
    interface WordWithIndex {
      text: string;
      index: number;
    }
    
    const lines: WordWithIndex[][] = [];
    if (text.includes('\n')) {
      const textLines = text.split('\n');
      let currentWordIndex = 0;
      for (const lineText of textLines) {
        const lineWords = lineText.trim().split(/\s+/).filter(Boolean);
        const line: WordWithIndex[] = [];
        for (const w of lineWords) {
          line.push({ text: w, index: currentWordIndex });
          currentWordIndex++;
        }
        if (line.length > 0) {
          lines.push(line);
        }
      }
    } else {
      const words = text.trim().split(/\s+/).filter(Boolean);
      const wordsWithIndex: WordWithIndex[] = words.map((word, idx) => ({ text: word, index: idx }));
      let currentLine: WordWithIndex[] = [];
      let currentLineLength = 0;
      
      for (const w of wordsWithIndex) {
        const wordLen = w.text.length;
        const spaceLen = currentLine.length > 0 ? 1 : 0;
        if (currentLineLength + spaceLen + wordLen <= maxChars) {
          currentLine.push(w);
          currentLineLength += spaceLen + wordLen;
        } else {
          if (currentLine.length > 0) {
            lines.push(currentLine);
          }
          currentLine = [w];
          currentLineLength = wordLen;
        }
      }
      if (currentLine.length > 0) {
        lines.push(currentLine);
      }
    }
    
    const lineHeight = size * 1.35;
    const computedHeight = Math.max(height || 0, Math.round((lines.length - 1) * lineHeight + size * 1.2));

    const svgLines = lines
      .map((line, idx) => {
        const xCoord = align === 'center' ? width / 2 : align === 'right' ? width : 0;
        const tspanWords = line.map((w) => {
          const style = wordStyles[w.index] || textStyle || (weight === 'Bold' ? 'bold' : 'regular');
          let colorVal = color || '#FFFFFF';
          let weightVal = 'normal';
          
          if (style === 'regular') {
            weightVal = 'normal';
          } else if (style === 'bold') {
            weightVal = 'bold';
          } else if (style === 'brand-bold') {
            weightVal = 'bold';
            colorVal = brandColor || '#6366f1';
          }
          
          return `<tspan fill="${colorVal}" font-weight="${weightVal}">${this.escapeXml(w.text)}</tspan>`;
        }).join(' ');

        return `<tspan x="${xCoord}" dy="${idx === 0 ? 0 : lineHeight}">${tspanWords}</tspan>`;
      })
      .join('');

    const startX = align === 'center' ? width / 2 : align === 'right' ? width : 0;
    
    const svgText = `
      <svg width="${width}" height="${computedHeight}" xmlns="http://www.w3.org/2000/svg">
        <style>
          .headline-text {
            font-family: "${font}", "Inter", "Arial", sans-serif;
            font-size: ${size}px;
            text-anchor: ${align === 'center' ? 'middle' : align === 'right' ? 'end' : 'start'};
            dominant-baseline: hanging;
          }
        </style>
        <text x="${startX}" y="${size * 0.05}" class="headline-text">
          ${svgLines}
        </text>
      </svg>
    `;

    await sharp(Buffer.from(svgText))
      .png()
      .toFile(outputPath);
  }

  public async render(
    template: Template,
    videoPath: string,
    headline: string,
    outputPath: string,
    onProgress: (progress: number) => void,
    jobId?: string
  ): Promise<string> {
    this.cleanTempDir();

    const config = getConfigStore().getConfig();
    const ffmpegPath = config.ffmpegPath || 'ffmpeg';
    const ffprobePath = config.ffprobePath || 'ffprobe';

    // Deep copy template to dynamically adjust layout dimensions and positions for the render
    const updatedTemplate = JSON.parse(JSON.stringify(template)) as Template;

    // Calculate and update the actual height for the given headline text
    const actualHeadlineHeight = this.calculateHeadlineHeight(
      headline,
      updatedTemplate.headline.size,
      updatedTemplate.headline.width
    );
    updatedTemplate.headline.height = actualHeadlineHeight;

    // Fetch the dimensions of the cropped source video using ffprobe
    const dimensionsCmd = `"${ffprobePath}" -v error -select_streams v:0 -show_entries stream=width,height -of default=noprint_wrappers=1:nokey=1 "${videoPath}"`;
    let srcW = 712;
    let srcH = 624;
    try {
      const { execSync } = require('child_process');
      const dims = execSync(dimensionsCmd).toString().trim().split(/\r?\n/);
      srcW = parseInt(dims[0]) || 712;
      srcH = parseInt(dims[1]) || 624;
    } catch (e) {
      console.error('Failed to get source video dimensions using ffprobe:', e);
    }

    // Dynamic scale helper: set video to full canvas width and proportional height
    const canvasW = updatedTemplate.canvas?.width || 1080;
    const renderW = canvasW;
    const renderH = Math.floor(Math.round(canvasW * (srcH / srcW)) / 2) * 2;

    updatedTemplate.video.width = renderW;
    updatedTemplate.video.height = renderH;
    updatedTemplate.video.x = 0;

    // If autoAdjust is active, shift all other blocks accordingly in Y-axis
    if (updatedTemplate.autoAdjust) {
      const blocks: { key: 'headline' | 'video' | 'logo'; y: number; height: number }[] = [
        { key: 'headline', y: updatedTemplate.headline.y, height: updatedTemplate.headline.height },
        { key: 'video', y: updatedTemplate.video.y, height: updatedTemplate.video.height }
      ];
      if (updatedTemplate.logo) {
        blocks.push({ key: 'logo', y: updatedTemplate.logo.y, height: updatedTemplate.logo.height });
      }

      // Sort by vertical position
      blocks.sort((a, b) => a.y - b.y);

      // Re-align with exactly 24px gap using the topmost element as base
      for (let i = 1; i < blocks.length; i++) {
        const prev = blocks[i - 1];
        const curr = blocks[i];
        const newY = prev.y + prev.height + 24;

        if (curr.key === 'headline') {
          updatedTemplate.headline.y = newY;
        } else if (curr.key === 'video') {
          updatedTemplate.video.y = newY;
        } else if (curr.key === 'logo' && updatedTemplate.logo) {
          updatedTemplate.logo.y = newY;
        }
      }

      // Align watermark
      if (updatedTemplate.watermark) {
        const align = updatedTemplate.watermark.align || 'right';
        let targetX = updatedTemplate.video.x + updatedTemplate.video.width - updatedTemplate.watermark.width - 24;

        if (align === 'left') {
          targetX = updatedTemplate.video.x + 24;
        } else if (align === 'center') {
          targetX = updatedTemplate.video.x + (updatedTemplate.video.width - updatedTemplate.watermark.width) / 2;
        }

        updatedTemplate.watermark.y = updatedTemplate.video.y + updatedTemplate.video.height - updatedTemplate.watermark.height - 24;
        updatedTemplate.watermark.x = Math.round(targetX);
      }
    }

    // 1. Generate text overlay PNG using the adjusted layout
    const textOverlayPath = path.join(this.tempDir, 'headline_overlay.png');
    await this.generateHeadlinePng(
      headline,
      updatedTemplate.headline,
      updatedTemplate.brandColor || '#6366f1',
      textOverlayPath
    );

    // 2. Build FFmpeg command arguments
    const inputs: string[] = [];
    const filterGraph: string[] = [];
    let nextInputIdx = 0;

    // Background input (if no path, create a default black background filter in FFmpeg)
    const backgroundInputIdx = nextInputIdx++;
    if (updatedTemplate.backgroundPath && fs.existsSync(updatedTemplate.backgroundPath)) {
      inputs.push('-loop', '1', '-i', updatedTemplate.backgroundPath);
    } else {
      // Create transparent dummy background
      inputs.push('-f', 'lavfi', '-i', `color=c=black:s=1080x1920:d=100`);
    }

    // Video input
    const videoInputIdx = nextInputIdx++;
    inputs.push('-i', videoPath);

    // Setup video scaling filter to scale and pad to fit template's placeholder aspect ratio
    const videoWidth = Math.floor(updatedTemplate.video.width / 2) * 2;
    const videoHeight = Math.floor(updatedTemplate.video.height / 2) * 2;
    filterGraph.push(
      `[${videoInputIdx}:v]scale=${videoWidth}:${videoHeight}:force_original_aspect_ratio=decrease,pad=${videoWidth}:${videoHeight}:(ow-iw)/2:(oh-ih)/2:color=black[scaled_vid]`
    );

    // Overlay video on background
    filterGraph.push(`[${backgroundInputIdx}:v][scaled_vid]overlay=x=${updatedTemplate.video.x}:y=${updatedTemplate.video.y}:shortest=1[v1]`);

    let lastVideoLabel = 'v1';

    // Logo input and overlay
    let logoInputIdx = -1;
    if (updatedTemplate.logoPath && fs.existsSync(updatedTemplate.logoPath) && updatedTemplate.logo) {
      logoInputIdx = nextInputIdx++;
      inputs.push('-loop', '1', '-i', updatedTemplate.logoPath);

      const logoW = Math.floor(updatedTemplate.logo.width / 2) * 2;
      const logoH = Math.floor(updatedTemplate.logo.height / 2) * 2;
      const logoOpacity = updatedTemplate.logo.opacity ?? 1;

      // Adjust logo opacity and scale
      filterGraph.push(
        `[${logoInputIdx}:v]format=rgba,colorchannelmixer=aa=${logoOpacity}[logo_alpha]`,
        `[logo_alpha]scale=${logoW}:${logoH}[scaled_logo]`,
        `[${lastVideoLabel}][scaled_logo]overlay=x=${Math.round(updatedTemplate.logo.x)}:y=${Math.round(updatedTemplate.logo.y)}[v_logo]`
      );
      lastVideoLabel = 'v_logo';
    }

    // Watermark input and overlay
    let watermarkInputIdx = -1;
    if (updatedTemplate.watermarkPath && fs.existsSync(updatedTemplate.watermarkPath) && updatedTemplate.watermark) {
      watermarkInputIdx = nextInputIdx++;
      inputs.push('-loop', '1', '-i', updatedTemplate.watermarkPath);

      const wmW = Math.floor(updatedTemplate.watermark.width / 2) * 2;
      const wmH = Math.floor(updatedTemplate.watermark.height / 2) * 2;
      const wmOpacity = updatedTemplate.watermark.opacity ?? 0.25;

      filterGraph.push(
        `[${watermarkInputIdx}:v]format=rgba,colorchannelmixer=aa=${wmOpacity}[wm_alpha]`,
        `[wm_alpha]scale=${wmW}:${wmH}[scaled_wm]`,
        `[${lastVideoLabel}][scaled_wm]overlay=x=${Math.round(updatedTemplate.watermark.x)}:y=${Math.round(updatedTemplate.watermark.y)}[v_wm]`
      );
      lastVideoLabel = 'v_wm';
    }

    // Headline overlay input
    const headlineInputIdx = nextInputIdx++;
    inputs.push('-loop', '1', '-i', textOverlayPath);

    // Overlay headline
    filterGraph.push(
      `[${lastVideoLabel}][${headlineInputIdx}:v]overlay=x=${updatedTemplate.headline.x}:y=${updatedTemplate.headline.y}[final_video]`
    );

    // Get total frames or duration to report progress
    const durationCmd = `"${config.ffprobePath || 'ffprobe'}" -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${videoPath}"`;
    let totalDuration = 10;
    try {
      const { execSync } = require('child_process');
      totalDuration = parseFloat(execSync(durationCmd).toString().trim()) || 10;
    } catch (e) {}

    // Final compile arguments
    const fps = updatedTemplate.exportSettings?.fps || 30;
    const vBitrate = updatedTemplate.exportSettings?.videoBitrate || '6000k';
    const aBitrate = updatedTemplate.exportSettings?.audioBitrate || '192k';

    const args = [
      '-y',
      ...inputs,
      '-filter_complex', filterGraph.join(';'),
      '-map', '[final_video]',
      '-map', `${videoInputIdx}:a?`, // Map audio from input video if exists
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-r', fps.toString(),
      '-b:v', vBitrate,
      '-c:a', 'aac',
      '-b:a', aBitrate,
      '-shortest', // Stop rendering when video stops
      outputPath,
    ];

    console.log(`Executing FFmpeg render: ${ffmpegPath} ${args.join(' ')}`);

    return new Promise((resolve, reject) => {
      const child = spawn(ffmpegPath, args);
      if (jobId) {
        getProcessRegistry().register(jobId, child);
      }
      
      let lastStderr = '';

      child.stderr.on('data', (data) => {
        const line = data.toString();
        lastStderr += line;

        // Parse FFmpeg output to calculate progress
        // e.g. time=00:00:05.12
        const match = line.match(/time=(\d+):(\d+):(\d+\.\d+)/);
        if (match) {
          const hours = parseInt(match[1]);
          const minutes = parseInt(match[2]);
          const seconds = parseFloat(match[3]);
          const currentTime = hours * 3600 + minutes * 60 + seconds;
          
          const progress = Math.min(99, Math.round((currentTime / totalDuration) * 100));
          onProgress(progress);
        }
      });

      child.on('close', (code) => {
        if (jobId) {
          getProcessRegistry().unregister(jobId);
        }
        this.cleanTempDir();
        if (code === 0 && fs.existsSync(outputPath)) {
          onProgress(100);
          resolve(outputPath);
        } else {
          reject(new Error(`FFmpeg rendering failed with code ${code}. Error: ${lastStderr}`));
        }
      });

      child.on('error', (err) => {
        if (jobId) {
          getProcessRegistry().unregister(jobId);
        }
        this.cleanTempDir();
        reject(new Error(`Failed to execute FFmpeg: ${err.message}`));
      });
    });
  }
}

// Singleton
let instance: FfmpegRenderer | null = null;
export function getRenderer(): FfmpegRenderer {
  if (!instance) {
    instance = new FfmpegRenderer();
  }
  return instance;
}
