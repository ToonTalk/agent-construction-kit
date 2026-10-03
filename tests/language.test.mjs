// Words in any alphabet, and the page's language for speech (a translated copy sets <html lang>).
export default function (T, { modelWindow, same }) {
  const { Runtime } = modelWindow().AK;
  T.test("h.words reads any alphabet: “Så här, Åsa!” is three words", ["Runtime"], async () => {
    const r = await Runtime.runProgram("function run(input, params, h) { return { w: h.words(input.text) }; }", { text: "Så här, Åsa! Ça va? 你好 5" }, { params: {}, seed: 1 });
    return r.ok && same(r.output.w, ["så", "här", "åsa", "ça", "va", "你好", "5"]);
  });
}
