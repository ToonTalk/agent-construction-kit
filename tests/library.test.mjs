// The shipped programmed agents (Appendix A): scenarios, line maps, slots.
export default function (T, { modelWindow, same }) {
  const w = modelWindow();
  const { Library, Scenarios, Runtime, SafeJS, Slots, Engine } = w.AK;
  const LIB = Library.LIB;
  const types = Object.keys(LIB);
  T.test("all twenty-four shipped programmed agents are in the library, each described for + Add an agent", ["Library"], () =>
    same(types.slice().sort(), ["book", "brief", "checker-judge", "collector", "color-judge", "dot-counter", "escalator", "grid-judge", "keeper", "ledger", "leftovers", "loop-spotter", "mystery-judge", "name-keeper", "notebook", "referee", "row-judge", "scorekeeper", "selector", "shelf", "tally", "tictactoe", "triangle-judge", "vote"]) && types.every(t => LIB[t].about && LIB[t].about.length > 20));
  for (const t of types) {
    const L = LIB[t];
    T.test(t + ": its JavaScript passes the static check", ["Library", "SafeJS"], () => SafeJS.checkJS(L.js, "program").ok);
    T.test(t + ": passes every one of its scenarios", ["Library", "Scenarios"], async () => {
      const res = await Scenarios.runScenarios({ code: { js: L.js }, params: L.params, scenarios: L.scenarios }, Runtime);
      const bad = res.filter(r => !r.ok);
      if (bad.length) throw new Error(JSON.stringify(bad[0]));
      return res.length === L.scenarios.length;
    });
    T.test(t + ": has at least four scenarios, including one where the answer is no", ["Library"], () =>
      L.scenarios.length >= 4 && L.scenarios.some(s => s.expect.pass === false || s.expect.stuck === false || s.expect.say === "" || s.expect.rows === 0 || s.expect.taken === false || s.expect.matches === false || s.expect.count === 0 || ["broken", "trickster"].indexOf(s.expect.winner) >= 0 || s.expect.big === false || /don't add up|Please give/.test(s.expect.sayContains || "") || /^no /i.test(s.name)));
    T.test(t + ": its line map covers every pseudocode line and stays inside the JavaScript", ["Library"], () => {
      const pn = L.pseudocode.split("\n").length, jn = L.js.split("\n").length;
      const covered = new Set();
      for (const e of L.lineMap) {
        if (e.pseudo[0] < 1 || e.pseudo[1] > pn || e.js[0] < 1 || e.js[1] > jn || e.pseudo[0] > e.pseudo[1] || e.js[0] > e.js[1]) return false;
        for (let l = e.pseudo[0]; l <= e.pseudo[1]; l++) covered.add(l);
      }
      return L.pseudocode.split("\n").every((l, i) => !l.trim() || covered.has(i + 1));
    });
    T.test(t + ": every slot is in its pseudocode and names a param", ["Library", "Slots"], () => Slots.slotPositions(L.pseudocode, L.slots).length === L.slots.length && L.slots.every(s => s.param in L.params));
    T.test(t + ": pretend mode has its translation ready", ["Library", "Translator"], () => Library.CANNED.has(Library.pseudoKey(L.pseudocode)));
  }
  T.test("Dot Counter's words come from a line of its pseudocode", ["Library"], () => /say "I count \{rows\} rows and \{columns\} columns\."/.test(LIB["dot-counter"].pseudocode) && LIB["dot-counter"].lineMap.some(e => e.pseudo[0] === 5 && e.js[0] === 7));
  T.test("highlighting links pseudocode to JavaScript and back (Grid Judge)", ["Library", "Engine"], () => {
    const m = LIB["grid-judge"].lineMap;
    return same(Engine.linkedLines(m, "pseudo", 1).js, [2, 3, 4]) && same(Engine.linkedLines(m, "js", 7).pseudo, [4]);
  });
  T.test("slots: a new value rewrites the pseudocode without touching the program", ["Slots"], () => {
    const L = LIB["grid-judge"];
    const r = Slots.applySlotValues(L.pseudocode, L.slots, { rowsNeeded: 4, columnsNeeded: 6 });
    return /rows is \{4\} and columns is \{6\}/.test(r.text) && /I need \{4\} by \{6\}/.test(r.text);
  });
  T.test("slots: an edit only inside slots is recognized as a params change", ["Slots"], () => {
    const L = LIB["loop-spotter"];
    const v = Slots.slotOnlyEdit(L.pseudocode, L.pseudocode.replace("{5}", "{3}").replace("{half}", "{0.8}"), L.slots);
    return v && v.howMany === 3 && v.half === 0.8 && Slots.slotOnlyEdit(L.pseudocode, L.pseudocode.replace("remember", "keep"), L.slots) === null;
  });
  T.test("slots: words like half and lists of numbers are understood", ["Slots"], () => Slots.parseSlotText("half") === 0.5 && same(Slots.parseSlotText("1, 2, 3 and 4"), [1, 2, 3, 4]) && Slots.parseSlotText("7") === 7);
}
