**Agent Construction Kit: hands-on review and constructionist commentary**

**Update:** The model-dependent tests have now been completed through the Chrome extension, using the user's configured models and live version 1.4.2. Nano, Gemini, Claude and GPT all completed text and image calls. See the [Chrome follow-up](<C:/Users/toont/Documents/New project/agent-kit-chrome-follow-up-2026-10-03.md>) for results and remaining limitations. The first-browser limitations recorded below describe the initial pass.

Tested on 3 October 2026 at https://toontalk.github.io/agent-construction-kit/. Displayed version: **1.4.1**. Repository snapshot: [4b5d48b](https://github.com/ToonTalk/agent-construction-kit/tree/4b5d48b03910f1445b063b4775d0f247dd697722).

My judgment is that this is a promising constructionist environment with substantial working functionality. Its best feature is that learners can construct and investigate the organization of a society: instructions, memory, programs, evaluators, and message routes become editable material. Its educational value will depend on learners taking ownership of those arrangements, developing projects they care about, and discussing their evidence with other people. The teacher guide appropriately identifies its proposed child-facing activities as untested.

**What I actually tested**

I inspected all nine built-in societies, both guides, the library and editors, and instantiated the Evolution and Two Answers examples. Live interaction used the Codex in-app Chromium browser, including desktop and phone-size layouts. The final desktop pass used 1440 × 900 CSS pixels; the phone pass used 390 × 844 CSS pixels, with an additional narrower pass at approximately 355 × 767.

I downloaded the public repository into an audit folder and ran its complete existing suite: **451 PASS, 0 FAIL; all 19 model-layer modules covered; fingerprint 53fa9f406cc5**. The complete ak-model and ak-ui script contents were compared with the live page and matched exactly. This establishes that the component tests apply to the application code that I inspected, although it does not turn mocked model responses into live provider tests.

The suite covers adapters, messaging, rules, program and Logo runtimes, library programs, scenarios, import/export sanitization, free play, the microworlds, advanced examples and UI behavior. The module count means that every module is represented by tests; it is not a measurement of complete line or branch coverage. I also wrote a separate inquiry script, outside the existing test directory, to investigate gaps in that coverage.

| Area | Direct live evidence | Limit |
|---|---|---|
| Initial setup | No-model Run opens Settings. Selecting Nano changes the chip to green and the Stage to Ready. Connection testing, a model Step, translation and Helper requests all report the Nano execution-config failure. | No working language model was available in this browser. |
| Story Chain | Opened writers, Book, rules and explanatory questions; inspected memory controls and program tests. | Generated stories and the Editor's reconstruction were not verified with a real model. |
| Original society | Created QA: Story Garden, authored a question, added Book, connected Agent → Book → Agent, played Agent, and passed two sentences through the loop. | Human substitution exercised the message bus, not AI story writing. |
| Book and scenarios | Ran shipped scenarios, inspected input/expected/actual values and the JavaScript mapping, saved a live turn as a scenario, made it fail, restored it, tested malformed JSON and wrongly shaped valid JSON. | Successful novel pseudocode translation needs a working model. |
| Secret Number | Changed a parameter with real keystrokes and Enter; six scenarios stayed green. Played Guesser, enabled Notebook, received a narrowed range, and completed a game with a winning guess. | Comparative AI guessing performance remains untested. |
| Telephone / Logo | Added and undid a drawing command, authored a square and dot, stepped the Renderer, opened its trace, edited Logo and saw preview feedback. Unknown commands and a million-iteration loop returned errors without freezing the page. | The AI drawing/description loop was not completed. |
| Pebble Challenge | Played Designer with Dot Counter and No Critic. Three dots failed; four dots passed. Invented a six-dot challenge and completed it. Checked empty challenge-form validation. | Eyes and Critic quality were not evaluated. |
| Joke Workshop | Played Joker with critics disabled, supplied a joke, rated it as the separate You agent, and verified Scorekeeper's four-star result and the one-round limit. | AI critics and joke revisions were not evaluated. |
| Lost and Found, Three Eyes, Fool the Eyes | Inspected their questions, controls and agent arrangements; the repository suite exercises their routing, voting, collecting and scoring. | No live image-model results were established. |
| Small Helper, Big Helper | Confirmed the explanation that two models are required and the blocked setup state. | Multi-provider escalation and cost comparisons were not live-tested. |
| Evolution / Two Answers | Instantiated both editable examples; inspected the Two Answers arrangement and optional Comparer. | Their model-dependent runs and judgments remain unverified. |
| Saving and sharing | Reload preserved the authored society, rules, scenarios and completed run. Imported a known exported library-based test society through the real file chooser and ran its Book successfully. | Export displayed a success message, but the automated download event timed out and no matching file appeared in the checked Downloads folder. Actual file delivery in this browser was not verified. |
| Accessibility / presentation | Keyboard opening of Settings, Tab, Escape, dialog attributes, mobile pane switching, mobile scenarios and translation view; screenshot and overflow inspection. | This was not a full screen-reader, touch-device, cross-browser or WCAG conformance audit. |

