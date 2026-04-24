import { StreamingHandler } from './streaming.js';
import { checkApi } from './base.js';
import type { AvailabilityResult } from './base.js';

export class SummarizerHandler extends StreamingHandler {
  declare session: SummarizerSession | null;

  async checkAvailability(): Promise<AvailabilityResult> {
    return checkApi('Summarizer', () => Summarizer.availability({
      outputLanguage: this.attr('output-language', 'en'),
    }));
  }

  async createSession(): Promise<void> {
    if (!('Summarizer' in self)) throw new Error('Summarizer API is not available.');
    this.destroy();
    this.session = await Summarizer.create({
      type: this.attr('type', 'key-points') as SummarizerCreateOptions['type'],
      format: this.attr('format', 'markdown') as SummarizerCreateOptions['format'],
      length: this.attr('length', 'medium') as SummarizerCreateOptions['length'],
      sharedContext: this.attr('shared-context') || undefined,
      outputLanguage: this.attr('output-language', 'en'),
    });
  }

  getStream(text: string, signal: AbortSignal): AsyncIterable<string> {
    return this.session!.summarizeStreaming(text, { signal });
  }
}
