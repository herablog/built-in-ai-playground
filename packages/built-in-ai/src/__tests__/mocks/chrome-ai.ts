import { vi } from 'vitest';

// Async iterable helper for streaming mocks
export async function* createAsyncIterable<T>(items: T[]): AsyncGenerator<T> {
  for (const item of items) {
    yield item;
  }
}

// LanguageModel
export function createMockLanguageModelSession(
  overrides?: Record<string, unknown>,
) {
  return {
    prompt: vi.fn().mockResolvedValue('mock response'),
    promptStreaming: vi
      .fn()
      .mockReturnValue(createAsyncIterable(['Hello', ' World'])),
    append: vi.fn().mockResolvedValue(undefined),
    clone: vi.fn(),
    destroy: vi.fn(),
    addEventListener: vi.fn(),
    contextUsage: 100,
    contextWindow: 1000,
    ...overrides,
  };
}

export function createMockLanguageModel(
  sessionOverrides?: Record<string, unknown>,
) {
  const session = createMockLanguageModelSession(sessionOverrides);
  return {
    availability: vi.fn().mockResolvedValue('readily'),
    create: vi.fn().mockResolvedValue(session),
    _session: session,
  };
}

// Summarizer
export function createMockSummarizerSession(
  overrides?: Record<string, unknown>,
) {
  return {
    summarize: vi.fn().mockResolvedValue('summary text'),
    summarizeStreaming: vi
      .fn()
      .mockReturnValue(createAsyncIterable(['summary', ' text'])),
    measureInputUsage: vi.fn().mockResolvedValue(10),
    inputUsage: 10,
    inputQuota: 100,
    destroy: vi.fn(),
    ...overrides,
  };
}

export function createMockSummarizer(
  sessionOverrides?: Record<string, unknown>,
) {
  const session = createMockSummarizerSession(sessionOverrides);
  return {
    availability: vi.fn().mockResolvedValue('readily'),
    create: vi.fn().mockResolvedValue(session),
    _session: session,
  };
}

// Writer
export function createMockWriterSession(
  overrides?: Record<string, unknown>,
) {
  return {
    write: vi.fn().mockResolvedValue('written text'),
    writeStreaming: vi
      .fn()
      .mockReturnValue(createAsyncIterable(['written', ' text'])),
    measureInputUsage: vi.fn().mockResolvedValue(10),
    inputUsage: 10,
    inputQuota: 100,
    destroy: vi.fn(),
    ...overrides,
  };
}

export function createMockWriter(sessionOverrides?: Record<string, unknown>) {
  const session = createMockWriterSession(sessionOverrides);
  return {
    availability: vi.fn().mockResolvedValue('readily'),
    create: vi.fn().mockResolvedValue(session),
    _session: session,
  };
}

// Rewriter
export function createMockRewriterSession(
  overrides?: Record<string, unknown>,
) {
  return {
    rewrite: vi.fn().mockResolvedValue('rewritten text'),
    rewriteStreaming: vi
      .fn()
      .mockReturnValue(createAsyncIterable(['rewritten', ' text'])),
    measureInputUsage: vi.fn().mockResolvedValue(10),
    inputUsage: 10,
    inputQuota: 100,
    destroy: vi.fn(),
    ...overrides,
  };
}

export function createMockRewriter(
  sessionOverrides?: Record<string, unknown>,
) {
  const session = createMockRewriterSession(sessionOverrides);
  return {
    availability: vi.fn().mockResolvedValue('readily'),
    create: vi.fn().mockResolvedValue(session),
    _session: session,
  };
}

// Translator
export function createMockTranslatorSession(
  overrides?: Record<string, unknown>,
) {
  return {
    translate: vi.fn().mockResolvedValue('translated text'),
    translateStreaming: vi
      .fn()
      .mockReturnValue(createAsyncIterable(['translated', ' text'])),
    destroy: vi.fn(),
    ...overrides,
  };
}

export function createMockTranslator(
  sessionOverrides?: Record<string, unknown>,
) {
  const session = createMockTranslatorSession(sessionOverrides);
  return {
    availability: vi.fn().mockResolvedValue('readily'),
    create: vi.fn().mockResolvedValue(session),
    _session: session,
  };
}

// LanguageDetector
export function createMockLanguageDetectorSession(
  overrides?: Record<string, unknown>,
) {
  return {
    detect: vi.fn().mockResolvedValue([
      { detectedLanguage: 'en', confidence: 0.95 },
      { detectedLanguage: 'ja', confidence: 0.03 },
    ]),
    measureInputUsage: vi.fn().mockResolvedValue(5),
    inputUsage: 5,
    inputQuota: 100,
    destroy: vi.fn(),
    ...overrides,
  };
}

export function createMockLanguageDetector(
  sessionOverrides?: Record<string, unknown>,
) {
  const session = createMockLanguageDetectorSession(sessionOverrides);
  return {
    availability: vi.fn().mockResolvedValue('readily'),
    create: vi.fn().mockResolvedValue(session),
    _session: session,
  };
}

// Proofreader
export function createMockProofreaderSession(
  overrides?: Record<string, unknown>,
) {
  return {
    proofread: vi.fn().mockResolvedValue({
      correctedInput: 'Hello world.',
      corrections: [{ startIndex: 0, endIndex: 5 }],
    }),
    destroy: vi.fn(),
    ...overrides,
  };
}

export function createMockProofreader(
  sessionOverrides?: Record<string, unknown>,
) {
  const session = createMockProofreaderSession(sessionOverrides);
  return {
    availability: vi.fn().mockResolvedValue('readily'),
    create: vi.fn().mockResolvedValue(session),
    _session: session,
  };
}

// Install all mocks onto globalThis
export function installChromeAIMocks() {
  const lm = createMockLanguageModel();
  const summarizer = createMockSummarizer();
  const writer = createMockWriter();
  const rewriter = createMockRewriter();
  const translator = createMockTranslator();
  const detector = createMockLanguageDetector();
  const proofreader = createMockProofreader();

  Object.assign(globalThis, {
    LanguageModel: lm,
    Summarizer: summarizer,
    Writer: writer,
    Rewriter: rewriter,
    Translator: translator,
    LanguageDetector: detector,
    Proofreader: proofreader,
  });

  return { lm, summarizer, writer, rewriter, translator, detector, proofreader };
}