No general page-level horizontal overflow appeared in the tested mobile layouts. The scenario comparison stacked on narrow screens, and long code used internal horizontal scrolling. The browser log inspection returned no captured errors or warnings at that point. Those positive checks coexist with the focus and navigation problems below.

**Reproducible findings**

The ordering reflects their effect on learner access and the reliability of evidence, rather than an assertion that every item has the same severity.

| Finding | Reproduction and observed result | Recommended change |
|---|---|---|
| **High: a green scenario can check nothing** | In Book's scenario editor, enter the valid JSON number 3 in Expected. Save. The application replaces it with {} and reports a green pass, even when the actual sentence count is 2. Arrays and other non-object expectations are also sanitized to an empty object in the model layer. Malformed JSON is correctly rejected. | Validate that Expected is an object with at least one meaningful assertion. If empty expectations are deliberately allowed as execution smoke tests, label them explicitly. Never silently discard the learner's expectation and present it as satisfied. |
| **High: dialogs do not manage keyboard focus** | Focus Settings and press Enter. The dialog appears, but focus remains on the background Settings button. Press Tab: focus moves to background Look inside. The dialog has role=dialog and aria-modal=true but neither an accessible label nor a heading association. Escape does close it. | Move focus into the dialog, keep Tab within it, make background controls inert, associate its heading with aria-labelledby, and restore focus to the opener. Apply this centrally to the modal mechanism. |
| **High for the entry experience: human-only work still requires a model setting** | A separate component reproduction created a society with only a human agent, connection=none, and no AI call to make. Run returned no run and opened Settings. The guard rejects any society containing kind=model, including human agents. | Permit human and program execution without a model. Ask for a connection when an actual AI activation or translation requires one. This would make the existing human modes a useful first activity without a key. |
| **Medium: restoring installed pseudocode does not recover the status** | Change Book's logic, let translation fail, then put back the exact original pseudocode. The working code is unchanged and the text again matches its installed pseudocode, but the agent remains in Translation problem and attempts translation again. The separate reproduction confirms no lastGood version is available for this initial failure. | Recognize the installed program's pseudocode locally and recover without a model call. Offer a visible return-to-running-version action, even before the first successful edit. |
| **Medium: one human role inherits another role's draft** | In Joke Workshop, tick You be the Joker and disable critics. Send a joke. When the separate You agent asks for a 1–5 rating, its answer box is prefilled with the joke just submitted. Drafts are indexed by society rather than by the agent whose turn it is. | Store drafts per society and agent, or clear them when the human role changes. Keep the current role and recipient explicit. |
| **Medium: connection selection looks like connection health** | After Nano's connection test fails, the model chip is still green and the idle stage says Ready. Earlier banners can also continue to claim that no model is connected. | Distinguish selected, testing, working and unavailable states. Surface the actual failure and a practical next step without implying that another click will necessarily download and repair the model. This was an environment-specific failure; it does not establish that Nano fails in ordinary supported Chrome installations. |
| **Medium UX: mobile navigation dominates first use** | At 390 × 844 CSS pixels, with the nine seeds and one authored society, the header measured about 426 pixels high. The Run button began around y=832 and was not fully visible. More saved societies add further rows. The header scrolls away on mobile, so this is an initial-view and growing-navigation problem, not a permanently sticky obstruction. | Use a compact society picker, a collapsible gallery or a shorter row of recent societies on phones. Keep the active question visible and make the initial action easier to reach. |
| **Evidence/context issue: changing a challenge retains the old success** | After passing the four-dot challenge, create/select a six-dot challenge. The stage now displays the six-dot Judge while retaining the old four-dot picture, successful Judge marker and completed-run result. Starting the next run then gives a clearly marked previous-run strip. | Identify the last run's challenge and configuration before the next run begins. Either move the old result into a labelled previous-run area immediately, or clearly mark it as evidence from the former challenge. |

Relevant source locations, pinned to the reviewed commit:

