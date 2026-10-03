# Agent Construction Kit — v1 Specification

*Working title. Canonical spec, single source of truth. Edit append-only; record changes in §14.*

---

## 0. Kickoff (read first)

### 0.1 What you are building
A glass-box construction kit in which learners (roughly ages 10–16) build **societies of agents**: language-model agents plus small **programmed agents** written in editable pseudocode. It ships with two **microworlds** (Telephone and Pebble Challenge), each an ordinary saved society that poses a question with a powerful idea behind it.

### 0.2 Materials provided with this spec
| Source | Reuse |
|---|---|
| **Atelier** (Mind Maker) source | Turtle engine; "peek under the hood" UI pattern; settings panel and per-provider API-key handling; the fixed child-audience safety preamble; output sanitizer; pretend-helper pattern; helper panel |
| **Agentic AI Explorer** source | Rule model (ALWAYS / pattern / stateless handoff), forwarding with prefix, pause-all, export/import of a workspace |
| **Logo Evolution Lab** source | `callClaude` — the proven keyless chat-artifact call path that sends base64 PNG images; the provider fallback structure (Gemini / OpenAI with user keys) |

Reuse code where it fits; do not import their UI wholesale. Where this spec and those apps disagree, **this spec wins**.

### 0.3 Build conventions
- **Single-file HTML, vanilla JS, no build step.**
- **Model code is DOM-free** (message bus, rule engine, programmed-agent runtime, translator client, scenario runner, turtle engine, adapters) so it runs under **jsdom**.
- **Fingerprinted test suite**: tests report a PASS count plus a fingerprint; report both at the end of every session.
- **Repo**: build in the GitHub folder; `git init`, create and push a GitHub repo; gitignore anything not needed to run the app; flag any runtime-required file over 100 MB (none expected).
- **Handoff**: maintain a short `HANDOFF.md` (state, PASS count + fingerprint, open issues, next steps). Append-only edits to this spec's §14.
- **Deployment contexts**: (a) claude.ai **chat artifact** (keyless Claude); (b) GitHub Pages or local file (user API keys for any provider). Same single file serves both.

### 0.4 Verify before building (Step 0 for Claude Code)
Run these in a claude.ai chat artifact first; results decide §4.3's execution strategy. Record results in §14.
1. Does `new Function(...)` run inside the chat artifact (CSP `unsafe-eval`)?
2. Does a **Web Worker created from a Blob URL** run inside the chat artifact?
3. Does the keyless `fetch("https://api.anthropic.com/v1/messages")` with an image content block succeed (lift `callClaude` from Logo Evolution Lab)?

---

## 1. Purpose
Learners construct, run, debug and compare societies of agents. The kit makes three kinds of thing inspectable and editable: the **agents**, the **wiring** between them (including the loop itself), and the **programs** that some agents run. Microworlds supply starting points and questions; the kit supplies the material to go beyond them.

