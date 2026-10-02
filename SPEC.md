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
- 2026-09-30 — **v1 built** (Claude Code session). Repo: https://github.com/ToonTalk/agent-construction-kit (the app is its `index.html`). Test suite: 213 PASS, fingerprint `9dd0e0d1f43e` at first commit (see the repo's HANDOFF.md for the current count).
- 2026-09-30 — **Step 0 (§0.4) results.** This session could not open a claude.ai chat artifact, so the three questions were answered from earlier artifact sessions; `step0-probe.html` (next to this spec) re-checks all three when pasted into a chat. (1) `new Function` in a chat artifact: **yes**: Tiny Mind's artifact edition runs its inline-worker shim through `new Function` (July 2026), and the Atelier's turtle sandbox compiles with it too. (2) Blob-URL Worker in a chat artifact: **no**: recorded by the Tiny Mind artifact session ("the artifact sandbox refuses blob-URL Workers"). (3) Keyless fetch with an image block: **yes** (§12; Logo Evolution Lab's `callClaude`). **Decision for §4.3:** the runtime probes at startup and picks the Worker when one answers (GitHub Pages and local files; verified on localhost, with the 1-second timeout killing and replacing the Worker), otherwise **Fallback A**: in-page `new Function` after the static check, with a step counter in every loop and function body, a guard on every `[ ]` lookup, and every global name shadowed. **Fallback B was not built**, since Step 0 does not force it.
- 2026-09-30 — **Build decisions and clarifications** (none changes a principle):
  - Pictures travel by reference: a message carries `renderId`, and the Renderer's record holds the PNG (a `data:` URL). A model that can see images receives the actual base64 PNG content block, and the trace shows it as a thumbnail.
  - A **round** starts at each visit to the society's round agent (Artist, Designer) after the first delivery. A message records the round it was sent in.
  - **Gate:** when an agent's output has `pass: false`, its ALWAYS rules are held (and listed as held in the trace); rules that test `data.pass = false` still fire. The Renderer sends `pass: false` when a program doesn't run, so it is a gate too.
  - Rules may come **from "anyone"** (`from: "*"`), excluding the listener itself, so the Tally hears everyone with one rule.
  - Programmed agents remember by returning `memory`, which comes back as `input.memory` next time in the same run (Loop Spotter, Tally). Their `say` becomes the message text; the other fields become its data.
  - The translator's reply adds `slots: [{line, text, param}]` to §4.2's object, so slot values can be edited inline without retranslation. Saving pseudocode that differs only inside known slots updates params and skips translation.
  - The pretend personas are deterministic programs with **documented habits**, shown in each agent's editor. The pretend Describer lists shapes from the right, says one fewer above six, and counts one extra spiral turn. The pretend Designer makes one typical first-try mistake and fixes it only if it remembers the Critic. Pretend Eyes merges pebbles closer than 14 px and believes a "3 by 5" label. These habits let both question cards be answered offline: Telephone shows cycles, fixed points, drift and a start that never settles; Pebble shows the Designer winning through a label, and Eyes and Dot Counter each fooled where the other is right.
  - Models: keyless defaults to `claude-sonnet-4-6` (proven through the proxy) and falls back to it on a model-shaped error. User-key Anthropic defaults to `claude-opus-5-5` with `effort: "low"` and `fallbacks: "default"`. Gemini and OpenAI defaults come from the Logo Lab lists.
  - **Pause** pauses the whole run (covering the Explorer's pause-all); **Step** delivers one message.
  - The only per-microworld UI comes from seed data: `starts` (with example sentences), `challenges` plus `challengeWiring`, and `variants` (the Dot Counter swap).
  - Settings holds the connection, keys, models, the visible safety preamble, how programs run here, and the guides (in-app). The Workshop tab of the trace records translator and helper calls with their exact prompts and replies.
- 2026-10-01 — **Revision 1.0.1, after the first review of v1** (the reviewer ran it with OpenAI's gpt-5.6-terra). The spec's original folder (`dev\agent-kit`) no longer exists, so this entry is recorded here, in the repo's `SPEC.md`. These changes supersede the parts of §5, §7, Appendix A and Appendix C that they name; everything else stands.
  - **Drawings are Logo** (supersedes Appendix C's JavaScript turtle). Beginners found the JavaScript punctuation confusing, and showing a translation would have meant the trace no longer showed what a model actually wrote. The Artist, the Designer and the drawing pad now write Logo, and a small interpreter in the model layer runs it: FORWARD, BACK, LEFT, RIGHT, PENUP, PENDOWN, SETXY, SETHEADING, HOME, SETPENCOLOR, SETPENSIZE, DOT, CIRCLE, ARC, LABEL, REPEAT with REPCOUNT, TO … END with inputs, MAKE, IF, IFELSE, FOR, WHILE, STOP, OUTPUT, and the usual arithmetic and list operations. Coordinates are Logo's (0 0 in the middle, y up). The interpreter never produces JavaScript; every instruction counts against the 100,000-step limit and calls nest at most 200 deep. The Renderer's data (`dots`, `segments`, `labels`) is unchanged and still in screen pixels, so the judges and Dot Counter are unchanged. Programmed agents are still pseudocode translated to JavaScript. Drawings saved or exported by v1 are converted to Logo where they are plain calls or simple counted loops.
  - **The prompts ask for REPEAT** whenever something happens more than once, and the pretend Artist and Designer use REPEAT and TO themselves. The safety preamble now allows simple Markdown, and the page renders it (safely: escaped first, links show only their words), which §7 permits.
  - **The trace shows less by default.** An opened entry shows its response (Markdown rendered, Logo highlighted, a judge's pseudocode, a picture for the Renderer) and the rules it set off. Data is said in plain words; a reply with no words is marked as plain words for the data it sent, not its literal reply. Everything else (message in, model call, system prompt, request body, raw reply, JSON) is one click away under "Show full technical details". Criterion 2 still holds.
  - **Telephone is three agents and four rounds** (supersedes §5.1's Loop Spotter and Tally, and the 8-round default). Neither helped answer the question card, and both doubled the trace. They are in the library: "+ Add an agent" in Look inside adds any library agent with a rule so it hears the agent it listens to. The question about the Loop Spotter's threshold became "How would you know when the pictures have stopped changing?"
  - **No seed field.** Language models aren't repeatable anyway, and the shipped pretend agents never use random numbers, so pretend runs stay identical. Each run now gets a fresh seed, which only programs that pick at random (h.pick, Logo's RANDOM and PICK) notice. It is recorded in the trace.
  - **Each microworld has a short introduction** at the top of its question card (and of the stage, on phones).
  - **Pebble Challenge got harder challenges** (extends §5.2's ladder). The v1 ladder was too easy for a strong model, so the Critic never had anything to do. The challenges are marked easy, medium and hard. *A big grid* (11 by 14) is hard for a vision model to count. *Mystery rows* is the default: the new Mystery Judge (Appendix A addition below) keeps a secret row count and says only which rows need more and which need fewer, so any Designer needs the Critic's notes and several tries. The pretend Designer solves it by halving its guesses, and can't if it remembers nothing. When a live model passes on its first try, the stage suggests a harder challenge. Both microworlds keep 4 rounds; a Pebble run ends as soon as the judge passes.
  - **Mystery Judge** (gate): `the secret is {5, 2, 7} dots in the rows, from the top` / `compare each row with the secret` / `if every row matches and there are no extra rows` / `pass, and say "done"` / `otherwise` / `block, and say which rows need more dots and which need fewer`. It has five scenarios.
  - **Settings has one model field**: type any model name, or pick one of the suggestions under it.
  - A microworld saved by v1 is replaced by the new version when the page loads; a banner offers to keep the old one as a copy.
  - Suite: 257 PASS, fingerprint `a1034beabcbd`.
- 2026-10-01 — **Revision 1.0.2, after a second review** (Claude in Chrome on the Pages build, in pretend mode, with a simulated panel: Papert, Minsky, Kay, Vygotsky). The reviewer accepted all of it.
  - **Models:** the key-based defaults are now each provider's cheapest current model that can see pictures: `claude-haiku-4-5`, `gemini-3.5-flash-lite`, `gpt-6-luna`. Settings suggests stronger ones (Claude Sonnet 5.5, Opus 5.5, Fable 5.1; Gemini 3.8 Flash, 3.1 Pro preview; GPT-5.6 Terra, GPT-6.1 Sol, GPT-6 Astra). Saved settings that still name 1.0's defaults are switched; a model someone typed stays. Haiku 4.5 may retire after 15 October 2026, so a model-shaped error with an Anthropic key retries once on `claude-sonnet-5-5` and says so. Keyless keeps `claude-sonnet-4-6`, proven through the chat proxy, since it costs no money.
  - **Dot Counter's words now come from its pseudocode** (a fifth line, `say "I count {rows} rows and {columns} columns."`). The glass box had a hidden drawer: the JavaScript said something no pseudocode line did. Its odd "9 columns" for rows of 5, 2 and 7 stays as a bug to find, with a question pointing at it.
  - **One Judge** (Minsky; supersedes the judge-per-challenge wiring of §5.2 and 1.0.1). Pebble has six agents. A challenge names a library program (`program`), and choosing the challenge gives the Judge that program and its scenarios, says so in a toast, and shows it on the stage; the rules never move. Edits to the Judge are kept with the challenge they were made for. Societies from earlier versions, with a judge agent per challenge, are still rewired as before. Invent a challenge offers the library's judge programs, and any other gate agent.
  - **"No Critic"** variant (Minsky's ablation): the Judge's words go straight to the Designer. A question asks whether the Critic helps.
  - **You be the Designer / the Artist** (Papert): a learner can play a society's round agent. The run waits for them, shows what they were sent, takes their answer (Logo, with a live preview), and the other agents answer them. The engine gained `deps.playAs`, the status `waiting`, and `answer(text)`; such entries are marked "you" in the trace.
  - **Change the drawing in the trace** (Papert): any Logo the Artist, the Designer or the Renderer handled can be edited and redrawn right there, and used as Telephone's drawing start, without changing the run.
  - **Pebble keeps 5 rounds** (Kay): a perfect bisector needs up to 4 tries on Mystery rows, so 5 leaves room for a good search that isn't perfect. Telephone keeps 4.
  - **Pretend-mode questions** (Vygotsky): pretend runs never vary, so in pretend mode Telephone's card asks questions pretend mode can answer (`pretendQuestions`).
  - Small fixes: the Renderer counts shapes ("I drew 2 shapes"), not the 36 short lines of a circle; rules read in English ("Renderer gets the words, always"); a starting run says "Starting…" rather than "paused".
  - Suite: 270 PASS, fingerprint `7fda16058b96`.
- 2026-10-01 — **Revision 1.0.3, after the first runs with a real model** (gpt-5.6-terra, by the reviewer and by Claude in Chrome).
  - **Pretend mode is gone for learners** (supersedes criterion 1's pretend mode). Its stand-ins taught the wrong lesson: the pretend Designer searched better than the real model, and the pretend Describer's swap is something no real model did. With no model chosen, the app asks for one (Run opens Settings). The scripted stand-ins stay inside the code as the test suite's double. **Later, not now:** replays of recorded real runs, free and offline, where every message really came from a model.
  - **Gemini Nano, built into desktop Chrome** (138 and later), is a connection: free, and nothing leaves the computer. It takes pictures. "Test the connection" (a click) lets Chrome download it; when Chrome already has it and no model is chosen, the app picks it.
  - **The trace shows what each agent got** ("It got, from Describer: …") above what it said.
  - **Logo is changed in place** in the trace, with the drawing beside it, and "Send it to the Renderer in a new run" starts a run from the Renderer with the changed program (replacing 1.0.2's separate panel).
  - **DOT and SETPENSIZE** no longer stop at 60 and 20, which had made `DOT 110` and `DOT 75` the same size.
  - **Mystery rows:** Terra stepped each row by one instead of searching, so a secret near 4 passed and {8, 1, 8} failed. The secret is now new each run (a switch keeps it fixed). The Mystery Judge's scenarios are written relative to its secret (`fromSecret`), so they hold for any secret. It also passes on each row's count and verdict, so a learner could build a notebook agent that keeps the clues (Minsky); a question invites that.
  - **Challenges say what they test** instead of easy, medium or hard (Kay: the "hard" big grid was easy for Terra's vision), and the first-try message asks "Can you invent a challenge it can't meet?".
  - A question points at the stray line a Designer draws when its first SETXY comes before PENUP. It stays in, as a bug for a child to find (Papert).
  - Suite: 275 PASS, fingerprint `e37e4e98e2f2`.
- 2026-10-01 — **Revision 1.0.4.**
  - **▶ Run carries on after ⏭ Step**, and a new **↺ Reset** clears the run so the next Run starts from the beginning (before, after Step the choices were "Go on" and "Restart", and Restart started over).
  - **The agents on the stage are buttons** that open each agent's editor.
  - **Trace filters** are named "AI agents", "Programmed agents", "Pictures" and "Problems", show how many entries each has, and a drawing that didn't run now counts as a problem.
  - **Gemini Nano wrote commands Logo doesn't have** (LINE, TRIANGLE). The Logo help now says there are none for shapes, with a triangle as the example, and the error for a shape name shows how to draw it, so a model can fix its program.
  - Pseudocode shown read-only says what { } means: a highlighted one is a setting (a slot); any other is filled in when the program runs.
  - Suite: 280 PASS, fingerprint `de5ab9d61235`.
- 2026-10-01 — **Revision 1.0.5** (from two Claude in Chrome reviews: more scenarios, and new microworlds in `agent-kit-microworlds.md`).
  - **Scenarios follow the agent's settings.** A value written `"=rowsNeeded"` (or `"=secret+1"`) is that param, and `{=secret}` inside a text is replaced by it, so changing a slot no longer breaks a scenario that still means the same. Rows can be made from any list param (`fromSecret.param`), flipped, grown by one, or given Dot Counter's screen heights.
  - **More scenarios**, each naming what it tests: Dot Counter has 11 (staggered rows of 5, 2 and 7 make 9 columns; one row split in two by rounding at heights 214 and 216; an empty picture; one dot; lines with dots; mixed colors). The Row, Grid, Triangle, Checkerboard, Color and Mystery Judges have 5 to 8 each (sideways grids, an upside-down triangle, the right total in the wrong shape, diagonal neighbors that match, “Red” with a capital letter, every row one too many).
  - **＋ Save as a scenario** on a programmed agent's turn in the trace keeps its input, and its answer as what it should say, then opens its editor.
  - **A test bench** in the editor of any model agent that sees pictures and sends rows, cols or rowList (Eyes): five saved pictures with known answers (3 by 5, 11 by 14, rows of 5, 2 and 7, a 4 by 4 checkerboard, a 3 by 5 grid with a stray line), each looked at 1 to 10 times, showing “right k of N” and every answer. Each look is a real model call, logged in the Workshop.
  - **Secret Number** — “Can a notebook make it smarter?” The Keeper (a gate program) keeps a secret from 1 to 100, new every run, and says higher or lower. The Guesser (a model, no memory) guesses. Variants: the **Notebook** (a program that remembers the lowest and highest the secret could still be, and tells the Guesser) and **the Guesser remembers the whole game**. 10 rounds. Variants can now switch an agent's memory, and a society can keep its own random secret.
  - **Lost and Found** — “Where did it end up?” A Drawer draws a lost thing in Logo, the Finder (a model that sees pictures) names it, and rules send it to Toys, Clothes, Animals or Tools by the words it used. A rule's words can now be a list (“hat, sock, shirt, shoe”: any of them). The Mystery Box program keeps what no shelf took; it compares whole words, so “two dogs” goes to Animals (a rule finds “dog” inside “dogs”) and to the Mystery Box too.
  - Variants and a society's secret switch now show for any start, not only challenges. Each microworld has its own version, so an unchanged one (Telephone) isn't replaced; Pebble Challenge is replaced, for its new scenarios.
  - Not built yet, as the review recommends: Story Chain, Three Eyes, Fool the Eyes, Small Helper Big Helper and Joke Workshop (each waits for its new feature), and the Notebook option for Mystery rows. Open question for Ken: should every Judge ignore stray lines?
  - Suite: 324 PASS, fingerprint `83d84b79b94c`.
- 2026-10-02 — **Revision 1.0.6** (from Claude in Chrome's test run with Gemini Nano).
  - **More than one model.** Settings has “More models”: add any other connection and model (Gemini Nano, Claude, Gemini or OpenAI with a key). With more than one, each AI agent's editor has “Its model”, the stage chips show each agent's model, and a run calls each agent through its own model (`deps.adapterFor`). With one model, nothing changes. An agent's choice (`agent.model`, like `gemini:gemini-3.8-flash`) is saved and exported; where that model isn't set up, the agent uses the main one.
  - **Which model suits each microworld** is on its question card: Gemini Nano is enough for Secret Number; Telephone and Lost and Found need something stronger for the agents that draw and see. If those agents are using Nano, the card says so and points to More models.
  - **Logo:** a blank picture from a command that was taught but never used says “You taught the turtle DOG but never asked it to draw DOG.” The bug itself stays: the Renderer adds the hint to what it says, and the drawing pad and Logo editors show it too.
  - **Secret Number's stage** shows the guesses and answers round by round, with no empty picture. With random secrets off, a box on the stage takes your own secret. The Keeper's own secret is 83 (37 was the third guess on the halving path).
  - The Critic is told it's about pebbles, so small models don't borrow “agents” from the preamble. The Finder can say “nothing”, and the Mystery Box leaves that alone; “a toy robot” still lands in the Mystery Box, and a question asks why.
  - Gemini Nano: Chrome pauses it while its tab is hidden. Settings says so, and a note appears when you come back to a run. The Gemini list no longer calls 3.1 Pro (preview) the strongest: 3.8 Flash beats it on most shared benchmarks and costs less.
  - Suite: 334 PASS, fingerprint `b899278acfef`.
- 2026-10-02 — **Revision 1.0.7.** Ken decided that stray lines don't count: a Judge ignores them. The Judges only ever see counts, and Dot Counter already skips lines, so Eyes is now told the pebbles are the dots and to ignore lines, shapes and writing. The test bench's “3 by 5 grid, with a stray line” checks it. `agent-kit-microworlds.md` (the seven microworld designs) is now in the repo.
  - Suite: 335 PASS, fingerprint `d79c1a9a29fb`.
- 2026-10-02 — **Revision 1.0.8.** “Start over” deletes the societies, traces and helper chats but keeps the settings (models and keys) unless “Also forget my settings” is ticked in its dialog.
  - Suite: 336 PASS, fingerprint `9294dc5094cd`.

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
