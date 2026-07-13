import React, { useEffect, useState } from 'react';

interface ExportItem {
  name: string;
  path: string;
  size: number;
  createdAt: number;
}

export const ExportsPage: React.FC = () => {
  const [exportsList, setExportsList] = useState<ExportItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchExports = async (): Promise<void> => {
    try {
      setIsLoading(true);
      const list = await window.api.listExports();
      setExportsList(list);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchExports();
  }, []);

  const handleOpenFolder = async (): Promise<void> => {
    await window.api.openExportFolder();
  };

  const handlePlayFile = async (filePath: string): Promise<void> => {
    await window.api.playExportFile(filePath);
  };

  const formatSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = 2;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  return (
    <div className="flex-1 bg-zinc-950 p-6 flex flex-col min-h-0 h-full">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Exported Clips</h2>
          <p className="text-sm text-zinc-500 mt-1">
            View and play rendered MP4 files located in your default export directory.
          </p>
        </div>
        <button
          onClick={handleOpenFolder}
          className="px-4 py-2 bg-indigo-650 hover:bg-indigo-750 active:bg-indigo-850 text-white rounded-lg text-xs font-semibold shadow-lg shadow-indigo-600/15 transition flex items-center gap-1.5 cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          Open Exports Folder
        </button>
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center text-zinc-500">
          Scanning export directory...
        </div>
      ) : exportsList.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 border border-dashed border-zinc-800 rounded-xl">
          <svg className="w-16 h-16 text-zinc-800 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <h4 className="text-base font-semibold text-zinc-500">No exported videos yet</h4>
          <p className="text-xs text-zinc-600 max-w-xs mt-1">
            Complete render jobs from the Queue page to generate branded mp4 exports.
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto min-h-0 bg-zinc-900 border border-zinc-850 rounded-xl shadow-lg">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-800 text-xs text-zinc-400 font-semibold tracking-wider bg-zinc-900/50 uppercase select-none">
                <th className="p-4 pl-6">File Name</th>
                <th className="p-4">Size</th>
                <th className="p-4">Created At</th>
                <th className="p-4 pr-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-850">
              {exportsList.map((item) => (
                <tr key={item.path} className="hover:bg-zinc-800/20 transition text-sm text-zinc-300">
                  <td className="p-4 pl-6 font-medium truncate max-w-xs" title={item.name}>
                    {item.name}
                  </td>
                  <td className="p-4 text-zinc-500 font-mono">{formatSize(item.size)}</td>
                  <td className="p-4 text-zinc-500">
                    {new Date(item.createdAt).toLocaleString()}
                  </td>
                  <td className="p-4 pr-6 text-right">
                    <button
                      onClick={(): Promise<void> => handlePlayFile(item.path)}
                      className="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-650 text-white rounded text-xs font-semibold shadow transition cursor-pointer"
                    >
                      Play Video
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
