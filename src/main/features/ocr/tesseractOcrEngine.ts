import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { app } from 'electron';
import sharp from 'sharp';
import { createWorker } from 'tesseract.js';
import { IOcrEngine } from '../../../core/ports/IOcrEngine';
import { CropResult } from '../../../core/ports/ICropEngine';
import { getConfigStore } from '../storage/configStore';

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

  public async extractText(videoPath: string, activeVideoArea?: CropResult): Promise<string> {
    this.cleanTempDir();

    const config = getConfigStore().getConfig();
    const ffmpegPath = config.ffmpegPath || 'ffmpeg';

    // 1. Extract a frame from the middle of the video
    const duration = this.getVideoDuration(videoPath);
    const extractTime = Math.min(duration / 2, 5); // extract at 50% or 5 seconds

    const extractedFramePath = path.join(this.tempDir, 'ocr_frame.png');

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
      child.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`Failed to extract OCR frame. Code: ${code}`));
      });
      child.on('error', reject);
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

    // 3. Mask out active video region and bottom comment/metadata region
    // The headline usually occupies the top 30% of the canvas.
    const compositeOperations: any[] = [];

    // Mask active video area (black out the moving video)
    if (activeVideoArea) {
      compositeOperations.push({
        input: {
          create: {
            width: activeVideoArea.width,
            height: activeVideoArea.height,
            channels: 3,
            background: { r: 0, g: 0, b: 0 },
          },
        },
        left: activeVideoArea.x,
        top: activeVideoArea.y,
      });
    }

    // Black out bottom 25% (usernames, comments, likes, overlays)
    const bottomHeight = Math.round(height * 0.25);
    compositeOperations.push({
      input: {
        create: {
          width: width,
          height: bottomHeight,
          channels: 3,
          background: { r: 0, g: 0, b: 0 },
        },
      },
      left: 0,
      top: height - bottomHeight,
    });

    const maskedFramePath = path.join(this.tempDir, 'ocr_frame_masked.png');

    // Create the masked image
    await image
      .composite(compositeOperations)
      .toFile(maskedFramePath);

    // 4. Run Tesseract OCR on the masked image
    console.log('Running Tesseract.js on masked frame...');
    
    // We create a local worker. It will download the english data pack once and cache it in the system temp directory.
    const worker = await createWorker('eng');
    const { data: { text } } = await worker.recognize(maskedFramePath);
    await worker.terminate();

    // Clean up files
    this.cleanTempDir();

    // 5. Clean OCR output
    return this.cleanExtractedText(text);
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
