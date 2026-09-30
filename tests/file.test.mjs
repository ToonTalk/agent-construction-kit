// Properties of the single file itself.
export default function (T, { HTML, MODEL_SRC, UI_SRC }) {
  T.test("the file is under 1 MB", ["util"], () => Buffer.byteLength(HTML) < 1000000);
  T.test("the model layer never touches the DOM", ["util"], () => {
    const code = MODEL_SRC.replace(/"(?:[^"\\\n]|\\.)*"/g, '""');
    return !/\bdocument\s*\.|\bwindow\s*\.|querySelector|innerHTML|createElement/.test(code);
  });
  T.test("no inline script contains a closing script tag", ["util"], () => !/<\/script/i.test(MODEL_SRC) && !/<\/script/i.test(UI_SRC));
  T.test("American spelling in what learners read", ["util"], () => !/\b(colour|colours|behaviour|recognise|centre|favourite|organise)\b/i.test(HTML));
}
