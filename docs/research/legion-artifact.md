# Legion Artifact — exact data module research

**Version:** 1.0 — researched **2026-09-06**, against GMS live data (pre-Overdrive)
**Scope:** everything needed to build a deterministic TypeScript data module for the Legion Artifact system: the per-effect value table, the AP economy, the Artifact Level / EXP table, and the EXP income model.
**Companion:** `docs/research/formulas.md` §4B §2 §8.2 (Legion Artifact summary — superseded in detail by this file).

**Confidence: HIGH.** Every number below is sourced, and the whole model reproduces a live GMS capture (Ren, Artifact Lv39) exactly, to the AP — see §7.

---

## 1. The actual mechanic (this is the part everyone gets wrong)

There are **four** distinct currencies/levels. Keeping them apart is the whole game:

| Thing | What it is | How you get it | Range |
|---|---|---|---|
| **Artifact Level** | Account/world-wide level for the whole system | Spend Artifact EXP | 1 → 60 |
| **Artifact EXP** | Raises Artifact Level | Normal / Boss / Special missions | 0 → 1,342,550 total |
| **Artifact AP** | Raises a **Crystal's grade** | Awarded on Artifact level-up | 0 → 72 lifetime |
| **Artifact Points** | Re-rolls a Crystal's assigned stats, extends Crystal duration, resets AP | Normal + Boss missions (1:1 with EXP) | held, cap 10,100 → 20,000 |

And **three** levels that are easy to confuse:

- **Crystal grade** (in-game "Level", 1 → 5) — a property of one Crystal, bought with **Artifact AP**.
- **Effect level** (the "Lv. N" shown in the Artifact Bonuses panel, 1 → 10) — **derived, not purchased**.
- **Artifact Level** (1 → 60) — the container level.

### The rule that generates the Bonuses panel

Each Crystal has a **grade 1–5** and **3 stat slots**. You pick which stat goes in each slot (no stat twice on the *same* Crystal). Then:

```
effectLevel(stat) = min(10, Σ over crystals carrying `stat` of crystal.grade)
```

