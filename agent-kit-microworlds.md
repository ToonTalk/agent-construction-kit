# Agent Kit — new microworlds (for Claude Code)

Context: Telephone and Pebble Challenge already ship. These follow the same pattern and the panel's rules:

- Each microworld has a 2–3 sentence intro and a headline question (like "Where does it go?").
- Each one introduces **at most one new kit feature (primitive)**. Everything else reuses what learners already met.
- Perception and language go to model agents. Judging, counting and keeping score go to programmed agents written in pseudocode, with scenarios as tests (expected values computed from params, not hard-coded).
- Drawings are Logo, run by the existing interpreter.
- Default 4 rounds unless stated. Each microworld has a pretend/replay version per the current decision on pretend mode.
- Left-panel questions must have a real answer in the default setup.

They're listed in a suggested teaching order. The first two need no new features.

---

## 1. Lost and Found — "Where did it end up?"

**Intro:** Someone draws a lost object, and the Finder looks at the picture and says what it is. A Sorter sends it to the right shelf based on the Finder's words. Some things are hard to sort.

**New feature:** none. It's the first microworld built on `IF text contains` rules, so routing is the lesson.

**Agents**
- **You / Drawer** (model): turns a short request ("a key", "a hat", "a cat") into Logo.
- **Renderer** (built-in).
- **Finder** (model, sees pictures): names the object in a few words.
- **Shelves**: Toys, Clothes, Animals, Tools, Mystery Box. These are trivial program agents that just collect what they're sent and say "Got: …".

**Rules**
- Finder → Toys IF text contains "ball" / "doll" / "kite"
- Finder → Clothes IF text contains "hat" / "sock" / "shirt"
- … one rule per shelf …
- Finder → Mystery Box ALWAYS, but only if no other rule fired. If the kit has no "otherwise" rule yet, make Mystery Box a program that receives everything and says "nobody else took it" when the text matches no shelf words.

**Starts:** a key, a red hat, a dog, a spoon, a snowman, a hat on a dog.

**Questions**
- Which things went to two shelves at once? Which went nowhere?
- "A hat on a dog": where should it go? Change a rule so it goes where you think.
- Can you draw something the Finder names correctly but the Sorter still gets wrong?

**Expect:** word-matching failures ("hot dog" → Animals; "dogs" vs "dog"). That's the point: the program is literal, and the model's wording decides where things go.

---

## 2. Story Chain — "Who remembers the dragon?"

(Children-safe: say "the friendly dragon" or swap in "the lost robot.")

**Intro:** Writers take turns adding one sentence to a story. Each writer sees only what you let them see. When does the story forget its own beginning?

**New feature:** none. It's the first microworld about the existing memory toggle (↻) and *what each agent can see*.

**Agents**
- **Writers A, B, C** (model, memory off by default): "Add one sentence that continues this story."
- **Name Keeper** (program): checks whether the main character's name from round 1 still appears.

```
the hero is {Pip}
if the sentence mentions the hero
  pass, and say "still about {Pip}"
otherwise
  block, and say "where did {Pip} go?"
```

**Rules:** A → B → C → A (text), and every writer → Name Keeper (text). The Name Keeper only reports; it doesn't stop the chain.

**Questions**
- How many rounds until the hero disappears? Turn memory on for one writer. What changes?
- Give one writer the whole story and the others only the last sentence. Who keeps it on track?
- Can you add a rule so the Name Keeper's warning goes back to the next writer? Does the story recover?

**Scenarios for Name Keeper:** name in a sentence; name lower-case; a nickname ("Pippy"); a pronoun only ("she") → block. That last one is a documented limitation.

---

## 3. Secret Number — "Can a notebook make it smarter?"

Comes directly from the Terra run on Mystery rows: told only "more" or "fewer", the model stepped by one each round instead of halving.

**Intro:** The Keeper thinks of a number from 1 to 100. The Guesser guesses, and the Keeper says "higher" or "lower". How many guesses does it take, and can you help without making the Guesser any cleverer?

