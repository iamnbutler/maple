# Legion Artifact — exact data module research

**Version:** 1.0 — researched **2026-09-06** (GMS v.271-era live data)
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

