# MapleStory (GMS) Damage Math — Research Notes for a Gear-Progression Tracker

**Compiled:** 2026-09-06
**Scope:** GMS / global MapleStory, post-Combat-Power-UI era (KMS Oct 2023, GMS March 2024).
**Rule followed while writing:** every formula and table below is copied from a cited source. Anything I could not verify is marked `UNVERIFIED`.

---

## 0. Source inventory and how much to trust each

| Source | URL | What it's good for | Freshness / authority |
|---|---|---|---|
| StrategyWiki — *MapleStory/Formulas* | https://strategywiki.org/wiki/MapleStory/Formulas | The single most complete public formula reference. Damage range, mastery, weapon multiplier, IED, level advantage, force maps, stat equivalence. | Actively maintained; snapshot used here is the Wayback capture `20260514010907`. **This is the primary source.** Note: the live site is behind Cloudflare; use `https://web.archive.org/web/<ts>id_/https://strategywiki.org/wiki/MapleStory/Formulas` (response is zstd-encoded). |
| MapleStory Wiki (maplestorywiki.net) — *Damage Formula* | https://maplestorywiki.net/w/Damage_Formula (raw: `?action=raw`) | Cleanest statement of the multiplicative factor list; per-**job** weapon constants (incl. newest classes); crit/IED/elemental multipliers; flame-score algebra. | Current, community-maintained, includes 2025–26 classes (Mo Xuan, Ren, Erel Light, Lynn, Sia Astelle). |
| MapleStory Wiki — *Combat Power* | https://maplestorywiki.net/w/Combat_Power | The authoritative public description of the Combat Power formula + boss CP entry gates. | Current. |
| python-fiddle CP proof-of-concept (cited by the wiki) | https://python-fiddle.com/saved/Hv6sN7miNlXfTijSoTO6 | A **runnable, verified-against-a-screenshot** implementation of Combat Power. | Best CP evidence available. |
| MapleWiki (Fandom) — `User_blog:SupportDesk/Formulas` | https://maplestory.fandom.com/wiki/User_blog:SupportDesk/Formulas | Compact one-line "output" formula; explicit stat-equivalence algebra; alternate CP constant. | Dated 17 Feb 2024; explicitly "paraphrased from StrategyWiki". Secondary. |
| mason's maple matrix — Boss Data | https://masonym.dev/bosses | **Per-boss PDR, level, Arcane/Sacred Force requirement and force bonus breakpoints.** | Current (includes Jupiter, Baldrix, Limbo, Malefic Star, Kai). |
| Grandis Library — Stat Terms | https://grandislibrary.com/content/stat-terms | Plain-language definitions; confirms IED multiplicative, boss% additive to dmg%, crit dmg 20/50 base. | Current, English GMS-oriented. |
| Orange Mushroom's Blog | https://orangemushroom.net/2023/10/20/kmst-ver-1-2-162-character-info-ui-changes/ | KMS source for the Combat Power UI introduction. | Oct 2023. |
| MapleSEA patch notes (v229 Bliss, v244 NEXT III) | https://www.maplesea.com/updates/view/V229_Patch_Notes/ , https://www.maplesea.com/updates/view/v244_Patch_Notes_2/ | Official (Nexon) wording of what Combat Power reflects. | 2024 / 2025-08. |
| GMS v251 "Go West" patch notes | https://www.nexon.com/maplestory/news/update/17541/v-251-go-west-patch-notes | Confirms Combat Power is live in GMS and where it is surfaced. | Current GMS. |

> **Convention used below.** Percentages are written as decimals in formulas (e.g. `dmg% = 0.72` means 72%) *unless* the formula is quoted verbatim from a source that used whole numbers, in which case the `/100` is kept as in the original.

---

## 1. The damage formula

### 1.1 The master expression

The full, single-line output formula (per hit, per line of a skill), from the Fandom formula blog (which paraphrases StrategyWiki) — bolded portion is what the game calls "range":

```
output =
  floor[ round{ 0.01 * wep * (4*primary + secondary) * floor[att * (1 + att%)] }
         * (1 + dmg% + bd%  or  nbd%)
         * (1 + fd%) ]
  * [0.5 * (1 + mastery%)]            <- per-hit random roll, see 1.9
  * (1)  or  (1.35 + cd%)             <- non-crit or crit, see 1.7
  * {1 - [def% * (1 - ied%)]}         <- see 1.8
  * (1)  or  [0.5 * (1 + ier%)]       <- elemental, see 1.10
  * lvl%                              <- level advantage, see 1.11
  * map%                              <- Star/Arcane/Sacred Force map modifier, see 1.12
  * skill%                            <- skill's own damage %
```
Source: https://maplestory.fandom.com/wiki/User_blog:SupportDesk/Formulas

MapleStory Wiki states the same thing as an ordered product of "unofficially named factors":

> `0.01` × Current Applied Weapon Constant × Stat Multiplier × Attack Power/Magic ATT × Damage Multiplier × Final Damage Multiplier × Critical Damage Multiplier × Ignore Defense Multiplier × Ignore Elemental Resistance Multiplier × Level Multiplier × Map Multiplier × Skill Multiplier × Mastery Multiplier
>
> *"Multiplying only the factors above, while subtracting Boss Damage or Normal Enemy Damage from Damage Multiplier, outputs Default Damage Range"*

Source: https://maplestorywiki.net/w/Damage_Formula

**Implementation note for the tracker:** for a "% damage gain" comparison you can drop every factor that is identical between the two candidates. Against a fixed boss, at 100% crit rate, the only terms that matter are:

```
relative_output ∝ statMultiplier
                 * floor(att * (1 + att%))
                 * (1 + dmg% + bd%)
                 * (1 + fd%)
                 * (1.35 + cd%)          [if crit rate = 100%; else blend, see 1.7]
                 * (1 - pdr * (1 - ied))
```

### 1.2 Stat multiplier (stat value)

**All jobs except Demon Avenger:**
```
statMultiplier = TotalPrimaryStat * 4 + TotalSecondaryStat
```
Source: https://strategywiki.org/wiki/MapleStory/Formulas §Stat Value

MapleStory Wiki generalises this to cover multi-stat classes:
```
statMultiplier = 4*(MainStat1 + MainStat2 + MainStat3) + SecondaryStat1 + SecondaryStat2
                 ; inapplicable stats are 0
```
Source: https://maplestorywiki.net/w/Damage_Formula

Each individual stat is:
```
Stat = floor(BaseValue * (1 + %Value)) + (%-not-applied "final" stat)
```
i.e. `TotalStat = floor(BaseTotalStat * (1 + Stat%)) + FinalStat`, rounded down; STR/DEX/INT/LUK/HP/MP/DEF/ATT/MATT are each computed independently.
Source: https://strategywiki.org/wiki/MapleStory/Formulas §Final Total Stats

Decomposed (the notation the equivalence algebra uses):

| Symbol | Meaning |
|---|---|
| `a` | non-final base primary stat = `AP + floor(AP * AP%) + added primary stat` |
| `b` | `1 + primary stat%` (flames, potentials, Xenon link, familiar pots) |
| `c` | **final** primary stat (hyper stats, symbols, Legion attacker effects, inner ability) |
| `d` | non-final base secondary stat = `4 + added secondary stat` |
| `e` | `1 + secondary stat%` |
| `f` | **final** secondary stat |

```
primary   = floor(a*b) + c
secondary = floor(d*e) + f
statMultiplier = 4*floor(a*b) + 4*c + floor(d*e) + f
```
Source: https://maplestory.fandom.com/wiki/User_blog:SupportDesk/Formulas

**Which stat is primary/secondary** (StrategyWiki §Stat Value):

