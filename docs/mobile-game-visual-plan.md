# Mobile Game Visual Plan

## Direction

This project should keep the existing H5 game flow and server behavior, but present it like a shipped portrait mobile card game instead of a web UI with game assets.

Core style:
- Bright casual Q-version western poker, matching the original character, navigation, logo, card-back, and soft background assets.
- Soft toy-like shapes, clear silhouettes, warm light, rounded frames, and simple readable props.
- Use gold/parchment/red wax only as light accents, not as heavy realistic metal badges.
- Keep the mood playful and relaxed, closer to a casual mobile card game than a casino or hardcore RPG UI.
- Fewer plain panels; more scene layers, framed modules, and reward-focused affordances.
- No logic or economy changes while doing the visual pass.

## Style Guardrails

The visual pass should not chase "more ornate" by default. The later heavy gold/realistic icon direction is not the target. It is too metallic, too trophy-like, and too different from the original casual assets.

Use this target instead:
- Rounded Q-version props, not realistic product renders.
- Brighter color blocks with soft edges, not high-contrast dark metal.
- Simple one-read symbols, not dense decorative objects.
- Slight hand-painted/3D toy finish, not premium casino realism.
- Friendly western elements: card pack, saloon sign, stitched cloth, soft leather, simple badges, small stars, chunky poker cards.
- Low visual pressure: no excessive glow, no sharp luxury ornament, no dark fantasy framing.

Reject or redo assets that look like:
- Realistic gold trophy/medal UI.
- Heavy metal crests.
- Over-detailed parchment props that blur at 32px.
- Dark casino or RPG item icons.
- Any icon that feels more formal than the existing character/nav art.

Before generating more art, create or approve a small style sample set against the existing assets:
- `hero_boy.png`
- `hero_redgirl.png`
- `nav_home_cutout.png`
- `nav_shop_cutout.png`
- `ui_card_back_cutout.png`
- Existing function-card art that feels closest to the desired direction.

## Design Principles

1. The first screen should feel like a game lobby.
   The user should immediately see the active character, rank state, currency, daily/mail, primary battle actions, and equipped cards.

2. Battle should feel like a table scene.
   The game board needs a stronger play surface, clearer hand zones, better skill-button framing, and visual feedback for reveal, win, loss, and skill usage.

3. Collection pages should feel collectible.
   Function cards, characters, and draw results should look like owned inventory, not settings lists.

4. Shop should feel like a gacha screen.
   The shop needs pack art, recruit art, probability entry, draw buttons, and draw reveal animation that share one visual language.

5. Ranking should feel competitive.
   Current rank, top 3, leaderboard rows, and personal position should use badges, podium treatment, and rank medal assets.

6. Art should follow layout needs.
   Add images only after deciding where they appear, at what size, and what state they represent.

## Global UI System

### Shell

- Portrait-first max width stays.
- Bottom nav remains the main app shell.
- Top resource display becomes a consistent HUD pattern across pages.
- Modal headers use small casual icon + title + close button.
- Button hierarchy:
  - Primary: warm yellow/orange, larger, used for battle/draw/start.
  - Secondary: parchment/dark, used for cancel/back/info.
  - Danger: red, only for destructive or exit-like actions.

### Module Types

- Hero scene: full-width visual area, used on Home and Battle.
- Framed panel: single major module, not nested cards.
- Item card: repeated inventory/card/character/draw result unit.
- Action strip: fixed or local button row for primary decisions.
- Reward pill: currency, shard, chest, task reward, with soft icon treatment.

### Motion

- Light idle pulse only on main battle/draw action.
- Draw reveal should flip from card back to reward.
- Skill usage should flash icon + short text, then settle; avoid harsh effects.
- Rank progress should fill smoothly after battle results.

## Screen Redesign

### Home

Goal: game lobby.

Layout:
- Full-bleed active character hero in top half.
- HUD row over hero: avatar, daily, mail, coin, gem.
- Rank panel overlays lower hero: rank badge, progress, total games, streak.
- Two large action buttons below hero:
  - Start Battle.
  - Online Battle.
- Equipped skills shown as two horizontal loadout cards.
- Tutorial/rules/achievements as small side tool buttons.

Art needs:
- Re-evaluate the later generated HUD/action icons before using them widely. If they read too formal or too metallic, redo them in the casual Q-version style.
- Later: soft rank badges if rank screen redesign needs them.

### Battle

Goal: tactile poker table.

