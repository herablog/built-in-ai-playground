import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SummarizerHandler } from '../apis/summarizer.js';
import { createMockSummarizer, createAsyncIterable } from './mocks/chrome-ai.js';

describe('SummarizerHandler', () => {
  let el: HTMLElement;
  let handler: SummarizerHandler;
  let mock: ReturnType<typeof createMockSummarizer>;

  beforeEach(() => {
    el = document.createElement('div');
    handler = new SummarizerHandler(el);
    mock = createMockSummarizer();
    Object.assign(globalThis, { Summarizer: mock });
  });

  describe('checkAvailability()', () => {
    it('returns unavailable when Summarizer is not in self', async () => {
      const saved = globalThis.Summarizer;
      // @ts-expect-error -- removing global for test
      delete globalThis.Summarizer;

      const result = await handler.checkAvailability();
      expect(result.status).toBe('unavailable');

      Object.assign(globalThis, { Summarizer: saved });
    });

    it('calls Summarizer.availability()', async () => {
      const result = await handler.checkAvailability();
      expect(mock.availability).toHaveBeenCalled();
      expect(result.status).toBe('readily');
    });
  });

  describe('createSession()', () => {
    it('reads attributes and passes correct options', async () => {
      el.setAttribute('type', 'headline');
      el.setAttribute('format', 'plain-text');
      el.setAttribute('length', 'short');
      el.setAttribute('shared-context', 'some context');

      await handler.createSession();

      expect(mock.create).toHaveBeenCalledWith({
        type: 'headline',
        format: 'plain-text',
        length: 'short',
        sharedContext: 'some context',
        outputLanguage: 'en',
      });
    });

    it('uses default values when attributes are not set', async () => {
      await handler.createSession();

      expect(mock.create).toHaveBeenCalledWith({
        type: 'key-points',
        format: 'markdown',
        length: 'medium',
        sharedContext: undefined,
        outputLanguage: 'en',
      });
    });

    it('throws when Summarizer API is not available', async () => {
      const saved = globalThis.Summarizer;
      // @ts-expect-error -- removing global for test
      delete globalThis.Summarizer;

      await expect(handler.createSession()).rejects.toThrow('Summarizer API is not available.');

      Object.assign(globalThis, { Summarizer: saved });
    });
  });

  describe('getStream()', () => {
    it('delegates to summarizeStreaming', async () => {
      mock._session.summarizeStreaming.mockReturnValue(
        createAsyncIterable(['sum', 'mary']),
      );
      await handler.createSession();

      const responseListener = vi.fn();
      el.addEventListener('response', responseListener);

      await handler.run('long text');

      expect(mock._session.summarizeStreaming).toHaveBeenCalled();
      const event = responseListener.mock.calls[0]![0] as CustomEvent;
      expect(event.detail.text).toBe('summary');
    });
  });
});
