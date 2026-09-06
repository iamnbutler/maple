# GMS Bossing Data & Progression Benchmarks (2026)

Research compiled 2026-09-06 for the MapleStory progression tracker. Target use: a
"which bosses should I fight right now" benchmark across three axes — **solo clear**,
**duo/party clear**, and **getting carried** (surviving as a blue dot).

Every number in this document has a source URL. Where a number could not be verified it
is marked `unknown` rather than estimated. Where sources disagree, both are shown with the
disagreement called out — this matters a lot for section 2, where community "requirements"
are opinion rather than game data.

---

## 0. How to read this document

The data splits cleanly into three confidence tiers, and a tracker should treat them
differently:

| Tier | What it is | Confidence | Use for |
|---|---|---|---|
| **A — Game data** | HP, level, PDR, force requirements, time limits, death counts, party size, entry level, crystal values, in-game minimum Combat Power | High. Extracted from client data via MapleStory Wiki. | Hard gates. Safe to enforce in UI. |
| **B — Derived arithmetic** | 5%-of-HP contribution thresholds, required DPM for a target clear time | High, because it is computed from Tier A. | The carry axis, and clear-time estimation. |
| **C — Community opinion** | "You need X main stat / Y combat power to solo this" | Low-to-medium. Single-author charts that disagree with each other by up to 2×. | Soft guidance. Always show as a range with attribution. |

The single most important structural finding: **there is no published, validated mapping
from a character's stats to a clear time.** What exists instead is (a) a real in-game
Combat Power gate that Nexon actually ships, and (b) a scattering of blog charts. Section 3
covers the former, which is far more useful than the latter.

---

## 1. Boss roster, game data (Tier A)

### 1.1 The 2026 GMS roster

The roster below is the complete set of Boss-tab bosses in GMS as of client version
**v270**. Confirmed additions since the older community spreadsheets, all present in GMS
by 2026:

- **OMNI-CLN** (Normal) — level 180+
- **First Adversary** (Easy / Normal / Hard / Extreme) — final boss of Odium, level 270+
- **Malefic Star** (Normal / Hard) — final boss of the Dark Sea, level 280+
- **Jupiter** (Normal / Hard) — level 295+, the current apex boss, from the
  KMS *Crown* update (GMS: *Ride The Lightning*)
- **Extreme Lotus**, **Extreme Kalos**, **Extreme Kaling**, **Extreme Seren**,
  **Extreme Black Mage**, **Extreme First Adversary**

Two bosses that appear in wiki tables are **not in GMS** and must be excluded:
**Bellona** (KMS only) and **Malitia** (JMS / CMS / TMS only).
Source: <https://maplestorywiki.net/w/Bosses>

`Gollux`, `Ursus` and `Balrog` are special-cased — see §1.4.

### 1.2 Master table

Extracted from MapleStory Wiki per-boss `Monster` pages (client template fields) and the
Intense Power Crystal price table. Columns are ready to port to JSON.

- **Mob Lv** is the monster's own level (drives level-difference damage penalties);
  **Entry Lv** is the character level gate.
- **PDR** is the monster's Physical Defense Rate. Values above 100% appear literally in
  client data — this is why IED is multiplicative and why "effective IED" matters.
- **Force req** — `ARC` = Arcane Force, `SAC` = Sacred Power / Authentic Force. See §4.
- **Min CP** is the in-game minimum Combat Power entry gate. See §3.
- Crystal values are GMS v270, non-Heroic. **Heroic (Reboot) worlds pay 5×.**
- **Reset** was cross-checked boss-by-boss against the crystal page's Daily/Weekly/Monthly
  crystal classification. Black Mage is the only **monthly** boss (with a separate 1
  entry/day limit). `Daily?` marks OMNI-CLN, whose reset type could not be independently
  confirmed.

