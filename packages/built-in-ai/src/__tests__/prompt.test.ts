import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PromptHandler } from '../apis/prompt.js';
import {
  createMockLanguageModel,
  createMockSummarizer,
  createAsyncIterable,
} from './mocks/chrome-ai.js';

describe('PromptHandler', () => {
  let el: HTMLElement;
  let handler: PromptHandler;
  let lm: ReturnType<typeof createMockLanguageModel>;
  let summarizer: ReturnType<typeof createMockSummarizer>;

  beforeEach(() => {
    el = document.createElement('div');
    handler = new PromptHandler(el);

    lm = createMockLanguageModel();
    summarizer = createMockSummarizer();
    Object.assign(globalThis, {
      LanguageModel: lm,
      Summarizer: summarizer,
    });
  });

  describe('checkAvailability()', () => {
    it('returns unavailable when LanguageModel is not in self', async () => {
      const saved = globalThis.LanguageModel;
      // @ts-expect-error -- removing global for test
      delete globalThis.LanguageModel;

      const result = await handler.checkAvailability();
      expect(result.status).toBe('unavailable');

      Object.assign(globalThis, { LanguageModel: saved });
    });

    it('calls LanguageModel.availability and probes input types', async () => {
      el.setAttribute('input-types', 'text,image');

      const result = await handler.checkAvailability();

      expect(lm.availability).toHaveBeenCalled();
      expect(result.status).toBe('readily');
      expect(result.inputTypes).toEqual({ text: true, image: true });
    });

    it('auto-removes unsupported input types from attribute', async () => {
      el.setAttribute('input-types', 'text,image,audio');

      // Make audio probe fail
      let callCount = 0;
      lm.create.mockImplementation(async () => {
        callCount++;
        // Third call is for 'audio' type probe
        if (callCount === 3) throw new Error('unsupported');
        return lm._session;
      });

      await handler.checkAvailability();

      expect(el.getAttribute('input-types')).toBe('text,image');
    });
  });

  describe('createSession()', () => {
    it('reads attributes and creates session with correct options', async () => {
      el.setAttribute('system-prompt', 'You are a helper.');
      el.setAttribute('temperature', '0.5');
      el.setAttribute('top-k', '10');
      el.setAttribute('input-languages', 'en,fr');
      el.setAttribute('output-languages', 'ja');
      el.setAttribute('input-types', 'text,image');

      await handler.createSession();

      expect(lm.create).toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: 0.5,
          topK: 10,
          expectedInputs: [
            { type: 'text', languages: ['en', 'fr'] },
            { type: 'image' },
          ],
          expectedOutputs: [{ type: 'text', languages: ['ja'] }],
          initialPrompts: [{ role: 'system', content: 'You are a helper.' }],
        }),
      );
    });

    it('creates session without system prompt when attribute is empty', async () => {
      await handler.createSession();

      const call = lm.create.mock.calls[0]![0];
      expect(call.initialPrompts).toEqual([]);
    });

    it('registers contextoverflow listener when auto-compact attribute set', async () => {
      el.setAttribute('auto-compact', '');
      await handler.createSession();

      expect(lm._session.addEventListener).toHaveBeenCalledWith(
        'contextoverflow',
        expect.any(Function),
      );
    });

    it('throws when LanguageModel API is missing', async () => {
      const saved = globalThis.LanguageModel;
      // @ts-expect-error -- removing global for test
      delete globalThis.LanguageModel;

      await expect(handler.createSession()).rejects.toThrow('LanguageModel API is not available.');

      Object.assign(globalThis, { LanguageModel: saved });
    });
  });

  describe('run()', () => {
    beforeEach(async () => {
      await handler.createSession();
      vi.clearAllMocks();
      // Reset promptStreaming to return fresh async iterable
      lm._session.promptStreaming.mockReturnValue(
        createAsyncIterable(['Hello', ' World']),
      );
    });

    it('streams via promptStreaming and emits events', async () => {
      const streamEvents: unknown[] = [];
      const responseEvents: unknown[] = [];
      el.addEventListener('stream', ((e: CustomEvent) => streamEvents.push(e.detail)) as EventListener);
      el.addEventListener('response', ((e: CustomEvent) => responseEvents.push(e.detail)) as EventListener);

      await handler.run('Hi');

      expect(lm._session.promptStreaming).toHaveBeenCalled();
      expect(streamEvents).toHaveLength(2);
      expect(responseEvents).toHaveLength(1);
      expect((responseEvents[0] as { text: string }).text).toBe('Hello World');
    });

    it('builds content parts from text', async () => {
      await handler.run('Hello');

      const input = lm._session.promptStreaming.mock.calls[0]![0];
      expect(input[0].content).toEqual([{ type: 'text', value: 'Hello' }]);
    });

    it('builds content parts from File attachments', async () => {
      const file = new File(['data'], 'test.png', { type: 'image/png' });

      await handler.run('Describe this', [file]);

      const input = lm._session.promptStreaming.mock.calls[0]![0];
      const content = input[0].content;
      expect(content).toHaveLength(2);
      expect(content[0]).toEqual({ type: 'text', value: 'Describe this' });
      expect(content[1]).toEqual({ type: 'image', value: file });
    });

    it('builds content parts from CustomAttachment with text', async () => {
      const attachment = { name: 'doc.txt', text: 'some content', _custom: true as const };

      await handler.run('Read this', [attachment]);

      const input = lm._session.promptStreaming.mock.calls[0]![0];
      const content = input[0].content;
      expect(content[1]).toEqual({
        type: 'text',
        value: '--- doc.txt ---\nsome content',
      });
    });

    it('adds default text for files without text input', async () => {
      const file = new File(['data'], 'img.png', { type: 'image/png' });

      await handler.run('', [file]);

      const input = lm._session.promptStreaming.mock.calls[0]![0];
      expect(input[0].content[0]).toEqual({
        type: 'text',
        value: 'Describe the following file.',
      });
    });

    it('updates chatHistory after response', async () => {
      await handler.run('Hello');

      expect(handler.chatHistory).toHaveLength(2);
      expect(handler.chatHistory[0]).toEqual({ role: 'user', content: 'Hello' });
      expect(handler.chatHistory[1]).toEqual({
        role: 'assistant',
        content: 'Hello World',
      });
    });

    it('passes responseConstraint from attribute', async () => {
      el.setAttribute('response-constraint', '{"type":"object"}');
      await handler.run('Hello');

      const options = lm._session.promptStreaming.mock.calls[0]![1];
      expect(options.responseConstraint).toEqual({ type: 'object' });
    });

    it('ignores invalid responseConstraint JSON', async () => {
      el.setAttribute('response-constraint', 'not-json');
      await handler.run('Hello');

      const options = lm._session.promptStreaming.mock.calls[0]![1];
      expect(options.responseConstraint).toBeUndefined();
    });

    it('passes omitResponseConstraintInput flag', async () => {
      el.setAttribute('omit-response-constraint-input', '');
      await handler.run('Hello');

      const options = lm._session.promptStreaming.mock.calls[0]![1];
      expect(options.omitResponseConstraintInput).toBe(true);
    });

    it('suppresses AbortError', async () => {
      lm._session.promptStreaming.mockReturnValue(
        (async function* () {
          throw new DOMException('Aborted', 'AbortError');
        })(),
      );

      const errorListener = vi.fn();
      el.addEventListener('error', errorListener);

      await handler.run('Hello');

      expect(errorListener).not.toHaveBeenCalled();
    });

    it('emits error on non-abort errors', async () => {
      lm._session.promptStreaming.mockReturnValue(
        (async function* () {
          throw new Error('some error');
        })(),
      );

      const errorListener = vi.fn();
      el.addEventListener('error', errorListener);

      await handler.run('Hello');

      expect(errorListener).toHaveBeenCalledTimes(1);
    });
  });

  describe('run() batch mode', () => {
    beforeEach(async () => {
      await handler.createSession();
      vi.clearAllMocks();
      lm._session.promptStreaming.mockReturnValue(
        createAsyncIterable(['ok']),
      );
    });

    it('processes files individually in batch mode', async () => {
      const file1 = new File(['a'], 'a.png', { type: 'image/png' });
      const file2 = new File(['b'], 'b.png', { type: 'image/png' });

      const batchEvents: unknown[] = [];
      el.addEventListener('batch-item-start', ((e: CustomEvent) => batchEvents.push(e.detail)) as EventListener);

      // Reset mock for each call
      lm._session.promptStreaming
        .mockReturnValueOnce(createAsyncIterable(['resp1']))
        .mockReturnValueOnce(createAsyncIterable(['resp2']));

      await handler.run('', [file1, file2], { batch: true });

      expect(batchEvents).toHaveLength(2);
      expect((batchEvents[0] as { current: number }).current).toBe(1);
      expect((batchEvents[1] as { current: number }).current).toBe(2);
    });

    it('includes text with each file in batch mode', async () => {
      const file1 = new File(['a'], 'a.png', { type: 'image/png' });
      const file2 = new File(['b'], 'b.png', { type: 'image/png' });

      lm._session.promptStreaming
        .mockReturnValueOnce(createAsyncIterable(['resp1']))
        .mockReturnValueOnce(createAsyncIterable(['resp2']));

      await handler.run('Describe this image', [file1, file2], { batch: true });

      expect(lm._session.promptStreaming).toHaveBeenCalledTimes(2);
      // Both calls should include the user text as the first content part
      for (const call of lm._session.promptStreaming.mock.calls) {
        const messages = call[0] as Array<{ role: string; content: Array<{ type: string; value: unknown }> }>;
        expect(messages[0].content[0]).toEqual({ type: 'text', value: 'Describe this image' });
      }
    });

    it('does not use batch mode for single file', async () => {
      const file = new File(['a'], 'a.png', { type: 'image/png' });

      const batchEvents: unknown[] = [];
      el.addEventListener('batch-item-start', ((e: CustomEvent) => batchEvents.push(e.detail)) as EventListener);

      await handler.run('', [file], { batch: true });

      // Single file goes through _runSingle directly
      expect(batchEvents).toHaveLength(0);
    });

    it('stop() during batch aborts remaining files', async () => {
      const file1 = new File(['a'], 'a.png', { type: 'image/png' });
      const file2 = new File(['b'], 'b.png', { type: 'image/png' });
      const file3 = new File(['c'], 'c.png', { type: 'image/png' });

      const batchEvents: unknown[] = [];
      el.addEventListener('batch-item-start', ((e: CustomEvent) => {
        batchEvents.push(e.detail);
        // Stop after first item starts
        if ((e.detail as { current: number }).current === 1) {
          handler.stop();
        }
      }) as EventListener);

      lm._session.promptStreaming
        .mockReturnValueOnce(createAsyncIterable(['resp1']))
        .mockReturnValueOnce(createAsyncIterable(['resp2']))
        .mockReturnValueOnce(createAsyncIterable(['resp3']));

      await handler.run('', [file1, file2, file3], { batch: true });

      // Only the first item should have started
      expect(batchEvents).toHaveLength(1);
    });

    it('_batchAborted resets on next run()', async () => {
      const file1 = new File(['a'], 'a.png', { type: 'image/png' });
      const file2 = new File(['b'], 'b.png', { type: 'image/png' });

      // First batch: stop immediately
      el.addEventListener('batch-item-start', ((e: CustomEvent) => {
        if ((e.detail as { current: number }).current === 1) handler.stop();
      }) as EventListener, { once: true });

      lm._session.promptStreaming
        .mockReturnValueOnce(createAsyncIterable(['resp1']))
        .mockReturnValueOnce(createAsyncIterable(['resp2']));

      await handler.run('', [file1, file2], { batch: true });

      // Second batch: should process all files normally
      vi.clearAllMocks();
      lm._session.promptStreaming
        .mockReturnValueOnce(createAsyncIterable(['resp1']))
        .mockReturnValueOnce(createAsyncIterable(['resp2']));

      const batchEvents: unknown[] = [];
      el.addEventListener('batch-item-start', ((e: CustomEvent) => batchEvents.push(e.detail)) as EventListener);

      await handler.run('', [file1, file2], { batch: true });

      expect(batchEvents).toHaveLength(2);
    });
  });

  describe('run() auto-compact on QuotaExceededError', () => {
    it('retries with compact on QuotaExceededError when auto-compact set', async () => {
      el.setAttribute('auto-compact', '');
      await handler.createSession();
      vi.clearAllMocks();

      let callCount = 0;
      lm._session.promptStreaming.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          const err = new DOMException('Quota exceeded', 'QuotaExceededError');
          return (async function* () { throw err; })();
        }
        return createAsyncIterable(['retried']);
      });

      // Need a new session after compact
      lm.create.mockResolvedValue(lm._session);

      const responseListener = vi.fn();
      el.addEventListener('response', responseListener);

      await handler.run('Hello');

      expect(callCount).toBe(2);
    });
  });

  describe('compact()', () => {
    beforeEach(async () => {
      await handler.createSession();
      vi.clearAllMocks();
      lm._session.promptStreaming.mockReturnValue(
        createAsyncIterable(['response']),
      );
      lm.create.mockResolvedValue(lm._session);
    });

    it('returns false when chatHistory is empty', async () => {
      const result = await handler.compact();
      expect(result).toBe(false);
    });

    it('summarizes history and creates new session', async () => {
      handler.chatHistory = [
        { role: 'user', content: 'Hi' },
        { role: 'assistant', content: 'Hello' },
      ];

      const compactListener = vi.fn();
      el.addEventListener('compact', compactListener);

      const result = await handler.compact();

      expect(result).toBe(true);
      expect(summarizer._session.summarize).toHaveBeenCalled();
      expect(summarizer._session.destroy).toHaveBeenCalled();
      expect(lm.create).toHaveBeenCalled();
      expect(handler.chatHistory).toHaveLength(0);
      expect(compactListener).toHaveBeenCalledTimes(1);
    });

    it('includes system prompt in compacted session', async () => {
      el.setAttribute('system-prompt', 'Be helpful.');
      // Re-create to pick up sessionOptions
      await handler.createSession();
      vi.clearAllMocks();
      lm.create.mockResolvedValue(lm._session);

      handler.chatHistory = [
        { role: 'user', content: 'Hi' },
        { role: 'assistant', content: 'Hello' },
      ];

      await handler.compact();

      const createCall = lm.create.mock.calls[0]![0];
      expect(createCall.initialPrompts[0].content).toContain('Be helpful.');
      expect(createCall.initialPrompts[0].content).toContain('[Previous conversation summary]');
    });

    it('returns false and emits error when Summarizer API missing', async () => {
      const saved = globalThis.Summarizer;
      // @ts-expect-error -- removing global for test
      delete globalThis.Summarizer;

      handler.chatHistory = [{ role: 'user', content: 'Hi' }];

      const errorListener = vi.fn();
      el.addEventListener('error', errorListener);

      const result = await handler.compact();

      expect(result).toBe(false);
      expect(errorListener).toHaveBeenCalledTimes(1);

      Object.assign(globalThis, { Summarizer: saved });
    });
  });

  describe('destroy()', () => {
    it('clears chatHistory', async () => {
      await handler.createSession();
      handler.chatHistory = [
        { role: 'user', content: 'Hi' },
        { role: 'assistant', content: 'Hello' },
      ];

      handler.destroy();

      expect(handler.chatHistory).toHaveLength(0);
      expect(handler.session).toBeNull();
    });
  });

  describe('_autoCompactIfNeeded()', () => {
    it('compacts when context usage >= 80%', async () => {
      el.setAttribute('auto-compact', '');
      await handler.createSession();

      // Set up high context usage
      lm._session.contextUsage = 850;
      lm._session.contextWindow = 1000;
      handler.session = lm._session;
      handler.chatHistory = [
        { role: 'user', content: 'Hi' },
        { role: 'assistant', content: 'Hello' },
      ];

      vi.clearAllMocks();
      lm.create.mockResolvedValue(lm._session);
      lm._session.promptStreaming.mockReturnValue(
        createAsyncIterable(['ok']),
      );

      // Run to trigger _autoCompactIfNeeded
      await handler.run('test');

      // compact should have been called (summarizer used)
      expect(summarizer._session.summarize).toHaveBeenCalled();
    });
  });
});
