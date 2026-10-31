# Keys & Doors: visual and interaction design

Keys & Doors turns natural deduction into a maze. Every room has one door (the goal) and a tray of keys (the assumptions you hold). You open the door by bringing it a key with the same picture. This document fixes how that looks and feels on a phone.

Scope: propositional logic with the five moves below, eight stages.

| Logic | In the game |
| --- | --- |
| Assumption use | Drop a key on the door with the same picture |
| And-intro (∧I) | Tap a double door: it splits into two doors |
| And-elim (∧E) | Drop a key ring on an empty slot: it yields both of its keys |
| If-intro (→I) | Tap a socket door: you step inside and receive its key |
| If-elim (→E) | Drop a key into the socket of a socket key: it yields a new key |

## 1. Principles

1. **Pictures, not formulas.** No formula, letter, or word appears in normal play. A formula appears only while you long-press something (section 7.3).
2. **Keys go forward, doors go backward.** Elimination rules act on keys (what you have) and make more keys. Introduction rules act on the door (what you need) and make simpler doors. Play ends when a key and a door meet with the same picture. A player never has to learn which rule applies: the object they touch decides it.
3. **One picture per proposition, everywhere.** A proposition always draws as the same *picture card*. Only the frame around the card says what role it plays (key, door, ghost, tree node). Matching is always "same picture".
4. **One room per screen.** The phone shows exactly one open goal at a time. The path bar at the top shows where that room sits.
5. **Every drop is previewed.** While you hold a key over a target, the result is drawn as a ghost before you let go. A drop never does anything the preview did not show.
6. **Nothing is used up.** Keys are assumptions and stay in the tray after use. Dragging a key moves a copy; the original stays in its slot, dimmed.

## 2. Picture cards

![Picture card sheet](mockups/cards.svg)

### 2.1 Atoms

Each atom has a fixed colour **and** a fixed silhouette, so the four atoms stay distinct without colour vision. The order below is also the order in which stages introduce them.

| Atom | Picture | Fill | Outline | Icon |
| --- | --- | --- | --- | --- |
| P | Sun | `#E0631F` | `#A8410C` | `atom-sun.svg` |
| Q | Moon | `#2F6FD0` | `#1E4C96` | `atom-moon.svg` |
| R | Leaf | `#1E9A6C` | `#0F6A48` | `atom-leaf.svg` |
| S | Star | `#C2509E` | `#8A2F6E` | `atom-star.svg` |

The silhouettes differ in kind (round with rays, crescent, pointed oval, five points), not just in size. Each one is still recognisable at 10 px.

### 2.2 Connectives

Compound cards are built by splitting a card into two panes. The seam between the panes is the connective.

| Connective | Name in game | Picture | Icon |
| --- | --- | --- | --- |
| A ∧ B | Pair | Two **equal** panes joined by a **brass ring** on the seam | `conn-and.svg` |
| A → B | Socket | A **small recessed socket** (darker, dashed edge) holding A, a **chevron** on the seam, and a **larger** pane holding B | `conn-imp.svg` |

Why these pictures:

- **Pair** is symmetric because ∧ is. The ring is the same brass as keys, so a pair key reads as "a key ring holding two keys".
- **Socket** is asymmetric because → is. The socket looks like an empty slot waiting for something to be plugged in, and the chevron points at what you get out. "Put A in, get B" is the whole meaning of if-elim.

### 2.3 Layout rule (recursive)

A card of width `w` and height `h` lays out its proposition like this:

1. Pad by `7%` of the shorter side.
2. **Atom:** draw the silhouette centred at `92%` of the padded shorter side.
3. **Compound:** split along the **longer** axis, so nesting alternates between side by side and stacked on its own.
   - Pair: two equal panes, gap = `max(4, 6% of the long side)`. Ring radius = `8.5%` of the padded short side.
   - Socket: panes in ratio `2 : 3` (socket first, so left or top). Gap = `clamp(8, 12% of the long side, 18)`, with the chevron centred in the gap.
4. Nested panes alternate paper tones (`paper`, `paper-2`) so every boundary stays visible. A socket pane has no paper of its own; its contents sit directly on the recessed `socket` colour.
5. **Folding:** if a pane would make its symbols smaller than **10 px** (5 px for path-bar thumbnails), draw it folded: a recessed pane with three dots. Long-press shows the full formula.

