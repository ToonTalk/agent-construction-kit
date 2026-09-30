// The runtime, the helper library h, the turtle engine, and the Worker's own code.
export default function (T, { modelWindow, same }) {
  const w = modelWindow();
  const { Runtime, Sandbox, Prompts, SafeJS } = w.AK;
  const wrap = body => "function run(input, params, h) {\n" + body + "\n}";

  T.test("run gets input, params and h, and its output comes back", ["Runtime"], async () => {
    const r = await Runtime.runProgram(wrap("return { say: input.text + '!', n: params.n * 2 };"), { text: "hi" }, { params: { n: 21 } });
    return r.ok && r.output.say === "hi!" && r.output.n === 42;
  });
  T.test("the same input gives the same output (Math.random and h.pick are seeded)", ["Runtime", "Sandbox"], async () => {
    const src = wrap("return { r: Math.random(), p: h.pick([1, 2, 3, 4, 5, 6, 7, 8, 9]) };");
    const a = await Runtime.runProgram(src, {}, { seed: 7 }), b = await Runtime.runProgram(src, {}, { seed: 7 }), c = await Runtime.runProgram(src, {}, { seed: 8 });
    return same(a.output, b.output) && !same(a.output, c.output);
  });
  T.test("a program gets a copy of its input", ["Runtime"], async () => {
    const input = { data: { list: [1] } };
    await Runtime.runProgram(wrap("input.data.list.push(2);\nreturn {};"), input, {});
    return input.data.list.length === 1;
  });
  const H = Sandbox.makeH(1, Sandbox.makeGuard(1000));
  T.test("h.words", ["Sandbox"], () => same(H.words("A red Cat, a RED dog!"), ["a", "red", "cat", "a", "red", "dog"]));
  T.test("h.sharedWordFraction", ["Sandbox"], () => H.sharedWordFraction("a red circle", "the red circle") === 2 / 3 && H.sharedWordFraction("", "x") === 0);
  T.test("h.count and h.unique", ["Sandbox"], () => H.count([1, 2, 3]) === 3 && H.count("abc") === 3 && H.count({ a: 1, b: 2 }) === 2 && same(H.unique([3, 1, 3, "3", 1]), [3, 1, "3"]));
  T.test("h.roundTo", ["Sandbox"], () => H.roundTo(47, 10) === 50 && H.roundTo(253, 10) === 250 && H.roundTo(12, 5) === 10);
  T.test("h.groupBy and h.tally", ["Sandbox"], () => {
    const g = H.groupBy([{ y: 1, v: "a" }, { y: 2, v: "b" }, { y: 1, v: "c" }], "y");
    const t = H.tally(H.tally({}, "x"), "x");
    return g["1"].length === 2 && g["2"].length === 1 && t.x === 2;
  });
  T.test("h.tally ignores __proto__ keys", ["Sandbox"], () => { const t = H.tally({}, "__proto__"); return Object.keys(t).length === 0 && Object.getPrototypeOf(t) === w.Object.prototype; });
  T.test("the helper library h is documented", ["Prompts"], () => Prompts.H_DOC.length >= 9 && Prompts.H_DOC.every(d => /^h\./.test(d[0]) && d[1].length > 10));

  T.test("turtle: lines, dots and labels are recorded", ["Runtime", "Sandbox"], async () => {
    const r = await Runtime.runTurtle("penColor('red');\nforward(50);\nright(90);\nforward(50);\ndot(12, 'blue');\npenUp();\ngoTo(10, 10);\nlabel('hello');", {});
    const o = r.output;
    return r.ok && o.segments === 2 && o.dots.length === 1 && o.dots[0].color === "blue" && same(o.labels, ["hello"]) && o.ops.filter(x => x.t === "L").length === 2;
  });
  T.test("turtle: starts in the middle facing up; y counts down from the top", ["Sandbox"], async () => {
    const r = await Runtime.runTurtle("forward(100);\ndot(5);", {});
    const d = r.output.dots[0];
    return Math.abs(d.x - 256) < 0.01 && Math.abs(d.y - 156) < 0.01;
  });
  T.test("turtle: a dot takes the pen color when it has none", ["Sandbox"], async () => { const r = await Runtime.runTurtle("penColor('Green');\ndot(10);", {}); return r.output.dots[0].color === "green"; });
  T.test("turtle: a broken program reports its error", ["Runtime"], async () => { const r = await Runtime.runTurtle("forward(10);\nnotACommand(3);", {}); return !r.ok && /notACommand/.test(r.error); });
  T.test("turtle: an empty program is an error, not a crash", ["Runtime"], async () => { const r = await Runtime.runTurtle("   ", {}); return !r.ok && r.output.ops.length === 0; });
  T.test("turtle: a runaway drawing is stopped", ["Runtime"], async () => { const r = await Runtime.runTurtle("while (true) { forward(1); }", {}); return !r.ok && /too many steps/.test(r.error); });

  T.test("the Worker's own code runs programs and stops a runaway loop", ["Sandbox", "Runtime"], async () => {
    // jsdom has no Worker, so run the exact Worker source against a stand-in scope.
    const src = Sandbox.WorkerExec.source();
    const replies = [];
    const scope = { postMessage: m => replies.push(m) };
    new w.Function("self", src)(scope);
    const job = (id, js, kind) => {
      const c = SafeJS.compileJS(js, kind);
      return { id, kind, key: kind + id, body: '"use strict";\n' + c.exec + (kind === "program" ? "\n;return run;" : "\n"), input: { text: "a b" }, params: { k: 3 }, seed: 1, tickLimit: 1000 };
    };
    scope.onmessage({ data: job(1, wrap("return { n: h.words(input.text).length * params.k };"), "program") });
    scope.onmessage({ data: job(2, wrap("while (true) { }\nreturn {};"), "program") });
    scope.onmessage({ data: job(3, "forward(10);\ndot(4, 'red');", "turtle") });
    return replies[0].ok && replies[0].output.n === 6 && !replies[1].ok && /too many steps/.test(replies[1].error) && replies[2].ok && replies[2].output.dots.length === 1;
  });
  T.test("without a Worker, programs run in the page with a step counter", ["Runtime"], async () => {
    const m = await Runtime.probe();
    return m === "function" && /step counter/.test(Runtime.note);
  });
}
