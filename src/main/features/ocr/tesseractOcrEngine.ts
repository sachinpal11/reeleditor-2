import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { app } from 'electron';
import sharp from 'sharp';
import { createWorker } from 'tesseract.js';
import { IOcrEngine } from '../../../core/ports/IOcrEngine';
import { CropResult } from '../../../core/ports/ICropEngine';
import { getConfigStore } from '../storage/configStore';
import { getProcessRegistry } from '../jobs/processRegistry';

export class TesseractOcrEngine implements IOcrEngine {
  private tempDir: string;

  constructor() {
    const userDataPath = app.getPath('userData');
    this.tempDir = path.join(userDataPath, 'temp_ocr');
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

  private getVideoDuration(videoPath: string): number {
    const config = getConfigStore().getConfig();
    const ffprobePath = config.ffprobePath || 'ffprobe';
    const cmd = `"${ffprobePath}" -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${videoPath}"`;
    try {
      const { execSync } = require('child_process');
      return parseFloat(execSync(cmd).toString().trim()) || 5;
    } catch {
      return 5;
    }
  }

  public async extractText(videoPath: string, activeVideoArea?: CropResult, jobId?: string): Promise<string> {
    this.cleanTempDir();

    const config = getConfigStore().getConfig();
    const ffmpegPath = config.ffmpegPath || 'ffmpeg';

    const duration = this.getVideoDuration(videoPath);
    const timestamps = [
      Math.min(duration / 2, 5),
      duration * 0.25,
      duration * 0.75,
      duration * 0.15
    ];

    let bestText = '';
    let maxWordsCount = 0;

    for (let attempt = 0; attempt < timestamps.length; attempt++) {
      const extractTime = timestamps[attempt];
      console.log(`OCR Attempt ${attempt + 1}/${timestamps.length}: Extracting frame at time ${extractTime.toFixed(2)}s...`);

      const extractedFramePath = path.join(this.tempDir, `ocr_frame_attempt_${attempt}.png`);
      const maskedFramePath = path.join(this.tempDir, `ocr_frame_attempt_${attempt}_masked.png`);

      try {
        await new Promise<void>((resolve, reject) => {
          const args = [
            '-y',
            '-ss', extractTime.toString(),
            '-i', videoPath,
            '-vframes', '1',
            extractedFramePath,
          ];
          console.log(`Extracting frame for OCR: ${ffmpegPath} ${args.join(' ')}`);
          const child = spawn(ffmpegPath, args);
          if (jobId) {
            getProcessRegistry().register(jobId, child);
          }
          child.on('close', (code) => {
            if (jobId) {
              getProcessRegistry().unregister(jobId);
            }
            if (code === 0) resolve();
            else reject(new Error(`Failed to extract OCR frame. Code: ${code}`));
          });
          child.on('error', (err) => {
            if (jobId) {
              getProcessRegistry().unregister(jobId);
            }
            reject(err);
          });
        });

        if (!fs.existsSync(extractedFramePath)) {
          throw new Error('Frame extraction failed for OCR.');
        }

        // 2. Load frame metadata (width, height)
        const image = sharp(extractedFramePath);
        const { width, height } = await image.metadata();
        if (!width || !height) {
          throw new Error('Could not read image dimensions for OCR.');
        }

        // 3. Mask out everything below the top-header headline area (starting Y of cropped video)
        const compositeOperations: any[] = [];
        const cutOffY = activeVideoArea ? activeVideoArea.y : Math.round(height * 0.35);
        const maskHeight = height - cutOffY;

        if (maskHeight > 0) {
          compositeOperations.push({
            input: {
              create: {
                width: width,
                height: maskHeight,
                channels: 3,
                background: { r: 0, g: 0, b: 0 },
              },
            },
            left: 0,
            top: cutOffY,
          });
        }

        // Create the masked image
        await image
          .composite(compositeOperations)
          .toFile(maskedFramePath);

        // 4. Run Tesseract OCR on the masked image
        console.log('Running Tesseract.js on masked frame...');
        const worker = await createWorker('eng');
        const { data: { text } } = await worker.recognize(maskedFramePath);
        await worker.terminate();

        const cleanedText = this.cleanExtractedText(text);
        const wordCount = cleanedText.trim().split(/\s+/).filter(Boolean).length;
        console.log(`OCR Attempt ${attempt + 1} extracted ${wordCount} words: "${cleanedText}"`);

        if (wordCount > maxWordsCount) {
          maxWordsCount = wordCount;
          bestText = cleanedText;
        }

        if (wordCount >= 10) {
          console.log(`OCR successful with ${wordCount} words (>= 10). Stopping search.`);
          return cleanedText;
        }
      } catch (err) {
        console.error(`OCR Attempt ${attempt + 1} failed:`, err);
      } finally {
        // Clean up current attempt files
        if (fs.existsSync(extractedFramePath)) {
          try { fs.unlinkSync(extractedFramePath); } catch (e) {}
        }
        if (fs.existsSync(maskedFramePath)) {
          try { fs.unlinkSync(maskedFramePath); } catch (e) {}
        }
      }
    }

    console.log(`Could not find a frame with >= 10 words. Returning best attempt with ${maxWordsCount} words: "${bestText}"`);
    return bestText;
  }

  private cleanExtractedText(rawText: string): string {
    if (!rawText) return '';

    const lines = rawText
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => {
        if (line.length < 3) return false; // Filter short fragments
        if (line.startsWith('@')) return false; // Filter usernames
        if (line.toLowerCase().includes('like') || line.toLowerCase().includes('comment')) return false; // Filter metadata
        // Remove standard caption artifacts if possible
        return true;
      });

    // Merge lines into a single readable string
    return lines.join(' ').replace(/\s+/g, ' ').trim();
  }
}

// Singleton
let instance: TesseractOcrEngine | null = null;
export function getOcrEngine(): TesseractOcrEngine {
  if (!instance) {
    instance = new TesseractOcrEngine();
  }
  return instance;
}
