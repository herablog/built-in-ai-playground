import { BaseHandler, checkApi, type AvailabilityResult } from './base.js';

export class ProofreaderHandler extends BaseHandler {
  declare session: ProofreaderSession | null;

  async checkAvailability(): Promise<AvailabilityResult> {
    return checkApi('Proofreader', () => Proofreader.availability({
      correctionExplanationLanguage: this.attr('correction-explanation-language', 'en'),
    }));
  }

  async createSession(): Promise<void> {
    if (!('Proofreader' in self)) throw new Error('Proofreader API is not available.');
    this.destroy();
    const langs = this.attr('expected-input-languages', 'en').split(',').map(s => s.trim());
    this.session = await Proofreader.create({
      expectedInputLanguages: langs,
      correctionExplanationLanguage: this.attr('correction-explanation-language', 'en'),
    });
  }

  async run(text: string): Promise<void> {
    await this.ensureSession();
    try {
      const result = await this.session!.proofread(text);
      this.emit('proofread', {
        correctedInput: result.correctedInput,
        corrections: result.corrections,
      });
    } catch (e: unknown) {
      const err = e as Error;
      this.emit('error', { message: err.message ?? String(e) });
    }
  }
}
