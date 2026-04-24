// Type definitions for Chrome Built-in AI APIs

interface LanguageModelPromptOptions {
  signal?: AbortSignal;
  responseConstraint?: object;
  omitResponseConstraintInput?: boolean;
}

interface LanguageModelSession {
  prompt(input: LanguageModelPromptInput[], options?: LanguageModelPromptOptions): Promise<string>;
  promptStreaming(input: LanguageModelPromptInput[], options?: LanguageModelPromptOptions): ReadableStream<string>;
  append(input: LanguageModelPromptInput[]): Promise<void>;
  clone(options?: { signal?: AbortSignal }): Promise<LanguageModelSession>;
  destroy(): void;
  addEventListener(event: 'contextoverflow', handler: () => void): void;
  contextUsage?: number;
  contextWindow?: number;
}

interface LanguageModelPromptInput {
  role: 'system' | 'user' | 'assistant';
  content: LanguageModelContentPart[] | string;
}

interface LanguageModelContentPart {
  type: 'text' | 'image' | 'audio';
  value: string | Blob | File | AudioBuffer | ArrayBuffer;
  prefix?: boolean;
}

interface LanguageModelCreateOptions {
  temperature?: number;
  topK?: number;
  expectedInputs?: { type: string; languages?: string[] }[];
  expectedOutputs?: { type: string; languages?: string[] }[];
  initialPrompts?: LanguageModelPromptInput[];
  monitor?: (m: DownloadMonitor) => void;
}

interface DownloadMonitor {
  addEventListener(event: 'downloadprogress', handler: (e: { loaded: number }) => void): void;
}

type LanguageModelAvailability = 'unavailable' | 'downloading' | 'available' | 'readily';

interface LanguageModelStatic {
  availability(options?: Partial<LanguageModelCreateOptions>): Promise<LanguageModelAvailability>;
  create(options?: LanguageModelCreateOptions): Promise<LanguageModelSession>;
  params?(): Promise<{ defaultTopK: number; maxTopK: number; defaultTemperature: number; maxTemperature: number }>;
}

type SummarizerAvailability = 'unavailable' | 'downloadable' | 'available' | 'readily';

interface SummarizerSession {
  summarize(text: string, options?: { context?: string; signal?: AbortSignal }): Promise<string>;
  summarizeStreaming(text: string, options?: { context?: string; signal?: AbortSignal }): AsyncIterable<string>;
  measureInputUsage(text: string, options?: { context?: string }): Promise<number>;
  inputUsage?: number;
  inputQuota?: number;
  destroy(): void;
}

interface SummarizerCreateOptions {
  type?: 'tldr' | 'teaser' | 'key-points' | 'headline';
  format?: 'markdown' | 'plain-text';
  length?: 'short' | 'medium' | 'long';
  sharedContext?: string;
  expectedInputLanguages?: string[];
  expectedContextLanguages?: string[];
  outputLanguage?: string;
  preference?: 'auto' | 'speed' | 'capability';
  monitor?: (m: DownloadMonitor) => void;
  signal?: AbortSignal;
}

interface SummarizerStatic {
  availability(options?: Partial<SummarizerCreateOptions>): Promise<SummarizerAvailability>;
  create(options?: SummarizerCreateOptions): Promise<SummarizerSession>;
}

type WriterAvailability = 'unavailable' | 'downloadable' | 'available' | 'readily';

interface WriterSession {
  write(text: string, options?: { context?: string; signal?: AbortSignal }): Promise<string>;
  writeStreaming(text: string, options?: { context?: string; signal?: AbortSignal }): AsyncIterable<string>;
  measureInputUsage(text: string, options?: { context?: string }): Promise<number>;
  inputUsage?: number;
  inputQuota?: number;
  destroy(): void;
}

interface WriterCreateOptions {
  tone?: 'formal' | 'neutral' | 'casual';
  format?: 'markdown' | 'plain-text';
  length?: 'short' | 'medium' | 'long';
  sharedContext?: string;
  expectedInputLanguages?: string[];
  expectedContextLanguages?: string[];
  outputLanguage?: string;
  monitor?: (m: DownloadMonitor) => void;
  signal?: AbortSignal;
}

