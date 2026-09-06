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

## 4A. Star Force, Flames, and Potential / Bonus Potential

*Research pass A. Scope: Star Force enhancement, Flames (bonus stats), Potential and Bonus Potential. Section numbering below is this pass's own.*

Research compiled 2026-09-06 for a gear-progression calculator.
Scope: **Star Force enhancement**, **Flames / Bonus Stats**, **Potential & Bonus Potential**.

**Reading conventions used throughout this document**

- Every table is followed by the source URL it came from. Where two independent sources were
  cross-checked, both are listed.
- `**UNVERIFIED**` marks a number that could not be confirmed from a primary/reliable source.
- `**CONFLICT**` marks a place where sources disagree; both values are given.
- KMS = Korea, GMS = Global. All three systems below are **already live in GMS** as documented
  here; where a table is KMS-sourced but GMS-confirmed, both citations are given.
- "Class Stats" / "Job Stats" = only the stats relevant to the item's job restriction
  (a Thief item raises LUK and DEX only, etc.).

---

#### 0. Version context — what changed in 2025-2026

| Update | Region / Date | Changes relevant to this document |
|---|---|---|
| NEXT: Destiny Weapon & Star Force Reorganization (ver. 1.2.401) | KMS 2025-03-20 | Star Force cap 25★ → 30★; failure no longer decreases stars; new success/destruction table; safeguard cost 100% → 200%; safeguard extended to 17★; Destiny Weapon (Lv250) |
| **v.264 "Every Little Thing Every Precious Thing"** | **GMS 2025-11-12** | **Star Force revamp: 30 stars** lands in GMS; Trace Restoration System; Star Force Research (Star Cores / Whisper Crystals); Familiar revamp |
| v.263 "Carcion Octo Fest" | GMS (prior) | Enhancement UI merged; **scroll-slot requirement for star forcing removed** — all items can now be star forced immediately, even with upgrade slots left, in Interactive worlds |
| v.265 "…2nd Update" | GMS 2025-12-16 | Ascent Skills, Mystic Frontier, First Adversary |
| v.266 – v.268 | GMS 2026-02 → 2026-04 | No documented Star Force / flame / potential formula changes found |
| **v.269 "Ride the Lightning"** | **GMS 2026-06-17** | **Star Force Enhancement Mode** (4 selectable risk/cost levels for 15★→21★) |
| v.270 "Ride the Lightning" (pt. 2) | GMS 2026-07-22 | New boss Jupiter (Lv295); **Astra Secondary Weapon**; **Destiny 2nd Transcendence Weapon**; Lv250 Brilliant Boss face accessory |
| v.271 (preview) | GMS announced 2026-09-02 | HEXA common nodes, Night Troupe: Omega Sector. **No** potential/flame/star-force changes announced. |

Sources:
<https://orangemushroom.net/2025/03/20/kms-ver-1-2-401-maplestory-next-destiny-weapon-star-force-reorganization/> ·
<https://www.nexon.com/maplestory/news/update/32522> (GMS v264 patch notes) ·
<https://www.nexon.com/maplestory/news/update/41138/updated-6-30-v-269-ride-the-lightning-patch-notes> ·
<https://www.nexon.com/maplestory/news/update/42415/updated-8-28-v-270-ride-the-lightning-patch-notes> ·
<https://www.nexon.com/maplestory/news/update/44705/v-271-update-preview> ·
<https://maplestorywiki.net/w/Update_Notes:_MapleStory_Global>

> **Important correction to a common assumption.** The old "max stars by item level" table
> (95-107 = 15★, 108-117 = 20★, 128+ = 25★) is **wrong for the current game**. See §1.2.

---

### 1. Star Force Enhancement

#### 1.1 System summary (current, post-v264 GMS)

- Each success adds exactly 1 star. Stars 1-15 give small scaling gains; **stars 16+ give a
  much larger flat, item-level-dependent block of stat and attack**.
- **Failure no longer reduces stars** (changed KMS 2025-03-20 / GMS 2025-11-12). Outcomes are
  Success / Maintain / Destruction only. *(Superior items are the exception — they still drop
  a star on failure and still get Chance Time.)*
- Destruction is possible from **15★ and up** (5★ and up for Superior items).
- **Safeguard**: available while the item is at 15★, 16★ or 17★ (i.e. up to reaching 18★).
  Cost is **+200% of base meso cost** (triple total). Blocks destruction only; success rate
  unchanged. The extra cost is normally not discounted by MVP/events.
- **Star Catch** minigame: +5% *multiplicative* to the success rate. Guild Enhancement Altar
  applies the same bonus passively. (GMS only — other regions baked it into the base rates.)
- **Overalls count double** toward equipped Star Force total (they occupy 2 slots).
- Star forcing no longer requires the item to be fully scrolled (changed in GMS v263).

Source: <https://maplestorywiki.net/w/Star_Force_Enhancement> ·
<https://www.nexon.com/maplestory/news/update/32522>

#### 1.2 Maximum stars by item level

| Equipment Level | Max Star Force |
|---|---|
| 0 – 94 | 5★ |
| 95 – 107 | 8★ |
| 108 – 117 | 10★ |
| 118 – 127 | 15★ |
| 128 – 137 | 20★ |
| **138 and above** | **30★** |

Source: <https://maplestorywiki.net/w/Star_Force_Enhancement> (post-revamp) ·
pre-revamp identical brackets with 138+ = 25★ at
<https://strategywiki.org/wiki/MapleStory/Spell_Trace_and_Star_Force>

**CONFLICT (minor):** MapleStory Wiki and StrategyWiki both give the second bracket as
**95–107**; the open-source calculator `masonym.dev` encodes `[0,95,5], [96,107,8]`
(i.e. level 95 = 5★). Treat 95–107 = 8★ as correct (two independent wikis agree).
Source: <https://github.com/masonym/masonym.dev/blob/main/src/lib/equip/starforce.js>

##### Exceptions

| Equipment | Max Star Force |
|---|---|
| Sweetwater Shoes / Gloves / Cape | 15★ |
| Ghost Ship Exorcist (badge) | 22★ |
| Sengoku Hakase Badge | 22★ |
| **Superior:** Elite Heliseum | 3★ |
| **Superior:** Nova | 8★ |
| **Superior:** Tyrant | 15★ |

Source: <https://maplestorywiki.net/w/Star_Force_Enhancement>

##### Fixed-star / non-star-forceable items (calculator-relevant)

- **Genesis Weapon (Lv200)** — granted at 22★, cannot be lowered.
- **Destiny Weapon (Lv250)** — created from Genesis at **22★, and cannot be star forced or
  scrolled further at all**. This is why no "Level 250" column exists in the weapon star-force
  stat table (see §1.4).
- **Red Beryl rental gear** — fixed 20★.
- **Astra secondary weapon** — fixed grades.
- Items with no upgrade slots cannot be star forced.

Sources: <https://orangemushroom.net/2025/03/20/kms-ver-1-2-401-maplestory-next-destiny-weapon-star-force-reorganization/> ·
<https://github.com/masonym/masonym.dev/blob/main/src/lib/equip/starforce.js> ·
<https://www.nexon.com/maplestory/news/update/32522> (Red Beryl rental stat block)

#### 1.3 Stars 1-15 — the scaling tier

These are **item-level independent**. Attack on weapons is a percentage of the weapon's own
base attack and therefore *does* scale with the weapon.

##### Weapons, stars 1-15 (per star)

| Star | Class Stats | Max HP | Max MP | ATT / MATT |
|---|---|---|---|---|
| 1-3 | +2 | +5 | +5 | `+⌊att_base × 0.02 + 1⌋` |
| 4-5 | +2 | +10 | +10 | `+⌊att_base × 0.02 + 1⌋` |
| 6-7 | +3 | +15 | +15 | `+⌊att_base × 0.02 + 1⌋` |
| 8-9 | +3 | +20 | +20 | `+⌊att_base × 0.02 + 1⌋` |
| 10-15 | +3 | +25 | +25 | `+⌊att_base × 0.02 + 1⌋` |

**Cumulative at 15★: Class Stats +40, Max HP +255, Max MP +255.**

The attack term **compounds** — each star's gain is computed from the attack the weapon has
*after* previous stars. Wiki formula: `f(n) = Σ(i=1..n) ⌊att(i−1) × 0.02 + 1⌋`, described as
approximate (off by a single digit in some cases). Reference implementation:

```js
// baseAttack should include scrolled attack, not flame/potential attack
function starForceWeaponAttack(baseAttack, stars) {
  let current = baseAttack;
  for (let i = 0; i < Math.min(stars, 15); i++) current += 1 + Math.floor(current * 0.02);
  return current - baseAttack;
}
```

Sources: <https://maplestorywiki.net/w/Star_Force_Enhancement/Stat_Tables> ·
<https://github.com/masonym/masonym.dev/blob/main/src/lib/equip/starforce.js> ·
<https://strategywiki.org/wiki/MapleStory/Spell_Trace_and_Star_Force> (`1 + RoundDown[ItemStat × Proportion%/100]`)

> **Weapons only gain ATT if their base ATT is non-zero, and only gain MATT if their base MATT
> is non-zero.** Daggers etc. never gain MATT from star force.

##### Armor & accessories, stars 1-15 (cumulative)

| ★ | Class Stat | Max HP † | Shoes Speed | Shoes Jump | Gloves ATT/MATT | DEF |
|---|---|---|---|---|---|---|
| 1 | +2 | +5 | – | – | – | +5% per star |
| 2 | +4 | +10 | – | – | – | (cumulative, applied per star) |
| 3 | +6 | +15 | +1 | +1 | – | |
| 4 | +8 | +25 | +2 | +2 | – | |
| 5 | +10 | +35 | +3 | +3 | +1 | |
| 6 | +13 | +50 | +4 | +4 | +1 | |
| 7 | +16 | +65 | +5 | +5 | +2 | |
| 8 | +19 | +85 | +6 | +6 | +2 | |
| 9 | +22 | +105 | +7 | +7 | +3 | |
| 10 | +25 | +130 | +8 | +8 | +3 | |
| 11 | +28 | +155 | +10 | +10 | +4 | |
| 12 | +31 | +180 | +12 | +12 | +4 | |
| 13 | +34 | +205 | +14 | +14 | +5 | |
| 14 | +37 | +230 | +16 | +16 | +6 | |
| 15 | **+40** | **+255** | +18 | +18 | **+7** | |

† Max HP is **not** granted to **gloves, shoes, face accessories or eye accessories**.
HP-gaining slots ("Category A") are: Hat, Top, Bottom, Overall, Cape, Ring, Pendant, Belt,
Shoulderpad, Shield, Weapon (weapons get Max MP instead of nothing).

- **DEF: +5% per star** (of the item's visible DEF), applied at *every* star 1-30 including
  16+. Overalls get an extra +5% DEF per star on top.
- Max HP stops accumulating at 15★ (it stays at +255 through 30★).
- Gloves ATT/MATT stops at +7 from the sub-15 tier; the 16+ tier adds its own attack on top.

Sources: <https://maplestorywiki.net/w/Star_Force_Enhancement/Stat_Tables> ·
<https://strategywiki.org/wiki/MapleStory/Spell_Trace_and_Star_Force>

**Minor internal inconsistency (flagged):** the wiki's *delta* table lists Shoes Speed/Jump
`+1` for stars 3-11 and `+2` for 12-15 (total 17), while its *cumulative* table reaches +18 at
15★ with the step to +2 beginning at 11★. Speed/Jump is irrelevant to damage; use +18 at 15★.

#### 1.4 Stars 16-30 — the flat, item-level tier

This is the tier that matters for a damage calculator. **Stat is granted only for stars 16-22;
from 23★ onward star force grants attack only.**

##### Class stat gain per star (stars 16-22), all slot types

| Item level | Stat per star, 16★-22★ |
|---|---|
| 128 – 137 | +7 |
| 138 – 149 | +9 |
| 150 – 159 | +11 |
| 160 – 199 | +13 |
| 200 – 249 | +15 |
| 250 | +17 |

Stars 23-30 grant **no class stat**. Cumulative class stat therefore tops out at:
`40 + 7×(min(stars,22) − 15)` for 128-137 (max 20★ → +75), and analogously
138-149 → **+103**, 150-159 → **+117**, 160-199 → **+131**, 200-249 → **+145**, 250 → **+159**.

Source: <https://maplestorywiki.net/w/Star_Force_Enhancement/Stat_Tables>
(cross-checked against <https://github.com/MrReds1324/maplestory_builder/blob/main/lib/constants/equipment/starforce_stats.dart> — exact match)

##### ATT / MATT gain per star — **armor & accessories** (delta)

| ★ | 128-137 | 138-149 | 150-159 | 160-199 | 200-249 | 250 |
|---|---|---|---|---|---|---|
| 16 | +7 | +8 | +9 | +10 | +12 | +14 |
| 17 | +8 | +9 | +10 | +11 | +13 | +15 |
| 18 | +9 | +10 | +11 | +12 | +14 | +16 |
| 19 | +10 | +11 | +12 | +13 | +15 | +17 |
| 20 | +11 | +12 | +13 | +14 | +16 | +18 |
| 21 | — | +13 | +14 | +15 | +17 | +19 |
| 22 | — | +15 | +16 | +17 | +19 | +21 |
| 23 | — | +17 | +18 | +19 | +21 | +23 |
| 24 | — | +19 | +20 | +21 | +23 | +25 |
| 25 | — | +21 | +22 | +23 | +25 | +27 |
| 26 | — | +22 | +23 | +24 | +26 | +28 |
| 27 | — | +23 | +24 | +25 | +27 | +29 |
| 28 | — | +24 | +25 | +26 | +28 | +30 |
| 29 | — | +25 | +26 | +27 | +29 | +31 |
| 30 | — | +26 | +27 | +28 | +30 | +32 |

##### ATT / MATT gain per star — **armor & accessories** (cumulative, on top of the sub-15 curve)

| ★ | 128-137 | 138-149 | 150-159 | 160-199 | 200-249 | 250 |
|---|---|---|---|---|---|---|
| 16 | 7 | 8 | 9 | 10 | 12 | 14 |
| 17 | 15 | 17 | 19 | 21 | 25 | 29 |
| 18 | 24 | 27 | 30 | 33 | 39 | 45 |
| 19 | 34 | 38 | 42 | 46 | 54 | 62 |
| 20 | 45 | 50 | 55 | 60 | 70 | 80 |
| 21 | — | 63 | 69 | 75 | 87 | 99 |
| 22 | — | 78 | 85 | 92 | 106 | 120 |
| 23 | — | 95 | 103 | 111 | 127 | 143 |
| 24 | — | 114 | 123 | 132 | 150 | 168 |
| 25 | — | 135 | 145 | 155 | 175 | 195 |
| 26 | — | 157 | 168 | 179 | 201 | 223 |
| 27 | — | 180 | 192 | 204 | 228 | 252 |
| 28 | — | 204 | 217 | 230 | 256 | 282 |
| 29 | — | 229 | 243 | 257 | 285 | 313 |
| 30 | — | **255** | **270** | **285** | **315** | **345** |

Note: gloves additionally keep the **+7 ATT/+7 MATT** they earned from stars 5-15, on top of
these numbers.

Sources: <https://maplestorywiki.net/w/Star_Force_Enhancement/Stat_Tables> ·
cross-checked line-for-line against
<https://github.com/MrReds1324/maplestory_builder/blob/main/lib/constants/equipment/starforce_stats.dart>
and <https://github.com/masonym/masonym.dev/blob/main/src/lib/equip/starforce.js> — all three agree exactly.

##### ATT / MATT gain per star — **weapons** (delta)

Weapons behave very differently: a much smaller per-star gain from 16-22, then a **huge one-time
jump at 23★**.

| ★ | 128-137 | 138-149 | 150-159 | 160-199 | 200-249 |
|---|---|---|---|---|---|
| 16 | +6 | +7 | +8 | +9 | +13 |
| 17 | +7 | +8 | +9 | +9 | +13 |
| 18 | +7 | +8 | +9 | +10 | +14 |
| 19 | +8 | +9 | +10 | +11 | +14 |
| 20 | +9 | +10 | +11 | +12 | +15 |
| 21 | — | +11 | +12 | +13 | +16 |
| 22 | — | +12 | +13 | +14 | +17 |
| 23 | — | **+30** | **+31** | **+32** | **+34** |
| 24 | — | +31 | +32 | +33 | +35 |
| 25 | — | +32 | +33 | +34 | +36 |
| 26-30 | — | **UNVERIFIED** | **UNVERIFIED** | **UNVERIFIED** | **UNVERIFIED** |

> **CONFLICT / data-quality note.** MapleStory Wiki's weapon *delta* table repeats the 16★ value
> at 17★ for the 128-137, 138-149 and 150-159 brackets (giving +6/+7/+8 at 17★). Its own
> *cumulative* table contradicts this and implies +7/+8/+9. The cumulative table is correct —
> both independent open-source implementations encode +7/+8/+9. The values in the table above are
> the corrected ones. Deltas at 17★ for 160-199 (+9) and 200-249 (+13) are unaffected.

##### ATT / MATT gain per star — **weapons** (cumulative, added on top of `f(15)` from §1.3)

| ★ | 128-137 | 138-149 | 150-159 | 160-199 | 200-249 |
|---|---|---|---|---|---|
| 16 | +6 | +7 | +8 | +9 | +13 |
| 17 | +13 | +15 | +17 | +18 | +26 |
| 18 | +20 | +23 | +26 | +28 | +40 |
| 19 | +28 | +32 | +36 | +39 | +54 |
| 20 | +37 | +42 | +47 | +51 | +69 |
| 21 | — | +53 | +59 | +64 | +85 |
| 22 | — | +65 | +72 | +78 | +102 |
| 23 | — | +95 | +103 | +110 | +136 |
| 24 | — | +126 | +135 | +143 | +171 |
| 25 | — | +158 | +168 | +177 | **+207** |

Source: <https://maplestorywiki.net/w/Star_Force_Enhancement/Stat_Tables> (weapon cumulative
table). The 25★ / 200-249 cell renders "Magic Attack +102" on the wiki — this is a typo;
Attack Power in the same cell is +207 and the delta chain confirms +207. Corrected above.
Independently confirmed by StrategyWiki's 25★ totals table
(<https://strategywiki.org/wiki/MapleStory/Spell_Trace_and_Star_Force>): 138-149 → weapon
ATT +158, 150-159 → +168, 160-199 → +177, 200-249 → +207.

###### ⚠️ The weapon 26★-30★ gap

**No public source documents weapon ATT/MATT gains for stars 26-30.** MapleStory Wiki's weapon
table (fetched live 2026-09-06) still ends at 25★ and has no Level-250 column, while its armor
and badge tables were updated to 30★ with a Level-250 column. StrategyWiki is entirely
pre-revamp (25★ max).

One community implementation extrapolates a straight +1/star continuation:

| ★ | 138-149 | 150-159 | 160-199 | 200-249 | 250-300 |
|---|---|---|---|---|---|
| 26 | +33 | +34 | +35 | +37 | +38 |
| 27 | +34 | +35 | +36 | +38 | — |
| 28 | +35 | +36 | +37 | +39 | — |
| 29 | +36 | +37 | +38 | +40 | — |
| 30 | +37 | +38 | +39 | +41 | — |

**UNVERIFIED — do not ship these without in-game confirmation.** Source of the extrapolation:
<https://github.com/masonym/masonym.dev/blob/main/src/lib/equip/starforce.js> (the file's own
header flags the level-250 weapon row as a guess sourced from the misaomaki simulator at
<https://misaomaki.github.io/starforce.html>). Note that the armor table *decelerates* from
+2/star to +1/star at 26★, so a flat +1/star continuation for weapons is plausible but not proven.

Also note that in practice, **level 250 weapons (Destiny) are locked at 22★**, so a Level-250
weapon column may simply not exist in the game data at all.

##### Badges (Ghost Ship Exorcist, Sengoku Hakase — max 22★)

Badges gain **All Stats only** — no ATT, no MATT, no Max HP, no DEF.

| ★ | delta | cumulative (all levels 128+) |
|---|---|---|
| 1-5 | +2 All Stats each | 2 / 4 / 6 / 8 / 10 |
| 6-15 | +3 All Stats each | 13 / 16 / 19 / 22 / 25 / 28 / 31 / 34 / 37 / **40** |
| 16-22 | +7 (128-137) · +9 (138-149) · +11 (150-159) · +13 (160-199) · +15 (200-249) · +17 (250) | see below |

Cumulative All Stats at each star, 16★-22★:

| ★ | 128-137 | 138-149 | 150-159 | 160-199 | 200-249 | 250 |
|---|---|---|---|---|---|---|
| 16 | 47 | 49 | 51 | 53 | 55 | 59 † |
| 17 | 54 | 58 | 62 | 66 | 70 | 74 |
| 18 | 61 | 67 | 73 | 79 | 85 | 91 |
| 19 | 68 | 76 | 84 | 92 | 100 | 108 |
| 20 | 75 | 85 | 95 | 105 | 115 | 125 |
| 21 | — | 94 | 104 † | 118 | 130 | 142 |
| 22 | — | 103 | 117 | 131 | 145 | 159 |

† Two cells in the wiki's badge cumulative table look like transcription errors:
16★/250 shows **59** where the +17/star delta implies **57**, and 21★/150-159 shows **104**
where the chain implies **106**. **UNVERIFIED** — treat as `40 + 17×(★−15)` and
`40 + 11×(★−15)` respectively.

Source: <https://maplestorywiki.net/w/Star_Force_Enhancement/Stat_Tables>

##### Superior equipment (Tyrant / Nova / Elite Heliseum) — max 15★

Superior gear has its own table: **All Stats** on stars 1-5, **ATT/MATT** on stars 6-15, and
different item-level brackets. It is also the only gear that still **loses a star on failure**
and triggers **Chance Time** (guaranteed success after two consecutive star losses).

**Delta values:**

| ★ | 0-77 | 78-87 | 88-97 | 98-107 | 108-117 | 118-127 | 128-137 | 138-149 | 150+ |
|---|---|---|---|---|---|---|---|---|---|
| 1 | AS +1 | AS +2 | AS +4 | AS +7 | AS +9 | AS +12 | AS +14 | AS +17 | AS +19 |
| 2 | AS +2 | AS +3 | AS +5 | AS +8 | AS +10 | AS +13 | AS +15 | AS +18 | AS +20 |
| 3 | AS +4 | AS +5 | AS +7 | AS +10 | AS +12 | AS +15 | AS +17 | AS +20 | AS +22 |
| 4 | — | — | AS +10 | AS +13 | AS +15 | AS +18 | AS +20 | AS +23 | AS +25 |
| 5 | — | — | AS +14 | AS +17 | AS +19 | AS +22 | AS +24 | AS +27 | AS +29 |
| 6 | — | — | — | — | ATT +5 | ATT +6 | ATT +7 | ATT +8 | ATT +9 |
| 7 | — | — | — | — | ATT +6 | ATT +7 | ATT +8 | ATT +9 | ATT +10 |
| 8 | — | — | — | — | ATT +7 | ATT +8 | ATT +9 | ATT +10 | ATT +11 |
| 9 | — | — | — | — | — | ATT +9 | ATT +10 | ATT +11 | ATT +12 |
| 10 | — | — | — | — | — | ATT +10 | ATT +11 | ATT +12 | ATT +13 |
| 11 | — | — | — | — | — | — | ATT +13 | ATT +14 | ATT +15 |
| 12 | — | — | — | — | — | — | ATT +15 | ATT +16 | ATT +17 |
| 13 | — | — | — | — | — | — | — | ATT +18 | ATT +19 |
| 14 | — | — | — | — | — | — | — | ATT +20 | ATT +21 |
| 15 | — | — | — | — | — | — | — | ATT +22 | ATT +23 |

(`AS` = All Stats; `ATT` = both Attack Power and Magic Attack. Every star also gives DEF +5%.)

**Max stars by level for Superior gear**, read off which columns have entries in the delta
table above: 0-87 → 3★, 88-107 → 5★, 108-117 → 8★, 118-127 → 10★, 128-137 → 12★, 138+ → 15★.
**CONFLICT:** `masonym.dev` encodes the first two brackets as `0-95 → 3★, 96-107 → 5★`
(<https://github.com/masonym/masonym.dev/blob/main/src/lib/equip/starforce.js>). The wiki's
column layout implies the break is at 88. Practically irrelevant — the only Superior gear
players use is Tyrant (Lv150, 15★).

**Cumulative values** (DEF omitted):

| ★ | 108-117 | 118-127 | 128-137 | 138-149 | 150+ |
|---|---|---|---|---|---|
| 5 | AS +65 | AS +80 | AS +90 | AS +105 | AS +115 |
| 10 | — | AS +80, ATT +40 | AS +90, ATT +45 | AS +105, ATT +50 | AS +115, ATT +55 |
| 15 | — | — | — | **AS +105, ATT +140** | **AS +115, ATT +150** |

Full 1-15 cumulative table (too wide to inline): the "Superior Equipment → Cumulative Values"
collapsible on <https://maplestorywiki.net/w/Star_Force_Enhancement/Stat_Tables>
(9 level-bracket columns × 15 star rows; cells read `All Stats +N / Attack Power +N / Magic Attack +N`).

Source: <https://maplestorywiki.net/w/Star_Force_Enhancement/Stat_Tables>

Superior gear also uses a **flat meso cost that is the same for every star** on a given item:
`Meso Cost = f(EquipLevel rounded down to nearest 10)` — see
<https://strategywiki.org/wiki/MapleStory/Spell_Trace_and_Star_Force> §"Superior → Meso Cost".
Superior Shielding Ward cannot remove destruction chance for 5★→6★ and 6★→7★.

#### 1.5 Success / Maintain / Destruction rates (KMS + GMS + JMS + MSEA)

**Official GMS numbers, v264:**

| ★ → ★ | Success | Maintain (fail) | Destruction |
|---|---|---|---|
| 0 → 1 | 95% | 5% | – |
| 1 → 2 | 90% | 10% | – |
| 2 → 3 | 85% | 15% | – |
| 3 → 4 | 85% | 15% | – |
| 4 → 5 | 80% | 20% | – |
| 5 → 6 | 75% | 25% | – |
| 6 → 7 | 70% | 30% | – |
| 7 → 8 | 65% | 35% | – |
| 8 → 9 | 60% | 40% | – |
| 9 → 10 | 55% | 45% | – |
| 10 → 11 | 50% | 50% | – |
| 11 → 12 | 45% | 55% | – |
| 12 → 13 | 40% | 60% | – |
| 13 → 14 | 35% | 65% | – |
| 14 → 15 | 30% | 70% | – |
| **15 → 16** | 30.00% | 67.90% | 2.10% |
| 16 → 17 | 30.00% | 67.90% | 2.10% |
| 17 → 18 | 15.00% | 78.20% | 6.80% |
| 18 → 19 | 15.00% | 78.20% | 6.80% |
| 19 → 20 | 15.00% | 76.50% | 8.50% |
| 20 → 21 | 30.00% | 59.50% | 10.50% |
| 21 → 22 | 15.00% | 72.25% | 12.75% |
| 22 → 23 | 15.00% | 68.00% | 17.00% |
| 23 → 24 | 10.00% | 72.00% | 18.00% |
| 24 → 25 | 10.00% | 72.00% | 18.00% |
| 25 → 26 | 10.00% | 72.00% | 18.00% |
| 26 → 27 | 7.00% | 74.40% | 18.60% |
| 27 → 28 | 5.00% | 76.00% | 19.00% |
| 28 → 29 | 3.00% | 77.60% | 19.40% |
| 29 → 30 | 1.00% | 79.20% | 19.80% |

Sources: <https://www.nexon.com/maplestory/news/update/32522> (GMS v264, official) ·
<https://orangemushroom.net/2025/03/20/kms-ver-1-2-401-maplestory-next-destiny-weapon-star-force-reorganization/> (KMS, identical) ·
<https://maplestorywiki.net/w/Star_Force_Enhancement>

TMS uses a slightly different table (18→19 = 12%, 19→20 = 10%, 21→22 = 20%, 22→23 = 17.5%,
23→24 and 24→25 = 8.5%, 25→26 = 8%); see the "TMS" tab on the wiki page above.

##### Event / modifier effects on rates

- **Star Catch**: ×1.05 to success rate, remainder redistributed proportionally.
- **"5/10/15" Sunny Sunday**: 5→6, 10→11, 15→16 become 100% success. (Safeguard is disabled on
  15→16 during this event since it would do nothing.) Does not apply to Superior items.
- **Destruction reduction Sunny Sunday**: −30% destruction chance when the item is **below 21★**
  (GMS/KMS). JMS/MSEA: −40% below 21★, −20% between 22★ and 24★. Does not apply to Superior.
- **Safeguard**: destruction outcome converted to Maintain, at 15★/16★/17★ only.

Source: <https://maplestorywiki.net/w/Star_Force_Enhancement>

##### Star Force Enhancement Mode (GMS only, v269 — 2026-06-17)

When enhancing **15★ → 21★**, four "Enhancement Levels" can be selected:

- **Level 1** — standard rates and cost.
- **Levels 2-3** — progressively lower destruction rate, progressively higher meso cost.
- **Level 4** — **0% destruction**, highest cost.
- Level 4 is **not available for 15★ → 17★** (it would be identical to Safeguard).
- Enabling Safeguard while at Enhancement Mode 2 or 3 resets Enhancement Mode to 1.
- MVP / Shining Star Force 30% discounts and Sunny Sunday destruction reduction still apply.

**Nexon did not publish the per-level rates or cost multipliers.** A secondary summary
(namu.wiki, reached via search snippet only — the site blocks automated fetches) states
*"stage 4 has a destruction probability of 0%, but the cost is 6.5× higher and the success
probability is 8%"*. **UNVERIFIED.**

Source: <https://www.nexon.com/maplestory/news/update/41138/updated-6-30-v-269-ride-the-lightning-patch-notes> ·
<https://maplestorywiki.net/w/Star_Force_Enhancement> ("Enhancement Mode (GMS only)")

#### 1.6 Destruction, traces and recovery

When an item is destroyed it leaves an **Equipment Trace** — unequippable, but it retains
potential, bonus potential, flames, scrolled stats and soul. Only Star Force can destroy an
item into a trace; other destruction destroys it outright.

**GMS trace recovery (star level restored):**

| Star Force at destruction | Recovered Star Force |
|---|---|
| 15 – 19 | 12★ |
| 20 | 15★ |
| 21 – 22 | 17★ |
| 23 – 25 | 19★ |
| 26 – 30 | 20★ |

Sources: <https://www.nexon.com/maplestory/news/update/32522> ·
<https://maplestorywiki.net/w/Star_Force_Enhancement>

*(Traces destroyed before 2025-11-12 in GMS are always restored at 12★.)*

Non-GMS servers instead keep the trace at its destroyed star level (capped 22★) and require
1-4 identical items plus mesos to restore.

##### GMS-only restoration systems (v264)

**Core Restoration** — Mysterious Star Speck Boxes (up to 12/day/world) → Star Specks:

| Core | Materials | Restores |
|---|---|---|
| Star Core | 200 Star Specks | Lv200-or-below equipment that is part of an obtainable set |
| Dawn Star Core | 1 Star Core + 25 Shining Star Specks | Dawn Boss Set |
| Pitched Star Core | 1 Star Core + 50 Shining Star Specks | Pitched Boss Set |

**Trace Restoration (points)** — earn up to 1,750 points via weekly boss missions; badges
cannot be restored. Points required per item:

| Item | Points |
|---|---|
| Kanna's Treasure | 392 |
| Black Bean Mark | 400 |
| Dominator Pendant | 431 |
| Papulatus Mark | 462 |
| Root Abyss Armor | 495 |
| Sweetwater Equipment | 512 |
| Solid Gollux Accessories | 523 |
| AbsoLab Armor | 588 |
| Reinforced Gollux Accessories | 607 |
| Daybreak Pendant | 646 |
| Superior Gollux Accessories | 697 |
| Guardian Angel Ring | 844 |
| Arcane Umbra Armor | 960 |
| Pitched Boss Accessories | 1,680 |
| Eternal Armor | 2,312 |
| Brilliant Boss Accessories | 2,500 |

Weekly point maximum: **126**; monthly maximum: **43** (separate cadence). Per-boss mission
point tables are on the wiki page. Source: <https://maplestorywiki.net/w/Star_Force_Enhancement>

**Whisper Crystals** (creating new gear rather than restoring): 65 Dawn Whisper Crystals → a
Dawn Boss Set item; 130 Pitched → a Pitched Boss Set item; 260 → Mitra's Rage Selection Box;
390 → Genesis Badge. Source: <https://www.nexon.com/maplestory/news/update/32522>

#### 1.7 Meso cost

`L` = item level rounded **down** to the nearest 10.

| ★ → ★ | GMS cost | KMS / JMS / MSEA cost |
|---|---|---|
| 0 → 10 | `1000 + ⌊L³ × (S+1) / 25⌉` | `1000 + ⌊L³ × (S+1) / 36⌉` |
| 10 → 11 | `1000 + ⌊L³ × 11^2.7 / 400⌉` | `1000 + ⌊L³ × 11^2.7 / 571⌉` |
| 11 → 12 | `1000 + ⌊L³ × 12^2.7 / 220⌉` | `1000 + ⌊L³ × 12^2.7 / 314⌉` |
| 12 → 13 | `1000 + ⌊L³ × 13^2.7 / 150⌉` | `1000 + ⌊L³ × 13^2.7 / 214⌉` |
| 13 → 14 | `1000 + ⌊L³ × 14^2.7 / 110⌉` | `1000 + ⌊L³ × 14^2.7 / 157⌉` |
| 14 → 15 | `1000 + ⌊L³ × 15^2.7 / 75⌉` | `1000 + ⌊L³ × 15^2.7 / 107⌉` |
| 15 → 16 | `1000 + ⌊L³ × 16^2.7 / 200⌉` | same |
| 16 → 17 | `1000 + ⌊L³ × 17^2.7 / 200⌉` | same |
| 17 → 18 | `1000 + ⌊L³ × 18^2.7 / 150⌉` | same |
| 18 → 19 | `1000 + ⌊L³ × 19^2.7 / 70⌉` | same |
| 19 → 20 | `1000 + ⌊L³ × 20^2.7 / 45⌉` | same |
| 20 → 21 | `1000 + ⌊L³ × 21^2.7 / 200⌉` | same |
| 21 → 22 | `1000 + ⌊L³ × 22^2.7 / 125⌉` | same |
| 22 → 30 | `1000 + ⌊L³ × (S+1)^2.7 / 200⌉` | same |

`S` = current star level. Result is rounded to the nearest 100.

Source: <https://maplestorywiki.net/w/Star_Force_Enhancement> (the wiki renders these as inline
MathML; the divisors above were read off that rendering — **double-check the 10→15 GMS divisors
against an in-game cost before shipping**, since GMS's v264 notes say meso costs were
"adjusted to scale based on both equipment level and enhancement level" without publishing them).

**Level caps on cost (pre-revamp, may be stale):** Lv108-109 capped at 7→8 (321,000);
Lv118-119 capped at 9→10 (533,400); Lv128-129 capped at 14→15 (6,471,400); Zero weapons capped
at Lv150. Source: <https://strategywiki.org/wiki/MapleStory/Spell_Trace_and_Star_Force>

**Discounts** (base cost only, not the safeguard surcharge):

| MVP Tier | VIP Tier | Discount |
|---|---|---|
| Silver | Gold | 3% |
| Gold | Diamond | 5% |
| Diamond+ | Royal+ | 10% |

#### 1.8 Star Force hunting-map damage multipliers

| Your SF vs required | Damage you deal | Damage you take |
|---|---|---|
| < 9% | 1 (i.e. 1 damage) | ×3 |
| 10-29% | 10% | ×2.8 |
| 30-49% | 30% | ×2.4 |
| 50-69% | 50% | ×2 |
| 70-99% | 70% | ×1.6 |
| 100% | 100% | ×1 |
| > 100% | +1% per excess star, up to +20% | ×1 |

Source: <https://maplestorywiki.net/w/Star_Force_Enhancement>

#### 1.9 Star Force Conversion (Xenon / Demon Avenger)

- **Xenon**: every 10 equipped Star Force → **+7 STR, +7 DEX, +7 LUK**, capped at 100 equipped
  Star Force (so max +70/+70/+70).
- **Demon Avenger**: tiered Max HP compensation based on equipped Star Force (excluding
  medal/title). Cap raised to **410 Star Force** in the revamp.

Sources: <https://strategywiki.org/wiki/MapleStory/Spell_Trace_and_Star_Force> ·
<https://www.nexon.com/maplestory/news/update/32522>

---

### 2. Flames / Bonus Stats ("Additional Options")

#### 2.1 System summary

- A piece of equipment can carry **1 to 4 distinct bonus-stat lines**, each rolled independently
  with its own **tier 1-7**.
- A distinct bonus stat cannot appear twice (no double LUK), but `LUK` and `DEX & LUK` can
  coexist. All eligible stats have equal weight in the roll pool.
- **Flame Advantage** equipment always gets **4 lines** and rolls **+2 tiers** relative to normal
  gear for the same flame.

**Cannot receive bonus stats at all:**
Secondary weapons & shields (incl. Katara), Emblems, Badges, Medals (except Immortal Legacy),
Rings, Androids & Android/Mechanical Hearts, Shoulders (except Scarlet Shoulder),
Totems (except Ancient Slate Replica).

Sources: <https://maplestorywiki.net/w/Bonus_Stats> · <https://www.whackybeanz.com/guides/flames>
(last updated 2024-12-16) · <https://strategywiki.org/wiki/MapleStory/Bonus_Stats>

**CONFLICT (minor):** whackybeanz lists "Rings" as ineligible and separately lists Zero class
weapons, Chaos Root Abyss helmets, (Chaos) Horntail Necklace and Shiny Red Meister Symbols as
*regular* (non-flame-advantage) items. MapleStory Wiki's ineligible list also includes Rings.
Both agree.

#### 2.2 Which items are Flame Advantaged

Rule of thumb: **equipment dropped by raid bosses, or crafted from boss shards/materials, is
Flame Advantaged.** Concretely:

- Dark / Dawn / Pitched / regular Boss Accessory sets
- Eternal, Arcane Umbra, AbsoLab, Fafnir set items
- Brilliant Boss set items (Lv250, e.g. Original Sin of Pride)

**Notable exceptions (NOT flame advantaged despite being boss-related):**
Horntail Necklace, Chaos Horntail Necklace, all Gollux equipment, all Sweetwater equipment,
Chaos Root Abyss boss helmets, Zero class weapons, Shiny Red Meister Symbols.

Named example from StrategyWiki: **Pink Holy Grail is flame advantaged; Xiamen Earring is not.**

For **Elite Boss / Rune of Njord drops**, the higher tier range applies **only on the original
drop** — once you use a flame on it, it reverts to normal-equipment tier ranges (1-5).

Sources: <https://maplestorywiki.net/w/Bonus_Stats> · <https://www.whackybeanz.com/guides/flames> ·
<https://strategywiki.org/wiki/MapleStory/Bonus_Stats>

#### 2.3 The flames themselves (GMS names)

GMS and MSEA use different names for the same items. Mapping:

| GMS name | MSEA / whackybeanz name | Tier range (normal) | Tier range (flame advantage) | Can keep old stats? |
|---|---|---|---|---|
| Rebirth Flame Lv.100-150 | Resurrection Flame `<Level>` | 1-4 | 3-6 | No |
| **Powerful Rebirth Flame** | Crimson Resurrection Flame (CRF) | 1-4 | 3-6 | No |
| **Blazing Rebirth Flame** | Obsidian Flame | 1-4 | 3-6 | **Yes** |
| **Eternal Rebirth Flame** | Rainbow Resurrection Flame (RRF) | 2-5 (T5 is ~1%) | 4-7 (T7 is ~1%) | No |
| **Black Rebirth Flame** | Black Resurrection Flame (BRF) | 2-5 | 4-7 | **Yes** |
| **Abyssal Rebirth Flame** | Abyssal Resurrection Flame (ARF) | 3-5 (T5 ~3%) | 5-7 | **Yes** |

- `Karma <X> Rebirth Flame` variants apply only to **untradable** items; otherwise identical.
- `Eternal <X> Rebirth Flame` variants also exist (per the wiki's flame index table).
- In **non-GMS** servers, Powerful is retired → Blazing, and Eternal is retired → Black.
- **In GMS, Powerful Rebirth Flames are purchasable in Heroic (Reboot) worlds from most town
  General Stores for 9,500,000 mesos.** Eternal Rebirth Flames come from boss rewards.
- Levelled flames only work on items with a **transparent dot** in the item icon's top-left
  (white dot = only unrestricted flames), and never on Lv151+ items.

Sources: <https://maplestorywiki.net/w/Bonus_Stats> · <https://maplestorywiki.net/w/Rebirth_Flame> ·
<https://www.whackybeanz.com/guides/flames> · <https://strategywiki.org/wiki/MapleStory/Bonus_Stats>

#### 2.4 Number-of-lines probability

| Method | 1 line | 2 lines | 3 lines | 4 lines |
|---|---|---|---|---|
| Using any Rebirth Flame | 40% | 40% | 16% | 4% |
| Crafting (Master Craftsman) | 21% | 50% | 25% | 4% |
| Crafting (Meister) | — | 56% | 40% | 4% |
| Other (drop, purchase, etc.) | 41% | 40% | 15% | 4% |
| **Flame Advantage equipment** | **always 4 lines** | | | |

Source: <https://strategywiki.org/wiki/MapleStory/Bonus_Stats>

#### 2.5 Tier probability distribution

**Normal (non-flame-advantage) equipment:**

| Method / Item | T1 | T2 | T3 | T4 | T5 |
|---|---|---|---|---|---|
| Monster drop, NPC/Equipment Shard purchase | 25% | 30% | 30% | 14% | 1% |
| Equipment Shard Chance Time | — | 30% | 50% | 19% | 1% |
| Rebirth Flame Lv.100-150 | 50% | 40% | 9% | 1% | — |
| **Powerful / Blazing Rebirth Flame** | 20% | 30% | 36% | 14% | — |
| **Eternal / Black Rebirth Flame** | — | 29% | 45% | 25% | 1% |
| Crafting/Fusing (Lv1-10) | 50% | 40% | 10% | — | — |
| Crafting (Master Craftsman) | 15% | 30% | 40% | 14% | 1% |
| Fusing (Master Craftsman) | 25% | 35% | 30% | 10% | — |
| Crafting (Meister) | — | 19% | 50% | 30% | 1% |
| Fusing (Meister) | — | 40% | 45% | 14% | 1% |

**Flame Advantage equipment** (same shape, shifted +2 tiers):

| Method / Item | T3 | T4 | T5 | T6 | T7 |
|---|---|---|---|---|---|
| Monster drop, NPC/Equipment Shard purchase | 25% | 30% | 30% | 14% | 1% |
| Equipment Shard Chance Time | — | 30% | 50% | 19% | 1% |
| Rebirth Flame Lv.100-150 | 97% | 1% | 1% | 1% | — |
| **Powerful / Blazing Rebirth Flame** | 20% | 30% | 36% | 14% | — |
| **Eternal / Black Rebirth Flame** | — | 29% | 45% | 25% | 1% |
| Crafting/Fusing (Lv1-10) | 50% | 40% | 10% | — | — |
| Crafting (Master Craftsman) | 15% | 30% | 40% | 14% | 1% |
| Fusing (Master Craftsman) | 25% | 35% | 30% | 10% | — |
| Crafting (Meister) | — | 19% | 50% | 30% | 1% |
| Fusing (Meister) | — | 40% | 45% | 14% | 1% |

Source: <https://strategywiki.org/wiki/MapleStory/Bonus_Stats>

**UNVERIFIED for Abyssal Rebirth Flame** — the wiki describes it as "lowest tier 3, very rarely
tier 5 (5-7 on flame advantage), 3% chance of highest tier", but no numeric distribution is
published. Source for the qualitative description: <https://maplestorywiki.net/w/Bonus_Stats> ·
<https://www.whackybeanz.com/guides/flames>

Nexon's live per-flame odds are viewable in-game by hovering the flame's icon; the KMS official
disclosure lives at <https://maplestory.nexon.com/Guide/OtherProbability/game/gameAddOption>.

#### 2.6 Flame stat values by tier and item level

##### Single main stat (STR / DEX / INT / LUK) and Defense

**Formula:** value = `tier × (min(⌊itemLevel / 20⌋, 11) + 1)` — i.e. the tier-1 value steps up
by 1 every 20 item levels and is capped at 12 from item level 230.

| Item level | T1 | T2 | T3 | T4 | T5 | T6 | T7 |
|---|---|---|---|---|---|---|---|
| 0-19 | +1 | +2 | +3 | +4 | +5 | +6 | +7 |
| 20-39 | +2 | +4 | +6 | +8 | +10 | +12 | +14 |
| 40-59 | +3 | +6 | +9 | +12 | +15 | +18 | +21 |
| 60-79 | +4 | +8 | +12 | +16 | +20 | +24 | +28 |
| 80-99 | +5 | +10 | +15 | +20 | +25 | +30 | +35 |
| 100-119 | +6 | +12 | +18 | +24 | +30 | +36 | +42 |
| 120-139 | +7 | +14 | +21 | +28 | +35 | +42 | +49 |
| 140-159 | +8 | +16 | +24 | +32 | +40 | +48 | +56 |
| 160-179 | +9 | +18 | +27 | +36 | +45 | +54 | +63 |
| 180-199 | +10 | +20 | +30 | +40 | +50 | +60 | +70 |
| 200-229 | +11 | +22 | +33 | +44 | +55 | +66 | +77 |
| **230+** | +12 | +24 | +36 | +48 | +60 | +72 | +84 |

Sources: <https://maplestorywiki.net/w/Bonus_Stats/Stat_Tables> ·
<https://strategywiki.org/wiki/MapleStory/Bonus_Stats> (identical)

##### Combined two-stat lines (STR&DEX, STR&INT, STR&LUK, DEX&INT, DEX&LUK, INT&LUK)

Each of the two stats gets the listed amount. **Formula:** value = `tier × (⌊itemLevel / 40⌋ + 1)`.

| Item level | T1 | T2 | T3 | T4 | T5 | T6 | T7 |
|---|---|---|---|---|---|---|---|
| 0-39 | +1 | +2 | +3 | +4 | +5 | +6 | +7 |
| 40-79 | +2 | +4 | +6 | +8 | +10 | +12 | +14 |
| 80-119 | +3 | +6 | +9 | +12 | +15 | +18 | +21 |
| 120-159 | +4 | +8 | +12 | +16 | +20 | +24 | +28 |
| 160-199 | +5 | +10 | +15 | +20 | +25 | +30 | +35 |
| 200-249 | +6 | +12 | +18 | +24 | +30 | +36 | +42 |
| **250+** | +7 | +14 | +21 | +28 | +35 | +42 | +49 |

> This is the "main stat + secondary stat combined" line. On a Lv200 item a T7
> `STR & DEX` line gives **+42 STR and +42 DEX** — which is why combined lines are worth about
> half a pure-main-stat line plus a big chunk of secondary.

Source: <https://maplestorywiki.net/w/Bonus_Stats/Stat_Tables>

##### Attack Power / Magic Attack — **NON-weapons** (armor, accessories)

**Flat, item-level independent:**

| All item levels | T1 | T2 | T3 | T4 | T5 | T6 | T7 |
|---|---|---|---|---|---|---|---|
| ATT or MATT | +1 | +2 | +3 | +4 | +5 | +6 | +7 |

**Maximum possible attack flame on any armor/accessory is +7.**

Source: <https://maplestorywiki.net/w/Bonus_Stats/Stat_Tables>

##### Attack Power / Magic Attack — **WEAPONS** (multiplicative on base ATT)

Weapon attack flames are a **percentage of the weapon's base attack**, and — importantly —
**flame-advantaged weapons use a different, lower per-tier curve** than normal weapons, while
gaining access to tiers 6-7.

**Non-flame-advantage weapons** — bonus % = `(⌊wpnLevel/40⌋ + 1) × tier × 1.1^(tier − 1)`:

| Weapon level | T1 | T2 | T3 | T4 | T5 |
|---|---|---|---|---|---|
| 0-39 | ×1.01 | ×1.022 | ×1.0363 | ×1.0532 | ×1.0732 |
| 40-79 | ×1.02 | ×1.044 | ×1.0726 | ×1.1065 | ×1.1464 |
| 80-119 | ×1.03 | ×1.066 | ×1.1089 | ×1.1597 | ×1.2196 |
| 120-159 | ×1.04 | ×1.088 | ×1.1452 | ×1.213 | ×1.2928 |
| 160-199 | ×1.05 | ×1.11 | ×1.1815 | ×1.2662 | ×1.366 |
| 200-249 | ×1.06 | ×1.132 | ×1.2178 | ×1.3194 | ×1.4392 |
| 250+ | ×1.07 | ×1.154 | ×1.2541 | ×1.3727 | ×1.5124 |

**Flame-advantage weapons** — bonus % = `(⌊wpnLevel/40⌋ + 1) × tier × 1.1^(tier − 3)`:

| Weapon level | T3 | T4 | T5 | T6 | T7 |
|---|---|---|---|---|---|
| 0-39 | ×1.03 | ×1.044 | ×1.0605 | ×1.0799 | ×1.1025 |
| 40-79 | ×1.06 | ×1.088 | ×1.121 | ×1.1597 | ×1.205 |
| 80-119 | ×1.09 | ×1.132 | ×1.1815 | ×1.2396 | ×1.3075 |
| 120-159 | ×1.12 | ×1.176 | ×1.242 | ×1.3194 | ×1.4099 |
| 160-199 | ×1.15 | ×1.22 | ×1.3025 | ×1.3993 | ×1.5124 |
| 200-249 | ×1.18 | ×1.264 | ×1.363 | ×1.4792 | ×1.6149 |
| 250+ | ×1.21 | ×1.308 | ×1.4235 | ×1.559 | ×1.7174 |

To get the **added** attack rather than the multiplier, replace the leading `1` with `0`
(e.g. Lv200 T7 flame-advantage weapon = **+61.49%** of base ATT).

Both tables and both formulas: <https://maplestorywiki.net/w/Bonus_Stats/Stat_Tables>

> **Practical note for a calculator:** a Genesis weapon (Lv200) is flame advantaged, so a T7
> weapon-ATT flame is `+61.49%` of its base attack — enormous. The base to multiply is the
> weapon's *base* attack (before flames), and it is applied separately from star force attack.

##### Max HP / Max MP (identical tables)

| Item level | T1 | T2 | T3 | T4 | T5 | T6 | T7 |
|---|---|---|---|---|---|---|---|
| 0-9 | +3 | +6 | +9 | +12 | +15 | +18 | +21 |
| 10-19 | +30 | +60 | +90 | +120 | +150 | +180 | +210 |
| 20-29 | +60 | +120 | +180 | +240 | +300 | +360 | +420 |
| 30-39 | +90 | +180 | +270 | +360 | +450 | +540 | +630 |
| 40-49 | +120 | +240 | +360 | +480 | +600 | +720 | +840 |
| 50-59 | +150 | +300 | +450 | +600 | +750 | +900 | +1,050 |
| 60-69 | +180 | +360 | +540 | +720 | +900 | +1,080 | +1,260 |
| 70-79 | +210 | +420 | +630 | +840 | +1,050 | +1,260 | +1,470 |
| 80-89 | +240 | +480 | +720 | +960 | +1,200 | +1,440 | +1,680 |
| 90-99 | +270 | +540 | +810 | +1,080 | +1,350 | +1,620 | +1,890 |
| 100-109 | +300 | +600 | +900 | +1,200 | +1,500 | +1,800 | +2,100 |
| 110-119 | +330 | +660 | +990 | +1,320 | +1,650 | +1,980 | +2,310 |
| 120-129 | +360 | +720 | +1,080 | +1,440 | +1,800 | +2,160 | +2,520 |
| 130-139 | +390 | +780 | +1,170 | +1,560 | +1,950 | +2,340 | +2,730 |
| 140-149 | +420 | +840 | +1,260 | +1,680 | +2,100 | +2,520 | +2,940 |
| 150-159 | +450 | +900 | +1,350 | +1,800 | +2,250 | +2,700 | +3,150 |
| 160-169 | +480 | +960 | +1,440 | +1,920 | +2,400 | +2,880 | +3,360 |
| 170-179 | +510 | +1,020 | +1,530 | +2,040 | +2,550 | +3,060 | +3,570 |
| 180-189 | +540 | +1,080 | +1,620 | +2,160 | +2,700 | +3,240 | +3,780 |
| 190-199 | +570 | +1,140 | +1,710 | +2,280 | +2,850 | +3,420 | +3,990 |
| 200-209 | +600 | +1,200 | +1,800 | +2,400 | +3,000 | +3,600 | +4,200 |
| 210-219 | +620 | +1,240 | +1,860 | +2,480 | +3,100 | +3,720 | +4,340 |
| 220-229 | +640 | +1,280 | +1,920 | +2,560 | +3,200 | +3,840 | +4,480 |
| 230-239 | +660 | +1,320 | +1,980 | +2,640 | +3,300 | +3,960 | +4,620 |
| 240-249 | +680 | +1,360 | +2,040 | +2,720 | +3,400 | +4,080 | +4,760 |
| 250+ | +700 | +1,400 | +2,100 | +2,800 | +3,500 | +4,200 | +4,900 |

Source: <https://maplestorywiki.net/w/Bonus_Stats/Stat_Tables>

##### Percentage and special lines

| Line | Restriction | T1 | T2 | T3 | T4 | T5 | T6 | T7 |
|---|---|---|---|---|---|---|---|---|
| **All Stats %** | Non-weapons must be **Lv70+**; weapons any level | +1% | +2% | +3% | +4% | +5% | +6% | +7% |
| **Boss Damage %** | **Weapons Lv90+ only** | +2% | +4% | +6% | +8% | +10% | +12% | +14% |
| **Damage %** | **Weapons only** | +1% | +2% | +3% | +4% | +5% | +6% | +7% |
| Speed | Armor / accessories only | +1 | +2 | +3 | +4 | +5 | +6 | +7 |
| Jump | Armor / accessories only | +1 | +2 | +3 | +4 | +5 | +6 | +7 |
| Required Level | any | −5 | −10 | −15 | −20 | −25 | −30 | −35 |

**All of these are item-level independent.** Note there is **no IED, no crit rate, no crit
damage, no drop rate and no meso rate** in the flame pool.

Source: <https://maplestorywiki.net/w/Bonus_Stats/Stat_Tables>

#### 2.7 Flame score conventions

"Flame score" is a **community convention**, not a game mechanic. It converts a set of bonus
stats into a single "primary-stat-equivalent" number so two rolls can be compared. **There is
no single canonical formula** — at least three ratio sets are in common use:

| Convention | secondary stat | 1 ATT / MATT | 1% All Stat | Source |
|---|---|---|---|---|
| **whackybeanz** (MSEA-flavoured, widely quoted) | ×0.125 (÷8) | ×4 | ×10 | <https://www.whackybeanz.com/guides/flames> |
| **StrategyWiki** | ×0.1 (÷10) | ×4 | ×15 | <https://strategywiki.org/wiki/MapleStory/Bonus_Stats> |
| **gms-upgrade-tracker** (GMS calculator) | ÷12 | ×3 | ×10 | <https://gms-upgrade-tracker.vercel.app/tools/flame-calculator> |

Worked example from whackybeanz: a Lv200 armor rolling `+44 STR, +85 INT, +30 LUK, +3% All Stats`
on a **Magician** scores `0 + 85 + (30 × 0.125) + (3 × 10) = 118.75` — STR is worthless to a
Magician so it contributes 0, INT is main, LUK is secondary.

**Class-specific variants (StrategyWiki):**

- **Xenon**: `1 ATT = 8 primary`, `1% All Stat = 20 primary`, and `STR = DEX = LUK = 1 primary`
  each (Xenon uses all three). Weapon ATT and All Stat% are weighted ~1.5-2× vs other jobs.
- **Demon Avenger**: no flame score — just count tiers. `2 Weapon ATT ≈ 1 tier of HP`.

**There is no separate weapon-vs-armor flame score formula** in any source found; the same
ratios are applied, but for weapons the ATT line is a *percentage* of base attack (see §2.6),
so a raw "ATT × 3" comparison is meaningless on weapons. StrategyWiki explicitly says flame
score is "generally used on non-weapons". **Treat weapon flames separately: compare
`ATT% × baseATT` directly.**

##### Target flame scores (StrategyWiki benchmarks, using the ÷10 / ×4 / ×15 ratios)

Percentiles are per-item, assuming Eternal/Black Rebirth Flames.

**Flame Advantage items** (starters ≈ 80th pct / average ≈ 95th / above avg ≈ 99th / minmax ≈ 99.9th):

| Item level | Starters | Average | Above Average | Minmax |
|---|---|---|---|---|
| 250+ | 95 | 135 | 170 | 200 |
| 200-249 | 85 | 125 | 155 | 190 |
| 160-199 | 80 | 115 | 145 | 170 |
| 140-159 | 75 | 110 | 135 | 160 |

**Non-Flame-Advantage items:**

| Item level | Starters | Average | Above Average | Minmax |
|---|---|---|---|---|
| 160-199 | 20 | 45 | 70 | 95 |
| 140-159 | 20 | 45 | 70 | 90 |
| 120-139 | 20 | 45 | 65 | 85 |

**Xenon, Flame Advantage:**

| Item level | Starters | Average | Above Average | Minmax |
|---|---|---|---|---|
| 250+ | 175 | 245 | 275 | 310 |
| 200-249 | 165 | 225 | 255 | 290 |
| 160-199 | 150 | 200 | 225 | 260 |
| 140-159 | 140 | 180 | 205 | 240 |

**Xenon, non-Flame-Advantage:** 160-199 → 60/80/105/145; 140-159 → 50/75/96/135;
120-139 → 45/70/90/130.

Rough flame counts to hit each band: starters ≈ 5 Eternal/Black (10 Powerful);
average ≈ 20 (50); above average ≈ 100 (300); minmax ≈ 1,000 Eternal/Black.

Source: <https://strategywiki.org/wiki/MapleStory/Bonus_Stats>

Stat-equivalence calculators referenced by that guide:
<https://maplescouter.com/en> · <https://amph.shinyapps.io/starforce/> ·
<https://docs.google.com/spreadsheets/d/1Q1Dj-2xEovBE1Ldlcqrdcjl1il7IfqF7opJJ2ZXyWl4>

#### 2.8 Systems not in GMS

- **Bonus Stats Reset System** (reset flames with mesos at a fixed cost, same rates as Black
  Rebirth Flame) — **not available in GMS or CMS**.
- **Auto Enhancement System** for flames (set target tiers, auto-reroll) — **not available in GMS**.

Source: <https://maplestorywiki.net/w/Bonus_Stats> (current revision as of 2026-09-06)

---

### 3. Potential and Bonus Potential

> **Source-quality warning for this section.** MapleStory Wiki's `Potential/Stat_Tables` page is
> **empty ("Under construction")** as of 2026-09-06
> (<https://maplestorywiki.net/w/Potential/Stat_Tables>). The only exhaustive public line-by-line
> tables are on **StrategyWiki**, which is *accurate on values* but *stale on item names*
> (it still calls GMS cubes "Red/Black/Meister/Master Craftsman/Occult" — see §3.7 for the
> current GMS names). Treat StrategyWiki values as good and its cube/stamp economy as historical.

#### 3.1 System summary

- Potential has **4 ranks**: Rare (blue), Epic (purple), Unique (yellow), Legendary (green).
- **Up to 3 lines.** New potential rolls 2 lines 75% / 3 lines 25% of the time; a higher-grade
  potential scroll on an item that already has potential inherits the line count.
- **The 1st line is always a "prime" line** (matches the item's rank). Lines 2 and 3 have a
  small independent chance to also be prime; otherwise they roll from the rank **one tier lower**.
  This is the "3rd line capped a tier lower" rule — it actually applies to lines 2 *and* 3.
- **Bonus Potential** is a completely separate, stacking system with its own 4 ranks, its own
  line pools and its own cubes. It requires the item to already have regular potential.
- **Bonus Potential can only be obtained in Regular/Interactive Worlds** — it does not exist in
  Heroic/Reboot worlds.

**Never gets potential:** Medals; Badges (except Ghost Ship Exorcist, Sengoku Hakase Badge and
Shackles of Resentment); Pocket Items; Androids (Android *Hearts* can); Totems; certain special
rings (Dark Angelic Blessing, Adventure Deep Dark Critical Ring, skill rings).

Sources: <https://maplestorywiki.net/w/Potential> · <https://strategywiki.org/wiki/MapleStory/Potential_System>

##### 2025-2026 changes

- **Potential Stamps and Bonus Potential (Awakening) Stamps are retired.** Since the
  Post-Assemble / Post-Every-Little-Thing update, **using a Cube on an item with fewer than 3
  potential lines automatically brings it to 3 lines**. Leftover stamps convert to Power Elixirs.
  Source: <https://maplestorywiki.net/w/Potential>
- **KMS removed all potential cubes** in the Dreamer Update and all bonus-potential cubes in the
  Milestone Update, replacing them with a **fixed meso cost per reset** based on equipment level
  and potential rank. GMS did **not** follow — GMS still uses cubes (see §3.7).
  Source: <https://maplestorywiki.net/w/Cube>
- **Auto Enhancement System** (set target potential lines, auto-cube until met, with a
  "stop on Combat Power increase" option) — requires Legendary rank. **Not available in GMS.**
  Source: <https://maplestorywiki.net/w/Potential>
- **No potential-line pool changes** (no lines removed or added) were found in GMS patch notes
  v264 through v271. The line pools in §3.3-§3.6 should be current.

#### 3.2 Rank × item-level percentage scale (the master table)

This single table drives nearly every `%` potential line.

| Item level | Rare | Epic | Unique | Legendary |
|---|---|---|---|---|
| 0-30 | 1% | 2% | 3% | 6% |
| 31-70 | 2% | 4% | 6% | 9% |
| **71-150** (GMS/TMS) | 3% | 6% | 9% | 12% |
| **151+** (GMS/TMS) | 4% | 7% | 10% | 13% |

**The GMS/TMS breakpoint is item level 151.** Other regions use 71-200 / 201+ for the same two
rows. So on GMS a **Lv160 AbsoLab, a Lv200 Arcane/Eternal and a Lv250 Genesis/Destiny all use
the same 13% Legendary line** — there is no separate Lv200 or Lv250 tier for regular potential.

**Key rule: All Stat % lines are always one rank below the stated rank.** A Legendary All Stat
line on a Lv151+ item is **10%**, not 13%.

Sources: <https://strategywiki.org/wiki/MapleStory/Potential_System> (explicit GMS/TMS note) ·
<https://maplestorywiki.net/w/Potential> (same table, listed as 71-150 / 151+ with a footnote)

**CONFLICT:** several secondary guides (e.g. digitaltq) state the top row is "level 201+".
That is the **non-GMS** breakpoint. For a GMS calculator use **151+**.

#### 3.3 Regular Potential — Legendary (prime) line pools and values

Values below are for **GMS Lv151+ items** (the top row of §3.2). Probabilities are given as
`initial / in-game cube / cash cube` where StrategyWiki publishes them.

##### Weapon (Legendary prime pool)

| Line | Value (Lv151+) | Chance (initial / in-game / cash) |
|---|---|---|
| STR / DEX / INT / LUK % | **+13%** | 8% / 11.11% / 9.756% |
| **Weapon ATT %** | **+13%** | 4% / 5.556% / 4.878% |
| **Magic ATT %** | **+13%** | 4% / 5.556% / 4.878% |
| Critical Rate % | +13% | 4% / 5.556% / 4.878% |
| Damage % | +13% | 4% / 5.556% / 4.878% |
| **All Stats %** | **+10%** | 8% / 11.11% / 7.317% |
| Weapon ATT +1 per 10 char levels | (= +25 ATT at Lv250) | 12% / 0% / 4.878% |
| Magic ATT +1 per 10 char levels | (= +25 MATT at Lv250) | 12% / 0% / 4.878% |
| **Ignore 35% of Monster DEF** (Lv50+) | 35% IED | 4% / 5.556% / 4.878% |
| **Ignore 40% of Monster DEF** (Lv100+) | 40% IED | 4% / 2.778% / 4.878% |
| **Boss Damage +35%** (Lv100+) | +35% | 8% / 11.11% / 9.756% |
| **Boss Damage +40%** (Lv100+) | +40% | 4% / 2.778% / 4.878% |

- IED lines and Boss Damage lines can each appear at most **2 times per item**.
- Note the asymmetry: `Boss 35%` is twice as likely as `Boss 40%` on initial rolls, and
  `IED 35%` is as likely as `IED 40%`.

##### Weapon — Unique (prime) / Legendary (non-prime) pool

Same stat lines at the Unique value (**+10%** for STR%/ATT%/crit/damage, **+7%** All Stat), plus:

| Line | Value | Chance |
|---|---|---|
| **Ignore 30% of Monster DEF** (Lv50+) | 30% IED | 6.667% / 6.667% / 6.977% |
| **Boss Damage +30%** (Lv100+) | +30% | 6.667% / 6.667% / 6.977% |

##### Armor — Hat (Legendary prime pool), representative of all armor

| Line | Value (Lv151+) | Chance |
|---|---|---|
| STR / DEX / INT / LUK % | **+13%** | 5.556% / 5.556% / 8.889% |
| Max HP % / Max MP % / DEF % | +13% | (see page) |
| **All Stats %** | **+10%** | 5.556% / 5.556% / 6.667% |
| 10% chance to ignore 20% of monster damage (Lv20+) | — | (max 2 per item) |
| 10% chance to ignore 40% of monster damage (Lv40+) | — | (max 2 per item) |
| Skills and Potion HP Recovery % | — | |
| **Skill Cooldown −1 sec** (Lv70+) | −1s | |
| **Skill Cooldown −2 sec** (Lv120+) | −2s | (hat only) |
| Decent Advanced Bless (Lv120+) | ATT/MATT +20, DEF +425, HP/MP +475, MP cost −12% for 240s | (max 1 decent skill per cube) |

Cooldown reduction caveat (StrategyWiki, verbatim mechanics): if a skill's cooldown after %
reductions is 5-10s, `−1s` instead reduces by 5% of the remaining cooldown (min 5s); if the
cooldown is >10s but this line would push it under 10s, only half the amount below 10s applies.

##### Accessories (Face, Eye, Ring, Earring, Pendant) — Legendary prime pool

| Line | Value (Lv151+) | Chance |
|---|---|---|
| STR / DEX / INT / LUK % | **+13%** | 5.882% / 5.882% / 9.302% |
| Max HP % / Max MP % / DEF % | +13% | |
| **All Stats %** | **+10%** | 5.882% / 5.882% / 6.977% |
| **Mesos Obtained % ** (Lv71+) | **+20%** | 8.824% / 8.824% / 6.977% |
| **Item Drop Rate %** (Lv71+) | **+20%** | 8.824% / 8.824% / 6.977% |
| MP Cost Reduction | (two variants) | |
| Skills and Potion HP Recovery % | | |

- **Meso and Drop lines do NOT scale past item level 71**: 0-30 → 10%, 31-70 → 15%, **71+ → 20%**.
  There is no 151+ bump for them.
- Drop Rate can appear at most **2 times per item**.
- **Caps: +100% Mesos Obtained and +200% Item Drop Rate total from potential + bonus potential.**

##### Cape / Belt / Shoulderpad, Top / Overall / Bottom, Gloves, Shoes, Secondary, Emblem, Heart/Badge

Each has its own pool with slot-specific extras (gloves get Critical Damage, shoes get
Movement/Jump, secondary and emblem mirror the weapon pool minus a few lines). Values follow
§3.2 identically.

**Full per-slot, per-rank line lists with individual probabilities are at:**
<https://strategywiki.org/wiki/MapleStory/Potential_System#Potentials_List>

Format of that page (for a later porting pass): it is organised as
`### <Slot>` → `### <Rank> (Non-prime)` / `### Rare (Prime) / Epic (Non-prime)` /
`### Epic (Prime) / Unique (Non-prime)` / `### Unique (Prime) / Legendary (Non-prime)` /
`### Legendary (Prime)`. Each stat within a section is a `<h4>` followed by **two tables**:
(1) `| Equip level | Stat value |` with rows `0-30 / 31-70 / 71+ / (GMS) 151+`, and
(2) `| Item Level | Initial | In-game cube | Cash cube |` giving that line's roll probability.
Slots covered: Hat · Top and Overall · Bottom · Gloves · Shoes · Cape, Belt, Shoulderpad ·
Face Accessory, Eye Accessory, Ring, Earring, Pendant · Weapon · Secondary Weapon ·
Demon Aegis and Soul Rings · Emblem · Mechanical Heart and Badge.

A second, MapleSEA-maintained probability reference (also linked by StrategyWiki):
<http://whackybeanz.com/maple/extras/potential-list>

#### 3.4 Prime-line rates

**In-game (meso/drop) cubes** — rate depends on cube *and* rank; lines 2 and 3 share the same
chance and are rolled independently:

| Cube (old name) | at Rare | at Epic | at Unique | at Legendary |
|---|---|---|---|---|
| Occult / Suspicious → **Mystical** | 0.0999% (1 in 1,001) | 0.99% (1 in 101) | — | — |
| Master Craftsman / Yellow → **Hard** | 16.667% (1 in 6) | 4.762% (1 in 21) | 1.186% (1 in 84.3) | — |
| Meister / Purple → **Solid** | 16.667% (1 in 6) | 7.999% (1 in 12.5) | 1.696% (1 in 59) | 0.1996% (1 in 501) |

**Cash cubes** — rate depends on the cube only, and lines 2 and 3 have *different* chances:

| Cube (old name → GMS name) | 2nd line prime | 3rd line prime |
|---|---|---|
| RED → **Glowing Cube** | 10% | 1% |
| Black → **Bright Cube** | 20% | 5% |

**Hexa / Violet Cube** (choose 3 of 6 lines):

| Line slot | Prime chance |
|---|---|
| 1st | 100% |
| 2nd | 10% (20% in TMS) |
| 3rd | 1% (15% in TMS) |
| 4th | 1% (100% in TMS) |
| 5th | 10% (20% in TMS) |
| 6th | 1% (15% in TMS) |

**Equality Cube**: all 3 lines are guaranteed prime (Rare→Epic only).

**Resulting odds at Legendary:**

| Cube | Double prime or better | Triple prime |
|---|---|---|
| Meister/Purple (**Solid**) | 0.3988% | 0.000398% (1 in 251,001) |
| RED (**Glowing**) | 10.9% | 0.1% |
| Black (**Bright**) | 24% | 1% |
| Hexa | 21.406% (100% in TMS) | 1.559% (53.76% in TMS) |
| Equality | 100% | 100% |

Source: <https://strategywiki.org/wiki/MapleStory/Potential_System>

#### 3.5 Rank-up rates

**GMS** (StrategyWiki notes GMS rates are "wildly higher than KMS"):

| Cube | Rare → Epic | Epic → Unique | Unique → Legendary |
|---|---|---|---|
| Occult/Suspicious (**Mystical**) | 1% | — | — |
| Master Craftsman/Yellow (**Hard**) | 11.8% | 3.8% | — |
| Meister/Purple (**Solid**), RED (**Glowing**) | 14.1% | 6% | 2.4% |
| Black (**Bright**) | 16% | 11% | 4.7% |

**KMS** (for comparison / other regions):

| Cube | Rare → Epic | Epic → Unique | Unique → Legendary |
|---|---|---|---|
| Occult/Suspicious | 0.99% (1 in 101) | — | — |
| Master Craftsman/Yellow | 4.762% (1 in 21) | 1.186% (1 in 85) | — |
| Meister/Purple | 7.999% (1 in 12.5) | 1.696% (1 in 59) | 0.1996% (1 in 501) |
| RED | 6% | 1.8% | 0.3% |
| Black | 15% | 3.5% | 1.2% |

**Miracle Time** doubles the rank-up chance. **Double Miracle Time** doubles it *and* allows a
small chance of a double rank-up in one reset. The current GMS cubes (Glowing/Bright/Hard/Solid)
are also documented as being able to **"increase up to 2 ranks"** in a single use, which is a
change from the older single-rank behaviour.

Sources: <https://strategywiki.org/wiki/MapleStory/Potential_System> ·
<https://maplestorywiki.net/w/Cube>
Official KMS rate disclosures: `https://maplestory.nexon.com/Guide/OtherProbability/cube/{red|black|strange|master|artisan}`

**UNVERIFIED:** the GMS rank-up percentages above date from the pre-v239 cube renaming.
MapleStory Wiki notes *"In GlobalMS v239, probabilities of changing potential tiers were also
changed"* — so the current GMS numbers may differ. **Confirm against in-game tooltips before
shipping.**

#### 3.6 Bonus Potential

Bonus Potential is weaker in `%` terms but offers lines regular potential cannot — most notably
**flat Attack Power on armor and accessories**.

##### Rank × item-level scale — STR / DEX / INT / LUK %

| Item level | Rare | Epic | Unique | Legendary |
|---|---|---|---|---|
| 0-20 | 1% | 1% | 2% | 3% |
| 21-50 | 1% | 2% | 3% | 4% |
| 51-90 | 1% | 3% | 4% | 5% |
| **91-150** (GMS/TMS) | 2% | 4% | 5% | 7% |
| **151+** (GMS/TMS) | 3% | 5% | 6% | **8%** |

##### Rank × item-level scale — Max HP %

| Item level | Rare | Epic | Unique | Legendary |
|---|---|---|---|---|
| 0-20 | 1% | 1% | 2% | 3% |
| 21-50 | 1% | 2% | 3% | 5% |
| 51-90 | 1% | 3% | 5% | 7% |
| **91-150** | 2% | 5% | 7% | 10% |
| **151+** | 3% | 6% | 8% | **11%** |

**All Stat % bonus-potential lines are one rank below**, as with regular potential
(Legendary All Stat on a Lv151+ item = **+6%**).

**For weapons, secondary weapons and emblems, bonus potential uses the *regular* potential
scale** (i.e. §3.2: 12%/13% at Legendary, not 7%/8%).

##### Flat lines on armor / accessories — Legendary (prime) values

| Line | 0-20 | 21-40 | 41-50 | 51-70 | 71-90 | 91-150 | **(GMS) 151+** |
|---|---|---|---|---|---|---|---|
| **STR / DEX / INT / LUK (flat)** | +8 | +10 | +12 | +14 | +16 | +18 | **+19** |

| Line | 0-20 | 21-50 | 51-90 | 91-150 | **(GMS) 151+** |
|---|---|---|---|---|---|
| **Weapon ATT (flat)** | +8 | +10 | +12 | +14 | **+15** |
| **Magic ATT (flat)** | +8 | +10 | +12 | +14 | **+15** |
| STR/DEX/INT/LUK % | +3% | +4% | +5% | +7% | **+8%** |
| **All Stats %** | +2% | +3% | +4% | +5% | **+6%** |

This is the headline bonus-potential line for a calculator: **a Legendary-prime flat ATT line on
a Lv151+ armor or accessory is +15 ATT**, and an item can carry up to 3 of them.

Other Legendary-prime armor/accessory bonus-potential lines:

| Line | Value | Notes |
|---|---|---|
| **Critical Damage +1%** | +1% | Lv70+, chance 3.1746% (1 in 31.5) |
| Mesos Obtained % | 0-20: +2% · 21-50: +3% · 51-90: +4% · **91+: +5%** | caps at +100% total |
| Item Drop Rate % | 0-20: +2% · 21-50: +3% · 51-90: +4% · **91+: +5%** | max 2 lines/item; caps at +200% total |
| STR/DEX/INT/LUK +2 per 10 char levels | +50 at Lv250 | Lv30+ |
| DEF flat / DEF % / Max HP flat / Max MP flat / Max HP % / Max MP % | per tables | |
| Skills and Potion HP Recovery | | |

##### Weapon bonus potential — Legendary (prime)

| Line | Value (Lv151+) | Chance (Lv70+) |
|---|---|---|
| STR / DEX / INT / LUK % | **+13%** | 5.128% (1 in 19.5) |
| **Weapon ATT %** | **+13%** | 5.128% |
| **Magic ATT %** | **+13%** | 5.128% |
| Damage % | +13% | |
| Critical Rate % | +13% | |
| **All Stats %** | **+10%** | 5.128% |
| **Boss Damage +18%** (Lv50+) | +18% | 2.564% (1 in 39) — max 2/item |
| **Ignore 5% of Monster DEF** (Lv50+) | 5% IED | 2.564% (1 in 39) — max 2/item |
| STR/DEX/INT/LUK +2 per 10 char levels | +50 at Lv250 | Lv30+ |

Note the sharply weaker special lines vs regular potential: bonus-pot boss damage is **18%**
(vs 30-40%) and bonus-pot IED is **5%** (vs 30-40%).

##### Bonus Potential rank-up and prime rates (KMS-published)

| Rank increase | Chance |
|---|---|
| Rare → Epic | 4.762% (1 in 21) |
| Epic → Unique | 1.961% (1 in 51) |
| Unique → Legendary | 0.6% (1 in 166.67) |

| Rank | Chance of a prime 2nd or 3rd line |
|---|---|
| Rare | 1.961% (1 in 51) |
| Epic | 4.762% (1 in 21) |
| Unique | 1.961% (1 in 51) |
| Legendary | **0.4975% (1 in 201)** |

Triple-prime Legendary bonus potential = `(1/201)² = 0.0024%` — **1 in 40,401**.

**GMS rates are stated to be higher than these KMS figures**; no GMS numbers are published.
**UNVERIFIED for GMS.**

Sources: <https://strategywiki.org/wiki/MapleStory/Potential_System> ·
KMS official: `https://maplestory.nexon.com/Guide/OtherProbability/cube/addi`
Full per-slot bonus-potential line lists: same StrategyWiki page,
`#Bonus_Potential_Stat_List` — slots are Hat · Top/Overall/Bottom/Shoes/Cape/Belt/Shoulderpad ·
Gloves · Face/Eye/Ring/Earring/Pendant · Mechanical Heart/Badge · Weapon · Emblem ·
Secondary Weapon, in the same 5-section rank structure described in §3.3.

#### 3.7 Current GMS cube inventory (name mapping)

**This is the piece StrategyWiki gets wrong.** GMS renamed all cubes in v239.

**In-game (drop/craft) cubes, GMS:**

| GMS name | Old name | Effect |
|---|---|---|
| **Mystical Cube** | Occult / Suspicious Cube | Resets potential, up to **Epic** |
| **Hard Cube** | Master Craftsman's / Yellow Cube | Up to **Unique**; can increase up to 2 ranks |
| **Karma Hard Cube** | — | Same, untradable items only |
| **Solid Cube** | Meister's / Purple Cube | Up to **Legendary**; up to 2 ranks if item is Rare |
| **Karma Solid Cube** | — | Same, untradable items only |
| **Event Ring Exclusive Solid Cube** | — | Event rings only |
| **Bonus Mystical Cube** | Suspicious Additional Cube | Bonus potential, up to Epic |
| **Karma Bonus Mystical Cube** | — | Same, untradable |

**Cash Shop cubes, GMS:**

| GMS name | Old name | Effect | Price |
|---|---|---|---|
| **Glowing Cube** | RED Cube | Potential up to Legendary; up to 2 ranks; +1 Cube Piece | Interactive **1,200 NX** / Heroic **12,000,000 mesos** |
| **Bright Cube** | Black Cube | Same + **choose before/after**; +2 Cube Pieces | Interactive **2,200 NX** / Heroic **22,000,000 mesos** |
| **Bonus Glowing Cube** | Bonus Potential Cube | Bonus potential up to Legendary; up to 2 ranks; +2 Cube Pieces | 2,400 NX |
| **Bonus Bright Cube** | White Bonus Potential Cube | Same + choose before/after; +3 Cube Pieces | ? NX |
| **Violet Cube** | Hexa Cube | Choose 3 of 6 potential lines | ? NX |

**Heroic (Reboot) worlds buy cubes with mesos, not NX** — 12M for Glowing, 22M for Bright.
This is the number a Reboot gear-progression calculator needs.

Source: <https://maplestorywiki.net/w/Cube> (current revision, 2026-09-06)

**UNVERIFIED:** Bonus Bright Cube and Violet Cube NX prices are marked `???` on the wiki.
Bonus potential cubes are irrelevant in Heroic worlds anyway (bonus potential does not exist there).

---

### 4. Open questions / things to verify in-game

1. **Weapon star force 26★-30★ ATT/MATT gains.** Genuinely undocumented on every public source
   checked. The armor table was updated to 30★; the weapon table was not. (§1.4)
2. **Does a Level-250 weapon star-force column exist at all?** Destiny weapons are locked at 22★,
   so there may be nothing to document. (§1.2, §1.4)
3. **Star Force Enhancement Mode (GMS v269) per-level rates and cost multipliers.** Nexon
   published only the qualitative description. (§1.5)
4. **GMS meso costs post-v264.** Nexon said costs were "adjusted to scale based on both equipment
   level and enhancement level" but published no formula. The wiki's GMS formulas may predate this. (§1.7)
5. **Current GMS cube rank-up probabilities.** The published GMS numbers predate the v239 cube
   revamp, which the wiki says also changed tier-up probabilities. (§3.5)
6. **Abyssal Rebirth Flame tier distribution.** Described qualitatively only. (§2.5)
7. **Three wiki transcription errors found and corrected here** — weapon delta 17★ (§1.4),
   weapon cumulative 25★/200-249 MATT (§1.4), badge cumulative 16★/250 and 21★/150-159 (§1.4).
   Worth re-reading from the game to confirm the corrections.
8. **Flame score has no canonical formula.** Pick one convention and state it in the UI; the
   three in circulation give materially different answers (ATT ×3 vs ×4, All Stat ×10 vs ×15). (§2.7)

---

### Appendix: primary source index

| Topic | URL |
|---|---|
| Star Force overview, rates, max stars, traces, meso cost | <https://maplestorywiki.net/w/Star_Force_Enhancement> |
| **Star Force stat tables (weapons / armor / badges / superior)** | <https://maplestorywiki.net/w/Star_Force_Enhancement/Stat_Tables> |
| Star Force (pre-revamp, useful for cross-checks to 25★) | <https://strategywiki.org/wiki/MapleStory/Spell_Trace_and_Star_Force> |
| KMS Star Force reorganization patch notes | <https://orangemushroom.net/2025/03/20/kms-ver-1-2-401-maplestory-next-destiny-weapon-star-force-reorganization/> |
| **GMS v264 official patch notes (Star Force revamp)** | <https://www.nexon.com/maplestory/news/update/32522> |
| GMS v269 official patch notes (Enhancement Mode) | <https://www.nexon.com/maplestory/news/update/41138/updated-6-30-v-269-ride-the-lightning-patch-notes> |
| GMS version history index | <https://maplestorywiki.net/w/Update_Notes:_MapleStory_Global> |
| Flames overview, flame types, restrictions | <https://maplestorywiki.net/w/Bonus_Stats> |
| **Flame stat tables (all lines, all tiers)** | <https://maplestorywiki.net/w/Bonus_Stats/Stat_Tables> |
| Flame tier/line probabilities, flame score benchmarks | <https://strategywiki.org/wiki/MapleStory/Bonus_Stats> |
| Flame guide + flame score convention (MSEA naming) | <https://www.whackybeanz.com/guides/flames> |
| Flame odds calculator | <https://www.whackybeanz.com/utilities/equips/flames> |
| Potential overview, stamps retirement | <https://maplestorywiki.net/w/Potential> |
| **Potential + Bonus Potential full line lists** | <https://strategywiki.org/wiki/MapleStory/Potential_System> |
| Potential line probabilities (MapleSEA) | <http://whackybeanz.com/maple/extras/potential-list> |
| **Current GMS cube names and prices** | <https://maplestorywiki.net/w/Cube> |
| KMS official probability disclosures | `https://maplestory.nexon.com/Guide/OtherProbability/...` |
| Open-source star force implementation (Dart) | <https://github.com/MrReds1324/maplestory_builder/blob/main/lib/constants/equipment/starforce_stats.dart> |
| Open-source star force implementation (JS, well-commented) | <https://github.com/masonym/masonym.dev/blob/main/src/lib/equip/starforce.js> |
| Star force simulator (source of some unverified extrapolations) | <https://misaomaki.github.io/starforce.html> |
| Stat-equivalence calculators | <https://maplescouter.com/en> · <https://amph.shinyapps.io/starforce/> |

---

## 4B. Hyper Stats, Legion, Symbols, Inner Ability, Link Skills, Set Effects

*Research pass B. Scope: Hyper Stats, Legion / Maple Union, Symbols (Arcane / Sacred / Grand Sacred) plus Force penalty tables, Inner Ability, Link Skills, Equipment Set Effects. Section numbering below is this pass's own.*

> Passes A and B each open with their own "Version context — what changed in 2025-2026" table. They overlap but are not identical; read both.

Research compiled 2026-09-06 for a gear-progression calculator.
Scope: Hyper Stats, Legion/Maple Union, Symbols, Inner Ability + Link Skills, Equipment Set Effects.

**Reading conventions used throughout this document**

- Every table is followed by the source URL it came from. Where two independent sources
  were cross-checked, both are listed.
- `**UNVERIFIED**` marks a number that could not be confirmed from a primary/reliable source.
- `**CONFLICT**` marks a place where sources disagree; both values are given.
- **Section numbering:** each of the five topic sections was researched independently and keeps
  its own internal numbering (so §2 has its own "1., 2., 3.…", §3 uses "A., B., C.…", §5 has its
  own "1., 2., 3.…"). Use the table of contents rather than bare numbers when cross-referencing.
- KMS = Korea, GMS = Global. GMS lags KMS by roughly 3-6 months on system updates, so a
  KMS-sourced table is marked as such and should be treated as "the direction GMS is heading"
  unless a GMS source confirms it has already landed.

---

### Contents

- [0. Version context — what changed in 2025-2026](#0-version-context--what-changed-in-2025-2026)
- [1. Hyper Stats](#1-hyper-stats)
  - [1.1 System summary](#11-system-summary)
  - [1.2 Hyper stat point COST curve (per stat)](#12-hyper-stat-point-cost-curve-per-stat)
  - [1.3 Hyper stat POINTS AVAILABLE by character level](#13-hyper-stat-points-available-by-character-level)
  - [1.4 Effect per level — every hyper stat](#14-effect-per-level--every-hyper-stat)
  - [1.5 Quick reference — maxed totals](#15-quick-reference--maxed-totals)
  - [1.6 Things that are NOT hyper stats (common errors to avoid)](#16-things-that-are-not-hyper-stats-common-errors-to-avoid)
- [2. Legion / Maple Union](#2-legion--maple-union)
  - [0. Naming — regional terminology map](#0-naming--regional-terminology-map)
  - [1. Character Ranks and Grid Area per Rank](#1-character-ranks-and-grid-area-per-rank)
  - [2. Board Size, Total Squares, and How Size Unlocks](#2-board-size-total-squares-and-how-size-unlocks)
  - [3. Legion Ranks — thresholds and what each grants](#3-legion-ranks--thresholds-and-what-each-grants)
  - [4. Legion Member Effects — full class table (GMS 2026)](#4-legion-member-effects--full-class-table-gms-2026)
  - [5. Board / Grid Stat Values](#5-board--grid-stat-values)
  - [6. Legion Raid Power and Legion Coin income](#6-legion-raid-power-and-legion-coin-income)
  - [7. The Overdrive Legion Rework (KMS live July 2026 · GMS expected Nov/Dec 2026)](#7-the-overdrive-legion-rework-kms-live-july-2026--gms-expected-novdec-2026)
  - [8. Adjacent Legion subsystems (relevant to a progression calculator)](#8-adjacent-legion-subsystems-relevant-to-a-progression-calculator)
  - [9. 2025–2026 change log for Legion (chronological)](#9-20252026-change-log-for-legion-chronological)
  - [10. Gaps / things to verify in-game or later](#10-gaps--things-to-verify-in-game-or-later)
  - [11. Source index](#11-source-index)
- [3. Symbols (Arcane, Sacred/Authentic, Grand Sacred)](#3-symbols-arcane-sacredauthentic-grand-sacred)
  - [A. ARCANE SYMBOLS](#a-arcane-symbols)
  - [B. SACRED SYMBOLS (= Authentic Symbols)](#b-sacred-symbols--authentic-symbols)
  - [C. NEWER SYMBOL TYPES (2025–2026)](#c-newer-symbol-types-20252026)
  - [D. FORCE MECHANICS — the exact published rules](#d-force-mechanics--the-exact-published-rules)
  - [E. GMS-SPECIFIC STATE AS OF 2026-09-06 (read this before coding)](#e-gms-specific-state-as-of-2026-09-06-read-this-before-coding)
  - [F. CONSOLIDATED FORMULA SHEET (implementation-ready)](#f-consolidated-formula-sheet-implementation-ready)
  - [G. DISAGREEMENTS, GAPS AND UNVERIFIED ITEMS](#g-disagreements-gaps-and-unverified-items)
- [4. Inner Ability and Link Skills](#4-inner-ability-and-link-skills)
  - [PART A — INNER ABILITY ("Ability")](#part-a--inner-ability-ability)
  - [PART B — LINK SKILLS](#part-b--link-skills)
  - [PART C — DATA-QUALITY NOTES FOR THE CALCULATOR](#part-c--data-quality-notes-for-the-calculator)
- [5. Equipment Set Effects](#5-equipment-set-effects)
  - [Source quality notes (read first)](#source-quality-notes-read-first)
  - [1. Root Abyss Set (Chaos Root Abyss / "CRA")](#1-root-abyss-set-chaos-root-abyss--cra)
  - [2. AbsoLab Set](#2-absolab-set)
  - [3. Arcane Umbra Set](#3-arcane-umbra-set)
  - [4. Eternal Set (Eternal armor + Genesis/Destiny weapon)](#4-eternal-set-eternal-armor--genesisdestiny-weapon)
  - [5. Genesis Weapon and Destiny Weapon](#5-genesis-weapon-and-destiny-weapon)
  - [6. Pitched Boss Set](#6-pitched-boss-set)
  - [7. Dawn Boss Set](#7-dawn-boss-set)
  - [8. Brilliant Boss Set ("Radiant" / KMS 광휘의 보스 세트)](#8-brilliant-boss-set-radiant--kms-광휘의-보스-세트)
  - [9. Boss Accessory Set (generic)](#9-boss-accessory-set-generic)
  - [10. Gollux Sets](#10-gollux-sets)
  - [11. Meister / "Ardentmill" accessory set](#11-meister--ardentmill-accessory-set)
  - [12. Blackgate Set (and "Whitegate")](#12-blackgate-set-and-whitegate)
  - [13. Other accessory / misc sets with damage-relevant effects](#13-other-accessory--misc-sets-with-damage-relevant-effects)
  - [14. Android / Pet sets](#14-android--pet-sets)
  - [15. Newly added 2025–2026 content — findings](#15-newly-added-20252026-content--findings)
  - [16. Open gaps and unresolved items](#16-open-gaps-and-unresolved-items)
- [Appendix A — Cross-cutting 2025-2026 patch detail (KMS CROWN)](#appendix-a--cross-cutting-2025-2026-patch-detail-kms-crown)
  - [A.1 CROWN link skill master-level table (KMS, ver. 1.2.410, 2025-12-28)](#a1-crown-link-skill-master-level-table-kms-ver-12410-2025-12-28)
  - [A.2 CROWN Sacred Symbol level-11 bonus table (KMS, 2025-12-18)](#a2-crown-sacred-symbol-level-11-bonus-table-kms-2025-12-18)
  - [A.3 Brilliant ("Radiant") Boss accessory set — announcement figures](#a3-brilliant-radiant-boss-accessory-set--announcement-figures)
  - [A.4 Other CROWN changes that touch this document](#a4-other-crown-changes-that-touch-this-document)
- [Appendix B — Independent Korean-source cross-check (namu.wiki)](#appendix-b--independent-korean-source-cross-check-namuwiki)
  - [B.1 Confirmations](#b1-confirmations)
  - [B.2 Facts only namu carries (KMS figures — treat as UNVERIFIED for GMS)](#b2-facts-only-namu-carries-kms-figures--treat-as-unverified-for-gms)
  - [B.3 Where namu is a better source than the English wikis](#b3-where-namu-is-a-better-source-than-the-english-wikis)
- [Appendix C — Consolidated confidence assessment](#appendix-c--consolidated-confidence-assessment)
  - [Known gaps carried forward](#known-gaps-carried-forward)

---

### 0. Version context — what changed in 2025-2026

This matters for every section below, because several long-stable tables were rewritten
in the **CROWN** update (KMS Dec 2025 / Jan-Feb 2026).

| Update | Date (KMS) | Changes relevant to this document |
|---|---|---|
| NEXT: Union Champion | 2025-01-16 | Legion/Union Champion system |
| NEXT: Destiny Weapon & Star Force Reorganization | 2025-03-20 | Star Force rework, Destiny weapon tier above Genesis |
| Assemble: Len | 2025-06-20 | New class Len (Lynn) |
| **CROWN** showcase | 2025-12-14 | Announced everything below |
| **CROWN** pt.1 (ver. 1.2.410) | 2025-12-18 / patch post 2025-12-28 | **Link Skill master-level expansion (level 3 links)**; **Authentic/Sacred Symbol Lv11 bonus effects**; Maple Union rank-up cost removed (auto rank-up); **Hyper Stat preset change cost removed**; Ability "Change Circulator"; V Matrix rework; Kinesis remaster (DF/TP/PP hyper stat renamed to DF/TF) |
| CROWN pt.2 | 2026-01-15 | New boss **Radiant Malefic Star** (Lv280) → **Brilliant Boss accessory** set; **Astra secondary weapon** (Genesis→Destiny gap filler) |
| CROWN pt.3 | 2026-02-12 | New boss **Jupiter** (Lv295); new area **Geardrock/Geardrak** (Lv295) → **Grand Authentic/Sacred Symbol: Geardrock**; Destiny Weapon 2nd Growth; Guild Castle |
| Symbol pouch patch | 2026-03-19 | Symbol Voucher Bag (40 slots) added |

Sources: <https://orangemushroom.net/2025/12/14/2025-maplestory-winter-showcase-crown/>,
<https://orangemushroom.net/2025/12/28/kms-ver-1-2-410-maplestory-crown-kinesis-remaster/>,
<https://orangemushroom.net/2025/01/16/kms-ver-1-2-399-maplestory-next-union-champion/>,
<https://orangemushroom.net/2025/03/20/kms-ver-1-2-401-maplestory-next-destiny-weapon-star-force-reorganization/>,
<https://namu.wiki/w/어센틱포스> (rev. 2026-09-05)

---

### 1. Hyper Stats

#### 1.1 System summary

- Unlocked at **character level 140**.
- 17 distinct hyper stats. **16 of them cap at level 15; "Maximum DF/TF" caps at level 10.**
- **The last 5 levels of every stat, and the Arcane Force stat entirely, require 5th Job Advancement.**
  (Arcane Force additionally requires having obtained an Arcane Symbol from the quest.)
- Reset cost: **10,000,000 mesos.**
- **3 presets** are available. Switching between presets used to cost 2,000,000 mesos;
  **the preset change cost was removed in the CROWN update (KMS, Dec 2025)**.
- There is **no Sacred Force / Authentic Force hyper stat** as of 2026-09. Sacred Force can
  only be raised by Sacred Symbols. (Arcane Force, by contrast, can be raised by hyper stat,
  guild skill and event buffs.)

Sources: <https://strategywiki.org/wiki/MapleStory/Hyper_Stats> ·
<https://orangemushroom.net/2025/12/28/kms-ver-1-2-410-maplestory-crown-kinesis-remaster/> ·
<https://namu.wiki/w/어센틱포스>

#### 1.2 Hyper stat point COST curve (per stat)

This is the single most important table for an optimizer: cost is per-stat and strongly convex.

| Target level | Cost from previous level | Cumulative cost from 0 |
|---|---|---|
| 1 | 1 | 1 |
| 2 | 2 | 3 |
| 3 | 4 | 7 |
| 4 | 8 | 15 |
| 5 | 10 | 25 |
| 6 | 15 | 40 |
| 7 | 20 | 60 |
| 8 | 25 | 85 |
| 9 | 30 | 115 |
| 10 | 35 | 150 |
| 11 | 50 | 200 |
| 12 | 65 | 265 |
| 13 | 80 | 345 |
| 14 | 95 | 440 |
| 15 | 110 | 550 |

Source: <https://strategywiki.org/wiki/MapleStory/Hyper_Stats>
Independently corroborated by the KMS hyper stat simulator's source
(`usedPoint` switch in <https://mystrange01.github.io/hyperCalc/main.js>) and by
<https://codingace.net/statistics/hyper_stat_maplestory.html> (embedded `resultRows`
JSON: level 8 → cost 85, level 10 → 150, level 11 → 200, level 13 → 345).

> **CONFLICT / correction.** Several SEO calculator pages and AI-generated summaries claim
> "levels 1-10 cost 1,2,3…10 and levels 11-15 cost 15,20,25,30,35, total 180". **That is
> wrong.** Three independent primary-ish sources (StrategyWiki, the KMS simulator source,
> codingace's embedded data) all agree on the table above, total **550**. Use 550.

The same cost curve applies to *every* hyper stat, including the level-10-capped DF/TF one
(so DF/TF maxes at a cost of 150).

#### 1.3 Hyper stat POINTS AVAILABLE by character level

You first receive 3 points on reaching level 140. The award per level-up increases by 1
every 10 character levels.

**Closed-form per bracket** (points awarded *on* that level-up):

| Character level | Points per level | Cumulative total formula |
|---|---|---|
| 140-149 | 3 | 3 × Level − 417 |
| 150-159 | 4 | 4 × Level − 566 |
| 160-169 | 5 | 5 × Level − 725 |
| 170-179 | 6 | 6 × Level − 894 |
| 180-189 | 7 | 7 × Level − 1,073 |
| 190-199 | 8 | 8 × Level − 1,262 |
| 200-209 | 9 | 9 × Level − 1,461 |
| 210-219 | 10 | 10 × Level − 1,670 |
| 220-229 | 11 | 11 × Level − 1,889 |
| 230-239 | 12 | 12 × Level − 2,118 |
| 240-249 | 13 | 13 × Level − 2,357 |
| 250-259 | 14 | 14 × Level − 2,606 |
| 260-269 | 15 | 15 × Level − 2,865 |
| 270-279 | 16 | 16 × Level − 3,134 |
| 280-289 | 17 | 17 × Level − 3,413 |
| 290-299 | 18 | 18 × Level − 3,702 |
| 300 | 19 (one-off) | **1,699** |

**Checkpoint values** (cumulative points owned at that level):

| Level | Total | Level | Total | Level | Total |
|---|---|---|---|---|---|
| 140 | 3 | 200 | 339 | 260 | 1,035 |
| 150 | 34 | 210 | 430 | 270 | 1,186 |
| 160 | 75 | 220 | 531 | 280 | 1,347 |
| 170 | 126 | 230 | 642 | 290 | 1,518 |
| 180 | 187 | 240 | 763 | 299 | 1,680 |
| 190 | 258 | 250 | 894 | **300** | **1,699** |

Source: <https://strategywiki.org/wiki/MapleStory/Hyper_Stats> (full 140→300 row-by-row table).
Corroborated for 140-290 by <https://mystrange01.github.io/hyperCalc/main.js>.

> Note: the hyperCalc source has an off-by-one bug at exactly level 300 (returns 1,518).
> StrategyWiki's row-by-row table gives **1,699** at level 300, which is consistent with the
> 18-per-level bracket ending at 1,680 on level 299 plus a final 19-point award.
> Level 300 award of 19 is **only sourced from StrategyWiki** — treat as lightly UNVERIFIED.

For calculator sizing: at level 300 you have **1,699 points**, and maxing a single stat to
15 costs 550. So you can afford roughly **three maxed stats plus change** (1,650), which is
why the standard endgame allocation is Boss Damage 15 / IED 15 / Damage 15 and then spread.

#### 1.4 Effect per level — every hyper stat

All 17 stats. "Total" is the cumulative effect at that level (not per-level delta).

##### Main stats: STR / DEX / INT / LUK (four separate hyper stats)

Flat **+30 per level**, linear. **Not affected by %STR / %All Stat** — it is added as final stat.

| Lv | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Total | 30 | 60 | 90 | 120 | 150 | 180 | 210 | 240 | 270 | 300 | 330 | 360 | 390 | 420 | **450** |

##### Max HP % and Max MP % (two separate hyper stats)

Flat **+2% per level**, linear.

| Lv | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Total % | 2 | 4 | 6 | 8 | 10 | 12 | 14 | 16 | 18 | 20 | 22 | 24 | 26 | 28 | **30** |

##### Maximum DF / TF (Demon Force / Time Force) — **CAPS AT LEVEL 10**

Flat **+10 per level**. Only useful for Demon Slayer, Kanna (Kanna's Mana is coded as DF),
Kinesis, Zero.
Formerly named "Maximum DF/TF/PP"; **renamed to "DF/TF Increase" in the CROWN Kinesis
remaster (KMS 2025-12-28)** when Kinesis's Psychic Points were removed.

| Lv | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| Total | 10 | 20 | 30 | 40 | 50 | 60 | 70 | 80 | 90 | **100** |

##### Critical Rate — **tiered**: +1%/lv for 1-5, +2%/lv for 6-15

| Lv | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Total % | 1 | 2 | 3 | 4 | 5 | 7 | 9 | 11 | 13 | 15 | 17 | 19 | 21 | 23 | **25** |

##### Critical Damage — flat +1%/level

| Lv | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Total % | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | **15** |

##### Ignore Enemy DEF (IED) — flat +3%/level (nominal)

| Lv | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Total % | 3 | 6 | 9 | 12 | 15 | 18 | 21 | 24 | 27 | 30 | 33 | 36 | 39 | 42 | **45** |

**Important for a calculator:** IED is multiplicative-stacking, so the *effective* marginal
value of each hyper stat level rises. StrategyWiki publishes the effective marginal gain
(i.e. the relative reduction in remaining enemy DEF) assuming this is your only IED source:

| Lv | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
|---|---|---|---|---|---|---|---|---|
| Effective marginal | 3.0000% | 3.0927% | 3.1914% | 3.2967% | 3.4090% | 3.5294% | 3.6585% | 3.7974% |

| Lv | 9 | 10 | 11 | 12 | 13 | 14 | 15 |
|---|---|---|---|---|---|---|---|
| Effective marginal | 3.9473% | 4.1095% | 4.2857% | 4.4776% | 4.6875% | 4.9180% | 5.1724% |

(IED stacking formula: `1 − Π(1 − IEDᵢ)`. The hyper stat contributes a flat 3 percentage
points of *nominal* IED per level; the table above is StrategyWiki's derived marginal.)

##### Damage % (applies to all monsters) — flat +3%/level

| Lv | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Total % | 3 | 6 | 9 | 12 | 15 | 18 | 21 | 24 | 27 | 30 | 33 | 36 | 39 | 42 | **45** |

##### Damage to Boss Monsters — **tiered**: +3%/lv for 1-5, +4%/lv for 6-15

| Lv | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Total % | 3 | 6 | 9 | 12 | 15 | 19 | 23 | 27 | 31 | 35 | 39 | 43 | 47 | 51 | **55** |

##### Damage to Normal Monsters — identical curve to Boss Damage

| Lv | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Total % | 3 | 6 | 9 | 12 | 15 | 19 | 23 | 27 | 31 | 35 | 39 | 43 | 47 | 51 | **55** |

##### Abnormal Status Resistance — **tiered**: +1/lv for 1-5, +2/lv for 6-15 (flat points, not %)

| Lv | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Total | 1 | 2 | 3 | 4 | 5 | 7 | 9 | 11 | 13 | 15 | 17 | 19 | 21 | 23 | **25** |

##### Weapon and Magic ATT — flat +3/level. **Is affected by %ATT increases.**

| Lv | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Total | 3 | 6 | 9 | 12 | 15 | 18 | 21 | 24 | 27 | 30 | 33 | 36 | 39 | 42 | **45** |

##### Bonus EXP — **tiered**: +0.5%/lv for 1-10, +1%/lv for 11-15

| Lv | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Total % | 0.5 | 1 | 1.5 | 2 | 2.5 | 3 | 3.5 | 4 | 4.5 | 5 | 6 | 7 | 8 | 9 | **10** |

##### Arcane Force — **tiered**: +5/lv for 1-10, +10/lv for 11-15. Requires 5th job + an Arcane Symbol.

| Lv | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Total | 5 | 10 | 15 | 20 | 25 | 30 | 35 | 40 | 45 | 50 | 60 | 70 | 80 | 90 | **100** |

**Source for all of §1.4:** <https://strategywiki.org/wiki/MapleStory/Hyper_Stats>
(per-stat level-by-level tables).
**Independently corroborated** by the KMS simulator's `increasedStat` formulas in
<https://mystrange01.github.io/hyperCalc/main.js>, which encode exactly the same curves:
`i∈[0,3] → v*30` (main stats); `i∈[4,5] → v*2` (HP/MP %); `i=6 → v*10` capped at 10 (DF/TF);
`i=7 → v≤5 ? v : (v−5)*2+5` (crit rate); `i=8 → v` (crit damage); `i=9,10,14 → v*3`
(IED, damage, ATT); `i∈[11,12] → v≤5 ? v*3 : (v−5)*4+15` (boss/normal damage);
`i=13 → v≤5 ? v : (v−5)*2+5` (status resistance);
`i=15 → v≤10 ? v*0.5 : (v−10)+5` (EXP); `i=16 → v≤10 ? v*5 : (v−10)*10+50` (Arcane Force).

#### 1.5 Quick reference — maxed totals

| Hyper stat | Max level | Value at max | Cost at max |
|---|---|---|---|
| STR / DEX / INT / LUK (each) | 15 | +450 final stat | 550 |
| Max HP % / Max MP % (each) | 15 | +30% | 550 |
| Max DF/TF | **10** | +100 | 150 |
| Critical Rate | 15 | +25% | 550 |
| Critical Damage | 15 | +15% | 550 |
| Ignore Enemy DEF | 15 | +45% | 550 |
| Damage | 15 | +45% | 550 |
| Damage to Boss Monsters | 15 | +55% | 550 |
| Damage to Normal Monsters | 15 | +55% | 550 |
| Abnormal Status Resistance | 15 | +25 | 550 |
| Weapon & Magic ATT | 15 | +45 | 550 |
| Bonus EXP | 15 | +10% | 550 |
| Arcane Force | 15 | +100 | 550 |

#### 1.6 Things that are NOT hyper stats (common errors to avoid)

- **Knockback Resistance / Stance** — <https://gameslikefinder.com/article/maplestory-hyper-stats-guide/>
  lists a "Knockback Resistance +2%/lv, max 20%" hyper stat. **This does not appear in
  StrategyWiki's 17-stat list, nor in the KMS simulator's 17-input list.** Older
  pre-rework MapleStory did have a Stance hyper stat; it was removed.
  **Treat "Knockback Resistance hyper stat" as UNVERIFIED / most likely stale.**
- **Speed, Jump, Elemental Resistance, All Stat, Damage Absorption** — these existed in the
  *original* (pre-2016) hyper stat list. <https://ayumilove.net/maplestory-hyper-stats-guide/>
  still shows this old list (max level 10, "Demon Force +10/lv", Stance, Speed, Jump,
  Elemental Resistance). **That page is stale — do not use it.**
- **Sacred / Authentic Force** — no hyper stat exists for it (see §3).

---

### 2. Legion / Maple Union

> Researched independently; every table below carries its own source URL.

**Compiled:** 2026-09-06
**Target service:** GMS (Global MapleStory), current live version as of Sept 2026 (post-**v.269 Ride the Lightning**, June 17 2026 / **v.270**, July 22 2026)

> **READ THIS FIRST — the system is mid-transition.**
> GMS today still runs the **classic Tetris/grid Legion board**. KMS replaced the grid entirely with a **point-allocation system** in the **Overdrive** update (KMS v.1.2.416, 2026-07-04). GMS is scheduled to receive the same revamp in **late November / December 2026**. A calculator built now should model the **grid**, but be structured so the **points** model can be swapped in. Section 7 documents the new system.
> Sources: [maplestorywiki.net/w/Legion_System](https://maplestorywiki.net/w/Legion_System) · [maplestorywiki.net/w/MapleStory:_Overdrive](https://maplestorywiki.net/w/MapleStory:_Overdrive) · [orangemushroom.net KMS v.1.2.416](https://orangemushroom.net/2026/07/04/kms-ver-1-2-416-maplestory-overdrive-ruler-of-covenants-lethe/) · [mmoexp GMS Aug–Nov 2026 roadmap](https://www.mmoexp.com/News/maplestory-gms-update-roadmap-august-november-2026-events-qol-new-class-endgame-overhauls.html)

---

#### 0. Naming — regional terminology map

The same system has three names in the wild. A calculator should normalize.

| GMS term | KMS/MSEA/StrategyWiki term | Notes |
|---|---|---|
| Legion System | Maple Union / 메이플 유니온 | Same system |
| Synergy Grid / Legion Board | Union Board | The Tetris grid |
| Legion Level | Union Level / 누적 레벨 (cumulative level) | Sum of top 42 characters' levels |
| Legion Rank | Union Rank / 유니온 등급 | 25 tiers |
| Legion Member / Attacker | 공격대원 (raid member) | Character placed on the board |
| Legion Coin | Union Coin / 유니온 코인 | |
| Nameless / Renowned / Heroic / Legendary / Supreme Legion | Novice / Veteran / Master / Grand Master / Supreme Union | **Direct 1:1 mapping, same thresholds** |

GMS tier names sourced from [maplestorywiki.net/w/Legion_System](https://maplestorywiki.net/w/Legion_System) (which uses GMS localization); KMS names from [maplestory.nexon.com official union guide](https://maplestory.nexon.com/Guide/N23GameInformation/Articles/407) and [strategywiki.org/wiki/MapleStory/Maple_Union](https://strategywiki.org/wiki/MapleStory/Maple_Union).

---

#### 1. Character Ranks and Grid Area per Rank

##### 1.1 Rank thresholds

| Rank | Level (all classes except Zero) | Level (Zero) | Grid squares occupied | Legion Points (Overdrive) |
|---|---|---|---|---|
| **B** | 60–99 | 130–159 | **1** | 1 |
| **A** | 100–139 | 160–179 | **2** | 2 |
| **S** | 140–199 | 180–199 | **3** | 3 |
| **SS** | 200–249 | 200–249 | **4** | 4 |
| **SSS** | 250+ | 250+ | **5** | 5 |

Sources: [maplestorywiki.net/w/Legion_System](https://maplestorywiki.net/w/Legion_System) · [strategywiki.org/wiki/MapleStory/Maple_Union](https://strategywiki.org/wiki/MapleStory/Maple_Union) · [maplestory.nexon.com union guide](https://maplestory.nexon.com/Guide/N23GameInformation/Articles/407) ("캐릭터가 60/100/140/200/250레벨을 달성할 때 마다 캐릭터카드는 B/A/S/SS/SSS 등급으로 상승 (제로의 경우 130/160/180/200/250레벨)")

There are **no ranks above SSS**. SSS caps at level 250 and does not improve further (levels 251–300 add nothing to the piece, only to Legion Level and Raid Power).

##### 1.2 Piece shapes by rank and class branch

Pieces may be rotated and mirrored. Pieces must interconnect, and the placed mass must touch one of the **4 centre squares**. Pieces may overlap, but **overlapping layers count as 1 square** for stat purposes.
Source: [strategywiki.org/wiki/MapleStory/Maple_Union](https://strategywiki.org/wiki/MapleStory/Maple_Union); geometry cross-verified against the open-source solver [github.com/Xenogents/LegionSolver — src/pieces.js](https://github.com/Xenogents/LegionSolver/blob/master/src/pieces.js).

```
                B(1)   A(2)     S(3)       SS(4)        SSS(5)
Warrior          X     XX       XX         XX           XXX
                                X          XX            XX

Magician         X     XX       XXX        XXX           .X.
                                            .X.          XXX
                                                         .X.

Bowman           X     XX       XXX        XXXX          XXXXX

Thief            X     XX       XXX        XXX           ..X
(not Xenon)                                 ..X          XXX
                                                         ..X

Pirate           X     XX       XX         .X            .X
(not Xenon)                     X.         XX            .X
                                           X.            XX
                                                         X.

Xenon            X     XX       XXX        XXX           X..
                                            .X.          XXX
                                                         .X.
```

Practical consequence for a calculator: **Bowman SSS (1×5 straight) is the most flexible for reaching outer areas**; Magician SSS (plus/cross) is the least efficient at travelling outward. This is why board solvers exist.

##### 1.3 Event / bonus blocks (do not consume attacker slots)

A player may place **up to 2 unique Event Exclusive Legion Blocks**, and they **do not consume attacker slots**.
Source: [maplestorywiki.net/w/Legion_System](https://maplestorywiki.net/w/Legion_System)

| Block | Region | Rank(s) | Effect |
|---|---|---|---|
| Lab Server Legion Block | TMS, **GMS** | B–SSS | ATT & MATT +5/10/15/20/25 |
| Enhanced Lab Server Legion Block | TMS, **GMS** | B–SSS | ATT & MATT +7/14/21/28/35 |
| Abyssal Expedition Legion Block | JMS, CMS, **GMS**, MSEA, TMS | SSS (5 sq) | ATT & MATT **+35** |
| Abyssal Expedition Legion Block (CMS Minar/El Nath variant) | CMS | SS (4 sq) | ATT & MATT +16 |
| Ride or Die Legion Block (S1 / S2 / S3+) | **GMS only** | SSS (5 sq) | ATT & MATT **+35** |
| MapleStory M Legion Block | **KMS only** | always SS (4 sq) | ATT & MATT +20 |

Note: the KMS official guide now states the MapleStory M block ranks B/A/S/SS/SSS at MSM levels **30/50/70/120/250** giving **ATT/MATT +5/10/15/20/25**, which **disagrees** with the wiki's "always SS, +20". Both cited: [maplestory.nexon.com guide](https://maplestory.nexon.com/Guide/N23GameInformation/Articles/407) vs [maplestorywiki.net/w/Legion_System](https://maplestorywiki.net/w/Legion_System). KMS-only, so irrelevant to a GMS calculator.

Ride or Die block acquisition: "For Season 1, this is obtainable by defeating 3 Ride or Die Event bosses per week for at least 10 weeks... For Seasons 2 and later, this is obtainable by participating for 6 weeks throughout the event." — [maplestorywiki.net/w/Legion_System](https://maplestorywiki.net/w/Legion_System)

---

#### 2. Board Size, Total Squares, and How Size Unlocks

The board is **centred**: larger boards expand outward around the same 4 centre squares. The **Inner Grid is 12×10 = 120 squares** and is granted in full immediately on founding a Legion. The **Outer Grid** unlocks by Legion Rank.

| Board size (W×H) | Total squares | Inner squares | Outer squares | **Outer squares per stat area** | Rank required | Legion Level required |
|---|---|---|---|---|---|---|
| 12 × 10 | 120 | 120 | 0 | **0** | Nameless Legion I | 500 |
| 14 × 12 | 168 | 120 | 48 | **6** | Nameless Legion IV | 2,000 |
| 16 × 14 | 224 | 120 | 104 | **13** | Renowned Legion I | 3,000 |
| 18 × 16 | 288 | 120 | 168 | **21** | Renowned Legion III | 4,000 |
| 20 × 18 | 360 | 120 | 240 | **30** | Renowned Legion V | 5,000 |
| **22 × 20** | **440** | 120 | 320 | **40 (cap)** | **Heroic Legion II** | **6,000** |

Sources: [maplestorywiki.net/w/Legion_System](https://maplestorywiki.net/w/Legion_System) (Synergy Grid Size table, gives the per-stat outer counts 0/6/13/21/30/40) · [strategywiki.org/wiki/MapleStory/Maple_Union](https://strategywiki.org/wiki/MapleStory/Maple_Union) (board size vs rank).

**Arithmetic check (self-consistent):** the board has 16 stat regions — 8 inner @ 15 squares and 8 outer @ 40 squares. 8×15 + 8×40 = 120 + 320 = **440 = 22×20**. The solver source confirms the geometry: a 20-row × 22-column array with 16 `legionGroups`, the first 8 summing to 40 cells each and the last 8 to 15 cells each — [github.com/Xenogents/LegionSolver — src/board.js `setLegionGroups()`](https://github.com/Xenogents/LegionSolver/blob/master/src/board.js).

**Board size stops growing at Legion Level 6,000.** Everything past 6,000 buys more *attackers* (i.e. more squares of coverage), not more board.

##### 2.1 Maximum achievable coverage — the real constraint

The board has 440 squares but **you can never cover all of them**:

| Source of squares | Max count | Squares each | Total |
|---|---|---|---|
| Legion attackers at Supreme Legion V | 45 | 5 (all SSS) | **225** |
| Event Legion Blocks (GMS: e.g. Ride or Die + Abyssal Expedition) | 2 | 5 (SSS) | **10** |
| **GMS theoretical maximum coverage** | | | **235 / 440** |

(KMS additionally has the MapleStory M block, +4 → 239.)

Derived from the 45-member cap ([maplestorywiki.net/w/Legion_System](https://maplestorywiki.net/w/Legion_System)), the SSS = 5 squares rule, and the "up to 2 event blocks, no attacker slot cost" rule (same source). **This is a derived figure, not a directly quoted one** — treat as computed, not cited.

**Connectivity tax:** pieces must chain back to the centre, so reaching outer regions costs squares spent traversing the inner grid. A commonly cited community figure: **132 squares total are needed to max Boss Damage, Critical Damage and IED simultaneously** (120 outer + ~12 inner path squares) — [forums.maplestory.nexon.net/discussion/18849](https://forums.maplestory.nexon.net/discussion/18849). Treat this as a community estimate; exact minimum depends on piece shapes available.

---

#### 3. Legion Ranks — thresholds and what each grants

**There are 25 ranks: 5 tiers × 5 sub-ranks.**

Legion Level = **sum of the levels of the highest-level 42 eligible characters in that world**.

| GMS Rank | KMS/MSEA Rank | Legion Level required | Legion Members (attackers) | Board size unlocked | Outer cap/stat |
|---|---|---|---|---|---|
| Nameless Legion I | Novice Union 1 | 500 | 9 | 12×10 | 0 |
| Nameless Legion II | Novice Union 2 | 1,000 | 10 | — | 0 |
| Nameless Legion III | Novice Union 3 | 1,500 | 11 | — | 0 |
| Nameless Legion IV | Novice Union 4 | 2,000 | 12 | 14×12 | 6 |
| Nameless Legion V | Novice Union 5 | 2,500 | 13 | — | 6 |
| Renowned Legion I | Veteran Union 1 | 3,000 | 18 | 16×14 | 13 |
| Renowned Legion II | Veteran Union 2 | 3,500 | 19 | — | 13 |
| Renowned Legion III | Veteran Union 3 | 4,000 | 20 | 18×16 | 21 |
| Renowned Legion IV | Veteran Union 4 | 4,500 | 21 | — | 21 |
| Renowned Legion V | Veteran Union 5 | 5,000 | 22 | 20×18 | 30 |
| Heroic Legion I | Master Union 1 | 5,500 | 27 | — | 30 |
| **Heroic Legion II** | Master Union 2 | **6,000** | 28 | **22×20 (max)** | **40 (max)** |
| Heroic Legion III | Master Union 3 | 6,500 | 29 | — | 40 |
| Heroic Legion IV | Master Union 4 | 7,000 | 30 | — | 40 |
| Heroic Legion V | Master Union 5 | 7,500 | 31 | — | 40 |
| Legendary Legion I | Grand Master Union 1 | 8,000 | 36 | — | 40 |
| Legendary Legion II | Grand Master Union 2 | 8,500 | 37 | — | 40 |
| Legendary Legion III | Grand Master Union 3 | 9,000 | 38 | — | 40 |
| Legendary Legion IV | Grand Master Union 4 | 9,500 | 39 | — | 40 |
| Legendary Legion V | Grand Master Union 5 | 10,000 | 40 | — | 40 |
| Supreme Legion I | Supreme Union 1 | 10,500 | 41 | — | 40 |
| Supreme Legion II | Supreme Union 2 | 11,000 | 42 | — | 40 |
| Supreme Legion III | Supreme Union 3 | 11,500 | 43 | — | 40 |
| Supreme Legion IV | Supreme Union 4 | 12,000 | 44 | — | 40 |
| **Supreme Legion V** | Supreme Union 5 | **12,500** | **45 (cap)** | — | 40 |

Sources: [maplestorywiki.net/w/Legion_System](https://maplestorywiki.net/w/Legion_System) (GMS names + Lv req + member count) · [maplestory.nexon.com official union guide](https://maplestory.nexon.com/Guide/N23GameInformation/Articles/407) (KMS table: 슈프림 12500→45 … 노비스 500→9, identical) · [strategywiki.org/wiki/MapleStory/Maple_Union](https://strategywiki.org/wiki/MapleStory/Maple_Union).

##### 3.1 IMPORTANT: Legion Ranks do NOT grant direct stat bonuses

This is a common misconception. A Legion Rank grants exactly three things:

1. **More attackers** (9 → 45)
2. **Larger board** (up to Heroic II / 6,000)
3. **Higher unclaimed Legion Coin cap**

All stats come from (a) member effects and (b) board area covered. There is no per-rank "+X% damage".

##### 3.2 Rank-up cost — CHANGED, sources disagree

- **Current (post-Crown / GMS "Ride The Lightning", Dec 2025 KMS / June 2026 GMS):** rank-ups are **FREE**. "Previously, Legion rank upgrades required a certain number of Legion Coins per rank. In the Crown Update, this requirement was removed." — [maplestorywiki.net/w/Legion_System](https://maplestorywiki.net/w/Legion_System). Corroborated by [maplestorywiki.net/w/MapleStory:_Crown](https://maplestorywiki.net/w/MapleStory:_Crown): "Legion System improvements, where the rank can be raised at no cost when the corresponding legion level for the rank is reached, including increases via World Leaped characters."
- **Legacy (pre-Crown) coin costs**, still listed on StrategyWiki and therefore **stale** — [strategywiki.org/wiki/MapleStory/Maple_Union](https://strategywiki.org/wiki/MapleStory/Maple_Union): cumulative 120 / 260 / 410 / 570 / 740 / 1,170 / 1,620 / 2,090 / 2,580 / 3,090 / 4,020 / 4,980 / 5,980 / 7,010 / 8,070 / 10,270 / 12,570 / 14,920 / 17,320 / 20,320 / 23,720 / 27,620 / 32,020 / **37,020 total to Supreme 5**.

**⚠ DISAGREEMENT FLAGGED.** Model rank-ups as free for GMS 2026; keep the coin table only for historical/legacy worlds.

##### 3.3 Which characters count toward Legion Level

Excluded from the level sum ([strategywiki.org/wiki/MapleStory/Maple_Union](https://strategywiki.org/wiki/MapleStory/Maple_Union)):
- Non-Zero characters level 59 or below
- Zero characters level 129 or below
- **Duplicate Zeros** — only the highest-level Zero counts toward the sum (duplicates level 130+ can still be *used* as attackers). Confirmed by KMS official guide: "제로 캐릭터를 여러 개 보유하고 있을 경우 최고 레벨 1개만 누적레벨에 합산"
- Permanent beginners (Beginner / Noblesse / Citizen / Legend) — cannot be attackers, don't count
- Any character outside the top 42 eligible by level (**they can still be placed as attackers**, they just don't add to the sum). Confirmed: "보유 캐릭터가 42개 이상인 경우 높은 레벨 순으로 42개의 캐릭터만 누적 레벨에 포함" — [maplestory.nexon.com](https://maplestory.nexon.com/Guide/N23GameInformation/Articles/407)

**Founding requirements:** a Level 200+ character with 5th Job Advancement, **OR** total level 500+ across the world with all contributing characters at Level 60+ / 2nd Job. — [maplestorywiki.net/w/Legion_System](https://maplestorywiki.net/w/Legion_System). StrategyWiki words it as 500 level sum with ≥3 characters, or 200 if a 5th-job character exists — [strategywiki.org](https://strategywiki.org/wiki/MapleStory/Maple_Union). *(Minor wording disagreement; functionally the same gate.)*

##### 3.4 Legion Level cap

- **Character level cap is 300** — raised from 275 in the *Neo: Darkness Ascending* update ([mmos.com](https://mmos.com/news/maplestory-launches-neo-darkness-ascending-part-one-update-increases-max-lvl-to-300)); still 300 in 2026 ([en.namu.wiki MapleStory/Level](https://en.namu.wiki/w/%EB%A9%94%EC%9D%B4%ED%94%8C%EC%8A%A4%ED%86%A0%EB%A6%AC/%EB%A0%88%EB%B2%A8)).
- **Therefore max theoretical Legion Level = 42 × 300 = 12,600.** (Derived.)
- **Rank caps out at 12,500**, so the last 100 levels buy nothing but Raid Power. StrategyWiki notes the exact minimum roster for Supreme Union 5: "26 Level 298 characters + 16 Level 297 characters (with up to 1 Zero)" — [strategywiki.org](https://strategywiki.org/wiki/MapleStory/Maple_Union).
- **8,000 Legion** is the widely-used practical target: it is Legendary Legion I (36 members) and is the hard gate for the **Legion Champion** system.
- **10,000 Legion** grants a permanent cosmetic: Dragon Lord Mount + King of Legion Chair, once per world — [maplestorywiki.net/w/Legion_System](https://maplestorywiki.net/w/Legion_System).

---

#### 4. Legion Member Effects — full class table (GMS 2026)

Rules a calculator must implement:
- **Each job's effect applies only ONCE.** Placing two Bishops gives one Bishop effect (the higher rank). — [strategywiki.org](https://strategywiki.org/wiki/MapleStory/Maple_Union); KMS: "동일 직업이 2개 이상 공격대에 등록되어 있을 경우 1개의 공격대원 효과만 적용" — [maplestory.nexon.com](https://maplestory.nexon.com/Guide/N23GameInformation/Articles/407)
- Different jobs granting the **same** stat **do stack** (e.g. Hero + Paladin + Kaiser all give Final STR).
- **STR/DEX/INT/LUK from member effects are FINAL stat** — *not* multiplied by % stat bonuses. "The stat bonuses (STR, DEX, INT, and LUK) are final stat bonuses and are therefore not affected by % stat bonuses." — [maplestorywiki.net/w/Legion_System](https://maplestorywiki.net/w/Legion_System). (Contrast with the **board/grid** stats in §5, which *are* affected by % stat.)
- Effects apply **account-wide within that world**, to every character, but **only while that character is placed on the board** (this changes in Overdrive — see §7).

##### 4.1 Explorers

| Job | Class | Effect | B | A | S | SS | SSS |
|---|---|---|---|---|---|---|---|
| Hero | Warrior | Final STR | +10 | +20 | +40 | +80 | +100 |
| Paladin | Warrior | Final STR | +10 | +20 | +40 | +80 | +100 |
| Dark Knight | Warrior | Max HP % | +2% | +3% | +4% | +5% | +6% |
| Arch Mage (Fire, Poison) | Magician | Max MP % | +2% | +3% | +4% | +5% | +6% |
| Arch Mage (Ice, Lightning) | Magician | Final INT | +10 | +20 | +40 | +80 | +100 |
| Bishop | Magician | Final INT | +10 | +20 | +40 | +80 | +100 |
| Bow Master | Bowman | Final DEX | +10 | +20 | +40 | +80 | +100 |
| Marksman | Bowman | **Critical Rate** | +1% | +2% | +3% | +4% | +5% |
| Pathfinder | Bowman | Final DEX | +10 | +20 | +40 | +80 | +100 |
| Night Lord | Thief | **Critical Rate** | +1% | +2% | +3% | +4% | +5% |
| Shadower | Thief | Final LUK | +10 | +20 | +40 | +80 | +100 |
| Dual Blade | Thief | Final LUK | +10 | +20 | +40 | +80 | +100 |
| Buccaneer | Pirate | Final STR | +10 | +20 | +40 | +80 | +100 |
| Corsair | Pirate | Summon Duration | +4% | +6% | +8% | +10% | +12% |
| Cannoneer | Pirate | Final STR | +10 | +20 | +40 | +80 | +100 |

##### 4.2 Cygnus Knights

| Job | Class | Effect | B | A | S | SS | SSS |
|---|---|---|---|---|---|---|---|
| Dawn Warrior | Warrior | **Flat** Max HP | +250 | +500 | +1,000 | +2,000 | +2,500 |
| Mihile | Warrior | **Flat** Max HP | +250 | +500 | +1,000 | +2,000 | +2,500 |
| Blaze Wizard | Magician | Final INT | +10 | +20 | +40 | +80 | +100 |
| Wind Archer | Bowman | Final DEX | +10 | +20 | +40 | +80 | +100 |
| Night Walker | Thief | Final LUK | +10 | +20 | +40 | +80 | +100 |
| Thunder Breaker | Pirate | Final STR | +10 | +20 | +40 | +80 | +100 |

##### 4.3 Heroes

| Job | Class | Effect | B | A | S | SS | SSS |
|---|---|---|---|---|---|---|---|
| Aran | Warrior | 70% chance to recover % Max HP on attack | 2% | 4% | 6% | 8% | 10% |
| Evan | Magician | 70% chance to recover % Max MP on attack | 2% | 4% | 6% | 8% | 10% |
| Luminous | Magician | Final INT | +10 | +20 | +40 | +80 | +100 |
| Mercedes | Bowman | **Skill Cooldown reduction** | −2% | −3% | −4% | −5% | −6% |
| Phantom | Thief | Mesos Obtained | +1% | +2% | +3% | +4% | +5% |
| Shade (Eunwol) | Pirate | **Critical Damage** | +1% | +2% | +3% | **+5%** | +6% |

Mercedes footnote: cooldown reduction "Takes priority over equipment potential, and cooldown cannot be lower than 1 second. Does not apply to certain skills." — [maplestorywiki.net/w/Legion_System](https://maplestorywiki.net/w/Legion_System). StrategyWiki adds it is "applied before Potential cooldown reductions… additive with Cooldown Cutter Hypers."

##### 4.4 Resistance / Demon

| Job | Class | Effect | B | A | S | SS | SSS |
|---|---|---|---|---|---|---|---|
| Blaster | Warrior | **Ignored Enemy Defense** | +1% | +2% | +3% | **+5%** | +6% |
| Battle Mage | Magician | Final INT | +10 | +20 | +40 | +80 | +100 |
| Wild Hunter | Bowman | 20% chance on attack to deal +X% damage | 4% | 8% | 12% | 16% | 20% |
| Mechanic | Pirate | **Buff Duration** | +5% | +10% | +15% | +20% | +25% |
| Xenon | Thief/Pirate hybrid | Final STR **and** DEX **and** LUK | +5 | +10 | +20 | +40 | +50 |
| Demon Slayer | Warrior | Abnormal Status Resistance | +1 | +2 | +3 | +4 | +5 |
| Demon Avenger | Warrior | **Boss Damage** | +1% | +2% | +3% | **+5%** | +6% |

##### 4.5 Nova

| Job | Class | Effect | B | A | S | SS | SSS |
|---|---|---|---|---|---|---|---|
| Kaiser | Warrior | Final STR | +10 | +20 | +40 | +80 | +100 |
| Kain | Bowman | Final DEX | +10 | +20 | +40 | +80 | +100 |
| Cadena | Thief | Final LUK | +10 | +20 | +40 | +80 | +100 |
| Angelic Buster | Pirate | Final DEX | +10 | +20 | +40 | +80 | +100 |

##### 4.6 Transcendent / Friends World / Flora / Anima / Sengoku / Jianghu / Shine

| Job | Faction | Class | Effect | B | A | S | SS | SSS |
|---|---|---|---|---|---|---|---|---|
| Zero | Transcendent | Warrior | **EXP Obtained** | +4% | +6% | +8% | +10% | +12% |
| Kinesis | Friends World | Magician | Final INT | +10 | +20 | +40 | +80 | +100 |
| Adele | Flora | Warrior | Final STR | +10 | +20 | +40 | +80 | +100 |
| Illium | Flora | Magician | Final INT | +10 | +20 | +40 | +80 | +100 |
| Khali | Flora | Thief | Final LUK | +10 | +20 | +40 | +80 | +100 |
| Ark | Flora | Pirate | Final STR | +10 | +20 | +40 | +80 | +100 |
| Lara | Anima | Magician | Final INT | +10 | +20 | +40 | +80 | +100 |
| Hoyoung | Anima | Thief | Final LUK | +10 | +20 | +40 | +80 | +100 |
| **Ren** | Anima | Warrior | Movement Speed (& Max Move Speed) | +2% | +4% | +6% | +8% | +10% |
| Hayato | Sengoku | Warrior | **Critical Damage** | +1% | +2% | +3% | **+5%** | +6% |
| Kanna | Sengoku | Magician | **Boss Damage** | +1% | +2% | +3% | **+5%** | +6% |
| **Lynn** | Jianghu | Magician | **Ignored Enemy Defense** | +1% | +2% | +3% | **+5%** | +6% |
| **Mo Xuan** | Jianghu | Pirate | **Critical Damage** | +1% | +2% | +3% | **+5%** | +6% |
| **Sia Astelle** | Shine | Magician | **Abnormal Status Damage** | +1% | +2% | +3% | **+5%** | +6% |
| **Erel Light** | Shine | Warrior | **Boss Damage** | +1% | +2% | +3% | **+5%** | +6% |

##### 4.7 KMS-only (NOT in GMS as of Sept 2026)

| Job | Faction | Class | Effect | B | A | S | SS | SSS |
|---|---|---|---|---|---|---|---|---|
| **Lethe** | Demon | Magician | **All Stats** | +10 | +20 | +30 | +40 | +50 |
| | | | **and Max HP** | +500 | +1,000 | +1,500 | +2,000 | +2,500 |

Lethe released in KMS with Overdrive (v.1.2.416, 2026-07-04). Region availability confirmed **KMS: Available; JMS/CMS/GMS/MSEA/TMS: Unavailable** — [maplestorywiki.net/w/Lethe](https://maplestorywiki.net/w/Lethe).

##### 4.8 Sources & availability verification for §4

- Master table: [maplestorywiki.net/w/Legion_System](https://maplestorywiki.net/w/Legion_System) (Legion Member Effects section, per-faction)
- Cross-check: [strategywiki.org/wiki/MapleStory/Maple_Union](https://strategywiki.org/wiki/MapleStory/Maple_Union) (Bonus Stats table) — agrees on every shared row
- KMS official: [maplestory.nexon.com/Guide/N23GameInformation/Articles/407](https://maplestory.nexon.com/Guide/N23GameInformation/Articles/407) — agrees on every shared row
- Erel Light confirmed by **official GMS patch notes**, v.269 Ride the Lightning: "Legion Bonus — Boss Damage (+1% / +2% / +3% / +5% / +6%)" — [nexon.com/maplestory/news/update/41138](https://www.nexon.com/maplestory/news/update/41138/updated-6-16-v-269-ride-the-lightning-patch-notes)
- Sia Astelle confirmed by two sources: [maplestorywiki.net/w/Sia_Astelle](https://maplestorywiki.net/w/Sia_Astelle) ("Legion member effect: Abnormal Status Damage: +1/2/3/5/6%") and [grandislibrary.com/shine/sia-astelle](https://www.grandislibrary.com/shine/sia-astelle)
- Region availability verified per-class on maplestorywiki: **Mo Xuan** — KMS ✗, JMS ✗, CMS ✓, **GMS ✓**, MSEA ✓, TMS ✓ ([Mo_Xuan](https://maplestorywiki.net/w/Mo_Xuan)); **Lynn** — KMS ✗, all others ✓ incl. **GMS** ([Lynn](https://maplestorywiki.net/w/Lynn)); **Sia Astelle** — **GMS only** ([Sia_Astelle](https://maplestorywiki.net/w/Sia_Astelle)); **Erel Light** — **GMS only** ([Erel_Light](https://maplestorywiki.net/w/Erel_Light)); **Ren** — all servers ([Ren](https://maplestorywiki.net/w/Ren))

**⚠ DISAGREEMENT FLAGGED:** [strategywiki.org](https://strategywiki.org/wiki/MapleStory/Maple_Union) lists Mo Xuan as "only in CMS and TMS" and Lynn as "not in MSEA". Both are contradicted by maplestorywiki's per-class availability tables (above), which are more granular and more recently maintained. **Trust maplestorywiki: Mo Xuan and Lynn are both in GMS.**

##### 4.9 Retired classes — do NOT include

| Job | Status |
|---|---|
| **Beast Tamer** | Removed. Converted to **Lynn** in GMS on **May 1, 2024 (GMS v250)**. "Beast Tamer and Lynn have the same Link Skill and Legion effect" (i.e. IED). — [maplestorywiki.net/w/Beast_Tamer](https://maplestorywiki.net/w/Beast_Tamer), [maplestorywiki.net/w/Lynn](https://maplestorywiki.net/w/Lynn) |
| **Jett** | Removed. GMS/JMS ex-owners got "Trace of Jett", granting the Legion effect + maxed Link for 30 days. — [maplestorywiki.net/w/Jett](https://maplestorywiki.net/w/Jett) |
| **Zen** | TMS-only legacy class, long removed. |

**⚠ Older guides are stale here.** [ayumilove.net/maplestory-maple-union-guide/](https://ayumilove.net/maplestory-maple-union-guide/) still lists Beast Tamer, Jett and Zen and omits Lynn, Mo Xuan, Ren, Sia Astelle, Erel Light. Do not use it as a class source.

##### 4.10 Class count vs. slot count

Counting GMS-available jobs with Legion effects: 15 Explorer + 6 Cygnus + 6 Heroes + 7 Resistance/Demon + 4 Nova + Zero + Kinesis + 4 Flora + 3 Anima + 2 Sengoku + 2 Jianghu + 2 Shine = **53 unique jobs**. Max attacker slots = **45**. *(Derived count.)*

**Consequence:** even at Supreme Legion V you cannot place every job. A calculator should let the user select which 45 job effects to take, and should treat the 2 event blocks as free extra squares + free ATT/MATT.

---

#### 5. Board / Grid Stat Values

##### 5.1 Inner Grid (12×10 = 120 squares; 8 areas × 15 squares)

Positions of these 8 areas **can be rearranged** by the player.
**These stats ARE affected by % stat bonuses** (unlike member effects) — "These stat bonuses are not final stat bonuses, meaning that they are affected by % stat bonuses." — [maplestorywiki.net/w/Legion_System](https://maplestorywiki.net/w/Legion_System)

| Inner stat | Per square | Squares in area | **Max from area** |
|---|---|---|---|
| STR | +5 | 15 | **+75** |
| DEX | +5 | 15 | **+75** |
| INT | +5 | 15 | **+75** |
| LUK | +5 | 15 | **+75** |
| Max HP | +250 | 15 | **+3,750** |
| Max MP | +250 | 15 | **+3,750** |
| Weapon Attack (ATT) | +1 | 15 | **+15** |
| Magic Attack (MATT) | +1 | 15 | **+15** |

##### 5.2 Outer Grid (320 squares at full board; 8 areas × 40 squares)

Positions **cannot** be rearranged. Listed starting from top-left, clockwise ([strategywiki.org](https://strategywiki.org/wiki/MapleStory/Maple_Union)).

| # | Outer stat | Per square | Squares in area (max board) | **Max from area** |
|---|---|---|---|---|
| 1 | Abnormal Status Resistance | +1 | 40 | **+40** |
| 2 | Monster EXP | +0.25% | 40 | **+10%** |
| 3 | **Critical Rate** | +1% | 40 | **+40%** |
| 4 | **Boss Damage** | +1% | 40 | **+40%** |
| 5 | Damage Against Normal Monsters | +1% | 40 | **+40%** |
| 6 | Buff Duration | +1% | 40 | **+40%** |
| 7 | **Ignored Enemy Defense** | +1% | 40 | **+40%** |
| 8 | **Critical Damage** | +0.50% | 40 | **+20%** |

Sources: [maplestorywiki.net/w/Legion_System](https://maplestorywiki.net/w/Legion_System) and [strategywiki.org/wiki/MapleStory/Maple_Union](https://strategywiki.org/wiki/MapleStory/Maple_Union) — identical values in both.

**⚠ DISAGREEMENT FLAGGED:** [ayumilove.net](https://ayumilove.net/maplestory-maple-union-guide/) lists **"Stance +1%/square"** as one of the outer areas and does not list "Damage Against Normal Monsters". Both wikis list Normal Monster Damage and no Stance. **Treat AyumiLove as outdated; there is no Stance area on the current board.** AyumiLove also lists Status Resistance as "+1%" — it is a flat +1, not a percentage.

##### 5.3 Grid stat totals achievable at various fill levels

Per-square values are linear, so totals are simply `squares_in_area × per_square_value`, capped by the area size available at your board size.

**Outer-area cap by board size** (the per-area ceiling — you can never exceed this even with spare squares):

| Legion Level | Rank | Board | Crit Rate max | Boss Dmg max | IED max | Normal Mob Dmg max | Buff Dur max | Crit Dmg max | EXP max | Status Res max |
|---|---|---|---|---|---|---|---|---|---|---|
| 500–1,999 | Nameless I–III | 12×10 | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0 |
| 2,000–2,999 | Nameless IV–V | 14×12 | 6% | 6% | 6% | 6% | 6% | 3.0% | 1.5% | 6 |
| 3,000–3,999 | Renowned I–II | 16×14 | 13% | 13% | 13% | 13% | 13% | 6.5% | 3.25% | 13 |
| 4,000–4,999 | Renowned III–IV | 18×16 | 21% | 21% | 21% | 21% | 21% | 10.5% | 5.25% | 21 |
| 5,000–5,999 | Renowned V / Heroic I | 20×18 | 30% | 30% | 30% | 30% | 30% | 15.0% | 7.5% | 30 |
| **6,000+** | Heroic II and up | **22×20** | **40%** | **40%** | **40%** | **40%** | **40%** | **20.0%** | **10.0%** | **40** |

*(Derived by multiplying the per-square values in §5.2 by the outer-squares-per-area figures in §2, both of which are directly cited.)* A Korean community write-up corroborates the mid-tier checkpoints: "베테랑 3단계 수준만 되어도 점령 효과로 크리티컬 데미지를 최대 10.5%까지 확보가 가능하며, 마스터 2단계까지 가면 크리티컬 데미지를 최대 20%까지" — i.e. Renowned III (Veteran 3) → Crit Dmg 10.5%, Heroic II (Master 2) → Crit Dmg 20%. Matches the table exactly. Source: [namu.wiki 메이플 유니온](https://namu.wiki/w/%EB%A9%94%EC%9D%B4%ED%94%8C%20%EC%9C%A0%EB%8B%88%EC%98%A8) (via search snippet; direct fetch 403s).

**Board-coverage budget by rank** (how many squares you actually have to spend). *Derived* = `members × squares_per_piece`, + 10 for the two GMS event blocks (SSS).

| Rank | Members | All members SS (×4) | All members SSS (×5) | +2 event blocks (SSS) |
|---|---|---|---|---|
| Nameless V (2,500) | 13 | 52 | 65 | 75 |
| Renowned I (3,000) | 18 | 72 | 90 | 100 |
| Renowned V (5,000) | 22 | 88 | 110 | 120 |
| Heroic II (6,000) | 28 | 112 | 140 | 150 |
| Heroic V (7,500) | 31 | 124 | 155 | 165 |
| **Legendary I (8,000)** | **36** | **144** | **180** | **190** |
| Legendary V (10,000) | 40 | 160 | 200 | 210 |
| Supreme III (11,500) | 43 | 172 | 215 | 225 |
| **Supreme V (12,500)** | **45** | **180** | **225** | **235** |

StrategyWiki gives one anchor point in the same form: "assuming you have reached Grand Master Union 1 with at least 36 Level 200 characters, you will have 36 attackers, each attacker taking 4 grids, so total you will have 144 grids of stats." — [strategywiki.org](https://strategywiki.org/wiki/MapleStory/Maple_Union). Matches the Legendary I / SS row above.

**Reference endgame allocation (derived, GMS Supreme V, 235 squares):**
- Max Boss Damage (40) + Crit Damage (40) + IED (40) = 120 outer squares, plus ~12 squares of inner path = **~132 squares**
- Leaves **~103 squares** for the 120-square inner grid (STR/ATT/HP etc.)
- OR swap one outer for Crit Rate (40%) if under-capped on crit.

*Caveats:* this ignores piece-shape packing losses, which are real — that is exactly why board solvers exist. Use [xenogents.github.io/LegionSolver](https://xenogents.github.io/LegionSolver/) (source: [github.com/Xenogents/LegionSolver](https://github.com/Xenogents/LegionSolver)) or [github.com/aviv943/LegionSolver2](https://github.com/aviv943/LegionSolver2) / [github.com/arixpsy/MS-Legion-Solver](https://github.com/arixpsy/MS-Legion-Solver) for exact packing.

##### 5.4 Board presets

Presets 1–2 are free and permanent. Presets 3–5 need a **Union Preset Ticket** from the coin shop (**150 coins**, 30 days per use, stackable to 180 days of expiry). Applying a preset *overwrites* the board with the stored layout rather than swapping, so toggling between two layouts needs two presets. — [strategywiki.org](https://strategywiki.org/wiki/MapleStory/Maple_Union)
*(In Overdrive this becomes 10 named presets — see §7.)*

---

#### 6. Legion Raid Power and Legion Coin income

##### 6.1 Raid Power (Union Power) per attacker

`Union Power = LevelPower + CombatPowerContribution + 312,500`
— [strategywiki.org/wiki/MapleStory/Maple_Union](https://strategywiki.org/wiki/MapleStory/Maple_Union)

**Level Power** (note the deliberate dip at 100–139 — StrategyWiki flags it as intentional but unexplained):

| Attacker level | Level Power |
|---|---|
| 60–99 | 0.50 × Level³ |
| 100–139 | 0.40 × Level³ |
| 140–179 | 0.70 × Level³ |
| 180–199 | 0.80 × Level³ |
| 200–209 | 1.00 × Level³ |
| 210–219 | 1.10 × Level³ |
| 220–229 | 1.15 × Level³ |
| 230–239 | 1.20 × Level³ |
| 240–249 | 1.25 × Level³ |
| 250–259 | 1.30 × Level³ |
| 260–269 | 1.35 × Level³ |
| 270–279 | 1.40 × Level³ |
| 280–289 | 1.45 × Level³ |
| 290–299 | 1.50 × Level³ |
| 300+ | 1.55 × Level³ |

**Combat Power contribution** = `k × 750 × √(CombatPower + 30,000)`, where k is:

| Combat Power | k | Combat Power | k |
|---|---|---|---|
| 0–499,999 | 2.00 | 100,000,000–124,999,999 | 2.45 |
| 500,000–999,999 | 2.05 | 125,000,000–149,999,999 | 2.50 |
| 1,000,000–4,999,999 | 2.10 | 150,000,000–174,999,999 | 2.55 |
| 5,000,000–9,999,999 | 2.15 | 175,000,000–199,999,999 | 2.60 |
| 10,000,000–19,999,999 | 2.20 | 200,000,000–249,999,999 | 2.65 |
| 20,000,000–39,999,999 | 2.25 | 250,000,000–299,999,999 | 2.70 |
| 40,000,000–59,999,999 | 2.30 | 300,000,000–349,999,999 | 2.75 |
| 60,000,000–79,999,999 | 2.35 | 350,000,000–399,999,999 | 2.80 |
| 80,000,000–99,999,999 | 2.40 | 400,000,000–499,999,999 | 2.85 |
| | | 500,000,000+ | 2.90 |

Combat Power is **snapshotted at logout** and frozen until that character logs back in. — [strategywiki.org](https://strategywiki.org/wiki/MapleStory/Maple_Union)

##### 6.2 Legion Coin income rates

| Source | Rate |
|---|---|
| Damage-based accrual | **1 coin per 100,000,000,000 (100 billion) damage** dealt to the raid dragon |
| Equivalent passive rate | **1 coin per 1,251,251.26 Raid Power per 24h**, i.e. **1,000,000 Raid Power ≈ 0.7992 coins/day** |
| Rounding | Rounded down; partial damage resets at 12:00 AM |
| Daily quest | **2 quests: 10 + 20 coins** (kill monsters in the raid battlefield) |
| Weekly quest (Dame Appropriation) | **200 coins** for defeating 100 Dragon Whelps (any kind, excl. Golden Wyvern) + 20 Golden Wyverns |

Sources: [strategywiki.org/wiki/MapleStory/Maple_Union](https://strategywiki.org/wiki/MapleStory/Maple_Union) (damage rate, 1,251,251.26 figure, 10+20 daily quests) · [maplestorywiki.net/w/Legion_System](https://maplestorywiki.net/w/Legion_System) ("Currently, every 1 million Raid Power generates 0.7992 Coins after 24 hours"; weekly 200-coin quest).

**⚠ MINOR DISAGREEMENT:** StrategyWiki describes the coin quests as *daily* (10 + 20); maplestorywiki describes a *weekly* 200-coin quest. Both may be simultaneously true (separate quests), and the reset cadence changed: the **Assemble** update "unified weekly content reset on Thursdays, including… Legion coin shop" — [maplestorywiki.net/w/MapleStory:_Assemble](https://maplestorywiki.net/w/MapleStory:_Assemble). Verify in-game. Marked **PARTIALLY UNVERIFIED**.

##### 6.3 Unclaimed coin cap by tier

| Tier | Cap |
|---|---|
| Nameless Legion (Novice) | 200 |
| Renowned Legion (Veteran) | 300 |
| Heroic Legion (Master) | 500 |
| Legendary Legion (Grand Master) | 900 |
| **Supreme Legion** | **1,300** |

Coins accrue only up to the cap; excess is **forfeited**, with one in-game notification per login. Claim by pressing "Claim Coins", or by entering and exiting the Legion Raid map and speaking to the exit NPC. Coins are shared across the whole account **within that world**.
Sources: [maplestorywiki.net/w/Legion_System](https://maplestorywiki.net/w/Legion_System) · [strategywiki.org](https://strategywiki.org/wiki/MapleStory/Maple_Union) · [maplestory.nexon.com](https://maplestory.nexon.com/Guide/N23GameInformation/Articles/407) (등급별 누적 가능 코인수: 슈프림 1300 / 그랜드마스터 900 / 마스터 500 / 베테랑 300 / 노비스 200 — all three agree).

##### 6.4 Legion Coin Shop (weekly limits; reset Monday 12 AM per StrategyWiki, moved to Thursday by Assemble)

Progression-relevant items only:

| Item | Cost | Limit |
|---|---|---|
| Union's Strength Stage 1 / 2 / 3 (ATT & MATT +30 for 10/20/30 min) | 10 / 20 / 30 | 20 each |
| Union's EXP Stage 1 / 2 / 3 (2× EXP for 10/20/30 min) | 30 / 50 / 70 | 20 each |
| Union's Luck Stage 1 / 2 / 3 (Drop Rate +50%) | 30 / 50 / 70 | 20 each |
| Union's Wealth Stage 1 / 2 / 3 (Meso Drop +50%) | 30 / 50 / 70 | 20 each |
| Clean Slate Scroll 10% | 60 | 3 |
| Epic Potential Scroll 100% | 300 | 2 |
| Additional Potential Scroll 100% | 200 | 2 |
| Carved Golden Stamp | 40 | 3 |
| Karma Master Craftsman's Cube / Karma Yellow Cube | 100 | 30 per world |
| Crimson Resurrection Flame | 100 | 3 |
| Karma Crimson / Rainbow / Black Resurrection Flame | 50 / 150 / 250 | 20 / 20 / 40 per world |
| Basic / Intermediate / Advanced Union Meso Box | 30 / 50 / 70 | 50 / 30 / 20 |
| Basic / Intermediate / Advanced Union Growth Potion (49% EXP + 2× buff; Lv 100–129 / 130–159 / 160–179) | 75 / 110 / 150 | 5 each |
| Union Preset (unlocks 1 preset slot, 30 days) | 150 | 3 |
| Arcane Symbol Catalyst (non-Reboot) | 300 | 3 |
| Authentic Symbol Catalyst (non-Reboot) | 500 | 3 |

Source: [strategywiki.org/wiki/MapleStory/Maple_Union](https://strategywiki.org/wiki/MapleStory/Maple_Union)

**⚠ 2026 GMS CHANGE:** "Legion Shop 2x EXP coupons will be replaced with stronger **3x variants**" as part of the OVERDRIVE 2026 roadmap — [gamemarket.gg Ride the Lightning guide](https://gamemarket.gg/news/maplestory-global/ride-the-lightning-maplestory-overdrive-summer-2026-update-guide). **UNVERIFIED against official patch notes** — treat the 2× values above as possibly superseded.

---

#### 7. The Overdrive Legion Rework (KMS live July 2026 · GMS expected Nov/Dec 2026)

This is the single biggest 2025/2026 change and will invalidate the board model.

##### 7.1 What changes

| Old (current GMS) | New (Overdrive) |
|---|---|
| Tetris grid, pieces placed by shape | **Grid removed entirely.** Points allocated to stats freely |
| Member effect applies **only if placed** on the board | **Every character at Rank B or higher grants its effect, regardless of raid composition** |
| Legion Raid battle map you can enter and attack | **Raid battle map removed**; Raid Combat Power auto-calculated from your highest-Combat-Power characters |
| 5 presets (3 paid, 30-day) | **10 presets**, with naming |
| Legion Champion: 4 slots | **5th slot** unlocked (requires all Champions at Rank S+) |

Sources: [maplestorywiki.net/w/MapleStory:_Overdrive](https://maplestorywiki.net/w/MapleStory:_Overdrive) — "Legion Board changed to Legion Points, where players can distribute various Legion Stats based on the Character Rank"; "Removal of Legion Raid battle map, while Legion Raid Job effect changed to Legion Stat effect"; "Raid member effects now apply to any character with Character Rank B or higher"; "Legion Stat presets increased to 10, with new naming feature". Also [orangemushroom.net KMS v.1.2.416](https://orangemushroom.net/2026/07/04/kms-ver-1-2-416-maplestory-overdrive-ruler-of-covenants-lethe/) and [orangemushroom.net Summer 2026 Showcase](https://orangemushroom.net/2026/06/14/2026-maplestory-summer-showcase-overdrive/) ("Previously, you would only receive the attacker effects of characters placed on the board, but now you will receive all of their effects by default").

##### 7.2 Legion Points earned

Identical mapping to the old piece sizes:

| Character Rank | Level (Zero) | Legion / Union Points |
|---|---|---|
| B | 60 (130) | 1 |
| A | 100 (160) | 2 |
| S | 140 (180) | 3 |
| SS | 200 | 4 |
| SSS | 250 | 5 |

Source: [maplestory.nexon.com official guide](https://maplestory.nexon.com/Guide/N23GameInformation/Articles/407) · [maplestorywiki.net/w/Legion_System](https://maplestorywiki.net/w/Legion_System) · [orangemushroom.net v.1.2.416](https://orangemushroom.net/2026/07/04/kms-ver-1-2-416-maplestory-overdrive-ruler-of-covenants-lethe/)

**Max points = 45 members × 5 = 225** — exactly equal to the old max board coverage from attackers. *(Derived; strongly implies a 1 point = 1 square conversion.)*

##### 7.3 Union Stats: Base vs Expanded

**Base Stats** — available immediately, **max level 15 each**: STR, DEX, INT, LUK, Attack Power, Magic Attack, Max HP, Max MP.
**Expanded Stats** — unlock as Legion Level grows, **max level 40 each**: Critical Damage, Boss Damage, Ignored Enemy Defense, Critical Rate, Buff Duration, Normal Monster Damage, EXP Obtained, Abnormal Status Resistance.

Source (verbatim, KMS official): "기본 스탯은 유니온 시스템 오픈 시 즉시 획득할 수 있는 기본 버프 효과로 최대 15레벨까지 성장 가능… 확장 스탯은 유니온 성장에 따라 추가로 오픈되며 최대 40레벨까지 성장 가능" — [maplestory.nexon.com/Guide/N23GameInformation/Articles/407](https://maplestory.nexon.com/Guide/N23GameInformation/Articles/407)

**Expanded stat max level by Legion Level (NEW gating — differs from the old board!):**

| Legion Level | Union Rank | Expanded stat max level |
|---|---|---|
| < 2,000 | — | **0** |
| 2,000 | Novice 4 / Nameless IV | **5** |
| 3,000 | Veteran 1 / Renowned I | **10** |
| 4,000 | Veteran 3 / Renowned III | **20** |
| 5,000 | Veteran 5 / Renowned V | **30** |
| 6,000 | Master 2 / Heroic II | **40** |

Source: [maplestory.nexon.com](https://maplestory.nexon.com/Guide/N23GameInformation/Articles/407) (유니온 레벨별 확장 스탯 최대 레벨 table).

**⚠ Note the change:** old board outer caps were 0 / 6 / 13 / 21 / 30 / 40 at the same Legion Levels; the new point caps are **0 / 5 / 10 / 20 / 30 / 40**. Slightly stingier at 3,000–4,000.

##### 7.4 Per-point stat values — **UNVERIFIED (high-confidence inference)**

I could not find an official or wiki table of the per-level values in the new system (namu.wiki, the likely source, 403s on direct fetch). However:

- Base stat max level = **15** = old inner-area squares (15)
- Expanded stat max level = **40** = old outer-area squares (40)
- Max points (225) = old max attacker coverage (225)
- A Korean community source describes the endgame result as identical to the old board: "유니온 8000을 달성하면 크뎀 20%, 보공 40%, 방무 40%, 기타 스탯 및 공/마, 벞지, 크확 증가 효과를 받을 수 있습니다" (at Union 8,000: Crit Dmg 20%, Boss Dmg 40%, IED 40%) — [namu.wiki 메이플 유니온](https://namu.wiki/w/%EB%A9%94%EC%9D%B4%ED%94%8C%20%EC%9C%A0%EB%8B%88%EC%98%A8) (via search snippet). Crit Dmg 20% at level 40 ⇒ **0.5%/level**; Boss/IED 40% at level 40 ⇒ **1%/level**. Identical to §5.2.

**Conclusion (mark as inferred in the calculator):** per-point values are almost certainly unchanged from the per-square values in §5.1 and §5.2 — STR/DEX/INT/LUK +5, HP/MP +250, ATT/MATT +1 per base level; Crit Rate/Boss/Normal/Buff/IED +1%, Crit Dmg +0.5%, EXP +0.25%, Status Res +1 per expanded level. **Re-verify when GMS ships the update.**

##### 7.5 Practical impact for a gear-progression calculator

1. **The 235-square ceiling disappears as a *shape* problem** — it becomes a clean 225-point budget. No packing losses. Boards that lost squares to piece geometry will effectively gain stats.
2. **All member effects become free.** Under the current grid you must choose 45 of 53 jobs; after Overdrive every job you have at Rank B+ contributes. This is a meaningful, one-time account-wide damage bump. Model it.
3. **Legion Raid manual attacking disappears** as a coin source.

---

#### 8. Adjacent Legion subsystems (relevant to a progression calculator)

##### 8.1 Legion Champion (live in GMS)

Requires **a Level 260+ character and Legion Level 8,000+**. Up to 4 Champion slots (5 in KMS post-Overdrive, 6 designed). Removing a Champion costs **1 billion mesos** and resets that character's ranks. Cannot register two characters of the same job.

**Champion Insignia — permanent, stacks across Champions, applies to all registered Champions:**

| Champion Rank | How to reach it | Insignia stat granted |
|---|---|---|
| C | Automatic on registration | — |
| B | Solo **Hard Lotus** in Champion mode, ≤20 min | All Stats **+20**, Max HP/MP **+1,000** |
| A | Solo **Hard Verus Hilla**, ≤20 min | ATT / MATT **+10** |
| S | Solo **Hard Black Mage**, ≤45 min | **Boss Damage +5%** |
| SS | Solo **Hard Chosen Seren**, ≤20 min | **Critical Damage +3%** |
| SSS | Solo **Normal Kalos the Guardian**, ≤20 min | **Ignored Enemy Defense +5%** |

Slot unlocks: 3rd = all 2 Champions at A+; 4th = all 3 at A+; 5th = all 4 at S+; 6th = all 5 at SS+.
**Overdrive change:** all time limits standardized to 20 minutes, with a 30% final damage reduction buff applied (25% for Black Mage).

**Champion's Renown** (30-min skill, castable only by Champions, fueled by Champion Coins from monthly Champion Raid: Draco Isle; 4,000 coins to max everything; unused coins reset on the 1st of each month):

| Stat | Lv1 | Lv2 | Lv3 | Lv4 | Lv5 | Cost (cumulative per level) |
|---|---|---|---|---|---|---|
| All Stats / Max HP | +10/+500 | +20/+1,000 | +30/+1,500 | +40/+2,000 | +50/+2,500 | 50/125/200/300/500 |
| ATT / MATT | +5 | +10 | +15 | +20 | +25 | 50/125/200/300/500 |
| Boss Damage | +2% | +4% | +6% | +8% | +10% | 50/125/200/300/500 |
| Ignored Enemy Defense | +2% | +4% | +6% | +8% | +10% | 50/125/200/300/500 |
| Critical Damage | +0.50% | +1.00% | +1.50% | +2.00% | +2.50% | 50/125/200/300/500 |
| Additional EXP | +5% | +10% | +15% | +20% | +25% | 150/375/600/900/1,500 |

Source: [maplestorywiki.net/w/Legion_Champion](https://maplestorywiki.net/w/Legion_Champion). Available in all six services incl. GMS. Introduced in the NEXT / Stargazer update — [maplestorywiki.net/w/MapleStory:_NEXT](https://maplestorywiki.net/w/MapleStory:_NEXT) ("New Legion Champion system, requiring a Level 260+ character and 8,000+ total Legion Level to unlock").

##### 8.2 Legion Artifact (live in GMS)

Replaces Monster Life; introduced in the Dreamer / GO WEST! update. **3 Crystals by default, +1 at Artifact Level 10 and every 10 levels after, to a maximum of 9 Crystals at Artifact Level 60.** Each Crystal grants **3 lines of stats** and can be leveled to **Level 5** with Artifact AP. Max Artifact Level 60 requires **1,342,550 total Artifact EXP** and yields **20,000 max Artifact Points**.

**Per-stat caps across the whole Artifact system:**

| Stat | Cap | Stat | Cap |
|---|---|---|---|
| All Stats | +150 | Critical Rate | +20% |
| Max HP / MP | +7,500 | Critical Damage | +4% |
| ATT / MATT | +30 | +1 multi-target hit & EXP | +12% |
| Damage | +15% | Status Resistance | +12 |
| Boss Damage | +15% | Summon Duration | +20% |
| Ignored Enemy Defense | +20% | Final Attack Skill Damage | +30% |
| Buff Duration | +20% | Mesos Obtained | +12% |
| Cooldown Skip Chance | +7.5% | Item Drop Rate | +12% |

Source: [maplestorywiki.net/w/Legion_Artifact](https://maplestorywiki.net/w/Legion_Artifact)

---

#### 9. 2025–2026 change log for Legion (chronological)

| Update | Service / date | Legion change |
|---|---|---|
| **NEXT** (GMS: **Stargazer**) | GMS ~June 2025 | **Legion Champion** system added (Lv 260+ char, 8,000+ Legion Level). Legion attacker placement mode improvements; filter added to separate attackers by job branch. — [maplestorywiki.net/w/MapleStory:_NEXT](https://maplestorywiki.net/w/MapleStory:_NEXT) |
| **NEXT / Stargazer** | GMS June 11 2025 | **Sia Astelle** released (GMS-exclusive Shine Magician), Legion effect Abnormal Status Damage +1/2/3/5/6% — [maplestorywiki.net/w/Sia_Astelle](https://maplestorywiki.net/w/Sia_Astelle) |
| **Assemble** | 2025 | Weekly reset unified to Thursdays, **including the Legion coin shop**. Additional Event Legion Block obtainable from event rewards. — [maplestorywiki.net/w/MapleStory:_Assemble](https://maplestorywiki.net/w/MapleStory:_Assemble) |
| **Crown** (GMS: **Ride The Lightning**) | KMS Dec 2025 / **GMS v.269, June 17 2026** | **Legion rank-ups are now FREE** — no coin cost, auto-promotes on reaching the Legion Level, including levels gained via World Leap. — [maplestorywiki.net/w/MapleStory:_Crown](https://maplestorywiki.net/w/MapleStory:_Crown) |
| **Ride The Lightning** | **GMS v.269, June 17 2026** | **Erel Light** released (GMS-exclusive Shine Warrior), Legion Bonus Boss Damage +1/2/3/5/6% — [official patch notes](https://www.nexon.com/maplestory/news/update/41138/updated-6-16-v-269-ride-the-lightning-patch-notes) |
| **Overdrive** | **KMS v.1.2.416, July 4 2026** | **Full Legion rework**: grid → points; raid map removed; all B+ characters grant effects; 10 named presets; Champion 5th slot. **Lethe** added (KMS only). — [orangemushroom.net](https://orangemushroom.net/2026/07/04/kms-ver-1-2-416-maplestory-overdrive-ruler-of-covenants-lethe/) · [maplestorywiki.net/w/MapleStory:_Overdrive](https://maplestorywiki.net/w/MapleStory:_Overdrive) |
| **Overdrive (GMS)** | **expected late Nov / Dec 2026** | "A full Legion board revamp replaces the clunky Tetris-style layout with a clean V Matrix-inspired interface for simpler stat management." — [mmoexp GMS roadmap](https://www.mmoexp.com/News/maplestory-gms-update-roadmap-august-november-2026-events-qol-new-class-endgame-overhauls.html). **Not yet in GMS as of 2026-09-06. UNVERIFIED against an official Nexon roadmap post** — mmoexp is a third-party aggregator. |
| **Legion Ranking removal** | earlier | The weekly "Ruler of the Legion" coin ranking (top 100 → Legion Rank Mount, 7-day) was **removed**. Replaced with a permanent reward at **10,000 Legion Level**: Dragon Lord Mount + King of Legion Chair. — [maplestorywiki.net/w/Legion_System](https://maplestorywiki.net/w/Legion_System) |

**No new Legion Ranks beyond Supreme V and no raised member cap beyond 45** were found in any 2025–2026 source. Supreme Legion ranks (and the 41–45 member counts) were added back in **Patch 253** per a search-result summary of [maplestorywiki.net/w/Legion_System](https://maplestorywiki.net/w/Legion_System) — I could not locate that exact sentence in the current page text, so treat the patch number as **UNVERIFIED**; the ranks themselves are firmly confirmed.

---

#### 10. Gaps / things to verify in-game or later

| # | Gap | Status |
|---|---|---|
| 1 | **Per-point stat values in the Overdrive points system** | **UNVERIFIED** — strongly inferred as identical to per-square values (§7.4). No official numeric table found. |
| 2 | **Exact GMS date/version for the Legion revamp** | Third-party roadmap only ("late Nov/Dec 2026"). No official Nexon post located. |
| 3 | **Legion coin quest cadence** (daily 10+20 vs weekly 200) | Sources disagree; reset day moved to Thursday. Verify in-game. |
| 4 | **3× EXP coupons replacing 2× in the Legion shop** | Reported by a third-party guide; not confirmed in official patch notes. |
| 5 | **Legion Coin Shop 2026 pricing/limits** | StrategyWiki table may be stale (it still lists the removed rank-up coin costs). |
| 6 | **Exact minimum square count for a given outer-stat combination** | Depends on piece-shape packing; use a solver rather than a closed-form number. The "132 squares" figure is a forum estimate. |
| 7 | **MapleStory M block ranks** | KMS official and maplestorywiki disagree (see §1.3). KMS-only; irrelevant to GMS. |
| 8 | **Whether "Abnormal Status Damage" (Sia Astelle) is a distinct multiplier** from Boss/Normal damage | Not investigated. Rare stat; likely only applies to enemies afflicted with a status. |

---

#### 11. Source index

**Primary (used for numeric tables):**
- [maplestorywiki.net/w/Legion_System](https://maplestorywiki.net/w/Legion_System) — most complete, GMS terminology, current through Overdrive
- [maplestory.nexon.com/Guide/N23GameInformation/Articles/407](https://maplestory.nexon.com/Guide/N23GameInformation/Articles/407) — **KMS official union guide**, already updated for Overdrive
- [strategywiki.org/wiki/MapleStory/Maple_Union](https://strategywiki.org/wiki/MapleStory/Maple_Union) — best for formulas (Raid Power, coin rates) and coin shop; **stale on rank-up costs and class availability**
- [nexon.com/maplestory/news/update/41138](https://www.nexon.com/maplestory/news/update/41138/updated-6-16-v-269-ride-the-lightning-patch-notes) — official GMS v.269 patch notes
- [maplestorywiki.net/w/Legion_Champion](https://maplestorywiki.net/w/Legion_Champion) · [maplestorywiki.net/w/Legion_Artifact](https://maplestorywiki.net/w/Legion_Artifact)
- [maplestorywiki.net/w/MapleStory:_Overdrive](https://maplestorywiki.net/w/MapleStory:_Overdrive) · [maplestorywiki.net/w/MapleStory:_Crown](https://maplestorywiki.net/w/MapleStory:_Crown) · [maplestorywiki.net/w/MapleStory:_NEXT](https://maplestorywiki.net/w/MapleStory:_NEXT) · [maplestorywiki.net/w/MapleStory:_Assemble](https://maplestorywiki.net/w/MapleStory:_Assemble)
- [orangemushroom.net — KMS v.1.2.416 Overdrive](https://orangemushroom.net/2026/07/04/kms-ver-1-2-416-maplestory-overdrive-ruler-of-covenants-lethe/) · [orangemushroom.net — 2026 Summer Showcase](https://orangemushroom.net/2026/06/14/2026-maplestory-summer-showcase-overdrive/)
- [github.com/Xenogents/LegionSolver](https://github.com/Xenogents/LegionSolver) — board geometry and piece shapes, machine-readable

**Class availability verification:**
[Mo_Xuan](https://maplestorywiki.net/w/Mo_Xuan) · [Lynn](https://maplestorywiki.net/w/Lynn) · [Sia_Astelle](https://maplestorywiki.net/w/Sia_Astelle) · [Erel_Light](https://maplestorywiki.net/w/Erel_Light) · [Lethe](https://maplestorywiki.net/w/Lethe) · [Ren](https://maplestorywiki.net/w/Ren) · [Beast_Tamer](https://maplestorywiki.net/w/Beast_Tamer) · [Jett](https://maplestorywiki.net/w/Jett) · [grandislibrary.com/shine/sia-astelle](https://www.grandislibrary.com/shine/sia-astelle)

**Secondary / corroborating (lower confidence):**
- [namu.wiki 메이플 유니온](https://namu.wiki/w/%EB%A9%94%EC%9D%B4%ED%94%8C%20%EC%9C%A0%EB%8B%88%EC%98%A8) — accessible only via search snippets (403 on direct fetch)
- [mmoexp GMS Aug–Nov 2026 roadmap](https://www.mmoexp.com/News/maplestory-gms-update-roadmap-august-november-2026-events-qol-new-class-endgame-overhauls.html) · [gamemarket.gg Ride the Lightning guide](https://gamemarket.gg/news/maplestory-global/ride-the-lightning-maplestory-overdrive-summer-2026-update-guide) — third-party aggregators
- [forums.maplestory.nexon.net/discussion/18849](https://forums.maplestory.nexon.net/discussion/18849) — community "132 squares" figure
- [mmos.com — level cap 300](https://mmos.com/news/maplestory-launches-neo-darkness-ascending-part-one-update-increases-max-lvl-to-300)

**Known-stale — do not use for class data:**
- [ayumilove.net/maplestory-maple-union-guide/](https://ayumilove.net/maplestory-maple-union-guide/) — lists removed classes (Beast Tamer, Jett, Zen), missing 2024–2026 classes, lists a non-existent "Stance" outer area
- [ascally.com/maplestory-legion-link-guide/](https://ascally.com/maplestory-legion-link-guide/) — dated Sept 30, 2020

---


### 3. Symbols (Arcane, Sacred/Authentic, Grand Sacred)

> Researched independently. Section D (Force mechanics) was additionally cross-checked by me against the Korean namu.wiki articles — see Appendix B.

**Research date:** 2026-09-06. **Primary target:** GMS (Global MapleStory), current live version (post *Ride The Lightning* Part 2 — Geardock/Jupiter live; the *Post-Ride The Lightning* / Frieren update lands **2026-09-09**, i.e. 3 days after this document, and changes symbol acquisition rates — see §E).

**Source-reliability note.** Every number below carries an inline source URL. The two backbone sources are:

- **MapleStory Wiki (maplestorywiki.net)** — item pages carry the in-game item tooltips and the exact per-level cost tables, and are actively maintained for 2026 content (Geardock, Grand Sacred Symbols). Note: this site 403s generic fetchers; content was retrieved via its MediaWiki API (`/api.php?action=parse&prop=wikitext`).
- **StrategyWiki `MapleStory/Arcane River` and `MapleStory/Grandis`** — carries the published *formulas* (the force damage-adjustment rules), maintained by a MapleSEA player.
- **KPRobin's Arcane/Authentic Force spreadsheet** (MapleSEA, updated through Geardock/Tallahart) — the per-map/per-boss force requirement + tier-breakpoint table. https://kprobin.blogspot.com/2019/01/arcane-force-extra-damage-and-monster.html → sheet https://docs.google.com/spreadsheets/d/1sJSM7iZDP9e4GRfhGvhfpnGWYVwh2AaeywUIhi4F4Ec/

Where two sources disagree, both are cited and the disagreement is flagged (§G).

---

##### 0. Naming and taxonomy

| Server | Tier 1 (Arcane River) | Tier 2 (Western Grandis) | Tier 3 (Western Grandis, Lv290+) |
|---|---|---|---|
| GMS | Arcane Symbol / **Arcane Power** (a.k.a. Arcane Force) | **Sacred Symbol** / **Sacred Power** | **Grand Sacred Symbol** |
| MSEA | Arcane Symbol | **Authentic Symbol** | Grand Authentic Symbol |
| KMS | 아케인심볼 | **어센틱심볼** (Authentic Symbol) | 그랜드 어센틱심볼 |
| JMS | — | オーセンティックシンボル | グランドオーセンティックシンボル |
| CMS | — | 原初徽章 ("Primordial Badge") | 豪华原初徽章 |
| TMS | — | 真實符文 | 豪華真實符文 |

Source (naming table): https://maplestorywiki.net/w/Sacred_Symbol and https://maplestorywiki.net/w/Grand_Sacred_Symbol and https://maplestorywiki.net/w/Sacred_Symbol:_Cernium

**Critical modelling point:** Sacred Symbols and Grand Sacred Symbols feed the **same single stat pool** ("Sacred Power / Authentic Force"). There is no separate "Grand" force. Arcane Power is a *separate*, independent stat with *different* mechanics (§D).

The in-game tooltip glyphs are ✦ for ARC (Arcane) and ⬢ for SAC/AUT (Sacred/Authentic) — used consistently on the wiki's boss pages, e.g. https://maplestorywiki.net/w/Hilla/Monster_(Reborn)

---

#### A. ARCANE SYMBOLS

##### A.1 Regions and the six symbols

| Symbol | Region unlock level | Initial quest | Daily quest | Weekly Special Content |
|---|---|---|---|---|
| Arcane Symbol: Vanishing Journey | 200 | [Vanishing Journey] Arcane Symbol: Vanishing Journey | Vanishing Journey Research | Erda Spectrum |
| Arcane Symbol: Chu Chu Island | 210 | [Chu Chu] Goodbye, Chu Chu Island | Chu Chu's Finest Cuisine | Hungry Muto |
| Arcane Symbol: Lachelein | 220 | [Lachelein] Nightmare Clocktower 4F | A Night's Peace in Lachelein | Midnight Chaser |
| Arcane Symbol: Arcana | 225 | [Arcana] The Harmony of the Forest | Peace in Arcana | Spirit Savior |
| Arcane Symbol: Morass | 230 | [Morass] Her Purpose | Save the Morass | Ranheim Defense |
| Arcane Symbol: Esfera | 235 | [Esfera] Mirrors in Mirrors | Esfera Research Orders | Esfera Guardian |

Sources: https://maplestorywiki.net/w/Arcane_Symbol (symbol/quest table); entry levels from https://strategywiki.org/wiki/MapleStory/Arcane_River

Regions **without** their own symbol (they drop/reward the adjacent region's symbol): Reverse City (→ VJ), Yum Yum Island (→ Chu Chu), Sellas/Celestars, Tenebris (Moonbridge, Labyrinth of Suffering, Limina) — these require Arcane Force but grant no new symbol. Source: https://strategywiki.org/wiki/MapleStory/Arcane_River

There is also a **non-levelable starter "Arcane Symbol"** from `[5th Job] A Greater Power`: **Arcane Power +40, Main Stat +300** (DA: +6,300 HP; Xenon: +144 all). It is deleted from the inventory once you complete `[Vanishing Journey] Arcane Symbol: Vanishing Journey`. Source: https://maplestorywiki.net/w/Arcane_Symbol_(Equipment)

##### A.2 Stat per level — identical for all six regions

**All six Arcane Symbols share the exact same stat table.** Verified individually on all six wiki pages (VJ, Chu Chu, Lachelein, Arcana, Morass, Esfera) — the "Extra Stats / Effects" blocks are byte-identical.

| | Level 1 | Per additional level | Level 20 (cumulative) |
|---|---|---|---|
| **Arcane Power (AF)** | **+30** | **+10** | **+220** |
| **Main Stat** (all jobs except Xenon/DA) | **+300** | **+100** | **+2,200** |
| **HP** (Demon Avenger only) | **+6,300** | **+2,100** | **+46,200** |
| **STR / DEX / LUK** (Xenon only, each) | **+144** | **+48** | **+1,056** |

Sources (all six, identical): https://maplestorywiki.net/w/Arcane_Symbol:_Vanishing_Journey · https://maplestorywiki.net/w/Arcane_Symbol:_Chu_Chu_Island · https://maplestorywiki.net/w/Arcane_Symbol:_Lachelein · https://maplestorywiki.net/w/Arcane_Symbol:_Arcana · https://maplestorywiki.net/w/Arcane_Symbol:_Morass · https://maplestorywiki.net/w/Arcane_Symbol:_Esfera

**Closed form (per symbol, level L, 1 ≤ L ≤ 20):**
```
ArcaneForce(L)  = 20 + 10*L          # = 30 at L1, 220 at L20
MainStat(L)     = 200 + 100*L        # normal jobs
DA_HP(L)        = 4200 + 2100*L
Xenon_each(L)   = 96 + 48*L          # STR, DEX and LUK each
```
StrategyWiki states the same thing as a rate: *"100 Final Primary Stat per 10 Arcane Force from Arcane Symbols; Xenon: 48 STR/DEX/LUK per 10 AF; Demon Avenger: 2,100 Final HP per 10 AF"* — plus the flat "+20 AF per unique Arcane Symbol equipped" base. Source: https://strategywiki.org/wiki/MapleStory/Arcane_River

**Level cap is 20.** Confirmed by the cost tables ending at `Level 19→20` and by "Cumulative Stats at Max Level: Arcane Power +220". No 2025/2026 patch raised it — the KMS *Crown* (2026-02), *23rd Anniversary* (2026-03) and *Overdrive* (2026-06) update pages list symbol **acquisition** changes but **no cap change**. Sources: https://maplestorywiki.net/w/MapleStory:_Crown · https://maplestorywiki.net/w/MapleStory:_Crown/Post-Update · https://maplestorywiki.net/w/MapleStory:_Overdrive
*(Historical: the cap was 15 at 5th-job release — see the Lucid page footnote "At 5th job release, the maximum level of Arcane Symbols was 15, so 3 maxed symbols would mean 360 ARC" https://maplestorywiki.net/w/Lucid/Monster)*

###### Per-level cumulative reference (any Arcane region)

| Symbol Lv | AF (this symbol) | Cum. AF if all 6 at this level | Main stat (this symbol) | Cum. main stat, all 6 |
|---|---|---|---|---|
| 1 | 30 | 180 | 300 | 1,800 |
| 2 | 40 | 240 | 400 | 2,400 |
| 3 | 50 | 300 | 500 | 3,000 |
| 4 | 60 | 360 | 600 | 3,600 |
| 5 | 70 | 420 | 700 | 4,200 |
| 6 | 80 | 480 | 800 | 4,800 |
| 7 | 90 | 540 | 900 | 5,400 |
| 8 | 100 | 600 | 1,000 | 6,000 |
| 9 | 110 | 660 | 1,100 | 6,600 |
| 10 | 120 | 720 | 1,200 | 7,200 |
| 11 | 130 | 780 | 1,300 | 7,800 |
| 12 | 140 | 840 | 1,400 | 8,400 |
| 13 | 150 | 900 | 1,500 | 9,000 |
| 14 | 160 | 960 | 1,600 | 9,600 |
| 15 | 170 | 1,020 | 1,700 | 10,200 |
| 16 | 180 | 1,080 | 1,800 | 10,800 |
| 17 | 190 | 1,140 | 1,900 | 11,400 |
| 18 | 200 | 1,200 | 2,000 | 12,000 |
| 19 | 210 | 1,260 | 2,100 | 12,600 |
| 20 | 220 | **1,320** | 2,200 | **13,200** |

(Derived from the formulas above. The 1,320 AF / 13,200 main-stat max from symbols is independently confirmed at https://grandislibrary.com/content/stat-terms — *"a maximum of 1320 AF and 13.2k Main Stat for most classes"*.)

##### A.3 Symbol count required per level — identical for all six regions

**Formula: `symbols to go from Level L to L+1 = L² + 11`**
Source: https://maplestorywiki.net/w/Arcane_Symbol:_Vanishing_Journey (and identical on all five other pages); also https://strategywiki.org/wiki/MapleStory/Arcane_River

| Level up | Symbols | Cumulative symbols |
|---|---|---|
| 1→2 | 12 | 12 |
| 2→3 | 15 | 27 |
| 3→4 | 20 | 47 |
| 4→5 | 27 | 74 |
| 5→6 | 36 | 110 |
| 6→7 | 47 | 157 |
| 7→8 | 60 | 217 |
| 8→9 | 75 | 292 |
| 9→10 | 92 | 384 |
| 10→11 | 111 | 495 |
| 11→12 | 132 | 627 |
| 12→13 | 155 | 782 |
| 13→14 | 180 | 962 |
| 14→15 | 207 | 1,169 |
| 15→16 | 236 | 1,405 |
| 16→17 | 267 | 1,672 |
| 17→18 | 300 | 1,972 |
| 18→19 | 335 | 2,307 |
| 19→20 | 372 | **2,679** |

**2,679 symbols to take one Arcane Symbol from 1 → 20.** ×6 regions = **16,074 symbols** for full 1,320 AF.

There is no "EXP" in the abstract sense — symbols *are* the currency. Excess symbols carry over ("growth" is stored as `n/needed`), and you may over-feed: *"You can use a lower growth symbol to combine with a higher growth symbol at no additional cost… the excess is carried over."* Source: https://strategywiki.org/wiki/MapleStory/Arcane_River

##### A.4 Meso cost per level — **differs per region**

**Formula: `meso = 10,000 × floor( (L² + 11) × (B + 0.1 × L) )`** where L is the *current* level and B is the region base:

| Region | B | Total mesos, Lv1→20 |
|---|---|---|
| Vanishing Journey | 8 | 252,470,000 |
| Chu Chu Island | 10 | 306,050,000 |
| Lachelein | 12 | 359,630,000 |
| Arcana | 14 | 413,210,000 |
| Morass | 16 | 466,790,000 |
| Esfera | 18 | 520,370,000 |
| **All six** | | **2,318,520,000 (~2.32 B)** |

Sources for each B: https://maplestorywiki.net/w/Arcane_Symbol:_Vanishing_Journey (8) · .../Arcane_Symbol:_Chu_Chu_Island (10) · .../Arcane_Symbol:_Lachelein (12) · .../Arcane_Symbol:_Arcana (14) · .../Arcane_Symbol:_Morass (16) · .../Arcane_Symbol:_Esfera (18). Cross-confirmed at https://strategywiki.org/wiki/MapleStory/Arcane_River

> **Implementation warning:** `0.1 * L` in IEEE754 double arithmetic produces off-by-10,000 errors at several levels (e.g. VJ 2→3 computes 1,220,000 instead of the correct 1,230,000). Use integer math: `10_000 * ((L*L + 11) * (10*B + L)) // 10`. The table below was generated with integer math and matches the wiki tables exactly at every row for VJ, Esfera, Cernium, Carcion, Tallahart, and Geardock (spot-verified).

###### Meso cost per level-up (all six regions)

| Level up | Symbols | Vanishing Journey | Chu Chu Island | Lachelein | Arcana | Morass | Esfera |
|---|---|---|---|---|---|---|---|
| 1→2 | 12 | 970,000 | 1,210,000 | 1,450,000 | 1,690,000 | 1,930,000 | 2,170,000 |
| 2→3 | 15 | 1,230,000 | 1,530,000 | 1,830,000 | 2,130,000 | 2,430,000 | 2,730,000 |
| 3→4 | 20 | 1,660,000 | 2,060,000 | 2,460,000 | 2,860,000 | 3,260,000 | 3,660,000 |
| 4→5 | 27 | 2,260,000 | 2,800,000 | 3,340,000 | 3,880,000 | 4,420,000 | 4,960,000 |
| 5→6 | 36 | 3,060,000 | 3,780,000 | 4,500,000 | 5,220,000 | 5,940,000 | 6,660,000 |
| 6→7 | 47 | 4,040,000 | 4,980,000 | 5,920,000 | 6,860,000 | 7,800,000 | 8,740,000 |
| 7→8 | 60 | 5,220,000 | 6,420,000 | 7,620,000 | 8,820,000 | 10,020,000 | 11,220,000 |
| 8→9 | 75 | 6,600,000 | 8,100,000 | 9,600,000 | 11,100,000 | 12,600,000 | 14,100,000 |
| 9→10 | 92 | 8,180,000 | 10,020,000 | 11,860,000 | 13,700,000 | 15,540,000 | 17,380,000 |
| 10→11 | 111 | 9,990,000 | 12,210,000 | 14,430,000 | 16,650,000 | 18,870,000 | 21,090,000 |
| 11→12 | 132 | 12,010,000 | 14,650,000 | 17,290,000 | 19,930,000 | 22,570,000 | 25,210,000 |
| 12→13 | 155 | 14,260,000 | 17,360,000 | 20,460,000 | 23,560,000 | 26,660,000 | 29,760,000 |
| 13→14 | 180 | 16,740,000 | 20,340,000 | 23,940,000 | 27,540,000 | 31,140,000 | 34,740,000 |
| 14→15 | 207 | 19,450,000 | 23,590,000 | 27,730,000 | 31,870,000 | 36,010,000 | 40,150,000 |
| 15→16 | 236 | 22,420,000 | 27,140,000 | 31,860,000 | 36,580,000 | 41,300,000 | 46,020,000 |
| 16→17 | 267 | 25,630,000 | 30,970,000 | 36,310,000 | 41,650,000 | 46,990,000 | 52,330,000 |
| 17→18 | 300 | 29,100,000 | 35,100,000 | 41,100,000 | 47,100,000 | 53,100,000 | 59,100,000 |
| 18→19 | 335 | 32,830,000 | 39,530,000 | 46,230,000 | 52,930,000 | 59,630,000 | 66,330,000 |
| 19→20 | 372 | 36,820,000 | 44,260,000 | 51,700,000 | 59,140,000 | 66,580,000 | 74,020,000 |
| **Total** | **2,679** | **252,470,000** | **306,050,000** | **359,630,000** | **413,210,000** | **466,790,000** | **520,370,000** |

VJ column verified row-for-row against https://maplestorywiki.net/w/Arcane_Symbol:_Vanishing_Journey ; Esfera endpoints (1→2 = 2,170,000; 19→20 = 74,020,000) verified against https://maplestorywiki.net/w/Arcane_Symbol:_Esfera

###### Cumulative meso (to reach level N)

| Reach Lv | Cum. symbols | VJ | Chu Chu | Lachelein | Arcana | Morass | Esfera |
|---|---|---|---|---|---|---|---|
| 2 | 12 | 970,000 | 1,210,000 | 1,450,000 | 1,690,000 | 1,930,000 | 2,170,000 |
| 5 | 74 | 6,120,000 | 7,600,000 | 9,080,000 | 10,560,000 | 12,040,000 | 13,520,000 |
| 10 | 384 | 33,220,000 | 40,900,000 | 48,580,000 | 56,260,000 | 63,940,000 | 71,620,000 |
| 15 | 1,169 | 105,670,000 | 129,050,000 | 152,430,000 | 175,810,000 | 199,190,000 | 222,570,000 |
| 18 | 1,972 | 182,820,000 | 222,260,000 | 261,700,000 | 301,140,000 | 340,580,000 | 380,020,000 |
| 20 | 2,679 | 252,470,000 | 306,050,000 | 359,630,000 | 413,210,000 | 466,790,000 | 520,370,000 |

(Full 19-row cumulative table is trivially reproducible from the per-level table.)

###### Mentor / Mentorship System discount — **NOT in GMS**
The wiki cost tables carry a third column "Cumulative Cost (With Mentor System Activated)" which is **0 mesos through Level 15** (costs resume at 15→16). This is the **Mentorship System**, released in **ChinaMS and TaiwanMS** in the *Milestone/Chaser* update and in **MapleSEA** in the *Post-Crown* update. It is explicitly **not** in KMS or GMS.
Sources: https://maplestorywiki.net/w/MapleStory:_Milestone (*"New System: Mentorship System (ChinaMS and TaiwanMS only) — Arcane Symbols cost nothing to level up until Level 15"*) and https://maplestorywiki.net/w/MapleStory:_Crown/Post-Update (MSEA section). **Do not apply this to a GMS calculator** unless you add a server toggle.

##### A.5 Arcane Symbol acquisition rates

###### Daily quests (once per day per character; EXP once per day *per world*)

**GMS values as of 2026-09-06** (the wiki explicitly annotates "Non-GMS" values, which are already doubled by the KMS 23rd-Anniversary QoL pass — GMS receives these on **2026-09-09**):

| Region | Daily quest | Kill requirement | GMS coupons/day | Non-GMS (and GMS from 2026-09-09) | Daily EXP |
|---|---|---|---|---|---|
| Vanishing Journey | Vanishing Journey Research | 500 (→300 after Chu Chu clear, →100 after further areas) | **10**, **20** after `[Reverse City] Surviving in the Reversed City` | 20 / **40** | 732,132,258 |
| Chu Chu Island | Chu Chu's Finest Cuisine | 500 → 300 → 100 | **10**, **20** after `[Yum Yum] The Traveler and the Follower` | 20 / **40** | 2,141,658,246 |
| Lachelein | A Night's Peace in Lachelein | 500 → 300 → 100 | **20** | **40** | 3,189,098,250 |
| Arcana | Peace in Arcana | 500 → 300 → 100 | **20** | **40** | 3,305,187,639 |
| Morass | Save the Morass | 500 → 300 → 100 | **20** | **40** | 4,398,266,165 |
| Esfera | Esfera Research Orders | 500 → 300 → 100 | **20** | **40** | 4,530,843,954 |

Sources: https://maplestorywiki.net/w/(Daily_Quest)_Vanishing_Journey_Research · .../(Daily_Quest)_Chu_Chu's_Finest_Cuisine · .../(Daily_Quest)_A_Night's_Peace_in_Lachelein · .../(Daily_Quest)_Peace_in_Arcana · .../(Daily_Quest)_Save_the_Morass · .../(Daily_Quest)_Esfera_Research_Orders (each page literally reads e.g. `Coupon x 20 (40 in Non-GMS)`). Kill-count reduction chain also at https://strategywiki.org/wiki/MapleStory/Grandis and https://strategywiki.org/wiki/MapleStory/Arcane_River

###### Weekly Special Content (3 clears per week per character; EXP capped at 3×/week per world)

| Content | Region symbol | Recommended ARC | GMS now | After Post-RTL (GMS 2026-09-09) | After Overdrive/Fall-2026 | Weekly EXP each |
|---|---|---|---|---|---|---|
| Erda Spectrum | Vanishing Journey | 60 (90 for 1.5×) | **40 / clear × 3** | 80 / clear × 3 | **240, 1 clear/week** | 187,726,220 |
| Hungry Muto | Chu Chu Island | 100 | **40 × 3** | 80 × 3 | 240 × 1 | 549,143,140 |
| Midnight Chaser | Lachelein | 240 | **40 × 3** | 80 × 3 | 240 × 1 | 817,717,500 |
| Spirit Savior | Arcana | — | **40 × 3** | 80 × 3 | 240 × 1 | 847,484,010 |
| Ranheim Defense | Morass | 520 | **40 × 3** | 80 × 3 | 240 × 1 | 1,127,760,555 |
| Esfera Guardian | Esfera | 640 | **40 × 3** | 80 × 3 | 240 × 1 | 1,161,754,860 |

Sources: https://maplestorywiki.net/w/Erda_Spectrum · https://maplestorywiki.net/w/Hungry_Muto · https://maplestorywiki.net/w/Midnight_Chaser · https://maplestorywiki.net/w/Spirit_Savior · https://maplestorywiki.net/w/Ranheim_Defense · https://maplestorywiki.net/w/Esfera_Guardian — each page's "Upcoming Changes" section reads verbatim: *"Beginning in the Crown Update (all servers other than KoreaMS and GlobalMS), or in the 23rd Anniversary / Post-Ride The Lightning Update (KoreaMS and GlobalMS), you will receive 80 symbols per completion… Beginning in the Overdrive Update, you will receive 240 symbols after completion as the clear limit has been reduced to once per week."* Overdrive changes also at https://maplestorywiki.net/w/MapleStory:_Overdrive

> ⚠️ **Conflict:** StrategyWiki still says *"15 Arcane Symbol exchange coupons"* per weekly clear (https://strategywiki.org/wiki/MapleStory/Arcane_River). That is a **stale MapleSEA-era figure**; the current value is 40 (three independent maplestorywiki pages agree). Use 40.

###### Other sources
- **Monster drops** — every Arcane River mob can drop its region's symbol coupon. Drop rate is *"about 1 in 20,000+ monsters at 1× drop rate for specific area symbols, and even lower for selectors"*. Selector coupons are tradable in non-Reboot, untradable in Reboot. Source: https://strategywiki.org/wiki/MapleStory/Arcane_River
- **Arcane Symbol Selector Coupon** — from events/boxes; can only be redeemed for a region you have already unlocked via quest. Source: https://maplestorywiki.net/w/Arcane_Symbol:_Vanishing_Journey
- **Symbol Express Pass ("Quick Pass")** — pay Maple Points to auto-complete the daily/weekly. Default **1,000 MP** for a daily, **−400 MP** per 200-kill reduction (applies up to twice → 200 MP at 100 kills); **2,000 MP per weekly entry**. MVP Red / VIP Royal+ get one free use per week for all areas. Becomes a flat 200 MP (daily) / 2,000 MP (weekly) in Overdrive. Source: https://maplestorywiki.net/w/Symbol_Express_Pass

###### Time-to-max (GMS current rates, one region, perfect play)
- Per week per region: 20/day × 7 + 40 × 3 = **260 symbols/week** → 2,679 / 260 = **10.3 weeks ≈ 72 days** per symbol (VJ before the Reverse City quest: 190/week → 14.1 weeks).
- After 2026-09-09 (GMS): 40/day × 7 + 80 × 3 = **520/week** → **5.15 weeks ≈ 36 days**.
- After Overdrive/Fall-2026: 40/day × 7 + 240 × 1 = **520/week** (unchanged in total, fewer runs).
- All six symbols run in parallel, so full 1,320 AF ≈ the single-region figure, gated by area unlock order.

##### A.6 Transferring Arcane Symbols (Arcane Catalyst)
- **Arcane Catalyst**: 300 Union Coins from the Union Coin Shop, max 3/character/week, **not available in Reboot/Heroic worlds**.
- Destabilises a Level 2+ symbol → *Unstable Arcane Symbol*: level resets to 1, **total symbol EXP reduced to 80% of original (rounded up)**, tradable within the account.
- Recipient must have unlocked that region's symbol via quest and must not already own that symbol. On stabilisation the Final Stat boost is re-typed to the new job (i.e. Xenon/DA conversions happen automatically). Mesos must be re-paid to re-level.
- StrategyWiki publishes the full "growth before → level after" conversion table.
Source: https://strategywiki.org/wiki/MapleStory/Arcane_River ; catalyst existence also referenced at https://maplestorywiki.net/w/Arcane_Symbol:_Vanishing_Journey

---

#### B. SACRED SYMBOLS (= Authentic Symbols)

##### B.1 Regions

| Symbol | Region | Region unlock lv | Initial quest | Daily quest | Max-level boss bonus |
|---|---|---|---|---|---|
| Sacred Symbol: Cernium | Cernium (+ Burning/Fallen Cernium) | 260 | [Cernium] A Divine Power | Cernium Research | +20% dmg vs **Chosen Seren** |
| Sacred Symbol: Arcus | Hotel Arcus (+ Karote) | 265 | [Hotel Arcus] 'Til We Meet Again | Clean Up Around Hotel Arcus | +20% dmg vs **Kalos the Guardian** |
| Sacred Symbol: Odium | Odium | 270 | [Odium] Hundun Laid to Rest | Odium Area Expedition | +20% dmg vs **First Adversary** |
| Sacred Symbol: Shangri-La | Shangri-La | 275 | [Shangri-La] One Who Arrived in Paradise | Shangri-La Contamination Purification | +20% dmg vs **Kaling** |
| Sacred Symbol: Arteria | Arteria (+ Dark Sea) | 280 | [Arteria] The Battle's Aftermath | Defeat the Arteria Remnants | +20% dmg vs **Malefic Star** |
| Sacred Symbol: Carcion | Carcion | 285 | [Carcion] A Message from Across the Continent | Carcion Recovery Support | +20% dmg vs **Limbo** |

Sources: https://maplestorywiki.net/w/Sacred_Symbol (symbol/quest table) · region unlock levels https://maplestorywiki.net/w/Western_Grandis · per-symbol boss bonuses on each item page (https://maplestorywiki.net/w/Sacred_Symbol:_Cernium etc.)

Item `Required Level` on all Sacred Symbols is **200** (they are equippable at 200 if transferred), but the content that grants them starts at 260. Source: https://maplestorywiki.net/w/Sacred_Symbol:_Cernium

**Carcion is the last region with a normal Sacred Symbol.** Source: https://maplestorywiki.net/w/Western_Grandis

##### B.2 Level cap and stats

**Cap is Level 11** (not 10, not raised in 2025/2026). Cost tables end at `Level 10→11` and "Cumulative Stats at Max Level: Sacred Power / Authentic Force: +110".

| | Level 1 | Per additional level | Level 11 (cumulative) |
|---|---|---|---|
| **Sacred Power / Authentic Force** | **+10** | **+10** | **+110** |
| **Main Stat** | **+500** | **+200** | **+2,500** |
| **HP** (Demon Avenger) | **+10,500** | **+4,200** | **+52,500** |
| **STR/DEX/LUK** (Xenon, each) | **+240** | **+96** | **+1,200** |
| **EXP Obtained** | — | — | **+10% at max level only** |
| **Damage vs region boss** | — | — | **+20% at max level only** |

Sources: identical blocks on https://maplestorywiki.net/w/Sacred_Symbol:_Cernium · .../Sacred_Symbol:_Arcus · .../Sacred_Symbol:_Odium · .../Sacred_Symbol:_Shangri-La · .../Sacred_Symbol:_Arteria · .../Sacred_Symbol:_Carcion

**The +10% EXP and +20% boss damage are a 2026 addition** — the *Crown / Ride The Lightning* update: *"Sacred Symbol and Grand Sacred Symbol improvements — All Sacred Symbols give up to +10% EXP when maxed; All Sacred and Grand Sacred Symbols +20% damage against the corresponding region's boss when maxed."* Source: https://maplestorywiki.net/w/MapleStory:_Crown

**Closed form (level L, 1 ≤ L ≤ 11):**
```
SacredForce(L) = 10*L                # 10 at L1, 110 at L11
MainStat(L)    = 300 + 200*L         # 500 at L1, 2500 at L11
DA_HP(L)       = 6300 + 4200*L
Xenon_each(L)  = 144 + 96*L
```
StrategyWiki phrases it as: *"All Jobs (except Xenon and Demon Avenger): 200 Final Primary Stat per 10 Authentic Force + 300 Final Primary Stat per unique Authentic Symbol equipped; Xenon: 96 …+144; Demon Avenger: 4,200 Final HP per 10 AuF + 6,300."* Source: https://strategywiki.org/wiki/MapleStory/Grandis

###### Cumulative reference

| Sym Lv | SF (this symbol) | Cum. SF, all 6 sacred | Cum. SF, 6 sacred + 2 grand | Main stat (this) | Cum. main stat, all 6 |
|---|---|---|---|---|---|
| 1 | 10 | 60 | 80 | 500 | 3,000 |
| 2 | 20 | 120 | 160 | 700 | 4,200 |
| 3 | 30 | 180 | 240 | 900 | 5,400 |
| 4 | 40 | 240 | 320 | 1,100 | 6,600 |
| 5 | 50 | 300 | 400 | 1,300 | 7,800 |
| 6 | 60 | 360 | 480 | 1,500 | 9,000 |
| 7 | 70 | 420 | 560 | 1,700 | 10,200 |
| 8 | 80 | 480 | 640 | 1,900 | 11,400 |
| 9 | 90 | 540 | 720 | 2,100 | 12,600 |
| 10 | 100 | 600 | 800 | 2,300 | 13,800 |
| 11 | 110 | **660** | **880** | 2,500 | **15,000** |

##### B.3 Symbol counts and meso cost

**Symbols to go from Level L to L+1: `9L² + 20L`** — identical for all Sacred **and** Grand Sacred Symbols.
**Meso: `100,000 × floor( (9L² + 20L) × (B − 0.6 × L) )`**, region base B:

| Symbol | B | Total mesos Lv1→11 |
|---|---|---|
| Cernium | 13.2 | 3,930,100,000 |
| Arcus | 15.0 | 4,751,600,000 |
| Odium | 16.8 | 5,573,300,000 |
| Shangri-La | 18.6 | 6,395,000,000 |
| Arteria | 20.4 | 7,216,900,000 |
| Carcion | 22.2 | 8,038,600,000 |
| **All six sacred** | | **35,905,500,000 (~35.9 B)** |
| Grand: Tallahart | 39.8 | 16,072,800,000 |
| Grand: Geardock | 48.8 | 20,181,300,000 |
| **Grand total, 8 symbols** | | **72,159,600,000 (~72.2 B)** |

Sources: https://maplestorywiki.net/w/Sacred_Symbol:_Cernium (13.2) · .../Sacred_Symbol:_Arcus (15) · .../Sacred_Symbol:_Odium (16.8) · .../Sacred_Symbol:_Shangri-La (18.6) · .../Sacred_Symbol:_Arteria (20.4) · .../Sacred_Symbol:_Carcion (22.2) · https://maplestorywiki.net/w/Grand_Sacred_Symbol:_Tallahart (39.8) · https://maplestorywiki.net/w/Grand_Sacred_Symbol:_Geardock (48.8). Formula also at https://strategywiki.org/wiki/MapleStory/Grandis

> Again use integer arithmetic: `100_000 * ((9*L*L + 20*L) * (10*B − 6*L)) // 10`. Float math mis-computes Cernium 5→6 and 10→11 by 100,000.

###### Per-level cost table (all eight Sacred-family symbols)

| Level up | Symbols | Cum. symbols | Cernium | Arcus | Odium | Shangri-La | Arteria | Carcion | **Tallahart (G)** | **Geardock (G)** |
|---|---|---|---|---|---|---|---|---|---|---|
| 1→2 | 29 | 29 | 36,500,000 | 41,700,000 | 46,900,000 | 52,200,000 | 57,400,000 | 62,600,000 | 113,600,000 | 139,700,000 |
| 2→3 | 76 | 105 | 91,200,000 | 104,800,000 | 118,500,000 | 132,200,000 | 145,900,000 | 159,600,000 | 293,300,000 | 361,700,000 |
| 3→4 | 141 | 246 | 160,700,000 | 186,100,000 | 211,500,000 | 236,800,000 | 262,200,000 | 287,600,000 | 535,800,000 | 662,700,000 |
| 4→5 | 224 | 470 | 241,900,000 | 282,200,000 | 322,500,000 | 362,800,000 | 403,200,000 | 443,500,000 | 837,700,000 | 1,039,300,000 |
| 5→6 | 325 | 795 | 331,500,000 | 390,000,000 | 448,500,000 | 507,000,000 | 565,500,000 | 624,000,000 | 1,196,000,000 | 1,488,500,000 |
| 6→7 | 444 | 1,239 | 426,200,000 | 506,100,000 | 586,000,000 | 666,000,000 | 745,900,000 | 825,800,000 | 1,607,200,000 | 2,006,800,000 |
| 7→8 | 581 | 1,820 | 522,900,000 | 627,400,000 | 732,000,000 | 836,600,000 | 941,200,000 | 1,045,800,000 | 2,068,300,000 | 2,591,200,000 |
| 8→9 | 736 | 2,556 | 618,200,000 | 750,700,000 | 883,200,000 | 1,015,600,000 | 1,148,100,000 | 1,280,600,000 | 2,576,000,000 | 3,238,400,000 |
| 9→10 | 909 | 3,465 | 709,000,000 | 872,600,000 | 1,036,200,000 | 1,199,800,000 | 1,363,500,000 | 1,527,100,000 | 3,126,900,000 | 3,945,000,000 |
| 10→11 | 1,100 | **4,565** | 792,000,000 | 990,000,000 | 1,188,000,000 | 1,386,000,000 | 1,584,000,000 | 1,782,000,000 | 3,718,000,000 | 4,708,000,000 |
| **Total** | **4,565** | | **3,930,100,000** | **4,751,600,000** | **5,573,300,000** | **6,395,000,000** | **7,216,900,000** | **8,038,600,000** | **16,072,800,000** | **20,181,300,000** |

Verified row-for-row against the published Cernium, Carcion, Tallahart and Geardock tables on maplestorywiki.

###### Cumulative meso to reach level N

| Reach Lv | Cum. symbols | Cernium | Arcus | Odium | Shangri-La | Arteria | Carcion | Tallahart | Geardock |
|---|---|---|---|---|---|---|---|---|---|
| 2 | 29 | 36,500,000 | 41,700,000 | 46,900,000 | 52,200,000 | 57,400,000 | 62,600,000 | 113,600,000 | 139,700,000 |
| 3 | 105 | 127,700,000 | 146,500,000 | 165,400,000 | 184,400,000 | 203,300,000 | 222,200,000 | 406,900,000 | 501,400,000 |
| 4 | 246 | 288,400,000 | 332,600,000 | 376,900,000 | 421,200,000 | 465,500,000 | 509,800,000 | 942,700,000 | 1,164,100,000 |
| 5 | 470 | 530,300,000 | 614,800,000 | 699,400,000 | 784,000,000 | 868,700,000 | 953,300,000 | 1,780,400,000 | 2,203,400,000 |
| 6 | 795 | 861,800,000 | 1,004,800,000 | 1,147,900,000 | 1,291,000,000 | 1,434,200,000 | 1,577,300,000 | 2,976,400,000 | 3,691,900,000 |
| 7 | 1,239 | 1,288,000,000 | 1,510,900,000 | 1,733,900,000 | 1,957,000,000 | 2,180,100,000 | 2,403,100,000 | 4,583,600,000 | 5,698,700,000 |
| 8 | 1,820 | 1,810,900,000 | 2,138,300,000 | 2,465,900,000 | 2,793,600,000 | 3,121,300,000 | 3,448,900,000 | 6,651,900,000 | 8,289,900,000 |
| 9 | 2,556 | 2,429,100,000 | 2,889,000,000 | 3,349,100,000 | 3,809,200,000 | 4,269,400,000 | 4,729,500,000 | 9,227,900,000 | 11,528,300,000 |
| 10 | 3,465 | 3,138,100,000 | 3,761,600,000 | 4,385,300,000 | 5,009,000,000 | 5,632,900,000 | 6,256,600,000 | 12,354,800,000 | 15,473,300,000 |
| 11 | 4,565 | 3,930,100,000 | 4,751,600,000 | 5,573,300,000 | 6,395,000,000 | 7,216,900,000 | 8,038,600,000 | 16,072,800,000 | 20,181,300,000 |

##### B.4 Sacred Symbol acquisition

**There is no weekly Special Content for Sacred Symbols.** Dailies + rare mob drops + events only.

| Region | Daily quest | Kill req | **GMS coupons/day** | Non-GMS (GMS from 2026-09-09) | Daily EXP |
|---|---|---|---|---|---|
| Cernium | Cernium Research | 500 → 300 → 100 | **20** | **30** | 16,455,682,080 |
| Hotel Arcus | Clean Up Around Hotel Arcus | 500 → 300 → 100 | **10** | **15** | 19,372,782,409 |
| Odium | Odium Area Expedition | 500 → 300 → 100 | **10** | **15** | 23,246,151,120 |
| Shangri-La | Shangri-La Contamination Purification | 500 → 300 → 100 | **10** | **15** | 32,127,015,480 |
| Arteria | Defeat the Arteria Remnants | 500 → 300 → 100 | **10** | **15** | 38,593,455,264 |
| Carcion | Carcion Recovery Support | 500 → 300 → 100 | **10** | **15** | 45,635,222,880 |

Sources: https://maplestorywiki.net/w/(Daily_Quest)_Cernium_Research · .../(Daily_Quest)_Clean_Up_Around_Hotel_Arcus · .../(Daily_Quest)_Odium_Area_Expedition · .../(Daily_Quest)_Shangri-La_Contamination_Purification · .../(Daily_Quest)_Defeat_the_Arteria_Remnants · .../(Daily_Quest)_Carcion_Recovery_Support. Cernium's 20/day and the others' 10/day are independently confirmed at https://strategywiki.org/wiki/MapleStory/Grandis (*"A Daily Quest can be performed to receive 20 Authentic Symbol: Cernium Coupons everyday… 10 Authentic Symbol: Hotel Arcs Coupons…"*). The Post-Crown *"50% more rewards in Sacred Symbol daily quests"* is at https://maplestorywiki.net/w/MapleStory:_Crown/Post-Update

**Mob drops:** every Western Grandis mob can drop its region's coupon at a very low rate. In Interactive/non-Reboot worlds these are fully tradable; in Heroic/Reboot they are *tradable within the same world* (unusual — Arcane coupons are not). Source: https://maplestorywiki.net/w/Sacred_Symbol:_Cernium

**Time-to-max (GMS, dailies only):**
- Cernium: 4,565 / 20 = **229 days**
- Every other Sacred region: 4,565 / 10 = **457 days (~15 months)**
- After 2026-09-09 (GMS at Non-GMS rates): Cernium **153 days**, others **305 days**.

**No Sacred/Authentic Force hyper stat exists** — the Hyper Stat list has 18 categories and only includes "Arcane Force/Power". Source: https://maplestorywiki.net/w/Hyper_Stats. Nor is there a guild skill for it. Sacred Force therefore comes **only** from symbols (plus temporary event totems, e.g. GMS *Arthur's Equipment Rental* event *"New totems providing additional Sacred and Arcane Power stats"* — https://maplestorywiki.net/w/MapleStory:_Crown).

---

#### C. NEWER SYMBOL TYPES (2025–2026)

##### C.1 Grand Sacred Symbols (Grand Authentic Symbols) — the new type

Introduced with **Tallahart** (GMS *v.257 Tallahart: Grave of the Gods*) and expanded with **Geardock** (KMS ver. 1.2.412, 2026-02-14; GMS *Ride The Lightning Part 2*).

| Symbol | Region | Region unlock | Initial quest | Daily quest | Boss |
|---|---|---|---|---|---|
| Grand Sacred Symbol: Tallahart | Tallahart (Grave of the Gods) | **290** | [Tallahart] The Battle to Come | Investigate the Tallahart Ancient God's Power | **Baldrix** |
| Grand Sacred Symbol: Geardock | Geardock | **295** | [Geardock] In the Aftermath | Cleaning Up Kronos | **Jupiter** |

Sources: https://maplestorywiki.net/w/Grand_Sacred_Symbol · https://maplestorywiki.net/w/Western_Grandis · https://orangemushroom.net/2026/02/14/kms-ver-1-2-412-maplestory-crown-geardrak-jupiter-guild-castle/

**Requires Level 290+ to obtain.** Item `Required Level` is 200. Source: https://maplestorywiki.net/w/Grand_Sacred_Symbol

###### C.2 Grand Sacred Symbol stats — **no main stat at all**

This is the key structural difference: Grand Sacred Symbols give **utility percentages instead of main stat**.

| | Level 1 | Per additional level | Level 11 (cumulative) |
|---|---|---|---|
| **Sacred Power / Authentic Force** | **+10** | **+10** | **+110** |
| **EXP Obtained** | **+10%** | **+4%** | **+50%** |
| **Mesos Obtained** | **+5%** | **+1%** | **+15%** |
| **Item Drop Rate** | **+5%** | **+1%** | **+15%** |
| **Main stat / HP** | **none** | **none** | **none** |
| **Max Level Bonus** | — | — | **+20% damage vs Baldrix (Tallahart) / Jupiter (Geardock)** |

Sources: https://maplestorywiki.net/w/Grand_Sacred_Symbol:_Tallahart · https://maplestorywiki.net/w/Grand_Sacred_Symbol:_Geardock · corroborated by KMS patch notes: *"The Grand Authentic Symbol: Geardrak gives 10% additional experience, 5% meso acquisition rate, and 5% item drop rate at level 1. When it reaches level 11, it will give 50% additional experience, 15% meso acquisition rate, and 15% item drop rate, as well as +20% damage when attacking Jupiter."* https://orangemushroom.net/2026/02/14/kms-ver-1-2-412-maplestory-crown-geardrak-jupiter-guild-castle/

```
GrandSacredForce(L) = 10*L                 # identical to Sacred
EXP%(L)             = 6 + 4*L              # 10% at L1, 50% at L11
Meso%(L)            = 4 + 1*L              # 5% at L1, 15% at L11
Drop%(L)            = 4 + 1*L              # 5% at L1, 15% at L11
```
Two maxed Grand symbols therefore give **+100% EXP, +30% meso, +30% drop, +220 Sacred Force** and **zero** main stat.

###### C.3 Grand Sacred acquisition

| Region | Daily quest | GMS coupons/day | Non-GMS / GMS from 2026-09-09 | Daily EXP |
|---|---|---|---|---|
| Tallahart | Investigate the Tallahart Ancient God's Power | **10** | **15** | 89,730,912,960 |
| Geardock | Cleaning Up Kronos | **10** | **15** | 105,641,078,400 |

Sources: https://maplestorywiki.net/w/(Daily_Quest)_Investigate_the_Tallahart_Ancient_God's_Power · https://maplestorywiki.net/w/(Daily_Quest)_Cleaning_Up_Kronos · KMS: *"When you complete the daily quest, you will receive experience (once per day per world) and 10 Grand Authentic Symbol: Geardrak Vouchers."* https://orangemushroom.net/2026/02/14/kms-ver-1-2-412-maplestory-crown-geardrak-jupiter-guild-castle/

Same 4,565-symbol total → **457 days each** at GMS 10/day. Also droppable from Tallahart/Geardock mobs (tradable in Interactive; tradable-within-world in Heroic), and obtainable via Selective Authentic Symbol Vouchers from events (e.g. Platinum Apples in KMS). Sources: https://maplestorywiki.net/w/Grand_Sacred_Symbol:_Tallahart · https://orangemushroom.net/2026/02/14/kms-ver-1-2-412-maplestory-crown-geardrak-jupiter-guild-castle/

###### C.4 "Tenebris symbols" — **do not exist**
Tenebris (Moonbridge, Labyrinth of Suffering, Limina) and Sellas/Celestars *require* Arcane Force but grant **no symbol of their own**; you use Esfera symbols and hyper/guild AF to reach their requirements. Source: https://strategywiki.org/wiki/MapleStory/Arcane_River and the AF requirement table in §D.3. An `Arcane Symbol: Tenebris` page does not exist on the wiki.

###### C.5 2025–2026 changes summary (symbol-relevant)

| Update | Server/date | Symbol-relevant change |
|---|---|---|
| Tallahart | GMS v.257 (2025) | First Grand Sacred Symbol |
| **Crown / Ride The Lightning** | KMS 1.2.410–412 (Jan–Feb 2026); GMS 2026 | Geardock + 2nd Grand Sacred Symbol; **all Sacred Symbols gain +10% EXP at max**; **all Sacred + Grand Sacred gain +20% damage vs their region boss at max**; field reorganisation of VJ→Esfera, Tenebris, Cernium, Hotel Arcus |
| **23rd Anniversary / Post-Ride The Lightning** | KMS 2026-03-23; **GMS 2026-09-09** | **Arcane daily + weekly rewards doubled**; **Sacred daily rewards +50%**; new auto-add-to-equipped-symbol feature |
| **Mentorship System** | CMS/TMS (Milestone), MSEA (Post-Crown) — **not GMS/KMS** | Arcane Symbols cost **0 meso** to level up to 15 |
| **Overdrive** | KMS 2026-06; GMS "Fall 2026" (Sept 17 / Oct / Nov 19) | Symbol daily kill requirement flattened to **100/area**; Arcane weekly content → **1 clear/week for 240 symbols**; Express Pass flat 200 MP daily / 2,000 MP weekly |

Sources: https://maplestorywiki.net/w/MapleStory:_Crown · https://maplestorywiki.net/w/MapleStory:_Crown/Post-Update · https://maplestorywiki.net/w/MapleStory:_Overdrive · https://maplestorywiki.net/w/MapleStory:_Milestone · https://orangemushroom.net/2026/03/23/kms-ver-1-2-413-maplestorys-23rd-anniversary-maple-attack/

**No symbol level cap increase has occurred or is announced** as of 2026-09-06 (Arcane 20, Sacred/Grand Sacred 11).

---

#### D. FORCE MECHANICS — the exact published rules

> **These two systems are mathematically different. Arcane Force is a RATIO system. Sacred/Authentic Force is an ABSOLUTE-DIFFERENCE system.** This is the single most important modelling fact in this document.

##### D.1 Arcane Force — ratio-based, 9 tiers

Let `r = floor( 100 × YourARC / RequiredARC )` (percent of requirement, rounded down).

| `r` (AF requirement met, %) | **Final damage you deal** | **Monster damage you take** |
|---|---|---|
| 0 – 9 % | **10 %** | 280 % (2.8×) |
| 10 – 29 % | **30 %** | 240 % (2.4×) |
| 30 – 49 % | **60 %** | 180 % (1.8×) |
| 50 – 69 % | **70 %** | 160 % (1.6×) |
| 70 – 99 % | **80 %** | 140 % (1.4×) |
| **100 – 109 %** | **100 %** | 100 % (1×) |
| 110 – 129 % | **110 %** | 80 % (0.8×) |
| 130 – 149 % | **130 %** | 40 % (0.4×) |
| **≥ 150 %** | **150 %** | **0 % (monster deals 1 damage)** |

**Primary source (verbatim table):** https://strategywiki.org/wiki/MapleStory/Arcane_River — *"Based on your Arcane Force and required Arcane Force, your final damage is adjusted to between 10% to 150% of the original damage and monster damage will hit between 0% to 280% of its original damage (not applied to %HP attacks)."*
**Independent confirmation (per-map breakpoint columns):** KPRobin sheet, tab *"Arcane Force (New Age)"* — column headers are exactly `10% / 280%`, `30% / 240%`, `60% / 180%`, `70% / 160%`, `80% / 140%`, `100% / 100%`, `110% / 80%`, `130% / 40%`, `150% / 0%`, and every map row lists the raw AF value at which each tier begins (e.g. for a 100-AF map: 0, 10, 30, 50, 70, 100, 110, 130, 150). https://docs.google.com/spreadsheets/d/1sJSM7iZDP9e4GRfhGvhfpnGWYVwh2AaeywUIhi4F4Ec/ (linked from https://kprobin.blogspot.com/2019/01/arcane-force-extra-damage-and-monster.html)

**Important caveats:**
1. The **monster-damage multiplier is NOT applied on boss maps**, and is not applied to %HP attacks or anti-AFK mobs. Sources: KPRobin notes (*"Monster damage reduction is not applied in boss maps"*); each boss wiki page repeats *"Monster Damage does not affected by Arcane Force from Boss Monsters"* in the KPRobin sheet notes.
2. **History:** before the *Adventure* update (kMS 1.2.311) the over-cap bonus was 3 tiers (100 % / 110 % / 150 %); it is now 4 tiers (100 / 110 / 130 / 150). Source: KPRobin notes, *"'Adventure' labeled are latest extra damage and monster damage from server kMS 1.2.311 which 'extra benefit' changed from 3 stages 100%/110%/150% to 4 stages 100%/110%/130%/150%."*
3. **ARC only exists in increments of 5** (symbols give 10, hyper stat gives 5), and boss pages round the tier thresholds **up to the next multiple of 5**. Example (Verus Hilla Normal, req 820): 820×1.1 = 902 → published threshold **905**; 820×1.3 = 1,066 → published **1,070**; 820×1.5 = **1,230**. Source: https://maplestorywiki.net/w/Hilla/Monster_(Reborn)

###### Arcane Force sources and maximum
| Source | Amount |
|---|---|
| Arcane Symbols | +20 per unique symbol equipped, **+10 per symbol level** → 30 at Lv1, 220 at Lv20 → **1,320** at 6×Lv20 |
| **Hyper Stat "Arcane Force/Power"** | Lv1–10: **+5/level** (→50); Lv11–15: **+10/level** → **max +100 at Lv15**. Requires 5th job; only applies once you have an Arcane Symbol. |
| **Guild Skill "Special Power"** (Guild Lv5+) | **+30 Arcane Power** (flat, max level 1) — both Interactive and Heroic. Requires `A Greater Power` completed. |
| Event titles / buffs / Genesis Pass | variable, temporary |
| **Practical maximum** | **1,450** (1,320 + 100 + 30), excluding event stats |

Sources: hyper stat table https://maplestorywiki.net/w/Hyper_Stats ; guild skill https://maplestorywiki.net/w/Guild_Skills ; *"Maximum: 1450 (Excluded event stat such as Title or Event Buff)"* KPRobin sheet notes; also https://strategywiki.org/wiki/MapleStory/Arcane_River (*"Hyper Stats: +5~+100, Guild Skill: +15~+30"* — the guild figure is now a flat +30).

> ⚠️ StrategyWiki adds: *"arcane force not from arcane symbols is only applied to the penalties/advantages in arcane river maps and nothing else that uses arcane force"* — i.e. hyper-stat/guild AF does not feed anything that reads "Arcane Force from symbols" (such as the symbol→main-stat conversion). The Black Mage page similarly notes *"you can only bypass 1320 using the ARC Hyper Stat or the Guild Skill."* Sources: https://strategywiki.org/wiki/MapleStory/Arcane_River · https://maplestorywiki.net/w/Black_Mage/Monster

##### D.2 Sacred / Authentic Force — absolute-difference, linear

Let `d = YourSAC − RequiredSAC`.

**Published formula (StrategyWiki, https://strategywiki.org/wiki/MapleStory/Grandis):**
- *"For every **1** Authentic Force **below** required, you deal **1 %p lesser** final damage. (Max reduction of **95 %**)"*
- *"For every **2** Authentic Force **above** required, you deal **1 %p more** final damage, rounded down. (Max increase of **25 %**)"*
- *"Normal damage taken is increased to **1.5×** for having **1–50** Authentic Force below required, and increases to **2×** if it is even lower. Normal damage taken **cannot be reduced** further once the force requirement is met."*
- Overall range: *"final damage is adjusted to between **5 % and 125 %**… monster damage will hit between **100 % and 200 %**."*

```
if d >= 0:  dmgMult = 1.00 + min(floor(d / 2), 25) / 100      # cap 1.25 at d >= +50
else:       dmgMult = max(1.00 + d/100, 0.05)                 # floor 0.05 at d <= -95
takenMult = 1.0  if d >= 0 else (1.5 if d >= -50 else 2.0)
```

**Tier table (as published):**

| `d` = Your SAC − Required | Final damage dealt | Monster damage taken |
|---|---|---|
| ≤ −95 | **5 %** | 2× |
| −90 | 10 % | 2× |
| −80 | 20 % | 2× |
| −70 | 30 % | 2× |
| −60 | 40 % | 2× |
| −50 | 50 % | 1.5× |
| −40 | 60 % | 1.5× |
| −30 | 70 % | 1.5× |
| −20 | 80 % | 1.5× |
| −10 | 90 % | 1.5× |
| **0** | **100 %** | **1×** |
| +10 | 105 % | 1× |
| +20 | 110 % | 1× |
| +30 | 115 % | 1× |
| +40 | 120 % | 1× |
| **≥ +50** | **125 %** | 1× |

Sources: https://strategywiki.org/wiki/MapleStory/Grandis (full table, verbatim) — **independently confirmed** by the KPRobin sheet tab *"Authentic Force (New Age)"*, whose column headers read exactly `5%/200%, 10%/200%, 20%/200%, 30%/200%, 40%/200%, 50%/150%, 60%/150%, 70%/150%, 80%/150%, 90%/150%, 100%/100%, 105%/100%, 110%/100%, 115%/100%, 120%/100%, 125%/100%` with row labels `-95 below, -90, -80, -70, -60, -50, -40, -30, -20, -10, 0, 10, 20, 30, 40, 50 above`. https://docs.google.com/spreadsheets/d/1sJSM7iZDP9e4GRfhGvhfpnGWYVwh2AaeywUIhi4F4Ec/

**Third confirmation, in-game wording** (repeated verbatim on every Grandis boss page):
> *"You will deal **−10 % final damage for every 10 SAC / AUT below** the required amount; if you have **100 or more SAC / AUT below** the required amount, you will only deal a total of **5 %** final damage. Similarly, you will deal **+5 % final damage for every 10 SAC / AUT above** the required amount, **up to +25 % (50 above)**."*
Sources: https://maplestorywiki.net/w/Baldrix/Monster · https://maplestorywiki.net/w/Jupiter/Monster · https://maplestorywiki.net/w/Kaling/Monster · https://maplestorywiki.net/w/Limbo/Monster · https://maplestorywiki.net/w/Kalos/Monster · https://maplestorywiki.net/w/Seren/Monster · https://maplestorywiki.net/w/First_Adversary · https://maplestorywiki.net/w/Malefic_Star

###### Sacred Force sources and maximum
| Source | Amount |
|---|---|
| 6 Sacred Symbols @ Lv11 | 6 × 110 = **660** |
| 2 Grand Sacred Symbols @ Lv11 | 2 × 110 = **220** |
| Hyper Stat | **none exists** (https://maplestorywiki.net/w/Hyper_Stats) |
| Guild Skill | **none exists** (https://maplestorywiki.net/w/Guild_Skills) |
| Event totems / buffs | variable, temporary (e.g. GMS Arthur's Equipment Rental totems — https://maplestorywiki.net/w/MapleStory:_Crown) |
| **Practical maximum** | **880** |

> ⚠️ The KPRobin sheet note says *"Maximum: 770"* — that is **stale** (it predates Geardock's Grand Symbol). With both Grand symbols the ceiling is 880, which is exactly what the Geardock content demands (Gob's Workshop 810; +50 for max bonus = 860). Treat 880 as current.

###### D.2b Why the difference matters for a calculator
- Arcane Force: **being 10 AF short of a 1,320 requirement is harmless** (1,310/1,320 = 99 % → 80 % tier — actually a large cliff!). Careful: the tiers are coarse. 99 % of requirement = **80 % damage**. There is a hard cliff at exactly 100 %.
- Sacred Force: **being 10 SAC short costs exactly 10 % final damage** — smooth, linear, no cliff.
- Arcane over-cap: +50 % damage at 150 % of requirement (a *huge* multiplier, but usually unreachable at end-game: Black Mage needs 1,980 ARC for the 150 % tier vs a 1,450 ceiling).
- Sacred over-cap: only +25 % at +50 SAC — cheap and routinely achievable.

##### D.3 Arcane Force requirements — maps and bosses

All values below from the KPRobin sheet tab *"Arcane Force (New Age)"* (https://docs.google.com/spreadsheets/d/1sJSM7iZDP9e4GRfhGvhfpnGWYVwh2AaeywUIhi4F4Ec/), cross-checked against https://strategywiki.org/wiki/MapleStory/Arcane_River and the individual boss pages on maplestorywiki.net. `1.5×` = AF needed for the maximum 150 % tier (= `ceil(req × 1.5)` to the nearest 5).

###### Fields

| Region | Map | Req ARC | 110 % at | 130 % at | 150 % at |
|---|---|---|---|---|---|
| Vanishing Journey | Oblivion Lake | 30 | 35 | 40 | 45 |
| | Flame Zone of Extinction | 40 | 45 | 55 | 60 |
| | Cave of Rest | 60 | 70 | 80 | 90 |
| | Hidden Map | 80 | 90 | 105 | 120 |
| | Erda Spectrum (PQ) | 60 | 70 | 80 | 90 |
| Reverse City | Underground Railway / T-boy's Train | 40 | 45 | 55 | 60 |
| | Underground & Ground Train / M Tower | 60 | 70 | 80 | 90 |
| | Hidden Map | 100 | 110 | 130 | 150 |
| Chu Chu Island | Rainbow Garden / Slurp Forest | 100 | 110 | 130 | 150 |
| | Err Valley | 130 | 145 | 170 | 195 |
| | Mt. Sky Whale | 160 | 180 | 210 | 240 |
| | Hungry Muto (PQ) | 100 | 110 | 130 | 150 |
| Yum Yum Island | Mushbud Forest | 130 | 145 | 170 | 195 |
| | Illiyard Field / Fungus Forest | 160 | 180 | 210 | 240 |
| | Hidden Map | 190 | 210 | 250 | 285 |
| Lachelein | Back Alley | 190 | 210 | 250 | 285 |
| | Night Market / Ballroom | 210 | 235 | 275 | 315 |
| | Clock Tower | 240 | 265 | 315 | 360 |
| | Midnight Chaser (PQ) | 240 | 265 | 315 | 360 |
| Arcana | Forest Entrance | 280 | 310 | 365 | 420 |
| | Deep Forest | 320 | 355 | 420 | 480 |
| | Cave | 360 | 400 | 470 | 540 |
| Morass | Path to Coral Forest | 400 | 440 | 520 | 600 |
| | Nameless Cat / Brothers Zone | 440 | 485 | 575 | 660 |
| | Shadows Dance / Laboratory | 480 | 530 | 625 | 720 |
| | "Trueffet, That Day" | 520 | 575 | 680 | 780 |
| | Ranheim Defense (PQ) | 520 | 575 | 680 | 780 |
| Esfera | Where Life Begins | 560 | 620 | 730 | 840 |
| | Mirror-tinged Sea | 600 | 660 | 780 | 900 |
| | Mirrored Light Shrine | 640 | 705 | 835 | 960 |
| | Esfera Guardian (PQ) | 640 | 705 | 835 | 960 |
| Sellas / Celestars | Where the Light Last Touched | 600 | 660 | 780 | 900 |
| | Endlessly Plunging Abyss | 640 | 705 | 835 | 960 |
| | Where the Star was Engulfed | 670 | 740 | 875 | 1,005 |
| Moonbridge | Border of Ideas | 670 | 740 | 875 | 1,005 |
| | Mysterious Fog | 700 | 770 | 910 | 1,050 |
| | Waves of Void | 730 | 805 | 950 | 1,095 |
| Labyrinth of Suffering | Labyrinth of Suffering | 760 | 840 | 990 | 1,140 |
| | Central Area | 790 | 870 | 1,030 | 1,185 |
| | Deepest Area | 820 | 905 | 1,070 | 1,230 |
| Limina | The World's Tear | 850 | 935 | 1,105 | 1,275 |
| | Where the World Ends | 880 | 970 | 1,145 | 1,320 |
| | Hidden Map | **1,000** | 1,100 | 1,300 | 1,500 |
| Guild Castle | B2 Area 1 / Area 2 / Area 3 | 450 / 600 / 750 | 495/660/825 | 585/780/975 | 675/900/1,125 |
| Monster Park | (per Arcane region) | 30 / 100 / 190 / 280 / 400 / 560 / 600 / 670 / 760 / 850 | — | — | — |

###### Arcane River bosses

| Boss | Mode | Req ARC | +10 % from | +30 % from | +50 % from |
|---|---|---|---|---|---|
| **Lucid** | Story | 250 | 275 | 325 | 375 |
| | Easy / Normal / Hard | **360** | 396 | 468 | 540 |
| **Will** | Easy | **560** | 616 | 728 | 840 |
| | Normal / Hard | **760** | 836 | 988 | 1,140 |
| **Gloom** | Story / Normal / Chaos | **730** | 803 | 949 | 1,095 |
| **Verus Hilla** | Normal | **820** | 905 | 1,070 | 1,230 |
| | Hard | **900** | 990 | 1,170 | 1,350 |
| **Darknell** | Story / Normal / Hard | **850** | 935 | 1,105 | 1,275 |
| **Black Mage** | Story | **880** *(see §G)* | — | — | — |
| | Hard / Extreme | **1,320** | 1,452 | 1,716 | **1,980** (unreachable) |

Sources: https://maplestorywiki.net/w/Lucid/Monster · https://maplestorywiki.net/w/Will/Monster · https://maplestorywiki.net/w/Giant_Monster_Gloom · https://maplestorywiki.net/w/Hilla/Monster_(Reborn) · https://maplestorywiki.net/w/Guard_Captain_Darknell/Monster · https://maplestorywiki.net/w/Black_Mage/Monster

##### D.4 Sacred / Authentic Force requirements — maps and bosses

From the KPRobin sheet tab *"Authentic Force (New Age)"*, cross-checked against each region page on maplestorywiki.net. `Max bonus at` = requirement + 50.

###### Fields

| Region | Map | Req SAC | Max bonus (125 %) at |
|---|---|---|---|
| Cernium | Rocky Beach / West Castle Wall / East Castle Wall / Royal Library | **30** | 80 |
| Fallen (Burning) Cernium | Battle-ravaged W/E Castle Wall, Burning Royal Library | **50** | 100 |
| Hotel Arcus | Outlaws' Wasteland, Romantic Drive-in Theater | **70** | 120 |
| | Train With No Destination | **100** | 150 |
| Karote (Unstoppable Tower) | Lostspace (Story Mode) | **70** | 120 |
| Odium | Path to the Castle Gate | **130** | 180 |
| | Occupied Alley | **160** | 210 |
| | Sunny Laboratory | **180** | 230 |
| | Laboratory Behind the Locked Door | **200** | 250 |
| Shangri-La | Cherry Blossom Spring | **230** | 280 |
| | Orchid Green Summer | **260** | 310 |
| | Chrysanthemum Autumn | **280** | 330 |
| | Bamboo's Resting Winter | **300** | 350 |
| Arteria | Queen's Road | **330** | 380 |
| | Lower Level Corridor | **360** | 410 |
| | Upper Level Corridor | **400** | 450 |
| Dark/Black Sea | Temple of Delusions (Story) | **330** | 380 |
| Carcion | Coast | **430** | 480 |
| | Forest | **460** | 510 |
| | Cave & Ruins | **500** | 550 |
| **Tallahart** | Land of Ashes and Silence (Silent Ashlands) | **630** | 680 |
| | Battlefield of Destiny (Fate-Fields) | **660** | 710 |
| | Path of Night / Path of Illusion (Phantasmal Night Sanctum) | **700** | 750 |
| **Geardock** | Basement Area | **740** | 790 |
| | Robot Storage (Robot Depot) | **770** | 820 |
| | Gob's Workshop | **810** | 860 |
| Guild Castle | B3 Area 1 / Area 2 / Area 3 / Deepest | 70 / 230 / 430 / 430 | 120/280/480/480 |
| Monster Park | Cernium / Arcus / Odium / Shangri-La / Arteria / Carcion / Tallahart | 30 / 70 / 130 / 230 / 330 / 430 / 630 | +50 each |
| Epic Dungeon: High Mountain | Hunting Field / Boss & Tainus | 30 / 50 | 80 / 100 |
| Epic Dungeon: Angler Company | All stages | **130** | 180 |
| Epic Dungeon: Nightmare Paradise | All stages | **330** | 380 |

Tallahart/Geardock field values independently confirmed at https://maplestorywiki.net/w/Tallahart and https://maplestorywiki.net/w/Geardock. Cernium/Arcus/Odium/Shangri-La/Arteria/Carcion values confirmed at https://maplestorywiki.net/w/Cernium , /Hotel_Arcus , /Odium , /Shangri-La , /Arteria , /Carcion (each page states the per-section requirement in prose, plus the pre-*New Age* historical values).

###### Western Grandis bosses

| Boss | Mode | Req SAC | Max bonus (125 %) at |
|---|---|---|---|
| **Chosen Seren** | Normal / Hard / Extreme — **Phase 1** | **150** | 200 |
| | Normal / Hard / Extreme — **Phase 2** | **200** | 250 |
| **Kalos the Guardian** | Story | **70** | 120 |
| | Easy (P1/P2) | **200** | 250 |
| | Normal P1 | **250** | 300 |
| | Normal P2 | **300** | 350 |
| | Chaos (P1/P2) | **330** | 380 |
| | Extreme (P1/P2) | **440** | 490 |
| **The First Adversary** | Story | **100** | 150 |
| | Easy | **220** | 270 |
| | Normal | **320** | 370 |
| | Hard | **340** | 390 |
| | Extreme | **460** | 510 |
| **Kaling** | Story / Easy | **230** | 280 |
| | Normal | **330** | 380 |
| | Hard | **350** | 400 |
| | Extreme | **480** | 530 |
| **Malefic Star** | Story / Normal | **400** | 450 |
| | Hard | **550** | 600 |
| **Limbo** | Story | **400** | 450 |
| | Normal / Hard | **500** | 550 |
| **Baldrix** | Story | **500** | 550 |
| | Normal / Hard | **700** | 750 |
| **Jupiter** | Story | **610** | 660 |
| | Normal / Hard | **810** | **860** |

Sources: https://maplestorywiki.net/w/Seren/Monster · https://maplestorywiki.net/w/Kalos/Monster · https://maplestorywiki.net/w/First_Adversary · https://maplestorywiki.net/w/Kaling/Monster · https://maplestorywiki.net/w/Malefic_Star · https://maplestorywiki.net/w/Limbo/Monster · https://maplestorywiki.net/w/Baldrix/Monster · https://maplestorywiki.net/w/Jupiter/Monster — all cross-checked against the KPRobin sheet (which lacks Baldrix; Baldrix values come from the wiki only).

> Note the design intent quoted on the Kaling page: *"Unlike earlier-introduced Grandis bosses (Seren and Kalos), which required high amount of Sacred Power (200 and 300 respectively) in order to deal normal damage as a mean to reduce power creep, Kaling was released with 330 SAC…"* https://maplestorywiki.net/w/Kaling/Monster

---

#### E. GMS-SPECIFIC STATE AS OF 2026-09-06 (read this before coding)

1. **GMS is 3 days away from the symbol-rate buff.** Every maplestorywiki daily-quest page currently reads `x N (M in Non-GMS)`. Build the calculator with a **server/patch toggle**, defaulting to whichever you need:
   - *GMS pre-2026-09-09*: Arcane daily 20 (VJ/ChuChu 10 pre-side-area), Arcane weekly 40×3, Sacred daily 10 (Cernium 20), Grand daily 10.
   - *GMS post-2026-09-09 / KMS / other regions*: Arcane daily 40 (20 pre-side-area), Arcane weekly 80×3, Sacred daily 15 (Cernium 30), Grand daily 15.
   - *Post-Overdrive (GMS "Fall 2026", Sept 17 / Oct / Nov 19 2026)*: Arcane weekly becomes 240 × **1** clear/week; daily kill requirement flattened to 100/area.
2. **The Mentor/Mentorship free-leveling column on the wiki does NOT apply to GMS.** Never zero out meso costs for a GMS calc.
3. **Geardock and its Grand Sacred Symbol ARE live in GMS** (Ride The Lightning Part 2). Source: https://maplestorywiki.net/w/MapleStory:_Crown (GMS section, *"2nd: Kinesis Redux, Geardock, and Jupiter"*).
4. Only GMS uses "Sacred"; if you localise, map to "Authentic" for MSEA/KMS/JMS/TMS.

---

#### F. CONSOLIDATED FORMULA SHEET (implementation-ready)

```python
# ---------- ARCANE ----------
ARC_MAX_LEVEL = 20
ARC_MESO_BASE = {  # B in 10,000 * floor((L^2+11) * (B + 0.1*L))
    "vanishing_journey": 8,  "chu_chu_island": 10, "lachelein": 12,
    "arcana": 14,            "morass": 16,         "esfera": 18,
}
def arc_symbols_to_next(L):       return L*L + 11                       # L = current level, 1..19
def arc_meso_to_next(L, region):  b10 = 10*ARC_MESO_BASE[region]
                                  return 10_000 * ((arc_symbols_to_next(L) * (b10 + L)) // 10)
def arc_force(L):                 return 20 + 10*L                      # 30..220
def arc_main_stat(L):             return 200 + 100*L                    # 300..2200
def arc_da_hp(L):                 return 4_200 + 2_100*L
def arc_xenon_each(L):            return 96 + 48*L

ARC_TIERS = [  # (min % of requirement, dmg_dealt_mult, dmg_taken_mult)
    (150, 1.50, 0.00), (130, 1.30, 0.40), (110, 1.10, 0.80), (100, 1.00, 1.00),
    ( 70, 0.80, 1.40), ( 50, 0.70, 1.60), ( 30, 0.60, 1.80), ( 10, 0.30, 2.40),
    (  0, 0.10, 2.80),
]
def arc_multipliers(your_arc, required_arc):
    pct = (your_arc * 100) // required_arc
    for lo, dealt, taken in ARC_TIERS:
        if pct >= lo: return dealt, taken     # `taken` is ignored on boss maps

# ---------- SACRED / AUTHENTIC (incl. GRAND) ----------
SAC_MAX_LEVEL = 11
SAC_MESO_BASE = {
    "cernium": 13.2, "arcus": 15.0, "odium": 16.8, "shangri_la": 18.6,
    "arteria": 20.4, "carcion": 22.2,
    "grand_tallahart": 39.8, "grand_geardock": 48.8,
}
def sac_symbols_to_next(L):       return 9*L*L + 20*L                   # L = 1..10
def sac_meso_to_next(L, region):  b10 = round(10*SAC_MESO_BASE[region])
                                  return 100_000 * ((sac_symbols_to_next(L) * (b10 - 6*L)) // 10)
def sac_force(L):                 return 10*L                           # 10..110 (same for Grand)
def sac_main_stat(L):             return 300 + 200*L                    # 500..2500 (NOT for Grand)
def sac_da_hp(L):                 return 6_300 + 4_200*L
def sac_xenon_each(L):            return 144 + 96*L
def grand_exp_pct(L):             return 6 + 4*L                        # 10..50
def grand_meso_pct(L):            return 4 + L                          # 5..15
def grand_drop_pct(L):            return 4 + L                          # 5..15

def sac_multipliers(your_sac, required_sac):
    d = your_sac - required_sac
    if d >= 0: dealt = 1.00 + min(d // 2, 25) / 100.0                   # cap 1.25 at +50
    else:      dealt = max(1.00 + d / 100.0, 0.05)                      # floor 0.05 at -95
    taken = 1.0 if d >= 0 else (1.5 if d >= -50 else 2.0)               # ignored on boss maps
    return dealt, taken
```

Totals to hard-code:
- Arcane: 2,679 symbols/region to Lv20; 16,074 for all six; 2,318,520,000 mesos total; **1,320 AF**, **13,200 main stat**.
- Sacred: 4,565 symbols/region to Lv11; 27,390 for six; 35,905,500,000 mesos; **660 SAC**, **15,000 main stat**, **+60 % EXP**, **+120 % boss damage spread across 6 bosses**.
- Grand Sacred: 4,565 each; 9,130 for two; 36,254,100,000 mesos; **+220 SAC**, **+100 % EXP**, **+30 % meso**, **+30 % drop**.
- Ceilings: **ARC 1,450** (1,320 + 100 hyper + 30 guild); **SAC 880** (symbols only).

---

#### G. DISAGREEMENTS, GAPS AND UNVERIFIED ITEMS

| # | Item | Status |
|---|---|---|
| 1 | **Black Mage Story Mode Arcane Force** | **CONFLICT.** maplestorywiki says **880** (https://maplestorywiki.net/w/Black_Mage/Monster); the KPRobin sheet says **800**. Both are current-looking sources. Treat as **UNVERIFIED**; 880 is more likely (the wiki tracks GMS tooltips), but confirm in game. |
| 2 | **Arcane weekly Special Content reward = 40** | StrategyWiki says **15**; six maplestorywiki content pages all say **40**. StrategyWiki is stale/MSEA-era. Use **40**. |
| 3 | **KPRobin "Maximum Authentic Force: 770"** | **Stale.** Predates Geardock. Correct current ceiling is **880**. |
| 4 | **Guild Skill "Special Power" AF value** | maplestorywiki lists a flat **+30** (max level 1). StrategyWiki says "+15~+30" (multi-level). The single-level +30 is the current form; the range is historical. |
| 5 | **Exact behaviour of the SAC "5 %" floor between −90 and −95** | The published tables list rows at −90 (10 %) and "−95 or less" (5 %). Since SAC only moves in increments of 10, `d = −95` is not reachable in practice; the linear formula `1 %p per 1 SAC` covers it. Non-issue for a calculator, but the exact clamp point is technically **UNVERIFIED**. |
| 6 | **Whether Arcane Force from hyper stat / guild counts toward the symbol→stat conversion** | StrategyWiki says non-symbol AF *"is only applied to the penalties/advantages in arcane river maps"*. Consistent with the tooltips (main stat is a symbol-level property, not an AF-derived one), so the answer is clearly *no*, but there is no single authoritative primary statement. |
| 7 | **Baldrix requirement absent from the KPRobin sheet** | Only maplestorywiki (Story 500, Normal/Hard 700) documents it. Single-source. |
| 8 | **Whether GMS's 2026-09-09 update definitely ships the symbol-rate buff** | The wiki plans it under *Post-Ride The Lightning* and the daily-quest pages pre-annotate the Non-GMS numbers, but as of 2026-09-06 it has not shipped in GMS. Verify after 2026-09-09. |
| 9 | **Nexon official GMS patch notes** | Could not be retrieved directly — `nexon.com/maplestory/news/*` is a client-rendered SPA that returns an empty shell to fetchers, and the WebSearch budget was exhausted. Every GMS-specific claim above rests on maplestorywiki's GMS/regional annotations rather than a first-party Nexon page. |
| 10 | **Per-class specials beyond Xenon / Demon Avenger** | None found. Kanna, Kinesis, Zero, Adele, Khali etc. all use the plain "Main Stat" line — the tooltips only carve out Demon Avenger (HP) and Xenon (STR/DEX/LUK). Verified across all 6 Arcane, all 6 Sacred and both Grand Sacred item pages. |
| 11 | **Symbol growth/"EXP" carry-over exact rounding on Arcane Catalyst** | StrategyWiki publishes the full conversion table ("total symbol EXP reduces to 80 % of original, rounded up") but no primary source; single-source. |

---

##### Appendix: complete source list

- https://maplestorywiki.net/w/Arcane_Symbol
- https://maplestorywiki.net/w/Arcane_Symbol_(Equipment)
- https://maplestorywiki.net/w/Arcane_Symbol:_Vanishing_Journey
- https://maplestorywiki.net/w/Arcane_Symbol:_Chu_Chu_Island
- https://maplestorywiki.net/w/Arcane_Symbol:_Lachelein
- https://maplestorywiki.net/w/Arcane_Symbol:_Arcana
- https://maplestorywiki.net/w/Arcane_Symbol:_Morass
- https://maplestorywiki.net/w/Arcane_Symbol:_Esfera
- https://maplestorywiki.net/w/Sacred_Symbol
- https://maplestorywiki.net/w/Sacred_Symbol:_Cernium
- https://maplestorywiki.net/w/Sacred_Symbol:_Arcus
- https://maplestorywiki.net/w/Sacred_Symbol:_Odium
- https://maplestorywiki.net/w/Sacred_Symbol:_Shangri-La
- https://maplestorywiki.net/w/Sacred_Symbol:_Arteria
- https://maplestorywiki.net/w/Sacred_Symbol:_Carcion
- https://maplestorywiki.net/w/Grand_Sacred_Symbol
- https://maplestorywiki.net/w/Grand_Sacred_Symbol:_Tallahart
- https://maplestorywiki.net/w/Grand_Sacred_Symbol:_Geardock
- https://maplestorywiki.net/w/Arcane_River
- https://maplestorywiki.net/w/Western_Grandis
- https://maplestorywiki.net/w/Cernium · /Hotel_Arcus · /Odium · /Shangri-La · /Arteria · /Carcion · /Tallahart · /Geardock
- https://maplestorywiki.net/w/Erda_Spectrum · /Hungry_Muto · /Midnight_Chaser · /Spirit_Savior · /Ranheim_Defense · /Esfera_Guardian
- https://maplestorywiki.net/w/Symbol_Express_Pass
- https://maplestorywiki.net/w/Hyper_Stats
- https://maplestorywiki.net/w/Guild_Skills
- Daily quest pages: https://maplestorywiki.net/w/(Daily_Quest)_Vanishing_Journey_Research and the 12 sibling pages named in §A.5/§B.4/§C.3
- Boss pages: https://maplestorywiki.net/w/Lucid/Monster · /Will/Monster · /Giant_Monster_Gloom · /Hilla/Monster_(Reborn) · /Guard_Captain_Darknell/Monster · /Black_Mage/Monster · /Seren/Monster · /Kalos/Monster · /First_Adversary · /Kaling/Monster · /Malefic_Star · /Limbo/Monster · /Baldrix/Monster · /Jupiter/Monster
- Update pages: https://maplestorywiki.net/w/MapleStory:_Crown · /MapleStory:_Crown/Post-Update · /MapleStory:_Overdrive · /MapleStory:_Milestone
- https://strategywiki.org/wiki/MapleStory/Arcane_River
- https://strategywiki.org/wiki/MapleStory/Grandis
- https://kprobin.blogspot.com/2019/01/arcane-force-extra-damage-and-monster.html → https://docs.google.com/spreadsheets/d/1sJSM7iZDP9e4GRfhGvhfpnGWYVwh2AaeywUIhi4F4Ec/
- https://orangemushroom.net/2026/02/14/kms-ver-1-2-412-maplestory-crown-geardrak-jupiter-guild-castle/
- https://orangemushroom.net/2026/03/23/kms-ver-1-2-413-maplestorys-23rd-anniversary-maple-attack/
- https://grandislibrary.com/content/stat-terms
- Third-party calculators for cross-checking: https://whackybeanz.com/calc/symbols · https://maplesymbols.com/

---


### 4. Inner Ability and Link Skills

> Researched independently, primarily against Nexon Korea's own published probability-disclosure pages and per-skill MapleStory Wiki pages (GMS v270).

**Research date:** 2026-09-06
**Game version context:** GMS is on **v270** (the MapleStory Wiki tags current skill data as "GMS v270"; Grandis Library's Link Skill page footer says "GMS Ver. 269"). KMS is on ver. 1.2.416+ (*Overdrive*, July 2026).
Sources: [maplestorywiki.net/w/Guiding_Stars](https://maplestorywiki.net/w/Guiding_Stars) (shows "GMS v270"), [grandislibrary.com/content/link-skills](https://grandislibrary.com/content/link-skills) (footer "GMS Ver. 269").

**Method note:** every number below carries an inline source URL. Where two reputable sources disagree, both are cited and the disagreement is flagged. Anything I could not confirm against a primary/authoritative source is marked **UNVERIFIED**.

---

#### PART A — INNER ABILITY ("Ability")

##### A1. Basics

| Fact | Value | Source |
|---|---|---|
| In-game name | "Ability" (wiki also uses Inner Ability / Inner Potential) | [MSW Inner Ability](https://maplestorywiki.net/w/Inner_Ability) |
| Unlocked at | Character level 50 (auto-unlocks the panel); quest "The Eye Opener / Awakening Abilities" from Maple Administrator | [MSW](https://maplestorywiki.net/w/Inner_Ability), [StrategyWiki](https://strategywiki.org/wiki/MapleStory/Inner_Ability) |
| Number of lines | 3 | [MSW](https://maplestorywiki.net/w/Inner_Ability) |
| Presets | 3 presets, switchable; all start at the default stat set | [MSW](https://maplestorywiki.net/w/Inner_Ability) |
| Starting state (new characters) | **Epic**, total All Stats +25 | [MSW](https://maplestorywiki.net/w/Inner_Ability) |
| Starting state (older characters) | **Rare**, total All Stats +9 (default lines were Final All Stat +1 / +3 / +5) | [MSW](https://maplestorywiki.net/w/Inner_Ability), [StrategyWiki](https://strategywiki.org/wiki/MapleStory/Inner_Ability) |
| Duplicate lines | You can never roll two lines with the exact same stat, even at different ranks | [MSW](https://maplestorywiki.net/w/Inner_Ability) |
| Total distinct lines | 45 total (31 available at Rare, 34 at Epic, 40 at Unique, 43 at Legendary) | [StrategyWiki](https://strategywiki.org/wiki/MapleStory/Inner_Ability) — *last edited May 2023, but the official KMS line list has not changed; see A7* |

###### Tiers
Rare → Epic → Unique → Legendary. Resets **cannot lower** your rank. Rare and Epic lines **cannot be locked**; locking any line also locks the overall rank (and therefore prevents a rank-up that reset). ([MSW](https://maplestorywiki.net/w/Inner_Ability))

##### A2. Honor EXP costs and rank-up probability

**Reset cost + rank-up chance (Honor EXP reset, no locks):**

| Current rank | Honor EXP (no lock) | Honor EXP (rank + 1 line locked) | Honor EXP (rank + 2 lines locked) | Chance to rank up |
|---|---|---|---|---|
| Rare | 100 | n/a (cannot lock) | n/a | **100.00%** (Rare→Epic) |
| Epic | 200 | n/a (cannot lock) | n/a | **2.00%** (Epic→Unique) |
| Unique | 1,500 | 3,000 | 5,500 | **1.00%** (Unique→Legendary) |
| Legendary | 8,000 | 11,000 | 16,000 | — (max) |

Sources: costs + rates [MSW Inner Ability](https://maplestorywiki.net/w/Inner_Ability); rates confirmed against the **official KMS probability disclosure page** [maplestory.nexon.com/Guide/OtherProbability/ability/reputevalue](https://maplestory.nexon.com/Guide/OtherProbability/ability/reputevalue) (레어→에픽 100.00% / 에픽→유니크 2.00% / 유니크→레전드리 1.00%). That page's own changelog states it was last synced to the **2026/6/18 KMS update** (reflected 2026-07-10), so these are current numbers.

> ⚠️ **Source disagreement:** [StrategyWiki](https://strategywiki.org/wiki/MapleStory/Inner_Ability) lists Rare→Epic as **5%**, Epic→Unique 2%, Unique→Legendary 1%. StrategyWiki's page was last edited **14 May 2023** and predates the change that made Rare→Epic guaranteed. Use **100%** for Rare→Epic.

**Event discount:** Ability reset costs are halved during certain events (e.g. the recurring "50% discount on Ability reset costs" Sunday Maple benefit). ([Orange Mushroom, KMS 1.2.410](https://orangemushroom.net/2025/12/28/kms-ver-1-2-410-maplestory-crown-kinesis-remaster/))

**Honor EXP cap:** 9,999,999. Above 9,000,000 you can no longer *consume* Honor medals (but drops/level-ups still credit up to the cap). ([StrategyWiki](https://strategywiki.org/wiki/MapleStory/Inner_Ability))

**Main Honor EXP sources** ([StrategyWiki](https://strategywiki.org/wiki/MapleStory/Inner_Ability)):
- Medal of Honor drop (monsters ±20 levels, character Lv.50+): **10** Honor each
- Boss Medal of Honor (most raid bosses): **150** each
- Large Boss Medal of Honor (chance from Normal Lotus/Damien and above): **5,000**
- Event Medal of Honor (events / Dojo / Ursus): usually **10,000**
- The Seed Medal of Honor (Tower of Oz clear): **100**
- Level up: **700** Honor per level starting at Lv.49, +100 more every 10 levels (Zero only from Lv.100)
- Fairy Bros' Daily Gift days 9 and 23: **10,000** each
- Bounty Hunter pouches: Basic **500** / Intermediate **1,000** / Advanced **2,000** (chance)
- Blockbusters (Black Heaven, Heroes of Maple), Monster Park on Thu/Sat

##### A3. Circulators

| Circulator | Effect | Usable on | Where | Source |
|---|---|---|---|---|
| **Chaos Circulator** | Rerolls the *numeric values* of all 3 lines; keeps rank and stat types | Unique & Legendary only | Events / event shops | [MSW Circulator](https://maplestorywiki.net/w/Circulator) |
| **Black Circulator** | Same as Chaos, but you may **decline** the result (all-3 or nothing) | Unique & Legendary only | Events / event shops | [MSW Circulator](https://maplestorywiki.net/w/Circulator) |
| **Unique Circulator** | Force-sets Ability to **Unique**, rerolls all 3 lines | Rare & Epic only | Golden Apple (low chance), events; tradable | [MSW Circulator](https://maplestorywiki.net/w/Circulator) |
| **Legendary Circulator** | Force-sets Ability to **Legendary**, rerolls all 3 lines | Rare / Epic / Unique | Events / event shops (e.g. 2,000 coins, limit 3) | [MSW Circulator](https://maplestorywiki.net/w/Circulator), [OM Crown](https://orangemushroom.net/2025/12/28/kms-ver-1-2-410-maplestory-crown-kinesis-remaster/) |
| **Miracle Circulator** | Reroll with better rank-up odds; **always rolls the maximum value** for each line's rank. Cannot lock lines. Can decline the result (all-3 or nothing); if the rank went up you must accept to keep it. | Epic or higher | Cash Shop: **1,900 NX/RP** (Interactive) or **19,000,000 mesos** (Heroic/Reboot) | [MSW Circulator](https://maplestorywiki.net/w/Circulator) |
| **Hyper Circulator / Hyper Miracle Circulator** | Miracle + a chance the **2nd line matches the overall rank** (incl. a 1% chance of a 2nd Legendary line) | Epic or higher | **TMS and MapleSEA only**, Cash Shop ~6,000 Cash, periodic | [MSW Circulator](https://maplestorywiki.net/w/Circulator), [MSW Inner Ability](https://maplestorywiki.net/w/Inner_Ability) |
| **Change Circulator** | Converts one specific Legendary-rank line into a different specific line (see A6) | **Legendary only** | KMS *Crown* (Dec 2025) Kinesis-remaster compensation item only — **not a general item** | [OM Crown](https://orangemushroom.net/2025/12/28/kms-ver-1-2-410-maplestory-crown-kinesis-remaster/) |

**Miracle Circulator rank-up rates (official KMS):** Epic→Unique **30.00%**, Unique→Legendary **10.00%**. ([maplestory.nexon.com/.../miraclecirculator](https://maplestory.nexon.com/Guide/OtherProbability/ability/miraclecirculator))

##### A4. Which line gets which rank (first line vs 2nd/3rd line)

This is the single most important mechanic for a calculator: **only the 1st line can be your Ability's full rank.** Lines 2 and 3 are capped one rank below.

**Official KMS table** ([reputevalue](https://maplestory.nexon.com/Guide/OtherProbability/ability/reputevalue)), identical on [MSW](https://maplestorywiki.net/w/Inner_Ability):

| Line | Ability = Epic | Ability = Unique | Ability = Legendary |
|---|---|---|---|
| **1st line** | Epic 100% | Unique 100% | **Legendary 100%** |
| **2nd line** | Rare 100% | Rare 70% / Epic 30% | Epic 85% / Unique 15% |
| **3rd line** | Rare 100% | Rare 70% / Epic 30% | Epic 85% / Unique 15% |

The same table applies to Miracle Circulator rolls ([miraclecirculator](https://maplestory.nexon.com/Guide/OtherProbability/ability/miraclecirculator)).

**Hyper Circulator (TMS/MSEA) 2nd/3rd line ranks** ([MSW](https://maplestorywiki.net/w/Inner_Ability), sourced to the TMS official site):

| Line | Ability = Epic | Ability = Unique | Ability = Legendary |
|---|---|---|---|
| 1st | Epic 100% | Unique 100% | Legendary 100% |
| 2nd | Rare 70% / Epic 30% | Epic 85% / Unique 15% | Epic 79% / Unique 20% / **Legendary 1%** |
| 3rd | Rare 100% | Rare 70% / Epic 30% | Epic 85% / Unique 15% |

> ⚠️ **Source disagreement:** [StrategyWiki](https://strategywiki.org/wiki/MapleStory/Inner_Ability) gives 2nd/3rd-line ranks at Legendary as **Rare 50% / Epic 40% / Unique 10%**, and at Unique as Rare 70% / Epic 30%. StrategyWiki was last edited 2023-05-14; the current official KMS page says **Epic 85% / Unique 15%**. Trust the official page.

**Legacy characters:** for characters whose Ability was rolled before the Unlimited/Unleashed/Season 2 update, a *theoretical* 2nd/3rd line can hold the top rank (it just displays first because display order is by descending rank). Locking such a line and resetting keeps it treated as a 2nd/3rd line — meaning those accounts can hold **more than one Legendary line**. ([StrategyWiki](https://strategywiki.org/wiki/MapleStory/Inner_Ability))

###### First-line-only vs. second/third-line-only (derived, and important)

Because lines 2 and 3 max out at **Unique** when your Ability is Legendary, **every Legendary-exclusive line is first-line-only in practice**:

**Legendary-exclusive ⇒ 1st line only:**
- Attack Speed +1
- Passive Skill Level +1
- Number of enemies hit by multi-target skills +1
- Attack Power +1 per X levels
- Magic Attack +1 per X levels

**Unique-and-above lines** (can appear on line 1 at Unique/Legendary, and on lines 2/3 **only when your Ability is Legendary**, at Unique values):
- Boss Damage %
- Max HP % / Max MP %
- Final damage + % of DEF ("DEF to damage conversion")
- % chance to skip cooldowns
- DEF % (Chaos/Black Circulator only)

**Effectively 2nd/3rd-line-only at Legendary:** Jump and Movement Speed — they have **no Legendary value** at all, so at Legendary rank they cannot be the 1st line but can still show up on lines 2/3 (which roll Epic/Unique).

Everything else (stats, All Stat, HP/MP flat, ATT/MATT, Crit Rate, Buff Duration, Drop, Meso, normal/abnormal-monster damage, AP-conversion lines, flat DEF) exists at multiple ranks and can appear on any line.

Source for tier availability of each line: the official KMS type-probability table ([reputevalue](https://maplestory.nexon.com/Guide/OtherProbability/ability/reputevalue)), mirrored at [MSW](https://maplestorywiki.net/w/Inner_Ability).

##### A5. THE FULL LINE LIST — value ranges per tier

All values below are from the **official KMS probability disclosure** table 「어빌리티 옵션 수치 설정 확률」 ([reputevalue](https://maplestory.nexon.com/Guide/OtherProbability/ability/reputevalue)), cross-checked against [MSW Inner Ability](https://maplestorywiki.net/w/Inner_Ability). `—` = not obtainable at that rank.

###### A5.1 Value tables (with per-value roll chance on an Honor reset)

**Single stat (STR / DEX / INT / LUK) and dual-stat lines.** Dual-stat lines are written `A (B)` = +A to the first stat, +B to the second. The 12 dual-stat lines are STR,DEX / STR,INT / STR,LUK / DEX,INT / DEX,LUK / INT,LUK / DEX,STR / INT,STR / LUK,STR / INT,DEX / LUK,DEX / LUK,INT.

| Chance | Rare | Epic | Unique | Legendary |
|---|---|---|---|---|
| 20% | 5 (3) | 15 (8) | 25 (13) | 35 (18) |
| 20% | 6 (3) | 16 (8) | 26 (13) | 36 (18) |
| 20% | 7 (4) | 17 (9) | 27 (14) | 37 (19) |
| 15% | 8 (4) | 18 (9) | 28 (14) | 38 (19) |
| 15% | 9 (5) | 19 (10) | 29 (15) | 39 (20) |
| 10% | **10 (5)** | **20 (10)** | **30 (15)** | **40 (20)** |

**All Stats (flat)** — note this is a *flat* All Stat bonus, not a % line:

| Chance | Rare | Epic | Unique | Legendary |
|---|---|---|---|---|
| 20% | 5 | 15 | 25 | 35 |
| 20% | 6 | 16 | 26 | 36 |
| 20% | 7 | 17 | 27 | 37 |
| 15% | 8 | 18 | 28 | 38 |
| 15% | 9 | 19 | 29 | 39 |
| 10% | **10** | **20** | **30** | **40** |

**Max HP / Max MP (flat)**

| Chance | Rare | Epic | Unique | Legendary |
|---|---|---|---|---|
| 20% | 75 | 225 | 375 | 525 |
| 20% | 90 | 240 | 390 | 540 |
| 20% | 105 | 255 | 405 | 555 |
| 15% | 120 | 270 | 420 | 570 |
| 15% | 135 | 285 | 435 | 585 |
| 10% | **150** | **300** | **450** | **600** |

**Attack Power / Magic Attack (flat)** — *Note: [MSW](https://maplestorywiki.net/w/Inner_Ability) labels the second of these rows "Damage"; the official KMS page shows 공격력 증가 (Attack) and **마력 증가 (Magic Attack)**. MSW's "Damage" row is a mistranslation of Magic Attack.*

| Chance | Rare | Epic | Unique | Legendary |
|---|---|---|---|---|
| 20% | — | 6 | 15 | 27 |
| 20% | — | 6 | 18 | 27 |
| 20% | — | 9 | 18 | 27 |
| 15% | — | 9 | 18 | 30 |
| 15% | — | 9 | 21 | 30 |
| 10% | — | **12** | **21** | **30** |

**Critical Rate %**

| Chance | Rare | Epic | Unique | Legendary |
|---|---|---|---|---|
| 20% | — | 5 | 15 | 25 |
| 20% | — | 6 | 16 | 26 |
| 20% | — | 7 | 17 | 27 |
| 15% | — | 8 | 18 | 28 |
| 15% | — | 9 | 19 | 29 |
| 10% | — | **10** | **20** | **30** |

**Boss Damage % / Max HP % / Max MP % / DEF %** (DEF % appears only via Chaos or Black Circulator, per [MSW](https://maplestorywiki.net/w/Inner_Ability))

| Chance | Rare | Epic | Unique | Legendary |
|---|---|---|---|---|
| 20% | — | — | 5 | 15 |
| 20% | — | — | 6 | 16 |
| 20% | — | — | 7 | 17 |
| 15% | — | — | 8 | 18 |
| 15% | — | — | 9 | 19 |
| 10% | — | — | **10** | **20** |

**% chance to skip cooldowns** (identical spread)

| Chance | Rare | Epic | Unique | Legendary |
|---|---|---|---|---|
| 20% | — | — | 5 | 15 |
| 20% | — | — | 6 | 16 |
| 20% | — | — | 7 | 17 |
| 15% | — | — | 8 | 18 |
| 15% | — | — | 9 | 19 |
| 10% | — | — | **10** | **20** |

**Buff skill duration %**

| Chance | Rare | Epic | Unique | Legendary |
|---|---|---|---|---|
| 20% | 7 | 19 | 32 | 44 |
| 20% | 8 | 20 | 33 | 45 |
| 20% | 9 | 22 | 34 | 47 |
| 15% | 10 | 23 | 35 | 48 |
| 15% | 12 | 24 | 37 | 49 |
| 10% | **13** | **25** | **38** | **50** |

**Item Drop Rate % / Meso Obtained %**

| Chance | Rare | Epic | Unique | Legendary |
|---|---|---|---|---|
| 20% | 3 | 8 | 13 | 18 |
| 20% | 3 | 8 | 13 | 18 |
| 20% | 4 | 9 | 14 | 19 |
| 15% | 4 | 9 | 14 | 19 |
| 15% | 5 | 10 | 15 | 20 |
| 10% | **5** | **10** | **15** | **20** |

**Damage to normal monsters % / Damage to abnormal-status monsters % / "% of AP invested in X added to Y"**

| Chance | Rare | Epic | Unique | Legendary |
|---|---|---|---|---|
| 20% | 2 | 4 | 7 | 9 |
| 20% | 2 | 4 | 7 | 9 |
| 20% | 2 | 5 | 7 | 10 |
| 15% | 2 | 5 | 7 | 10 |
| 15% | 3 | 5 | 8 | 10 |
| 10% | **3** | **5** | **8** | **10** |

*(The four AP-conversion lines are: % of AP invested in STR added to DEX; DEX→STR; INT→LUK; LUK→DEX.)*

**Final damage + % of DEF ("방어력의 % 만큼 데미지 고정값 증가")**

| Chance | Rare | Epic | Unique | Legendary |
|---|---|---|---|---|
| 20% | — | — | 13 | 38 |
| 20% | — | — | 15 | 40 |
| 20% | — | — | 18 | 43 |
| 15% | — | — | 20 | 45 |
| 15% | — | — | 23 | 48 |
| 10% | — | — | **25** | **50** |

Mechanic: adds a *flat* damage number equal to `DEF × rate`, e.g. 5,000 DEF × 25% = +1,250 raw damage per line. Essentially worthless at endgame. ([StrategyWiki](https://strategywiki.org/wiki/MapleStory/Inner_Ability))

**DEF increase (flat)** — only appears via Chaos/Black Circulator

| Chance | Rare | Epic | Unique | Legendary |
|---|---|---|---|---|
| 20% | 50 | 150 | 250 | 350 |
| 20% | 60 | 160 | 260 | 360 |
| 20% | 70 | 170 | 270 | 370 |
| 15% | 80 | 180 | 280 | 380 |
| 15% | 90 | 190 | 290 | 390 |
| 10% | **100** | **200** | **300** | **400** |

**Jump / Movement Speed**

| Chance | Rare | Epic | Unique | Legendary |
|---|---|---|---|---|
| 20% | 4 | 10 | 18 | — |
| 20% | 4 | 12 | 18 | — |
| 20% | 6 | 12 | 18 | — |
| 15% | 6 | 12 | 20 | — |
| 15% | 6 | 14 | 20 | — |
| 10% | **8** | **14** | **20** | — |

**Attack Power +1 per X levels** (Legendary only — *lower X is better*)

| Chance | X (levels) |
|---|---|
| 20% | 16 |
| 40% | 14 |
| 30% | 12 |
| 10% | **10** |

**Magic Attack +1 per X levels** (Legendary only) — identical distribution: 16 (20%), 14 (40%), 12 (30%), **10 (10%)**.

At level 300 with X=10 that is +30 ATT/MATT; at X=16 it is +18. Note MSW's table and the raw official table both list six 20/20/20/15/15/10 rows collapsing to `16, 14, 14, 12, 12, 10`, which is why the aggregate is 16:20% / 14:40% / 12:30% / 10:10%.

**Attack Speed +1 / Passive Skill Level +1 / Multi-target enemy count +1** — Legendary only, value is always **1** (100%).

###### A5.2 Legendary-tier maximum per line (quick reference for a calculator)

| Line | Legendary max | 2nd/3rd-line max (Unique) |
|---|---|---|
| Attack Speed +1 stage | **1** | not obtainable |
| Passive Skill Level +1 | **1** | not obtainable |
| Multi-target enemy count +1 | **1** | not obtainable |
| Attack Power +1 per X levels | **every 10 levels** | not obtainable |
| Magic Attack +1 per X levels | **every 10 levels** | not obtainable |
| Boss Damage % | **20%** | 10% |
| Buff Duration % | **50%** | 38% |
| Critical Rate % | **30%** | 20% |
| Attack Power (flat) | **30** | 21 |
| Magic Attack (flat) | **30** | 21 |
| Single main stat (STR/DEX/INT/LUK) | **40** | 30 |
| Dual stat (A/B) | **40 / 20** | 30 / 15 |
| All Stats (flat) | **40** | 30 |
| Max HP % / Max MP % | **20%** | 10% |
| Max HP / Max MP (flat) | **600** | 450 |
| % chance to skip cooldown | **20%** | 10% |
| Item Drop Rate % | **20%** | 15% |
| Meso Obtained % | **20%** | 15% |
| Damage to normal monsters % | **10%** | 8% |
| Damage to abnormal-status monsters % | **10%** | 8% |
| AP-conversion (X% of AP in A → B) | **10%** | 8% |
| Final damage + % of DEF | **50%** | 25% |
| DEF (flat, circulator-only) | **400** | 300 |
| DEF % (circulator-only) | **20%** | 10% |
| Jump / Movement Speed | not obtainable | 20 |

Source for the entire table: [official KMS ability probability page](https://maplestory.nexon.com/Guide/OtherProbability/ability/reputevalue) and [MSW Inner Ability](https://maplestorywiki.net/w/Inner_Ability).

###### A5.3 Line-type roll probabilities (Honor reset, 1st line)

From the official KMS type table ([reputevalue](https://maplestory.nexon.com/Guide/OtherProbability/ability/reputevalue)); MSW mirrors these exactly.

| Line type | Rare | Epic | Unique | Legendary |
|---|---|---|---|---|
| STR / DEX / INT / LUK (each) | 3.8927% | 4.1705% | 4.2254% | 4.1628% |
| Max HP / Max MP (each) | 3.7197% | 2.7804% | 2.3474% | 1.8501% |
| Attack Power | — | 1.8536% | 1.4085% | 2.3127% |
| Magic Attack | — | 1.8536% | 1.4085% | 2.3127% |
| Critical Rate % | — | 0.9268% | 0.4695% | **0.4625%** |
| All Stats | 3.4602% | 2.7804% | 1.8779% | 1.8501% |
| **Attack Speed +1** | — | — | — | **0.4625%** |
| AP-conversion lines (each of 4) | 2.5952% | 2.7804% | 2.8169% | 2.3127% |
| Attack +1 per N levels | — | — | — | 2.3127% |
| Magic Attack +1 per N levels | — | — | — | 2.3127% |
| Max HP % / Max MP % (each) | — | — | 1.8779% | 1.8501% |
| **Boss Damage %** | — | — | 0.9390% | **2.3127%** |
| Damage to normal monsters % | 3.02768% | 2.7804% | 1.8779% | 1.8501% |
| Damage to abnormal-status monsters % | 3.02768% | 2.7804% | 1.8779% | 1.8501% |
| Final damage + % of DEF | — | — | 1.8779% | 1.8501% |
| % chance to skip cooldown | — | — | 1.8779% | 1.8501% |
| **Passive Skill Level +1** | — | — | — | **0.7401%** |
| Multi-target enemy count +1 | — | — | — | 0.7401% |
| **Buff skill duration %** | 3.4602% | 1.3902% | 0.9390% | **0.9251%** |
| Item Drop Rate % | 3.4602% | 2.7804% | 1.8779% | 1.8501% |
| Meso Obtained % | 3.4602% | 2.7804% | 1.8779% | 1.8501% |
| Each of the 12 dual-stat lines | 3.8927% | 3.8925% | 3.7559% | 3.2377% |

**Miracle Circulator type probabilities differ slightly** — notably **Boss Damage % at Unique jumps from 0.9390% → 2.2624%**, Critical Rate at Epic 0.9268% → 1.8034%, ATT/MATT at Epic 1.8536% → 2.7051%. Full table: [miraclecirculator](https://maplestory.nexon.com/Guide/OtherProbability/ability/miraclecirculator).

**Miracle Circulator value guarantee:** 100% chance of the maximum value for the rolled rank (e.g. Legendary Boss Damage always 20%, Legendary Buff Duration always 50%, Legendary ATT always 30). ([miraclecirculator](https://maplestory.nexon.com/Guide/OtherProbability/ability/miraclecirculator))

###### A5.4 Lines that DO NOT exist in Inner Ability

The prompt asked about several stats that are **not** Inner Ability lines. Confirmed absent from the complete official KMS line list ([reputevalue](https://maplestory.nexon.com/Guide/OtherProbability/ability/reputevalue)):

- **Abnormal Status Resistance** — not an Ability line (it's a Cygnus link skill / Hyper Stat / potential stat)
- **Chance to ignore damage** — not an Ability line (this is an equipment Potential line)
- **Chance to gain HP/MP on attack or when hit** — not an Ability line (equipment Potential)
- **Flat cooldown reduction (−N seconds) and Cooldown Reduction %** — not an Ability line. The only cooldown line is the *% chance to skip cooldown entirely* (Unique 5–10%, Legendary 15–20%).
- **Generic "Damage %"** — does not exist. There is only Boss Damage %, Damage to normal monsters %, and Damage to abnormal-status monsters %.
- **Passive skill +1 level** *does* exist (Legendary only, value 1).

> **UNVERIFIED / likely incorrect third-party claims.** Several SEO content sites publish an "inner ability expansion" line list including *Cooldown Reduction % max 8% / flat −5 sec*, *"10% HP Healing every second (Legendary exclusive)"*, *Party Final Damage +2% per party member up to 10%*, and *Solo Final Damage +10%*. Examples: [gameslikefinder.com](https://gameslikefinder.com/article/maplestory-best-inner-ability/), [daycalculators.com](https://daycalculators.com/maplestory-inner-ability-calculator/), [digitaltq.com](https://www.digitaltq.com/maplestory-inner-ability-guide). **None of these lines appear on the official KMS probability page as of the 2026-06-18 sync, nor on [MSW](https://maplestorywiki.net/w/Inner_Ability) (edited 2026-01-17).** The Party/Solo Final Damage idea traces back to a **player suggestion thread**, not a patch note: [forums.maplestory.nexon.net/discussion/35102/inner-ability-expansion](https://forums.maplestory.nexon.net/discussion/35102/inner-ability-expansion) (Feb 2025). **Treat all of these as non-existent unless you can find them in an official patch note.**

##### A6. 2025–2026 changes to Inner Ability

| Date / patch | Change | Source |
|---|---|---|
| **KMS ver. 1.2.410 — *Crown* (Dec 2025)** | **Change Circulator** introduced (as a Kinesis-remaster compensation item, 1 per Kinesis character created before 2025-12-18, claimable 2025-12-18 → 2026-01-14). Converts one specific Legendary-rank line into another. Requires Legendary rank; the new line keeps the same "level" tier as the old one; you must already possess the line being converted. | [OM Crown](https://orangemushroom.net/2025/12/28/kms-ver-1-2-410-maplestory-crown-kinesis-remaster/) |
| **KMS 1.2.410** | *"Link Skills, Hyper Stats, and Ability can now be changed in Epic Dungeon boss stages."* | [MSW MapleStory: Crown](https://maplestorywiki.net/w/MapleStory:_Crown) |
| **KMS ver. 1.2.416 — *Overdrive* (June/July 2026)** | **Ability Auto Reset system** added to the Reset Ability UI. Register up to **6 target stats**; auto-reset stops when any stat matches or exceeds a target, or when Honor runs out. **Legendary tier only**, **Honor only** (not circulators). Stoppable with ESC / SPACE / ENTER / Cancel button. | [OM Overdrive](https://orangemushroom.net/2026/07/04/kms-ver-1-2-416-maplestory-overdrive-ruler-of-covenants-lethe/), [MSW MapleStory: Overdrive](https://maplestorywiki.net/w/MapleStory:_Overdrive) |
| **KMS 1.2.416** | **"When resetting Ability with Honor, you can no longer receive the same stats as what you previously had."** (Anti-duplicate protection across consecutive rolls — materially improves expected rolls-to-target.) | [OM Overdrive](https://orangemushroom.net/2026/07/04/kms-ver-1-2-416-maplestory-overdrive-ruler-of-covenants-lethe/) |
| **Official KMS probability page** | Last synced to the **2026-06-18** update on 2026-07-10 — i.e. no new line types or value changes were introduced through mid-2026. | [reputevalue](https://maplestory.nexon.com/Guide/OtherProbability/ability/reputevalue) |

**Change Circulator conversion table** ([OM Crown](https://orangemushroom.net/2025/12/28/kms-ver-1-2-410-maplestory-crown-kinesis-remaster/)):

| Stat before | Rank | Value before | → Stat after | Value after |
|---|---|---|---|---|
| Passive Skill Levels +1 | Legendary | — | Boss Damage | 20% |
| Boss Damage | Unique | 5% | Magic Attack / Buff Duration / Critical Rate | 15 / 32% / 15% |
| Boss Damage | Unique | 6% | Magic Attack / Buff Duration / Critical Rate | 18 / 33% / 16% |
| Boss Damage | Unique | 7% | Magic Attack / Buff Duration / Critical Rate | 18 / 34% / 17% |
| Boss Damage | Unique | 8% | Magic Attack / Buff Duration / Critical Rate | 18 / 35% / 18% |
| Boss Damage | Unique | 9% | Magic Attack / Buff Duration / Critical Rate | 21 / 37% / 19% |
| Boss Damage | Unique | 10% | Magic Attack / Buff Duration / Critical Rate | 21 / 38% / 20% |

**"Guaranteed Legendary"** — there is no general guaranteed-Legendary mechanic. The **Legendary Circulator** (event item) force-sets Legendary. Honor resets remain 1% Unique→Legendary; Miracle Circulator 10%.

**GMS status of the 2026 Ability changes:** GMS has not yet received *Overdrive* as of Sept 2026 (GMS's most recent major update is Erel Light / *Ride The Lightning*), so the **Ability Auto Reset and the no-duplicate-on-reset rule are KMS-only for now — UNVERIFIED for GMS.** ([MSW Updates](https://maplestorywiki.net/w/MapleStory_Wiki:Updates))

##### A7. Recommended-line summary (for calculator weighting)

Consensus "top" Legendary 1st lines for a bossing character, per [StrategyWiki ratings](https://strategywiki.org/wiki/MapleStory/Inner_Ability) and [MSW](https://maplestorywiki.net/w/Inner_Ability) probabilities:
1. **Attack Speed +1** (0.4625% at Legendary) — hard cap-breaking for most classes
2. **Boss Damage 20%** (2.3127% at Legendary; 2.2624% at Unique via Miracle Circulator)
3. **Buff Duration 50%** (0.9251%) — for classes with long buffs
4. **Passive Skill Level +1** (0.7401%)
5. **Critical Rate 30%** (0.4625%) — only if you need crit rate
6. **ATT/MATT +1 per 10 levels** (2.3127%) — 30 ATT at Lv.300

Common 2nd/3rd (Unique-capped) lines: Boss Damage 10%, ATT/MATT 21, Crit Rate 20%, Buff Duration 38%, Meso/Drop 15%.

---

#### PART B — LINK SKILLS

##### B1. System rules

| Rule | Detail | Source |
|---|---|---|
| Where | Beginner/Novice skill tab → **Link Manager** | [Grandis Library](https://grandislibrary.com/content/link-skills) |
| Transfer unlock | Character must be **Lv. 70** and have completed 1st Job Advancement | [MSW Link Skill](https://maplestorywiki.net/w/Link_Skill) |
| **Max link skills equipped** | **12 link skills from other characters** (13 total counting the character's own) | [MSW Link Skill](https://maplestorywiki.net/w/Link_Skill), [Grandis Library](https://grandislibrary.com/content/link-skills) |
| Presets | **3 presets** of 12 link skills each | [Grandis Library](https://grandislibrary.com/content/link-skills) |
| Sharing limit | **No limit** on how many characters a single link can be shared to (since the NEXT/Stargazer revamp) | [Grandis Library](https://grandislibrary.com/content/link-skills), [MSW](https://maplestorywiki.net/w/Link_Skill) |
| Duplicates | A receiving character cannot hold two copies of the same link skill (e.g. two Kaisers) | [MSW](https://maplestorywiki.net/w/Link_Skill) |
| Same world / same account | Required | [MSW](https://maplestorywiki.net/w/Link_Skill) |
| Boss maps | Transferring, removing and preset-switching are blocked inside boss maps (added in NEXT/Stargazer). *Later relaxed for Epic Dungeon boss stages in Crown.* | [MSW Link Skill](https://maplestorywiki.net/w/Link_Skill), [MSW Crown](https://maplestorywiki.net/w/MapleStory:_Crown) |

###### Level progression

| Level | Requirement | Source |
|---|---|---|
| Lv. 1 | Granted on character creation; shareable at Lv. 70 | [MSW](https://maplestorywiki.net/w/Link_Skill) |
| Lv. 2 | Character reaches **Lv. 120** | [MSW](https://maplestorywiki.net/w/Link_Skill) |
| **Lv. 3 — GMS** | Character reaches **Lv. 210**. Per-character, no item needed. | [MSW](https://maplestorywiki.net/w/Link_Skill), [MSW Crown (GMS notes)](https://maplestorywiki.net/w/MapleStory:_Crown) |
| **Lv. 3 — KMS/other** | Character reaches **Lv. 285**, then uses a **Proof of a Brilliant Hero / Proof of a Radiant Hero** item on **one** link skill of choice (one item per character; from the Carcion story questline) | [MSW](https://maplestorywiki.net/w/Link_Skill), [OM Crown](https://orangemushroom.net/2025/12/28/kms-ver-1-2-410-maplestory-crown-kinesis-remaster/) |
| Zero | *Rhinne's Blessing* levels via story quests — Lv. 5 on finishing the story at Lv. 178; Lv. 6 follows the normal Lv.3 rule | [MSW](https://maplestorywiki.net/w/Link_Skill) |

###### Faction stacking

Explorers (per job branch), Cygnus Knights and Resistance share one link skill per faction; each **unique** class in the faction contributes its levels. Levelling two of the same class does nothing beyond the first.

| Faction / branch | Member classes | Max Level | Source |
|---|---|---|---|
| Explorer Warrior | Hero, Paladin, Dark Knight | **9** (3 × Lv.3) | [Invincible Belief](https://maplestorywiki.net/w/Invincible_Belief) |
| Explorer Magician | Bishop, Arch Mage (F/P), Arch Mage (I/L) | **9** | [Empirical Knowledge](https://maplestorywiki.net/w/Empirical_Knowledge) |
| Explorer Bowman | Bow Master, Marksman, **Pathfinder** | **9** | [Adventurer's Curiosity](https://maplestorywiki.net/w/Adventurer%27s_Curiosity) |
| Explorer Thief | Night Lord, Shadower, **Dual Blade** | **9** | [Thief's Cunning](https://maplestorywiki.net/w/Thief%27s_Cunning) |
| Explorer Pirate | Buccaneer, Corsair, **Cannoneer** | **9** | [Pirate Blessing](https://maplestorywiki.net/w/Pirate_Blessing) |
| Cygnus Knights | Dawn Warrior, Blaze Wizard, Wind Archer, Night Walker, Thunder Breaker | **15** (5 × Lv.3) | [Cygnus Blessing](https://maplestorywiki.net/w/Cygnus_Blessing) |
| Resistance | Battle Mage, Wild Hunter, Mechanic, Blaster | **12** (4 × Lv.3) | [Spirit of Freedom](https://maplestorywiki.net/w/Spirit_of_Freedom) |
| Shine | Sia Astelle, Erel Light | **6** (2 × Lv.3) | [Guiding Stars](https://maplestorywiki.net/w/Guiding_Stars) |
| Zero (special) | — | **6** | [Rhinne's Blessing](https://maplestorywiki.net/w/Rhinne%27s_Blessing) |
| All other classes | — | **3** | [MSW Link Skill](https://maplestorywiki.net/w/Link_Skill) |

*Note: Mihile, Demon Slayer, Demon Avenger and Xenon are NOT part of the Cygnus / Resistance stacks — each has its own separate 3-level link skill.* ([Grandis Library](https://grandislibrary.com/content/link-skills), [MSW](https://maplestorywiki.net/w/Link_Skill))

> ⚠️ **Outdated numbers still circulating:** older guides state Explorer max 6, Resistance max 8, Cygnus max 10 (i.e. 2 levels per class). That was true before Lv.3 links became available to every class. Current caps are 9 / 12 / 15.

###### "Self version" (own-character) link skills — 2025/2026 addition

Since the *Crown* / GMS *Every Little Thing Every Precious Thing* wave, many link skills give the **owning character** a stronger version, usually a flat `[Passive Effect: Damage +N%]` that transferred copies do NOT get. ([MSW Crown](https://maplestorywiki.net/w/MapleStory:_Crown): *"Certain Link Skills with no or low utility also provide additional damage passive to that character only"*; per-skill numbers on each MSW skill page, tagged GMS v270.) This matters for a calculator: **a character playing e.g. Shade gets Close Call +5% damage that a Shade-mule link does not provide.**

##### B2. Full link skill table (transferred / mule version)

All values are the **transferred** (link) version at each level. Sources are the individual MapleStory Wiki skill pages (tagged with the GMS version they were captured from), cross-checked against [Grandis Library](https://grandislibrary.com/content/link-skills) and [OM Crown](https://orangemushroom.net/2025/12/28/kms-ver-1-2-410-maplestory-crown-kinesis-remaster/).

###### B2.1 Damage-affecting link skills (the ones that matter for a DPM calculator)

| Class / faction | Link skill (GMS) | Max Lv | Lv1 | Lv2 | Lv3 | Max-level value | Source |
|---|---|---|---|---|---|---|---|
| **Explorer Magician** | Empirical Knowledge | 9 | 15% proc, +1% dmg & +1% IED per stack (3 stacks, 10s) | 17% / 1% / 1% | 19% / 2% / 2% | Lv9: **31% proc, +5% Damage and +5% Ignore DEF per stack, 3 stacks = +15%/+15%** | [Empirical Knowledge](https://maplestorywiki.net/w/Empirical_Knowledge) (GMS v264) |
| **Explorer Bowman** | Adventurer's Curiosity | 9 | Crit Rate +3% | +4% | +6% | Lv9: **Critical Rate +15%** (+50% Monster Collection rate) | [Adventurer's Curiosity](https://maplestorywiki.net/w/Adventurer%27s_Curiosity) (v270) |
| **Explorer Thief** | Thief's Cunning | 9 | +3% Damage for 10s on debuffing an enemy (CD 20s) | +6% | +9% | Lv9: **Damage +27%** (10s, CD 20s) | [Thief's Cunning](https://maplestorywiki.net/w/Thief%27s_Cunning) (v264) |
| **Explorer Pirate** | Pirate Blessing | 9 | +20 all stats, +350 HP/MP, −5% dmg taken | +30 / +525 / −7% | +40 / +700 / −9% | Lv9: **+100 STR/DEX/INT/LUK, +1750 Max HP/MP, Damage Taken −21%** (Lv4–8: 50/60/70/80/90 stats) | [Pirate Blessing](https://maplestorywiki.net/w/Pirate_Blessing) (v270) |
| **Cygnus Knights** | Cygnus Blessing | 15 | ATT & MATT +7, Status Res +1, Elem Res +1% | +9 / +3 / 3% | +11 / +4 / 4% | Lv15: **ATT and MATT +35, Abnormal Status Resistance +22, All Elemental Resistance +22%** | [Cygnus Blessing](https://maplestorywiki.net/w/Cygnus_Blessing) (v264 / KMS 1.2.349) |
| **Luminous** | Light Wash (KMS: *Permeate*) | 3 | Ignore DEF +10% | +15% | **+20%** | +20% IED | [Light Wash](https://maplestorywiki.net/w/Light_Wash) (v270) |
| **Phantom** | Phantom Instinct (KMS: *Deadly Instinct*) | 3 | Crit Rate +10% | +15% | **+20%** | +20% Crit Rate | [Phantom Instinct](https://maplestorywiki.net/w/Phantom_Instinct) (v270) |
| **Xenon** | Hybrid Logic | 3 | All Stats +5% | +10% | **+15%** | +15% All Stats | [Hybrid Logic](https://maplestorywiki.net/w/Hybrid_Logic) (v264) |
| **Demon Slayer** | Fury Unleashed (KMS: *Demon's Fury*) | 3 | Boss Damage +10% | +15% | **+20%** | +20% Boss Damage | [Fury Unleashed](https://maplestorywiki.net/w/Fury_Unleashed) |
| **Demon Avenger** | Wild Rage | 3 | Damage +5% | +10% | **+15%** | +15% Damage | [Wild Rage](https://maplestorywiki.net/w/Wild_Rage) (v245) |
| **Kaiser** | Iron Will | 3 | Max HP +10% | +15% | **+20%** | +20% Max HP | [Iron Will](https://maplestorywiki.net/w/Iron_Will) (v260) |
| **Kain** | Time to Prepare (KMS: *Prior Preparation*) | 3 | 5 stacks → Damage +9% / 20s, CD 40s | +17% | **+25%** | +25% Damage (conditional) | [Time to Prepare](https://maplestorywiki.net/w/Time_to_Prepare) (v264) |
| **Cadena** | Unfair Advantage (KMS: *Intensive Assault*) | 3 | +3% vs lower-level, +3% vs abnormal-status | +6% / +6% | **+9% / +9%** | +9% / +9% | [Unfair Advantage](https://maplestorywiki.net/w/Unfair_Advantage) (v264) |
| **Angelic Buster** | Terms and Conditions (KMS: *Soul Contract*) | 3 | Damage +30% for 10s, CD 90s | +45%, CD 60s | **+60%, CD 60s** | +60% Damage 10s / 60s CD | [Terms and Conditions](https://maplestorywiki.net/w/Terms_and_Conditions) (v260) |
| **Zero** | Rhinne's Blessing | 6 | −3% dmg taken, +2% IED | −6% / +4% | −9% / +6% | Lv6: **Damage Taken −20%, Ignore DEF +15%** (Lv4 −12%/+8%, Lv5 −15%/+10%) | [Rhinne's Blessing](https://maplestorywiki.net/w/Rhinne%27s_Blessing) (v270) |
| **Kinesis** | Judgment | 3 | Crit Damage +2% | +4% | **+6%** | +6% Critical Damage | [Judgment (Kinesis)](https://maplestorywiki.net/w/Judgment_(Kinesis)) (v270) |
| **Adele** | Noble Fire (KMS: *Noblesse*) | 3 | Boss Dmg +2%, +1% dmg per party member (max 4%) | +4% / +2% (max 8%) | **+6% / +3% (max 12%)** | +6% Boss Damage, +12% Damage in a full party (solo counts as party of 1 → +3%) | [Noble Fire](https://maplestorywiki.net/w/Noble_Fire) (v264) |
| **Illium** | Tide of Battle | 3 | 4 stacks, 10s, +2% dmg/stack | +3%/stack | **+4%/stack** | +16% Damage at 4 stacks (**link version duration 10s**; Illium's own version is 25s) | [Tide of Battle](https://maplestorywiki.net/w/Tide_of_Battle) (v268) |
| **Khali** | Innate Gift | 3 | Damage +3%, recover 1% HP/MP per sec 5s (CD 30s) | +5% / 2% | **+7% / 3%** | +7% Damage | [Innate Gift](https://maplestorywiki.net/w/Innate_Gift) (v264) |
| **Ark** | Solus | 3 | +1% base, +1%/stack, max 5 stacks (5s) | +1% base, +2%/stack | **+1% base, +3%/stack** | +16% Damage at 5 stacks | [Solus](https://maplestorywiki.net/w/Solus) (v245) |
| **Lara** | Nature's Friend | 3 | Damage +3%; +7% normal-monster damage buff | +5% / +11% | **+7% / +15%** | +7% Damage (always-on) | [Nature's Friend](https://maplestorywiki.net/w/Nature%27s_Friend) (v264) |
| **Hoyoung** | Bravado | 3 | IED +5%, +9% dmg vs 100% HP enemies | +10% / +14% | **+15% / +19%** | +15% Ignore DEF, +19% dmg vs full-HP | [Bravado](https://maplestorywiki.net/w/Bravado) (v270) |
| **Hayato** | Moonlit Blade Learnings | 3 | If Crit Rate ≥100% and Crit Dmg ≥50%: Crit Dmg +3% | +5% | **+7%** | +7% Critical Damage (conditional) | [Moonlit Blade Learnings](https://maplestorywiki.net/w/Moonlit_Blade_Learnings) (v266) |
| **Kanna** | Elementalism | 3 | After 40 attack-skill uses: Damage +10% for 12s | +15% | **+20%** | +20% Damage (conditional) | [Elementalism](https://maplestorywiki.net/w/Elementalism) (v266) |
| **Lynn** | **Focus Spirit** (Lynn's own skill is *Spirit Guide Blessing*) | 3 | Boss Dmg +4%, Crit Rate +4%, Max HP +3%, Max MP +3% | 7/7/4/4 | **11 / 10 / 5 / 5** | **Boss Damage +11%, Crit Rate +10%, Max HP +5%, Max MP +5%** | [Spirit Guide Blessing](https://maplestorywiki.net/w/Spirit_Guide_Blessing) (v270) |
| **Mo Xuan** | Qi Cultivation | 3 | Boss Dmg +2%; +1%/hit vs boss, 6 stacks (1 per 2s, 5s dur) | +4% / +2% | **+6% / +3%** | +6% Boss Damage, +18% at 6 stacks | [Qi Cultivation](https://maplestorywiki.net/w/Qi_Cultivation) (v270) |
| **Sia Astelle + Erel Light (Shine)** | Guiding Stars | 6 | Buff Duration +4%, Crit Dmg +1% | +7% / +2% | +10% / +3% | Lv6: **Buff Duration +19%, Critical Damage +6%** (Lv4 13%/4%, Lv5 16%/5%) | [Guiding Stars](https://maplestorywiki.net/w/Guiding_Stars) (v270) |
| **Ren** | Grounded Body | 3 | Damage taken −2% (incl. %HP attacks) | −4% | **−6%** | −6% damage taken | [Grounded Body](https://maplestorywiki.net/w/Grounded_Body) (v270) |
| **Lethe** *(KMS only as of Sept 2026)* | **Covenant** | 3 | Damage +4% while a summon is out | +8% | **+12%** | +12% Damage | [OM Overdrive KMS 1.2.416](https://orangemushroom.net/2026/07/04/kms-ver-1-2-416-maplestory-overdrive-ruler-of-covenants-lethe/) |

###### B2.2 Utility / non-damage link skills

| Class / faction | Link skill | Max Lv | Lv1 | Lv2 | Lv3 | Max-level value | Source |
|---|---|---|---|---|---|---|---|
| **Explorer Warrior** | Invincible Belief | 9 | At ≤15% HP restore 20% Max HP/sec for 3s, CD 310s | 23%, CD 290s | 26%, CD 270s | Lv9: **restore 44% Max HP/sec for 3s, CD 150s** (Lv4–8: 29/32/35/38/41%, CD 250/230/210/190/170s) | [Invincible Belief](https://maplestorywiki.net/w/Invincible_Belief) (v270) |
| **Resistance** | Spirit of Freedom | 12 | 1s invincibility after reviving | 2s | 3s | Lv12: **12 seconds of invincibility after reviving** (1s per level) | [Spirit of Freedom](https://maplestorywiki.net/w/Spirit_of_Freedom) (v270) |
| **Mihile** | Knight's Watch (KMS: *Guardian of Light*) | 3 | Status Resistance +100 for 10s, CD 120s | 15s | **20s** | Status Resistance +100 for 20s / 120s CD | [Knight's Watch](https://maplestorywiki.net/w/Knight%27s_Watch) (v270) |
| **Aran** | Combo Kill Blessing (KMS: *Combo Kill Advantage*) | 3 | Combo Kill Marble EXP +400% | +650% | **+900%** | +900% Combo Kill Marble EXP | [Combo Kill Blessing](https://maplestorywiki.net/w/Combo_Kill_Blessing) (v270) |
| **Evan** | Rune Persistence | 3 | Liberated Rune Power duration +30% | +50% | **+70%** | +70% rune duration | [Rune Persistence](https://maplestorywiki.net/w/Rune_Persistence) (v270) |
| **Mercedes** | Elven Blessing | 3 | Return to Elluel (CD 1800s); **EXP +10%** | +15% | **+20%** | **+20% EXP** permanently | [Elven Blessing](https://maplestorywiki.net/w/Elven_Blessing) (v270) |
| **Shade (Eunwol)** | Close Call | 3 | 5% chance to survive a fatal hit | 10% | **15%** | 15% survival chance | [Close Call](https://maplestorywiki.net/w/Close_Call) (v270) |

###### B2.3 Self-only ("own character") bonuses added in the 2025 Link Skill Expansion

These apply **only to the character whose class it is**, never to a linked mule. Source: individual MSW pages (GMS v270) unless noted; KMS wording from [OM Crown](https://orangemushroom.net/2025/12/28/kms-ver-1-2-410-maplestory-crown-kinesis-remaster/).

| Class | Self-only bonus at max level | Source |
|---|---|---|
| Explorer Warrior (Invincible Belief) | Lv7 **+2%**, Lv8 **+4%**, Lv9 **+6% Damage** | [MSW](https://maplestorywiki.net/w/Invincible_Belief) |
| Explorer Magician (Empirical Knowledge) | **+6% Damage** at master | [OM Crown](https://orangemushroom.net/2025/12/28/kms-ver-1-2-410-maplestory-crown-kinesis-remaster/) |
| Explorer Bowman (Adventurer's Curiosity) | Lv7 +2%, Lv8 +4%, **Lv9 +6% Damage** | [MSW](https://maplestorywiki.net/w/Adventurer%27s_Curiosity) |
| Explorer Pirate (Pirate Blessing) | Lv7–9 stats become **+90 / +110 / +130** all stats (vs +80/+90/+100 transferred); also equipment STR↔DEX swap toggle | [MSW](https://maplestorywiki.net/w/Pirate_Blessing) |
| Cygnus Knights (Cygnus Blessing) | **ATT & MATT +55** instead of +35 | [OM Crown](https://orangemushroom.net/2025/12/28/kms-ver-1-2-410-maplestory-crown-kinesis-remaster/) |
| Mihile (Knight's Watch) | Completely different self version: 30s barrier, blocks 9 hits, **Damage +25%**, %HP attacks −30%, CD 120s; plus **[Passive Effect: Damage +3%]** | [MSW](https://maplestorywiki.net/w/Knight%27s_Watch) |
| Aran (Combo Kill Blessing) | **+5% Damage** | [MSW](https://maplestorywiki.net/w/Combo_Kill_Blessing) |
| Evan (Rune Persistence) | **+5% Damage** | [MSW](https://maplestorywiki.net/w/Rune_Persistence) |
| Mercedes (Elven Blessing) | **+5% Damage**; self cooldown 600s instead of 1800s | [MSW](https://maplestorywiki.net/w/Elven_Blessing) |
| Phantom (Phantom Instinct) | **+5% Damage** | [MSW](https://maplestorywiki.net/w/Phantom_Instinct) |
| Shade (Close Call) | **+5% Damage** | [MSW](https://maplestorywiki.net/w/Close_Call) |
| Luminous (Light Wash) | **+4% Damage** | [MSW](https://maplestorywiki.net/w/Light_Wash) |
| Resistance (Spirit of Freedom) | Lv9 +2%, Lv10 +3%, Lv11 +4%, **Lv12 +5% Damage** | [MSW](https://maplestorywiki.net/w/Spirit_of_Freedom) |
| Demon Slayer (Fury Unleashed) | Absorbs **+10 additional Force** with Demon Lash | [MSW](https://maplestorywiki.net/w/Fury_Unleashed) |
| Kaiser (Iron Will) | Self: Max HP **+15%** and **+4% Damage per Morph Gauge stage** (transferred gives +20% HP only) | [MSW](https://maplestorywiki.net/w/Iron_Will) |
| Angelic Buster (Terms and Conditions) | Self **Damage +120%** for 10s (transferred is halved to +60%) | [MSW](https://maplestorywiki.net/w/Terms_and_Conditions) |
| Zero (Rhinne's Blessing) | Lv6 adds **+4% Damage** | [MSW](https://maplestorywiki.net/w/Rhinne%27s_Blessing) |
| Illium (Tide of Battle) | Self stack duration **25s** vs 10s transferred | [MSW](https://maplestorywiki.net/w/Tide_of_Battle) |
| Khali (Innate Gift) | Self **Damage +10%** vs +7% | [OM Crown](https://orangemushroom.net/2025/12/28/kms-ver-1-2-410-maplestory-crown-kinesis-remaster/) |
| Lara (Nature's Friend) | Self **Damage +10%** vs +7% | [OM Crown](https://orangemushroom.net/2025/12/28/kms-ver-1-2-410-maplestory-crown-kinesis-remaster/) |
| Hoyoung (Bravado) | Self **+4% Damage** | [MSW](https://maplestorywiki.net/w/Bravado) |
| Ren (Grounded Body) | Self **+5% Damage** | [MSW](https://maplestorywiki.net/w/Grounded_Body) |
| Cadena (Unfair Advantage) | KMS lists a self version with the same 9%/9% (no extra damage passive listed) | [OM Crown](https://orangemushroom.net/2025/12/28/kms-ver-1-2-410-maplestory-crown-kinesis-remaster/) |

##### B3. Removed / renamed / new classes

###### Removed (no link skill any more)
| Class | Status | Source |
|---|---|---|
| **Beast Tamer** | Removed. Character creation disabled in the New Age update; existing characters **converted to Lynn** on 2024-05-01 in GMS (v250). Its old link skill *Focus Spirit* name now belongs to **Lynn's transferred link skill**. | [MSW Beast Tamer](https://maplestorywiki.net/w/Beast_Tamer), [MSW Spirit Guide Blessing](https://maplestorywiki.net/w/Spirit_Guide_Blessing) |
| **Jett** | Removed. Creation disabled GMS v240 (2023-04-27); un-converted Jetts turned into Explorer Beginners in Feb 2024. **"Core Aura" no longer exists.** | [MSW Jett](https://maplestorywiki.net/w/Jett) |
| **Saitama** (One-Punch Man collab, KMS Nov 2025) | Special Worlds only — cannot receive or grant link skills. | [MSW Saitama](https://maplestorywiki.net/w/Saitama) |

###### Renamed / restructured link skills (old name → current GMS name)
| Old / commonly-cited name | Current GMS name | Notes |
|---|---|---|
| Luminous *Permeate* | **Light Wash** | Same effect. KMS still calls it Permeate. |
| Ark *Unfathomable Sorrow* | **Solus** | Reworked into a combat-state stacking damage buff |
| Adele *Noble Blessing* | **Noble Fire** | KMS: *Noblesse* |
| Cadena *Mark of Phantom Thief* | **Unfair Advantage** | KMS: *Intensive Assault* |
| Khali *Hex: Fortitude* | **Innate Gift** | |
| Hoyoung *Wretched Fiends* | **Bravado** | |
| Lara *Dragon Vein Absorption* | **Nature's Friend** | |
| Kain *"Sharp Eyes"* (incorrect) | **Time to Prepare** | KMS: *Prior Preparation* |
| Hayato *Keen Edge* (All Stats +35, ATT/MATT +20) | **Moonlit Blade Learnings** (conditional +7% Crit Damage) | Changed in the Hayato/Kanna revamp; GMS wiki shows the new version at **v266**. [Grandis Library still shows the old *Keen Edge*](https://grandislibrary.com/content/link-skills) — **flagged disagreement; MSW v266 is newer.** |
| Kanna *Elementalism* (flat +15% Damage) | **Elementalism** (40-attack condition → +20% Damage for 12s) | Same revamp; GL shows the pre-revamp flat version. |
| Sia Astelle *Tree of Stars* (ML3, Buff Duration +10% / Crit Dmg +3%) | **Guiding Stars** (ML6, faction-shared with Erel Light) | Merged into the Shine faction skill when Erel Light released. [Tree of Stars](https://maplestorywiki.net/w/Tree_of_Stars), [Guiding Stars](https://maplestorywiki.net/w/Guiding_Stars) |
| Explorers: five per-class blessings | **Invincible Belief / Empirical Knowledge / Adventurer's Curiosity / Thief's Cunning / Pirate Blessing** | One per job branch, stacking to Lv.9 |
| Resistance / Blaster *Afterimage Shock* | **Spirit of Freedom** (Blaster now folded into the shared Resistance link) | [Spirit of Freedom](https://maplestorywiki.net/w/Spirit_of_Freedom) |
| Pathfinder (separate link) | folded into **Adventurer's Curiosity** (Explorer Bowman) | [Adventurer's Curiosity](https://maplestorywiki.net/w/Adventurer%27s_Curiosity) |
| Demon Slayer *"Devotion / Devil's Bane"* | **Fury Unleashed** — Boss Damage. | ⚠️ **The commonly-cited attribution is backwards.** Current data: **Demon Slayer = Fury Unleashed (Boss Damage 10/15/20%)**, **Demon Avenger = Wild Rage (Damage 5/10/15%)**. Confirmed by [MSW Fury Unleashed](https://maplestorywiki.net/w/Fury_Unleashed) ("*When used in conjunction with **Demon Lash**, absorbs additional Fury*" — a Demon Slayer skill), [MSW Wild Rage](https://maplestorywiki.net/w/Wild_Rage) ("Class: Demon Avenger"), [OM Crown](https://orangemushroom.net/2025/12/28/kms-ver-1-2-410-maplestory-crown-kinesis-remaster/) (KMS *Demon's Fury*: "20% boss damage, self absorbs an additional 10 Force"), and [Grandis Library](https://grandislibrary.com/content/link-skills) (lists Demon Slayer under %Boss Damage, Demon Avenger under %Damage). |

###### New classes 2024–2026 and their link skills
| Class | Faction | Released | Link skill | Max level | Source |
|---|---|---|---|---|---|
| **Lynn** | Jianghu | TMS Mar 2024 / GMS 2024 | **Focus Spirit** (own skill: *Spirit Guide Blessing*) — Boss Dmg 11%, Crit Rate 10%, Max HP/MP 5% at Lv3 | 3 | [MSW](https://maplestorywiki.net/w/Spirit_Guide_Blessing) |
| **Mo Xuan** | Jianghu | CMS 2024 remaster / MSEA & GMS later | **Qi Cultivation** — Boss Dmg +6% + up to +18% stacking | 3 | [MSW](https://maplestorywiki.net/w/Qi_Cultivation) |
| **Ren** | Anima | KMS Jun 2025 (*Assemble*) | **Grounded Body** — damage taken −6% | 3 | [MSW](https://maplestorywiki.net/w/Grounded_Body) |
| **Sia Astelle** | Shine | GMS Jun 2025 (*Stargazer*, v260) | **Guiding Stars** (was *Tree of Stars*) | 6 (Shine stack) | [MSW](https://maplestorywiki.net/w/Guiding_Stars) |
| **Erel Light** | Shine | GMS Jun 2026 (*Ride The Lightning*) | **Guiding Stars** (stacks with Sia Astelle) | 6 | [MSW Erel Light](https://maplestorywiki.net/w/Erel_Light), [MSW Guiding Stars](https://maplestorywiki.net/w/Guiding_Stars) |
| **Lethe** | **Demon** (new faction; separate from Demon Slayer/Avenger, who remain Resistance) | KMS Jun–Jul 2026 (*Overdrive* 1.2.416). **Not yet in GMS** — projected Nov 2026. | **Covenant** — Damage +4/8/12% while a summon is active | 3 | [OM Overdrive](https://orangemushroom.net/2026/07/04/kms-ver-1-2-416-maplestory-overdrive-ruler-of-covenants-lethe/), [MSW Lethe](https://maplestorywiki.net/w/Lethe) |

##### B4. Recent patch changes to Link Skills

| Patch | Change | Source |
|---|---|---|
| **KMS *NEXT* (Dec 2024) / GMS v260 *Stargazer* (2025)** | **Link Skill Revamp**: removal of the daily transfer limit and transfer/change fees; a link can be transferred to **multiple characters at the same time**; UI overhaul (removal of the "Currently Applied Link Skills" page, application via Preset settings); new view of link skills you don't own yet; descriptions now show which jobs are needed to level each skill. Transfers, removals and presets **blocked in boss maps**. | [MSW MapleStory: NEXT](https://maplestorywiki.net/w/MapleStory:_NEXT), [MSW Link Skill](https://maplestorywiki.net/w/Link_Skill) citing [official Stargazer patch notes §Link Skill Revamp](https://www.nexon.com/maplestory/news/update/27513/updated-6-12-v-260-stargazer-patch-notes) |
| **GMS *Every Little Thing Every Precious Thing*** (= KMS *Assemble*, GMS Fall 2025) | GMS-exclusive QoL: **"Expansion of Level 3 Link Skills to all jobs."** In GMS this unlocks at **Lv. 210** per contributing character — no item, no Lv.285 requirement. | [MSW MapleStory: Assemble](https://maplestorywiki.net/w/MapleStory:_Assemble), [MSW MapleStory: Crown](https://maplestorywiki.net/w/MapleStory:_Crown) |
| **KMS *Crown* / GMS *Ride The Lightning* (Dec 2025 KMS)** | **"Link Skill Expansion"**: link skill master levels raised; **Proof of a Radiant Hero** item (Lv.285+, once per character, from the Carcion story questline) upgrades one chosen link skill to Lv.3; and **"certain Link Skills with no or low utility also provide an additional damage passive to that character only"** (the self-versions in B2.3). GMS name of the quest item is **Proof of a Shining Hero**. | [OM Crown](https://orangemushroom.net/2025/12/28/kms-ver-1-2-410-maplestory-crown-kinesis-remaster/), [MSW MapleStory: Crown](https://maplestorywiki.net/w/MapleStory:_Crown), [MSW Proof of a Shining Hero/Story](https://maplestorywiki.net/w/Proof_of_a_Shining_Hero/Story) |
| **KMS *Crown*** | Link Skills, Hyper Stats and Ability can now be changed **inside Epic Dungeon boss stages**. | [MSW MapleStory: Crown](https://maplestorywiki.net/w/MapleStory:_Crown) |
| **KMS *Crown*** | *"Link Skills' passive effects will no longer affect Ascent skills' damage."* (plus a fix so link skills can no longer be acquired below Lv.70) | [OM Crown](https://orangemushroom.net/2025/12/28/kms-ver-1-2-410-maplestory-crown-kinesis-remaster/) |
| **KMS *Overdrive* (Jul 2026)** | A **Link Skill button** was added to the bottom of the Skill UI. No mechanical changes. | [OM Overdrive](https://orangemushroom.net/2026/07/04/kms-ver-1-2-416-maplestory-overdrive-ruler-of-covenants-lethe/) |

**Link skill slot count: no change.** Every current source still says **12** (13 including your own). No slot expansion has been announced. ([MSW Link Skill](https://maplestorywiki.net/w/Link_Skill), edited 2026-09-05; [Grandis Library](https://grandislibrary.com/content/link-skills), GMS v269)

---

#### PART C — DATA-QUALITY NOTES FOR THE CALCULATOR

1. **Prefer individual MapleStory Wiki skill pages over the Link Skill overview page.** The overview page ([maplestorywiki.net/w/Link_Skill](https://maplestorywiki.net/w/Link_Skill)) contains stale rows. Concrete examples found:
   - *Rhinne's Blessing Lv.6*: overview says −18% dmg taken / +12% IED; the [skill page (v270)](https://maplestorywiki.net/w/Rhinne%27s_Blessing) says **−20% / +15%**, matching [KMS Crown](https://orangemushroom.net/2025/12/28/kms-ver-1-2-410-maplestory-crown-kinesis-remaster/).
   - *Invincible Belief cooldowns*: overview says 410 s → 90 s across Lv.1–9; the [skill page (v270)](https://maplestorywiki.net/w/Invincible_Belief) says **310 s → 150 s**, matching KMS Crown's "150 seconds" at master.
   - *Cygnus Blessing Lv.1 status resistance*: overview says +2, the [skill page](https://maplestorywiki.net/w/Cygnus_Blessing) says **+1**.
   - Overview lists Lynn's link as "Focus Spirit" with a "Focus Spirit" heading only; the actual class skill is [Spirit Guide Blessing](https://maplestorywiki.net/w/Spirit_Guide_Blessing) and the transferred version is named *Focus Spirit*.
2. **Grandis Library is one to two revamps behind on some classes** (Hayato *Keen Edge*, Kanna flat +15%, Illium 15 s duration, Ren −4%, Sia Astelle *Tree of Stars*). It is still the best source for the *rules* (slot count, presets, stacking) and for build guidance.
3. **StrategyWiki's Inner Ability page is from May 2023.** Its per-line value tables still match the current official KMS values, but its **rank-up rates and 2nd/3rd-line rank distribution are outdated**. Use the [official KMS page](https://maplestory.nexon.com/Guide/OtherProbability/ability/reputevalue) for probabilities.
4. **The official KMS probability pages are the ground truth for Inner Ability** and are still being maintained (synced to the 2026-06-18 update on 2026-07-10). They are also the source MSW cites.

##### Open gaps / still UNVERIFIED

- **GMS-specific probability disclosure.** All Ability probabilities above come from the KMS official page (which MSW and StrategyWiki both use for GMS). I could not fetch a GMS-hosted probability disclosure — the Nexon America news/probability pages are JavaScript-rendered and returned only a page shell to every fetch method available here.
- **Whether GMS has the KMS *Overdrive* Ability changes** (Auto Reset, no-duplicate-on-consecutive-reset). GMS has not received Overdrive as of 2026-09-06.
- **Lethe in GMS** — link skill values are from the KMS patch notes only; GMS localisation names/values unconfirmed.
- **Exact GMS behaviour of "Proof of a Shining Hero"**, given GMS already grants Lv.3 links at Lv.210 without an item. The quest exists in GMS ([MSW](https://maplestorywiki.net/w/Proof_of_a_Shining_Hero/Story)) but its GMS reward function is undocumented on the wiki.
- **The exact GMS patch text of the v260 Stargazer "Link Skill Revamp" section** — the anchor URL is confirmed via MSW's citation but the Nexon page could not be scraped.
- **Whether any self-version damage passives exist for Cygnus Knights / Explorer Magician in GMS specifically** — those MSW pages are still tagged v264 rather than v270, so the KMS Crown values (+55 ATT self, +6% damage self) are cited from Orange Mushroom rather than a GMS-tagged source.
- **Mo Xuan and Lynn GMS availability/values** were taken from GMS v270-tagged wiki pages, but I could not independently confirm GMS release dates for Mo Xuan.

---


### 5. Equipment Set Effects

> Researched independently; per-piece-count tables with cumulative columns.

**Compiled:** 2026-09-06
**Target game version:** GMS v.269 "Ride the Lightning" (current GMS version per Grandis Library's version banner — <https://grandislibrary.com/resources>)

#### Source quality notes (read first)

| Source | URL | Assessment |
|---|---|---|
| MapleStory Wiki (maplestorywiki.net) | <https://maplestorywiki.net/> | **Primary source used throughout.** Community wiki, actively maintained; pages cited here reference GMS v263–v269 skill icons and a GMS 265 (17 Dec 2025) update entry, so it is current for 2025–2026. Explicitly flags GMS vs KMS vs MSEA differences. Note: it serves HTTP 403 to some fetchers; content here was retrieved with a normal browser user-agent. |
| DigitalTQ Set Effects | <https://www.digitaltq.com/maplestory-set-effects> | Secondary cross-check. Agrees with maplestorywiki on CRA, AbsoLab, Arcane Umbra, Eternal (2–5 set), Superior Gollux, Boss Accessory, Pitched Boss 10-set. |
| AyumiLove Equipment Set | <https://ayumilove.net/maplestory-equipment-set/> | **STALE** — page content dates to GMS v178 era. Confirms Gollux + Root Abyss, but its AbsoLab and Arcane Umbra tables are pre-revamp and **should not be used**. Flagged inline below. |
| Grandis Library Progression Guide | <https://grandislibrary.com/content/progression-guide> | Used for set *membership* and drop sources; does not list numeric set effects. |
| MapleStorySEA Wiki | <https://www.maplesea.com/wiki/Equipment/SetItem> | Used only for the "Lucky Item" mechanic. MSEA, not GMS — treat as indicative. |
| NamuWiki (ko) | en.namu.wiki | **Could not be retrieved** (Cloudflare block). Would have been the best KMS cross-check. |
| Fandom MapleWiki | maplestory.fandom.com | **Could not be retrieved** (Cloudflare/JS block). |
| maplestory.wiki item DB | <https://maplestory.wiki/> | JavaScript-only SPA; not machine-readable without a browser. |

**Global mechanical note — IED is multiplicative.** MapleStory Wiki footnotes on the AbsoLab, Arcane Umbra, Pitched Boss and Masteria's Legacy pages state: *"Ignored Enemy Defense is multiplicative, not additive."* That is why e.g. AbsoLab's 4-set 10% + 7-set 10% is shown cumulatively as **19%** (`1 − 0.9×0.9`), not 20%. Source: <https://maplestorywiki.net/w/Equipment_Set/AbsoLab_Set_(Warrior)> (ref [1]) and <https://maplestorywiki.net/w/Pitched_Boss_Set> (ref [1]).

**Global mechanical note — "Lucky Item" / wildcard set pieces.** Chaos Root Abyss hats, Genesis weapons and Scarlet-tier items carry the tooltip line letting them count toward *any* set effect, provided the target set has that equipment type. Up to 3 set effects can be stacked using lucky items. Worked example given by Nexon (MSEA wiki): CRA Helm (lucky) + 3 CRA pieces + 4 AbsoLab pieces ⇒ **4-set CRA AND 5-set AbsoLab simultaneously**. Source: <https://www.maplesea.com/wiki/Equipment/SetItem>. **Caveat:** this is the MSEA wiki, not a GMS page; the behavior is believed identical in GMS but I could **not** verify it against a GMS-official page. Mark as **PARTIALLY UNVERIFIED for GMS**. (Note: maplestorywiki's "AbsoLab/Arcane Umbra/Root Abyss Lucky Item Scroll" items are a *different, unrelated* thing — they add Zero's Lapis/Lazuli weapons to those sets: <https://maplestorywiki.net/w/AbsoLab_Lucky_Item_Scroll>.)

---

#### 1. Root Abyss Set (Chaos Root Abyss / "CRA")

**Level 150.** Members: Royal *(class)* Hat, Eagle Eye *(class)* Top, Trixter *(class)* Bottom, Fafnir *(class)* Weapon — **4 pieces max**, so 2/3/4-set only. Obtained from Root Abyss bosses (Crimson Queen → Piece of Anguish ×5 → Royal Hat; Von Bon → Piece of Time ×5 → Eagle Eye Top; Pierre → Piece of Mockery ×5 → Trixter Bottom; Vellum → Piece of Destruction ×15 → Fafnir Weapon).
Source: <https://maplestorywiki.net/w/Root_Abyss_Set>

##### Set effect table (Warrior variant shown; see per-class note)

| Pieces | Effect at this tier | Cumulative |
|---|---|---|
| 2 | STR +20, DEX +20, Max HP +1,000, Max MP +1,000 | STR +20, DEX +20, HP +1,000, MP +1,000 |
| 3 | Max HP +10%, Max MP +10%, Weapon ATT +50 | + HP/MP +10%, WATT +50 |
| 4 | **Boss Damage +30%** | + Boss Damage +30% |

Source: <https://maplestorywiki.net/w/Equipment_Set/Root_Abyss_Set_(Warrior)>

**Per-class variance in the 2-set and 3-set:** the 2-set gives *primary + secondary stat* +20 each, and the 3-set gives WATT or MATT depending on class. Magician confirmed:

| Pieces | Magician effect |
|---|---|
| 2 | INT +20, LUK +20, Max HP +1,000, Max MP +1,000 |
| 3 | Max HP +10%, Max MP +10%, **Magic ATT +50** |
| 4 | Boss Damage +30% |

Source: <https://maplestorywiki.net/w/Equipment_Set/Root_Abyss_Set_(Magician)>

**⚠ SOURCE DISAGREEMENT.** The maplestorywiki *summary* page states the 3-set as "All Stats: +9, Weapon Attack / Magic Attack: +50" and omits the HP/MP%; the *class detail* pages and DigitalTQ both give "Max HP/MP +10%, ATT +50". The class detail pages are almost certainly correct and the summary page line is a stale/typo'd entry.
Summary page: <https://maplestorywiki.net/w/Root_Abyss_Set> · Class page: <https://maplestorywiki.net/w/Equipment_Set/Root_Abyss_Set_(Warrior)> · Cross-check: <https://www.digitaltq.com/maplestory-set-effects>

##### CRA base item stats (Warrior example)

| Item | Slot | Base stats |
|---|---|---|
| Royal Warrior Helm | Hat | STR +40, DEX +40, HP +360, MP +360, WATT +2, DEF +390, **IED +10%** |
| Eagle Eye Warrior Armor | Top | STR +30, DEX +30, WATT +2, DEF +210, **IED +5%** |
| Trixter Warrior Pants | Bottom | STR +30, DEX +30, WATT +2, DEF +210, **IED +5%** |
| Fafnir weapon (e.g. Fafnir Mercy, Bladecaster) | Weapon | STR +40, DEX +40, WATT +171, **Boss +30%, IED +10%** |

Source: <https://maplestorywiki.net/w/Equipment_Set/Root_Abyss_Set_(Warrior)>

##### Naming corrections to the brief
- **"Royal Von Leon" is NOT part of the CRA set.** The Royal Von Leon Set is a separate **Level 130** 6-piece set from Von Leon (4-set: All Stats +6, Boss +10%; 5-set: All Stats +9, ATT +10; 6-set: primary+secondary stat +10, All Stats +15, Max HP/MP +15%, ATT +20, Boss +10%). Source: <https://maplestorywiki.net/w/Royal_Von_Leon_Set>
- **"Aeonian Rise" is NOT a CRA item.** It is (a) the Black Mage boss phase and (b) the equipment skill granted by the liberated Genesis Weapon. Source: <https://maplestorywiki.net/w/Aeonian_Rise_(Skill)>
- The CRA hat names are class-specific: Royal Warrior Helm / Royal Dunwitch Hat (mage) / Royal Ranger Beret (bowman) / Royal Assassin Hood (thief) / Royal Wanderer Hat (pirate). Sources: the five `Equipment_Set/Root_Abyss_Set_(<class>)` pages on maplestorywiki.net.

---

#### 2. AbsoLab Set

**Level 160.** 7 pieces: Hat, Overall (suit), Shoes, Gloves, Cape, Shoulder, Weapon. From Lotus / Damien, plus Scrapyard (AbsoLab Coins → shoes/gloves/cape/weapon) and Dark World Tree (Stigma Coins → hat/overall/shoulder/weapon).

| Pieces | Effect at this tier | Cumulative |
|---|---|---|
| 2 | Max HP +1,500, Max MP +1,500, WATT +20, MATT +20, **Boss Dmg +10%** | HP/MP +1,500, ATT +20, Boss +10% |
| 3 | All Stats +30, WATT +20, MATT +20, **Boss Dmg +10%** | AS +30, HP/MP +1,500, ATT +40, Boss +20% |
| 4 | WATT +25, MATT +25, DEF +200, **IED +10%** | AS +30, HP/MP +1,500, ATT +65, DEF +200, Boss +20%, IED +10% |
| 5 | WATT +30, MATT +30, **Boss Dmg +10%** | AS +30, HP/MP +1,500, ATT +95, DEF +200, Boss +30%, IED +10% |
| 6 | Max HP +20%, Max MP +20%, WATT +20, MATT +20 | AS +30, HP/MP +1,500 & +20%, ATT +115, DEF +200, Boss +30%, IED +10% |
| 7 | WATT +20, MATT +20, **IED +10%** | AS +30, HP/MP +1,500 & +20%, ATT +135, DEF +200, Boss +30%, **IED +19%** (multiplicative) |

Source: <https://maplestorywiki.net/w/Equipment_Set/AbsoLab_Set_(Warrior)>
Cross-check (identical): <https://www.digitaltq.com/maplestory-set-effects>
**⚠ Do not use AyumiLove's AbsoLab table** (<https://ayumilove.net/maplestory-equipment-set/>) — it lists a 6-tier pre-revamp version ("2 Set: All Stat +30; 3 Set: ATT +30, IED 10%; …") that no longer matches the game.

##### AbsoLab base item stats (Warrior example)

| Item | Slot | Base stats |
|---|---|---|
| AbsoLab Knight Helm | Hat | STR/DEX +45, WATT +3, DEF +400, **IED +10%** |
| AbsoLab Knight Suit | Overall | STR/DEX +65, WATT +5, DEF +300 |
| AbsoLab Knight Shoes | Shoes | STR/DEX +20, WATT +5, DEF +150, Spd +10, Jmp +7 |
| AbsoLab Knight Gloves | Gloves | STR/DEX +20, WATT +5, DEF +150 |
| AbsoLab Knight Cape | Cape | All Stats +15, WATT/MATT +2, DEF +250 |
| AbsoLab Knight Shoulder | Shoulder | All Stats +14, WATT/MATT +10, DEF +100 |
| AbsoLab weapon (e.g. AbsoLab Bladecaster) | Weapon | STR/DEX +60, WATT +205, **Boss +30%, IED +10%** |

Source: <https://maplestorywiki.net/w/Equipment_Set/AbsoLab_Set_(Warrior)>

---

#### 3. Arcane Umbra Set

**Level 200.** 7 pieces: Hat, Overall (suit), Shoes, Gloves, Cape, Shoulder, Weapon. From Lucid / Will / Verus Hilla / Darknell / Gloom (Arcane Umbra Armor/Weapon Box), and Esfera / Moonbridge coin shops.

| Pieces | Effect at this tier | Cumulative |
|---|---|---|
| 2 | WATT +30, MATT +30, **Boss Dmg +10%** | ATT +30, Boss +10% |
| 3 | WATT +30, MATT +30, DEF +400, **IED +10%** | ATT +60, DEF +400, Boss +10%, IED +10% |
| 4 | All Stats +50, WATT +35, MATT +35, **Boss Dmg +10%** | AS +50, ATT +95, DEF +400, Boss +20%, IED +10% |
| 5 | Max HP +2,000, Max MP +2,000, WATT +40, MATT +40, **Boss Dmg +10%** | AS +50, HP/MP +2,000, ATT +135, Boss +30%, IED +10% |
| 6 | Max HP +30%, Max MP +30%, WATT +30, MATT +30 | AS +50, HP/MP +2,000 & +30%, ATT +165, DEF +400, Boss +30%, IED +10% |
| 7 | WATT +30, MATT +30, **IED +10%** | AS +50, HP/MP +2,000 & +30%, ATT +195, DEF +400, Boss +30%, **IED +19%** |

Source: <https://maplestorywiki.net/w/Equipment_Set/Arcane_Umbra_Set_(Warrior)>
Cross-check (identical): <https://www.digitaltq.com/maplestory-set-effects>

> Minor note: the wiki's own 5-set cumulative row prints "Defense: +200" where +400 is expected from the 3-set; this looks like a copy/paste artifact on the wiki (the 6-set and 7-set cumulative rows both correctly show DEF +400). Treat DEF +400 as correct from 3-set onward. **Flagged as a wiki typo, low confidence on the +200 figure.**

##### Arcane Umbra base item stats (Warrior example)

| Item | Slot | Base stats |
|---|---|---|
| Arcane Umbra Knight Hat | Hat | STR/DEX +65, WATT +7, DEF +600, **IED +15%** |
| Arcane Umbra Knight Suit | Overall | STR/DEX +85, WATT +9, DEF +500, **IED +10%** |
| Arcane Umbra Knight Shoes | Shoes | STR/DEX +40, WATT +9, DEF +250, Spd +10, Jmp +7 |
| Arcane Umbra Knight Gloves | Gloves | STR/DEX +40, WATT +9, DEF +250 |
| Arcane Umbra Knight Cape | Cape | All Stats +35, WATT/MATT +6, DEF +450 |
| Arcane Umbra Knight Shoulder | Shoulder | All Stats +35, WATT/MATT +20, DEF +300 |

Source: <https://maplestorywiki.net/w/Equipment_Set/Arcane_Umbra_Set_(Warrior)>

---

#### 4. Eternal Set (Eternal armor + Genesis/Destiny weapon)

**Level 250 armor, 8-piece set:** Hat, Top, Bottom, Shoes, Gloves, Cape, Shoulder, **Genesis / Destiny Weapon**. (Note: Eternal uses *separate Top and Bottom*, unlike AbsoLab/Arcane which use an Overall — this is why Eternal reaches 8.)

| Pieces | Effect at this tier | Cumulative |
|---|---|---|
| 2 | Max HP +2,500, Max MP +2,500, WATT +40, MATT +40, **Boss Dmg +10%** | HP/MP +2,500, ATT +40, Boss +10% |
| 3 | All Stats +50, WATT +40, MATT +40, DEF +600, **Boss Dmg +10%** | AS +50, HP/MP +2,500, ATT +80, DEF +600, Boss +20% |
| 4 | Max HP +15%, Max MP +15%, WATT +40, MATT +40, **Boss Dmg +10%** | AS +50, HP/MP +2,500 & +15%, ATT +120, DEF +600, Boss +30% |
| 5 | WATT +40, MATT +40, **IED +20%** | AS +50, ATT +160, DEF +600, Boss +30%, IED +20% |
| 6 | WATT +40, MATT +40, **Boss Dmg +15%** | AS +50, ATT +200, DEF +600, Boss +45%, IED +20% |
| 7 | All Stats +50, Max HP +2,500, Max MP +2,500, WATT +40, MATT +40, **Boss Dmg +15%** | **AS +100**, HP/MP +5,000 & +15%, ATT +240, DEF +600, Boss +60%, IED +20% |
| 8 | WATT +40, MATT +40, **Boss Dmg +15%** | **AS +100, HP/MP +5,000 & +15%, ATT +280, DEF +600, Boss +75%, IED +20%** |

Source: <https://maplestorywiki.net/w/Equipment_Set/Eternal_Set_(Warrior)>
Set-summary cross-check (same numbers, 2–8): <https://maplestorywiki.net/w/Eternal_Set>
DigitalTQ only documents 2–5 set (its values match) — <https://www.digitaltq.com/maplestory-set-effects>

##### Eternal armor sources (current, includes 2025–2026 bosses)

Hat / Top / Bottom / Shoulder — 10 pieces exchanged, or Armor Box:
- Normal/Chaos/Extreme **Kalos the Guardian** → Kalos's Residual Determination; Divine Eternal Armor Box (Chaos/Extreme)
- Normal/Hard/Extreme **First Adversary** → Echo of Ancient Resolve; Ancient Eternal Armor Box (Hard/Extreme)
- **Kaling** → Ferocious Beast Entanglement Ring; Ferocious Beast Eternal Armor Box (Hard/Extreme)
- **Malefic Star** → Blissful Fantasy Shard; Eternal Armor of Radiance Box (Hard)

Shoes / Gloves / Cape:
- **Limbo** → Distorted Ambition; Eternal Armor of Desire Box (Hard)
- **Baldrix** → Trace of Eternal Loyalty; Eternal Armor of Oaths Box (Hard)
- **Jupiter** → Lingering Twisted Desire; Eternal Twisted Armor Box (Hard)
- **Malicia** → Eternal Armor of Malice Box (Extreme) — **JMS/CMS/TMS only, not GMS**

Source: <https://maplestorywiki.net/w/Eternal_Set>

##### Eternal base item stats (Warrior example)

| Item | Slot | Base stats |
|---|---|---|
| Eternal Knight Helm | Hat | STR/DEX +80, WATT +10, DEF +750, **IED +15%** |
| Eternal Knight Armor | Top | STR/DEX +50, WATT +6, DEF +325, **IED +5%** |
| Eternal Knight Pants | Bottom | STR/DEX +50, WATT +6, DEF +325, **IED +5%** |
| Eternal Knight Shoes | Shoes | STR/DEX +55, WATT +12, DEF +325, Spd +10, Jmp +7 |
| Eternal Knight Gloves | Gloves | STR/DEX +55, WATT +12, DEF +325 |
| Eternal Knight Cape | Cape | All Stats +50, WATT/MATT +9, DEF +600 |
| Eternal Knight Shoulder | Shoulder | All Stats +51, WATT/MATT +28, DEF +450 |

Source: <https://maplestorywiki.net/w/Equipment_Set/Eternal_Set_(Warrior)>

---

#### 5. Genesis Weapon and Destiny Weapon

**There is no separate "Genesis weapon set".** Both the Genesis Weapon (Lv 200) and the Destiny Weapon (Lv 250) are the *weapon slot of the Eternal Set*, and both are Lucky Items that can slot into other sets.
Sources: <https://maplestorywiki.net/w/Genesis_Weapon> · <https://maplestorywiki.net/w/Destiny_Weapon>

##### Weapon base stats (Warrior examples)

| Weapon | Lv | Stats |
|---|---|---|
| Genesis Bladecaster (Adele) | 200 | STR/DEX +150, WATT +340, **Boss +30%, IED +20%** |
| Genesis Two-handed Sword | 200 | STR/DEX +150, WATT +340, Boss +30%, IED +20% |
| Genesis Saber (1H Sword) | 200 | STR/DEX +150, WATT +326, Boss +30%, IED +20% |
| Genesis Polearm | 200 | STR/DEX +150, WATT +304, Boss +30%, IED +20% |
| Genesis Desperado (DA) | 200 | STR +150, Max HP +2,800, WATT +340, Boss +30%, IED +20% |
| Destiny Bladecaster | 250 | STR/DEX +190, WATT +373, **Boss +30%, IED +20%** |
| Destiny Saber (1H Sword) | 250 | STR/DEX +190, WATT +358, Boss +30%, IED +20% |

Source: <https://maplestorywiki.net/w/Equipment_Set/Eternal_Set_(Warrior)>
**Note / UNVERIFIED:** the wiki renders the Destiny "Stage 1" and "Stage 2" weapon stat tables with *identical* numbers. Stage 2's upgrade is described in prose as being to the *skill* and star-force cap, not to the base line — but I could not independently confirm whether Stage 2 raises base WATT. **Treat "Stage 2 base stats = Stage 1 base stats" as unverified.**

##### Weapon-granted equipment skills (damage-relevant, not set effects)

| Skill | Granted by | Effect |
|---|---|---|
| **Tanadian Ruin** | Genesis 1st Awakening | Permanently **+10% Final Damage** (toggle) |
| **Aeonian Rise** | Genesis 2nd Awakening (liberation) | 10 s invincibility; on early end, 1500% ×7 hits on 12 enemies; 120 s CD |
| **Decisive Willpower** (Stage 1) | Destiny 1st Transcendence (renamed Tanadian Ruin) | Permanently **+10% Final Damage** |
| **Decisive Willpower** (Stage 2) | Destiny 2nd Transcendence | Permanently **+10% Final Damage, +15% Boss Damage, +15% IED** |
| **Undying Determination** | Destiny (renamed Aeonian Rise) | Stage 1: same as Aeonian Rise. Stage 2: also usable while using other skills |
| **Legacy of First Transcendence** | Destiny 2nd Transcendence | **+10% Attack Power (or Magic ATT) for 60 s**, 120 s CD |

Sources: <https://maplestorywiki.net/w/Tanadian_Ruin_(Skill)> · <https://maplestorywiki.net/w/Aeonian_Rise_(Skill)> · <https://maplestorywiki.net/w/Decisive_Willpower> · <https://maplestorywiki.net/w/Undying_Determination> · <https://maplestorywiki.net/w/Legacy_of_First_Transcendence> · <https://maplestorywiki.net/w/Destiny_Weapon>

**Liberated Genesis Weapon comes at:** Star Force 22★ (not enhanceable), 15% scrolls applied (non-Heroic), Unique Potential, Epic Bonus Potential (non-Heroic). **Destiny Stage 1:** 22★ not enhanceable, potentials carried over and upgraded to Lv250 values. **Destiny Stage 2:** 22★ **enhanceable to 25★**.
Sources: <https://maplestorywiki.net/w/Genesis_Weapon> · <https://maplestorywiki.net/w/Destiny_Weapon>

---

#### 6. Pitched Boss Set

**Maximum 10 counted pieces** (10 distinct equip slots; the multiple Cursed Spellbook colours, Mitra's Rage job variants, and the two Android Hearts are alternatives within one slot each).

| Pieces | Effect at this tier | Cumulative |
|---|---|---|
| 2 | All Stats +10, Max HP +250, WATT +10, MATT +10, **Boss +10%** | AS +10, HP +250, ATT +10, Boss +10% |
| 3 | All Stats +10, Max HP +250, WATT +10, MATT +10, DEF +250, **IED +10%** | AS +20, HP +500, ATT +20, DEF +250, Boss +10%, IED +10% |
| 4 | All Stats +15, Max HP +375, WATT +15, MATT +15, **Crit Damage +5%** | AS +35, HP +875, ATT +35, Boss +10%, IED +10%, CritDmg +5% |
| 5 | All Stats +15, Max HP +375, WATT +15, MATT +15, **Boss +10%** | AS +50, HP +1,250, ATT +50, Boss +20%, IED +10%, CritDmg +5% |
| 6 | All Stats +15, Max HP +375, WATT +15, MATT +15, **IED +10%** | AS +65, HP +1,625, ATT +65, Boss +20%, **IED +19%**, CritDmg +5% |
| 7 | All Stats +15, Max HP +375, WATT +15, MATT +15, **Crit Damage +5%** | AS +80, HP +2,000, ATT +80, Boss +20%, IED +19%, **CritDmg +10%** |
| 8 | All Stats +15, Max HP +375, WATT +15, MATT +15, **Boss +10%** | AS +95, HP +2,375, ATT +95, Boss +30%, IED +19%, CritDmg +10% |
| 9 | All Stats +15, Max HP +375, WATT +15, MATT +15, **Crit Damage +5%** | AS +110, HP +2,750, ATT +110, Boss +30%, IED +19%, **CritDmg +15%** |
| 10 | All Stats +20, Max HP +500, WATT +20, MATT +20, **Boss +10%** | **AS +130, HP +3,250, ATT +130, DEF +250, Boss +40%, IED +19%, CritDmg +15%** |

Source: <https://maplestorywiki.net/w/Pitched_Boss_Set>
Cross-check on the 10-set total (identical): <https://www.digitaltq.com/maplestory-set-effects>
MSEA calls this the "Boss of Darkness Set" (same page, Server Naming Difference table).

##### Members (current list) with slot, level, and drop source

| Item | Slot | Lv | Base stats | Dropped by |
|---|---|---|---|---|
| **Black Heart** | Android Heart | 120 | All Stats +50 (10 base + 40 class bonus), Max HP +100, WATT **or** MATT +77; fixed Potential **Boss +30%, IED +30%**. *Time-limited 20 days, cannot be extended.* | Hard Lotus (via Damaged Black Heart → Sensitive Squaroid) |
| **Berserked** | Face Accessory | 160 | All Stats +10, WATT/MATT +10, DEF +200 | Lose Control Heaven Core [Hard/Extreme] = Lotus |
| **Magic Eyepatch** | Eye Accessory | 160 | All Stats +15, WATT/MATT +3, DEF +300 | Restrained Sword of Destruction [Hard] = Damien |
| **Source of Suffering** | Pendant | 160 | All Stats +10, Max HP +5%, WATT/MATT +3, DEF +200 | Verus Hilla Treasure Chest [Hard] |
| **Cursed Spellbook** (Red/Blue/Green/Yellow) | Pocket Item | 160 | +20 to one main stat, +10 to the other three, HP/MP +100, WATT/MATT +10 | Hard Will |
| **Commanding Force Earring** | Earrings | 200 | All Stats +7, HP/MP +500, WATT/MATT +5, DEF +100 | Darknell Treasure Chest [Hard] |
| **Endless Terror** | Ring | 200 | All Stats +5, HP/MP +250, WATT/MATT +4 | Gloom Core [Chaos] |
| **Dreamy Belt** | Belt | 200 | All Stats +50, HP/MP +150, WATT/MATT +6, DEF +150 | Final Music Box [Hard] = Lucid |
| **Genesis Badge** | Badge | 200 | All Stats +15, WATT/MATT +10, Move Spd +10, Jump +10 | Genesis Crux [Hard/Extreme] = Black Mage |
| **Mitra's Rage: Warrior / Magician / Bowman / Thief / Pirate** | Emblem | 200 | Warrior: STR/DEX +40, Max HP +700, WATT/MATT +5. Others: two relevant stats +40, WATT/MATT +5 | Mitra's Rage Selection Box (Kaling) |
| **Total Control** | Android Heart | 200 | All Stats +25, Max HP +1,250, WATT/MATT +15, **IED +30%** | Lose Control Heaven Core [Extreme] = Extreme Kaling |

Sources: <https://maplestorywiki.net/w/Pitched_Boss_Set> (member table) · per-item drop sources from <https://maplestorywiki.net/w/Black_Heart>, <https://maplestorywiki.net/w/Berserked>, <https://maplestorywiki.net/w/Magic_Eyepatch>, <https://maplestorywiki.net/w/Source_of_Suffering>, <https://maplestorywiki.net/w/Commanding_Force_Earring>, <https://maplestorywiki.net/w/Endless_Terror>, <https://maplestorywiki.net/w/Dreamy_Belt>, <https://maplestorywiki.net/w/Genesis_Badge>, <https://maplestorywiki.net/w/Total_Control>, <https://maplestorywiki.net/w/Mitra%27s_Rage:_Warrior> · cross-check on membership: <https://grandislibrary.com/content/progression-guide>

##### ⚠ Corrections to the brief's assumed member list
- **Daybreak Pendant and Estella Earrings are NOT Pitched Boss items** — they are **Dawn Boss Set** items (see §7).
- **Whisper of the Source is NOT a Pitched Boss item** — it is the *first* item of the **Brilliant Boss Set** (see §8). Source: <https://maplestorywiki.net/w/Whisper_of_the_Source>
- **"Grindstone of Life" is not equipment at all.** It is a consumable used to upgrade untradable Level 4 Special Skill Rings to Level 5 (Ring of Restraint, Continuous Ring, and GMS-only rings such as Weapon Jump S/I/L/D, Risk Taker, Totalling, Critical Damage). Dropped by Kalos/World Heart/Crooked Scale/Peace Blooms Again in **Interactive/non-Reboot worlds only**. Source: <https://maplestorywiki.net/w/Grindstone_of_Life>

##### Exceptional Enhancement (applies to Pitched + Brilliant)

Exceptional Hammers can be applied **1×** to Pitched Boss Set pieces and **3×** to Brilliant Boss Set pieces. 0→1 is 100% free; 1→2 is 50% (1 hammer, 2.5B mesos) or 100% (2 hammers, 5B); 2→3 is 25% (1 hammer, 5B) or 50% (2 hammers, 10B). Extraction costs 10B mesos.

| Hammer | Usable on | Dropped by |
|---|---|---|
| Exceptional Hammer (Belt) | Dreamy Belt | Extreme Black Mage |
| Exceptional Hammer (Face Acc) | Berserked, **Original Sin of Pride** | Extreme Chosen Seren |
| Exceptional Hammer (Eye Acc) | Magic Eyepatch | Extreme Kalos |
| Exceptional Hammer (Earrings) | Commanding Force Earring | Extreme Kaling |
| Exceptional Hammer (Medal) | **Immortal Legacy** | Extreme First Adversary |

Added GMS 243 (19 Jul 2023); extraction added GMS 255 (20 Nov 2024); Medal hammer added **GMS 265 (17 Dec 2025)**.
Source: <https://maplestorywiki.net/w/Exceptional_Enhancement>

---

#### 7. Dawn Boss Set

**4 pieces max.**

| Pieces | Effect at this tier | Cumulative |
|---|---|---|
| 2 | All Stats +10, Max HP +250, WATT +10, MATT +10, **Boss +10%** | AS +10, HP +250, ATT +10, Boss +10% |
| 3 | All Stats +10, Max HP +250, WATT +10, MATT +10 | AS +20, HP +500, ATT +20, Boss +10% |
| 4 | All Stats +10, Max HP +250, WATT +10, MATT +10, DEF +100, **IED +10%** | **AS +30, HP +750, ATT +30, DEF +100, Boss +10%, IED +10%** |

Source: <https://maplestorywiki.net/w/Equipment_Set/Dawn_Boss_Set>

| Item | Slot | Lv | Base stats | Source |
|---|---|---|---|---|
| Daybreak Pendant | Pendant | 140 | All Stats +8, Max HP +5%, WATT/MATT +2, DEF +100 | Verus Hilla / Chosen Seren |
| Twilight Mark | Face Accessory | 140 | All Stats +5, WATT/MATT +5, DEF +100 | Lucid / Will |
| Estella Earrings | Earrings | 160 | All Stats +7, HP/MP +300, WATT/MATT +2, DEF +100 | Gloom / Darknell |
| **Dawn** Guardian Angel Ring | Ring | 160 | All Stats +5, HP/MP +200, WATT/MATT +2 | Guardian Angel Slime — requires a **Conversion Scroll** from Chief Slime to convert a normal Guardian Angel Ring (which is a *Boss Accessory Set* item) into the Dawn version |

Sources: <https://maplestorywiki.net/w/Equipment_Set/Dawn_Boss_Set> (stats) · <https://grandislibrary.com/content/progression-guide> (boss sources + conversion-scroll mechanic)

---

#### 8. Brilliant Boss Set ("Radiant" / KMS 광휘의 보스 세트)

Successor tier to the Pitched Boss Set. All members are **Level 250**, from Hard-mode Level 260+ Grandis bosses.

| Pieces | Effect at this tier | Cumulative |
|---|---|---|
| 2 | All Stats +20, Max HP +500, WATT +20, MATT +20, **Boss +15%** | AS +20, HP +500, ATT +20, Boss +15% |
| 3 | All Stats +20, Max HP +500, WATT +20, MATT +20, **IED +15%** | AS +40, HP +1,000, ATT +40, Boss +15%, IED +15% |
| 4 | All Stats +20, Max HP +500, WATT +20, MATT +20, **Crit Damage +5%** | AS +60, HP +1,500, ATT +60, Boss +15%, IED +15%, CritDmg +5% |
| 5 | All Stats +20, Max HP +500, WATT +20, MATT +20, **Boss +15%** | **AS +80, HP +2,000, ATT +80, Boss +30%, IED +15%, CritDmg +5%** |
| 6 **(KMS only)** | All Stats +20, Max HP +500, WATT +20, MATT +20, **Crit Damage +7.5%** | AS +100, HP +2,500, ATT +100, Boss +30%, IED +15%, CritDmg +12.5% |

Source: <https://maplestorywiki.net/w/Brilliant_Boss_Set> (the wiki explicitly footnotes the 6-set tier and the eye accessory as **KMS only**)
MSEA name: "Boss of Brilliant Set" (same page).

##### Members

| Item | Slot | Lv | Base stats | Dropped by | Region |
|---|---|---|---|---|---|
| **Whisper of the Source** | Ring | 250 | All Stats +10, HP/MP +500, WATT/MATT +5 | **Hard Limbo** | GMS ✓ (1st added) |
| **Oath of Death** | Pendant | 250 | All Stats +15, Max HP +5%, WATT/MATT +5, DEF +300 | **Hard Baldrix** (Concentrated Magical Essence) | GMS ✓ (2nd) |
| **Immortal Legacy** | Medal | 250 | All Stats +10, HP/MP +500, WATT/MATT +10 | **Hard / Extreme First Adversary** (World Heart) | GMS ✓ (3rd) |
| **Blissful Nightmare** | Ring | 250 | All Stats +10, HP/MP +500, WATT/MATT +5 | **Hard Malefic Star** (Crooked Scale) | GMS ✓ (4th) |
| **Original Sin of Pride** | Face Accessory | 250 | All Stats +15, WATT/MATT +15, DEF +300 | **Hard Jupiter** (Alchemical Remnant) | GMS ✓ (5th) |
| 굶주리는 핏빛 원혼 (*Starving Blood-Red Wraith*) | Eye Accessory | 250 | All Stats +20, WATT/MATT +5, DEF +450 | — | **KMS only** |

Sources: <https://maplestorywiki.net/w/Brilliant_Boss_Set> · <https://maplestorywiki.net/w/Whisper_of_the_Source> · <https://maplestorywiki.net/w/Oath_of_Death> · <https://maplestorywiki.net/w/Immortal_Legacy> · <https://maplestorywiki.net/w/Blissful_Nightmare> · <https://maplestorywiki.net/w/Original_Sin_of_Pride>

**Note on two rings:** Whisper of the Source and Blissful Nightmare are both rings and both count, since a character has 4 ring slots — so **5-set is achievable in GMS**.

---

#### 9. Boss Accessory Set (generic)

Counts at **3 / 5 / 7 / 9** pieces only.

| Pieces | Effect at this tier | Cumulative |
|---|---|---|
| 3 | All Stats +10, Max HP +5%, Max MP +5%, WATT +5, MATT +5, DEF +60 | AS +10, HP/MP +5%, ATT +5, DEF +60 |
| 5 | All Stats +10, Max HP +5%, Max MP +5%, WATT +5, MATT +5, DEF +60 | AS +20, HP/MP +10%, ATT +10, DEF +120 |
| 7 | All Stats +10, WATT +10, MATT +10, DEF +80, **IED +10%** | AS +30, HP/MP +10%, ATT +20, DEF +200, IED +10% |
| 9 | All Stats +15, WATT +10, MATT +10, DEF +100, **Boss Damage +10%** | **AS +45, HP/MP +10%, ATT +30, DEF +300, Boss +10%, IED +10%** |

Source: <https://maplestorywiki.net/w/Equipment_Set/Boss_Accessory_Set>
Cross-check (identical): <https://www.digitaltq.com/maplestory-set-effects>

##### Members

| Item | Slot | Lv | Base stats | Boss |
|---|---|---|---|---|
| Condensed Power Crystal | Face | 110 | AS +5, ATT +5, DEF +100 | Zakum |
| Aquatic Letter Eye Accessory | Eye | 100 | AS +6, ATT +1, DEF +100 | Zakum |
| Black Bean Mark | Eye | 135 | AS +7, ATT +1, DEF +120 | Pink Bean |
| Papulatus Mark | Eye | 145 | AS +8, ATT +1, DEF +150 | Chaos Papulatus |
| Dea Sidus Earring | Earrings | 130 | AS +5, ATT +2, DEF +50 | — |
| Will o' the Wisps | Earrings | 130 | AS +7, HP/MP +100, ATT +2, DEF +100 | Horntail |
| Silver Blossom Ring | Ring | 110 | AS +5, ATT +2 | Horntail |
| Noble Ifia's Ring | Ring | 120 | AS +5, HP/MP +200, ATT +2 | Ifia (NPC) |
| Guardian Angel Ring | Ring | 160 | AS +5, HP/MP +200, ATT +2 | Guardian Angel Slime |
| Horntail Necklace | Pendant | 120 | AS +7, DEF +108 | Easy/Normal Horntail |
| Chaos Horntail Necklace | Pendant | 120 | AS +10, HP/MP +10%, ATT +2, DEF +140 | Chaos Horntail |
| Mechanator Pendant | Pendant | 120 | AS +10, HP/MP +250, ATT +1, DEF +100 | Arkarium |
| Dominator Pendant | Pendant | 140 | AS +20, HP/MP +10%, ATT +3, DEF +100 | Arkarium |
| Golden Clover Belt | Belt | 140 | AS +15, HP/MP +150, ATT +1, DEF +150 | Pink Bean |
| Enraged Zakum Belt | Belt | 150 | AS +18, HP/MP +150, ATT +1, DEF +150 | Chaos Zakum |
| Royal Black Metal Shoulder | Shoulder | 120 | AS +10, ATT +6, DEF +100 | Magnus |
| Stone of Eternal Life | Pocket | — | AS +3, ATT +3 | Hilla |
| Pink Holy Cup | Pocket | 140 | AS +5, HP/MP +50, ATT +5 | Pink Bean |
| Crystal Ventus Badge | Badge | 130 | AS +10, ATT +5, Spd/Jmp +10 | Magnus |

Sources: <https://maplestorywiki.net/w/Equipment_Set/Boss_Accessory_Set> (stats) · <https://grandislibrary.com/content/progression-guide> (boss attribution)

---

#### 10. Gollux Sets

All four tiers are **4 pieces**: Earrings, Ring, Engraved Pendant, Engraved Belt. Purchased from Lucia with Gollux Coins/Pennies; Belt + Earrings also drop directly from Gollux.

##### Superior Gollux Set (Lv 150) — Hell Gollux

| Pieces | Effect | Cumulative |
|---|---|---|
| 2 | All Stats +20, Max HP +1,500, Max MP +1,500 | AS +20, HP/MP +1,500 |
| 3 | Max HP +13%, Max MP +13%, WATT +35, MATT +35 | + HP/MP +13%, ATT +35 |
| 4 | **Boss Damage +30%, IED +30%** | **AS +20, HP/MP +1,500 & +13%, ATT +35, Boss +30%, IED +30%** |

Source: <https://maplestorywiki.net/w/Equipment_Set/Superior_Gollux_Set>
Cross-checks (identical): <https://www.digitaltq.com/maplestory-set-effects> · <https://ayumilove.net/maplestory-equipment-set/>

Items: Superior Gollux Earrings (AS +15, HP/MP +150, ATT +10, DEF +100) · Superior Gollux Ring (AS +10, HP/MP +250, ATT +8, DEF +150, Spd +10) · Superior Engraved Gollux Pendant (AS +28, HP/MP +300, ATT +5, DEF +100) · Superior Engraved Gollux Belt (AS +60, HP/MP +200, **ATT +35**, DEF +100).

##### Reinforced Gollux Set (Lv 140) — Hard/Hell Gollux

| Pieces | Effect | Cumulative |
|---|---|---|
| 2 | All Stats +15, Max HP +1,200, Max MP +1,200 | AS +15, HP/MP +1,200 |
| 3 | Max HP +10%, Max MP +10%, WATT +30, MATT +30 | + HP/MP +10%, ATT +30 |
| 4 | **Boss Damage +30%, IED +15%** | **AS +15, HP/MP +1,200 & +10%, ATT +30, Boss +30%, IED +15%** |

Source: <https://maplestorywiki.net/w/Equipment_Set/Reinforced_Gollux_Set> · cross-check <https://ayumilove.net/maplestory-equipment-set/>

Items: Earrings (AS +12, HP/MP +150, ATT +6, DEF +100) · Ring (AS +8, HP/MP +200, ATT +5, DEF +150, Spd +10) · Pendant (AS +23, HP/MP +300, ATT +3, DEF +100) · Belt (AS +30, HP/MP +200, ATT +20, DEF +100).

##### Solid Gollux Set (Lv 130)

| Pieces | Effect | Cumulative |
|---|---|---|
| 2 | All Stats +12, Max HP +800, Max MP +800 | AS +12, HP/MP +800 |
| 3 | Max HP +8%, Max MP +8%, WATT +20, MATT +20 | + HP/MP +8%, ATT +20 |
| 4 | **IED +15%**; 5% chance to apply Level 2 Freeze when attacking | **AS +12, HP/MP +800 & +8%, ATT +20, IED +15%, 5% Lv2 Freeze** |

Source: <https://maplestorywiki.net/w/Equipment_Set/Solid_Gollux_Set> · cross-check <https://ayumilove.net/maplestory-equipment-set/>
Items: Earrings (AS +10, HP/MP +100, ATT +5, DEF +100) · Ring (AS +6, HP/MP +100, ATT +4, DEF +100) · Pendant (AS +19, HP/MP +250, ATT +3, DEF +100) · Belt (AS +10, HP/MP +200, ATT +10, DEF +100).

##### Cracked Gollux Set (Lv 120)

| Pieces | Effect | Cumulative |
|---|---|---|
| 2 | All Stats +10, Max HP +500, Max MP +500 | AS +10, HP/MP +500 |
| 3 | Max HP +5%, Max MP +5%, WATT +12, MATT +12 | + HP/MP +5%, ATT +12 |
| 4 | **IED +15%**; 5% chance to apply Level 2 Freeze when attacking | **AS +10, HP/MP +500 & +5%, ATT +12, IED +15%, 5% Lv2 Freeze** |

Source: <https://maplestorywiki.net/w/Equipment_Set/Cracked_Gollux_Set> · cross-check <https://ayumilove.net/maplestory-equipment-set/>
Items: Earrings (AS +9, HP/MP +80, ATT +4, DEF +100) · Ring (AS +4, HP/MP +50, ATT +2, DEF +50) · Pendant (AS +15, HP/MP +200, ATT +3, DEF +100) · Belt (AS +8, HP/MP +200, DEF +100).

---

#### 11. Meister / "Ardentmill" accessory set

There is **no set literally named "Meister Set" or "Masterwork Set"** in the current wiki. The Meister crafted accessories belong to the **Ardentmill Set**. A wiki search for "Masterwork" returns only *Masterwork Charges* / *Evolving Masterwork Charges* (not accessories) — so the brief's "Masterwork sets" is **UNVERIFIED / likely nonexistent**.

| Pieces | Effect | Cumulative |
|---|---|---|
| 2 | Max HP +10%, Max MP +10% | HP/MP +10% |
| 3 | WATT +40, MATT +40 | + ATT +40 |
| 4 | **Boss Damage +20%** | **HP/MP +10%, ATT +40, Boss +20%** |

Source: <https://maplestorywiki.net/w/Ardentmill_Set>

| Item | Slot | Lv | Base stats |
|---|---|---|---|
| Meister Earring | Earrings | 140 | All Stats +5, HP/MP +500, WATT/MATT +4, DEF +70. Max Star Force **30**. Boss Reward item (extra Bonus Stats). |
| Meister Ring | Ring | 140 | All Stats +5, HP/MP +200, WATT/MATT +1, DEF +150. Max Star Force **30**. Only one may be equipped at a time. |
| Meister Shoulder | Shoulder | 140 | All Stats +13, WATT/MATT +9, DEF +150. Max Star Force **30**. |
| Meister weapons (e.g. Meister Thanatos, Lv 145) | Weapon | 145 | class-specific | 

Sources: <https://maplestorywiki.net/w/Ardentmill_Set> · <https://maplestorywiki.net/w/Meister_Ring> · <https://maplestorywiki.net/w/Meister_Earring> · <https://maplestorywiki.net/w/Meister_Shoulder>

There is **no Meister Pendant** in the Ardentmill Set (the brief listed one). The 4th slot is filled by a Meister *weapon*.

Practical note (secondary source, not authoritative): the Meister shoulder conflicts with other shoulder BiS choices, which is why the 3-set is usually the practical stopping point; the Meister Ring is a common BiS because at Lv140 it can reach full star force. Source: <https://www.digitaltq.com/maplestory-accessory-crafting-guide-meister-ring>

Related sibling sets on the same page family (no damage relevance beyond stats): *Immortal Ardentmill Hero Set*, *Eternal Ardentmill Hero Set* — see <https://maplestorywiki.net/w/Equipment_Set>.

---

#### 12. Blackgate Set (and "Whitegate")

**Blackgate Set** — Level 120, 10 pieces: Cap, Mask, Armor (overall), Boots, Gloves, Cape, Shoulder, Belt, Necklace, Ring.

| Pieces | Effect | Cumulative |
|---|---|---|
| 3 | All Stats +10, WATT +5, MATT +5 | AS +10, ATT +5 |
| 6 | All Stats +10, Max HP +2%, Max MP +2%, WATT +5, MATT +5, DEF +50 | AS +20, HP/MP +2%, ATT +10, DEF +50 |
| 10 | All Stats +20, Max HP +8%, Max MP +8%, WATT +15, MATT +15, DEF +200, **IED +30%**, 5% chance Level 2 Freeze | **AS +40, HP/MP +10%, ATT +25, DEF +250, IED +30%, 5% Lv2 Freeze** |

Source: <https://maplestorywiki.net/w/Blackgate_Set>

**"Whitegate Set" does not exist** — a MediaWiki full-text search of maplestorywiki.net for "Whitegate" returns **zero results** (`https://maplestorywiki.net/api.php?action=query&list=search&srsearch=Whitegate`). **UNVERIFIED / believed nonexistent.**

**Ryude's Sword** is a standalone Lv 120 two-handed sword with a special effect (70% chance to add one extra attack line on skill use, not applicable to all skills) — it is **not** part of a "gate" set. Sources: <https://maplestorywiki.net/w/Ryude's_Sword> · <https://maplestory.net/discover/item/1402224/ryude-s-sword>

**Silver Blossom Ring** is a **Boss Accessory Set** member (§9), not a "gate" set item. Source: <https://maplestorywiki.net/w/Equipment_Set/Boss_Accessory_Set>

---

#### 13. Other accessory / misc sets with damage-relevant effects

##### Masteria's Legacy (Lv 180)

| Pieces | Effect | Cumulative |
|---|---|---|
| 4 | All Stats +35, HP/MP +1,000, WATT/MATT +35, **IED +5%, Boss +5%** | AS +35, HP/MP +1,000, ATT +35, IED +5%, Boss +5% |
| 5 | All Stats +5, HP/MP +5%, WATT/MATT +5, **IED +5%, Boss +5%, Crit Rate +5%** | AS +40, HP/MP +1,000 & +5%, ATT +40, **IED +9.75%**, Boss +10%, Crit Rate +5% |
| 6 | All Stats +10, WATT/MATT +10, **IED +15%, Boss +20%, Crit Rate +5%** | **AS +50, HP/MP +1,000 & +5%, ATT +50, IED +23.2875%, Boss +30%, Crit Rate +10%** |

Source: <https://maplestorywiki.net/w/Masteria%27s_Legacy> (note the explicit multiplicative-IED footnote here: 9.75% and 23.2875%)
Members include Numenal's Willpower (Earrings, AS +1, HP/MP +150, ATT +5, DEF +100), Glona's Heart (Ring, AS +7, HP/MP +150, ATT +5, DEF +100), Legacy of Light (Pendant, AS +20, DEF +100), and others.

##### Sweetwater Set

| Pieces | Effect | Cumulative |
|---|---|---|
| 2 | All Stats +25, WATT/MATT +20 | AS +25, ATT +20 |
| 3 | All Stats +75, WATT/MATT +35 | AS +100, ATT +55 |
| 4 | All Stats +95, WATT/MATT +48 | AS +195, ATT +103 |
| 5 | DEF +100 | AS +195, ATT +103, DEF +100 |
| 6 | Max HP +20%, Max MP +20%, DEF +200, **Boss Damage +30%** | **AS +195, HP/MP +20%, ATT +103, DEF +300, Boss +30%** |

Source: <https://maplestorywiki.net/w/Sweetwater_Set>

##### Kritias Set (Lv 150, 3 pieces: Inverse Jewel Earring, Inverse Metal Shoulder, Inverse Codex)

| Pieces | Effect |
|---|---|
| 3 | WATT +20, MATT +20, **Boss Damage +20%** |

Source: <https://maplestorywiki.net/w/Kritias_Set>

##### Sengoku Treasure Set (Lv 140, 3 pieces: Kanna's Treasure ring, Ayame's Treasure belt, Hayato's Treasure shoulder)

| Pieces | Effect | Cumulative |
|---|---|---|
| 2 | All Stats +2, WATT/MATT +3, DEF +20, **Damage +3%** | AS +2, ATT +3, DEF +20, Dmg +3% |
| 3 | All Stats +8, WATT/MATT +12, DEF +80, **Damage +6%** | **AS +10, ATT +15, DEF +100, Damage +9%** |

Source: <https://maplestorywiki.net/w/Sengoku_Treasure_Set>
(Note: this is *Damage %*, not Boss Damage %.)

##### Golden Flower Accessory Set (Lv 120)

| Pieces | Effect | Cumulative |
|---|---|---|
| 3 | All Stats +8, WATT/MATT +3, DEF +50 | AS +8, ATT +3, DEF +50 |
| 6 | All Stats +8, HP/MP +5%, WATT/MATT +5, DEF +50 | AS +16, HP/MP +10%, ATT +10, DEF +100 |
| 9 | All Stats +15, WATT/MATT +7, DEF +100, **Boss Damage +10%** | **AS +31, HP/MP +10%, ATT +17, DEF +200, Boss +10%** |

Source: <https://maplestorywiki.net/w/Golden_Flower_Accessory_Set>

##### Frozen Set

| Pieces | Effect | Cumulative |
|---|---|---|
| 3 | All Stats +7, WATT/MATT +6 | AS +7, ATT +6 |
| 4 | Max HP +20%, Max MP +20%, ATT/MATT +14, **Damage +9%** | AS +7, HP/MP +20%, ATT +20, Damage +9% |
| 5 | All Stats +8, ATT/MATT +20, **IED +30%** | **AS +15, HP/MP +20%, ATT +40, Damage +9%, IED +30%** |

Source: <https://maplestorywiki.net/w/Frozen_Set>

##### Antique Totem Set

| Pieces | Effect |
|---|---|
| 3 | WATT +15, MATT +15 |

Source: <https://maplestorywiki.net/w/Antique_Totem_Set>

##### Mystic Set (Lv 115)

| Pieces | Effect | Cumulative |
|---|---|---|
| 3 | All Stats +7, WATT/MATT +6 | AS +7, ATT +6 |
| 4 | All Stats +7, WATT/MATT +6 | AS +14, ATT +12 |
| 5 | All Stats +7, WATT/MATT +6 | AS +21, ATT +18 |

Source: <https://maplestorywiki.net/w/Mystic_Set>

---

#### 14. Android / Pet sets

**Android Set** — this is a *cosmetic android parts* set (Lv-low), not the Pitched android hearts. Its effects are trivial and it is listed under "No Longer Obtainable / Event Only": 2-set All Stats +2, Speed +10; 4-set All Stats +4, WATT +5, MATT +10, Speed +15; 5-set All Stats +5, WATT +10, MATT +15, Speed +20.
Source: <https://maplestorywiki.net/w/Android_Set> · category listing: <https://maplestorywiki.net/w/Equipment_Set>

**Android Hearts that matter for damage** are the two Pitched Boss Set members (§6): Black Heart and Total Control.

**Pet sets:** a wiki search for "Pet Equipment Set" returns **zero results**. There is no damage-relevant pet equipment set effect in the current wiki data. **UNVERIFIED / believed nonexistent.**

---

#### 15. Newly added 2025–2026 content — findings

I enumerated every page in `Category:Equipment Sets` on maplestorywiki.net sorted by most-recently-touched (`api.php?action=query&list=categorymembers&cmtitle=Category:Equipment%20Sets&cmsort=timestamp&cmdir=desc`). **There is no new endgame armor or accessory set tier beyond those documented above.** Specifically:

- **No "Eternel Set" separate tier.** "Eternel" (에테르넬) is simply the Korean romanization of **Eternal**; NamuWiki's "에테르넬 세트" page is the Eternal Set. Source: <https://maplestorywiki.net/w/Eternal_Set>
- **No Tallahart / Limbo / Baldrix / Jupiter *armor* set.** Those bosses feed the **existing Eternal Set** (shoes/gloves/cape branch) and the **Brilliant Boss Set** accessories. Sources: <https://maplestorywiki.net/w/Eternal_Set> · <https://maplestorywiki.net/w/Brilliant_Boss_Set>
- **The Brilliant Boss Set is the newest set** and is still being expanded one boss at a time: Whisper of the Source (Limbo) → Oath of Death (Baldrix) → Immortal Legacy (First Adversary) → Blissful Nightmare (Malefic Star) → Original Sin of Pride (Jupiter). A 6th KMS-only eye accessory exists.
- **Exceptional Hammer (Medal)** was added in **GMS 265, 17 Dec 2025** ("Every Little Thing Every Precious Thing Part 2"), enabling Exceptional Enhancement on Immortal Legacy. Source: <https://maplestorywiki.net/w/Exceptional_Enhancement>
- **Destiny Weapon 2nd stage of Transcendence** was added in the **Crown / Ride The Lightning** update (= current GMS v269) and is the newest damage-relevant weapon upgrade: +15% Boss Damage and +15% IED on Decisive Willpower, plus the Legacy of First Transcendence buff (+10% ATT / MATT for 60 s), plus 25★ enhanceability. Source: <https://maplestorywiki.net/w/Destiny_Weapon>
- **Star Force cap of 30** now appears on accessory pages (e.g. Meister Ring/Earring/Shoulder: "Max Star Force Enhancements: 30"). Source: <https://maplestorywiki.net/w/Meister_Ring>
- Recently-touched pages that are *not* endgame relevant: Pinnacle Set, Emperor's Memories Set, Mystic Set, Red Beryl Set, Frost Fiend Set, Challenger Sets — all low-level / legacy content.

---

#### 16. Open gaps and unresolved items

| Item | Status |
|---|---|
| NamuWiki (KMS) and Fandom MapleWiki cross-checks | **Blocked** by Cloudflare — could not retrieve. All numbers rest primarily on maplestorywiki.net, with DigitalTQ/AyumiLove as partial corroboration. |
| Official Nexon GMS patch-note confirmation of any set table | **Not obtained.** No first-party Nexon page was successfully parsed for numeric set effects. |
| "Lucky Item" wildcard mechanic in GMS | Documented only from the **MSEA** wiki. Mechanic is believed identical in GMS but is **PARTIALLY UNVERIFIED for GMS**. |
| Destiny Weapon Stage 2 base weapon stats | Wiki shows Stage 1 and Stage 2 tables with identical numbers. **UNVERIFIED** whether Stage 2 raises base WATT. |
| Arcane Umbra 5-set cumulative DEF | Wiki prints +200 where +400 is implied. **Suspected wiki typo.** |
| Root Abyss 3-set on the summary page ("All Stats +9") | **Contradicts** the class detail pages and DigitalTQ ("Max HP/MP +10%, ATT +50"). Class pages preferred. |
| Per-class Root Abyss / AbsoLab / Arcane / Eternal variants for Demon Avenger, Xenon, Zero | Only Warrior and Magician variants were captured. Xenon (3 main stats), Demon Avenger (HP-based), and Zero (Lapis/Lazuli, requires Lucky Item Scroll) will differ. **Not captured — follow up on the five per-class pages.** |
| "Masterwork" accessory set, "Whitegate" set, "Meister Pendant", pet set effects | **No wiki evidence they exist.** Treat as nonexistent unless a first-party source is found. |
| Full Ifia's Treasure Set, Party Quest Set, Masteria Explorer Set, Chaos Pink Bean I / Black Bean, Guild Castle Brooch, Seven Days, Tinkerer's, Cook's, Goddess/Minerva, Immortal/Eternal Hero | Not captured — all are low-level or negligible for a damage calculator. Index: <https://maplestorywiki.net/w/Equipment_Set> |

---

### Appendix A — Cross-cutting 2025-2026 patch detail (KMS CROWN)

Compiled directly from Orange Mushroom's translations of the KMS patch notes. This is the
single largest recent change to the systems in this document, and several of the tables above
were rewritten by it.

#### A.1 CROWN link skill master-level table (KMS, ver. 1.2.410, 2025-12-28)

The KMS patch note publishes both columns: what a *mule* gives you when transferred, and what
the *owning character* gets. Where only one value is shown, the two are identical.
This is the definitive statement of the "self-only damage passive" mechanic that §4 describes.

| Link Skill | When transferred (mule → you) | For yourself (owner) |
|---|---|---|
| Invincible Belief | Below 15% HP, recover 44% max HP/sec for 3s. CD 150s. | same + **[Passive: 6% damage]** |
| Empirical Knowledge | 31% chance to reveal a weakspot, 10s, stacks 3×. 5% damage and 5% DEF ignore per stack. | same |
| Adventurer Curious | 50% Monster Collection rate, 15% crit rate | 50% MC rate, 15% crit rate, **6% damage** |
| Thief Cunning | On status-effected enemy, 27% damage for 10s. CD 20s. | same |
| Pirate Bless | 100 STR/DEX/INT/LUK, Max HP 1750, Max MP 1750, 21% damage reduction | **130** STR/DEX/INT/LUK, Max HP 1750, Max MP 1750, 21% damage reduction |
| Cygnus Bless | 35 ATT & MATT, 22 status resistance, 22% elemental resistance | **55** ATT & MATT, 22 status resistance, 22% elemental resistance |
| Guardian of Light | 20s, +100 status resistance. CD 120s. | 30s shield, blocks damage up to 9 times, **+25% damage**; %HP attacks reduced 30%. CD 120s. **[Passive: 3% damage]** |
| Combo Kill Advantage | Combo Kill Orb EXP +900% | +900% and **5% damage** |
| Rune Persistence | Liberated Rune's Power duration +70% | +70% and **5% damage** |
| Elf's Blessing | Return to Elluel, CD 1800s. [Passive: 20% EXP] | same, [Passive: 20% EXP, **5% damage**] |
| Deadly Instinct | 20% crit rate | 20% crit rate, **5% damage** |
| Close Call | 15% chance to survive a fatal hit | same + **[Passive: 5% damage]** |
| Permeate | 20% DEF ignore | 20% DEF ignore, **4% damage** |
| Spirit of Freedom | On revive, 12s invincibility (cancelled on map change) | same + **[Passive: 5% damage]** |
| Demon's Fury | 20% boss damage | 20% boss damage, absorb an additional 10 Force |
| Wild Rage | 15% damage | same |
| Hybrid Logic | 15% all stats | same |
| Iron Will | 20% HP | 15% HP, **5% damage per Morph Gauge stage** |
| Prior Preparation | Defeat 8 enemies or hit a boss 5× = 1 preparation; at 5 preparations, +25% damage for 20s. CD 40s. | same |
| Intensive Assault | +9% damage vs lower-level monsters; +9% damage vs status-effected enemies | same |
| Soul Contract | +60% damage for 10s. CD 60s. | **+120%** damage for 10s. CD 60s. |
| Rhinne's Blessing | 20% damage taken reduction, 15% DEF ignore | same + **4% damage** |
| Judgement | 6% critical damage | same |
| Noblesse | 6% boss damage; 3% damage per party member in map (incl. self), up to 12%. Solo counts as a party of 1. | same |
| Tide of Battle | On moving a distance, activates 10s, up to 4 stacks, 4% damage per stack | activates **25s**, up to 4 stacks, 4% damage per stack |
| Innate Gift | **7% damage**; on attack, 100% chance to recover 3% max HP/MP per sec for 5s. CD 30s. | **10% damage**; same recovery |
| Solus | In combat 5s → activates 5s, up to 5 stacks. 1% damage and 3% damage per stack. | same |
| Grounded Body | 6% reduced damage taken (incl. %HP attacks) | same + **5% damage** |
| Nature's Friend | **7% damage**; defeat 20 normal monsters → Nature's Help 30s, +15% normal monster damage. CD 30s. | **10% damage**; same |
| Bravado | 15% DEF ignore; +19% damage vs monsters at 100% HP | 15% DEF ignore, **4% damage**; +19% damage vs monsters at 100% HP |

Source: <https://orangemushroom.net/2025/12/28/kms-ver-1-2-410-maplestory-crown-kinesis-remaster/>
(section "Link Skill Expansion", reproduced verbatim).

> **Server caveat.** This is the **KMS** table, reached via the *Proof of a Radiant Hero* item
> (level 285 + Carcion story quests, once per character, usable on one link skill).
> **GMS reaches level 3 differently — simply by having the contributing character at level 210** —
> per <https://maplestorywiki.net/w/Link_Skills>. So GMS characters get level 3 on *every* link
> naturally, whereas KMS players must spend the item on one. The *values* in §4's GMS tables are
> the ones to use for a GMS calculator; this KMS table is useful for confirming the shape of the
> self-only passives and for anticipating changes.

#### A.2 CROWN Sacred Symbol level-11 bonus table (KMS, 2025-12-18)

| Symbol at level 11 | Additional effect |
|---|---|
| Sacred Symbol: Cernium | +20% damage vs **Chosen Seren**; +10% EXP |
| Sacred Symbol: Arcs (Arcus) | +20% damage vs **Watcher Kalos**; +10% EXP |
| Sacred Symbol: Odium | +20% damage vs **First Adversary**; +10% EXP |
| Sacred Symbol: Shangri-La | +20% damage vs **Kaling**; +10% EXP |
| Sacred Symbol: Arteria | +10% EXP **only** (no boss listed) |
| Sacred Symbol: Carcion | +20% damage vs **Limbo**; +10% EXP |
| Grand Sacred Symbol: Tallahart | +20% damage vs **Baldrix** (no EXP bonus) |

Source: <https://orangemushroom.net/2025/12/28/kms-ver-1-2-410-maplestory-crown-kinesis-remaster/>
(section "Authentic Symbol Effect Reorganization", reproduced verbatim).

Note the two asymmetries a calculator must encode: **Arteria's symbol grants no boss-damage
bonus** in this table, and **Grand Sacred symbols grant the boss bonus but not the +10% EXP**
(they already carry large EXP bonuses of their own).
Geardrock's Grand Sacred Symbol postdates this patch (Feb 2026); by the same pattern it should
give +20% vs Jupiter — **UNVERIFIED** from this source.

#### A.3 Brilliant ("Radiant") Boss accessory set — announcement figures

| Piece count | Effect |
|---|---|
| 4 | +20 all stats, +500 HP/MP, +20 ATT/MATT, **+5% critical damage** |
| 5 | +20 all stats, +500 HP/MP, +20 ATT/MATT, **+15% boss damage** |

New members announced: **Entrancing Nightmare** (ring, drops from Radiant Malefic Star, Lv280)
and **Original Sin of Pride** (face accessory, drops from Jupiter, Lv295).

Source: <https://orangemushroom.net/2025/12/14/2025-maplestory-winter-showcase-crown/>

Cross-check §5's Brilliant Boss Set table against these; the showcase figures are the
announcement, §5's are from the wiki and should be preferred where they differ.

#### A.4 Other CROWN changes that touch this document

- **Maple Union rank-up cost removed.** "Union ranks will now increase without any additional
  costs or actions when you reach the matching Union levels." If the level increases via World
  Leap, the rank applies on next login to that world. This invalidates every published
  "Legion rank-up coin cost" table (see §2's note on the stale 37,020-coin figure).
- **Hyper Stat preset change cost removed** (was 2,000,000 mesos).
- **Ability "Change Circulator"** — a new item that converts existing Legendary Ability lines to
  different stat types without rerolling, issued when a class's remaster changes which lines are
  useful (introduced with the Kinesis remaster).
- **"DF/TP/PP Increase" hyper stat renamed to "DF/TF Increase"** (Kinesis's Psychic Points removed).
- **Astra secondary weapon** — a new tier between Genesis and Destiny secondaries; converts an
  existing secondary (becomes untradeable) using Traces of Battle + Erion Fragments; 3 upgrade
  stages with star caps 15 → 20 → 30; potential carries over.
- **Grand Sacred Symbol: Geardrock** at max level gives **+50% EXP and +15% drop/meso rate**.

Sources: <https://orangemushroom.net/2025/12/14/2025-maplestory-winter-showcase-crown/> ·
<https://orangemushroom.net/2025/12/28/kms-ver-1-2-410-maplestory-crown-kinesis-remaster/>

---

### Appendix B — Independent Korean-source cross-check (namu.wiki)

I verified §3's force mechanics and symbol baselines against the Korean namu.wiki articles,
which are maintained separately from every English source used above. **Everything matched.**
This appendix records the confirmation and the few facts namu carries that the English sources
do not.

#### B.1 Confirmations

| Fact | §3 value | namu.wiki value | Match |
|---|---|---|---|
| Arcane Force tiers | 10/30/60/70/80/100/110/130/150% dealt; 280/240/180/160/140/100/80/40/0% taken | identical, same ratio bands | ✅ |
| Sacred Force tiers | 5→125% dealt in the published 16-row table; taken 200/150/100% | identical row-for-row | ✅ |
| Arcane Symbol Lv1 | 30 AF + 300 main stat | "1레벨 강화당 아케인포스 10과 주스탯 100" + totals implying 30/300 | ✅ |
| Sacred Symbol Lv1 | 10 SF + 500 main stat | "1레벨 기준으로 어센틱포스 10과 주스탯 500" | ✅ |
| Arcane max total force | 1,320 (6 × 220) | "모든 심볼을 20레벨까지 올려서 1320의 아케인포스" | ✅ |
| Sacred max regional force | 660 | "최대 어센틱포스량은 660" | ✅ |
| Xenon Arcane scaling | +48 STR/DEX/LUK per level | "제논의 아케인심볼은 STR, DEX, LUK이 각각 48만큼 증가" | ✅ |
| Demon Avenger Arcane scaling | +2,100 Max HP per level | "데몬어벤져의 아케인심볼은 최대 HP가 2100만큼 증가" | ✅ |
| Sacred Force damage taken never < 100% | yes | "받는 피해량도 아케인포스와 달리 100% 이하로 떨어지지 않는다" | ✅ |

Sources: <https://namu.wiki/w/아케인포스> · <https://namu.wiki/w/어센틱포스> (rev. 2026-09-05)

#### B.2 Facts only namu carries (KMS figures — treat as UNVERIFIED for GMS)

**Symbol growth-requirement formulas** (the "성장치" curve behind the symbol counts in §3):

- Sacred, Cernium → Carcion:
  `required growth × 1.8 × { (regionConst + 6) − (level − 1) ÷ 3 }`
  regionConst: Cernium 1, Arcus 2, Odium 3, Shangri-La 4, Arteria 5, Carcion 6
- Grand Sacred:
  `required growth × 1.8 × { (5 × regionConst + 17) − (3 × level − 1) ÷ 9 }`
  regionConst: Tallahart 1, Geardrock 2

**Meso cost shape (Sacred):** Cernium level 1 costs 1,260,000 mesos per symbol; the per-symbol
cost *decreases* by 60,000 per symbol level and *increases* by 180,000 per region step.
Grand Sacred: Tallahart level 1 ≈ 3,917,241 per symbol; −60,000 per level, **+900,000** per
region step. (§3 derives the same curve from a different direction with
`100,000 × floor((9L² + 20L) × (B − 0.6L))` — the two should be reconciled if exact mesos matter.)

**Totals:** ~35.9-36.0 billion mesos to max Cernium→Carcion; ~72.1 billion to max
Cernium→Geardrock. Arcane: 2,318,490,000 to max all six (314,490,000 to reach level 10 on all six).

**Time to max on dailies alone:** Arcane ~36 days (520/week). Sacred: Cernium 115 days,
Arcus and every later region 229 days.

**Daily symbol income (KMS, after the 23rd-anniversary 1.5× increase):** Cernium 30/day;
Arcus, Odium, Shangri-La, Arteria, Carcion 15/day each; Tallahart 15/day; Geardrock 15/day.
> ⚠️ §3 flags that **GMS's own symbol-rate increase ships 2026-09-09**, three days after this
> research was compiled. A GMS calculator needs a patch-date toggle here. These KMS numbers are
> not directly usable for GMS.

**Catalysts:** Arcane Catalyst 300 union coins, loses 20% of accumulated growth, resets to Lv1.
Authentic/Sacred Catalyst 500 union coins, loses **40%**, resets to Lv1, 3/week per world
(resets Thursday 00:00), usable only on level ≥2 symbols, and **cannot be used on Grand Sacred
symbols**. Symbol Quick Pass: 200 Maple Points per daily quest, 2,000 for Arcane weekly content.

**Symbol Voucher Bag** (40 slots) added 2026-03-19; only one may be active in the inventory.

#### B.3 Where namu is a better source than the English wikis

namu's Sacred Force article carries **field-by-field requirements for Geardrock** (740/770/810)
and the Jupiter boss requirements (610 story, 810 normal/hard) that were still thin on English
sources when this was compiled, and it explicitly works through the force-cap arithmetic:
to reach the +50 cap on Tallahart's *easiest* map you need all six regional symbols at level 11
(660) **plus** Grand Sacred: Tallahart at level 2; the 660 and 700 maps need Tallahart symbol
levels 5 and 9; Geardrock's 810 map needs everything maxed plus Geardrock symbol level 4.

---

### Appendix C — Consolidated confidence assessment

| Section | Confidence | Basis |
|---|---|---|
| §1 Hyper Stats — cost curve | **High** | Three independent sources agree (StrategyWiki, KMS simulator source code, codingace embedded data). A widely-repeated "180 total" figure is refuted. |
| §1 Hyper Stats — effect tables | **High** | StrategyWiki per-level tables match the KMS simulator's formulas exactly, stat for stat. |
| §1 Hyper Stats — points by level | **High** (level 300 value: Medium) | StrategyWiki row-by-row; corroborated 140-290 by the simulator, which has an off-by-one at exactly level 300. |
| §2 Legion — ranks, board geometry | **High** | Cross-verified three ways including an open-source solver's array geometry. |
| §2 Legion — per-class effects | **High** | All 53 GMS jobs; Erel Light confirmed from official GMS v.269 patch notes. |
| §2 Legion — Overdrive per-point values | **Low / UNVERIFIED** | Inferred, not published. GMS has not received the rework. |
| §3 Symbols — stat/cost formulas | **High** | Derived formulas verified row-for-row against the wiki, and independently against namu.wiki (Appendix B). |
| §3 Force mechanics | **High** | Triple-sourced (StrategyWiki, KPRobin sheet, in-game boss-page wording) plus a fourth independent Korean source. |
| §3 Symbol income rates | **Medium** | GMS rates change 2026-09-09; KMS and GMS figures differ. |
| §4 Inner Ability | **High** | Nexon Korea's own probability-disclosure page, synced to the 2026-06-18 patch. Several commonly-cited lines shown not to exist. |
| §4 Link Skills | **High** | Per-skill wiki pages (GMS v270) rather than the stale overview page; CROWN table independently confirmed in Appendix A.1. |
| §5 Set Effects | **Medium-High** | Rests largely on maplestorywiki.net (verifiably current) with DigitalTQ corroboration; no first-party Nexon numeric confirmation. Several specific items flagged inline. |

#### Known gaps carried forward

1. **Legion Overdrive rework** — KMS-live, GMS expected late 2026. Per-point stat values unverified.
2. **GMS symbol acquisition rates** change on 2026-09-09; the rates in §3 straddle that date.
3. **Sacred Symbol scaling for Xenon / Demon Avenger / Zero** was not confirmed (the Arcane
   equivalents were).
4. **Set effects**: the "Lucky Item" wildcard rule rests on a single MSEA source; Destiny Stage 2
   base weapon stats, a suspected Arcane Umbra DEF typo, a CRA 3-set contradiction between two
   wiki pages, and per-class set variants all remain open.
5. **Black Mage Story-mode Arcane Force requirement**: sources give 880 vs 800.
6. **No first-party Nexon America numeric confirmation** anywhere in this document — Nexon's
   GMS pages are JavaScript-only single-page apps and could not be scraped. The Korean Nexon
   probability-disclosure pages (§4) were the one first-party source obtained.
7. **Level 300 hyper stat total (1,699)** rests on StrategyWiki alone.

---

## 5. What existing calculators ask for vs. compute, and the recommended architecture

*Research pass C. Scope: MapleScouter, MathBro's / Suckhard's, community spreadsheets, APIs, OCR ingestion, and an architecture recommendation. Section numbering below is this pass's own.*

Research date: **2026-09-06**. All claims below were verified by fetching the live sites/APIs unless
explicitly marked as uncertain. Where a source is Korean, the Korean term is given so it can be re-found.

**Confidence key:** ✅ verified live this session · ⚠️ partially verified / inferred · ❓ unverified, flagged

---

### 0. TL;DR for our purposes

1. **There is no official Nexon API for GMS.** ✅ The Nexon Open API covers KMS, TMS and MSEA only.
   GMS is explicitly listed as `not_supported`.
2. **Every serious "how much is this upgrade worth" calculator in the English-speaking community is
   top-down from the stat window**, not bottom-up from equipment. The canonical one
   (MathBro's / formerly *SuckHard's* Stat Equivalence Calculator) takes **Damage Range** as its
   primary input and *back-solves* total ATT from it. ✅
3. **Bottom-up is only viable where an API hands you the full equipment list** (KMS →
   MapleScouter). Nobody does bottom-up from scratch in GMS.
4. The GMS **unofficial rankings JSON API** exists and works, but only exposes
   level / exp / job / world / rank / avatar image (+ `legionLevel`, `raidPower` fields). No stats,
   no equipment. ✅
5. Therefore for a GMS tool: **(b) stat-window baseline + deltas** is the correct architecture.
   Details and the minimum input set are in §5.

---

### 1. MapleScouter (maplescouter.com)

#### What it is

`https://maplescouter.com` is **환산주스탯 / "Maple Scouter"** — a **Korean (KMS-only)** analytics
platform. The site footer reads:

> `MAPLESTORY PARTNERS | Data Based on NEXON OPEN API`
> `Maplescouter is not associated with NEXON Korea and does not provide any warranty.`
> `Copyright 2023. 고마오 Co.`

✅ Verified by loading https://maplescouter.com — every route is under `/ko/…`; there is **no `/en`
locale and no GMS/global version**. Character names in rankings are Korean; worlds are KMS worlds
(엘리시움/스카니아 etc.).

> ⚠️ Note: the community tools directory at https://www.devnayr.com/ms-community-tools lists
> "MapleScouter — tracks boss cooldowns, rewards, and manages weekly bossing schedules" under
> *Bossing Tools*. That description does not match what the site actually does; treat it as stale or
> a confusion with another tool.

#### The core metric: 환산 주스탯 ("converted / equivalent main stat")

This is the key idea and it is directly relevant to us. From the namu.wiki article on MapleStory
stats, §7.1 (https://namu.wiki/w/메이플스토리/스탯), last edited 2026-08-21:

- 환산 주스탯 is an **unofficial community metric** that converts *every* damage-relevant spec factor
  (ATT/MATT, boss damage%, IED, level difference, force, crit, some skills) into **an equivalent
  amount of main stat**, producing one scalar "how strong is this character" number.
- It was created by users on MapleStory Inven (credited to a user nicknamed **쿠제스**) to correct the
  misconception that low-main-stat characters were "broken", i.e. precisely to make cross-character
  spec comparison honest.
- **Originally it was a spreadsheet you filled in by hand.** Quote (paraphrased translation): *"in the
  past you had to enter your stats one by one into an Excel file the developers provided, which was
  quite inconvenient and error-prone. After the DREAMER patch exposed the Open API, the developers
  reworked it to compute 환산 주스탯 automatically."* — i.e. **the KMS tool only became bottom-up/
  automatic because an official API appeared.** That is the single most load-bearing fact for our
  architecture decision.
- Today KMS boss parties recruit by 환산 주스탯 rather than by the in-game 전투력 (Combat Power),
  because Combat Power ignores IED, level, force and all skill-derived stats.

#### Inputs

Two modes, both verified live:

**(a) API mode** — you type a character name (+ server + a `preset` code, e.g. `00000`) and it pulls
everything from the Nexon Open API. URLs look like
`https://maplescouter.com/ko/info?name=강은호&preset=00000`.

**(b) Direct input mode** (`https://maplescouter.com/ko/input`, labelled 직접 입력) — ✅ this is the
manual fallback and it is a *very* good template for our own input form. The form is a grid of
`기본수치` (base value) / `% 수치` (% value) / `% 미적용 수치` (% value *not* applied) columns against
these rows:

| Korean | English |
|---|---|
| LUK / DEX (varies by class) | main stat / secondary stat |
| 공격력 / 마력 | ATT / MATT |
| 기본 스공 | base stat attack |
| 데미지 | damage % |
| 최종 데미지 | final damage % |
| 보스 데미지 | boss damage % |
| 방어율 무시 | IED % |
| 일반 데미지 | normal-monster damage % |
| 크리티컬 확률 | crit rate % |
| 크리 데미지 | crit damage % |
| 재사용 감소 (초 / %) | cooldown reduction (flat sec / %) |
| 재사용 미적용 | cooldown-skip % |
| 버프 지속 시간 | buff duration % |
| 속성 내성 무시 | ignore elemental resistance % |
| 상추뎀 | damage vs status-afflicted % |
| 소환수 지속 | summon duration |
| 아케인 포스 / 어센틱 포스 | Arcane Force / Authentic Force |

Plus: level, class, and boolean toggles for 해방 (Genesis liberation), 최초의 유산, 무공소울,
도핑 (buffs on/off), 링크/유니온, 와헌 유니온, 헥사강화, 아티팩트, 파이널 어택,
특수어빌 (special inner ability: none / +1 passive skill level / +1 attack target), 시드링.

It also states the standardised measurement condition:
> 공통 조건: 노도핑, 링크 장착 … 시드링 착용/소환수 On … (GMS)패밀리어 사용
> ("common conditions: no doping, links equipped, seed ring worn, summons on …")

**Takeaway: even the API-backed KMS tool needs an explicit, standardised "how were these numbers
measured" contract.** We will need the same.

#### Outputs

Verified from the site's nav and ranking tables:

- **환산 주스탯 / 헥사 환산** — the scalar equivalent-main-stat score. Top-10 board on 2026-09-06 shows
  values like `149,679` (칼리), `147,201` (아델). This is the "Combat-Power-like" score.
- **보스컷 / 사냥컷** (`/ko/result`, `/ko/huntresult`) — boss-clear and hunting "cut" thresholds:
  can you meet the spec bar for a given boss.
- **스펙업 순서** (`/ko/spec-order`) — *upgrade ordering*: what to spec up next. This is exactly the
  gear-progression feature we want.
- **보스세팅 최적화 / 사냥세팅 최적화** (`/ko/optimizer`) — optimise hyper stats + setup for bossing/hunting.
- **스타포스 효율 / 잠재∙추가옵션 효율 / 심볼 효율** — marginal efficiency per starforce / potential /
  symbol investment.
- **헥사코어 순서** — HEXA core levelling order.
- Rankings (`/ko/total-ranking`, `/ko/item-ranking`, `/ko/union-ranking`), EXP simulators,
  cube / starforce / flame / whetstone simulators, liberation calculators, misc games.

#### Is it open source?

**No.** ✅ The GitHub org https://github.com/Maplescouter exists but states *"This organization has
no public repositories."* No public repo, no published formula source. Community support is via
Discord (`https://discord.com/invite/hD2bEFBqZq`) and `maplescouter@gmail.com`.

#### GMS version?

**No.** ✅ KMS only, for the structural reason that the Nexon Open API it depends on does not serve
GMS (see §4).

---

### 2. "Suckhard's" calculators

#### Important correction: the domain in the brief does not exist

- `suckhardswebsite.com`, `www.suckhardswebsite.com`, `suckhard.website`, `suckhards.website` →
  **NXDOMAIN** ✅ (DNS checked).
- Bing returns **zero results** for the literal string `"suckhardswebsite.com"` ✅.
- The Wayback Machine has **no snapshots** for it ✅.
- `shikkokuhime.xyz`, which older search snippets label "SuckHard's Cubing Calculator", now 307s to
  a GoDaddy "domain for sale" parking page ✅.

#### What actually happened: SuckHard → MathBro

**SuckHard rebranded to "MathBro" and the tools now live at
https://brendonmay.github.io/.** Evidence:

1. A r/Maplestory thread titled **"The End of an Era"** whose snippet reads:
   *"Nexon has officially forced a change of SuckHard's in game name. Rest in peace, SuckHard.
   SuckHard and all related tools have …"* (indexed at
   `https://www.reddit.com/r/Maplestory/comments/the_end_of_an_era`). ⚠️ Snippet only — reddit.com is
   blocked from this environment, so I could not read the full post.
2. Bing still **titles the page `https://brendonmay.github.io/statEquivalentCalculator` as
   "SuckHard's Calculators"** ✅ — the old title tag / link text persists in the index.
3. The tool list is a 1:1 match with the historical "SuckHard's …" release threads on r/Maplestory
   (`suckhards_wse_calculator`, `suckhards_hyper...`, `updated_suckhards...cubing`,
   `release_suckhards_stat_equivalence_flaming_calculator`).

So: **"Suckhard's calculators" == "MathBro's Calculators" == https://brendonmay.github.io/**.

#### Full tool list (✅ verified live at https://brendonmay.github.io/)

| Tool | URL |
|---|---|
| Starforce Calculator | https://brendonmay.github.io/starforceCalculator/ |
| Cubing Calculator | https://brendonmay.github.io/cubingCalculator/ |
| WSE Calculator (weapon/secondary/emblem potential optimiser) | https://brendonmay.github.io/wseCalculator/ |
| Inner Ability Calculator | https://brendonmay.github.io/innerAbilityCalculator/ |
| Hyper Stat Calculator | https://brendonmay.github.io/hyperCalculator/ |
| Legion Calculator | https://brendonmay.github.io/LegionCalculator/ |
| Flaming Calculator | https://brendonmay.github.io/flameCalculator/ |
| **Stat Equivalence Tool** | https://brendonmay.github.io/statEquivalentCalculator/ |

Self-descriptions from the index page: the Legion Calculator *"optimizes hyper stats and legion board
relative to current WSE for maximizing boss damage"*; the Stat Equivalence Tool *"helps determine
stat equivalences for your character, particularly useful for flaming objectives"*.

Note there is **no "damage calculator"** per se — the suite is built around *marginal value of an
upgrade*, which is the same framing we want.

#### Stat Equivalence Calculator — exact input set ✅

Verified by loading the page and reading the DOM. Four steps:

**Step 1 — Enter Your Stats** (this is the whole ballgame):
- Level
- Class (52 classes, incl. Mo Xuan, Ren, Sia Astelle, Lynn)
- Main Weapon (39 weapon types — needed for the weapon constant)
- **Damage Range**
- Boss %
- Damage %
- Final Damage %
- Main stat total (e.g. `LUK`) and secondary stat total (e.g. `DEX`) — plus `HP` / `STR` fields for
  Demon Avenger / Kanna / Shadower-DB-Cadena special cases (present in HTML, conditionally shown)
- `LUK % on Equips`, `DEX % on Equips`
- `LUK (From Arcane)`, `LUK (From Sacred)`, `LUK (From Hexa Stat)` — i.e. the "% not applied" buckets

with the explicit measurement instruction embedded in the HTML:

> **"Please ensure you are in Beta Mode fully buffed and standing still when inputting your stats."**

(⚠️ "Beta Mode" is Zero-specific; the operative, general part is **fully buffed and standing still**.)

**Step 2 — Select Your Setup**: checkbox toggles for things that are *not* readable off the stat
window — HP% sources (Decent Hyper Body, CRA 3-set, Dominator Pendant, Superior Gollux 3-set, Spirit
Guide Blessing lv2/3), Familiar Badge ATT +1/2/3%, Familiar-line total ATT%, Magnificent Soul ATT +3%.
(The HTML also contains a currently-commented-out Link Skills block: Solus lv2/3, Unfair Advantage
lv2, Empirical Knowledge lv6, Thief's Cunning lv6, Tide of Battle lv2.)

**Step 3 — Enter Your Current WSE**: Reboot / non-Reboot, then per-slot potential lines for
Weapon / Secondary / Emblem, split by item level (<160 vs 160+), choosing from the real line pool
(40/35/30/20% Boss, 40/35/30% IED, 13/12/10/9% ATT, 13/12/10/9% Damage, N/A).

**Step 4 — Enter Your Current Hyper Stats**: full hyper-stat allocation table (STR/DEX/INT/LUK, HP,
MP, DF/TF/Mana, Crit Rate, Crit Damage, IED, Damage, Boss Damage, Status Resist, KB Resist, ATT/MATT,
Bonus EXP, Arcane Force) with level and derived amount, plus total/remaining points from level.

#### How it computes "% damage gain per stat" ✅ (read from source)

**It is open source in practice**: the whole site is a static GitHub Pages repo,
https://github.com/brendonmay/brendonmay.github.io (JavaScript, ~19★, ~24 forks, last pushed
2026-01-22). The stat equivalence logic is
`https://brendonmay.github.io/statEquivalentCalculator/main.js` (190 KB, unminified). ⚠️ No LICENSE
file is advertised on the repo page — treat as "source visible", not "licensed for reuse".

Load-bearing functions, verbatim:

```js
function getStatValue(maple_class, main_stat_amount, secondary_stat_amount, level) {
    var statValue = 4 * main_stat_amount + secondary_stat_amount
    if (maple_class == 'Demon Avenger') {
        var pureHP = 545 + 90 * level
        var statValue = Math.floor(pureHP / 3.5) + 0.8 * Math.floor((main_stat_amount - pureHP) / 3.5) + secondary_stat_amount
    }
    return statValue
}

function determineAttAmount(upperShownDamage, multiplier, statValue, damagePercent, finalDamagePercent) {
    //upperShownDamage = Multiplier * StatValue * attack/100
    var attack = ((((upperShownDamage / multiplier) / statValue) * 100) / (1 + damagePercent / 100)) / (1 + finalDamagePercent / 100)
    return attack
}

function calculateDamageCommon(primary, secondary, cdmg, boss, dmg, ied, att, pdr) {
    return (4 * primary + secondary) * (1.35 + cdmg) * (1.00 + boss + dmg) * att * Math.max(0, 1 - (pdr * (1 - ied)));
}

function getBossDefMultiplier(ied_percent) {
    var bossDefMultipler = 1 - (300 / 100) * (1 - (ied_percent / 100))
    return bossDefMultipler
}
```

Three things to internalise:

1. **`determineAttAmount` is the trick.** You cannot see total ATT-after-% in the GMS stat window in a
   usable form, so it is *back-solved from Damage Range* given the weapon constant, the stat
   multiplier, damage% and final damage%. Damage Range is the anchor that makes the whole top-down
   approach work.
2. **`calculateDamageCommon` deliberately omits final damage, skill%, mastery, level multiplier and
   the weapon constant** — they are constant multipliers that cancel in a ratio. Boss PDR is
   hardcoded at **300%**.
3. **Equivalence is computed by finite differences, not algebra.** `determineStatEquivalences()`
   calls `damage(...)` once for the baseline, then re-calls it with `attack + 1`, `boss_dmg + 1`,
   `total_dmg + 1`, `primary + 1`, `+0.01 all stat%`, etc., and takes the difference:

```js
var current_dmg = damage(maple_class, attack_without_perc, attack_perc, ...)
var att_diff   = damage(maple_class, attack_without_perc + 1, ...) - current_dmg
var boss_diff  = damage(maple_class, ..., boss_dmg + 1, total_dmg) - current_dmg
var dmg_diff   = damage(maple_class, ..., boss_dmg, total_dmg + 1) - current_dmg
```

with dedicated branches for Xenon (3 main stats), Shadower/Dual Blade/Cadena (two secondaries),
Kanna (HP→ATT conversion at `hp/700`), and Demon Avenger.

`getMultiplier()` contains the full weapon-constant table (claw/martial brace 1.75, knuckle/arm
cannon/soul shooter 1.70, gun/cannon 1.50, heavy sword/polearm/spear 1.49, 2H axe (Hero) 1.44,
crossbow/fan 1.35, long sword/2H sword/2H axe/2H blunt/scepter 1.34, whip blade 1.3125, bow/dagger/
cane/etc. 1.30, katana 1.25, wand/staff 1.00 with adventurer-mage override to 1.20, …).

#### Published methodology page?

**No dedicated methodology page.** ⚠️ The site has per-step "Click for details" modals and a Discord
(`MathBro's Calculators Discord`), but no written formula doc. The formulas are documented instead
by the community wikis — see §3.

---

### 3. Other calculators, wikis and spreadsheets

#### 3a. The canonical formula references (use these as our spec)

**MapleStory Wiki — Damage Formula** — https://maplestorywiki.net/w/Damage_Formula
(last edited **2026-08-31**, so it is current). ✅ Fetched. It gives the full product form:

```
0.01 · WeaponConstant · StatMultiplier · ATT · DamageMultiplier · FinalDamageMultiplier
     · CritDamageMultiplier · IgnoreDefMultiplier · IgnoreElemResMultiplier
     · LevelMultiplier · MapMultiplier · SkillMultiplier · MasteryMultiplier
```

with, importantly:

> "Multiplying only the factors above, **while subtracting Boss Damage or Normal Enemy Damage from
> Damage Multiplier, outputs Default Damage Range**"

and a full **"Stat Equivalence for Most Jobs"** section that derives, with
`a` = base main stat, `b` = 1 + main-stat%, `c` = %-not-applied main stat, `d` = base secondary,
`e` = 1 + secondary%, `f` = %-not-applied secondary:

- **1% All Stat = `x` main stat**: `x = (0.01a + 0.0025d) / b`
- **1 secondary stat = `x` main stat**: `x = e / (4b)`
- **generic factor**: `x = [ new·(4ab + 4c + de + f)/old − 4c − de − f ] / (4b) − a`
- **1 base ATT/MATT = `x` main stat**: `x = [ (att+1)(4ab+4c+de+f)/att − 4c − de − f ] / (4b) − a`
- **1% Damage or 1% Boss Damage = `x` main stat**:
  `x = [ (1.01 + %Dmg + %Boss)(4ab+4c+de+f) / (1 + %Dmg + %Boss) − 4c − de − f ] / (4b) − a`

It also warns explicitly: *"Due to dropping the floor function, the formulas below are inexact"* and
*"the factors below should be obtained **during burst** … Damage Multiplier and Ignore Defense
Multiplier are higher during burst and depend on conditions."*

**MapleWiki (Fandom) — User_blog:SupportDesk/Formulas** —
https://maplestory.fandom.com/wiki/User_blog:SupportDesk/Formulas ✅. Same content in English
notation, plus the single most useful GMS-specific item I found — **the Combat Power formula**:

```
combat power = 0.00451901240229 · statMultiplier · floor[att · (1 + att%)]
                                · (1 + dmg% + bd%) · (1 + fd%) · (1.35 + cd%)
```

> "Combat power *does not reflect stat boosts from skills (including Links and Guild Skills), or stat
> boosts from any consumable items*" (exceptions: 0th-job blessing, arrows/stars/bullets, star force
> conversion, Tanadian Ruin), and the weapon's ATT "will be converted to a standardized value based
> on its level, rank, additional options [flames], and Star Force values."

and the explicit range definitions:

```
upper range = 0.01 · wep · statMultiplier · floor[att · (1 + att%)]
"range"     = floor[ round(upper range) · (1 + dmg%) · (1 + fd%) ]
lower range = upper range · mastery%
```

⚠️ **Discrepancy to resolve:** namu.wiki's description of 전투력 says it multiplies stat, total ATT,
`(1 + dmg% + boss%)` and average crit — it does **not** mention final damage — whereas the Fandom
formula includes `(1 + fd%)`. Also namu.wiki says Combat Power normalises the weapon *"to an
equivalent bow"* with Genesis ATT 789 (2-line) / 832 (1-line) and Destiny 949. Don't trust Combat
Power to the last digit without empirical calibration.

**namu.wiki 메이플스토리/스탯** — https://namu.wiki/w/메이플스토리/스탯 ✅ (2026-08-21). Best single
reference for what Combat Power **excludes**: level, IED, cooldown reduction/skip, status-ailment
damage, normal-monster damage, buff duration, ignore elemental resist, mastery, Star/Arcane/Authentic
Force, and *all* skill-derived stats including link, guild, 5th and 6th job (with narrow exceptions:
Demon Avenger/Xenon conversion starforce, 파괴의 얄다바오트 / 초월: 결전의 의지, HEXA Stat, Reboot world
passive, Empress'/Spirit blessing, event skills, Challengers, pet-set-triggered skills).

**StrategyWiki — MapleStory/Formulas** — https://strategywiki.org/wiki/MapleStory/Formulas ✅
(the upstream both wikis paraphrase).

#### 3b. GMS calculator sites

| Site | URL | What it is | Data ingestion |
|---|---|---|---|
| **MathBro's (ex-SuckHard's)** | https://brendonmay.github.io/ | The reference suite: Starforce, Cubing, WSE, Inner Ability, Hyper Stat, Legion, Flame, **Stat Equivalence** | Manual, stat-window-driven ✅ |
| **WhackyBeanz** | https://www.whackybeanz.com/ | "Everything EXP", Equipment Setup, Flame Calculator, Symbols Tracker, Todding Sequence Chart; legacy v1 Hexa Matrix Calculator, damage-skin/potential/soul lists; guide pages for flames, spell trace, star force, cubes, set effects, souls, Todd's Hammer | Manual ✅ |
| **MapleTools** | https://mapletools.app/calculators | 9 calculators: Astra Secondary, Challenger World, Cubing, Flame, **IED**, **Damage ("Calculate your DPS from a real clear and check boss readiness")**, Liberation, Starforce, Traces Restoration; plus a Profile section | ⚠️ Damage tool is *empirical* — derives DPS from an actual boss clear (boss HP ÷ clear time), then recommends what else you can clear. Worth stealing as a calibration/validation input. |
| **MapleIsland** | https://www.mapleisland.app/ | "All your MapleStory plans together" — boss, HEXA, gear, weapon planning; EXP, Star Force, Cube, Flame comparison, Genesis/Destiny/Astra, boss mule, HEXA | ⚠️ "Search or reopen a saved character" for NA; ingestion mechanism not documented on the landing page |
| **MS Upgrade Tracker (GMS Toolbox)** | https://gms-upgrade-tracker.vercel.app/tools | Closest existing thing to what we're building: 16 tools — 9 upgrade (star force pricing, cubing, **flame scoring**, gear swap sims), 3 comparison (item comparison, stat analysis, luck evaluation), 4 progression (liberation gates, Astra, Sol Erda, item valuation). Uses "canonical GMS odds" and "**character snapshots**" for build-aware calcs. Requires "loading an existing character or manually building a configuration". | ⚠️ Snapshot mechanism unverified |
| **MPStorys** | https://www.mpstorys.com/tools | Character Profile, Hexa Matrix Planner, Link Skill Planner, Leveling Planner, Equipment Enhancement, Boss Readiness Audit, Legion Board Planner, Class Meta Dashboard, Fashion | Manual/profile |
| **Xenogents Legion Solver** | https://xenogents.github.io/LegionSolver/ | Legion board packing solver | Manual |
| **Masonym Liberation Calculator** | https://masonym.dev/liberation | Genesis/Destiny liberation timeline | Manual |
| **Tadeucci Starforce Calculator** | https://starforce.tadeucci.dev/ | Starforce calc for the new GMS starforcing rules | Manual |
| **MapleHub** | https://maplehub.app | All-in-one character management, boss tracking, liberation/fragment | ❓ not inspected |
| **Grandis Library** | https://grandislibrary.com/ (+ `/resources`, `/classes`, `/content`) | Guides/class overviews/boss + attack-speed/progression reference. **Not a calculator.** | n/a |
| **Community tools index** | https://www.devnayr.com/ms-community-tools | Curated directory (calculators, rankings, bossing, training, resources) | n/a |
| **maplen.gg Stat Equivalent** | https://maplen.gg/stat-equivalent | Same idea for **MapleStory N** (not GMS): stats + hyper stats + optimisation target (Bossing/Mobbing) + monster def%, outputs a stat-efficiency table in main-stat equivalents | Manual |

Named tools from the brief I could **not** confirm exist under those names (❓ — likely misremembered
or defunct): "Maple Ideal", "Kyrist's spreadsheet", "Delta's calculator", "Ossyria calculator".
Closest real hits:
- A **"DelusionDash" Google Doc stat calculator spreadsheet** is the answer given in the r/Maplestory
  "Stat equivalence" thread (`https://www.reddit.com/r/Maplestory/comments/stat_equivalence`) ⚠️
  snippet only — reddit is blocked from this environment.
- A r/Maplestory thread **"MapleStory Calculators spreadsheet back up, with short link"** whose
  snippet says *"we will no longer be updating the spreadsheet calculators"* — i.e. the big community
  spreadsheets have been **superseded by MathBro's web tools**. ⚠️ snippet only.
- Other theorycrafting threads indexed but unreadable from here:
  `.../how_to_calculate_attstat_equivalence_using_the_union_board`, `.../attack_vs_main_stat`,
  `.../how_is_stat_calculated`, `.../a_treatise_on_stat...`. One snippet:
  *"To find your 1 Attack = Primary Stat, all you do is. Say you have 3.5k Base Attack, 60k Primary
  Stat, 10k Secondary Stat, 650% …"* — same top-down method.

**Action item:** reddit.com is blocked from this tooling. If you want the DelusionDash sheet and the
"Treatise on Stat" post, fetch them manually in a browser.

#### 3c. Open-source damage simulators on GitHub

| Repo | What | Notes |
|---|---|---|
| **oleneyl/maplestory_dpm_calc** — https://github.com/oleneyl/maplestory_dpm_calc | The big one. Python DPM simulator, **41 of 43 job classes** (excl. Demon Avenger, Xenon). Graph-based scheduler that orders buffs/summons/cooldown skills and applies execution rules; kernel-based tracking. Character specs are template config files in `dpmModule/character/configs`, keyed by a `spec_name` (e.g. `'6000'` = union level). ~62★, ~1825 commits. | **KMS-specific.** README states *"This project is going to be deprecated"* in favour of Simaple. This is what KMS DPM charts are generated from. ✅ |
| **simaple-team/simaple** — https://github.com/simaple-team/simaple | Successor. Python, **MIT licensed**, ~36★, ~789 commits. Simulates combat with cooldown reduction, buff duration, core enhancement; plan files in a `.simaple` format; ships a web client; pip-installable. README mentions loading a character *"from the homepage, for characters that consented to information disclosure"* → i.e. **Nexon Open API-backed**. | KMS. ✅ |
| **andrew-eldridge/maplestory-damage-calculator** — https://github.com/andrew-eldridge/maplestory-damage-calculator | "Browser application used to calculate damage per line and estimated run time on benchmark bosses based off of a player's stats". PHP, 0★, ~30 commits. | Stat-driven, tiny, unmaintained ⚠️ |
| **DJC-0DE/Maplestory-Damage-Calculator** — https://github.com/DJC-0DE/Maplestory-Damage-Calculator (live: https://djc-0de.github.io/Maplestory-Damage-Calculator/) | TypeScript, 3★, pushed 2026-01-27. Takes base stats, **per-equipment configs**, weapon, level, *companions* and *artifacts*; outputs total equipment stats, DPS comparisons and **stat-equivalency conversions**. | ⚠️ "Companions"/"artifacts" strongly suggest this targets **MapleStory M / Idle**, not GMS. Verify before using. |
| **blushiemagic/Maplestory-Starforce-Calculator** — https://github.com/blushiemagic/Maplestory-Starforce-Calculator | JS starforce EV calculator, pushed 2026-07-22 | Active ✅ |
| **Xenogents/maplestory-calculators** — https://github.com/Xenogents/maplestory-calculators | Flame + cube calculator; README notes it uses "SuckHard's probabilities" (1 line 45% / 2 line 35% / 3 line 15% / 4 line 5% on non-flame-advantaged items) | Outdated (pre def-line removal) ⚠️ |
| **Francesco149/cubecalc** — https://github.com/Francesco149/cubecalc | Cubing probability calculations | — |
| **spd789562/MapleStory-Arcane-Symbol-Calculator** — https://github.com/spd789562/MapleStory-Arcane-Symbol-Calculator | TS, 28★, optimal arcane symbol progression | — |
| **SpiralMoon/maplestory.openapi** — https://github.com/SpiralMoon/maplestory.openapi | Nexon Open API client for TS/Java/C#/Python. Badges: `KMS: support`, `TMS: support`, `MSEA: support`, **`GMS: not_supported`**, `JMS: not_supported` | See §4 ✅ |
| **ebenitez1/maplestory-level-stats** — https://github.com/ebenitez1/maplestory-level-stats | Daily scrape of the **GMS** rankings API into level/class distribution counts. Documents the endpoint and its rate limits. | See §4 ✅ |

I found **no** GMS-targeted open-source bottom-up damage simulator. The only full simulators are the
two Korean ones, and both depend on the Nexon Open API for character loading.

---

### 4. Data ingestion options

#### 4a. Official Nexon Open API — **KMS/TMS/MSEA only, not GMS** ✅

Portal: https://openapi.nexon.com/ · Usage guide: https://openapi.nexon.com/guide/request-api/
MapleStory (KMS) reference: https://openapi.nexon.com/game/maplestory/?id=14

Verified facts:
- Base URL `https://open.api.nexon.com`, pattern `https://open.api.nexon.com/{game}/v1/{endpoint}`
- Auth header: **`x-nxopen-api-key`**, key issued from *My Applications* after sign-in
- Rate limiting: HTTP 429 / `OPENAPI00007` "API call limit exceeded" (exact numbers not published on
  that page)
- Latency: **"메이플스토리 게임 데이터는 평균 15분 후 확인 가능합니다"** — game data is queryable ~15 min after
  the fact. Previous-day data is available from 02:00 the next morning.
- `ocid` (the character identifier) **can change** when game content changes; don't treat it as stable.
- Terms note: *"You must update the data pulled from NEXON OPEN API at least every thirty (30) days."*
- **Region statement, verbatim: "해당 API는 메이플스토리 한국의 데이터가 제공됩니다."** — *"This API
  provides MapleStory **Korea** data."*

GMS support status corroborated by https://github.com/SpiralMoon/maplestory.openapi
(`GMS-not_supported-red`, *"other regions like GMS will be supported once NEXON provides official API
for those regions"*) and by MSEA's launch announcement http://www.maplesea.com/news/view/SEA_OpenAPI/.
There is also a `MapleStoryTaiwan` notice on the portal dated 2026-09-02, confirming Nexon is still
adding regions one at a time — **but not GMS as of 2026-09-06**.

Full KMS character endpoint list (✅ scraped from the docs page), for reference — this is what a
bottom-up tool gets when an API *does* exist:

```
GET /maplestory/v1/id                                       ocid lookup by character name
GET /maplestory/v1/character/list                           account's character list
GET /maplestory/v1/user/achievement
GET /maplestory/v1/character/basic                          level, world, job, guild, image
GET /maplestory/v1/character/popularity
GET /maplestory/v1/character/stat                           full stat window (종합 능력치)
GET /maplestory/v1/character/hyper-stat
GET /maplestory/v1/character/propensity
GET /maplestory/v1/character/ability                        inner ability
GET /maplestory/v1/character/item-equipment                 equipped gear (non-cash) w/ potentials, flames, starforce
GET /maplestory/v1/character/cashitem-equipment
GET /maplestory/v1/character/symbol-equipment               arcane/authentic/grandis symbols
GET /maplestory/v1/character/set-effect                     applied set effects
GET /maplestory/v1/character/beauty-equipment
GET /maplestory/v1/character/android-equipment
GET /maplestory/v1/character/pet-equipment
GET /maplestory/v1/character/skill                          skills by job grade
GET /maplestory/v1/character/link-skill
GET /maplestory/v1/character/vmatrix                        5th job nodes
GET /maplestory/v1/character/hexamatrix                     6th job cores
GET /maplestory/v1/character/hexamatrix-stat                HEXA stat
GET /maplestory/v1/character/dojang                         Mu Lung Dojo best record
GET /maplestory/v1/character/other-stat
GET /maplestory/v1/character/ring-exchange-skill-equipment
GET /maplestory/v1/character/ring-reserve-skill-equipment
```
Plus `유니온 정보 조회` (union), `길드 정보 조회` (guild), `연무장` (battle practice), `확률 정보 조회`
(probability disclosures), `랭킹 정보 조회` (rankings), `공지` (notices).

**Note how much this includes that a screenshot never will**: set effects, link skills, V/HEXA matrix,
inner ability, symbols. This is the entire reason MapleScouter can be bottom-up and we cannot.

#### 4b. Unofficial GMS rankings JSON API — **works, but thin** ✅

Documented by https://github.com/ebenitez1/maplestory-level-stats and **verified live this session**:

```
GET https://www.nexon.com/api/maplestory/no-auth/ranking/v2/na
      ?type=overall&id=weekly&page_index=<N>[&character_name=<name>]
```

Live response for `character_name=Nekomata` (2026-09-06):

```json
{"totalCount":1,"ranks":[{
  "characterID":0,"characterName":"Nekomata","exp":327987093237,"gap":0,
  "level":250,"rank":284670,"startRank":0,"worldID":45,
  "characterImgURL":"https://msavatar1.nexon.net/Character/….png",
  "jobName":"Phantom","isSearchTarget":true,
  "legionLevel":0,"raidPower":0,"tierID":0,"score":0
}]}
```

- `type=job&id=<ClassName>` also works; 10 entries/page sorted by exp desc.
- **Rate limits are hostile**: no 429 — you get a **persistent per-IP HTTP 403** at roughly **~800
  successful requests**. Below that threshold it sometimes returns HTTP 200 with an empty `ranks`
  array, so you must inspect `totalCount` to distinguish rate-limiting from real end-of-data.
  (`ebenitez1` works around it by fanning out across GitHub Actions runners, one per class.)
- ⚠️ `legionLevel` and `raidPower` exist in the schema but were `0` on the `type=overall` query. I did
  not find the ranking `type` that populates them (`type=legion` returned empty). **`raidPower` is
  potentially interesting to us as a Nexon-computed power scalar — worth chasing.**
- ⚠️ This is an undocumented, no-auth endpoint. It could vanish or start requiring auth at any time,
  and hammering it is likely a ToS problem. Do not build a hard dependency on it.

#### 4c. MapleRanks — GMS coverage, no stats ✅

https://mapleranks.com — *"MapleRanks is an unofficial, fan-made project and not associated with
Nexon."* Verified a live GMS profile (`https://mapleranks.com/u/<IGN>`):

- **Exposes:** level + exp% + raw exp, class, world, "Last Updated" date (PST, daily), per-world and
  per-region class ranks and overall ranks (e.g. `Phantom Rank in Kronos`, `GMS NA Rank`), neighbours
  in the ranking, daily/7d/14d/30d/90d EXP-gained history and level-progress charts, and a **Fashion**
  tab (cosmetic items from the avatar render).
- **Does NOT expose:** any stat window values, any equipment, legion/union, hyper stats, or damage.
- Direct `WebFetch` gets **HTTP 403** (bot protection); it renders fine in a real browser.
- ❓ No public JSON API found. There is a Discord bot, so an internal endpoint likely exists, but I did
  not identify one.

**Conclusion: MapleRanks confirms the ceiling of GMS scraping — identity + level + progression only.**

#### 4d. maplestory.io — game data, not character data ✅

https://maplestory.io — community REST API + Wiki + Studio + Simulator serving **game assets and item
metadata** per region/version (URL pattern `/api/GMS/<version>/…`, e.g.
`/api/GMS/208.2.0/npc/9200000/render/stand`). Useful to us for **item base stats, icons, item IDs, set
membership, req level, weapon type** — i.e. the static side of a gear database. Not a source of
*your* character's data.

#### 4e. Screenshots / OCR

What is realistically extractable from GMS in-game UI screenshots:

| Window | Extractable | Confidence |
|---|---|---|
| Stat window (Character Stats, "detail" expanded) | Level, class, HP/MP, STR/DEX/INT/LUK (with base+bonus in parens), **Damage Range** (lower–upper), Boss Damage %, IED %, Crit Rate %, Crit Damage %, **Combat Power**, Damage %, Final Damage %, Buff Duration, Cooldown Reduction, Status Resist, Stance, Arcane/Authentic Force, Mastery | High — fixed-position, fixed-font, dark-on-light numeric fields |
| Equip window (per item tooltip) | Item name, req level, base + total stat lines, starforce count, potential/bonus-potential lines and tiers, flame (bonus stat) lines, soul, scroll/upgrade count | Medium — tooltips are colour-coded and variable-height; must screenshot each item individually |
| Buff bar | Which buffs are active | Medium — icon matching, already done by an existing tool (below) |
| Hyper stat / V/HEXA matrix / Link / Union / Inner Ability windows | Yes, but each is a separate screenshot with its own layout and paging | Low-medium — high UI-churn risk |

**Existing MapleStory screenshot-analysis prior art:**

- **Buff Checker** — https://jaredcrystal.github.io/BuffChecker/ (repo:
  https://github.com/jaredcrystal/BuffChecker, JavaScript, 10★, last push 2026-02-26). ✅ *"An amazing
  tool to validate your buffs before bossing"* by analysing buff-bar screenshots; the page loads an
  "image processing library" and matches buff icons across skills / stacking consumables /
  non-stacking consumables / profession buffs. **This is the closest existing proof that
  screenshot-driven MapleStory ingestion is workable and community-accepted.**
- **GrahamMThomas/MapleAITrainer** — https://github.com/GrahamMThomas/MapleAITrainer — screen capture
  + OCR + RL for training automation.
- **qlvbrknp/maple-bot** — https://github.com/qlvbrknp/maple-bot — screenshots the game window and
  parses pre-determined BGRA values.
- **kyranops/MSWatcher2** — https://github.com/kyranops/MSWatcher2 — continuously scans the screen for
  icons/text against a database.
- **KenYu910645/MapleStoryAutoLevelUp** — https://github.com/KenYu910645/MapleStoryAutoLevelUp —
  template matching on the game window.

⚠️ I found **no existing project that OCRs the GMS stat window specifically**. That gap is ours to
fill. Note also that all four bot-adjacent projects above are automation tools; borrowing techniques
is fine, but don't cite them as endorsement.

Practical OCR notes:
- The stat window uses a small bitmap-ish font on a light panel; digits with thousands separators and
  `%` suffixes. Expect to need upscaling + per-field cropping rather than whole-image OCR.
- **Damage Range is displayed as `lower ~ upper`** — the upper bound is the one every formula uses.
- Values change with buffs, so the capture protocol matters more than the OCR accuracy (see §5).
- A general-purpose VLM will likely beat classical OCR here and needs no template maintenance, at the
  cost of latency and occasional digit hallucination — mitigate with a checksum: recompute Combat
  Power from the parsed fields and compare against the parsed Combat Power.

---

### 5. Recommendation

#### Verdict: **(b) stat-window baseline + deltas.** Not close.

Every credible tool in the English community does this, and the one tool that does (a) only does it
because Korea has an API that hands over set effects, link skills, V/HEXA matrix, inner ability and
symbols. We have none of that.

#### Why bottom-up is not merely harder but *impossible* to get right

These contribute to real damage and are **not derivable from equipment**:

1. **Class passives and inherent multipliers** — every class has passive ATT%/stat%/final-damage/crit
   sources, and several have conditional or stacking mechanics (Night Walker's ATT varying with
   Vitality Siphon, Hayato's Sword Energy, gauge classes). MapleScouter's own answer to this is a
   per-class, per-month **"직업 전분 제보"** (class base-value reporting) programme — a human data-entry
   pipeline, refreshed monthly. We cannot replicate that.
2. **Final damage is multiplicative and mostly invisible.**
   `total fd% = Π(1 + source_i)`, sourced from 5th-job node levels, 6th-job cores/mastery, class
   passives, Genesis/Destiny weapon, Ruin/Astra Force Shield. The stat window shows a single
   aggregate figure that does *not* include core-enhancement final damage on ≤4th-job skills
   (namu.wiki footnote: *"코어 강화를 통해 4차 이하 스킬의 최종 데미지를 올릴 수 있으나, 스탯창에는 표시되지
   않는다"*).
3. **Skill multipliers and per-skill hyper passives** — Reinforce (damage%), Boss Rush (boss%),
   Guardbreak (IED) attach *per skill*, not to the character, and never appear in the stat window.
4. **Buffs, links, legion, guild skills, familiars, consumables** — the wikis mark most of these
   "Conditional". Combat Power deliberately zeroes them out.
5. **IED does not add** — `total_ied = 1 − Π(1 − source_i)`. Each potential line, each 4th/hyper/5th
   passive is a *separate* source. You cannot sum IED off a gear list; you must know the full source
   decomposition, including skill-derived ones.
6. **Floor operations at three points** (`floor(base·(1+%))` for each stat, `floor(att·(1+att%))`,
   `floor(round(upper)·…)`) mean bottom-up reconstruction accumulates rounding error that the wiki
   itself calls out as making the analytic formulas "inexact".
7. **Item-level truth is hard anyway** — flames, potential tiers, star force, scrolls, souls, set
   membership and the exact set-effect breakpoints all have to be perfectly captured per item.
   That's ~20 tooltips of OCR per snapshot, versus 1 stat window.

#### Why deltas from the stat window work

Write output as a product of factors. Let `S = 4·primary + secondary`, `A = att·(1+att%)`,
`D = 1 + dmg% + boss%`, `C = 1.35 + cd%`, `I = 1 − pdr·(1 − ied)`, and let `K` bundle *everything
else* — weapon constant, final damage, skill%, mastery, level multiplier, map multiplier:

```
output = K · S · A · D · C · I
```

For a candidate upgrade, the absolute % gain is

```
Δ% = (S'·A'·D'·C'·I') / (S·A·D·C·I) − 1
```

**`K` cancels completely.** That is why MathBro's `calculateDamageCommon()` doesn't contain final
damage, weapon constant, skill% or mastery at all — the unknowable parts drop out of the ratio.
Everything that survives the cancellation is either on the stat window or is a property of the
candidate item.

The one thing you still need `K`'s components for is **separating ATT from stat**, because the stat
window shows Damage Range (a product) rather than post-% ATT. Hence `determineAttAmount`:

```
att·(1+att%) = ( Range_upper / (weaponConstant · S · 0.01) ) / (1 + dmg%) / (1 + fd%)
```

so you need weapon constant (class + weapon type → lookup) and the displayed damage% / final damage%.
This is the *only* place bottom-up knowledge is required, and it's a static table.

#### Minimum input set for "absolute % damage gain per upgrade"

Must-have (all readable from one expanded stat window screenshot, **fully buffed and standing still**):

| Field | Used for |
|---|---|
| Level | hyper stat points, level multiplier (cancels for same-target comparisons) |
| Class | main/secondary stat identity, special-case math (Xenon / DA / Kanna / Shadower-DB-Cadena) |
| Weapon type | weapon constant, needed to back out ATT |
| **Damage Range (upper)** | the anchor; solve for total ATT |
| Main stat total, Secondary stat total | `S = 4·primary + secondary` |
| Damage % | `D`, and needed to invert Range |
| Boss Damage % | `D` |
| Final Damage % | needed to invert Range (cancels in the ratio) |
| IED % | `I` |
| Crit Damage % | `C` |
| Crit Rate % | only matters if < 100% |

Also required, and **not** on the stat window — these are what turn a *total* into a *decomposition*:

| Field | Why |
|---|---|
| Main-stat % and secondary-stat % **from equips** | to split `total = floor(base·(1+%)) + notApplied`, so you can price "+1% all stat" correctly |
| Main stat from Arcane / Sacred / Hexa Stat (the "% not applied" bucket) | same |
| Current WSE potential lines (weapon / secondary / emblem) | IED is multiplicative — you must know each existing source to price a new one; also needed for "should I reroll" |
| ATT% sources not in the window (familiar badge/lines, magnificent soul) | to separate base ATT from ATT% |
| Current hyper stat allocation | to price a hyper-stat point against a gear point |
| Reboot vs non-Reboot | line pools and costs differ |
| Target monster PDR (default 300% for bosses, 10% for mobs) and target's level | `I` and the level multiplier |

Nice-to-have for calibration/validation:
- **Combat Power** from the stat window — recompute it from parsed fields with the published constant
  (§3a) and use the mismatch as an OCR sanity check and as a hint that a field was mis-parsed.
- An **empirical clear time on a known boss** (the MapleTools approach) — boss HP ÷ time gives real
  DPS including everything that cancelled out, which lets you sanity-check absolute claims rather
  than just relative ones.
- **Mu Lung Dojo floor / Raid Power** — coarse external cross-checks.

#### Accuracy honesty (what to tell the user in-product)

- **Relative deltas between two candidate upgrades: high accuracy.** This is what the whole community
  runs on and it's mathematically sound because `K` cancels.
- **Absolute DPM / "you will clear X": don't claim it.** That needs a skill rotation simulator with
  per-class node/core modelling — the oleneyl/simaple class of project — plus per-class data we can't
  source for GMS.
- **Burst vs. non-burst matters.** The wiki warns that damage% and IED are higher during burst, and
  equivalences shift. Pick one convention (community default is "fully buffed, during burst,
  bossing") and state it.
- **Floor operations make everything ±small.** The wiki's own closed-form equivalences say "inexact".
  Prefer the finite-difference approach (recompute damage with the floors intact, subtract) over the
  closed-form algebra — that's what MathBro does and it's strictly more accurate.
- **Class-specific mechanics will be wrong** for Xenon, Demon Avenger, Kanna, Zero, Shadower/DB/Cadena
  unless explicitly special-cased. Copy the branch structure from `determineStatEquivalences`.
- **Anything conditional (link skills, legion effects, hyper passives) is out of scope** unless the
  user is measuring *with* it active — which is exactly why the "fully buffed, standing still" capture
  protocol is a hard requirement, not a suggestion.

#### Suggested architecture

```
1. Ingest    : stat-window screenshot → VLM/OCR → typed StatSnapshot
               + a short manual "decomposition" form (stat% on equips, WSE lines,
                 hyper stats, familiar/soul ATT%) that persists between sessions
2. Validate  : recompute Combat Power from the snapshot; flag >1% divergence
3. Derive    : back-solve att·(1+att%) from Damage Range using the weapon-constant table
4. Model     : output = K · S · A · D · C · I   (K never computed, only cancelled)
5. Price     : for each candidate upgrade, apply its stat deltas to the decomposition,
               recompute with floors intact, report Δ% vs baseline
6. Rank      : sort candidates by Δ% (optionally Δ% per meso / per unit of effort)
7. Calibrate : optional boss-clear-time input to anchor absolute DPS
```

Static data we need and can source: weapon-constant table (from MathBro's `getMultiplier`, or
re-derive from https://maplestorywiki.net/w/Damage_Formula), potential line pools by item level and
slot, flame tier tables, star force stat tables, boss PDR/HP tables, item base stats (maplestory.io).

Data we should **not** attempt: per-class passive/skill/final-damage tables. If we ever need them,
the honest options are (i) a community-contributed dataset like MapleScouter's monthly class-value
reporting, or (ii) restrict claims to relative deltas, which don't need it.

---

### Open questions / follow-ups

1. ❓ Read the actual r/Maplestory threads (blocked from this tooling): "The End of an Era"
   (SuckHard→MathBro), "Stat equivalence" (DelusionDash spreadsheet), "A Treatise on Stat…",
   "how to calculate att:stat equivalence using the union board". Grab the DelusionDash Google Sheet.
2. ❓ Does any GMS ranking `type` populate `raidPower` / `legionLevel` in the no-auth rankings API? If
   `raidPower` is a real Nexon-computed scalar it's a free external validation signal.
3. ❓ How do MapleIsland and MS Upgrade Tracker actually ingest a GMS character? If either has solved
   snapshot ingestion, that's the state of the art to beat.
4. ⚠️ Reconcile the Combat Power formula discrepancy (does it include final damage?) empirically
   against a real GMS stat window before relying on it as an OCR checksum.
5. ❓ Confirm whether `DJC-0DE/Maplestory-Damage-Calculator` targets GMS or MapleStory M/Idle.
6. ⚠️ Verify the exact GMS stat-window field list and layout for the current patch (2026-09) —
   Nexon has moved fields around before (e.g. KMS removed "front stat attack" from the stat window in
   the Oct 2023 Combat Power patch).

---

### Source index

- MapleScouter — https://maplescouter.com/ · direct input https://maplescouter.com/ko/input · GitHub org (empty) https://github.com/Maplescouter
- MathBro's / SuckHard's Calculators — https://brendonmay.github.io/ · Stat Equivalence https://brendonmay.github.io/statEquivalentCalculator/ · source https://github.com/brendonmay/brendonmay.github.io · formula JS https://brendonmay.github.io/statEquivalentCalculator/main.js
- MapleStory Wiki Damage Formula — https://maplestorywiki.net/w/Damage_Formula
- MapleWiki (Fandom) Formulas incl. Combat Power constant — https://maplestory.fandom.com/wiki/User_blog:SupportDesk/Formulas
- StrategyWiki Formulas — https://strategywiki.org/wiki/MapleStory/Formulas
- namu.wiki 메이플스토리/스탯 (Combat Power exclusions, 환산 주스탯 history) — https://namu.wiki/w/메이플스토리/스탯
- Nexon Open API portal — https://openapi.nexon.com/ · guide https://openapi.nexon.com/guide/request-api/ · MapleStory (KMS) https://openapi.nexon.com/game/maplestory/?id=14 · MSEA https://openapi.nexon.com/game/maplestorysea/ · MSEA announcement http://www.maplesea.com/news/view/SEA_OpenAPI/
- SpiralMoon Open API client (GMS not_supported) — https://github.com/SpiralMoon/maplestory.openapi · https://pypi.org/project/maplestory-openapi/
- GMS unofficial rankings API — `https://www.nexon.com/api/maplestory/no-auth/ranking/v2/na` · documented in https://github.com/ebenitez1/maplestory-level-stats
- MapleRanks — https://mapleranks.com/
- maplestory.io — https://maplestory.io/
- WhackyBeanz — https://www.whackybeanz.com/
- MapleTools — https://mapletools.app/calculators
- MapleIsland — https://www.mapleisland.app/
- MS Upgrade Tracker (GMS Toolbox) — https://gms-upgrade-tracker.vercel.app/tools
- MPStorys tools — https://www.mpstorys.com/tools
- Community tools directory — https://www.devnayr.com/ms-community-tools
- Grandis Library — https://grandislibrary.com/ · https://grandislibrary.com/resources
- Xenogents Legion Solver — https://xenogents.github.io/LegionSolver/
- Masonym Liberation — https://masonym.dev/liberation
- Tadeucci Starforce — https://starforce.tadeucci.dev/
- maplen.gg Stat Equivalent (MapleStory N) — https://maplen.gg/stat-equivalent
- adamoptim Hexa Stat Calculator — https://adamoptim.github.io/hexastatCalculator
- oleneyl/maplestory_dpm_calc — https://github.com/oleneyl/maplestory_dpm_calc
- simaple — https://github.com/simaple-team/simaple
- Buff Checker — https://jaredcrystal.github.io/BuffChecker/ · https://github.com/jaredcrystal/BuffChecker
- andrew-eldridge damage calculator — https://github.com/andrew-eldridge/maplestory-damage-calculator
- DJC-0DE damage calculator — https://github.com/DJC-0DE/Maplestory-Damage-Calculator · https://djc-0de.github.io/Maplestory-Damage-Calculator/
- blushiemagic Starforce — https://github.com/blushiemagic/Maplestory-Starforce-Calculator
- Xenogents calculators — https://github.com/Xenogents/maplestory-calculators
- Francesco149/cubecalc — https://github.com/Francesco149/cubecalc
- spd789562 Arcane Symbol Calculator — https://github.com/spd789562/MapleStory-Arcane-Symbol-Calculator
- MapleAITrainer — https://github.com/GrahamMThomas/MapleAITrainer
- maple-bot — https://github.com/qlvbrknp/maple-bot
- MSWatcher2 — https://github.com/kyranops/MSWatcher2
- MapleStoryAutoLevelUp — https://github.com/KenYu910645/MapleStoryAutoLevelUp


---

## 6. Companion files produced alongside this document

Two supporting documents were produced in the same research effort and live next to this file. They are referenced rather than inlined because they are per-boss / per-tool data dumps rather than formulas:

- **`docs/research/bosses.md`** — per-boss roster with in-game data (level, PDR, HP per phase, Arcane/Sacred Force requirement and bonus breakpoints), the in-game "recommended Combat Power" gate table, Arcane/Sacred Force damage-modifier derivations, community range→DPM→clear-time benchmarks, a Korean↔GMS boss-name map, and notes for porting to JSON.
- **`docs/research/existing-tools.md`** — deeper inventory of APIs, item databases and open-source repos usable as implementation references: the Nexon Open API's region coverage, the GMS unofficial rankings JSON endpoint, `maplestory.io` raw-WZ endpoints for item base stats / set effects / potential option tables, pre-extracted item JSON manifests, star-force and cube-rate implementations, and VLM/OCR gear-import notes.

If you read one other thing before writing code, read `existing-tools.md` §"TL;DR / decisions".
