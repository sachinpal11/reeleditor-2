import React from 'react';
import { Template } from '../../../../shared/types';

interface PropertyPanelProps {
  template: Template;
  selectedElementId: string | null;
  onChangeElement: (elementKey: 'video' | 'headline' | 'logo' | 'watermark', changes: any) => void;
  onChangeTemplate: (changes: Partial<Template>) => void;
  onSave: () => void;
}

export const PropertyPanel: React.FC<PropertyPanelProps> = ({
  template,
  selectedElementId,
  onChangeElement,
  onChangeTemplate,
  onSave,
}) => {
  const handleSelectBackground = async (): Promise<void> => {
    const file = await window.api.selectFile([
      { name: 'Images', extensions: ['png', 'jpg', 'jpeg'] },
    ]);
    if (file) {
      // Temporarily store path, and saveTemplate in IPC will copy it
      onChangeTemplate({ backgroundPath: file });
    }
  };

  const handleSelectLogo = async (): Promise<void> => {
    const file = await window.api.selectFile([
      { name: 'Images', extensions: ['png', 'jpg', 'jpeg'] },
    ]);
    if (file) {
      onChangeTemplate({ logoPath: file });
      if (!template.logo) {
        onChangeElement('logo', { x: 50, y: 1700, width: 150, height: 150, opacity: 1, rotation: 0 });
      }
    }
  };

  const handleSelectWatermark = async (): Promise<void> => {
    const file = await window.api.selectFile([
      { name: 'Images', extensions: ['png', 'jpg', 'jpeg'] },
    ]);
    if (file) {
      onChangeTemplate({ watermarkPath: file });
      if (!template.watermark) {
        onChangeElement('watermark', { x: 900, y: 1800, width: 120, height: 120, opacity: 0.25, rotation: 0 });
      }
    }
  };

  const renderVideoProperties = (): React.JSX.Element => {
    const { x, y, width, height } = template.video;
    return (
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-zinc-300">Video Placeholder</h4>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-zinc-500 block mb-1">X Position</label>
            <input
              type="number"
              value={x}
              onChange={(e): void => onChangeElement('video', { x: parseInt(e.target.value) || 0 })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded p-2 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-500 block mb-1">Y Position</label>
            <input
              type="number"
              value={y}
              onChange={(e): void => onChangeElement('video', { y: parseInt(e.target.value) || 0 })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded p-2 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-500 block mb-1">Width</label>
            <input
              type="number"
              value={width}
              onChange={(e): void => onChangeElement('video', { width: parseInt(e.target.value) || 0 })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded p-2 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-500 block mb-1">Height</label>
            <input
              type="number"
              value={height}
              onChange={(e): void => onChangeElement('video', { height: parseInt(e.target.value) || 0 })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded p-2 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>
      </div>
    );
  };

  const renderHeadlineProperties = (): React.JSX.Element => {
    const { x, y, width, size, weight, color, align, font } = template.headline;
    return (
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-zinc-300">Headline Text</h4>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-zinc-500 block mb-1">X Position</label>
            <input
              type="number"
              value={x}
              onChange={(e): void => onChangeElement('headline', { x: parseInt(e.target.value) || 0 })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded p-2 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-500 block mb-1">Y Position</label>
            <input
              type="number"
              value={y}
              onChange={(e): void => onChangeElement('headline', { y: parseInt(e.target.value) || 0 })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded p-2 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-500 block mb-1">Width</label>
            <input
              type="number"
              value={width}
              onChange={(e): void => onChangeElement('headline', { width: parseInt(e.target.value) || 0 })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded p-2 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-500 block mb-1">Font Size</label>
            <input
              type="number"
              value={size}
              onChange={(e): void => onChangeElement('headline', { size: parseInt(e.target.value) || 0 })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded p-2 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div>
          <label className="text-xs text-zinc-500 block mb-1">Font Family</label>
          <select
            value={font}
            onChange={(e): void => onChangeElement('headline', { font: e.target.value })}
            className="w-full bg-zinc-800 border border-zinc-700 rounded p-2 text-sm text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="Poppins">Poppins</option>
            <option value="Montserrat">Montserrat</option>
            <option value="Outfit">Outfit</option>
            <option value="Inter">Inter</option>
            <option value="Arial">Arial</option>
            <option value="sans-serif">System Sans</option>
          </select>
        </div>

        <div>
          <label className="text-xs text-zinc-400 block mb-1.5 font-semibold">Text Style</label>
          <div className="flex bg-zinc-850 rounded p-1 border border-zinc-750 gap-1">
            {[
              { value: 'regular', label: 'Regular' },
              { value: 'bold', label: 'Simple Bold' },
              { value: 'brand-bold', label: 'Brand Bold' }
            ].map((opt) => {
              const active = template.headline.textStyle === opt.value || 
                             (!template.headline.textStyle && opt.value === (template.headline.weight === 'Bold' ? 'bold' : 'regular'));
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={(): void => {
                    const changes: any = { textStyle: opt.value };
                    if (opt.value === 'regular') {
                      changes.weight = 'Regular';
                    } else if (opt.value === 'bold') {
                      changes.weight = 'Bold';
                    } else if (opt.value === 'brand-bold') {
                      changes.weight = 'Bold';
                      changes.color = template.brandColor || '#6366f1';
                    }
                    onChangeElement('headline', changes);
                  }}
                  className={`flex-1 text-xs py-1.5 rounded transition font-semibold cursor-pointer ${
                    active
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="text-xs text-zinc-500 block mb-1">Preview Headline Text</label>
          <input
            type="text"
            value={template.headline.previewText || 'Your Headline Text Here'}
            onChange={(e): void => onChangeElement('headline', { previewText: e.target.value })}
            className="w-full bg-zinc-800 border border-zinc-700 rounded p-2 text-sm text-white focus:outline-none focus:border-indigo-500"
          />
        </div>

        {(() => {
          const previewText = template.headline.previewText || 'Your Headline Text Here';
          const words = previewText.trim().split(/\s+/).filter(Boolean);
          if (words.length === 0) return null;
          return (
            <div className="space-y-2 mt-2 bg-zinc-950/40 p-2.5 rounded border border-zinc-800/45">
              <label className="text-xs text-zinc-400 block font-semibold mb-1">Word Highlights</label>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {words.map((word, idx) => {
                  const currentStyle = (template.headline.wordStyles && template.headline.wordStyles[idx]) || 
                                       template.headline.textStyle || 
                                       (template.headline.weight === 'Bold' ? 'bold' : 'regular');
                  return (
                    <div key={idx} className="flex items-center justify-between gap-2 text-xs">
                      <span className="text-zinc-300 font-medium truncate max-w-[80px]" title={word}>
                        "{word}"
                      </span>
                      <div className="flex bg-zinc-800 rounded p-0.5 border border-zinc-700 gap-0.5">
                        {[
                          { value: 'regular', label: 'Reg' },
                          { value: 'bold', label: 'Bold' },
                          { value: 'brand-bold', label: 'Brand' }
                        ].map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={(): void => {
                              const newWordStyles = [...(template.headline.wordStyles || [])];
                              while (newWordStyles.length <= idx) {
                                newWordStyles.push(template.headline.textStyle || (template.headline.weight === 'Bold' ? 'bold' : 'regular'));
                              }
                              newWordStyles[idx] = opt.value as any;
                              onChangeElement('headline', { wordStyles: newWordStyles });
                            }}
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold transition cursor-pointer ${
                              currentStyle === opt.value
                                ? 'bg-indigo-600 text-white'
                                : 'text-zinc-400 hover:text-zinc-250'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-zinc-500 block mb-1">Weight</label>
            <select
              value={weight}
              onChange={(e): void => {
                const newWeight = e.target.value;
                const changes: any = { weight: newWeight };
                if (newWeight === 'Regular') {
                  changes.textStyle = 'regular';
                } else if (newWeight === 'Bold') {
                  const currentBrandColor = template.brandColor || '#6366f1';
                  if (template.headline.color.toLowerCase() === currentBrandColor.toLowerCase()) {
                    changes.textStyle = 'brand-bold';
                  } else {
                    changes.textStyle = 'bold';
                  }
                } else {
                  changes.textStyle = undefined;
                }
                onChangeElement('headline', changes);
              }}
              className="w-full bg-zinc-800 border border-zinc-700 rounded p-2 text-sm text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="Regular">Regular</option>
              <option value="Medium">Medium</option>
              <option value="SemiBold">SemiBold</option>
              <option value="Bold">Bold</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-zinc-500 block mb-1">Color</label>
            <div className="flex gap-2">
              <input
                type="color"
                value={color}
                onChange={(e): void => {
                  const newColor = e.target.value;
                  const changes: any = { color: newColor };
                  const currentBrandColor = template.brandColor || '#6366f1';
                  if (template.headline.textStyle === 'brand-bold' && newColor.toLowerCase() !== currentBrandColor.toLowerCase()) {
                    changes.textStyle = 'bold';
                  }
                  onChangeElement('headline', changes);
                }}
                className="w-10 h-9 bg-zinc-800 border border-zinc-700 rounded cursor-pointer"
              />
              <input
                type="text"
                value={color}
                onChange={(e): void => {
                  const newColor = e.target.value;
                  const changes: any = { color: newColor };
                  const currentBrandColor = template.brandColor || '#6366f1';
                  if (template.headline.textStyle === 'brand-bold' && newColor.toLowerCase() !== currentBrandColor.toLowerCase()) {
                    changes.textStyle = 'bold';
                  }
                  onChangeElement('headline', changes);
                }}
                className="flex-1 w-full bg-zinc-800 border border-zinc-700 rounded p-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="text-xs text-zinc-500 block mb-1">Alignment</label>
          <div className="flex bg-zinc-800 rounded p-1 border border-zinc-700">
            {(['left', 'center', 'right'] as const).map((mode) => (
              <button
                key={mode}
                onClick={(): void => onChangeElement('headline', { align: mode })}
                className={`flex-1 text-xs py-1 rounded capitalize ${
                  align === mode ? 'bg-indigo-600 text-white font-semibold' : 'text-zinc-400 hover:text-white'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderLogoProperties = (): React.JSX.Element => {
    if (!template.logo) return <div className="text-zinc-500 text-sm">No logo added to template. Select a logo file to enable.</div>;
    const { x, y, width, height, opacity, rotation } = template.logo;
    return (
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-zinc-300">Logo Image Properties</h4>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-zinc-500 block mb-1">X Position</label>
            <input
              type="number"
              value={x}
              onChange={(e): void => onChangeElement('logo', { x: parseInt(e.target.value) || 0 })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded p-2 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-500 block mb-1">Y Position</label>
            <input
              type="number"
              value={y}
              onChange={(e): void => onChangeElement('logo', { y: parseInt(e.target.value) || 0 })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded p-2 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-500 block mb-1">Width</label>
            <input
              type="number"
              value={width}
              onChange={(e): void => onChangeElement('logo', { width: parseInt(e.target.value) || 0 })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded p-2 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-500 block mb-1">Height</label>
            <input
              type="number"
              value={height}
              onChange={(e): void => onChangeElement('logo', { height: parseInt(e.target.value) || 0 })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded p-2 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-zinc-500 block mb-1">Opacity</label>
            <input
              type="number"
              step="0.05"
              min="0"
              max="1"
              value={opacity ?? 1}
              onChange={(e): void => onChangeElement('logo', { opacity: parseFloat(e.target.value) || 0 })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded p-2 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-500 block mb-1">Rotation (deg)</label>
            <input
              type="number"
              value={rotation ?? 0}
              onChange={(e): void => onChangeElement('logo', { rotation: parseInt(e.target.value) || 0 })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded p-2 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>
      </div>
    );
  };

  const renderWatermarkProperties = (): React.JSX.Element => {
    if (!template.watermark) return <div className="text-zinc-500 text-sm">No watermark added. Select a watermark file to enable.</div>;
    const { x, y, width, height, opacity, rotation } = template.watermark;
    return (
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-zinc-300">Watermark Properties</h4>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-zinc-500 block mb-1">X Position</label>
            <input
              type="number"
              value={x}
              onChange={(e): void => onChangeElement('watermark', { x: parseInt(e.target.value) || 0 })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded p-2 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-500 block mb-1">Y Position</label>
            <input
              type="number"
              value={y}
              onChange={(e): void => onChangeElement('watermark', { y: parseInt(e.target.value) || 0 })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded p-2 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-500 block mb-1">Width</label>
            <input
              type="number"
              value={width}
              onChange={(e): void => onChangeElement('watermark', { width: parseInt(e.target.value) || 0 })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded p-2 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-500 block mb-1">Height</label>
            <input
              type="number"
              value={height}
              onChange={(e): void => onChangeElement('watermark', { height: parseInt(e.target.value) || 0 })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded p-2 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-zinc-500 block mb-1">Opacity ({Math.round((opacity ?? 0.25) * 100)}%)</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={opacity ?? 0.25}
              onChange={(e): void => onChangeElement('watermark', { opacity: parseFloat(e.target.value) })}
              className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 mt-2"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-500 block mb-1">Rotation (deg)</label>
            <input
              type="number"
              value={rotation ?? 0}
              onChange={(e): void => onChangeElement('watermark', { rotation: parseInt(e.target.value) || 0 })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded p-2 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div>
          <label className="text-xs text-zinc-400 block mb-1 font-semibold">Watermark Alignment</label>
          <div className="flex bg-zinc-850 rounded p-1 border border-zinc-750 gap-1">
            {(['left', 'center', 'right'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={(): void => onChangeElement('watermark', { align: mode })}
                className={`flex-1 text-xs py-1 rounded capitalize transition font-semibold cursor-pointer ${
                  (template.watermark?.align || 'right') === mode
                    ? 'bg-indigo-600 text-white'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-80 bg-zinc-900 border-l border-zinc-800 h-full flex flex-col justify-between">
      {/* Scrollable controls */}
      <div className="p-4 space-y-6 overflow-y-auto flex-1">
        {/* Template metadata */}
        <div className="space-y-3">
          <h3 className="text-base font-bold text-white">Template Properties</h3>
          <div>
            <label className="text-xs text-zinc-400 block mb-1 font-medium">Template Name</label>
            <input
              type="text"
              placeholder="Untitled Template"
              value={template.name}
              onChange={(e): void => onChangeTemplate({ name: e.target.value })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded p-2 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-400 block mb-1.5 font-medium">Brand Color</label>
            <div className="flex gap-2">
              <input
                type="color"
                value={template.brandColor || '#6366f1'}
                onChange={(e): void => onChangeTemplate({ brandColor: e.target.value })}
                className="w-10 h-9 bg-zinc-800 border border-zinc-700 rounded cursor-pointer"
              />
              <input
                type="text"
                value={template.brandColor || '#6366f1'}
                onChange={(e): void => onChangeTemplate({ brandColor: e.target.value })}
                className="flex-1 w-full bg-zinc-800 border border-zinc-700 rounded p-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="auto-adjust-checkbox"
              checked={!!template.autoAdjust}
              onChange={(e): void => onChangeTemplate({ autoAdjust: e.target.checked })}
              className="accent-indigo-500 w-4 h-4 cursor-pointer"
            />
            <label htmlFor="auto-adjust-checkbox" className="text-xs text-zinc-300 cursor-pointer select-none font-semibold">
              Auto-Adjust Blocks (24px gap)
            </label>
          </div>
        </div>

        <hr className="border-zinc-800" />

        {/* Global Asset Selectors */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-zinc-300">Layout Assets</h4>

          <div>
            <label className="text-xs text-zinc-500 block mb-1 font-medium">Background Image</label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={template.backgroundPath ? template.backgroundPath.split(/[\\/]/).pop() : 'Default Color'}
                className="flex-1 bg-zinc-800 border border-zinc-700 rounded p-2 text-xs text-zinc-400 focus:outline-none"
              />
              <button
                onClick={handleSelectBackground}
                className="px-3 py-1 bg-zinc-700 hover:bg-zinc-600 text-white rounded text-xs transition font-semibold"
              >
                Browse
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs text-zinc-500 block mb-1 font-medium">Logo Image</label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={template.logoPath ? template.logoPath.split(/[\\/]/).pop() : 'None'}
                className="flex-1 bg-zinc-800 border border-zinc-700 rounded p-2 text-xs text-zinc-400 focus:outline-none"
              />
              <button
                onClick={handleSelectLogo}
                className="px-3 py-1 bg-zinc-700 hover:bg-zinc-600 text-white rounded text-xs transition font-semibold"
              >
                Browse
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs text-zinc-500 block mb-1 font-medium">Watermark Image</label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={template.watermarkPath ? template.watermarkPath.split(/[\\/]/).pop() : 'None'}
                className="flex-1 bg-zinc-800 border border-zinc-700 rounded p-2 text-xs text-zinc-400 focus:outline-none"
              />
              <button
                onClick={handleSelectWatermark}
                className="px-3 py-1 bg-zinc-700 hover:bg-zinc-600 text-white rounded text-xs transition font-semibold"
              >
                Browse
              </button>
            </div>
          </div>
        </div>

        <hr className="border-zinc-800" />

        {/* Selected Element properties */}
        {selectedElementId === 'video' && renderVideoProperties()}
        {selectedElementId === 'headline' && renderHeadlineProperties()}
        {selectedElementId === 'logo' && renderLogoProperties()}
        {selectedElementId === 'watermark' && renderWatermarkProperties()}
        {!selectedElementId && (
          <div className="text-zinc-500 text-sm text-center py-6">
            Click on a box or text in the live canvas to edit its properties.
          </div>
        )}

        <hr className="border-zinc-800" />

        {/* Export Settings */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-zinc-300">Export Settings</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-500 block mb-1">FPS</label>
              <select
                value={template.exportSettings.fps}
                onChange={(e): void =>
                  onChangeTemplate({
                    exportSettings: { ...template.exportSettings, fps: parseInt(e.target.value) || 30 },
                  })
                }
                className="w-full bg-zinc-800 border border-zinc-700 rounded p-2 text-sm text-white focus:outline-none"
              >
                <option value="24">24 fps</option>
                <option value="30">30 fps</option>
                <option value="60">60 fps</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-zinc-500 block mb-1">Bitrate</label>
              <input
                type="text"
                value={template.exportSettings.videoBitrate}
                onChange={(e): void =>
                  onChangeTemplate({
                    exportSettings: { ...template.exportSettings, videoBitrate: e.target.value },
                  })
                }
                className="w-full bg-zinc-800 border border-zinc-700 rounded p-2 text-sm text-white focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Save Action */}
      <div className="p-4 border-t border-zinc-800 bg-zinc-950">
        <button
          onClick={onSave}
          className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-lg text-sm font-bold transition shadow-lg shadow-indigo-600/10 cursor-pointer"
        >
          Save Template Settings
        </button>
      </div>
    </div>
  );
};
