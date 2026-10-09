# What the kit can express

*For Ken, 9 October 2026, after the Mini-Ani (1.13.0 to 1.15.0) and ten small experiments built to see which
kinds of task fit Agent Kit. Every run here used the kit's own model layer with programs and the scripted
stand-ins for AI agents; no live model was involved, so these notes are about structure, not about how well a
model plays its part.*

## The short answer

Agent Kit is good at **small, fixed societies that take turns**: a handful to about a dozen agents passing
messages along rules you can read, where programs do the bookkeeping, checking, scoring and settling, and models
do the language and the looking. Make-check-fix loops, moderated conversations and votes, games and markets with a
referee or a ledger, an agent acting in a world that answers back, and expert systems whose knowledge is short
word lists all fit with no new features, and then the trace explains every step. Shared memory, many identical
agents and search spread across agents (blackboards, flocks, backtracking) can be built, through a hub agent or
through memory, but they run into the kit's limits: about 25 messages a round, 20 collected messages, 40 agents.
The kit cannot express a society that changes while it runs (new agents, new wiring, one agent editing another's
program), an agent that asks another a question and waits for the answer, real time or parallelism, or an agent
that watches a film.

## The model everything depends on

- **An agent knows only what it is sent.** A model's memory is its own conversation; a program's memory is what it
  returned as `memory` last time. No agent can read another's memory, slots or instructions.
- **Rules route.** When an agent responds (always, or if its words contain a word, or if a data field compares
  with a value, or when the run ends), its words, data or picture go to one named agent. Rules are fixed for the
  whole run; switches change them only between runs. A gate (`pass: false`) holds an agent's "always" rules.
- **One message at a time,** first in, first out, in rule order. Model calls happen one after another. There is no
  clock: a program that uses `Date` is refused ("they can't reach the clock").
- **A round is a visit to the round agent,** and the round limit (at most 50) is also the circle guard: a run stops
  after 25 messages a round plus 50, and can't carry on from that stop.
- **Collecting:** an agent waits for N messages (at most 20), or runs on what it has when nothing else is left.
- **Pictures are Logo,** run by the Renderer, which also returns data (dots, lines, labels) and, since 1.13.0,
  films (`WAIT`).
- **Limits:** 100,000 steps per program run; a program says at most 2,000 characters; data strings are cut at
  4,000 characters and objects at 200 keys; import keeps 40 agents and 100 rules. The trace grows by about 1 KB
  a message (8 queens: 239 KB for 220 messages).

## The experiments

Each is the smallest society that shows whether the task fits. The files are in the build session's scratchpad
(`express/`): `kit.mjs` loads the model layer as the tests do, and `e1` to `e10` are the experiments.

