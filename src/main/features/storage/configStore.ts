import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { AppConfig } from '../../../shared/types';

const CONFIG_FILE_NAME = 'config.json';

export class ConfigStore {
  private configPath: string;
  private currentConfig: AppConfig;

  constructor() {
    // Determine user data path (runs inside electron main process)
    const userDataPath = app.getPath('userData');
    this.configPath = path.join(userDataPath, CONFIG_FILE_NAME);
    this.currentConfig = this.loadDefaultConfig();
    this.load();
  }

  private loadDefaultConfig(): AppConfig {
    let defaultVideosPath = '';
    try {
      defaultVideosPath = app.getPath('videos');
    } catch {
      defaultVideosPath = path.join(app.getPath('home'), 'Videos');
    }

    return {
      ffmpegPath: 'ffmpeg',
      ffprobePath: 'ffprobe',
      ytdlpPath: 'yt-dlp',
      geminiApiKey: '',
      aiMode: 'local',
      defaultExportDir: defaultVideosPath,
      concurrency: 1,
      cookiesBrowser: 'none',
      cookiesFilePath: '',
    };
  }

  private load(): void {
    try {
      if (fs.existsSync(this.configPath)) {
        const fileContent = fs.readFileSync(this.configPath, 'utf8');
        const parsed = JSON.parse(fileContent);
        this.currentConfig = {
          ...this.loadDefaultConfig(),
          ...parsed,
        };
      } else {
        this.save(this.currentConfig);
      }
    } catch (error) {
      console.error('Failed to load config, using defaults:', error);
    }
  }

  public getConfig(): AppConfig {
    return { ...this.currentConfig };
  }

  public save(newConfig: Partial<AppConfig>): void {
    try {
      this.currentConfig = {
        ...this.currentConfig,
        ...newConfig,
      };
      const dir = path.dirname(this.configPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.configPath, JSON.stringify(this.currentConfig, null, 2), 'utf8');
    } catch (error) {
      console.error('Failed to save config:', error);
    }
  }
}

// Singleton instance
let instance: ConfigStore | null = null;
export function getConfigStore(): ConfigStore {
  if (!instance) {
    instance = new ConfigStore();
  }
  return instance;
}
