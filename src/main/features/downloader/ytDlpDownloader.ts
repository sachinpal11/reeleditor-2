import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { app } from 'electron';
import { DownloadProgress, IDownloader } from '../../../core/ports/IDownloader';
import { getConfigStore } from '../storage/configStore';

export class YtDlpDownloader implements IDownloader {
  private downloadDir: string;

  constructor() {
    const userDataPath = app.getPath('userData');
    this.downloadDir = path.join(userDataPath, 'downloads');
    if (!fs.existsSync(this.downloadDir)) {
      fs.mkdirSync(this.downloadDir, { recursive: true });
    }
  }

  public download(
    url: string,
    jobId: string,
    onProgress: (progress: DownloadProgress) => void
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const config = getConfigStore().getConfig();
      const ytdlpPath = config.ytdlpPath || 'yt-dlp';

      // Output template: downloads/jobId.mp4 or similar
      const outputFilename = `${jobId}_src.mp4`;
      const outputPath = path.join(this.downloadDir, outputFilename);

      // Delete if already exists to prevent conflict
      if (fs.existsSync(outputPath)) {
        try {
          fs.unlinkSync(outputPath);
        } catch (err) {
          console.warn(`Could not delete existing file: ${outputPath}`, err);
        }
      }

      // Spawn yt-dlp
      // We use -f bestvideo+bestaudio/best to get the best quality, merged to mp4
      const args = [
        '-f', 'mp4/best',
        '--no-playlist',
        '-o', outputPath,
      ];

      if (config.cookiesFilePath && fs.existsSync(config.cookiesFilePath)) {
        args.push('--cookies', config.cookiesFilePath);
      } else if (config.cookiesBrowser && config.cookiesBrowser !== 'none') {
        args.push('--cookies-from-browser', config.cookiesBrowser);
      }

      args.push(url);

      console.log(`Running: ${ytdlpPath} ${args.join(' ')}`);

      const child = spawn(ytdlpPath, args);

      let lastStderr = '';

      child.stdout.on('data', (data) => {
        const line = data.toString().trim();
        // Match progress patterns like:
        // [download]  10.5% of ~12.34MiB at  2.34MiB/s ETA 00:05
        const progressMatch = line.match(/\[download\]\s+([\d.]+)%\s+of\s+(\S+)\s+at\s+(\S+)\s+ETA\s+(\S+)/);
        
        if (progressMatch) {
          const percentage = parseFloat(progressMatch[1]);
          const speed = progressMatch[3];
          const eta = progressMatch[4];
          onProgress({ percentage, speed, eta });
        } else {
          // Alternative output match for simple progress percentage
          const pctMatch = line.match(/\[download\]\s+([\d.]+)%/);
          if (pctMatch) {
            const percentage = parseFloat(pctMatch[1]);
            onProgress({ percentage, speed: 'N/A', eta: 'N/A' });
          }
        }
      });

      child.stderr.on('data', (data) => {
        lastStderr += data.toString();
        console.error(`yt-dlp stderr: ${data.toString()}`);
      });

      child.on('close', (code) => {
        if (code === 0 && fs.existsSync(outputPath)) {
          resolve(outputPath);
        } else {
          reject(new Error(`yt-dlp exited with code ${code}. Error: ${lastStderr}`));
        }
      });

      child.on('error', (err) => {
        reject(new Error(`Failed to start yt-dlp process: ${err.message}`));
      });
    });
  }
}

// Singleton
let instance: YtDlpDownloader | null = null;
export function getDownloader(): YtDlpDownloader {
  if (!instance) {
    instance = new YtDlpDownloader();
  }
  return instance;
}