| Class group | Primary | Secondary |
|---|---|---|
| Warrior (except Demon Avenger) | STR | DEX |
| Magician | INT | LUK |
| Bowman | DEX | STR |
| Thief (except Shadower, Dual Blade, Cadena, Xenon) | LUK | DEX |
| Thief — Shadower, Dual Blade, Cadena | LUK | **DEX + STR** |
| Pirate (gun users, Angelic Buster) | DEX | STR |
| Pirate (knuckle users, Cannoneer) | STR | DEX |
| **Demon Avenger** | HP | STR |
| **Xenon** | **STR + DEX + LUK** | none |

**Demon Avenger stat value** (the one true exception):
```
statValue = floor(PureHP / 3.5) + 0.8 * floor((TotalHP - PureHP) / 3.5) + STR
```
Notes from the same section:
- Total HP here **ignores the 500,000 displayed HP cap** (hover the HP entry in Ability Stats to see the real number).
- Pure HP is worth 25% more than HP from other sources.
- The two groups are floored **independently before summing**, so 1–3 HP may not move the range at all.
- Added HP from equips and set effects is **halved** for Demon Avenger (per the Fandom blog's "non final stats" note).

Demon Avenger **Pure HP** (assuming all AP into HP, 15 pure HP per AP):
```
1st job:            220 + 90*Level
2nd job:            395 + 90*Level
3rd job:            470 + 90*Level
4th job and beyond: 545 + 90*Level
```
Source: https://strategywiki.org/wiki/MapleStory/Formulas §Pure Stats

**Kanna** is the other exception, but on the *attack* side, not the stat side — see 1.4.

### 1.3 Base stats from level / AP

Every stat starts at a pure value of 4. AP granted: 4 at creation, 5 per character level (level 1 inclusive), +5 at 3rd job advancement, +5 at 4th job advancement.

```
Total AP before 3rd job:      4 + Level*5
Total AP at 3rd job:          9 + Level*5
Total AP at 4th job and past: 14 + Level*5
```
Max at level 300 = **1,514 AP**.
Source: https://strategywiki.org/wiki/MapleStory/Formulas §Pure Stats

MapleStory Wiki gives the auto-assigned main-stat figure for a normal 4th-job class:
```
Basic Base Main Stat = 5*(Level-10) + 4 (default) + 54 (unassigned AP after 1st job)
                       + 5 (after 3rd job) + 5 (after 4th job)
                     = 5*Level + 18
```
Source: https://maplestorywiki.net/w/Damage_Formula

In the stat window, each of STR/DEX/INT/LUK reads as `Total Stat (Pure Stat + Additional Stat)`.

### 1.4 Attack Power / Magic ATT

```
attTerm = floor(BaseATT * (1 + ATT%))            [all jobs except Kanna]
attTerm = floor(BaseATT * (1 + ATT%)) + FinalATT  [general form]
```
Magicians use Magic ATT and %Magic ATT. Source: https://maplestorywiki.net/w/Damage_Formula

Sources of **Final ATT / Final MATT** (not multiplied by ATT%) — StrategyWiki §Final Stats Increase:
- Inner Ability "Weapon ATT based on level": +1 Final Weapon ATT per 10–16 character levels (floored)
- Inner Ability "Magic ATT based on level": +1 Final Magic ATT per 10–16 character levels (floored)
- **Kanna** `Elemental Blessing`: +1 Final Magic ATT per 700 final total Max HP, floored (up to 500,000 HP ⇒ +714 final MATT)
- Monster Farm Luminous (Equilibrium): +1 Final ATT and Final MATT per 20 character levels

Sources of **%ATT**: "echo" buffs (Echo of Hero +4% ATT/MATT), 0th-job passives, weapon/secondary/emblem potentials, familiar badges, SSS-tier Magnificent Souls, familiar potentials. Source: Fandom blog §att%.

> To recover base ATT from the character UI: `BaseATT = shownATT / (1 + ATT%)`, then re-floor. (Fandom blog.)

### 1.5 Weapon multiplier (a.k.a. weapon constant)

Two equally-current sources; they agree wherever they overlap. Use the **job-keyed** table (MapleStory Wiki) as the primary, since it covers 2025–26 classes; use the weapon-keyed table (StrategyWiki) to resolve classes that can swap weapon types.

**By job** — https://maplestorywiki.net/w/Damage_Formula:

| Multiplier | Jobs |
|---|---|
| 1.75 | Night Lord, Night Walker, **Mo Xuan** |
| 1.7 | Buccaneer, Thunder Breaker, Shade, Blaster, Angelic Buster, Ark |
| 1.5 | Corsair, Cannoneer, Mechanic |
| 1.49 | Dark Knight, Aran, Zero: Beta, **Erel Light** |
| 1.44 | Hero with 2H Sword / 2H Axe |
| 1.35 | Marksman, Wild Hunter, Kanna |
| 1.34 | Hero with 1H Sword/1H Axe; Paladin with 2H Sword/2H Blunt; Dawn Warrior with 2H Sword; Kaiser; Zero: Alpha; **Lynn** |
| 1.3125 | Xenon |
| 1.3 | Bow Master, Pathfinder, Shadower, Dual Blade, Wind Archer, Mercedes, Phantom, Demon Avenger, Kain, Cadena, Adele, Khali, **Ren**, Hoyoung |
| 1.25 | Hayato |
| 1.24 | Paladin with 1H Sword/1H Blunt; Mihile; Dawn Warrior with 1H Sword |
| 1.2 | All Magicians except Kanna and Lynn; Demon Slayer |

**By weapon type** — https://strategywiki.org/wiki/MapleStory/Formulas §Weapon Multiplier:

| Weapon | Multiplier |
|---|---|
| Wand, Staff, Shining Rod, Psy Limiter, Magic Gauntlet | 1.20 |
| One-handed Blunt Weapon | 1.20 (1.24 Paladin) |
| One-handed Axe | 1.20 (1.34 Hero) |
| One-handed Sword | 1.24 (1.34 Hero) |
| Katana (Hayato) | 1.25 |
| Bow, Dagger, Dual Bowguns, Cane, Desperado, Energy Chain, Ancient Bow, Buchae, Tuner, Breath Shooter, Chakram | 1.30 |
| Whip Blade / Energy Sword (Xenon) | 1.3125 |
| Two-handed Blunt Weapon, Long Sword (Lazuli), Scepter | 1.34 |
| Two-handed Sword, Two-handed Axe | 1.34 (1.44 Hero) |
| Crossbow, Fan | 1.35 |
| Spear, Polearm, Great Sword (Lapis) | 1.49 |
| Gun, Cannon | 1.50 |
| Knuckle, Soul Shooter, Arm Cannon/Revolver | 1.70 |
| Claw | 1.75 |

> Minor discrepancy: StrategyWiki lists 1H Axe base as 1.20 while the by-job table implies Hero 1H axe = 1.34; and StrategyWiki does not list Mo Xuan / Ren / Erel Light / Lynn (newer classes). MapleStory Wiki is the more recently updated of the two for class coverage.

### 1.6 Damage %, Boss Damage %, Final Damage

**Damage multiplier — additive:**
```
damageMultiplier = 1 + dmg% + bd%      (vs. boss monsters)
                 = 1 + dmg% + nbd%     (vs. normal monsters)
```
Boss Damage % and Normal-Monster Damage % are **added to** Damage %, not multiplied.
Sources: https://maplestorywiki.net/w/Damage_Formula ; https://grandislibrary.com/content/stat-terms ("Similar to %Damage but only applied to Boss Monsters. It is **added** to %Damage in calculations.")

Monster Park monsters count as *normal* for nbd%/bd% purposes, but skills with separate boss/non-boss damage values use the boss value there. (StrategyWiki.)

**Final Damage — multiplicative:**
```
Total Final Damage % for n sources =
  100 * [(1 + F1/100) * (1 + F2/100) * ... * (1 + Fn/100)] - 100
```
"The result is rounded off in the stats window but when applied to the damage range, it is left in decimals."
Source: https://strategywiki.org/wiki/MapleStory/Formulas §Final Damage

Adding one more source: `newFD = (1 + oldFD) * (1 + source) - 1`.
Removing a source: divide instead.
Source: https://maplestorywiki.net/w/Damage_Formula

Maxed 5th-job Boost Nodes on a skill: `output * (1 + 0.02*60) = output * 2.2`. (MapleStory Wiki.)

**Reboot final-damage bonus** (a flat FD source by level, relevant if the tracker supports Reboot/Heroic worlds) — StrategyWiki §Final Damage:

| Level | Total Reboot FD |
|---|---|
| 1–99 | +15% |
| 100–149 | +20% |
| 150–199 | +25% |
| 200–249 | +35% |
| 250–299 | +45% |
| 300+ | +45% |

### 1.7 Critical rate and critical damage

**Critical rate:** base 5% for everyone including beginners; capped at 100% (the 5th-job *Critical Reinforce* buff can exceed the cap for its own effect but does not raise hit frequency).
Source: https://strategywiki.org/wiki/MapleStory/Formulas §Critical Rate

**Critical damage** — the displayed "Critical Damage" stat is added to a random roll between a low and a high base:
```
Lower Critical Damage % = 20 + CriticalDamageStat%
Upper Critical Damage % = 50 + CriticalDamageStat%
```
so the crit multiplier per hit is `1 + U/100` where `U ∈ [20 + cd, 50 + cd]`, i.e. the multiplier ranges `[1.20 + cd, 1.50 + cd]` with **average `1.35 + cd`**.
Sources: https://strategywiki.org/wiki/MapleStory/Formulas §Critical Damage ; https://maplestorywiki.net/w/Damage_Formula ("`1.35 + % Critical Damage` for critical hits ... Base % Critical Damage is a number between 1.2 and 1.5") ; https://grandislibrary.com/content/stat-terms ("added to a Lower Critical Damage (20%) and a Higher Critical Damage (50%) multiplier").

For a mixed crit rate `p`:
```
expectedCritFactor = p * (1.35 + cd) + (1 - p) * 1
```
Bossing is normally modelled at `p = 1` (100% crit rate is standard endgame), which is why Combat Power hard-codes `1.35 + cd` with no crit-rate term at all.

Special case: **Hayato** — `Shimada's Heart` gives +0.005% critical damage per 1 DEF up to 9,999 DEF (+49.995%), and it applies **even to non-critical hits**. (StrategyWiki.)

### 1.8 Ignore Enemy Defense (IED) and boss PDR

**Stacking is multiplicative on the complement:**
```
Total IED% = 100 - [100 * (1 - ID1/100) * (1 - ID2/100) * ... * (1 - IDn/100)]
```
Adding a source: `1 - [(1 - totalIED) * (1 - source)]`
Removing a source: `1 - [(1 - totalIED) / (1 - source)]`
Marginal contribution of a new source: `source * (1 - currentTotalIED)`
Sources: https://strategywiki.org/wiki/MapleStory/Formulas §Ignore DEF ; https://maplestorywiki.net/w/Damage_Formula

**Interaction with monster defense:**
```
defenseMultiplier = 1 - [ def% * (1 - ied%) ]
```
- `def%` is the monster's PDR/MDR expressed as a decimal (e.g. 300% ⇒ 3.0).
- If the multiplier is **0 or negative, output is 1 damage**.
- Monster DEF is applied **up to 500%** (`def% ≤ 5.0`).
- Typical values: `0.1` for ordinary mobs, `3.0`–`3.8` for endgame bosses.
Sources: https://maplestorywiki.net/w/Damage_Formula ; https://strategywiki.org/wiki/MapleStory/Formulas §Output

**What counts as a separate source** (this matters a lot for bottom-up modelling):
- **Every individual potential line is its own source.**
- A skill's 4th-job passive IED, its Hyper passive IED, and its 5th-job (Lv40) enhancement IED are **three separate sources**. Example from StrategyWiki: 20% hyper + 20% 5th-job = `1-(0.8*0.8)` = **36%**, not 40%.
- **Exception:** Hyper passives that *enhance a DEF-reducing debuff* add as percentage points to the debuff first. Example: a -30% monster DEF debuff plus a hyper passive that increases the reduction by 20% ⇒ 50% reduction, then that 50% multiplies as one source.

**Boss PDR table** — from https://masonym.dev/bosses (per-boss "PDR", plus Arcane Force `AF` / Sacred Force `SAC` requirement where applicable):

| Boss | Level | PDR | Force req. | Force bonus breakpoints |
|---|---|---|---|---|
| Zakum (Chaos) | 180 | 100% | — | — |
| Magnus (Hard) | 190 | 120% | — | — |
| Hilla (Hard) | 190 | 100% | — | — |
| Papulatus (Chaos) | 190 | 250% | — | — |
| Pierre (Chaos) | 190 | 80% | — | — |
| Von Bon (Chaos) | 190 | 100% | — | — |
| Crimson Queen (Chaos) | 190 | 120% | — | — |
| Vellum (Chaos) | 190 | 200% | — | — |
| Pink Bean (Chaos) | 190 | 100% | — | — |
| Cygnus (Easy/Normal) | 140 | 100% | — | — |
| Princess No | 160 | 100% | — | — |
| Akechi Mitsuhide | 210 | 300% | — | — |
| Gollux (Hard/Hell) | 190 | 150% | — | — |
| Lotus | 210 | 300% | — | — |
| Damien | 210 | 300% | — | — |
| Guardian Angel Slime | 220 | 300% | — | — |
| **Lucid** | 230 | **300%** | AF 360 | 400 AF +10%, 470 AF +30%, 540 AF +50% |
| **Will** | 235 | **300%** | AF 560 | 620 +10%, 730 +30%, 840 +50% |
| **Gloom** | 255 | **300%** | AF 730 | 805 +10%, 950 +30%, 1095 +50% |
| **Darknell** | 265 | **300%** | AF 850 | 940 +10%, 1105 +30%, 1275 +50% |
| **Verus Hilla** | 250 | **300%** | AF 820 | 905 +10%, 1070 +30%, 1230 +50% |
| **Black Mage** | 265–275 | **300%** | AF 1320 | 1455 +10%, 1720 +30%, 1980 +50% |
| **Chosen Seren** | 270 | **380%** | SAC 200 | 250 SAC ⇒ +25% (max) |
| **Kalos the Guardian** | 270 | **380%** | SAC 200 | 250 ⇒ +25% |
| **First Adversary** | 270 | **380%** | SAC 220 | 270 ⇒ +25% |
| **Kaling** | 275 | **380%** | SAC 230 | 280 ⇒ +25% |
| **Kai** | 270 | **380%** | — | — |
| **Malefic Star** | 280 | **380%** | SAC 400 | 450 ⇒ +25% |
| **Limbo** | 285 | **380%** | SAC 500 | 550 ⇒ +25% |
| **Baldrix** | 290 | **380%** | SAC 700 | 750 ⇒ +25% |
| **Jupiter** | 295 | **380%** | SAC 810 | 860 ⇒ +25% |

That page also carries per-phase HP for each boss; see the URL for the full HP breakdown (it self-describes HP as "estimated and sourced from the MapleStory Wiki").

**Practical modelling choice:** use `pdr = 3.00` for Arcane River bosses (Lucid → Black Mage) and `pdr = 3.80` for Grandis bosses (Seren, Kalos, Kaling, Limbo, Baldrix, Jupiter…). The `3.8` figure is exactly the "difficult bosses' Defense is 3.8" value MapleStory Wiki cites.

### 1.9 Mastery

```
masteryMultiplier = 0.5 * (1 + mastery%)     [average across hits]
```
Each hit rolls independently in `[mastery%, 1]` of the upper range. Beginners have 20% mastery. **Mastery is capped at 99%.** After 5th job, mastery is typically 86%–99% depending on job.
Sources: https://strategywiki.org/wiki/MapleStory/Formulas §Mastery ; https://maplestorywiki.net/w/Damage_Formula

StrategyWiki lists per-job mastery breakdowns (Hero 90–91%, Paladin 90–95%, Bowmaster 85–87%, Arch Mage 95–96%, Night Lord 85–87%, …) with the contributing skills. Port from §Mastery of that page if the tracker needs true min-damage; for **relative** upgrade comparisons mastery cancels out entirely.

### 1.10 Elemental resistance

| Monster elemental resistance | Final damage change |
|---|---|
| Weak | +50% (×1.5) |
| Neutral | 0% (×1) |
| Resistant / Strong | −50% (×0.5) |
| Immune | −100% |

Source: https://strategywiki.org/wiki/MapleStory/Formulas §Monster Elemental Resistance

*Ignore Elemental Resistance* (IER) applies **multiplicatively against the resistance**, not as a subtraction:
```
Strong:  0.5 * (1 + ier%)
Immune:  ier%            (i.e. the multiplier is just ier%)
Neutral: 1
Weak:    1.5
```
Example from StrategyWiki: 10% IER on a Strong resist takes the reduction from 50% to 45% (`0.5 × 0.9`), **not** 40%.

Almost all bosses are Strong-resist, so bossing carries a baseline ×0.5. With maxed *Insight* trait (+5% IER) this becomes `0.5 × 1.05 = 0.525`. (MapleStory Wiki.)
IER sources: Insight trait +0.5% per 10 levels up to +5%; various class skills +10%; party debuffs (Battle Mage *Weakening Aura*, Dawn Warrior *True Sight*, Flame Wizard *Orbital Flame 4*) +10% — **only one debuff applies, they do not stack**.

> For upgrade-delta purposes the elemental term cancels (it does not depend on gear), so it can be ignored — but it must be included if you want absolute damage numbers to match in-game.

### 1.11 Level advantage / level difference

Applied as a final-damage-style multiplier after everything above, before the "DEF to Damage" inner ability. It does **not** apply to Soul Weapon summons or damage-over-time.

Rules (StrategyWiki §Level Advantage Multiplier):
- 0 or more levels above monster: **+10%**, then **+2%p per level above**, max +20%
- 1–4 levels below: −2.5%p per level below (up to −10%), *multiplied* with the above-level bonus
- 5+ levels below: −2.5%p per level below (−100% at 40 levels)

| Your level − monster level | Multiplier (StrategyWiki) | MapleStory Wiki |
|---|---|---|
| +5 or higher | 1.20 | 1.2 |
| +4 | 1.18 | 1.18 |
| +3 | 1.16 | 1.16 |
| +2 | 1.14 | 1.14 |
| +1 | 1.12 | 1.12 |
| 0 | 1.10 (`1.1 × 1`) | 1.1 |
| −1 | 1.0584 (`1.08 × 0.98`) | 1.0584 |
| −2 | 1.007 (`1.06 × 0.95`) | 1.007 |
| −3 | 0.9672 (`1.04 × 0.93`) | 0.9672 |
| −4 | 0.918 (`1.02 × 0.90`) | 0.918 |
| −5 | 0.88 (`1.00 × 0.88`) | 0.88 |
| −6 | 0.85 | 0.85 |
| −7 | 0.83 | 0.83 |
| −8 | 0.80 | 0.80 |
| −9 | 0.78 | 0.78 |
| −10 | 0.75 | 0.75 |
| −15 | 0.63 | 0.63 |
| −20 | 0.50 | 0.50 (runes/chests/elites stop spawning at −21) |
| −30 | 0.25 | 0.25 |
| −40 or more | 0 (⇒ 1 damage) | 0 |

The two sources agree exactly on every entry I compared. MapleStory Wiki's table has a transcription bug at −37/−38/−39 (it lists `0.8 / 0.5 / 0.3` where the pattern requires `0.08 / 0.05 / 0.03`) — treat StrategyWiki's version as canonical.

> **Accuracy:** modern MapleStory has no player accuracy stat versus bosses; the old accuracy/avoidability system was removed and replaced by this level-advantage multiplier. There is a separate *Dodge Rate* / *Monster Accuracy Reduction* system for incoming damage (StrategyWiki §Dodge Rate), which is irrelevant to offensive gear scoring.

### 1.12 Map multiplier — Star Force / Arcane Force / Sacred (Authentic) Force

**Star Force maps** (StrategyWiki §Star Force Maps) — based on `yourStarForce / mapRequirement`, floored to a %:

| % of requirement met | Final damage change |
|---|---|
| 0–9% | −100% (deal 1 damage) |
| 10–29% | −90% |
| 30–49% | −70% |
| 50–69% | −50% |
| 70–99% | −30% |
| 100% | 0% |
| 100% + excess stars | +1% per excess star, up to **+20%** |

Star Force accounting: every star on a normal equip = 1 Star Force; every star on an **Overall = 2** Star Force. Max stars by item level (non-Superior): 0–95 → 5, 96–107 → 8, 108–117 → 10, 118–127 → 15, 128–137 → 20, **138+ → 25**. Superior (Tyrant) equips: 0–95 → 3, 96–107 → 5, 108–117 → 8, 118–127 → 10, 128–137 → 12, 138+ → **15**.

**Arcane Force maps** (StrategyWiki §Arcane Force Maps):

| % of requirement met | Final damage change |
|---|---|
| 0–9% | −90% |
| 10–29% | −70% |
| 30–49% | −40% |
| 50–69% | −30% |
| 70–99% | −20% |
| 100–109% | 0% |
| 110–129% | **+10%** |
| 130–149% | **+30%** |
| 150%+ | **+50%** |

This exactly reproduces the per-boss AF breakpoints on masonym.dev (e.g. Lucid req 360 → +10% at 400 = 111%, +30% at 470 = 130.5%, +50% at 540 = 150%).

**Authentic / Sacred Force maps** (StrategyWiki §Authentic Force Maps) — *linear*, not bracketed:
```
Below requirement: -1%p final damage per 1 Force short, max -95% (at 95+ short)
Above requirement: +1%p final damage per 2 Force over, floored, max +25% (at 50+ over)
```
This reproduces the "+25% (Max)" at `requirement + 50` shown on masonym.dev for every Grandis boss.

> **Naming:** KMS/MSEA call it *Authentic Force*; GMS calls the same stat **Sacred Force** (and the symbols "Sacred Symbols"). Treat the terms as synonyms.

### 1.13 The in-game "Damage Range" display

This is the number the tracker will most often be handed from a screenshot, so get it exact.

**With a weapon equipped** (StrategyWiki §Damage Range):
```
UpperActual = Multiplier * StatValue * TotalJobATT / 100        , rounded off (round-half)
LowerActual = UpperActual * Mastery% / 100                      , rounded off
UpperShown  = floor( UpperActual * (1 + Damage%/100) * (1 + Final%/100) )
LowerShown  = floor( 1 + LowerActual * (1 + Damage%/100) * (1 + Final%/100) )
```
- `Multiplier` = weapon multiplier (1.2 … 1.75)
- `TotalJobATT` = total Magic ATT for magician weapons, total Weapon ATT otherwise
- Display is capped at `999B 999M 999K 999`, but the underlying value used for damage is uncapped.
- **Critically:** the *shown* range uses only `Damage%` — it does **not** include Boss Damage % or Normal Monster Damage %. When damage is actually computed, the game uses `UpperActual`/`LowerActual` and applies `(1 + dmg% + bd%)` or `(1 + dmg% + nbd%)`.

Equivalently (Fandom blog §"range"):
```
upper range   = 0.01 * wep * statMultiplier * floor[att * (1 + att%)]
"range" shown = floor[ round(upper range) * (1 + dmg%) * (1 + fd%) ]
lower range   = upper range * mastery%
average range = upper range * 0.5 * (1 + mastery%)
```

**Weaponless:** non-Xenon pirates get `UpperActual = 1.43 * StatValue / 100`, `LowerActual = UpperActual / 5`; every other class has range 0 and cannot attack. (StrategyWiki.)

**Deriving hit damage back from the shown range** (StrategyWiki §Active Skills), for a 0%-DEF, no-resistance, non-critical hit:
```
Hit (normal mobs) = ShownDamage / (1 + TD%/100) * Skill%/100 * (1 + (TD% + NBD%)/100)
Hit (boss)        = ShownDamage / (1 + TD%/100) * Skill%/100 * (1 + (TD% + BD%)/100)
```
then multiply by the crit factor `(1 + CriticalDamage%/100)`, the DEF factor `1 - [MonsterDEF%/100 * (1 - IgnoreDEF%/100)]`, and the resistance/level/map/mastery factors.

> `ShownDamage` is a uniform random draw between lower and upper shown range. Ordinary (non-skill) attacks have `Skill% = 100`.

**Hit damage cap:** 150,000,000,000 per line (150 B), or 105,000,000,000 during Ring of Torment / Penance Ring. Arrow Bomb's cap is multiplied by its skill% (≈787.5 B). (StrategyWiki §Output.)

### 1.14 Things that behave differently

- **Damage over time** is *not* affected by mastery, monster DEF, crit, damage%, boss%, normal-monster%, or final damage%. It is `UpperActual * Skill%/100`, then modified by resistance, force maps and level advantage only. (StrategyWiki §Damage Over Time.) → **DoT-heavy classes will be mis-scored by a generic calculator.**
- **Soul Weapon summons** ignore crit rate, durational-buff damage%, boss%, normal%, monster DEF and IER; they use `ActualDamage * Skill%/100 * (1 + TD%/100) * (1 + Final%/100)` with TD% limited to toggles and passives. (StrategyWiki §Soul Weapon Summons.)
- **Shadow Partner / doppelgangers** multiply the original skill% by the clone's own constant.
- The **"DEF to Damage" inner ability** is added *additively at the very end*, after every multiplier (and does not apply to DoT).

---

## 2. Combat Power

### 2.1 What it is and where it exists

Combat Power (CP) is a single scalar shown in the Character Info UI, designed to be comparable *across classes* by normalising away job-specific factors.

- Introduced in **KMST 1.2.162** (test world, 20 Oct 2023) as part of the Character Info / Stats UI reorganisation, alongside newly surfaced fields: Normal Monster Damage, Cooldown Reduction, Cooldown Not Applied, Abnormal Status Additional Damage, Ignore Elemental Resistance, Additional EXP Obtained, and Weapon Mastery. In the same patch, raw "attack power" was removed from the stat window and weapon proficiency displayed instead. Source: https://orangemushroom.net/2023/10/20/kmst-ver-1-2-162-character-info-ui-changes/
- **GMS received it in the March 2024 "Minar"-era patch** (community confirmation: https://www.reddit.com/r/Maplestory/comments/1bghdtm/ ; reaction thread https://www.reddit.com/r/Maplestory/comments/1bjmqem/). GMS v251 "Go West" later added Combat Power and Character Info UI buttons to the Character Details pop-up and to the chat-window right-click menu: https://www.nexon.com/maplestory/news/update/17541/v-251-go-west-patch-notes
- Official Nexon description (MapleSEA v229 Bliss notes, same build family as GMS): *"Combat Power reflects your character's basic stat, equipments, traits, abilities, Hyper Stat, Maple Union Attack Unit and Occupying effects, Monster Life and HEXA Stat. Stat increases from all skills, including Link Skill and Guild skills and consumable items are not reflected in Combat Power."* https://www.maplesea.com/updates/view/V229_Patch_Notes/

**KMS vs GMS:** I found **no evidence of a formula difference**. The formula is a client/server-side calculation shipped with the same build; GMS, MSEA and CMS all describe it identically. What *does* differ by region is what CP is *used for*: **ChinaMS's NEXT update gates boss entry on Combat Power** (Hard Limbo requires 1,500,000,000 CP total for the party, with per-member minimums). GMS has no such gate as of this writing. Source: https://maplestorywiki.net/w/Combat_Power — that page carries the full per-boss CP entry table (Zakum 10k/30k/300k … Jupiter 900,000,000 / 4,500,000,000).

### 2.2 The formula

Per https://maplestorywiki.net/w/Combat_Power, CP is the product of these terms, **rounded down**:

1. `0.01`
2. `Current Weapon Constant / highest possible Weapon Constant` — for jobs whose Weapon Mastery lists multiple weapon types, so that using a lower-constant weapon is penalised
3. an **unknown additional constant for Demon Avenger and Xenon** (because their stat multiplier is not `4×main + secondary`)
4. `4*(MainStat1 + MainStat2 + MainStat3) + SecondaryStat1 + SecondaryStat2`
5. `1 + Damage + BossDamage`
6. `(1 + FinalDamage) / ((1 + FD_from_skill_1) * (1 + FD_from_skill_2) * ...)` — i.e. **skill-sourced final damage is divided back out**
7. `1.35 + CriticalDamage`
8. the ATT term, **normalised to a "bow"**:
```
floor( ( AttackPower
         + floor( "bow" BaseATT / weapon BaseATT - 1 ) * ( weapon BaseATT + weapon StarForce ATT ) )
       * (1 + ATT%) )
```
   equivalently: `AttackPower − weapon's total ATT + ATT of the corresponding "bow" with equivalent enhancements`.

Magicians substitute Magic ATT and %Magic ATT. Except for Final Damage, **all skill and consumable boosts must be subtracted from every term**. For Zero, the secondary weapon's base stats and some bonus stats are excluded.

**The "bow" normalisation.** The wiki notes CP is easiest to compute for jobs whose weapon shares a Bow's base-ATT scaling: Bow Master, Pathfinder, Shadower, Dual Blade, Wind Archer, Mercedes, Kain, Cadena, Khali, Hoyoung. For everyone else, the weapon's *prefix tier* determines the equivalent bow base ATT:

| Weapon tier | Item level | "Bow" base ATT | Source |
|---|---|---|---|
| Destiny | 250 | **349** | wiki CP page; verified on https://maplestorywiki.net/w/Destiny_Bow (`incWAttack=349`) |
| Genesis | 200 | **318** | wiki CP page; verified on https://maplestorywiki.net/w/Genesis_Bow (`incWAttack=318`) |
| Arcane Umbra (Arcaneshade) | 200 | **276** | wiki CP page; verified on https://maplestorywiki.net/w/Arcane_Umbra_Bow (`incWAttack=276`) |
| AbsoLab | 160 | **192** | wiki CP page; verified on https://maplestorywiki.net/w/AbsoLab_Sureshot_Bow (`incWAttack=192`) |
| Sweetwater | 160 | 160 | https://maplestorywiki.net/w/Sweetwater_Bow — *extension, not on the CP page* |
| Fafnir (Wind Chaser) | 150 | 160 | https://maplestorywiki.net/w/Fafnir_Wind_Chaser — *extension* |
| Commerci | 150 | 126 | https://maplestorywiki.net/w/Commerci_Bow — *extension* |
| Utgard | 140 | 115 | https://maplestorywiki.net/w/Utgard_Bow — *extension* |

The first four rows are the ones the CP page lists (it then truncates with "…"); I verified all four against the individual item pages via `https://maplestorywiki.net/index.php?title=<Item>&action=raw` (`|incWAttack=` field). The last four rows are my own extension from the same item-page field and are **not** confirmed as the values the CP routine actually uses — mark `UNVERIFIED` for CP purposes.
Magicians convert Magic ATT into equivalent bow ATT, disregarding the weapon's own base ATT.

### 2.3 A verified reference implementation

The wiki's citation is a runnable script that reproduces a real character's CP exactly (expected 236,118). Reproduced verbatim from https://python-fiddle.com/saved/Hv6sN7miNlXfTijSoTO6 :

```python
#!/usr/bin/env python3
# proof of concept of calculating combat power exactly
# based on this mule: https://imgur.com/a/HSIHL43
# credits to Ascheric for the info about converting weapon to bow:
# https://www.reddit.com/r/Maplestory/comments/1de4h6p/comment/l89hsqs/

innateFlatAtt  = ( 40 + 40 + 0 )        # lune, Cane Expert
innateFinalDmg = ( 1.30 * 1.32 * 1 )    # piercing vision, Cane Expert
innateDmg      = ( 30 + 0 )             # Priere D'Aria
innateCritDmg  = ( 15 + 0 )             # Cane Expert
innateBossDmg  = ( 0 )

flatStat1, stat1, finalStat1, innateStat1 = 2077, 129, 500, 140
flatStat2, stat2, finalStat2, innateStat2 =  750,  48,  85,  40
flatAtt, att   = 484, 6
critDmg        = 40.50
dmg            = 72
bossDmg        = 25
finalDmg       = 71.60
weaponMul      = 1.3
weaponSfAtt, weaponBaseAtt, bowBaseAtt = 37, 108, 105

def toMultiplier(percent):
    return 1 + percent / 100.0

import math
attMul = toMultiplier(att)
totalFlatAtt = ( (flatAtt - innateFlatAtt)
                 + math.floor((bowBaseAtt / weaponBaseAtt - 1) * (weaponBaseAtt + weaponSfAtt)) )
totalStat1 = math.floor((flatStat1 - innateStat1) * toMultiplier(stat1) + finalStat1)
totalStat2 = math.floor((flatStat2 - innateStat2) * toMultiplier(stat2) + finalStat2)

combatPower = math.floor(
    (4*totalStat1 + totalStat2) * 0.01 *
    math.floor(totalFlatAtt * attMul) *
    toMultiplier(critDmg - innateCritDmg + 35) *
    toMultiplier(bossDmg - innateBossDmg + dmg - innateDmg) *
    (toMultiplier(finalDmg) / innateFinalDmg)
)
print(f"combat power: {combatPower}")   # expected: 236118
```

Read off the structure:
```
CP = floor( 0.01
          * (4*mainStat + secondaryStat)
          * floor(bowNormalisedATT * (1 + ATT%))
          * (1.35 + critDmg_excl_class)
          * (1 + dmg_excl_class + boss_excl_class)
          * (1 + FD_total) / Π(1 + FD_from_class_skills) )
```
Note `toMultiplier(cd + 35)` is literally `1.35 + cd/100` — matching the wiki's `1.35 + CriticalDamage` term. The weapon-constant ratio does not appear because this character (a cane user, constant 1.3) has no alternative weapon type, so the ratio is 1.

### 2.4 The competing constant

The Fandom formula blog states CP as:
```
0.00451901240229 * statMultiplier * floor[att * (1 + att%)] * (1 + dmg% + bd%) * (1 + fd%) * (1.35 + cd%)
```
Source: https://maplestory.fandom.com/wiki/User_blog:SupportDesk/Formulas — its footnotes cite two MapleSEA "Bliss" UI screenshots (`https://media.playpark.net/pp/bliss/images/b_ui1.png`, `b_ui2.png`) and the Orange Mushroom KMS 1.2.383 post, and it explicitly notes that CP *"includes a multiplier where the weapon's attack/magic attack will be converted to a standardized value based on its level, rank, additional options [flames], and Star Force values."*

**Which to trust:** the `0.00451901240229` figure is an *empirical fit* to one screenshot in which the weapon-standardisation step was **not** applied to the ATT input — so the ratio `0.004519/0.01 ≈ 0.4519` is absorbing that character's weapon→bow conversion, not a universal constant. **Use `0.01` plus the explicit bow-normalisation** (maplestorywiki + python-fiddle), which is reproducible. Treat the Fandom constant as a cross-check, not a spec.

### 2.5 What CP includes and excludes

From https://maplestorywiki.net/w/Combat_Power:

**Included:** base stat values, HEXA Stats, equipment stats, Inner Ability, Hyper Stats, Legion member and grid bonuses, Legion Artifact, arrows/throwing stars/bullets that apply to output, Blessing of the Fairy and Empress's Blessing, Star Force Enhancement, Tanadian Ruin, stat increases from certain event skills, pet buffs, Heroic (world) bonuses, HP and MP from Traits.

**Excluded:** Ignore Defense, Ignore Elemental Resistance, Level Advantage multiplier, Map multiplier, stat increases from skills (including Link Skills and Guild Skills), stat increases from consumables.

### 2.6 Why CP is a *bad* optimisation target for this tool

Because CP omits **IED entirely**, has **no crit-rate term** (it assumes 100% crit), and folds all classes onto a single weapon constant, it cannot rank two upgrades correctly when one of them is an IED line or when the character is below 100% crit rate. It also cannot distinguish bossing from mobbing (it always adds `bd%`). CP is useful as a **checksum** — if your bottom-up model reproduces the player's shown CP, your inputs are probably right — but the ranking metric should be modelled output against a specific boss (§3).

---

## 3. Stat equivalence — "how much is X worth?"

### 3.1 The correct general method (recommended)

Do **not** use closed-form per-stat equivalences as the primary engine. The standard, correct approach is:

1. Fix a **target profile**: boss PDR (3.0 or 3.8), boss level, crit rate assumption (usually 100%), whether the buffed/burst state or the idle state is being modelled.
2. Compute a baseline **relative damage scalar** from the character's current totals:
```
D(state) = statMultiplier
         * floor(att * (1 + att%))
         * (1 + dmg% + bd%)
         * (1 + fd%)
         * critFactor(critRate, critDmg)
         * (1 - pdr * (1 - ied))
```
   (weapon constant, `0.01`, mastery, elemental, level and map multipliers all cancel between the two states, so they may be omitted — but *only* if the candidate change cannot affect them.)
3. Apply the candidate change to the appropriate input, recompute `D'`.
4. Report
```
absolute % damage gain = (D' - D) / D
```

This is exactly the framing StrategyWiki uses: *"relative change = (new − old) / old"*, *"relative change + 1 = new / old"* (§Stat Equivalence), and it is the framing MapleStory Wiki uses for its flame-score algebra (§Stat Equivalence for Most Jobs).

**Order of operations that must be preserved for accuracy:**
- `statMultiplier` needs the floors: `4*floor(a*b) + 4*c + floor(d*e) + f`. Dropping the floors introduces a sub-0.01% error, which is fine for ranking but not for reproducing a range exactly.
- `att` must be floored *after* `(1 + att%)`.
- IED must be composed multiplicatively (§1.8) **before** entering the defense term — adding an IED line is not `+x%` to the total.

### 3.2 Why per-stat closed forms still matter (and their exact forms)

They are useful for two things: (a) explaining *why* a stat is currently weak, and (b) expressing every candidate in a common unit ("flame score"), which is how the community compares gear. MapleStory Wiki gives the algebra in terms of `a,b,c,d,e,f` (§1.2 above), where `x` is "how many main stat this is worth":

**1% All Stats** (both main and secondary go up by 1%p):
```
x = (0.01*a + 0.0025*d) / b
```

**1 secondary stat:**
```
x = e / (4b)
```

**Generic factor change (`old` → `new`)** — the master form for ATT, damage%, boss%, final damage, crit damage, IED:
```
x = [ ( new * (4ab + 4c + de + f) / old ) - 4c - de - f ] / (4b)  -  a
```

**1 base ATT (jobs except Kanna):**
```
x = [ ( (att+1) * (4ab + 4c + de + f) / att ) - 4c - de - f ] / (4b)  -  a
```

**1% damage or 1% boss damage (weapon flames):**
```
x = [ ( (1.01 + dmg% + bd%) * (4ab + 4c + de + f) / (1 + dmg% + bd%) ) - 4c - de - f ] / (4b)  -  a
```
All from https://maplestorywiki.net/w/Damage_Formula §Stat Equivalence for Most Jobs. The wiki explicitly warns these are **inexact because the floor functions are dropped**.

The Fandom blog gives the same four derivations with the floors retained in the non-`x` terms — e.g. for 1 secondary stat:
```
x = ( 4*floor(a*b) + floor((d+1)*e) - floor(d*e) ) / (4b)  -  a
```
Source: https://maplestory.fandom.com/wiki/User_blog:SupportDesk/Formulas §stat equivalence for most classes.

**Corollary the wiki states outright:** *"For jobs except Demon Avenger, gaining 1 Flame score represents the same increase in output as gaining 1 Main Stat."* That is the definition of flame score.

### 3.3 Per-upgrade formulas, derived from the master expression

Given current totals, the **absolute % damage gain** of each common upgrade against a boss:

| Upgrade | Multiplier applied to `D` | Notes |
|---|---|---|
| **+N main stat (flat, "final" stat like symbols/hyper/legion)** | `(statMult + 4N) / statMult` | goes into `c`, not multiplied by stat% |
| **+N main stat (added, i.e. flame/potential flat)** | `(4*floor((a+N)*b) + 4c + floor(d*e) + f) / statMult` | multiplied by your stat% |
| **+1% main stat** | `(4*floor(a*(b+0.01)) + 4c + floor(d*e) + f) / statMult` | scales with `a` |
| **+N secondary stat** | `(statMult + N*e) / statMult` (approx.) | worth `e/(4b)` main stat each |
| **+1 ATT (base)** | `(att + 1) / att` | `att` here is *base* ATT before `%ATT` |
| **+1% ATT** | `floor(baseAtt*(1+attPct+0.01)) / floor(baseAtt*(1+attPct))` | |
| **+1% boss damage** | `(1 + dmg + bd + 0.01) / (1 + dmg + bd)` | identical to +1% damage |
| **+1% damage** | same as above | boss% and dmg% are interchangeable vs. bosses |
| **+1% final damage** | `(1 + fd_new) / (1 + fd_old)` where `fd_new = (1+fd_old)*1.01 - 1` ⇒ **exactly ×1.01** | FD is the only stat with a flat, state-independent 1% gain |
| **+1% crit damage** (at 100% crit) | `(1.35 + cd + 0.01) / (1.35 + cd)` | at <100% crit, use the blended `critFactor` |
| **+1% crit rate** | `(p' * (1.35+cd) + (1-p')) / (p * (1.35+cd) + (1-p))` | **zero value at p = 100%** |
| **+X% IED (a new source)** | `(1 - pdr*(1 - ied_new)) / (1 - pdr*(1 - ied_old))`, `ied_new = 1 - (1-ied_old)*(1-X)` | strongly non-linear in current IED |

**Worked sanity check for IED.** At `pdr = 3.00` and current IED 89%:
`defOld = 1 - 3.0*0.11 = 0.67`. Adding a 30% IED line: `iedNew = 1 - 0.11*0.70 = 0.923`, `defNew = 1 - 3.0*0.077 = 0.769`. Gain = `0.769/0.67 - 1 = **+14.8%**`. The same 30% line at 95% IED: `0.85 → 0.895` = **+5.3%**. At 100% IED the line is worth **0**. This non-linearity is the single most important thing the tool must get right, and it is why "1% IED = N main stat" tables are dangerous.

### 3.4 The community's shortcut diagnostics (and their limits)

StrategyWiki §Stat Equivalence publishes three 2-D "which stat is weakest" charts for a 300%-DEF boss, along with the underlying curve equations. For **A% IED vs B% Damage/Boss** on a target with **C% DEF**:
```
0.01*A*C*(1 - 0.01x) / [100 - C*(1 - 0.01x)]  =  B / (100 + y)
```
where `x` = your current total IED% and `y` = your current `Damage% + Boss%` (or `ATT%` for the IED-vs-ATT chart).

For **A% ATT vs B% Damage/Boss** (no DEF term needed):
```
A / (100 + x)  =  B / (100 + y)
```
with `x` = current ATT%, `y` = current Damage% + Boss%. The example given: 10% Damage/Boss vs 3% ATT ⇒ `3/(100+x) = 10/(100+y)`, i.e. `3y = 700 + 10x`.

The page's own methodology note is worth repeating in the tool's docs:
> *"as per the stat equivalence logic, it only applies to the current stat configuration, and any changes to the stats can change such ratios as well. Be careful when making judgements (for example, when the stat equivalence suggests trading off Ignore DEF for Boss Damage, but by doing the tradeoff, the new stat equivalence suggests doing the opposite now)."*

⇒ **Design implication:** compute equivalences fresh from current totals on every render, and when evaluating a *set* of simultaneous upgrades, evaluate the set jointly rather than summing individual deltas.

Two community tools are cited there for cross-checking your numbers:
- amph's Star Force / Equivalence Calculator (MapleSEA): https://amph.shinyapps.io/starforce/ — has an "Equivalence Calculator" tab
- Maple Meta Calculator (Google Sheets), by u/Masterobert: https://docs.google.com/spreadsheets/d/1Q1Dj-2xEovBE1Ldlcqrdcjl1il7IfqF7opJJ2ZXyWl4

### 3.5 Minimum input set for "absolute % damage gain"

To produce a correct ranking, the tool needs, at minimum:

**Required (all readable from the Character Info / Stat UI):**
- Total main stat, total secondary stat *(and for Xenon, all three; for Demon Avenger, Total HP + Pure HP + STR)*
- `%` main stat and `%` secondary stat — needed to split `a` from `b`; otherwise flat-stat upgrades are mis-valued
- Total ATT or MATT, and `%ATT` / `%MATT` — needed to recover base ATT via `base = shown / (1 + att%)`
- Damage %, Boss Damage %, Final Damage %
- Critical Rate %, Critical Damage %
- Ignore DEF % **and** the list of individual IED sources (see below)
- Character level, class

**Required but not visible in the UI (the hard part):**
- **The decomposition of total IED into its individual sources.** The stat window shows only the composed total. To evaluate "what if I add a 30% IED potential line?" you only need the total (the marginal formula in §1.8 works off the total). But to evaluate "what if I *replace* a 30% line with a 35% line?" you need to remove the old source first: `1 - [(1 - total)/(1 - 0.30)]`. So the tool should let the user enter, per equipment slot, the IED lines currently on it.
- Which final-damage sources come from class skills (needed only for CP reconciliation, §2).

**Optional / cancels out for ranking:** weapon constant, mastery, elemental resistance, level advantage, map multiplier — all identical across candidates unless the upgrade changes weapon type or Arcane/Sacred Force.

---

## 4. Stat tables the calculator needs

### 4.0 Class-specific values — and why bottom-up modelling breaks here

Before the gear tables, the single most important architectural fact: **class contributions to the damage formula are enormous, conditional, and not enumerable from equipment data.** StrategyWiki tabulates, per class, the range from "personal effects only, unbuffed" to "everything up including 5th-job buffs". Reproduced here as the per-class *range* (`min% ~ max%`) — source https://strategywiki.org/wiki/MapleStory/Formulas, sections §Mastery, §Final Damage, §Ignore DEF, §Critical Damage, §Damage to Boss Monsters:

**Weapon Mastery by class** (needed only for the *lower* end of the damage range; cancels in ratio comparisons):

| Class | Mastery | Class | Mastery |
|---|---|---|---|
| Hero | 90–91% | Battle Mage | 95–97% |
| Paladin | 90–95% | Wild Hunter | 85–87% |
| Dark Knight | 90–92% | Mechanic | 85–87% |
| Arch Mage (F/P) | 95–96% | Xenon | 90–92% |
| Arch Mage (I/L) | 95–96% | Demon Slayer | 90–92% |
| Bowmaster | 85–87% | Demon Avenger | 90–92% |
| Marksman | 85–87% | Kaiser | 90–92% |
| Pathfinder | 85–87% | Kain | 85–87% |
| Night Lord | 85–87% | Cadena | 90–92% |
| Shadower | 90–92% | Angelic Buster | 95–97% |
| Dual Blade | 90–92% | Adele | 90–92% |
| Buccaneer | 90–91% | Illium | 90–93% |
| Corsair | 85–87% | Ark | 90–92% |
| Cannoneer | 85–87% | Hoyoung | 90–92% |
| Mihile | 90–92% | Kinesis | 90–99% |
| Dawn Warrior | 90–92% | Kanna | 95–97% |
| Flame Wizard | 95–98% | Luminous | 95–97% |
| Wind Archer | 85–87% | Evan | 95–98% |
| Night Walker | 85–87% | Mercedes | 85–87% |
| Thunder Breaker | 90–92% | Phantom | 90–92% |
| Aran | 90–92% | Shade | 90–92% |
| Blaster | 90–92% | | |

Mastery is capped at 99% regardless.

**Class-innate Final Damage** (min = passives only, max = fully buffed with 5th-job and all conditionals). The spread is the reason no calculator builds this bottom-up:

Hero +10% → +2,353.50% · Paladin +40% → +1,000.47% · Dark Knight +50% → +1,219.57% · Bowmaster +0% → +2,500% · Pathfinder +0% → +317.45% · Night Lord +25% → +688.80% · Shadower +25% → +812.32% · Dual Blade +20% → +1,171.19% · Buccaneer +0% → +509.84% · Corsair +20% → +686.38% · Cannoneer +43% → +476.40% · Mihile +26.5% → +1,430.15% · Dawn Warrior +0% → +623.45% · Flame Wizard +95% → +1,093.07% · Wind Archer +25% → +555.20% · Night Walker +15% → +1,051.60% · Thunder Breaker +20% → +723.68% · Aran +0% → +250.22% · Luminous +82% → +1,036.00% · Evan +49.5% → +513.33% · Mercedes +38% → +578.96% · Phantom +30% → +874.52% · Shade +26.5% → +960.57% · Blaster +0% → +554.13% · Battle Mage +15% → +630.16% · Wild Hunter +20% → +384% · Mechanic +20% → +617.60% · Xenon +0% → +1,183.14% · Demon Slayer +25% → +867.46% · Demon Avenger +0% → +932.47% · Kaiser +20% → +949.71% · Kain +87.2% → +381.24% · Cadena +0% → +849.66% · Angelic Buster +10% → +664.79% · Adele +49.5% → +827.37% · Illium +35% → +489.74% · Ark +32% → +373.55% · Hoyoung +51.25% → +449.82% · Kinesis +30% → +1,369.91% · Zero (α and β) +31.25% → +429.79% · Hayato +0% → +1,677.62% · Kanna +0% → +1,051.51%

**Class-innate Ignore DEF** (many classes reach 100% on their own with buffs — note that at 100% IED, additional IED lines are worth *literally zero*): Hero 50–68.4% · Paladin 30–100% · Dark Knight 30–74.6% · AM(F/P) 20–71.0% · AM(I/L) 0–66.1% · Bishop 0–72.0% · Bowmaster 25–74.9% · Marksman 40–100% · Pathfinder 30–57.4% · Night Lord 30–68.9% · Shadower 20–100% · Dual Blade 0–100% · Buccaneer 0–100% · Corsair 20–88.5% · Cannoneer 20–100% · Mihile 40–100% · Dawn Warrior 37–75.2% · Flame Wizard 0–66% · Wind Archer 0–59.3% · Night Walker 15–56.8% · Thunder Breaker 0–64.8% · Aran 40–83.9% · Luminous 40–100% · Evan 20–100% · Mercedes 25–77.9% · Phantom 0–65.6% · Shade 30–57.1% · Blaster 35–100% · Battle Mage 30–79.1% · Wild Hunter 30–100% · Mechanic 30–44% · Xenon 30–67.2% · Demon Slayer 30–80.6% · Demon Avenger 30–100% · Kaiser 40–100% · Kain 37–63.8% · Cadena 20–91.0% · Angelic Buster 15–77.6% · Adele 20–69.8% · Illium 25–52.6% · Ark 30–73.2% · Hoyoung 19–62.4% · Kinesis 25–85.3% · Zero α 30–100%, β 0–100% · Hayato 35–67.5% · Kanna 0–37.6%

**Class-innate Critical Damage:** Hero 0–20% · Paladin 20–21% · Dark Knight 23–39% · AM(I/L) 13–28% · Night Lord 30–31% · Shadower 35–68% · Dual Blade 13–16% · Buccaneer 15–55% · Corsair 50–57% · Cannoneer 5–15% · Mihile 8–18% · Dawn Warrior 15–16% · Night Walker 30–31% · Thunder Breaker 45–46% · Luminous 15–16% · Evan 40–41% · Phantom 15–16% · Shade 20–58% · Blaster 20–22% · Battle Mage 40–52% · Demon Slayer 15–176% · Kaiser 15–16% · Cadena 25–128% · Angelic Buster 15–64% · Ark 30–33% · Hoyoung 40–43% · Kinesis 30–56% · Zero α 50–70% · Hayato 30–47% · Kanna 20–37%

**Class-innate Boss Damage:** Hero 0–24% · Paladin 0–30% · Dark Knight 0–21% · Bowmaster 0–30% · Marksman 0–10% · Pathfinder 0–70% · Night Lord 10–40% · Shadower 0–20% · Buccaneer 0–50% · Corsair 0–20% · Cannoneer 40–42% · Dawn Warrior 15–38% · Wind Archer 40–73% · Night Walker 0–20% · Thunder Breaker 0–20% · Aran 0–45% · Luminous 0–25% · Evan 20–48% · Mercedes 20–68% · Shade 30–98% · Blaster 20–22% · Battle Mage 0–30% · Wild Hunter 0–30% · Xenon 0–32% · Demon Slayer 0–50% · Kaiser 0–28% · Kain 10–25% · Cadena 0–20% · Angelic Buster 0–70% · Adele 10–32% · Illium 30–81% · Ark 30–117% · Kinesis 30–32% · Hayato 0–20% · Kanna 0–25%

**Conclusion:** these ranges are per-skill, per-buff-uptime and per-condition. A tool cannot reconstruct them from gear. It must **read the composed totals off the Character Info UI** and treat class contribution as an opaque baseline. See §5.

---

*(Sections 4.1–4.x below are populated by the dedicated table-research passes.)*

## 5. What existing calculators ask for vs. compute

*(Populated by the calculator-survey pass; see the section below.)*
