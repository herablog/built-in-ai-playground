// ============================================================
// Built-in AI Playground - Application Logic
// Uses <built-in-ai> Web Component for API communication
// ============================================================
import '@herablog/built-in-ai/define';
import { marked } from 'marked';
import JSZip from 'jszip';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('./dist/pdf.worker.min.mjs', document.baseURI).href;

function $(id) { return document.getElementById(id); }
function $$(sel) { return document.querySelectorAll(sel); }

function renderMarkdown(el, text) {
  el.setHTML(marked.parse(text));
  for (const pre of el.querySelectorAll('pre')) {
    const code = pre.querySelector('code');
    if (!code) continue;
    pre.style.position = 'relative';
    const btn = createCopyBtn(() => code.textContent);
    btn.className = 'code-copy-btn';
    pre.appendChild(btn);
  }
}

const COPY_ICON = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
const CHECK_ICON = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
const RETRY_ICON = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>';

function createCopyBtn(getTextFn) {
  const btn = document.createElement('button');
  btn.className = 'copy-btn';
  btn.title = 'Copy';
  btn.innerHTML = COPY_ICON;
  btn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(getTextFn());
      btn.innerHTML = CHECK_ICON;
      setTimeout(() => { btn.innerHTML = COPY_ICON; }, 1500);
    } catch {
      btn.title = 'Copy failed';
    }
  });
  return btn;
}

function createRetryBtn(onRetry) {
  const btn = document.createElement('button');
  btn.className = 'retry-btn';
  btn.title = 'Retry';
  btn.innerHTML = RETRY_ICON;
  btn.addEventListener('click', onRetry);
  return btn;
}

function createMsgActions(copyFn, retryFn) {
  const wrap = document.createElement('div');
  wrap.className = 'msg-actions';
  wrap.appendChild(createCopyBtn(copyFn));
  if (retryFn) wrap.appendChild(createRetryBtn(retryFn));
  return wrap;
}

// ============================================================
// Tab Navigation
// ============================================================

const tabEls = [...$$('.tab')];

function activateTab(tab) {
  const current = document.querySelector('.tab.active');
  current.classList.remove('active');
  current.setAttribute('aria-selected', 'false');
  current.setAttribute('tabindex', '-1');

  tab.classList.add('active');
  tab.setAttribute('aria-selected', 'true');
  tab.setAttribute('tabindex', '0');

  $$('.api-panel').forEach(p => p.hidden = true);
  $(`panel-${tab.dataset.api}`).hidden = false;
}

tabEls.forEach(tab => {
  tab.addEventListener('click', () => activateTab(tab));
});

document.querySelector('.tabs').addEventListener('keydown', e => {
  const idx = tabEls.indexOf(document.activeElement);
  if (idx === -1) return;
  let next = -1;
  if (e.key === 'ArrowRight') next = (idx + 1) % tabEls.length;
  if (e.key === 'ArrowLeft')  next = (idx - 1 + tabEls.length) % tabEls.length;
  if (e.key === 'Home')       next = 0;
  if (e.key === 'End')        next = tabEls.length - 1;
  if (next !== -1) {
    e.preventDefault();
    activateTab(tabEls[next]);
    tabEls[next].focus();
  }
});

// ============================================================
// Sidebar Toggle (all panels)
// ============================================================

$$('.sidebar-close').forEach(btn => {
  btn.addEventListener('click', () => {
    const panel = btn.closest('.api-panel');
    const sidebar = panel.querySelector('.sidebar');
    sidebar.classList.add('collapsed');
    sidebar.inert = true;
    const openBtn = panel.querySelector('.sidebar-open');
    openBtn.hidden = false;
    openBtn.focus();
  });
});

$$('.sidebar-open').forEach(btn => {
  btn.addEventListener('click', () => {
    const panel = btn.closest('.api-panel');
    const sidebar = panel.querySelector('.sidebar');
    sidebar.classList.remove('collapsed');
    sidebar.inert = false;
    btn.hidden = true;
    panel.querySelector('.sidebar-close').focus();
  });
});

