# Potential line pools — GMS, per slot

Date: 2026-09-06. Scope: **GMS, Heroic (Reboot) world, regular potential only.**
Companion to `formulas.md` §4A §3 (which covers the system rules and the value scales) and to
`src/lib/data/potential-lines.ts` (which is generated from the tables below).

---

## 0. What this document exists to fix

`src/lib/data/potential.ts` prices "reroll to three useful lines" as `1 / triplePrime` —
1/0.01 = 100 Bright Cubes ≈ **2.2 B mesos**. That is wrong, and not by a little.

`triplePrime` is the chance that all three lines are **prime** (i.e. roll from the
Legendary pool rather than the Unique pool). It says nothing about _which_ three lines.
The real cost of three _specific_ lines is `triplePrime` divided by the size of the line
pool, once per line — a factor of 10³ to 10⁴.

Worked example, three Critical Damage lines on gloves with Bright Cubes:

```
P = P(line1 = CD) × P(line2 prime) × P(line2 = CD) × P(line3 prime) × P(line3 = CD)
  = (1/11)        × 0.20           × (1/11)        × 0.05           × (1/11)
  = 0.01 / 1331
  = 7.51 × 10⁻⁶            →  1 in 133,099 cubes  →  2.9 trillion mesos
```

The `0.01` is exactly `triplePrime` for a Bright Cube. The `1/1331` is the line pool,
and it is the part the old model dropped. **1,331× too cheap.**

### The other structural error: pools are per SLOT

`potential.ts` keys `USEFUL_LINES` by `PotentialCategory` (weapon / secondary / emblem /
armor / accessory / heart / badge). The game does not work that way:

| Claim                                  | Truth                                                                                                                          |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| "armor rolls cooldown and crit damage" | **Hats** roll Skill Cooldown. **Gloves** roll Critical Damage. Neither rolls the other, and no other armour slot rolls either. |
| "weapon-likes roll boss and IED"       | **Emblems cannot roll Boss Damage at all.** They roll IED but not boss — verified in every rank section.                       |
| "accessories roll meso/drop"           | True, but only at **Legendary prime**. The Unique accessory pool has neither.                                                  |
| "hearts and badges are armour-ish"     | The heart/badge pool is nothing but `%STR/DEX/INT/LUK`, `%HP`, `%MP`, `%DEF`, `All Stat %`. 8 rollable lines.                  |

Pool _sizes_ also differ per slot, and pool size is the denominator of every cost:
the same "one specific line" is 1-in-8 on a heart, 1-in-11 on a glove and 1-in-20.5 on a
secondary weapon.

---

## 1. Sources

| #   | Source                                                                                                                                                                                                                                                | What it gave us                                                                                                                                                                                                       | Trust                                                                                                                                                                        |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1  | StrategyWiki, _MapleStory/Potential System_, "Potentials List" — <https://strategywiki.org/wiki/MapleStory/Potential_System><br>Snapshot used: <https://web.archive.org/web/20260708180530/https://strategywiki.org/wiki/MapleStory/Potential_System> | **The whole dataset.** 12 slot groups × 5 rank sections × per-line value table × per-line probability table (Initial / In-game cube / Cash cube). Carries explicit `(GMS) 151+` rows.                                 | High for values and pool membership. Stale on cube _names_ (still says "RED"/"Black") and on the boss/IED/drop line cap (see §4).                                            |
| S2  | MathBro's Cubing Calculator source — `cubeRates.js` + `getProbability.js` + `cubes.js`<br><https://github.com/brendonmay/brendonmay.github.io/tree/master/cubingCalculator>                                                                           | Independent cross-check. `cubeRates.js` is auto-generated (2023-11-14) by the repo's own scraper from Nexon KR's disclosure pages. `getProbability.js` encodes the pool re-normalisation algorithm and the line caps. | High. This is the calculator the GMS community actually uses. Its data is **KMS**, so its `%` values are one tier low for GMS 151+ items and its pools differ slightly (§3). |
| S3  | Nexon KR probability disclosure, e.g. <https://maplestory.nexon.com/Guide/OtherProbability/cube/strange>                                                                                                                                              | The stated re-normalisation rule: _"display probability / (100% − the sum of the display probabilities of the excluded options)"_. Origin of S2's data.                                                               | High (it is Nexon's own legal disclosure) but **KMS**, and the pages are JS shells that 403 to scripts — reached only via S2's scrape.                                       |
| S4  | Orange Mushroom's Blog, _KMST ver. 1.2.168 — Meso changes and new potential reset system_ (2024-01-19) — <https://orangemushroom.net/2024/01/19/kmst-ver-1-2-168-meso-changes-and-new-potential-reset-system/>                                        | The removal of the 2-line cap on Boss Damage / IED / Drop Rate.                                                                                                                                                       | High for KMS. GMS inheritance inferred (§4).                                                                                                                                 |
| S5  | MapleStory Wiki, _Cube_ — <https://maplestorywiki.net/w/Cube>                                                                                                                                                                                         | Current GMS cube names (post-v239) and the Heroic meso prices (Glowing 12 M, Bright 22 M).                                                                                                                            | High.                                                                                                                                                                        |
| S6  | `docs/research/formulas.md` §4A §3                                                                                                                                                                                                                    | Prime-line rates, rank-up rates, line-count rules, the 151 breakpoint, Heroic scope.                                                                                                                                  | Inherited.                                                                                                                                                                   |

