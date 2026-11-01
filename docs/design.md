# Keys & Doors: visual and interaction design

Keys & Doors turns natural deduction into a maze. Every room has one door (the goal) and a tray of keys (the assumptions you hold). You open the door by fitting a key into a hole of the same shape. This document fixes how that looks and feels on a phone.

Scope: propositional logic with the five moves below, eight stages.

| Logic | In the game |
| --- | --- |
| Assumption use | Drop a key into the door's hole of the same shape |
| And-intro (∧I) | Tap the brass bar of an AND door: it splits into door, bar, door; then fill each door's hole |
| And-elim (∧E) | Tap the brass bar of a joined key in the tray: you get both keys (decided, not built yet; until then, drop the joined key on the empty slot, 6.4) |
| If-intro (→I) | Tap an if-then door: you borrow the key its hole wants, then make its grey half |
| If-elim (→E) | Fit a key into the hole of an if-then key: its grey half fills with colour and becomes a new key |

## 1. Principles

1. **Pictures, not formulas.** No formula, letter, or word appears in normal play. A formula appears only while you long-press something (section 4.4).
2. **A key is its shape.** There are no key cards and no key bows. The sun key *is* a sun, cut out of something solid; the moon key is a moon. A door hole is the same outline recessed into the door. A key fits a hole exactly when their outlines are the same, so a perfect fit is visible at a glance, before anything is dropped.
3. **Nothing to learn but three looks.** Every part of every picture is in one of three looks, and each look means one thing everywhere:
   - **Hole** (the outline recessed: dark inside, bright lip below): *put a key of exactly this shape here.*
   - **Colour** (the shape raised, with a visible thickness): *you have this.*
   - **Grey** (the shape printed flat in grey): *you will get this once the hole next to it is filled.*

   The only other marks are an **arrow** (this hole gives that grey thing), and the **brass horizontal bar** of AND, the same on keys and doors, lying between the two halves: on a key you hold both, on a door you need both, and tapping it takes the door apart (2.8). Players already know arrows, cut-out shapes, and things bolted together, so no symbol needs to be taught. Player feedback showed that the earlier abstract marks (a `>` chevron for if-then and a brass ring for and) were not understood. Rectangular key cards are gone for the same reason: they put a rectangle around the one thing that matters, the shape.
4. **Keys go forward, doors go backward.** Elimination rules act on keys (what you have) and make more keys. Introduction rules act on the door (what you need) and make simpler doors. Play ends when a key fits a hole of the same shape. A player never has to learn which rule applies: the object they touch decides it.
5. **One shape per proposition, everywhere.** A proposition always has the same outline, at every size and nesting depth. Compound keys are built from the outlines of their parts (section 2.3), so their outline is unique too, and so is their hole.
6. **One room per screen.** The phone shows exactly one open goal at a time. The path bar at the top shows where that room sits.
7. **Every drop is previewed.** While you hold a key over a target, the result is drawn as a ghost before you let go. A drop never does anything the preview did not show.
8. **Nothing is used up.** Keys are assumptions and stay in the tray after use. Dragging a key moves a copy; the original stays in its slot, dimmed.

## 2. Shapes

![Shape sheet: keys, doors, and after a key fits](mockups/cards.svg)

The runtime source of every key, hole, and door picture is `picture()` in `src/picture.ts`. The mockups in `docs/mockups/` are drawn by that same function, so this section, the code, and the pictures agree. All lengths below are in CSS pixels of the drawn picture.

### 2.1 Atoms

Each atom has a fixed colour **and** a fixed silhouette, so the four atoms stay distinct without colour vision. The order below is also the order in which stages introduce them.

| Atom | Silhouette | Fill | Edge | Icon |
| --- | --- | --- | --- | --- |
| P | Sun: a disc with eight slim rays | `#E0631F` | `#A8410C` | `atom-sun.svg` |
| Q | Moon: a crescent opening to the top right | `#2F6FD0` | `#1E4C96` | `atom-moon.svg` |
| R | Leaf: a pointed leaf with a stem stub | `#1E9A6C` | `#0F6A48` | `atom-leaf.svg` |
| S | Star: five sharp points | `#C2509E` | `#8A2F6E` | `atom-star.svg` |

Each silhouette is **one closed outline** on a 48 × 48 grid (`outlines` in `src/picture.ts`, the same path data as the atom icons). A key's thickness, its hole, and its halo are all drawn from that one path, so they can never disagree. Rules for the outlines:

- No separate strokes and no holes inside the outline: anything that is not part of the outline would not be part of the hole either. The sun's rays are part of its outline; the leaf's stem is a solid stub, not a line.
- The silhouettes differ in kind (disc with eight slim rays, crescent, leaf, five sharp points), not just in size. Every one stays recognisable at about 16 px, the size of a nested atom in a tray key on a phone.
- The box centre (24, 24) lies inside every silhouette, so a pair bar that ends there is hidden under the shape (2.3).
- Engraved marks may sit on a key's face (the leaf's vein, `marks` in `src/picture.ts`). They are decoration only: holes and grey shapes do not show them.

### 2.2 The three looks

| Look | Meaning | How it is drawn |
| --- | --- | --- |
| **Colour** | You have it | The face in the atom's fill with a 2 px edge stroke, over its **thickness**: the same outline in the edge colour, moved down by `t` (2.5) |
| **Hole** | Put a key of exactly this shape here | The same outline as a recess (2.5) |
| **Grey** | You get it when the hole beside it is filled | The same outline, flat (no thickness), in `pending` / `pending-edge` |

### 2.3 Compound keys

A compound key is built from the shapes of its parts, so its outline is as distinctive as an atom's.

| Connective | Name in game | Key (you hold it) | Hole (you need it) | Icon |
| --- | --- | --- | --- | --- |
| A ∧ B | Pair | Shape A and shape B side by side, **bolted together by the brass horizontal bar** that lies in the gap and touches both (2.8) | On a **goal door**: hole A and hole B side by side with the **same brass bar** between them, raised, not a hole. Tap the bar and the door splits into a door for A and a door for B (2.8). Inside a key (the hole of an if-then key, a pocket floor): hole A and hole B joined by a recessed **channel**, because there only a whole pair key fits | `conn-and.svg` |
| A → B | If-then | A cream **plate** that hugs its contents: the **hole of A**, an **arrow**, and **B in grey**. The plate's outline is its contents grown by a margin, so it follows their shapes | A **pocket**: a shallow recess with the plate's outline, with the plate's face (hole of A, arrow, grey B) printed on its floor | `conn-imp.svg` |

Why these pictures:

- **Pair** is symmetric because ∧ is. Two shapes bolted together read as "these belong together": on a key, you hold both. On a goal door it is the very same raised brass bar, so a key and its door show AND the same way. Players said the old recessed channel read as one more hole to fill, which it was not. A raised bar is clearly not a hole, so it can't be mistaken for a place to drop something. It also invites a tap, and the tap is the next step of the proof: take the goal's AND apart, as in the original Proof Dungeon's goal decomposition.
- **If-then** is asymmetric because → is. The hole says "put A in", the arrow says "and you get", the grey says "this, which you do not have yet". Fitting A turns the grey colour: that *is* if-elim. The plate exists because the hole of A needs something solid to be cut into; it hugs its contents so that the key still has a shape of its own and no rectangle appears.
- An if-then **door** is a pocket for exactly that plate. Its floor shows the same face as the key, so it reads as "make the grey half real, given the hole's key", which is if-intro. Tapping the hole on the floor lends you its key (6.6).

**Nesting** applies the same rules inside:

- A pair inside a pair: the inner pair's bar runs between its shapes; the outer bar runs from the centre of the inner pair's box, which lies on the inner bar, so the whole key is one rigid piece (for example (P ∧ Q) ∧ R is a T of three shapes).
- A pair as A of an if-then: the hole of A is the pair's hole (two holes and a channel), cut into the plate.
- An if-then as A of an if-then: the hole of A is a pocket in the outer plate, with the inner key's face on its floor at 60% opacity. The dimmed face says "a key that looks like this goes here", not "put a sun here".
- A compound as B of an if-then: B is drawn whole in grey: a grey pair bar, or a grey plate (`pending-plate`, edge `pending-edge`) with its own grey contents.
- An if-then as a half of a pair door: that half is a pocket at full opacity (a door shows its holes plainly). After the split it is a door of its own, an if-then door (2.7).
- A pair as a half of a pair door: that half has its own bar, and sits on a small platform (decided; its look is open item 34, 2.8).

### 2.4 Layout rule (recursive)

