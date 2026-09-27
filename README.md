# Mirror History

**▶ Try it live: https://fwornle.github.io/mirror-history/**

A single-page timeline with **two parallel time axes** hinged on your date of birth.

The upper rail is your life running forward. The lower rail is the *same number
of years* running backward from the moment you were born. A fixed reading head
down the middle never moves — scrolling slides both rails past it, so whatever
you stop on, you are looking at two moments equidistant from your birth.

Stop at 31 years and the screen shows you 2006 above and 1944 below: the iPhone
announcement over the liberation of Auschwitz.

```bash
npm install
npm run dev      # http://localhost:3002
```

## Set your inflection point

The birth date is set **in the app**, not in the source — the ⚙ button, top
right. It is stored per browser, so every user of the same build gets their own
hinge. On first run the setup card opens itself, because a placeholder date
produces a plausible-looking but wrong timeline.

Change it and all 204 world events redistribute between the two rails, every
ruler tick relabels, the mirror re-hinges and the cursor returns to today.
Nothing else needs touching.

`src/data/personal.ts` still holds the *defaults* for someone who has never
opened the app, if you would rather bake your own in than type them.

## Search

The box in the header searches every event on both rails. Type `Titanic`, press
Enter, and the timeline glides that card under the cursor and opens it. Press
`/` anywhere to jump into the box; arrows and Enter to pick.

Results are ranked so the obvious answer is first — a title that *starts* with
the query beats one that merely contains it, which beats a hit in the body text,
with heavier events breaking ties. Each result also shows the year it mirrors,
so you can see the pairing before you commit to travelling there.

## Clicking a card

A tile on the rail is 236px wide and drifts while the timeline scrolls, so it
cannot usefully hold a video player or a paragraph. Clicking one instead brings
it under the cursor and **zooms it up** into a stationary reading panel:

- the full description, and the Wikipedia extract fetched on demand
- a link out to Wikipedia, and to the video
- the **embedded YouTube player** where a verified video exists
- the mirror line — *"You were 8 months. The mirror of this moment is 1968."*

`Esc` or the scrim closes it. Focus is trapped inside while it is open.

## How the mirror works

There is exactly one piece of state: `offset`, in **years from birth**.

```
forward rail shows   birth + offset
mirror  rail shows   birth − offset
```

Every event is positioned by its *distance from birth*, not by its date — which
is why the same screen position means the same distance on both rails. World
events are split automatically: on or after your birth they go to the forward
rail, before it to the mirror rail.

## Controls

| Action | Input |
|---|---|
| Travel along the rails | Scroll, drag, or the Travel slider |
| Step a year / a decade | Arrow keys / Shift + arrows |
| Jump to birth or today | `Home` / `End`, or the buttons |
| Open a card | Click it — it glides to the cursor and zooms up |
| Play the video | The poster inside the zoomed panel |
| Filter categories | The chips, bottom left |
| Reveal more events | The `+` zoom control |
| Search | The header box, or `/` from anywhere |
| Set your birth date / import | The ⚙ button |
| Close the zoomed panel | `Esc` |

## Categories

Six world-history hues plus your own life:

| Category | Colour | |
|---|---|---|
| Politics & conflict | `#dc193d` | wars, revolutions, treaties, elections |
| Disaster | `#ce7f00` | earthquakes, storms, pandemics, industrial catastrophe |
| Science & technology | `#009fde` | discoveries, medicine, computing |
| Space & exploration | `#4254df` | spaceflight, and reaching the unreached |
| Sport | `#37ac69` | Games, World Cups, lasting records |
| Culture & arts | `#ab2ca7` | music, film, literature, art |
| **Your life** | inverted light card | your own events |

The six hues were optimised against this app's surface (`#0f172a`) and verified
with the data-viz palette validator on the **all-pairs** pairlist, because cards
scatter freely and any two can end up adjacent. All checks pass: worst pair
ΔE 18.6 for normal vision, 8.3 under simulated deuteranopia.

8.3 clears the colour-vision floor only narrowly, which makes secondary encoding
mandatory — so **every card prints its category name**, and colour never carries
the distinction alone. Do not add a seventh hue or re-step these without
re-running the validator.

Your own life is deliberately *not* a seventh hue. It renders as an inverted
light card, so it is distinguished structurally rather than chromatically and
stays legible in any form of colour vision.

## Video

`src/data/youtube-verified.json` holds 14 hand-checked video ids, which play
inline in the zoomed panel. Every other event falls back to a **YouTube search
link**.

