import { describe, it, expect } from 'vitest';
import { BuiltInAI } from '../built-in-ai.js';

describe('define', () => {
  it('registers built-in-ai custom element', () => {
    // setup.ts already registers the element
    const Constructor = customElements.get('built-in-ai');
    expect(Constructor).toBe(BuiltInAI);
  });

  it('does not throw on re-import', async () => {
    // Importing define.ts again should not throw
    await expect(import('../define.js')).resolves.not.toThrow();
  });
});
