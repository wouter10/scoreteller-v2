# Scoreteller v2 — Projectcontext (CLAUDE.md)

## 1. Overzicht

Scoreteller v2 is een scorekeeping-PWA voor kaartspellen (met name Toepen). Sessies worden opgeslagen in Supabase, zodat meerdere apparaten live mee kunnen kijken via een 6-karakter sessiecode (bijv. "A3KF9R"). Geen auth — alles is publiek leesbaar/schrijfbaar. UI-teksten zijn Nederlands.

## 2. Tech stack

- Geen framework, geen build-stap, geen package.json/npm-dependencies. Platte ES modules, direct geladen via `<script type="module" src="js/app.js">`.
- **Supabase** voor cloud-opslag en realtime sync: Supabase JS client geladen via `https://esm.sh/@supabase/supabase-js@2`. Projectref: `veijzncqjhqvyqbjrdgw` (eu-west-1).
- Styling: één handgeschreven globale `style.css` met CSS custom properties in `:root` (`--bg`, `--accent`, `--radius`, `--tap-min: 52px`, …). Geen CSS-modules, geen preprocessor.
- PWA: `manifest.json` + `sw.js` (network-first met cache-fallback) voor offline/installeerbaarheid.
- Hosting: statische SPA op Vercel via `vercel.json` (rewrite-all naar `index.html`).
- Geen testsuite, geen CI/CD, geen linter-config.

## 3. Bestandsstructuur

