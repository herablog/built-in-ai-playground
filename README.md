# `<built-in-ai>` Playground

A playground for exploring Chrome's [Built-in AI APIs](https://developer.chrome.com/docs/ai/built-in-apis) through a single Web Component.

## Motivation

Chrome ships on-device AI models that run entirely in the browser — no server, no API key, no network round-trip, and no cost. These Built-in AI APIs (Prompt, Summarizer, Writer, Rewriter, Translator, Language Detector, Proofreader) unlock powerful capabilities, but each has its own interface and configuration surface.

This project wraps all seven APIs into one `<built-in-ai>` custom element so you can experiment with them instantly. The playground lets you switch APIs, tweak parameters, and see streaming results in a chat UI — all running locally on your machine.

## Playground

Try it live: **[herablog.github.io/gemini-nano-in-chrome-playground](https://herablog.github.io/gemini-nano-in-chrome-playground/)**

- Switch between all 7 APIs from the sidebar
- Adjust parameters (temperature, tone, length, languages, etc.)
- Chat-style UI with streaming responses
- File attachments for multimodal input (images, audio)
- Context usage visualization
- No external communication — all inference runs on-device, so your data never leaves the browser
  - Note: some Chrome extensions may intercept or send page data externally. For maximum privacy, consider disabling extensions or using a profile without them.

## Library

The `<built-in-ai>` component is published as an npm package for use in your own projects.

```bash
npm install @herablog/built-in-ai
```

See the [library documentation](packages/built-in-ai/README.md) for attributes, events, methods, styling, and examples.

## Requirements

- Chrome 138+ (Proofreader requires Chrome 141+)
- Enable `chrome://flags/#optimization-guide-on-device-model`
- 22GB+ free storage, GPU (4GB+ VRAM) or CPU (16GB+ RAM, 4+ cores)

## License

MIT