| Boss | Diff | Mob Lv | Entry Lv | Total HP | Phases / HP split | PDR | Force req | Time | Death count | Party | Reset | Crystal (solo) | Crystal (6p ea) | Min CP (solo) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Zakum | Easy | 50 | 50+ | 3.832M | 204K + 204K + 204K + 204K + 204K + 204K + 204K + 204K + 2.2M | 20% | — | 20 minutes | 50 | 1 - 6 | Daily | 200,000 | 33,333 | 10,000 |
| Zakum | Normal | 110 | 90+ | 12.6M | 700K + 700K + 700K + 700K + 700K + 700K + 700K + 700K + 7M | 40% | — | 30 minutes | 5 | 1 - 6 | Daily | 612,500 | 102,083 | 30,000 |
| Zakum | Chaos | 180 | 90+ | 168B | 10.5B + 10.5B + 10.5B + 10.5B + 10.5B + 10.5B + 10.5B + 10.5B + 84B | 50% | — | 30 minutes | 5 | 1 - 6 | Weekly | 16,200,000 | 2,700,000 | 300,000 |
| Hilla | Normal | 110 | 85+ | 500M |  | 50% | — | 30 minutes | — | 1 - 6 | Daily | 800,000 | 133,333 | 10,000 |
| Hilla | Hard | 190 | 170+ | 16.8B |  | 100% | — | 30 minutes | 15 | 1 - 6 | Weekly | 11,250,000 | 1,875,000 | 100,000 |
| Pink Bean | Normal | 180 | 140+ | 2.1B |  | 70% | — | 30 minutes | 5 | 1 - 6 | Daily | 1,404,500 | 234,083 | 50,000 |
| Pink Bean | Chaos | 190 | 170+ | 69.3B |  | 100% | — | 30 minutes | 5 | 1 - 6 | Weekly | 12,800,000 | 2,133,333 | 300,000 |
| Cygnus | Easy | 140 | 165+ | 10.5B |  | 100% | — | 30 minutes | 5 | 1 - 6 | Weekly | 9,112,500 | 1,518,750 | 300,000 |
| Cygnus | Normal | 190 | 165+ | 63B |  | 100% | — | 30 minutes | 5 | 1 - 6 | Weekly | 14,450,000 | 2,408,333 | 500,000 |
| Pierre | Normal | 120 | 125+ | 315M |  | 50% | — | 15 minutes | 5 | 1 - 6 | Daily | 968,000 | 161,333 | 50,000 |
| Pierre | Chaos | 190 | 180+ | 80B |  | 80% | — | 20 minutes | 5 | 1 - 6 | Weekly | 16,200,000 | 2,700,000 | 300,000 |
| Von Bon | Normal | 120 | 125+ | 315M |  | 50% | — | 8 minutes | 5 | 1 - 6 | Daily | 968,000 | 161,333 | 50,000 |
| Von Bon | Chaos | 190 | 180+ | 100B |  | 100% | — | 10 minutes | 5 | 1 - 6 | Weekly | 16,200,000 | 2,700,000 | 300,000 |
| Crimson Queen | Normal | 120 | 125+ | 315M |  | 50% | — | 15 minutes | 5 | 1 - 6 | Daily | 968,000 | 161,333 | 50,000 |
| Crimson Queen | Chaos | 190 | 180+ | 140B |  | 120% | — | 20 minutes | 5 | 1 - 6 | Weekly | 16,200,000 | 2,700,000 | 300,000 |
| Vellum | Normal | 130 | 125+ | 550M |  | 55% | — | 15 minutes | 5 | 1 - 6 | Daily | 968,000 | 161,333 | 100,000 |
| Vellum | Chaos | 190 | 180+ | 200B |  | 200% | — | 20 minutes | 5 | 1 - 6 | Weekly | 21,012,500 | 3,502,083 | 500,000 |
| Von Leon | Easy | 120 | 125+ | 700M |  | 50% | — | 30 minutes | 5 | 1 - 6 | Daily | 1,058,000 | 176,333 | 10,000 |
| Von Leon | Normal | 129 | 125+ | 6.3B |  | 80% | — | 30 minutes | 5 | 1 - 6 | Daily | 1,458,000 | 243,000 | 30,000 |
| Von Leon | Hard | 150 | 125+ | 10.5B |  | 90% | — | 30 minutes | 5 | 1 - 6 | Daily | 2,450,000 | 408,333 | 50,000 |
| Horntail | Easy | 130 | 130+ | 1.0176B |  | 40% | — | 30 minutes | 10 | 1 - 6 | Daily | 882,000 | 147,000 | 10,000 |
| Horntail | Normal | 160 | 130+ | 2.75B |  | 40% | — | 30 minutes | 5 | 1 - 6 | Daily | 1,012,500 | 168,750 | 30,000 |
| Horntail | Chaos | 160 | 135+ | 26.6B |  | 50% | — | 30 minutes | 5 | 1 - 6 | Daily | 1,352,000 | 225,333 | 50,000 |
| Arkarium | Easy | 130 | 140+ | 2.1B |  | 60% | — | 30 minutes | 5 | 1 - 6 | Daily | 1,152,000 | 192,000 | 30,000 |
| Arkarium | Normal | 170 | 140+ | 12.6B |  | 90% | — | 30 minutes | 5 | 1 - 6 | Daily | 2,520,500 | 420,083 | 100,000 |
| Magnus | Easy | 110 | 115+ | 400M |  | 50% | — | 30 minutes | 5 | 1 - 6 | Daily | 722,000 | 120,333 | 10,000 |
| Magnus | Normal | 130 | 155+ | 6B |  | 50% | — | 30 minutes | 10 | 1 - 6 | Daily | 2,592,000 | 432,000 | 100,000 |
| Magnus | Hard | 190 | 175+ | 120B |  | 120% | — | 30 minutes | 15 | 1 - 6 | Weekly | 19,012,500 | 3,168,750 | 300,000 |
| Papulatus | Easy | 125 | 115+ | 400.54M | 539.925K + 300M + 100M | 25% | — | 20 minutes | 50 | 1 - 6 | Daily | 684,500 | 114,083 | 10,000 |
| Papulatus | Normal | 155 | 155+ | 16.8005B | 539.925K + 12.6B + 4.2B | 25% | — | 30 minutes | 5 | 1 - 6 | Daily | 2,664,500 | 444,083 | 100,000 |
| Papulatus | Chaos | 190 | 190+ | 504.001B | 539.925K + 378B + 126B | 25% | — | 30 minutes | 5 | 1 - 6 | Weekly | 26,450,000 | 4,408,333 | 800,000 |
| Mori Ranmaru | Normal | 129 | 120+ | 1B |  | 55% | — | 60 minutes | 10 | 1 - 6 | Daily | 840,500 | 140,083 | 50,000 |
| Mori Ranmaru | Hard | 195 | 180+ | 2.1B |  | 90% | — | 60 minutes | 5 | 1 - 6 | Daily | 2,664,500 | 444,083 | 500,000 |
| Gollux | Easy | 180 | GMS and JMS | 120M | 50M + 50M + 10M + 10M | 10% | — | 30 minutes | 5 | 1 - 6 | Daily | — | — | — |
| Gollux | Normal | 180 |  | 6.61B | 3B + 3B + 600M + 10M |  | — |  | — |  | Daily | — | — | — |
| Gollux | Hard | 190 |  | 165.01B | 75B + 75B + 15B + 10M | 150% | — |  | — |  | Daily | — | — | — |
| OMNI-CLN | Normal | 180 | 180+ | 1.68B |  | 60% | — | 30 minutes | 5 | 1 - 6 | Daily? | 1,250,000 | 208,333 | 10,000 |
| Princess No | Normal | 180 | 180+ | 500B |  | 100% | — | 30 minutes | 5 | 1 - 6 | Weekly | 16,200,000 | 2,700,000 | 300,000 |
| Akechi Mitsuhide | Normal | 210 | 200+ | 701B | 350B + 350B + 1B | 300% | — | 30 minutes | 5 | 1 - 6 | Weekly | 28,800,000 | 4,800,000 | — |
| Lotus | Normal | 210 | 190+ | 1.575T | 472.5B + 472.5B + 630B | 300% | — | 30 minutes | 5 | 1 - 6 | Weekly | 32,512,500 | 5,418,750 | 1,500,000 |
| Lotus | Hard | 210 | 190+ | 33.285T | 9.9855T + 9.9855T + 13.314T | 300% | — | 30 minutes | 5 | 1 - 6 | Weekly | 88,935,000 | 14,822,500 | 5,000,000 |
| Lotus | Extreme | 285 | 190+ | 1.811Q | 543.3T + 543.3T + 724.4T | 380% | — | 30 minutes | 5 | 1 - 2 | Weekly | 279,500,000 | — | 200,000,000 |
| Damien | Normal | 210 | 190+ | 1.2T | 840B + 360B | 300% | — | 30 minutes | 10 | 1 - 6 | Weekly | 33,800,000 | 5,633,333 | 2,000,000 |
| Damien | Hard | 210 | 190+ | 36T | 25.2T + 10.8T | 300% | — | 30 minutes | 10 | 1 - 6 | Weekly | 84,375,000 | 14,062,500 | 6,000,000 |
| Guardian Angel Slime | Normal | 220 | 210+ | 5T |  | 300% | — | 30 minutes | 5 | 1 - 6 | Weekly | 46,334,700 | 7,722,450 | 2,000,000 |
| Guardian Angel Slime | Chaos | 250 | 210+ | 90T |  | 300% | — | 30 minutes | 5 | 1 - 6 | Weekly | 120,115,625 | 20,019,270 | 22,000,000 |
| Lucid | Easy | 230 | 220+ | 12T | 6T + 6T | 300% | ✦360 ARC | 30 minutes | 10 | 1 - 6 | Weekly | 47,401,875 | 7,900,312 | 2,000,000 |
| Lucid | Normal | 230 | 220+ | 24T | 12T + 12T | 300% | ✦360 ARC | 30 minutes | 10 | 1 - 6 | Weekly | 50,765,625 | 8,460,937 | 3,500,000 |
| Lucid | Hard | 230 | 220+ | 117.6T | 50.8T + 54T + 12.8T | 300% | ✦360 ARC | 30 minutes | 10 | 1 - 6 | Weekly | 100,800,000 | 16,800,000 | 18,000,000 |
| Will | Easy | 235 | 235+ | 16.8T | 5.6T + 4.2T + 7T | 300% | ✦560 ARC | 30 minutes | 10 | 1 - 6 | Weekly | 49,348,950 | 8,224,825 | 2,000,000 |
| Will | Normal | 250 | 235+ | 25.2T | 8.4T + 6.3T + 10.5T | 300% | ✦760 ARC | 30 minutes | 10 | 1 - 6 | Weekly | 55,815,000 | 9,302,500 | 3,500,000 |
| Will | Hard | 250 | 235+ | 126T | 42T + 31.5T + 52.5T | 300% | ✦760 ARC | 30 minutes | 10 | 1 - 6 | Weekly | 124,362,000 | 20,727,000 | 20,000,000 |
| Gloom | Normal | 255 | 245+ | 25.41T |  | 300% | ✦730 ARC | 30 minutes | 5 | 1 - 6 | Weekly | 59,535,000 | 9,922,500 | 3,500,000 |
| Gloom | Chaos | 255 | 245+ | 127.05T |  | 300% | ✦730 ARC | 30 minutes | 5 | 1 - 6 | Weekly | 112,789,000 | 18,798,166 | 20,000,000 |
| Verus Hilla | Normal | 250 | 250+ | 89.25T |  | 300% | ✦820 ARC | 30 minutes | 5 (Spirit Stones) | 1 - 6 | Weekly | 116,376,000 | 19,396,000 | 12,000,000 |
| Verus Hilla | Hard | 250 | 250+ | 178.5T |  | 300% | ✦900 ARC | 30 minutes | 5 (Spirit Stones) | 1 - 6 | Weekly | 152,421,000 | 25,403,500 | 24,000,000 |
| Darknell | Normal | 265 | 255+ | 26.25T |  | 300% | ✦850 | 30 minutes | 5 | 1 - 6 | Weekly | 63,375,000 | 10,562,500 | 4,000,000 |
| Darknell | Hard | 265 | 255+ | 157.5T |  | 300% | ✦850 | 30 minutes | 5 | 1 - 6 | Weekly | 133,584,000 | 22,264,000 | 22,000,000 |
| Black Mage | Hard | 265 | 255+ | 472.5T |  | 300% | ✦1320 ARC | 1 hour | 12 (Life Gauge) | 1 - 6 | **Monthly** | 900,000,000 | 150,000,000 | 50,000,000 |
| Black Mage | Extreme | 275 | 255+ | 4.811Q |  | 300% | ✦1320 ARC | 30 minutes | 12 (Life Gauge) | 1 - 6 | **Monthly** | 3,600,000,000 | 600,000,000 | 600,000,000 |
| Chosen Seren | Normal | 270 | 260+ | 207.9T |  | 380% | Phase 1: ⬢150 SAC | 30 minutes | 5 | 1 - 6 | Weekly | 177,804,375 | 29,634,062 | 50,000,000 |
| Chosen Seren | Hard | 275 | 260+ | 483T |  | 380% | Phase 1: ⬢150 SAC | 30 minutes | 5 | 1 - 6 | Weekly | 219,312,000 | 36,552,000 | 80,000,000 |
| Chosen Seren | Extreme | 275 | 260+ | 6.48Q |  | 380% | Phase 1: ⬢150 SAC | 30 minutes | 8 | 1 - 6 | Weekly | 847,000,000 | 141,166,666 | 800,000,000 |
| Kalos the Guardian | Easy | 270 | 265+ | 357T | 94.5T + 262.5T | 330% | ⬢200 SAC | 30 minutes | 5 | 1 - 6 | Weekly | 187,500,000 | 31,250,000 | 35,000,000 |
| Kalos the Guardian | Normal | 275 | 265+ | 1.056Q | 336T + 720T | 330% | Phase 1: ⬢250 SAC | 30 minutes | 5 | 1 - 6 | Weekly | 260,000,000 | 43,333,333 | 120,000,000 |
| Kalos the Guardian | Chaos | 285 | 265+ | 5.126Q | 1.066Q + 4.06Q | 380% | ⬢330 SAC | 30 minutes | 8 | 1 - 6 | Weekly | 520,000,000 | 86,666,666 | 550,000,000 |
| Kalos the Guardian | Extreme | 285 | 265+ | 21.296Q | 5.798Q + 15.498Q | 380% | ⬢440 SAC | 30 minutes | 8 | 1 - 6 | Weekly | 1,040,000,000 | 173,333,333 | 2,500,000,000 |
| First Adversary | Easy | 270 | 270+ | 570T | 171T + 171T + 228T | 380% | ⬢220 SAC | 30 minutes | Adversarial Will 1000->0; -200 per death (per player) | 1 - 3 | Weekly | 197,000,000 | — | 50,000,000 |
| First Adversary | Normal | 280 | 270+ | 1.65Q | 495T + 495T + 660T | 380% | ⬢320 SAC | 30 minutes | Adversarial Will 1000->0; -200 per death (per player) | 1 - 3 | Weekly | 273,000,000 | — | 150,000,000 |
| First Adversary | Hard | 285 | 270+ | 10.45Q | 3.135Q + 3.135Q + 4.18Q | 380% | ⬢340 SAC | 30 minutes | Adversarial Will 1000->0; -200 per death (per player) | 1 - 3 | Weekly | 588,000,000 | — | 900,000,000 |
| First Adversary | Extreme | 290 | 270+ | 32.18Q | 9.655Q + 9.655Q + 12.87Q | 380% | ⬢460 SAC | 30 minutes | Adversarial Will 1000->0; -200 per death (per player) | 1 - 3 | Weekly | 1,176,000,000 | — | 2,500,000,000 |
| Kaling | Easy | 275 | 275+ | 921T |  | 380% | ⬢230 SAC | 30 minutes | Willpower 1000 shared; -160/100/80/70/60/50 per death at party size 1-6 | 1 - 6 | Weekly | 206,250,000 | 34,375,000 | 80,000,000 |
| Kaling | Normal | 285 | 275+ | 3.923Q | 399T + 399T + 399T + 468T + 512T + 512T + 512T + 722T | 380% | ⬢330 SAC | 30 minutes | Willpower 1000 shared; -160/100/80/70/60/50 per death at party size 1-6 | 1 - 6 | Weekly | 301,300,000 | 50,216,666 | 280,000,000 |
| Kaling | Hard | 285 | 275+ | 12.091Q | 920T + 920T + 920T + 1.404Q + 1.827Q + 1.827Q + 1.827Q + 2.446Q | 380% | ⬢350 SAC | 30 minutes | Willpower 1000 shared; -160/100/80/70/60/50 per death at party size 1-6 | 1 - 6 | Weekly | 598,000,000 | 99,666,666 | 1,000,000,000 |
| Kaling | Extreme | 285 | 275+ | 54.436Q | 6.018Q + 6.018Q + 6.018Q + 6.93Q + 6.93Q + 6.93Q + 6.93Q + 8.662Q | 380% | ⬢480 SAC | 30 minutes | Willpower 1000 shared; -160/100/80/70/60/50 per death at party size 1-6 | 1 - 6 | Weekly | 1,205,200,000 | 200,866,666 | 5,500,000,000 |
| Malefic Star | Normal | 280 | 280+ | 3.288Q |  | 380% | ⬢400 SAC | 30 minutes | 5 | 1 - 3 | Weekly | 290,400,000 | — | 230,000,000 |
| Malefic Star | Hard | 280 | 280+ | 14.74Q |  | 380% | ⬢550 SAC | 30 minutes | 5 | 1 - 3 | Weekly | 798,000,000 | — | 1,000,000,000 |
| Limbo | Normal | 285 | 285+ | 6.505Q |  | 380% | ⬢500 SAC | 30 minutes | Erosion 0->1000 per player; +150 per death | 1 - 3 | Weekly | 420,000,000 | — | 550,000,000 |
| Limbo | Hard | 285 | 285+ | 12.5Q |  | 380% | ⬢500 SAC | 30 minutes | Erosion 0->1000 per player; +150 per death | 1 - 3 | Weekly | 749,000,000 | — | 1,000,000,000 |
| Baldrix | Normal | 290 | 290+ | 9.05681Q |  | 380% | ⬢700 SAC | 30 minutes | Magic Encroachment 0->1000 shared; +200/100/70 per death at party size 1/2/3 | 1 - 3 | Weekly | 560,000,000 | — | 700,000,000 |
| Baldrix | Hard | 290 | 290+ | 20.3397Q |  | 380% | ⬢700 SAC | 30 minutes | Magic Encroachment 0->1000 shared; +200/100/70 per death at party size 1/2/3 | 1 - 3 | Weekly | 840,000,000 | — | 2,000,000,000 |
| Jupiter | Normal | 295 | 295+ | 10.266Q |  | 380% | ⬢810 SAC | 30 minutes | Rupture 0->1000; +150 (separated) / +200 (combined) per death [low confidence] | 1 - 3 | Weekly | 593,000,000 | — | 900,000,000 |
| Jupiter | Hard | 295 | 295+ | 49.4Q |  | 380% | ⬢810 SAC | 30 minutes | Rupture 0->1000; +150 (separated) / +200 (combined) per death [low confidence] | 1 - 3 | Weekly | 1,190,600,000 | — | 4,500,000,000 |

Sources: per-boss pages under <https://maplestorywiki.net/w/> (e.g.
<https://maplestorywiki.net/w/Lucid/Monster>, <https://maplestorywiki.net/w/Kalos/Monster>,
<https://maplestorywiki.net/w/Limbo/Monster>, <https://maplestorywiki.net/w/Baldrix/Monster>,
<https://maplestorywiki.net/w/Jupiter/Monster>, <https://maplestorywiki.net/w/First_Adversary/Monster>,
<https://maplestorywiki.net/w/Malefic_Star/Monster>); entry levels from
<https://maplestorywiki.net/w/Bosses>; crystal values from
<https://maplestorywiki.net/w/Intense_Power_Crystal>; minimum Combat Power from
<https://maplestorywiki.net/w/Combat_Power>.

### 1.3 Corrections applied to naive HP sums

Three bosses will be wrong if you simply sum the per-part HP entries on the wiki. These
have been corrected in the table above:

| Boss | Naive sum | Correct total | Why |
|---|---|---|---|
| Horntail (Easy) | 1.835B | **1.0176B** | The `Horntail` body entry dies automatically once the 8 Phase-3 parts are down; it duplicates the Phase-3 subtotal. |
| Horntail (Normal) | 4.84B | **2.75B** | same |
| Horntail (Chaos) | 46.6B | **26.6B** | same |
| Pierre (Normal / Chaos) | 945M / 240B | **315M / 80B** | The three colour forms **share one HP bar**; they are not additive. |
| Crimson Queen (Normal / Chaos) | 1.26B / 560B | **315M / 140B** | The four mood forms share one HP bar. |

Source: <https://maplestorywiki.net/w/Horntail>, <https://maplestorywiki.net/w/Pierre>,
<https://maplestorywiki.net/w/Crimson_Queen>

### 1.4 Special-cased bosses

**Gollux** is one Boss-tab entry, not four selectable tiers. Difficulty is determined by
how many weak points you destroy before killing the head, and all tiers share the single
daily entry. It pays Gollux Pennies/Coins, **not** an Intense Power Crystal, so it has no
crystal row.

