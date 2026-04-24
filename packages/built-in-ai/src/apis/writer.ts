import { StreamingHandler } from './streaming.js';
import { checkApi } from './base.js';
import type { AvailabilityResult } from './base.js';

export class WriterHandler extends StreamingHandler {
  declare session: WriterSession | null;

  async checkAvailability(): Promise<AvailabilityResult> {
    return checkApi('Writer', () => Writer.availability());
  }

  async createSession(): Promise<void> {
    if (!('Writer' in self)) throw new Error('Writer API is not available.');
    this.destroy();
    this.session = await Writer.create({
      tone: this.attr('tone', 'neutral') as WriterCreateOptions['tone'],
      format: this.attr('format', 'markdown') as WriterCreateOptions['format'],
      length: this.attr('length', 'short') as WriterCreateOptions['length'],
      sharedContext: this.attr('shared-context') || undefined,
    });
  }

  getStream(text: string, signal: AbortSignal): AsyncIterable<string> {
    return this.session!.writeStreaming(text, { signal });
  }
}
