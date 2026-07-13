import { RewriteMode } from '../../shared/types';

export interface IAiRewriter {
  rewrite(text: string, mode: RewriteMode): Promise<string>;
}
