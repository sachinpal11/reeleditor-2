import React, { useState, useEffect } from 'react';
import { useAppStore } from '../hooks/useAppStore';
import { TemplateList } from '../components/template/TemplateList';
import { CanvasEditor } from '../components/template/CanvasEditor';
import { PropertyPanel } from '../components/template/PropertyPanel';
import { Template } from '../../../shared/types';
import { useToastStore } from '../hooks/useToastStore';

export const TemplatesPage: React.FC = () => {
  const { templates, activeTemplate, loadTemplates, selectTemplate, saveTemplate, deleteTemplate } =
    useAppStore();
  const { addToast } = useToastStore();

  const [localTemplate, setLocalTemplate] = useState<Template | null>(null);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);

  // Sync local edits when active template changes
  useEffect(() => {
    setLocalTemplate(activeTemplate ? JSON.parse(JSON.stringify(activeTemplate)) : null);
    setSelectedElementId(null);
  }, [activeTemplate]);

  useEffect(() => {
    loadTemplates();
  }, []);

  const handleCreateNew = (): void => {
    const newTemplate: Template = {
      id: `template_${Date.now()}`,
      name: 'New Custom Template',
      canvas: {
        width: 1080,
        height: 1920,
      },
      video: {
        x: 140,
        y: 460,
        width: 800,
        height: 1000,
      },
      headline: {
        x: 80,
        y: 100,
        width: 920,
        height: 250,
        font: 'Poppins',
        size: 60,
        weight: 'Bold',
        textStyle: 'bold',
        previewText: 'Your Headline Text Here',
        wordStyles: ['bold', 'bold', 'bold', 'bold'],
        color: '#FFFFFF',
        align: 'center',
      },
      exportSettings: {
        fps: 30,
        videoBitrate: '6000k',
        audioBitrate: '192k',
      },
      backgroundPath: '',
      brandColor: '#6366f1',
    };
    selectTemplate(newTemplate);
    addToast('New template initialized!', 'info');
  };

  const alignAutoAdjustedBlocks = (template: Template): Template => {
    const updated = { ...template };

    // 1. Gather all active vertical blocks (Headline, Video, and Logo if present)
    const blocks: { key: 'headline' | 'video' | 'logo'; y: number; height: number }[] = [
      { key: 'headline', y: updated.headline.y, height: updated.headline.height },
      { key: 'video', y: updated.video.y, height: updated.video.height }
    ];
    if (updated.logo) {
      blocks.push({ key: 'logo', y: updated.logo.y, height: updated.logo.height });
    }

    // Sort them by their current vertical position
    blocks.sort((a, b) => a.y - b.y);

    // Re-align them with exactly 24px gap, keeping the top-most element's y position as the anchor
    for (let i = 1; i < blocks.length; i++) {
      const prev = blocks[i - 1];
      const curr = blocks[i];
      const newY = prev.y + prev.height + 24;

      if (curr.key === 'headline') {
        updated.headline = { ...updated.headline, y: newY };
      } else if (curr.key === 'video') {
        updated.video = { ...updated.video, y: newY };
      } else if (curr.key === 'logo' && updated.logo) {
        updated.logo = { ...updated.logo, y: newY };
      }
    }

    // 2. Position the watermark on the bottom side of the video block with a 24px gap
    if (updated.watermark) {
      const align = updated.watermark.align || 'right';
      let targetX = updated.video.x + updated.video.width - updated.watermark.width - 24;

      if (align === 'left') {
        targetX = updated.video.x + 24;
      } else if (align === 'center') {
        targetX = updated.video.x + (updated.video.width - updated.watermark.width) / 2;
      }

      updated.watermark = {
        ...updated.watermark,
        y: updated.video.y + updated.video.height - updated.watermark.height - 24,
        x: Math.round(targetX)
      };
    }

    return updated;
  };

  const handleElementChange = (key: 'video' | 'headline' | 'logo' | 'watermark', changes: any): void => {
    if (!localTemplate) return;

    let updated = { ...localTemplate };

    if (updated.autoAdjust) {
      // Calculate dy relative to the element's current position to move everything vertically together
      const current = key === 'logo' ? updated.logo : key === 'watermark' ? updated.watermark : updated[key];
      if (current) {
        const dy = changes.y !== undefined ? changes.y - current.y : 0;

        if (dy !== 0) {
          // Shift all elements vertically together
          updated.video = { ...updated.video, y: updated.video.y + dy };
          updated.headline = { ...updated.headline, y: updated.headline.y + dy };
          if (updated.logo) {
            updated.logo = { ...updated.logo, y: updated.logo.y + dy };
          }
          if (updated.watermark) {
            updated.watermark = { ...updated.watermark, y: updated.watermark.y + dy };
          }
        }
      }

      // Apply size/other non-position changes (like width/height from transformer)
      if (key === 'video') {
        updated.video = { ...updated.video, ...changes };
      } else if (key === 'headline') {
        updated.headline = { ...updated.headline, ...changes };
      } else if (key === 'logo') {
        updated.logo = updated.logo ? { ...updated.logo, ...changes } : changes;
      } else if (key === 'watermark') {
        updated.watermark = updated.watermark ? { ...updated.watermark, ...changes } : changes;
      }

      // Enforce the 24px vertical stacking and watermark placement
      updated = alignAutoAdjustedBlocks(updated);
    } else {
      // Normal non-auto-adjusted behavior
      if (key === 'video') {
        updated.video = { ...updated.video, ...changes };
      } else if (key === 'headline') {
        updated.headline = { ...updated.headline, ...changes };
      } else if (key === 'logo') {
        updated.logo = updated.logo ? { ...updated.logo, ...changes } : changes;
      } else if (key === 'watermark') {
        updated.watermark = updated.watermark ? { ...updated.watermark, ...changes } : changes;
      }
    }

    setLocalTemplate(updated);
  };

  const handleTemplateChange = (changes: Partial<Template>): void => {
    if (!localTemplate) return;

    let updated = {
      ...localTemplate,
      ...changes,
    };

    // If brandColor is updated and headline is Brand Bold, update headline color to match
    if (changes.brandColor && updated.headline.textStyle === 'brand-bold') {
      updated.headline = {
        ...updated.headline,
        color: changes.brandColor,
      };
    }

    // If autoAdjust was just toggled on, immediately align the blocks
    if (changes.autoAdjust === true) {
      updated = alignAutoAdjustedBlocks(updated);
    }

    setLocalTemplate(updated);
  };

  const handleSave = async (): Promise<void> => {
    if (!localTemplate) return;

    // Track if we have pending absolute paths to upload
    const assets: { background?: string; logo?: string; watermark?: string } = {};

    if (localTemplate.backgroundPath && !localTemplate.backgroundPath.includes('templates/')) {
      assets.background = localTemplate.backgroundPath;
    }
    if (localTemplate.logoPath && !localTemplate.logoPath.includes('templates/')) {
      assets.logo = localTemplate.logoPath;
    }
    if (localTemplate.watermarkPath && !localTemplate.watermarkPath.includes('templates/')) {
      assets.watermark = localTemplate.watermarkPath;
    }

    try {
      await saveTemplate(localTemplate, assets);
      addToast('Template saved successfully!', 'success');
    } catch (err) {
      addToast('Failed to save template.', 'error');
    }
  };

  const handleDelete = async (id: string): Promise<void> => {
    try {
      await deleteTemplate(id);
      addToast('Template deleted successfully!', 'success');
    } catch (err) {
      addToast('Failed to delete template.', 'error');
    }
  };

  return (
    <div className="flex-1 flex h-full min-h-0 bg-zinc-950">
      <TemplateList
        templates={templates}
        selectedId={activeTemplate?.id || null}
        onSelect={selectTemplate}
        onNew={handleCreateNew}
        onDelete={handleDelete}
      />

      <div className="flex-1 flex h-full min-h-0 relative">
        {localTemplate ? (
          <>
            <CanvasEditor
              template={localTemplate}
              selectedElementId={selectedElementId}
              onSelectElement={setSelectedElementId}
              onChangeElement={handleElementChange}
            />
            <PropertyPanel
              template={localTemplate}
              selectedElementId={selectedElementId}
              onChangeElement={handleElementChange}
              onChangeTemplate={handleTemplateChange}
              onSave={handleSave}
            />
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-zinc-950">
            <svg
              className="w-16 h-16 text-zinc-700 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <h3 className="text-lg font-bold text-zinc-300 mb-1">No Template Selected</h3>
            <p className="text-zinc-500 text-sm max-w-sm">
              Select an existing template from the sidebar or click "+ New" to design a new branded layout.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