| Component | Easy | Normal | Hard | Hell |
|---|---|---|---|---|
| Head P1 (jaw) | 50,000,000 | 3,000,000,000 | 75,000,000,000 | 350,000,000,000 |
| Head P2 (eyes) | 50,000,000 | 3,000,000,000 | 75,000,000,000 | 350,000,000,000 |
| Head P3 (jewel) | 10,000,000 | 600,000,000 | 15,000,000,000 | 70,000,000,000 |
| **Head total** | **110,000,000** | **6,600,000,000** | **165,000,000,000** | **770,000,000,000** |
| Mob level | 180 | 180 | 190 | 200 |
| PDR | 10% | `unknown` (wiki records `?%`) | 150% | 250% |

Fixed weak points, identical at all difficulties (Lv 150, PDR 15%): Left Shoulder
40,000,000 · Right Shoulder 40,000,000 · Abdomen 60,000,000. Corrupted Heart (reward
object) 10,000,000. Entry level 180+, 1 entry/day, party 1–6, 30 min, 5 deaths.
Source: <https://maplestorywiki.net/w/Gollux>

**Ursus** — level 129, HP 2,625,000,000,000, PDR 10%, **no time limit**, 80 shared lives,
party **1–18** (three parties of 6), entry level 100+, 3 entries/day/account. Drops no
items; pays mesos by rank, doubled during Golden Time (01:00–05:00 and 18:00–22:00 UTC),
5× in Heroic worlds. Source: <https://maplestorywiki.net/w/Ursus>

**Balrog** — Easy, three sequential forms: 2,400,000 (Lv 45) + 1,152,000 (Lv 49) +
1,235,520 (Lv 49) = 4,787,520. PDR 25%, 20 min, party 1–6, entry 65+. Death count and
reset limit are blank on the wiki. Source: <https://maplestorywiki.net/w/Balrog>

### 1.5 GMS-specific divergences

- **Hard Mori Ranmaru HP in GMS is 2,100,000,000 — roughly 40× lower than the
  84,000,000,000 used in other regions.** GMS never received the HP buff. This is the
  largest GMS-vs-global divergence in the roster and will silently break any tracker that
  imports KMS data.
- **Chaos Vellum is 200B in GMS** vs 120B in MSEA.
- Crystal caps differ by region: GMS allows **180 crystals per world per week and 14
  Weekly-type crystals per character per week**; KMS/JMS/CMS/MSEA/TMS allow 90 per world
  and 12 per character. Source: <https://maplestorywiki.net/w/Intense_Power_Crystal>

### 1.6 Full Intense Power Crystal price table (GMS v270)

Party values are `floor(solo ÷ N)` **each**, so total party payout is roughly constant
while per-head payout drops. A blank column means the boss cannot be entered with that
many players — this is a reliable way to read max party size (e.g. Extreme Lotus is 1–2;
Limbo / Baldrix / Jupiter / Malefic Star / First Adversary are 1–3).

Crystals are time-limited (7 days), sold only to the **Collector** at the Free Market
entrance. Selling a higher-value Weekly crystal after a lower one refunds the difference.
**Heroic (Reboot) worlds pay 5× the listed values.**

| Boss | Solo | 2p each | 3p each | 4p each | 5p each | 6p each |
|---|---|---|---|---|---|---|
| Easy Zakum | 200,000 | 100,000 | 66,666 | 50,000 | 40,000 | 33,333 |
| Normal Zakum | 612,500 | 306,250 | 204,166 | 153,125 | 122,500 | 102,083 |
| Easy Papulatus | 684,500 | 342,250 | 228,166 | 171,125 | 136,900 | 114,083 |
| Easy Magnus | 722,000 | 361,000 | 240,666 | 180,500 | 144,400 | 120,333 |
| Yakuza Boss | 722,000 | 361,000 | 240,666 | 180,500 | 144,400 | 120,333 |
| Normal Hilla | 800,000 | 400,000 | 266,666 | 200,000 | 160,000 | 133,333 |
| Normal Mori Ranmaru | 840,500 | 420,250 | 280,166 | 210,125 | 168,100 | 140,083 |
| Easy Horntail | 882,000 | 441,000 | 294,000 | 220,500 | 176,400 | 147,000 |
| Gigatoad | 882,000 | 441,000 | 294,000 | 220,500 | 176,400 | 147,000 |
| Normal Pierre | 968,000 | 484,000 | 322,666 | 242,000 | 193,600 | 161,333 |
| Normal Von Bon | 968,000 | 484,000 | 322,666 | 242,000 | 193,600 | 161,333 |
| Normal Crimson Queen | 968,000 | 484,000 | 322,666 | 242,000 | 193,600 | 161,333 |
| Normal Vellum | 968,000 | 484,000 | 322,666 | 242,000 | 193,600 | 161,333 |
| Normal Horntail | 1,012,500 | 506,250 | 337,500 | 253,125 | 202,500 | 168,750 |
| Easy Von Leon | 1,058,000 | 529,000 | 352,666 | 264,500 | 211,600 | 176,333 |
| Easy Arkarium | 1,152,000 | 576,000 | 384,000 | 288,000 | 230,400 | 192,000 |
| Frenzied Gigatoad | 1,153,000 | 576,500 | 384,333 | 288,250 | 230,600 | 192,166 |
| Normal OMNI-CLN | 1,250,000 | 625,000 | 416,666 | 312,500 | 250,000 | 208,333 |
| Chaos Horntail | 1,352,000 | 676,000 | 450,666 | 338,000 | 270,400 | 225,333 |
| Normal Pink Bean | 1,404,500 | 702,250 | 468,166 | 351,125 | 280,900 | 234,083 |
| Normal Von Leon | 1,458,000 | 729,000 | 486,000 | 364,500 | 291,600 | 243,000 |
| Hard Von Leon | 2,450,000 | 1,225,000 | 816,666 | 612,500 | 490,000 | 408,333 |
| Normal Arkarium | 2,520,500 | 1,260,250 | 840,166 | 630,125 | 504,100 | 420,083 |
| Normal Magnus | 2,592,000 | 1,296,000 | 864,000 | 648,000 | 518,400 | 432,000 |
| Normal Papulatus | 2,664,500 | 1,332,250 | 888,166 | 666,125 | 532,900 | 444,083 |
| Hard Mori Ranmaru | 2,664,500 | 1,332,250 | 888,166 | 666,125 | 532,900 | 444,083 |
| Easy Cygnus | 9,112,500 | 4,556,250 | 3,037,500 | 2,278,125 | 1,822,500 | 1,518,750 |
| Hard Hilla | 11,250,000 | 5,625,000 | 3,750,000 | 2,812,500 | 2,250,000 | 1,875,000 |
| Chaos Pink Bean | 12,800,000 | 6,400,000 | 4,266,666 | 3,200,000 | 2,560,000 | 2,133,333 |
| Normal Cygnus | 14,450,000 | 7,225,000 | 4,816,666 | 3,612,500 | 2,890,000 | 2,408,333 |
| Chaos Zakum | 16,200,000 | 8,100,000 | 5,400,000 | 4,050,000 | 3,240,000 | 2,700,000 |
| Chaos Pierre | 16,200,000 | 8,100,000 | 5,400,000 | 4,050,000 | 3,240,000 | 2,700,000 |
| Chaos Von Bon | 16,200,000 | 8,100,000 | 5,400,000 | 4,050,000 | 3,240,000 | 2,700,000 |
| Chaos Crimson Queen | 16,200,000 | 8,100,000 | 5,400,000 | 4,050,000 | 3,240,000 | 2,700,000 |
| Normal Princess No | 16,200,000 | 8,100,000 | 5,400,000 | 4,050,000 | 3,240,000 | 2,700,000 |
| Hard Magnus | 19,012,500 | 9,506,250 | 6,337,500 | 4,753,125 | 3,802,500 | 3,168,750 |
| Chaos Vellum | 21,012,500 | 10,506,250 | 7,004,166 | 5,253,125 | 4,202,500 | 3,502,083 |
| Chaos Papulatus | 26,450,000 | 13,225,000 | 8,816,666 | 6,612,500 | 5,290,000 | 4,408,333 |
| Normal Akechi Mitsuhide | 28,800,000 | 14,400,000 | 9,600,000 | 7,200,000 | 5,760,000 | 4,800,000 |
| Normal Lotus | 32,512,500 | 16,256,250 | 10,837,500 | 8,128,125 | 6,502,500 | 5,418,750 |
| Normal Damien | 33,800,000 | 16,900,000 | 11,266,666 | 8,450,000 | 6,760,000 | 5,633,333 |
| Normal Guardian Angel Slime | 46,334,700 | 23,167,350 | 15,444,900 | 11,583,675 | 9,266,940 | 7,722,450 |
| Easy Lucid | 47,401,875 | 23,700,937 | 15,800,625 | 11,850,468 | 9,480,375 | 7,900,312 |
| Easy Will | 49,348,950 | 24,674,475 | 16,449,650 | 12,337,237 | 9,869,790 | 8,224,825 |
| Normal Lucid | 50,765,625 | 25,382,812 | 16,921,875 | 12,691,406 | 10,153,125 | 8,460,937 |
| Normal Will | 55,815,000 | 27,907,500 | 18,605,000 | 13,953,750 | 11,163,000 | 9,302,500 |
| Normal Gloom | 59,535,000 | 29,767,500 | 19,845,000 | 14,883,750 | 11,907,000 | 9,922,500 |
| Normal Darknell | 63,375,000 | 31,687,500 | 21,125,000 | 15,843,750 | 12,675,000 | 10,562,500 |
| Hard Damien | 84,375,000 | 42,187,500 | 28,125,000 | 21,093,750 | 16,875,000 | 14,062,500 |
| Hard Lotus | 88,935,000 | 44,467,500 | 29,645,000 | 22,233,750 | 17,787,000 | 14,822,500 |
| Hard Lucid | 100,800,000 | 50,400,000 | 33,600,000 | 25,200,000 | 20,160,000 | 16,800,000 |
| Chaos Gloom | 112,789,000 | 56,394,500 | 37,596,333 | 28,197,250 | 22,557,800 | 18,798,166 |
| Normal Verus Hilla | 116,376,000 | 58,188,000 | 38,792,000 | 29,094,000 | 23,275,200 | 19,396,000 |
| Chaos Guardian Angel Slime | 120,115,625 | 60,057,812 | 40,038,541 | 30,028,906 | 24,023,125 | 20,019,270 |
| Hard Will | 124,362,000 | 62,181,000 | 41,454,000 | 31,090,500 | 24,872,400 | 20,727,000 |
| Hard Darknell | 133,584,000 | 66,792,000 | 44,528,000 | 33,396,000 | 26,716,800 | 22,264,000 |
| Hard Verus Hilla | 152,421,000 | 76,210,500 | 50,807,000 | 38,105,250 | 30,484,200 | 25,403,500 |
| Normal Chosen Seren | 177,804,375 | 88,902,187 | 59,268,125 | 44,451,093 | 35,560,875 | 29,634,062 |
| Easy Kalos the Guardian | 187,500,000 | 93,750,000 | 62,500,000 | 46,875,000 | 37,500,000 | 31,250,000 |
| Easy First Adversary | 197,000,000 | 98,500,000 | 65,666,666 | — | — | — |
| Easy Kaling | 206,250,000 | 103,125,000 | 68,750,000 | 51,562,500 | 41,250,000 | 34,375,000 |
| Hard Chosen Seren | 219,312,000 | 109,656,000 | 73,104,000 | 54,828,000 | 43,862,400 | 36,552,000 |
| Normal Kalos the Guardian | 260,000,000 | 130,000,000 | 86,666,666 | 65,000,000 | 52,000,000 | 43,333,333 |
| Normal First Adversary | 273,000,000 | 136,500,000 | 91,000,000 | — | — | — |
| Extreme Lotus | 279,500,000 | 139,750,000 | — | — | — | — |
| Normal Malefic Star | 290,400,000 | 145,200,000 | 96,800,000 | — | — | — |
| Normal Kaling | 301,300,000 | 150,650,000 | 100,433,333 | 75,325,000 | 60,260,000 | 50,216,666 |
| Normal Limbo | 420,000,000 | 210,000,000 | 140,000,000 | — | — | — |
| Chaos Kalos the Guardian | 520,000,000 | 260,000,000 | 173,333,333 | 130,000,000 | 104,000,000 | 86,666,666 |
| Normal Baldrix | 560,000,000 | 280,000,000 | 186,666,666 | — | — | — |
| Hard First Adversary | 588,000,000 | 294,000,000 | 196,000,000 | — | — | — |
| Normal Jupiter | 593,000,000 | 296,500,000 | 197,666,666 | — | — | — |
| Hard Kaling | 598,000,000 | 299,000,000 | 199,333,333 | 149,500,000 | 119,600,000 | 99,666,666 |
| Hard Limbo | 749,000,000 | 374,500,000 | 249,666,666 | — | — | — |
| Hard Malefic Star | 798,000,000 | 399,000,000 | 266,000,000 | — | — | — |
| Hard Baldrix | 840,000,000 | 420,000,000 | 280,000,000 | — | — | — |
| Extreme Chosen Seren | 847,000,000 | 423,500,000 | 282,333,333 | 211,750,000 | 169,400,000 | 141,166,666 |
| Hard Black Mage | 900,000,000 | 450,000,000 | 300,000,000 | 225,000,000 | 180,000,000 | 150,000,000 |
| Extreme Kalos the Guardian | 1,040,000,000 | 520,000,000 | 346,666,666 | 260,000,000 | 208,000,000 | 173,333,333 |
| Extreme First Adversary | 1,176,000,000 | 588,000,000 | 392,000,000 | — | — | — |
| Hard Jupiter | 1,190,600,000 | 595,300,000 | 396,866,666 | — | — | — |
| Extreme Kaling | 1,205,200,000 | 602,600,000 | 401,733,333 | 301,300,000 | 241,040,000 | 200,866,666 |
| Extreme Black Mage | 3,600,000,000 | 1,800,000,000 | 1,200,000,000 | 900,000,000 | 720,000,000 | 600,000,000 |