Door cards (184 × 137) show three levels without folding. Key cards (88 × 66 inside the rim) fold a pair that sits inside a socket, for example (P ∧ Q) → R. None of the proposed stages (section 10) has such a key, so in practice folding only happens in thumbnails. A future stage that needs one should use a wider key card instead.

### 2.4 Frames: what role a card plays

| Frame | Meaning | Look |
| --- | --- | --- |
| Key | An assumption you hold | Card in a brass rim (`brass` / `brass-dark`) with a round bow on its left edge. Icon `key.svg` |
| Door | The goal of this room | Card mounted on an arched wooden door (`wood` / `wood-dark`) with a brass knob. Icon `door.svg` |
| Double door | A pair goal, before it is split | Two door leaves with the pair ring above the seam. Icon `door-double.svg` |
| Open door | A cleared goal | Door leaf swung open, warm `light` inside, green check. Icon `door-open.svg` |
| Ghost | A preview of what a drop will make | Any frame at 50% opacity inside a dashed `ok` outline |
| Tree node | A step in the replayed proof | Bare card; assumptions keep their brass rim |

## 3. Colour

The game is played at dusk: a dark indigo room, warm paper cards, brass keys, wooden doors. Dark surroundings make the light cards the brightest thing on screen, so the eye goes to the pictures.

| Token | Hex | Use |
| --- | --- | --- |
| `night` | `#1C2033` | Background |
| `night-2` | `#262B42` | Key tray, buttons |
| `night-3` | `#323857` | Pressed buttons, current stage highlight, empty states |
| `ink` | `#E8E4F0` | Icons and lines on `night` |
| `ink-2` | `#9DA3C2` | Secondary icons, path links |
| `paper` | `#F7F1E6` | Card face, depth 0, 2, ... |
| `paper-2` | `#EDE3D1` | Card face, depth 1, 3, ... |
| `edge` | `#D9CDB8` | Card border |
| `socket` | `#E2D6C1` | Recessed socket pane |
| `socket-line` | `#A8997E` | Dashed socket border |
| `seam` | `#6B5E4B` | Chevron, folded-pane dots, formula punctuation |
| `brass` | `#D9A441` | Keys, pair ring |
| `brass-dark` | `#9C7024` | Key outline, ring shadow |
| `wood` | `#8C5A3C` | Door leaf |
| `wood-dark` | `#5E3B27` | Door frame, sill |
| `light` | `#FFE7A8` | Open doorway, primary "next" button |
| `ok` | `#7CE0B5` | Valid targets, previews, success |
| `bad` | `#FF7A6B` | Rejected drop flash only (never static) |

**Scope ribbons.** Keys received from an if-intro door carry a small ribbon. The ribbon says which room they belong to (section 6). Ribbons use a pastel set that does not collide with the atom colours. Each ribbon also has a notch count, so it can be told apart without colour:

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

- Eight doors in a 2-column grid. Each door shows its stage's goal card, so the map also previews what is coming.
- The stage number is shown as **pips** (1 to 8 dots, in rows of four), not numerals.
- States: cleared (green check badge), current (raised `night-3` panel and `ok` glow on the arch), locked (dimmed, lock badge). Stages unlock in order.
- Top right: settings (`ui-settings.svg`). Tap a door to enter its stage.
- Tap the check badge of a cleared stage to rewatch its proof tree (section 4.5). The badge has a 48 × 48 hit area, and while pressed its check turns into `ui-proof-tree.svg`.

### 4.2 Room (the play screen)

![Room screen while dragging](mockups/room.svg)

From top to bottom:

1. **Path bar** (y 24 to 88). On the left, the stage-map button (`ui-stages.svg`). Then one thumbnail chip per room on the way from the stage door to the current room (section 4.3).
2. **Door** (y 100 to 430). The current goal, large and centred. It is a drop target and, if it is a pair or socket door, also a tap target.
3. **Key tray** (y 448 to 708, `night-2`). Keys in a 3-column grid, 96 × 74 each, in the order they were obtained. New keys are appended. When the tray holds more than six keys it scrolls vertically.
4. **Bottom bar** (y 718 to 766): undo (`ui-undo.svg`), restart room (`ui-reset.svg`), hint (`ui-hint.svg`), formula captions (`ui-formula.svg`).

The mockup shows stage 7 inside the if-intro room. The player is dragging the ribboned sun key over the socket of the sun → moon key. Only that key glows, because the moon → leaf key and the leaf door would not accept a sun. A dashed line leads to a ghost moon key in the slot where it will land, marked with the if-elim icon. The ghost carries the same ribbon, because it is made from a ribboned key.

