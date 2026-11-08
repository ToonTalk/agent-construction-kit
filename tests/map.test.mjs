// 🗺️ Map (1.22.0): the society as a picture. Agents are boxes in columns that follow the messages from the start,
// rules are arrows saying when they send, an agency is one box, an off rule is dashed, and after a run each arrow
// says how many messages went along it. Clicking an agent opens it.
export default function (T, { pageWindow }) {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const boot = async () => { const p = await pageWindow(); p.w.__ak.app.settings.connection = "pretend"; p.w.__ak.app.settings.speed = "instant"; return p; };
  const openMap = pw => { pw.document.querySelector('[data-act="society-map"]').click(); return Array.from(pw.document.querySelectorAll(".modal-body")).pop(); };

  T.test("page: 🗺️ Map of Joke Workshop before a run: You, every agent, an arrow for each rule, the switched-off one dashed, and no counts yet", ["Society"], async () => {
    const { w: pw, errors } = await boot();
    pw.document.querySelector('[data-act="world"][data-id="jokes"]').click();
    const m = openMap(pw), $$ = q => Array.from(m.querySelectorAll(q));
    const names = $$(".m-node text").map(t => t.textContent), edges = $$(".m-edge"), labels = $$(".m-label").map(t => t.textContent);
    const s = pw.__ak.soc();
    return names.length === s.agents.length + 1 && names.some(n => /You \(the start\)/.test(n)) && names.some(n => /Critic: Clear/.test(n)) &&
      edges.length === s.rules.length + 1 && $$(".m-edge.off").length === s.rules.filter(r => r.enabled === false).length && $$(".m-edge.start").length === 1 &&
      labels.indexOf("off") >= 0 && !labels.some(t => /×/.test(t)) && /Run it, and the arrows will say/.test(m.textContent) && !errors.length;
  });

  T.test("page: 🗺️ Map after a Story Chain run counts the messages on each arrow, and clicking an agent opens it", ["Society", "Engine"], async () => {
    const { w: pw, errors } = await boot();
    pw.document.querySelector('[data-act="world"][data-id="story"]').click();
    await pw.__ak.runNow();
    const m = openMap(pw), $$ = q => Array.from(m.querySelectorAll(q));
    const labels = $$(".m-label").map(t => t.textContent), vb = m.querySelector("svg").getAttribute("viewBox").split(" ").map(Number);
    const counted = labels.filter(t => /×\d+/.test(t)).length, ending = labels.some(t => /when the run ends · ×1/.test(t));
    m.querySelector('[data-act="map-agent"][data-id="writer-b"]').dispatchEvent(new pw.MouseEvent("click", { bubbles: true }));
    await sleep(20);
    const heads = Array.from(pw.document.querySelectorAll(".modal h2, .editor h2, .editor h3")).map(x => x.textContent).join(" | ");
    return counted >= 8 && ending && vb[1] < 0 && /Writer B/.test(heads) && !/as a picture/.test(heads) && !errors.length;
  });

  T.test("page: 🗺️ Map of Mini-Ani as a society of mind shows each agency as one box, with how many agents are in it", ["Society"], async () => {
    const { w: pw, errors } = await boot();
    const ak = pw.__ak, s = ak.AK.Seeds.makeMiniAniSoM(); s.id = "som"; ak.app.societies.som = s; ak.app.order.push("som"); ak.app.activeId = "som"; ak.renderAll();
    const m = openMap(pw), names = Array.from(m.querySelectorAll(".m-node text")).map(t => t.textContent);
    return names.some(n => /Choosers \(13\)/.test(n)) && names.some(n => /Experts \(4\)/.test(n)) && m.querySelectorAll(".m-node.k-agency").length === 2 && !errors.length;
  });

  // 1.22.1, after Ken's look at Secret Number's map: the picture scales to fit (its frame cut the arcs off), and it can
  // stay on the stage, under ▶ Run, lit as the run goes.
  T.test("page: 📌 the map kept on the stage scales to fit, lights the working agent and the arrows its answer went along, and hides again", ["Society", "Engine"], async () => {
    const { w: pw, errors } = await boot();
    const ak = pw.__ak, $ = q => pw.document.querySelector(q);
    pw.document.querySelector('[data-act="world"][data-id="secret"]').click();
    const m = openMap(pw), svg = m.querySelector("svg"), fits = !svg.getAttribute("width") && /max-width:\d+px/.test(svg.getAttribute("style"));
    m.querySelector('[data-act="map-pin"]').click();
    const pinned = !!$("#colCenter .stage-map svg") && !pw.document.querySelector(".modal-back .society-map");
    await ak.stepNow(); await ak.stepNow();
    const lit = !!$("#colCenter .stage-map .m-node.now") && pw.document.querySelectorAll("#colCenter .stage-map .m-edge.just").length >= 1;
    $('#colCenter [data-act="map-unpin"]').click();
    return fits && pinned && lit && !$("#colCenter .stage-map") && !errors.length;
  });

  T.test("page: ▶ Run with the map closes the picture, keeps it on the stage and runs; afterwards its arrows count the messages", ["Society", "Engine"], async () => {
    const { w: pw, errors } = await boot();
    pw.document.querySelector('[data-act="world"][data-id="story"]').click();
    const m = openMap(pw);
    m.querySelector('[data-act="map-run"]').click();
    await sleep(300);
    const labels = Array.from(pw.document.querySelectorAll("#colCenter .stage-map .m-label")).map(t => t.textContent);
    return !pw.document.querySelector(".modal-back .society-map") && labels.filter(t => /×\d+/.test(t)).length >= 8 && !errors.length;
  });

}
