import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StreamingHandler } from '../apis/streaming.js';
import type { AvailabilityResult } from '../apis/base.js';
import { createAsyncIterable } from './mocks/chrome-ai.js';

class TestStreamingHandler extends StreamingHandler {
  streamItems: string[] = ['chunk1', 'chunk2'];
  streamError: Error | null = null;

  async checkAvailability(): Promise<AvailabilityResult> {
    return { status: 'readily' };
  }

  async createSession(): Promise<void> {
    this.session = { destroy: vi.fn() };
  }

  getStream(_text: string, _signal: AbortSignal): AsyncIterable<string> {
    if (this.streamError) {
      const err = this.streamError;
      return (async function* () {
        throw err;
      })();
    }
    return createAsyncIterable(this.streamItems);
  }
}

describe('StreamingHandler', () => {
  let el: HTMLElement;
  let handler: TestStreamingHandler;

  beforeEach(() => {
    el = document.createElement('div');
    handler = new TestStreamingHandler(el);
  });

  it('calls ensureSession then streams chunks', async () => {
    const streamEvents: { chunk: string; accumulated: string }[] = [];
    el.addEventListener('stream', ((e: CustomEvent) => {
      streamEvents.push(e.detail);
    }) as EventListener);

    await handler.run('test');

    expect(streamEvents).toHaveLength(2);
    expect(streamEvents[0]).toEqual({ chunk: 'chunk1', accumulated: 'chunk1' });
    expect(streamEvents[1]).toEqual({ chunk: 'chunk2', accumulated: 'chunk1chunk2' });
  });

  it('emits response with full text after stream ends', async () => {
    const listener = vi.fn();
    el.addEventListener('response', listener);

    await handler.run('test');

    expect(listener).toHaveBeenCalledTimes(1);
    const event = listener.mock.calls[0]![0] as CustomEvent;
    expect(event.detail.text).toBe('chunk1chunk2');
  });

  it('emits error on stream failure', async () => {
    handler.streamError = new Error('stream failed');

    const listener = vi.fn();
    el.addEventListener('error', listener);

    await handler.run('test');

    expect(listener).toHaveBeenCalledTimes(1);
    const event = listener.mock.calls[0]![0] as CustomEvent;
    expect(event.detail.message).toBe('stream failed');
  });

  it('suppresses AbortError silently', async () => {
    const abortError = new DOMException('Aborted', 'AbortError');
    handler.streamError = abortError;

    const errorListener = vi.fn();
    el.addEventListener('error', errorListener);

    await handler.run('test');

    expect(errorListener).not.toHaveBeenCalled();
  });

  it('creates session on first run', async () => {
    expect(handler.session).toBeNull();
    await handler.run('test');
    expect(handler.session).not.toBeNull();
  });
});
