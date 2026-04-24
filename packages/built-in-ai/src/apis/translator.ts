import { StreamingHandler } from './streaming.js';
import { checkApi } from './base.js';
import type { AvailabilityResult } from './base.js';

export class TranslatorHandler extends StreamingHandler {
  declare session: TranslatorSession | null;

  async checkAvailability(): Promise<AvailabilityResult> {
    return checkApi('Translator', () => Translator.availability({
      sourceLanguage: this.attr('source-language', 'en'),
      targetLanguage: this.attr('target-language', 'ja'),
    }));
  }

  async createSession(): Promise<void> {
    if (!('Translator' in self)) throw new Error('Translator API is not available.');
    this.destroy();
    this.session = await Translator.create({
      sourceLanguage: this.attr('source-language', 'en'),
      targetLanguage: this.attr('target-language', 'ja'),
    });
  }

  getStream(text: string, signal: AbortSignal): AsyncIterable<string> {
    return this.session!.translateStreaming(text, { signal });
  }
}
