export interface CropResult {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ICropEngine {
  detectActiveVideoArea(videoPath: string, jobId?: string): Promise<CropResult>;
  cropVideo(videoPath: string, crop: CropResult, outputPath: string, jobId?: string): Promise<string>;
}
