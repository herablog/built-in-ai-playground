import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BuiltInAI } from '../built-in-ai.js';
import {
  createMockLanguageModel,
  createMockSummarizer,
  createAsyncIterable,
  installChromeAIMocks,
} from './mocks/chrome-ai.js';

function createElement(attrs: Record<string, string> = {}): BuiltInAI {
  const el = document.createElement('built-in-ai') as BuiltInAI;
  for (const [k, v] of Object.entries(attrs)) {
    el.setAttribute(k, v);
  }
  document.body.appendChild(el);
  return el;
}

describe('BuiltInAI', () => {
  let mocks: ReturnType<typeof installChromeAIMocks>;

  beforeEach(() => {
    document.body.innerHTML = '';
    mocks = installChromeAIMocks();
  });

  describe('lifecycle', () => {
    it('creates shadow DOM with textarea and buttons', () => {
      const el = createElement();
      const shadow = el.shadowRoot!;
      expect(shadow.querySelector('textarea')).not.toBeNull();
      expect(shadow.querySelector('.send-btn')).not.toBeNull();
      expect(shadow.querySelector('.stop-btn')).not.toBeNull();
    });

    it('sets placeholder from attribute on connected', () => {
      const el = createElement({ placeholder: 'Type here...' });
      const textarea = el.shadowRoot!.querySelector('textarea')!;
      expect(textarea.placeholder).toBe('Type here...');
    });

    it('uses default placeholder when none set', () => {
      const el = createElement();
      const textarea = el.shadowRoot!.querySelector('textarea')!;
      expect(textarea.placeholder).toBe('Enter your message...');
    });

    it('destroys handler on disconnected', async () => {
      const el = createElement({ api: 'prompt' });
      await el.init();
      const destroySpy = vi.spyOn(el.handler!, 'destroy');
      el.remove();
      expect(destroySpy).toHaveBeenCalled();
    });
  });

  describe('observedAttributes', () => {
    it('includes all expected attribute names', () => {
      const attrs = BuiltInAI.observedAttributes;
      expect(attrs).toContain('api');
      expect(attrs).toContain('placeholder');
      expect(attrs).toContain('disabled');
      expect(attrs).toContain('system-prompt');
      expect(attrs).toContain('temperature');
      expect(attrs).toContain('source-language');
      expect(attrs).toContain('target-language');
      expect(attrs).toContain('expected-input-languages');
    });
  });

  describe('attribute changes', () => {
    it('setting api attribute initializes handler', async () => {
      const el = createElement();
      el.setAttribute('api', 'prompt');
      // Wait for async init
      await new Promise(r => setTimeout(r, 0));
      expect(el.handler).not.toBeNull();
    });

    it('changing api destroys old handler and creates new one', async () => {
      const el = createElement({ api: 'prompt' });
      await el.init();
      const oldHandler = el.handler;
      const destroySpy = vi.spyOn(oldHandler!, 'destroy');

      el.setAttribute('api', 'summarizer');
      await new Promise(r => setTimeout(r, 0));

      expect(destroySpy).toHaveBeenCalled();
      expect(el.handler).not.toBe(oldHandler);
    });

    it('placeholder attribute change updates textarea', () => {
      const el = createElement();
      el.setAttribute('placeholder', 'New placeholder');
      const textarea = el.shadowRoot!.querySelector('textarea')!;
      expect(textarea.placeholder).toBe('New placeholder');
    });

    it('disabled attribute disables controls', () => {
      const el = createElement();
      el.setAttribute('disabled', '');
      const textarea = el.shadowRoot!.querySelector('textarea')! as HTMLTextAreaElement;
      const sendBtn = el.shadowRoot!.querySelector('.send-btn')! as HTMLButtonElement;
      expect(textarea.disabled).toBe(true);
      expect(sendBtn.disabled).toBe(true);
    });

    it('removing disabled re-enables controls', () => {
      const el = createElement({ disabled: '' });
      el.removeAttribute('disabled');
      const textarea = el.shadowRoot!.querySelector('textarea')! as HTMLTextAreaElement;
      expect(textarea.disabled).toBe(false);
    });

    it('changing accept does not reinitialize handler', async () => {
      const el = createElement({ api: 'prompt' });
      await el.init();
      const handler = el.handler;

      el.setAttribute('accept', '.pdf,.txt');

      expect(el.handler).toBe(handler);
    });
  });

  describe('init()', () => {
    it('dispatches availability event', async () => {
      const el = createElement({ api: 'prompt' });
      const listener = vi.fn();
      el.addEventListener('availability', listener);

      await el.init();

      // May fire multiple times due to attributeChangedCallback + init()
      expect(listener).toHaveBeenCalled();
      const lastCall = listener.mock.calls[listener.mock.calls.length - 1]![0] as CustomEvent;
      expect(lastCall.detail.status).toBe('readily');
    });

    it('sets unavailable attribute when API is unavailable', async () => {
      mocks.lm.availability.mockResolvedValue('unavailable');
      // Also make create fail so checkAvailability falls through
      mocks.lm.create.mockRejectedValue(new Error('unavailable'));
      const el = createElement({ api: 'prompt' });

      await el.init();

      // The handler's checkAvailability catches errors and returns unavailable
      // but availability mock returns 'unavailable' string which is not 'readily' or 'available'
      expect(el.hasAttribute('unavailable')).toBe(true);
    });

    it('removes unavailable attribute when API is available', async () => {
      const el = createElement({ api: 'prompt', unavailable: '' });
      await el.init();
      expect(el.hasAttribute('unavailable')).toBe(false);
    });

    it('shows file button only for prompt API', async () => {
      const el = createElement({ api: 'prompt' });
      await el.init();
      const fileBtn = el.shadowRoot!.querySelector('.file-btn')! as HTMLElement;
      expect(fileBtn.hidden).toBe(false);

      const el2 = createElement({ api: 'summarizer' });
      await el2.init();
      const fileBtn2 = el2.shadowRoot!.querySelector('.file-btn')! as HTMLElement;
      expect(fileBtn2.hidden).toBe(true);
    });

    it('initializes without error when accept attribute is set', async () => {
      const el = createElement({ api: 'prompt', accept: '.pdf,.docx' });
      await el.init();
      expect(el.handler).not.toBeNull();
      expect(el.hasAttribute('unavailable')).toBe(false);
    });
  });

  describe('UI interactions', () => {
    it('send button calls handler.run with textarea value', async () => {
      const el = createElement({ api: 'prompt' });
      await el.init();

      mocks.lm._session.promptStreaming.mockReturnValue(
        createAsyncIterable(['response']),
      );

      const textarea = el.shadowRoot!.querySelector('textarea')! as HTMLTextAreaElement;
      textarea.value = 'Hello';

      const sendBtn = el.shadowRoot!.querySelector('.send-btn')! as HTMLButtonElement;
      sendBtn.click();

      // Wait for async operation
      await new Promise(r => setTimeout(r, 0));

      expect(textarea.value).toBe('');
    });

    it('does nothing when textarea is empty and no files', async () => {
      const el = createElement({ api: 'prompt' });
      await el.init();
      const runSpy = vi.spyOn(el.handler!, 'run');

      const sendBtn = el.shadowRoot!.querySelector('.send-btn')! as HTMLButtonElement;
      sendBtn.click();

      await new Promise(r => setTimeout(r, 0));
      expect(runSpy).not.toHaveBeenCalled();
    });

    it('Enter key triggers send', async () => {
      const el = createElement({ api: 'prompt' });
      await el.init();

      mocks.lm._session.promptStreaming.mockReturnValue(
        createAsyncIterable(['ok']),
      );

      const textarea = el.shadowRoot!.querySelector('textarea')! as HTMLTextAreaElement;
      textarea.value = 'Hello';

      const event = new KeyboardEvent('keydown', {
        key: 'Enter',
        shiftKey: false,
        bubbles: true,
      });
      textarea.dispatchEvent(event);

      await new Promise(r => setTimeout(r, 0));
      expect(textarea.value).toBe('');
    });

    it('Shift+Enter does not trigger send', async () => {
      const el = createElement({ api: 'prompt' });
      await el.init();

      const textarea = el.shadowRoot!.querySelector('textarea')! as HTMLTextAreaElement;
      textarea.value = 'Hello';

      const event = new KeyboardEvent('keydown', {
        key: 'Enter',
        shiftKey: true,
        bubbles: true,
      });
      textarea.dispatchEvent(event);

      await new Promise(r => setTimeout(r, 0));
      // Text should remain since send was not triggered
      expect(textarea.value).toBe('Hello');
    });

    it('stop button calls handler.stop()', async () => {
      const el = createElement({ api: 'prompt' });
      await el.init();
      const stopSpy = vi.spyOn(el.handler!, 'stop');

      const stopBtn = el.shadowRoot!.querySelector('.stop-btn')! as HTMLButtonElement;
      stopBtn.click();

      expect(stopSpy).toHaveBeenCalled();
    });

    it('toggles send/stop button visibility during run', async () => {
      const el = createElement({ api: 'prompt' });
      await el.init();

      let resolveStream: (() => void) | undefined;
      mocks.lm._session.promptStreaming.mockReturnValue(
        (async function* () {
          yield 'chunk';
          await new Promise<void>(r => { resolveStream = r; });
        })(),
      );

      const textarea = el.shadowRoot!.querySelector('textarea')! as HTMLTextAreaElement;
      textarea.value = 'Hello';

      const sendGroup = el.shadowRoot!.querySelector('.send-group')! as HTMLElement;
      const stopBtn = el.shadowRoot!.querySelector('.stop-btn')! as HTMLElement;

      const sendBtn = el.shadowRoot!.querySelector('.send-btn')! as HTMLButtonElement;
      sendBtn.click();

      await new Promise(r => setTimeout(r, 0));

      expect(sendGroup.hidden).toBe(true);
      expect(stopBtn.hidden).toBe(false);

      resolveStream!();
      await new Promise(r => setTimeout(r, 0));

      expect(sendGroup.hidden).toBe(false);
      expect(stopBtn.hidden).toBe(true);
    });
  });

  describe('file attachments', () => {
    it('addAttachment adds entry and updates UI', async () => {
      const el = createElement({ api: 'prompt' });
      await el.init();

      el.addAttachment({ name: 'test.txt', text: 'content' });

      const attachments = el.shadowRoot!.querySelector('.attachments')! as HTMLElement;
      expect(attachments.hidden).toBe(false);
      expect(attachments.querySelectorAll('.attachment-item')).toHaveLength(1);
    });

    it('clearAttachments removes all entries', async () => {
      const el = createElement({ api: 'prompt' });
      await el.init();

      el.addAttachment({ name: 'a.txt', text: 'a' });
      el.addAttachment({ name: 'b.txt', text: 'b' });
      el.clearAttachments();

      const attachments = el.shadowRoot!.querySelector('.attachments')! as HTMLElement;
      expect(attachments.hidden).toBe(true);
      expect(attachments.querySelectorAll('.attachment-item')).toHaveLength(0);
    });

    it('shows send menu button when 2+ files attached', async () => {
      const el = createElement({ api: 'prompt' });
      await el.init();

      el.addAttachment({ name: 'a.txt', text: 'a' });
      el.addAttachment({ name: 'b.txt', text: 'b' });

      const menuBtn = el.shadowRoot!.querySelector('.send-menu-btn')! as HTMLElement;
      expect(menuBtn.hidden).toBe(false);
    });

    it('hides send menu button with fewer than 2 files', async () => {
      const el = createElement({ api: 'prompt' });
      await el.init();

      el.addAttachment({ name: 'a.txt', text: 'a' });

      const menuBtn = el.shadowRoot!.querySelector('.send-menu-btn')! as HTMLElement;
      expect(menuBtn.hidden).toBe(true);
    });
  });

  describe('beforesend event', () => {
    it('fires before handler.run', async () => {
      const el = createElement({ api: 'prompt' });
      await el.init();

      mocks.lm._session.promptStreaming.mockReturnValue(
        createAsyncIterable(['ok']),
      );

      const listener = vi.fn();
      el.addEventListener('beforesend', listener);

      const textarea = el.shadowRoot!.querySelector('textarea')! as HTMLTextAreaElement;
      textarea.value = 'Hello';

      const sendBtn = el.shadowRoot!.querySelector('.send-btn')! as HTMLButtonElement;
      sendBtn.click();

      expect(listener).toHaveBeenCalledTimes(1);
      const event = listener.mock.calls[0]![0] as CustomEvent;
      expect(event.detail.text).toBe('Hello');
    });

    it('canceling beforesend prevents send', async () => {
      const el = createElement({ api: 'prompt' });
      await el.init();

      const runSpy = vi.spyOn(el.handler!, 'run');

      el.addEventListener('beforesend', (e) => e.preventDefault());

      const textarea = el.shadowRoot!.querySelector('textarea')! as HTMLTextAreaElement;
      textarea.value = 'Hello';

      const sendBtn = el.shadowRoot!.querySelector('.send-btn')! as HTMLButtonElement;
      sendBtn.click();

      await new Promise(r => setTimeout(r, 0));
      expect(runSpy).not.toHaveBeenCalled();
    });
  });

  describe('public API', () => {
    it('send() calls handler.run', async () => {
      const el = createElement({ api: 'prompt' });
      await el.init();

      mocks.lm._session.promptStreaming.mockReturnValue(
        createAsyncIterable(['ok']),
      );

      const runSpy = vi.spyOn(el.handler!, 'run');
      await el.send('Hello');

      expect(runSpy).toHaveBeenCalledWith('Hello');
    });

    it('send() does nothing with empty text', async () => {
      const el = createElement({ api: 'prompt' });
      await el.init();
      const runSpy = vi.spyOn(el.handler!, 'run');

      await el.send('');
      expect(runSpy).not.toHaveBeenCalled();
    });

    it('stop() calls handler.stop', async () => {
      const el = createElement({ api: 'prompt' });
      await el.init();
      const stopSpy = vi.spyOn(el.handler!, 'stop');
      el.stop();
      expect(stopSpy).toHaveBeenCalled();
    });

    it('destroy() calls handler.destroy', async () => {
      const el = createElement({ api: 'prompt' });
      await el.init();
      const destroySpy = vi.spyOn(el.handler!, 'destroy');
      el.destroy();
      expect(destroySpy).toHaveBeenCalled();
    });

    it('compact() delegates to PromptHandler', async () => {
      const el = createElement({ api: 'prompt' });
      await el.init();

      // compact returns false when chatHistory is empty
      const result = await el.compact();
      expect(result).toBe(false);
    });

    it('compact() returns undefined for non-prompt handlers', async () => {
      const el = createElement({ api: 'summarizer' });
      await el.init();

      const result = await el.compact();
      expect(result).toBeUndefined();
    });
  });
});
