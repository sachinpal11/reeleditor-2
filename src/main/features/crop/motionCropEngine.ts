import { spawn, execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { app } from 'electron';
import sharp from 'sharp';
import { CropResult, ICropEngine } from '../../../core/ports/ICropEngine';
import { getConfigStore } from '../storage/configStore';
import { getProcessRegistry } from '../jobs/processRegistry';

export class MotionCropEngine implements ICropEngine {
  private tempDir: string;

  constructor() {
    const userDataPath = app.getPath('userData');
    this.tempDir = path.join(userDataPath, 'temp_crop');
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
        } catch (e) {
          // Ignore locks
        }
      }
    }
  }

  private getVideoDimensions(videoPath: string): { width: number; height: number; duration: number } {
    const config = getConfigStore().getConfig();
    const ffprobePath = config.ffprobePath || 'ffprobe';

    // Run ffprobe synchronously
    const cmd = `"${ffprobePath}" -v error -select_streams v:0 -show_entries stream=width,height -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${videoPath}"`;
    console.log(`Running: ${cmd}`);
    
    const output = execSync(cmd).toString().trim().split('\r\n').join('\n').split('\n');
    
    // Output format is typically:
    // [width]
    // [height]
    // [duration]
    const width = parseInt(output[0]) || 1080;
    const height = parseInt(output[1]) || 1920;
    const duration = parseFloat(output[2]) || 10;

    return { width, height, duration };
  }

  public async detectActiveVideoArea(videoPath: string, jobId?: string): Promise<CropResult> {
    this.cleanTempDir();
    const { width: origWidth, height: origHeight, duration } = this.getVideoDimensions(videoPath);

    const config = getConfigStore().getConfig();
    const ffmpegPath = config.ffmpegPath || 'ffmpeg';

    // Extract frames at 1 frame per second, up to a max of 15 frames
    const frameRate = Math.max(1, Math.min(2, Math.round(15 / duration)));
    const framePattern = path.join(this.tempDir, 'frame_%03d.jpg');

    await new Promise<void>((resolve, reject) => {
      const args = [
        '-y',
        '-i', videoPath,
        '-vf', `fps=${frameRate}`,
        framePattern,
      ];
      console.log(`Extracting frames with ffmpeg: ${ffmpegPath} ${args.join(' ')}`);
      const child = spawn(ffmpegPath, args);
      if (jobId) {
        getProcessRegistry().register(jobId, child);
      }
      child.on('close', (code) => {
        if (jobId) {
          getProcessRegistry().unregister(jobId);
        }
        if (code === 0) resolve();
        else reject(new Error(`Failed to extract frames. Exit code: ${code}`));
      });
      child.on('error', (err) => {
        if (jobId) {
          getProcessRegistry().unregister(jobId);
        }
        reject(err);
      });
    });

    // Read all extracted frame files
    const files = fs.readdirSync(this.tempDir)
      .filter((f) => f.startsWith('frame_') && f.endsWith('.jpg'))
      .map((f) => path.join(this.tempDir, f));

    if (files.length === 0) {
      throw new Error('No frames were extracted for crop detection.');
    }

    // Load and resize frames to a low resolution for variance processing
    const targetW = 180;
    const targetH = 320;
    const pixelBuffers: Buffer[] = [];

    for (const file of files) {
      const buf = await sharp(file)
        .resize(targetW, targetH, { fit: 'fill' })
        .grayscale()
        .raw()
        .toBuffer();
      pixelBuffers.push(buf);
    }

    const numPixels = targetW * targetH;
    const variances = new Float32Array(numPixels);

    // Compute pixel variance across keyframes
    for (let p = 0; p < numPixels; p++) {
      let sum = 0;
      for (let f = 0; f < pixelBuffers.length; f++) {
        sum += pixelBuffers[f][p];
      }
      const mean = sum / pixelBuffers.length;

      let sumSqDiff = 0;
      for (let f = 0; f < pixelBuffers.length; f++) {
        const diff = pixelBuffers[f][p] - mean;
        sumSqDiff += diff * diff;
      }
      variances[p] = sumSqDiff / pixelBuffers.length;
    }

    // Threshold variance to identify "active video" pixels
    // High variance means motion. Black bars or static banners have variance close to 0.
    const activeThreshold = 80;
    let minX = targetW;
    let maxX = 0;
    let minY = targetH;
    let maxY = 0;
    let activePixels = 0;

    for (let y = 0; y < targetH; y++) {
      for (let x = 0; x < targetW; x++) {
        const p = y * targetW + x;
        if (variances[p] > activeThreshold) {
          activePixels++;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    // Cleanup temp frames
    this.cleanTempDir();

    // Handle edge case where no active pixels are detected (e.g., completely static slide)
    if (activePixels < 50 || minX >= maxX || minY >= maxY) {
      console.warn('Could not detect active video region, defaulting to full dimensions.');
      return { x: 0, y: 0, width: origWidth, height: origHeight };
    }

    // Scale coordinates back to original size
    const scaleX = origWidth / targetW;
    const scaleY = origHeight / targetH;

    let cropX = Math.max(0, Math.floor(minX * scaleX));
    let cropY = Math.max(0, Math.floor(minY * scaleY));
    let cropW = Math.min(origWidth - cropX, Math.ceil((maxX - minX) * scaleX));
    let cropH = Math.min(origHeight - cropY, Math.ceil((maxY - minY) * scaleY));

    // Pad crop area slightly to make sure video is not clipped too tightly (e.g. 2% padding)
    const paddingX = Math.round(cropW * 0.02);
    const paddingY = Math.round(cropH * 0.02);

    cropX = Math.max(0, cropX - paddingX);
    cropY = Math.max(0, cropY - paddingY);
    cropW = Math.min(origWidth - cropX, cropW + paddingX * 2);
    cropH = Math.min(origHeight - cropY, cropH + paddingY * 2);

    // Make crop width and height even (required by some H264 decoders/encoders)
    if (cropW % 2 !== 0) cropW--;
    if (cropH % 2 !== 0) cropH--;
    if (cropX % 2 !== 0) cropX++;
    if (cropY % 2 !== 0) cropY++;

    console.log(`Detected motion crop coordinates: x=${cropX}, y=${cropY}, w=${cropW}, h=${cropH}`);
    return { x: cropX, y: cropY, width: cropW, height: cropH };
  }

  public cropVideo(videoPath: string, crop: CropResult, outputPath: string, jobId?: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const config = getConfigStore().getConfig();
      const ffmpegPath = config.ffmpegPath || 'ffmpeg';

      if (fs.existsSync(outputPath)) {
        try {
          fs.unlinkSync(outputPath);
        } catch (e) {}
      }

      // Execute crop filter
      const args = [
        '-y',
        '-i', videoPath,
        '-vf', `crop=${crop.width}:${crop.height}:${crop.x}:${crop.y}`,
        '-c:v', 'libx264',
        '-crf', '18',
        '-c:a', 'copy',
        outputPath,
      ];

      console.log(`Executing FFmpeg crop: ${ffmpegPath} ${args.join(' ')}`);
      const child = spawn(ffmpegPath, args);
      if (jobId) {
        getProcessRegistry().register(jobId, child);
      }

      let lastStderr = '';
      child.stderr.on('data', (data) => {
        lastStderr += data.toString();
      });

      child.on('close', (code) => {
        if (jobId) {
          getProcessRegistry().unregister(jobId);
        }
        if (code === 0 && fs.existsSync(outputPath)) {
          resolve(outputPath);
        } else {
          reject(new Error(`FFmpeg crop failed with code ${code}. Error: ${lastStderr}`));
        }
      });

      child.on('error', (err) => {
        if (jobId) {
          getProcessRegistry().unregister(jobId);
        }
        reject(new Error(`FFmpeg failed to start: ${err.message}`));
      });
    });
  }
}

// Singleton
let instance: MotionCropEngine | null = null;
export function getCropEngine(): MotionCropEngine {
  if (!instance) {
    instance = new MotionCropEngine();
  }
  return instance;
}
