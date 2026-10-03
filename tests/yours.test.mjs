// Your own societies: shown after the microworlds (the recent ones), All yours to open or delete several,
// an import that matches one you have asks to replace it or keep both, and an example you have already made asks first.
export default function (T, { modelWindow, pageWindow }) {
  const { Seeds, Society } = modelWindow().AK;
  const boot = async () => { const p = await pageWindow(); p.w.__ak.app.settings.connection = "pretend"; p.w.__ak.app.settings.speed = "instant"; return p.w; };
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const last = (pw, sel) => Array.from(pw.document.querySelectorAll(sel)).pop();
  const file = (title, id) => { const s = Seeds.makeBlank(title); s.id = id || "mine"; return Society.exportSociety(s, null); };
  const make = async (pw, n) => { for (let i = 1; i <= n; i++) await pw.__ak.importSocietyText(file("Society " + i, "s" + i)); };
  const shown = pw => Array.from(pw.document.querySelectorAll(".world.mine")).map(b => b.dataset.id);

  T.test("yours: after the microworlds come your four most recent societies, in the order you made them, and All yours", ["Store"], async () => {
    const pw = await boot();
    const before = pw.document.querySelectorAll(".worlds-label").length;
    await make(pw, 6);
    pw.__ak.app.used = { s1: 10, s2: 60, s3: 20, s4: 50, s5: 40, s6: 30 };
    pw.__ak.app.activeId = "s1";
    pw.__ak.renderAll();
    const more = pw.document.querySelector('[data-act="all-yours"]');
    const labels = Array.from(pw.document.querySelectorAll(".worlds-list > *")).map(b => b.className);
    return before === 0 && shown(pw).join() === "s1,s2,s4,s5" && /All 6 of yours/.test(more.textContent) &&
      pw.document.querySelectorAll(".world:not(.add):not(.mine):not(.more)").length === 9 && labels.indexOf("worlds-label") === 10 && labels[9] === "worlds-break" && /world add/.test(labels[labels.length - 1]);
  });
  T.test("yours: choosing one doesn't move it; opening a hidden one from All yours shows it", ["Store"], async () => {
    const pw = await boot();
    await make(pw, 6);
    pw.__ak.app.used = { s1: 10, s2: 60, s3: 20, s4: 50, s5: 40, s6: 30 };
    pw.__ak.renderAll();
    const was = shown(pw).join();
    pw.document.querySelector('.world[data-id="s4"]').click();
    const still = shown(pw).join();
    pw.document.querySelector('[data-act="all-yours"]').click();
    const m = last(pw, ".modal-body");
    const listed = Array.from(m.querySelectorAll("[data-open]")).map(b => b.dataset.open).join();
    m.querySelector('[data-open="s1"]').click();
    return was === "s2,s4,s5,s6" && still === was && listed === "s4,s2,s5,s6,s3,s1" && pw.__ak.soc().id === "s1" && shown(pw).indexOf("s1") === 0 && shown(pw).length === 4;
  });
  T.test("yours: All yours deletes the ticked societies, after asking", ["Store"], async () => {
    const pw = await boot();
    await make(pw, 3);
    pw.document.querySelector('[data-act="all-yours"]').click();
    const m = last(pw, ".modal-body");
    const del = m.querySelector("[data-del-ticked]");
    const off = del.disabled;
    for (const id of ["s1", "s3"]) { const c = m.querySelector('[data-tick="' + id + '"]'); c.checked = true; c.dispatchEvent(new pw.Event("change", { bubbles: true })); }
    const label = del.textContent;
    del.click();
    await sleep(20);
    last(pw, ".modal-body").querySelector("[data-yes]").click();
    await sleep(30);
    const order = pw.__ak.app.order;
    return off && label === "Delete 2 societies" && order.indexOf("s1") < 0 && order.indexOf("s3") < 0 && order.indexOf("s2") >= 0 && !!pw.__ak.app.societies.story && !pw.__ak.app.used.s1;
  });
  T.test("import: a society with the same name asks: replace it, keep both (named “… (2)”), or cancel", ["Store"], async () => {
    const pw = await boot();
    await pw.__ak.importSocietyText(file("Artist and critic", "art"));
    const n = pw.__ak.app.order.length;
    const ask = async pick => { const p = pw.__ak.importSocietyText(file("Artist and critic", "art")); await sleep(20); const m = last(pw, ".modal-body"); const q = m.querySelector(".confirm-text").textContent; if (pick === null) m.querySelector("[data-choice-none]").click(); else Array.from(m.querySelectorAll("[data-choice]")).find(b => b.textContent === pick).click(); await p; return q; };
    const q = await ask(null);
    const cancelled = pw.__ak.app.order.length === n;
    await ask("Keep both");
    const both = pw.__ak.app.order.length === n + 1 && pw.__ak.soc().title === "Artist and critic (2)";
    pw.__ak.app.societies.art.question = "Changed";
    await ask("Replace mine");
    return /You already have a society called “Artist and critic”/.test(q) && cancelled && both && pw.__ak.app.order.length === n + 1 && pw.__ak.soc().id === "art" && pw.__ak.app.societies.art.question === "";
  });
  T.test("import: a file named like a microworld is kept beside it, with (2), without asking", ["Store"], async () => {
    const pw = await boot();
    await pw.__ak.importSocietyText(Society.exportSociety(Seeds.makeTelephone(), null));
    return pw.__ak.soc().id === "telephone-imported" && pw.__ak.soc().title === "Telephone (2)" && pw.__ak.app.societies.telephone.title === "Telephone";
  });
  T.test("＋ New society: an example you haven't changed starts afresh; a changed one asks, in plain words", ["Seeds"], async () => {
    const pw = await boot();
    const choose = async () => {
      pw.document.querySelector('[data-act="new-society"]').click();
      last(pw, ".modal-body").querySelector('[data-new="example"][data-id="tictactoe"]').click();
      await sleep(30);
    };
    const answer = async choice => { const m = last(pw, ".modal-body"); const q = m.querySelector(".confirm-text").textContent; Array.from(m.querySelectorAll("[data-choice]")).find(b => b.textContent === choice).click(); await sleep(30); return q; };
    const copies = () => pw.__ak.app.order.filter(id => /^tictactoe/.test(id)).length;
    await choose();
    const first = pw.__ak.soc().id === "tictactoe" && pw.__ak.sameAsExample(pw.__ak.soc(), Seeds.makeTicTacToe());
    pw.__ak.app.traces.tictactoe = [{ kind: "run-start", round: 1 }];
    pw.document.querySelector('.world[data-id="story"]').click();
    await choose();
    const fresh = pw.__ak.soc().id === "tictactoe" && copies() === 1 && !pw.__ak.app.traces.tictactoe && !last(pw, ".modal-body .confirm-text");
    pw.__ak.soc().agents.find(a => a.id === "rival").instructions += " Be very cheeky.";
    pw.document.querySelector('.world[data-id="story"]').click();
    await choose();
    const q = await answer("Go back to my changed one");
    const back = pw.__ak.soc().id === "tictactoe" && copies() === 1;
    await choose();
    await answer("Start a fresh one");
    return first && fresh && /You changed the Tic-Tac-Toe you made from this example/.test(q) && back && pw.__ak.soc().title === "Tic-Tac-Toe (2)" && copies() === 2;
  });
}
