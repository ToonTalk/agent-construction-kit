# Agent Kit — a construction kit for societies of agents

Learners (about 10 to 16) build **societies of agents**: language-model agents, small
**programmed agents** written in editable pseudocode, and a built-in **Renderer** that
turns Logo programs into pictures. Everything is a glass box: every prompt, every reply,
every program and every message between agents can be opened and read.

Nine microworlds ship with it, in teaching order (words before pictures; any model, even Gemini
Nano, before the ones that need a strong one), and each is an ordinary saved society:

- **Story Chain — “Who remembers the dragon?”** Three writers add a sentence each; a Name Keeper
  checks the hero is still there; a Book keeps every sentence and, when the run ends, an Editor
  tells it again. *What each agent can see and remember; a record versus a reconstruction.*
- **Secret Number — “Can a notebook make it smarter?”** The Keeper keeps a number from 1 to 100
  and says higher or lower; the Guesser has no memory. Switch on a Notebook program that keeps
  the clues, or let the Guesser remember. *Memory and bookkeeping versus cleverness.*
- **Lost and Found — “Where did it end up?”** A Drawer draws a lost thing, the Finder names it,
  and rules send it to a shelf by the words it used. *Routing by words; literal programs.*
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
- **Three Eyes — “Are three heads better than one?”** Three lookers count the same picture and a
  Vote program, which collects all their answers, takes the most popular. *Correlated error.*
- **Fool the Eyes — “Can a drawing trick a looker?”** A Trickster draws pebbles to fool Eyes; a
  Referee keeps score. *A model as the adversary.*
- **Joke Workshop — “Do critics make jokes funnier?”** A Joker writes, Critics suggest, and you
  rate every version. *Do critics help? The learner as an agent.*
- **Small Helper, Big Helper — “When do you need the big one?”** A cheap model tries first; an
  Escalator hands the job to a strong one when it fails. It needs two models. *Cost against capability.*

**Free play:** “＋ New society” starts a society of your own, from scratch or as a copy of a
microworld. Give it a name, a question and an introduction, add AI agents and library programs, and
wire them with rules. A rule can send the start to several agents, or wait until the run ends.

Settings can hold more than one model. Then each AI agent can use the one that suits its job:
Gemini Nano (free, in Chrome) where a small model is enough, and a stronger one for drawing and
seeing pictures.

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
