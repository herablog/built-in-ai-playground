import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DetectorHandler } from '../apis/detector.js';
import { createMockLanguageDetector } from './mocks/chrome-ai.js';

describe('DetectorHandler', () => {
  let el: HTMLElement;
  let handler: DetectorHandler;
  let mock: ReturnType<typeof createMockLanguageDetector>;

  beforeEach(() => {
    el = document.createElement('div');
    handler = new DetectorHandler(el);
    mock = createMockLanguageDetector();
    Object.assign(globalThis, { LanguageDetector: mock });
  });

  describe('checkAvailability()', () => {
    it('returns unavailable when LanguageDetector is not in self', async () => {
      const saved = globalThis.LanguageDetector;
      // @ts-expect-error -- removing global for test
      delete globalThis.LanguageDetector;
      const result = await handler.checkAvailability();
      expect(result.status).toBe('unavailable');
      Object.assign(globalThis, { LanguageDetector: saved });
    });

    it('calls LanguageDetector.availability()', async () => {
      const result = await handler.checkAvailability();
      expect(mock.availability).toHaveBeenCalled();
      expect(result.status).toBe('readily');
    });
  });

  describe('createSession()', () => {
    it('creates session via LanguageDetector.create()', async () => {
      await handler.createSession();
      expect(mock.create).toHaveBeenCalled();
    });

    it('throws when LanguageDetector API is not available', async () => {
      const saved = globalThis.LanguageDetector;
      // @ts-expect-error -- removing global for test
      delete globalThis.LanguageDetector;
      await expect(handler.createSession()).rejects.toThrow('LanguageDetector API is not available.');
      Object.assign(globalThis, { LanguageDetector: saved });
    });
  });

  describe('run()', () => {
    it('calls detect and emits detect event with results', async () => {
      const listener = vi.fn();
      el.addEventListener('detect', listener);

      await handler.run('Hello world');

      expect(mock._session.detect).toHaveBeenCalledWith('Hello world');
      expect(listener).toHaveBeenCalledTimes(1);
      const event = listener.mock.calls[0]![0] as CustomEvent;
      expect(event.detail.results).toEqual([
        { detectedLanguage: 'en', confidence: 0.95 },
        { detectedLanguage: 'ja', confidence: 0.03 },
      ]);
    });

    it('slices results to max 10', async () => {
      const manyResults = Array.from({ length: 15 }, (_, i) => ({
        detectedLanguage: `lang${i}`,
        confidence: 0.5,
      }));
      mock._session.detect.mockResolvedValue(manyResults);

      const listener = vi.fn();
      el.addEventListener('detect', listener);

      await handler.run('text');

      const event = listener.mock.calls[0]![0] as CustomEvent;
      expect(event.detail.results).toHaveLength(10);
    });

    it('emits error on failure', async () => {
      mock._session.detect.mockRejectedValue(new Error('detect failed'));

      const listener = vi.fn();
      el.addEventListener('error', listener);

      await handler.run('text');

      expect(listener).toHaveBeenCalledTimes(1);
      const event = listener.mock.calls[0]![0] as CustomEvent;
      expect(event.detail.message).toBe('detect failed');
    });
  });
});