Layout:
- Opponent strip at top with avatar, HP, active skill icons.
- Center table: public cards, reveal zone, VS/result burst.
- Player hand in a curved or layered strip.
- Bottom action area: skills, selected count, play button.
- Logs/help stay secondary and collapsible.

Visual changes:
- Improve table surface contrast and card placement.
- Skill buttons use full skill art and tier frame.
- Selected cards lift consistently without overlapping UI.
- Result state uses bigger hand-name burst and reward summary.

Art needs:
- Softer battle table background that matches the current bright UI.
- Win/lose/result badge variants with playful shapes, not heavy medals.
- Skill-use burst overlay.
- Optional card selection glow.

### Function Card Warehouse

Goal: collectible card inventory.

Layout:
- Top loadout panel: two equipped slots with empty states.
- Tier sections use compact headers and card grids.
- Each function card keeps full art, count badge, tier frame, info button.

Visual changes:
- Use consistent tier frames and smaller text.
- Empty/unowned states should not look like broken cards.

Art needs:
- 22 function-card art assets should be checked for style consistency against original character/nav art.
- Later: generic empty slot frame and soft tier badge variants.

### Shop

Goal: gacha/recruit screen.

Layout:
- Two shop banners:
  - Function card pack.
  - Character recruit.
- Each banner has large item art, short rewards copy, single/ten draw buttons.
- Prize pool button placed as a small framed info button.
- Currency cost uses gem icon, not emoji.

Draw reveal:
- Start from card-back pack animation.
- Flip into reward card.
- Skill results reuse skill art.
- Character results use character avatar/art.
- Duplicate character reward shows shard icon.

Art needs:
- Skill pack icon in the same casual Q-version style, not a luxury booster pack.
- Character recruit icon as a friendly ticket/card, not a metal badge.
- Prize pool icon as a simple readable list/card prop.
- Character shard icon with soft candy/gem treatment.

### Characters

Goal: character collection and growth.

Layout:
- Active character highlighted with larger art card.
- Other owned characters shown as roster cards.
- Locked/unowned characters shown as silhouettes or muted cards.
- Upgrade cost uses coin icon, shard uses shard icon.

Visual changes:
- Replace circular list-item feeling with character-card frames.
- Make rarity visually meaningful.
- Active status should be obvious without relying on text only.

Art needs:
- Character shard icon.
- Locked character mask/silhouette frame.
- Soft rarity ribbons if current CSS tags are not enough.

### Rank

Goal: competitive season screen.

Layout:
- Current rank hero: rank badge, progress, stats.
- Top 3 podium cards.
- Rest of leaderboard as dense rows.
- Self row pinned or highlighted.

Visual changes:
- Reduce plain list feeling.
- Use medal/rank badge graphics.
- Make win rate and rank readable at a glance.

Art needs:
- Casual rank badge/podium icon, avoiding realistic medals.
- Soft rank badge set if rank icons remain emoji-like.

### Mail And Daily

Goal: reward/task systems feel game-native.

Layout:
- Modal header with icon.
- Task rows use status icon and reward pill.
- Mail rows use envelope icon, reward chips, claim button with chest icon.

Art needs:
- Re-check mail, daily, chest, task pending/done, coin, gem. These later icons may need a casual-style redraw if they feel too formal.

## Resource Priority

P0, should ship first:
- Freeze the casual Q-version style sample.
- Home/Battle/Shop layout redesign using existing assets first.
- Identify which existing/generated assets fail the style guardrails.
- Redraw only the truly needed assets after layout is approved.

P1:
- Function card missing art style cleanup.
- Character shard and roster presentation.
- Casual rank/podium visuals.
- Draw reveal polish.

P2:
- Result overlays.
- Empty slot frames.
- Rarity ribbons and badges.
- Extra transitions.

## Implementation Order

1. Freeze the casual Q-version art direction using existing assets as references.
2. Freeze target layouts for Home, Battle, Shop, Characters, Rank.
3. Add or revise CSS classes for shared visual system.
4. Wire existing approved art into those layouts first.
5. Generate only the missing assets required by the frozen layouts.
6. Reject/redraw any generated asset that does not match the casual style guardrails.
7. Verify in browser on portrait viewport and narrow mobile height.
8. Run syntax checks and asset existence checks.

## Non-Goals

- Do not change account, auth, database, room, socket, battle, economy, probability, or reward logic.
- Do not replace the H5 app with a new frontend stack.
- Do not redesign the game into a different product genre.
- Do not create large high-resolution art unless the layout needs it.
