# Translating Agent Kit into Swedish: rules and glossary (shared by every part)

Agent Kit is a single-file web app for children aged 10–16 who build "societies" of AI agents and small programs.
You are translating ONE PART of its `index.html` (a plain text file of a slice of lines). The parts are joined back
together afterwards, so **the number of lines in your part must stay exactly the same**, and nothing outside
human-readable text may change.

## What to translate
Everything a learner, teacher or AI model reads as language: button labels, hints, titles, toasts, dialog text,
`title="…"` and `aria-label="…"` attributes, error messages, guide text, microworld titles/intros/questions/openers,
agent names, roles and instructions (prompts), start values and examples, program pseudocode and what programs
`say`, scenario names, data-field `about` texts, the safety preamble, and text the engine composes for models
(e.g. "You waited for 3 messages. Here they are…").

Write natural, warm, simple Swedish for 10–16 year olds (du-form). Keep sentences short, as in the English.
Keep the curly quotes “ ” and ’ as typographic marks where the English has them (Swedish usually uses ” ” — either
is fine, but be consistent within a string and never break JS string quoting).

## What must NOT change (or the app breaks)
- JavaScript identifiers, keywords, object keys, property names, function names, CSS classes, element ids,
  `data-act="…"`, `data-bind="…"`, `data-id="…"` values, agent `id`s (e.g. "artist", "critic", "referee"),
  `typeId`s, rule ids, regexes that match code, URLs, model ids, and JSON keys.
- **Data field names** inside data objects (`rows`, `cols`, `rowList`, `pass`, `score`, `partner`, `give`, `giveWhat`,
  `next`, `winner`, `ask`, `over` …). Their `about:` descriptions DO get translated.
