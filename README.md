# Agent Kit — a construction kit for societies of agents

Learners (about 10 to 16) build **societies of agents**: language-model agents, small
**programmed agents** written in editable pseudocode, and a built-in **Renderer** that
turns Logo programs into pictures. Everything is a glass box: every prompt, every reply,
every program and every message between agents can be opened and read.

Two microworlds ship with it, and each is an ordinary saved society:

- **Telephone — “Where does it go?”** An Artist draws a sentence, a Describer describes the
  picture, and the description goes back to the Artist. Learners can add a Loop Spotter or a
  Tally from the library. *Iteration, fixed points and cycles, variance.*
- **Pebble Challenge — “Why did the Designer win?”** A Designer draws a challenge in pebbles,
  Eyes counts them, a programmed Judge lets the work through or blocks it, and a Critic says
  what to fix. Each challenge gives the one Judge its program. One click swaps Eyes for Dot
  Counter; another takes the Critic out. A learner can also play the Designer (or, in
  Telephone, the Artist) in the same game as the machine. The challenges run from easy to hard: in
  *Mystery rows* the Judge keeps a secret that only the Critic's notes reveal. *Critics can be
  gamed; perception versus judgment.*

## Run it

- **Anywhere:** open `index.html` in a browser, then choose a model in ⚙️ Settings. On desktop
  Chrome (138 or later), **Gemini Nano** is built in: free, and nothing leaves the computer.
- **GitHub Pages:** https://toontalk.github.io/agent-construction-kit/ — connect Claude,
  Gemini or OpenAI with your own key in ⚙️ Settings. Each starts on its provider's cheapest
  model that can see pictures (Claude Haiku 4.5, Gemini 3.5 Flash-Lite, GPT-6 Luna).
- **Inside a claude.ai chat:** paste the file into a chat and ask Claude to show it as an
  artifact. There the kit uses Claude **without a key**, through your claude.ai sign-in.

The whole app is the one file `index.html` (vanilla JavaScript, no build step).

## Test it

```bash
npm install
npm test
```

The suite runs the model layer and the whole page under jsdom and prints a PASS count and a
fingerprint (a hash of the test names). If `jsdom` isn't installed next to the repo, the
runner also looks in the global npm folder (`npm install -g jsdom@25`).

## Where things are

- `index.html` — the app. The `ak-model` script is the DOM-free model layer (message bus,
  rule engine, programmed-agent runtime, Logo interpreter, translator client, scenario
  runner, adapters); the `ak-ui` script is the interface.
- `tests/` — the fingerprinted jsdom suite.
- `SPEC.md` — the specification, with the build decisions and later changes in its §14.
- `HANDOFF.md` — the current state, test fingerprint, open issues and next steps.
