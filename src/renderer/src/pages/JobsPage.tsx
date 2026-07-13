import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../hooks/useAppStore';
import { Job, RewriteMode } from '../../../shared/types';
import { useToastStore } from '../hooks/useToastStore';

export const JobsPage: React.FC = () => {
  const { templates, jobs, createJobs, controlJob, clearCompletedJobs, setJobs } = useAppStore();
  const { addToast } = useToastStore();
  const [urlsInput, setUrlsInput] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [rewriteMode, setRewriteMode] = useState<RewriteMode>('Original');
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  const logsEndRef = useRef<HTMLDivElement>(null);

  // Subscribe to live job updates from Electron main process
  useEffect(() => {
    // Initial fetch
    window.api.listJobs().then((fetchedJobs) => {
      setJobs(fetchedJobs);
    });

    const unsubscribe = window.api.onJobsChanged((updatedJobs) => {
      setJobs(updatedJobs);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Auto-scroll logs to bottom
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedJobId, jobs]);

  // Set default template if none selected
  useEffect(() => {
    if (templates.length > 0 && !selectedTemplateId) {
      setSelectedTemplateId(templates[0].id);
    }
  }, [templates]);

  const handleStartQueue = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const urls = urlsInput
      .split('\n')
      .map((u) => u.trim())
      .filter((u) => u.length > 0);

    if (urls.length === 0) {
      addToast('Please enter at least one Instagram URL.', 'warning');
      return;
    }
    if (!selectedTemplateId) {
      addToast('Please select a template first.', 'warning');
      return;
    }

    try {
      await createJobs(urls, selectedTemplateId, rewriteMode);
      setUrlsInput('');
      addToast('Jobs successfully added to queue!', 'success');
    } catch (err: any) {
      addToast(`Failed to add jobs to queue: ${err.message}`, 'error');
    }
  };

  const selectedJob = jobs.find((j) => j.id === selectedJobId) || jobs[0];

  const getStatusColor = (status: Job['status']): string => {
    switch (status) {
      case 'Waiting':
        return 'bg-zinc-700 text-zinc-300';
      case 'Downloading':
        return 'bg-blue-600/20 text-blue-400 border border-blue-500/20';
      case 'Cropping':
      case 'OCR':
      case 'Rewriting':
        return 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/20';
      case 'Rendering':
        return 'bg-amber-600/20 text-amber-400 border border-amber-500/20';
      case 'Completed':
        return 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/20';
      case 'Failed':
        return 'bg-red-600/20 text-red-400 border border-red-500/20';
      default:
        return 'bg-zinc-800 text-zinc-400';
    }
  };

  return (
    <div className="flex-1 flex h-full min-h-0 bg-zinc-950 p-6 gap-6">
      {/* Left panel: URL input + Job Queue list */}
      <div className="flex-[3] flex flex-col gap-6 min-w-0 h-full">
        {/* Creator panel */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-lg">
          <h3 className="text-base font-bold text-white mb-3">Create Render Jobs</h3>
          <form onSubmit={handleStartQueue} className="space-y-4">
            <div>
              <label className="text-xs text-zinc-400 block mb-1.5 font-medium">
                Instagram Video URLs (One per line)
              </label>
              <textarea
                value={urlsInput}
                onChange={(e): void => setUrlsInput(e.target.value)}
                placeholder="https://www.instagram.com/reel/C8..."
                rows={3}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500 transition font-mono"
              />
            </div>

            <div className="flex gap-4 items-end">
              <div className="flex-[2]">
                <label className="text-xs text-zinc-400 block mb-1.5 font-medium">Select Branded Template</label>
                <select
                  value={selectedTemplateId}
                  onChange={(e): void => setSelectedTemplateId(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition"
                >
                  <option value="" disabled>Select template...</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex-1">
                <label className="text-xs text-zinc-400 block mb-1.5 font-medium">AI Headline Mode</label>
                <select
                  value={rewriteMode}
                  onChange={(e): void => setRewriteMode(e.target.value as RewriteMode)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition"
                >
                  <option value="Original">Original Text</option>
                  <option value="Rewrite">Paraphrase</option>
                  <option value="Short">Short Summary</option>
                  <option value="Curiosity">Curiosity Hook</option>
                  <option value="Viral">Viral/Emoji Hook</option>
                  <option value="Question">Engaging Question</option>
                </select>
              </div>

              <button
                type="submit"
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-lg text-sm font-bold shadow-lg shadow-indigo-600/15 transition cursor-pointer"
              >
                Add to Queue
              </button>
            </div>
          </form>
        </div>

        {/* Job Queue List */}
        <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-lg flex flex-col min-h-0">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white">Execution Queue</h3>
              <span className="bg-zinc-800 text-zinc-400 text-xs px-2 py-0.5 rounded-full font-semibold">
                {jobs.length} jobs
              </span>
            </div>
            {jobs.some((j) => j.status === 'Completed' || j.status === 'Failed') && (
              <button
                onClick={clearCompletedJobs}
                className="text-xs text-zinc-500 hover:text-zinc-300 font-semibold transition"
              >
                Clear Finished
              </button>
            )}
          </div>

          {jobs.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 border border-dashed border-zinc-800 rounded-lg">
              <svg className="w-12 h-12 text-zinc-800 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <h4 className="text-sm font-semibold text-zinc-500">Queue is empty</h4>
              <p className="text-xs text-zinc-600 max-w-xs mt-1">
                Enter Instagram URLs above and select a template to populate the render queue.
              </p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {jobs.map((job) => (
                <div
                  key={job.id}
                  onClick={(): void => setSelectedJobId(job.id)}
                  className={`flex flex-col p-4 rounded-lg border transition cursor-pointer ${
                    selectedJobId === job.id || (!selectedJobId && jobs[0]?.id === job.id)
                      ? 'bg-zinc-800/80 border-zinc-700 shadow-md'
                      : 'bg-zinc-800/20 border-zinc-800 hover:bg-zinc-800/40 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="min-w-0 flex-1 pr-2">
                      <p className="text-xs text-zinc-500 font-mono truncate">{job.id}</p>
                      <p className="text-sm font-medium text-zinc-200 truncate mt-0.5" title={job.sourceUrl}>
                        {job.sourceUrl}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full ${getStatusColor(job.status)}`}>
                        {job.status}
                      </span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full flex items-center gap-3">
                    <div className="flex-1 bg-zinc-950 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          job.status === 'Failed'
                            ? 'bg-red-500'
                            : job.status === 'Completed'
                            ? 'bg-emerald-400'
                            : 'bg-indigo-500'
                        }`}
                        style={{ width: `${job.progress}%` }}
                      />
                    </div>
                    <span className="text-xs text-zinc-400 font-mono w-8 text-right">{job.progress}%</span>
                  </div>

                  {/* Actions bar for individual job */}
                  <div className="flex justify-between items-center mt-3 pt-2 border-t border-zinc-800/60">
                    <span className="text-[10px] text-zinc-600">
                      Created: {new Date(job.createdAt).toLocaleTimeString()}
                    </span>
                    <div className="flex gap-2">
                      {job.status === 'Failed' && (
                        <button
                          onClick={(e): void => {
                            e.stopPropagation();
                            controlJob(job.id, 'retry');
                          }}
                          className="text-[10px] bg-zinc-700 hover:bg-zinc-600 text-white px-2 py-0.5 rounded transition cursor-pointer"
                        >
                          Retry
                        </button>
                      )}
                      {(job.status === 'Waiting' ||
                        job.status === 'Downloading' ||
                        job.status === 'Cropping' ||
                        job.status === 'OCR' ||
                        job.status === 'Rendering') && (
                        <button
                          onClick={(e): void => {
                            e.stopPropagation();
                            controlJob(job.id, 'cancel');
                          }}
                          className="text-[10px] bg-red-950/40 hover:bg-red-900/60 text-red-400 px-2 py-0.5 rounded border border-red-900/30 transition cursor-pointer"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right panel: Active Console Logs & Job Detail */}
      <div className="flex-[2] bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-lg flex flex-col min-w-0 h-full">
        {selectedJob ? (
          <div className="flex flex-col h-full min-h-0">
            <div className="mb-4">
              <h3 className="text-base font-bold text-white">Job Detail & Logs</h3>
              <p className="text-xs text-zinc-500 font-mono mt-0.5 truncate">{selectedJob.id}</p>
            </div>

            {/* Structured metadata */}
            <div className="bg-zinc-950 border border-zinc-850 rounded-lg p-3.5 space-y-2 mb-4 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-zinc-600">Status:</span>
                <span className="text-zinc-300 font-semibold">{selectedJob.status}</span>
              </div>
              {selectedJob.headline && (
                <div className="flex flex-col gap-1 border-t border-zinc-800/40 pt-2">
                  <span className="text-zinc-600">Extracted Text:</span>
                  <span className="text-zinc-300 bg-zinc-900/50 p-1.5 rounded border border-zinc-800/30 truncate" title={selectedJob.headline}>
                    {selectedJob.headline}
                  </span>
                </div>
              )}
              {selectedJob.outputVideoPath && (
                <div className="flex flex-col gap-1 border-t border-zinc-800/40 pt-2">
                  <span className="text-zinc-600">Render Output:</span>
                  <span className="text-zinc-400 truncate" title={selectedJob.outputVideoPath}>
                    {selectedJob.outputVideoPath}
                  </span>
                </div>
              )}
              {selectedJob.errorMessage && (
                <div className="flex flex-col gap-1 border-t border-zinc-800/40 pt-2">
                  <span className="text-red-400">Error Message:</span>
                  <span className="text-red-400 font-semibold">{selectedJob.errorMessage}</span>
                </div>
              )}
            </div>

            {/* Console Log Panel */}
            <div className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg p-4 font-mono text-xs text-zinc-400 overflow-y-auto flex flex-col gap-1.5 min-h-0">
              <div className="text-zinc-600 select-none pb-1.5 border-b border-zinc-800/60 mb-1.5">
                --- CONSOLE LOGS ---
              </div>
              {selectedJob.logs.map((log, index) => (
                <div key={index} className="leading-5 whitespace-pre-wrap">
                  <span className="text-zinc-700 select-none mr-2 font-mono">[{index + 1}]</span>
                  {log}
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-zinc-500">
            <p className="text-sm font-semibold">No active job selected</p>
            <p className="text-xs text-zinc-600 max-w-[200px] mt-1">
              Select any job from the queue to view its execution logs and parameters in real time.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
