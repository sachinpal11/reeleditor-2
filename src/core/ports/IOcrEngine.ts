import { CropResult } from './ICropEngine';

export interface IOcrEngine {
  extractText(videoPath: string, area?: CropResult): Promise<string>;
}