interface WriterStatic {
  availability(options?: Partial<WriterCreateOptions>): Promise<WriterAvailability>;
  create(options?: WriterCreateOptions): Promise<WriterSession>;
}

type RewriterAvailability = 'unavailable' | 'downloadable' | 'available' | 'readily';

interface RewriterSession {
  rewrite(text: string, options?: { context?: string; signal?: AbortSignal }): Promise<string>;
  rewriteStreaming(text: string, options?: { context?: string; signal?: AbortSignal }): AsyncIterable<string>;
  measureInputUsage(text: string, options?: { context?: string }): Promise<number>;
  inputUsage?: number;
  inputQuota?: number;
  destroy(): void;
}

interface RewriterCreateOptions {
  tone?: 'as-is' | 'more-formal' | 'more-casual';
  format?: 'as-is' | 'markdown' | 'plain-text';
  length?: 'as-is' | 'shorter' | 'longer';
  sharedContext?: string;
  expectedInputLanguages?: string[];
  expectedContextLanguages?: string[];
  outputLanguage?: string;
  monitor?: (m: DownloadMonitor) => void;
  signal?: AbortSignal;
}

interface RewriterStatic {
  availability(options?: Partial<RewriterCreateOptions>): Promise<RewriterAvailability>;
  create(options?: RewriterCreateOptions): Promise<RewriterSession>;
}

type TranslatorAvailability = 'unavailable' | 'downloadable' | 'available' | 'readily';

interface TranslatorSession {
  translate(text: string): Promise<string>;
  translateStreaming(text: string, options?: { signal?: AbortSignal }): AsyncIterable<string>;
  destroy(): void;
}

interface TranslatorCreateOptions {
  sourceLanguage: string;
  targetLanguage: string;
  monitor?: (m: DownloadMonitor) => void;
  signal?: AbortSignal;
}

interface TranslatorStatic {
  availability(options?: { sourceLanguage?: string; targetLanguage?: string }): Promise<TranslatorAvailability>;
  create(options: TranslatorCreateOptions): Promise<TranslatorSession>;
}

type LanguageDetectorAvailability = 'unavailable' | 'downloadable' | 'available' | 'readily';

interface LanguageDetectorResult {
  detectedLanguage: string;
  confidence: number;
}

interface LanguageDetectorSession {
  detect(text: string): Promise<LanguageDetectorResult[]>;
  measureInputUsage(text: string): Promise<number>;
  inputUsage?: number;
  inputQuota?: number;
  destroy(): void;
}

interface LanguageDetectorCreateOptions {
  expectedInputLanguages?: string[];
  monitor?: (m: DownloadMonitor) => void;
  signal?: AbortSignal;
}

interface LanguageDetectorStatic {
  availability(options?: Partial<LanguageDetectorCreateOptions>): Promise<LanguageDetectorAvailability>;
  create(options?: LanguageDetectorCreateOptions): Promise<LanguageDetectorSession>;
}

type ProofreaderAvailability = 'unavailable' | 'downloadable' | 'available' | 'readily';

interface ProofreaderCorrection {
  startIndex: number;
  endIndex: number;
}

interface ProofreaderResult {
  correctedInput: string;
  corrections: ProofreaderCorrection[];
}

interface ProofreaderSession {
  proofread(text: string): Promise<ProofreaderResult>;
  destroy(): void;
}

interface ProofreaderCreateOptions {
  expectedInputLanguages?: string[];
  monitor?: (m: DownloadMonitor) => void;
  signal?: AbortSignal;
}

interface ProofreaderStatic {
  availability(options?: Partial<ProofreaderCreateOptions>): Promise<ProofreaderAvailability>;
  create(options?: ProofreaderCreateOptions): Promise<ProofreaderSession>;
}

declare const LanguageModel: LanguageModelStatic;
declare const Summarizer: SummarizerStatic;
declare const Writer: WriterStatic;
declare const Rewriter: RewriterStatic;
declare const Translator: TranslatorStatic;
declare const LanguageDetector: LanguageDetectorStatic;
declare const Proofreader: ProofreaderStatic;
