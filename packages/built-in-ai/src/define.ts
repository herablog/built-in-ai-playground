import { BuiltInAI } from './built-in-ai.js';

if (!customElements.get('built-in-ai')) {
  customElements.define('built-in-ai', BuiltInAI);
}
