// Speech: hearing any words (Read aloud), talking instead of typing (🎤), the Helper by voice, and what to do
// when the browser can't listen. jsdom has no speech, so these tests give the page stand-ins.
export default function (T, { pageWindow }) {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const last = (w, sel) => Array.from(w.document.querySelectorAll(sel)).pop();
  const voices = said => w => {
    w.SpeechSynthesisUtterance = function (t) { this.text = t; };
    w.speechSynthesis = { speak: u => said.push(u.text), cancel: () => {}, getVoices: () => [{ name: "Test Voice", lang: "en-US", default: true }] };
  };
  const ears = recs => w => {
    w.webkitSpeechRecognition = function () { recs.push(this); this.start = () => { this.started = true; }; this.stop = () => { if (this.onend) this.onend(); }; this.abort = this.stop; };
  };
  const hear = (rec, text) => { const res = [{ transcript: text }]; res.isFinal = true; rec.onresult({ resultIndex: 0, results: [res] }); };
  const boot = async (...setups) => { const p = await pageWindow({ before: w => setups.forEach(f => f(w)) }); const w = p.w; w.__ak.app.settings.connection = "pretend"; w.__ak.app.settings.speed = "instant"; return w; };
  const focus = (w, el) => { el.focus(); el.dispatchEvent(new w.FocusEvent("focusin", { bubbles: true })); };

  T.test("speech: with no speech in the browser, Read aloud is hidden and the Helper's 🎤 explains the computer's own dictation", ["Speech"], async () => {
    const w = await boot();
    w.document.querySelector('[data-act="helper"]').click();
    await sleep(40);
    w.document.querySelector('[data-act="helper-mic"]').click();
    const m = last(w, ".modal-body");
    return w.document.getElementById("readAloudBtn").style.display === "none" && /can't listen/.test(m.textContent) && /Windows key \+ H/.test(m.textContent) && /Globe key/.test(m.textContent) && /Settings, under Speech/.test(m.textContent);
  });
  T.test("speech: Read aloud reads the words you click, without emoji or Markdown marks, and says a button when you Tab to it", ["Speech"], async () => {
    const said = [];
    const w = await boot(voices(said));
    w.document.getElementById("readAloudBtn").click();
    const on = w.__ak.app.settings.readAloud === true && w.document.body.classList.contains("read-aloud") && /Read aloud is on/.test(said[said.length - 1]);
    const p = w.document.querySelector("#colLeft p");
    p.click();
    const read = said[said.length - 1] === w.__ak.SpeechUI.plain(p.textContent) && p.classList.contains("speaking");
    const btn = w.document.querySelector('[data-act="run"]');
    focus(w, btn);
    return on && read && said[said.length - 1] === w.__ak.SpeechUI.plain(btn.textContent) && w.__ak.SpeechUI.plain("🧑‍🎨 **Artist** draws `FD 50`") === "Artist draws FD 50";
  });
  T.test("speech: a 🎤 appears by the box you're typing in, and what you say goes in at the cursor and is saved", ["Speech"], async () => {
    const recs = [];
    const w = await boot(ears(recs));
    const box = w.document.querySelector("#colCenter textarea");
    box.value = "Tell a story about";
    box.setSelectionRange(box.value.length, box.value.length);
    focus(w, box);
    const mic = w.document.getElementById("micFloat");
    const shown = mic && mic.style.display !== "none";
    mic.click();
    const r = recs[0];
    hear(r, "a robot who learns to swim");
    r.stop();
    await sleep(20);
    return shown && r.started && box.value === "Tell a story about a robot who learns to swim" && w.__ak.soc().starts[0].value === box.value;
  });
  T.test("speech: the Helper's 🎤 asks your question by talking, and reads the answer aloud", ["Speech"], async () => {
    const said = [], recs = [];
    const w = await boot(voices(said), ears(recs));
    w.document.querySelector('[data-act="helper"]').click();
    await sleep(40);
    w.document.querySelector('[data-act="helper-mic"]').click();
    const r = recs[0];
    hear(r, "What does the Teller know?");
    r.stop();
    await sleep(300);
    const chat = w.__ak.app.helperChat[w.__ak.soc().id] || [];
    const answer = chat[chat.length - 1];
    return chat.length >= 2 && chat[chat.length - 2].text === "What does the Teller know?" && answer.who === "ai" && said[said.length - 1] === w.__ak.SpeechUI.plain(answer.text.replace(/\*\*/g, ""));
  });
  T.test("speech: when the microphone isn't allowed, the 🎤 says how to allow it, and how to dictate anyway", ["Speech"], async () => {
    const recs = [];
    const w = await boot(ears(recs));
    const box = w.document.querySelector("#colCenter textarea");
    focus(w, box);
    w.document.getElementById("micFloat").click();
    recs[0].onerror({ error: "not-allowed" });
    const m = last(w, ".modal-body");
    return /isn't allowed to use the microphone/.test(m.textContent) && /allow the Microphone/.test(m.textContent) && /Windows key \+ H/.test(m.textContent);
  });
}