> "Similar to how Boost Nodes work in 5th job, the total levels of the stats on the player's crystals will be added up to determine the boost effect for that stat, up to a maximum of level 10."
> — [maplestorywiki.net/w/Legion_Artifact](https://maplestorywiki.net/w/Legion_Artifact)

> "크리스탈 등급 강화뿐만 아니라 각각의 크리스탈에 같은 옵션을 조합해도 능력치 등급을 올릴 수 있다. 능력치의 등급은 최대 10레벨까지 올라간다."
> — [namu.wiki/w/유니온 아티팩트](https://namu.wiki/w/%EC%9C%A0%EB%8B%88%EC%98%A8%20%EC%95%84%ED%8B%B0%ED%8C%A9%ED%8A%B8) (archived: [web.archive.org 2026-07-06](https://web.archive.org/web/20260706160539/https://namu.wiki/w/%EC%9C%A0%EB%8B%88%EC%98%A8%20%EC%95%84%ED%8B%B0%ED%8C%A9%ED%8A%B8))

So the answer to "are the Lv. N lines a per-effect level you allocate into, or an aggregate of crystal lines?" — **an aggregate**. You never spend anything directly on "Boss Damage". You buy Crystal grades with AP and choose which stat sits in each of the 3n slots; the panel then sums grades per stat.

**Consequences that matter for the calculator:**

1. Two max-grade (5) Crystals carrying the same stat = effect level 10 = the cap. That is the *only* way to cap a stat with grade-5 crystals.
2. Because every grade ≤ 5, any stat placed on **≤ 2 crystals** can never overflow the level-10 cap. With n ≤ 9 crystals you have 3n ≤ 27 slots, needing ⌈27/2⌉ = 14 distinct stats ≤ the 16 available — so **a well-formed allocation never wastes a single grade point**. Overflow (e.g. a stat on three grade-4 crystals = 12 → clipped to 10) is a *player mistake*, not a system tax.
3. Therefore the whole system collapses to one scalar budget:

```
effectLevelBudget(artifactLevel) = 3 × Σ(crystal grades)
```
distributed across up to 16 effects, each 0–10, subject to the decomposability constraint (each effect's level must be a sum of grades from distinct crystals) and to ≤ 3n non-zero effects.

4. The number of **lines shown** in the Bonuses panel is the number of *distinct stats used*, **not** the number of crystals × 3. See §7 for why Ren shows 9 lines at Artifact Lv39.

### Crystals: unlock, expiry, defaults

| Artifact Level | Crystals usable | Crystal unlocked |
|---|---|---|
| 1 | 3 | Orange Mushroom, Slime, Horny Mushroom |
| 10 | 4 | Stump |
| 20 | 5 | Stone Golem |
| 30 | 6 | Balrog |
| 40 | 7 | Zakum |
| 50 | 8 | Pink Bean |
| 60 | 9 | Papulatus |

Source: [maplestorywiki.net/w/Legion_Artifact](https://maplestorywiki.net/w/Legion_Artifact) · [namu.wiki/w/유니온 아티팩트](https://web.archive.org/web/20260706160539/https://namu.wiki/w/%EC%9C%A0%EB%8B%88%EC%98%A8%20%EC%95%84%ED%8B%B0%ED%8C%A9%ED%8A%B8)

- Default assigned stats on an un-touched Crystal: **All Stats / Max HP-MP / ATT-MATT**. ([namu.wiki](https://web.archive.org/web/20260706160539/https://namu.wiki/w/%EC%9C%A0%EB%8B%88%EC%98%A8%20%EC%95%84%ED%8B%B0%ED%8C%A9%ED%8A%B8))
- Crystals **expire 30 days** after being obtained. An expired Crystal's bonuses go inactive but the Crystal and its grade are retained; reactivating/extending restores it. AP can still be invested into an expired Crystal. ([maplestorywiki.net](https://maplestorywiki.net/w/Legion_Artifact), [namu.wiki](https://web.archive.org/web/20260706160539/https://namu.wiki/w/%EC%9C%A0%EB%8B%88%EC%98%A8%20%EC%95%84%ED%8B%B0%ED%8C%A9%ED%8A%B8))
- The system is **per world**, not per account. World Leap into a fresh world loses all Normal/Boss mission EXP; Special missions already completed by the character carry over. ([namu.wiki](https://web.archive.org/web/20260706160539/https://namu.wiki/w/%EC%9C%A0%EB%8B%88%EC%98%A8%20%EC%95%84%ED%8B%B0%ED%8C%A9%ED%8A%B8), [maplestorywiki.net](https://maplestorywiki.net/w/Legion_Artifact))

---

## 2. Per-effect-level value table (THE table)

This is the gap the task was opened for. The generating rule for every effect comes from namu.wiki's footnotes [2]–[17] on the Artifact skill entries; the level-10 endpoints are independently confirmed by MapleStory Wiki and by Korean community summaries.

| Effect | Lv1 | Lv2 | Lv3 | Lv4 | Lv5 | Lv6 | Lv7 | Lv8 | Lv9 | Lv10 | Per-level rule |
|---|---|---|---|---|---|---|---|---|---|---|---|
| All Stats | 15 | 30 | 45 | 60 | 75 | 90 | 105 | 120 | 135 | 150 | +15 / level |
| Max HP & Max MP | 750 | 1500 | 2250 | 3000 | 3750 | 4500 | 5250 | 6000 | 6750 | 7500 | +750 / level |
| ATT & MATT | 3 | 6 | 9 | 12 | 15 | 18 | 21 | 24 | 27 | 30 | +3 / level |
| Damage % | 1.5 | 3 | 4.5 | 6 | 7.5 | 9 | 10.5 | 12 | 13.5 | 15 | +1.50%p / level |
| Boss Damage % | 1.5 | 3 | 4.5 | 6 | 7.5 | 9 | 10.5 | 12 | 13.5 | 15 | +1.50%p / level |
| Ignore Enemy DEF % | 2 | 4 | 6 | 8 | 10 | 12 | 14 | 16 | 18 | 20 | +2%p / level |
| Buff Duration % | 2 | 4 | 6 | 8 | 10 | 12 | 14 | 16 | 18 | 20 | +2%p / level |
| Cooldown Skip Chance % | 0.75 | 1.5 | 2.25 | 3 | 3.75 | 4.5 | 5.25 | 6 | 6.75 | 7.5 | +0.75%p / level |
| Mesos Obtained % | 1 | 2 | 3 | 4 | 6 | 7 | 8 | 9 | 10 | 12 | +1%p / level, +2%p at Lv5 & Lv10 |
| Item Drop Rate % | 1 | 2 | 3 | 4 | 6 | 7 | 8 | 9 | 10 | 12 | +1%p / level, +2%p at Lv5 & Lv10 |
| Critical Rate % | 2 | 4 | 6 | 8 | 10 | 12 | 14 | 16 | 18 | 20 | +2%p / level |
| Critical Damage % | 0.4 | 0.8 | 1.2 | 1.6 | 2 | 2.4 | 2.8 | 3.2 | 3.6 | 4 | +0.40%p / level |
| EXP Obtained % (+1 AoE target) | 1 | 2 | 3 | 4 | 6 | 7 | 8 | 9 | 10 | 12 | +1%p / level, +2%p at Lv5 & Lv10 |
| Status Resistance | 1 | 2 | 3 | 4 | 6 | 7 | 8 | 9 | 10 | 12 | +1 / level, +2 at Lv5 & Lv10 |
| Summon Duration % | 2 | 4 | 6 | 8 | 10 | 12 | 14 | 16 | 18 | 20 | +2%p / level |
| Final Attack Skill Damage % | 3 | 6 | 9 | 12 | 15 | 18 | 21 | 24 | 27 | 30 | +3%p / level |

Sources for the generating rules (namu.wiki footnotes, verbatim):
`[2] 레벨당 15씩 증가` · `[3] 레벨당 750씩 증가` · `[4] 레벨당 3씩 증가` · `[5] 레벨당 1.50%씩 증가` · `[6] 레벨당 1.50%씩 증가` · `[7] 레벨당 2%p씩 증가` · `[8] 레벨당 2%씩 증가` · `[9] 레벨당 0.75%씩 증가` · `[10] 레벨당 1%씩 증가. 단, 5레벨과 10레벨에는 2%씩 증가.` · `[11]` 동일 · `[12] 레벨당 2%씩 증가` · `[13] 레벨당 0.40%씩 증가` · `[14] 레벨당 1%씩 증가. 단, 5레벨과 10레벨에는 2%씩 증가.` · `[15] 레벨당 1씩 증가. 단, 5레벨과 10레벨에는 2씩 증가.` · `[16] 레벨당 2%씩 증가` · `[17] 레벨당 3%씩 증가`

Source: [namu.wiki/w/유니온 아티팩트 §5 아티팩트 능력치](https://web.archive.org/web/20260706160539/https://namu.wiki/w/%EC%9C%A0%EB%8B%88%EC%98%A8%20%EC%95%84%ED%8B%B0%ED%8C%A9%ED%8A%B8) · Lv10 endpoints cross-checked at [maplestorywiki.net/w/Legion_Artifact](https://maplestorywiki.net/w/Legion_Artifact) and [digitaltq.com/maplestory-legion-artifact-guide](https://www.digitaltq.com/maplestory-legion-artifact-guide)

### Why Lv9 is not a fixed fraction of Lv10

Thirteen of the sixteen effects are **strictly linear**: `value(L) = L × step`, so Lv9 = 0.9 × Lv10.

Three-and-a-bit effects are **not**: **Mesos Obtained, Item Drop Rate, EXP Obtained, Status Resistance** all use `+1 per level, except +2 at level 5 and at level 10`. Their curve is `1, 2, 3, 4, 6, 7, 8, 9, 10, 12` — Lv9 = 10 (not 10.8), Lv10 = 12. Level 5 and level 10 are deliberate "milestone" bumps, which is also why grade-5 crystals feel disproportionately good for farming stats.

(Numerically this happens to coincide with `floor(1.2 × L)`, but do **not** implement it that way — the game's rule is the step table, and a future value change would break the coincidence. Hardcode the array.)

### Effect notes

- **EXP Obtained** additionally grants **+1 max target for multi-target skills** at **any** level ≥ 1 — the target bonus does *not* scale. It is worth 1 point of budget for a lot of mobbing classes. ("추가 경험치의 경우 1레벨만 투자되어 있어도 스킬 마릿수 1 증가 옵션이 달려있는 것도 눈여겨볼 만한 요소이다." — [namu.wiki](https://web.archive.org/web/20260706160539/https://namu.wiki/w/%EC%9C%A0%EB%8B%88%EC%98%A8%20%EC%95%84%ED%8B%B0%ED%8C%A9%ED%8A%B8))
- **Ignore Enemy DEF** is stated as `%p` per level, i.e. the *displayed* number rises linearly 2 → 20. As always (formulas.md §1.8) the 20% must still be composed **multiplicatively** with your other IED sources, not added.
- **Max HP and Max MP** are one effect granting both (+750 each per level).
- **ATT and MATT** are one effect granting both (+3 each per level).
- **All Stats** is +15/level to STR/DEX/INT/LUK (and counts as the Demon Avenger HP substitute discussion in namu's priority section).
- **Final Attack Skill Damage** applies only to the class-specific skill list on [maplestorywiki.net/w/Legion_Artifact](https://maplestorywiki.net/w/Legion_Artifact) (Hero/Paladin/DrK Final Attack, F/P Meteor Shower passive, I/L Blizzard passive, Bishop HEXA Genesis passive, BM/MM Final Attack, Dual Blade Blade Clone, Buccaneer Nautilus Strike passive, Corsair Majestic Presence, Aran/Mercedes/Wild Hunter/Mihile Final Attack, Evan Dragon Spark, Demon Avenger Infernal Exceed, Battle Mage Dark Genesis passive, Blaster Revolving Cannon Mastery, **Ren: Second Imugi Spirit Sword: Serpent's Fang**).

---

## 3. The Artifact AP economy (cost per crystal grade)

AP is spent **per Crystal grade**, never per effect level. There is no per-effect cost.

| Crystal grade | AP to reach from previous | Cumulative AP |
|---|---|---|
| 1 | — (free, crystals start at grade 1) | 0 |
| 2 | 1 | 1 |
| 3 | 2 | 3 |
| 4 | 2 | 5 |
| 5 (max) | 3 | 8 |

Source: [namu.wiki/w/유니온 아티팩트 §3.2](https://web.archive.org/web/20260706160539/https://namu.wiki/w/%EC%9C%A0%EB%8B%88%EC%98%A8%20%EC%95%84%ED%8B%B0%ED%8C%A9%ED%8A%B8) · [digitaltq.com](https://www.digitaltq.com/maplestory-legion-artifact-guide) ("to max out a Crystal, it costs a total of 8 AP")

**AP income:** `+1 AP per Artifact level, +1 extra every 5th level`, i.e.

```
cumulativeAP(L) = L + floor(L / 5)
```

Source: `"레벨 업 시 1의 아티팩트 AP를 획득하며 5레벨 당 1을 추가로 획득할 수 있다."` — [namu.wiki §3.1](https://web.archive.org/web/20260706160539/https://namu.wiki/w/%EC%9C%A0%EB%8B%88%EC%98%A8%20%EC%95%84%ED%8B%B0%ED%8C%A9%ED%8A%B8); per-level AP column also tabulated at [maplestorywiki.net/w/Legion_Artifact](https://maplestorywiki.net/w/Legion_Artifact)

Checks: `cumulativeAP(60) = 60 + 12 = 72 = 9 crystals × 8 AP` — exactly enough to max all 9 Crystals, as the wiki states. `cumulativeAP(14) = 16`, matching the Korean guide note that *"총 16개의 아티팩트 AP가 확보되어 5등급 크리스탈 두 개를 구성할 수 있는 14레벨 구간"* ([arca.live/b/maplestory/94401849](https://arca.live/b/maplestory/94401849), via search snippet).

**AP-bound vs slot-bound:** you can max *every Crystal you own* only at Artifact Level **47–49** and **54+** (below that, AP runs out before the slots do; at 50–53 the newly unlocked 8th Crystal outruns your AP again). Source: `"아티팩트 레벨이 47 이상 49 이하, 또는 54레벨 이상이면 보유한 아티팩트 크리스탈의 등급을 모두 최대로 올릴 수 있다."` — [namu.wiki §3.2](https://web.archive.org/web/20260706160539/https://namu.wiki/w/%EC%9C%A0%EB%8B%88%EC%98%A8%20%EC%95%84%ED%8B%B0%ED%8C%A9%ED%8A%B8). Reproduced exactly by the model in §4.

---

## 4. Artifact Level table — EXP, AP, Points, and derived budget

`EXP to next` = EXP needed to go from this level to the next. `Total EXP to reach` = cumulative EXP required to *be* at this level. `Cum. AP`, `Max Σ grades` and `Max effect-level budget` are **derived** by this document (greedy allocation over the 1/2/2/3 marginal cost curve, which is optimal because per-crystal marginal costs are non-decreasing).

| Lv | EXP to next | Total EXP to reach | AP gained | Max Points | Crystals | Cum. AP | Max Σ grades | Max effect-level budget |
|---|---|---|---|---|---|---|---|---|
| 1 | 2,500 | 0 | 1 | 10,100 | 3 | 1 | 4 | 12 |
| 2 | 2,550 | 2,500 | 1 | 10,200 | 3 | 2 | 5 | 15 |
| 3 | 2,600 | 5,050 | 1 | 10,300 | 3 | 3 | 6 | 18 |
| 4 | 2,650 | 7,650 | 1 | 10,400 | 3 | 4 | 6 | 18 |
| 5 | 2,700 | 10,300 | 2 | 10,500 | 3 | 6 | 7 | 21 |
| 6 | 2,750 | 13,000 | 1 | 10,600 | 3 | 7 | 8 | 24 |
| 7 | 2,800 | 15,750 | 1 | 10,700 | 3 | 8 | 8 | 24 |
| 8 | 2,850 | 18,550 | 1 | 10,800 | 3 | 9 | 9 | 27 |
| 9 | 2,900 | 21,400 | 1 | 10,900 | 3 | 10 | 9 | 27 |
| 10 | 2,950 | 24,300 | 2 | 11,000 | 4 | 12 | 12 | 36 |
| 11 | 3,000 | 27,250 | 1 | 11,100 | 4 | 13 | 12 | 36 |
| 12 | 3,050 | 30,250 | 1 | 11,200 | 4 | 14 | 13 | 39 |
| 13 | 3,100 | 33,300 | 1 | 11,300 | 4 | 15 | 13 | 39 |
| 14 | 3,150 | 36,400 | 1 | 11,400 | 4 | 16 | 14 | 42 |
| 15 | 3,200 | 39,550 | 2 | 11,500 | 4 | 18 | 15 | 45 |
| 16 | 3,250 | 42,750 | 1 | 11,600 | 4 | 19 | 15 | 45 |
| 17 | 3,300 | 46,000 | 1 | 11,700 | 4 | 20 | 16 | 48 |
| 18 | 3,350 | 49,300 | 1 | 11,800 | 4 | 21 | 16 | 48 |
| 19 | 3,400 | 52,650 | 1 | 11,900 | 4 | 22 | 16 | 48 |
| 20 | 3,450 | 56,050 | 2 | 12,000 | 5 | 24 | 19 | 57 |
| 21 | 3,500 | 59,500 | 1 | 12,100 | 5 | 25 | 20 | 60 |
| 22 | 3,550 | 63,000 | 1 | 12,200 | 5 | 26 | 20 | 60 |
| 23 | 3,600 | 66,550 | 1 | 12,300 | 5 | 27 | 20 | 60 |
| 24 | 3,700 | 70,150 | 1 | 12,400 | 5 | 28 | 21 | 63 |
| 25 | 3,800 | 73,850 | 2 | 12,500 | 5 | 30 | 21 | 63 |
| 26 | 3,900 | 77,650 | 1 | 12,600 | 5 | 31 | 22 | 66 |
| 27 | 4,000 | 81,550 | 1 | 12,700 | 5 | 32 | 22 | 66 |
| 28 | 4,500 | 85,550 | 1 | 12,800 | 5 | 33 | 22 | 66 |
| 29 | 5,000 | 90,050 | 1 | 12,900 | 5 | 34 | 23 | 69 |
| 30 | 5,500 | 95,050 | 2 | 13,000 | 6 | 36 | 26 | 78 |
| 31 | 6,000 | 100,550 | 1 | 13,200 | 6 | 37 | 26 | 78 |
| 32 | 6,500 | 106,550 | 1 | 13,400 | 6 | 38 | 26 | 78 |
| 33 | 7,000 | 113,050 | 1 | 13,600 | 6 | 39 | 27 | 81 |
| 34 | 7,500 | 120,050 | 1 | 13,800 | 6 | 40 | 27 | 81 |
| 35 | 8,000 | 127,550 | 2 | 14,000 | 6 | 42 | 28 | 84 |
| 36 | 8,500 | 135,550 | 1 | 14,200 | 6 | 43 | 28 | 84 |
| 37 | 9,000 | 144,050 | 1 | 14,400 | 6 | 44 | 28 | 84 |
| 38 | 9,500 | 153,050 | 1 | 14,600 | 6 | 45 | 29 | 87 |
| 39 | 10,000 | 162,550 | 1 | 14,800 | 6 | 46 | 29 | 87 |
| 40 | 12,000 | 172,550 | 2 | 15,000 | 7 | 48 | 32 | 96 |
| 41 | 14,000 | 184,550 | 1 | 15,200 | 7 | 49 | 32 | 96 |
| 42 | 16,000 | 198,550 | 1 | 15,400 | 7 | 50 | 33 | 99 |
| 43 | 18,000 | 214,550 | 1 | 15,600 | 7 | 51 | 33 | 99 |
| 44 | 20,000 | 232,550 | 1 | 15,800 | 7 | 52 | 33 | 99 |
| 45 | 22,000 | 252,550 | 2 | 16,000 | 7 | 54 | 34 | 102 |
| 46 | 24,000 | 274,550 | 1 | 16,200 | 7 | 55 | 34 | 102 |
| 47 | 26,000 | 298,550 | 1 | 16,400 | 7 | 56 | 35 | 105 |
| 48 | 28,000 | 324,550 | 1 | 16,600 | 7 | 57 | 35 | 105 |
| 49 | 30,000 | 352,550 | 1 | 16,800 | 7 | 58 | 35 | 105 |
| 50 | 50,000 | 382,550 | 2 | 17,000 | 8 | 60 | 38 | 114 |
| 51 | 55,000 | 432,550 | 1 | 17,300 | 8 | 61 | 39 | 117 |
| 52 | 60,000 | 487,550 | 1 | 17,600 | 8 | 62 | 39 | 117 |
| 53 | 65,000 | 547,550 | 1 | 17,900 | 8 | 63 | 39 | 117 |
| 54 | 70,000 | 612,550 | 1 | 18,200 | 8 | 64 | 40 | 120 |
| 55 | 100,000 | 682,550 | 2 | 18,500 | 8 | 66 | 40 | 120 |
| 56 | 110,000 | 782,550 | 1 | 18,800 | 8 | 67 | 40 | 120 |
| 57 | 120,000 | 892,550 | 1 | 19,100 | 8 | 68 | 40 | 120 |
| 58 | 130,000 | 1,012,550 | 1 | 19,400 | 8 | 69 | 40 | 120 |
| 59 | 200,000 | 1,142,550 | 1 | 19,700 | 8 | 70 | 40 | 120 |
| 60 | - | 1,342,550 | 2 | 20,000 | 9 | 72 | 45 | 135 |

Source (columns 1–5): [maplestorywiki.net/w/Legion_Artifact — Artifact EXP Table](https://maplestorywiki.net/w/Legion_Artifact), independently corroborated for Lv1–41 by the Korean summary table at [inven.co.kr/board/maple/2304/36744](https://www.inven.co.kr/board/maple/2304/36744) (image `i15207924246.jpg`, columns 레벨 / 필요 경험치 / 누적 경험치 / 획득 AP). Note the Inven table's 누적 column is offset by one row from the wiki's (it lists cumulative EXP *through* that level, the wiki lists cumulative EXP *to reach* it); the underlying per-level requirements are identical.

**Closed forms for the Max Points column** (verified against all 60 rows):

```
maxPoints(L) = 10,100 + 100 * (L - 1)            for  1 <= L <= 30      // 13,000 at L30
             = 13,000 + 200 * (L - 30)           for 30 <  L <= 50      // 17,000 at L50
             = 17,000 + 300 * (L - 50)           for 50 <  L <= 60      // 20,000 at L60
```

**Total EXP to max = 1,342,550.** Max Artifact Points held at Lv60 = **20,000**.

---

## 5. What Artifact Points buy

| Action | Cost | Source |
|---|---|---|
| Change the 3 stats assigned to one Crystal | **500 points** | [namu.wiki §3.2](https://web.archive.org/web/20260706160539/https://namu.wiki/w/%EC%9C%A0%EB%8B%88%EC%98%A8%20%EC%95%84%ED%8B%B0%ED%8C%A9%ED%8A%B8) ("아티팩트 포인트 500개를 소비하여 옵션을 변경할 수 있다") · [digitaltq.com](https://www.digitaltq.com/maplestory-legion-artifact-guide) |
| Reactivate / extend one Crystal for a full 30 days | **1,000 points** per Crystal — **CONFLICT**, see below | [namu.wiki §3.2](https://web.archive.org/web/20260706160539/https://namu.wiki/w/%EC%9C%A0%EB%8B%88%EC%98%A8%20%EC%95%84%ED%8B%B0%ED%8C%A9%ED%8A%B8) |
| Extend duration (as observed in GMS UI) | **470 points** — **CONFLICT** | [digitaltq.com](https://www.digitaltq.com/maplestory-legion-artifact-guide) |
| Reset all assigned Artifact AP | **500 points** | [digitaltq.com](https://www.digitaltq.com/maplestory-legion-artifact-guide); the wiki confirms Points are used "to reset all assigned Artifact AP" without stating the number ([maplestorywiki.net](https://maplestorywiki.net/w/Legion_Artifact)) |

**CONFLICT resolution (partial):** namu.wiki says the extension cost is **pro-rated**: *"유효기간이 만료된 크리스탈은 개당 1,000 아티팩트 포인트를 사용하면 30일 동안 이용할 수 있다. … 이때, 소모되는 아티팩트 포인트는 연장된 기간에 비례하여 사용된다."* — 1,000 points buys a full 30 days on an **already-expired** Crystal; extending one that still has time left costs points **proportional to the days actually added**. digitaltq's 470 is consistent with a Crystal that had ~16 days left (1000 × 14/30 ≈ 467). So the model is `extendCost = 1000 × (daysAdded / 30)`, rounded — but the **exact rounding rule is UNVERIFIED**.

**Budget sanity for the calculator:** a fully-built Lv60 account with 9 Crystals pays ~9,000 points / 30 days just to keep the Crystals alive (≈ 2,100 points/week). Weekly point income is EXP-identical (§6): 2,000 normal + top-3 boss. A player clearing top-tier bosses (12,500/wk) is comfortably positive; a player clearing ~2,000/wk of bosses is roughly break-even and cannot afford frequent stat re-rolls.

---

## 6. Artifact EXP income — pricing an upgrade in real days

**Artifact EXP and Artifact Points are awarded 1:1 by Normal and Boss missions.** Special missions give **EXP only, no Points**. Both Normal and Boss missions reset **Thursday 12:00 AM** (server time).
Source: [maplestorywiki.net/w/Legion_Artifact](https://maplestorywiki.net/w/Legion_Artifact) and its Normal/Boss/Special mission subpages.

### 6.1 Normal missions — 2,000 EXP + 2,000 Points per week, hard cap

| Mission | EXP | Points |
|---|---|---|
| Hunt 2,000 enemies near your Lv. | 50 | 50 |
| Hunt 5,000 enemies near your Lv. | 150 | 150 |
| Hunt 10,000 enemies near your Lv. | 200 | 200 |
| Hunt 20,000 enemies near your Lv. | 400 | 400 |
| Log in 1× per week | 100 | 100 |
| Log in 2× per week | 200 | 200 |
| Log in 3× per week | 300 | 300 |
| Log in 4× per week | 600 | 600 |
| **Total** | **2,000** | **2,000** |

Source: [maplestorywiki.net/w/Legion_Artifact/Normal_Missions](https://maplestorywiki.net/w/Legion_Artifact/Normal_Missions)

The hunting tiers are cumulative (2k + 5k + 10k + 20k mobs near your level = 800 EXP total for 20,000 kills); logins are cumulative across 4 distinct days = 1,200 EXP. Both are trivially completed by any player doing daily grinding — treat **2,000/week as a floor, not a target**.

**Artifact Booster** doubles Normal-mission EXP; it lasts from use until the 4th Normal-mission cycle and can be extended while active. namu.wiki qualifies this as `일반 월드 기준` (regular-world basis). **Whether an Artifact Booster exists / functions in GMS Heroic is UNVERIFIED** — do not build it into a Heroic-only day estimate without in-game confirmation.
Source: [namu.wiki §4.1](https://web.archive.org/web/20260706160539/https://namu.wiki/w/%EC%9C%A0%EB%8B%88%EC%98%A8%20%EC%95%84%ED%8B%B0%ED%8C%A9%ED%8A%B8)

### 6.2 Boss missions — only the **top 3 by reward value** count each week

> "Only a maximum of 3 Boss Missions can be completed every week. If you complete 3 Boss Missions and then complete another Boss Mission with a higher-ranked reward, you will earn a reward equal to the difference between that and the lowest-rank reward."

Source: [maplestorywiki.net/w/Legion_Artifact/Boss_Missions](https://maplestorywiki.net/w/Legion_Artifact/Boss_Missions)

| Boss | EXP = Points |
|---|---|
| Easy Cygnus | 100 |
| Hard Hilla | 100 |
| Chaos Pink Bean | 100 |
| Normal Cygnus | 150 |
| Chaos Zakum | 150 |
| Normal Princess No | 180 |
| Chaos Pierre | 180 |
| Chaos Von Bon | 180 |
| Chaos Crimson Queen | 180 |
| Hard Magnus | 200 |
| Chaos Vellum | 200 |
| Chaos Papulatus | 200 |
| Normal Akechi Mitsuhide | 250 |
| Normal Lotus | 250 |
| Normal Damien | 250 |
| Normal Guardian Angel Slime | 250 |
| Easy Lucid | 300 |
| Easy Will | 300 |
| Normal Lucid | 400 |
| Normal Will | 400 |
| Normal Gloom | 500 |
| Normal Darknell | 500 |
| Hard Damien | 700 |
| Hard Lotus | 700 |
| Hard Lucid | 800 |
| Hard Will | 800 |
| Normal Verus Hilla | 800 |
| Chaos Guardian Angel Slime | 900 |
| Chaos Gloom | 900 |
| Hard Darknell | 1,000 |
| Hard Verus Hilla | 1,000 |
| Normal Chosen Seren | 1,200 |
| Easy Kalos the Guardian | 1,400 |
| Easy First Adversary | 1,400 |
| Hard Chosen Seren | 1,500 |
| Easy Kaling | 1,500 |
| Normal Kalos the Guardian | 1,800 |
| Normal First Adversary | 1,800 |
| Extreme Lotus | 1,800 |
| Normal Malefic Star | 2,000 |
| Normal Kaling | 2,000 |
| Normal Limbo | 2,500 |
| Chaos Kalos the Guardian | 3,000 |
| Normal Baldrix | 3,000 |
| Hard First Adversary | 3,000 |
| Normal Jupiter | 3,000 |
| Hard Kaling | 3,500 |
| Hard Limbo | 3,500 |
| Hard Malefic Star | 3,500 |
| Extreme Chosen Seren | 3,500 |
| Extreme Kalos the Guardian | 4,000 |
| Hard Baldrix | 4,000 |
| Extreme First Adversary | 4,000 |
| Hard Jupiter | 4,000 |
| Extreme Kaling | 4,500 |

Source: [maplestorywiki.net/w/Legion_Artifact/Boss_Missions](https://maplestorywiki.net/w/Legion_Artifact/Boss_Missions) (GMS list; includes Limbo / Baldrix / Jupiter / Malefic Star). The KMS list at [namu.wiki §4.2](https://web.archive.org/web/20260706160539/https://namu.wiki/w/%EC%9C%A0%EB%8B%88%EC%98%A8%20%EC%95%84%ED%8B%B0%ED%8C%A9%ED%8A%B8) carries identical values under Korean boss names (Bellona = Malefic Star, Yupiter = Jupiter).

**Weekly boss ceiling = 4,500 + 4,000 + 4,000 = 12,500 EXP + 12,500 Points** (Extreme Kaling plus any two of Extreme Kalos / Hard Baldrix / Extreme First Adversary / Hard Jupiter).

### 6.3 Special missions — one-time, per world, EXP only

276 missions totalling **317,140 Artifact EXP** — **23.6% of the entire 1,342,550 needed for Lv60**, obtainable with no weekly gating.

| Section | Missions | EXP |
|---|---|---|
| Legion (rank milestones, 1,000 to 12,000 Legion Level) | 12 | 13,500 |
| Area Questlines (Arcane River / Grandis) | 20 | 10,000 |
| Region Questlines (Maple World) | 32 | 16,000 |
| Job Questlines | 31 | 15,500 |
| Black Heaven | 6 | 3,000 |
| Heroes of Maple | 5 | 2,500 |
| FriendStory | 6 | 3,000 |
| Grand Athenaeum | 7 | 3,500 |
| **Boss First Kill** | **57** | **166,640** |
| Arcane and Sacred Symbols | 14 | 11,000 |
| Liberation | 9 | 8,000 |
| Tower of Oz | 5 | 5,000 |
| Mu Lung Dojo | 10 | 9,000 |
| Medal | 27 | 19,500 |
| Monster Collection | 21 | 23,000 |
| Jump Quest | 8 | 5,000 |
| Epic Dungeon | 3 | 1,500 |
| Zipangu and Sengoku Questlines | 3 | 1,500 |
| **Total** | **276** | **317,140** |

Source: [maplestorywiki.net/w/Legion_Artifact/Special_Missions](https://maplestorywiki.net/w/Legion_Artifact/Special_Missions) (subtotals computed by this document from that page's tables)

Boss First Kill rewards are ~2x the corresponding weekly Boss-mission value (Extreme Kaling: 4,500 weekly / 9,000 first kill). Hard Black Mage (3,000) and Extreme Black Mage (7,000) appear **only** as first-kill missions, never weekly. This makes "clear a boss difficulty you have never cleared" the highest EXP-density action in the whole system for a progressing account.

### 6.4 Days-to-level model

```
weeklyEXP = 2000  (normal missions, effectively guaranteed for any active player)
          + sum of the 3 highest-valued boss missions cleared that week
oneTimeEXP = whatever Special missions remain uncompleted
```

Time from Artifact Lv39 (162,550 EXP) to Lv60 (1,342,550) = **1,180,000 EXP**, ignoring any remaining Special missions:

| Weekly boss clear | Weekly total | Weeks | Days |
|---|---|---|---|
| ExKaling + ExKalos + HJupiter (12,500) | 14,500 | 81 | ~570 |
| HKaling + HLimbo + CKalos (10,000) | 12,000 | 98 | ~688 |
| NLimbo + NKaling + NKalos (6,300) | 8,300 | 142 | ~995 |
| HSeren + EKaling + EKalos (4,400) | 6,400 | 184 | ~1,291 |
| NSeren + HDarknell + HVerusHilla (3,200) | 5,200 | 227 | ~1,588 |

**The Artifact system is a multi-year track even for endgame accounts.** Any "days to payback" figure the calculator produces for an Artifact upgrade should be shown in months, and remaining Special missions should be modelled as a one-time lump that can shortcut whole levels at once.

### 6.5 Marginal EXP cost per effect level — what actually drives ranking

Budget only moves when AP crosses a grade threshold or a Crystal slot unlocks, so EXP-per-effect-level is extremely **lumpy**. Derived from the table in §4:

| Transition | EXP | Delta effect-level budget | EXP per effect level |
|---|---|---|---|
| 9 to 10 | 2,900 | +9 (4th Crystal) | 322 |
| 19 to 20 | 3,400 | +9 (5th Crystal) | 378 |
| 29 to 30 | 5,000 | +9 (6th Crystal) | 556 |
| 39 to 40 | 10,000 | +9 (7th Crystal) | 1,111 |
| 49 to 50 | 30,000 | +9 (8th Crystal) | 3,333 |
| 59 to 60 | 200,000 | +15 (9th Crystal + AP to max all) | 13,333 |
| 41 to 42 | 14,000 | +3 | 4,667 |
| 43 to 44 | 20,000 | +3 | 6,667 |
| 45 to 46 | 24,000 | +3 | 8,000 |
| 50 to 51 | 50,000 | +3 | 16,667 |
| 52 to 53 | 65,000 | +3 | 21,667 |
| **54 to 59** | **530,000** | **+0** | **infinite (dead zone)** |

Two structural facts the calculator must encode:

1. **The x10 levels are cliffs.** Lv39 to Lv40 costs 10,000 EXP (about 5 days of top-tier income) and buys **+9 effect levels**. Nothing else in the table is close.
2. **Artifact Levels 55-59 grant zero stat budget** (530,000 EXP, ~36 weeks at top-tier income, for nothing) — you are only paying the toll to reach Lv60's 9th Crystal. Present 54 to 60 as a single 730,000-EXP step worth +15 effect levels, not as six separate upgrades.

---

## 7. Does this reproduce the captured Ren data?

**Yes — exactly, with zero free parameters.** Captured GMS character Ren, Lv272, Artifact Level **39**, 2026-09-06:

| Panel line | Model value at that effect level | Match |
|---|---|---|
| Lv. 10 Boss Damage: +15.00% | 1.5 x 10 = 15.00 | yes |
| Lv. 10 Ignore Defense: +20% | 2 x 10 = 20 | yes |
| Lv. 10 Buff Duration: +20% | 2 x 10 = 20 | yes |
| Lv. 9 Mesos Obtained: +10% | step table -> 10 (**not** 10.8) | yes |
| Lv. 10 Item Drop Rate: +12% | step table -> 12 | yes |
| Lv. 10 Critical Damage: +4.00% | 0.4 x 10 = 4.00 | yes |
| Lv. 9 EXP Obtained: +10%, Max AoE Targets +1 | step table -> 10; +1 target at any level >= 1 | yes |
| Lv. 10 Summon Duration: +20% | 2 x 10 = 20 | yes |
| Lv. 9 Final Attack Skill Damage: +27% | 3 x 9 = 27 | yes |

The observation in the task brief is confirmed: **Lv10 equals the per-stat "cap" for every effect, because the "cap" *is* the level-10 value.** And Lv9 is not a fixed fraction of Lv10 because four effects (Mesos, Item Drop, EXP, Status Resistance) use the `+2 at Lv5 and Lv10` step curve rather than a linear one.

### The "only 9 lines at Artifact Lv39" question — fully resolved

At Artifact Level 39 the account has **6 Crystals** (3 base + Lv10 + Lv20 + Lv30) = **18 stat slots**, and `cumulativeAP(39) = 39 + 7 = 46 AP`.

Optimal spend of 46 AP across 6 Crystals (marginal costs 1/2/2/3 per crystal):

- 5 Crystals to grade 5 = 5 x 8 = **40 AP**
- 1 Crystal to grade 4 = **5 AP**
- **45 AP spent, 1 AP left over** (the 6th crystal's grade-4-to-5 step costs 3, unaffordable)

Grades = `[5, 5, 5, 5, 5, 4]`, sum of grades = **29**, effect-level budget = 3 x 29 = **87**.

Ren's panel sums to `10+10+10+9+10+10+9+10+9` = **87**. Exact match.

The specific "6 lines at Lv10 + 3 lines at Lv9" shape is *forced* by the slot structure:

- 15 slots on the five grade-5 Crystals, plus 3 slots on the grade-4 Crystal.
- Pair 12 of the grade-5 slots as (5+5) -> **6 stats at level 10**.
- Pair the remaining 3 grade-5 slots with the 3 grade-4 slots as (5+4) -> **3 stats at level 9**.
- 18 slots used, 9 distinct stats, zero waste, only the 1 unusable AP unspent.

**So "6 crystals x 3 lines = 18 lines" is the wrong count.** 18 is the number of *slots*; the panel shows one line per *distinct stat*, and optimal play deliberately doubles every stat up so the line count halves. Ren is at the theoretical maximum for Artifact Level 39 — the allocation is perfect.

### Independent cross-check against namu.wiki's recommended layouts

namu.wiki §6.1 (레벨별 추천 배치) publishes concrete crystal-by-crystal layouts. Re-costing them with this model:

| Artifact Lv | namu's recommendation | AP the model says that costs | `cumulativeAP(L)` | Match |
|---|---|---|---|---|
| 20 | A,B,C at 10; D,E,F at 8 | 16 + 7 = 23 | 24 | yes (1 spare) |
| 30 | A-G at 10; H at 5 | 16 + 16 + 4 = 36 | 36 | exact |
| 40 | A-I at 10; J,K,L at 1 | 6 crystals maxed = 48 | 48 | exact |

Source: [namu.wiki §6.1](https://web.archive.org/web/20260706160539/https://namu.wiki/w/%EC%9C%A0%EB%8B%88%EC%98%A8%20%EC%95%84%ED%8B%B0%ED%8C%A9%ED%8A%B8)

(namu's Lv10 row — A,B,C at 9, D,E,F at 2 — spends only 10 of the 12 available AP and is **sub-optimal**; A,B,C at 10 is affordable. Treat that row as conservatism, not evidence against the AP formula, which the Lv30 and Lv40 rows pin exactly.)

---

## 8. Gaps

| # | Gap | Status |
|---|---|---|
| 1 | **Crystal extension cost.** 1,000 points / 30 days (namu, KMS) vs 470 points observed in GMS (digitaltq). namu states the cost is pro-rated by days added, which explains 470 as a partial extension (1000 x 14/30 = 467) — but the **exact rounding rule, and whether GMS uses the same 1,000-point base, is UNVERIFIED**. | **CONFLICT**, partially resolved |
| 2 | **AP reset cost (500 points)** is sourced only to digitaltq, a third-party guide. maplestorywiki confirms Points are used "to reset all assigned Artifact AP" but not the amount. | **UNVERIFIED** |
| 3 | **Artifact Booster in GMS Heroic.** namu documents it as `일반 월드 기준` (regular-world basis). Whether GMS ships it at all, and whether it functions in Heroic, is unconfirmed. Do **not** model a 2x Normal-mission multiplier for Heroic. | **UNVERIFIED** |
| 4 | **Display precision for the step-curve effects.** The Ren capture shows `+10%` / `+12%` with no decimals while Boss Damage shows `+15.00%`, consistent with an integer step table. The stored value could in principle be `1.2 x L` truncated at display time; every observed value matches the step table either way. Implement the step table. | Low risk |
| 5 | **Artifact Point overflow behaviour.** Max Points held is tabulated (10,100 -> 20,000) but whether over-cap income is discarded or the mission simply holds is **UNVERIFIED**. | **UNVERIFIED** |
| 6 | **No official Nexon source obtained.** maplestory.nexon.com geo-blocks and 302s to an error page; nexon.com/maplestory (GMS) has no equivalent Artifact data page. Everything here rests on maplestorywiki.net + namu.wiki + Korean community sources, which mutually corroborate and independently reproduce the live capture. | Acceptable |
| 7 | **Post-Overdrive risk.** KMS Overdrive (v1.2.416, July 2026) reworked Legion; no source found saying it touches the Artifact system. GMS Overdrive is expected late 2026 (formulas.md §4B §9). This file is versioned to **pre-Overdrive GMS**. | Watch item |
| 8 | **Per-effect-level AP cost does not exist.** The task brief asked for "the Artifact Point cost per level, per effect". There is no such cost — confirmed across all sources. Effect levels are derived from Crystal grades; the only per-effect spend is the flat 500-point stat-reassignment fee. | Resolved (question was mis-premised) |

---

## 9. Implementation notes — what the TypeScript data module should export

Suggested file: `src/data/legionArtifact.ts`.

### 9.1 Effect definitions

```ts
export type ArtifactEffectId =
  | 'allStat' | 'maxHpMp' | 'attMatt' | 'damage' | 'bossDamage' | 'ied'
  | 'buffDuration' | 'cooldownSkip' | 'mesos' | 'itemDrop' | 'critRate'
  | 'critDamage' | 'expObtained' | 'statusResist' | 'summonDuration' | 'finalAttack';

export interface ArtifactEffect {
  id: ArtifactEffectId;
  label: string;
  /** index 0 = effect level 1 ... index 9 = effect level 10. Length exactly 10. */
  values: readonly number[];
  /** 'pct' values are percentage points; 'flat' values are raw stat. */
  kind: 'pct' | 'flat';
  /** which damage input this feeds for the formulas.md §3.1 engine; null = non-combat */
  target: 'statMultiplier' | 'att' | 'dmg' | 'bd' | 'ied' | 'critRate' | 'critDmg' | null;
}
```

Hardcode `values` as literal arrays from §2. **Do not** compute `step * level` — four effects are not linear. A `valueAt(id, level)` helper should return `0` for level 0 and clamp at index 9.

The `expObtained` effect needs a separate non-scaling flag for its `+1 max multi-target hit`, granted at any level >= 1.

### 9.2 Level / AP / EXP tables

```ts
export const ARTIFACT_MAX_LEVEL = 60;
export const ARTIFACT_TOTAL_EXP_TO_MAX = 1_342_550;
export const ARTIFACT_MAX_LIFETIME_AP = 72; // = 9 crystals x 8 AP

export interface ArtifactLevelRow {
  level: number;
  expToNext: number | null;   // null at 60
  totalExpToReach: number;    // cumulative EXP required to BE at this level
  apGained: number;           // 1, or 2 on multiples of 5
  maxPoints: number;
  crystals: number;           // min(9, 3 + floor(level / 10))
}
export const ARTIFACT_LEVELS: readonly ArtifactLevelRow[]; // 60 rows, from §4

export const cumulativeAP = (level: number) => level + Math.floor(level / 5);
export const crystalsAt   = (level: number) => Math.min(9, 3 + Math.floor(level / 10));

/** cumulative AP to bring ONE crystal from grade 1 to grade g; index = grade */
export const CRYSTAL_GRADE_CUM_AP = [0, 0, 1, 3, 5, 8] as const;
/** marginal AP for 1->2, 2->3, 3->4, 4->5 */
export const CRYSTAL_GRADE_MARGINAL_AP = [1, 2, 2, 3] as const;
```

`maxPoints` can also be closed-form (see §4) but tabulating is safer.

### 9.3 The budget function — the load-bearing bit

```ts
/**
 * Maximum total crystal grades affordable at a given artifact level.
 * Greedy over the 1/2/2/3 marginal curve is optimal: per-crystal marginal
 * costs are non-decreasing, so cheapest-first is exchange-argument safe.
 */
export function maxTotalGrades(level: number): number;

/** = 3 * maxTotalGrades(level). The effect levels you can distribute. */
export function effectLevelBudget(level: number): number;
```

Regression-test these values: `budget(10)=36`, `budget(20)=57`, `budget(30)=78`, `budget(39)=87`, `budget(40)=96`, `budget(47)=105`, `budget(50)=114`, `budget(54)=120`, `budget(55..59)=120`, `budget(60)=135`.

### 9.4 Allocation / optimisation

Treat it as: **distribute `effectLevelBudget(L)` points across 16 effects, each 0-10**, maximising modelled damage per formulas.md §3.1. Constraints beyond the budget:

- At most `3 * crystalsAt(L)` effects can be non-zero (each needs at least one slot).
- Each effect's level must be decomposable as a sum of grades from **distinct** crystals in the chosen grade multiset.

A safe simplification: ignore decomposability in the optimiser and enforce only budget + the 10-cap + the slot count, then validate the chosen vector with a small exact packer before showing a plan. §1 consequence 2 proves a zero-waste packing always exists for any n <= 9, so the relaxation is tight in practice.

There is **no per-effect AP cost**. An "upgrade" in this system is always one of:

- **(a) Reassign existing budget** between effects — costs **500 Artifact Points** per Crystal touched, zero EXP, instant. This is the cheap, frequently-correct move (e.g. swap Mesos/EXP into Boss Damage/IED for a boss run) and should be surfaced as a first-class action.
- **(b) Raise Artifact Level** — costs EXP per §4, pays out only at the lumpy boundaries in §6.5.

### 9.5 Income model

```ts
export const NORMAL_MISSION_WEEKLY_EXP = 2000;   // EXP == Points, 1:1
export const BOSS_MISSIONS: readonly { boss: string; exp: number }[]; // exp == points
export const SPECIAL_MISSION_TOTAL_EXP = 317_140;

/** Boss income = sum of the 3 highest exp values among bosses cleared this week. */
export function weeklyArtifactExp(bossesCleared: string[]): number;
```

Also worth exporting: `crystalUpkeepPointsPer30Days(crystals) = 1000 * crystals` (see §5 CONFLICT) so the planner can warn when weekly Point income cannot sustain 9 Crystals plus re-rolls.

### 9.6 Two things the UI should say out loud

1. Artifact Levels **55-59 grant no stat budget at all**. Present 54 -> 60 as one step.
2. Every x10 Artifact Level is worth **+9 effect levels in one jump**; the levels between them are worth +3 or +0. Never present "next Artifact level" as a uniform upgrade.

---

## 10. Corrections to `docs/research/formulas.md` §4B §8.2

- §8.2 says "Each Crystal grants 3 lines of stats and can be levelled to Level 5 with Artifact AP" — correct, but it never says that **effect levels are the SUM of crystal grades across crystals carrying that stat, capped at 10**. That is the single most important mechanic in the system. Add it.
- The "per-stat caps across the whole Artifact system" table in §8.2 is really the **level-10 value** of each effect, not an independent cap. Reframe it as the Lv10 column of the §2 table here.
- "+1 multi-target hit & EXP +12%" — the +1 target is granted at **any** effect level >= 1; only the EXP% scales.
- Add: **max lifetime Artifact AP = 72**, exactly enough for 9 Crystals x 8 AP, which is why Lv60 can max everything.
- Add: crystals **expire after 30 days** and cost Artifact Points to keep alive — a real ongoing cost the model currently ignores.
