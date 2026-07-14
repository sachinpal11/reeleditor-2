import { ElectronAPI } from '@electron-toolkit/preload';
import { Template, AppConfig, Job, RewriteMode } from '../shared/types';

declare global {
  interface Window {
    electron: ElectronAPI;
    api: {
      getConfig(): Promise<AppConfig>;
      saveConfig(config: Partial<AppConfig>): Promise<AppConfig>;
      listTemplates(): Promise<Template[]>;
      getTemplate(id: string): Promise<Template | null>;
      saveTemplate(
        template: Template,
        assetFiles?: { background?: string; logo?: string; watermark?: string }
      ): Promise<Template>;
      deleteTemplate(id: string): Promise<boolean>;
      listJobs(): Promise<Job[]>;
      createJobs(urls: string[], templateId: string, rewriteMode: RewriteMode): Promise<boolean>;
      createJobsFromFiles(filePaths: string[], templateId: string, rewriteMode: RewriteMode): Promise<boolean>;
      controlJob(id: string, action: 'pause' | 'resume' | 'cancel' | 'retry'): Promise<boolean>;
      clearCompletedJobs(): Promise<Job[]>;
      onJobsChanged(callback: (jobs: Job[]) => void): () => void;
      selectDirectory(defaultPath?: string): Promise<string | null>;
      selectFile(filters?: { name: string; extensions: string[] }[]): Promise<string | null>;
      listExports(): Promise<{ name: string; path: string; size: number; createdAt: number }[]>;
      openExportFolder(): Promise<boolean>;
      playExportFile(filePath: string): Promise<boolean>;
      clearTempDownloads(): Promise<{ deleted: number; freedBytes: number }>;
    };
  }
}
