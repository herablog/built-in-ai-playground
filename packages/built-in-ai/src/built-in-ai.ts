import { PromptHandler } from './apis/prompt.js';
import { SummarizerHandler } from './apis/summarizer.js';
import { WriterHandler } from './apis/writer.js';
import { RewriterHandler } from './apis/rewriter.js';
import { TranslatorHandler } from './apis/translator.js';
import { DetectorHandler } from './apis/detector.js';
import { ProofreaderHandler } from './apis/proofreader.js';
import { styles } from './styles.js';
import type { BaseHandler, AttachmentEntry } from './apis/base.js';

type ApiName = 'prompt' | 'summarizer' | 'writer' | 'rewriter' | 'translator' | 'detector' | 'proofreader';

const HANDLERS: Record<ApiName, new (el: HTMLElement) => BaseHandler> = {
  prompt: PromptHandler,
  summarizer: SummarizerHandler,
  writer: WriterHandler,
  rewriter: RewriterHandler,
  translator: TranslatorHandler,
  detector: DetectorHandler,
  proofreader: ProofreaderHandler,
};

export class BuiltInAI extends HTMLElement {
  handler: BaseHandler | null = null;

  private _isRunning = false;
  private _textarea: HTMLTextAreaElement;
  private _actions: HTMLDivElement;
  private _actionsRight: HTMLDivElement;
  private _contextRing: HTMLDivElement;
  private _sendGroup: HTMLDivElement;
  private _sendBtn: HTMLButtonElement;
  private _sendMenuBtn: HTMLButtonElement;
  private _sendMenu: HTMLDivElement;
  private _stopBtn: HTMLButtonElement;
  private _fileBtn: HTMLButtonElement;
  private _fileInput: HTMLInputElement;
  private _attachments: HTMLDivElement;
  private _files: AttachmentEntry[] = [];
  private _batch = false;

  static get observedAttributes(): string[] {
    return [
      'api', 'placeholder', 'disabled',
      'system-prompt', 'temperature', 'top-k', 'input-languages', 'output-languages', 'input-types',
      'response-constraint', 'omit-response-constraint-input',
      'type', 'format', 'length', 'tone', 'shared-context', 'output-language',
      'source-language', 'target-language', 'accept',
      'expected-input-languages', 'correction-explanation-language',
    ];
  }

