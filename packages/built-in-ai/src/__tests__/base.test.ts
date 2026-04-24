import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BaseHandler, type AvailabilityResult } from '../apis/base.js';

// Concrete subclass for testing abstract BaseHandler
class TestHandler extends BaseHandler {
  createSessionMock = vi.fn();

  async checkAvailability(): Promise<AvailabilityResult> {
    return { status: 'readily' };
  }

  async createSession(): Promise<void> {
    this.session = { destroy: vi.fn() };
    this.createSessionMock();
  }

  async run(): Promise<void> {}
}

describe('BaseHandler', () => {
  let el: HTMLElement;
  let handler: TestHandler;

  beforeEach(() => {
    el = document.createElement('div');
    handler = new TestHandler(el);
  });

  describe('stop()', () => {
    it('aborts the current AbortController', () => {
      const controller = handler.createAbort();
      const abortSpy = vi.spyOn(controller, 'abort');
      handler.stop();
      expect(abortSpy).toHaveBeenCalled();
      expect(handler.abortController).toBeNull();
    });

    it('is idempotent when no controller exists', () => {
      expect(() => handler.stop()).not.toThrow();
    });
  });

  describe('destroy()', () => {
    it('calls session.destroy and emits session-destroyed', () => {
      const destroyFn = vi.fn();
      handler.session = { destroy: destroyFn };

      const events: string[] = [];
      el.addEventListener('session-destroyed', () => events.push('session-destroyed'));

      handler.destroy();

      expect(destroyFn).toHaveBeenCalled();
      expect(handler.session).toBeNull();
      expect(events).toContain('session-destroyed');
    });

    it('handles null session gracefully', () => {
      handler.session = null;
      expect(() => handler.destroy()).not.toThrow();
    });

    it('stops abort controller', () => {
      const controller = handler.createAbort();
      const abortSpy = vi.spyOn(controller, 'abort');
      handler.session = { destroy: vi.fn() };
      handler.destroy();
      expect(abortSpy).toHaveBeenCalled();
    });
  });

  describe('createAbort()', () => {
    it('returns a new AbortController', () => {
      const controller = handler.createAbort();
      expect(controller).toBeInstanceOf(AbortController);
      expect(handler.abortController).toBe(controller);
    });

    it('stops previous controller before creating new one', () => {
      const first = handler.createAbort();
      const abortSpy = vi.spyOn(first, 'abort');
      const second = handler.createAbort();
      expect(abortSpy).toHaveBeenCalled();
      expect(handler.abortController).toBe(second);
    });
  });

  describe('emit()', () => {
    it('dispatches CustomEvent with correct name and detail', () => {
      const listener = vi.fn();
      el.addEventListener('test-event', listener);

      handler.emit('test-event', { foo: 'bar' });

      expect(listener).toHaveBeenCalledTimes(1);
      const event = listener.mock.calls[0]![0] as CustomEvent;
      expect(event.detail).toEqual({ foo: 'bar' });
    });
  });

  describe('attr()', () => {
    it('reads attribute from element', () => {
      el.setAttribute('my-attr', 'hello');
      expect(handler.attr('my-attr')).toBe('hello');
    });

    it('returns fallback when attribute is missing', () => {
      expect(handler.attr('missing', 'default')).toBe('default');
    });

    it('returns empty string when no fallback provided', () => {
      expect(handler.attr('missing')).toBe('');
    });
  });

  describe('ensureSession()', () => {
    it('creates session on first call and emits session-created', async () => {
      const events: string[] = [];
      el.addEventListener('session-created', () => events.push('session-created'));

      await handler.ensureSession();

      expect(handler.createSessionMock).toHaveBeenCalledTimes(1);
      expect(handler.session).not.toBeNull();
      expect(events).toContain('session-created');
    });

    it('skips creation if session already exists', async () => {
      handler.session = { destroy: vi.fn() };
      await handler.ensureSession();
      expect(handler.createSessionMock).not.toHaveBeenCalled();
    });
  });
});
