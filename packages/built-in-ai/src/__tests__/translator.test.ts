import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TranslatorHandler } from '../apis/translator.js';
import { createMockTranslator, createAsyncIterable } from './mocks/chrome-ai.js';

describe('TranslatorHandler', () => {
  let el: HTMLElement;
  let handler: TranslatorHandler;
  let mock: ReturnType<typeof createMockTranslator>;

  beforeEach(() => {
    el = document.createElement('div');
    handler = new TranslatorHandler(el);
    mock = createMockTranslator();
    Object.assign(globalThis, { Translator: mock });
  });

  describe('checkAvailability()', () => {
    it('returns unavailable when Translator is not in self', async () => {
      const saved = globalThis.Translator;
      // @ts-expect-error -- removing global for test
      delete globalThis.Translator;
      const result = await handler.checkAvailability();
      expect(result.status).toBe('unavailable');
      Object.assign(globalThis, { Translator: saved });
    });

    it('passes source and target language to availability', async () => {
      el.setAttribute('source-language', 'fr');
      el.setAttribute('target-language', 'de');

      await handler.checkAvailability();

      expect(mock.availability).toHaveBeenCalledWith({
        sourceLanguage: 'fr',
        targetLanguage: 'de',
      });
    });

    it('uses default languages', async () => {
      await handler.checkAvailability();

      expect(mock.availability).toHaveBeenCalledWith({
        sourceLanguage: 'en',
        targetLanguage: 'ja',
      });
    });
  });

  describe('createSession()', () => {
    it('passes language pair to create', async () => {
      el.setAttribute('source-language', 'es');
      el.setAttribute('target-language', 'fr');

      await handler.createSession();

      expect(mock.create).toHaveBeenCalledWith({
        sourceLanguage: 'es',
        targetLanguage: 'fr',
      });
    });

    it('throws when Translator API is not available', async () => {
      const saved = globalThis.Translator;
      // @ts-expect-error -- removing global for test
      delete globalThis.Translator;
      await expect(handler.createSession()).rejects.toThrow('Translator API is not available.');
      Object.assign(globalThis, { Translator: saved });
    });
  });

  describe('getStream()', () => {
    it('delegates to translateStreaming', async () => {
      mock._session.translateStreaming.mockReturnValue(createAsyncIterable(['trans', 'lated']));
      await handler.createSession();

      const responseListener = vi.fn();
      el.addEventListener('response', responseListener);
      await handler.run('hello');

      expect(mock._session.translateStreaming).toHaveBeenCalled();
      const event = responseListener.mock.calls[0]![0] as CustomEvent;
      expect(event.detail.text).toBe('translated');
    });
  });
});