| | Task | Smallest society | What happened | Fit |
|---|---|---|---|---|
| 1 | Translate, check, fix | Glossary Checker (program, gate, round agent) between a Translator and a Fixer (AI) | The Checker caught "runda" for "round"; the Fixer's "omgång" passed in 5 messages. A Fixer that never learns is stopped by the round limit, which acts as patience. | Natural |
| 2 | Blackboard (a 4 by 4 Sudoku) | Board (program, memory, collects 3) and Row, Column and Box experts (one program, three slots) | Solved in 3 cycles, 14 messages; each expert alone gets stuck with 6, 7 or 6 blanks left. | Workaround |
| 3 | Debate and jury | Moderator (program, routes by `next`), Pro and Con (AI, remember), three Jurors (AI, output field), Verdict (collects 3) | Four speeches, a split jury (1 to 2), 13 agents' turns. At first Pro gave its second speech without ever hearing Con: "remembers the run" means its own conversation, so the Moderator had to pass the last speech on. | Natural |
| 4 | Eight queens (backtracking) | Eight row agents (one program, eight copies, 16 rules); going back is a message back up, and each row remembers its last column | Solved in 220 messages. With the usual round limit of 4 it was stopped at 150 as "circles", because Row 1, the round agent, is visited only once. As one program: the first solution in 4,313 steps, all 92 in 80,258; all of 10 queens is over the 100,000-step limit. | Workaround as a society; natural as one program |
| 5 | Auction | Auctioneer (program, collects 3) and three Bidders (AI, a private value in each one's instructions, output field) | Ascending: six prices, 38 messages, sold to Cy (worth 75) for 65, just over Ada's 62. Sealed bids, second price: 6 messages. | Natural |
| 6 | A flock | N Boids (one program, N copies) and a World (program, collects N) that writes a film at the end | Up to 20 boids work, with care; see below. | Workaround to 20; cannot beyond |
| 7 | Plan and replan | Planner (program, its own map, breadth-first) and World (program, the true maze), then the Renderer | Three plans (12, 15 and 17 steps), arrived after 34 steps, the walk a film of 35 frames. An AI planner with an output field `moves` works the same way. | Natural |
| 8 | A game against a person | Nim Player (program, memory, routes by `next`) and You, then the Renderer | The program wins; "two" isn't read as a move. | Natural |
| 9a | Learning | Teacher (program) and Learner (a perceptron's weights in memory) | AND learned after 22 examples; XOR never (40 examples, 37 mistakes): Minsky and Papert's point. | Natural |
| 9b | One agent changing another's program | Tester, Plural Maker (a table of endings in memory), Coach (AI, output fields) | The Coach's rules fixed baby, pony, leaf and wolf; then its too-general rule ("" becomes "es") turned dog into "doges", and the trace shows the rule used. | Workaround |
| 10 | Workers, and a tool | Splitter, three Workers (one program, slot {part}), Reducer (collects 3); a Thinker (AI) that writes "CALC: 37 * 41", which a rule sends to a Calculator program | Both work (7 and 3 messages). With 4 parts and 3 workers the fourth part was silently dropped. | Natural with a fixed pool |

**The flock in numbers** (10 ticks, round limit 11). A tick costs 2N+1 messages. 4 boids: 83 messages;
12: 243; 16: 323 of the 325 allowed; 20: stopped at the cap after 9 ticks. With the round limit raised to 50, 20
boids finish (403 messages, a 651 KB trace, 1.8 seconds in Chrome at instant speed, about 2.4 minutes at normal
speed); 21 break, because the World collects at most 20, so the 21st answer arrives late and the ticks fall out of
step. Built by hand it is 20 duplicates (duplicating doesn't copy rules) and 40 rules, and a change to the boid
program has to be made 20 times. The stage stayed readable at 22 agents, but the trace is mostly "World is
waiting: 7 of 20". The same flock as one program moves 60 boids in 34,161 steps, but its film is a Logo string,
cut at 4,000 characters: 20 boids for 10 ticks fit (2,449 characters), 40 don't.

## What fits naturally

- **Make, check, fix.** A producer, a program that checks (a gate), and a loop back through a critic or fixer,
  with the round limit as patience: Pebble Challenge, Artist and Critic, the Mini-Ani's Reader; experiment 1.
- **Turn-taking with a moderator, and votes.** A program keeps the turns and the record and routes by a data
  field; a collector counts: Story Chain (Book, Editor), Joke Workshop, Three Eyes; experiment 3. What each agent
  knows is exactly what the rules send it, which is Story Chain's lesson.
- **Referees, ledgers and keepers around models.** What must stay true (a board, the books, a secret) lives in a
  program, and models only propose: Tic-Tac-Toe, Trail Mix Barter, Secret Number; experiments 5 and 8. Private
  information is natural too: a bidder's value is in its own instructions, and nobody else sees it.
- **An agent in a world.** A world program answers actions, and a planner (a program, or a model with output
  fields) replans from what it hears: experiment 7.
- **Ensembles, escalation, evolution.** Three Eyes' Vote, Small Helper Big Helper's Escalator, and Evolution's
  Mutators, Critic and Selector, where Logo programs travel in messages as the genome.
- **Learning as memory:** Secret Number's Notebook, experiment 9a.
- **A fixed set of workers, and a model using a program as a tool:** experiment 10.
- **Expert systems with short knowledge.** The Mini-Ani: one rule for each arrow of Ani's diagram, knowledge as
  slots (`{shy} suggests {a bit slow, …}`, so "replace the knowledge base" is a slot edit), the settling in one
  program, every choice explained in words, each scene a Logo film.

What makes these natural is the same each time: a fixed cast, one message at a time, and programs that are
deterministic, so scenarios can specify them and a run can be explained.

## What needs a workaround

- **Shared memory** becomes a hub: the Board is an agent that pushes the whole board to every expert, and experts
  must answer even with nothing to add (experiment 2). A collector also can't be the round agent: it counts a
  round for every message it collects (rounds 1, 4 and 7 for three ticks).
- **Search across agents** becomes continuation through memory: a row remembers where it was and resumes when a
  "back up" message comes (experiment 4). It works, but the message cap is tied to the round limit, so the round
  limit has to be raised for a reason that has nothing to do with rounds.
- **Many identical agents** are copies, wired one by one (experiment 6).
- **"Until nobody else speaks"** is written as collecting 20, the maximum, and relies on the flush when nothing
  is left to deliver (the Mini-Ani's Choice Points; its trace says "waiting 1 of 20"). The Narrator's "speak once
  at the end" is the same flush.
- **"Otherwise"** routing needs a catch-all program (Lost and Found's Mystery Box): no rule says "if no other rule
  fired". Testing whether a field is there takes `!= ""`.
- **A program that another agent changes** has to be written as an interpreter of a table in its memory
  (experiment 9b). It works and is instructive, since the over-general rule shows in the trace.
- **Ending a story** uses `pass: false`, so the stage marks a red ✗ on the Cast after a good run.
- **Budgets against the limits:** the Mini-Ani's Director keeps its Logo under 3,900 characters, the reasons are
  nested to stay under 200 keys, the Choice Points trim what they say to 2,000 characters.
- **Words shared by programs and model prompts** are copied by hand into the prompts, and go stale silently when
  a learner edits a slot.

## What doesn't fit, and why

- **Asking and waiting.** An agent can't ask another a question in the middle of its work and carry on with the
  answer: each turn runs to the end and sends messages on. Ani's choice points ask each other ("is A faster?"),
  so the Mini-Ani had to put all of the choosing into one program. A model's own conversation (experiment 10's
  tool) and memory (experiment 4) come close, but only by splitting the work at each question.
- **A society that changes as it runs.** No agent can be created, no rule switched or added, no program or
  instruction edited by another agent: the engine reads agents and rules during a run and never writes them. So
  there is no worker for each item (experiment 10 dropped the fourth part), no spawned helpers, and no roadmap
  "rewrite" or "suppress" except as data or as a gate placed in the path beforehand.
- **Time and parallelism.** No clock, one delivery at a time in a fixed order, one model call at a time.
  "Whoever answers first wins", a timeout as a signal, agents acting at their own pace, Ani's parallel subscenes:
  none of these can be said. A film's time lives inside one Logo program.
- **Watching.** Only a person can watch a film; a model that sees pictures gets its last frame, and a program
  gets the number of frames.
- **Large populations and large knowledge.** More than 20 answers a step, more than 40 agents, more than 100,000
  steps or 4,000 characters in a string. Structured knowledge (Ani's typed descriptors with prerequisites and
  best-whens) becomes JavaScript rather than slots a learner can edit.

## What the mini-Ani taught

Ani was a society of small experts in 1978: descriptors suggested, choice points argued and settled, methods and
the display made the film. The kit held the society's shape well: Ani's diagram became agents and one rule per
arrow, a scene became a round, the knowledge became slots, the settling happened in the open with every reason
kept, and WAIT gave it films. The AI voices joined at the kit's existing seam, the message (models send words,
programs send data), weighed in a slot beside "own word 3". What it couldn't hold was Ani's fine-grained
conversation: choice points that ask each other and wait, knowledge with structure, and time with parallel
parts. Those went inside programs (the Choice Points and the Director, 17 to 18.5 KB of JavaScript each, near the
translator's 20,000-character cap), where the trace shows the conclusion and its reasons but not the argument as
it happened. The general lesson: the kit is at its best when the society's structure is the point and each
agent's job is small, and at its worst when the intelligence is in many quick exchanges between agents.

## The smallest changes that would widen what fits

Smallest first, with the experiment each would have helped:

1. **A collecting round agent counts one round per run, not one per message it collects** (2, 5). A bug-sized fix.
2. **Two rule conditions:** "if no other rule fired" and "if its data has this field" (Lost and Found's Mystery
   Box; 8, where the Renderer was sent a refusal with nothing to draw).
3. **A message limit of its own,** shown on the stage and able to carry on, instead of 25 per round tied to the
   round limit (4 was stopped at 150 messages as "circles"; 6 at 325).
4. **"Collect until nobody else speaks" and "collect until the run ends"** as named choices, instead of wait 20
   (the Mini-Ani's Choice Points and Narrator; 2).
5. **Another agent's slots inside a model's instructions,** filled in at each call (the Mini-Ani's AI voices,
   whose word lists are copies).
6. **Groups:** copies that share one program, edited once, a rule to "every Boid", and "wait for everyone this
   step" (6: 20 copies and 40 rules by hand).
7. **A film's frames as data for programs, and as a strip of frames for a model that sees pictures** (the
   Mini-Ani: only a person can watch).
8. **Ask and wait:** a program may ask another program and get its answer within the same turn, shown in the
   trace as a question and an answer (Ani's choice points; 4).
9. **The roadmap's rewrite:** an agent may change another agent's slots during a run, shown in the trace (9b
   without the table trick).
10. **Spawning agents, and real time,** are the largest, and both would change what a trace means; they may be
    better left out.

Two experiments might be worth shipping as examples, since neither needs a model: **9a**, a perceptron learning
AND and failing at XOR, and **7**, plan and replan, with the walk as a film. Neither has been added.
