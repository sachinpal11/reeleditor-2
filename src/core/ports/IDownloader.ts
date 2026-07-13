export interface DownloadProgress {
  percentage: number;
  speed: string;
  eta: string;
}

export interface IDownloader {
  download(
    url: string,
    jobId: string,
    onProgress: (progress: DownloadProgress) => void
  ): Promise<string>;
}
