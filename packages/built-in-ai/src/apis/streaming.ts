import { BaseHandler } from './base.js';

export abstract class StreamingHandler extends BaseHandler {
  abstract getStream(text: string, signal: AbortSignal): AsyncIterable<string>;

  async run(text: string): Promise<void> {
    await this.ensureSession();
    const controller = this.createAbort();
    let accumulated = '';

    try {
      const stream = this.getStream(text, controller.signal);
      for await (const chunk of stream) {
        accumulated += chunk;
        this.emit('stream', { chunk, accumulated });
      }
      this.emit('response', { text: accumulated });
    } catch (e: unknown) {
      const err = e as Error & { name?: string };
      if (err.name !== 'AbortError') {
        this.emit('error', { message: err.message ?? String(e) });
      }
    }
  }
}