### 4.3 Path bar

![Path bar states](mockups/paths.svg)

| Chip state | Look |
| --- | --- |
| Here | Bright thumbnail inside a white ring |
| Passed through | Thumbnail dimmed 35% |
| Open sibling (from and-intro, not done yet) | Thumbnail dimmed 55%, on a branch |
| Cleared sibling | Dimmed thumbnail and green check badge |

- And-intro draws a **fork**: the parent chip has two branches, one per leaf of the double door. Tap any chip of an unfinished room to go there.
- If-intro rooms show their **ribbon** on their chip. Every key in the tray that depends on that room carries the same ribbon.
- If the chips do not fit in the width, the oldest chips collapse into one stacked chip. Tapping it expands the full path as an overlay.

### 4.4 Long-press: the formula

![Long-press reveals the formula](mockups/longpress.svg)

- Hold any card (door, key, chip, tree node) for **450 ms**. The screen dims to 70%, the held card stays bright with a white outline, and a paper bubble above it shows the formula.
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
- Assumptions keep their brass rim. Assumptions discharged by an if-intro step carry that room's ribbon, and the same ribbon sits next to the if-intro bar that discharges them. This replaces the usual `[A]¹` numbering.
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
| Drag | Key → door | Assumption use, if the pictures match |
| Drag | Key A → socket key A → B | If-elim: new key B |
| Drag | Pair key A ∧ B → empty tray slot | And-elim: new keys A and B |
| Tap | Pair door A ∧ B | And-intro: two doors, A and B |
| Tap | Socket door A → B | If-intro: enter a room with key A and door B |
| Tap, then tap | Key, then target | Same as dragging that key to that target |
| Long-press | Any card | Show formula (section 4.4) |
| Tap | Path chip | Go to that room |

### 5.1 Drag

- **Pick up:** touch a key and move it more than 8 px. The copy lifts (scaled to 80%, rotated −5°, with a drop shadow) and follows the finger, offset upward so the finger never hides the picture. The original stays in its slot at 30% opacity.
- **Valid targets glow** with a 3 px `ok` outline as soon as the key is lifted. Invalid targets do not react. The player sees all their options before moving.
- **Hover:** when the dragged key's centre enters a valid target, the target scales to 104%, a light haptic tick plays, and the **drop-point preview** appears (section 5.3).
- **Drop on a valid target:** the action happens, and the copy flies into the target.
- **Drop elsewhere:** the copy flies back to its slot (200 ms ease-out). There is no penalty and no message.

### 5.2 Tap-tap

For one-handed play, accessibility, and players who find dragging hard:

1. Tap a key: it gets a white selection ring, and the valid targets glow exactly as during a drag. The drop-point previews are shown for **all** valid targets at once.
2. Tap a glowing target to commit. Tap the selected key again, or empty space, to cancel.

With nothing selected, tapping a door means intro (section 5.4). With a key selected, tapping a door means "drop here". Tapping an invalid target while a key is selected does a short shake, and the selection stays.

### 5.3 Drop-point preview

| Target | Preview while hovering |
| --- | --- |
| Matching door | The key turns in a ghost keyhole; a thin line of `light` shows at the door's edge |
| Socket key | A ghost of the new key in the slot where it will land, a dashed `ok` line from the socket key, and the if-elim icon |
| Empty slot (pair key) | Ghosts of both halves in the next two free slots, with the and-elim icon |

If the result is a key that is already in the tray, the preview highlights the existing key instead of drawing a ghost. Dropping then just pulses that key; no duplicate is added.

### 5.4 Tapping a door (introduction)

- Press-and-hold feedback: on touch-down, the door shows a ghost of what tapping will do (the split line for a pair door, a crack of `light` for a socket door). Releasing commits. Sliding off cancels.
- An atom door has no intro. Tapping it does a small wiggle, and the tray gently pulses to point at the keys.

### 5.5 Undo and restart

- Undo reverts the last action, including a room clear. Repeated undo walks back to the stage start.
- Restart room (`ui-reset.svg`) undoes every action since you entered the current room. Long-press it to restart the whole stage.

## 6. What each move looks like

