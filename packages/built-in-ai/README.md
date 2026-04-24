# @herablog/built-in-ai

A Web Component that wraps [Chrome Built-in AI APIs](https://developer.chrome.com/docs/ai/built-in-apis), providing a ready-to-use `<built-in-ai>` custom element for Prompt, Summarizer, Writer, Rewriter, Translator, Language Detector, and Proofreader APIs.

## Install

```bash
npm install @herablog/built-in-ai
```

## CDN

No build step required — load directly from [jsDelivr](https://www.jsdelivr.com/):

```html
<script src="https://cdn.jsdelivr.net/npm/@herablog/built-in-ai/dist/built-in-ai.min.js"></script>

<built-in-ai api="prompt" system-prompt="You are a helpful assistant."></built-in-ai>

<script>
  const el = document.querySelector('built-in-ai');
  el.addEventListener('stream', (e) => console.log(e.detail.accumulated));
  el.addEventListener('response', (e) => console.log(e.detail.text));
</script>
```

## Quick Start

Import the auto-registration entry point to define the `<built-in-ai>` custom element:

```js
import '@herablog/built-in-ai/define';
```

```html
<built-in-ai api="prompt" system-prompt="You are a helpful assistant."></built-in-ai>

<script>
  const el = document.querySelector('built-in-ai');
  el.addEventListener('stream', (e) => console.log(e.detail.accumulated));
  el.addEventListener('response', (e) => console.log(e.detail.text));
</script>
```

## Advanced Usage

Import the class without auto-registration:

```js
import { BuiltInAI } from '@herablog/built-in-ai';

// Extend or register under a custom tag name
class MyAI extends BuiltInAI { /* ... */ }
customElements.define('my-ai', MyAI);
```

## Supported APIs

| Value | Chrome API |
|---|---|
| `prompt` | LanguageModel (Prompt API) |
| `summarizer` | Summarizer |
| `writer` | Writer |
| `rewriter` | Rewriter |
| `translator` | Translator |
| `detector` | Language Detector |
| `proofreader` | Proofreader |

## Attributes

### Common

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `api` | string | — | **Required.** API to use. |
| `placeholder` | string | `"Enter your message..."` | Textarea placeholder. |
| `disabled` | boolean | `false` | Disable input. |
| `show-context` | boolean | `false` | Show context usage ring (Prompt API). |
| `accept` | string | — | Override file input accept types (Prompt API). |

### Prompt API

```html
<built-in-ai
  api="prompt"
  system-prompt="You are a helpful assistant."
  temperature="1"
  top-k="3"
  input-languages="en,ja"
  output-languages="en,ja"
  input-types="text,image,audio"
  show-context
  auto-compact
></built-in-ai>
```

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `system-prompt` | string | — | System prompt for the session. |
| `temperature` | number | `1` | Sampling temperature (0–2). |
| `top-k` | number | `3` | Top-K sampling parameter. |
| `input-languages` | string | `"en,ja,es"` | Comma-separated input language codes. |
| `output-languages` | string | `"en,ja,es"` | Comma-separated output language codes. |
| `input-types` | string | `"text"` | Comma-separated input types: `text`, `image`, `audio`. |
| `auto-compact` | boolean | `false` | Enable automatic context compaction. |
| `response-constraint` | string | — | JSON Schema to constrain response format (Chrome 137+). |
| `omit-response-constraint-input` | boolean | `false` | Exclude schema from context window. |

### Summarizer

```html
<built-in-ai
  api="summarizer"
  type="key-points"
  format="markdown"
  length="medium"
  shared-context="Optional context"
></built-in-ai>
```

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `type` | string | `"key-points"` | `tldr`, `teaser`, `key-points`, `headline` |
| `format` | string | `"markdown"` | `markdown`, `plain-text` |
| `length` | string | `"medium"` | `short`, `medium`, `long` |
| `shared-context` | string | — | Shared context for summarization. |

### Writer

```html
<built-in-ai
  api="writer"
  tone="casual"
  format="markdown"
  length="short"
  shared-context="Optional context"
></built-in-ai>
```

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `tone` | string | `"neutral"` | `formal`, `neutral`, `casual` |
| `format` | string | `"markdown"` | `markdown`, `plain-text` |
| `length` | string | `"short"` | `short`, `medium`, `long` |
| `shared-context` | string | — | Shared context for writing. |

### Rewriter

```html
<built-in-ai
  api="rewriter"
  tone="more-formal"
  format="as-is"
  length="as-is"
  shared-context="Optional context"
></built-in-ai>
```

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `tone` | string | `"as-is"` | `as-is`, `more-formal`, `more-casual` |
| `format` | string | `"as-is"` | `as-is`, `markdown`, `plain-text` |
| `length` | string | `"as-is"` | `as-is`, `shorter`, `longer` |
| `shared-context` | string | — | Shared context for rewriting. |

### Translator

```html
<built-in-ai
  api="translator"
  source-language="en"
  target-language="ja"
></built-in-ai>
```

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `source-language` | string | `"en"` | Source language code (BCP 47). |
| `target-language` | string | `"ja"` | Target language code (BCP 47). |

Supported languages: `en`, `es`, `ja` (more in development).

### Language Detector

```html
<built-in-ai api="detector"></built-in-ai>
```

No API-specific attributes.

### Proofreader

```html
<built-in-ai
  api="proofreader"
  expected-input-languages="en"
></built-in-ai>
```

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `expected-input-languages` | string | `"en"` | Comma-separated input language codes. |

> Requires Origin Trial token (Chrome 141–145).

## Events

| Event | `e.detail` | Description |
|-------|------------|-------------|
| `availability` | `{ status, inputTypes? }` | Fired on connection. `inputTypes` is Prompt API only. |
| `beforesend` | `{ text, files }` | Fired before sending. Call `e.preventDefault()` to cancel. |
| `fileattach` | `{ files }` | Fired when files are selected. Call `e.preventDefault()` to handle manually. |
| `stream` | `{ chunk, accumulated }` | Each streaming chunk. |
| `response` | `{ text }` | Final response text. |
| `detect` | `{ results: [{ detectedLanguage, confidence }] }` | Language detection results. |
| `proofread` | `{ correctedInput, corrections }` | Proofreading results. |
| `compact` | `{ summary }` | Fired when auto-compact runs. |
| `error` | `{ message }` | Error occurred. |
| `session-created` | `{}` | Session created. |
| `session-destroyed` | `{}` | Session destroyed. |

## Methods

| Method | Description |
|--------|-------------|
| `send(text)` | Programmatically send text. |
| `stop()` | Abort current streaming. |
| `destroy()` | Destroy session. |
| `compact()` | Manually compact context (Prompt API only). |
| `addAttachment({ name, file?, text? })` | Add a custom attachment. |
| `clearAttachments()` | Remove all attachments. |

## CSS Parts

Style internal elements from outside:

| Part | Element |
|---|---|
| `container` | Outer wrapper |
| `input` | Textarea |
| `send-button` | Send button |
| `send-menu-button` | Dropdown trigger (`▾`) next to send button |
| `send-menu` | Dropdown menu |
| `stop-button` | Stop button |
| `context-ring` | Context usage ring indicator |
| `file-button` | File attach button |

```css
built-in-ai::part(container) { max-width: 600px; }
built-in-ai::part(input) { font-size: 1.1rem; }
built-in-ai::part(send-button) { background: #000; }
built-in-ai::part(send-menu-button) { background: #000; }
built-in-ai::part(send-menu) { border-radius: 4px; }
built-in-ai::part(stop-button) { border-color: #000; }
built-in-ai::part(context-ring) { margin-bottom: 0; }
built-in-ai::part(file-button) { color: #000; }
```

## CSS Custom Properties

| Property | Default | Description |
|---|---|---|
| `--built-in-ai-primary` | `#2563eb` | Send button background color (hover is derived automatically) |
| `--built-in-ai-primary-foreground` | `#fff` | Text color on the send button |
| `--built-in-ai-background` | `#fff` | Container and menu background color |
| `--built-in-ai-color` | `#374151` | Primary text color |
| `--built-in-ai-surface` | `#f5f5f5` | Hover and secondary surface color |
| `--built-in-ai-border-color` | `rgba(0, 0, 0, 0.08)` | Border color |
| `--built-in-ai-muted-color` | `#737373` | Placeholder and secondary icon color |
| `--built-in-ai-shadow-color` | `rgba(0, 0, 0, 0.08)` | Box shadow color |
| `--built-in-ai-danger-color` | `#dc2626` | Destructive action color (e.g. remove attachment hover) |
| `--built-in-ai-ring-track-color` | `#e5e7eb` | Context ring track (background circle) color |
| `--built-in-ai-ring-fill-color` | `#9ca3af` | Context ring fill (progress) color |

Dark mode is supported automatically via `prefers-color-scheme: dark`. To override the dark mode colors manually:

```css
/* Manual dark mode override */
built-in-ai {
  --built-in-ai-background: #1e1e2e;
  --built-in-ai-color: #cdd6f4;
  --built-in-ai-surface: #313244;
  --built-in-ai-border-color: rgba(255, 255, 255, 0.1);
  --built-in-ai-muted-color: #8c8fa8;
  --built-in-ai-shadow-color: rgba(0, 0, 0, 0.3);
  --built-in-ai-danger-color: #f38ba8;
  --built-in-ai-ring-track-color: #45475a;
  --built-in-ai-ring-fill-color: #7f849c;
}
```

## CSS Selectors

```css
/* Unavailable state */
built-in-ai[unavailable] { display: none; }
```

## Examples

### Intercept commands

```js
el.addEventListener('beforesend', (e) => {
  if (e.detail.text === '/compact') {
    e.preventDefault();
    el.compact();
  }
  if (e.detail.text === '/clear') {
    e.preventDefault();
    el.destroy();
  }
});
```

### Custom file handling (PDF)

```html
<built-in-ai api="prompt" accept="image/*,audio/*,.pdf"></built-in-ai>
```

```js
el.addEventListener('fileattach', async (e) => {
  e.preventDefault();
  for (const file of e.detail.files) {
    if (file.name.endsWith('.pdf')) {
      const text = await extractPdfText(file);
      el.addAttachment({ name: file.name, text });
    } else {
      el.addAttachment({ name: file.name, file });
    }
  }
});
```

### Listen to availability

```js
el.addEventListener('availability', (e) => {
  if (e.detail.status !== 'available' && e.detail.status !== 'readily') {
    console.log('API not available');
  }
  // Prompt API: check input type support
  if (e.detail.inputTypes) {
    console.log('Image supported:', e.detail.inputTypes.image);
  }
});
```

## Requirements

- Chrome 138+ (Proofreader requires Chrome 141+)
- Enable `chrome://flags/#optimization-guide-on-device-model`
- 22GB+ free storage, GPU (4GB+ VRAM) or CPU (16GB+ RAM, 4+ cores)

Some APIs require Origin Trial tokens. See [Chrome Origin Trials](https://developer.chrome.com/docs/web-platform/origin-trials) for current status and enrollment.

## License

MIT
