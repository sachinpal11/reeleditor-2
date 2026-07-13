import { contextBridge, ipcRenderer } from 'electron';
import { electronAPI } from '@electron-toolkit/preload';
import { Template, AppConfig, Job, RewriteMode } from '../shared/types';

// Custom APIs for renderer
const api = {
  getConfig: (): Promise<AppConfig> => ipcRenderer.invoke('config:get'),
  saveConfig: (config: Partial<AppConfig>): Promise<AppConfig> => ipcRenderer.invoke('config:save', config),
  
  listTemplates: (): Promise<Template[]> => ipcRenderer.invoke('templates:list'),
  getTemplate: (id: string): Promise<Template | null> => ipcRenderer.invoke('templates:get', id),
  saveTemplate: (
    template: Template,
    assetFiles?: { background?: string; logo?: string; watermark?: string }
  ): Promise<Template> => ipcRenderer.invoke('templates:save', template, assetFiles),
  deleteTemplate: (id: string): Promise<boolean> => ipcRenderer.invoke('templates:delete', id),

  listJobs: (): Promise<Job[]> => ipcRenderer.invoke('jobs:list'),
  createJobs: (urls: string[], templateId: string, rewriteMode: RewriteMode): Promise<boolean> =>
    ipcRenderer.invoke('jobs:create', urls, templateId, rewriteMode),
  controlJob: (id: string, action: 'pause' | 'resume' | 'cancel' | 'retry'): Promise<boolean> =>
    ipcRenderer.invoke('jobs:control', id, action),
  clearCompletedJobs: (): Promise<Job[]> => ipcRenderer.invoke('jobs:clearCompleted'),
  onJobsChanged: (callback: (jobs: Job[]) => void): (() => void) => {
    const subscription = (_event: any, jobs: Job[]): void => callback(jobs);
    ipcRenderer.on('jobs:changed', subscription);
    return (): void => {
      ipcRenderer.removeListener('jobs:changed', subscription);
    };
  },

  listExports: (): Promise<{ name: string; path: string; size: number; createdAt: number }[]> =>
    ipcRenderer.invoke('exports:list'),
  openExportFolder: (): Promise<boolean> => ipcRenderer.invoke('exports:openFolder'),
  playExportFile: (filePath: string): Promise<boolean> => ipcRenderer.invoke('exports:playFile', filePath),

  selectDirectory: (defaultPath?: string): Promise<string | null> =>
    ipcRenderer.invoke('dialog:selectDirectory', defaultPath),
  selectFile: (filters?: { name: string; extensions: string[] }[]): Promise<string | null> =>
    ipcRenderer.invoke('dialog:selectFile', filters),
};

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI);
    contextBridge.exposeInMainWorld('api', api);
  } catch (error) {
    console.error(error);
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI;
  // @ts-ignore (define in dts)
  window.api = api;
}