- [Expected-value sanitization](https://github.com/ToonTalk/agent-construction-kit/blob/4b5d48b03910f1445b063b4775d0f247dd697722/index.html#L4281), [comparison logic](https://github.com/ToonTalk/agent-construction-kit/blob/4b5d48b03910f1445b063b4775d0f247dd697722/index.html#L4535).
- [Modal creation](https://github.com/ToonTalk/agent-construction-kit/blob/4b5d48b03910f1445b063b4775d0f247dd697722/index.html#L5476).
- [Run's model guard](https://github.com/ToonTalk/agent-construction-kit/blob/4b5d48b03910f1445b063b4775d0f247dd697722/index.html#L5669).
- [Program-edit and translation handling](https://github.com/ToonTalk/agent-construction-kit/blob/4b5d48b03910f1445b063b4775d0f247dd697722/index.html#L6578).
- [Human answer draft](https://github.com/ToonTalk/agent-construction-kit/blob/4b5d48b03910f1445b063b4775d0f247dd697722/index.html#L6043).
- [Readiness text](https://github.com/ToonTalk/agent-construction-kit/blob/4b5d48b03910f1445b063b4775d0f247dd697722/index.html#L5939), [challenge switching](https://github.com/ToonTalk/agent-construction-kit/blob/4b5d48b03910f1445b063b4775d0f247dd697722/index.html#L6906).

Export deserves a separate qualification. I observed the success toast, not a verified delivered file. The implementation offers a copy fallback in frames or after a thrown error, but a top-level browser that silently blocks the download can still receive the success toast. An always-available copy/save fallback would make sharing and preservation more dependable. I would investigate this in ordinary Chrome before calling it a general download defect.

**Constructionist strengths**

Papert and Harel's account includes personally meaningful, shareable constructions and accommodates different ways of working, including bricolage. That is the lens for this assessment. [Situating Constructionism](https://inventingtolearn.org/wp-content/uploads/2023/10/Situating-Constructionism.pdf)

The society is an unusually useful object to think with. A learner can change who knows what, whether an agent remembers, how a result is judged and where a message goes. Ideas such as feedback, state, representation and evaluation can become things the learner needs in order to make a project work. The distinction between the Book's record and the Editor's retelling is especially fertile: learners can investigate memory, interpretation and authorship through something they have made.

The examples also expose failures of evaluation. A literal Name Keeper can reject a perfectly understandable pronoun. A counting program can have a different definition of a pebble from a person looking at a picture. Critics can improve work, add unnecessary caution or optimize the wrong criterion. These are strong opportunities for learners to question the arrangement and its assumptions.

Human participation is more than a motivational extra. Taking an agent's place lets a learner experience the restricted information available at that point in the system. In my Pebble test I could read the feedback, revise my own Logo and see the consequences. In the original Book society I controlled the text and the connections. These are valuable bridges from observing an example to owning its design.

The debugging environment provides real material for reflection. The trace connects an input, a program, a response and fired rules. Turning a surprising turn into a scenario makes a concrete encounter into a revisitable test. The error messages for unknown Logo and too many steps encourage revision without blaming the learner. The working comparison of expected and actual outputs is good; the empty-expectation problem is damaging precisely because the surrounding feature is so worthwhile.

The guides support social learning through prediction, role swapping and exchanging scenarios designed to challenge another pair's agent. Sharing whole societies as files also gives learners something another person can inspect and alter. The move from examples to an authored name and question is already implemented, rather than merely promised.

**Where the constructionist promise could be stronger**

The distinction between producing an artifact and constructing an understanding needs care. A language model can produce an attractive story or drawing while the learner makes very few decisions. I would evaluate agency through what learners choose, revise, predict and explain, including changes to the architecture and evaluation criteria. The appearance of a successful final artifact is insufficient evidence of that learning.

Make the transition to ownership earlier and more visible. The examples are valuable starting materials, but their supplied questions can become a tour of predetermined lessons. Alongside each seed, offer an invitation to invent a related question or make something for a friend. A learner-authored game, joke exchange, story performance or deliberately unreliable classifier can give the debugging a purpose and an audience.

The system exposes the orchestration well, but its neural models remain opaque. Its glass-box language should describe the observable arrangement and interfaces precisely. A trace shows what the kit sent and what it received; it does not reveal all learned knowledge, hidden processing or the causes of a model's behavior. This boundary itself offers a useful subject for learners to investigate.

Natural-language pseudocode also introduces an interpreter whose judgment matters. Seeing the translation is helpful, but a learner may assume that their prose is the running program. Keep edited text and the running translation distinct when they diverge, show which version each test used, and let learners establish correspondence with contrasting examples. Safe execution checks do not establish semantic faithfulness.

The generic programming ceiling is present but somewhat indirect. Add an agent offers AI agents, a Renderer and library programs; a learner creates new programmed behavior by adapting those programs. A visible blank-program route, with a tiny message-in/message-out example, would make the vocabulary of construction more apparent. A simple editable connection map could likewise complement the sentence rules, especially in collecting and branching societies.

Sharing currently supports exchange but offers little support for a project's social history. Optional remix ancestry, change notes, the question being investigated and a selected trace could travel with exported work. These need not require accounts or public hosting. They would make peer response and sustained revision easier.

Preserve more of the learner's experimental history. A completed run and a previous-run strip help, but a small notebook of named versions, predictions and selected evidence would support returning to a project over days. Offer this as an optional resource for reflection, not a mandatory worksheet before every attempt. Some learners will build understanding by making a mess and revisiting it.

**Statements and experimental framing I would revise**

- The learner questions about the Name Keeper, overlapping pebbles and differing evaluators are good. The Fool the Eyes introduction nevertheless presents Dot Counter as knowing the true number. Describe it as counting the Renderer’s recorded DOT operations. Its representation is inspectable, but it does not automatically settle what a person should count in the picture.
- The teacher guide says voting helps only when mistakes are independent. Independence is not necessary: partly correlated voters can still improve a majority result. A more accurate formulation is that improvement depends on voter quality and useful diversity in their errors. The existing invitation to compare models is a good experiment.
- The claim that an AI knows only its instructions and incoming messages ignores its pretrained knowledge. Say that the trace shows the information supplied by this kit. Ask learners what information is visible, what is unavailable and what explanations remain uncertain.
- The categorical claim that an incorrect AI statement involves no plan to deceive goes beyond what a trace demonstrates. Distinguish incorrect output from evidence of deliberate deception; invite inspection of instructions and messages before explaining the behavior.
- The claim that a program does exactly what its pseudocode says needs qualification while a model performs translation, or when an older program is still running. The literal interpreter executes the installed JavaScript; correspondence with the prose is something to test.
- Secret Number chooses a different secret by default each run. Comparing memory or Notebook conditions on one run each can mix the intervention with a different target. The fixed-secret control already exists: recommend using it for paired comparisons and trying several targets, while leaving casual exploration open.
- Avoid treating generated explanations in Two Answers as direct observations of an internal thinking process. Learners can compare the answers and any emitted reasoning, edit principles, and discuss what their evidence does and does not establish.

These revisions would make the kit more constructionist by giving learners permission to examine the definitions and mechanisms of its claims.

**Recommended next work**

1. Repair misleading green tests, keyboard focus and the no-model guard for human/program work. These protect the learner's ability to make and trust evidence.
2. Make translation recovery and experiment provenance clear. Separate drafts by human role and improve phone navigation.
3. Provide an immediate first experience without credentials: human participation and programmed agents can do this now; recorded genuine model runs could supplement it. Clearly distinguish recordings from new generation.
4. Conduct a small observed pilot with learners before expanding the number of societies. Let pairs choose a seed, produce an authored variant for another pair, exchange files or scenarios, and revise after feedback.

In a pilot I would observe whether learners can locate a cause of failure, change a relevant rule or instruction, explain what a trace supports, challenge an evaluator's definition and retain ownership of the project. I would also watch where adult assistance is needed and whether learners pursue their own questions. These are proposed research questions, not established outcomes.

**Evidence and scope**

The audit folder contains the unchanged downloaded application and repository tests, the full test log, a separate inquiry script and its results, a non-sensitive import fixture, live/source script hashes, society-inspection notes and screenshots. Browser tests created QA societies, a QA challenge and the two advanced examples in this browser's local storage. No API key was supplied and no provider-backed generation was successfully completed. No repository or published-site edits were made.

Useful local evidence:

- [Automated test log](<C:/Users/toont/Documents/New project/agent-kit-audit/test-results.txt>)
- [Additional inquiry results](<C:/Users/toont/Documents/New project/agent-kit-audit/audit-inquiry-results.json>)
- [Live/source identity checks](<C:/Users/toont/Documents/New project/agent-kit-audit/live-source-signatures.json>)
- [All nine society inspections](<C:/Users/toont/Documents/New project/agent-kit-audit/worlds-live-inspection.json>)
- [Scenario failure feedback](<C:/Users/toont/Documents/New project/agent-kit-audit/screenshots/scenario-feedback.jpg>)
- [Green scenario with no expectation](<C:/Users/toont/Documents/New project/agent-kit-audit/screenshots/vacuous-green-scenario.jpg>)
- [Mobile first view](<C:/Users/toont/Documents/New project/agent-kit-audit/screenshots/mobile-390-stage.jpg>)
- [A changed challenge retaining the old result](<C:/Users/toont/Documents/New project/agent-kit-audit/screenshots/new-challenge-old-result.jpg>)

The most valuable next milestone would be a learner who can say what they made, which choice was theirs, how they changed it, and what evidence led them to that change.

