export type AvailabilityStatus =
  | 'unavailable'
  | 'downloadable'
  | 'downloading'
  | 'available'
  | 'readily';

export interface AvailabilityResult {
  status: AvailabilityStatus;
  inputTypes?: Record<string, boolean>;
}

export interface CustomAttachment {
  name: string;
  file?: File;
  text?: string;
  _custom: true;
}

export type AttachmentEntry = File | CustomAttachment;

export async function checkApi(
  name: string,
  fn: () => Promise<AvailabilityStatus>,
): Promise<AvailabilityResult> {
  if (!(name in self)) return { status: 'unavailable' };
  try {
    return { status: await fn() };
  } catch {
    return { status: 'unavailable' };
  }
}

export abstract class BaseHandler {
  protected readonly el: HTMLElement;
  session: { destroy(): void } | null = null;
  abortController: AbortController | null = null;

  constructor(element: HTMLElement) {
    this.el = element;
  }

  abstract checkAvailability(): Promise<AvailabilityResult>;
  abstract createSession(): Promise<void>;
  abstract run(text: string, files?: AttachmentEntry[], options?: { batch?: boolean }): Promise<void>;

  stop(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  destroy(): void {
    this.stop();
    if (this.session) {
      this.session.destroy();
      this.session = null;
    }
    this.emit('session-destroyed', {});
  }

  createAbort(): AbortController {
    this.stop();
    this.abortController = new AbortController();
    return this.abortController;
  }

  emit(name: string, detail: Record<string, unknown>): void {
    this.el.dispatchEvent(new CustomEvent(name, { detail }));
  }

  attr(name: string, fallback: string = ''): string {
    return this.el.getAttribute(name) ?? fallback;
  }

  async ensureSession(): Promise<void> {
    if (!this.session) {
      await this.createSession();
      this.emit('session-created', {});
    }
  }
}
