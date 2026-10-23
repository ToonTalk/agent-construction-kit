// Properties of the single file itself.
export default function (T, { HTML, MODEL_SRC, UI_SRC }) {
  T.test("the file is under 1.5 MB (the claude.ai artifact, minified, must stay under about 950 KB: tools/build_artifact.py checks that)", ["util"], () => Buffer.byteLength(HTML) < 1500000);
  T.test("the model layer never touches the DOM", ["util"], () => {
    const code = MODEL_SRC.replace(/"(?:[^"\\\n]|\\.)*"/g, '""');
    return !/\bdocument\s*\.|\bwindow\s*\.|querySelector|innerHTML|createElement/.test(code);
  });
  T.test("no inline script contains a closing script tag", ["util"], () => !/<\/script/i.test(MODEL_SRC) && !/<\/script/i.test(UI_SRC));
  T.test("American spelling in what learners read", ["util"], () => !/\b(colour|colours|behaviour|recognise|centre|favourite|organise)\b/i.test(HTML));
}
