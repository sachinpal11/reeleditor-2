import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/sidebar/Sidebar';
import { TemplatesPage } from './pages/TemplatesPage';
import { JobsPage } from './pages/JobsPage';
import { ExportsPage } from './pages/ExportsPage';
import { SettingsPage } from './pages/SettingsPage';
import { useAppStore } from './hooks/useAppStore';
import { ToastContainer } from './components/common/ToastContainer';
import { useToastStore } from './hooks/useToastStore';

type TabType = 'templates' | 'jobs' | 'exports' | 'settings';

function App(): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<TabType>('templates');
  const { loadConfig, loadTemplates } = useAppStore();
  const { addToast } = useToastStore();

  useEffect(() => {
    // Load config and templates on startup
    loadConfig();
    loadTemplates();
  }, []);

  // Subscribe to live job updates globally for toast notifications
  useEffect(() => {
    let prevJobsMap = new Map<string, string>();
    
    // Initial fetch to populate previous state
    window.api.listJobs().then((fetchedJobs) => {
      prevJobsMap = new Map(fetchedJobs.map(j => [j.id, j.status]));
    });

    const unsubscribe = window.api.onJobsChanged((updatedJobs) => {
      for (const job of updatedJobs) {
        const prevStatus = prevJobsMap.get(job.id);
        if (prevStatus !== job.status) {
          if (job.status === 'Completed') {
            addToast(`Video render completed successfully!`, 'success');
          } else if (job.status === 'Failed') {
            addToast(`Video render failed: ${job.errorMessage || 'Unknown error'}`, 'error');
          } else if (job.status === 'Downloading') {
            addToast(`Starting download for video...`, 'info');
          } else if (job.status === 'Cropping') {
            addToast(`Cropping video to template dimensions...`, 'info');
          } else if (job.status === 'OCR') {
            addToast(`Extracting headline from video using OCR...`, 'info');
          } else if (job.status === 'Rendering') {
            addToast(`Compiling and rendering final video...`, 'info');
          }
        }
      }
      prevJobsMap = new Map(updatedJobs.map(j => [j.id, j.status]));
    });

    return () => {
      unsubscribe();
    };
  }, [addToast]);

  const renderActivePage = (): React.JSX.Element => {
    switch (activeTab) {
      case 'templates':
        return <TemplatesPage />;
      case 'jobs':
        return <JobsPage />;
      case 'exports':
        return <ExportsPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <TemplatesPage />;
    }
  };

  return (
    <div className="flex h-screen w-screen bg-zinc-950 text-zinc-50 overflow-hidden font-body">
      {/* Side Navigation Menu */}
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Main View Area */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {renderActivePage()}
      </main>

      <ToastContainer />
    </div>
  );
}

export default App;