### Sources that did NOT work

- **`whackybeanz.com/maple/extras/potential-list`** — the URL cited in `formulas.md` §4A §3
  is **dead (404)**. Not a usable second probability reference any more.
- **`maplestorywiki.net/w/Potential/Stat_Tables`** — still empty ("Under construction"),
  as `formulas.md` already warned.
- **`strategywiki.org` over HTTP** — Cloudflare-challenges scripted fetches (both `curl` and
  the agent fetcher get a JS challenge / 403). The Wayback snapshot is the only script-reachable
  copy; it is dated **2026-07-08**, two months before this document.
- **`nexon.com` GMS pages** — JS shells, 403 to scripts, as the brief said.

---

## 2. How the dataset was extracted and validated

S1's "Potentials List" is laid out as
`### <Slot>` → `#### <Rank section>` → `##### <Line name>` → up to two tables:

1. `| Equip level | Stat value |` — rows like `0-30 / 31-70 / 71+ / (GMS) 151+`;
2. `| Item Level | Initial | In-game cube | Cash cube |` — the line's roll probability.

The five rank sections map onto pools as follows. This is the crux of the model: a
Legendary item's **prime** lines come from `Legendary (Prime)` and its **non-prime** lines
from `Unique (Prime) / Legendary (Non-prime)` — the same table serves both roles.

| StrategyWiki section                     | `PoolRank` in code | Used as                                                   |
| ---------------------------------------- | ------------------ | --------------------------------------------------------- |
| `Rare (Non-prime)`                       | `belowRare`        | non-prime pool of a Rare item                             |
| `Rare (Prime) / Epic (Non-prime)`        | `rare`             | prime pool of a Rare item; non-prime pool of an Epic item |
| `Epic (Prime) / Unique (Non-prime)`      | `epic`             | prime of Epic; non-prime of Unique                        |
| `Unique (Prime) / Legendary (Non-prime)` | `unique`           | prime of Unique; **non-prime of Legendary**               |
| `Legendary (Prime)`                      | `legendary`        | prime of Legendary                                        |

**Validation.** The source publishes each pool as a set of mutually exclusive options, so
every column must total 100 %. All **60** (slot group × rank) pools sum to
100.0000 % ± 0.002 in **all three** probability columns — 775 line entries, no gaps, no
duplicates. This check is asserted in `potential-lines.spec.ts` and is the strongest
evidence the transcription is complete.

Second validation: the probability engine reproduces MathBro's calculator (S2) **exactly**,
once both sides are run on the same pool transcription (`poolVariant: 'kms'`). 13 cases,
four slot groups, two item levels, both cash cubes, four kinds of target:

| Case (Legendary, Bright unless noted)    | ours, KMS pool data           | reference (S2)            |
| ---------------------------------------- | ----------------------------- | ------------------------- |
| accessory Lv150, 33 %+ stat              | 3.374960 × 10⁻⁴ · 2,963 cubes | 3.374960 × 10⁻⁴ · 2,963   |
| accessory Lv150, 36 %+ stat              | 1.078878 × 10⁻⁵ · 92,686      | 1.078878 × 10⁻⁵ · 92,689  |
| accessory Lv150, 30 %+ stat              | 2.269247 × 10⁻³ · 441         | 2.269247 × 10⁻³ · 441     |
| accessory Lv150, 33 %+ stat, **Glowing** | 1.455176 × 10⁻⁴ · 6,872       | 1.455176 × 10⁻⁴ · 6,872   |
| accessory Lv200, 36 %+ stat              | 3.374960 × 10⁻⁴ · 2,963       | 3.374960 × 10⁻⁴ · 2,963   |
| accessory Lv200, 39 %+ stat              | 1.078878 × 10⁻⁵ · 92,686      | 1.078878 × 10⁻⁵ · 92,689  |
| weapon Lv150, 33 %+ stat                 | 2.847320 × 10⁻⁴ · 3,512       | 2.847320 × 10⁻⁴ · 3,512   |
| weapon Lv200, 39 %+ stat                 | 9.285811 × 10⁻⁶ · 107,689     | 9.285811 × 10⁻⁶ · 107,691 |
| weapon Lv200, 39 %+ ATT                  | 1.160714 × 10⁻⁶ · 861,513     | 1.160714 × 10⁻⁶ · 861,538 |
| weapon Lv200, 3 lines of boss            | 9.163427 × 10⁻⁴ · 1,091       | 9.163427 × 10⁻⁴ · 1,091   |
| hat Lv200, 39 %+ stat                    | 9.285811 × 10⁻⁶ · 107,689     | 9.285811 × 10⁻⁶ · 107,691 |
| hat Lv150, 33 %+ stat                    | 2.406749 × 10⁻⁴ · 4,155       | 2.406749 × 10⁻⁴ · 4,155   |
| gloves Lv200, 3 lines of crit damage     | 1.000000 × 10⁻⁵ · 99,999      | 1.000000 × 10⁻⁵ · 100,000 |