// ============================================================
// Availability Status Badges
// ============================================================

const API_MAP = {
  'prompt-ai': 'prompt',
  'summarizer-ai': 'summarizer',
  'writer-ai': 'writer',
  'rewriter-ai': 'rewriter',
  'translator-ai': 'translator',
  'detector-ai': 'detector',
  'proofreader-ai': 'proofreader',
};

Object.keys(API_MAP).forEach(id => {
  const el = $(id);
  if (!el) return;
  const api = API_MAP[id];

  el.addEventListener('availability', (e) => {
    const badge = $(`status-${api}`);
    const status = e.detail.status;
    const isAvailable = status === 'readily' || status === 'available';
    badge.className = `status-badge ${isAvailable ? 'available' : 'unavailable'}`;
    badge.textContent = isAvailable ? 'Available' : 'Unavailable';
  });

  el.addEventListener('error', (e) => {
    console.error(`[${api}]`, e.detail.message);
  });
});

// Initialize all components after listeners are registered
Object.keys(API_MAP).forEach(id => {
  $(id)?.init();
});

// ============================================================
// Device Checks (Welcome Screen)
// ============================================================

$('prompt-ai').addEventListener('availability', async (e) => {
  // Input type checkboxes
  if (e.detail.inputTypes) {
    for (const [type, supported] of Object.entries(e.detail.inputTypes)) {
      if (!supported) {
        const cb = document.querySelector(`[name="prompt-input-type"][value="${type}"]`);
        if (cb) {
          cb.checked = false;
          cb.disabled = true;
          cb.closest('label').style.opacity = '0.4';
          cb.closest('label').title = `${type} input is not supported`;
        }
      }
    }
  }
  buildAcceptAttribute();

  const isAvailable = e.detail.status === 'readily' || e.detail.status === 'available';

  const chromeMatch = navigator.userAgent.match(/Chrome\/(\d+)/);
  const chromeVersion = chromeMatch ? parseInt(chromeMatch[1]) : 0;
  const checkChrome = $('check-chrome');
  const checkApi = $('check-api');
  const checkModel = $('check-model');

  if (checkChrome) checkChrome.classList.add(chromeVersion >= 138 ? 'pass' : 'fail');
  if (checkApi) checkApi.classList.add('LanguageModel' in self ? 'pass' : 'fail');
  if (checkModel) checkModel.classList.add(isAvailable ? 'pass' : 'fail');

  const checkStorage = $('check-storage');
  try {
    const est = await navigator.storage.estimate();
    const freeGB = ((est.quota - est.usage) / (1024 ** 3)).toFixed(1);
    checkStorage.textContent = `Storage: ${freeGB}GB free (22GB+ needed)`;
    checkStorage.classList.add(parseFloat(freeGB) >= 22 ? 'pass' : 'fail');
  } catch {
    checkStorage.textContent = 'Storage: unable to check';
    checkStorage.classList.add('fail');
  }

  const checkMemory = $('check-memory');
  const ram = navigator.deviceMemory;
  if (ram) {
    checkMemory.textContent = `RAM: ${ram}GB (16GB+ needed)`;
    checkMemory.classList.add(ram >= 16 ? 'pass' : 'fail');
  } else {
    checkMemory.textContent = 'RAM: unable to detect';
    checkMemory.classList.add('fail');
  }

  const checkCpu = $('check-cpu');
  const cores = navigator.hardwareConcurrency;
  if (cores) {
    checkCpu.textContent = `CPU: ${cores} cores (4+ needed)`;
    checkCpu.classList.add(cores >= 4 ? 'pass' : 'fail');
  } else {
    checkCpu.textContent = 'CPU: unable to detect';
    checkCpu.classList.add('fail');
  }

  const checkGpu = $('check-gpu');
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (gl) {
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const renderer = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'detected';
      checkGpu.textContent = `GPU: ${renderer}`;
      checkGpu.classList.add('pass');
    } else {
      checkGpu.textContent = 'GPU: WebGL not available';
      checkGpu.classList.add('fail');
    }
  } catch {
    checkGpu.textContent = 'GPU: unable to detect';
    checkGpu.classList.add('fail');
  }

  if (!isAvailable) {
    const setup = $('prompt-welcome-setup');
    if (setup) setup.hidden = false;
  }
});

