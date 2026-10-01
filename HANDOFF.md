# Handoff

*Keep this short. Update it at the end of every session.*

## State (2026-10-01)

Agent Kit **1.0.1**. v1 was built on 2026-09-30 from `SPEC.md`; 1.0.1 follows the first
review of v1 (see `SPEC.md` §14, entry of 2026-10-01). `SPEC.md` holds the spec with its change
log. (`C:\Users\toont\dev\agent-kit` no longer exists; the untracked `agent-kit-SPEC.md` in this
folder is a copy without the §14 log.)

- The app is the single file `index.html` (388 KB): the `ak-model` script is DOM-free, and
  the `ak-ui` script is the interface. There is no build step.
- **Drawings are Logo.** The Artist, the Designer and the drawing pad write Logo
  (`REPEAT 4 [FORWARD 50 RIGHT 90]`), and a small interpreter in the model layer runs it.
  It never turns Logo into JavaScript, so drawings no longer need the sandbox.
- **Programmed agents** (judges, Dot Counter, library agents) are still pseudocode translated
  to JavaScript. They run in a Worker where one is allowed (GitHub Pages, local files), and
  otherwise in the page after the static check, with a step counter, a `[ ]` key guard and
  every global shadowed (Fallback A, for chat artifacts).
- **Telephone** is Artist → Renderer → Describer → Artist, 4 rounds. The Loop Spotter and
  the Tally are in the library ("+ Add an agent" in Look inside), not in the seed.
- **Pebble Challenge** has seven challenges marked easy, medium and hard, and starts on
  *Mystery rows*: the Mystery Judge keeps a secret row count and says only which rows need
  more or fewer. *A big grid* (11 by 14) is there to be hard for a vision model to count.
- The trace shows the response (Markdown rendered, Logo highlighted, judges' pseudocode,
  data in plain words) and the rules by default; everything else is behind
  "Show full technical details".
- A microworld saved by an older version is replaced by the new one at load. A banner offers
  to keep the old one as a copy. Other saved and imported societies have their JavaScript
  drawings and v1 instructions converted to Logo where that can be done safely.

**Tests:** `npm test` (or `node tests/run.mjs [filter]`). Latest:
**257 PASS, 0 FAIL · fingerprint `a1034beabcbd`** · model modules covered 19/19.

## Acceptance criteria (§11)

| # | Status |
|---|---|
| 1 | Pretend: both microworlds end to end, deterministic (tested). OpenAI with a key has been run live by the user (v1, before Logo). Keyless and Anthropic-key paths are tested against a fake fetch only. |
| 2 | Every model call keeps its system prompt, messages, exact request body and raw reply, behind "Show full technical details" (tested). |
| 3 | All 9 shipped agents pass all their scenarios; line maps are complete; highlighting works both ways (tested, including in the page). |
| 4 | Dot Counter isn't fooled by labels, and is fooled by pebbles drawn with CIRCLE (both tested). |
| 5 | Look inside shows only ordinary agents and rules (schema-validated in tests). |
| 6 | Editing a shipped agent's pseudocode translates it (a pretend canned variant) and reruns the scenarios (tested). |
| 7 | Forbidden identifiers are rejected and runaway programs stopped by the step counter (tested) and the Worker timeout (checked by hand). Runaway Logo and endless recursion are stopped too (tested). |
| 8 | Tampered JavaScript, hostile names, `__proto__` keys and trace secrets in imports are neutralized (tested). |
| 9 | Pretend mode refuses "looks happy"-style lines with a question (tested). **The live-model check is still manual.** |
| 10 | The jsdom suite reports a fingerprinted PASS count; this file is updated. |
| 11 | 388 KB, under 1 MB (tested). |

## Open issues

- **Logo with live models is untested.** Run both microworlds with a real model and read the
  Artist's and Designer's Logo: do they use REPEAT, quote their colors, stay on the picture?
  The Renderer's errors go back to the Artist ("Your program did not run."), so a model can
  fix its own mistakes, but how often it needs to is unknown.
- **Mystery rows and A big grid** are meant to be hard for strong models (the user found the
  v1 challenges too easy for gpt-5.6-terra). Check that they are: a good Designer should
  need two to four tries on Mystery rows, and Eyes should sometimes miscount the big grid.
- Keyless (claude.ai chat artifact) and Anthropic-key runs still need a first live session.
- In Fallback A, a heavy built-in call that never loops (for example `new Array(1e9).fill(0)`)
  can't be interrupted. The Worker path handles it.
- Pretend-mode translation only knows the shipped pseudocode plus two variants. Anything else
  says it needs translation and keeps running the last good program, as §4.2 asks.

## Next steps

1. Live runs (see Open issues), then tune the Artist, Designer, Eyes and Critic instructions
   from what real models do.
2. Try it with two learners at one society, using scenario files.
3. Roadmap items (§10) start at v1.1 Fact Checker.

## How to check the look

A headless-Chrome CDP script (`shoot.mjs` in the build session's scratchpad) captured the key
screens; the in-app browser pane was flaky for screenshots. For a quick look, serve the folder
(`python -m http.server 8420`) and open `http://localhost:8420/`.