Source: <https://maplestorywiki.net/w/Intense_Power_Crystal> (GMS v270 tab)

### 1.7 Reset boundaries — lower confidence

The wiki records reset *frequency* per boss (captured in the master table) but not the
wall-clock boundary. Community guides give **daily 00:00 UTC** and **weekly Thursday
00:00 UTC**; an official Nexon forum thread gives only "8pm est" for daily, which does not
cleanly reconcile. No first-party Nexon statement of the exact boundary was found — treat
the boundary as community-sourced.

**Black Mage is the only monthly-reset boss** (1 clear/month, with a separate 1 entry/day
limit). Sources: <https://qnnit.com/maplestory-daily-and-weekly-reset-time/>,
<https://forums.maplestory.nexon.net/discussion/19874/boss-reset-times>

### 1.8 Fields that could not be sourced

- Normal Hilla death count — field blank on the wiki
- Normal Gollux PDR (GMS) — wiki records `?%`
- Balrog death count and reset limit — blank
- Akechi Mitsuhide HP — wiki annotates it "Estimated, may not be 100% accurate"
- **Baldrix time limit**: the wiki (v270) records **30 minutes**. A secondary report
  describes a KMS *OVERDRIVE* update (2026-06-19) reducing Baldrix's time limit to 20
  minutes and cutting stamina ~32.2%. This could not be confirmed as live in GMS. Treat
  30 min as current-GMS and flag for re-verification.
  Source: <https://vortexgaming.io/en/postdetail/474807>

---

## 2. Community benchmarks — "can I do this?" (Tier C)

> Read section 3 first if you only have time for one. The in-game Combat Power gate is
> real game data; everything in this section is single-author opinion. Section 4 covers
> the Force requirements, which are the other hard, game-enforced gate.

### 2.1 The honest summary

**There is no published, validated conversion from a character's stats to a boss clear.**
What exists is a handful of blog charts by individual authors that **disagree with each
other by up to 2×**, plus one deterministic, arithmetic dataset (the 5%-HP contribution
threshold, §2.2) that is genuinely reliable.

The most technically-credible community voices explicitly reject range and main stat as
cross-class proxies:

> "Attack range is a poor measurement, as are all other forms to measure damage based on
> visual numbers"
> — GMS forum thread, Mar–May 2023, <https://forums.maplestory.nexon.net/discussion/33633/recommended-attack-range-for-bosses>

Every chart author carries the same disclaimer. Games Finder calls its figures reference
points rather than thresholds because "the vast game mechanics and classes make it
impossible to consider your specific account and mechanical playing abilities"; Grandis
Library calls its numbers "safe recommendations" and notes "your class may be able to
defeat a boss with lower stat".

### 2.2 The carry / blue-dot axis — this one IS reliable

The requirement to be carried is **not** a stat threshold. It is a **damage-contribution
threshold**: you must deal at least **5% of the boss's total HP** to receive any loot.

The in-game blue-dot indicator is **misleading**, and this trips up most players:

> "If the boss has 90% HP left and you're blue dot, it just means you did 5% of the 10% HP
> and not 5% of the total 100% which you need to do."
> — <https://forums.maplestory.nexon.net/discussion/34059/5-minimum-damage-requirement-for-bosses>

The recommended method is to track absolute damage in **Battle Analysis**, noting that it
"resets or goes away whenever you go into a new phase or change maps" — so multi-phase
bosses need per-phase tracking.

**For a tracker this is the single best-behaved dataset in this document**: it is computed
arithmetically from Tier A boss HP rather than being anyone's opinion, and it covers the
endgame bosses that no stat chart reaches. Compute it directly:

```
carry_requirement_damage = boss_total_hp * 0.05
```

Using the corrected HP totals from §1.2, a selection:

| Boss | Total HP | 5% contribution needed |
|---|---|---|
| Chaos Zakum | 168B | 8.4B |
| Hard Magnus | 120B | 6B |
| Chaos Papulatus | 504B | 25.2B |
| Normal Lotus | 1.575T | 78.75B |
| Hard Lotus | 33.285T | 1.664T |
| Normal Lucid | 24T | 1.2T |
| Hard Lucid | 117.6T | 5.88T |
| Hard Will | 126T | 6.3T |
| Chaos Gloom | 127.05T | 6.35T |
| Hard Verus Hilla | 178.5T | 8.925T |
| Hard Darknell | 157.5T | 7.875T |
| Hard Black Mage | 472.5T | 23.625T |
| Normal Seren | 207.9T | 10.4T |
| Hard Seren | 483T | 24.15T |
| Easy Kalos | 357T | 17.85T |
| Easy Kaling | 921T | 46.05T |
| Hard Kaling | 12.091Q | 604.6T |
| Normal Limbo | 6.505Q | 325.25T |
| Hard Limbo | 12.5Q | 625T |
| Normal Baldrix | 9.057Q | 452.8T |
| Hard Baldrix | 20.34Q | 1.017Q |
| Normal Jupiter | 10.266Q | 513.3T |
| Hard Jupiter | 49.4Q | 2.47Q |

Rule and published chart: <https://thedigitalcrowns.com/5-hp-of-maplestory-bosses/>
(last updated 2026-02-09).

> **Caution:** that published chart is stale in at least one place — it lists Hard Kaling
> at 17.775Q, which is the **pre-nerf** value. Kaling was reduced to 12.091Q in the Carcion
> Octo Festival patch. Recompute from §1.2 HP rather than copying the chart.
> Source: <https://maplestorywiki.net/w/Kaling/Monster>

A known community friction worth surfacing in a tracker: the 5% rule "limits party play,
as supports cannot keep up and are refusing to do bosses because they no longer get
rewards." A rework based on total boss HP has been **proposed by players only and is not
implemented**. Source: <https://forums.maplestory.nexon.net/discussion/35279/boss-contribution-rework>

### 2.3 HP thresholds for surviving as a blue dot — the premise is mostly wrong

The common request is "what HP do I need to survive Hard Lucid / Black Mage". **That
question has no useful answer, and it is important the tracker does not pretend otherwise.**

Endgame bosses overwhelmingly deal **%HP damage**, which ignores HP stacking entirely:

> "All attacks deal % HP damage, so they must be manually avoided as they ignore any
> evasion stats and damage reduction skills (unless the skill is specifically stated to
> include damage proportional to HP)."
> — repeated verbatim on Lucid, Verus Hilla, Kaling, Limbo, Baldrix, Jupiter and Malefic
> Star pages, e.g. <https://maplestorywiki.net/w/Lucid/Monster>

Representative values:

