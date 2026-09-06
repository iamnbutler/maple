# Cubing strategy — what Heroic players actually chase, and where they stop

Research date: **2026-09-06**. Scope: **GMS Heroic (Reboot) worlds only**, matching
`docs/plans/2026-09-06-maple-design.md` §2. Regular/Interactive worlds and Bonus Potential are out
of scope (Bonus Potential does not exist in Heroic —
<https://maplestorywiki.net/w/Potential>).

**Purpose.** The tracker was recommending "reroll this item to three useful legendary lines".
That is not a plan, it is a jackpot. This document replaces it with the targets real players
pursue, in the order they pursue them, and gives the program the per-slot line pools, the accepted
stopping points and a derived cost model to rank against.

**Reading conventions**

- Every factual claim carries a source URL inline.
- **DERIVED** marks a number *computed here* from sourced probability tables. The inputs are cited
  and the model is written out in §7 so it can be re-run and checked. Derived numbers are not
  community claims — do not present them to a user as "players say".
- **UNVERIFIED** marks something that could not be sourced. Per the project's hardest rule, no
  number in this file is invented; anything unsupported is labelled instead of guessed.
- **DISPUTED** / **UNRESOLVED** mark places where sources disagree; both positions are given and
  neither is silently picked.
- §3.2b–§3.2d additionally carry figures produced by **executing brendonmay's published calculator
  engine** against its own rate data. They are reproducible but are not quotes from a page.
- **Reddit quotes are archive-sourced.** reddit.com and every mirror are 403/410 from this
  environment; the r/Maplestory threads cited below were retrieved as full post+comment JSON from
  the **Arctic Shift archive** (`arctic-shift.photon-reddit.com`). Permalinks and quotes are
  verbatim from that archive, but the pages themselves were never rendered. See §8.
- "Prime" = the top-tier line pool for a given potential rank. "Non-prime" = the pool one rank
  down, which fills the lines that did not roll prime.
  <https://maplestorywiki.net/w/Potential>

**Companion files.** Raw mechanics (line values, rank-up rates, cube prices) live in
`docs/research/formulas.md` §4A.3. Probability tables for the calc engine are being built
separately in `src/lib/data/potential-lines.ts` / `docs/research/potential-lines.md`. This file is
the *strategy* layer: which of those lines are worth pursuing, and when to stop.

---

## 0. Executive summary — the six facts that kill "three useful legendary lines"

1. **On a Legendary item, only the *first* line is guaranteed prime.** With the best cube in
   Heroic (Bright Cube) the 2nd line is prime 20% of the time and the 3rd line 5% of the time, so
   an all-prime roll happens 1% of the time — 1 in 100 cubes *before* you ask whether the three
   primes are the ones you wanted.
   <https://strategywiki.org/wiki/MapleStory/Potential_System> (also `formulas.md` §4A.3.4)

2. **Non-prime lines are not junk.** The Legendary non-prime pool is the Unique prime pool, and it
   contains %main-stat, %All Stat, ATT%, MATT%, Crit Rate%, Damage%, "Ignore 30% DEF" and
   "Boss +30%". So "3 lines of %STR" or "3 lines of ATT%" does **not** require triple prime — it
   requires three lines of the right *category*, mostly at the smaller value.
   <https://strategywiki.org/wiki/MapleStory/Potential_System>
   This is the single biggest correction to the tracker's model.

3. **Some lines are prime-only and therefore genuinely rare.** Critical Damage% (gloves), Skill
   Cooldown −1s/−2s (hat), Mesos Obtained% and Item Drop Rate% (accessories), IED 35/40% and
   Boss 35/40% (WSE) appear **only** in the Legendary prime pool. A second copy of any of these
   costs a 2-prime roll; a third copy costs a 3-prime roll.
   <https://strategywiki.org/wiki/MapleStory/Potential_System>

4. **Two of the headline lines are hard-capped at 2 per item.** StrategyWiki's per-line notes state
   verbatim: *"Damage to Boss Monsters increase can only appear up to 2 times on a single cube"*,
   *"Ignore Monster DEF can only appear up to 2 times on a single cube"* and *"Item Drop Rate
   increase can only appear up to 2 times on a single cube"*. **Triple-boss, triple-IED and
   triple-drop are impossible**, not merely rare. (`Chance to ignore percentage damage` and
   `Chance to become invincible` are likewise capped at 2; `Decent` skills at 1.)
   <https://strategywiki.org/wiki/MapleStory/Potential_System>

5. **Triple crit-damage gloves are a ~3-quadrillion-meso event.** DERIVED from the published
   9.0909% cash-cube prime rate for Critical Damage% on gloves and the Bright Cube prime
   structure: P = 0.0908 × (0.20 × 0.0908) × (0.05 × 0.0908) ≈ **1 in 133,100 cubes ≈ 2,928B
   mesos** at 22M/cube. The user's "maybe five characters in history" is the right order of
   magnitude. Two crit-damage lines is ~1 in 469 cubes (~10.3B) — expensive but real.
   Rates: <https://strategywiki.org/wiki/MapleStory/Potential_System>; price:
   <https://maplestorywiki.net/w/Cube>.

6. **The whole calculator ecosystem states armor goals as a summed percentage, not a line count**
   (`21%+ / 24%+ / 27%+ … Stat`), because %All Stat lines break line-counting. It states hat
   cooldown goals in **total seconds** (`−2s+ / −3s+ / −4s+`). Neither expresses a goal as
   "three lines".
   <https://github.com/brendonmay/brendonmay.github.io/blob/master/cubingCalculator/updateDesiredStatsOptions.js> ·
   <https://raw.githubusercontent.com/Francesco149/cubecalc/main/src/textfile.py>

The practical consequences for the tracker:

- **Recommend "add one more line of category X", never "roll three of X".** The third line costs
  ~20–30× the second on armor (§3.2) and ~5× on a weapon (§3.2b).
- **Express armor goals as `N%+` and hat goals as `−Ns+`**, matching every tool players already use.
- **Hard-block the impossible targets**: any Boss line on an emblem; 3 Boss / 3 IED / 3 Drop lines
  anywhere; any potential at all on pocket, medal, android, totem, or a non-potential badge.
- **Never introduce a stat-equivalence constant** (§5.7) — compute `measureGain` per candidate.

---

## 1. Per-slot reference: what can roll, what is chased, where people stop

### 1.1 Which slots have potential at all

Never gets potential, innately or from a scroll: **Medals · Pocket Items · Androids · Totems ·
Badges (except Ghost Ship Exorcist, Sengoku Hakase Badge, Shackles of Resentment) · certain rings
with innate special effects (Special Skill Rings, Dark Angelic Blessing, Adventure Deep Dark
Critical Ring)**. Android **Hearts** do get potential.
<https://maplestorywiki.net/w/Potential>

> **Action for the tracker:** the `pocket`, `medal`, `android` and `totem*` slots in the `Slot`
> union must never generate a `potential` candidate. `badge` must be gated on the item name.
> Ring slots must be gated on the item — an event/skill ring may be uncubeable.

### 1.2 Legendary line pools by slot (source of truth)

All lists below are the **Legendary (Prime)** and **Legendary (Non-prime)** pools verbatim from
<https://strategywiki.org/wiki/MapleStory/Potential_System>, cross-checked against
<https://maplestorywiki.net/w/Potential>. Cash-cube = Glowing/Bright (the two Heroic meso cubes,
renamed from RED/Black in GMS v239 — <https://maplestorywiki.net/w/Cube>).

Values are for **item level 151+ (GMS bracket)** unless noted; that is the bracket every current
Heroic endgame piece (Arcane Lv200, Eternal Lv250, Genesis/Destiny weapons) sits in.
%stat by rank/level: Rare 4 / Epic 7 / Unique 10 / Legendary 13 at 151+; 3/6/9/12 at 71–150.
<https://maplestorywiki.net/w/Potential>

| Slot | Legendary **prime** pool (damage-relevant only) | Legendary **non-prime** pool (damage-relevant only) | Prime-only lines (the rare ones) |
|---|---|---|---|
| **hat** | %STR/DEX/INT/LUK 13, %All Stat 10, %MaxHP/MP/DEF, **Skill Cooldown −1s**, **Skill Cooldown −2s**, Decent Advanced Bless, 2× ignore-damage | %stat 10, %All Stat 7, %HP/MP/DEF, Decent Mystic Door, 2× ignore-damage | **cooldown −1s / −2s** |
| **top / overall** | %stat 13, %All Stat 10, %HP/MP/DEF, invincibility 3s, 4% invincible-on-hit | %stat 10, %All Stat 7, invincibility 2s, 2% invincible, reflect | — |
| **bottom** | %stat 13, %All Stat 10, %HP/MP/DEF, reflect ×2 | %stat 10, %All Stat 7, Decent Hyper Body | — |
| **gloves** | %stat 13, %All Stat 10, **Critical Damage% (+8 at item lv 81+)**, Auto Steal 3/5/7%, Decent Speed Infusion | %stat 10, %All Stat 7, stat +1/10 levels, Auto Steal 1/2%, Decent Sharp Eyes | **Critical Damage%**, Auto Steal 3/5/7 |
| **shoes** | %stat 13, %All Stat 10, Decent Combat Orders | %stat 10, %All Stat 7, Decent Haste | — |
| **cape / belt / shoulder** | %stat 13, %All Stat 10, %HP/MP/DEF | %stat 10, %All Stat 7 | — |
| **face / eye / ring / earring / pendant** | %stat 13, %All Stat 10, **Mesos Obtained +20%**, **Item Drop Rate +20%**, MP cost −17/−35% | %stat 10, %All Stat 7, %HP/MP/DEF | **meso%**, **drop%** |
| **weapon** | %stat 13, %All Stat 10, **ATT% 13**, **MATT% 13**, **Crit Rate% 13**, Damage% 13, ATT/MATT +1 per 10 lv, **IED 35 / IED 40**, **Boss +35 / Boss +40** | %stat 10, %All Stat 7, ATT% 10, MATT% 10, Crit Rate% 10, Damage% 10, **IED 30**, **Boss +30** | IED 35/40, Boss 35/40 (the 30% versions roll non-prime) |
| **secondary** | same as weapon, **plus** 2× ignore-damage | same as weapon non-prime, plus 2× ignore-damage | as weapon |
| **emblem** | %stat 13, %All Stat 10, ATT% 13, MATT% 13, Crit Rate% 13, Damage% 13, ATT/MATT +1/10 lv, **IED 35 / IED 40** — **no Boss line at any tier** | %stat 10, %All Stat 7, ATT% 10, Crit Rate% 10, Damage% 10, **IED 30** | IED 35/40 |
| **heart · badge** | %stat 13, %All Stat 10, %HP/MP/DEF only | %stat 10, %All Stat 7, %HP/MP/DEF | — (smallest pool in the game) |
| **pocket · medal · android · totem** | — no potential — | — | — |

Two independent sources confirm the emblem cannot roll Boss Damage: the StrategyWiki pool above,
and the Reboot Guide's own note — *"they are the only pieces of gear that can roll %Att, IED and
Boss lines (except for the emblem, which can't roll %boss lines)"*
<https://docs.google.com/document/d/132E6dGMNTRHwRh0wDU7xKZvW7f7xeBhR3VNs_2WQzrE/mobilebasic>

Demon Aegis and Soul Rings use the secondary-weapon pool and **do** get Boss lines
(StrategyWiki lists them as their own section with the same pool). Not relevant to the five
priority classes.

### 1.3 The chased line, the stopping point, and the fantasy — per slot

"Cubes" and mesos below are **DERIVED** expected counts to first hit, using the two-pool model in
§7 with Bright Cube prime rates (L1 100% / L2 20% / L3 5%) and the per-slot cash-cube line rates
from StrategyWiki. Community stopping points are cited separately.

| Slot | Chased line(s) | **Good enough — where people stop** | "Perfect" that nobody rolls for |
|---|---|---|---|
| **hat** | %main stat; **cooldown −1s/−2s for cooldown-hungry classes** (§5) | 2 lines of %stat (~45 cubes ≈ **1.0B**), or `21%+ stat` (~39 cubes ≈ 0.9B). Cooldown builds: the only published ladder is Hero's — **−2s + 2L stat** is the target *"most Hero players who are actually maining the class in Heroic should aim for"*, **−4s + 1L stat** only *"if you can afford it"*, and −3s / −3s+1L / −2s+1L are *"Not worth it"* (<https://buffhero.win/>) | 3× %stat (1,413 cubes ≈ **31B**); −5s (156,637 ≈ **3,526B**); −6s (861,538 ≈ **19,395B**) |
| **top / overall** | %main stat | 2L stat (~51 cubes ≈ 1.1B) | 3L stat (1,771 ≈ 39B) |
| **bottom** | %main stat | 2L stat (~38 cubes ≈ 0.8B) | 3L stat (1,102 ≈ 24B) |
| **overall** | %main stat (uses the Top/Overall pool) | as top | as top |
| **shoes** | %main stat | 2L stat (~40 cubes ≈ 0.9B) | 3L stat (1,218 ≈ 27B) |
| **gloves** | **Critical Damage%** (only slot that has it), else %main stat | **1 crit-damage line** + anything (~9 cubes ≈ **0.2B**). The Reboot Guide: *"Most people settle for 1L Crit dmg with other suboptimal potentials, such as a DSE/DSE line or a Main Stat % line."* | 2L crit damage (469 ≈ **10.3B**) — the Guide: *"If you can get 2L Crit Damage you are godly"*. 3L crit damage (133,100 ≈ **2,928B**) — *"go to the lottery or you're a hacker"* |
| **cape** | %main stat | 2L stat (~35 cubes ≈ 0.8B) | 3L stat (970 ≈ 21B) |
| **shoulder** | %main stat | 2L stat (~35 cubes ≈ 0.8B) — cheapest of the armour slots | 3L stat (970 ≈ 21B) |
| **belt** | %main stat | 2L stat (~35 cubes ≈ 0.8B) | 3L stat (970 ≈ 21B) |
| **weapon** | **ATT%**, then Boss / IED | **2 lines ATT%** (~94 cubes ≈ **2.1B** Bright, **1.1B** Glowing). The Reboot Guide: *"If you've just started cubing your gear, 2L att with any third line of potential is fine because 2L att is fairly difficult to get already."* | 3L ATT% (4,550 ≈ 100B); 2 ATT + 1 IED (1,087 ≈ 24B); 2 ATT + 1 Boss (847 ≈ 19B) |
| **secondary** | ATT% (MATT% for mages) | 2L ATT% (~128 cubes ≈ 2.8B Bright / 1.5B Glowing) | 3L ATT% (7,290 ≈ 160B) |
| **emblem** | ATT%, then IED (no Boss available) | 2L ATT% (~77 cubes ≈ 1.7B Bright / 0.9B Glowing) | 3L ATT% (3,306 ≈ 73B); 1 ATT + 2 IED (590 ≈ 13B) |
| **pendant ×2** | %main stat (bossing set) **or** meso%/drop% (farming set) | 2L stat (~33 cubes ≈ 0.7B); farming pendant: 1 meso line = 12 cubes ≈ 0.26B | 3L stat (872 ≈ 19B); 2 meso lines (794 ≈ 17B) |
| **ring ×4** | %main stat / meso% / drop% | as pendant | as pendant |
| **earrings** | %main stat / meso% / drop% | as pendant | as pendant |
| **face** | %main stat / meso% / drop% | as pendant | as pendant |
| **eye** | %main stat / meso% / drop% | as pendant | as pendant |
| **heart** | %main stat. *Black Heart is a special case: it has a fixed, uncubeable Boss +30% / IED +30% potential* (`formulas.md` §4A, Black Heart row) | 2L stat (~25 cubes ≈ **0.55B**) — cheapest pool in the game | 3L stat (580 ≈ 13B) |
| **badge** | %main stat, and only on the three badges that can hold potential | 2L stat (~25 cubes ≈ 0.55B) | 3L stat (580 ≈ 13B) |
| **pocket** | **none — pocket items cannot hold potential** (<https://maplestorywiki.net/w/Potential>) | n/a | n/a |
| **medal · android · totem** | **none — never get potential** (same source) | n/a | n/a |

**Why the badge/shoulder/belt/heart slots are cheapest, quantified.** The Reboot Guide asserts
*"Badge/Shoulder/Boots/Belt generally take less cubes to get a good % stat because they have less
'garbage' potential lines."* That is confirmed exactly by the per-line cash-cube prime rates: the
chance a prime line is your specific %main stat is **12.90% badge/heart · 10.81%
bottom/cape/belt/shoulder · 10.00% shoes · 9.30% top and accessories · 9.09% gloves · 8.89% hat**.
Hat is the most expensive armor slot to stat-roll and badge/heart the cheapest.
<https://strategywiki.org/wiki/MapleStory/Potential_System> ·
<https://docs.google.com/document/d/132E6dGMNTRHwRh0wDU7xKZvW7f7xeBhR3VNs_2WQzrE/mobilebasic>
(The Guide is directionally right but puts *bottom* in the expensive group; the rates put bottom in
the cheap group alongside belt/shoulder. Prefer the rates.)

### 1.4 The "% total" language players actually use — and why the tracker should use it too

**The whole calculator ecosystem expresses armor/accessory stat goals as a summed percentage
threshold, not a line count.** brendonmay's cubing calculator (the reference implementation),
Francesco149's cubecalc and Mastema all offer `N%+ Stat` ladders and none offers "2 lines of stat".
The reason is that %All Stat lines break line-counting: a 13% STR + 10% STR + 7% All Stat hat is
"3 lines" but only 23% STR.
<https://github.com/brendonmay/brendonmay.github.io/blob/master/cubingCalculator/updateDesiredStatsOptions.js> ·
<https://raw.githubusercontent.com/Francesco149/cubecalc/main/src/textfile.py> ·
<https://mastema.app/cube-calculator>

brendonmay generates the ladder as `prime = (allStat ? 0 : 3) + 3·tier + (level ≥ 160 ? 1 : 0)`,
then offers `prime·3 − 18, −15, −12, −9, −6, −3, prime·3`. For a Legendary lv160+ item that is
**21 / 24 / 27 / 30 / 33 / 36 / 39 %+**. That ladder is the best available answer to "what do
players chase on armor", and the tracker should copy it.



Players say "21% stat gloves" or "30% legendary", meaning the **sum of the %stat lines on the
item**, not a line count. The arithmetic, from the rank/level table
(<https://maplestorywiki.net/w/Potential>):

| Item level | rank | 1 stat line (prime) | 2 stat lines | 3 stat lines | all-prime |
|---|---|---|---|---|---|
| 71–150 | Unique | 9 | 9+6 = 15 | 9+6+6 = **21** | 27 |
| 71–150 | Legendary | 12 | 12+9 = 21 | 12+9+9 = **30** | 36 |
| **151+** | Unique | 10 | 10+7 = 17 | 10+7+7 = **24** | 30 |
| **151+** | **Legendary** | 13 | 13+10 = 23 | 13+10+10 = **33** | 39 |

So on modern Heroic gear (everything is 151+): **1L = 13%, 2L = 23%, 3L = 33%** and each extra
%stat line is worth ~+10 percentage points. Triple-prime only adds +3 over a normal 2-prime roll,
which is why nobody chases it on armor — the *line count* is the prize, not the prime count.

The Reboot Guide's own milestones use the older 71–150 bracket: *"settling for 27%s on 150 items
and 30%s on 160+ items"* and, one step earlier, *"Cubing gear to 21% stat"*.
<https://docs.google.com/document/d/132E6dGMNTRHwRh0wDU7xKZvW7f7xeBhR3VNs_2WQzrE/mobilebasic>
Translate to today's 151+ gear as **24% (3L Unique) → 33% (3L Legendary)**.

---

### 1.5 The community's vocabulary — map these strings onto the arithmetic

r/Maplestory names potential states with a fixed vocabulary, and it maps exactly onto the §1.4
arithmetic. The tracker should use these words, because they are what a user will type.

| Term | Means | lv 71–150 total | lv 151+ total |
|---|---|---|---|
| **2L** | two lines of the stat you want | 21% | 23% |
| **"fake 3L"** | 3 lines, one of them **%All Stat** (always 3% less than a single-stat line) | **27%** | **30%** |
| **"real 3L" / "true 3L"** | three genuine main-stat lines | **30%** | **33%** |
| **"double prime" / "DP"** | two *prime* lines, e.g. 13/13/10 | 33% | 36% |
| **"triple prime"** | 13/13/13 | 36% | 39% |

Verbatim definitions:
> *"Yeah fake lines typically include one or more All Stat % lines which are always 3% less than a
> single stat % line. 12/9/9 and 13/10/10 are real 3L while 12/6% all/9 or 9% all/9/9 would be fake
> 3L"* — <https://www.reddit.com/r/Maplestory/comments/1rsf1rp/cubing_strategy/oabvt8g/>

> *"'27%' is referred to as fake 3L. This is 2 mainstat 1 all stat line… the same bar is 30% on
> equipment level 160+"* —
> <https://www.reddit.com/r/Maplestory/comments/18f6cmb/reboot_cubing_after_27/kctfjbx/> ·
> *"true 3 line (30% and 33% for <200 or 200< gear respectively)"* —
> <https://www.reddit.com/r/Maplestory/comments/18f6cmb/reboot_cubing_after_27/kcs35r5/>

> *"It means you rolled a 13 13 13 triple prime on a level 151 item"* —
> <https://www.reddit.com/r/Maplestory/comments/1knrs2m/comparison_guide_for_how_much_starforcing_and/msm58db/>

**Note the naming trap for cubes.** Players call the Glowing Cube both *"red"* and *"blue"*, and the
Bright Cube both *"black"* and *"purple"*. The unambiguous discriminator in any thread is the price:
**12M = Glowing, 22M = Bright**. Parse on the number, not the colour.
<https://www.reddit.com/r/Maplestory/comments/18f6cmb/reboot_cubing_after_27/> ·
<https://www.reddit.com/r/Maplestory/comments/1p929bk/most_optimal_cubing_guide/>

---

## 2. The ladder — accepted order of operations

### 2.1a The current community ladder (r/Maplestory, 2026)

The clearest modern statement, from the top comment of a March 2026 cubing-strategy thread, is a
**meso-efficiency order**, not a per-slot checklist:

> *"in terms of meso efficiency, i believe it goes **2L wse > 2L stat > 3L usable (mix of boss/att,
> best if 2L att 1 boss) weapon secondary > 2L crit damage > fake 3L**."*
> — <https://www.reddit.com/r/Maplestory/comments/1rsf1rp/cubing_strategy/oa6ffxr/>

A second, fuller version in the same thread:

> *"If there's an order to things, I would generally say **2L WSE → 2L equips → 3L usable WSE →
> fake 3L/real 3L gear → 3L ideal on WSE → Real 3L on all gear**. After this is all up to the
> individual."*
> — <https://www.reddit.com/r/Maplestory/comments/1rsf1rp/cubing_strategy/oa8b5os/>

Three things to read out of this:

1. **It is breadth-first, not depth-first.** WSE goes first but *only to 2L*; then every other slot
   goes to 2L before anything is deepened. It is not "finish the weapon, then the armor".
2. **2L crit-damage gloves outrank "fake 3L" armor.** Stated directly: *"make sure you go for 2L
   crit glove before any fake 3L equipment attempts"*
   (<https://www.reddit.com/r/Maplestory/comments/1rsf1rp/cubing_strategy/oa6slun/>).
3. **"3L usable" on weapon/secondary means a mix**, ideally 2L ATT + 1 Boss — not 3L ATT.

Corroborating that WSE leads: *"The biggest way to get a notable increase in CP is getting lines of
attack on your secondary and emblem. This should be the first thing to focus on getting"*
(<https://www.reddit.com/r/Maplestory/comments/1ljqc72/reboot_question_about_challenger_gear_and/>).
An older Reboot guide's target table makes the same point structurally — Emblem at *Legendary 2L
ATT*, Secondary at *Legendary 1 IED + Boss or ATT*, while bossing armor is deliberately left at
*Epic 6% stat* (<https://www.reddit.com/r/Maplestory/comments/vncdyq/reboot_destiny_main_220235_ultimate_guide/>).

**Cube-before-Star-Force is repeatedly reversed by the community.** The most common answer to
"what should I cube next" is "don't — starforce instead":
*"Honestly it would be best to save your mesos for 5/10/15… Once everything is 17★ and 18%+, you can
definitely join a hard Lucid / Will party"*
(<https://www.reddit.com/r/Maplestory/comments/13grpp1/cubing_order/jk1i0dm/>);
*"the bonus attack will give you more damage per meso compared to cubing"*
(<https://www.reddit.com/r/Maplestory/comments/13j9dsw/progression_of_starforce_and_cubing/jkdxxvi/>).
The counterpoint applies only at the top of the ladder: *"I can assure you 3 lines is much much
cheaper than going to 22★"*
(<https://www.reddit.com/r/Maplestory/comments/1pbu9q4/gear_progression_after_sf_change/nrthy63/>).
**The tracker should compare the two directly with `gainPct` per meso rather than assume either.**

### 2.1b The historical ladder (2020 Reboot Guide)

The most-cited GMS Reboot progression text (4phantom1 / Pocketstream, "Maplestory Reboot Guide")
states the cost-efficiency order verbatim:

> *"Starforcing (non-tyrant) gear to 10/12 stars > Poorly Flaming Gear > Cubing gear to 21% stat >
> 17\* starring equips > 3L gear OR 21\* gear by transfer hammering -> cubing WSE for 3 useful lines
> E.g 2L ATT 1L IED/Boss > Flaming Gear Well > 22\* gear and perfecting WSE for 3L ATT"*
> — <https://docs.google.com/document/d/132E6dGMNTRHwRh0wDU7xKZvW7f7xeBhR3VNs_2WQzrE/mobilebasic>

and the cubing-priority order across slots:

> *"WSE > Badge/Shoulder/Boots/Belt > Hat/Top/Bottom > Drop Accessories > Damage Accessories"*
> — same source

with the reasoning: *"WSE provides the most damage boost due to %Att lines. Then, Badge/Shoulder/
Boots/Belt generally take less cubes to get a good % stat… Accessories come last because you'll be
using drop gear unless you're bossing."*

> **Age warning.** This guide predates the 30★ Star Force revamp (GMS v264, 2025-11-12), the v239
> cube renaming, the retirement of Potential Stamps and the GMS 151+ potential bracket. Its
> *ordering* is still the community reference; its cube names, star numbers and % milestones are
> stale. `formulas.md` §4A.0 has the version history.

Grandis Library's Progression Guide gives the same shape for the early game:

> *"In early game, all gear should be at least 9% Main Stat with Epic Potential. You will also want
> to working towards Unique Potential gear. Your main focus for this would be to try and get your
> Weapon, Secondary Weapon, and Emblem to unique first as their potentials can provide stats like
> %Attack/Magic Attack, %Ignore DEF and %Boss Damage unlike the rest of your gear."*
> — <https://grandislibrary.com/content/progression-guide>

### 2.2 The ladder, restated for the program

Each rung is a *stopping rule*, not a target to exceed. The tracker should propose the next rung,
never a rung two steps ahead.

| # | Rung | Condition to move on |
|---|---|---|
| 0 | Reveal potential on every filled slot; any cube brings an item to 3 lines automatically (stamps are retired — <https://maplestorywiki.net/w/Potential>) | every slot has 3 lines |
| 1 | **Epic, 1 line %main stat** on everything you will keep | all slots ≥ Epic with a stat line |
| 2 | **Unique on W / S / E first** — they are the only slots with ATT%/IED/Boss (<https://grandislibrary.com/content/progression-guide>) | WSE at Unique with ≥1 ATT% each |
| 3 | **Unique 3-line stat on armor/accessories** — the 2020 guide's "21%"; today's 151+ equivalent is **24%+** | armor at `24%+` |
| 4 | **Legendary on W / S / E**, roll to **2L ATT%** (~75–130 cubes each ≈ 0.9–1.5B with Glowing) | 2L ATT on each of W, S, E |
| 5 | **Legendary on armor**, roll to **2L %stat / `21%+`** (~35–50 cubes ≈ 0.4–0.6B per slot with Glowing) | `21%+` everywhere |
| 6 | **Gloves: 1 Critical Damage line** (~9 cubes ≈ 0.2B) | 1L crit damage |
| 7 | **"3L usable" on weapon + secondary** — a *mix*: ideally 2 ATT + 1 Boss (847 cubes ≈ 19B). Aim the whole set at a **9-line 8/1/0 or 7/2/0 budget** (§4.1) | 9 usable WSE lines |
| 8 | **Gloves: 2L Critical Damage** (~469 cubes ≈ 10.3B derived; community reports **387–400 bright cubes ≈ 8–10B**). Community places this **above** "fake 3L" armor | 2L crit damage |
| 9 | **"fake 3L" armor** — 3 lines where one is %All Stat: `27%` on ≤150 gear, **`30%` on 151+** (~250 cubes ≈ 3.0B with Glowing) | `30%` on 151+ |
| 10 | **"real 3L" armor** — three genuine main-stat lines: `30%` on ≤150, **`33%` on 151+** (~1,400 cubes ≈ 17B with Glowing) | `33%` on 151+ |
| 11 | **Hat: cooldown**, if the class wants one (§5) — the only published ladder is **−2s + 2L stat**, then **−4s + 1L stat** *"if you can afford it"* (<https://buffhero.win/>) | as the class dictates |
| 12 | **3L ideal on WSE** (3L ATT), then **double prime** on genuinely permanent items only. Effectively unbounded | — |

Rungs 4–6 are the cheap, high-value core: everything up to and including a 1L crit-damage glove
costs under ~1.5B per slot. Rungs 7–8 are the first 10–20B steps. Rung 10 is roughly **5–6× rung 9**
for the last 3 percentage points.

**DISPUTED — rung 8 versus Star Force.** The Reboot Guide explicitly presents this as a fork and does
not pick a winner:

> *"There are two ways to go about progression after you've reached 17 stars and 2 lines on your
> gear. If you are more casual then the next step should be to 3 line potential your gear… Cubing
> gear to 3L will be much cheaper than trying to reach 21+ stars on average. …The second way is for
> players that farm more and are willing to live with 2 line potential until their item is 21+
> stars through transfer hammering. Starforcing items on average is going to be much more expensive
> than cubing for armors and accessories. As you do lose your potential from transfer hammering,
> these players will save their mesos from cubing and put it toward reaching high starforce first."*
> — <https://docs.google.com/document/d/132E6dGMNTRHwRh0wDU7xKZvW7f7xeBhR3VNs_2WQzrE/mobilebasic>

The tracker is well placed to settle this per character: it can price rung 8 (≈16B for `33%+`,
§3.2c; ≈20–39B if you insist on three *main-stat* lines, §3.2) against the Star Force cost for the same slot and compare `gainPct`. Present both, do
not hard-code the guide's preference.

**The "sit on fake 3L" argument.** A widely-upvoted position says to skip the fake-3L → real-3L
step entirely unless you are already near the top:

> *"if you're going from 27% to 30%, you should just sit on the 27% until you're at the point where
> it's reasonable for you to go for 33% instead. 9% main stat is actually a lot more close to 6% all
> stat than most people think, and if youre at near/full 22★ with 27% gear then making the step up to
> 30% probably doesn't have any meaningful impact on your bossing."*
> — <https://www.reddit.com/r/Maplestory/comments/18f6cmb/reboot_cubing_after_27/kcuhwjy/>

> *"Just leave it. Save meso for starforce. Extra 3% stat can add up across multiple items but wont
> increase ur dmg as much as you'd expect."*
> — <https://www.reddit.com/r/Maplestory/comments/18f6cmb/reboot_cubing_after_27/kcvt4zh/>

**Double prime is discouraged for almost everyone, and it is gated behind Star Force.** The most
detailed statement:

> *"1. You actually don't want double prime on a lot of equipment because it's going to get replaced
> in short order… 4. You are not going to double prime your gear. Let's be real… It's on about the
> same meso efficiency as unironic 23★ items. **You do real 3L, optimized WSE, ~10b+ flames, and
> double prime WSE first.**"*
> — <https://www.reddit.com/r/Maplestory/comments/18f6cmb/reboot_cubing_after_27/kctfjbx/>

> *"A lot of items are not worth double priming. **None of the arcane equips are worth double
> priming.** Anything non-pitched isn't worth double priming. None of the Gollux equips are worth
> double priming (yes, even the Superior Gollux Ring)… you only go for double primes that are real
> BIS. Not 'BIS because it's so good' but actually 'BIS because literally nothing in the next 10
> years of this game will ever beat this'."*
> — <https://www.reddit.com/r/Maplestory/comments/18f6cmb/reboot_cubing_after_27/kctvmjv/>

> *"Double prime not really worth it until your items are like 24+ as stars > double prime"*
> — <https://www.reddit.com/r/Maplestory/comments/1rtzumy/cubing_priority_order_sheet/oaicjy0/>

The milestone people describe before touching DP is **"full 22★ real-3L on everything"**, and even
players who reach it often report regretting the spend: *"I honestly think that dp and 23★ aren't
worth it, I'd rather fund a full 22★ 3L char again"*
(<https://www.reddit.com/r/Maplestory/comments/1cr2opa/how_do_yall_end_game_players_have_the_sanity_to/>).
**How many players are actually there is DISPUTED** — one estimate of *"like 50 people on reboot"*
was answered with *"Probably half of the people in the top 5 guilds are at or close to that point.
That's already 500ish"*
(<https://www.reddit.com/r/Maplestory/comments/18f6cmb/reboot_cubing_after_27/kcuhwjy/>).

**Triple prime is never a plan.** No thread advocates it as a goal; it appears only as a flex-post
outcome. The tracker should never generate a triple-prime candidate.

### 2.2b Never cube gear you will replace — the specific list

This is the most consistently repeated rule in every Reboot thread read. Transfer Hammer caps
carried potential at Epic, so anything destined to be foddered should stay Epic.

| Item | Community rule | Source |
|---|---|---|
| CRA (hat/top/bottom/weapon) | *"I would keep your CRA weapon at epic and work on your other gear. Since you will probably fodder the CRA into Abso weapon"* | <https://www.reddit.com/r/Maplestory/comments/1fe50uq/legendary_cubing_reboot/lmkv3sj/> |
| CRA, if you still have item burning | *"I wouldn't bother with CRA at all. You're wasting money if you cube new cras to legendary or starforce them above 17★"* | <https://www.reddit.com/r/Maplestory/comments/1q07t0w/what_exactly_is_the_meta_gear_progression/> |
| Absolab | *"I wouldn't touch the abso as you'll be upgrading to arcanes."* · *"No reason to specifically aim for 2L crit on AbsoLab gloves"* | <https://www.reddit.com/r/Maplestory/comments/13grpp1/cubing_order/jk1i0dm/> · <https://www.reddit.com/r/Maplestory/comments/1coonjr/2_line_crit_damage_glove/l3g3u7l/> |
| Arcane **weapon + emblem** | *"I would leave the arcane weapon and emblem as is since those will be replaced eventually by genesis weapon and seren emblem."* · *"I wouldn't recommend going past 2.5 lines across weapon and emblem until you get genesis weapon and mitras."* | <https://www.reddit.com/r/Maplestory/comments/1msjykl/cubing_priority/n950lrh/> · <https://www.reddit.com/r/Maplestory/comments/1rsf1rp/cubing_strategy/oa7bofl/> |
| Transition accessories (golden clover belt, enraged Zak cape) | *"don't cube it beyond epic. Just get them to 16★ so they can be transferred up to gollux/abso."* | <https://www.reddit.com/r/Maplestory/comments/13j9dsw/progression_of_starforce_and_cubing/jkdxxvi/> |
| Zak face/eye, HT earring/ring | **Exception** — worth Legendary *because they become drop/meso gear later* | same source |
| **Permanent, full-send items** | class secondary / PNO (*"you will keep it forever until they add a replacement"*), pitched items, eternals, Slime Ring (*"even now with the limbo ring its still BIS"*) | <https://www.reddit.com/r/Maplestory/comments/1msjykl/cubing_priority/n96ljkz/> · <https://www.reddit.com/r/Maplestory/comments/1jltvj5/crafting_drop_gear_when_double_prime_for_2b_is_it/mk6imvh/> |
| Eternal ordering | *"IMO your first Limbo Eternal should be glove, it's the most expensive to cube and worth 2L CD+stat."* | <https://www.reddit.com/r/Maplestory/comments/1qrs7gz/eternal_armor_progression_questions/o2qi1mq/> |

The per-item policy, stated cleanly:
> *"If it's a permanent item such as eternals/pitch, I use glowing cubes up to fake 3L, then I use
> bright cubes for real 3L with a better chance for double prime. Other items that are not as
> permanent, I will generally just use glowing cubes and leave them at fake/real 3L depending on how
> soon I will replace it."*
> — <https://www.reddit.com/r/Maplestory/comments/1rsf1rp/cubing_strategy/oa8b5os/>

**Caveat added by the 2025 Star Force revamp:** laddering spare items to 23–25★ forces re-cubing, so
"permanent" is now weaker than it was. *"for any gear that ends up getting replaced (cra, arcanes,
gollux), 21★ settle is the move… For gear that is more long term (pitched, eternals)… you want 2
sets that you ladder"*
(<https://www.reddit.com/r/Maplestory/comments/1pbu9q4/gear_progression_after_sf_change/nrtti75/>).

**Tracker rule:** every `Item` needs a `permanence` field (`disposable | transitional | permanent`).
Generate no potential candidate above Epic for `disposable`, cap `transitional` at "fake 3L", and
allow the full ladder only on `permanent`.

### 2.3 Tier-up versus rerolling at the current tier

The conventional wisdom, and it is confirmed by the numbers:

- **Tier up with Bright Cubes; reroll lines at Legendary with Glowing Cubes.** Reboot Guide:
  *"Red cubes are primarily used to reroll gear that is already legendary… Black cubes are
  primarily used for tiering up potential, as they have a higher success rate."*
  (Red = Glowing, Black = Bright after the v239 rename — <https://maplestorywiki.net/w/Cube>.)
  <https://docs.google.com/document/d/132E6dGMNTRHwRh0wDU7xKZvW7f7xeBhR3VNs_2WQzrE/mobilebasic>

- **DERIVED confirmation, tier-up.** Using GMS rank-up rates (`formulas.md` §4A.3.5) and Heroic
  prices: Epic→Unique costs ~200M with either cube (Bright 9.1 cubes × 22M; Glowing 16.7 × 12M);
  Unique→Legendary costs **~468M with Bright** (21.3 cubes) vs **~500M with Glowing** (41.7 cubes).
  Bright is cheaper *and* non-destructive, so it wins outright for tier-up. Total Epic→Legendary
  ≈ **670M mesos per item**.

- **DERIVED confirmation, rerolling.** Once Legendary, for any target whose line exists in **both**
  pools (%stat, ATT%, IED, Boss, Crit Rate), the Glowing Cube is roughly **half the cost** of the
  Bright Cube, because extra prime lines do not help — the non-prime version of the line counts
  too. Example: 2 lines of %main stat on a hat is 45 Bright cubes (0.98B) or 45 Glowing cubes
  (0.54B). For targets in the **prime-only** set (crit damage, cooldown, meso/drop, IED 35/40,
  Boss 35/40), Bright wins: 2L crit-damage gloves is 469 Bright (10.3B) vs 1,092 Glowing (13.1B).

- **DISPUTED — does the Glowing Cube destroy your old potential?**
  *Position A (wiki):* <https://maplestorywiki.net/w/Cube> lists *"Lets you choose the Potential
  before or after"* under Bright Cube **only**, implying Glowing applies destructively.
  *Position B (players):* r/Maplestory describes both as offering a keep/discard step, with the
  difference being only animation timing — Glowing *"shows the result simultaneously with the reset
  button"* (causing misclicks) while Bright *"updates the stats FIRST then runs the animation so
  accidently over clicking isnt an issue"*
  (<https://www.reddit.com/r/Maplestory/comments/1rufmpv/cubing_tip_for_glowing_cube/oal88b6/>).
  No thread was found describing the loss of a good potential to a Glowing cube, which is weak
  evidence for Position B. **Do not build the recommendation on this.** The cube choice below rests
  on the cost math, which is independent of it.

- **The community's own cube rubric matches the derived math exactly.** The most-copied version:
  > **Bright/Black:** *"To tier up / To get double prime lines (e.g. 2L crit damage, 2L CD hat) / To
  > reroll a good 3Ls to better 3L (e.g. 30% → 33%) / To perfect items"*
  > **Glowing/Red:** *"To cube at legendary for a useable 2L / During a large sale… to get better
  > 3Ls / To reroll a weak 3L/2.5L/2L to a good 3L"*
  > — <https://www.reddit.com/r/Maplestory/comments/12mlhfi/glowing_cube_vs_bright_cube_for_ranking_up/jgb901y/>

  and the same comment's summary: *"Using 22m cubes to rank up is the better play overall… Once leg,
  definitely only use 12m cubes unless it is your glove or you start trying to improve fake 3L
  equips."* The stated crossover: **"Glowing is cheaper for 30+. Bright is cheaper for 33+."**
  (<https://www.reddit.com/r/Maplestory/comments/18f6cmb/reboot_cubing_after_27/kcs8hkl/>) — which is
  the §3.2c table restated. Dissent exists (*"In almost every case, 33% is much more cost efficient
  via reds"* — <https://www.reddit.com/r/Maplestory/comments/18f6cmb/reboot_cubing_after_27/kczzlly/>),
  so treat the crossover as approximate.

- **Auto Steal on gloves is gated to the free in-game cubes.** The Auto Steal lines exist only in
  the Solid/Meister and Hard/Master pools — **never in Glowing or Bright**. The Reboot Guide says
  the same: *"At unique, any cube can roll this line. At legendary only Meister cubes can roll this
  line."* With a Solid Cube a single Auto Steal line lands ~48.8% of the time (mean 2 cubes).
  <https://docs.google.com/document/d/132E6dGMNTRHwRh0wDU7xKZvW7f7xeBhR3VNs_2WQzrE/mobilebasic>
  If the tracker ever models farming gloves it must gate the cube type, not just the line.

- **The game itself now encodes stopping points.** The Auto Enhancement System requires Legendary
  rank, then *"Auto Enhance button can be pressed to set the desired target lines and values…
  Auto enhancements will stop when the reset Potential satisfy all of the target values."* There is
  also a *"Stop Reset on Combat Power Increase"* option, *"only applicable to Cubes that allow
  keeping the existing Potential lines"* — i.e. Bright.
  <https://maplestorywiki.net/w/Potential>
  This is the closest thing to an official answer to "what is a stopping point": a per-item target
  line set. The tracker should emit exactly that shape.

### 2.4 Where the standard heuristics come from, and where they break

**"%stat lines first, then boss/IED on weapon-secondary-emblem."** The origin is structural, not
folklore: %ATT, IED and Boss Damage exist **only** in the WSE pools, while %stat exists everywhere,
so WSE is the only place those lines can ever be obtained
(<https://grandislibrary.com/content/progression-guide>,
<https://strategywiki.org/wiki/MapleStory/Potential_System>). The commonly-quoted WSE goal is:

> *"An easy and GENERAL rule to follow is aim for 200% boss damage and 93% IED. This should enable
> you to do most endgame 300% PDR bosses such as Chaos Vellum, Lotus, Damien and Lucid if you also
> have the appropriate range."*
> — <https://docs.google.com/document/d/132E6dGMNTRHwRh0wDU7xKZvW7f7xeBhR3VNs_2WQzrE/mobilebasic>

**Where it breaks.**

1. **IED is multiplicative, so 93% is a *composed* total, not a sum of lines.** `1 − Π(1−sᵢ)`
   (`formulas.md` §1.8, §3.1). The marginal value of the next IED line collapses as you approach
   the target — the same guide notes classes with large innate IED *"only require around 90% IED
   (or less) in their stat window"*. For the five priority classes the innate IED spread is
   34.98% (Wind Archer) – 50% (Hero) (§5.1), so the number of IED lines needed differs materially
   by class. **The tracker must compute this per character, never quote 93%.**
2. **"200% boss" is a fixed target that ignores boss damage from links, legion, Inner Ability and
   hyper stats.** Ren has **0%** innate boss damage and Wind Archer has **+40%**
   (<https://grandislibrary.com/anima/ren>, <https://grandislibrary.com/cygnus-knights/wind-archer>)
   — the same gear leaves them in very different places.
3. **The heuristic treats a 3-useful-line WSE as routine.** It is not, at Heroic prices. 3L ATT% on
   a weapon is a DERIVED 4,550 Bright cubes (~104B including the reveal fee) against 94 cubes
   (~2.1B) for 2L ATT — a **48× step**. (Note that 3L ATT does *not* require triple prime: the
   Legendary non-prime pool contains ATT% at 10%, so 13/10/10 counts. The cost comes from three
   lines all landing in one category, not from three primes.) 2 ATT + 1 Boss is the realistic
   third-line target at 847 cubes (~19B).
4. **Sources disagree about the IED target by 7 percentage points** — 90% / 93% / 95% / 96% / 97%
   depending on who is asked and at what progression stage. The full table is in §5.7. That spread
   is worth several IED lines, which is why a fixed threshold is the wrong output.
5. **%Damage lines.** Both major guides say discard them — the Reboot Guide in capitals
   (*"'DAMAGE' LINES SUCK, THEY PROVIDE A MINIMAL DAMAGE BOOST COMPARED TO ATT"*), Grandis Library
   as *"do not keep %Damage lines as they do not provide as much as a boost as the other potential
   lines do"*. The mechanical reason: %Damage and %Boss enter the *same* additive bucket
   `(1 + dmg% + boss%)` (`formulas.md` §1.13), so a 13% Damage prime is strictly a worse 35–40%
   Boss prime for bossing; ATT% multiplies a different factor entirely.
   **DISPUTED (mild):** %Damage does apply to normal mobs where %Boss does not, so it is not
   literally worthless for a farming set — but the community consensus is to reroll it.
   <https://docs.google.com/document/d/132E6dGMNTRHwRh0wDU7xKZvW7f7xeBhR3VNs_2WQzrE/mobilebasic> ·
   <https://grandislibrary.com/content/progression-guide>

**"Don't cube gear you will replace."** The guide's version: *"Start cubing once you have the
Absolab Gloves, leave your Pensalir at Epic"* and *"Try to keep your Pensalir gear epic, as if you
transfer a unique or legendary potential, it will get downgraded to epic"* — because Transfer
Hammer caps transferred potential at Epic and costs one star.
<https://docs.google.com/document/d/132E6dGMNTRHwRh0wDU7xKZvW7f7xeBhR3VNs_2WQzrE/mobilebasic> ·
<https://grandislibrary.com/content/progression-guide>
**Tracker rule:** never recommend cubing an item flagged as a transfer-hammer donor, and never
recommend cubing above Epic on an item that will be hammered.

**"Per-slot WSE goals" is itself the outdated part.** Modern guides set a **9-line budget across
weapon + secondary + emblem** rather than three independent targets — see §4.1. That is the framing
the tracker should adopt.

---

## 3. Economics

### 3.1 Prices (Heroic)

| Cube | Rank ceiling | Choose before/after? | Heroic price |
|---|---|---|---|
| Mystical Cube | Epic | no | drop/craft |
| Hard Cube (+ Karma) | Unique, up to 2 ranks | no | drop/craft/store |
| Solid Cube (+ Karma) | Legendary, 2 ranks if Rare | no | drop/craft |
| **Glowing Cube** | Legendary, up to 2 ranks | **no** | **12,000,000 mesos** |
| **Bright Cube** | Legendary, up to 2 ranks | **yes** | **22,000,000 mesos** |
| Violet Cube (choose 3 of 6) | — | choose lines | NX price listed as `???`; **UNVERIFIED** whether it is meso-purchasable in Heroic |

<https://maplestorywiki.net/w/Cube> · `formulas.md` §4A.3.7

Bonus Potential cubes are irrelevant: Bonus Potential does not exist in Heroic worlds.
<https://maplestorywiki.net/w/Potential>

### 3.2 DERIVED budget per slot — the number the tracker should quote

Expected cubes to first hit, two-pool model (§7), Bright Cube unless stated. **These are means of a
geometric distribution — the median is ~0.69× and the 90th percentile ~2.3× the mean.** The
tracker should present a range, not a point estimate.

| slot | 2L main-stat (Bright) | 2L (Glowing) | 3L main-stat (Bright) | 3L (Glowing) | 3L stat-or-allstat (Bright) | 3L stat-or-allstat (Glowing) |
|---|---|---|---|---|---|---|
| hat | 45 cubes / 0.98B | 45 / 0.54B | 1,413 / 31.1B | 1,412 / 16.9B | 251 / 5.5B | 250 / 3.0B |
| top / overall | 51 cubes / 1.13B | 52 / 0.63B | 1,771 / 39.0B | 1,827 / 21.9B | 315 / 6.9B | 323 / 3.9B |
| bottom | 38 cubes / 0.83B | 39 / 0.46B | 1,102 / 24.2B | 1,134 / 13.6B | 196 / 4.3B | 201 / 2.4B |
| gloves | 47 cubes / 1.04B | 48 / 0.57B | 1,549 / 34.1B | 1,568 / 18.8B | 275 / 6.1B | 278 / 3.3B |
| shoes | 40 cubes / 0.89B | 41 / 0.49B | 1,218 / 26.8B | 1,238 / 14.9B | 216 / 4.8B | 219 / 2.6B |
| cape / belt / shoulder | 35 cubes / 0.77B | 35 / 0.42B | 970 / 21.3B | 987 / 11.8B | 172 / 3.8B | 175 / 2.1B |
| face / eye / ring / earring / pendant | 33 cubes / 0.72B | 32 / 0.38B | 872 / 19.2B | 849 / 10.2B | 155 / 3.4B | 150 / 1.8B |
| heart / badge | 25 cubes / 0.55B | 25 / 0.31B | 580 / 12.8B | 591 / 7.1B | 103 / 2.3B | 105 / 1.3B |

Reading: on a hat, **two** %main-stat lines cost ~45 cubes; the **third** costs ~1,413 — 31× more
for the same +10 percentage points of stat. That ratio is the whole argument for "double, then
stop". Accepting **%All Stat as a stat line** collapses the 3-line cost by ~5–6× (hat: 1,413 → 251
cubes) and is the single best value-per-meso move on armor.

**W / S / E budget** (DERIVED, same model):

| target | cube | expected cubes | expected mesos |
|---|---|---|---|
| weapon: 1 line ATT% | Glowing | 6 | 0.1B |
| weapon: **2 lines ATT%** | Glowing | 91 | 1.1B |
| weapon: 3 lines ATT% | Glowing | 4,355 | 52.3B |
| weapon: 2 ATT + 1 Boss | Bright | 847 | 18.6B |
| weapon: 2 ATT + 1 IED | Bright | 1,087 | 23.9B |
| weapon: 1 ATT + 2 Boss | Bright | 536 | 11.8B |
| weapon: 1 ATT + 2 IED | Bright | 819 | 18.0B |
| weapon: 2 Boss + 1 IED | Bright | 433 | 9.5B |
| weapon: 3 Boss lines | Bright | impossible (line cap) | — |
| weapon: 3 IED lines | Bright | impossible (line cap) | — |
| secondary: 1 line ATT% | Glowing | 7 | 0.1B |
| secondary: **2 lines ATT%** | Glowing | 125 | 1.5B |
| secondary: 3 lines ATT% | Glowing | 7,004 | 84.1B |
| secondary: 2 ATT + 1 Boss | Bright | 1,355 | 29.8B |
| secondary: 2 ATT + 1 IED | Bright | 1,740 | 38.3B |
| secondary: 1 ATT + 2 Boss | Bright | 854 | 18.8B |
| secondary: 1 ATT + 2 IED | Bright | 1,308 | 28.8B |
| secondary: 2 Boss + 1 IED | Bright | 689 | 15.2B |
| secondary: 3 Boss lines | Bright | impossible (line cap) | — |
| secondary: 3 IED lines | Bright | impossible (line cap) | — |
| emblem: 1 line ATT% | Glowing | 5 | 0.1B |
| emblem: **2 lines ATT%** | Glowing | 75 | 0.9B |
| emblem: 3 lines ATT% | Glowing | 3,195 | 38.3B |
| emblem: 2 ATT + 1 IED | Bright | 787 | 17.3B |
| emblem: 1 ATT + 2 IED | Bright | 590 | 13.0B |
| emblem: any Boss Damage line | — | impossible (not in the emblem pool at any tier) | — |

**Prime-only targets** (DERIVED; these do not benefit from the non-prime pool, so Bright wins):

| target | cube | expected cubes | expected mesos |
|---|---|---|---|
| gloves: **1 Critical Damage line** | Bright | 9 | 0.20B |
| gloves: 1 Crit Damage + ≥1 %main stat | Bright | 55 | 1.2B |
| gloves: 2 Critical Damage lines | Bright | 469 | **10.3B** |
| gloves: 2 Crit Damage (Glowing) | Glowing | 1,092 | 13.1B |
| gloves: 3 Critical Damage lines | Bright | 133,100 | **2,928B** |
| hat: 1 cooldown line (−1s or −2s) | Bright | 7 | 0.16B |
| hat: 1 cooldown line, must be −2s | Bright | 18 | 0.40B |
| hat: 1 cooldown + 2 %main stat | Bright | 905 | 19.9B |
| hat: 2 cooldown lines | Bright | 314 | 6.9B |
| hat: 2× (−2s) | Bright | 1,954 | 43.0B |
| hat: 3 cooldown lines | Bright | 72,902 | **1,604B** |
| accessory: 1 Meso Obtained +20% line | Bright | 12 | 0.26B |
| accessory: 2 Meso lines on one item | Bright | 794 | 17.5B |
| accessory: 2 Drop Rate lines on one item | Bright | 797 | 17.5B |
| accessory: 3 Drop Rate lines | — | impossible (capped at 2) | — |

### 3.2b Cross-validation against the reference implementation

The §7 model was checked against **brendonmay's cubing calculator engine**
(<https://brendonmay.github.io/cubingCalculator/>, source at
<https://github.com/brendonmay/brendonmay.github.io/tree/master/cubingCalculator>), driven directly
in Node with its own `cubeRates.js` / `getProbability.js`. The WSE results agree to the digit:

| target | this model | brendonmay's engine |
|---|---|---|
| weapon 2L ATT | 94 cubes (1.0617%) | 94 (1.06%) |
| weapon 2L ATT + 1L Boss | 847 (0.1180%) | 847 (0.118%) |
| weapon 1L ATT + 2L Boss | 536 (0.1867%) | 536 (0.187%) |
| weapon 3L ATT | 4,550 (0.0220%) | 4,550 (0.0220%) |
| secondary 2L ATT | 128 | 128 |
| secondary 3L ATT | 7,290 (0.0137%) | 7,290 (0.0137%) |
| emblem 2L ATT | 77 (1.3005%) | 77 (1.30%) |
| emblem 3L ATT | 3,306 (0.0302%) | 3,306 (0.0302%) |

That is strong evidence the model and the StrategyWiki rate table are being read correctly, and
that the reference tool uses the same un-renormalised line pool (see the §7 caveat).

**brendonmay's own cost model is the ecosystem standard**, and it is Reboot-native — the tool has
no Reboot toggle because meso pricing *is* the Reboot model:

```js
case "red":    return 12000000;   // Glowing Cube
case "black":  return 22000000;   // Bright Cube
case "master": return  7500000;   // Hard Cube
default:       return 0;          // Mystical, Solid
// plus a per-cube reveal fee: revealConst(level) × level²
// revealConst = 0 (<30) / 0.5 (≤70) / 2.5 (≤120) / 20 (>120)
```
<https://github.com/brendonmay/brendonmay.github.io/blob/master/cubingCalculator/cubes.js>

That reveal fee makes a Bright Cube cost **22,512,000 at item lv160 · 22,800,000 at lv200 ·
23,250,000 at lv250** — a 1–6% uplift on the flat 22M used throughout §3. MapleIsland uses the
identical table (<https://www.mapleisland.app/cube>). The tracker should adopt this formula.

### 3.2c The armor stat ladder, as the calculators express it

brendonmay's `N%+ Stat` ladder for a **Legendary lv160+** item, expected Bright Cubes (the tracker
should present this rather than a line count — §1.4):

| target | expected Bright cubes | 95th percentile | ≈ mesos |
|---|---|---|---|
| 21%+ | **39** | 115 | 0.88B |
| 24%+ | 140 | 418 | 3.15B |
| 27%+ | 210 | 627 | 4.73B |
| 30%+ | 293 | 877 | 6.60B |
| 33%+ | **701** | 2,099 | 15.8B |
| 36%+ | 4,155 | 12,446 | 93.5B |
| 39%+ | 107,691 | 322,612 | 2,424B |

(For a lv150 item shift the ladder down one step: 18/21/24/27/30/33/36.) Note 39%+ — triple prime
main stat — costs **1,076,471 Glowing cubes** versus 107,691 Bright, a 10× gap, because that target
needs three primes and Glowing's 2nd/3rd prime rates are 0.1/0.01 against Bright's 0.2/0.05. This is
the clean statement of the Glowing-vs-Bright rule in §2.3.

### 3.2d The cooldown-hat ladder (hat, Legendary, lv160+, Bright)

Cooldown targets are stated in **total seconds**, not lines. Expected cubes:

| target | p | expected cubes | 95th | ≈ mesos |
|---|---|---|---|---|
| −2s+ | 6.183% | **16** | 47 | 0.36B |
| −2s + 1L stat | 1.945% | 51 | 153 | 1.15B |
| −2s + 2L stat | 0.182% | **551** | 1,648 | 12.4B |
| −3s+ | 0.246% | 406 | 1,215 | 9.1B |
| −4s+ | 0.0625% | **1,599** | 4,790 | 36.0B |
| −4s + 1L stat | 0.0107% | 9,354 | 28,020 | 210B |
| −5s+ | 0.0006% | 156,637 | 469,241 | 3,526B |
| −6s+ | 0.0001% | 861,538 | 2,580,937 | 19,395B |

Note the cliff between −4s (1,599 cubes) and −5s (156,637): −5s needs two −2s lines *plus* a −1s.
**−4s is the practical ceiling; −5s and −6s are unreachable.** These figures use the KMS rate
snapshot (−1s 7.32% / −2s 4.88% on line 1) rather than StrategyWiki's MSEA figures (6.67% / 4.44%),
which is why "−2s+" here is 16 cubes and §3.2's "1 cooldown line" is 18. Treat the two as a ±15%
band, not a contradiction.

A Solid (Meister) cube reaches −2s about as easily as Bright (mean 16) **and is free**, but is
hopeless beyond that (−4s = 67,876 cubes) because its 2nd/3rd-line prime rates are ~100× worse.
**Recommendation the tracker can make: farm Solid Cubes for the −2s hat; only spend Bright on −4s.**

All figures in §3.2b–3.2d are **[computed]** by executing brendonmay's published engine, not quoted
from a page.

### 3.3 Is there a "cube until double prime, then stop" convention?

Yes in substance, no in that exact wording. What the sources actually say:

- **On WSE:** *"If you've just started cubing your gear, 2L att with any third line of potential is
  fine because 2L att is fairly difficult to get already."*
  <https://docs.google.com/document/d/132E6dGMNTRHwRh0wDU7xKZvW7f7xeBhR3VNs_2WQzrE/mobilebasic>
- **On gloves:** *"Most people settle for 1L Crit dmg with other suboptimal potentials."* (same)
- **On triple:** *"having triple prime lines is a very rare feat that only super-min/maxing endgame
  players will go for."* (same)
- **On armor:** the ladder step is *"Cubing gear to 21% stat"* — which at 71–150 is a 3-line Unique
  with a single prime, i.e. explicitly **not** a prime-count target. (same)

From r/Maplestory, the same convention stated at each wealth level:

- Poor: *"with only 5 bil you should prob just 2L uniq everything before spending half your money on
  one legendary equip"*
  (<https://www.reddit.com/r/Maplestory/comments/145hvqc/whats_the_most_youve_spent_cubing_from_unique_to/jnl4hky/>)
- F2P: *"As a F2P 2 line stat is what you want, ideally 3 line but that's a luxury you have to pay
  for or get very lucky"*
  (<https://www.reddit.com/r/Maplestory/comments/1f7bguq/should_i_keep_the_23_str_or_keep_cubing_for/ll74h8v/>)
- Mid: *"Your gear is fine, 18-21% is good enough."*
  (<https://www.reddit.com/r/Maplestory/comments/13grpp1/cubing_order/jk1i0dm/>)
- The modal endpoint: *"Most people, majority of people will settle with perfect 3l before dipping
  their feet on double prime."*
  (<https://www.reddit.com/r/Maplestory/comments/18f6cmb/reboot_cubing_after_27/kct7kel/>)
- Bossing mules: *"everything 17 starred and 12+% stat"* with *"empress gloves (cubed for 1L crit
  dmg)"*
  (<https://www.reddit.com/r/Maplestory/comments/18gpkyq/what_equipment_is_good_to_aim_for_when_it_comes/kd20lfq/>);
  *"I just 21% everything (or better if I get lucky), with 1 line crit dmg + 1 line stat on gloves"*
  (<https://www.reddit.com/r/Maplestory/comments/1s4wjuq/ctene_mules_cubing_breakpoint/ocq81zv/>)
- Per-slot done-states on WSE: *"Most you aim for on arcane weapons are 23 att 30 boss or ied, and
  21 att 30 ied or 9/12 dmg / double prime att emblem. Some of my chars I'll leave at 12 att 40 ied
  and filler stat for the emblem. PNO or class specific secondary you can full send to 3L or double
  prime."*
  (<https://www.reddit.com/r/Maplestory/comments/1rsf1rp/cubing_strategy/oa7bofl/>)
- And the gating heuristic for whether DP is even on your ladder: *"This is one of those things if
  you have to ask, you are not there yet at that kind of progression level."*
  (<https://www.reddit.com/r/Maplestory/comments/18f6cmb/reboot_cubing_after_27/kct7kel/>)

So the accepted convention is better stated as **"cube to the second line of the category you want,
then stop"**, with "line" meaning prime *or* non-prime — except on the prime-only lines (crit
damage, cooldown, meso/drop, IED 35/40, Boss 35/40) where the second copy genuinely is a
double-prime and costs accordingly.

### 3.4 Realistic whole-character budgets (DERIVED, illustrative)

Assumes Epic starting point, Bright for tier-ups (670M/item), then the per-slot line budgets above.

| Milestone | Slots | Cube cost |
|---|---|---|
| WSE to Legendary + 2L ATT each | 3 | 3 × 0.67B tier-up + (1.1 + 1.5 + 0.9)B lines ≈ **5.5B** |
| Armor (hat, top, bottom, shoes, gloves, cape, shoulder, belt) to Legendary + 2L stat | 8 | 8 × 0.67B + ~7.2B ≈ **12.6B** |
| Accessories (2 pendant, 4 ring, earring, face, eye) + heart + badge to Legendary + 2L stat | 11 | 11 × 0.67B + ~7.5B ≈ **14.9B** |
| Gloves 1L crit damage (on top of the above) | 1 | ~0.2B |
| **Running total for a fully "2-line" character** | 22 | **≈ 33B mesos** |
| Upgrade all armor+accessory to 3 stat lines (counting %All Stat) | 19 | **≈ +80B** |
| Upgrade all armor+accessory to 3 *main-stat* lines | 19 | **≈ +450B** |
| 2L crit damage gloves | 1 | +10.3B |
| 3L ATT on all of W/S/E | 3 | +175B |

**UNVERIFIED:** no source was found publishing observed player spend per slot in Heroic. The
numbers above are expectations from published rates, not survey data. Do not present them as
"what players spend"; present them as "what this target costs on average".

### 3.5 Events that move the numbers

- **Double Miracle Time (DMT)** doubles rank-up chance (and, historically, allows a double rank-up
  in one reset), and has historically come with a cube discount: *"black cubes are 25% less and
  reds are 20% less. Rarely, they are both 30% off."* Recent DMTs have instead offered limited
  discounted packs, *"30 cubes each … limited to only 3 packs per type"*.
  <https://docs.google.com/document/d/132E6dGMNTRHwRh0wDU7xKZvW7f7xeBhR3VNs_2WQzrE/mobilebasic>
  DMT does **not** change line-roll probabilities — only tier-up. So **DMT is for rung 4/5
  tier-ups; ordinary weeks are for line rerolls.**
- **UNVERIFIED:** current (2026) GMS DMT discount percentages and whether the general cube sale has
  returned. `formulas.md` §4A.3.5 also flags that the GMS rank-up percentages predate the v239
  cube rename and *may* be stale — every tier-up cost in §3.2/§3.4 inherits that uncertainty.

---

## 4. Named line combinations — the way players say them

Abbreviations follow the Reboot Guide: *"2L Att = 2 lines of Att, IED = Ignore Enemy Defense,
Boss = Boss Damage, DSE = Decent Sharp Eyes, DSI = Decent Speed Infusion"*.
<https://docs.google.com/document/d/132E6dGMNTRHwRh0wDU7xKZvW7f7xeBhR3VNs_2WQzrE/mobilebasic>

**Weapon / secondary** — the guide's own list, in its own order:
> *"You should aim for 2L Att 1L IED, 3l Att, 2L Att 1L Boss, 1L Att 2L Boss"*

| Name | Meaning | Reality |
|---|---|---|
| **"2L att"** | two ATT% lines (13+10 = 23% ATT at 151+) | the accepted stopping point |
| **"3L att"** | three ATT% lines (13+10+10 = 33%) | endgame; ~4,355 Glowing cubes on a weapon |
| **"2L att 1L IED"** | 2× ATT% + one IED line | ~1,087 Bright cubes |
| **"2L att 1L boss"** | 2× ATT% + one Boss line | ~847 Bright cubes (weapon/secondary only) |
| **"1L att 2L boss"** | one ATT% + two Boss lines | ~536 Bright cubes — the cheapest 3-useful-line weapon |
| **"2L boss 1L IED"** | two Boss + one IED | ~433 Bright cubes; no ATT% at all — DISPUTED as a target, see below |
| **"3L boss" / "3L IED"** | — | **impossible**, both are capped at 2 lines per item |

**Emblem** — same names minus boss: **"2L att"**, **"2L att 1L IED"**, **"1L att 2L IED"**. There
is no such thing as a boss-damage emblem.

**Gloves**: **"1L crit dmg"** (the real target) · **"2L crit dmg"** (*"you are godly"*) ·
**"3L crit dmg"** (*"go to the lottery or you're a hacker"*) · **"DSE gloves"** / **"DSI gloves"**
(Decent Sharp Eyes / Decent Speed Infusion, valued for saving V-matrix node slots:
*"you can roll potential lines that enable you to use DSI and DSE which are decent and save you
node slots"*).

**Hat**: **"cooldown hat"** / **"CD hat"** (one or more Skill Cooldown lines) · **"stat hat"**
(2–3 %main stat) · **"2L stat + CD"**. Note that a cooldown line and a stat line compete for the
same three rows, so a cooldown hat is *by construction* a weaker stat hat.

**Armor generally**: **"2L stat"**, **"3L stat"**, and the summed forms **"21%"** (3L Unique, ≤150),
**"24%"** (3L Unique, 151+), **"30%"** (3L Legendary, ≤150), **"33%"** (3L Legendary, 151+).

**Accessories**: **"drop gear"** (accessories rolled for Item Drop Rate, worn while farming) vs
**"damage accessories"** (rolled for %stat, worn for bossing) — the Reboot Guide treats these as
two separate sets and cubes damage accessories *last*. **"100% meso"** = five accessories at
+20% Mesos Obtained each, which is the potential cap
(*"Maximum +100% from equipment Potentials and Bonus Potentials"*, and *"Maximum +200%"* for drop).
<https://strategywiki.org/wiki/MapleStory/Potential_System> ·
<https://docs.google.com/document/d/132E6dGMNTRHwRh0wDU7xKZvW7f7xeBhR3VNs_2WQzrE/mobilebasic>

### 4.1 The modern framing: a 9-line WSE budget, not three per-slot goals

Current class guides no longer set a per-piece target. They allocate **nine lines across weapon +
secondary + emblem** as an `att / boss / ied` split:

> *"For endgame setups, **8/1/0** (Boss Damage line on Secondary) is the strongest configuration,
> assuming double prime lines. The Boss Damage line on your Secondary is preferred because the
> Weapon benefits from a higher potential tier for Attack % lines."*
> *"When working on WSE for **9 usable lines**, both **7/2/0** and **9/0/0** setups are viable. The
> difference between them is only about 0.5 – 2% FD, so you can comfortably settle on whichever
> rolls first."*
> — <https://www.hoyoung.directory/basics/weapon-secondary-and-emblem>

The Battle Mage class guide independently gives the same range for magicians:
**7/2/0 to 9/0/0 (MATT / Boss / IED)**
(<https://docs.google.com/document/d/1GSP16fN2SZC0f7StnHpyzxk_90NjTL337LkwbC_9yfM>), and an
Evan/Mir guide states the two standard setups as *"9 lines of Magic ATT"* or *"8 lines of Magic ATT
and 1 line of Boss Damage"* (<https://sites.google.com/view/evanandmir/navigate/gear/wse>).

**Why the boss line goes on the secondary** is a level rule, not a slot rule: a Boss line is worth
40% wherever it sits, but an ATT line is worth **13% on a lv200 weapon and 12% on a sub-151
secondary**. So the boss line belongs on the *lower-level* of the two.
<https://strategywiki.org/wiki/MapleStory/Potential_System>

Two DERIVED facts that reinforce this and that the tracker can use directly:

- **The emblem is the cheapest 3L-ATT slot** — 3,306 cubes vs weapon 4,550 vs secondary 7,290 —
  because its prime pool contains no boss lines diluting it. This independently justifies both
  brendonmay's optimiser tie-break comment (`//prefer to have attk lines on emblem`) and
  hoyoung's *"the Emblem should ideally be 3L Attack."*
- **The secondary is the most expensive slot for any ATT-heavy target**, a second independent reason
  the boss line lands there.

**Additional stopping points from the same source:**

- Secondary: *"Whether your Secondary potential ends up being 12/12/30 or 12/40/9, the difference is
  minimal — likely less than 0.2% Final Damage. Feel free to go with whichever rolls first."*
- Emblem: *"the Emblem should ideally be 3L Attack. However, settling for an IED line is reasonable
  if you're working on a tighter budget."* On a starter emblem, *"If you're using the Gold Three
  Paths Emblem (Lv. 100), 2/0/1 is a perfectly acceptable setup until you can obtain Mitra's Rage."*
- Weapon, terminal: *"Generally, **you won't aim for 36% attack** on the weapon until everything else
  in your gear is DP-optimized, or unless you're feeling particularly lucky with rerolls."*
- Whole WSE: stop at **9 usable lines** (no dead lines). Beyond that, remaining upgrades are
  0.5–2% FD.

**"%ATT + IED + IED" is not a target anyone names.** brendonmay's WSE optimiser structurally
excludes 3-line-boss and 3-line-IED setups and rejects any whole-WSE configuration with more than
3 IED lines total
(<https://github.com/brendonmay/brendonmay.github.io/blob/master/wseCalculator/main.js>), and
the Hero guide says *"Ideally your WSE and familiars won't have any %IED, but it's alright
temporarily to reach specific IED thresholds"* (<https://buffhero.win/>). The mechanical reason is
IED's multiplicative composition — *"you will see diminishing returns if you have too many sources
of IED"* (<https://grandislibrary.com/content/stat-terms>).

**DISPUTED — "2L boss 1L IED" weapons.** Cheapest 3-useful-line weapon by a wide margin, but it
carries no ATT%. Position A (Reboot Guide, Grandis Library): ATT% is the highest-value WSE line and
should anchor every WSE piece. Position B: because IED composes multiplicatively and Boss is
additive with Damage%, the *marginal* value of another Boss/IED line depends entirely on how much
you already have — a character already at 93%+ IED gains far more from ATT%, and a character with
0% innate boss damage (Ren, Night Walker — §5) gains far more from Boss. **The tracker should not
pick a side; it should evaluate `measureGain` for each candidate combination against the current
stat window.** That is precisely what `docs/plans/2026-09-06-maple-design.md` §5 already builds.

---

## 5. Class-specific priorities — the five priority classes

### 5.0 The rules layer (get this right before any class recommendation)

**Cooldown reduction — the authoritative formula**, from
<https://strategywiki.org/wiki/MapleStory/Formulas> §3.6 (Skill Cooldown):

```
FinalCD = BaseCD × (1 − CDR% / 100) − PotentialCDR
```

- `CDR%` comes only from skill-specific **"Cooldown Cutter" hyper passives** and the
  **Mercedes Legion/Union attacker rank (2–6%)**. `PotentialCDR` comes only from a
  **Legendary hat potential line (−1s / −2s)** and, in Interactive worlds only, a Legendary hat
  *bonus* potential −1s. Nothing else in the game contributes.
- **Hard floor: 5 seconds.** `PotentialCDR` does not apply at all if the cooldown after %
  reductions is below 5s.
- **5–10s band:** the flat line converts to a percentage — −1s becomes −5%, −2s becomes −10% of
  the remaining cooldown.
- **Crossing 10s:** if the cooldown is above 10s and the line would push it under, the portion
  below 10s is **halved**.
  (StrategyWiki's own worked example: 12s base, 5% Mercedes union → 11.4s; a −5s potential takes it
  to 10.0s, then the remaining 3.6s converts to 18% → **8.2s final**.)
- **Correction to a widespread belief:** StrategyWiki states *"All skills except for the skills
  below are affected by cooldown reduction"* and the exception list is short and specific (a handful
  of hypers, the Genesis Weapon's Tana of Destruction, four link skills, Quiver/Bolt Flow).
  **5th, 6th and Hyper skills are NOT blanket-excluded.** The older Nexon forum claims that they are
  (<https://forums.maplestory.nexon.net/discussion/29350/cooldown-reduction-potentials>) are
  outdated; the April 2025 balance patch explicitly *added* CDR support to a 5th job skill
  (Howling Gale, below), and several 5th job skills carry an individual
  *"Not affected by effects which reduce cooldown"* clause that would be redundant under a blanket
  rule.
- Distinguish *"unaffected by cooldown **resets**"* (immune to Rune of Mujib / cooldown skip) from
  *"unaffected by cooldown **reduction**"*. Only the second blocks a hat line.

**Practical consequence.** A cooldown line is worth roughly `PotentialCDR / EffectiveCD` extra casts
of the gated skill. On a 20s loop a −2s line is **+11%** casts and a −4s hat is **+25%**. On a 120s
buff a −2s line is **+1.7%**. **The value of a cooldown hat is set almost entirely by the shortest
cooldown in the class's damage loop, not by how many cooldowns it has.**

**On a hat the choice is literally `%main stat` versus `cooldown seconds`.** There is no crit, ATT,
boss, IED or buff-duration line on a hat. A cooldown line costs 13% main stat.
<https://strategywiki.org/wiki/MapleStory/Potential_System>

**Cooldown targets are expressed in total seconds, not line counts.** Every calculator offers
`−2s+ / −3s+ / −4s+ / −5s+ / −6s+`, optionally `+ 1 or 2 lines of stat`
(<https://github.com/brendonmay/brendonmay.github.io/blob/master/cubingCalculator/updateDesiredStatsOptions.js>,
<https://raw.githubusercontent.com/Francesco149/cubecalc/main/src/textfile.py>). The tracker should
do the same. −6s is the ceiling (three −2s lines).

**Critical rate is capped at 100%** — *"It is limited to 100% (always critical)"*
(<https://strategywiki.org/wiki/MapleStory/Formulas>). **No GMS class reaches 100% from its own
passives** (the highest are Night Lord and Marksman at ~75%), so crit rate is a *milestone that
closes*, never innately redundant. The exception is archers: the bowman 5th job **Vicious Shot**
*"Allows Critical Rate to exceed 100% and Critical Damage to increase by 50% of Critical Rate"*
(<https://grandislibrary.com/cygnus-knights/wind-archer>) — for Wind Archer, overcapped crit rate
converts into crit damage. Whether GMS reads the fully uncapped value is **UNVERIFIED**.

**Attack speed** uses an ascending scale with **soft cap 8, hard cap 10**
(<https://grandislibrary.com/content/attack-speed>). Decent Speed Infusion (a glove line) and the
+1 Attack Speed Inner Ability **cannot break the soft cap on their own**. Four of the five priority
classes already self-cap at Stage 8 from their own kit, which makes Decent Speed Infusion a **dead
glove line** for them — see the table below.

**Buff duration is not an equipment potential line at all** (Inner Ability and Legion only) and
does not apply to Hyper, 5th job, HEXA or Oz Ring buffs
(<https://strategywiki.org/wiki/MapleStory/Inner_Ability>). It is out of scope for cubing; noted
only so the tracker does not offer it.

### 5.1 Baseline class numbers

All from Grandis Library per-class "Base Stats (From Skills)" panels, **GMS Ver. 269** — the most
current class data available and, for Ren, the only reliable source (Ren is a 2025 Anima class that
postdates most wiki content). Unbracketed = always-on; bracketed = conditional/burst.

| | **Ren** | **Hero** | **Wind Archer** | **Battle Mage** | **Night Walker** |
|---|---|---|---|---|---|
| Primary / weapon | STR · Sword (+ Imugi Gem) | STR · 2H (project scope) | DEX · Bow | INT · Staff | LUK · Claw |
| Weapon multiplier | 1.3× | 1H 1.34× / **2H 1.44×** | 1.3× | 1.2× | **1.75×** |
| Weapon mastery | 90% | 90% | 85% | 95% | 85% |
| Attack speed from kit | Stage **8** (self-caps) | 2H Stage **7** · 1H 8 | Stage **8** (self-caps) | Stage **8**, can exceed | Stage **8** (self-caps) |
| %ATT / %MATT from skills | **+4%** | **+4%** | **+24%** | **+21%** MATT | +14% |
| Flat ATT from skills | **+165** | +80 (154) | +170 | +80 (140) MATT | +125 (215) |
| **Crit rate** | **50%** | **40%** (70% in Cry Valhalla) | 60% | 60% | **40%** (100% in Dominion) |
| **Crit damage** | **+10%** | **+20%** | +36% (+50% of crit rate via Vicious Shot) | **+40%** | +30% |
| **Boss damage** | **+0%** | +20% (24%) | **+40%** | +5% | **+0%** |
| **IED** | 40% (49%) | **50%** (~58%) | **34.98%** | 44% | 44.75% |
| Final damage | +69.23% (79.38%) | **+202.5%** (447%) | +66.32% | +58.6% (79.85%) | +54.56% (129.99%) |
| Shortest damage-loop cooldown | **Wish Unending 20s** | none (Raging Blow / Puncture have no CD) | **Howling Gale 20s per charge** | Sweeping Staff 13s · Dark Genesis 18s | Shadow Bite 15s→10s · Dark Omen 60s→30s |
| Source | <https://grandislibrary.com/anima/ren> | <https://grandislibrary.com/explorers/hero> | <https://grandislibrary.com/cygnus-knights/wind-archer> | <https://grandislibrary.com/resistance/battle-mage> | <https://grandislibrary.com/cygnus-knights/night-walker> |

### 5.2 Ren — highest priority

- **Cooldown hat: the mechanical case is the strongest of the five.** Ren's damage loop is
  **Wish Unending (3rd job, 20s cooldown)**, which chains Burrowing Earth → Ravenous Spirit →
  Years Uncounted → Blade of the Unbound Heart within a 15s window. Applying §5.0:
  **−2s → 18s (+11% casts), −4s → 16s (+25%), −4s hat plus a −1s bonus line → 15s (+33%)** — all
  above the 10s conversion threshold, so the flat value applies in full. Ren has **no Cooldown
  Cutter hyper passive**, so there is no `CDR%` term shrinking the base first. Wish Unending is
  flagged *"Unaffected by cooldown **resets**"* only — hat lines still work on it.
  <https://grandislibrary.com/anima/ren>
  Everything else in Ren's kit (seven 120s buffs, Exclusive Spell 300s, Divided Heavens 360s,
  Lotus Flower 400s) gains ~2–4%.
  **The user's claim that Ren benefits a lot from a cooldown helm is therefore mechanically
  well-founded — but it remains community-UNVERIFIED**: Ren is a 2025 class with no public class
  guide (Grandis links only the Ren Discord, <http://discord.gg/52rC3geGqC>), and no indexable page
  states a consensus. Model it as a per-character flag, on by default for Ren, with the derivation
  shown.
- **Boss damage +0% innate** — tied with Night Walker for the largest deficit of the five. Boss
  lines on weapon/secondary are worth disproportionately more to Ren. Corroborating: Grandis's
  recommended bossing Inner Ability for Ren leads with **Boss Damage +20%**, and third-party guides
  list Ren's HEXA stat priority as **ATT > Critical Damage > Boss Damage**.
  <https://grandislibrary.com/anima/ren> · <https://www.maplerhouse.com/classes/ren>
- **Crit damage +10% innate — the lowest of the five.** Glove Critical Damage lines are worth more
  to Ren than to any other priority class.
- **Crit rate 50%** — Ren needs ~50 points from hyper stats, links, legion and Inner Ability.
  Crit Rate% lines on W/S/E are live candidates until that closes. Mapler House's recommended hyper
  build takes Wish Unending – Reinforce + Guardbreak rather than the +20% Critical Chance hyper,
  implying Rens are expected to cap crit externally.
- **%ATT lines are relatively strong for Ren** — only +4% innate %ATT (the least-diluted pool of
  the five, tied with Hero) but +165 flat ATT for it to multiply.
- **Attack speed self-caps at Stage 8** (Sword Stage 6 + Blossoming Blade +2). **Decent Speed
  Infusion on gloves and the +1 Attack Speed Inner Ability are dead lines for Ren.**
- **%MaxHP** — Serene Verse III gives +20% MaxHP but nothing in Ren scales damage off HP.
  Survivability only.

### 5.3 Hero (two-handed only, per the project's scope)

- **Cooldown hat: nice-to-have and explicitly tiered — this is the one class with a published,
  citable stopping point.** Hero's DPS engine (Raging Blow, Puncture) has **no cooldown at all**;
  the CD skills are Sword Illusion 30s, Worldreaver 25s, Rising Rage 10s, Beam Blade 7s and the
  120s burst cluster. The Hero class Discord guide (updated Aug 2026, credited by Grandis) publishes
  the ladder verbatim:
  - **"−2s + 2L STR"** — *"the hat potential most Hero players who are actually maining the class in
    Heroic should aim for"*
  - **"−4s + 1L STR"** — only *"if you can afford it"*; it buys a 17th burst in a 30-minute run with
    a minute of slack, where −2s gets it with only a 7-second margin
  - **"−3s", "−3s + 1L", "−2s + 1L"** — *"Not worth it"*
  - a party warning: a cooldown hat desyncs you from a party bursting on a 120s cadence, so it is a
    trap outside solo play; ideal is owning two or three hats and swapping
  <https://buffhero.win/>
  One extra wrinkle in Hero's favour on the cooldown side: the 6th-job Ascent skill
  **Ultrasonic Slash explicitly ignores stat from your Hat** (<https://buffhero.win/>), so part of
  Hero's damage is indifferent to whether the hat carries stat lines at all.
  **Tracker model for Hero's hat: 3L STR (default) → −2s + 2L STR (main) → −4s + 1L STR (min-cut).**
- **Highest innate IED of the five (+50%, ~58% with the debuff)** — the clearest case of the "93%
  IED" heuristic breaking. Marginal IED lines fall off fastest here.
- **Crit rate 40% permanent.** buffhero puts a realistic floor at **58%** including Decent Sharp
  Eyes and MM/NL legion, leaving *"the other 42% [to] be made up from Inner Ability, Legion Grid,
  Hyper Stat, Familiar Badges and/or Link skills."* Crit rate is not redundant for Hero.
- **Crit damage only +20%** — Hero is crit-damage poor; its Legion priority is
  `Max CritDmg > Max BossDmg > Max IED` and HEXA stat core 2 is Crit Damage. <https://buffhero.win/>
- **Flat-ATT rich, %ATT poor** (+80 → +154 in burst, only +4% innate) and the **2H multiplier 1.44×
  vs 1H 1.34× is ~7.5% FD just for holding 2H**, applied to total Weapon Attack from all sources.
  Both push toward %ATT. But buffhero's published priorities are **HEXA: ATT > STR > Crit Damage**
  while **Legion: Max STR > Max ATT** — no ratio is published anywhere.
  **UNVERIFIED; expose as a user input, do not hard-code an ATT:stat ratio.**
- **Attack speed: Hero is the only one of the five that does not self-cap.** 2H sits at Stage 7, and
  buffhero calls +1 Attack Speed Inner Ability *"most important line to aim for so get this one
  ASAP!"* Reaching hard cap 10 on 2H needs Booster + Mastery + **Decent Speed Infusion** + Extreme
  Green Potion + the IA line. **Decent Speed Infusion on gloves is a live line for 2H Hero and only
  for 2H Hero among these five.**

### 5.4 Wind Archer

- **Cooldown hat: high priority, and this is a 2025 change most older guides predate.** The KMS
  2025-04-17 / MSEA v244 balance patch made **Howling Gale's wind-energy preparation time subject to
  cooldown reduction**: *"Wind energy increases by 1 every 20 sec and you can hold up to 3.
  Cooldown reduction effects are applied while the wind energy is being prepared."*
  <https://www.maplesea.com/updates/view/v244_Patch_Notes_3/> ·
  <https://maplestorywiki.net/w/Howling_Gale> · <https://grandislibrary.com/cygnus-knights/wind-archer>
  Howling Gale is Wind Archer's biggest damage skill and is gated purely by that 20s-per-charge
  timer — arithmetically identical to Ren's Wish Unending: −2s → +11% charges, −4s → +25%.
  A KMS class review states *"Wind Breaker benefits greatly from having a lot of cooldown
  reduction"* (<https://vortexgaming.io/en/postdetail/499889>). No English community consensus was
  found — **UNVERIFIED** at that level, but the patch note is first-party.
  Encode two exemptions: **Empress Cygnus's Blessing** and **Transcendent Cygnus's Blessing** are
  both *"Not affected by effects which reduce cooldown."*
- **Lowest innate IED of the five (+34.98%)** — **IED lines are worth the most to Wind Archer.**
- **Highest innate boss damage (+40%)** — boss lines are worth the least here.
- **Most-diluted %ATT pool (+24% innate)** — an extra ATT% line buys measurably less for Wind Archer
  than for Ren or Hero. **This is the strongest "%DEX over %ATT" case of the five.**
- **Crit rate 60%**, and Wind Archer is the one class where **overcapping crit rate is not wasted**
  because Vicious Shot converts 50% of crit rate into crit damage (§5.0). Grandis's recommended
  bossing Inner Ability for Wind Archer is the only one of the five to include **Crit Rate +20%**.
- **Attack speed self-caps at Stage 8** (Bow Stage 4 + Agile Bows 2 + Albatross Max 2), with no
  booster to maintain. **Decent Speed Infusion is a dead line.**

### 5.5 Battle Mage

- **Cooldown hat: the class's own guide says no.** "The Grimoire: A Battle Mage Guide" v4.2, the
  class Discord document linked from Grandis Library, has a dedicated section:
  > *"**Short Answer:** Optional but generally not recommended for most players. While all sources
  > of cooldown reduction work on active skills, the resulting cooldowns do not align with spawn
  > timers, thus mobbing rotations remain mostly unchanged… making a Cooldown Hat situationally
  > useful for said min cut situations. **Long Answer:** No."*
  <https://docs.google.com/document/d/1GSP16fN2SZC0f7StnHpyzxk_90NjTL337LkwbC_9yfM>
  Battle Mage also already runs **Dark Genesis – Cooldown Cutter (−40%)**, taking Dark Genesis from
  30s to 18s, so a flat line lands on an already-shrunken number (§5.0 rule). Condemnation, Battle
  Mage's most-used damage proc, is a *reactivation* and immune to cooldown reduction entirely.
  A hat line also costs the most here (12–13% INT).
  **Tracker model for Battle Mage's hat: 3L INT, cooldown off by default.**
- **Roll MATT%, never ATT%.** Magician W/S/E roll **%Magic ATT at the same 12%/13% values** as
  %Weapon ATT — there is no magician penalty
  (<https://strategywiki.org/wiki/MapleStory/Potential_System>). The tracker must select the correct
  one per class.
- **Highest innate crit damage (+40%)** — glove Critical Damage lines are worth the *least* to
  Battle Mage of the five.
- **Crit rate 60%, and the class guide requires a verified 100%:** *"Battle Mage requires 100%
  visual (in Character Info) Critical Rate. Skill's Built-in Critical Rate sources such as Finishing
  Blow's Critical Rate +25% do not affect the overall Critical Rate, and should be ignored."* The
  guide even suggests *"replacing any Unique line with +20% Critical Rate"* if short.
  So crit rate lines are **mandatory until 100%, then dead**. Same source.
- **Boss damage only +5%** — boss lines matter.
- **Published IED targets by progression: 90%+ early, 95%+ Arcane, 97%+ Grandis.** Same source.
  Note this is a *higher* ladder than the 2020 Reboot Guide's flat 93% — see the disagreement in
  §5.7.
- **Published WSE target: 7/2/0 to 9/0/0 (MATT / Boss / IED lines)**; HEXA stat priority
  **Magic Attack > INT > Crit Damage**; Legion bossing board
  **CritDmg > Boss > IED > INT > MATT**. Same source.
- **Attack speed: Battle Mage can exceed the soft cap using its own kit** — base Stage 4 +
  Hasty Aura +2 + Staff Boost +2 = 8, then Hasty Aura active or a Monster Park Green Potion breaks
  it (+1), then **Decent Speed Infusion (+1) = Stage 10 ≈ up to +6% Final Damage vs Stage 8**.
  So Decent Speed Infusion **is** a live glove line for Battle Mage, unlike Ren/WA/NW. The class
  guide adds that Attack Speed +1 Inner Ability is then unnecessary.
  ⚠️ **UNRESOLVED CONFLICT:** Grandis Library's attack-speed row for Battle Mage says
  *"does not break soft cap"*, contradicting the class doc. Do not encode either as fact.
- **Battle Mage's secondary (Shield) can be scrolled and star-forced**, unlike most classes' fixed
  secondaries — relevant to the `secondary` slot's flame/star candidates, not to cubing.

### 5.6 Night Walker

- **Cooldown hat: low priority — the only ranker-level source says don't.** A KMS ranker Q&A states
  *"Night Walker rankers are currently using stat hats instead of cooldown hats"* and *"cooldown is
  not useful in boss battles, so it is a waste to invest in it only for hunting."*
  <https://vortexgaming.io/en/postdetail/536861>
  Structural reason: Night Walker's summons can only be reinstalled after their duration ends, and
  Shadow Slide's HEXA-boosted duration is 55s against a 60s cooldown — only ~5s of dead time exists
  to reclaim. Dark Omen already runs **Dark Omen – Cooldown Cutter (−50%)**, 60s → 30s. Shadow Bite
  reaches 10s at HEXA Boost 30, where the flat line converts to a percentage (§5.0).
  **Tracker model for Night Walker's hat: 3L LUK, cooldown off.**
  *(Correction to a common premise: Night Walker's bats are not cooldown-gated — Shadow Bat /
  Ravenous Bat summon one bat per three throwing-star hits as toggles. Its sustained DPS has no
  cooldown at all.)*
- **Boss damage +0% innate** — ties Ren for the largest deficit. Weapon/secondary Boss lines are
  top-value.
- **Crit rate +40% permanent** (base 5% + Critical Throw 35%; Night Walker has no Nimble Body).
  Dominion grants +100% crit rate for 20s every 120s, so crit is guaranteed in burst and 40% + gear
  the rest of the time. Crit rate is a **mid-game gate**; Grandis's recommended bossing Inner
  Ability has no crit line, implying an endgame Night Walker overshoots 100%.
- **IED 44.75% but stack-dependent** — built from Dark Blessing 15% × Mark of Darkness (+7%/stack,
  max 5). The ranker source recommends **1–2 IED lines at ~60k HEXA stat, 0–1 at ~80k, 0 at high
  spec**. <https://vortexgaming.io/en/postdetail/536861>
- **Claw weapon multiplier 1.75× — the highest in the game** — which exists to offset genuinely low
  claw base ATT. **Balanced Fury's +30 flat Attack Boost from throwing stars is fixed and
  non-cubeable** and does not shift the %ATT:%LUK ratio.
- **Attack speed self-caps at Stage 8** (Claw Stage 6 + Agile Throwing +2), permanently, with no
  booster. **Decent Speed Infusion is dead** unless a cap-breaker (Extreme Green Potion / Crimson
  Queen soul) is also up.

### 5.7 General rules — which lines are class-dependent, and how

Each rule is tied to a property the tracker can test.

| Line | Rule | Ranking across the five |
|---|---|---|
| **Cooldown (hat only)** | Value ≈ `PotentialCDR / shortest damage-loop cooldown`. Not "has cooldowns" — *has a short rotational cooldown*. | **High: Ren (20s), Wind Archer (20s/charge). Medium: Battle Mage (13–18s, but its own guide says no). Low: Hero (no CD on main rotation — though its guide still recommends −2s), Night Walker (60/120s, rankers say no).** |
| Cooldown, modifier 1 | Worth **less** for a skill that already has a *Cooldown Cutter* hyper — the % applies first, so the flat line lands on a smaller number and is likelier to hit the 10s conversion or 5s floor | Battle Mage (Dark Genesis −40%), Night Walker (Dark Omen −50%) |
| Cooldown, modifier 2 | Actively **harmful in parties** for burst-cycle classes — desyncs you from a party's 120s cadence (<https://buffhero.win/>) | all burst classes |
| **%main stat** | Universal. Only the stat identity changes | STR Ren/Hero · DEX WA · INT BaM · LUK NW |
| **%All Stat** | Universal; ~77% of a %main-stat line at 151+ (10 vs 13 prime, 7 vs 10 non-prime) | — |
| **ATT% / MATT%** | MATT% for magicians (same values, no penalty). Diluted by innate %ATT (additive bucket), amplified by innate flat ATT and weapon multiplier | **Least diluted: Ren +4%, Hero +4%. Most diluted: WA +24%, BaM +21%** |
| **Boss damage** | Inversely proportional to innate boss damage | **Ren 0%, NW 0%, BaM 5% want it most; WA 40% least** |
| **IED** | Composes multiplicatively → sharp diminishing returns. Also watch stack-gated IED | **WA 34.98% wants it most; Hero ~58% least. NW's is stack-dependent** |
| **Critical damage (gloves)** | Additive into the crit-damage bucket; inversely proportional to innate | **Ren +10% and Hero +20% gain most; BaM +40% least** |
| **Critical rate (W/S/E)** | Worth **nothing above 100%**; no class self-caps, so it is a milestone that closes | Gap size: **Hero 40%, NW 40%, Ren 50%** > WA 60%, BaM 60%. **Exception: Wind Archer's Vicious Shot converts crit rate above 100% into crit damage** |
| **Decent Speed Infusion (gloves)** | Worth **nothing** to any class that already self-caps at attack-speed Stage 8 | **Dead for Ren, Wind Archer, Night Walker. Live for 2H Hero (Stage 7) and Battle Mage (can reach Stage 10)** |
| **%MaxHP** | A damage stat for **Demon Avenger only**. The Reboot Guide singles it out: *"For Demon Avengers, Hyper Body may be a decent potential"* | None of the five. Small leveraged exceptions: WA's Gale Barrier absorbs 1% MaxHP per Elemental; NW's Vitality Siphon shield is 13% MaxHP |
| Meso% / Drop% | Not class-dependent; set-dependent (farming vs bossing set) | — |
| %Damage | Deprecated by every guide; see §2.4 | — |
| Buff duration | **Not an equipment potential line.** Inner Ability / Legion only, and excluded from Hyper/5th/6th job buffs | out of scope |

**No ATT : main-stat conversion ratio is publishable — do not hard-code one.** The "1 ATT ≈ 4 main
stat" figure that circulates on aggregator sites appears in no primary source. StrategyWiki's own
Stat Equivalence section routes to a per-character calculator
(<https://brendonmay.github.io/statEquivalentCalculator/>), and every class guide does the same;
the ratio drifts as ATT and stat are added. The two published in-class priorities even disagree
with each other — Hero's guide lists **HEXA: ATT > STR** but **Legion: Max STR > Max ATT**
(<https://buffhero.win/>). **The tracker already solves this correctly** by computing
`measureGain` for each concrete candidate rather than converting through a constant
(`docs/plans/2026-09-06-maple-design.md` §4). Never introduce a stat-equivalence constant.

**DISPUTED — the IED target.** Sources give four different numbers, and the spread matters enough
that the tracker must not pick one:

| Target | Source |
|---|---|
| *"aim for 200% boss damage and 93% IED"* | <https://docs.google.com/document/d/132E6dGMNTRHwRh0wDU7xKZvW7f7xeBhR3VNs_2WQzrE/mobilebasic> |
| *"CRA and below: 90%+ · CRA→Hard Lotus/Damien: 93%+ · Hard Lotus/Damien and above: 96%+"* | <https://buffhero.win/> |
| *"90%+ early, 95%+ Arcane, 97%+ Grandis"* | Battle Mage Grimoire (<https://docs.google.com/document/d/1GSP16fN2SZC0f7StnHpyzxk_90NjTL337LkwbC_9yfM>) |
| Optimise against 300% PDR (Lotus→Black Mage), 380% for Serene | <https://www.appleflash.net/wse.html> |

The tracker already has the correct answer to this: `measureGain` against a chosen `Target` PDR
(`docs/plans/2026-09-06-maple-design.md` §4). **Show the marginal gain of the next IED line, not a
threshold.**

## 6. What the tracker should emit instead of "three useful legendary lines"

A `potential` candidate should be a **one-step move**, priced, with an explicit stopping rule. Model
the target the way the ecosystem does — a summed threshold for stat, total seconds for cooldown, a
line count only where the line is categorical (ATT/boss/IED/crit-damage/meso/drop).

```ts
type PotentialTarget =
  | { kind: "stat_threshold";  stat: "main" | "all"; minTotalPct: number }   // "24%+ STR"
  | { kind: "cooldown_seconds"; minSeconds: 2 | 3 | 4 }                      // "-2s+"
  | { kind: "line_count"; category: LineCategory; count: 1 | 2 | 3 }         // "2L ATT"
  | { kind: "combo"; parts: PotentialTarget[] }                              // "-2s + 2L stat"

type LineCategory =
  | "main_stat" | "all_stat" | "att" | "matt" | "boss" | "ied"
  | "crit_dmg" | "crit_rate" | "cooldown" | "meso" | "drop"

interface PotentialCandidate {
  slot: Slot
  from: { grade: Grade; lines: ParsedLine[] }
  step: "tier-up" | "improve"          // never "reroll to 3 lines"
  target: PotentialTarget              // the *next* rung only
  cube: "glowing" | "bright" | "solid" // see the rule below
  expectedCubes: number                // 1/p from §7
  medianCubes: number                  // 0.69/p
  p90Cubes: number                     // 2.30/p
  expectedMesos: number                // cubes × (price + revealConst(level) × level²)
  confidence: "low"                    // rate snapshot is KMS-2023; see §7
}
```

**Cube selection rule** (derived in §2.3, confirmed by the game's own Auto Enhancement UI):

```
if step === "tier-up"                     → bright   (higher rank-up rate; ~468M vs ~500M U→L)
else if target needs 2+ PRIME lines        → bright   (2L crit_dmg, 2L cooldown, 2L meso/drop,
                                                       double-prime stat, "33%+" on 151+ gear)
else                                       → glowing  (~half the cost when the target category
                                                       also exists in the non-prime pool:
                                                       2L stat, 2L ATT, "fake 3L" / "30%" )
// Auto Steal targets: solid only — Auto Steal is absent from the Glowing/Bright pools.
```
Community shorthand for the same rule: *"Glowing is cheaper for 30+. Bright is cheaper for 33+."*
(<https://www.reddit.com/r/Maplestory/comments/18f6cmb/reboot_cubing_after_27/kcs8hkl/>) and
*"Once leg, definitely only use 12m cubes unless it is your glove"*
(<https://www.reddit.com/r/Maplestory/comments/12mlhfi/glowing_cube_vs_bright_cube_for_ranking_up/jgb901y/>).

**Hard constraints the generator must respect:**

1. `slot ∈ {pocket, medal, android, totem*}` → **no potential candidate at all**.
2. `slot === "badge"` → only Ghost Ship Exorcist / Sengoku Hakase / Shackles of Resentment.
3. Ring slots → gate on the item; Special Skill Rings and rings with innate effects cannot be cubed.
4. `category === "boss"` and `slot === "emblem"` → **invalid**, the emblem pool has no boss line at
   any tier (five independent confirmations, §1.2 / §4.1).
5. `category ∈ {boss, ied, drop}` with `count === 3` → **invalid**, hard-capped at 2.
6. `crit_dmg` → gloves only. `cooldown` → hat only, Legendary only. `meso`/`drop` →
   face/eye/ring/earring/pendant only. `att`/`matt`/`crit_rate` → weapon/secondary/emblem only.
7. `matt` for magician weapons, `att` otherwise — never both, and never offer both to the user.
8. `crit_rate` candidates only while the character's stat-window crit rate is below 100% — except
   for archers (Wind Archer), where Vicious Shot reads past the cap (§5.0).
9. Never propose anything above Epic on an item flagged as a transfer-hammer donor.
10. Rank the third line of any category *after* the second line of every other slot.
11. `cooldown` candidates only when the character's `cooldownHat` flag is set. Default it **on for
    Ren and Wind Archer**, **off for Battle Mage and Night Walker** (their own guides say no), and
    **off-with-a-prompt for Hero** (its guide says −2s + 2L stat once the rest of the gear is done)
    — §5.

**Default target set** (the "good enough" column of §1.3). The tracker can render this directly as
an in-game **Auto Enhancement** target list (<https://maplestorywiki.net/w/Potential>):

| slot | default target | next rung |
|---|---|---|
| weapon, secondary | 2 lines ATT% (MATT% for magicians) | 2 ATT + 1 Boss (weapon/secondary) |
| emblem | 2 lines ATT% | 3 lines ATT%, else 2 ATT + 1 IED |
| hat | `21%+` main stat (≈ 2 lines) | `24%+`, or `−2s + 2L stat` if the cooldown flag is on |
| top/overall, bottom, shoes, cape, shoulder, belt | `21%+` main stat | `24%+` |
| gloves | 1 Critical Damage line + 1 %main stat | 2 Critical Damage lines |
| heart, badge | `21%+` main stat | `24%+` |
| pendant/ring/earring/face/eye — bossing set | `21%+` main stat | `24%+` |
| pendant/ring/earring/face/eye — farming set | 1 Meso Obtained line each, to the +100% cap | add Drop lines to the +200% cap |
| pocket, medal, android, totem | *no candidate* | — |

**Whole-WSE view.** Present weapon + secondary + emblem as one **9-line budget** with an
`att / boss / ied` split, not three independent goals, and show the current split against the
8/1/0 · 7/2/0 · 9/0/0 targets (§4.1). Put the boss line on whichever of weapon/secondary has the
*lower* item level.

## 7. The cost model (so it can be re-derived and checked)

**Cube prime structure** (`formulas.md` §4A.3.4, from
<https://strategywiki.org/wiki/MapleStory/Potential_System>):

| cube | line 1 prime | line 2 prime | line 3 prime | any double prime | triple prime |
|---|---|---|---|---|---|
| Glowing (RED) | 100% | 10% | 1% | 10.9% | 0.1% |
| Bright (Black) | 100% | 20% | 5% | 24% | 1% |

**Two-pool model.** For line slot *i* with prime probability πᵢ, and a target category with
probability `p_prime` inside the Legendary prime pool and `p_nonprime` inside the Legendary
non-prime pool:

```
P(line i is in the target category) = πᵢ · p_prime + (1 − πᵢ) · p_nonprime
```

Lines are independent; enumerate all 4³ assignments of the three slots to
{category₁ … categoryₙ, other}, discard assignments that exceed a category's `lineCap`, and sum
those meeting the required counts. Expected cubes to first hit = 1/P (geometric mean; median
≈ 0.69/P, p90 ≈ 2.30/P). Expected mesos = expected cubes × 12M (Glowing) or 22M (Bright).

**Per-slot cash-cube line probabilities** used above, all from
<https://strategywiki.org/wiki/MapleStory/Potential_System> ("Cash cube" column, item level 120+ /
100+ / 0+ as the source specifies). `prime` = Legendary (Prime) pool; `nonprime` = Unique (Prime) /
Legendary (Non-prime) pool.

| slot | %one main stat (prime / non-prime) | %All Stat (p/np) | ATT% (p/np) | Crit Rate% (p/np) | Damage% (p/np) | IED (p/np) | Boss (p/np) | special (prime only) |
|---|---|---|---|---|---|---|---|---|
| hat | 8.8888 / 8.9285 | 6.6666 / 7.1428 | — | — | — | — | — | CD −1s 6.6666, CD −2s 4.4444 |
| top / overall | 9.3023 / 7.5757 | 6.9767 / 6.0606 | — | — | — | — | — | — |
| bottom | 10.8108 / 8.9285 | 8.1081 / 7.1428 | — | — | — | — | — | — |
| gloves | 9.0909 / 8.3333 | 6.8181 / 6.6666 | — | — | — | — | — | Crit Dmg% 9.0909 |
| shoes | 10.0000 / 8.9285 | 7.5000 / 7.1428 | — | — | — | — | — | — |
| cape / belt / shoulder | 10.8108 / 9.6153 | 8.1081 / 7.6923 | — | — | — | — | — | — |
| face/eye/ring/earring/pendant | 9.3023 / 11.3636 | 6.9767 / 9.0909 | — | — | — | — | — | Meso% 6.9767, Drop% 6.9767 |
| weapon | 9.7560 / 11.6279 | 7.3170 / 9.3023 | 4.8780 / 6.9767 | 4.8780 / 9.3023 | 4.8780 / 6.9767 | 4.8780 (35%) + 4.8780 (40%) / 6.9767 (30%) | 9.7560 (35%) + 4.8780 (40%) / 6.9767 (30%) | ATT +1/10lv 4.8780 |
| secondary | 8.5106 / 9.8039 | 6.3829 / 7.8431 | 4.2553 / 5.8823 | 4.2553 / 7.8431 | 4.2553 / 5.8823 | 4.2553 + 4.2553 / 5.8823 | 8.5106 + 4.2553 / 5.8823 | — |
| emblem | 11.4285 / 12.5000 | 8.5714 / 10.0000 | 5.7142 / 7.5000 | 5.7142 / 10.0000 | 5.7142 / 7.5000 | 5.7142 + 5.7142 / 7.5000 | **none** | — |
| heart / badge | 12.9032 / 11.3636 | 9.6774 / 9.0909 | — | — | — | — | — | — |

MATT% rates equal ATT% rates in every WSE row. `%one main stat` is the rate for **one specific**
stat (STR *or* DEX *or* INT *or* LUK); StrategyWiki lists all four at the same rate.

> **Caveat: job-restricted pools.** StrategyWiki lists all four %stat lines and both ATT%/MATT% for
> every slot at equal rates, so the model above lets %DEX roll on a warrior weapon. In game that
> cannot happen, so the live pool is smaller and every remaining line's probability is higher —
> which would make weapon targets roughly 2.5–3× cheaper than §3.2 says.
> **However**: brendonmay's engine, driven directly off the KMS rate disclosure, reproduces these
> exact figures (§3.2b), and a dump of the KMS legendary Bright first-line weapon pool likewise
> contains all four %stat entries. So the un-renormalised pool is what the entire calculator
> ecosystem uses, and this file's numbers are *comparable to every other tool's*. Whether the
> in-game roll actually renormalises is still **UNVERIFIED** — it belongs with the probability-table
> work in `src/lib/data/potential-lines.ts`. Until it is settled, treat the WSE meso figures as
> ecosystem-standard rather than ground truth, and mark them `confidence: low`.

> **Caveat: rate provenance and staleness — the headline risk in this file.**
> Every public calculator, including all three good ones, shares **one rate snapshot**: Nexon's
> **KMS** probability disclosure as of **2023-08-28 / 2023-11-14** (MapleIsland names its ruleset
> `nexon-kms-2023-11-14-gms-values`;
> <https://github.com/brendonmay/brendonmay.github.io/blob/master/cubingCalculator/cubing_data_scraper/README.md>).
> StrategyWiki's tables, used for the pool composition above, are **MSEA**-maintained
> (`formulas.md` §4A.3 flags this). Three known modelling gaps in the shared snapshot:
> - **Tier-up rates are not KMS** — they are GMS community-measured, with the author's own comment
>   `// Community rates notably higher than KMS rates, using them.` (`red: 0.14/0.06/0.025`,
>   `black: 0.17/0.11/0.05`), close to but not identical to `formulas.md` §4A.3.5.
> - **No pity system is modelled.** KMS's disclosure documents a guaranteed tier-up after N
>   consecutive failures (~10 for Rare→Epic, ~42 for Epic→Unique). Whether GMS has pity at all is
>   **UNVERIFIED**. If it does, every tier-up cost here is an overestimate.
> - **Level-160 handling is an admitted hack**: `HACK(ming): KMS does not have adjusted Stat % based
>   on item level, so we are making the assumption that for lvl 160+ items, value of stat percentage
>   categories are increased by 1%`. Badge is mapped to Heart and Accessory to Ring in that data.
>
> Nothing in this file is more current than that snapshot. Present cube counts as order-of-magnitude
> guidance with a percentile range, never as a precise forecast.

---

## 8. What could not be sourced

| Claim | Status |
|---|---|
| **Reddit / r/Maplestory consensus on anything** | **UNVERIFIED — inaccessible.** reddit.com, old.reddit.com, the JSON API and every Redlib mirror return 403/410 from this environment, and the WebSearch domain filter returns nothing usable. **No claim in this file is Reddit-sourced.** Community positions come instead from the two most-cited long-form guides, two class-Discord guides (buffhero.win, the Battle Mage Grimoire), first-party patch notes, and KMS class reviews. If Reddit consensus matters, it needs a manual pass. |
| **Ren benefits disproportionately from cooldown-reduction hats** | **Mechanically well-founded, community-UNVERIFIED.** Ren's damage loop is Wish Unending at a 20s cooldown with no Cooldown Cutter hyper, so a −2s line is +11% casts and −4s is +25% (§5.2). But Ren is a 2025 class with no public class guide — Grandis Library links only the Ren Discord (<http://discord.gg/52rC3geGqC>), which is not indexable. Treat as a per-character flag with the derivation shown, not as a fact. |
| Whether GMS renormalises job-restricted line pools | **UNVERIFIED.** See the §7 caveat. Would make WSE targets ~2.5–3× cheaper. Largest single source of error. |
| Whether GMS has a cube **pity** system (guaranteed tier-up after N failures, as KMS documents) | **UNVERIFIED.** No calculator models it. If GMS has it, all tier-up costs here are overestimates. |
| Current GMS rank-up probabilities post-v239 | **UNVERIFIED** — already flagged in `formulas.md` §4A.3.5. The community-measured values used by every calculator (`red 0.14/0.06/0.025`, `black 0.17/0.11/0.05`) are close to but not identical to the wiki's. |
| Whether the **Violet Cube** (choose 3 of 6 lines) is meso-purchasable in Heroic | **UNVERIFIED.** <https://maplestorywiki.net/w/Cube> lists its NX price as `???` and no Heroic meso price. If it is available it changes the 3-line economics materially. |
| Whether **DMT** applies to meso-bought cubes in Heroic worlds | **UNVERIFIED.** Calculators apply the DMT multiplier to red/black, which in Heroic are meso purchases. |
| Current (2026) DMT cube discount percentages | **UNVERIFIED.** The 20/25/30% figures are from the pre-2021 Reboot Guide. |
| Observed player meso spend per slot in Heroic | **UNVERIFIED.** No survey or aggregated data exists. §3 numbers are expectations from published rates, not observations. |
| Any **ATT : main-stat conversion ratio** | **UNVERIFIED and unpublishable.** See §5.7. Do not introduce a constant. |
| Battle Mage's attack-speed base stage / whether Hasty Aura breaks the soft cap | **UNRESOLVED CONFLICT** between <https://grandislibrary.com/resistance/battle-mage> and the Battle Mage Grimoire. Affects whether Decent Speed Infusion is a live glove line for Battle Mage. |
| Whether buff duration currently applies to Night Walker's 5th-job burst buffs | **UNRESOLVED.** The general exclusion rule says no; Grandis still recommends the Inner Ability line. Out of scope for cubing (buff duration is not a potential line) but flagged for the Inner Ability model. |
| Whether Vicious Shot reads crit rate above 100% in GMS specifically | **UNVERIFIED.** The mechanic is documented; the GMS implementation is not confirmed. |
| Whether identical duplicate lines (two "Boss +40%") can appear | Implied allowed by the "up to 2 times" caps, but **UNVERIFIED** as an explicit rule. |
| Whether the 2020-era cooldown "%-conversion below 10s" behaviour still holds in 2026 | **UNVERIFIED.** The rule is documented on StrategyWiki and corroborated by GMS v188 patch notes (<https://ayumilove.net/maplestory-update-notes-gms-v188/>), but the Elluel thread that first documented the discrepancy is from Feb 2020 and its point was that the in-game tooltip was wrong. |

**Sources deliberately excluded.** The SEO-farm pages that dominate these search queries
(`alltypescalculators.online`, `cubingcalculatormapplestory.site`, `everycalculators.com`,
`smartunitcalculator.com` and similar) are auto-generated, cite no rate source, and one produced a
"40–60 Black Cubes for a 30% boss damage line" figure that matches no real model. Nothing in this
file comes from them. Likewise a 2020 blog claiming *"250 cubes to get 1 chance to get 3 perfect
prime lines on your weapon"* is wrong by three orders of magnitude against real rates and is not
used.

---

## 9. Source index

**Primary mechanics**

| What | URL |
|---|---|
| **Per-slot potential line pools, values and per-line probabilities (primary source)** | <https://strategywiki.org/wiki/MapleStory/Potential_System> |
| **Cooldown-reduction formula, crit cap, IED composition** | <https://strategywiki.org/wiki/MapleStory/Formulas> |
| Potential ranks, prime/non-prime, %stat-by-level, what never gets potential, Auto Enhancement, stamp retirement | <https://maplestorywiki.net/w/Potential> |
| Current GMS cube names, Heroic meso prices, choose-before/after behaviour | <https://maplestorywiki.net/w/Cube> |
| Buff duration exclusions | <https://strategywiki.org/wiki/MapleStory/Inner_Ability> |
| Attack-speed scale, soft/hard caps | <https://grandislibrary.com/content/attack-speed> |
| Stat terminology, IED multiplicativity, crit-damage multiplier | <https://grandislibrary.com/content/stat-terms> |
| MSEA per-line probability cross-reference | <https://whackybeanz.as.r.appspot.com/info/potential-list> · guide: <https://www.whackybeanz.com/guides/cubes> |
| Mechanics already captured in this repo | `docs/research/formulas.md` §4A.3 |

**Community strategy**

| What | URL |
|---|---|
| **GMS Reboot Guide** (4phantom1 / Pocketstream) — ladder, per-slot targets, cubing priority, named combos. *Pre-2021: ordering current, numbers stale* | <https://docs.google.com/document/d/132E6dGMNTRHwRh0wDU7xKZvW7f7xeBhR3VNs_2WQzrE/mobilebasic> |
| Grandis Library Progression Guide — early ladder, WSE-first, "no %Damage lines" | <https://grandislibrary.com/content/progression-guide> |
| **hoyoung.directory** — the modern 9-line WSE budget, 8/1/0 · 7/2/0 · 9/0/0, boss-on-secondary | <https://www.hoyoung.directory/basics/weapon-secondary-and-emblem> |
| **buffhero.win** — Hero class guide; the only published cooldown-hat ladder (−2s+2L STR / −4s+1L STR), IED thresholds, attack-speed route | <https://buffhero.win/> |
| **The Grimoire: A Battle Mage Guide** v4.2 — cooldown-hat verdict, crit-rate requirement, WSE 7/2/0–9/0/0, attack-speed 10 | <https://docs.google.com/document/d/1GSP16fN2SZC0f7StnHpyzxk_90NjTL337LkwbC_9yfM> |
| Evan/Mir WSE guide — "9 lines of Magic ATT" or "8 + 1 boss" | <https://sites.google.com/view/evanandmir/navigate/gear/wse> |
| Night Walker ranker Q&A — "rankers use stat hats, not cooldown hats"; IED-line count by HEXA stat | <https://vortexgaming.io/en/postdetail/536861> |
| Wind Breaker KMS class review — "benefits greatly from cooldown reduction" | <https://vortexgaming.io/en/postdetail/499889> |
| appleflash WSE optimiser notes — PDR targets | <https://www.appleflash.net/wse.html> |
| Per-slot cubing summary (Reboot), DMT | <https://thedigitalcrowns.com/maplestory-dmt-cubing-guide-reboot/> |
| Cube names/prices and per-slot special lines, dated 2024-03-11 | <https://www.digitaltq.com/maplestory-potential-guide> |

**Calculators (the cost model, and the preset lists that reveal what players chase)**

| What | URL |
|---|---|
| **brendonmay cubing calculator** — the reference implementation; target presets and meso cost model | <https://brendonmay.github.io/cubingCalculator/> · source <https://github.com/brendonmay/brendonmay.github.io/tree/master/cubingCalculator> |
| Preset generator (the taxonomy of what players chase) | <https://github.com/brendonmay/brendonmay.github.io/blob/master/cubingCalculator/updateDesiredStatsOptions.js> |
| Cube cost model (12M / 22M / 7.5M + reveal fee) | <https://github.com/brendonmay/brendonmay.github.io/blob/master/cubingCalculator/cubes.js> |
| Rate-scraper provenance (KMS, 2023) | <https://github.com/brendonmay/brendonmay.github.io/blob/master/cubingCalculator/cubing_data_scraper/README.md> |
| **brendonmay WSE calculator** — damage optimiser; hard-codes the 9-line search space, excludes 3L boss / 3L IED | <https://brendonmay.github.io/wseCalculator/> · <https://github.com/brendonmay/brendonmay.github.io/blob/master/wseCalculator/main.js> |
| Stat-equivalence calculator (why no ATT:stat constant exists) | <https://brendonmay.github.io/statEquivalentCalculator/> |
| **Francesco149/cubecalc** — the richest named-preset list; precomputed answers checked in | <https://github.com/Francesco149/cubecalc> · presets <https://raw.githubusercontent.com/Francesco149/cubecalc/main/src/textfile.py> · answers <https://github.com/Francesco149/cubecalc/blob/main/cubechances.txt> · hosted <https://francesco149.github.io/maple/cube/> |
| Mastema — per-(item, tier, level) generated presets, same cost model | <https://mastema.app/cube-calculator> |
| MapleIsland — free-form goal builder, editable cost table, names its ruleset `nexon-kms-2023-11-14-gms-values` | <https://www.mapleisland.app/cube> |
| Xenogents — deliberately preset-free; "instead of a preset goal which you're trying to hit" | <https://github.com/Xenogents/maplestory-calculators/blob/main/README.md> |

**Class data (all GMS Ver. 269)**

| Class | URL |
|---|---|
| Ren | <https://grandislibrary.com/anima/ren> · <https://www.maplerhouse.com/classes/ren> · <https://www.digitaltq.com/maplestory-ren-skill-build-guide> |
| Hero | <https://grandislibrary.com/explorers/hero> · <https://buffhero.win/> |
| Wind Archer | <https://grandislibrary.com/cygnus-knights/wind-archer> · patch note <https://www.maplesea.com/updates/view/v244_Patch_Notes_3/> · <https://maplestorywiki.net/w/Howling_Gale> |
| Battle Mage | <https://grandislibrary.com/resistance/battle-mage> · <https://docs.google.com/document/d/1GSP16fN2SZC0f7StnHpyzxk_90NjTL337LkwbC_9yfM> |
| Night Walker | <https://grandislibrary.com/cygnus-knights/night-walker> · <https://vortexgaming.io/en/postdetail/536861> |

Note: Grandis Library's Cygnus paths are `/cygnus-knights/…`; `/cygnus/…` returns 404.