`picture(f, w, h, goal, filled)` draws one picture in a `w × h` box. Keys draw on a transparent background; doors draw a `paper` panel (radius 6, 1 px `edge` border) and are inset by `8%` of the shorter side. Keys are inset by 2 px, and their box loses `t` px at the bottom for their thickness, `t = clamp(1.5, 5% of the shorter side, 4)`.

Inside a box `b`:

1. **Fold:** if the shorter side of `b` is under **10 px**, draw `···` in `seam` instead. Long-press shows the full formula.
2. **Atom:** the silhouette is a square of side `s = 92%` of the shorter side of `b`, centred in `b`. The 48-grid path is scaled by `s / 48`; stroke widths given in px are divided by that scale.
3. **Pair:** the two halves always sit **side by side**, left and right, never stacked (decided 11/1). Between them lies the **brass horizontal bar** of 2.8, the same on keys and goal doors: the gap and the bar's size come from `AND_BAR` (14.1). Key: `brass` with a 1 px `brass-dark` edge. Hole inside a key or on a pocket floor: a recessed channel (2.5) for now; whether it becomes a flat bar is open item 4. *Runtime today:* the box splits along its longer axis with gap `clamp(6, 10% of the long side, 16)`, so nesting alternates between side by side and stacked, and the key bar runs from centre to centre behind both shapes; on a goal door the gap is `clamp(20, 16% of the long side, 32)` and holds PR 6's vertical joint. That changes with 2.8 (14.9, 14.10).
4. **If-then:** margin `m = clamp(2, 7% of the shorter side of b, 7)`. Inset `b` by `m`, then split it like a pair, with gap `clamp(12, 16% of the long side, 26)`. The first half holds the **hole of A**, the second **B in grey**.
   - **Arrow**, centred in the gap: shaft `max(8, gap − 4)`, open head of size `clamp(3, 33% of the shaft, 6)`, stroke `clamp(1.8, 3% of the short side, 3.5)`, round caps and joins, colour `seam`. It points right in a row and down in a column.
   - **Spine:** a band from the centre of the first half to the centre of the second, `2 ×` the arrow head size thick, so the plate stays one piece under the arrow.
   - **Plate:** the outlines of A, B, and the spine, each grown by `m`. Growing an outline by `r` is drawing it with a stroke of width `2r` in its own fill colour, with round joins; a nested if-then grows its parts by the sum of the margins on the way down. The plate is drawn twice: first grown by `m + 1.5` in `brass-dark` (the 1.5 px edge), then grown by `m` in `paper`.
5. **Doors** draw the whole proposition as a hole, keys draw it in colour. Proof-tree nodes and the stage map use the same pictures as keys and doors.

Door pictures (184 × 137) show three levels without folding. Key pictures (88 × 66 on a phone) and proof-tree nodes fold from the fourth level, for example inside (P → Q) → ((Q → R) → (P → R)).

### 2.5 Thickness and recess

Light comes from above. A key stands out of the surface, so its thickness shows as a dark band below its face. A hole is cut into the surface, so it has a dark rim inside its top edge and a bright lip below its bottom edge.

**Thickness:** the key's outline, every part in its edge colour (atom edge, `brass-dark` for bars and plates), moved down by `t` (2.4), drawn behind the face. A grey shape and a seated key have no thickness.

**Recess:** every hole is drawn from three copies of its outline (with a 1 px stroke in the same colour), offset by a depth `d`:

1. The **lip**: the outline in `lip`, moved down by `d`.
2. The **body**: the outline in `hole-shadow`.
3. The **floor**: the outline in `hole`, moved down by `1.3 d`, masked by the body. The part of the body it does not cover is the dark rim.

| Recess | Depth `d` | Body / floor |
| --- | --- | --- |
| Atom hole | `clamp(1, 5% of the shorter side of its box, 3.5)` | `hole-shadow` / `hole` |
| Pair channel | `clamp(1, 20% of the bar thickness, 2.5)` | `hole-shadow` / `hole` |
| If-then pocket | `clamp(1.5, 4% of the shorter side of its box, 4)` | `pocket-shadow` / `pocket` |

A pair hole (inside a key or on a pocket floor) is its channel first, then each half's hole on top, so the halves' lips cover the channel ends. A goal door has no channel: its bar is raised (2.8). Inside a grey half, recesses use the grey set (`pending-hole-shadow`, `pending-hole`, `pending-lip`, `pending-pocket-shadow`, `pending-pocket`).

### 2.6 States

`picture(f, w, h, goal, filled)` draws the static states; the in-between frames are in section 6.

| Part | State | Look |
| --- | --- | --- |
| Hole | Empty | The recess (2.5) |
| | Target: a held key fits | A **halo** under the recess: the outline grown by 3.5 px (stroke 7) in `ok`. Its opacity pulses 1 → 0.45 → 1 every 1.2 s, ease-in-out (`@keyframes glow` in `src/style.css`) |
| | Hover | The target scales to 104% and the *filled* picture is drawn over it at 50% opacity |
| | Seated | The key's face at **100%** of the hole's size, exactly over it, without thickness: it sits flush, and the hole's bright lip still shows as a hairline below it |
| Arrow | Waiting | `seam`, stroke as in 2.4 |
| | Lit | `lit`, stroke × 1.25 |
| Grey half | Waiting | Grey look |
| | Obtained | Colour look, still flat (it is printed on the plate until it lifts out, 6.1) |
| Pair channel (inside a key) | Waiting | Recessed channel |
| | Locked | The `brass` bar seated in the channel, flush |
| AND bar (goal door) | Idle, hint, pressed, split, one filled, both filled | See 2.8 |
| If-then pocket | Empty | Recess with the face on its floor |
| | Seated | The if-then key, as you hold it (its own hole empty, its result grey), flush |

**Paths.** `filled` lists the parts to draw as seated. A path names a part: `""` is the whole picture, `L` and `R` pick the halves of a pair, and `S` and `T` pick the hole and the result of an if-then. Paths concatenate: `TS` is the hole of the if-then in the result half. Filling a part fills everything inside it, a pair is filled when both its halves are, and filling an if-then (its path, not just its `S`) also lights its arrow and colours its result. For example, `"S"` on a sun → moon key is "sun seated, moon still grey", and `""` is "sun seated, arrow lit, moon in colour". On an if-then door, `""` keeps the pocket and lights its floor: the door is about to open.

**Hooks for animation.** The SVG marks its parts with classes:

| Class | Part |
| --- | --- |
| `.body` | A key's thickness |
| `.plate` | An if-then key's plate |
| `.slot` | The hole of an if-then |
| `.arrow` | An if-then arrow |
| `.result` | The grey half of an if-then |
| `.pair`, `.bridge` | A pair, and its bar or channel |
| `.joint` | The brass bar of a goal door, with `data-path` set to the pair's path. It is a button while the door is unsplit, and the same bar stays between the split doors (2.8). PR 6's `.coupler` and `.tab` go away |
| `.cut` | A hole, with `data-path` set to its path. Its bounding box is the hole the seat motion (6.1) aims at |
| `.imprint` | The face on the floor of a pocket |
| `.seated` | A seated key |
| `.glow` | A halo, with `data-path` set to the path of its hole, so a pair door can light only the hole the held key fits |

Halos exist on every hole of a door (each atom and each pair, at every depth, outside pockets) and on the outermost hole of an if-then key. An if-then door has none: what fits it is a whole if-then key, so the door's outline glows instead. On an **unsplit** pair door the halves' holes never glow for a single key, because a single key does not fit there until the door is split (2.8). Only a whole pair key fits an unsplit door (current behaviour; open item 7), and then the whole door glows. The bar itself never glows before every hole is filled (2.8).

### 2.7 Frames: what role a picture plays

| Frame | Meaning | Look |
| --- | --- | --- |
| Key | An assumption you hold | The shape alone, with its thickness, on the tray. No card, no rim, no bow. The tray icon `key.svg` is a brass cut-out piece |
| Door | The goal of this room | The `paper` panel mounted on an arched wooden door (`wood` / `wood-dark`) with a brass knob. The panel shows holes. Icon `door.svg` |
| Pair door | A pair goal | A door whose panel has two holes side by side with the raised brass bar between them (2.8). Icon `door-pair.svg` (still the old joint) |
| Split doors | A pair goal after its bar was tapped | Two smaller doors in a row with the same bar between them: door, bar, door. Each has exactly one hole (2.8) |
| Open door | A cleared goal | Door leaf swung open, warm `light` inside, green check. Icon `door-open.svg` |
| Ghost | A preview of what a drop will make | Any frame at 50% opacity inside a dashed `ok` outline |
| Tree node | A step in the replayed proof | The shape in the colour look, like a key |
| Selected key | The key chosen for tap-tap | Its tray cell turns `night-3` with a 2 px white outline |