## 2. Principles (non-negotiable)
1. **Glass box.** Every model call exposes its exact prompt, messages and reply. Every programmed agent shows its pseudocode, with its generated JavaScript under "peek under the hood." Every message between agents appears in the trace. Nothing is hidden.
2. **Microworlds are just saved societies.** "Look inside" reveals ordinary agents and rules. No special-case code per microworld beyond seed data.
3. **Pseudocode only for what can be computed.** Programmed agents act on *data* (numbers, words, lists, the Renderer's dot list) — never on perception or an imagined world.
4. **Stable over stochastic.** Programmed agents are deterministic: same input, same output.
5. **Feedback asks, never prescribes.** Learner-facing commentary asks questions and never names the fix.
6. **Honest between agents, kind to learners.** Agent-to-agent critique may be blunt and specific about the work; learner-facing text stays kind.

---

## 3. Architecture

### 3.1 Connection adapters
One interface, `ModelAdapter.call({system, messages, images[], outputFields, maxTokens}) → {text, data, raw, ms}`, with implementations:

| Adapter | Where | Notes |
|---|---|---|
| **Keyless (chat artifact)** | claude.ai chat artifact | Proxied fetch, no key; images as base64 PNG content blocks. Lift from Logo Evolution Lab. Default when running inside claude.ai. |
| **User key** | GitHub Pages / local | Anthropic, Gemini, OpenAI, as in Atelier / Logo Lab. In a claude.ai artifact, Gemini/OpenAI are CSP-blocked — show the same warning the Logo Lab shows. |
| **Pretend** | anywhere | No calls. Deterministic canned replies for every model agent in the shipped microworlds. |
| *(deferred)* **Published `sample`** | claude.ai published artifacts | Not in v1. Add later only when `sample.limits()` reports `images`. |

Every call is raced against a timeout (90 s) and surfaces failures visibly (see §3.6).

**Accepted risk:** the chat-artifact fetch route is the older mechanism and may be retired; the adapter seam confines any change to one module.

### 3.2 Messages
```
{ id, from, to, round, text, data: {…}, image?: <PNG base64>, timestamp }
```
A model agent may declare **output fields** (e.g. `rows: number, cols: number`). The adapter appends an instruction to return those fields as JSON after the prose; the kit parses tolerantly (whole reply → fenced block → first `{` to last `}`). A parse failure is a visible trace error, never swallowed.

### 3.3 Agents
- **Model agent**: name, instructions, declared output fields, `canSeeImages`, history mode (full / stateless).
- **Programmed agent**: type ID, name, pseudocode, generated JS, line map, parameter slots, scenarios, last-good version (see §4).
- **Renderer** (built-in, not a model): runs a turtle program (Atelier engine) and outputs the image **and** structured data: `dots: [{x, y, color}]`, `segments` count, and any `label` texts drawn.

### 3.4 Wiring (no drag-to-wire in v1)
A rules table, extending the Explorer's rule model:
```
WHEN <agent> responds
  [ALWAYS | IF data.<field> <op> <value> | IF text contains <word>]
SEND [text | data | both | image] TO <agent>   (optional prefix)
```
- **Gate** (the veto primitive): a programmed agent whose output has `pass: false` stops the flow or reroutes it per its rule.
- A **round limit** and a **Stop** button are always visible. **Pause all** as in the Explorer.
- Loops are ordinary rules pointing backwards, so the loop is editable.

### 3.5 Trace and replay
Chronological trace of every message. Each model call expands to its exact system prompt, messages (images shown as thumbnails; base64 elided in text view), reply, parsed data, and timing. Replay steps through a finished run. Export trace as HTML.

### 3.6 Artifact-sandbox constraints (verified in earlier projects)
- `alert` / `confirm` / `prompt` silently no-op → build DOM modals; toggle `style.display` (inline styles beat `[hidden]`).
- File pickers: create the `<input type=file>` dynamically and never attach it; a static hidden input does not open in the app WebView.
- Clipboard is not delegated to the iframe and its promises can hang → race a timeout; text fallback `execCommand("copy")` on a selected textarea.
- `localStorage` works and persists; quota is tight → gzip (CompressionStream) + base64.
- Keep the file **under ~1 MB**; embed large assets gzipped.
- Display images from `data:` URLs (blob URLs fail to render in the Android app); use blobs only for download/share.
- `target=_blank` opens inside the Claude Android app → offer Copy-link buttons.
- Every permission-gated or long action gives guaranteed feedback (toast + timeout).
- Signed-out keyless calls may return non-empty non-JSON bodies → validate replies and show a sign-in banner on unusable responses; tell users to use the **browser's** reload (iframe reload does not refresh the session).

---

## 4. Programmed agents

### 4.1 Editing (v1)
- Pseudocode is **editable**; agents can be **duplicated** (so learners build new agents from any shipped one).
- Parameter slots — `{3}`, `{half}` — appear in pseudocode and become named constants in the JS; they are editable inline without retranslation.

### 4.2 Translation on save
Saving edited pseudocode triggers a **translator** model call (visible in the trace like any other) that returns:
```
{ "js": "...", "lineMap": [{ "pseudo": [startLine, endLine], "js": [startLine, endLine] }, ...],
  "params": { "name": default, ... }, "refusals": [{ "line": n, "reason": "..." }] }
```
- The JS is exactly one pure function: `function run(input, params, h) { … return output; }` using only the helper library `h` (§4.4).
- Cached by pseudocode hash; retranslated only when pseudocode changes. **Last good version kept, with Revert.**
- **Computability rule enforced here**: a line needing perception or judgment ("if the drawing looks happy") yields a refusal naming the line instead of code. The kit shows it as a question: *"A program can't tell whether a drawing looks happy. What could it count instead?"*
- In **pretend mode**, shipped agents use canned translations; an edited agent shows "needs translation" and runs its last good JS until a real adapter is available.
- **Length nudge**: over ~8 lines of pseudocode, a gentle "Could this be two agents?" — never a block.

### 4.3 Execution
- **Static check** before any execution: reject any reference to `window`, `document`, `globalThis`, `self`, `fetch`, `XMLHttpRequest`, `WebSocket`, `postMessage`, `eval`, `Function`, `import`, `importScripts`, `constructor`, `__proto__`, `prototype`, or any identifier not in the whitelist (params, input, h, local declarations, standard Math/Array/String/Number methods).
- **Preferred**: run in a Web Worker (Blob URL) with a hard timeout (1 s) — if Step 0 item 2 passes.
- **Fallback A** (Worker blocked, `new Function` allowed): run via `new Function` in the page after the static check, with loops instrumented at translate time by a guard counter (`h.tick()` inserted in every loop body; throws after 100 000 ticks).
- **Fallback B** (`new Function` blocked): the translator emits a small **JSON instruction format** executed by a built-in interpreter; "peek under the hood" then shows a readable JS rendering of those instructions with the same line map. Choose this only if Step 0 forces it; record the decision in §14.
- A throwing or timed-out agent shows a visible error in the trace.

### 4.4 Helper library `h`
`words(text)`, `sharedWordFraction(a, b)`, `count(list)`, `unique(list)`, `roundTo(n, step)`, `groupBy(list, key)`, `tally(map, key)`, `pick(list)` (seeded random, seed shown in trace), `tick()`. Small, documented, and itself visible in the peek view.

### 4.5 Peek under the hood
Pseudocode and JS side by side with **linked highlighting** both ways via the line map. Shipped agents have hand-authored line maps.

### 4.6 Scenarios (tests)
- Each agent has named scenarios: an input and the expected output (or expected pass/fail).
- **Auto-run after every translation**; "Run all" shows a pass/fail grid; the agent card shows its pass count.
- A failing scenario shows input, expected and actual side by side, and the rendered picture where there is one.
- Saving with failing scenarios is allowed (debugging in progress is legitimate).
- Learners can add, edit and delete scenarios; scenario sets export/import separately (§8).

---

## 5. Microworlds (v1)
Each loads as an ordinary society with a **question card** (questions, never instructions) and a **Look inside** button.

### 5.1 Telephone — "Where does it go?"
- **Society**: Artist (model: description → turtle program) → Renderer → Describer (model, sees image: one-sentence description) → Artist. **Loop Spotter** listens to the Describer; **Tally** listens to everyone.
- **Start** with a sentence, or a quick drawing made by clicking turtle commands.
- **Question card**: Run the same start twice — how different are the runs? Change the Artist's style. Change the Loop Spotter's threshold. Can you find a start that never settles? One that settles fast?
- **Powerful ideas**: iteration, fixed points and cycles, variance.

### 5.2 Pebble Challenge — "Why did the Designer win?"
- **Society**: Designer (model: turtle program for the current challenge; may draw text labels) → Renderer → Eyes (model with vision; output fields per challenge, e.g. `rows`, `cols`) → Judge (programmed, gate). On block → Critic (model: blunt, specific note to the Designer) → Designer.
- **One challenge object** feeds both the Designer's task text and the Judge's parameters.
- **Challenge ladder** (each with its own example Judge, Appendix A): a row of 4; a 3×5 grid; a triangle of 10 (1-2-3-4); a 4×4 checkerboard in two colors; exactly 7 red and 3 blue anywhere. Learners are invited to invent challenges, easier and harder.
- **One-click variant**: replace Eyes with **Dot Counter**, which reads the Renderer's dot list.
- **Deliberate asymmetry (keep it)**: Dot Counter counts only `dot` commands. A Designer that draws pebbles as small circles of turtle steps defeats Dot Counter while Eyes may still count correctly — the program is fooled by a change of representation.
- **Question card**: Find a challenge the Designer can't meet. Find one Eyes gets wrong but Dot Counter gets right. Can you find the reverse? Which jobs needed intelligence, and which only needed counting?
- **Powerful ideas**: critics can be gamed; correlated vs independent error; perception vs judgment.

---

## 6. Helper and guides
- **Helper panel** (as in the Atelier): reads the current society, trace and scenarios; cannot change them. Its prompt enforces: ask, don't prescribe; never state the fix for a failing scenario; offer the next step the learner can almost reach. Opening questions differ per microworld.
- **Guides**: a short learner guide and a teacher guide, linked from Settings. The teacher guide recommends **seating two learners at one society** and using scenario files to challenge each other's agents.

## 7. Safety and tone
- The Atelier's fixed, visible **child-audience safety preamble** on every model call (no violence, romance, scary or mature themes; simple language).
- All model output is stripped of markdown where not rendered, and **sanitized** before storage and display.
- **Tone**: learner-facing text kind. Agent-to-agent messages (Critic, Eyes, Judges) may be blunt and specific — about the work, never about a person, and never mature.
- **Imports are untrusted**: sanitize every string field (names, colors, labels, instructions) on import. **Imported JS is always discarded**; imported pseudocode is retranslated locally through the same static check and sandbox. Shipped agents are matched by type ID and restored from the library.
- No personal data is ever requested.

## 8. Persistence and sharing
- Autosave to compressed `localStorage`.
- Export / import a society as JSON: agents, rules, parameters, pseudocode, scenarios, optionally the trace. Dynamic file input for import.
- Export / import **scenario sets** separately, so one learner can send another scenarios designed to break their agent.
- Export the trace as HTML.

## 9. Out of scope for v1
Drag-to-wire; direct model interpretation of pseudocode; suppress / compete / escalate / rewrite primitives; Meadow, Atelier, Emotion Machine and Fact Checker microworlds; image-generation models; published-artifact `sample` adapter; multi-user or real-time collaboration.

## 10. Roadmap
- **v1.1 Fact Checker** — correlated error; needs web search (user-key mode only; keyless has no browsing).
- **v1.2 Emotion Machine** — `suppress` primitive; a Selector permitted to *persist* with its current way of thinking; mode-specific resource settings (muting critics, temperature, context).
- **v1.3 Atelier as a microworld** — `rewrite` primitive (an agent edits another agent's instructions).
- **v2** — new agents from a blank page; English → pseudocode assistance under a five-line cap; `compete` and `escalate` primitives.
- **v3 Meadow** — drag-to-wire for young children; pair mode.
- **Later** — authoring by demonstration; strict-vs-charitable interpretation experiment (same pseudocode run by translated JS and by direct model interpretation, compared over many runs).

## 11. Acceptance criteria (v1)
1. Both microworlds run end to end in keyless (chat artifact), user-key (Anthropic at minimum) and pretend modes; pretend mode is fully deterministic.
2. Every model call in the trace expands to its exact prompt and reply.
3. Every shipped programmed agent passes all its scenarios; pseudocode↔JS highlighting works both ways.
4. Dot Counter cannot be fooled by text labels (test). Dot Counter **is** fooled by pebbles drawn without `dot` (test — the asymmetry is intended).
5. "Look inside" on each microworld shows only ordinary agents and rules.
6. Editing a shipped agent's pseudocode (pretend-mode canned translation in tests) triggers a scenario rerun.
7. The static check rejects a test suite of forbidden identifiers; a runaway loop is stopped (Worker timeout or tick guard).
8. An imported file with tampered JS or malicious strings is neutralized (test).
9. The computability refusal appears for "looks happy"-style pseudocode (manual test; model-dependent).
10. jsdom suite reports a fingerprinted PASS count covering every model-layer module; HANDOFF.md updated.
11. File size under ~1 MB.

## 12. Resolved decisions (do not relitigate)
| Decision | Why |
|---|---|
| New single file reusing Atelier + Explorer + Logo Lab parts | Glass-box conventions and proven code already exist |
| Glass box throughout; JS visible in peek | Transparency is the point; the level below the prompt matters when things break |
| Programmed agents in pseudocode, translated once to deterministic JS | Readable source, stable behavior; a stable bug is findable, a stochastic one isn't |
| Direct model interpretation of pseudocode skipped for now | A charitable interpreter undoes the value of dumb agents |
| Pseudocode editing allowed in v1 | Learners must build agents from day one |
| Pseudocode only for computable (data) tasks | Otherwise pseudocode gains nothing over English |
| Scenarios as tests; failures shown visually | Makes bugs findable and shameless |
| Feedback asks, never prescribes | The learner should find the fix |
| Blunt agent-to-agent critique, kind learner-facing text | Critics must carry information (negative expertise) |
| No drag-to-wire in v1 | Hardest interface; deferred to Meadow |
| Pebble targets are examples; learners set challenges | The ladder is the microworld, not the 3×5 grid |
| Keyless via chat-artifact fetch; `sample` deferred | Chat-artifact route accepts images; published `sample` reported no images (Step 0, 30 Sep 2026). Retirement risk accepted |

## 13. Risks
- **Chat-artifact fetch route retired** → swap adapter (§3.1).
- **CSP blocks Workers and/or `new Function`** → §4.3 fallbacks; verify first (§0.4).
- **Translator produces wrong JS** → scenarios catch it; Revert to last good.
- **Vision miscounts** → this is content, not a bug: it's what the Pebble Challenge is about. Log counts in the trace.
- **JSON output-field parsing fails** → tolerant parser; visible error; never silent.
- **Cost of runs** → round limit, Stop, pretend mode for rehearsal.

## 14. Change log (append-only)
- 2026-09-30 — v1 spec consolidated from design discussion.

---

## Appendix A — Shipped pseudocode

```
Row Judge                              (gate; challenge: a row of {4})
  if there is {1} row and it has {4} dots
    pass, and say "done"
  otherwise
    block, and say "I see {rows} rows with {cols} dots. I need 1 row of {4}."

Grid Judge                             (gate; challenge: a {3} by {5} grid)
  if rows is {3} and columns is {5}
    pass, and say "done"
  otherwise
    block, and say "You drew {rows} by {columns}. I need {3} by {5}."

Triangle Judge                         (gate; challenge: rows of 1, 2, 3, 4)
  sort the rows from top to bottom
  if the rows have {1, 2, 3, 4} dots in that order
    pass, and say "done"
  otherwise
    block, and say "Your rows have {the counts}. I need {1, 2, 3, 4}."

Checkerboard Judge                     (gate; challenge: {4} by {4}, two colors alternating)
  if rows is {4} and columns is {4}
    and no two side-by-side dots share a color
    and no two stacked dots share a color
    pass, and say "done"
  otherwise
    block, and say what was wrong: size, or where two neighbors match

Color Count Judge                      (gate; challenge: exactly {7} red and {3} blue)
  count the dots of each color
  if red is {7} and blue is {3} and there are no other dots
    pass, and say "done"
  otherwise
    block, and say "I count {the color counts}. I need {7} red and {3} blue."

Dot Counter                            (reads the Renderer's dot list)
  round every dot's position to the nearest {10}
  rows is how many different heights there are
  columns is how many different widths there are
  pass on rows, columns, and the dots in each row

Loop Spotter                           (Telephone)
  remember the last {5} descriptions
  if the new one shares more than {half} its words with any of them
    say "stuck — this looks like round {that round}"

Tally
  count how many times each agent spoke
  every {5} rounds, show the counts
```
Each ships with its JS, hand-authored line map, and at least four scenarios (including one expected failure).

## Appendix B — Translator contract
The translator call's instructions must require:
1. Output only the JSON object in §4.2.
2. One pure function `run(input, params, h)`; no other top-level code; only `h` helpers plus standard Math/Array/String/Number methods.
3. Every `{slot}` in the pseudocode becomes a named entry in `params`, referenced as `params.name`.
4. A `lineMap` covering every pseudocode line.
5. `refusals` for any line requiring perception, judgment, or knowledge of the world; no code for that line.
6. Insert `h.tick()` at the top of every loop body (for Fallback A).
7. No comments needed; readable variable names matching the pseudocode's words.

## Appendix C — Turtle and Renderer
- Use the Atelier's turtle engine and command set. Add `dot(size, color)` if absent.
- The Renderer records, alongside the PNG: `dots [{x, y, color}]` (from `dot` only), segment count, and label texts drawn.
- Canvas background white for images sent to models.
