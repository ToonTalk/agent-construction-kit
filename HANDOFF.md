# Handoff

*Keep this short. Update it at the end of every session.*

## State (2026-09-30)

v1 of the Agent Construction Kit ("Agent Kit") is built as specified in `SPEC.md` (a copy of
`C:\Users\toont\dev\agent-kit\agent-kit-SPEC.md`; the build decisions are in its §14).

- The app is the single file `index.html` (331 KB): the `ak-model` script is DOM-free, and
  the `ak-ui` script is the interface. There is no build step.
- Both microworlds run end to end in pretend mode. They are ordinary societies built from
  seed data (`makeTelephone`, `makePebbles`).
- Programs run in a Worker where one is allowed (GitHub Pages, local files). Otherwise they
  run in the page after the static check, with a step counter, a `[ ]` key guard, and every
  global shadowed (Fallback A, for chat artifacts). The runtime picks the mode at startup,
  and Settings shows which one is in use.

**Tests:** `npm test` (or `node tests/run.mjs [filter]`). Latest:
**213 PASS, 0 FAIL · fingerprint `9dd0e0d1f43e`** · model modules covered 17/17.

## Acceptance criteria (§11)

| # | Status |
|---|---|
| 1 | Pretend: both microworlds end to end, deterministic (tested). Keyless and user-key paths are built and tested against a fake fetch, but **not yet run live** (no chat artifact or key used from this session). |
| 2 | Every model call opens to show its system prompt, messages, exact request body and raw reply (tested). |
| 3 | All 8 shipped agents pass all their scenarios; line maps are complete; highlighting works both ways (tested, including in the page). |
| 4 | Dot Counter isn't fooled by labels, and is fooled by rings (both tested). |
| 5 | Look inside shows only ordinary agents and rules (schema-validated in tests). |
| 6 | Editing a shipped agent's pseudocode translates it (a pretend canned variant) and reruns the scenarios (tested). |
| 7 | 13 forbidden identifiers plus more are rejected; runaway loops are stopped by the step counter (tested), and by the Worker timeout (checked by hand in Chrome). |
| 8 | Tampered JavaScript, hostile names, `__proto__` keys and trace secrets in imports are neutralized (tested). |
| 9 | Pretend mode refuses "looks happy"-style lines with a question (tested). **The live-model check is still manual.** |
| 10 | The jsdom suite reports a fingerprinted PASS count; this file is updated. |
| 11 | 331 KB, under 1 MB (tested). |

## Open issues

- **Live runs not yet done.** The kit needs a first session in a claude.ai chat artifact
  (keyless) and one with an Anthropic key: run both microworlds, and look at the real
  Artist's and Designer's programs, the Eyes JSON, the translator on an edited judge, and a
  "looks happy" refusal. `step0-probe.html` (next to the spec) re-checks Step 0 in a chat.
- In Fallback A, a heavy built-in call that never loops (for example `new Array(1e9).fill(0)`)
  can't be interrupted. The Worker path handles it.
- Rule editing in Look inside is inline and dense. Drag-to-wire is out of scope (Meadow).
- Pretend-mode translation only knows the shipped pseudocode plus two variants (Grid Judge
  "either way round", Loop Spotter "exactly the same"). Anything else says it needs
  translation and keeps running the last good program, as §4.2 asks.

## Next steps

1. Run the kit live in a claude.ai chat artifact and with a key (see Open issues), then tune
   the Artist, Designer, Eyes and Critic instructions from what real models do.
2. Try it with two learners at one society, using scenario files.
3. Roadmap items (§10) start at v1.1 Fact Checker.

## How to check the look

The in-app browser pane was flaky for screenshots in the build session. A headless-Chrome
CDP script (`shoot.mjs`) in that session's scratchpad captured the key screens. For a quick
look, serve the folder (`python -m http.server 8420`) and open `http://localhost:8420/`.