  constructor() {
    super();

    const shadow = this.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.textContent = styles;
    shadow.appendChild(style);

    const container = document.createElement('div');
    container.className = 'container';
    container.setAttribute('part', 'container');

    this._textarea = document.createElement('textarea');
    this._textarea.setAttribute('part', 'input');
    this._textarea.setAttribute('name', 'input');
    this._textarea.rows = 1;

    this._actions = document.createElement('div');
    this._actions.className = 'actions';

    // Context ring
    this._contextRing = document.createElement('div');
    this._contextRing.className = 'context-ring';
    this._contextRing.hidden = true;
    this._contextRing.innerHTML = `
      <svg viewBox="0 0 36 36" width="20" height="20">
        <circle cx="18" cy="18" r="15" fill="none" stroke="#e5e7eb" stroke-width="3"/>
        <circle class="context-ring-fill" cx="18" cy="18" r="15" fill="none" stroke="#9ca3af" stroke-width="3"
          stroke-dasharray="94.25 94.25" stroke-dashoffset="94.25"
          stroke-linecap="round" transform="rotate(-90 18 18)"/>
      </svg>`;
    this._contextRing.setAttribute('part', 'context-ring');

    // Send button group (split button)
    this._sendGroup = document.createElement('div');
    this._sendGroup.className = 'send-group';
    this._sendGroup.setAttribute('part', 'send-group');

    this._sendBtn = document.createElement('button');
    this._sendBtn.className = 'send-btn';
    this._sendBtn.setAttribute('part', 'send-button');
    this._sendBtn.textContent = 'Send';

    this._sendMenuBtn = document.createElement('button');
    this._sendMenuBtn.className = 'send-menu-btn';
    this._sendMenuBtn.setAttribute('part', 'send-menu-button');
    this._sendMenuBtn.setAttribute('aria-label', 'Send options');
    this._sendMenuBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`;
    this._sendMenuBtn.hidden = true;

    this._sendMenu = document.createElement('div');
    this._sendMenu.className = 'send-menu';
    this._sendMenu.setAttribute('part', 'send-menu');
    this._sendMenu.hidden = true;
    this._sendMenu.innerHTML = `
      <button class="send-menu-item" data-batch="false">Send</button>
      <button class="send-menu-item" data-batch="true">Send each</button>
    `;

    this._sendGroup.appendChild(this._sendBtn);
    this._sendGroup.appendChild(this._sendMenuBtn);
    this._sendGroup.appendChild(this._sendMenu);

    this._stopBtn = document.createElement('button');
    this._stopBtn.className = 'stop-btn';
    this._stopBtn.setAttribute('part', 'stop-button');
    this._stopBtn.textContent = 'Stop';
    this._stopBtn.hidden = true;

    // File attach button
    this._fileBtn = document.createElement('button');
    this._fileBtn.type = 'button';
    this._fileBtn.className = 'file-btn';
    this._fileBtn.setAttribute('part', 'file-button');
    this._fileBtn.setAttribute('aria-label', 'Attach file');
    this._fileBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`;
    this._fileBtn.hidden = true;

    this._fileInput = document.createElement('input');
    this._fileInput.type = 'file';
    this._fileInput.multiple = true;
    this._fileInput.accept = 'image/*,audio/*';
    this._fileInput.hidden = true;

    // Attachments preview
    this._attachments = document.createElement('div');
    this._attachments.className = 'attachments';
    this._attachments.hidden = true;

    // Layout
    this._actionsRight = document.createElement('div');
    this._actionsRight.className = 'actions-right';
    this._actionsRight.appendChild(this._contextRing);
    this._actionsRight.appendChild(this._sendGroup);
    this._actionsRight.appendChild(this._stopBtn);

    this._actions.appendChild(this._fileBtn);
    this._actions.appendChild(this._actionsRight);

    container.appendChild(this._attachments);
    container.appendChild(this._textarea);
    container.appendChild(this._actions);
    shadow.appendChild(container);

    // Events
    this._sendBtn.addEventListener('click', () => this._handleSend());
    this._stopBtn.addEventListener('click', () => this.stop());
    this._sendMenuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this._sendMenu.hidden = !this._sendMenu.hidden;
    });
    this._sendMenu.addEventListener('click', (e) => {
      const item = (e.target as HTMLElement).closest('[data-batch]') as HTMLElement | null;
      if (!item) return;
      this._batch = item.dataset.batch === 'true';
      this._sendMenu.hidden = true;
      this._sendBtn.textContent = this._batch ? 'Send each' : 'Send';
    });
    shadow.addEventListener('click', (e) => {
      if (!this._sendMenuBtn.contains(e.target as Node) && !this._sendMenu.contains(e.target as Node)) {
        this._sendMenu.hidden = true;
      }
    });
    this._fileBtn.addEventListener('click', () => this._fileInput.click());
    this._fileInput.addEventListener('change', () => {
      const files = [...(this._fileInput.files ?? [])];
      this._fileInput.value = '';

      const event = new CustomEvent('fileattach', {
        detail: { files },
        cancelable: true,
      });
      if (this.dispatchEvent(event)) {
        for (const file of files) {
          this._files.push(file);
        }
        this._updateAttachmentsUI();
      }
    });
    this._textarea.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
        e.preventDefault();
        this._handleSend();
      }
    });
  }

  connectedCallback(): void {
    this._textarea.placeholder = this.getAttribute('placeholder') || 'Enter your message...';
  }

  async init(): Promise<void> {
    await this._initHandler().catch((err) => this.dispatchEvent(new CustomEvent('error', { detail: err })));
  }

  disconnectedCallback(): void {
    this.handler?.destroy();
    this.handler = null;
  }

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    if (oldValue === newValue) return;

    if (name === 'api') {
      this._initHandler().catch((err) => this.dispatchEvent(new CustomEvent('error', { detail: err })));
    } else if (name === 'placeholder') {
      this._textarea.placeholder = newValue || 'Enter your message...';
    } else if (name === 'disabled') {
      const disabled = this.hasAttribute('disabled');
      this._textarea.disabled = disabled;
      this._sendBtn.disabled = disabled;
      this._sendMenuBtn.disabled = disabled;
    } else if (name === 'accept') {
      if (newValue) this._fileInput.accept = newValue;
    } else {
      this._initHandler().catch((err) => this.dispatchEvent(new CustomEvent('error', { detail: err })));
    }
  }

  private async _initHandler(): Promise<void> {
    if (this.handler) {
      this.handler.destroy();
      this.handler = null;
    }

    const api = this.getAttribute('api') as ApiName | null;
    if (!api || !(api in HANDLERS)) return;

    const HandlerClass = HANDLERS[api];
    this.handler = new HandlerClass(this);
    const result = await this.handler.checkAvailability();
    const isAvailable = result.status === 'readily' || result.status === 'available';

    if (isAvailable) {
      this.removeAttribute('unavailable');
    } else {
      this.setAttribute('unavailable', '');
    }

    const disabled = !isAvailable || this.hasAttribute('disabled');
    this._textarea.disabled = disabled;
    this._sendBtn.disabled = disabled;
    this._sendMenuBtn.disabled = disabled;

    // File button for Prompt API
    const hasFileBtn = api === 'prompt';
    this._fileBtn.hidden = !hasFileBtn || !isAvailable;
    this._actions.classList.toggle('has-left', hasFileBtn && isAvailable);
    if (hasFileBtn) {
      const accept = this.getAttribute('accept');
      if (accept) {
        this._fileInput.accept = accept;
      }
    }

    this.dispatchEvent(new CustomEvent('availability', { detail: result }));
  }

  private _updateAttachmentsUI(): void {
    this._attachments.innerHTML = '';
    this._attachments.hidden = this._files.length === 0;
    this._sendMenuBtn.hidden = this._files.length < 2;
    if (this._files.length < 2) {
      this._batch = false;
      this._sendMenu.hidden = true;
      this._sendBtn.textContent = 'Send';
    }
    this._files.forEach((entry, i) => {
      const item = document.createElement('span');
      item.className = 'attachment-item';
      const nameEl = document.createElement('span');
      nameEl.className = 'attachment-name';
      nameEl.textContent = entry.name;
      item.appendChild(nameEl);
      const remove = document.createElement('button');
      remove.className = 'attachment-remove';
      remove.innerHTML = '&times;';
      remove.addEventListener('click', () => {
        this._files = this._files.filter((_, idx) => idx !== i);
        this._updateAttachmentsUI();
      });
      item.appendChild(remove);
      this._attachments.appendChild(item);
    });
  }

  private async _handleSend(): Promise<void> {
    if (this._isRunning || !this.handler) return;

    const text = this._textarea.value.trim();
    if (!text && this._files.length === 0) return;

    const batch = this._batch;
    const event = new CustomEvent('beforesend', {
      detail: { text, files: [...this._files], batch },
      cancelable: true,
    });
    if (!this.dispatchEvent(event)) {
      this._textarea.value = '';
      this._files = [];
      this._batch = false;
      this._updateAttachmentsUI();
      return;
    }

    this._textarea.value = '';
    const files = [...this._files];
    this._files = [];
    this._batch = false;
    this._updateAttachmentsUI();

    this._isRunning = true;
    this._sendGroup.hidden = true;
    this._stopBtn.hidden = false;

    try {
      await this.handler.run(text, files, { batch });
    } finally {
      this._isRunning = false;
      this._sendGroup.hidden = false;
      this._stopBtn.hidden = true;
    }
  }

  // Public API
  async send(text: string): Promise<void> {
    if (this._isRunning || !text || !this.handler) return;
    this._isRunning = true;
    this._sendGroup.hidden = true;
    this._stopBtn.hidden = false;
    try {
      await this.handler.run(text);
    } finally {
      this._isRunning = false;
      this._sendGroup.hidden = false;
      this._stopBtn.hidden = true;
    }
  }

  stop(): void {
    this.handler?.stop();
  }

  destroy(): void {
    this.handler?.destroy();
  }

  async compact(): Promise<boolean | undefined> {
    const handler = this.handler as PromptHandler | null;
    if (handler?.compact) {
      return handler.compact();
    }
  }

  addAttachment({ name, file, text }: { name: string; file?: File; text?: string }): void {
    this._files.push({ name, file, text, _custom: true as const });
    this._updateAttachmentsUI();
  }

  clearAttachments(): void {
    this._files = [];
    this._updateAttachmentsUI();
  }
}