- `index.html` — shell, loading-spinner, viewport/PWA meta tags.
- `js/app.js` — router/state-controller: `navigate()`, `startSession()`, `handleSessionEnd()`, registratie van alle schermen. Boot-functie handelt `?join=` URL-parameter af.
- `js/screens/*.js` — één bestand per scherm (`home.js`, `newSession.js`, `scoreboard.js`, `end.js`, `players.js`, `games.js`, `stats.js`). Elk exporteert een `registerXScreen(navigate, ...)` die een render-functie registreert bij `ui.js`.
- `js/ui.js` — DOM-helpers: `registerScreen()`, `renderScreen()`, `el()`, `createButton()`, `escapeHtml()`, `showToast()`, `showDelta()`. Raakt nooit localStorage of Supabase direct aan.
- `js/data.js` — enige module die localStorage aanraakt. Keys: `st_players`, `st_games`, `st_active_session`, `st_sessions_history`. Bevat ook `PLAYER_COLORS` en `generateId()`.
- `js/supabase.js` — Supabase client-init + alle DB-operaties (`createSession`, `fetchSession`, `createSessionPlayers`, `fetchSessionPlayers`, `submitRound`, `fetchRounds`, `deleteLastRound`, `endSession`) + realtime (`subscribeToSession`, `unsubscribe`).
- `js/gameLogic.js` — pure functies zonder DOM/localStorage: `computeTotals`, `getEliminatedIds`, `checkGameOver`, `buildSessionResult`, `generateSessionCode`.
- `style.css` — globale stylesheet voor alle schermen.
- `manifest.json`, `sw.js` — PWA-installatie + offline caching.
- `vercel.json` — deploy-config.
- `icons/icon.svg` — SVG-icoon (placeholder; vervangen door PNG's voor volledige iOS-ondersteuning).

## 4. Supabase schema

```sql
sessions        (id uuid, code text UNIQUE, game_name text, max_points int, status text, created_at, ended_at)
session_players (id uuid, session_id → sessions, name text, color text, position int)
rounds          (id uuid, session_id → sessions, round_number int, created_at)
round_scores    (round_id → rounds, session_player_id → session_players, points int)
```

- Spelers zijn **sessie-specifiek** (geen global players-tabel in Supabase). De lokale spelersbibliotheek voor hergebruik staat in localStorage (`data.js`).
- `sessions.code` is een 6-karakter uppercase code gegenereerd door `generateSessionCode()` in `gameLogic.js`. Retries bij unique constraint-conflict (code `23505`).
- RLS is **uitgeschakeld** — publieke read/write, geen auth in MVP.
- Realtime ingeschakeld via `ALTER PUBLICATION supabase_realtime ADD TABLE ...` en `REPLICA IDENTITY FULL` op alle tabellen.

## 5. State en persistence

- **Actieve sessiestate** leeft in geheugen in `js/screens/scoreboard.js` (`session`, `players`, `rounds`), initieel geladen vanuit Supabase.
- **Realtime**: Supabase-subscriptions op `rounds` en `sessions` houden de state bij als andere apparaten wijzigingen doorvoeren. `round_scores` wordt indirect afgevangen door `onScoreChange` → her-fetch rounds.
- **localStorage** (via `data.js`): spelersbibliotheek, spellenlijst, laatste actieve `session_code` (voor "hervatten bij heropenen"), sessiegeschiedenis voor statistieken.
- Schermen gaan altijd via `data.js` voor localStorage en via `supabase.js` voor Supabase — nooit direct `localStorage.getItem/setItem` of `supabase.*` in een scherm.

## 6. Conventies

- Nieuwe UI-teksten zijn Nederlands, in dezelfde toon als bestaande strings (bv. "Bevestigen ✓", "Wis invoer", "Sessie beëindigen?").
- Schermen bouwen met `el(tag, attrs, ...children)`. Kleine statische blokken of foutberichten mogen `innerHTML` gebruiken (dan `escapeHtml()` voor gebruikersinvoer).
- Elke tikbare control is een echt `<button>`-element (nooit een klikbare `<div>`) — hier steunt de globale `button { touch-action: manipulation; }` op. Gebruik `el('button', ...)` of `createButton()`.
- CSS: hergebruik bestaande custom properties (`--tap-min`, `--radius`, `--radius-sm`, `--transition`, kleurtokens). Klassenamen volgen losse BEM-stijl.
- ES modules draaien in strict mode — gebruik geen `arguments.callee`. Zie `players.js` voor het `buildPicker()`-patroon als alternatief.
- Render-functies die bij `registerScreen()` worden doorgegeven moeten **synchroon** een DOM-element retourneren. Gebruik nooit `async` op de outer render-functie — dat geeft een `Promise` terug waar `appendChild` een `Node` verwacht. Async werk (Supabase-fetches) hoort in een inner `init()` die je aanroept vóór de `return wrap;`.
- **Overlay/modal-patroon** (bv. het numerieke toetsenbord in `scoreboard.js` `openNumpad()`): wordt aan `document.body` toegevoegd, niet aan `wrap` — `render()` doet `wrap.innerHTML = ''` en zou een overlay die aan `wrap` hangt wegvagen bij een realtime update (ander apparaat dat tegelijk een ronde bevestigt) terwijl de overlay open staat.

## 7. Mobiele/iOS-lessen (overgenomen uit v1)

- **Geen `<input>` voor scoring** — bewust vermeden om iOS Safari auto-zoom bij focus te voorkomen. Bij tekst-/getalinvoer elders: minimaal `font-size: 16px`. Voor handmatige score-invoer (grote getallen) gebruikt `scoreboard.js` daarom een eigen numeriek-toetsenbord-overlay (`openNumpad()`, knoppen 0-9/±/⌫) i.p.v. `<input type="number">`.
- **`touch-action: manipulation`** staat globaal op `button` (style.css) om Safari's dubbeltik-zoom te voorkomen bij snel herhaald tikken (bijv. de +/− pill-knoppen).
- **Geen `maximum-scale/user-scalable=no`** in viewport-meta — dat breekt pinch-zoom-toegankelijkheid.
- **`.pill-btn` (+/− knoppen)** is 32px hoog, onder `--tap-min: 52px`. Bewust niet aangepast om de layout compact te houden.

## 8. Service worker / cache-strategie

- **Network-first**: elke fetch probeert eerst het netwerk, valt pas terug op de cache als dat faalt. Nooit cache-first (anders zien gebruikers eeuwig een oude versie).
- `CACHE`-constante in `sw.js` is een versienaam (`scoreteller-v2-1`). Bump bij elke deploy die gebruikersgedrag raakt; de `activate`-handler ruimt oude caches automatisch op.
- **Precache-lijst (`ASSETS`)** moet elk JS-schermbestand bevatten. Voeg nieuwe schermbestanden hier altijd toe.
- Supabase/CDN-requests worden bewust **niet gecached** door de service worker (URL-origin check in de fetch handler).
- **Bekende valkuil**: `cdn.jsdelivr.net` ESM-build van `@supabase/supabase-js` bevat Node.js bare imports en werkt niet in browsers — altijd `esm.sh` gebruiken.

## 9. Scorebord: puntengrenzen, geschiedenis, invoer

- Default `maxPoints` voor een nieuw/eerste "Toepen"-spel (localStorage-seed in `data.js`, en het "nieuw spel"-formulier in `games.js`) is **15**. `max_points` blijft volledig instelbaar per spel via het Spellen-scherm — dit is alleen de default, geen harde grens.
- **"Op Pelt"-melding**: in `scoreboard.js` (`btnConfirm`-handler) wordt na elke bevestigde ronde per speler gecontroleerd of die *nét* op `session.max_points - 1` is beland (overgang t.o.v. vóór de ronde, niet bij elke render). Zo ja: `showToast('${naam} staat op Pelt', 'warning')`. Werkt generiek op basis van `max_points`, dus ongeacht de daadwerkelijk ingestelde puntengrens.
- **Ronde-invoer wordt na bevestigen gereset** naar 0 (`pendingScores`), net als bij "Wis invoer" — anders bleven de zojuist ingevulde waarden staan als startpunt voor de volgende ronde.
- **Negatieve scores zijn toegestaan** in de ronde-invoer: de min-knop (`btnMinus`) heeft geen ondergrens (bewust, op gebruikersverzoek). De plus-knop blijft geklemd op `session.max_points`.
- **Ronde-geschiedenis**: inklapbare sectie op het scorebord (`showHistory`-toggle in `scoreboard.js`, geen apart scherm) die per ronde (nieuwste eerst) de ingevulde punten per speler toont, opgebouwd uit de al aanwezige `rounds`/`fetchRounds`-data — geen extra Supabase-call.

## 10. Sessiedeling

- Sessiecode (6 uppercase alfanumerieke karakters) wordt getoond in de header van het scorebord en is klikbaar: deelt via Web Share API op ondersteunde apparaten, of kopieert de `?join=CODE` URL naar klembord.
- `?join=` URL-parameter wordt bij app-boot afgevangen in `app.js` → direct naar het scorebord-scherm.
- "Sessie hervatten" knop op het home-scherm als er een actieve `session_code` in localStorage staat.

## 11. Onderhoud van dit bestand

- Werk dit CLAUDE.md bij na elke inhoudelijke wijziging (nieuwe/verwijderde bestanden, nieuwe conventies, gewijzigde architectuur, opgeloste of nieuwe bekende kwesties).
- Commits, pushes, Vercel-deploys en Supabase-acties mogen autonoom zonder bevestiging.
- Vraag de gebruiker bij scope- of architectuurwijzigingen die afwijken van bovenstaande.
