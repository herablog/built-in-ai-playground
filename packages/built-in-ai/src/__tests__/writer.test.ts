import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WriterHandler } from '../apis/writer.js';
import { createMockWriter, createAsyncIterable } from './mocks/chrome-ai.js';

describe('WriterHandler', () => {
  let el: HTMLElement;
  let handler: WriterHandler;
  let mock: ReturnType<typeof createMockWriter>;

  beforeEach(() => {
    el = document.createElement('div');
    handler = new WriterHandler(el);
    mock = createMockWriter();
    Object.assign(globalThis, { Writer: mock });
  });

  describe('checkAvailability()', () => {
    it('returns unavailable when Writer is not in self', async () => {
      const saved = globalThis.Writer;
      // @ts-expect-error -- removing global for test
      delete globalThis.Writer;
      const result = await handler.checkAvailability();
      expect(result.status).toBe('unavailable');
      Object.assign(globalThis, { Writer: saved });
    });

    it('calls Writer.availability()', async () => {
      const result = await handler.checkAvailability();
      expect(mock.availability).toHaveBeenCalled();
      expect(result.status).toBe('readily');
    });
  });

  describe('createSession()', () => {
    it('reads attributes and passes correct options', async () => {
      el.setAttribute('tone', 'formal');
      el.setAttribute('format', 'plain-text');
      el.setAttribute('length', 'long');
      el.setAttribute('shared-context', 'context');

      await handler.createSession();

      expect(mock.create).toHaveBeenCalledWith({
        tone: 'formal',
        format: 'plain-text',
        length: 'long',
        sharedContext: 'context',
      });
    });

    it('uses default values when attributes are not set', async () => {
      await handler.createSession();

      expect(mock.create).toHaveBeenCalledWith({
        tone: 'neutral',
        format: 'markdown',
        length: 'short',
        sharedContext: undefined,
      });
    });

    it('throws when Writer API is not available', async () => {
      const saved = globalThis.Writer;
      // @ts-expect-error -- removing global for test
      delete globalThis.Writer;
      await expect(handler.createSession()).rejects.toThrow('Writer API is not available.');
      Object.assign(globalThis, { Writer: saved });
    });
  });

  describe('getStream()', () => {
    it('delegates to writeStreaming', async () => {
      mock._session.writeStreaming.mockReturnValue(createAsyncIterable(['wr', 'itten']));
      await handler.createSession();

      const responseListener = vi.fn();
      el.addEventListener('response', responseListener);
      await handler.run('topic');

      expect(mock._session.writeStreaming).toHaveBeenCalled();
      const event = responseListener.mock.calls[0]![0] as CustomEvent;
      expect(event.detail.text).toBe('written');
    });
  });
});
