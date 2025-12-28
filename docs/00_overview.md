# Overview

## Problem
Users reuse prompts repeatedly across sites. Searching by title/tags fails when the user remembers meaning but not keywords.

## Solution
A Command Palette that combines:
- semantic similarity (vector)
- usage recency/frequency
- pinning

All computed locally in the browser.

## Principles
- Instant feedback
- Zero friction: open, type, enter
- Safe by default
- Replaceable embedding backend

## MVP Scope
- Create/edit/delete prompt
- Tags, pin
- Command palette search + select action (insert/copy)
- Brute-force vector search + ranking
- IndexedDB persistence