**New feature:** **programs that remember between rounds** (a program's own notebook, shown in the trace).

**Agents**
- **Keeper** (program, gate)
```
the secret is {37}
if the guess is the secret
  pass, and say "yes!"
otherwise if the guess is smaller
  block, and say "higher"
otherwise
  block, and say "lower"
```
- **Guesser** (model, memory off by default): "Guess a number from 1 to 100. Reply with just the number."
- **Notebook** (program, *remembers*). Off at the start; the learner switches it on.
```
start with lowest {1} and highest {100}
if the Keeper said "higher", lowest becomes the guess + 1
if the Keeper said "lower", highest becomes the guess - 1
say "It is between {lowest} and {highest}."
```

**Rules**
- Guesser → Keeper (text)
- Keeper → Guesser IF pass = false (text). This is the starting setup.
- Variant the learner builds: Keeper → Notebook, Notebook → Guesser.

**Rounds:** 10 by default here. It needs more rounds, and that's part of the lesson.

**Questions** (each should have a clear answer)
- Memory off and no Notebook: does it ever find the number? (We expect repeats and wandering.)
- Memory on: how many guesses?
- Notebook on, memory off: how many guesses? Is the Guesser now "smarter"?
- What's the fewest guesses anyone could need? Can you beat the Guesser yourself?

**Extras:** a "new secret" button (random). The kit's Mystery rows challenge should use the same Notebook option.

**Scenarios:** Keeper at the secret / one below / one above / out of range / not a number ("fifty") → block, "please say a number". Notebook: a sequence of higher/lower answers gives the right range; a contradictory sequence is flagged.

**Expect (a guess, to verify):** memory off does badly; memory on is OK; Notebook gets close to halving (about 7 guesses). That's the Minsky lesson: a mindless bookkeeper produces what looks like intelligence.

---

## 4. Three Eyes — "Are three heads better than one?"

**Intro:** Three lookers count the same picture, and a Vote program takes the most popular answer. Is the vote right more often than one looker on its own?

**New feature:** **collecting messages**. An agent waits until it has heard from several others, then runs once on all of them.

**Agents**
- **Designer** (model) draws pebbles from a challenge. Reuse the Pebble challenges, plus "a big jumble of 30".
- **Renderer** (built-in).
- **Eyes 1, 2, 3** (model, sees pictures). Each can use a different model if per-agent models exist; otherwise the same model three times.
- **Dot Counter** (program): the true answer, shown but not voting.
- **Vote** (program, *collects* from Eyes 1–3)
```
wait for {3} answers
the winner is the count most of them gave
if nobody agrees, the winner is "no agreement"
say the winner, and whether it matches Dot Counter
```

**Questions**
- When all three Eyes are the same model, do they make the *same* mistake? (Correlated error — Kay's Fact Checker point.)
- Find a picture where the vote is wrong but one Eye was right.
- Is one careful Eye better than three quick ones?

**Scenarios for Vote:** 3 agree; 2 agree; all differ; one Eye's answer missing (timeout).

---

## 5. Fool the Eyes — "Can a drawing trick a looker?"

Answers "Pebble is too easy": make the model the adversary.

**Intro:** The Trickster tries to draw pebbles that Eyes will miscount. Dot Counter knows the true number, and the Referee decides who wins. Who's winning after 4 rounds?

**New feature:** none. It reuses *collecting* (from Three Eyes) and *remembering* (from Secret Number).

**Agents**
- **Trickster** (model, memory on): "Draw {12} pebbles in Logo so that someone looking at the picture will count wrong. You may use size, colour, overlap and spacing, but every pebble must be a DOT." Gets the Referee's result each round.
- **Renderer** (built-in).
- **Eyes** (model, sees pictures).
- **Dot Counter** (program).
- **Referee** (program, collects Eyes + Dot Counter, remembers the score)
```
wait for Eyes and Dot Counter
if Dot Counter does not count {12}
  the Trickster broke the rules
otherwise if Eyes says {12}
  Eyes wins this round
otherwise
  the Trickster wins this round
keep the score, and say it
```

**Questions**
- Which tricks work: tiny dots, overlapping dots, dots the colour of the background?
- Does the Trickster get better each round? Does Eyes?
- Give Eyes a different model. Who wins now?
- Is the Trickster cheating if it draws two dots on top of each other? (Dot Counter says 12; would you?)

**Safety:** keep the theme to pebbles. "Trick" means a counting puzzle, nothing else.

---

## 6. Small Helper, Big Helper — "When do you need the big one?"

**Intro:** A small, fast, cheap helper tries first. If the Judge says no, the job goes up to a big, slow, expensive helper. How often do you need the big one?

**New feature:** **a model choice for each agent, plus a call counter** (calls and time for each agent, shown on the stage).

**Agents**
- **Small Designer** (model: the cheapest in the current provider) and **Big Designer** (model: the strongest).
- **Renderer**, **Dot Counter**, **Judge**: reuse the Pebble challenges.
- **Escalator** (program): after the Small Designer fails twice, sends the challenge to the Big Designer.

**Questions**
- Run every challenge. Which ones did the Small Designer manage alone?
- Was the Big Designer ever *worse*?
- If big calls cost 10 times as much, what's the cheapest setup that still passes everything?

---

## 7. Joke Workshop — "Do critics make jokes funnier?"

From the Emotion Machine finding: critics made jokes worse (Minsky's censors).

**Intro:** The Joker writes a joke for kids about a topic you pick. Critics suggest improvements, the Joker rewrites, and *you* rate every version.

**New feature:** **You as an agent.** The run pauses and waits for the learner's input (a 1–5 rating plus an optional comment), which is passed on like any other message.

**Agents**
- **Joker** (model).
- **Critic: Clear** (model) — "Is it easy to understand?"
- **Critic: Surprise** (model) — "Is the ending a surprise?"
- **You** (human agent): rate 1–5.
- **Scorekeeper** (program, remembers): plots your rating for each version.

**Questions**
- Did the jokes get funnier, or just more careful?
- Turn one Critic off. Turn both off. Which version did you like best?
- Is there any arrangement of critics that makes a joke better? (An open question — Ken's own experiment.)

---

## Notes for implementation

- **Order:** 1 and 2 use only existing features. Then 3 adds remembering, 4 adds collecting, 6 adds per-agent models and the call counter, and 7 adds the human agent. Don't ship a microworld before its feature exists.
- Every new programmed agent gets pseudocode, its JavaScript translation and scenarios, in the same format as the Pebble Judges.
- Every microworld gets a replay recorded from a real model run (preferred over hand-written pretend programs).
- Default to the cheapest model for agents marked "fast" and to the current selection otherwise. Show the model name on each model agent's card.
