import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProofreaderHandler } from '../apis/proofreader.js';
import { createMockProofreader } from './mocks/chrome-ai.js';

describe('ProofreaderHandler', () => {
  let el: HTMLElement;
  let handler: ProofreaderHandler;
  let mock: ReturnType<typeof createMockProofreader>;

  beforeEach(() => {
    el = document.createElement('div');
    handler = new ProofreaderHandler(el);
    mock = createMockProofreader();
    Object.assign(globalThis, { Proofreader: mock });
  });

  describe('checkAvailability()', () => {
    it('returns unavailable when Proofreader is not in self', async () => {
      const saved = globalThis.Proofreader;
      // @ts-expect-error -- removing global for test
      delete globalThis.Proofreader;
      const result = await handler.checkAvailability();
      expect(result.status).toBe('unavailable');
      Object.assign(globalThis, { Proofreader: saved });
    });

    it('calls Proofreader.availability()', async () => {
      const result = await handler.checkAvailability();
      expect(mock.availability).toHaveBeenCalled();
      expect(result.status).toBe('readily');
    });
  });

  describe('createSession()', () => {
    it('reads expected-input-languages attribute', async () => {
      el.setAttribute('expected-input-languages', 'en,fr');

      await handler.createSession();

      expect(mock.create).toHaveBeenCalledWith({
        expectedInputLanguages: ['en', 'fr'],
      });
    });

    it('uses default language when attribute not set', async () => {
      await handler.createSession();

      expect(mock.create).toHaveBeenCalledWith({
        expectedInputLanguages: ['en'],
      });
    });

    it('throws when Proofreader API is not available', async () => {
      const saved = globalThis.Proofreader;
      // @ts-expect-error -- removing global for test
      delete globalThis.Proofreader;
      await expect(handler.createSession()).rejects.toThrow('Proofreader API is not available.');
      Object.assign(globalThis, { Proofreader: saved });
    });
  });

  describe('run()', () => {
    it('calls proofread and emits proofread event', async () => {
      const listener = vi.fn();
      el.addEventListener('proofread', listener);

      await handler.run('Helo world');

      expect(mock._session.proofread).toHaveBeenCalledWith('Helo world');
      expect(listener).toHaveBeenCalledTimes(1);
      const event = listener.mock.calls[0]![0] as CustomEvent;
      expect(event.detail.correctedInput).toBe('Hello world.');
      expect(event.detail.corrections).toEqual([{ startIndex: 0, endIndex: 5 }]);
    });

    it('emits error on failure', async () => {
      mock._session.proofread.mockRejectedValue(new Error('proofread failed'));

      const listener = vi.fn();
      el.addEventListener('error', listener);

      await handler.run('text');

      expect(listener).toHaveBeenCalledTimes(1);
      const event = listener.mock.calls[0]![0] as CustomEvent;
      expect(event.detail.message).toBe('proofread failed');
    });
  });
});
