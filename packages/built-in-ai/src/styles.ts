export const styles = `
  [hidden] { display: none !important; }

  :host {
    display: block;
    --_primary: var(--built-in-ai-primary, #2563eb);
    --_primary-hover: color-mix(in srgb, var(--_primary) 85%, #000);
    --_primary-fg: var(--built-in-ai-primary-foreground, #fff);
    --_bg: var(--built-in-ai-background, #fff);
    --_color: var(--built-in-ai-color, #374151);
    --_surface: var(--built-in-ai-surface, #f5f5f5);
    --_border: var(--built-in-ai-border-color, rgba(0, 0, 0, 0.08));
    --_muted: var(--built-in-ai-muted-color, #737373);
    --_shadow: var(--built-in-ai-shadow-color, rgba(0, 0, 0, 0.08));
    --_danger: var(--built-in-ai-danger-color, #dc2626);
    --_ring-track: var(--built-in-ai-ring-track-color, #e5e7eb);
    --_ring-fill: var(--built-in-ai-ring-fill-color, #9ca3af);
  }

  @media (prefers-color-scheme: dark) {
    :host {
      --_bg: var(--built-in-ai-background, #1c1c1c);
      --_color: var(--built-in-ai-color, #e5e5e5);
      --_surface: var(--built-in-ai-surface, #262626);
      --_border: var(--built-in-ai-border-color, rgba(255, 255, 255, 0.08));
      --_muted: var(--built-in-ai-muted-color, #737373);
      --_shadow: var(--built-in-ai-shadow-color, rgba(0, 0, 0, 0.3));
      --_danger: var(--built-in-ai-danger-color, #f87171);
      --_ring-track: var(--built-in-ai-ring-track-color, #404040);
      --_ring-fill: var(--built-in-ai-ring-fill-color, #737373);
    }
  }

  :host([unavailable]) .container {
    opacity: 0.5;
    pointer-events: none;
  }

  .container {
    display: flex;
    flex-direction: column;
    border: 1px solid var(--_border);
    border-radius: 10px;
    background: var(--_bg);
    box-shadow: 0 2px 8px var(--_shadow);
    padding: 12px;
  }

  textarea {
    width: 100%;
    box-sizing: border-box;
    border: none;
    padding: 8px 12px;
    margin-bottom: 12px;
    font-family: inherit;
    font-size: 1rem;
    resize: none;
    field-sizing: content;
    background: transparent;
    line-height: 1.5;
    overflow-y: auto;
    max-height: 200px;
    color: var(--_color);
  }

  textarea:focus {
    outline: none;
  }

  textarea::placeholder {
    color: var(--_muted);
  }

  textarea:disabled {
    cursor: not-allowed;
  }

  .actions {
    display: flex;
    align-items: flex-end;
    justify-content: flex-end;
    gap: 8px;
  }

  .actions.has-left {
    justify-content: space-between;
  }

  .actions-right {
    display: flex;
    align-items: flex-end;
    gap: 8px;
  }

  button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 6px 16px;
    border-radius: 6px;
    font-family: inherit;
    font-size: 0.8125rem;
    font-weight: 500;
    cursor: pointer;
    transition: background-color, border-color, color, opacity, transform 0.15s ease;
  }

  button:active {
    transform: scale(0.98);
  }

  button:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    transform: none;
  }

  .send-group {
    position: relative;
    display: inline-flex;
  }

  .send-btn {
    background: var(--_primary);
    color: var(--_primary-fg);
    border: 1px solid var(--_primary);
    border-radius: 6px 0 0 6px;
  }

  .send-group:not(:has(.send-menu-btn:not([hidden]))) .send-btn {
    border-radius: 6px;
  }

  .send-btn:hover:not(:disabled) {
    background: var(--_primary-hover);
    border-color: var(--_primary-hover);
  }

  .send-menu-btn {
    background: var(--_primary);
    color: var(--_primary-fg);
    border: 1px solid var(--_primary);
    border-left: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 0 6px 6px 0;
    padding: 6px;
  }

  .send-menu-btn:hover:not(:disabled) {
    background: var(--_primary-hover);
    border-color: var(--_primary-hover);
    border-left-color: rgba(255, 255, 255, 0.3);
  }

  .send-menu {
    position: absolute;
    bottom: calc(100% + 4px);
    right: 0;
    background: var(--_bg);
    border: 1px solid var(--_border);
    border-radius: 8px;
    box-shadow: 0 4px 12px var(--_shadow);
    overflow: hidden;
    z-index: 10;
    min-width: 160px;
  }

  .send-menu-item {
    display: block;
    width: 100%;
    padding: 8px 12px;
    border: none;
    border-radius: 0;
    background: none;
    color: var(--_color);
    font-size: 0.8125rem;
    text-align: left;
    cursor: pointer;
  }

  .send-menu-item:hover {
    background: var(--_surface);
  }

  .stop-btn {
    background: var(--_bg);
    color: var(--_color);
    border: 1px solid var(--_border);
  }

  .stop-btn:hover:not(:disabled) {
    background: var(--_surface);
  }

  .context-ring {
    display: flex;
    align-items: flex-end;
    margin-bottom: 3px;
  }

  .context-ring circle:first-child { stroke: var(--_ring-track); }
  .context-ring .context-ring-fill { stroke: var(--_ring-fill); }

  .file-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 4px;
    border: none;
    background: none;
    cursor: pointer;
    color: var(--_muted);
    border-radius: 6px;
    transition: background 0.15s;
  }

  .file-btn:hover { background: var(--_surface); }
  .file-btn:disabled { opacity: 0.4; cursor: not-allowed; }

  .attachments {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
    padding-bottom: 8px;
  }

  .attachment-item {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 8px;
    background: var(--_surface);
    border-radius: 6px;
    font-size: 0.75rem;
    color: var(--_color);
    max-width: 200px;
  }

  .attachment-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
  }

  .attachment-remove {
    border: none;
    background: none;
    color: var(--_muted);
    cursor: pointer;
    font-size: 0.875rem;
    padding: 0 2px;
    line-height: 1;
  }

  .attachment-remove:hover { color: var(--_danger); }
`;
