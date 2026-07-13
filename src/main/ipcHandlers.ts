import { ipcMain, dialog, BrowserWindow, shell } from 'electron';
import { getConfigStore } from './features/storage/configStore';
import { getTemplateStore } from './features/storage/templateStore';
import { getJobQueue } from './features/jobs/jobQueue';
import { Template, AppConfig, RewriteMode } from '../shared/types';
import * as fs from 'fs';
import * as path from 'path';

export function registerIpcHandlers(): void {
  // Config handlers
  ipcMain.handle('config:get', () => {
    return getConfigStore().getConfig();
  });

  ipcMain.handle('config:save', (_event, config: Partial<AppConfig>) => {
    getConfigStore().save(config);
    return getConfigStore().getConfig();
  });

  // Template handlers
  ipcMain.handle('templates:list', () => {
    return getTemplateStore().getTemplates();
  });

  ipcMain.handle('templates:get', (_event, id: string) => {
    return getTemplateStore().getTemplate(id);
  });

  ipcMain.handle(
    'templates:save',
    (_event, template: Template, assetFiles?: { background?: string; logo?: string; watermark?: string }) => {
      return getTemplateStore().saveTemplate(template, assetFiles);
    }
  );

  ipcMain.handle('templates:delete', (_event, id: string) => {
    getTemplateStore().deleteTemplate(id);
    return true;
  });

  // Job Queue handlers
  ipcMain.handle('jobs:list', () => {
    return getJobQueue().getJobs();
  });

  ipcMain.handle('jobs:create', (_event, urls: string[], templateId: string, rewriteMode: RewriteMode) => {
    getJobQueue().createJobs(urls, templateId, rewriteMode);
    return true;
  });

  ipcMain.handle('jobs:control', (_event, id: string, action: 'pause' | 'resume' | 'cancel' | 'retry') => {
    getJobQueue().controlJob(id, action);
    return true;
  });

  ipcMain.handle('jobs:clearCompleted', () => {
    return getJobQueue().clearCompleted();
  });

  // Exports handlers
  ipcMain.handle('exports:list', () => {
    const config = getConfigStore().getConfig();
    const exportDir = config.defaultExportDir;
    if (!fs.existsSync(exportDir)) return [];

    try {
      const files = fs.readdirSync(exportDir);
      return files
        .filter((f) => f.endsWith('.mp4'))
        .map((f) => {
          const fullPath = path.join(exportDir, f);
          const stat = fs.statSync(fullPath);
          return {
            name: f,
            path: fullPath,
            size: stat.size,
            createdAt: stat.birthtimeMs || stat.mtimeMs,
          };
        })
        .sort((a, b) => b.createdAt - a.createdAt);
    } catch (e) {
      console.error('Failed to list exports:', e);
      return [];
    }
  });

  ipcMain.handle('exports:openFolder', async () => {
    const config = getConfigStore().getConfig();
    const exportDir = config.defaultExportDir;
    if (fs.existsSync(exportDir)) {
      await shell.openPath(exportDir);
      return true;
    }
    return false;
  });

  ipcMain.handle('exports:playFile', async (_event, filePath: string) => {
    if (fs.existsSync(filePath)) {
      await shell.openPath(filePath);
      return true;
    }
    return false;
  });

  // Dialog helpers
  ipcMain.handle('dialog:selectDirectory', async (event, defaultPath?: string) => {
    const webContents = event.sender;
    const window = BrowserWindow.fromWebContents(webContents);
    if (!window) return null;

    const result = await dialog.showOpenDialog(window, {
      properties: ['openDirectory'],
      defaultPath,
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }
    return result.filePaths[0];
  });

  ipcMain.handle('dialog:selectFile', async (event, filters?: { name: string; extensions: string[] }[]) => {
    const webContents = event.sender;
    const window = BrowserWindow.fromWebContents(webContents);
    if (!window) return null;

    const result = await dialog.showOpenDialog(window, {
      properties: ['openFile'],
      filters,
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }
    return result.filePaths[0];
  });
}

