// The static check, the instrumenter, and the in-page sandbox (the path a chat artifact uses).
export default function (T, { modelWindow }) {
  const w = modelWindow();
  const { SafeJS, Runtime } = w.AK;
  const rejects = (src, kind, pattern) => {
    const c = SafeJS.checkJS(src, kind || "program");
    if (c.ok) throw new Error("accepted: " + src);
    if (pattern && !c.errors.some(e => pattern.test(e.message))) throw new Error("wrong error: " + c.errors.map(e => e.message).join(" / "));
    return true;
  };
  const accepts = (src, kind) => {
    const c = SafeJS.checkJS(src, kind || "program");
    if (!c.ok) throw new Error("rejected: " + c.errors.map(e => e.line + ":" + e.message).join(" / "));
    return true;
  };
  const wrap = body => "function run(input, params, h) {\n" + body + "\n}";

  // Acceptance 7: a suite of forbidden identifiers.
  for (const name of ["window", "document", "globalThis", "self", "fetch", "XMLHttpRequest", "WebSocket", "postMessage", "eval", "Function", "importScripts", "constructor", "prototype"])
    T.test("static check rejects " + name, ["SafeJS"], () => rejects(wrap("const x = " + name + ";\nreturn { say: 'x' };"), "program", /isn't allowed/));
  T.test("static check rejects import(...)", ["SafeJS"], () => rejects(wrap("import('x');\nreturn {};")));
  T.test("static check rejects .__proto__", ["SafeJS"], () => rejects(wrap("const o = {};\nconst p = o.__proto__;\nreturn {};")));
  T.test("static check rejects .constructor", ["SafeJS"], () => rejects(wrap("const f = [].constructor;\nreturn {};")));
  T.test("static check rejects outside globals (localStorage, Date, setTimeout)", ["SafeJS"], () =>
    rejects(wrap("localStorage.getItem('k');\nreturn {};")) && rejects(wrap("return { t: Date.now() };")) && rejects(wrap("setTimeout(() => 1, 5);\nreturn {};")));
  T.test("static check rejects names it doesn't know", ["SafeJS"], () => rejects(wrap("return { v: mystery };"), "program", /isn't a name this program knows/));
  T.test("static check rejects this, try/catch, class and regexes", ["SafeJS"], () =>
    rejects(wrap("return { v: this };")) && rejects(wrap("try { } catch (e) { }\nreturn {};")) && rejects(wrap("class A {}\nreturn {};")) && rejects(wrap("return { w: 'a b'.split(/ /) };"), "program", /patterns/));
  T.test("static check rejects loops without braces", ["SafeJS"], () =>
    rejects(wrap("let n = 0;\nwhile (n < 3) n++;\nreturn {};"), "program", /put \{ \}/) && rejects(wrap("for (let i = 0; i < 3; i++) h.tick();\nreturn {};")));
  T.test("static check allows only safe Object and JSON members", ["SafeJS"], () =>
    rejects(wrap("const d = Object.getOwnPropertyDescriptor(h, 'x');\nreturn {};")) && rejects(wrap("const O = Object;\nreturn {};")) && rejects(wrap("JSON.parse = 1;\nreturn {};")));
  T.test("static check rejects computed keys in object literals", ["SafeJS"], () => rejects(wrap("const k = 'a';\nconst o = { [k]: 1 };\nreturn o;")));
  T.test("static check rejects code outside function run", ["SafeJS"], () =>
    rejects("const x = 1;\nfunction run(input, params, h) { return {}; }") && rejects("function run(input, params, h) { return {}; }\nrun();"));
  T.test("static check accepts ordinary programs", ["SafeJS"], () => accepts(wrap(
    "const words = h.words(input.text);\nconst counts = {};\nfor (const w of words) {\n  h.tick();\n  counts[w] = (counts[w] || 0) + 1;\n}\n" +
    "const best = Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0];\nconst { rows, cols: columns } = input.data;\n" +
    "return { say: `most: ${best}`, counts, rows, columns, total: words.length, pass: Array.isArray(words) && Number.isFinite(words.length) };")));
  T.test("static check accepts turtle programs and rejects non-turtle names", ["SafeJS"], () =>
    accepts("penColor('red');\nfor (let i = 0; i < 36; i++) { forward(5); right(10); }\ndot(10, 'blue');\nlabel('hi');", "turtle") &&
    rejects("forward(10);\nfetch('x');", "turtle") && rejects("input.data;", "turtle"));

  T.test("instrumenter adds a step counter to loops and functions", ["SafeJS"], () => {
    const c = SafeJS.compileJS(wrap("let n = 0;\nwhile (n < 5) { n++; }\nconst f = x => x + 1;\nreturn { n: f(n) };"), "program");
    if (!c.ok) throw new Error(SafeJS.formatErrors(c.errors));
    return (c.exec.match(/__ak\.tick\(\)/g) || []).length >= 3;
  });
  T.test("instrumenter wraps [ ] lookups in the key guard", ["SafeJS"], () => {
    const c = SafeJS.compileJS(wrap("const a = [1, 2];\nreturn { v: a[0] + input.data['x'] };"), "program");
    return c.ok && (c.exec.match(/__ak\.key\(\(/g) || []).length === 2;
  });
  T.test("instrumenter keeps the h.tick() a translator already wrote", ["SafeJS"], () => {
    const c = SafeJS.compileJS(wrap("for (let i = 0; i < 2; i++) {\n  h.tick();\n}\nreturn {};"), "program");
    return c.ok && !/__ak\.tick\(\);\s*h\.tick/.test(c.exec);
  });

  T.test("a runaway loop is stopped by the step counter", ["Runtime", "Sandbox"], async () => {
    const r = await Runtime.runProgram(wrap("let n = 0;\nwhile (true) { n++; }\nreturn { n };"), {}, {});
    return !r.ok && /too many steps/.test(r.error) && r.ticks > 100000;
  });
  T.test("runaway recursion is stopped", ["Runtime"], async () => {
    const r = await Runtime.runProgram(wrap("function f(n) { return f(n + 1) + 1; }\nreturn { v: f(0) };"), {}, {});
    return !r.ok;
  });
  T.test("the key guard blocks a computed 'constructor' escape", ["Runtime", "Sandbox"], async () => {
    const r = await Runtime.runProgram(wrap("const k = 'constru' + 'ctor';\nconst F = h.words[k];\nreturn { v: typeof F };"), {}, {});
    return !r.ok && /can't be used inside \[ \]/.test(r.error);
  });
  T.test("a parameter named like a global can't reach the real global elsewhere", ["Runtime", "Sandbox"], async () => {
    w.secretMarker = 42;
    const r = await Runtime.runProgram(wrap("function f(secretMarker) { return secretMarker; }\nconst x = f(1);\nreturn { leaked: typeof secretMarker === 'undefined' ? 'no' : secretMarker, x };"), {}, {});
    return r.ok && r.output.leaked === "no" && r.output.x === 1;
  });
  T.test("programs must give back an object", ["Runtime"], async () => {
    const r = await Runtime.runProgram(wrap("return 5;"), {}, {});
    return !r.ok && /object/.test(r.error);
  });
  T.test("a static-check failure never runs the code", ["Runtime"], async () => {
    w.ranMarker = 0;
    const r = await Runtime.runProgram(wrap("window.ranMarker = 1;\nreturn {};"), {}, {});
    return !r.ok && r.stage === "check" && w.ranMarker === 0;
  });
}