- **Logo commands stay English** (FORWARD, RIGHT, REPEAT, SETPENCOLOR, PENUP, DOT, CIRCLE, LABEL, TO … END, MAKE, IF …).
  Explanations around them are translated. **Logo colour names stay English** in code and data (SETPENCOLOR "red);
  where an instruction tells a model which colour words to use in Logo or in reported data, say they must be the
  English names (red, blue, green …).
- Placeholders and slots: `{4}`, `{rows}`, `{=secret}`, `{=highest+1}`, `${…}`, `"=param"` keep their braces and the
  text inside the braces only when it is a param/number (e.g. `{4}`, `{=tries}`, `{X}`, `{yes}` becomes `{ja}` ONLY
  if you also change the matching slot `text:` — see Library rules). Words inside braces that are just prose
  placeholders, like `{the description}` or `{how many}`, may be translated.
- Escapes inside JS strings: `\"`, `\n`, `\\`. If a Swedish word needs an apostrophe inside a '…' string, escape it.
- Emoji stay as they are.
- Code comments (`// …`, `/* … */`) may stay in English. Don't spend effort on them.
- The test doubles in the PRETEND PERSONAS section stay English (they are only used by the tests).

## Library programs (the LIBRARY section) — extra rules
- Each library program has `pseudo: [...]` (pseudocode lines), `code: [...]` (JavaScript lines), `lineMap`, `params`,
  `slots` and `scenarios`. Translate pseudocode lines and the human-language strings inside `code` (what it says).
  **Keep the same number of lines in `pseudo` and in `code`**, so `lineMap` stays right. Don't touch `lineMap`.
- A slot `{ line: 1, text: "83", param: "secret" }` means the text `{83}` appears on pseudocode line 1. If a slot's
  text is a word (e.g. `{yes}`, `{X}`, `{Alice, Bob, Charley}`, `{raisins, cashews, pretzels}`), translate it the same
  way in the pseudocode, in the slot's `text`, and in the param value, so they still match.
- **Scenarios must still pass**: when you change what a program says, change the scenario `expect` (`say`,
  `sayContains`) to match exactly, and translate scenario `input.text` where it is language.
- Programs that read words must read Swedish words: e.g. the Ledger's yes/no lists become Swedish
  (ja, javisst, jajamän, okej, ok, absolut, gärna, affär / nej, nä, inte, aldrig); the Ledger compares ingredient
  names with a `base()` that strips an English plural “s” — make it work for Swedish (compare the first 5 letters,
  lower-cased, is fine). Keep logic otherwise identical.

## Glossary (use these everywhere, so the parts agree)
| English | Swedish |
|---|---|
| Agent Kit | Agent Kit (the product name stays) |
| agent / AI agent / programmed agent | agent / AI-agent / programmerad agent |
| society / societies | samhälle / samhällen |
| microworld | mikrovärld |
| example (to start from) | exempel |
| rule / rules | regel / regler |
| round / rounds | omgång / omgångar |
| start (the run's first message) | start |
| run (noun) / a run | körning |
| ▶ Run | ▶ Kör |
| ⏭ Step | ⏭ Steg |
| ■ Stop | ■ Stopp |
| ↺ Reset | ↺ Börja om |
| Look inside / Hide the inside | Titta inuti / Göm insidan |
| Trace | Logg |
| This run / Workshop (trace tabs) | Den här körningen / Verkstaden |
| Helper | Hjälparen |
| Guides | Guider |
| Settings | Inställningar |
| Export / Import | Exportera / Importera |
| Read aloud | Läs upp |
| ＋ New society | ＋ Nytt samhälle |
| Yours (row label) / All yours | Dina / Alla dina |
| You (the learner as an agent) | Du |
| message | meddelande |
| scenario / scenarios | scenario / scenarier |
| pseudocode | pseudokod |
| program | program |
| contract: Gets / Says / Remembers | Får / Säger / Minns |
| gate | spärr |
| collects (an agent that waits for several messages) | samlar |
| picture | bild |
| model | modell |
| key (API key) | nyckel |
| pass / block (a gate's decision) | släpp igenom / stoppa |
| variant (an option on the stage) | variant |
| challenge | utmaning |

### Microworld and example titles
Story Chain → Berättelsekedjan · Secret Number → Hemliga talet · Lost and Found → Hittegods · Telephone → Viskleken ·
Pebble Challenge → Stenutmaningen · Three Eyes → Tre ögon · Fool the Eyes → Lura ögonen · Joke Workshop → Skämtverkstaden ·
Small Helper, Big Helper → Liten hjälpare, stor hjälpare · Evolution → Evolution · Two Answers → Två svar ·
Tic-Tac-Toe → Tre i rad · Trail Mix Barter → Byteshandel med studentskagg · Artist and Critic → Konstnären och kritikern.

### Agent names (shipped agents and library programs)
Artist → Konstnären · Critic → Kritikern · Renderer → Ritaren · Judge → Domaren · Eyes → Ögonen · Designer → Formgivaren ·
Referee → Domaren (Fool the Eyes: Domaren; Tic-Tac-Toe: Domaren) · Tic-Tac-Toe Referee → Tre i rad-domaren ·
Ledger → Kassaboken · Keeper → Väktaren · Notebook → Anteckningsboken · Shelf → Hylla · Mystery Box → Mysterielådan ·
Name Keeper → Namnvakten · Vote → Omröstning · Escalator → Rulltrappan · Collector → Samlaren · Scorekeeper → Poängräknaren ·
Book → Boken · Brief → Uppdraget · Selector → Väljaren · Dot Counter → Prickräknaren · Loop Spotter → Upprepningsspanaren ·
Tally → Räknestickan · Row Judge → Raddomaren · Grid Judge → Rutnätsdomaren · Triangle Judge → Triangeldomaren ·
Checkerboard Judge → Schackbrädesdomaren · Color Count Judge → Färgräknardomaren · Mystery Judge → Mysteriedomaren ·
Writer A/B/C → Skribent A/B/C · Editor → Redaktören · Teller → Berättaren · Guesser → Gissaren · Finder → Hittaren ·
Drawer → Tecknaren · Describer → Beskrivaren · Trickster → Skojaren · Joker → Skämtaren · Notes → Anteckningar ·
Narrator → Berättarrösten · History → Historiken · Mutator 1/2/3 → Mutator 1/2/3 · Plain → Vanlig ·
Contemplative → Eftertänksam · Comparer → Jämföraren · Rival → Motståndaren · Rival X → Motståndare X ·
Alice, Bob, Charley → Alice, Bob, Charley (names stay) · Agent (a new blank AI agent) → Agent ·
Small helper / Big helper → Liten hjälpare / Stor hjälpare · Scorekeeper → Poängräknaren ·
Toys / Clothes / Animals / Tools (shelves) → Leksaker / Kläder / Djur / Verktyg · Pip (the dragon) → Pip.

### Word lists that rules and programs must share exactly
- Lost and Found shelves (rules in SEEDS and the Mystery Box params/pseudocode in LIBRARY):
  toys: boll, docka, drake, nalle · clothes: hatt, strumpa, tröja, sko · animals: hund, katt, fågel, fisk ·
  tools: hammare, nyckel, sked, såg  (so the Mystery Box list is
  "boll, docka, drake, nalle, hatt, strumpa, tröja, sko, hund, katt, fågel, fisk, hammare, nyckel, sked, såg").
- Trail Mix ingredients: raisins, cashews, pretzels → russin, cashewnötter, saltkringlor.
- Tic-Tac-Toe Referee board rows: top / middle / bottom → överst / mitten / nederst; “free square” → “ledig ruta”
  (e.g. "X ska spela: välj en ledig ruta: 1, 2, 3."); “takes square 5” → “tar ruta 5”; “already taken by” → “är redan tagen av”.
- Secret Number Keeper says: "higher" → "högre", "lower" → "lägre", "yes!" → "ja!".
- Artist and Critic: the Critic's score format “7/10” stays (rules match “/10”).
- Joke ratings: numbers 1–5 stay digits.

### Ani's words (the Mini-Ani, 1.14.0): shared by the Cast, the experts, Taste, the Choice Points, the Method Chooser and the Director
- Agents: Mini-Ani (title stays) · Cast → Rollistan · Personality → Personlighet · Looks → Utseende ·
  Relationships → Relationer · Taste → Smak · Choice Points → Valpunkterna · Method Chooser → Metodväljaren ·
  Director → Regissören · Renderer → Ritaren.
- Characters: Cinderella → Askungen · the Stepmother → Styvmodern · the Godmother → Gudmodern · the Prince → Prinsen;
  the other starts: Tom, Sam, Ivy · the Wolf → Vargen · the Lamb → Kaninen (common gender, so “blyg”, not “blygt”) ·
  the Owl → Ugglan. A stand-in: “X after” → “X efter”.
- The Cast's story words: is → är · and → och · the → den · Scene → Scen · changes → ändrar (“A ändrar sig från X
  till Y” for a change of one's own) · from → från · to → till · becomes → blir · keeps … from → håller … borta från ·
  friends {helps, likes, loves} → {hjälper, gillar, älskar} · feelings {happy, sad} → {glad, ledsen}. “The end.” → “Slut.”
- The Choice Points' words (element: low/high, lower/higher): speed → fart: långsam/snabb, långsammare/snabbare ·
  liveliness → livlighet: lugn/livlig, lugnare/livligare · curves → kurvor: rak/kurvig, rakare/kurvigare ·
  jerkiness → ryckighet: jämn/ryckig, jämnare/ryckigare · purpose → mål: planlös/målmedveten, mer planlös/mer målmedveten ·
  friends → vänner: vänskygg/vänsökande · strangers → främlingar: främlingsskygg/främlingsvänlig ·
  size → storlek: liten/stor, mindre/större · shape → form: rund/spetsig, rundare/spetsigare ·
  detail → detaljer: enkel/sirlig, enklare/sirligare · brightness → ljusstyrka: mörk/ljus, mörkare/ljusare ·
  warmth → värme: kall/varm, kallare/varmare · height → höjd: längre ner/högre upp, under/över.
  Levels low, medium, high → låg, medel, hög (“medel fart”); same → samma; a bit → lite; very → mycket; not → inte.
- Describing words: shy → blyg · hardworking → flitig · graceful → graciös · friendly → vänlig · evil → ond ·
  kind → snäll · strong → stark · determined → beslutsam · mean → elak · good → god · beautiful → vacker ·
  shabby → sjaskig · selfish → självisk · pretty → söt · magical → magisk · stubborn → envis · elegant → elegant ·
  bold → modig · grumpy → grinig · industrious → arbetsam · lazy → lat · brazen → fräck · forward → framfusig ·
  clumsy → klumpig · unfriendly → ovänlig · weak → svag · gorgeous → underbar · unkempt → ovårdad · ugly → ful.
- Relationships: dominates → dominerar · obeys → lyder · rules → styr · likes → gillar · dislikes → ogillar · loves → älskar.
- Taste: energy → energi · flashiness → prålighet · variety → variation · obviousness → tydlighet · complexity →
  komplexitet; “the film's ” → “filmens ”.
- Ways of showing (the Method Chooser and the Director compare them): keeps away → håller sig undan · chases off →
  jagar bort · looms over → tornar upp sig · stands guard → står vakt · goes along → följer med · come together → möts ·
  goes to and changes → går fram och ändrar · comes closer bit by bit → närmar sig bit för bit · moves about → rör sig
  fritt · feels → känner.
- Mini-Ani with AI voices (1.15.0) → Mini-Ani med AI-röster: AI Animator → AI-animatören · Reader → Läsaren ·
  Narrator → Berättarrösten · You → Du (also the Choice Points' {You} slot). The rules to the AI Animator and to
  You look for the Cast's “suggest values” → “föreslår värden”. “Your own story, in your own words” → “Din egen
  berättelse, med dina egna ord”; “Not used” → “Inte använt”. The AI agents' instructions list the Choice Points'
  and the experts' Swedish words, and ask for them without endings (“utan ändelser”).
- The Director's shapes and colors (also its `SHAPES` and `HUES` keys): circle → cirkel · square → kvadrat ·
  pentagon → femhörning · triangle → triangel · star → stjärna · nine-point star → niouddig stjärna · flower → blomma ·
  red → röd · orange → orange · yellow → gul · green → grön · blue → blå · purple → lila · pink → rosa · white → vit ·
  gray → grå · brown → brun; black (the screen) → svart. The Logo it writes keeps Logo's own color names (“silver”).

## Plurals (all parts)
English code makes plurals with `plural(n, "agent")` (= util.plural, which adds an "s"). Swedish plurals differ, so
Part 1 changes util.plural so that a word written as "singular|plural" picks the right form:
`plural(2, "agent|agenter")` → "2 agenter", `plural(1, "agent|agenter")` → "1 agent". Every part: wherever you see
`plural(…, "word")` or hand-made plurals like `n + " message" + (n === 1 ? "" : "s")`, write the Swedish
"singular|plural" form or the Swedish words. (In openYours there is a hack `.replace("societys", "societies")` —
use `plural(n, "samhälle|samhällen")` instead.)

## Other shared decisions
- `<html lang="en">` becomes `<html lang="sv">` (Part 1). The exported trace page's `lang="en"` becomes `lang="sv"` (Part 8).
- The saved-work key `LS_KEY = "agentkit.v1"` becomes `"agentkit.v1.sv"` (Part 6), so the Swedish and English copies
  never share saved work in the same browser.
- The safety PREAMBLE (Part 1) gets one more sentence: "Skriv alltid på svenska." The Helper's and the Translator's
  system prompts (Part 5) say to write to the learner in Swedish.
- AK.VERSION stays as it is.