Percentiles agree too: for the first row we give median 2,054 / 75 % 4,107 / 85 % 5,620 /
95 % 8,875 against the reference's 2,053 / 4,107 / 5,620 / 8,875 — the single-cube median
difference is because we `ceil` ("how many cubes to be 50 % sure" is a whole number) where
the reference rounds.

Two independent transcriptions of two Nexon regions' disclosures, driven through two
independently written probability engines, agreeing to five significant figures across
four orders of magnitude is about as good as this kind of data gets. **Any residual
difference in the shipped numbers is therefore a difference in the source tables, not in
the model** — and §3.1 shows it is exactly one line.

Note the reference's meso column includes a **per-cube** reveal fee:
2,963 × (22,000,000 + 20 × 150²) = 66,519,350,000. We exclude that by default; see §6.

---

## 3. GMS vs KMS — where they differ

They are not the same data. Both were checked line by line.

| Difference                                        | GMS (S1)                                                        | KMS (S2/S3)                                                    | Which we use                                                                                                                                             |
| ------------------------------------------------- | --------------------------------------------------------------- | -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `%` stat top tier                                 | `(GMS) 151+` row → **13 %** stat, **10 %** All Stat             | 12 % / 9 %, no 151 row (KMS breaks at 201)                     | GMS. `potential.ts` already models 151.                                                                                                                  |
| `DEF %` in the Legendary armour/accessory pools   | **Present**                                                     | **Absent**                                                     | GMS. This is why our glove pool is 12 lines and MathBro's is 11, and why our 3× Crit Damage number (1 in 133,099) is 33 % worse than his (1 in 100,000). |
| Weapon Legendary "+1 ATT per 10 character levels" | Listed as `Weapon ATT +1 per 10 Character Levels`, cash 4.878 % | Listed as a flat `ATT : +32`, same 4.878 % weight              | GMS wording. Same pool slot either way; the _value_ differs and only GMS's is sourced for GMS.                                                           |
| MathBro's level handling                          | —                                                               | bumps `%` values by +1 at item level **160** as a KMS→GMS hack | GMS's real breakpoint is **151** (S1, and `formulas.md` §4A §3.2). MathBro's 160 is an approximation; do not copy it.                                    |
| Rank-up rates                                     | GMS figures are "wildly higher than KMS" (S1) but predate v239  | published                                                      | Neither is re-exported here — see §6.                                                                                                                    |

### 3.1 UNRESOLVED: the high-rank `%DEF` line — worth 1.34×

This is the one difference that changes an answer, so it gets its own section.

**StrategyWiki's GMS tables carry a `DEF %` line in the Unique and Legendary armour and
accessory pools. Nexon KR's tables do not.**

It is not a scraping artifact. The same KMS scrape _does_ capture `Defense : +6%` at Epic
and `Defense : +3%` at Rare, so the pipeline would have shown a top-rank `DEF %` had one
been there. Both tables are internally consistent — each sums to exactly 100 % — so they
describe genuinely different pools, or the same pool at two different times. The same
pattern applies to `Skills and Potion HP Recovery`, which GMS lists at Legendary and KMS
does not; that one is invisible to us because GMS already records it as **0 % on cash
cubes**.

`DEF %` carries weight 4 in every affected pool, so including it enlarges the pool and
makes every _other_ line rarer, cubed over three lines:

| group                             | GMS pool weight | KMS pool weight | factor on a 3-line target    | observed        |
| --------------------------------- | --------------- | --------------- | ---------------------------- | --------------- |
| `accessory`                       | 43              | 39              | (43/39)³ = 1.339             | **1.337–1.340** |
| `gloves`                          | 44              | 40              | (44/40)³ = 1.331             | **1.331**       |
| `hat`                             | 45              | 41              | (45/41)³ = 1.322             | **1.300–1.322** |
| `weapon` / `secondary` / `emblem` | —               | —               | 1.000 (no `DEF %` in either) | **1.000**       |

Predicted and observed agree to three decimals, and switching the single line off
(`poolVariant: 'kms'`) reproduces the reference **exactly** on all 13 cases. So the
attribution is proven, not asserted.

