import React from 'react';
import { Template } from '../../../../shared/types';

interface TemplateListProps {
  templates: Template[];
  selectedId: string | null;
  onSelect: (template: Template) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}

export const TemplateList: React.FC<TemplateListProps> = ({
  templates,
  selectedId,
  onSelect,
  onNew,
  onDelete,
}) => {
  return (
    <div className="w-64 bg-zinc-900 border-r border-zinc-800 h-full flex flex-col justify-between">
      <div className="p-4 flex-1 flex flex-col min-h-0">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-base font-bold text-white">Your Templates</h3>
          <button
            onClick={onNew}
            className="text-xs bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white px-2.5 py-1 rounded transition font-bold cursor-pointer"
          >
            + New
          </button>
        </div>

        {templates.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
            <p className="text-sm text-zinc-500 mb-2">No templates found</p>
            <button
              onClick={onNew}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
            >
              Create your first template
            </button>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {templates.map((template) => (
              <div
                key={template.id}
                onClick={(): void => onSelect(template)}
                className={`group flex items-center justify-between p-3 rounded-lg border transition cursor-pointer ${
                  selectedId === template.id
                    ? 'bg-zinc-800 border-indigo-600/80 shadow-md shadow-indigo-600/5'
                    : 'bg-zinc-800/40 border-zinc-800 hover:bg-zinc-800/80 hover:border-zinc-700'
                }`}
              >
                <div className="flex-1 min-w-0 pr-2">
                  <p className="text-sm font-semibold text-zinc-200 truncate">
                    {template.name || 'Untitled Template'}
                  </p>
                  <p className="text-xs text-zinc-500 truncate">
                    Text: {template.headline.font} ({template.headline.size}px)
                  </p>
                </div>
                <button
                  onClick={(e): void => {
                    e.stopPropagation();
                    if (confirm(`Are you sure you want to delete "${template.name}"?`)) {
                      onDelete(template.id);
                    }
                  }}
                  className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-red-400 p-1 rounded transition hover:bg-zinc-700/60 cursor-pointer"
                  title="Delete Template"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
