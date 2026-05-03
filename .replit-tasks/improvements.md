# ClaudeCodex — Replit Import Notes

## What This Is
Electron desktop IDE wrapping the Claude CLI with multi-provider AI support (Claude, OpenAI, Hermes).

## Changes Made (2026-05-02)
- Updated Electron ^28 → ^41.5.0 (latest stable)
- Updated electron-builder to latest (clears tar + builder-util vuln chain)
- Result: 0 high/critical vulnerabilities (down from 7)

## Current Stack
- Electron ^41.5.0
- Model: spawns `claude` CLI directly (no SDK dependency)
- Also has openai-send IPC handler for OpenAI API calls
- Hermes profiles loaded via hermes-profiles.yaml

## Recommended Next Improvements
- [ ] Update AI config to explicitly use claude-sonnet-4-6 as the recommended model
- [ ] Add `@anthropic-ai/sdk` for direct API calls (avoids CLI spawn, faster, better error handling)
- [ ] Add Content Security Policy to main.js (currently missing)
- [ ] Add app signing config for macOS distribution

## How to Run
```bash
npm install
npm start   # launches Electron app
npm run build  # packages with electron-builder
```
