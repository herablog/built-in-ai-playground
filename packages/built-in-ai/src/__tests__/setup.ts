import { installChromeAIMocks } from './mocks/chrome-ai.js';
import { BuiltInAI } from '../built-in-ai.js';

installChromeAIMocks();

if (!customElements.get('built-in-ai')) {
  customElements.define('built-in-ai', BuiltInAI);
}