// ============================================================
// Prompt API — Sidebar → Attribute Sync
// ============================================================

const promptAi = $('prompt-ai');

const savedSystemPrompt = localStorage.getItem('prompt-system');
if (savedSystemPrompt) {
  $('prompt-system').value = savedSystemPrompt;
  promptAi.setAttribute('system-prompt', savedSystemPrompt);
}

$('prompt-system').addEventListener('change', (e) => {
  localStorage.setItem('prompt-system', e.target.value);
  promptAi.setAttribute('system-prompt', e.target.value);
});

$('prompt-temp').addEventListener('input', (e) => {
  $('prompt-temp-val').textContent = e.target.value;
  e.target.setAttribute('aria-valuetext', e.target.value);
  promptAi.setAttribute('temperature', e.target.value);
});

$('prompt-topk').addEventListener('input', (e) => {
  $('prompt-topk-val').textContent = e.target.value;
  e.target.setAttribute('aria-valuetext', e.target.value);
  promptAi.setAttribute('top-k', e.target.value);
});

$$('[name="prompt-input-lang"]').forEach(cb => {
  cb.addEventListener('change', () => {
    promptAi.setAttribute('input-languages', [...$$('[name="prompt-input-lang"]:checked')].map(c => c.value).join(','));
  });
});

$$('[name="prompt-output-lang"]').forEach(cb => {
  cb.addEventListener('change', () => {
    promptAi.setAttribute('output-languages', [...$$('[name="prompt-output-lang"]:checked')].map(c => c.value).join(','));
  });
});

$$('[name="prompt-input-type"]').forEach(cb => {
  cb.addEventListener('change', () => {
    promptAi.setAttribute('input-types', [...$$('[name="prompt-input-type"]:checked')].map(c => c.value).join(','));
    buildAcceptAttribute();
  });
});

// Structured Output
const structuredSchema = $('prompt-structured-schema');
const omitConstraint = $('prompt-omit-constraint');
const omitLabel = $('prompt-omit-label');

const savedSchema = localStorage.getItem('prompt-structured-schema');
if (savedSchema) {
  structuredSchema.value = savedSchema;
  omitLabel.hidden = false;
  promptAi.setAttribute('response-constraint', savedSchema);
}

structuredSchema.addEventListener('input', () => {
  const val = structuredSchema.value.trim();
  if (!val) {
    promptAi.removeAttribute('response-constraint');
    localStorage.removeItem('prompt-structured-schema');
    structuredSchema.classList.remove('invalid');
    omitLabel.hidden = true;
    return;
  }
  try {
    JSON.parse(val);
    promptAi.setAttribute('response-constraint', val);
    localStorage.setItem('prompt-structured-schema', val);
    structuredSchema.classList.remove('invalid');
    omitLabel.hidden = false;
  } catch {
    structuredSchema.classList.add('invalid');
    omitLabel.hidden = true;
  }
});

omitConstraint.addEventListener('change', () => {
  if (omitConstraint.checked) {
    promptAi.removeAttribute('omit-response-constraint-input');
  } else {
    promptAi.setAttribute('omit-response-constraint-input', '');
  }
});

// ============================================================
// Prompt API — Chat Output
// ============================================================