That asymmetry is deliberate. A guessed video id is worse than no id: the card
plays the wrong thing, confidently. `scripts/verify-youtube.mjs` resolves each
candidate against YouTube's oEmbed endpoint and prints the real title and
channel so a human can confirm the match before it ships:

```bash
node scripts/verify-youtube.mjs scripts/youtube-candidates.json          # report
node scripts/verify-youtube.mjs scripts/youtube-candidates.json --write  # commit
```

It earns its keep — of the 33 candidates tried, 16 did not resolve at all and 3
resolved to the wrong video (one "Live Aid" id turned out to be an unrelated
Queen music video, and a "ChatGPT release" id a beginner's tutorial).

Card thumbnails and summaries are pulled lazily from Wikipedia as you scroll,
and the app is fully usable without a network.

## Importing your life from Facebook or Instagram

Open ⚙ and drop your Meta **Download Your Information** JSON files onto the
panel. The importer reads:

- your **birthday**, and offers it as the inflection point in one click
- your name
- **work, education and moves** from `profile_information.json` — dated
  milestones, which land on the rail at full weight
- **dated posts** from Facebook or Instagram, which come in at low weight so
  they yield their lane to world events

Imported events are tagged by source and can be removed in one click without
touching anything you typed yourself. Re-importing the same export updates
rather than duplicates, because ids are content-hashed. Nothing is uploaded —
the file is read in the tab.

Run `npm test` to exercise the parser against Facebook and Instagram fixtures
(19 assertions, including the character-encoding repair below).

### Why a file and not a "Log in with Facebook" button

That was the intent. It is not currently buildable as a browser app, for three
reasons, each sufficient on its own:

1. Instagram's APIs serve **professional** (business or creator) accounts only.
   A personal Instagram account cannot be read through them at any permission
   level — the Basic Display API that used to allow it is gone.
2. Reading someone's Facebook posts requires permissions that only clear Meta's
   **App Review** against an approved business use case.
3. The OAuth code-for-token exchange requires the app **secret**, which cannot
   ship in a browser app — it needs a server.

So a login button would either do nothing useful or lie about what it does. The
export route has none of those limits and is strictly better on two counts: it
carries the birthday and the work/study/move history that the post APIs never
expose, and the data never leaves the machine.

If you want the OAuth path anyway, it needs a registered Meta app, business
verification, App Review, and a small backend to hold the secret and exchange
the code. The seam for it is `ImportResult` in
`src/data/import/meta-export.ts` — a connector only has to produce that shape.

### A note on Meta's character encoding

Meta writes UTF-8 bytes escaped as if they were Latin-1, so accented names
arrive mangled. `fixMetaText` reinterprets the code points as bytes and decodes
them as UTF-8, and leaves anything that fails to round-trip exactly as it was.

## Why CSS 3D and not Three.js

The sibling `timeline` project renders its cards in WebGL. A WebGL scene cannot
contain a DOM element, and therefore cannot contain a YouTube player. Since
cards here have to play video, they are real DOM nodes under a CSS `perspective`
— which also gives text selection, real links and keyboard focus for free, at a
fraction of the weight.

## Layout notes

- **Lane packing** (`src/utils/lanes.ts`) runs in timeline space, so it is
  recomputed on zoom but never while scrolling. Heavier events claim the lanes
  nearest the axis; when every lane is contested, the least significant event is
  *dropped* rather than stacked on a neighbour. The zoom control shows the real
  count ("78 of 208"), and zooming in brings the rest back.
- **Lane height is measured**, not fixed, so the outermost lane fits on short
  viewports instead of clipping.
- **Depth saturates** (`src/utils/depth.ts`) rather than growing linearly, so
  distant cards recede without collapsing onto the vanishing point.
- **Viewport culling** keeps only cards near the cursor in the DOM.

## Structure

```
src/
  config/     categories (validated palette) and timeline geometry
  data/       history.ts (204 events) · personal.ts (defaults) · events.ts (buildTimeline)
              import/meta-export.ts (Facebook / Instagram parser)
  state/      timeline-store.tsx — the profile, persisted, and the rebuilt rails
  hooks/      useTimelineScroll (the one scalar) · useWikiSummary
  components/ Rail · EventCard · EventDetail · SearchBox · SettingsPanel
              AxisRuler · FocusCursor · TopBar · BottomBar
  utils/      time · depth · lanes
scripts/      verify-youtube.mjs · run-tests.mjs · test/
```

## License

MIT — see [LICENSE](LICENSE).
