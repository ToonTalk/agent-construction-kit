**Agent Construction Kit: follow-up in Chrome, 3 October 2026**

Yes: using the connected Chrome extension was the right way to complete the model-dependent testing. The first pass used a separate in-app browser profile. This pass used the user's regular Chrome environment and its already-configured models. The extension can interact with existing browser sessions; that distinction is documented in [OpenAI's browser-session guidance](https://learn.chatgpt.com/docs/enterprise/chatgpt-work-local-security#browser-sessions-and-existing-sign-ins).

**Gemini Nano, Gemini 3.8 Flash, Claude Haiku 4.5 and GPT-6 Luna all completed real calls. All four also processed image input successfully in the tested workflows.** The earlier Nano execution-config failure was specific to the first browser environment; it should not be read as a failure of Nano on this computer's Chrome installation.

The application had also changed from 1.4.1 to **1.4.2**. I captured both live scripts and compared them with the previous snapshot. The changes concern saving preferences, clearer saving/deletion explanations and related Helper guidance. The earlier scenario, modal-focus, human-only guard, draft and pseudocode-restoration implementations remain unchanged.

Tests were performed in a separate agent-created Chrome tab. I made eleven clearly labelled `QA: Chrome ...` copies, preserving the original societies and using those copies for runs and edits. The browser's normal viewport measured 900 × 789 CSS pixels. I restored the original selected society, Two Answers, and the original normal execution speed after testing. The QA copies remain available in the browser for inspection.

**What the real runs showed**

| Workflow | Result and interpretation |
|---|---|
| Two Answers, mixed providers | Nano answered as Plain, Claude as Contemplative, and GPT as Comparer. All three completed. The Comparer waited for both answers before responding. This establishes interoperability, not an isolated comparison of instruction styles. |
| Two Answers, same provider | Both answerers and the Comparer used Gemini 3.8 Flash for the same authored question about using a friend's feedback while keeping one's own story ideas. Both answers supported selective use of feedback; Contemplative added its four labelled preliminary reflections and analogies. No general superiority follows from one pair of answers. |
| Story Chain, memory off | Two rounds completed, including Book, Name Keeper and the end-of-run Editor. The story moved from Pip the dragon to a turtle; Writer A's second turn followed the turtle. Book retained the record and Editor retold it. |
| Story Chain, Writer A memory on | The same initial sentence and round limit were used. Writer A explicitly brought Pip back in round two. This is a useful paired observation, not a reliable estimate of the effect of memory. Name Keeper also rejected subsequent pronoun-only sentences. |
| Book translation | Changing only “end” to “beginning” successfully installed new JavaScript, but the translation changed memory from a list to a string and omitted the `sentences` output. All four scenarios failed. Making list memory and the sentence-count output explicit produced three passes; the old append-order scenario remained red, as it should for the deliberate prepend behavior. |
| Helper | Given that three scenarios passed and the append-order scenario failed, it asked me to compare the expected order with Book's new order. This was relevant guidance. It also said the new program did exactly what it was told, which is stronger than tests alone can establish. |
| Secret Number | With secret fixed at 42, model history off and Notebook off, Gemini guessed 50, 25, 75, 25, 75, 25, 75. With the same target/model and Notebook on, it guessed 50, 25, 38, 44, 41, 43, 42 and won. The narrowing ranges were visible in the trace. |
| Telephone | Two drawing/description generations completed for a red circle beside a blue square. Renderer made both drawings; the image descriptions preserved left/right position and colors. The second description specified outlines. |
| Pebble Challenge | With fixed mystery rows 5, 2, 7, real Designer, Eyes and Critic completed three attempts. Eyes' counts matched the dot totals in those attempts. Critic initially proposed 5, 2, 6, then requested more in row three; after an eight-dot third row it proposed changing previously accepted rows as well. The challenge remained unsolved at the limit. |
| Three Eyes | The same generated 11 × 14 grid went to Gemini, Claude and GPT. Dot Counter recorded 154. Gemini reported 165, Claude 225 and GPT 154. Vote correctly said that no two Eyes agreed. All three providers' image paths worked. |
| Fool the Eyes | Trickster rendered twelve DOT operations twice. Eyes reported three and then two pebbles; Referee awarded Trickster both rounds. Inspection at full size showed overlapping colored marks with two prominent gray foreground circles in the second image. The discrepancy raises a question about what counts as a visible pebble, not merely whether a model can count. |
| Joke Workshop | Joker generated a familiar snow-ball pun. I rated it 2; both critics provided feedback and Notes collected it. Joker produced a tuxedo/belly-sliding joke, which I rated 3. Scorekeeper recorded both values, and the run terminated at two rounds. With critics on, the default rules forward critics' Notes to Joker and human ratings to Scorekeeper; the trace does not show the human's written feedback causing the revision. |
| Lost and Found | Nano identified Gemini's spoon drawing and routed it to Tools. For a separate hat-on-dog drawing, Gemini described a bear wearing a hat and routed it to Clothes. The latter is useful material for separating drawing fidelity, visual interpretation and category policy. |
| Small Helper, Big Helper | Nano produced a layout read as 11 rows and one column on two attempts. Escalator then sent the task and last problem to Gemini, which produced the required 11 × 14 layout. Judge passed it. The actual failure and escalation branch worked without inserting an artificial failure. |
| Evolution | One generation completed: parent and three variants rendered; Critic collected the brief and four pictures; Selector chose Mutator 1's picture with score 8; History recorded it; Narrator summarized it at the end. The family tree marked the selected variant. The variants appeared similar, and Critic described them as identical. Longer-run diversity, drift and improvement remain untested. |

These are observations of bounded runs, not model benchmarks or evidence of children's learning. I did not audit provider billing, cross-browser compatibility, classroom use or long-running evolution. Saving-off and destructive controls were not exercised in the user's profile.

**Earlier findings checked again**

- **False-green scenarios reproduce in Chrome 1.4.2.** In the genuinely failing prepend/append test, I replaced Expected with the JSON number `3`. The application saved `{}` and changed three of four passes to four of four, although Actual had two sentences and reversed order. I restored the original assertion after recording the reproduction.
- **Modal focus reproduces in Chrome.** Enter on the toolbar's Export button opened the dialog but left focus on background Export. Tab moved to background Import. The dialog had neither `aria-label` nor `aria-labelledby`. Full-size picture viewing worked, but focus also remained on the background picture opener.
- **Component inquiries on the captured 1.4.2 scripts confirm** that a human-only society with no connection is still blocked, and returning to installed pseudocode after a failed translation still leaves error status despite matching text and unchanged code.
- **The existing 451-test suite still passes against the captured 1.4.2 scripts:** zero failures, all 19 modules represented, fingerprint `53fa9f406cc5`. This uses the previous suite and original HTML/CSS scaffold with the current scripts substituted. It is not a claim to have fetched a newer repository suite or measured complete branch coverage. The source captures and separate inquiry results are saved beside this report's evidence.
- **Export delivery remains unverified.** I invoked a real export with trace; the download event timed out after fifteen seconds and no matching file appeared in the checked Downloads folder. Browser security policy blocks `chrome://downloads/`, preventing inspection of Chrome's internal download result. This does not establish that export generally fails; a Save As dialog or different destination could account for the observations. I asked the user how their ordinary export behaves.

**How this changes the constructionist assessment**

The real runs strengthen the case for the kit. Its message architecture makes a difference that learners can explain: Notebook constructs usable memory outside the model; an evaluator constrains the search; an escalation rule changes which helper acts. These are observable arrangements learners can own and revise.

The strongest educational moments were the disagreements: a pronounceable story that Name Keeper rejects, a visual count that differs from recorded drawing operations, critics that introduce unsupported requirements, and a scenario whose old expectation conflicts with a newly intended behavior. Learners can investigate and change the mechanisms behind these disagreements. That is richer than receiving a predetermined lesson that an AI succeeded or failed.

Book's translation illustrates both promise and difficulty. A small prose change can unexpectedly alter the interface other agents and tests depend on. The red scenarios exposed that change, and an explicit description repaired it. Translation should receive the existing implementation and relevant input/output/memory contracts, while clearly distinguishing expectations deliberately changed by the learner from requirements accidentally lost. Offer explanations of those contracts in ordinary language and examples; learners should not need to discover an undocumented interface by accident.

Fool the Eyes particularly deserves careful wording. DOT operations, distinct visible marks and perceived pebbles are different possible objects of counting. Referee currently treats the first definition as truth. Its own questions invite learners to challenge that definition, which is good. The introduction's “true number” should describe the actual measurement more precisely and give learners permission to make a different referee.

Two Answers likewise needs to treat preliminary reflections as generated text. The Comparer's phrase “inner reflections” risks presenting an emitted explanation as direct access to hidden processing. Compare the observable answers and let learners edit or replace the principles; retain uncertainty about why a particular response arose.

I would preserve the earlier emphasis on personally meaningful projects and peer audiences. Ask pairs to make a society another pair can use, exchange difficult scenarios, and explain a revision with a trace. Observe which architectural decisions they can own and where they need help. Keep predictions and evidence notebooks optional enough to accommodate exploratory construction as well as planned experiments.

The priority remains to repair false-green tests and keyboard access, make human/program entry available without a model, and clarify the relationship between edited pseudocode, running code and its contracts. The live AI workflows are functioning and furnish useful material for those learner-authored investigations.

**Saved evidence**

- [Full UI evidence for the Chrome cases](<C:/Users/toont/Documents/New project/agent-kit-audit/chrome-live-evidence.json>)
- [451-test result against the current scripts](<C:/Users/toont/Documents/New project/agent-kit-audit/chrome-suite-results.txt>)
- [Separate inquiries against the current scripts](<C:/Users/toont/Documents/New project/agent-kit-audit/chrome-inquiry-results.txt>)
- [Notebook-enabled run reaches 42](<C:/Users/toont/Documents/New project/agent-kit-audit/screenshots/chrome-notebook-comparison.jpg>)
- [Translated Book with missing count and changed memory](<C:/Users/toont/Documents/New project/agent-kit-audit/screenshots/chrome-book-translation-failures.jpg>)
- [False-green scenario in Chrome](<C:/Users/toont/Documents/New project/agent-kit-audit/screenshots/chrome-vacuous-green.jpg>)
- [Overlapping-dot picture at full size](<C:/Users/toont/Documents/New project/agent-kit-audit/screenshots/chrome-fool-picture-full.jpg>)

This follow-up supplements the [initial review](<C:/Users/toont/Documents/New project/agent-kit-review-2026-10-03.md>), whose first-browser limitations are historical. The original constructionist discussion and unretested qualifications should be read with the live results above.