| Boss | Attack | %HP damage |
|---|---|---|
| Lucid | Fairy Dust / Sickles | 30% each (bullets stack per overlap) |
| Lucid | Flower Explosion | 20 / 30 / 30% |
| Lucid | Nightmare Mushroom touch | 50% |
| Lucid | Golem jump-over | 70% continuous |
| Lucid | Lucid Rage | 50% (E) / 70% (N) / **100% (H)** |
| Lucid | Lucid Bomb | 199% |
| Will | signature attack | **100%** |
| Damien | 7 Brand stacks | **100%, instant death, ignores death protection** (Heaven's Gate, Might of the Nova) |
| Verus Hilla | large spikes | up to 50% |

Sources: <https://www.digitaltq.com/maplestory-lucid-boss-guide>,
<https://strategywiki.org/wiki/MapleStory/Verus_Hilla>,
<https://maplestorywiki.net/w/Damien/Monster>

**Implications for the tracker's carry axis:**

- Attacks at **100% HP cannot be out-HP'd at any HP value.** Hard Lucid's Lucid Rage and
  Will's signature attack are unconditional one-shots. Damien's 7-Brand explicitly
  bypasses death protection.
- Only sub-100% mechanics create a breakpoint, and even then the threshold is a *ratio* of
  your own max HP, not an absolute number — so "you need X HP for boss Y" is not a
  well-formed statement.
- Any "you need X HP" claim you encounter should be treated as folklore **unless it names
  the specific sub-100% attack being survived**.
- What actually gates a carry is: (a) meeting the **Force requirement** so you are not at
  5–10% damage (§4), (b) hitting the **5% damage contribution** (§2.2), and (c)
  **mechanics knowledge** — dodging is the survival mechanism, not HP.

Additional hard gates that matter for carries: bosses at Normal Seren and above impose a
**10-second consumable cooldown**, and 5-tier-and-above bosses seal or cooldown consumables
and hide boss HP in-client. Source: <https://namu.wiki/w/메이플스토리/보스%20몬스터/보스%20티어>

### 2.4 Published stat/CP charts — and where they disagree

**Source A — Games Finder** (updated 2026-08-15), the most complete current chart.
Columns are the author's own: Main Stat, *effective* IED %, Combat Power.
<https://gameslikefinder.com/article/maplestory-boss-ranges-guide/>

| Boss | Main Stat | Eff. IED | CP |
|---|---|---|---|
| Zakum (Normal) | any | any | 3k |
| Hilla (Normal) / Magnus (Easy) / Von Leon (Easy) | 3k | any | 50k |
| Horntail / Ranmaru / CRA (Normal) / Pink Bean (Normal) | 4k | any | 100k |
| Horntail (Chaos) / Von Leon (Normal) | 5k | any | 250k |
| Arkarium (Easy) / Gollux (Normal) / Ranmaru (Hard) | 6k | any | 600k |
| Von Leon (Hard) / Arkarium (Normal) / Magnus (Normal) / Papulatus (Normal) | 7k | any | 800k |
| Cygnus (Easy) | 7k | any | 800k |
| Hilla (Hard) | 8k | 85 | 1M |
| Pink Bean (Chaos) / Cygnus (Normal) / Zakum (Chaos) / Pierre (Chaos) / Von Bon (Chaos) / Crimson Queen (Chaos) | 10k | 85 | 1.5M |
| Vellum (Chaos) | 11k | 90 | 2.5M (1M party) |
| Magnus (Hard) | 11k | 85 | 2M |
| Princess No | 10k | 93 | 1.5M |
| Papulatus (Chaos) | 13k | 90 | 3M |
| Akechi Mitsuhide | 13k | 93 | 3M |
| Lotus (Normal) | 16k | 93 | 3.5M (1.5M party) |
| Damien (Normal) | 19k | 93 | 4M (1.5M party) |
| Guardian Angel Slime (Normal) | 22k | 93 | 8M |
| Lucid (Easy) | 22k | 93 | 9M |
| Will (Easy) | 22k | 93 | 10M |
| Lucid / Will (Normal) | 24k | 93 | 18M |
| Gloom (N) / Darknell (N) / Lotus (Hard) | 26k | 95 | 23M |
| Damien (Hard) | 28k | 95 | 26M |
| Lucid (Hard) / Will (Hard) | 32k | 95 | 50M |
| Gloom (Chaos) | 33k | 95 | 55M |
| Guardian Angel Slime (Chaos) | 35k | 95 | 60M |
| Darknell (Hard) | 38k | 95 | 60M |
| Verus Hilla (Normal / Hard) | 40k | 95 | 70M |
| Black Mage (Hard) | 40k | 96 | 60M **party** |
| Chosen Seren (Normal) | 45k | 96 | 80M |
| Kalos (Easy) | 45k | 96 | 85M **party** |
| First Adversary (Easy) | 45k | 96 | 90M **party** |
| Chosen Seren (Hard) | 50k | 96 | 95M **party** |

The author **explicitly declines to publish a Gold tier** (Kaling and above):

> "For gold rated bosses your guild or alliance will have their own thresholds for joining
> parties. Soloing even the first gold star boss (Easy Kaling) requires ~220M solo Combat
> Power or ~100M party which most MapleStory players won't reach at this point in time."

**Source B — Vortex Gaming** ("2026"), a KMS-derived chart (it uses KMS boss names:
Suu / Dusk / Dunkel / Jin Hilla for Damien / Gloom / Darknell / Verus Hilla).
<https://vortexgaming.io/en/postdetail/648860>

| CP | Bosses unlocked |
|---|---|
| 1M | Normal dailies, Normal Cygnus, Chaos Zakum |
| 3M | Chaos Root Abyss (recommended post-6th-job) |
| 5M | Chaos Papulatus |
| 7–10M | N Damien, N Gloom, N Darknell, N GAS (8M+ post-6th-job), Easy Lucid, Easy Will |
| 15–20M | Hard Damien (20M "if skill is lacking") |
| 20–25M | Normal Lucid, Normal Will |
| 30–40M | Normal Verus Hilla (40M first-timers), Hard Lucid, Hard Will, Chaos Gloom, Chaos GAS |
| 50M | Hard Verus Hilla |
| 80–160M+ | Normal Seren; 160–200M for Hard Seren |
| 100M+ | Kalos variants, Kaling (Easy/Normal) |

Above ~100M CP, "hand stats" (mechanical skill) become the binding constraint.

**Where they disagree — do not average these:**

| Boss | Games Finder | Vortex | Gap |
|---|---|---|---|
| Chaos Papulatus | 3M | 5M | Vortex +67% |
| Hard Damien | 26M | 15–20M | GF higher |
| Verus Hilla (Hard) | 70M | 50M | GF +40% |
| **Chosen Seren (Hard)** | **95M party** | **160–200M** | **Vortex ~2×** |

The Seren gap is the largest and traces directly to **solo-vs-party labelling**: Games
Finder's figure is explicitly a party number, Vortex's appears to be solo. **A tracker must
carry a `solo | party` flag on every such figure or it will produce nonsense.**

### 2.5 Methodologies the community uses, ranked by rigor

**A. DPS-from-clear-time (the correct method).** Take boss HP, divide by the target clear
time, get required DPS. E.g. Chaos Vellum at 200B HP over 20 minutes → "you'll need to deal
minimum 170M/s+". Normal Will → "around a minimum of 10 minutes to clear".
<https://forums.maplestory.nexon.net/discussion/33633/recommended-attack-range-for-bosses>

**B. Combat Power as a single scalar.** See §3 — this is what Nexon itself uses for
balance, and it is now an enforced in-game gate. Its weakness is that it "does not include
every source of damage" (notably Boost Node and hyper-stat interactions), which is why
equal-CP characters clear differently.

**C. Main stat + effective IED pair.** The widely repeated rule of thumb is **10k main stat
+ 90%+ effective IED + Lv.25 trio nodes to solo CRA**. Note that **effective (true) IED
differs from the stat-window number** — displayed IED overstates true IED because IED
stacks multiplicatively (§5.2). This is a real trap.

**D. Dojo floor as a proxy** — the older method: Lotus (N) → 36F, Lotus (H) / Damien (H) →
47F, Lucid (N) → 44F, Lucid (H) → 49F.
<https://nisrockk.wordpress.com/damage-required-to-boss/> — **last updated 2021-06-29 and
outdated**; it predates 6th job, Sol Janus and HEXA stats. Useful only for the methodology
and for one durable observation: **regular servers require roughly half the stated ranges
compared to Reboot/Heroic servers.** No modern chart labels this axis — **your tracker
should carry a server-type flag.**

### 2.6 KMS community calibration anchors

From <https://namu.wiki/w/환산%20주스탯> and
<https://namu.wiki/w/메이플스토리/보스%20몬스터/보스%20티어>:

- Below ~20,000 환산 the metric loses accuracy; newcomers use in-game Combat Power instead.
  20,000–40,000 is transitional.
- **≥ 40,000 환산**: pre-Black-Mage bosses are mostly 딜찍누 (pure damage checks), and
  Normal Seren solos comfortably.
- **"High spec" threshold ≈ 300M Combat Power or 80,000 HEXA 환산.**
- **Convention: a boss "cut" means killing it within 20 minutes.** This is the definition
  behind Korean boss tier multipliers, and a sensible default for a tracker's solo axis.
- namu's editorial convention: bosses needing < 15,000 HEXA 환산 are described by Combat
  Power only; ≥ 45,000 by HEXA 환산.

---

## 3. In-game "recommended combat power" — the real gate (Tier A)

**This is the most valuable finding in this document and it supersedes the blog charts in
§2.4.** Nexon ships an actual per-boss, per-party-size minimum Combat Power requirement,
enforced at the boss entry portal.

### 3.1 How the gate works

> "As of the NEXT Update in ChinaMS, players are required to have sufficient Combat Power
> to enter a Major Boss's map. When entering a Boss as a party, every party member must
> have sufficient Combat Power before entering, and the sum of all party member's Combat
> Power must not be lower than minimum Combat Power. This does not prevent you from
> entering Practice Mode."
> — <https://maplestorywiki.net/w/Combat_Power>

The worked example from the same page:

> "Hard Limbo requires 1,500,000,000 Combat Power in total, and when entering with 3
> players, the minimum Combat Power of each party member cannot be lower than 320,000,000,
> and the sum of Combat Power from all party members cannot be lower than 1,500,000,000.
> If Member 1 has 350,000,000 and Member 2 has 550,000,000, then Member 3 must have at
> least 600,000,000 before entering."

So the check is **two-sided**: an individual floor *and* a party sum. This maps directly
onto the tracker's three axes:

```
can_solo(boss)   = cp >= min_cp_solo(boss)
can_party(boss)  = cp >= min_cp_per_member(boss, party_size)
                   AND sum(party_cp) >= min_cp_solo(boss)
can_be_carried(boss) = cp >= min_cp_per_member(boss, party_size)   # the individual floor
```

The per-member floor is precisely the "blue dot" gate the tracker wants, and it is real
game data rather than folklore.

> **Sourcing caveat.** The wiki labels these values **(CMS)** — the entry restriction
> shipped first in ChinaMS with the NEXT update, and the per-boss pages tag the figures
> accordingly. The *numbers* are client data and are the best available published
> "recommended combat power" per boss; whether GMS currently enforces the gate (as opposed
> to merely displaying a recommendation) was **not confirmed**. Use them as recommendations
> and re-verify enforcement before hard-blocking anything in UI.

### 3.2 Solo (total) minimum Combat Power, all bosses

`Genesis/Destiny` and `Champion` are the Genesis-weapon-liberation and Champion-mode
variants of the same fight.

| Boss | Easy | Normal | Hard/Chaos | Extreme | Genesis/Destiny | Champion |
|---|---|---|---|---|---|---|
| Zakum | 10,000 | 30,000 | 300,000 | N/A | N/A | N/A |
| Horntail | 10,000 | 30,000 | 50,000 | N/A | N/A | N/A |
| Hilla | N/A | 10,000 | 100,000 | N/A | N/A | N/A |
| Pierre | N/A | 50,000 | 300,000 | N/A | N/A | N/A |
| Von Bon | N/A | 50,000 | 300,000 | N/A | N/A | N/A |
| Crimson Queen | N/A | 50,000 | 300,000 | N/A | N/A | N/A |
| Vellum | N/A | 100,000 | 500,000 | N/A | N/A | N/A |
| Von Leon | 10,000 | 30,000 | 50,000 | N/A | N/A | N/A |
| Arkarium | 30,000 | 100,000 | N/A | N/A | N/A | N/A |
| Magnus | 10,000 | 100,000 | 300,000 | N/A | N/A | N/A |
| Pink Bean | N/A | 50,000 | 300,000 | N/A | N/A | N/A |
| Cygnus | 300,000 | 500,000 | N/A | N/A | N/A | N/A |
| Lotus | N/A | 1,500,000 | 5,000,000 | 200,000,000 | 5,000,000 | 5,000,000 |
| Damien | N/A | 2,000,000 | 6,000,000 | N/A | 6,000,000 | N/A |
| Gollux (Old) | N/A | 500,000 | N/A | N/A | N/A | N/A |
| Mori Ranmaru | N/A | 50,000 | 500,000 | N/A | N/A | N/A |
| Princess No | N/A | 300,000 | N/A | N/A | N/A | N/A |
| Lucid | 2,000,000 | 3,500,000 | 18,000,000 | N/A | 18,000,000 | N/A |
| OMNI-CLN | N/A | 10,000 | N/A | N/A | N/A | N/A |
| Papulatus | 10,000 | 100,000 | 800,000 | N/A | N/A | N/A |
| Will | 2,000,000 | 3,500,000 | 20,000,000 | N/A | 20,000,000 | N/A |
| Verus Hilla | N/A | 12,000,000 | 24,000,000 | N/A | 24,000,000 | 24,000,000 |
| Black Mage | N/A | N/A | 50,000,000 | 600,000,000 | N/A | 50,000,000 |
| Giant Monster Gloom | N/A | 3,500,000 | 20,000,000 | N/A | N/A | N/A |
| Guard Captain Darknell | N/A | 4,000,000 | 22,000,000 | N/A | N/A | N/A |
| Chosen Seren | N/A | 50,000,000 | 80,000,000 | 800,000,000 | 300,000,000 | 80,000,000 |
| Guardian Angel Slime | N/A | 2,000,000 | 22,000,000 | N/A | N/A | N/A |
| Kalos the Guardian | 35,000,000 | 120,000,000 | 550,000,000 | 2,500,000,000 | 550,000,000 | 120,000,000 |
| Kaling | 80,000,000 | 280,000,000 | 1,000,000,000 | 5,500,000,000 | 850,000,000 | N/A |
| Limbo | N/A | 550,000,000 | 1,000,000,000 | N/A | N/A | N/A |
| Baldrix | N/A | 700,000,000 | 2,000,000,000 | N/A | N/A | N/A |
| Malitia | N/A | 25,000,000 | N/A | 6,000,000,000 | N/A | N/A |
| First Adversary | 50,000,000 | 150,000,000 | 900,000,000 | 2,500,000,000 | N/A | N/A |
| Kai | N/A | 20,000,000 | 70,000,000 | N/A | N/A | N/A |
| Malefic Star | N/A | 230,000,000 | 1,000,000,000 | N/A | N/A | N/A |
| Jupiter | N/A | 900,000,000 | 4,500,000,000 | N/A | N/A | N/A |

Source: <https://maplestorywiki.net/w/Combat_Power>

### 3.3 Per-party-size minimum Combat Power

The per-boss pages break the requirement down by party size. The scaling is **not** a
simple divide-by-N — it drops much faster, which is exactly why carrying works. Worked
examples:

| Boss | 1p (total) | 2p ea | 3p ea | 4p ea | 5p ea | 6p ea | 6p ÷ 1p |
|---|---|---|---|---|---|---|---|
| Easy Lucid | 2,000,000 | 650,000 | 430,000 | 320,000 | 260,000 | 210,000 | 10.5% |
| Normal Lucid | 3,500,000 | 1,100,000 | 750,000 | 560,000 | 450,000 | 370,000 | 10.6% |
| Hard Lucid | 18,000,000 | 5,800,000 | 3,900,000 | 2,900,000 | 2,300,000 | 1,900,000 | 10.6% |
| Easy Kalos | 35,000,000 | — | — | — | — | 3,700,000 | 10.6% |
| Normal Kalos | 120,000,000 | — | — | — | — | 13,000,000 | 10.8% |
| Chaos Kalos | 550,000,000 | — | — | — | — | 59,000,000 | 10.7% |
| Extreme Kalos | 2,500,000,000 | — | — | — | — | 270,000,000 | 10.8% |
| Easy Kaling | 80,000,000 | — | — | — | — | 8,600,000 | 10.8% |
| Hard Kaling | 1,000,000,000 | — | — | — | — | 100,000,000 | 10.0% |
| Hard Black Mage | 50,000,000 | — | — | — | — | 5,400,000 | 10.8% |
| Extreme Black Mage | 600,000,000 | — | — | — | — | 65,000,000 | 10.8% |

**The regularity is the useful finding.** Across every boss checked the ratios are
essentially constant:

| Party size | Per-member floor as % of solo requirement |
|---|---|
| 1 | 100% |
| 2 | ~32.5% |
| 3 | ~21.5% |
| 4 | ~16% |
| 5 | ~13% |
| 6 | **~10.6%** |

So a serviceable model, pending per-boss verification:

```
min_cp_per_member(boss, n) ≈ min_cp_solo(boss) * {1:1.0, 2:0.325, 3:0.215,
                                                  4:0.16, 5:0.13, 6:0.106}[n]
```

A six-person party member needs roughly **one tenth** the Combat Power a soloist needs —
that is the quantitative shape of "getting carried". For the 1–3 party bosses (Limbo,
Baldrix, Jupiter, Malefic Star, First Adversary, and Extreme Lotus at 1–2) only the first
three columns apply; Hard Limbo's documented 3-player floor of 320,000,000 against a
1,500,000,000 total is 21.3%, matching the table.

Sources: per-boss pages, e.g. <https://maplestorywiki.net/w/Lucid/Monster>,
<https://maplestorywiki.net/w/Kalos/Monster>, <https://maplestorywiki.net/w/Black_Mage/Monster>

> Note: Hard Limbo's total reads **1,500,000,000** in the Combat Power page's worked
> example but **1,000,000,000** in its own table row, and boss-page infobox values for Will
> (Hard) and Gloom (Chaos) read 18M where the summary table says 20M. Prefer the summary
> table in §3.2 and flag these three for re-verification.

### 3.4 The Combat Power formula

Combat Power "represents the character's overall growth, excluding factors that differ
depending on the character's job" — it is deliberately class-agnostic, which is exactly
what a cross-class progression tracker needs.

It is the **product** of these terms, rounded down:

```
CP = floor(
      0.01
    * (current_weapon_constant / highest_possible_weapon_constant)
    * (4 * (main1 + main2 + main3) + secondary1 + secondary2)
    * (1 + pct_damage + pct_boss_damage)
    * ( (1 + final_damage) / Π(1 + final_damage_from_skill_i) )
    * (1.35 + crit_damage)
    * floor( (attack_power
              + floor("bow" base_ATT / weapon base_ATT - 1) * (weapon base_ATT + weapon SF_ATT)
             ) * (1 + pct_ATT) )
)
```

Key details for implementation:

- Magicians use Magic ATT and %Magic ATT throughout.
- **Except for Final Damage, all skill and consumable buffs must be subtracted out** — CP
  is an unbuffed number.
- **Demon Avenger and Xenon** get an additional multiplying constant (value unknown).
- **Zero** excludes secondary-weapon base stats and some bonus stats.
- Multi-weapon jobs use the ratio of current to best weapon constant.
- The "bow" normalisation exists because CP is easiest to compute on bow-scaling weapons
  (Bow Master, Pathfinder, Shadower, Dual Blade, Wind Archer, Mercedes, Kain, Cadena,
  Khali, Hoyoung). Weapon prefix → "bow" base ATT: **Destiny 349, Genesis 318, Arcane 276,
  Absolab 192**.

CP **includes**: base stats, HEXA stats, equipment, Inner Ability, Hyper Stats, Legion
member/grid bonuses, Legion Artifacts.

Source: <https://maplestorywiki.net/w/Combat_Power>

Nexon uses Combat Power, not DPM, as its own balance yardstick:

> "메이플스토리 운영진이 강함의 척도를 계산할 때, 그리고 밸런스 패치를 할 때는 전투력을
> 공식 척도로 사용하며" — <https://namu.wiki/w/환산%20주스탯>

### 3.5 KMS tooling: MapleScouter and 환산 주스탯

**MapleScouter** (<https://maplescouter.com>, 환산주스탯) is the dominant KMS progression
tool. Opened in 2023, built on the **Nexon Open API**. Its differentiator over in-game
Combat Power is that it weights **6th-job fragment enhancement and HEXA cores** — the
number Koreans mean by "헥환 N만". It always evaluates the **boss item preset**, so
rankings don't move when a ranker swaps to drop/meso gear.

**Method:** multiply out every damage factor into a total damage multiplier, then invert —
solve for the main-stat increment that would produce the same multiplier. Every stat (ATT,
%ATT, %damage, %boss, crit damage, IED) is expressed as a main-stat equivalent.

Published conversion formulas (`A` = total stat term, `b` = stat multiplier,
`f = 1 + total %ATT`, `i` = current IED, `j` = added IED) —
<https://www.fmkorea.com/3259149693>:

| Stat | Main-stat equivalent |
|---|---|
| 1 ATT / Magic ATT | `A / (4be)` |
| 1% ATT | `A / (400bf)` |
| 1% Damage or Boss | `A / (400b × Σ damage%)` |
| 1% Crit Damage | `A / (400b × Σ crit dmg%)` |
| IED | `x = A × (3j(1 − i)) / (4b(3i − 2))` |

The `3` terms in the IED conversion encode the **300% boss defense baseline**. IED is the
messiest conversion precisely because it stacks multiplicatively. All conversions exhibit
diminishing returns as the corresponding total grows.

**No published 환산 → boss lookup table was found.** The Korean convention is the reverse:
boss tier lists publish a **배율 (multiplier)** measured against a fully-HEXA-enhanced
Shadower solo, where **34% marks the party cut and 100% the solo cut**, with a "cut"
defined as a clear within 20 minutes.
<https://namu.wiki/w/메이플스토리/보스%20몬스터/보스%20티어>

---

## 4. Arcane Force and Sacred Force damage modifiers

### 4.0 Terminology — settled

| Concept | KMS | **GMS official** | MSEA | Field |
|---|---|---|---|---|
| Arcane River force | 아케인포스 | **Arcane Power** | Arcane Force | `ARC` (✦) |
| Grandis force | 어센틱포스 (Authentic Force) | **Sacred Power** | Authentic Force | `SAC` / `AUT` (⬢) |
| Symbol item | 어센틱심볼 | **Sacred Symbol** | Authentic Symbol | — |

"Sacred Force" is community shorthand; the in-client GMS stat is **Sacred Power**.
**"Authentic Force" is not a separate system** — it is the KMS/MSEA name for the same
stat, and GMS boss pages render it `SAC / AUT`. Treat `SAC` and `AUT` as one field.
Sources: <https://www.nexon.com/maplestory/general-post/5581> (Nexon America),
<https://maplestorywiki.net/w/Sacred_Symbol>, <https://namu.wiki/w/어센틱포스>

The two systems use **completely different formulas** — Arcane scales on a **ratio**,
Sacred on an **absolute difference**. This is the single most commonly mis-modelled thing
in community tools.

### 4.1 Arcane Power — ratio-based, banded step function

`ratio = your ARC / required ARC`. This is a **step function on bands**, not a continuous
interpolation.

| ARC ratio | Damage **dealt** | Damage **taken** |
|---|---|---|
| 0 – 9 % | 10 % | 280 % |
| 10 – 29 % | 30 % | 240 % |
| 30 – 49 % | 60 % | 180 % |
| 50 – 69 % | 70 % | 160 % |
| 70 – 99 % | 80 % | 140 % |
| **100 – 109 %** | **100 %** | **100 %** |
| 110 – 129 % | 110 % | 80 % |
| 130 – 149 % | 130 % | 40 % |
| ≥ 150 % | **150 %** | **0 % (damage clamped to 1)** |

Source: <https://namu.wiki/w/아케인포스> §8, independently confirmed in English at
<https://docs.maplestoryn.io/msn-101/beginners-guide/character-progression/arcane-symbols>
and cross-checked against <https://maplestorywiki.net/w/Damage_Formula> ("1.5 times the
recommended Arcane Power: 1.5").

This reconciles exactly with the per-boss wiki prose: Lucid (req 360) grants +10% final
damage at 396–467, +30% at 468–539, +50% at 540+ — i.e. the 110% / 130% / 150% bands.
Source: <https://maplestorywiki.net/w/Lucid/Monster>

**Important caveat on the damage-taken column.** The "clamped to 1" behaviour at ≥150% is
documented for Arcane River **field content**. namu lists explicit exceptions that bypass
it: percent-HP-proportional damage, anti-AFK flying monsters, potion-seal, elite monster
poison/black chains, and elite boss attacks. Because **essentially every Arcane-era boss
attack is %HP-based** (§2.3), you should **not** model Arcane overcap as boss damage
immunity. It is a damage-dealt bonus in practice.

ARC comes in increments of 5. Requirement columns are rounded up to the nearest 5; the
rule `ceil(base × ratio / 5) × 5` reproduces every published row.

```
ratio = arc / required_arc
bands = [(1.50,1.50,0.00),(1.30,1.30,0.40),(1.10,1.10,0.80),(1.00,1.00,1.00),
         (0.70,0.80,1.40),(0.50,0.70,1.60),(0.30,0.60,1.80),(0.10,0.30,2.40),(0.00,0.10,2.80)]
for threshold, dealt, taken in bands:
    if ratio >= threshold: return dealt, taken
```

**Max Arcane Power:** Arcane Symbols 1320 + Guild Skill 30 + Hyper Stat 100 + Premium PC
Room Medal 30 = **1480** (1450 without PC room). Source: <https://namu.wiki/w/아케인포스> §2

### 4.2 Sacred Power — absolute difference, surplus counts half

`gap = your SAC − required SAC`.

| Force gap | Damage **dealt** | Damage **taken** |
|---|---|---|
| ≤ −95 | 5 % | 200 % |
| −90 | 10 % | 200 % |
| −80 | 20 % | 200 % |
| −70 | 30 % | 200 % |
| −60 | 40 % | 200 % |
| −50 | 50 % | 150 % |
| −40 | 60 % | 150 % |
| −30 | 70 % | 150 % |
| −20 | 80 % | 150 % |
| −10 | 90 % | 150 % |
| **0** | **100 %** | **100 %** |
| +10 | 105 % | 100 % |
| +20 | 110 % | 100 % |
| +30 | 115 % | 100 % |
| +40 | 120 % | 100 % |
| **≥ +50** | **125 %** | 100 % |

Three structural differences from Arcane, all explicit on the source:

1. **Damage taken never drops below 100%**, no matter how much surplus you carry
   ("어센틱포스는 요구량을 아무리 초과하더라도 받는 피해가 100% 미만으로 줄어들지 않는다").
2. **Surplus counts at half rate** — +10 force gives +5% damage, not +10%
   ("포스가 넉넉하면 초과한 수치의 절반만큼 강해진다"). Capped at +50 surplus.
   The Korean community term for hitting this cap is **포뻥**.
3. Floor is 5% dealt (Arcane's is 10%); ceiling is 125% (Arcane's is 150%).

```
if gap >= 0:
    dealt = min(1.00 + gap / 2 / 100, 1.25)    # surplus at HALF rate, cap +25%
    taken = 1.00
else:
    dealt = max(0.05, 1.00 + gap / 100)        # full rate below, floor 5%
    taken = 1.50 if gap >= -50 else 2.00
```

So the practical targets are: **`R` to function at all, `R + 50` to cap the bonus.**

Sources: <https://namu.wiki/w/어센틱포스> §9; corroborated by
<https://maplestorywiki.net/w/Damage_Formula> ("50 Sacred Power over recommended: 1.25")
and by identical per-boss prose on <https://maplestorywiki.net/w/Kalos/Monster>,
<https://maplestorywiki.net/w/Limbo/Monster>, <https://maplestorywiki.net/w/Jupiter/Monster>,
<https://maplestorywiki.net/w/Chosen_Seren/Monster>, <https://maplestorywiki.net/w/Kaling/Monster>,
<https://maplestorywiki.net/w/Baldrix/Monster>

**Max Sacred Power** comes from symbols only (10 per level, max level 11 each) — there is
**no hyper stat, guild skill or medal source**, unlike Arcane.

> **Do not use** <https://gg-pass.com/en/guide/meso-penalty-part2>. Its Sacred Force table
> claims "110%–120% bonus damage if overcapped by 10%–20%", which contradicts both namu
> (+10 → 105%) and maplestorywiki (+50 → 1.25). It cites no source.

### 4.3 Per-phase force requirements

Most bosses use one requirement for every phase. Three do not:

| Boss | Difficulty | Phase 1 | Phase 2 | Cap-bonus target (P1 / P2) |
|---|---|---|---|---|
| Kalos | Normal | 250 SAC | **300 SAC** | 300 / 350 |
| Kalos | Easy / Chaos / Extreme | 200 / 330 / 440 | same | 250 / 380 / 490 |
| Chosen Seren | Normal, Hard, Extreme | 150 SAC | **200 SAC** | 200 / 250 |
| Verus Hilla | Normal vs Hard | 820 ARC | 900 ARC (Hard) | differs by difficulty, not phase |

Source: <https://maplestorywiki.net/w/Kalos/Monster>,
<https://maplestorywiki.net/w/Chosen_Seren/Monster>,
<https://maplestorywiki.net/w/Hilla/Monster_(Reborn)>

### 4.4 Sacred Symbol bonus (stacks on top of force)

Two bosses grant a large flat bonus for a maxed regional Sacred Symbol:

| Boss | Condition | Bonus |
|---|---|---|
| Chosen Seren | Sacred Symbol: Cernium at level 11 | **+20% damage to Seren** |
| Kalos | Sacred Symbol: Arcus at level 11 | **+20% damage to Kalos** |
| Kaling | Sacred Symbol: Shangri-La at level 11 | **+20% damage to Kaling** (plus +20% final damage to Hard during Destiny Mission) |

Source: <https://maplestorywiki.net/w/Chosen_Seren/Monster>,
<https://maplestorywiki.net/w/Kalos/Monster>, <https://maplestorywiki.net/w/Kaling/Monster>

### 4.5 Complete force requirement reference

| Boss | Difficulty | Type | Req (100%) | Cap-bonus target | Bands / notes |
|---|---|---|---|---|---|
| Lucid | Easy | ARC | 360 | 540 (150% ratio, +50% dmg) | 110% band at 400, 130% band at 470 |
| Lucid | Normal | ARC | 360 | 540 (150% ratio, +50% dmg) | 110% band at 400, 130% band at 470 |
| Lucid | Hard | ARC | 360 | 540 (150% ratio, +50% dmg) | 110% band at 400, 130% band at 470 |
| Will | Easy | ARC | 560 | 840 (150% ratio, +50% dmg) | 110% band at 620, 130% band at 730 |
| Gloom | Normal | ARC | 730 | 1095 (150% ratio, +50% dmg) | 110% band at 805, 130% band at 950 |
| Gloom | Chaos | ARC | 730 | 1095 (150% ratio, +50% dmg) | 110% band at 805, 130% band at 950 |
| Will | Normal | ARC | 760 | 1140 (150% ratio, +50% dmg) | 110% band at 840, 130% band at 990 |
| Will | Hard | ARC | 760 | 1140 (150% ratio, +50% dmg) | 110% band at 840, 130% band at 990 |
| Verus Hilla | Normal | ARC | 820 | 1230 (150% ratio, +50% dmg) | 110% band at 905, 130% band at 1070 |
| Verus Hilla | Hard | ARC | 900 | 1350 (150% ratio, +50% dmg) | 110% band at 990, 130% band at 1170 |
| Black Mage | Hard | ARC | 1320 | 1980 (150% ratio, +50% dmg) | 110% band at 1455, 130% band at 1720 · 150% unreachable; ~110% is the practical cap |
| Black Mage | Extreme | ARC | 1320 | 1980 (150% ratio, +50% dmg) | 110% band at 1455, 130% band at 1720 · 150% unreachable; ~110% is the practical cap |
| Chosen Seren | Normal | SAC | 150 | 200 (+25% dmg) | −10% dmg per 10 below; floor 5% at −100 or worse · **Phase 2 requires 200** (cap 250) |
| Chosen Seren | Hard | SAC | 150 | 200 (+25% dmg) | −10% dmg per 10 below; floor 5% at −100 or worse · **Phase 2 requires 200** (cap 250) |
| Chosen Seren | Extreme | SAC | 150 | 200 (+25% dmg) | −10% dmg per 10 below; floor 5% at −100 or worse · **Phase 2 requires 200** (cap 250) |
| Kalos the Guardian | Easy | SAC | 200 | 250 (+25% dmg) | −10% dmg per 10 below; floor 5% at −100 or worse |
| First Adversary | Easy | SAC | 220 | 270 (+25% dmg) | −10% dmg per 10 below; floor 5% at −100 or worse |
| Kaling | Easy | SAC | 230 | 280 (+25% dmg) | −10% dmg per 10 below; floor 5% at −100 or worse |
| Kalos the Guardian | Normal | SAC | 250 | 300 (+25% dmg) | −10% dmg per 10 below; floor 5% at −100 or worse · **Phase 2 requires 300** (cap 350) |
| First Adversary | Normal | SAC | 320 | 370 (+25% dmg) | −10% dmg per 10 below; floor 5% at −100 or worse |
| Kaling | Normal | SAC | 330 | 380 (+25% dmg) | −10% dmg per 10 below; floor 5% at −100 or worse |
| Kalos the Guardian | Chaos | SAC | 330 | 380 (+25% dmg) | −10% dmg per 10 below; floor 5% at −100 or worse |
| First Adversary | Hard | SAC | 340 | 390 (+25% dmg) | −10% dmg per 10 below; floor 5% at −100 or worse |
| Kaling | Hard | SAC | 350 | 400 (+25% dmg) | −10% dmg per 10 below; floor 5% at −100 or worse |
| Malefic Star | Normal | SAC | 400 | 450 (+25% dmg) | −10% dmg per 10 below; floor 5% at −100 or worse |
| Kalos the Guardian | Extreme | SAC | 440 | 490 (+25% dmg) | −10% dmg per 10 below; floor 5% at −100 or worse |
| First Adversary | Extreme | SAC | 460 | 510 (+25% dmg) | −10% dmg per 10 below; floor 5% at −100 or worse |
| Kaling | Extreme | SAC | 480 | 530 (+25% dmg) | −10% dmg per 10 below; floor 5% at −100 or worse |
| Limbo | Normal | SAC | 500 | 550 (+25% dmg) | −10% dmg per 10 below; floor 5% at −100 or worse |
| Limbo | Hard | SAC | 500 | 550 (+25% dmg) | −10% dmg per 10 below; floor 5% at −100 or worse |
| Malefic Star | Hard | SAC | 550 | 600 (+25% dmg) | −10% dmg per 10 below; floor 5% at −100 or worse |
| Baldrix | Normal | SAC | 700 | 750 (+25% dmg) | −10% dmg per 10 below; floor 5% at −100 or worse |
| Baldrix | Hard | SAC | 700 | 750 (+25% dmg) | −10% dmg per 10 below; floor 5% at −100 or worse |
| Jupiter | Normal | SAC | 810 | 860 (+25% dmg) | −10% dmg per 10 below; floor 5% at −100 or worse |
| Jupiter | Hard | SAC | 810 | 860 (+25% dmg) | −10% dmg per 10 below; floor 5% at −100 or worse |
| Darknell | Normal | SAC | 850 | 900 (+25% dmg) | −10% dmg per 10 below; floor 5% at −100 or worse |
| Darknell | Hard | SAC | 850 | 900 (+25% dmg) | −10% dmg per 10 below; floor 5% at −100 or worse |

---

## 5. Range → DPM → clear time

### 5.1 The full damage formula

```
damage_per_line =
      0.01
    * WeaponConstant
    * StatMultiplier
    * AttackPower                      // MagicATT for magicians
    * DamageMultiplier
    * FinalDamageMultiplier
    * CritDamageMultiplier
    * IgnoreDefenseMultiplier
    * IgnoreElementalResistMultiplier
    * LevelMultiplier
    * MapMultiplier                    // <- Arcane / Sacred force goes HERE
    * SkillMultiplier
    * MasteryMultiplier
```

| Term | Definition |
|---|---|
| `StatMultiplier` | `4 × (main1 + main2 + main3) + sec1 + sec2`; each stat = `floor(base × (1 + %value))`. Base main stat for most jobs = `5 × level + 18`. |
| `AttackPower` | `floor(base × (1 + %ATT))` |
| `DamageMultiplier` | `1 + %Damage + %BossDamage` — **%Damage and %Boss are ADDITIVE with each other** |
| `FinalDamageMultiplier` | `Π(1 + FD_i)` — final damage sources compose **multiplicatively**. Maxed 5th-job Boost Nodes = ×2.2 |
| `CritDamageMultiplier` | `1.35 + %CritDamage` on crit, else 1. The 1.35 is the *average* of a uniform roll between 1.20 and 1.50 |
| `IgnoreDefenseMultiplier` | `1 − (EnemyDefense × (1 − IED))`; if ≤ 0 the hit does 1 damage |
| `IgnoreElementalResistMultiplier` | `0.5 × (1 + %IgnoreElemResist)` for **almost all bosses**; 1 for most mobs |
| `LevelMultiplier` | see below |
| `MapMultiplier` | the Arcane/Sacred/Star Force factor from §4 |
| `MasteryMultiplier` | `0.5 × (1 + %WeaponMastery)`; each hit rolls uniformly between %Mastery and 1 |

**The elemental-resistance term is a ~2× penalty on bosses that is very frequently
forgotten.** With maxed Insight trait it is `0.5 × 1.05 = 0.525`, not 1.

**Level multiplier** — player level relative to monster level:

| Δ (player − monster) | Multiplier |
|---|---|
| ≥ +5 | 1.20 |
| +4 / +3 / +2 / +1 / 0 | 1.18 / 1.16 / 1.14 / 1.12 / 1.10 |
| −1 / −2 / −3 | 1.0584 / 1.007 / 0.9672 |
| −5 / −10 / −20 / −30 | 0.88 / 0.75 / 0.50 / 0.25 |
| ≤ −40 | 0 (hits do 1 damage) |

This is why the `Mob Lv` column in §1.2 matters and not just `Entry Lv`.

Source: <https://maplestorywiki.net/w/Damage_Formula> (paraphrases
<https://strategywiki.org/wiki/MapleStory/Formulas>, which 403s to automated fetches).

### 5.2 IED stacking and effective PDR

```
IED_total   = 1 - Π(1 - IED_i)          # 100% is impossible
defense_mult = max(0, 1 - boss_PDR * (1 - IED_total))
remove_source(ied_with, src) = 1 - ((1 - ied_with) / (1 - src))
```

Each potential line and each of the 4th/Hyper/5th-job passives is a **separate source**.
Typical `boss_PDR` values, matching the §1.2 column: ordinary mobs 0.10, mid bosses 3.00
(300%), current endgame bosses **3.80 (380%)**.

Per namu's boss tier page, **Normal Seren onward every boss is fixed at 380% defense**, and
5-tier-and-above bosses are at minimum 300%. This is visible in §1.2: the PDR column jumps
to 380% at Seren and stays there.

### 5.3 Confirmed in executable form

The most-used Korean DPM simulator, `oleneyl/maplestory_dpm_calc`, implements exactly this
(`dpmModule/kernel/core/modifier.py`) — <https://github.com/oleneyl/maplestory_dpm_calc>:

```python
factor = (
    (1 + 0.0001 * max(0, real_crit) * (self.crit_damage + 35))
    * (1 + 0.01 * (max(self.pdamage + self.boss_pdamage, 0)))
    * (1 + 0.01 * self.pdamage_indep)
)
ignorance = max((100 - armor * (1 - 0.01 * self.armor_ignore)) * 0.01, 0)
return stat * adap * factor * ignorance * 0.01

# IED stacking
self.armor_ignore = 100 - 0.01 * ((100 - self.armor_ignore) * (100 - arg.armor_ignore))
```

This confirms in code that crit is an **expected-value** term
`1 + crit_rate × (0.35 + crit_damage)`, that `%damage` and `%boss` are additive, that final
damage is a separate multiplier, and that IED is `1 − Π(1 − IED_i)`.

### 5.4 Displayed range → boss DPM

The **displayed range** in the stat window is defined as **only**:

```
Range = 0.01 * WeaponConstant * StatMultiplier * ATT * DamageMultiplier * FinalDamageMultiplier
```

with **%Boss / %NormalEnemy subtracted out** of the DamageMultiplier. That is precisely why
calculators re-apply the boss term on top of the displayed range. The practical form a
tracker should use:

```
boss_dmg_per_line =
    range_upper
  * (1 + pct_damage + pct_boss) / (1 + pct_damage)   // re-add boss damage
  * (1 + crit_rate * (0.35 + crit_damage))          // expected-value crit
  * max(0, 1 - boss_pdr * (1 - ied_total))
  * 0.5 * (1 + ignore_elem_resist)                  // ~0.525 with maxed Insight
  * level_multiplier(player_level - mob_level)
  * force_multiplier                                 // §4 Arcane or Sacred
  * skill_pct
  * (1 + mastery) / 2

dpm = boss_dmg_per_line * lines_per_minute            // class/rotation dependent
clear_time_minutes = boss_total_hp / effective_dpm
```

### 5.5 Effective vs listed HP — the correction that matters most

**Raw HP is not sufficient for clear-time estimation.** Several bosses have mechanics that
make effective HP diverge sharply from the listed value, and a naive `HP / DPM` model will
be badly wrong on exactly the bosses players most want to plan for:

| Boss | Effect on effective HP |
|---|---|
| **Chaos Gloom** | takes **90% reduced damage** while its eye is closed |
| **Chaos Guardian Angel Slime** | no force boost applies, permanent **15% damage reduction**, and **recovers 1% HP every 30 s** |
| **Black Mage (Hard & Extreme)** | Arcane boost capped at ~110% (150% unreachable); frequently-refreshed shields; Hard P1 carries +750B per shield |
| **Extreme Lotus** | cannot receive the +20% gimmick final damage nor the +25% Sacred boost; P1 has a shield |
| **Hard Chosen Seren** | **heals by the remaining shield amount** on the dawn→noon transition — a slower fight is strictly worse |
| **First Adversary** | **+20% final damage** while the Order gauge ≥ 800 |
| **Malefic Star** | **+30% final damage** near-permanently under the standard "테토" build |
| **Hard Lucid P3** | hard DPS check: **12.8T damage within 40 seconds** |

Plus, since Dec 2025, a **maxed Sacred Symbol grants +20% damage against its region's
matching boss**: Cernium→Seren, Arcus→Kalos, Odium→First Adversary, Shangri-La→Kaling,
Arteria→Malefic Star, Carcion→Limbo, Tallahart→Baldrix, Gearlock→Jupiter.

```
effective_dpm = dpm_vs_dummy
              * force_multiplier                  // §4
              * (1 + symbol_region_bonus)         // +20% if region-matched symbol maxed
              * uptime_factor                     // downtime, i-frames, phase transitions
              / (1 + boss_damage_reduction)       // Gloom eye, GAS 15%, shields
clear_time = boss_hp / effective_dpm
```

Source: <https://namu.wiki/w/메이플스토리/보스%20몬스터/보스%20티어>,
<https://namu.wiki/w/어센틱포스> §§4.1/5.1/11

### 5.6 The community DPM chart standard: the "8.8 Challenge" (8.8 챌린지)

There is **no official Nexon numeric DPM table** — not in KMS, not in GMS. namu states
Nexon uses in-game Combat Power as its balance yardstick, and every DPM chart in
circulation is community-produced. (Caveat: this is "not found", not "proven nonexistent".)

The current community standard is the **8.8 Challenge**, run by maplescouter.com. Its
canonical rules page (`maplescouter.com/88dpm`) now 404s; the verbatim rules survive at
<https://arca.live/b/maplestory/117326641>. The challenge index is at
<https://maplescouter.com/ko/challenge>.

**Standardised measurement conditions:**

| Condition | Value |
|---|---|
| Character spec | HEXA-converted main stat in **8.7–8.9만 (87,000–89,000)**; item-conversion and hexa-conversion must differ by ≤ 500 |
| Dummy | Training-ground dummy: **Large size, Boss flag, Level 1, infinite HP, 380% defense rate, elemental halving** |
| Duration | ≥ 2 Origin cycles, **≈ 11 min 20 s ± α**; may not fire the last Origin even if off cooldown |
| Buffs | ALL training-ground doping must be used (incl. 세이람 and the 275 chair) |
| Banned | 무공 / 에피네아 souls; pre-stacking special cores at start |
| Allowed | Ark/Illium link stacks pre-built; seed-ring switching except Continuous Ring, but start and end rings must match |
| Rotation | Must be **infinitely repeatable for 30+ minutes**; no dumping stacked skills; same skill may not bookend the measurement |
| Proof | Video, with the stat window shown **before** the run |

Explicit realism guidance in the rules: rotate "as if fighting Black Mage phase 2".

Note the dummy is **Level 1 with 380% defense and elemental halving** — so the level
multiplier is maxed at 1.20 and the two big boss penalties (defense, element) are present.
This makes 8.8 DPM figures a reasonable proxy for endgame boss DPM, but they are **not**
directly comparable to a fight against a level 285 boss, where the level multiplier is
lower for most characters.

Community chart publishers (all unofficial): Inven
(<https://www.inven.co.kr/board/maple/5974/4905635>,
<https://www.inven.co.kr/board/maple/5974/4909311>), FMKorea
(<https://www.fmkorea.com/8264925583>), Arca.live
(<https://arca.live/b/maplestory/132631402>, KMS-vs-GMS comparison at
<https://arca.live/b/maplestory/120199327>), Vortex Gaming
(<https://vortexgaming.io/en/postdetail/500601>).

Simulators and calculators:

| Tool | URL | Note |
|---|---|---|
| `oleneyl/maplestory_dpm_calc` | <https://github.com/oleneyl/maplestory_dpm_calc> | Python skill-graph DPM simulation, 41 of 43 jobs (excludes Demon Avenger, Xenon). The reference implementation. |
| `andrew-eldridge/maplestory-damage-calculator` | <https://github.com/andrew-eldridge/maplestory-damage-calculator> | Self-described as computing damage per line and **estimated run time on benchmark bosses** — closest to a GMS range→clear-time tool. README unreadable (404); formula unverified. |
| `A-S-S-A/maplestory-dpm` | <https://github.com/A-S-S-A/maplestory-dpm> | |
| Arcane Power calculator | <https://codepen.io/pleblord/full/xapqrz> | |
| Symbol planner | <https://maplesymbols.com/> | |
| Boss crystal calculator | <https://github.com/spd789562/Maplestory-Boss-Crystal-Calculator> | GMS dataset at `src/mapping/boss/gms.js` — **last updated Jan 2022, stops at Seren.** Use §1.6 instead. |

---

## 6. Gaps, disagreements and re-verification list

Ranked by how much they would hurt a tracker:

1. **Solo-vs-party labelling is inconsistent across every Tier C source.** This is the root
   cause of the 2× Seren disagreement in §2.4. Every stat/CP figure the tracker ingests
   needs an explicit `solo | party` flag.
2. **Reboot/Heroic vs regular servers.** Only one source addresses it, and it is from 2021,
   claiming regular servers need ~half the stated ranges. Crystal values differ 5×. The
   tracker needs a server-type flag; the damage-requirement side of it is unsourced.
3. **Whether GMS enforces the minimum Combat Power gate** or merely displays it. The wiki
   tags the values `(CMS)`. The numbers are solid; the enforcement claim is not confirmed
   for GMS.
4. **Three internal CP inconsistencies** (§3.3): Hard Limbo 1.5B vs 1.0B, Will (Hard) and
   Gloom (Chaos) 18M vs 20M between boss pages and the summary table.
5. **Jupiter's death-limit values** come only from mapletools.app; the wiki field is blank.
6. **Baldrix time limit** — 30 min on the wiki vs a report of a 20-min OVERDRIVE change
   (2026-06-19) that could not be confirmed live in GMS.
7. **KMS boss HP differs materially from the GMS wiki values.** e.g. namu gives Normal
   Verus Hilla 61.2T where the GMS wiki gives 89.25T, and Hard Black Mage 165.8T vs 472.5T.
   §1.2 uses GMS wiki values throughout. Do not mix the two datasets.
8. **All wiki HP figures carry the caveat "Estimated, may not be 100% accurate."** Level,
   PDR, force, time, party size, entry level, reset and crystal values are direct template
   data and are not estimates.
9. **Gold-tier stat requirements do not exist publicly.** No source publishes solo
   requirements for Kaling and above; the community treats them as guild-negotiated. The
   §3.2 minimum-CP table is the only numeric answer available for these bosses — another
   reason to prefer it over the blog charts.
10. **Arcane Force's sub-requirement penalty on bosses specifically** is documented for
    field content; whether the damage-taken column applies identically to boss attacks was
    not confirmed, and is largely moot because endgame boss attacks are %HP-based.
11. **Sacred Force interpolation granularity** — the published table lists only multiples
    of 10. Since both symbols and requirements move in tens, "linear per point" vs "step per
    10" is untestable; treat the table as authoritative rather than interpolating.

### Sources that did not work

- `reddit.com` — blocked at both fetch and browser layers; the r/Maplestory wiki and
  progression megathreads remain unmined and are the largest untapped vein.
- `grandislibrary.com/contents/bosses` and `/content/bosses` — both 404; the site has no
  per-boss stat pages and no Arcane/Sacred Force table. Its `/content/stat-terms` page is
  useful for stat definitions only.
- `maplestory.fandom.com` — HTTP 402; superseded by maplestorywiki.net.
- `strategywiki.org` — HTTP 403 to automated fetches.
- `maplerhouse.com/guide/boss/boss-overview` — titled "MapleStory Boss HP, Level & Force
  Table" and Nexon-Open-API-backed, but JavaScript-only and returned an empty DOM. **Worth
  retrying with a real headless browser** — it is likely the single best structured source
  for this data.
- `nexon.com/maplestory/news/update/...` patch notes — JS-rendered, not machine-readable.

---

## Appendix A — Korean ↔ GMS boss name mapping

KMS sources (namu.wiki, Inven, maplescouter) use Korean names that often do not
transliterate to the GMS name. This mapping is required to cross-reference any Korean
tier list or DPM chart against the tables above.

| GMS name | KMS (Korean) | Note |
|---|---|---|
| Damien | 데미안 (Demian) | Confirmed numerically: namu 하드 데미안 = 36조 = 36T = GMS Hard Damien |
| Lotus | 스우 (Suu) | Confirmed numerically: namu 하드 스우 = 33조 2850억 = 33.285T = GMS Hard Lotus |
| Gloom | 더스크 (Dusk) | |
| Darknell | 듄켈 (Dunkel) | |
| Verus Hilla | 진 힐라 (Jin Hilla) | |
| Chosen Seren | 선택받은 세렌 | |
| Kalos the Guardian | 감시자 칼로스 | |
| First Adversary | 최초의 대적자 | Odium final boss |
| Kaling | 카링 | |
| Malefic Star | 찬란한 흉성 | Dark Sea final boss |
| Limbo | 림보 | |
| Baldrix | 발드릭스 | |
| Jupiter | 유피테르 | Geardock / Gearlock (기어드락) |
| Bellona | 벨로니아 | **KMS only — not in GMS** |
| Guardian Angel Slime | 가디언 엔젤 슬라임 | |

> **Warning on second-hand KMS name glosses.** English write-ups of Korean charts
> frequently mis-map 스우. One source consulted for §2.4 glossed "Suu" as GMS *Damien*;
> that is wrong — **스우 is Lotus**, confirmed above by matching HP values. Always verify a
> Korean chart's mapping against a known HP or force value before importing its numbers.

## Appendix B — Notes for porting to JSON

Suggested shape, derived from the columns in §1.2:

```jsonc
{
  "id": "lucid_hard",
  "boss": "Lucid",
  "difficulty": "Hard",
  "mob_level": 230,
  "entry_level": 220,
  "hp_total": 117600000000000,
  "hp_phases": [50800000000000, 54000000000000, 12800000000000],
  "hp_estimated": true,              // ALL wiki HP values carry this caveat
  "pdr": 3.00,                       // 300% -> 3.00 for the damage formula
  "force": { "type": "ARC", "required": 360, "cap_bonus_at": 540 },
  "time_limit_min": 30,
  "death_count": 10,
  "party_min": 1, "party_max": 6,
  "reset": "weekly",
  "crystal": { "solo": 100800000, "per_party_size": [100800000, 50400000, 33600000,
                                                     25200000, 20160000, 16800000] },
  "crystal_heroic_multiplier": 5,
  "min_cp": { "solo": 18000000, "per_member": [18000000, 5800000, 3900000,
                                               2900000, 2300000, 1900000] },
  "carry_damage_5pct": 5880000000000  // hp_total * 0.05, computed not stored
}
```

Gotchas:

- **`pdr` should be stored as a decimal factor** (380% → 3.80) because the damage formula
  uses `1 − pdr × (1 − ied)`.
- **`hp_phases` must not be summed blindly** for Pierre, Crimson Queen, Horntail, Seren,
  Limbo, Baldrix, Jupiter and Black Mage — shared HP bars and auto-dying body parts mean
  the sum overcounts. §1.2 already stores corrected totals; §1.3 lists the corrections.
- **`death_count` is not always an integer.** First Adversary, Kaling, Limbo, Baldrix and
  Jupiter use gauge systems (Adversarial Will / Willpower / Erosion / Magic Encroachment /
  Rupture) whose cost per death varies with party size. Model it as a tagged union.
- **`force.type`** is `ARC` or `SAC`; the two use different multiplier formulas (§4.1
  vs §4.2). Do not share a code path.
- Kalos (Normal) and Chosen Seren need **per-phase force requirements**, not one value.
- **`min_cp.per_member`** can be approximated as
  `solo × {1, 0.325, 0.215, 0.16, 0.13, 0.106}[n]` where per-boss data is missing (§3.3).
- Store a **server type** (`heroic | regular`) — it changes crystal payout 5× and,
  per one dated source, damage requirements roughly 2×.