| Move | Animation (≈ ms) | After |
| --- | --- | --- |
| Assumption use | Key flies into the door (250), turns (200), door swings open (400), light spills out | The room is cleared. Go to the next open sibling room on the path, or up to the parent. Clearing the stage's own door (the first chip) clears the stage |
| And-intro | The door splits down the ring seam into two leaves (350). The camera follows the first leaf (300) | The path forks. Both new rooms start with a copy of the current tray |
| And-elim | The pair key's ring opens (200) and two keys slide out into new slots (300) | The pair key stays |
| If-intro | The socket door swings inward (400), the camera walks through (300), and the socket's key drops into the tray with a new ribbon (300) | A new room with the consequent as its door. The path adds a ribboned chip |
| If-elim | The key plugs into the socket (200), the socket lights up (150), and the new key slides into its slot (300) | Both input keys stay |

**Scope.** A tray belongs to a room. Child rooms start with a copy of their parent's tray. Keys made in a room never flow back to the parent. A key made from ribboned keys carries all of their ribbons. When an if-intro room is cleared, its ribboned keys dissolve from view (scale to 0 with a sparkle, 250 ms), which shows that the assumption is discharged.

## 7. Feedback without words

### 7.1 Hints

The hint button never shows text. One press pulses the key and the target of a useful next move together, for 2 s. Three hints in the same room show a ghost hand performing the move, using `gesture-drag.svg` or `gesture-tap.svg`.

### 7.2 Tutorials

Stages 1 to 6 each introduce exactly one new move. On first entry, a ghost hand performs that move once. Afterwards the hand loops every 6 s until the player touches anything. Tutorials are never blocking.

### 7.3 Formula captions

`ui-formula.svg` in the bottom bar toggles a small formula caption under every card on screen. It is off by default. While it is on, the button stays in its pressed state (`night-3`).

## 8. Motion and haptics

- Easing: ease-out for anything arriving, ease-in-out for camera moves. No bounce larger than 4%.
- Haptics: light tick (valid target entered), medium (action committed), success pattern (stage cleared), soft double knock (invalid tap while a key is selected). Never vibrate on a plain miss.
- Reduced motion: camera moves become 150 ms cross-fades, the tree replay shows the complete tree at once, and the hint pulses become static outlines.

## 9. Accessibility

- Atoms differ by silhouette, ribbons differ by notch count, and valid targets get an outline, not just a colour change. Every state can be read without colour vision.
- Every card has an accessible label with its formula, read in words ("if sun then moon"). Screen-reader users play with tap-tap.
- Touch targets are at least 48 × 48.
- Contrast: in the formula bubble, every colour on `paper` is at least 3.1:1 (sun is the lowest at 3.13, `seam` is 5.6), which meets WCAG AA for large text (the bubble uses 24 px bold). `ink` on `night` is 12.9:1, and `ink-2` on `night` is 6.5:1.

## 10. Proposed stages

The stage list belongs to level design. This proposal shows that the visual system covers it: each stage introduces at most one new move, and the atoms appear in their table order.

| # | Keys | Door | New move |
| --- | --- | --- | --- |
| 1 | P, Q | P | Assumption use |
| 2 | P, Q | P ∧ Q | And-intro |
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
| Game objects | 48 | Fixed (brass, wood, paper) | `key`, `door`, `door-double`, `door-open` |
| Rules | 24 | `currentColor` | `rule-assume`, `rule-and-intro`, `rule-and-elim`, `rule-imp-intro`, `rule-imp-elim` |
| UI | 24 | `currentColor` | `ui-undo`, `ui-reset`, `ui-stages`, `ui-hint`, `ui-formula`, `ui-proof-tree`, `ui-play`, `ui-pause`, `ui-step-forward`, `ui-step-back`, `ui-check`, `ui-close`, `ui-lock`, `ui-settings` |
| Gesture ghosts | 24 | `currentColor` | `gesture-tap`, `gesture-hold`, `gesture-drag` |

Conventions for `currentColor` icons: stroke width 2 on the 24 grid (2.5 on the 48 grid), round caps and joins, no fills except for small solid accents.

The SVGs in `docs/mockups/` are illustrations for this document, built from the same icons and the layout rule in section 2.3. They are not runtime assets.

## 12. Reserved for later

These are not part of the current scope. They are listed so that new pictures do not collide with the current ones:

- **Or (∨):** a card with two panes separated by a **fork** seam (a Y-shaped split). The pair's ring and the socket's chevron are already taken.
- **Falsum (⊥):** a **cracked**, empty card.
- **Not (¬A):** drawn as A → ⊥, a socket leading to the cracked card, so it needs no picture of its own.
