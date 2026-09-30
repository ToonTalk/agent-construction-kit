// Output-field parsing, and every adapter against a fake fetch (no network in tests).
export default function (T, { modelWindow }) {
  const w = modelWindow();
  const { Adapters, Prompts, util } = w.AK;
  const F = [{ name: "rows", type: "number", about: "rows" }, { name: "cols", type: "number", about: "cols" }];

  T.test("output fields: the instruction is added to the system prompt", ["Adapters"], () => /rows \(a number\)/.test(Adapters.outputInstruction(F)) && Adapters.outputInstruction([]) === "");
  T.test("parse: a reply that is all JSON", ["Adapters"], () => { const p = Adapters.parseReply('{"rows": 3, "cols": "5"}', F); return p.data.rows === 3 && p.data.cols === 5 && !p.parseError && p.text === ""; });
  T.test("parse: words, then a fenced JSON block", ["Adapters"], () => { const p = Adapters.parseReply("I see three rows.\n```json\n{\"rows\":3,\"cols\":5}\n```", F); return p.data.rows === 3 && p.text === "I see three rows." && !p.parseError; });
  T.test("parse: words, then JSON without a fence", ["Adapters"], () => { const p = Adapters.parseReply("I see 15 pebbles.\n{\"rows\": 3, \"cols\": 5}", F); return p.data.cols === 5 && p.text === "I see 15 pebbles."; });
  T.test("parse: a missing field is a visible parse error", ["Adapters"], () => /missing: cols/.test(Adapters.parseReply('{"rows": 3}', F).parseError));
  T.test("parse: no JSON at all is a visible parse error", ["Adapters"], () => !!Adapters.parseReply("I think it is a grid.", F).parseError);
  T.test("parse: markdown is stripped from words but never from programs", ["Adapters", "util"], () =>
    Adapters.parseReply("**A** red *circle*", []).text === "A red circle" && Adapters.parseReply("```js\nforward(2*i*3);\n```", [], "program").text === "forward(2*i*3);");

  const fake = handler => { const calls = []; w.fetch = async (url, opts) => { calls.push({ url, opts, body: JSON.parse(opts.body) }); return handler(url, opts); }; return calls; };
  const resp = (status, body) => ({ ok: status >= 200 && status < 300, status, text: async () => (typeof body === "string" ? body : JSON.stringify(body)) });
  const req = extra => Object.assign({ system: "SYS", messages: [{ role: "user", content: "hello" }], images: ["data:image/png;base64,QUJD"], outputFields: F, replyKind: "prose", maxTokens: 500, meta: {} }, extra || {});

  T.test("keyless: no key headers; the picture goes before the words", ["Adapters"], async () => {
    const calls = fake(() => resp(200, { model: "claude-sonnet-4-6", stop_reason: "end_turn", content: [{ type: "text", text: "I see it.\n{\"rows\":1,\"cols\":4}" }] }));
    const r = await Adapters.makeAdapter({ connection: "keyless", models: { keyless: "claude-sonnet-4-6" } }).call(req());
    const c = calls[0], content = c.body.messages[0].content;
    return c.url === "https://api.anthropic.com/v1/messages" && !c.opts.headers["x-api-key"] && content[0].type === "image" && content[0].source.data === "QUJD" && content[1].type === "text" && /rows/.test(c.body.system) && r.data.cols === 4 && r.text === "I see it.";
  });
  T.test("keyless: a signed-out answer (not JSON) is reported, not swallowed", ["Adapters"], async () => {
    fake(() => resp(200, "<html>please sign in</html>"));
    try { await Adapters.makeAdapter({ connection: "keyless", models: {} }).call(req()); return false; } catch (e) { return e.kind === "signedout"; }
  });
  T.test("keyless: a model the proxy refuses falls back to claude-sonnet-4-6", ["Adapters"], async () => {
    const calls = fake((url, opts) => JSON.parse(opts.body).model === "claude-opus-5-5" ? resp(400, { error: { message: "model: not allowed here" } }) : resp(200, { content: [{ type: "text", text: '{"rows":2,"cols":2}' }], stop_reason: "end_turn" }));
    const r = await Adapters.makeAdapter({ connection: "keyless", models: { keyless: "claude-opus-5-5" } }).call(req());
    return calls.length === 2 && calls[1].body.model === "claude-sonnet-4-6" && /isn't available/.test(r.warning);
  });
  T.test("your Anthropic key: key, version, browser-access and fallback headers; low effort", ["Adapters"], async () => {
    const calls = fake(() => resp(200, { content: [{ type: "thinking", thinking: "" }, { type: "text", text: '{"rows":1,"cols":1}' }], stop_reason: "end_turn", model: "claude-opus-5-5" }));
    const r = await Adapters.makeAdapter({ connection: "anthropic", keys: { anthropic: "sk-test" }, models: { anthropic: "claude-opus-5-5" } }).call(req());
    const h = calls[0].opts.headers, b = calls[0].body;
    return h["x-api-key"] === "sk-test" && h["anthropic-version"] === "2023-06-01" && h["anthropic-dangerous-direct-browser-access"] === "true" && h["anthropic-beta"] === "server-side-fallback-2026-07-01" && b.fallbacks === "default" && b.output_config.effort === "low" && r.data.rows === 1 && r.headers["x-api-key"] !== "sk-test";
  });
  T.test("your Anthropic key: no key is a clear error before any call", ["Adapters"], async () => {
    const calls = fake(() => resp(200, {}));
    try { await Adapters.makeAdapter({ connection: "anthropic", keys: {}, models: {} }).call(req()); return false; } catch (e) { return e.kind === "auth" && calls.length === 0; }
  });
  T.test("a refusal is reported as a refusal", ["Adapters"], async () => {
    fake(() => resp(200, { content: [], stop_reason: "refusal" }));
    try { await Adapters.makeAdapter({ connection: "anthropic", keys: { anthropic: "k" }, models: {} }).call(req()); return false; } catch (e) { return e.kind === "refusal"; }
  });
  T.test("Gemini: system instruction, picture inline, key in a header", ["Adapters"], async () => {
    const calls = fake(() => resp(200, { candidates: [{ content: { parts: [{ text: "ok\n{\"rows\":3,\"cols\":5}" }] } }] }));
    const r = await Adapters.makeAdapter({ connection: "gemini", keys: { gemini: "g-key" }, models: { gemini: "gemini-3-flash-preview" } }).call(req());
    const b = calls[0].body;
    return /generateContent/.test(calls[0].url) && calls[0].opts.headers["x-goog-api-key"] === "g-key" && b.systemInstruction.parts[0].text.indexOf("SYS") === 0 && b.contents[0].parts[0].inline_data.data === "QUJD" && r.data.rows === 3;
  });
  T.test("OpenAI: a system message and image_url content", ["Adapters"], async () => {
    const calls = fake(() => resp(200, { choices: [{ message: { content: '{"rows":1,"cols":2}' } }] }));
    const r = await Adapters.makeAdapter({ connection: "openai", keys: { openai: "o-key" }, models: { openai: "gpt-5.4-mini" } }).call(req());
    const b = calls[0].body;
    return b.messages[0].role === "system" && b.messages[1].content[1].image_url.url.indexOf("data:image/png") === 0 && calls[0].opts.headers.Authorization === "Bearer o-key" && r.data.cols === 2;
  });
  T.test("a call that never answers times out", ["Adapters", "util"], async () => {
    try { await util.withTimeout(new w.Promise(() => {}), 30, "too slow"); return false; } catch (e) { return e.kind === "timeout"; }
  });
  T.test("the connection probe needs the answer it asked for, not just any answer", ["Adapters"], async () => {
    fake(() => resp(200, { content: [{ type: "text", text: "Hello there!" }], stop_reason: "end_turn" }));
    const bad = await Adapters.probeAdapter(Adapters.makeAdapter({ connection: "keyless", models: {} }));
    fake(() => resp(200, { content: [{ type: "text", text: '{"ok": true}' }], stop_reason: "end_turn" }));
    const good = await Adapters.probeAdapter(Adapters.makeAdapter({ connection: "keyless", models: {} }));
    return !bad.ok && good.ok;
  });
  T.test("pretend mode gives the same reply every time, and says it is pretend", ["Adapters", "Pretend"], async () => {
    const a = Adapters.makePretendAdapter();
    const ask = () => a.call({ system: "S", messages: [{ role: "user", content: "a red circle" }], images: [], outputFields: [], replyKind: "program", meta: { persona: "artist", agent: { instructions: "" }, message: { text: "a red circle" } } });
    const r1 = await ask(), r2 = await ask();
    return r1.raw === r2.raw && r1.pretend && /penColor\('red'\)/.test(r1.text);
  });
  T.test("the safety preamble is written for a young audience", ["Prompts"], () => /aged 10 to 16/.test(Prompts.PREAMBLE) && /violence/.test(Prompts.PREAMBLE) && /romance/.test(Prompts.PREAMBLE));
}
