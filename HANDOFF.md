# Handoff

*Keep this short. Update it at the end of every session.*

## State (2026-10-09)

Agent Kit **1.14.0**. v1 was built on 2026-09-30 from `SPEC.md`; 1.0.1 to 1.14.0 follow reviews
and the first real-model runs (see `SPEC.md` §14). `SPEC.md` holds the spec with its change
log. (`C:\Users\toont\dev\agent-kit` no longer exists; the untracked `agent-kit-SPEC.md` in this
folder is a copy without the §14 log.)

- **No pretend mode** for learners (1.0.3): a real model is needed. Gemini Nano, built into desktop
  Chrome, is a free choice. The scripted stand-ins (`connection: "pretend"`) remain only for tests.
  Planned, not built: replays of recorded real runs.
- **Films** (1.13.0, the first step of the mini-Ani, a miniature of Ken's 1978 Ani built to test how expressive the
  kit is): Logo's `WAIT 15` keeps the picture so far as a frame (60ths of a second); the turtle returns `film`
  (240 frames, 100,000 ops at most; a closing frame if drawing follows the last WAIT); the Renderer adds `frames` to
  its data and says “It is a film of N frames (S seconds)”; the stage's player (`app.ui.film`: ▶ / ⏸, slider,
  “frame i of n”) survives repaints; at slow and normal speed the run waits for a film to end, faster they queue; the
  exported trace page shows first, middle and last frames; vision models get the last frame; `LOGO_HELP` is
  unchanged. The start box grows with its lines up to 12. Plan: the ani-revival repo's `reports/chapter-x/PLAN.md`,
  Item 5, which corrects `design-mini-ani.md`. Never write in `C:\Users\toont\ani-revival`.
- **The Mini-Ani** (1.14.0, an example under ＋ New society, `examples/mini-ani.json`): eight programs and a Renderer, no
  model at all. Cast → Personality and Looks (one `ani-expert` type, two sets of slots), Relationships, Taste → Choice
  Points (collect 20) → Method Chooser → Director (one Logo film per scene, `TO C_NAME`, under 3,900 characters) →
  Renderer → Cast, plus Renderer → Cast “when data pass = false”. Two passes as in Ani (scene 1 chooses everyone once;
  later scenes re-choose only a stand-in like “Cinderella after”); settling, variety (glosug's medium = middle-most),
  deadly embrace, focus (Taste) apart from “explain {name}” (Choice Points); full reasons in `why` data. Knowledge in
  slots, cited in the seed's comment (dscrp.17, relate.22, glosug.41, cindy.46, disply.311, aninit.65; Looks is new).
  “Like Ani in 1978” = no Looks expert, so Ken's star, square, circle, triangle (inferred from `looksFrom`). Societies
  can carry one https `link` (the card links to toontalk.github.io/ani). Agrees with CP 29 on 17 of 28 compared
  choices (`tests/fixtures/cp29-cinderella.json`, floor 17, never tuned). Library: 31 types, the seven under their own
  heading in + Add an agent. Next: 1.15.0, a second example with AI voices (AI Animator, You, Reader, Narrator).
- The app is the single file `index.html` (829 KB): the `ak-model` script is DOM-free, and
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
- **Pebble Challenge** has six agents and one **Judge**: each challenge gives the Judge a
  library program (edits are kept per challenge). Seven challenges are marked easy, medium and
  hard, starting on *Mystery rows*, where the Judge keeps a secret row count and says only
  which rows need more or fewer. *A big grid* (11 by 14) is there to be hard for a vision model
  to count. Variants: Dot Counter instead of Eyes, and No Critic. 5 rounds.
- **Secret Number** (1.0.5): Keeper (gate program, a new secret from 1 to 100 every run),
  Guesser (model, no memory), and variants Notebook on (a program that remembers the range) and
  the Guesser remembers. 10 rounds. **Lost and Found** (1.0.5): Drawer → Renderer → Finder, then
  rules with word lists send it to four shelves; the Mystery Box keeps what no shelf took.
  The other five designs in `agent-kit-microworlds.md` wait for their features (collecting
  messages, per-agent models and a call counter, You as an agent).
- **Artifact builds** (1.12.0): `python tools/build_artifact.py` after any change writes `artifact/*.html` (keyless Claude
  and Gemini Nano only). Rebuild before committing a change to index.html or sv/index.html.
- **Translated copies** (1.10.1): `sv/index.html` is a Swedish snapshot made by coding agents from `sv/GLOSSARY.md`
  (see TRANSLATING.md). It does not follow later changes: remake it, or patch both files with one script and two
  phrase tables (as 1.11.0 did). Check copies with `AK_HTML=sv/index.html node tests/run.mjs "any language"`.
- **Speech** (1.9.0, `SpeechUI`): 🔊 Read aloud, a 🎤 by the focused text box, the Helper by voice; when listening
  can't work, the 🎤 explains the OS's own dictation (Windows + H …). Number words aren't moves yet.
- **Yours** (1.8.0): the top row is the microworlds, then your four most recent societies (`app.used`), then
  ☰ All yours (open, or tick and delete several). Import asks replace/keep both on a name clash; an example made twice asks.
- **Contracts** (1.5.0): a programmed agent's Gets / Says / Remembers (`Scenarios.contractOf`, or
  `agent.contract`) is shown above its pseudocode and given to the translator with the installed JS.
