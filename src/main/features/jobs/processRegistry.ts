import { ChildProcess } from 'child_process';

export class ProcessRegistry {
  private activeProcesses = new Map<string, ChildProcess>();

  public register(jobId: string, process: ChildProcess): void {
    this.activeProcesses.set(jobId, process);
  }

  public unregister(jobId: string): void {
    this.activeProcesses.delete(jobId);
  }

  public kill(jobId: string): void {
    const process = this.activeProcesses.get(jobId);
    if (process) {
      try {
        process.kill('SIGKILL');
        console.log(`Successfully killed active subprocess for job ${jobId}`);
      } catch (err) {
        console.error(`Failed to kill active subprocess for job ${jobId}:`, err);
      }
      this.activeProcesses.delete(jobId);
    }
  }
}

let instance: ProcessRegistry | null = null;
export function getProcessRegistry(): ProcessRegistry {
  if (!instance) {
    instance = new ProcessRegistry();
  }
  return instance;
}