**Which is right for current GMS is unresolved.** No third source was reachable:
StrategyWiki 403s scripted fetches, `whackybeanz` is 404, MapleStory Wiki's potential
stat-table page is still empty, and this session's web-search budget was exhausted before
a fourth avenue could be tried. Arguments each way:

- _For GMS having it_: StrategyWiki's page is GMS-annotated throughout, and its
  probability columns were computed **with** `DEF %` in the pool (they sum to 100 % only
  with it), so it is not a stray row someone appended.
- _Against_: GMS potential pools are ports of KMS ones and a genuine divergence would be
  unusual; StrategyWiki is demonstrably stale elsewhere on this page (pre-v239 cube names,
  the boss/IED/drop cap in §4). KMS may simply have pruned two junk lines from the top
  ranks and GMS followed without the wiki catching up.

**Decision:** keep GMS (StrategyWiki) as the source of record, per the project's region
rule, and expose `PoolVariant` so the disagreement is measurable rather than hidden. The
constant `UNVERIFIED_HIGH_RANK_DEF_PERCENT_LINE` documents it in-module.

**Consequence for the UI: do not present an armour or accessory cube cost as accurate to
better than ~1.4× until someone confirms from an in-game tooltip whether a Legendary hat
can roll `DEF +12%`.** Weapon, secondary and emblem costs carry no such uncertainty.

`Initial` / `In-game cube` / `Cash cube` columns are **not** interchangeable: several lines
are `0 %` on cash cubes (all Auto Steal lines, the +40 % "Skills and Potion HP Recovery"
line). A Glowing/Bright cube literally cannot roll them, which _shrinks_ the pool and makes
every other line correspondingly more likely. Heroic buys only cash cubes, so `cashCube` is
the column that matters.

---

## 4. CONFLICT: can boss / IED / drop appear three times?

**StrategyWiki says no.** Every boss, IED and Item Drop Rate line carries the note
_"… can only appear up to 2 times on a single cube."_

**Orange Mushroom (S4) says yes, since January 2024.** KMST ver. 1.2.168:

> "When resetting potential or additional potential, it has been changed so that the stats
> below can appear 3 times on the same item. Monster Defense Ignore +%, Damage Increase When
> Attacking Boss Monsters +%, Item Drop Rate +%"

**Resolution: 3.** Three independent reasons:

1. MathBro's GMS-facing calculator changed the cap from 2 to 3 in commit `60879c3`
   (2024-06-26, _"Cube Calculator updated — Now accounts for possibility of 3 line boss,
   IED, and drop"_). That is a GMS tool responding to GMS behaviour, five months after the
   KMS change.
2. Three-line drop accessories and three-line boss weapons are documented in the community
   as obtainable, not as bugs.
3. StrategyWiki's page is demonstrably stale in the same area (it still calls the cubes
   "RED" and "Black", names GMS retired in v239).

The wiki's claim is not discarded: each `PoolLine` keeps the source's own
`maxPerItem: 2` verbatim, while the **effective** cap the engine applies lives in
`MAX_LINES_PER_ITEM` (3). Flipping one constant reverts the decision.

Caps that are _unchanged_ and still bite — not because we want those lines, but because
exhausting them re-normalises the pool for the remaining lines and therefore nudges the
probability of everything else **up**:

| Kind                                           | Cap | Source            |
| ---------------------------------------------- | --- | ----------------- |
| "chance to ignore X % of monster damage"       | 2   | S1, verbatim note |
| "chance to be/become invincible when attacked" | 2   | S1                |
| "Invincibility Time +N seconds"                | 1   | S1                |
| any Decent skill                               | 1   | S1                |

Nexon's own re-normalisation formula (S3) is implemented exactly:
`adjusted = displayed / (100 % − Σ displayed of excluded options)`.

---

## 5. The pools

12 slot groups. "cash / in-game / total" = number of lines a Glowing or Bright cube can
roll / an in-game cube can roll / published in the pool.

| pool group         | tracker slots                          | Legendary prime (cash / in-game / total) | Unique prime (cash) | Epic prime (cash) | lines unique to this slot                       |
| ------------------ | -------------------------------------- | ---------------------------------------- | ------------------- | ----------------- | ----------------------------------------------- |
| `hat`              | hat                                    | **13** / 14 / 14                         | 12                  | 8                 | **Skill Cooldown −1s, −2s**                     |
| `topOverall`       | top, overall                           | 12 / 13 / 13                             | 15                  | 9                 | —                                               |
| `bottom`           | bottom                                 | 10 / 13 / 13                             | 12                  | 8                 | —                                               |
| `gloves`           | gloves                                 | **12** / 16 / 16                         | 16                  | 10                | **Critical Damage**, Auto Steal                 |
| `shoes`            | shoes                                  | 11 / 12 / 12                             | 12                  | 8                 | —                                               |
| `capeBeltShoulder` | cape, shoulder, belt                   | 10 / 11 / 11                             | 11                  | 8                 | —                                               |
| `accessory`        | pendant×2, ring×4, earrings, face, eye | 12 / 13 / 13                             | 9                   | 8                 | **Mesos Obtained, Item Drop Rate**, MP Cost     |
| `weapon`           | weapon                                 | **15** / 13 / 15                         | 11                  | 14                | %ATT, %MATT, IED 35/40, **Boss 35/40**          |
| `secondary`        | secondary                              | **17** / 15 / 17                         | 13                  | 14                | %ATT, IED, Boss (+2 junk "ignore damage" lines) |
| `shieldSoulRing`   | Demon Aegis, Soul Rings                | 17 / 15 / 17                             | 13                  | 13                | as secondary                                    |
| `emblem`           | emblem                                 | **13** / 11 / 13                         | 10                  | 14                | %ATT, **IED — but NO Boss Damage**              |
| `heartBadge`       | heart, badge                           | **8** / 9 / 9                            | 9                   | 8                 | — (stat lines only)                             |

