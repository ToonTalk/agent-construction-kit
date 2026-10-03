# Summary: A simulated panel on children, AI and construction kits

*Claude chat, 30 Sep – 1 Oct 2026 (updated 3 Oct 2026 with links to the posts discussed and what has been built since). Participants: Ken Kahn (himself) and simulated voices of Seymour Papert, Marvin Minsky, Lev Vygotsky and Alan Kay, with Claude adding out-of-character notes.*

## Setup
- **Setting:** today. Vygotsky is kept as a 1930s mind encountering computers for the first time.
- **Format:** each round, Ken contributed a post or a question, and the panel responded.
- **Fidelity:** voices were reconstructed from published positions. Claude was more careful with Kay, who is alive, and flagged its own extrapolations.

## How the conversation moved

### 1. Sisi's Unicorn World (12 exchanges with Claude Fable 5.1)
*Post: [What a 5-year old created after 12 exchanges with Claude Fable 5.1](https://docs.google.com/document/d/1CLVuUH5dKUcEvRy8GoUeHZwqHY4Hg3cGFPy_BQGyPwI/edit?usp=sharing)*

- **Papert:** she ignored Claude's star-collecting mechanic and made the world her own. But who owns the *idea* when "chicks grow in three days" simply happens?
- **Vygotsky:** she is legislating an imaginary world with rules, the most advanced play at five. But a fully rendered horse removes the "pivot," the resistance that makes imagination work.
- **Minsky:** she specified a society of agents defined by their relationships. Who noticed the bugs?
- **Kay:** she commissioned it; there are 1,202 lines she can't read.
- **Ken's challenge:** why would a simpler, better-understood simulation be better, given that she enjoyed the rich one?
  - Papert answered with outcome versus process descriptions.
  - Minsky argued that understanding means having more than one representation.
  - Kay said richness was mostly Claude's.
  - Vygotsky said play is the leading activity at this age.
- **Turning point:** Vygotsky observed that a listener who understands too well removes the pressure to be explicit. The live question became an obtuse machine versus a transparent one.
- **On choice:** pleasure doesn't define play (Vygotsky); preference was measured after one tool was already met (Kay); "created" versus "played" (Kay); the grandfather's delight is the curriculum (Minsky).

### 2. The Atelier (a meta-constructionist app)
*Post: [A meta-constructionist app for children to create societies of minds that learn in a constructionist manner](https://docs.google.com/document/d/1Vz38nDugVgO_SWmH2qesmlbDSXuCFty2SbTQTvrAzyU/edit?usp=sharing)*

- **Papert:** its make→look→exhibit→reflect→distill loop builds in a planner's epistemology. Ken countered that watching rounds looks like bricolage. Papert replied that the bricolage belongs *within* a round, and that the cycle itself should be editable, with planner versus bricoleur minds as a Science Corner experiment.
- **Minsky:** it's a committee of geniuses, not dumb agents. Enforced kindness kills negative expertise. Letting only the student restructure a mind is the smartest design choice. He conceded, on Ken's pushback, that Society of Mind has high-level agencies, but said the app lacks *kinds* of interaction (suppress, veto, compete, escalate). He proposed ablation: delete Eyes and Critic and see whether the drawings get worse.
- **Kay:** it's a glass case around the blackest box ever made. The Science Corner shows noise with graphs; teach variance first.
- **Vygotsky:** it is internalization built as a machine, but its inner voice is polished outer speech. Reflecting on reflection belongs to school age.

### 3. Emotion Machine app and story-rewriting experiment
*Posts: [Exploring Minsky’s Emotion Machine by creating an app with Claude](https://docs.google.com/document/d/1gJiLNv9SRZTUCWnCvM-QKGSYGoTuWRA7qJn5aX7X_qw/edit?usp=sharing) and [Exploring how Emotion Machine app agents can rewrite a very short science fiction story](https://docs.google.com/document/d/1p3T6Dl4k58OrCl1xOtAH9FSFPaAaCEkYx4OHUnHJo1g/edit?usp=sharing)*

- **Minsky:** better than the Atelier, with demanding critics and a selector. But the Selector prompt *forces* a new Way to Think every cycle, which explains the Reflector's "fleeing discomfort" diagnosis. A committee of critics is a committee of censors, and humor slips past censors, so critiques made jokes worse.
- **Kay:** the society helps correctness (it caught the Prolog bug) and hurts creativity, which is a real result. The pseudo-reflections are a skilled narrator dramatizing a log.
- **Vygotsky:** the app separates intellect from affect. Minsky's reply: emotions *are* ways to think, meaning resource reconfigurations, so the labels are inverted. The modes should mute critics and change temperature and context. They then disagreed about motive.
- **Papert:** Ken's own report answers Kay's question; building the app taught Ken. The Atelier's kind critics were a step backward from this app's demanding ones.

### 4. Agentic AI Explorer (a free agent construction kit)
*Posts: [Making an app with Claude and Gemini for creating an agentic AI web app](https://docs.google.com/document/d/1WjC7pjD9rxvgv86ICrzFL7GHfJyprHzv-Ueboh1lwF8/edit?usp=sharing) (the Fact Checker, the Image Critic and its fooled pebble Verifier, the Visual Whisperer telephone game, the Arbiter) and [Using LLM browser agents to create applications and experiments using an AI agent playground](https://docs.google.com/document/d/10tBnKfLvYAcvdBZjEpXaKeHiDWYm4MowA6gQ8_BSktA/edit?usp=sharing). The image telephone game: [An AI image generation “telephone” game co-created with Gemini](https://docs.google.com/document/d/1_304tER34rp1AKngZd7Q--jvZ5-7kKq2B_LrU79NmrE/edit?usp=sharing)*

- **Ken's proposal:** an agentic construction kit is a better constructionist microworld.
- **Papert:** distinguish kit (language) from microworld. Ship the microworlds *inside* the kit, the way the turtle shipped with Logo. The image telephone game is a fixed-point microworld.
- **Minsky:** regex rules are genuinely mindless agents, the most Society-of-Mind feature yet. An Arbiter that compromises is anti-Minsky. The pebble Verifier was gamed.
- **Kay:** the Fact Checker missed the Smalltalk claim: correlated error. The most constructionist moment was Ken adding logging statements himself.
- **Vygotsky:** external tools precede internalized functions, but a blank kit offers no more capable partner.

### 5. Synthesis and design
- **Agreed:** a kit plus shipped microworlds, one new primitive per microworld, test with real children soon (Papert's dissent: "twelve children, one microworld").
- **Programmed agents** (Kay's condition) are tiny and data-only; perception goes to language models, judgment to programs. Ken worried about prerequisites; the answer was use, then configure, then open, then write, plus ToonTalk-style demonstration as a later authoring route.
- **Ken chose pseudocode.** The panel insisted it be *translated once to deterministic JavaScript*, not interpreted by a model. A stable bug is a gift; a stochastic bug is a ghost.
- **From the PB&J Algorithm Sandbox** (Oct 2025, in [Acquiring computational thinking skills together with a chatbot](https://docs.google.com/document/d/1jP3Aiama-YHflDuK_TQ_a5F-oi3lbtit4i5QO2RhSZE/edit?usp=sharing)): scenarios as tests, linked pseudocode↔JS, failures shown as funny pictures (Minsky: humor teaches censors), feedback that asks rather than tells, and Minsky's rule that pseudocode is only for computable data. That rule explains Ken's earlier finding that pseudocode added little in a world simulation.

## Decisions (Ken)
- Glass box throughout; peek under the hood shows the JavaScript.
- No drag-to-wire in v1.
- Pseudocode editable in v1; direct interpretation of pseudocode skipped for now.
- A new single file reusing the Atelier's turtle engine and glass-box conventions, the Explorer's rule model, and the Logo Lab's keyless call path.
- Agent-to-agent critique may be blunt; learner-facing text stays kind.
- The Pebble 3×5 grid is only an example; learners explore easier and harder challenges.
- Keyless runs through the chat-artifact proxied fetch, which accepts images. The risk that this route is retired is accepted.

## Step 0 finding
A published-artifact test showed `sample` available, a 256 KiB prompt cap, tools up to 16, and **no image support in Ken's view**. Ken pointed out that his Logo Evolution Lab sends images keylessly. That works through the chat-artifact fetch route, a different mechanism, so keyless stays in v1 through that route.

## Outputs
- **`agent-kit-SPEC.md`:** the v1 spec for Claude Code. It covers:
  - kickoff and materials;
  - Claude Code's own Step 0 (checking whether the artifact allows Workers and `new Function`, with fallbacks);
  - adapters, messages, wiring, trace;
  - programmed agents (translation, static check, sandbox, scenarios);
  - Telephone and Pebble Challenge;
  - safety, roadmap, acceptance criteria, resolved decisions, risks;
  - pseudocode for every shipped Judge.
- **Step 0 test artifact:** https://claude.ai/artifact/MME8UPRJizhBKvETusZnM9
- **Upload to Claude Code with the spec:** the Atelier, Explorer and Logo Evolution Lab sources (the Lab's posts: [A multi-agent app to evolve turtle graphics programs co-created with Gemini](https://docs.google.com/document/d/1ulliMQ1VPaTMGQcigS2WpqiYxVKIXhxyhxlyubzoohA/edit?usp=sharing), [A Sequel by Claude](https://docs.google.com/document/d/1WDxgXhIcihifkU0ZoE2KEJjfpiuUkl7mc2bQyld50bc/edit?usp=sharing) and [An app for running and analyzing Logo turtle program AI-assisted evolution experiments](https://docs.google.com/document/d/1gjJFFj42vtFrYi7Ao-pEOdTZ6Gu_CPTyLlMnkKPc3Cc/edit?usp=sharing)). Not the blog posts; the spec supersedes them.

## Open threads
- Test with real children (Papert's standing dissent).
- v2 authoring: by demonstration (more constructionist) or through a translator (easier).
- The Emotion Machine experiment: allow the Selector to continue its current strategy and see whether "fleeing discomfort" disappears.
- The ablation experiment: remove Eyes and Critic from an Atelier mind.
- Is there any arrangement of critics that improves a joke?
- A missing voice: no one on the panel doubted that children should build agents at all.

## Since the panel: Agent Kit, 30 Sep – 3 Oct 2026
Claude Code built v1 from `agent-kit-SPEC.md` on 30 September and took it to **1.12.0** by 3 October, through
Ken's own tests, Claude in Chrome's and ChatGPT's test runs, and further simulated-panel reviews. It is at
<https://toontalk.github.io/agent-construction-kit/> (source: <https://github.com/ToonTalk/agent-construction-kit>).

**How the panel's points landed**
- **Kit plus microworlds (Papert):** nine microworlds ship inside the kit, in teaching order. Story Chain, Secret
  Number, Lost and Found, Telephone, Pebble Challenge, Three Eyes, Fool the Eyes, Joke Workshop, and Small Helper,
  Big Helper each add roughly one new idea. Free play (＋ New society) is the kit as a language.
- **Pseudocode translated once to JavaScript (the panel's condition):**
  - A translator turns pseudocode into checked, step-limited JavaScript, and "peek under the hood" links the
    lines on both sides.
  - Each programmed agent carries scenarios as tests, and a contract (Gets / Says / Remembers) that the
    translator must keep.
  - Drawings became Logo (1.0.1), read by an interpreter, never run as JavaScript.
- **Kinds of interaction (Minsky):**
  - gates that pass or block;
  - agents that collect several messages before answering (Vote, Referee, Selector);
  - escalation (Small Helper, Big Helper);
  - rules that fire on words or data, or when the run ends.
  - The learner can be an agent too (You, Joke Workshop), and each AI agent can have its own model.
- **Glass box (Kay):**
  - The trace shows every message, model call and program run.
  - It now says plainly that it shows what the kit sent and got back, not what a model learned in training.
  - Read aloud can speak any of it.
- **Ablation and critics (open threads):**
  - Joke Workshop asks "Is there any arrangement of critics that makes a joke better?" and switches its critics off.
  - Artist and Critic asks whether a critic is a fair judge of work done on its own advice.
  - Microworld questions keep inviting learners to remove an agent and see what changes.
- **Keyless:** runs through the chat-artifact route as decided. Since 1.12.0 there are artifact builds (English and
  Swedish) whose agents use only keyless Claude and Gemini Nano.

**Added from Ken's earlier projects** (as examples under ＋ New society, not microworlds):
- Evolution, from the Logo Evolution Lab.
- Two Answers, from [Contemplative AI](https://docs.google.com/document/d/18Cq0Ss9nlc3AhjNYWyftZMkOQUfILHZA_zf3gA7aN-8/edit?usp=sharing).
- Tic-Tac-Toe, from [LLMs can’t stick to the rules of chess](https://docs.google.com/document/d/1Q6slKmbY129iKCtkDx92_1noU3DvBj59VtrW2YBEeyQ/edit?usp=sharing) and [Playing Tic Tac Toe with a snarky AI](https://docs.google.com/document/d/1CzbfTZUulzUbbfnIonD2ryNUtB6VEG0KLx9vLhMEtBU/edit?usp=sharing): the model suggests and a Referee program decides.
- Trail Mix Barter, from [Trail Mix Barter by Chatbots](https://docs.google.com/document/d/16yTUsA9IWxqWfokFfREXhXRABCFP5-SAx-ZfEEZ-hK8/edit?usp=sharing): a Ledger program keeps the books the chatbots lost.
- Artist and Critic, from Ken's own society.

**Also since:**
- Speech: Read aloud, talking instead of typing, and the Helper by voice.
- A Swedish copy, made by coding agents from a shared glossary, with a guide for making other languages.
- Run and Step carry on from where a run stopped.
- "Yours" kept apart from the microworlds.

**Open threads, now**
- **Testing with real children** is still the next step (Papert's standing dissent). The later reviewers agreed:
  stop adding microworlds and try two or three children, with Story Chain first.
- **v2 authoring by demonstration:** not started.
- **The Emotion Machine Selector experiment:** not run.
- **The missing voice** (whether children should build agents at all): still missing.

## Related posts
- [More experiments with LLMs imitating Seymour Papert](https://docs.google.com/document/d/1R40wYYjHCeQypw04To1QpAL6apuHZM9tDraJcke7jJs/edit?usp=sharing) and [Revisiting Seymour Papert’s “Is Programming a Good Activity for Children”](https://docs.google.com/document/d/1nYValhK5wtTswbyc8iUOiEkxv5xjbgOt9OAHDMTUXs0/edit?usp=sharing) (September 2026)
- [Creating Seymour Papert “bots” with Claude and Gemini](https://docs.google.com/document/d/1XBcTaN2gH1C-OwGwhVziKzFaTQk5bayPjXpHJyXy78Q/edit?usp=sharing)
- [A simulated panel discussion by Claude 3](https://docs.google.com/document/d/1AkL6g4ZFNaRXMv2t7ODwimckF_u-8Z0W8szHvWpRuAo/edit#heading=h.4gehb81t6vr) (May 2024), an early version of this format
- [Using ChatGPT Deep Research to explore connections between Minsky’s Society of Mind and Anthropic’s On the Biology of a Large Language Model](https://docs.google.com/document/d/1WvjstSwijZxYNy0ovtrlYODhArZzGOkPG4YIVTJlwMs/edit?usp=sharing)
- All of Ken's posts: [Recent research by Ken Kahn](https://docs.google.com/document/d/1nklXpAJfOm0VE4lAVwkBqIHhIl_HKYeboIOg5F9qFkU/edit?tab=t.0)

## Fidelity notes
- **Real positions drawn on:**
  - Minsky: Negative Expertise (1994); the jokes and censors paper (1980); critic-selectors and suitcase words in *The Emotion Machine*; agencies, and conflicting agents handing control to a higher agency, in *Society of Mind*.
  - Turkle and Papert on bricoleurs and planners (1990).
  - Vygotsky in *Thought and Language* on written versus inner speech, conscious awareness at school age, and the affect/intellect split; his 1933 lecture on play.
- **Claude's own extrapolations,** flagged in the conversation: Kay's "rules as editable sentences," the mode-specific resource settings, and the Selector-prompt diagnosis.
