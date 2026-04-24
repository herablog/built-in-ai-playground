import { StreamingHandler } from './streaming.js';
import { checkApi } from './base.js';
import type { AvailabilityResult } from './base.js';

export class RewriterHandler extends StreamingHandler {
  declare session: RewriterSession | null;

  async checkAvailability(): Promise<AvailabilityResult> {
    return checkApi('Rewriter', () => Rewriter.availability());
  }

  async createSession(): Promise<void> {
    if (!('Rewriter' in self)) throw new Error('Rewriter API is not available.');
    this.destroy();
    this.session = await Rewriter.create({
      tone: this.attr('tone', 'as-is') as RewriterCreateOptions['tone'],
      format: this.attr('format', 'as-is') as RewriterCreateOptions['format'],
      length: this.attr('length', 'as-is') as RewriterCreateOptions['length'],
      sharedContext: this.attr('shared-context') || undefined,
    });
  }

  getStream(text: string, signal: AbortSignal): AsyncIterable<string> {
    return this.session!.rewriteStreaming(text, { signal });
  }
}
