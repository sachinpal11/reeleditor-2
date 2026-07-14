export type JobStatus =
  | 'Waiting'
  | 'Downloading'
  | 'Cropping'
  | 'OCR'
  | 'Rewriting'
  | 'Rendering'
  | 'Completed'
  | 'Failed';

export interface DownloadProgress {
  percentage: number;
  speed: string;
  eta: string;
}

export type RewriteMode = 'Original' | 'Rewrite' | 'Short' | 'Curiosity' | 'Viral' | 'Question';

export type WordStyle = 'Regular' | 'Bold' | 'Brand';

export interface StyledSegment {
  text: string;
  style: WordStyle;
}

export interface HeadlineResponse {
  headline: string;
  lines: StyledSegment[][];
}

export interface Job {
  id: string;
  status: JobStatus;
  sourceUrl: string;
  localVideoPath?: string; // set when user uploads a local file (skips download)
  downloadPath?: string;
  croppedVideoPath?: string;
  headline?: string;
  rewrittenHeadline?: string;
  structuredHeadline?: HeadlineResponse;
  selectedTemplateId: string;
  rewriteMode: RewriteMode;
  outputVideoPath?: string;
  progress: number; // overall or current step progress (0-100)
  logs: string[];
  errorMessage?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Position {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface VisualProperties {
  opacity?: number;
  scale?: number;
  rotation?: number;
  align?: 'left' | 'center' | 'right';
}

export interface TextProperties extends Position {
  font: string;
  size: number;
  weight: 'Regular' | 'Medium' | 'SemiBold' | 'Bold';
  color: string;
  align: 'left' | 'center' | 'right';
  lineHeight?: number;
  letterSpacing?: number;
  textStyle?: 'regular' | 'bold' | 'brand-bold';
  previewText?: string;
  wordStyles?: ('regular' | 'bold' | 'brand-bold')[];
  customPrompt?: string;
  aiModel?: string;
  aiService?: 'gemini' | 'openrouter' | 'local';
}

export interface Template {
  id: string;
  name: string;
  canvas: {
    width: number;
    height: number;
  };
  video: Position;
  headline: TextProperties;
  logo?: Position & VisualProperties;
  watermark?: Position & VisualProperties;
  backgroundPath: string; // Absolute path or relative
  logoPath?: string;
  watermarkPath?: string;
  autoAdjust?: boolean;
  brandColor?: string;
  exportSettings: {
    fps: number;
    videoBitrate: string;
    audioBitrate: string;
  };
}

export interface AppConfig {
  ffmpegPath: string;
  ffprobePath: string;
  ytdlpPath: string;
  geminiApiKey: string;
  geminiModel?: string;
  openrouterApiKey?: string;
  openrouterModel?: string;
  aiMode: 'local' | 'gemini' | 'openrouter';
  defaultExportDir: string;
  concurrency: number;
  cookiesBrowser?: string;
  cookiesFilePath?: string;
}
