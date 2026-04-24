import { BaseHandler, checkApi, type AvailabilityResult } from './base.js';

export class DetectorHandler extends BaseHandler {
  declare session: LanguageDetectorSession | null;

  async checkAvailability(): Promise<AvailabilityResult> {
    return checkApi('LanguageDetector', () => LanguageDetector.availability());
  }

  async createSession(): Promise<void> {
    if (!('LanguageDetector' in self)) throw new Error('LanguageDetector API is not available.');
    this.destroy();
    this.session = await LanguageDetector.create();
  }

  async run(text: string): Promise<void> {
    await this.ensureSession();
    try {
      const results = await this.session!.detect(text);
      this.emit('detect', { results: results.slice(0, 10).map(r => ({
        detectedLanguage: r.detectedLanguage,
        confidence: r.confidence,
      }))});
    } catch (e: unknown) {
      const err = e as Error;
      this.emit('error', { message: err.message ?? String(e) });
    }
  }
}