const welcomeEl = $('prompt-welcome');
const welcomeTemplate = welcomeEl ? welcomeEl.cloneNode(true) : null;
const promptMessages = $('prompt-messages');
let currentMsgDiv = null;

let userScrolled = false;

function isPromptAtBottom() {
  return promptMessages.scrollHeight - promptMessages.scrollTop - promptMessages.clientHeight < 50;
}

promptMessages.addEventListener('scroll', () => {
  userScrolled = !isPromptAtBottom();
});

function scrollPromptToBottom({ force = false } = {}) {
  if (force || !userScrolled) {
    promptMessages.scrollTop = promptMessages.scrollHeight;
  }
}

function appendChatMsg(role, text) {
  const welcome = $('prompt-welcome');
  if (welcome) welcome.remove();

  const div = document.createElement('div');
  div.className = `chat-msg ${role}${role === 'assistant' ? ' md-output' : ''}`;
  if (text) div.appendChild(document.createTextNode(text));
  promptMessages.appendChild(div);
  scrollPromptToBottom({ force: role !== 'assistant' });
  return div;
}

function renderAttachment(f) {
  const file = f.file || f;
  const isImage = file instanceof File && file.type && file.type.startsWith('image/');
  if (isImage) {
    const wrap = document.createElement('button');
    wrap.type = 'button';
    wrap.className = 'chat-attachment-thumb-wrap blurred';
    const img = document.createElement('img');
    img.className = 'chat-attachment-thumb';
    img.title = f.name;
    createImageBitmap(file).then((bmp) => {
      wrap.style.aspectRatio = `${bmp.width} / ${bmp.height}`;
      const url = URL.createObjectURL(file);
      img.src = url;
      img.onload = () => URL.revokeObjectURL(url);
      bmp.close();
    });
    const overlay = document.createElement('span');
    overlay.className = 'chat-attachment-overlay';
    overlay.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg><span>click to show</span>`;
    wrap.appendChild(img);
    wrap.appendChild(overlay);
    wrap.addEventListener('click', () => wrap.classList.toggle('blurred'));
    return wrap;
  } else {
    const chip = document.createElement('span');
    chip.className = 'chat-attachment-chip';
    chip.textContent = f.name;
    chip.title = f.name;
    return chip;
  }
}

promptAi.addEventListener('beforesend', (e) => {
  userScrolled = false;
  if (e.detail.text === '/clear') {
    e.preventDefault();
    promptAi.destroy();
    promptMessages.innerHTML = '';
    if (welcomeTemplate) promptMessages.appendChild(welcomeTemplate.cloneNode(true));
    return;
  }
  if (e.detail.text === '/compact') {
    e.preventDefault();
    appendChatMsg('system', 'Compacting...');
    promptAi.compact();
    return;
  }

  const files = e.detail.files || [];
  const isBatchMode = !!e.detail.batch;

  // In batch mode, skip showing attachments here — batch-item-start will handle each one
  if (isBatchMode) {
    if (e.detail.text) appendChatMsg('user', e.detail.text);
    currentMsgDiv = null;
    return;
  }

  const msgDiv = appendChatMsg('user', e.detail.text);
  if (files.length > 0) {
    const attachmentsEl = document.createElement('div');
    attachmentsEl.className = 'chat-attachments';
    for (const f of files) attachmentsEl.appendChild(renderAttachment(f));
    msgDiv.prepend(attachmentsEl);
  }
  currentMsgDiv = null;
});

promptAi.addEventListener('batch-item-start', (e) => {
  const { file, current, total } = e.detail;
  const msgDiv = appendChatMsg('user', '');
  const attachmentsEl = document.createElement('div');
  attachmentsEl.className = 'chat-attachments';
  const attachEl = renderAttachment(file);
  const badge = document.createElement('span');
  badge.className = 'batch-badge';
  badge.textContent = `${current} / ${total}`;
  attachmentsEl.appendChild(attachEl);
  msgDiv.prepend(attachmentsEl);
  msgDiv.appendChild(badge);
  currentMsgDiv = null;
});

promptAi.addEventListener('stream', (e) => {
  if (!currentMsgDiv) currentMsgDiv = appendChatMsg('assistant', '');
  renderMarkdown(currentMsgDiv, e.detail.accumulated);
  scrollPromptToBottom();
});

promptAi.addEventListener('response', () => {
  if (currentMsgDiv) {
    const div = currentMsgDiv;
    div.appendChild(createMsgActions(
      () => div.textContent,
      () => {
        const handler = promptAi.handler;
        if (!handler || handler.chatHistory.length < 2) return;
        const lastUser = handler.chatHistory[handler.chatHistory.length - 2];
        if (lastUser.role !== 'user') return;
        const text = lastUser.content;
        handler.chatHistory.pop(); // assistant
        handler.chatHistory.pop(); // user
        div.remove();
        currentMsgDiv = null;
        promptAi.send(text);
      }
    ));
  }
  currentMsgDiv = null;
});

promptAi.addEventListener('compact', () => {
  appendChatMsg('system', 'Compacted. Summary preserved.');
});

promptAi.addEventListener('error', (e) => {
  appendChatMsg('system', `Error: ${e.detail.message}`);
  currentMsgDiv = null;
});

promptAi.addEventListener('warning', (e) => {
  appendChatMsg('system', e.detail.message);
});

// ============================================================
// Prompt API — File Handling (D&D + fileattach)
// ============================================================

const IMAGE_EXTS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'];
const AUDIO_EXTS = ['mp3', 'wav', 'ogg', 'webm', 'flac', 'aac', 'm4a'];
const TEXT_EXTS = ['txt', 'md', 'csv', 'json', 'xml', 'html', 'css', 'js', 'ts', 'py', 'rb', 'go', 'rs', 'java', 'c', 'cpp', 'h', 'yaml', 'yml', 'toml', 'ini', 'log'];

function buildAcceptAttribute() {
  const checkedTypes = [...$$('[name="prompt-input-type"]:checked')].map(c => c.value);
  const parts = [];
  if (checkedTypes.includes('image')) parts.push('image/*');
  if (checkedTypes.includes('audio')) parts.push('audio/*');
  parts.push('.zip', '.pdf');
  TEXT_EXTS.forEach(ext => parts.push('.' + ext));
  promptAi.setAttribute('accept', parts.join(','));
}

const MAX_FILE_SIZE = 50 * 1024 * 1024;  // 50 MB per file
const MAX_ZIP_ENTRIES = 100;
const MAX_PDF_PAGES = 200;
const MAX_TEXT_SIZE = 5 * 1024 * 1024;    // 5 MB per text file

function emitWarning(message) {
  promptAi.dispatchEvent(new CustomEvent('warning', { detail: { message } }));
}

function getFileExt(name) { return name.split('.').pop().toLowerCase(); }

const MIME_TYPE_MAP = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif',
  webp: 'image/webp', bmp: 'image/bmp', svg: 'image/svg+xml',
  mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg', flac: 'audio/flac',
  aac: 'audio/aac', m4a: 'audio/mp4', webm: 'audio/webm',
};

function getMimeType(ext) {
  return MIME_TYPE_MAP[ext] || 'application/octet-stream';
}

async function extractPdfText(file) {
  const ab = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: ab }).promise;
  const pageCount = Math.min(pdf.numPages, MAX_PDF_PAGES);
  if (pdf.numPages > MAX_PDF_PAGES) {
    emitWarning(`Skipped "${file.name}": PDF exceeds ${MAX_PDF_PAGES}-page limit (${pdf.numPages} pages). First ${MAX_PDF_PAGES} pages extracted.`);
  }
  let text = '';
  for (let i = 1; i <= pageCount; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map(item => item.str).join(' ') + '\n';
  }
  return text.trim();
}

async function processFileForComponent(file, component) {
  if (file.size > MAX_FILE_SIZE) {
    emitWarning(`Skipped "${file.name}": file exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit.`);
    return;
  }

  const ext = getFileExt(file.name);
  if (IMAGE_EXTS.includes(ext) || AUDIO_EXTS.includes(ext)) {
    component.addAttachment({ name: file.name, file });
  } else if (ext === 'zip') {
    const zip = await JSZip.loadAsync(file);
    let entryCount = 0;
    for (const [path, entry] of Object.entries(zip.files)) {
      if (entry.dir) continue;
      const name = path.split('/').pop();
      if (name.startsWith('.')) continue;
      if (entryCount >= MAX_ZIP_ENTRIES) {
        emitWarning(`Skipped "${file.name}": ZIP contains more than ${MAX_ZIP_ENTRIES} files.`);
        break;
      }
      entryCount++;
      const e = getFileExt(name);
      if (IMAGE_EXTS.includes(e) || AUDIO_EXTS.includes(e)) {
        const blob = await entry.async('blob');
        component.addAttachment({ name, file: new File([blob], name, { type: getMimeType(e) }) });
      } else if (e === 'pdf') {
        const blob = await entry.async('blob');
        const text = await extractPdfText(new File([blob], name, { type: 'application/pdf' }));
        component.addAttachment({ name, text });
      } else if (TEXT_EXTS.includes(e)) {
        component.addAttachment({ name, text: await entry.async('string') });
      }
    }
  } else if (ext === 'pdf') {
    component.addAttachment({ name: file.name, text: await extractPdfText(file) });
  } else if (TEXT_EXTS.includes(ext)) {
    if (file.size > MAX_TEXT_SIZE) {
      emitWarning(`Skipped "${file.name}": text file exceeds ${MAX_TEXT_SIZE / 1024 / 1024}MB limit.`);
      return;
    }
    component.addAttachment({ name: file.name, text: await file.text() });
  }
}

promptAi.addEventListener('fileattach', async (e) => {
  e.preventDefault();
  for (const file of e.detail.files) await processFileForComponent(file, promptAi);
});

const dropZone = document.querySelector('#panel-prompt .content');
dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('drag-over'); });
dropZone.addEventListener('dragleave', (e) => { if (!dropZone.contains(e.relatedTarget)) dropZone.classList.remove('drag-over'); });
dropZone.addEventListener('drop', async (e) => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  for (const file of e.dataTransfer.files) await processFileForComponent(file, promptAi);
});

// ============================================================
// Summarizer — Sidebar Sync + Output
// ============================================================

const summarizerAi = $('summarizer-ai');
const summarizerAttrs = { 'summarizer-type': 'type', 'summarizer-format': 'format', 'summarizer-length': 'length', 'summarizer-context': 'shared-context' };
Object.entries(summarizerAttrs).forEach(([id, attr]) => {
  $(id).addEventListener('change', (e) => summarizerAi.setAttribute(attr, e.target.value));
});
let lastSummarizerInput = '';
summarizerAi.addEventListener('beforesend', (e) => { lastSummarizerInput = e.detail.text; });
summarizerAi.addEventListener('stream', (e) => {
  renderMarkdown($('summarizer-output'), e.detail.accumulated);
});
summarizerAi.addEventListener('response', () => {
  const out = $('summarizer-output');
  out.appendChild(createMsgActions(() => out.textContent, () => summarizerAi.send(lastSummarizerInput)));
});

// ============================================================
// Writer — Sidebar Sync + Output
// ============================================================

const writerAi = $('writer-ai');
const writerAttrs = { 'writer-tone': 'tone', 'writer-format': 'format', 'writer-length': 'length', 'writer-context': 'shared-context' };
Object.entries(writerAttrs).forEach(([id, attr]) => {
  $(id).addEventListener('change', (e) => writerAi.setAttribute(attr, e.target.value));
});
let lastWriterInput = '';
writerAi.addEventListener('beforesend', (e) => { lastWriterInput = e.detail.text; });
writerAi.addEventListener('stream', (e) => {
  renderMarkdown($('writer-output'), e.detail.accumulated);
});
writerAi.addEventListener('response', () => {
  const out = $('writer-output');
  out.appendChild(createMsgActions(() => out.textContent, () => writerAi.send(lastWriterInput)));
});

// ============================================================
// Rewriter — Sidebar Sync + Output
// ============================================================

const rewriterAi = $('rewriter-ai');
const rewriterAttrs = { 'rewriter-tone': 'tone', 'rewriter-format': 'format', 'rewriter-length': 'length', 'rewriter-context': 'shared-context' };
Object.entries(rewriterAttrs).forEach(([id, attr]) => {
  $(id).addEventListener('change', (e) => rewriterAi.setAttribute(attr, e.target.value));
});
let lastRewriterInput = '';
rewriterAi.addEventListener('beforesend', (e) => { lastRewriterInput = e.detail.text; });
rewriterAi.addEventListener('stream', (e) => {
  renderMarkdown($('rewriter-output'), e.detail.accumulated);
});
rewriterAi.addEventListener('response', () => {
  const out = $('rewriter-output');
  out.appendChild(createMsgActions(() => out.textContent, () => rewriterAi.send(lastRewriterInput)));
});

// ============================================================
// Translator — Sidebar Sync + Output
// ============================================================

const translatorAi = $('translator-ai');
$('translator-source').addEventListener('change', (e) => translatorAi.setAttribute('source-language', e.target.value));
$('translator-target').addEventListener('change', (e) => translatorAi.setAttribute('target-language', e.target.value));
let lastTranslatorInput = '';
translatorAi.addEventListener('beforesend', (e) => { lastTranslatorInput = e.detail.text; });
translatorAi.addEventListener('stream', (e) => {
  renderMarkdown($('translator-output'), e.detail.accumulated);
});
translatorAi.addEventListener('response', () => {
  const out = $('translator-output');
  out.appendChild(createMsgActions(() => out.textContent, () => translatorAi.send(lastTranslatorInput)));
});

// ============================================================
// Language Detector — Output
// ============================================================

$('detector-ai').addEventListener('detect', (e) => {
  const output = $('detector-output');
  output.innerHTML = '';
  for (const r of e.detail.results) {
    const row = document.createElement('div');
    row.className = 'detect-result';

    const lang = document.createElement('span');
    lang.className = 'detect-lang';
    lang.textContent = r.detectedLanguage;

    const barWrap = document.createElement('div');
    barWrap.className = 'detect-bar-wrap';
    const bar = document.createElement('div');
    bar.className = 'detect-bar';
    bar.style.width = `${r.confidence * 100}%`;
    barWrap.appendChild(bar);

    const conf = document.createElement('span');
    conf.className = 'detect-confidence';
    conf.textContent = `${(r.confidence * 100).toFixed(1)}%`;

    row.appendChild(lang);
    row.appendChild(barWrap);
    row.appendChild(conf);
    output.appendChild(row);
  }
});

// ============================================================
// Proofreader — Output
// ============================================================

$('proofreader-ai').addEventListener('proofread', (e) => {
  const output = $('proofreader-output');
  output.innerHTML = '';

  const corrected = document.createElement('div');
  corrected.className = 'proofread-corrected';
  corrected.textContent = e.detail.correctedInput;
  output.appendChild(corrected);

  if (e.detail.corrections.length > 0) {
    const list = document.createElement('ul');
    list.className = 'proofread-corrections';
    for (const c of e.detail.corrections) {
      const li = document.createElement('li');
      li.textContent = `Position ${c.startIndex}–${c.endIndex}`;
      list.appendChild(li);
    }
    output.appendChild(list);
  }
});
