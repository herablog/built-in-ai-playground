import { BaseHandler, type AvailabilityResult, type AttachmentEntry, type CustomAttachment } from './base.js';

interface SessionOptions {
  temperature: number;
  topK: number;
  expectedInputs: { type: string; languages?: string[] }[];
  expectedOutputs: { type: string; languages?: string[] }[];
  systemPrompt: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export class PromptHandler extends BaseHandler {
  declare session: LanguageModelSession | null;
  chatHistory: ChatMessage[] = [];
  sessionOptions: SessionOptions | null = null;
  private _needsCompact = false;
  private _batchAborted = false;

  async checkAvailability(): Promise<AvailabilityResult> {
    if (!('LanguageModel' in self)) return { status: 'unavailable' };
    try {
      const outputLangs = this.attr('output-languages', 'en,ja,es').split(',').map(s => s.trim());
      const expectedOutputs: { type: string; languages: string[] }[] = [{ type: 'text', languages: outputLangs }];
      const status = await LanguageModel.availability({ expectedOutputs });
      const inputTypes: Record<string, boolean> = {};
      const types = this.attr('input-types', 'text').split(',').map(s => s.trim());
      for (const type of types) {
        try {
          const s = await LanguageModel.create({
            expectedInputs: [{ type: 'text' }, ...(type !== 'text' ? [{ type }] : [])],
            expectedOutputs,
          });
          s.destroy();
          inputTypes[type] = true;
        } catch {
          inputTypes[type] = false;
        }
      }
      // Auto-remove unsupported input types from attribute
      const supported = Object.entries(inputTypes).filter(([, v]) => v).map(([k]) => k);
      if (supported.length > 0 && supported.length < types.length) {
        this.el.setAttribute('input-types', supported.join(','));
      }

      return { status, inputTypes };
    } catch {
      return { status: 'unavailable' };
    }
  }

  override destroy(): void {
    super.destroy();
    this.chatHistory = [];
    this._updateContext();
  }

  async createSession(): Promise<void> {
    if (!('LanguageModel' in self)) throw new Error('LanguageModel API is not available.');

    const systemPrompt = this.attr('system-prompt', '');
    const temperature = parseFloat(this.attr('temperature', '1'));
    const topK = parseInt(this.attr('top-k', '3'));
    const inputLangs = this.attr('input-languages', 'en,ja,es').split(',').map(s => s.trim());
    const outputLangs = this.attr('output-languages', 'en,ja,es').split(',').map(s => s.trim());
    const inputTypes = this.attr('input-types', 'text').split(',').map(s => s.trim());

    const expectedInputs = inputTypes.map(t =>
      t === 'text' ? { type: 'text', languages: inputLangs } : { type: t }
    );
    const expectedOutputs = [{ type: 'text', languages: outputLangs }];
    const initialPrompts: LanguageModelPromptInput[] = systemPrompt
      ? [{ role: 'system', content: systemPrompt }]
      : [];

    const savedBatch = this._batchAborted;
    this.destroy();
    this._batchAborted = savedBatch;
    this.chatHistory = [];
    this.sessionOptions = { temperature, topK, expectedInputs, expectedOutputs, systemPrompt };

    this.session = await LanguageModel.create({
      temperature, topK, expectedInputs, expectedOutputs, initialPrompts,
    });

    if (this.el.hasAttribute('auto-compact')) {
      this.session.addEventListener('contextoverflow', () => {
        this._needsCompact = true;
      });
    }
  }

  override stop(): void {
    this._batchAborted = true;
    super.stop();
  }

  override createAbort(): AbortController {
    // createAbort() calls stop() internally for cleanup, but that should not
    // set _batchAborted — only an explicit stop() call from outside should.
    const saved = this._batchAborted;
    const controller = super.createAbort();
    this._batchAborted = saved;
    return controller;
  }

  async run(text: string, files: AttachmentEntry[] = [], options: { batch?: boolean } = {}): Promise<void> {
    // When batch mode is enabled and multiple files, process each file individually
    if (options.batch && files.length > 1) {
      this._batchAborted = false;
      for (let i = 0; i < files.length; i++) {
        if (this._batchAborted) return;
        const file = files[i]!;
        this.emit('batch-item-start', { file, current: i + 1, total: files.length });
        await this._runSingle(text, [file]);
      }
      return;
    }

    await this._runSingle(text, files);
  }

  private async _runSingle(text: string, files: AttachmentEntry[] = []): Promise<void> {
    await this.ensureSession();

    if (this._needsCompact) {
      await this.compact();
      this._needsCompact = false;
    }

    const content: LanguageModelContentPart[] = [];
    if (text) {
      content.push({ type: 'text', value: text });
    } else if (files.length > 0) {
      content.push({ type: 'text', value: `Describe the following file.` });
    }

    for (const entry of files) {
      if (this._isCustom(entry)) {
        if (entry.text) {
          content.push({ type: 'text', value: `--- ${entry.name} ---\n${entry.text}` });
        } else if (entry.file) {
          const type = entry.file.type?.startsWith('image/') ? 'image' : 'audio';
          content.push({ type, value: entry.file });
        }
      } else {
        const type = entry.type?.startsWith('image/') ? 'image' : 'audio';
        content.push({ type, value: entry });
      }
    }

    const names = files.map(f => f.name);
    this.chatHistory.push({ role: 'user', content: text || `[${names.join(', ')}]` });

    const controller = this.createAbort();
    let accumulated = '';

    const promptOptions: Partial<LanguageModelPromptOptions> = { signal: controller.signal };
    const constraintAttr = this.attr('response-constraint', '');
    if (constraintAttr) {
      try {
        promptOptions.responseConstraint = JSON.parse(constraintAttr);
      } catch { /* ignore invalid JSON */ }
    }
    if (this.el.hasAttribute('omit-response-constraint-input')) {
      promptOptions.omitResponseConstraintInput = true;
    }

    try {
      const stream = this.session!.promptStreaming(
        [{ role: 'user', content }],
        promptOptions
      );

      for await (const chunk of stream) {
        accumulated += chunk;
        this.emit('stream', { chunk, accumulated });
      }

      this.chatHistory.push({ role: 'assistant', content: accumulated });
      this.emit('response', { text: accumulated });
      this._updateContext();

      if (this.el.hasAttribute('auto-compact')) {
        await this._autoCompactIfNeeded();
      }
    } catch (e: unknown) {
      const err = e as Error & { name?: string };
      if (err.name === 'AbortError') return;
      if (err.name === 'QuotaExceededError' && this.el.hasAttribute('auto-compact')) {
        await this.compact();
        return this._runSingle(text);
      }
      this.emit('error', { message: err.message ?? String(e) });
    }
  }

  async compact(): Promise<boolean> {
    if (!('Summarizer' in self)) {
      this.emit('error', { message: 'Auto-compact requires Summarizer API.' });
      return false;
    }
    if (this.chatHistory.length === 0) return false;

    try {
      const historyText = this.chatHistory.map(m => `${m.role}: ${m.content}`).join('\n');
      const outputLangs = this.sessionOptions?.expectedOutputs?.[0]?.languages;
      const outputLanguage = outputLangs?.[0] || 'en';
      const summarizer = await Summarizer.create({ type: 'key-points', length: 'medium', outputLanguage });
      const summary = await summarizer.summarize(historyText);
      summarizer.destroy();

      const opts = this.sessionOptions!;
      const systemContent = opts.systemPrompt
        ? `${opts.systemPrompt}\n\n[Previous conversation summary]\n${summary}`
        : `[Previous conversation summary]\n${summary}`;

      this.session!.destroy();
      this.session = await LanguageModel.create({
        temperature: opts.temperature,
        topK: opts.topK,
        expectedInputs: opts.expectedInputs,
        expectedOutputs: opts.expectedOutputs,
        initialPrompts: [{ role: 'system', content: systemContent }],
      });

      this.chatHistory = [];
      this._updateContext();
      this.emit('compact', { summary });
      return true;
    } catch (e: unknown) {
      const err = e as Error;
      this.emit('error', { message: `Compact failed: ${err.message ?? String(e)}` });
      return false;
    }
  }

  private async _autoCompactIfNeeded(): Promise<void> {
    if (!this.session) return;
    const usage = this.session.contextUsage;
    const ctxWindow = this.session.contextWindow;
    if (usage && ctxWindow && usage / ctxWindow >= 0.8) {
      await this.compact();
    }
  }

  private _updateContext(): void {
    if (!this.el.hasAttribute('show-context')) return;
    const ring = this.el.shadowRoot?.querySelector('.context-ring') as HTMLElement | null;
    const fill = this.el.shadowRoot?.querySelector('.context-ring-fill') as SVGElement | null;
    if (!ring || !fill) return;

    if (!this.session) {
      ring.hidden = true;
      fill.setAttribute('stroke-dashoffset', '94.25');
      ring.title = '';
      return;
    }

    const usage = this.session.contextUsage;
    const ctxWindow = this.session.contextWindow;
    if (usage != null && ctxWindow != null && ctxWindow > 0) {
      ring.hidden = false;
      const ratio = Math.min(usage / ctxWindow, 1);
      const circumference = 94.25;
      fill.setAttribute('stroke-dashoffset', String(circumference * (1 - ratio)));
      ring.title = `Context: ${usage} / ${ctxWindow} (${Math.round(ratio * 100)}%)`;
      if (ratio < 0.6) fill.setAttribute('stroke', '#9ca3af');
      else if (ratio < 0.8) fill.setAttribute('stroke', '#2563eb');
      else fill.setAttribute('stroke', '#dc2626');
    }
  }

  private _isCustom(entry: AttachmentEntry): entry is CustomAttachment {
    return '_custom' in entry && entry._custom === true;
  }
}
