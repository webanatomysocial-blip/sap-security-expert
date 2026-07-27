---
name: feedback_no_coauthor
description: Do not add Co-Authored-By Claude lines to git commit messages
metadata:
  type: feedback
---

Never add `Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>` (or any Claude co-author line) to git commit messages.

**Why:** User explicitly asked to remove it.

**How to apply:** All commits — write plain commit messages with no co-author trailer.
