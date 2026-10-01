// Data said in plain words: what the trace shows instead of JSON.
export default function (T, { modelWindow }) {
  const { Words } = modelWindow().AK;
  T.test("plain words: who spoke how often", ["Words"], () => Words.paraphrase({ counts: { Artist: 1, Describer: 2 } }) === "counts: Artist 1, Describer 2");
  T.test("plain words: rows, columns, and each row's pebbles by color", ["Words"], () =>
    Words.paraphrase({ rows: 2, cols: 3, rowList: [{ y: 1, colors: ["red", "red", "blue"] }, { y: 2, colors: ["black"] }] }) === "rows: 2 · columns: 3 · rows from the top: (2 red, 1 blue) (1 black)");
  T.test("plain words: yes and no, words, dots, and what is left out", ["Words"], () =>
    Words.paraphrase({ pass: false, labels: ["3 by 5"], dots: [{ x: 1, y: 2, color: "red" }], memory: { a: 1 }, say: "x" }) === "pass: no · labels: “3 by 5” · dots: 1 dot" && Words.paraphrase({}) === "");
}