### 5.1 Weapon — Legendary (Prime), Lv100+ (S1)

`Cash cube` is the column Heroic uses. All weights are exact multiples of 1/41.

| Line                           | Value at Lv151+ | Initial | In-game   | **Cash**    | weight    |
| ------------------------------ | --------------- | ------- | --------- | ----------- | --------- |
| STR / DEX / INT / LUK %        | +13 %           | 8 %     | 11.1111 % | **9.756 %** | 4/41 each |
| Weapon ATT %                   | +13 %           | 4 %     | 5.5555 %  | **4.878 %** | 2/41      |
| Magic ATT %                    | +13 %           | 4 %     | 5.5555 %  | **4.878 %** | 2/41      |
| Critical Rate %                | +13 %           | 4 %     | 5.5555 %  | **4.878 %** | 2/41      |
| Damage %                       | +13 %           | 4 %     | 5.5555 %  | **4.878 %** | 2/41      |
| All Stats %                    | +10 %           | 8 %     | 11.1111 % | **7.317 %** | 3/41      |
| Weapon ATT +1 / 10 char levels | +28 at Lv285    | 12 %    | **0 %**   | **4.878 %** | 2/41      |
| Magic ATT +1 / 10 char levels  | +28 at Lv285    | 12 %    | **0 %**   | **4.878 %** | 2/41      |
| Ignore 35 % of Monster DEF     | 35              | 4 %     | 5.5555 %  | **4.878 %** | 2/41      |
| Ignore 40 % of Monster DEF     | 40              | 4 %     | 2.7777 %  | **4.878 %** | 2/41      |
| Damage to Boss +35 %           | 35              | 8 %     | 11.1111 % | **9.756 %** | 4/41      |
| Damage to Boss +40 %           | 40              | 4 %     | 2.7777 %  | **4.878 %** | 2/41      |

Note the asymmetries: **Boss 35 is twice as likely as Boss 40** on a cash cube, but IED 35
and IED 40 are equally likely. In-game cubes are _much_ worse for the 40s (2.7777 %) and
cannot roll the "per 10 levels" lines at all.

