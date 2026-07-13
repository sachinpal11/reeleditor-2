import { create } from 'zustand';
import { Template, AppConfig, Job, RewriteMode } from '../../../shared/types';

interface AppStoreState {
  templates: Template[];
  activeTemplate: Template | null;
  config: AppConfig | null;
  jobs: Job[];
  isLoading: boolean;

  // Config actions
  loadConfig: () => Promise<void>;
  saveConfig: (config: Partial<AppConfig>) => Promise<void>;

  // Template actions
  loadTemplates: () => Promise<void>;
  selectTemplate: (template: Template | null) => void;
  saveTemplate: (
    template: Template,
    assetFiles?: { background?: string; logo?: string; watermark?: string }
  ) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;

  // Job actions
  loadJobs: () => Promise<void>;
  createJobs: (urls: string[], templateId: string, rewriteMode: RewriteMode) => Promise<void>;
  setJobs: (jobs: Job[]) => void;
  updateJob: (job: Job) => void;
  controlJob: (id: string, action: 'pause' | 'resume' | 'cancel' | 'retry') => Promise<void>;
  clearCompletedJobs: () => Promise<void>;
}

export const useAppStore = create<AppStoreState>((set, get) => ({
  templates: [],
  activeTemplate: null,
  config: null,
  jobs: [],
  isLoading: false,

  loadConfig: async () => {
    try {
      const config = await window.api.getConfig();
      set({ config });
    } catch (err) {
      console.error('Store: Failed to load config', err);
    }
  },

  saveConfig: async (partialConfig) => {
    try {
      const updated = await window.api.saveConfig(partialConfig);
      set({ config: updated });
    } catch (err) {
      console.error('Store: Failed to save config', err);
    }
  },

  loadTemplates: async () => {
    try {
      set({ isLoading: true });
      const templates = await window.api.listTemplates();
      set({ templates, isLoading: false });
    } catch (err) {
      console.error('Store: Failed to load templates', err);
      set({ isLoading: false });
    }
  },

  selectTemplate: (template) => {
    set({ activeTemplate: template });
  },

  saveTemplate: async (template, assetFiles) => {
    try {
      const saved = await window.api.saveTemplate(template, assetFiles);
      const currentTemplates = get().templates;
      const index = currentTemplates.findIndex((t) => t.id === saved.id);

      let newTemplates = [...currentTemplates];
      if (index >= 0) {
        newTemplates[index] = saved;
      } else {
        newTemplates.push(saved);
      }

      set({
        templates: newTemplates,
        activeTemplate: get().activeTemplate?.id === saved.id ? saved : get().activeTemplate,
      });
    } catch (err) {
      console.error('Store: Failed to save template', err);
      throw err;
    }
  },

  deleteTemplate: async (id) => {
    try {
      await window.api.deleteTemplate(id);
      const newTemplates = get().templates.filter((t) => t.id !== id);
      set({
        templates: newTemplates,
        activeTemplate: get().activeTemplate?.id === id ? null : get().activeTemplate,
      });
    } catch (err) {
      console.error('Store: Failed to delete template', err);
      throw err;
    }
  },

  loadJobs: async () => {
    // Will communicate with main process jobs:list channel
    try {
      // @ts-ignore
      if (window.api.listJobs) {
        // @ts-ignore
        const jobs = await window.api.listJobs();
        set({ jobs });
      }
    } catch (err) {
      console.error('Store: Failed to load jobs', err);
    }
  },

  createJobs: async (urls, templateId, rewriteMode) => {
    try {
      // @ts-ignore
      if (window.api.createJobs) {
        // @ts-ignore
        await window.api.createJobs(urls, templateId, rewriteMode);
      }
    } catch (err) {
      console.error('Store: Failed to create jobs', err);
    }
  },

  setJobs: (jobs) => {
    set({ jobs });
  },

  updateJob: (updatedJob) => {
    const jobs = get().jobs;
    const index = jobs.findIndex((j) => j.id === updatedJob.id);
    let newJobs = [...jobs];
    if (index >= 0) {
      newJobs[index] = updatedJob;
    } else {
      newJobs.push(updatedJob);
    }
    set({ jobs: newJobs });
  },

  controlJob: async (id, action) => {
    try {
      // @ts-ignore
      if (window.api.controlJob) {
        // @ts-ignore
        await window.api.controlJob(id, action);
      }
    } catch (err) {
      console.error(`Store: Failed to ${action} job`, err);
    }
  },

  clearCompletedJobs: async () => {
    try {
      // @ts-ignore
      if (window.api.clearCompletedJobs) {
        // @ts-ignore
        const jobs = await window.api.clearCompletedJobs();
        set({ jobs });
      }
    } catch (err) {
      console.error('Store: Failed to clear completed jobs', err);
    }
  },
}));
