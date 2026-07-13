import React, { useRef, useEffect, useState } from 'react';
import { Stage, Layer, Rect, Text, Image as KonvaImage, Transformer } from 'react-konva';
import { Template } from '../../../../shared/types';

const generateHeadlineSvg = (
  text: string,
  config: any,
  brandColor: string
): string => {
  const { font, size, color, align, width, height, weight, textStyle, wordStyles = [] } = config;
  const avgCharWidth = size * 0.52;
  const maxChars = Math.max(5, Math.floor(width / avgCharWidth));
  
  interface WordWithIndex {
    text: string;
    index: number;
  }
  
  const lines: WordWithIndex[][] = [];
  if (text.includes('\n')) {
    const textLines = text.split('\n');
    let currentWordIndex = 0;
    for (const lineText of textLines) {
      const lineWords = lineText.trim().split(/\s+/).filter(Boolean);
      const line: WordWithIndex[] = [];
      for (const w of lineWords) {
        line.push({ text: w, index: currentWordIndex });
        currentWordIndex++;
      }
      if (line.length > 0) {
        lines.push(line);
      }
    }
  } else {
    const words = text.trim().split(/\s+/).filter(Boolean);
    const wordsWithIndex: WordWithIndex[] = words.map((word, idx) => ({ text: word, index: idx }));
    let currentLine: WordWithIndex[] = [];
    let currentLineLength = 0;
    
    for (const w of wordsWithIndex) {
      const wordLen = w.text.length;
      const spaceLen = currentLine.length > 0 ? 1 : 0;
      if (currentLineLength + spaceLen + wordLen <= maxChars) {
        currentLine.push(w);
        currentLineLength += spaceLen + wordLen;
      } else {
        if (currentLine.length > 0) {
          lines.push(currentLine);
        }
        currentLine = [w];
        currentLineLength = wordLen;
      }
    }
    if (currentLine.length > 0) {
      lines.push(currentLine);
    }
  }
  
  const lineHeight = size * 1.35;
  const computedHeight = Math.max(height || 0, Math.round((lines.length - 1) * lineHeight + size * 1.2));
  const escapeXml = (unsafe: string): string =>
    unsafe.replace(/[<>&'"]/g, (c) => {
      switch (c) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '&': return '&amp;';
        case '\'': return '&apos;';
        case '"': return '&quot;';
        default: return c;
      }
    });
    
  const svgLines = lines
    .map((line, idx) => {
      const xCoord = align === 'center' ? width / 2 : align === 'right' ? width : 0;
      const tspanWords = line.map((w) => {
        const style = wordStyles[w.index] || textStyle || (weight === 'Bold' ? 'bold' : 'regular');
        let colorVal = color || '#FFFFFF';
        let weightVal = 'normal';
        
        if (style === 'regular') {
          weightVal = 'normal';
        } else if (style === 'bold') {
          weightVal = 'bold';
        } else if (style === 'brand-bold') {
          weightVal = 'bold';
          colorVal = brandColor || '#6366f1';
        }
        
        return `<tspan fill="${colorVal}" font-weight="${weightVal}">${escapeXml(w.text)}</tspan>`;
      }).join(' ');
      
      return `<tspan x="${xCoord}" dy="${idx === 0 ? 0 : lineHeight}">${tspanWords}</tspan>`;
    })
    .join('');

  const startX = align === 'center' ? width / 2 : align === 'right' ? width : 0;
  
  return `
    <svg width="${width}" height="${computedHeight}" xmlns="http://www.w3.org/2000/svg">
      <style>
        .headline-text {
          font-family: "${font}", "Inter", "Arial", sans-serif;
          font-size: ${size}px;
          text-anchor: ${align === 'center' ? 'middle' : align === 'right' ? 'end' : 'start'};
          dominant-baseline: hanging;
        }
      </style>
      <text x="${startX}" y="${size * 0.05}" class="headline-text">
        ${svgLines}
      </text>
    </svg>
  `.trim();
};

interface CanvasEditorProps {
  template: Template;
  selectedElementId: string | null;
  onSelectElement: (id: string | null) => void;
  onChangeElement: (elementKey: 'video' | 'headline' | 'logo' | 'watermark', changes: any) => void;
}