### 2.8 The AND bar and split doors

![Stage-001: tap the bar, door, bar, door, both filled](mockups/stage-001.svg)

**Decided (11/1).** AND is **one brass horizontal bar**, and it is **identical on doors and on keys**: the same shape, thickness, length, position and hit area. Only its neighbours differ: on a door they are holes, on a key they are raised shapes. The two shapes of an AND always sit side by side, left and right, never stacked. The bar lies in the gap between them and touches both outlines. This replaces PR 6's vertical joint and the coupler with its tabs. (An upright brass bar is OR. That is decided too, but not specified in this document.)

An unsplit AND door accepts **no single key**. Tapping its bar splits it into two doors in a row, **door, bar, door**: the left door has one hole for the left part (for example the sun), the right door one hole for the right part (the moon). The player then drags each key into its hole. Used keys stay in the tray. When both holes are filled, the pair is made and the room is cleared, which clears the stage if this was the stage's door.

**Status.** Spec only. The runtime (`picture()`, `main.ts`, `door-motion.ts`, `style.css`) and the icons `conn-and.svg`, `door-pair.svg` and `rule-and-intro.svg` still draw PR 6's vertical joint, coupler and tabs. `decompose` and `fill` in `src/core.ts` already have the right logic: ∧I backwards leaves two independent subgoals, and `fill` requires that split. Section 14 gives the exact stage-001 behaviour and lists what the runtime has to change (14.9). The mockup `stage-001.svg` is the visual reference. The generated sheets `cards.svg`, `room.svg`, `paths.svg`, `stages.svg` and `snap.svg` still show the old pictures.

**The bar.** The sizes are provisional (`AND_BAR`, 14.1). `s` is the atom size of the two halves (64 on the stage-001 door). How `s` is chosen when a half is not an atom is not decided here.

| Part | Value |
| --- | --- |
| Shape | A horizontal strip with fully rounded ends |
| Gap | Along the row's centre line, the visible outlines of the two halves are `s / 2` apart, at least 14 px. The visible outline counts, not the shape's box: on the centre line the sun's ray tip is 0.23/48 of `s` inside its box, the moon's disc 7/48 of `s` |
| Length | The gap plus 2 px at each end (`overlap`), so each end lies over its neighbour's outline and no sliver of panel shows between them. The bar is drawn above the holes and shapes |
| Thickness | 18% of `s`, at least 4.5 px. Centred on the row's centre line |
| Face | `brass`, 1 px `brass-dark` edge. When the thickness is at least 9 px: two grooves at 1/3 and 2/3 of its length, across the bar, 1 px `brass-dark`, inset 2.5 px from the top and bottom edges. No grooves below 9 px (tray keys) |
| Raised | The strip in `brass-dark`, moved down 2 px, behind the face. It is raised like a key (2.5), never recessed |
| Hit target | A square of `TOUCH_TARGET_PX` (48 × 48), centred on the bar, never smaller, also for a tiny bar: on an unsplit door, and on a joined key in the tray once tapping a key's bar is built (6.4). Inside the square the bar wins over what lies under it. A bar between split doors has no hit target |
| Element | A `<button class="joint">` labelled with the formula in words, for example "split sun and moon". No visible text. Enter or Space taps it |

**The row on the door.** The visible row (left shape, gap, right shape) is centred in the panel's content box (the panel inset by 8% of its shorter side, 2.4). The bar therefore sits where the gap falls, not necessarily at the panel centre. On a key the same row is drawn in colour with the same constants. When an AND is nested inside another, the inner pair sits on a small platform instead of brackets (decided); the platform's look (open item 34), whether inner bars are flat until they become outermost (open item 4), and how pictures shrink or fold when they do not fit (open item 5) are not decided here.

**Split doors** (phone, 360 px wide):

| Part | Value |
| --- | --- |
| Leaf | 146 × 162: the runtime door leaf (10 px `wood-dark` border, arched top of radius 73, brass knob) with the panel 100 × 76 at 23 px from its left and 46 px from its top |
| Panel | One hole, drawn by `picture()` as a door of that half (an atom at 58.7 px, 96% of its 60.9 px on the unsplit door) |
| Row | Leaf, gap, leaf. The gap is the bar's on-screen length minus twice its overlap, so the bar lies 2 px over each leaf's wood border (30.4 px on stage-001, row 322.4 px). The row is centred horizontally. The leaves sit so that their panel centres are at the bar's height, which does not change. Narrower screens: leaf width = min(146, (door-area width − gap) / 2), panel scaled with it |
| Bar | The same element at the same size and height. It is the only thing between the leaves: no coupler, no tabs. During the split it glides horizontally to the row centre (8.6 px on stage-001), because on the unsplit door it sits where the visible row puts it. After the split it is not a button |
| Order | Left door = left half (`L`), right door = right half (`R`), the same order as on the key and on the unsplit door |

**Deeper pairs.** If a split door's half is itself a pair, that door shows its own bar. A row holds at most two doors on a phone. Tapping a bar whose split would make leaves narrower than 120 px zooms into that door as a room of its own (300 ms, `in-out`, path bar fork, 4.3), where it splits in place.

**States:**