- **Examples** (＋ New society, and `examples/*.json`): **Evolution** (1.4.0, the Logo Evolution
  Lab's core), **Two Answers** (1.4.1, the Contemplative AI demo), and from 1.6.0 **Tic-Tac-Toe** (a Referee
  program keeps the board) and **Trail Mix Barter** (a Ledger program keeps the books), from Ken's earlier agent projects, and from
  1.7.0 **Artist and Critic** (Ken's own society, improved from its trace). AI agents can collect (`collect`, `wait`) and see several pictures at
  once; the Renderer's data carries `program` and `by`; round cards show every picture; the trace
  has a Family tree tab (`lineageOf`). Not yet run with a real model.
- **1.2.0: free play.** ＋ New society (from scratch or a copy); your own society's card and start
  are editable in Look inside; + Add an agent adds a new AI agent or a Renderer. Rules can come from
  You (at the start) and can wait for the end of the run (`when: "end"`). Story Chain has a Book and
  an Editor.
- **1.1.0: all nine microworlds** (Telephone, Pebble, Lost and Found, Story Chain, Secret Number,
  Three Eyes, Fool the Eyes, Small Helper Big Helper, Joke Workshop). New features: collecting
  programs (`collect`, `params.wait`, `input.messages`), You as an agent (`human`), and a call
  counter on the stage. None of the five new worlds has been run with a real model yet.
- **Scenarios follow settings** (`"=param"`, `{=param}`), so changing a slot doesn't break them.
  Programmed agents' trace turns can be saved as scenarios. Model agents that see pictures and
  count have a **test bench** (five pictures, N looks each, logged in the Workshop).
- **A learner can play** the round agent ("You be the Designer", "You be the Artist"): the run
  waits for their answer. The Logo in any trace entry can be changed, redrawn, and used as
  Telephone's drawing start.
- **More than one model** (1.0.6): Settings → More models. With two or more, each AI agent
  picks its model in the stage's Models row or its editor (`agent.model`); one model behaves as
  before. Settings is for grown-ups; learners choose among the models without it. Each microworld's
  card says which model suits it (`Seeds.MODEL_ADVICE`).
- **Models:** with a key, each provider starts on its cheapest model that sees pictures
  (Claude Haiku 4.5, Gemini 3.5 Flash-Lite, GPT-6 Luna; checked October 2026). Haiku 4.5 may
  retire after 15 October 2026; the Anthropic adapter then falls back to Sonnet 5.5.
- The trace shows the response (Markdown rendered, Logo highlighted, judges' pseudocode,
  data in plain words) and the rules by default; everything else is behind
  "Show full technical details".
- A microworld saved by an older version (each has its own, `SEED_VERSIONS`) is replaced by the new one at load. A banner offers
  to keep the old one as a copy. Other saved and imported societies have their JavaScript
  drawings and v1 instructions converted to Logo where that can be done safely.

**Tests:** `npm test` (or `node tests/run.mjs [filter]`). Latest:
**592 PASS, 0 FAIL · fingerprint `87bdca0b279e`** · model modules covered 19/19.
Swedish copy: `AK_HTML=sv/index.html node tests/run.mjs "any language"` 5/5; `library.test` 183/192 (the 9 look for
English words, two of them the Mini-Ani's “no …” scenario names); `node tests/leftovers.mjs sv/index.html` 25 sentences,
all from the scripted stand-ins.

## Acceptance criteria (§11)

| # | Status |
|---|---|
| 1 | Scripted stand-ins (tests only since 1.0.3): both microworlds end to end, deterministic (tested). OpenAI gpt-5.6-terra has been run live by the user and by Claude in Chrome (1.0.2). OpenAI with a key has been run live by the user (v1, before Logo). Keyless and Anthropic-key paths are tested against a fake fetch only. |
| 2 | Every model call keeps its system prompt, messages, exact request body and raw reply, behind "Show full technical details" (tested). |
| 3 | All 31 library programs pass all their scenarios; line maps are complete; highlighting works both ways (tested, including in the page). |
| 4 | Dot Counter isn't fooled by labels, and is fooled by pebbles drawn with CIRCLE (both tested). |
| 5 | Look inside shows only ordinary agents and rules (schema-validated in tests). |
| 6 | Editing a shipped agent's pseudocode translates it (a pretend canned variant) and reruns the scenarios (tested). |
| 7 | Forbidden identifiers are rejected and runaway programs stopped by the step counter (tested) and the Worker timeout (checked by hand). Runaway Logo and endless recursion are stopped too (tested). |
| 8 | Tampered JavaScript, hostile names, `__proto__` keys and trace secrets in imports are neutralized (tested). |
| 9 | Pretend mode refuses "looks happy"-style lines with a question (tested). **The live-model check is still manual.** |
| 10 | The jsdom suite reports a fingerprinted PASS count; this file is updated. |
| 11 | 829 KB, under 1 MB (tested); artifact builds 829 KB and 846 KB, under 950 KB, scripts under 545 KB. |

## Open issues

- **Logo with live models is untested.** Run both microworlds with a real model and read the
  Artist's and Designer's Logo: do they use REPEAT, quote their colors, stay on the picture?
  The Renderer's errors go back to the Artist ("Your program did not run."), so a model can
  fix its own mistakes, but how often it needs to is unknown.
- **Mystery rows and A big grid** are meant to be hard for strong models (the user found the
  v1 challenges too easy for gpt-5.6-terra). Check that they are: a good Designer should
  need two to four tries on Mystery rows, and Eyes should sometimes miscount the big grid.
- Keyless (claude.ai chat artifact) and Anthropic-key runs still need a first live session.
- **First Nano run (Claude in Chrome, 1.0.5):** Nano is fine for Secret Number, but fails
  Telephone and Lost and Found before anything can be studied; hence per-agent models.
- **Secret Number and Lost and Found are barely tested with real models.** The guess in the design:
  no memory wanders, memory does OK, the Notebook gets close to halving (about 7 guesses).
  The review's advice: stop here and try them with children before building more.
- **Stray lines don't count** (Ken, 1.0.7): Judges ignore them; Dot Counter skips lines and Eyes
  is told to. The seven microworld designs are in `agent-kit-microworlds.md`.
- In Fallback A, a heavy built-in call that never loops (for example `new Array(1e9).fill(0)`)
  can't be interrupted. The Worker path handles it.
- **Films with live models:** no model has been asked to write a film yet (`LOGO_HELP` doesn't mention WAIT, on
  purpose). A model that sees pictures sees only a film's last frame, and judges and Dot Counter read only the final
  picture's data: nothing in the kit can watch a film except a person. The trace's “Change it and see it drawn”
  preview, the drawing pad and “You be the Artist” show a film's last frame, not the film.
- The model-only-when-reachable refinement (design §3) was not built: the mini-Ani's AI agents go in a separate
  example, so it isn't needed. Ken may still want it for societies with switched-off AI agents.
- **The Mini-Ani (1.14.0)** has had no learner and no model near it (it needs none). Its knowledge edits are slot
  edits; changing its pseudocode beyond the slots asks the translator to rewrite 7–18 KB of JavaScript, which small
  models can't do. The Choice Points' trace shows “is waiting: 1 of 20 … 5 of 20” each scene, which reads oddly (it
  runs when nobody else has anything to say). The Cast's “The end.” blocks, so the stage marks the Cast ✗ after a good
  run (as Tic-Tac-Toe's Referee). “helps” is a word no expert knows in the default story, on purpose (a question asks
  the learner to fill Relationships' empty line). A default trace is 464 KB (50 KB gzipped). Not built yet: chapter
  marks on the film slider from the Director's `steps`; the AI voices (1.15.0). The revival's run-pass1 wasn't run
  (it may write there); the revival's SHA-256 manifest was unchanged before and after. films.test's “drawing the
  stage again doesn't restart the film” is timed: it failed once while headless Chrome ran alongside, and passes alone.
- Pretend-mode translation only knows the shipped pseudocode plus two variants. Anything else
  says it needs translation and keeps running the last good program, as §4.2 asks.

## Next steps

0. **The mini-Ani** (Ken, 9 October: a test of expressiveness, no children involved, so it needn't wait for the
   pilot): 1.14.0 programs only is done; next is 1.15.0, the AI voices as a second example (“Mini-Ani with AI voices”:
   AI Animator, You, Reader with its rule on, Narrator; pretend personas `animator` and `reader` for tests; a live run
   with keyless Claude and Gemini Nano), with notes on what the kit expressed easily, what needed new features, and
   what it couldn't express.
0. **The “next changes” document is done up to C** (1.5.0). **D, accessible dialogs** (focus, Tab trap, inert
   background, aria-labelledby, focus restored), comes after the pilot.
0. **Rewrite the guides after the first session with children** (Kay): they were brought up to date
   in 1.3.0, but “Sessions to try” and the misconceptions are guesses until then.
0. **Stop adding microworlds and try the kit with two or three children** (Claude in Chrome and
   the panel agree; all nine are built and none has met a child). Story Chain is a good first one:
   it works even on Gemini Nano. Watch whether the menu (nine microworlds, six examples, 31 library agents) is
   more than one child's project needs.

1. Live runs (see Open issues), then tune the Artist, Designer, Eyes and Critic instructions
   from what real models do.
2. Try it with two learners at one society, using scenario files.
3. Roadmap items (§10) start at v1.1 Fact Checker.

## How to check the look

A headless-Chrome CDP script (`shoot.mjs` in the build session's scratchpad) captured the key
screens; the in-app browser pane was flaky for screenshots. For a quick look, serve the folder
(`python -m http.server 8420`) and open `http://localhost:8420/`.