export const CanvasEditor: React.FC<CanvasEditorProps> = ({
  template,
  selectedElementId,
  onSelectElement,
  onChangeElement,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 400, height: 711, scale: 0.37 });
  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null);
  const [logoImg, setLogoImg] = useState<HTMLImageElement | null>(null);
  const [watermarkImg, setWatermarkImg] = useState<HTMLImageElement | null>(null);
  const [headlineSvgImage, setHeadlineSvgImage] = useState<HTMLImageElement | null>(null);

  const stageRef = useRef<any>(null);
  const transformerRef = useRef<any>(null);
  const headlineRef = useRef<any>(null);

  // Re-calculate scale to fit container
  useEffect(() => {
    const handleResize = (): void => {
      if (containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        // Target aspect ratio 9:16
        const targetW = 1080;
        const targetH = 1920;

        const scaleX = clientWidth / targetW;
        const scaleY = clientHeight / targetH;
        const scale = Math.min(scaleX, scaleY) * 0.95; // 5% padding

        setDimensions({
          width: targetW * scale,
          height: targetH * scale,
          scale: scale,
        });
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Load images
  useEffect(() => {
    if (template.backgroundPath) {
      const img = new window.Image();
      const normalizedPath = template.backgroundPath.replace(/\\/g, '/');
      img.src = `local-file:///${normalizedPath}`;
      img.onload = (): void => setBgImage(img);
      img.onerror = (): void => setBgImage(null);
    } else {
      setBgImage(null);
    }
  }, [template.backgroundPath]);

  useEffect(() => {
    if (template.logoPath) {
      const img = new window.Image();
      const normalizedPath = template.logoPath.replace(/\\/g, '/');
      img.src = `local-file:///${normalizedPath}`;
      img.onload = (): void => setLogoImg(img);
      img.onerror = (): void => setLogoImg(null);
    } else {
      setLogoImg(null);
    }
  }, [template.logoPath]);

  useEffect(() => {
    if (template.watermarkPath) {
      const img = new window.Image();
      const normalizedPath = template.watermarkPath.replace(/\\/g, '/');
      img.src = `local-file:///${normalizedPath}`;
      img.onload = (): void => setWatermarkImg(img);
      img.onerror = (): void => setWatermarkImg(null);
    } else {
      setWatermarkImg(null);
    }
  }, [template.watermarkPath]);

  // Measure actual text height dynamically to prevent large vertical stacking gaps
  useEffect(() => {
    const text = template.headline.previewText || 'Your Headline Text Here';
    const { size, width } = template.headline;
    const avgCharWidth = size * 0.52;
    const maxChars = Math.max(5, Math.floor(width / avgCharWidth));
    
    const lines: string[][] = [];
    if (text.includes('\n')) {
      const textLines = text.split('\n');
      for (const lineText of textLines) {
        const lineWords = lineText.trim().split(/\s+/).filter(Boolean);
        if (lineWords.length > 0) {
          lines.push(lineWords);
        }
      }
    } else {
      const words = text.trim().split(/\s+/).filter(Boolean);
      let currentLine: string[] = [];
      let currentLineLength = 0;
      
      for (const word of words) {
        const wordLen = word.length;
        const spaceLen = currentLine.length > 0 ? 1 : 0;
        if (currentLineLength + spaceLen + wordLen <= maxChars) {
          currentLine.push(word);
          currentLineLength += spaceLen + wordLen;
        } else {
          if (currentLine.length > 0) {
            lines.push(currentLine);
          }
          currentLine = [word];
          currentLineLength = wordLen;
        }
      }
      if (currentLine.length > 0) {
        lines.push(currentLine);
      }
    }
    
    const lineHeight = size * 1.35;
    const actualHeight = Math.round((lines.length - 1) * lineHeight + size * 1.2);

    if (actualHeight > 0 && actualHeight !== template.headline.height) {
      onChangeElement('headline', { height: actualHeight });
    }
  }, [
    template.headline.size,
    template.headline.width,
    template.headline.height,
    template.headline.previewText
  ]);

  // Load SVG Headline Image
  useEffect(() => {
    const text = template.headline.previewText || 'Your Headline Text Here';
    const svgString = generateHeadlineSvg(text, template.headline, template.brandColor || '#6366f1');
    const dataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString);
    
    const img = new window.Image();
    img.onload = () => {
      setHeadlineSvgImage(img);
    };
    img.src = dataUrl;
  }, [
    template.headline.previewText,
    template.headline.font,
    template.headline.size,
    template.headline.color,
    template.headline.weight,
    template.headline.align,
    template.headline.width,
    template.headline.height,
    template.headline.textStyle,
    JSON.stringify(template.headline.wordStyles),
    template.brandColor
  ]);

  // Connect Transformer
  useEffect(() => {
    if (transformerRef.current) {
      const stage = stageRef.current;
      if (!stage) return;

      if (selectedElementId) {
        const selectedNode = stage.findOne(`#${selectedElementId}`);
        if (selectedNode) {
          transformerRef.current.nodes([selectedNode]);
          transformerRef.current.getLayer().batchDraw();
        } else {
          transformerRef.current.nodes([]);
        }
      } else {
        transformerRef.current.nodes([]);
      }
    }
  }, [selectedElementId, template]);

  const handleTransformEnd = (e: any, key: 'video' | 'headline' | 'logo' | 'watermark'): void => {
    const node = e.target;
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();

    // Reset scaling and apply width/height updates
    node.scaleX(1);
    node.scaleY(1);

    const changes: any = {
      x: Math.round(node.x()),
      y: Math.round(node.y()),
      width: Math.round(node.width() * scaleX),
      height: Math.round(node.height() * scaleY),
    };

    if (node.rotation() !== undefined) {
      changes.rotation = Math.round(node.rotation());
    }

    onChangeElement(key, changes);
  };

  const handleDragEnd = (e: any, key: 'video' | 'headline' | 'logo' | 'watermark'): void => {
    const node = e.target;
    onChangeElement(key, {
      x: Math.round(node.x()),
      y: Math.round(node.y()),
    });
  };

  const handleStageClick = (e: any): void => {
    if (e.target === stageRef.current || e.target.name() === 'background') {
      onSelectElement(null);
    }
  };

  return (
    <div
      ref={containerRef}
      className="flex-1 w-full h-full flex items-center justify-center bg-zinc-950 p-4 border border-zinc-800 rounded-xl"
    >
      <div
        className="relative bg-zinc-900 shadow-2xl overflow-hidden border border-zinc-700"
        style={{
          width: dimensions.width,
          height: dimensions.height,
        }}
      >
        <Stage
          ref={stageRef}
          width={dimensions.width}
          height={dimensions.height}
          scaleX={dimensions.scale}
          scaleY={dimensions.scale}
          onMouseDown={handleStageClick}
          onTouchStart={handleStageClick}
        >
          <Layer>
            {/* Background Image / Color */}
            {bgImage ? (
              <KonvaImage
                image={bgImage}
                x={0}
                y={0}
                width={1080}
                height={1920}
                name="background"
              />
            ) : (
              <Rect
                x={0}
                y={0}
                width={1080}
                height={1920}
                fill="#18181b"
                name="background"
              />
            )}

            {/* Video Placeholder */}
            <Rect
              id="video"
              x={template.video.x}
              y={template.video.y}
              width={template.video.width}
              height={template.video.height}
              fill="#4f46e5"
              opacity={0.3}
              stroke="#6366f1"
              strokeWidth={4}
              dash={[15, 10]}
              draggable
              onDragEnd={(e): void => handleDragEnd(e, 'video')}
              onTransformEnd={(e): void => handleTransformEnd(e, 'video')}
              onClick={(): void => onSelectElement('video')}
              onTouchStart={(): void => onSelectElement('video')}
            />
            {/* Label inside Video Box */}
            <Text
              x={template.video.x}
              y={template.video.y + template.video.height / 2 - 20}
              width={template.video.width}
              text="Video Placeholder"
              fontSize={32}
              fill="#ffffff"
              fontStyle="bold"
              align="center"
              listening={false}
            />

            {/* Logo Image */}
            {template.logo && (
              logoImg ? (
                <KonvaImage
                  id="logo"
                  image={logoImg}
                  x={template.logo.x}
                  y={template.logo.y}
                  width={template.logo.width}
                  height={template.logo.height}
                  opacity={template.logo.opacity ?? 1}
                  rotation={template.logo.rotation ?? 0}
                  draggable
                  onDragEnd={(e): void => handleDragEnd(e, 'logo')}
                  onTransformEnd={(e): void => handleTransformEnd(e, 'logo')}
                  onClick={(): void => onSelectElement('logo')}
                  onTouchStart={(): void => onSelectElement('logo')}
                />
              ) : (
                <Rect
                  id="logo"
                  x={template.logo.x}
                  y={template.logo.y}
                  width={template.logo.width}
                  height={template.logo.height}
                  fill="#ef4444"
                  opacity={template.logo.opacity ?? 0.8}
                  stroke="#ffffff"
                  strokeWidth={2}
                  draggable
                  onDragEnd={(e): void => handleDragEnd(e, 'logo')}
                  onTransformEnd={(e): void => handleTransformEnd(e, 'logo')}
                  onClick={(): void => onSelectElement('logo')}
                  onTouchStart={(): void => onSelectElement('logo')}
                />
              )
            )}

            {/* Watermark Image */}
            {template.watermark && (
              watermarkImg ? (
                <KonvaImage
                  id="watermark"
                  image={watermarkImg}
                  x={template.watermark.x}
                  y={template.watermark.y}
                  width={template.watermark.width}
                  height={template.watermark.height}
                  opacity={template.watermark.opacity ?? 0.25}
                  rotation={template.watermark.rotation ?? 0}
                  draggable
                  onDragEnd={(e): void => handleDragEnd(e, 'watermark')}
                  onTransformEnd={(e): void => handleTransformEnd(e, 'watermark')}
                  onClick={(): void => onSelectElement('watermark')}
                  onTouchStart={(): void => onSelectElement('watermark')}
                />
              ) : (
                <Rect
                  id="watermark"
                  x={template.watermark.x}
                  y={template.watermark.y}
                  width={template.watermark.width}
                  height={template.watermark.height}
                  fill="#ffffff"
                  opacity={template.watermark.opacity ?? 0.25}
                  stroke="#dddddd"
                  strokeWidth={1}
                  dash={[5, 5]}
                  draggable
                  onDragEnd={(e): void => handleDragEnd(e, 'watermark')}
                  onTransformEnd={(e): void => handleTransformEnd(e, 'watermark')}
                  onClick={(): void => onSelectElement('watermark')}
                  onTouchStart={(): void => onSelectElement('watermark')}
                />
              )
            )}

            {/* Headline Text Placeholder */}
            <Text
              ref={headlineRef}
              id="headline-measure"
              x={template.headline.x}
              y={template.headline.y}
              width={template.headline.width}
              text={template.headline.previewText || 'Your Headline Text Here'}
              fontSize={template.headline.size}
              fontFamily={template.headline.font}
              align={template.headline.align}
              visible={false}
            />
            {headlineSvgImage && (
              <KonvaImage
                id="headline"
                x={template.headline.x}
                y={template.headline.y}
                width={template.headline.width}
                height={template.headline.height}
                image={headlineSvgImage}
                draggable
                onDragEnd={(e): void => handleDragEnd(e, 'headline')}
                onTransformEnd={(e): void => handleTransformEnd(e, 'headline')}
                onClick={(): void => onSelectElement('headline')}
                onTouchStart={(): void => onSelectElement('headline')}
              />
            )}

            {/* Transformer Overlay */}
            <Transformer
              ref={transformerRef}
              boundBoxFunc={(oldBox, newBox): any => {
                // Minimum size constraints
                if (newBox.width < 30 || newBox.height < 30) {
                  return oldBox;
                }
                return newBox;
              }}
              enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right']}
            />
          </Layer>
        </Stage>
      </div>
    </div>
  );
};
