import { Template } from '../../shared/types';

export interface IRenderer {
  render(
    template: Template,
    videoPath: string,
    headline: string,
    outputPath: string,
    onProgress: (progress: number) => void,
    jobId?: string
  ): Promise<string>;
}
