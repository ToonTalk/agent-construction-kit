// 1.21.0: after a run, plain checks say what most often goes wrong in a first society (a tester's sisters, building a
// Joker and a Rater from scratch): an agent nothing was sent to, a start that goes to the wrong agent, a rule that's
// off, the agent every new society starts with, left as it was. No model. The built-in worlds stay quiet.
export default function (T, { modelWindow, pageWindow }) {
  const w = modelWindow();
  const { Seeds, Society, Engine, Adapters, Runtime, Helper } = w.AK;
  const pretend = Adapters.makePretendAdapter();
  const play = async (s, to, stop) => {
    const r = Engine.createRun(s, { adapter: pretend, runtime: Runtime, filmsWait: false });
    r.start({ to: to || s.starts[0].to, text: s.starts[0].value || "" });
    if (stop) { await r.step(); r.stop(); } else await r.play();
    return Helper.runNotes(s, r.run.trace);
  };
  // The Joke Team, as a learner might make it: Agent is still there, and the start still goes to it.
  const jokeTeam = () => {
    const s = Seeds.makeBlank("Joke Team");
    s.starts[0].value = "cats";
    s.agents.push({ id: "joker", kind: "model", name: "Joker", emoji: "🤡", instructions: "Tell one short joke about what you are given.", outputFields: [], canSeeImages: false, history: "stateless", replyKind: "prose", pretend: "generic" });
    s.agents.push({ id: "rater", kind: "model", name: "Rater", emoji: "⭐", instructions: "Score the joke from 1 to 10.", outputFields: [], canSeeImages: false, history: "stateless", replyKind: "prose", pretend: "generic" });
    return s;
  };
  const rule = (from, to, f) => Object.assign({ id: "r" + from + to, from, when: "always", send: "text", to, prefix: "", enabled: true }, f || {});

  T.test("notes: no built-in world, with any of its switches flipped, gets a note from its own start", ["Helper", "Seeds"], async () => {
    const all = Seeds.MICROWORLDS.map(m => m.make).concat(Seeds.EXAMPLES.map(e => e.make)), noisy = [];
    for (const mk of all) for (const vi of [-1].concat((mk().variants || []).map((v, i) => i))) {
      const s = mk();
      if (vi >= 0) Society.applyVariant(s, s.variants[vi].id, !s.variants[vi].on);
      const notes = await play(s);
      if (notes.length) noisy.push(s.title + " (" + vi + "): " + notes[0].text);
    }
    if (noisy.length) throw new Error(noisy.join(" | "));
    return true;
  });

  T.test("notes: the start still goes to Agent, so Joker and Rater never hear anything (and why), and Agent is named as the leftover", ["Helper"], async () => {
    const s = jokeTeam();
    s.rules.push(rule("joker", "rater"));
    const n = await play(s);
    return n.length === 3 && n[0].kind === "start" && n[0].agent === "joker" && /^Joker never got a message\. The start goes to Agent, and no rule sends anything to Joker\. Should the start go to Joker\? You can choose beside the start\.$/.test(n[0].text) &&
      n[1].text === "Rater never got a message. Its rule from Joker sends when Joker responds, and Joker never did." &&
      n[2].kind === "first" && /every new society starts with/.test(n[2].text) && /the start goes to it/.test(n[2].text);
  });

  T.test("notes: the start goes to Joker but no rule sends on, so Rater hears nothing, and the note says what rule would", ["Helper"], async () => {
    const s = jokeTeam();
    s.agents.shift(); s.starts[0].to = s.roundAgent = "joker";
    const n = await play(s);
    return n.length === 1 && n[0].kind === "unsent" && n[0].text === "Rater never got a message: no rule sends anything to it. Agents only talk when a rule tells them to. A rule like “When Joker responds, send its words to Rater” would.";
  });

  T.test("notes: a rule that's off, a condition never met, and a start that goes to the second agent", ["Helper"], async () => {
    const s = jokeTeam();
    s.agents.shift(); s.starts[0].to = s.roundAgent = "joker";
    s.rules.push(rule("joker", "rater", { enabled: false }));
    const off = await play(s);
    s.rules[0] = rule("joker", "rater", { when: "text", word: "zebra" });
    const cond = await play(s);
    s.rules[0] = rule("joker", "rater");
    const wrong = await play(s, "rater"), right = await play(s);
    return off.length === 1 && off[0].kind === "off" && /switched off/.test(off[0].text) &&
      cond.length === 1 && cond[0].kind === "unfired" && /only when Joker's words contain “zebra”, and they never did/.test(cond[0].text) &&
      wrong.length === 1 && wrong[0].kind === "start" && /The start goes to Rater/.test(wrong[0].text) && right.length === 0;
  });

  T.test("notes: instructions left empty or as every new agent's; nothing after Stop; the Helper is told them", ["Helper"], async () => {
    const s = jokeTeam();
    s.agents.shift(); s.starts[0].to = s.roundAgent = "joker";
    s.rules.push(rule("joker", "rater"));
    s.agents[1].instructions = "";
    s.agents.push({ id: "fan", kind: "model", name: "New agent", emoji: "🤖", instructions: Helper.FIRST_INSTRUCTIONS, outputFields: [], history: "stateless", replyKind: "prose", pretend: "generic" });
    s.rules.push(rule("rater", "fan"));
    const n = await play(s), stopped = await play(s, null, true);
    const r = Engine.createRun(s, { adapter: pretend, runtime: Runtime }); r.start({ to: "joker", text: "cats" }); await r.play();
    const req = Helper.helperRequest(s, r.run.trace, "Why?", [], null).messages[0].content;
    return n.length === 2 && /^Rater has no instructions/.test(n[0].text) && /^New agent still has the instructions every new agent starts with/.test(n[1].text) &&
      stopped.length === 0 && /WHAT THE KIT NOTICED/.test(req) && /Rater has no instructions/.test(req);
  });

  T.test("page: after a run in your own society, “What the kit noticed” is on the stage until the society changes; the start's agent is chosen beside it", ["Helper", "Engine"], async () => {
    const { w: pw, errors } = await pageWindow();
    const ak = pw.__ak, $ = q => pw.document.querySelector(q);
    ak.app.settings.connection = "pretend"; ak.app.settings.speed = "instant";
    const s = jokeTeam(); s.id = "jokes-mine";
    ak.app.societies[s.id] = s; ak.app.order.push(s.id); ak.app.activeId = s.id; ak.renderAll();
    await ak.runNow();
    const shown = $(".run-notes") ? $(".run-notes").textContent : "";
    const sel = $('#colCenter select[data-bind="start-field"][data-field="to"]');
    sel.value = "joker"; sel.dispatchEvent(new pw.Event("change", { bubbles: true }));
    const gone = !$(".run-notes") && s.starts[0].to === "joker";
    return /What the kit noticed/.test(shown) && /Joker never got a message/.test(shown) && /Open Joker/.test(shown) && gone && !errors.length;
  });

  // Build with me: the Helper as a guide. Four goals in any order, a scripted guide when there's no model, what changed.
  T.test("build: the goals are met one by one as a Joke Team is made, and the scripted guide asks about the first one not met", ["Helper"], async () => {
    const s = Seeds.makeBlank("Joke Team"), H = Helper;
    const p0 = H.buildProgress(s, [], false), q0 = H.builderScript(s, p0, "x"), begin = H.builderScript(s, p0, H.BUILD_BEGIN);
    s.agents[0].name = "Joker"; s.agents[0].instructions = "Tell one short joke about the word you are given.";
    s.agents.push({ id: "rater", kind: "model", name: "Rater", emoji: "⭐", instructions: H.FIRST_INSTRUCTIONS, outputFields: [], history: "stateless", replyKind: "prose", pretend: "generic" });
    const q1 = H.builderScript(s, H.buildProgress(s, [], false), "x");
    s.agents[1].instructions = "Score the joke from 1 to 10.";
    const p2 = H.buildProgress(s, [], false), q2 = H.builderScript(s, p2, "x");
    s.rules.push(rule("agent", "rater"));
    s.starts[0].to = "rater";   // the Rater hears the start, but sends nothing on: the Joker never starts
    const p3 = H.buildProgress(s, [], false), q3 = H.builderScript(s, p3, "x");
    s.starts[0].to = "agent";
    const p4 = H.buildProgress(s, [], false), q4 = H.builderScript(s, p4, "x");
    const r = Engine.createRun(s, { adapter: pretend, runtime: Runtime }); r.start({ to: "agent", text: "cats" }); await r.play();
    const p5 = H.buildProgress(s, r.run.trace, true), stale = H.buildProgress(s, r.run.trace, false);
    const done = p => p.steps.filter(x => x.done).map(x => x.id).join(",");
    return done(p0) === "" && /What would you like a team of helpers to do\?/.test(begin) && /starts with one agent, called Agent/.test(q0) && /\[\[show: agent Agent\]\]$/.test(q0) &&
      /^Rater needs a job/.test(q1) && /\[\[show: agent Rater\]\]$/.test(q1) &&
      done(p2) === "two" && /agents only talk when a rule tells them to/.test(q2) && /\[\[show: add-rule\]\]$/.test(q2) &&
      done(p3) === "two,rule" && /The start goes to Rater now/.test(q3) && /\[\[show: start\]\]$/.test(q3) &&
      done(p4) === "two,rule,start" && /press ▶ Run/.test(q4) && done(p5) === "two,rule,start,run" && done(stale) === "two,rule,start" && /Every helper answered/.test(H.builderScript(s, p5, "x"));
  });

  T.test("build: what the learner changed, in plain words; the request carries the goals and changes; [[show: …]] comes out of the words", ["Helper"], async () => {
    const H = Helper, before = Seeds.makeBlank("J"), after = Seeds.makeBlank("J");
    after.agents[0].name = "Joker"; after.agents[0].instructions = "Tell a joke.";
    after.agents.push({ id: "rater", kind: "model", name: "Rater", instructions: "Score it.", outputFields: [], history: "stateless", replyKind: "prose" });
    after.rules.push(rule("agent", "rater"));
    after.starts[0].value = "cats";
    const ch = H.describeChanges(JSON.parse(JSON.stringify(before)), after);
    const req = H.buildRequest(after, [], "I made them", [], null, { fresh: false, changes: ch }), body = req.messages[0].content;
    const reply = await pretend.call(req), sp = H.splitShow("Who should hear the Joker?\n[[show: add-rule]]");
    return ch.join(" | ") === "renamed Agent to Joker | changed Joker's instructions to “Tell a joke.” | added an AI agent called Rater | added a rule: WHEN Joker responds ALWAYS SEND words TO Rater | changed the start to “cats”" &&
      /BUILD WITH ME/.test(req.system) && /\[done\] Two helpers, each with a job/.test(body) && /\[not yet\] A run where they all answer/.test(body) && /- added an AI agent called Rater/.test(body) && /The learner says: I made them$/.test(body) &&
      req.meta.persona === "builder" && reply.persona === "Scripted guide" && /Which helper should hear it first|press ▶ Run/.test(reply.text || reply.raw) && sp.text === "Who should hear the Joker?" && sp.show === "add-rule";
  });

  T.test("page: 🧱 Build with me from a new society's stage: the goals at the top, a question, Show me makes + Add a rule glow, and a run gets a reply", ["Helper"], async () => {
    const { w: pw, errors } = await pageWindow();
    const ak = pw.__ak, $ = q => pw.document.querySelector(q), $$ = q => Array.from(pw.document.querySelectorAll(q)), sleep = ms => new Promise(r => setTimeout(r, ms));
    ak.app.settings.connection = "pretend"; ak.app.settings.speed = "instant";
    const s = Seeds.makeBlank("Joke Team"); s.id = "jt-build";
    ak.app.societies[s.id] = s; ak.app.order.push(s.id); ak.app.activeId = s.id; ak.renderAll();
    const offered = !!$('.build-hint [data-act="helper-build"]');
    $('.build-hint [data-act="helper-build"]').click();
    await sleep(30);
    const first = $$("#helperLog .hmsg.ai").pop().textContent, goals = $$(".build-goals .goal").length, head = $(".drawer h3").textContent;
    s.agents[0].name = "Joker"; s.agents[0].instructions = "Tell one short joke.";
    s.agents.push({ id: "rater", kind: "model", name: "Rater", emoji: "⭐", instructions: "Score the joke from 1 to 10.", outputFields: [], canSeeImages: false, history: "stateless", replyKind: "prose", pretend: "generic" });
    ak.renderAll();
    pw.document.getElementById("helperInput").value = "I made a Joker and a Rater";
    $('[data-act="helper-send"]').click();
    await sleep(30);
    const second = $$("#helperLog .hmsg.ai").pop(), glowing = !!$('[data-act="add-rule"].glow') && ak.app.ui.lookInside === true;
    const oneDone = $$(".build-goals .goal.done").length;
    s.rules.push(rule("agent", "rater")); ak.renderAll();
    await ak.runNow();
    await sleep(30);
    const after = $$("#helperLog .hmsg").map(x => x.textContent), all = $$(".build-goals .goal.done").length;
    return offered && /Building with you/.test(head) && goals === 4 && /What would you like a team of helpers to do\?/.test(first) &&
      /rule tells them to/.test(second.textContent) && !/\[\[show/.test(second.textContent) && /Show me/.test(second.textContent) && glowing && oneDone === 1 &&
      after.some(t => /▶ I ran it\./.test(t)) && /Every helper answered/.test(after[after.length - 1]) && all === 4 && !$(".build-hint") && !errors.length;
  });

}