Weapon **Unique (Prime)** (= a Legendary weapon's non-prime lines) adds `Ignore 30 %` and
`Boss +30 %` at 6.9767 % cash each, and has **no** flat/per-level ATT lines. It is an
11-line pool — smaller than the Legendary pool, which is why non-prime lines are _more_
likely to be %ATT (6.9767 %) than prime lines are (4.878 %).

### 5.2 Hat — Legendary (Prime), Lv120+ (S1)

| Line                                             | Value at Lv151+         | Initial  | In-game  | **Cash**          |
| ------------------------------------------------ | ----------------------- | -------- | -------- | ----------------- |
| STR / DEX / INT / LUK %                          | +13 %                   | 5.5555 % | 5.5555 % | **8.8888 %**      |
| Max HP % / Max MP % / DEF %                      | **+12 %** (no 151 bump) | 8.3333 % | 8.3333 % | **8.8888 %**      |
| All Stats %                                      | +10 %                   | 5.5555 % | 5.5555 % | **6.6666 %**      |
| 10 % chance to ignore 20 % / 40 % monster damage | —                       | 8.3333 % | 8.3333 % | **6.6666 %** each |
| Skills and Potion HP Recovery %                  | +40 %                   | 8.3333 % | 8.3333 % | **0 %**           |
| **Skill Cooldown −1 second**                     | −1 s                    | 8.3333 % | 8.3333 % | **6.6666 %**      |
| **Skill Cooldown −2 seconds**                    | −2 s                    | 5.5555 % | 5.5555 % | **4.4444 %**      |
| Decent Advanced Bless                            | —                       | 8.3333 % | 8.3333 % | **6.6666 %**      |

Cooldown is **Legendary-prime only** — the Unique hat pool has no cooldown line at all.
Any cooldown line: 6.6666 + 4.4444 = **11.111 %** of a prime roll.

### 5.3 Gloves — Legendary (Prime), Lv120+ (S1)

| Line                                             | Value                                                  | Initial       | In-game       | **Cash**          |
| ------------------------------------------------ | ------------------------------------------------------ | ------------- | ------------- | ----------------- |
| STR / DEX / INT / LUK %                          | +13 % @151+                                            | 4.5454 %      | 4.5454 %      | **9.0909 %**      |
| Max HP % / Max MP % / DEF %                      | +12 %                                                  | 6.8181 %      | 6.8181 %      | **9.0909 %**      |
| **Critical Damage %**                            | **+5 %** (Lv50-60) · **+6 %** (61-80) · **+8 %** (81+) | 9.0909 %      | 9.0909 %      | **9.0909 %**      |
| All Stats %                                      | +10 % @151+                                            | 4.5454 %      | 4.5454 %      | **6.8181 %**      |
| 10 % chance to ignore 20 % / 40 % monster damage | —                                                      | 6.8181 %      | 6.8181 %      | **6.8181 %** each |
| Skills and Potion HP Recovery %                  | +40 %                                                  | 6.8181 %      | 6.8181 %      | **0 %**           |
| 3 % / 5 % / 7 % Auto Steal                       | —                                                      | 6.8181 % each | 6.8181 % each | **0 %**           |
| Decent Speed Infusion                            | —                                                      | 6.8181 %      | 6.8181 %      | **6.8181 %**      |

**This resolves `UNVERIFIED_GLOVE_CRIT_DAMAGE` in `potential.ts`.** The community's +8 % is
correct — and now sourced — but it is **+8 % flat from item level 81**, with _no_ GMS 151
bump. A Lv250 Genesis glove and a Lv90 glove give the same +8 %.

### 5.4 Accessory — Legendary (Prime), all item levels (S1)

12 rollable cash lines: `%STR/DEX/INT/LUK` (9.3023 % each), `%HP/%MP/%DEF` (9.3023 %),
`All Stat %` (6.9767 %), two MP Cost Reduction variants (6.9767 % each),
**Mesos Obtained %** (6.9767 %) and **Item Drop Rate %** (6.9767 %).
Meso/Drop values: 10 % (Lv0-30) → 15 % (31-70) → **20 % (71+)**, and **no 151 bump**.
Caps stated by S1: +100 % total meso, +200 % total drop from potential + bonus potential.

### 5.5 Emblem — Legendary (Prime), Lv100+ (S1)

Identical shape to the weapon pool **minus both Boss Damage lines**: `%STR/DEX/INT/LUK`
(11.4285 % cash each), `%ATT`, `%MATT`, `%Crit Rate`, `%Damage` (5.7142 %), `All Stat %`
(8.5714 %), ATT/MATT per-10-levels (5.7142 %), `IED 35` and `IED 40` (5.7142 % each).
13 lines. **Any target containing a boss line on an emblem is impossible, and the module
returns exactly 0, not a small number.**

---

## 6. What is NOT in this dataset (deliberately, or because it could not be sourced)

| Item                                          | Status                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Bonus Potential pools**                     | Not modelled. Bonus Potential **does not exist in Heroic worlds** (`formulas.md` §4A §3.1). S1 publishes the full per-slot bonus pools under `#Bonus_Potential_Stat_List` in the same five-section shape if an Interactive build ever needs them; `potential.ts` already carries the bonus _value_ scales.                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| **Rank-up (tier-up) rates**                   | Deliberately not re-exported here. `formulas.md` §4A §3.5 and `potential.ts` `UNVERIFIED_GMS_RANK_UP_RATES` already flag that the published GMS figures **predate the v239 cube rework, which MapleStory Wiki says also changed tier-up probabilities**. Nothing found in this pass changes that: no GMS source publishes current rank-up rates. MathBro uses community-sampled GMS rates (Rare→Epic 14 %, Epic→Unique 6 %, Unique→Legendary 2.5 % for Glowing; 17 / 11 / 5 % for Bright) from a community spreadsheet — close to, but not identical to, the wiki's 14.1/6/2.4 and 16/11/4.7. **Both remain UNVERIFIED.** Every cost in this document is _at a fixed rank_; getting the item to Legendary is priced separately and less reliably. |
| **Pools below the published item-level band** | S1 publishes each pool from one item level upward (weapon 100+, hat/gloves 120+, cape/belt 40+, accessory/heart 0+). Below that band the pool composition is **not published** and the module **throws** rather than extrapolating.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| **Violet/Hexa and Equality cubes**            | Prime-line rates are in `potential.ts`; their _pool_ behaviour (choose 3 of 6) is not modelled. They are event-only and not part of the Heroic meso economy.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| **Whether a cube re-hides potential**         | S1 documents Reveal Potential as a one-off cost (`constant × itemLevel²`, constant 20 at Lv121+). MathBro adds it to **every** cube; no source says a cube re-hides potential. We expose `revealPotentialCost()` and exclude it by default. **UNVERIFIED which is right**; at Lv200 it is 800 k against a 22 M cube, so it moves nothing.                                                                                                                                                                                                                                                                                                                                                                                                         |
| **Miracle Time / Double Miracle Time**        | Doubles rank-up chance only (S1). Does not touch line pools, so it is out of scope here.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| **In-game cube meso prices**                  | Mystical / Hard / Solid are drops and crafts, not purchases. `HEROIC_CUBE_MESO_PRICE` gives them `null`, never `0`, so a caller cannot silently price a Solid-cube plan at zero. (MathBro prices a "master" cube at 7.5 M; no source backs that for GMS Heroic, so it is not copied.)                                                                                                                                                                                                                                                                                                                                                                                                                                                             |

---

## 7. Results — what things actually cost

Lv200 item, already Legendary, character level 285, Heroic meso prices
(Glowing 12 M, Bright 22 M). "cubes" is the **mean**; the median is ~0.69× the mean.

| Target                            | Slot       | P per Bright cube | Glowing: cubes / mesos | Bright: cubes / mesos |
| --------------------------------- | ---------- | ----------------- | ---------------------- | --------------------- |
| **3× Critical Damage (+24 % CD)** | gloves     | 7.51 × 10⁻⁶       | 1,330,988 / **16.0 T** | 133,099 / **2.9 T**   |
| 2× Critical Damage (+16 % CD)     | gloves     | 2.14 × 10⁻³       | 1,091 / 13.1 B         | 468 / 10.3 B          |
| 1× Critical Damage (+8 % CD)      | gloves     | 1.12 × 10⁻¹       | 10 / 120 M             | 9 / 197 M             |
| **2× cooldown lines**             | hat        | 3.19 × 10⁻³       | 731 / 8.8 B            | 314 / **6.9 B**       |
| 2× the −2 s line (−4 s total)     | hat        | 5.13 × 10⁻⁴       | 4,562 / 54.7 B         | 1,951 / 42.9 B        |
| 1× cooldown line                  | hat        | 1.36 × 10⁻¹       | 8 / 98 M               | 7 / 162 M             |
| **3× %ATT, any value**            | weapon     | 2.20 × 10⁻⁴       | 4,355 / **52.3 B**     | 4,550 / 100.1 B       |
| **3× %ATT, all 13 % (all prime)** | weapon     | 1.16 × 10⁻⁶       | 8,615,125 / 103.4 T    | 861,513 / **19.0 T**  |
| 2× %ATT, any value                | weapon     | 1.06 × 10⁻²       | 91 / **1.1 B**         | 94 / 2.1 B            |
| 3× boss damage                    | weapon     | 9.16 × 10⁻⁴       | 1,251 / **15.0 B**     | 1,091 / 24.0 B        |
| 2× boss damage                    | weapon     | 2.77 × 10⁻²       | 39 / **470 M**         | 36 / 796 M            |
| **3× boss-or-IED**                | weapon     | 5.66 × 10⁻³       | 194 / **2.3 B**        | 177 / 3.9 B           |
| 2× boss-or-IED                    | weapon     | 8.63 × 10⁻²       | 12 / **147 M**         | 12 / 255 M            |
| 2× boss + 1× IED                  | weapon     | 2.31 × 10⁻³       | 482 / **5.8 B**        | 433 / 9.5 B           |
| 2× boss + 1× %ATT                 | weapon     | 1.87 × 10⁻³       | 570 / **6.8 B**        | 536 / 11.8 B          |
| **3× boss-or-IED**                | secondary  | 3.56 × 10⁻³       | 312 / **3.7 B**        | 281 / 6.2 B           |
| 2× boss-or-IED                    | secondary  | 6.47 × 10⁻²       | 16 / **197 M**         | 15 / 340 M            |
| **3× IED**                        | emblem     | 7.29 × 10⁻⁴       | 1,470 / **17.6 B**     | 1,372 / 30.2 B        |
| 2× IED                            | emblem     | 2.32 × 10⁻²       | 45 / **540 M**         | 43 / 949 M            |
| **any boss line**                 | emblem     | **0**             | **impossible**         | **impossible**        |
| 2× IED + 1× %ATT                  | emblem     | 1.69 × 10⁻³       | 608 / **7.3 B**        | 590 / 13.0 B          |
| 30 %+ main stat                   | hat        | 2.66 × 10⁻³       | 399 / **4.8 B**        | 375 / 8.3 B           |
| **36 %+ main stat** (13/13/10)    | hat        | 1.85 × 10⁻⁴       | 12,743 / **152.9 B**   | 5,403 / 118.9 B       |
| **39 %+ main stat** (13/13/13)    | hat        | 7.02 × 10⁻⁶       | 1,423,828 / 17.1 T     | 142,383 / **3.1 T**   |
| 36 %+ main stat                   | accessory  | 2.52 × 10⁻⁴       | 9,190 / **110.3 B**    | 3,963 / 87.2 B        |
| 39 %+ main stat                   | accessory  | 8.05 × 10⁻⁶       | 1,242,292 / 14.9 T     | 124,229 / **2.7 T**   |
| 36 %+ main stat                   | heartBadge | 5.05 × 10⁻⁴       | 4,732 / **56.8 B**     | 1,980 / 43.6 B        |
| 39 %+ main stat                   | heartBadge | 2.15 × 10⁻⁵       | 465,484 / 5.6 T        | 46,548 / **1.0 T**    |
| Xenon, 33 %+ any of STR/DEX/LUK   | hat (150)  | 1.11 × 10⁻²       | 202 / 2.4 B            | 90 / **2.0 B**        |
| **3× Item Drop Rate**             | accessory  | 3.40 × 10⁻⁶       | 2,944,724 / 35.3 T     | 294,472 / **6.5 T**   |
| 2× Item Drop Rate                 | accessory  | 1.26 × 10⁻³       | 1,853 / 22.2 B         | 794 / **17.5 B**      |

### Reading this table

- **Glowing beats Bright whenever you do not need prime lines.** For 3× boss-or-IED on a
  weapon, Glowing is 2.3 B against Bright's 3.9 B, because the Unique pool also contains
  boss and IED lines — you do not care whether they are prime. Bright only wins when the
  wanted line exists _only_ in the Legendary pool (Critical Damage, cooldown, Meso/Drop) or
  when you demand the prime _value_ (13 % rather than 10 %).
- **The user's "~100 trillion for 3× crit damage on gloves"** is high by ~34×: the sourced
  figure is **2.9 T** with Bright Cubes. The intuition was right, the magnitude was not —
  though **3× prime 13 % %ATT on a weapon with Glowing cubes is 103 T**, which is likely the
  shape of the number they had in mind. Either way, "a handful of characters in MapleStory
  history" is a fair description of both.
- **Nothing "reroll to three useful lines" should ever cost 2.2 B.** The cheapest genuinely
  useful three-line target in the table (30 %+ main stat on a hat) is 4.8 B; the expensive
  ones are 10³–10⁴× the old model's answer. The old number was not merely imprecise — it
  was in the wrong regime, and it would have ranked potential above everything else in the
  upgrade list.
- **`%` stat rows above are armour/accessory and therefore carry the §3.1 uncertainty:**
  read them as "×1.34 pessimistic if the KMS tables turn out to be right for GMS". The
  weapon, secondary and emblem rows do not.

### 7.1 Asking for a stat target correctly

"33 %+ stat", the phrasing the reference calculators use, means **main-stat % lines plus
All Stat % lines, summed across all three lines** — All Stat raises your main stat, so it
counts (at 3 % below the pure stat line of the same rank, which is why `12/12/9` is the
canonical "33 %" roll on a Lv150 item). It does **not** mean "any three stat lines".

That distinction is worth ~40×, so `potential-lines.ts` refuses to guess:

```ts
mainStatPercent('luk', 33); // ✅ LUK% + All Stat%, summed  → 5,403 cubes on a Lv150 hat
{ kind: 'stat_pct', lines: 3, totalValue: 33 }        // ❌ throws
{ kind: 'stat_pct', lines: 3, totalValue: 33, anyStat: true } // ✅ Xenon only → 90 cubes
```

The rejected form is satisfied by `STR +12% / DEX +12% / LUK +9%` — three lines that sum to
33 % and are worth nothing to a single-stat character. `attackPercent(total)` is the
equivalent helper for "N %+ ATT", and correctly does **not** count All Stat.

---

## 8. Open questions

1. **Does a Legendary GMS hat/glove/accessory roll a `DEF %` line?** See §3.1. This is now
   the largest error term in any armour or accessory cube cost (×1.34), and it is
   settleable in thirty seconds by anyone who can read an in-game potential tooltip or the
   GMS potential-line list in the client.
2. **GMS rank-up rates post-v239.** Still unsourced (carried over from `formulas.md` §4A
   §3.5 open question #5). This is the largest remaining error term in any
   "rare → legendary" cost estimate.
3. **Does GMS actually have the 3-line boss/IED/drop change?** Inferred from a KMS patch
   note plus a GMS calculator's behaviour, not from a GMS patch note. The specific GMS
   version was not located.
4. **Whether a cube re-hides potential** (i.e. whether the reveal fee is per-cube). See §6.
5. **Pools below the published item-level bands** are unpublished, not merely untranscribed.
6. **S1's snapshot is 2026-07-08.** If GMS changed a line pool between then and now, this
   dataset would not know. No such change appears in GMS v264-v271 patch notes
   (`formulas.md` §4A §3, "2025-2026 changes").
