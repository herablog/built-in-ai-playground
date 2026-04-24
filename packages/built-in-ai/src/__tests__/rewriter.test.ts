import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RewriterHandler } from '../apis/rewriter.js';
import { createMockRewriter, createAsyncIterable } from './mocks/chrome-ai.js';

describe('RewriterHandler', () => {
  let el: HTMLElement;
  let handler: RewriterHandler;
  let mock: ReturnType<typeof createMockRewriter>;

  beforeEach(() => {
    el = document.createElement('div');
    handler = new RewriterHandler(el);
    mock = createMockRewriter();
    Object.assign(globalThis, { Rewriter: mock });
  });

  describe('checkAvailability()', () => {
    it('returns unavailable when Rewriter is not in self', async () => {
      const saved = globalThis.Rewriter;
      // @ts-expect-error -- removing global for test
      delete globalThis.Rewriter;
      const result = await handler.checkAvailability();
      expect(result.status).toBe('unavailable');
      Object.assign(globalThis, { Rewriter: saved });
    });

    it('calls Rewriter.availability()', async () => {
      const result = await handler.checkAvailability();
      expect(mock.availability).toHaveBeenCalled();
      expect(result.status).toBe('readily');
    });
  });

  describe('createSession()', () => {
    it('reads attributes and passes correct options', async () => {
      el.setAttribute('tone', 'more-formal');
      el.setAttribute('format', 'markdown');
      el.setAttribute('length', 'shorter');
      el.setAttribute('shared-context', 'ctx');

      await handler.createSession();

      expect(mock.create).toHaveBeenCalledWith({
        tone: 'more-formal',
        format: 'markdown',
        length: 'shorter',
        sharedContext: 'ctx',
        outputLanguage: 'en',
      });
    });

    it('uses default values when attributes are not set', async () => {
      await handler.createSession();

      expect(mock.create).toHaveBeenCalledWith({
        tone: 'as-is',
        format: 'as-is',
        length: 'as-is',
        sharedContext: undefined,
        outputLanguage: 'en',
      });
    });

    it('throws when Rewriter API is not available', async () => {
      const saved = globalThis.Rewriter;
      // @ts-expect-error -- removing global for test
      delete globalThis.Rewriter;
      await expect(handler.createSession()).rejects.toThrow('Rewriter API is not available.');
      Object.assign(globalThis, { Rewriter: saved });
    });
  });

  describe('getStream()', () => {
    it('delegates to rewriteStreaming', async () => {
      mock._session.rewriteStreaming.mockReturnValue(createAsyncIterable(['re', 'written']));
      await handler.createSession();

      const responseListener = vi.fn();
      el.addEventListener('response', responseListener);
      await handler.run('text');

      expect(mock._session.rewriteStreaming).toHaveBeenCalled();
      const event = responseListener.mock.calls[0]![0] as CustomEvent;
      expect(event.detail.text).toBe('rewritten');
    });
  });
});
