import React, { useEffect, useState } from 'react';
import { useAppStore } from '../hooks/useAppStore';
import { AppConfig } from '../../../shared/types';
import { useToastStore } from '../hooks/useToastStore';

export const SettingsPage: React.FC = () => {
  const { config, loadConfig, saveConfig } = useAppStore();
  const { addToast } = useToastStore();
  const [localConfig, setLocalConfig] = useState<AppConfig | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  useEffect(() => {
    if (config) {
      setLocalConfig({ ...config });
    }
  }, [config]);

  if (!localConfig) {
    return <div className="p-6 text-zinc-400">Loading configuration...</div>;
  }

  const handleBrowseFfmpeg = async (): Promise<void> => {
    const file = await window.api.selectFile([{ name: 'Executables', extensions: ['exe', 'lnk'] }]);
    if (file) {
      setLocalConfig({ ...localConfig, ffmpegPath: file });
    }
  };

  const handleBrowseFfprobe = async (): Promise<void> => {
    const file = await window.api.selectFile([{ name: 'Executables', extensions: ['exe', 'lnk'] }]);
    if (file) {
      setLocalConfig({ ...localConfig, ffprobePath: file });
    }
  };

  const handleBrowseYtdlp = async (): Promise<void> => {
    const file = await window.api.selectFile([{ name: 'Executables', extensions: ['exe', 'lnk'] }]);
    if (file) {
      setLocalConfig({ ...localConfig, ytdlpPath: file });
    }
  };

  const handleBrowseExport = async (): Promise<void> => {
    const dir = await window.api.selectDirectory(localConfig.defaultExportDir);
    if (dir) {
      setLocalConfig({ ...localConfig, defaultExportDir: dir });
    }
  };

  const handleSave = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (localConfig) {
      try {
        await saveConfig(localConfig);
        setIsSaved(true);
        addToast('Settings saved successfully!', 'success');
        setTimeout(() => setIsSaved(false), 3000);
      } catch (err: any) {
        addToast(`Failed to save settings: ${err.message}`, 'error');
      }
    }
  };

  return (
    <div className="flex-1 bg-zinc-950 p-8 overflow-y-auto h-full">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-white">System Settings</h2>
          <p className="text-sm text-zinc-500 mt-1">
            Configure local paths and API credentials required for download, OCR, and video compilation.
          </p>
        </div>

        {isSaved && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm p-3.5 rounded-lg font-semibold">
            ✓ Settings saved successfully!
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6 bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-xl">
          {/* Binaries section */}
          <div className="space-y-4">
            <h3 className="text-base font-bold text-white border-b border-zinc-800 pb-2">Local Binaries</h3>
            
            <div className="space-y-3">
              <div>
                <label className="text-xs text-zinc-400 block mb-1.5 font-medium">FFmpeg Executable Path</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={localConfig.ffmpegPath}
                    onChange={(e): void => setLocalConfig({ ...localConfig, ffmpegPath: e.target.value })}
                    className="flex-1 bg-zinc-950 border border-zinc-850 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleBrowseFfmpeg}
                    className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-650 text-white text-xs font-semibold rounded-lg transition"
                  >
                    Browse
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs text-zinc-400 block mb-1.5 font-medium">FFprobe Executable Path</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={localConfig.ffprobePath}
                    onChange={(e): void => setLocalConfig({ ...localConfig, ffprobePath: e.target.value })}
                    className="flex-1 bg-zinc-950 border border-zinc-850 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleBrowseFfprobe}
                    className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-650 text-white text-xs font-semibold rounded-lg transition"
                  >
                    Browse
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs text-zinc-400 block mb-1.5 font-medium">yt-dlp Executable Path</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={localConfig.ytdlpPath}
                    onChange={(e): void => setLocalConfig({ ...localConfig, ytdlpPath: e.target.value })}
                    className="flex-1 bg-zinc-950 border border-zinc-850 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleBrowseYtdlp}
                    className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-650 text-white text-xs font-semibold rounded-lg transition"
                  >
                    Browse
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs text-zinc-400 block mb-1.5 font-medium">yt-dlp Cookies Source Browser</label>
                <select
                  value={localConfig.cookiesBrowser || 'none'}
                  onChange={(e): void => setLocalConfig({ ...localConfig, cookiesBrowser: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-855 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="none">None (No cookies)</option>
                  <option value="chrome">Google Chrome</option>
                  <option value="firefox">Mozilla Firefox</option>
                  <option value="edge">Microsoft Edge</option>
                  <option value="brave">Brave Browser</option>
                  <option value="safari">Apple Safari</option>
                  <option value="opera">Opera</option>
                  <option value="vivaldi">Vivaldi</option>
                </select>
                <p className="text-[10px] text-zinc-550 mt-1">
                  Required for downloading restricted, age-locked, or login-only videos (such as private/restricted Instagram posts).
                </p>
              </div>

              <div>
                <label className="text-xs text-zinc-400 block mb-1.5 font-medium">yt-dlp Cookies File Path (Alternative)</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Path to exported cookies.txt file..."
                    value={localConfig.cookiesFilePath || ''}
                    onChange={(e): void => setLocalConfig({ ...localConfig, cookiesFilePath: e.target.value })}
                    className="flex-1 bg-zinc-950 border border-zinc-850 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={async (): Promise<void> => {
                      const file = await window.api.selectFile([{ name: 'Text Files', extensions: ['txt'] }]);
                      if (file) {
                        setLocalConfig({ ...localConfig, cookiesFilePath: file });
                      }
                    }}
                    className="px-4 py-2 bg-zinc-805 hover:bg-zinc-700 active:bg-zinc-650 text-white text-xs font-semibold rounded-lg transition"
                  >
                    Browse
                  </button>
                </div>
                <p className="text-[10px] text-zinc-550 mt-1">
                  If direct browser reading fails (e.g. because Brave/Chrome is running and locks its database), use a browser extension like "Get cookies.txt LOCALLY" to save your cookies to a text file and select it here. This takes precedence over the browser choice.
                </p>
              </div>
            </div>
          </div>

          {/* Export Settings */}
          <div className="space-y-4">
            <h3 className="text-base font-bold text-white border-b border-zinc-800 pb-2">Export Configuration</h3>
            
            <div className="space-y-3">
              <div>
                <label className="text-xs text-zinc-400 block mb-1.5 font-medium">Default Export Directory</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={localConfig.defaultExportDir}
                    onChange={(e): void => setLocalConfig({ ...localConfig, defaultExportDir: e.target.value })}
                    className="flex-1 bg-zinc-950 border border-zinc-850 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleBrowseExport}
                    className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-650 text-white text-xs font-semibold rounded-lg transition"
                  >
                    Browse
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs text-zinc-400 block mb-1.5 font-medium">Max Parallel Jobs (Concurrency)</label>
                <input
                  type="number"
                  min={1}
                  max={4}
                  value={localConfig.concurrency}
                  onChange={(e): void =>
                    setLocalConfig({ ...localConfig, concurrency: Math.max(1, parseInt(e.target.value) || 1) })
                  }
                  className="w-32 bg-zinc-950 border border-zinc-850 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>
            </div>
          </div>

          {/* AI Settings */}
          <div className="space-y-4">
            <h3 className="text-base font-bold text-white border-b border-zinc-800 pb-2">AI Configuration</h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs text-zinc-400 block mb-1.5 font-medium font-semibold">AI Rewrite Engine</label>
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 text-zinc-300 text-sm cursor-pointer select-none">
                    <input
                      type="radio"
                      checked={localConfig.aiMode === 'local'}
                      onChange={(): void => setLocalConfig({ ...localConfig, aiMode: 'local' })}
                      className="accent-indigo-500 w-4 h-4 cursor-pointer"
                    />
                    Offline Preset Generator (Mock)
                  </label>
                  <label className="flex items-center gap-2 text-zinc-300 text-sm cursor-pointer select-none">
                    <input
                      type="radio"
                      checked={localConfig.aiMode === 'gemini'}
                      onChange={(): void => setLocalConfig({ ...localConfig, aiMode: 'gemini' })}
                      className="accent-indigo-500 w-4 h-4 cursor-pointer"
                    />
                    Google Gemini API
                  </label>
                  <label className="flex items-center gap-2 text-zinc-300 text-sm cursor-pointer select-none">
                    <input
                      type="radio"
                      checked={localConfig.aiMode === 'openrouter'}
                      onChange={(): void => setLocalConfig({ ...localConfig, aiMode: 'openrouter' })}
                      className="accent-indigo-500 w-4 h-4 cursor-pointer"
                    />
                    OpenRouter API
                  </label>
                </div>
              </div>

              {localConfig.aiMode === 'gemini' && (
                <div className="space-y-3 pl-2 border-l border-zinc-850">
                  <div>
                    <label className="text-xs text-zinc-400 block mb-1.5 font-medium">Gemini API Key</label>
                    <input
                      type="password"
                      placeholder="Enter AIzaSy..."
                      value={localConfig.geminiApiKey}
                      onChange={(e): void => setLocalConfig({ ...localConfig, geminiApiKey: e.target.value })}
                      className="w-full bg-zinc-950 border border-zinc-850 rounded-lg p-2.5 text-sm text-white placeholder-zinc-700 focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-400 block mb-1.5 font-medium">Gemini Model</label>
                    <select
                      value={localConfig.geminiModel || 'gemini-1.5-flash'}
                      onChange={(e): void => setLocalConfig({ ...localConfig, geminiModel: e.target.value })}
                      className="w-full bg-zinc-950 border border-zinc-855 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="gemini-1.5-flash">gemini-1.5-flash (Fast, recommended)</option>
                      <option value="gemini-1.5-pro">gemini-1.5-pro (More detailed)</option>
                      <option value="gemini-2.0-flash-exp">gemini-2.0-flash-exp (Experimental)</option>
                      <option value="gemini-2.5-flash">gemini-2.5-flash (Latest Flash)</option>
                      <option value="gemini-2.5-pro">gemini-2.5-pro (Latest Pro)</option>
                    </select>
                  </div>
                  <p className="text-[10px] text-zinc-500 mt-1">
                    Your key is saved locally in config.json and is never uploaded.
                  </p>
                </div>
              )}

              {localConfig.aiMode === 'openrouter' && (
                <div className="space-y-3 pl-2 border-l border-zinc-850">
                  <div>
                    <label className="text-xs text-zinc-400 block mb-1.5 font-medium">OpenRouter API Key</label>
                    <input
                      type="password"
                      placeholder="Enter sk-or-v1-..."
                      value={localConfig.openrouterApiKey || ''}
                      onChange={(e): void => setLocalConfig({ ...localConfig, openrouterApiKey: e.target.value })}
                      className="w-full bg-zinc-950 border border-zinc-850 rounded-lg p-2.5 text-sm text-white placeholder-zinc-700 focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-400 block mb-1.5 font-medium">OpenRouter Model</label>
                    <div className="space-y-2">
                      <select
                        value={[
                          'google/gemini-2.5-flash',
                          'google/gemini-2.5-pro',
                          'anthropic/claude-3.5-sonnet',
                          'meta-llama/llama-3.1-70b-instruct',
                          'mistralai/mistral-large'
                        ].includes(localConfig.openrouterModel || '') ? localConfig.openrouterModel : 'custom'}
                        onChange={(e): void => {
                          const val = e.target.value;
                          if (val !== 'custom') {
                            setLocalConfig({ ...localConfig, openrouterModel: val });
                          } else {
                            setLocalConfig({ ...localConfig, openrouterModel: '' });
                          }
                        }}
                        className="w-full bg-zinc-950 border border-zinc-855 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                      >
                        <option value="google/gemini-2.5-flash">Gemini 2.5 Flash (google/gemini-2.5-flash)</option>
                        <option value="google/gemini-2.5-pro">Gemini 2.5 Pro (google/gemini-2.5-pro)</option>
                        <option value="anthropic/claude-3.5-sonnet">Claude 3.5 Sonnet (anthropic/claude-3.5-sonnet)</option>
                        <option value="meta-llama/llama-3.1-70b-instruct">Llama 3.1 70B (meta-llama/llama-3.1-70b-instruct)</option>
                        <option value="mistralai/mistral-large">Mistral Large (mistralai/mistral-large)</option>
                        <option value="custom">Custom model identifier...</option>
                      </select>
                      
                      {(![
                        'google/gemini-2.5-flash',
                        'google/gemini-2.5-pro',
                        'anthropic/claude-3.5-sonnet',
                        'meta-llama/llama-3.1-70b-instruct',
                        'mistralai/mistral-large'
                      ].includes(localConfig.openrouterModel || '') || 
                        !localConfig.openrouterModel) && (
                        <input
                          type="text"
                          placeholder="e.g. google/gemini-2.5-flash"
                          value={localConfig.openrouterModel || ''}
                          onChange={(e): void => setLocalConfig({ ...localConfig, openrouterModel: e.target.value })}
                          className="w-full bg-zinc-950 border border-zinc-850 rounded-lg p-2.5 text-sm text-white placeholder-zinc-700 focus:outline-none focus:border-indigo-500 font-mono"
                        />
                      )}
                    </div>
                  </div>
                  <p className="text-[10px] text-zinc-500 mt-1">
                    Select a model or enter any valid OpenRouter model identifier string.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-zinc-800/80 flex justify-end">
            <button
              type="submit"
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-lg text-sm font-bold shadow-lg shadow-indigo-600/10 transition cursor-pointer"
            >
              Save Configuration
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
