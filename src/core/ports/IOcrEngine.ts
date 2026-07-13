import { CropResult } from './ICropEngine';

export interface IOcrEngine {
  extractText(videoPath: string, area?: CropResult, jobId?: string): Promise<string>;
}