| State | Look |
| --- | --- |
| Idle | As above. Nothing moves and nothing glows, also while a single key is lifted or selected: an unsplit AND door has no target for it |
| Hint | The bar wobbles once (`AND_BAR_HINT`, 14.4). Never a glow, an outline, or text |
| Pressed | On touch-down in the hit target: the face moves down 1.5 px and the thickness shrinks to 0.5 px (pushed in), over 80 ms (`out`). No rim, no light. Sliding more than 8 px off the hit target cancels: back to idle over 120 ms (`out`). Holding 450 ms without sliding turns the press into a long-press (4.4): the bar returns to idle over 120 ms, and the release does not split. Releasing before that commits (6.3) |
| Split | Door, bar, door. The bar is plain brass. Each hole glows for a held key of its shape (2.6) |
| One hole filled | That door's key is seated (2.6). The bar does not change (`AND_BAR_LIGHTS_ON` = `"all-filled"`, 14.1) |
| Both filled | The whole bar lights: its face turns `light` and a halo appears around it (the bar's outline grown by 4 px, `light` at 60% opacity, blurred by 2 px). Then the doors open |
| Cleared | Both doors open together: leaves swung open, `light` inside (6.3). The bar stays lit |

**Drops.**

- A single key fits only a hole of a **split** door. Dropped on an unsplit AND door, it flies back (5.1, 200 ms), and then the bar wobbles (14.4). No haptic: it is a plain miss (8).
- With tap-tap, tapping an unsplit AND door while a single key is selected keeps the selection, plays the soft double knock (8), and wobbles the bar instead of the shake of 5.2.
- Whether a whole joined key may go into an unsplit door is open (item 7). This spec does not change the current behaviour: the runtime accepts it as assumption use, and it seats as one piece (6.1) with its bar exactly over the door's bar, because the two bars are identical. A split door does not take a joined key.
- Tapping a split door's hole with nothing selected enters a room whose door is that half (5.4). Use this when you have no key of that shape yet.
- Undo right after a split joins the doors again: the split in reverse, 300 ms (`in-out`), the bar gliding back to its unsplit place.

## 3. Colour

The game is played at dusk: a dark indigo room, wooden doors with warm paper panels, and keys that are bright coloured shapes. Dark surroundings make the panels and the keys the brightest things on screen, so the eye goes to the shapes.

| Token | Hex | Use |
| --- | --- | --- |
| `night` | `#1C2033` | Background |
| `night-2` | `#262B42` | Key tray, buttons |
| `night-3` | `#323857` | Pressed buttons, current stage highlight, empty states |
| `ink` | `#E8E4F0` | Icons and lines on `night` |
| `ink-2` | `#9DA3C2` | Secondary icons, path links |
| `paper` | `#F7F1E6` | Door panel, if-then plate |
| `edge` | `#D9CDB8` | Door panel border |
| `hole-shadow` | `#2E261F` | Body and outline of a hole (2.5) |
| `hole` | `#5E5143` | Floor of a hole and of a pair channel inside a key |
| `lip` | `#FFFFFF` | Bright lip below a recess |
| `pocket-shadow` / `pocket` | `#A8997E` / `#DDD0B8` | Body and floor of an if-then pocket (2.5) |
| `pending` | `#CCC4B6` | Grey shapes: what you get once a hole is filled |
| `pending-edge` | `#AFA696` | Edge of grey shapes and grey plates, waiting arrow inside a grey half |
| `pending-bar` | `#C4BCAE`, edge `#A9A092` | Grey pair bar |
| `pending-plate` | `#EEE9E0` | Grey if-then plate |
| `pending-hole-shadow` / `pending-hole` / `pending-lip` | `#9D9488` / `#BBB2A4` / `#FAF8F3` | Holes inside a grey half |
| `pending-pocket-shadow` / `pending-pocket` | `#C9C1B4` / `#E3DDD2` | Pockets inside a grey half |
| `seam` | `#6B5E4B` | Arrow, folded-pane dots, formula punctuation |
| `lit` | `#B07A1A` | Arrow once its hole is filled |
| `brass` | `#D9A441` | AND bar on keys and doors (2.8), tray icon |
| `brass-dark` | `#9C7024` | Edge, grooves and thickness of AND bars, edge of if-then plates |
| `wood` | `#8C5A3C` | Door leaf |
| `wood-dark` | `#5E3B27` | Door frame, sill |
| `light` | `#FFE7A8` | Open doorway, primary "next" button, AND bar once every hole is filled (2.8) |
| `ok` | `#7CE0B5` | Valid targets, previews, success |
| `bad` | `#FF7A6B` | Rejected drop flash only (never static) |

**Scope ribbons.** Keys received from an if-intro door carry a small ribbon. The ribbon says which room they belong to (section 6.6). Ribbons use a pastel set that does not collide with the atom colours. Each ribbon also has a notch count, so it can be told apart without colour:

| Nesting | Colour | Notches |
| --- | --- | --- |
| 1st if-intro room | `#6FC7D1` teal | 1 |
| 2nd | `#F2B880` apricot | 2 |
| 3rd | `#B8A6E8` lilac | 3 |
| 4th | `#C4DB7A` lime | 4 |

## 4. Screens

All mockups use a 360 × 780 portrait viewport. Keep touch targets at least 48 × 48 and keep primary actions in the bottom half, where a thumb reaches them.

### 4.1 Stage map

![Stage map](mockups/stages.svg)

- Eight doors in a 2-column grid. Each door shows its stage's goal panel, so the map also previews what is coming.
- The stage number is shown as **pips** (1 to 8 dots, in rows of four), not numerals.
- States: cleared (green check badge, and every hole of the door shows its key seated), current (raised `night-3` panel and `ok` glow on the arch), locked (dimmed, lock badge). Stages unlock in order.
- Top right: settings (`ui-settings.svg`). Tap a door to enter its stage.
- Tap the check badge of a cleared stage to rewatch its proof tree (section 4.5). The badge has a 48 × 48 hit area, and while pressed its check turns into `ui-proof-tree.svg`.

### 4.2 Room (the play screen)

![Room screen while dragging](mockups/room.svg)

From top to bottom:

1. **Path bar** (y 24 to 88). On the left, the stage-map button (`ui-stages.svg`). Then one thumbnail chip per room on the way from the stage door to the current room (section 4.3).
2. **Door** (y 100 to 430). The current goal, large and centred. Its holes are drop targets. The bar of an unsplit AND door, the holes of split doors, and the hole of an if-then door are tap targets. After a split this area shows the row door, bar, door (2.8).
3. **Key tray** (y 448 to 708, `night-2`). Keys in a 3-column grid of 96 × 74 cells, in the order they were obtained. Each key is drawn as its bare shape at 88 × 66 (102 × 77 from 700 px wide, 80 × 60 below 380 px); the whole cell is its touch target. New keys are appended. When the tray holds more than six keys it scrolls vertically.
4. **Bottom bar** (y 718 to 766): undo (`ui-undo.svg`), restart room (`ui-reset.svg`), hint (`ui-hint.svg`), formula captions (`ui-formula.svg`).

The mockup shows stage 7 inside the if-intro room. The player is dragging the ribboned sun key over the sun-shaped hole of the sun → moon key. Only that key glows, because the moon → leaf key and the leaf door have no sun-shaped hole. The key shows the hover preview: the sun seated, the arrow lit, and the moon in colour, at 50%. A dashed line leads to a ghost moon key in the slot where it will land, marked with the if-elim icon. The ghost carries the same ribbon, because it is made from a ribboned key.

### 4.3 Path bar

![Path bar states](mockups/paths.svg)

| Chip state | Look |
| --- | --- |
| Here | Bright thumbnail inside a white outline |
| Passed through | Thumbnail dimmed 35% |
| Open sibling (from and-intro, not done yet) | Thumbnail dimmed 55%, on a branch |
| Cleared sibling | Dimmed thumbnail and green check badge |

- Chips show their room's door, so they show holes. A split pair door is one chip that shows the row (two tiny doors and the bar). Entering a half's room (tapping a split door's hole) draws a **fork**: the parent chip has two branches, one per split door. Once a half is cleared, the parent chip shows that hole with its key seated. Tap any chip of an unfinished room to go there.
- If-intro rooms show their **ribbon** on their chip. Every key in the tray that depends on that room carries the same ribbon.
- If the chips do not fit in the width, the oldest chips collapse into one stacked chip. Tapping it expands the full path as an overlay.

### 4.4 Long-press: the formula

![Long-press reveals the formula](mockups/longpress.svg)

- Hold any picture (door, key, chip, tree node) for **450 ms**. The screen dims to 70%, the held picture stays bright with a white outline, and a paper bubble above it shows the formula.
- In the formula, each atom letter uses its atom colour; connectives and brackets use `seam`. Font: JetBrains Mono Bold, 24 px.
- The bubble stays while the finger is down and disappears on release. A long-press never starts a drag: if the finger moves more than 8 px before 450 ms, it is a drag.

### 4.5 Clear and proof-tree replay

![Proof tree replay](mockups/replay.svg)

When the last door opens:

1. The door swings open, warm light fills the screen, and a success haptic plays (section 8).
2. The view zooms out. Each room the player visited shrinks into a node, and the rooms rearrange into the proof tree: conclusion at the bottom, assumptions at the top, one horizontal bar per step. This is the standard way natural deduction trees are drawn.
3. The tree then **replays**: steps appear one at a time, in the order the player made them (about 700 ms per step).

Tree details:

- Each bar has its rule icon at its right end: `rule-assume`, `rule-and-intro`, `rule-and-elim`, `rule-imp-intro`, `rule-imp-elim`.
- Assumptions are the leaves of the tree, drawn as keys (bare shapes). Assumptions discharged by an if-intro step carry that room's ribbon, and the same ribbon sits next to the if-intro bar that discharges them. This replaces the usual `[A]¹` numbering.
- Keys the player made but never used are left out of the tree.
- Controls: step back, play/pause, step forward, plus a step scrubber (one dot per step). Top left closes the screen; top right toggles formula captions under every node. The wide `light` button at the bottom goes to the next stage.

### 4.6 Settings

Settings is the only screen that may use words, because it is reached rarely and must be unambiguous. Its options:

- Formula captions always on (also toggled with `ui-formula.svg`), for teachers and for checking your understanding.
- Left-handed tray (mirrors the bottom bar).
- Haptics on or off.
- Reduced motion (also follows the OS setting).

## 5. Gestures

| Gesture | On | Result |
| --- | --- | --- |
| Drag | Key → door it fits: any key into the hole of its own outline (an atom into its silhouette, a joined key into an unsplit AND door, its bar over the door's bar (open item 7), an if-then key into the pocket of its plate) | Assumption use |
| Tap | Brass bar of an unsplit AND door | And-intro: the door splits into door, bar, door (2.8) |
| Drag | Key → the hole of a split door | That half is filled (assumption use in that half) |
| Drag | Key A → hole of an if-then key A → B | If-elim: new key B |
| Drag | Pair key A ∧ B → empty tray slot | And-elim: new keys A and B |
| Tap | The hole of a split door | Enter a room whose door is that half |
| Tap | If-then door A → B | If-intro: borrow key A, enter a room with door B |
| Double tap | If-then key A → B | Enter a room whose door is A, to make the key its hole wants |
| Tap, then tap | Key, then target | Same as dragging that key to that target |
| Long-press | Any picture | Show formula (section 4.4) |
| Tap | Path chip | Go to that room |

### 5.1 Drag

- **Pick up:** touch a key and move it more than 8 px. The copy lifts (scaled to 80%, rotated −5°, with the shadow of its own outline as in 6.1) and follows the finger, offset upward so the finger never hides the picture. The original stays in its slot at 30% opacity.
- **Valid targets glow** as soon as the key is lifted: the target gets a 3 px `ok` outline, and the hole the key fits gets its pulsing halo (2.6). On split doors, only the hole of the held key's shape glows. An unsplit AND door does not react at all, and its bar does not glow (2.8). Invalid targets do not react. The player sees all their options before moving.
- **Hover:** when the dragged key's centre enters a valid target, the target scales to 104%, a light haptic tick plays, and the **drop-point preview** appears (section 5.3).
- **Drop on a valid target:** the action happens, and the copy flies into the target.
- **Drop elsewhere:** the copy flies back to its slot (200 ms ease-out). There is no penalty and no message.

### 5.2 Tap-tap

For one-handed play, accessibility, and players who find dragging hard:

1. Tap a key: it gets a white selection outline, and the valid targets glow exactly as during a drag. The drop-point previews are shown for **all** valid targets at once.
2. Tap a glowing target to commit. Tap the selected key again, or empty space, to cancel.

With nothing selected, tapping a door's hole means intro (section 5.4). With a key selected, tapping a door means "drop into the hole this key fits". Tapping an invalid target while a key is selected does a short shake, and the selection stays. On an unsplit AND door the bar wobbles instead of the shake (2.8).

### 5.3 Drop-point preview

| Target | Preview while hovering |
| --- | --- |
| Door hole of the same shape | The key drawn seated in the hole at 50%; a thin line of `light` shows at the door's edge if this fills the door |
| Hole of an if-then key | The filled picture at 50% over the key (key seated, arrow lit, result in colour), a ghost of the new key in the slot where it will land, a dashed `ok` line to it, and the if-elim icon |
| Empty slot (pair key) | Ghosts of both halves in the next two free slots, with the and-elim icon |

If the result is a key that is already in the tray, the preview highlights the existing key instead of drawing a ghost. Dropping then just pulses that key; no duplicate is added.

### 5.4 Tapping a door (introduction)

- Press-and-hold feedback: on touch-down, the bar of an unsplit AND door shows its pressed state (2.8), the hole of a split door gets a 2 px `light` rim, or the hole on an if-then door's pocket floor gets the same rim. Releasing commits. Sliding off cancels.
- An atom door has no intro. Tapping it does a small wiggle, and the tray gently pulses to point at the keys.

### 5.5 Undo and restart

- Undo reverts the last action, including a room clear. Repeated undo walks back to the stage start.
- Restart room (`ui-reset.svg`) undoes every action since you entered the current room. Long-press it to restart the whole stage.

## 6. What each move looks like

Times are in milliseconds from the moment the finger lifts. Every step uses one of the four named curves in section 8 (`fly`, `out`, `in-out`, `linear`); a step with no curve named uses `out`. Steps in one table never overlap unless a row says "at the same time". The short **beats** (60 ms with nothing moving) are part of the timing, not slack.

Every scale obeys section 8: arrivals approach their final size from one side and stop; only an emphasis pulse may go past its resting size, by at most 4%, once.

### 6.1 The seat: a key goes into its hole

Every time a key goes into a hole (a door hole, a half of a pair door, the hole of an if-then key, an if-then pocket) it makes the same motion. Because the key and the hole share one outline, the motion is designed to show that the outlines coincide.

| Time (ms) | Phase | What moves |
| --- | --- | --- |
| 0 to 220 | **Fly** | The dragged copy flies to the hole's centre (`fly`), rotation −5° → 0°, until its face is **104% of the seated size**. The thickness and halo fade out over 0 to 160 (`linear`), so only the coloured face arrives |
| 220 to 340 | **Key settles** | The face shrinks 104% → 100% of the seated size and moves down by the hole's depth `d` (2.5), sinking flush (`out`). Medium haptic at 220, the moment of contact. At 340 the copy is removed and the picture is redrawn seated, with identical pixels |

Implementation notes:

- The pose and size come from the target's `.cut[data-path="…"]` (2.6), without its `.glow` children. The seated size is 100% of the hole (2.6); the static seated face supplies the arrival geometry.
- A pair key going into a pair hole, and an if-then key going into a pocket, seat as one piece with the same timings.
- A key never moves towards a hole of another outline: such holes do not glow, and a drop there flies the copy back to its slot (200 ms ease-out, section 5.1). The player learns the fit from the outlines, not from an error.

The result of an if-then gains its thickness during delivery (6.2). A borrowed key rises directly into the tray (6.6), without an overshoot or an extra lift beat.

### 6.2 Fitting a key into an if-then key (if-elim)

The runtime motion is `fitMotion()` in `src/motion.ts`, which follows the table below.

The player drops key A on an if-then key A → B.

| Time (ms) | What moves |
| --- | --- |
| 0 to 340 | Fly and Key settles (6.1). Afterwards the key shows `filled: ["S"]` |
| 340 to 400 | Beat: nothing moves |
| 400 to 620 | **Arrow lights**: a `lit` copy of `.arrow` (stroke × 1.25), with `pathLength="1"`, `stroke-dasharray: 1`, `stroke-dashoffset` 1 → 0, drawn tail to head (`in-out`) |
| 620 to 680 | Beat: nothing moves |
| 680 to 920 | **Result fills with colour**: the coloured `.result` from `filled: [""]` fades in over the grey one, opacity 0 → 1 (`out`). Nothing changes size |
| 920 to 1160 | **Result is obtained**: redraw `filled: [""]`. The `.result` pulses 1 → 1.04 → 1, peak at 1040 (`in-out`). Light haptic at 920. A four-point `light` sparkle at its top right grows 0 → 1 over 920 to 1040 (`out`) and fades over 1040 to 1160 (`linear`) |
| 1160 to 1460 | **Delivered**: a coloured result copy moves to its tray slot (`in-out`), scaling to the tray key size. Its thickness fades in over 1340 to 1460 (`out`). At the same time, over 1160 to 1360, the if-then key cross-fades back to its empty state (`out`), because keys are never used up |

Total: 1460 ms. If key B is already in the tray, the Delivered copy moves to that key and disappears into it. That key then pulses 1 → 1.04 → 1 over 1460 to 1700 (`in-out`); no duplicate is added. Both input keys stay.

**Input during the animation.** The state changes at 0; the animation only shows it. A new touch anywhere jumps every running animation to its end state at once, and the touch is then handled as normal. Undo works the same way.

### 6.3 Splitting and filling an AND door (and-intro)

![Stage-001: tap the bar, door, bar, door, both filled](mockups/stage-001.svg)

Status: spec (2.8). The runtime still plays PR 6's seam, joint shortening and tab lights. Pair-door presentation lives in `src/door-motion.ts`, separately from the proof transitions in `src/core.ts`. `fitMotion()` in `src/motion.ts` remains the if-then-key and if-intro presentation.

**Split** (the player releases on the bar, 2.8):

| Time (ms) | What moves |
| --- | --- |
| 0 | Medium haptic: the split is committed |
| 0 to 120 | **Up**: the bar comes back up from pressed to idle (`out`). Nothing lights |
| 120 to 180 | Beat: nothing moves |
| 180 to 480 | **Apart**: the panel parts at the bar into two pieces, each carrying its hole. They slide outward to the split panels and shrink to the split panel size, so the holes go 100% → 96% (`in-out`). The unsplit leaf fades out over 180 to 380 (`linear`) and the two split leaves fade in over 280 to 480 (`out`). At the same time the bar glides to the row centre (`in-out`), keeping its size and height. Nothing overshoots |
| 480 | Redraw the row door, bar, door. The board is calm |

**First hole:** Fly and Key settles into that split door (6.1), 0 to 340, medium haptic at 220. The action ends at 340. The bar and the other door stay as they were (`AND_BAR_LIGHTS_ON`, 14.1).

**Last hole:**

| Time (ms) | What moves |
| --- | --- |
| 0 to 340 | Fly and Key settles. Medium haptic at 220 |
| 340 to 400 | Beat: nothing moves |
| 400 to 620 | **Bar lights**: the bar's face cross-fades from `brass` to `light` and its halo (2.8) fades in, opacity 0 → 1 (`in-out`) |
| 620 to 860 | **Pair made**: the whole bar pulses 1 → 1.04 → 1 about its centre, peak at 740 (`in-out`). Medium haptic at 620 |
| 860 to 920 | Beat: nothing moves |
| 920 to 1320 | **Cleared**: both doors swing open together (`in-out`), and `light` fills their doorways over 1020 to 1320 (`out`). The bar stays lit. Success haptic at 1320 if this clears the stage; otherwise go on as in 6.5 |

Total: 1320 ms, within the 1.7 s limit (8).

**A half the player cannot fill directly:** tapping that split door's hole zooms into it (300 ms, `in-out`), and the room's door becomes that half. The path bar forks. On clearing that room, zoom back out (300 ms, `in-out`), then after a 60 ms beat the made shape fades in at 104% of the seated size and settles as in 6.1 (120 ms, `out`, medium haptic). If that was the last hole, the steps from the beat at 340 above follow.

**A whole joined key** on an unsplit door (open item 7, 2.8): it seats as one piece (6.1), its bar exactly over the door's bar, then the door opens as in 6.5.

### 6.4 Snapping a pair key (and-elim)

![And-elim storyboard](mockups/snap.svg)

| Time (ms) | What moves |
| --- | --- |
| 0 to 150 | The dragged pair key flies onto the empty slot |
| 150 to 250 | The bar snaps in the middle: a white sparkle at the break, and the two shapes, each keeping a stub of the bar, tilt ±12° and move 4 px apart |
| 250 to 550 | The stubs fade out (100 ms) and the two shapes fly to the next two free slots, each scaling to the tray key size |

The pair key stays in its slot.

**Status.** Decided (11/1): the empty slot goes away, and a joined key is split by tapping its own bar in the tray. The motion for that is not specified yet, so the table above stays the runtime behaviour. Until the tap is built, the slot is shown only while the tray holds a joined key (14.8).

### 6.5 Opening a door (assumption use)

Fly and Key settles as in 6.1 (0 to 340), then a 60 ms beat. The door swings open over 400 to 800 (`in-out`) and light spills out: the `light` glow behind the leaf fades in over 500 to 800 (`out`). The success haptic plays at 800 if this clears the stage. The room is cleared: go to the next open sibling room on the path, or up to the parent. Clearing the stage's own door clears the stage.

### 6.6 Going through an if-then door (if-intro)

![If-intro storyboard](mockups/intro.svg)

| Time (ms) | What moves |
| --- | --- |
| 0 to 300 | The hole hands out a **borrowed key**: a key of its shape rises out of the hole (scale 0.6 → 1) and flies into the tray. A new ribbon wipes onto it (150 ms). The hole shows that key seated |
| 300 to 600 | The camera zooms into the grey half until it fills the door panel (ease-in-out). On the way the grey shape cross-fades into a hole of the same outline: the thing you will get becomes the thing you must make. This is the new room's door. The path adds a ribboned chip |
| On clearing that room | Zoom back out (300 ms, `in-out`). Then the Arrow lights, Result fills with colour, and Result is obtained steps of 6.2 run with their beats (a 60 ms beat, 220, 60, 240, 240 ms), then after a 60 ms beat the door opens as in 6.5 |

**Scope.** A tray belongs to a room. Child rooms start with a copy of their parent's tray. Keys made in a room never flow back to the parent. A key made from ribboned keys carries all of their ribbons. When an if-intro room is cleared, its ribboned keys dissolve from view (scale to 0 with a sparkle, 250 ms), which shows that the borrowed key is given back.

### 6.7 Reduced motion

Flights and camera moves become 150 ms cross-fades (`linear`). Seating, the arrow, the colour fill, and the pair bar appear together in one 150 ms cross-fade from the empty to the filled picture. Nothing changes size: pulses, the settle, and the bar growth are dropped. Haptics stay.

For AND doors (6.3): the split is one 150 ms cross-fade from the unsplit door to the row door, bar, door; the slide and the bar's glide are dropped. The bar lighting is a 150 ms cross-fade; its pulse is dropped; the doors opening is a 150 ms cross-fade to the open doors. The bar's pressed state still moves its face 1.5 px (nothing changes size). The hint wobble is off (14.4).

## 7. Feedback without words

### 7.1 Hints

The hint button never shows text. One press pulses the key and the target of a useful next move together, for 2 s. Three hints in the same room show a ghost hand performing the move, using `gesture-drag.svg` or `gesture-tap.svg`. Exception: while an AND door is unsplit, the hint button only wobbles its bar (14.4).

### 7.2 Tutorials

Stages 1 to 6 each introduce exactly one new move. On first entry, a ghost hand performs that move once. Afterwards the hand loops every 6 s until the player touches anything. Tutorials are never blocking. Stage-001 has no hand: its tutorial is the bar's idle wobble (14.4).

### 7.3 Formula captions

`ui-formula.svg` in the bottom bar toggles a small formula caption under every picture on screen. It is off by default. While it is on, the button stays in its pressed state (`night-3`).

## 8. Motion and haptics

- Curves: `fly` = `cubic-bezier(.2, .8, .2, 1)`; `out` = `cubic-bezier(.22, 1, .36, 1)`; `in-out` = `cubic-bezier(.65, 0, .35, 1)`; `linear` = `linear`. None overshoots.
- Arrivals never pass their final size. Only an emphasis pulse may pass its resting size: 1 → 1.04 → 1 once, peak at the middle. Hover at 104% is a held state. Looping signals change opacity or outline, never scale. The one moving signal is the AND bar's hint wobble (14.4): a single 280 ms rotation, never a scale, at most every 6 s while the room is untouched, and off with reduced motion.
- Durations: a step lasts 120 to 300 ms, separated by 60 ms beats. No action takes longer than 1.7 s before the board is calm again.
- Haptics: light tick (valid target entered), medium (action committed), success pattern (stage cleared), soft double knock (invalid tap while a key is selected). Never vibrate on a plain miss.
- Reduced motion: see 6.7. The tree replay shows the complete tree at once.

## 9. Accessibility

- Atoms differ by silhouette, ribbons differ by notch count, and valid targets get an outline, not just a colour change. Every state can be read without colour vision: a hole differs from a held shape by its recess (dark rim and lip) against the key's thickness (dark band below), and grey differs from colour by lightness as well as hue, and by having no thickness.
- Every key, door, and node has an accessible label with its formula, read in words ("if sun then moon"). Screen-reader users play with tap-tap.
- Touch targets are at least 48 × 48 (`TOUCH_TARGET_PX`, 14.1). The AND bar's target is a 48 × 48 square however small the bar is drawn.
- Contrast: in the formula bubble, every colour on `paper` is at least 3.1:1 (sun is the lowest at 3.13, `seam` is 5.6), which meets WCAG AA for large text (the bubble uses 24 px bold). `ink` on `night` is 12.9:1, and `ink-2` on `night` is 6.5:1.

## 10. Proposed stages

The stage list belongs to level design. This proposal shows that the visual system covers it: each stage introduces at most one new move, and the atoms appear in their table order.

| # | Keys | Door | New move |
| --- | --- | --- | --- |
| 1 | P, Q | P | Assumption use |
| 2 | P, Q | P ∧ Q | And-intro (tap the bar, fill both doors) |
| 3 | P ∧ Q | Q | And-elim |
| 4 | P ∧ Q | Q ∧ P | (combine) |
| 5 | P → Q, P | Q | If-elim |
| 6 | Q | P → P | If-intro, ribbons |
| 7 | P → Q, Q → R | P → R | (combine) |
| 8 | P → (Q → R) | (P ∧ Q) → R | (all five) |

## 11. Asset inventory

All icons live in `src/assets/icons/`. Every file has a `<title>` for accessibility.

| Group | Grid | Colour | Files |
| --- | --- | --- | --- |
| Atoms | 48 | Fixed (section 2.1) | `atom-sun`, `atom-moon`, `atom-leaf`, `atom-star` |
| Connectives | 48 | `currentColor` | `conn-and`, `conn-imp` |
| Game objects | 48 | Fixed (brass, wood, paper) | `key` (a brass cut-out piece, not any atom), `door`, `door-pair`, `door-open` |
| Rules | 24 | `currentColor` | `rule-assume`, `rule-and-intro`, `rule-and-elim`, `rule-imp-intro`, `rule-imp-elim` |
| UI | 24 | `currentColor` | `ui-undo`, `ui-reset`, `ui-stages`, `ui-hint`, `ui-formula`, `ui-proof-tree`, `ui-play`, `ui-pause`, `ui-step-forward`, `ui-step-back`, `ui-check`, `ui-close`, `ui-lock`, `ui-settings` |
| Gesture ghosts | 24 | `currentColor` | `gesture-tap`, `gesture-hold`, `gesture-drag` |

Conventions for `currentColor` icons: stroke width 2 on the 24 grid (2.5 on the 48 grid), round caps and joins, no fills except for small solid accents.

The SVGs in `docs/mockups/` are illustrations for this document, built from the same icons and from `picture()` itself. They are not runtime assets. `stage-001.svg` composes `picture()`'s holes and keys with the AND bar of 2.8, which `picture()` does not draw yet.

`conn-and`, `door-pair` and `rule-and-intro` still show the old AND (a bar behind the shapes, or PR 6's vertical joint) and have to be redrawn with the horizontal bar of 2.8.

The connective icons follow the three looks in one colour: a hole is an outline with a thick inner rim at the top, a held shape is solid, and a grey shape is solid at 35% opacity. The atom icons are drawn like keys: the face over its thickness (the outline in the edge colour, 2.6 units down), at 92% of the grid.

## 12. Proposal: splitting other goals

The original Proof Dungeon takes a goal apart one connective at a time: each introduction rule turns the goal into simpler goals, until assumptions close them. Keys & Doors follows the same flow. **Every introduction is a tap on the door** (principle 4), and each connective gets its own affordance on the door that is not a hole, so it can never be mistaken for a place to drop a key. The AND bar is the first of these. The table proposes the rest.

| Goal | Rule | On the door | Simple enough now? | Status |
| --- | --- | --- | --- | --- |
| A ∧ B | ∧I: prove A, prove B | The brass horizontal bar between the halves (decided 11/1, replacing PR 6's vertical joint). Tap: door, bar, door, one hole each (2.8, 6.3, 14) | Yes. `decompose` in `src/core.ts` opens one room per half for ∧I; `fill` requires this decomposition | **Implemented** with the vertical joint; the bar is spec (14.9) |
| A → B | →I: assume A as a new key, prove B | Already in the game: tap the if-then door, borrow key A (with a ribbon), and the door becomes B (6.6). Later the pocket's arrow could become a brass hinge too, so all intro taps look alike | Already implemented, no change needed | Unchanged |
| A ∨ B | ∨I: choose which side to prove | *Superseded on 11/1: OR is an upright brass bar between the halves, touching neither; this row's fork is no longer the plan.* A brass **fork** (Y) between the halves instead of a strip. Tap: two doors with the fork between them, both lit as choices. Tapping one door chooses it; the other dims to 35% and slides out, and undo brings it back. Then fill the chosen door | No. Needs ∨ in the core and in `picture()` (or keys too), and almost every or stage (layer 3) also needs ∨E, a case split into two rooms, on the key side. ∨I alone makes only stage 3-1 playable. Do ∨I and ∨E together | Proposal |
| ¬A, that is A → ⊥ | ¬I: assume A, prove ⊥ | The if-then door with the cracked token (section 13) as its grey half: borrow A, the door becomes a cracked-token hole | Small once ⊥ exists, because it is →I. But it needs the ⊥ picture first, and its stages (layer 4) also need ⊥E | Proposal |
| ⊥ | No intro rule | A cracked-token hole, no joint. Filled only by a cracked key, which you make by fitting key A into key ¬A (→E, already in the game) | Comes with ⊥ | Proposal |
| Any A, classically | RAA: assume ¬A, prove ⊥ | A small brass lever on the door frame, shown only from layer 5. Pull: borrow key ¬A (ribboned), the door becomes ⊥ | No. Classical only, and it needs an affordance that does not tempt players in the earlier, intuitionistic layers | Proposal |
| Any goal from ⊥ | ⊥E: a cracked key fits any hole | Not a door affordance: a cracked key glows on every hole | Comes with ⊥ | Proposal |
| ∀x. φ, ∃x. φ | ∀I (fresh variable), ∃I (choose a witness) | Not designed yet | No. First-order logic is out of the current scope | Out of scope |

Suggested order after AND: ∨I with ∨E (layer 3), then ⊥, ¬ and ⊥E (layer 4), then RAA (layer 5).

## 13. Reserved for later

These are not part of the current scope. They are listed so that new pictures do not collide with the current ones. The arrow, the horizontal brass bar (AND, on keys and doors), and the hugging plate are taken, and an upright brass bar is decided for OR (11/1):

- **Or (∨):** decided on 11/1: an **upright** brass bar between two shapes side by side, touching neither, the same on keys and doors. Its behaviour is not specified in this document. The fork is no longer reserved.
- **Falsum (⊥):** a **cracked** blank token: a disc with a jagged crack through it.
- **Not (¬A):** drawn as A → ⊥, an if-then whose grey half is the cracked token, so it needs no picture of its own.

## 14. Stage-001: the first AND door

![Stage-001: the room opens, the hint wobble, door, bar, door, both filled. Below: the wobble keyframes and the timings](mockups/stage-001.svg)

`stage-001` in `src/stages/layer-01.json`: the door is `P ∧ Q`, the keys are `P` and `Q`. P is the sun, Q is the moon (2.1). The new move is and-intro: tap the bar, then fill both doors by assumption use. The player needs nothing else, and there is no joined key in this stage.

This section is the exact spec for this one stage. It applies the general rules of 2.8 and 6.3 and fixes every value the stage needs. Values marked provisional are each one named constant (14.1), so they can be changed in one place. Nothing here changes other stages; 14.10 lists the ones that will look different because the bar is horizontal now.

### 14.1 Provisional constants

| Constant | Value | Controls | Open item |
| --- | --- | --- | --- |
| `TOUCH_TARGET_PX` | `48` | The bar's hit target (a 48 × 48 square centred on the bar) and the smallest touch target of a key. A tray key's target stays its whole cell, which is larger | 1 |
| `AND_BAR_HINT` | `{ firstMs: 2500, repeatMs: 6000, durationMs: 280, angleDeg: 6 }` | The hint wobble (14.4) | - |
| `LONG_PRESS_PICTURES` | `false` | A long-press shows the formula only, no small pictures (14.5) | 31 |
| `AND_BAR_LIGHTS_ON` | `"all-filled"` | The bar stays plain brass until every hole of its doors is filled. Then the whole bar lights and the doors open | 32 |
| `AND_BAR` | `{ thickness: 0.18, minThickness: 4.5, gap: 0.5, minGap: 14, overlap: 2, groovesFrom: 9 }` | The bar's size relative to the atom size `s` (2.8). These are the approved proposal's numbers, kept provisional | sizes not decided |

### 14.2 The screen at rest

Phone, 360 × 780 CSS px. All values in CSS px unless "picture units" is said. The layout is the runtime room (4.2) unchanged, except for the door's picture and the tray's empty slot. No word, letter or number appears.

| Part | Value |
| --- | --- |
| Path bar | Stage-map button 48 × 48 at (12, 20). One chip 62 × 52 at (75, 18), state "here" (white 2 px outline), showing the unsplit door's panel at 43 px wide, with its bar |
| Door | The runtime leaf, unchanged: frame 238 × 286 at (61, 128.5), leaf 222 × 270 at (69, 136.5), brass knob at (266.5, 366) |
| Panel | The door picture, 184 × 137 picture units (2.4), drawn at 175 × 130 at (92.5, 213.5), so 1 picture unit = 0.951 px. Its content box is the panel inset by 10.96 (8% of 137) |
| Holes | Atom size `s` = 64 picture units (60.9 px). Sun hole box x 21.3 to 85.3, moon hole box x 107.7 to 171.7, both y 36.5 to 100.5 (picture units). The visible row, from the sun's left ray tip to the moon's right edge, is 140.7 wide and centred: x 21.6 to 162.4 |
| Gap | x 85.0 to 117.0 (32 = `s / 2`), from the sun's right ray tip to the moon's left edge, on the centre line y 68.5 |
| Bar | x 83.0 to 119.0, y 62.74 to 74.26 (36 × 11.52 picture units, rounded ends). Centre (101.0, 68.5), on screen (188.6, 278.6). On screen 34.2 × 11.0 px. Grooves at x 95.0 and 107.0. Raised: thickness 2 px below the face |
| Bar hit target | 48 × 48 px, x 164.6 to 212.6, y 254.6 to 302.6. It covers the tip of the sun's right ray and the left edge of the moon; there the bar wins |
| Tray | x 12 to 348, y 467 to 692, `night-2`. Key icon and one pip (stage 1) in its top line. Sun key 80 × 60 at (40.3, 530), moon key 80 × 60 at (143, 530), in the order of the stage's keys. Each key's touch target is its whole cell. **No empty slot** (14.8) |
| Bottom bar | Undo, restart room, hint, formula captions: 56 × 52 at x 20, 108, 196, 284, y 704. Undo is disabled (35% opacity) until the first action |
| Nothing glows | No halo, outline or glow anywhere at rest. No ghost hand: the stage-001 tutorial is the hint wobble (14.4), not the hand of 7.2 |

The approved full-screen picture draws the door wider and flatter than the runtime leaf. That is illustration scale; the frame sizes above are the runtime's, which this spec does not change.

### 14.3 What the player does

1. **The room opens.** The board is calm as in 14.2. The idle timer of the hint starts (14.4).
2. **Tap the bar.** Touch-down shows the pressed state, release splits the door (6.3, 480 ms): door, bar, door. The left door has the sun hole, the right door the moon hole. The bar glides 8.6 px to x 180 and stays at y 278.6. Split leaves: x 18.8 to 164.8 and 195.2 to 341.2, y 194.6 to 356.6, panels 100 × 76 at (41.8, 240.6) and (218.2, 240.6). The path bar shows the split chip (the two tiny doors with the bar between them) and one dimmed chip per half (4.3).
3. **Drag each key into its hole**, in either order. Lifting the sun key dims its tray original to 30% and makes the left door's sun hole glow (halo, 2.6) and the left door get its 3 px `ok` outline (5.1). Nothing else glows; the bar does not. The key seats as in 6.1, and the tray original returns to full opacity: used keys stay in the tray. Tap-tap works the same way (5.2).
4. **The first hole is filled.** Only that door changes. The bar stays plain brass.
5. **The second hole is filled.** The whole bar lights, pulses once, and both doors open together (6.3, 1320 ms). Success haptic. The stage is cleared, and the proof-tree replay follows (4.5).

### 14.4 The hint wobble

The only hint for the bar is a small wobble of the bar itself: no text, no glow, no ghost hand, no haptic.

**Motion** (`AND_BAR_HINT`): the bar, face and thickness together, rotates about its centre through 0° → −6° → +6° → −3° → 0°, with the keyframes at 0, 70, 140, 210 and 280 ms, each segment `in-out`. On stage-001 the bar's ends move at most 1.8 px up or down. The hit target does not move. Nothing changes size, so the wobble obeys section 8: one 280 ms step, no scale, no loop of its own.

**When it plays.** Only while the door is unsplit:

- **Idle:** 2500 ms (`firstMs`) after the room opens, if nothing has been touched since. The room opens when its screen is calm after the entry transition. Then again every 6000 ms (`repeatMs`) from the start of the previous wobble, until the first touch. The first touch anywhere (door, tray, path bar, buttons) ends the idle wobbles for this visit to the room; they do not come back after an undo.
- **A single key dropped on the unsplit door:** the key flies back (200 ms, 5.1), and the wobble starts when it lands, at 200 ms.
- **Tap-tap onto the unsplit door** with a single key selected: the wobble starts at once, together with the soft double knock (2.8).
- **A tap on the unsplit door outside the bar's hit target** with nothing selected: the wobble starts at once.
- **The hint button** (7.1), while the door is unsplit: it plays the wobble and nothing else, every time it is pressed. After the split, the hint button works as in 7.1.

A trigger that comes while a wobble is running is ignored. A touch on the bar during a wobble ends the wobble at once (the bar jumps to rest) and is handled as normal (6.2, input during animation).

**Reduced motion:** the wobble is off. The idle wobbles do not play, and the other triggers play nothing in its place.

### 14.5 Long-press

Holding any picture for 450 ms shows the formula bubble of 4.4, with the formula only (`LONG_PRESS_PICTURES` = `false`): on the unsplit door, on the bar, or on the split row, `P ∧ Q`; on a split door, `P` or `Q`; on a key, its formula. A long-press that starts on the bar shows the pressed state first and returns the bar to idle at 450 ms; releasing does not split.

### 14.6 Timings

| Action | Total | Steps |
| --- | --- | --- |
| Press | 80 ms | Face down 1.5 px, thickness 2 → 0.5 px (`out`) |
| Split | 480 ms | Up 0 to 120, beat, Apart 180 to 480 (the bar glides 8.6 px) (6.3) |
| First hole | 340 ms | Fly and Key settles (6.1) |
| Last hole | 1320 ms | Seat 0 to 340, beat, bar lights 400 to 620, pulse 620 to 860, beat, doors open 920 to 1320 (6.3) |
| Miss drop | 480 ms | Fly back 0 to 200, wobble 200 to 480 |
| Undo after the split | 300 ms | The split in reverse (`in-out`) |

Haptics: medium when the split commits (0) and when each key touches its hole (220), medium at "Pair made" (620), success when the doors are open (1320). The miss drop has none. Tap-tap onto the unsplit door has the soft double knock.

### 14.7 Reduced motion

As 6.7: the press still moves the face 1.5 px. The split, each seat, the bar lighting and the doors opening are each one 150 ms cross-fade (`linear`). The bar's glide and pulse are dropped. The wobble is off (14.4). Haptics stay.

### 14.8 The tray's empty slot

Decided (11/1): the dashed empty slot next to the tray goes away, and a joined key will be split by tapping its own bar in the tray (6.4). Stage-001 has no joined key, so the slot can never do anything here. The simple, safe step for now: **the slot is shown only while the tray holds a joined key.** In stage-001 it is never shown. Stages that do have a joined key (stage-002 on) keep the slot until tapping a key's bar is built, because without one of the two they could not be cleared.

### 14.9 What the runtime has to change

The current runtime (after PR 6) differs from this spec as follows:

| Now | Then |
| --- | --- |
| A vertical joint, 14 px wide, as long as the pair's box | The horizontal bar of 2.8 and 14.2 |
| The two holes laid out as halves of the box | The visible row centred, with the gap `s / 2` between the visible outlines |
| A joint hit target 48 × the joint's length | `TOUCH_TARGET_PX` square centred on the bar |
| The joint gets a pulsing `light` outline while a matching key is lifted, and a `light` rim when pressed | No glow or rim before every hole is filled |
| On stage entry a ghost hand and a highlight on the joint; the hint button highlights it too | The wobble (14.4) |
| A missed single key makes the joint pulse 1 → 1.04 → 1 | The key flies back, then the bar wobbles |
| Split: a `light` seam, the joint shortens to 0.53, two tabs grow, a 36 px coupler | No seam. The bar stays the same size and glides to the row centre. No coupler, no tabs. The leaf gap is the bar's length minus twice its overlap |
| A tab lights when one hole is filled; the coupler lights and pulses when both are | Nothing when one is filled; the whole bar lights and pulses when both are |
| The empty slot is always shown | Shown only while the tray holds a joined key (14.8) |
| The chip of the split door shows a vertical link | The bar between the two tiny doors |

### 14.10 Other stages that will look different

Because AND is now always a horizontal bar between two shapes side by side, every picture with ∧ changes. Their own designs are not part of this section.

Playable now (layers 1 and 2):

- **stage-002** (`Q ∧ P` from `P ∧ Q`): the door gets the bar. The joined key in the tray gets the same bar: it lies in the gap and touches both shapes, instead of running behind them from centre to centre, and the shapes move to the `s / 2` gap.
- **stage-003** (`P → (P ∧ Q)` from `Q`): the grey `P ∧ Q` on the if-then door is stacked today, because a pair splits along the longer side of its box. It becomes side by side with a horizontal bar, so it gets smaller. The room behind the if-then door has an AND door like stage-001.
- **stage-004** (`(P ∧ (Q ∧ R)) → ((P ∧ Q) ∧ R)`): nested ANDs alternate between side by side and stacked today. They all go side by side, with the inner pair on a small platform; its look is open (item 34), and so are the inner bars (item 4) and the long borrowed key (item 5).
- **stage-007** (`(P → P) ∧ (Q → (P → Q))`): the bar sits between the two if-then pockets instead of the vertical joint.

Later layers (not playable yet; their connectives are designed elsewhere): stage-014, 026, 029, 030, 035, 037, 043 to 047, 052, 061, 062, 083 to 085, 103 to 107 and 114 to 116 contain ∧ and will draw it with this bar.

Assets with the old AND picture: the icons `conn-and.svg`, `door-pair.svg` and `rule-and-intro.svg`, and the mockups `cards.svg`, `room.svg`, `paths.svg`, `stages.svg` and `snap.svg`.

### 14.11 Open items this stage touches

Not decided here; the provisional constants above stand in until they are.

- 1 (touch area): provisional `TOUCH_TARGET_PX` = 48.
- 31 (pictures in the long-press bubble): provisional formula only.
- 32 (the bar after one hole): provisional, the bar does not light until both are filled.
- 2 (the order shapes are dealt in): no effect on this stage; P is the sun and Q the moon either way.
- 7 (a whole joined key into an unsplit door): stage-001 has no joined key; the current behaviour stays.
- 28 (how to describe brass in words): no effect on the pictures.
