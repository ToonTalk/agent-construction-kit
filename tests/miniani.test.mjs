// The Mini-Ani example (1.14.0): Ken Kahn's 1978 Ani in miniature, with program agents only, so it runs with no model.
import { readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export default function (T, { modelWindow, pageWindow, same }) {
  const w = modelWindow();
  const { Seeds, Society, Engine, Runtime, Scenarios, Library } = w.AK;
  const PROGRAMS = ["cast", "personality", "looks", "relationships", "taste", "choice-points", "methods", "director"];
  const acts = (r, id) => r.trace.filter(e => e.kind === "activation" && e.agentId === id && !e.collecting);
  const at = (r, id, round) => acts(r, id).find(e => e.round === round);
  const story = async (setup, seed) => {
    const s = Seeds.makeMiniAni();
    if (setup) setup(s);
    const api = Engine.createRun(s, { runtime: Runtime, seed: seed || 1 });   // no adapter: no model at all
    api.start({ to: s.starts[0].to, text: s.starts[0].value });
    await api.play();
    return api.run;
  };
  let plain = null;
  const ran = () => (plain = plain || story());
  const agent = (s, id) => s.agents.find(a => a.id === id);

  T.test("Mini-Ani: an example of eight programs (Personality and Looks are one ani-expert type) and a Renderer, wired by ordinary rules, each passing its own scenarios", ["Seeds", "Scenarios"], async () => {
    const s = Seeds.makeMiniAni();
    const errs = Society.validateSociety(s);
    if (errs.length) throw new Error(errs.join("; "));
    const progs = s.agents.filter(a => a.kind === "program");
    for (const a of progs) {
      const bad = (await Scenarios.runScenarios(a, Runtime)).filter(x => !x.ok);
      if (bad.length) throw new Error(a.id + ": " + JSON.stringify(bad[0]).slice(0, 400));
    }
    const m14 = s.rules.find(r => r.id === "m14");
    return Seeds.EXAMPLES.some(x => x.id === "miniani") && s.agents.length === 9 && same(progs.map(a => a.id), PROGRAMS) && !s.agents.some(a => a.kind === "model") &&
      agent(s, "personality").typeId === "ani-expert" && agent(s, "looks").typeId === "ani-expert" && progs.every(a => Library.LIB[a.typeId] && a.code.js === Library.LIB[a.typeId].js) &&
      agent(s, "choice-points").collect && agent(s, "choice-points").params.wait === 20 && s.roundAgent === "cast" &&
      m14.from === "renderer" && m14.to === "cast" && m14.when === "data" && m14.field === "pass" && m14.value === "false" &&
      s.link.url === "https://toontalk.github.io/ani/" && s.questions.length === 5 && s.intro.length < 400 && agent(s, "choice-points").typeId === "ani-choices";
  });
  T.test("Mini-Ani: export and import restore every program from the library, and keep the Looks expert's knowledge and a filled-in empty line", ["Seeds", "Import"], () => {
    const s = Seeds.makeMiniAni();
    Society.setParams(agent(s, "personality"), { w10: "brave", s10: "a bit fast, very purposeful" });
    const back = Society.importSociety(Society.exportSociety(s, null)).society;
    const p = agent(back, "personality"), l = agent(back, "looks");
    return back.agents.filter(a => a.kind === "program").every(a => a.status === "ok" && a.code.js === Library.LIB[a.typeId].js) &&
      p.params.w10 === "brave" && /\{brave\} suggests \{a bit fast, very purposeful\}/.test(p.pseudocode) && l.params.w1 === "beautiful" && /\{beautiful\} suggests \{smooth, a bit bright, a bit fancy\}/.test(l.pseudocode) &&
      l.scenarios.some(x => /pretty, like beautiful/.test(x.expect.sayContains || "")) && back.link.url === s.link.url;
  });
  T.test("Mini-Ani: the default story runs to “The end.” with no model: four scenes, one a round, each a film", ["Engine", "Seeds"], async () => {
    const r = await ran();
    const films = acts(r, "renderer"), cast = acts(r, "cast"), last = cast[cast.length - 1];
    return r.status === "done" && films.length === 4 && same(films.map(e => e.round), [1, 2, 3, 4]) && films.every(e => !e.render.error && e.render.frames >= 16) &&
      last.response.text === "The end." && last.response.data.pass === false && !r.trace.some(e => e.error || e.call) && cast.length === 5;
  });
  T.test("Mini-Ani: two runs are the same apart from the seed and the timing", ["Engine"], async () => {
    const strip = v => (Array.isArray(v) ? v.map(strip) : v && typeof v === "object" ? Object.keys(v).filter(k => ["seed", "t", "ms", "timestamp"].indexOf(k) < 0).reduce((o, k) => (o[k] = strip(v[k]), o), {}) : v);
    const a = await ran(), b = await story(null, 77);
    return a.trace.length === b.trace.length && JSON.stringify(strip(a.trace)) === JSON.stringify(strip(b.trace));
  });
  T.test("Mini-Ani: the card's question has an answer in scene 1, said first: Cinderella is slow and small because she is shy", ["Engine"], async () => {
    const say = at(await ran(), "choice-points", 1).response.text;
    return /Cinderella is slow because of shy, graceful \(beautiful brings it\)/.test(say) && /small because of shy, shabby/.test(say) && say.indexOf("**Scene 1 of 4.** **Why Cinderella is like that:** Cinderella is slow because of shy") === 0 &&
      say.indexOf("**Why") < say.indexOf("I chose everyone's values once") && say.indexOf("I chose everyone's values once") < say.indexOf("**Settled:**");
  });
  T.test("Mini-Ani: two passes, as in Ani: scene 1 chooses for the whole cast once; later scenes keep those values and choose again only for a stand-in, with the variety frozen", ["Engine"], async () => {
    const r = await ran();
    const chose = round => at(r, "cast", round).response.data.choose.map(c => c.name);
    const cp = round => at(r, "choice-points", round);
    const counts = round => JSON.stringify(cp(round).program.output.memory.counts);
    const values = cp(1).program.output.memory.values;
    return same(chose(1), ["Cinderella", "Stepmother", "Godmother", "Prince"]) && chose(2).length === 0 && same(chose(3), ["Cinderella after"]) && same(chose(4), ["Cinderella after"]) &&
      cp(2).response.data.count === 0 && /keeps the values chosen before/.test(cp(2).response.text) && counts(1) === counts(4) &&
      Object.keys(values).length === 4 && cp(1).response.data.why.Prince && Object.keys(cp(1).response.data.why.Prince).length === 13;
  });
  T.test("Mini-Ani: scene 3 changes Cinderella from shabby to elegant: a stand-in, an in-between over 8 frames, and her new words from then on", ["Engine"], async () => {
    const r = await ran();
    const d3 = at(r, "director", 3).response.data, cp3 = at(r, "choice-points", 3).response.text;
    const words4 = at(r, "cast", 4).response.data.choose[0].words;
    return d3.steps[0].what === "The Godmother goes to Cinderella and changes Cinderella" && /IFELSE :T < 5 \[C_CINDERELLA /.test(d3.program) && /\[C_CINDERELLA_AFTER /.test(d3.program) &&
      /What changed: Cinderella: medium detail → fancy/.test(cp3) && words4.indexOf("elegant") >= 0 && words4.indexOf("shabby") < 0 && words4.indexOf("bold") >= 0 && words4.indexOf("shy") < 0;
  });
  T.test("Mini-Ani: every scene's Logo runs, stays under 3,900 characters and names each character's procedure C_…", ["Engine", "Logo"], async () => {
    const r = await ran();
    return acts(r, "director").every(e => e.response.data.fits && e.response.data.program.length <= 3900 && /\nTO C_CINDERELLA :X :Y :T :F\n/.test(e.response.data.program) &&
      e.response.data.program.split("\n").filter(l => /^TO /.test(l)).every(l => /^TO (C_[A-Z0-9_]+|SCREEN|SHAPE|FLOWER) /.test(l + " "))) && acts(r, "renderer").every(e => !e.render.error);
  });
  T.test("Mini-Ani: a Logo program that doesn't run is named by the Cast, and the story goes on", ["Engine"], async () => {
    const r = await story(s => { const d = agent(s, "director"); d.code = Object.assign({}, d.code, { js: "function run(input, params, h) {\n  return { program: input.data.scene === 2 ? \"JUMP 10\" : \"FORWARD 10 WAIT 15 FORWARD 10\", say: \"A film.\" };\n}" }); });
    const r2 = at(r, "renderer", 2), c3 = at(r, "cast", 3);
    return r.status === "done" && r2.response.data.pass === false && r2.fired.length === 1 && r2.fired[0].ruleId === "m14" && /^Scene 2's film didn't run \(.*JUMP.*\), so on to the next scene\./.test(c3.response.text) &&
      c3.response.data.scene === 3 && acts(r, "cast").pop().response.text === "The end.";
  });
  T.test("Mini-Ani: “Like Ani in 1978” has no Looks expert, so the Director uses Ken's shapes and colors in the Cast's order", ["Engine", "Seeds"], async () => {
    const r = await story(s => Society.applyVariant(s, "1978", true));
    const d1 = at(r, "director", 1).response, p = d1.data.program;
    return acts(r, "looks").length === 0 && /as Ken drew them in 1978, in the Cast's order: Cinderella a green star, the Stepmother a red square\./.test(d1.text) &&
      /TO C_CINDERELLA[^]*?SHAPE [^\n]* 5 144 1\n/.test(p) && /TO C_STEPMOTHER[^]*?SHAPE [^\n]* 4 90 1\n/.test(p) && /MAKE "C1 \[70 210 80\]/.test(p) && /MAKE "C2 \[255 70 60\]/.test(p);
  });
  T.test("Mini-Ani: when shy suggests “very fast”, the Method Chooser crosses out standing guard, says why, and the film is still made", ["Engine"], async () => {
    const r = await story(s => Society.setParams(agent(s, "personality"), { s1: "very fast, very wary of strangers, a bit drawn to friends" }));
    const m2 = at(r, "methods", 2).response;
    return /Crossed out stands guard: the Stepmother isn.t faster than Cinderella./.test(m2.text) && m2.data.ways[0] === "moves about" && !at(r, "renderer", 2).render.error && at(r, "renderer", 2).render.frames > 1;
  });
  T.test("Mini-Ani: a character keeps one color through the film, and no two characters share one", ["Engine"], async () => {
    const r = await ran();
    const colors = acts(r, "director").map(e => e.program.output.memory.colors);
    const last = colors[colors.length - 1];
    return same(Object.keys(last), ["Cinderella", "Stepmother", "Prince", "Godmother"]) && new Set(Object.values(last)).size === 4 && colors.every(c => Object.keys(c).every(n => c[n] === last[n]));
  });
  T.test("Mini-Ani: the trace is measured, and no program's data was cut or dropped on the way", ["Engine", "Store"], async () => {
    const r = await ran();
    const json = JSON.stringify(r.trace), gz = gzipSync(Buffer.from(json)).length;
    const cut = [];
    for (const e of r.trace) {
      if (e.kind !== "activation" || !e.program || !e.response) continue;
      const out = Object.assign({}, e.program.output);
      if (String(out.say || "").length > 2000) cut.push(e.agentName + " r" + e.round + ": say");
      delete out.say; delete out.memory;
      if (JSON.stringify(JSON.parse(JSON.stringify(out))) !== JSON.stringify(e.response.data)) cut.push(e.agentName + " r" + e.round);
    }
    console.log("       (the default trace: " + r.trace.length + " entries, " + json.length + " bytes, " + gz + " gzipped)");
    if (cut.length) throw new Error("cut: " + cut.join(", "));
    return json.length < 700000 && gz < 90000;
  });
  T.test("Mini-Ani: how often its scene-1 choices agree with Ani's own (CP 29), never below the recorded floor", ["Engine"], async () => {
    const fx = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), "fixtures", "cp29-cinderella.json"), "utf8"));
    const values = at(await ran(), "choice-points", 1).program.output.memory.values;
    const level = v => (/^negative/.test(v) ? 1 : /^positive/.test(v) ? 3 : { low: 1, medium: 2, high: 3 }[v]);
    let agree = 0, all = 0;
    for (const who of Object.keys(fx.choices)) for (const el of Object.keys(fx.compared)) { all++; if (level(fx.choices[who][fx.compared[el]]) === values[who][el]) agree++; }
    console.log("       (agrees with CP 29 on " + agree + " of " + all + " choices; the floor is " + fx.floor + ")");
    return all === 28 && agree >= fx.floor;
  });
  T.test("any language: the Mini-Ani's default story runs to its end with no model, every scene a film, and only one of its words unknown to every expert", ["Engine", "Seeds"], async () => {
    const r = await ran();
    const last = acts(r, "cast").pop().response.data, films = acts(r, "renderer");
    return r.status === "done" && last.pass === false && last.over === true && films.length === 4 && films.every(e => e.render.frames >= 16 && !e.render.error) &&
      at(r, "choice-points", 1).response.data.unknown.length === 1;
  });
  T.test("page: ＋ New society starts the Mini-Ani with no model set up; its card links to Ani's own film, and + Add an agent lists its programs under their own heading", ["Seeds"], async () => {
    const { w: pw } = await pageWindow();
    const ak = pw.__ak;
    ak.app.settings.connection = "none"; ak.app.settings.speed = "instant";
    pw.document.querySelector('[data-act="new-society"]').click();
    const hint = Array.from(pw.document.querySelectorAll(".modal-body")).pop().querySelector('[data-new="example"][data-id="miniani"]');
    const linked = !!hint.nextElementSibling.querySelector('a[href="https://toontalk.github.io/ani/"]');
    hint.click();
    await new Promise(r => setTimeout(r, 30));
    const card = !!pw.document.querySelector('#colLeft .qcard a[href="https://toontalk.github.io/ani/"][target="_blank"]');
    await ak.runNow();
    const run = ak.app.runs[ak.soc().id].api.run;
    ak.app.ui.lookInside = true; ak.renderAll();
    pw.document.querySelector('[data-act="add-agent"]').click();
    const m = Array.from(pw.document.querySelectorAll(".modal-body")).pop();
    const heads = Array.from(m.querySelectorAll("h4")).map(h => h.textContent);
    return linked && card && ak.soc().title === "Mini-Ani" && run.status === "done" && acts(run, "renderer").length === 4 &&
      heads.some(h => /Mini-Ani/.test(h)) && m.querySelectorAll('[data-add-type^="ani-"]').length === 8;
  });

  // 1.15.1, after a review
  const told = async i => { const s = Seeds.makeMiniAni(); const api = Engine.createRun(s, { runtime: Runtime, seed: 1 }); api.start({ to: s.starts[i].to, text: s.starts[i].value }); await api.play(); return api.run; };
  T.test("Mini-Ani: the other two starts have a focus and a why of their own: the first one the Cast names, since Cinderella isn't in them", ["Engine"], async () => {
    const j = await told(1), w = await told(2);
    const taste = at(j, "taste", 1).response, c1 = at(j, "choice-points", 1).response.text, c3 = at(j, "choice-points", 3).response.text, w1 = at(w, "choice-points", 1).response.text;
    return j.status === "done" && w.status === "done" && /Its focus is Tom, the first one the Cast names, because Cinderella isn't in this story\./.test(taste.text) && taste.data.taste.focus === "Tom" &&
      c1.indexOf("**Scene 1 of 3.** **Why Tom is like that:** Cinderella isn't in this story, so I explain Tom, the first one chosen. Tom is slow because of shy") === 0 && /Tom first, as the film's focus/.test(c1) &&
      c3.indexOf("**Scene 3 of 3.** **Why Tom after is like that:** Tom after is ") === 0 &&
      w1.indexOf("**Scene 1 of 3.** **Why the Wolf is like that:** Cinderella isn't in this story, so I explain the Wolf, the first one chosen.") === 0 && /I chose again for the Wolf after, with/.test(at(w, "choice-points", 2).response.text);
  });
  T.test("Mini-Ani: a word no expert knew is named once, in scene 1, and not again in the scenes after", ["Engine"], async () => {
    const r = await ran();
    const named = [1, 2, 3, 4].map(n => /\*\*Words no expert knew:\*\* helps \(the Godmother\)\./.test(at(r, "choice-points", n).response.text));
    return same(named, [true, false, false, false]) && same(at(r, "choice-points", 3).response.data.unknown, []) && /I don't know these words: helps \(the Godmother\)/.test(at(r, "relationships", 3).response.text);
  });
  T.test("Mini-Ani: a “same” comparison is “as”, not “than”, and Relationships says who is compared with whom", ["Engine"], async () => {
    const rel = agent(Seeds.makeMiniAni(), "relationships"), cp = Library.LIB["ani-choices"];
    const r = await Runtime.runProgram(rel.code.js, { from: "Cast", text: "", data: { choose: [{ name: "Ann", words: [] }, { name: "Bob", words: [] }], relations: [{ who: "Ann", verb: "likes", whom: "Bob" }], called: {} } }, { params: rel.params, seed: 1 });
    const out = (await Runtime.runProgram(cp.js, { from: "x", text: "", data: {}, memory: { values: { Bob: { speed: 3 } }, nets: {}, counts: {} }, messages: [
      { from: "Cast", text: "", data: { scene: 1, of: 1, title: "A scene.", cast: ["Ann", "Bob"], called: {}, choose: [{ name: "Ann", words: [] }], onStage: ["Ann", "Bob"], relations: [], friends: [], events: [] } },
      { from: "Relationships", text: "", data: { suggestions: r.output.suggestions.filter(x => x.who === "Ann") } }] }, { params: Object.assign({}, cp.params, { explain: "Ann" }), seed: 1 })).output;
    return /^- Ann likes Bob → Ann, compared with Bob: a bit same speed, a bit same liveliness; Bob: the other way round$/m.test(r.output.say) && !/than Bob/.test(r.output.say) &&
      out.why.Ann.speed.because[0] === "same speed as Bob (likes)" && /fast because of same speed as Bob \(likes\)/.test(out.say);
  });
  T.test("Mini-Ani: the programs-only Choice Points has no AI or You parts; the voices' one is made from it, with its line about AI agents and You", ["Library", "Seeds"], () => {
    const B = Library.LIB["ani-choices"], V = Library.LIB["ani-choice-points"];
    const bl = B.pseudocode.split("\n"), vl = V.pseudocode.split("\n"), loop = V.js.split("\n").findIndex(l => /for \(const m of voices\)/.test(l)) + 1;
    const cv = Seeds.makeMiniAniVoices().agents.find(a => a.id === "choice-points");
    return agent(Seeds.makeMiniAni(), "choice-points").typeId === "ani-choices" && cv.typeId === "ani-choice-points" && cv.code.js === V.js &&
      !/AI agent|\{You\}/.test(B.pseudocode) && !/voices|PERSON|params\.ai|params\.you/.test(B.js) && ["ai", "person", "you"].every(k => !(k in B.params) && k in V.params) &&
      vl.length === bl.length + 1 && /from an AI agent \{2\}, or from \{You\} \{3\}/.test(vl[13]) && same(vl.slice(0, 13).concat(vl.slice(14)), bl) &&
      V.js.split("\n").length === B.js.split("\n").length + 18 && loop > 0 && Engine.linkedLines(V.lineMap, "pseudo", 14).js.indexOf(loop) >= 0 && Engine.linkedLines(V.lineMap, "js", loop).pseudo.join() === "14" &&
      V.scenarios.length === B.scenarios.length + 3 && V.slots.length === B.slots.length + 3 && B.slots.every((x, k) => V.slots[k].param === x.param && V.slots[k].line === (x.line < 14 ? x.line : x.line + 1)) &&
      Seeds.makeMiniAni().questions.every(q => !/\bAI\b|\bYou\b/.test(q));
  });
  T.test("Mini-Ani: importing the shipped examples/mini-ani.json keeps the {slot} braces in the card's questions", ["Import", "Seeds"], () => {
    const file = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "examples", "mini-ani.json"), "utf8");
    const back = Society.importSociety(file).society;
    return same(back.questions, Seeds.makeMiniAni().questions) && back.questions.some(q => q.indexOf("“more than {2} times as strong”") >= 0) && back.questions.some(q => q.indexOf("“{-} suggests {-}”") >= 0) &&
      back.agents.filter(a => a.kind === "program").every(a => a.status === "ok") && JSON.parse(file).app === "Agent Kit " + w.AK.VERSION;
  });
  T.test("page: the Choice Points' answer is one click away: no waiting lines, its messages and its long program folded, and why first", ["Engine"], async () => {
    const { w: pw } = await pageWindow();
    const ak = pw.__ak;
    ak.app.settings.connection = "none"; ak.app.settings.speed = "instant";
    pw.document.querySelector('[data-act="new-society"]').click();
    Array.from(pw.document.querySelectorAll(".modal-body")).pop().querySelector('[data-new="example"][data-id="miniani"]').click();
    await new Promise(r => setTimeout(r, 30));
    await ak.runNow();
    const run = ak.app.runs[ak.soc().id].api.run, i = acts(run, "choice-points").find(e => e.round === 1).i;
    const list = () => pw.document.querySelector("#traceList"), entry = () => list().querySelector('[data-act="trace-toggle"][data-i="' + i + '"]').parentNode;
    const programs = Number(pw.document.querySelector('[data-act="trace-filter"][data-id="program"] .cnt').textContent);
    const quiet = !/is waiting/.test(list().textContent) && run.trace.some(e => e.collecting) && programs === run.trace.filter(e => e.kind === "activation" && e.agentKind === "program" && !e.collecting).length;
    const head = entry().querySelector(".sum").textContent;
    entry().querySelector('[data-act="trace-toggle"]').click();
    const folds = () => Array.from(entry().querySelectorAll('[data-act="more-toggle"]'));
    const shut = folds().length === 2 && !entry().querySelector(".pseudo") && !entry().querySelector("ul.heard.got") && /Show the 5 messages, in plain words/.test(folds()[0].textContent) && /Show the program \(25 lines\)/.test(folds()[1].textContent);
    const said = entry().querySelector(".said").textContent;
    folds()[0].click(); folds()[1].click();
    const got = entry().querySelectorAll("ul.heard.got li"), pseudo = entry().querySelector(".pseudo");
    return quiet && /Why Cinderella is like that: Cinderella is slow because of shy/.test(head) && shut && said.indexOf("Scene 1 of 4. Why Cinderella is like that: Cinderella is slow") === 0 &&
      got.length === 5 && /^Cast sent data:/.test(got[0].textContent) && !!pseudo && /wait for the scene and the experts' suggestions/.test(pseudo.textContent) && folds().every(b => b.getAttribute("aria-expanded") === "true");
  });
  T.test("page: with no model, the Helper says it needs one and offers the society's questions to think about, not buttons that can only fail", ["Seeds"], async () => {
    const { w: pw } = await pageWindow();
    const ak = pw.__ak;
    ak.app.settings.connection = "none";
    pw.document.querySelector('[data-act="new-society"]').click();
    Array.from(pw.document.querySelectorAll(".modal-body")).pop().querySelector('[data-new="example"][data-id="miniani"]').click();
    await new Promise(r => setTimeout(r, 30));
    ak.app.ui.helperOpen = true; ak.renderAll();
    const none = pw.document.querySelector(".drawer");
    const offline = !none.querySelector('[data-act="helper-ask"]') && none.querySelectorAll("ul.hmsg-q li").length === 3 && !!none.querySelector('[data-act="settings"]') && /need a model/.test(none.textContent) && /Which agent decides how big Cinderella is\?/.test(none.textContent);
    ak.app.settings.connection = "pretend"; ak.renderAll();
    return offline && pw.document.querySelectorAll('.drawer [data-act="helper-ask"]').length === 3;
  });
}
