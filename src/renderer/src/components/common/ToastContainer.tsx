import React from 'react';
import { useToastStore } from '../../hooks/useToastStore';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToastStore();

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-2xl backdrop-blur-md transition-all duration-300 transform scale-100 animate-slide-in ${
            toast.type === 'success'
              ? 'bg-zinc-900/95 border-emerald-500/20 text-emerald-100 shadow-emerald-950/20'
              : toast.type === 'error'
              ? 'bg-zinc-900/95 border-red-500/20 text-red-100 shadow-red-950/20'
              : toast.type === 'warning'
              ? 'bg-zinc-900/95 border-amber-500/20 text-amber-100 shadow-amber-950/20'
              : 'bg-zinc-900/95 border-indigo-500/20 text-indigo-100 shadow-indigo-950/20'
          }`}
        >
          {/* Icon */}
          <div className="mt-0.5 flex items-center justify-center w-5 h-5 rounded-full shrink-0">
            {toast.type === 'success' && (
              <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            )}
            {toast.type === 'error' && (
              <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            {toast.type === 'warning' && (
              <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            )}
            {toast.type === 'info' && (
              <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </div>

          {/* Message */}
          <div className="flex-1 text-xs font-semibold leading-relaxed">
            {toast.message}
          </div>

          {/* Dismiss button */}
          <button
            onClick={() => removeToast(toast.id)}
            className="text-zinc-500 hover:text-zinc-300 transition shrink-0 cursor-pointer focus:outline-none"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
};
