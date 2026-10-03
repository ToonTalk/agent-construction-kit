# Making Agent Kit in another language

Agent Kit is one file, `index.html`. A coding agent (Claude Code, Codex, Cursor, and so on) can make a translated
copy of it, for example `de/index.html` for German. The Swedish copy in `sv/` was made this way, as a test.

## For people: what to do

1. Get the project: download it from <https://github.com/ToonTalk/agent-construction-kit> (Code → Download ZIP),
   or clone it, and open the folder in your coding agent.
2. Tell your coding agent something like:

   > Make a **German** copy of Agent Kit in a folder called **de/**. Follow TRANSLATING.md in this project.

3. When it has finished, open `de/index.html` in a browser and try it. If a word or a sentence reads badly, tell
   the coding agent which one, and what it should be.

4. **Please share it:** [raise an issue on GitHub](https://github.com/ToonTalk/agent-construction-kit/issues/new)
   saying which language you made, with your folder (its `index.html` and `GLOSSARY.md`) attached or linked, so it
   can be added to the main release and listed in Settings → Other languages.

It takes a coding agent an hour or so of work, and the copy is a snapshot: when Agent Kit changes, ask for the
copy to be made again (the glossary it wrote, `de/GLOSSARY.md`, keeps the new copy's words the same as before).

## For the coding agent: how to do it

The copy must behave exactly like `index.html`; only the language changes. Most of the work is translation, but a
few words are *data that programs and rules depend on*, so they must be translated consistently everywhere.

### 1. Write a glossary first: `<lang>/GLOSSARY.md`
Start from `sv/GLOSSARY.md` (the Swedish one): it lists everything that must be decided once and used everywhere.
- The UI terms: Run, Step, Stop, Reset, Look inside, Trace, Helper, Settings, rule, round, agent, society …
- The titles of the microworlds and examples, and every agent's name.
- **Word lists that rules and programs share** (these break silently if they differ):
  - Lost and Found: the shelves' rule words, and the same 16 words in the Mystery Box's params and pseudocode.
  - Trail Mix Barter: the ingredients; the Ledger's yes/no words and its “nobody” (to pass); the start text the
    Ledger's scenario uses.
  - Tic-Tac-Toe: the Referee's board rows and messages (the Rival is told what they look like); its start text.
  - Secret Number: what the Keeper says (higher / lower / yes!), which the Notebook and the Guesser read.
  - Artist and Critic: the score format “7/10” stays (rules look for “/10”).
  - **The learner's name** (“You”): the engine names the start's sender “You”; the Escalator program checks
    `input.from === "You"`, and the human agents in Joke Workshop and Tic-Tac-Toe are named “You”. All must match.
  - Vote and the Fool the Eyes Referee compare `input.from` with the Dot Counter's name (`params.truth`).
- What must **not** change: identifiers, object keys, data field names (`rows`, `pass`, `score` …), ids,
  `typeId`s, `data-act` / `data-bind` values, CSS classes, Logo commands (FORWARD, REPEAT …) and Logo colour
  names (SETPENCOLOR "red), model ids, URLs, JSON keys.

### 2. Translate, part by part, keeping the line count
`index.html` is about 660 KB, so split it at its `/* ===== SECTION: … */` markers into parts of 40–120 KB and
translate them (in parallel if you can), **keeping every part's line count exactly the same**, then join them.
Translate with exact string replacements (a script that asserts each old string occurs once), never by rewriting
a whole part from memory. Leave the PRETEND PERSONAS section in English (they are test doubles).

What to translate: every visible string (buttons, hints, toasts, dialogs, `title` and `aria-label` attributes,
error messages, both guides, the Helper's text), the microworlds' and examples' titles, questions, intros, starts
and agents' instructions (they are prompts: translated prompts make the models answer in the language), the
library programs' pseudocode, what they `say`, and their scenarios' names, inputs and expected outputs.

Things that need more than translation:
- `<html lang="en">` → the language's code; the exported trace page's `lang` too. Speech uses it.
- `LS_KEY = "agentkit.v1"` → e.g. `"agentkit.v1.de"`, so the copies never share saved work in one browser.
- The safety PREAMBLE: add “Always write in <language>.”; the Helper's and the Translator's system prompts:
  answer the learner in the language (the Translator must still reply in its JSON format, and keep param names
  ASCII).
- `LANGUAGES` (next to `PAGE_LANG`): add the new language, e.g. `{ code: "de", name: "Deutsch", path: "de/" }`,
  so Settings → Other languages links to it (the main release adds it too).
- `SAY`, just before `bubbleHTML`: the sentences Read aloud speaks for a message (“Round 4. Renderer informed Critic,
  who said: 10 out of 10 …”), including the word for “out of”.
- Read aloud only speaks with a voice for the page's language; the “no voice” dialog says how to add one.
- Plurals: `plural(n, "agent")` adds an English “s”. Make `util.plural` accept `"singular|plural"`
  (`plural(2, "agent|Agenten")`) and use that form everywhere; replace hand-made English plurals.
- Programs that read words (the Ledger's yes/no, its ingredient matching, `parseSlotText`'s “half”, “yes”/“no”)
  must read the new language's words; keep the English ones working too where it is harmless.
- Regexes that match words in the UI (e.g. the contract's `Gets|Says|Remembers`) must match the translated words;
  JavaScript's `\w` doesn't match letters like å or ü.
- In each library program keep the same number of `pseudo` and `code` lines, so its `lineMap` stays right; a
  slot whose text is a word (`{yes}`, `{X}`) must change in the pseudocode, the slot's `text` and the param.

### 3. Check it
Run these from the project folder (Node and the global `jsdom` package are needed):

```
AK_HTML=de/index.html node tests/run.mjs "any language"
AK_HTML=de/index.html node tests/run.mjs library.test
node tests/leftovers.mjs de/index.html
```

- **“any language”** must pass: the page boots with no errors, every microworld and example is sound, every
  programmed agent passes its own scenarios, every society runs with a neutral stand-in model, and every panel opens.
- **library.test**: everything but a few tests that look for English words must pass (static checks, scenarios,
  line maps, slots, ready-made translations).
- **leftovers** lists sentences that still look English; only the scripted stand-ins' replies should remain.
- The rest of the English test suite looks for English words and the English stand-ins, so many of its tests fail
  on a translated copy; that is expected.
- Finally, check that every button name the guides and the Helper quote exists in the interface, and that the
  guides quote the microworlds' questions exactly as the microworlds ask them.

### Known limits
- Logo commands and colour names stay English (the turtle language is English).
- Gemini Nano is asked for English text; whether it handles the language well depends on Chrome.
- The scripted stand-ins only understand English, so a copy is for use with a real model.
- The copy doesn't follow later changes to `index.html` by itself: make it again.
