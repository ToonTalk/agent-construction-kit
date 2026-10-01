// The Logo interpreter: the language the Artist, the Designer and the drawing pad write in.
export default function (T, { modelWindow, same, MODEL_SRC }) {
  const w = modelWindow();
  const { Logo, Runtime, Geometry } = w.AK;
  const run = (src, seed) => Logo.run(src, { seed: seed || 1 });
  const near = (a, b) => Math.abs(a - b) < 0.01;
  const sizes = r => r.output.ops.filter(o => o.t === "D").map(o => o.s);

  T.test("Logo: lines, dots and labels are recorded", ["Logo"], () => {
    const r = run("SETPENCOLOR \"red\nFORWARD 50 RIGHT 90 FORWARD 50\n(DOT 12 \"blue)\nPENUP SETXY -246 246 LABEL [hello, there]");
    const o = r.output;
    return r.ok && o.segments === 2 && o.dots.length === 1 && o.dots[0].color === "blue" && same(o.labels, ["hello, there"]) && o.ops.filter(x => x.t === "L").length === 2;
  });
  T.test("Logo: the turtle starts in the middle facing up, and y goes up", ["Logo"], () => {
    const [a, b] = run("FORWARD 100 DOT 5\nPENUP SETXY 50 -20 DOT 5").output.dots;
    return near(a.x, 256) && near(a.y, 156) && near(b.x, 306) && near(b.y, 276);
  });
  T.test("Logo: a dot takes the pen color", ["Logo"], () => run("SETPC \"Green DOT 10").output.dots[0].color === "green");
  T.test("Logo: REPEAT and REPCOUNT, nested", ["Logo"], () => {
    const r = run("PENUP REPEAT 3 [REPEAT 4 [DOT REPCOUNT FORWARD 10] RIGHT 90]");
    return r.ok && same(sizes(r), [1, 2, 3, 4, 1, 2, 3, 4, 1, 2, 3, 4]);
  });
  T.test("Logo: TO makes new commands with inputs, usable before they are defined", ["Logo"], () => {
    const r = run("SQUARE 40\nTO SQUARE :SIZE\n  REPEAT 4 [FORWARD :SIZE RIGHT 90]\nEND\nPENUP FORWARD 60 PENDOWN SQUARE 20");
    return r.ok && r.output.segments === 8;
  });
  T.test("Logo: a command can call itself until it STOPs", ["Logo"], () => {
    const r = run("TO TREE :N\n  IF :N < 5 [STOP]\n  FORWARD :N LEFT 30 TREE :N / 2 RIGHT 60 TREE :N / 2 LEFT 30 BACK :N\nEND\nTREE 40");
    return r.ok && r.output.segments === 30;
  });
  T.test("Logo: arithmetic in the usual order, and SETXY 10 -20 means minus 20", ["Logo"], () => {
    const r = run("MAKE \"A 2 + 3 * 4\nPENUP SETXY :A -20 DOT 4\nSETXY (10 - 4) / 2 :A - 20 DOT 4");
    const [a, b] = r.output.dots;
    return r.ok && near(a.x, 270) && near(a.y, 276) && near(b.x, 259) && near(b.y, 262);
  });
  T.test("Logo: IF, IFELSE, IF with two lists, FOR and WHILE", ["Logo"], () => {
    const r = run("PENUP\nFOR [I 1 5] [IFELSE :I > 3 [DOT 2] [DOT 1]]\nMAKE \"N 0\nWHILE [:N < 3] [DOT 3 MAKE \"N :N + 1]\nIF 2 > 1 [DOT 4]\nIF 1 > 2 [DOT 5] [DOT 6]");
    return r.ok && same(sizes(r), [1, 1, 1, 2, 2, 3, 3, 3, 4, 6]);
  });
  T.test("Logo: colors by name, by number, and as red, green and blue", ["Logo"], () => {
    const r = run("PENUP SETPC \"orange DOT 5 SETPC 4 DOT 5 SETPC [0 128 255] DOT 5");
    return r.ok && same(r.output.dots.map(d => d.color), ["orange", "red", "rgb(0, 128, 255)"]);
  });
  T.test("Logo: CIRCLE draws a closed circle around the turtle and leaves it where it was", ["Logo", "Geometry"], () => {
    const r = run("SETPC \"blue CIRCLE 40 DOT 4");
    const s = Geometry.strokesOf(r.output.ops)[0], d = r.output.dots[0];
    return r.ok && s.kind === "circle" && Math.abs(s.size - 80) < 0.5 && near(d.x, 256) && near(d.y, 256);
  });
  T.test("Logo: a mistake names its line and suggests a fix", ["Logo"], () => {
    const a = run("FORWARD 10\nFOWARD 20"), b = run("FD10"), c = run("SETPENCOLOR red"), d = run("FORWARD"), e = run("FORWARD 10 20");
    return !a.ok && /^Line 2: /.test(a.error) && /Did you mean FORWARD\?/.test(a.error) && /space between FD and 10/.test(b.error) && /quote mark/.test(c.error) && /needs 1 input/.test(d.error) && /what to do with “20”/.test(e.error);
  });
  T.test("Logo: commands it hasn't got get a hint the model can use", ["Logo"], () => /always white/.test(run("SETBG 1").error) && /use DOT/.test(run("FILL").error) && run("SETLABELHEIGHT 30 LABEL [big]").output.ops[0].s === 30);
  T.test("Logo: an empty program is an error, not a crash", ["Logo", "Runtime"], async () => { const r = await Runtime.runTurtle("   ", {}); return !r.ok && r.output.ops.length === 0; });
  T.test("Logo: a runaway drawing is stopped", ["Logo"], () => { const r = run("REPEAT 100000000 [FORWARD 1 RIGHT 1]"); return !r.ok && /too many steps/.test(r.error); });
  T.test("Logo: a command that never stops calling itself is stopped", ["Logo"], () => { const r = run("TO GO :N\n  FORWARD 1 GO :N + 1\nEND\nGO 1"); return !r.ok && /too many times/.test(r.error); });
  T.test("Logo: JavaScript isn't Logo, and the error says so", ["Logo"], () => { const r = run("for (let i = 0; i < 4; i++) { forward(10); right(90); }"); return !r.ok && /looks like JavaScript/.test(r.error); });
  T.test("Logo: a drawing never becomes JavaScript", ["Logo"], () => {
    w.logoMarker = 0;
    const r = run("MAKE \"window 1\nLABEL [window.logoMarker = 1]");
    const section = MODEL_SRC.slice(MODEL_SRC.indexOf("SECTION: LOGO"), MODEL_SRC.indexOf("SECTION: RUNTIME"));
    return r.ok && w.logoMarker === 0 && section.length > 5000 && !/\bFunction\s*[.(]|\beval\s*\(/.test(section);
  });
  T.test("Logo: RANDOM and PICK follow the run's seed", ["Logo"], () => {
    const at = seed => run("PENUP REPEAT 6 [SETXY RANDOM 200 PICK [1 2 3] DOT 4]", seed).output.dots.map(d => d.x + "," + d.y).join(" ");
    return at(7) === at(7) && at(7) !== at(8);
  });
  T.test("Logo: old JavaScript drawings become Logo that draws the same", ["Logo"], () => {
    const logo = Logo.fromJS("penColor('green');\nfor (let i = 0; i < 3; i++) {\n  forward(120);\n  right(120);\n}\npenUp(); goTo(300, 200); dot(14, 'red'); label('hi');");
    const r = run(logo), d = r.output.dots[0];
    return /^SETPENCOLOR "green\nREPEAT 3 \[FORWARD 120 RIGHT 120\]/.test(logo) && r.ok && r.output.segments === 3 && d.color === "red" && near(d.x, 300) && near(d.y, 200) && same(r.output.labels, ["hi"]) &&
      Logo.fromJS("for (let i = 0; i < 3; i++) { forward(i * 10); }") === null;
  });
  T.test("Logo: the highlighter knows every command", ["Logo"], () => ["FORWARD", "FD", "REPEAT", "REPCOUNT", "SETXY", "SETPENCOLOR", "DOT", "CIRCLE", "LABEL", "IFELSE"].every(n => Logo.NAMES.indexOf(n) >= 0));
}
