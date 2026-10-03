// Words in any alphabet, and the page's language for speech (a translated copy sets <html lang>).
export default function (T, { modelWindow, pageWindow, same }) {
  const { Runtime } = modelWindow().AK;
  T.test("h.words reads any alphabet: “Så här, Åsa!” is three words", ["Runtime"], async () => {
    const r = await Runtime.runProgram("function run(input, params, h) { return { w: h.words(input.text) }; }", { text: "Så här, Åsa! Ça va? 你好 5" }, { params: {}, seed: 1 });
    return r.ok && same(r.output.w, ["så", "här", "åsa", "ça", "va", "你好", "5"]);
  });
  T.test("the “getting long” nudge isn't shown for a shipped program whose slots changed (the Keeper's new secret)", ["Seeds"], async () => {
    const { w } = await pageWindow();
    const ak = w.__ak;
    ak.app.activeId = "secret"; ak.renderAll();
    const k = ak.soc().agents.find(a => a.id === "keeper");
    w.AK.Society.setParams(k, { secret: 42 });
    ak.openAgent("keeper");
    const shipped = !/nudge/.test(Array.from(w.document.querySelectorAll(".modal-body")).pop().innerHTML);
    return shipped;
  });
}

