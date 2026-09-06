# Per-class DPM anchors for boss-clear-time estimation

Research pass 2026-09-06. Companion to `bosses.md` §5.6 and `kms-tools.md` §2.
Raw dataset: `docs/research/data/yeonmujang-2026-08.csv` (933 records).

---

## TL;DR — verdict

**Yes. Calibration from public data is possible, and much better than expected.**

The decisive find is not the 8.8 Challenge. It is that **KMS shipped an official in-game
DPS-test content called 연무장 (Yeonmujang, "Practice Arena") in the March 2026 "메이플 어택!"
patch**, and its results are exposed through the Nexon Open API. Three independent third-party
sites re-publish that data, and one of them (MapleScouter) additionally publishes each record
**normalised to a reference 헥사환산 주스탯**. Cross-joining two of those sites on character
nickname yields, for 933 real characters across all 48 classes:

> `(class, level, 전투력 combat power, 헥사환산 주스탯, measured DPS, run length)`

— i.e. exactly the `{class, dpm, spec, conditions, date, source}` record the task asked for,
933 times over, on a **standardised, boss-flagged, 380 %-defence, element-halved dummy with
game-supplied buffs** (so doping variance is largely removed by the game itself).

Confidence: **high** for KMS relative class ordering and for the absolute DPS↔spec curve;
**medium** for transferring to GMS (see §6).

Two usable anchor axes, both computable by our engine:

| Axis | What it is | Why it's useful | Caveat |
|---|---|---|---|
| **전투력 (Combat Power)** | In-game number, closed-form formula verified to the digit in `formulas.md` §2.3 | `DPS ≈ k_class × 전투력^α` with **α ≈ 1.14** (median over the 41 classes with ≥ 8 samples; range 1.03–1.30, Buccaneer an outlier at 1.49). Near-linear, so one constant per class gets you most of the way. | 전투력 excludes IED / level / force / links / consumables, so classes with high innate IED or force look better than they are |
| **헥사환산 주스탯** | MapleScouter's proprietary normaliser | Removes the IED/level/force bias; MapleScouter publishes each record renormalised to 환산 9만–14만 using the PCHIP curve already reverse-engineered in `kms-tools.md` §2.1 | No published closed form; we can only consume MapleScouter's output, not recompute it |

Recommendation: **anchor on 전투력**, because our engine can compute it exactly, and use the
환산-normalised table as the cross-check / relative-multiplier source.

---

## 1. The measurement conditions (Tier A — official game data)

### 1.1 연무장 / 천공의 갈림길 — the current standard (KMS, added 2026-03)

Official guide: <https://maplestory.nexon.com/Guide/N23GameInformation/Articles/144565>

| Property | Value | Source |
|---|---|---|
| Content | 천공의 갈림길 → **연마의 전당** (record) / **잔영의 전당** (replay) | Nexon guide |
| Added | KMS **2026-03**, "메이플 어택!" patch | namu.wiki 연무장 (via search snippet — namu is Cloudflare-blocked from this environment) |
| Entry | Level 200+, **전투력 ≥ 3억 (300 M)**, solo only | Nexon guide |
| Dummy | **천공의 수호상** — eagle guardian statue, **boss-flagged, Level 200, infinite HP, 방어율 380 %, 속성 내성 반감 (elemental halving)** | namu.wiki 연무장 (via search snippet) — ⚠ *not directly verified, namu blocked* |
| Duration | **400 s of combat**, preceded by a 300 s prep phase in which buffs are auto-applied; run auto-ends when the required skill-use count is exhausted | Nexon guide |
| Observed run lengths | 333–395 s (median ≈ 338 s) across 1 001 records | computed from MapleScouter data |
| Buffs | Cooldowns reset on entry; charge skills and Soul Weapon souls max out; **연무장 전용 버프** with no cooldown/duration limit; only some items usable | Nexon guide |
| Recorded | total combat time, total damage, **DPS**, skill-use log, battle analysis | Nexon guide |
| Ranking reset | replay records may be wiped, partly or wholly, at each balance patch | namu.wiki (snippet) |

Why this matters: at 380 % defence + elemental halving it carries **the same two big boss
penalties as the 8.8 Challenge dummy**, and a level-295 character vs a level-200 monster is
capped at the same **+5-or-more level coefficient (1.20)** as vs the level-1 8.8 dummy — so the
two standards are directly comparable modulo doping. Crucially, because the *game* supplies the
buffs, 연무장 removes most of the doping variance that made the 8.8 Challenge hard to police.

### 1.2 8.8 Challenge — the previous standard (community, 2024–2025)

Conditions are already recorded in `bosses.md` §5.6. **One correction to that section, established
by this pass:** the "DPM" figures circulated in the 8.8 tables are **not per minute**. They are
**total damage over the 5 min 40 s (340 s) half-run**. Two explicit statements in the source
compilation prove it:

- Bishop: *"재측정 헥88007 비숍 **11분20초 1141조**"* → the table lists Bishop at **571조** = 1141 ÷ 2.
- Hero: *"허수아비 **5분 40초** 헥환 95804 전투분석 : 755조 → 8.80 보정 후 **602조**"*.

So `DPM(조/min) = listed_value × 60 / 340`. Every 8.8 number below has been converted.

### 1.3 Season-3 / RT MapleScouter challenges (for completeness)

| Challenge | Spec gate | Boss / dummy | Window | Endpoint |
|---|---|---|---|---|
| 진캐X환산 챌린지 Season 3 (submissions closed 2026-03-14) | 헥사환산 **103 000 ± 300** | 허수아비 (dummy) + Hard Limbo | dummy: 전투분석 on → **30 min**; Limbo: entry → boss timer 22:00 | `api.maplescouter.com/api/event/challenge-season3/round-1-record` |
| 환산X알티 챌린지 | 헥사환산 **≈ 83 000** | 허수아비 / Extreme Seren / Chaos Kalos / Hard Limbo | 5 min 40 s | `api.maplescouter.com/api/event/rt-challenge/list` |

The RT challenge's `boss1_totalDam` field is in **조 over 340 s**, same convention as the 8.8
tables — e.g. Cadena at 헥사환산 83 174 → 805.37조 / 340 s = 2.37 × 10¹²/s. This independently
reproduces the 연무장 damage scale to within a few percent after 환산 correction, which is what
first confirmed the unit interpretation.

---

## 2. Units — how to read every number in this file

The MapleScouter battle-ranking API returns `dps` in units of **10⁸ (억) per second**. Verified
three ways:

1. The site's own formatter is `format(1e8 * round(dps))` (bundle chunk
   `app/[locale]/(pages)/battle-ranking/page-ed969a7417949271.js`).
2. memujang renders the same character (`먹는게좋아여`, Hero) as **DPS 4조 3599억**; MapleScouter's
   record for that nickname is `dps: 43599`.
3. chuchu.gg renders the same top Hero record as **6조 8937억 6028만 9378** DPS, matching
   MapleScouter's `dps: 68937.6…`.

Therefore, throughout this document:

```
DPS  (damage/second) = dpsN × 1e8
DPM  (damage/minute) = dpsN × 1e8 × 60
1 조 = 1e12,  1 억 = 1e8
```

A "300조/min" class does **3.0 × 10¹⁴ damage per minute**.

Sanity check against `bosses.md` §1.2 HP: Hard Limbo is 12.5Q = 1.25 × 10¹⁶ HP. A 300조/min
character needs 41.7 min of uptime — over the 30 min limit, consistent with MapleScouter's Hard
Limbo boss cut of 헥사환산 120 380 (§`kms-tools.md` 2.4) being well above 110 000.

---

## 3. THE TABLE — per-class DPM at a stated spec

**Source:** MapleScouter 연무장 ranking, `GET https://api.maplescouter.com/api/ranking/battle`
(page: <https://maplescouter.com/ko/battle-ranking>), season `period 4`, records dated
**2026-08-05 → 2026-08-19**, game version **1.2.417**, region **KMS**. 1 001 records, 48 classes.
Confidence: **high** (official in-game data, re-normalised by a well-established third-party tool).

**Spec:** the `DPM @환산 N만` columns are each record renormalised by MapleScouter to
**헥사환산 주스탯 = N × 10 000** using the PCHIP curve documented in `kms-tools.md` §2.1
(verified: predicting `dpsN` from `dps × H(N)/H(hexa)` reproduces the published values with
**1.4 % median error**, so the curve in `kms-tools.md` *is* the normaliser, up to minor revisions).
The per-class figure is the site's own default statistic, **Q3 of the class's trusted records**.
`best single` is that class's single highest record.

**Conditions:** 연무장 dummy — boss-flagged, Lv 200, 380 % PDR, elemental halving, game-supplied
buffs, ~340 s run, solo, no 무공/에피네아 soul (MapleScouter excludes those records), outliers
excluded by the publisher.

`median DPS÷전투력` is computed by this pass from chuchu.gg's full record list (1 005 records) —
the class's median ratio of raw DPS to in-game Combat Power. **This is the column to calibrate
against**, because our engine can compute 전투력 exactly (`formulas.md` §2.3).

| # | Class (GMS) | KR | DPM @환산 9만 | 10만 | **11만** | 12만 | 13만 | best single @11만 | % of top | n | median DPS÷전투력 | % of top | n |
|---:|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | Cadena | 카데나 | 181 | 240 | **330** | 464 | 645 | 348 | 100.0% | 39 | 8,289 | 100.0% | 38 |
| 2 | Khali | 칼리 | 174 | 230 | **314** | 438 | 607 | 325 | 95.0% | 20 | 8,172 | 98.6% | 19 |
| 3 | Xenon | 제논 | 165 | 226 | **311** | 445 | 622 | 320 | 94.3% | 20 | 7,640 | 92.2% | 20 |
| 4 | Kain | 카인 | 171 | 226 | **308** | 434 | 602 | 322 | 93.5% | 21 | 8,129 | 98.1% | 21 |
| 5 | Ark | 아크 | 171 | 226 | **307** | 427 | 590 | 319 | 93.0% | 19 | 8,088 | 97.6% | 19 |
| 6 | Zero | 제로 | 168 | 223 | **306** | 431 | 597 | 321 | 92.8% | 40 | 7,402 | 89.3% | 36 |
| 7 | Blaster | 블래스터 | 166 | 220 | **303** | 428 | 595 | 309 | 91.7% | 20 | 7,564 | 91.3% | 20 |
| 8 | Demon Avenger | 데몬어벤져 | 167 | 219 | **296** | 402 | 548 | 309 | 89.7% | 20 | 6,739 | 81.3% | 20 |
| 9 | Thunder Breaker | 스트라이커 | 163 | 216 | **294** | 413 | 573 | 299 | 89.0% | 7 | 7,813 | 94.3% | 7 |
| 10 | Arch Mage (Fire, Poison) | 아크메이지(불,독) | 159 | 212 | **292** | 411 | 569 | 308 | 88.4% | 26 | 7,015 | 84.6% | 25 |
| 11 | Kinesis | 키네시스 | 160 | 212 | **291** | 406 | 562 | 291 | 88.1% | 5 | 6,947 | 83.8% | 5 |
| 12 | Adele | 아델 | 161 | 212 | **290** | 405 | 558 | 295 | 87.9% | 41 | 7,452 | 89.9% | 38 |
| 13 | Mercedes | 메르세데스 | 162 | 214 | **290** | 406 | 561 | 301 | 87.9% | 31 | 7,320 | 88.3% | 31 |
| 14 | Blaze Wizard | 플레임위자드 | 157 | 208 | **286** | 402 | 557 | 287 | 86.7% | 7 | 7,413 | 89.4% | 7 |
| 15 | Aran | 아란 | 159 | 209 | **286** | 400 | 555 | 292 | 86.5% | 16 | 7,177 | 86.6% | 14 |
| 16 | Luminous | 루미너스 | 156 | 207 | **284** | 401 | 557 | 292 | 86.2% | 16 | 6,999 | 84.4% | 13 |
| 17 | Hoyoung | 호영 | 156 | 207 | **284** | 398 | 552 | 292 | 85.9% | 17 | 7,521 | 90.7% | 16 |
| 18 | Bowmaster | 보우마스터 | 157 | 207 | **282** | 395 | 546 | 289 | 85.5% | 27 | 6,924 | 83.5% | 27 |
| 19 | Evan | 에반 | 156 | 205 | **282** | 393 | 541 | 294 | 85.5% | 31 | 6,610 | 79.7% | 28 |
| 20 | Arch Mage (Ice, Lightning) | 아크메이지(썬,콜) | 156 | 206 | **282** | 394 | 546 | 290 | 85.5% | 27 | 6,261 | 75.5% | 27 |
| 21 | Illium | 일리움 | 156 | 206 | **282** | 387 | 530 | 289 | 85.3% | 13 | 7,097 | 85.6% | 13 |
| 22 | Lara | 라라 | 154 | 203 | **281** | 393 | 544 | 283 | 85.1% | 24 | 7,222 | 87.1% | 22 |
| 23 | Kaiser | 카이저 | 154 | 204 | **280** | 396 | 547 | 281 | 84.9% | 10 | 7,438 | 89.7% | 10 |
| 24 | Lethe | 레테 | 152 | 202 | **280** | 394 | 547 | 287 | 84.8% | 8 | 6,669 | 80.5% | 7 |
| 25 | Night Walker | 나이트워커 | 155 | 205 | **279** | 396 | 552 | 285 | 84.6% | 16 | 7,053 | 85.1% | 16 |
| 26 | Shadower | 섀도어 | 154 | 203 | **279** | 391 | 542 | 282 | 84.5% | 20 | 6,877 | 83.0% | 19 |
| 27 | Hero | 히어로 | 153 | 203 | **278** | 391 | 545 | 281 | 84.2% | 16 | 7,027 | 84.8% | 16 |
| 28 | Dual Blade | 듀얼블레이드 | 153 | 202 | **277** | 389 | 539 | 286 | 83.9% | 44 | 6,062 | 73.1% | 40 |
| 29 | Buccaneer | 바이퍼 | 155 | 204 | **277** | 388 | 538 | 284 | 83.8% | 11 | 6,688 | 80.7% | 11 |
| 30 | Wind Archer | 윈드브레이커 | 153 | 202 | **277** | 390 | 540 | 291 | 83.8% | 24 | 7,086 | 85.5% | 24 |
| 31 | Wild Hunter | 와일드헌터 | 152 | 202 | **276** | 391 | 546 | 281 | 83.7% | 7 | 7,203 | 86.9% | 7 |
| 32 | Angelic Buster | 엔젤릭버스터 | 155 | 203 | **275** | 385 | 532 | 287 | 83.4% | 20 | 7,216 | 87.1% | 19 |
| 33 | Marksman | 신궁 | 151 | 200 | **274** | 386 | 537 | 279 | 83.0% | 8 | 7,133 | 86.1% | 7 |
| 34 | Demon Slayer | 데몬슬레이어 | 150 | 199 | **274** | 386 | 536 | 276 | 82.9% | 11 | 7,064 | 85.2% | 10 |
| 35 | Corsair | 캡틴 | 153 | 202 | **273** | 383 | 530 | 276 | 82.8% | 19 | 6,640 | 80.1% | 20 |
| 36 | Dawn Warrior | 소울마스터 | 150 | 198 | **272** | 380 | 526 | 275 | 82.4% | 21 | 6,951 | 83.9% | 20 |
| 37 | Pathfinder | 패스파인더 | 148 | 197 | **270** | 381 | 533 | 276 | 81.8% | 19 | 7,130 | 86.0% | 18 |
| 38 | Shade | 은월 | 151 | 198 | **270** | 381 | 529 | 273 | 81.8% | 8 | 6,996 | 84.4% | 8 |
| 39 | Dark Knight | 다크나이트 | 148 | 196 | **270** | 380 | 528 | 281 | 81.7% | 16 | 6,767 | 81.6% | 16 |
| 40 | Ren | 렌 | 147 | 195 | **269** | 380 | 530 | 278 | 81.6% | 72 | 6,831 | 82.4% | 46 |
| 41 | Phantom | 팬텀 | 148 | 196 | **268** | 379 | 527 | 278 | 81.3% | 29 | 6,944 | 83.8% | 29 |
| 42 | Night Lord | 나이트로드 | 148 | 196 | **267** | 381 | 533 | 275 | 80.9% | 21 | 6,800 | 82.0% | 20 |
| 43 | Battle Mage | 배틀메이지 | 148 | 195 | **266** | 371 | 511 | 269 | 80.7% | 12 | 6,016 | 72.6% | 12 |
| 44 | Cannoneer | 캐논슈터 | 147 | 194 | **266** | 373 | 519 | 272 | 80.5% | 12 | 6,820 | 82.3% | 12 |
| 45 | Paladin | 팔라딘 | 145 | 192 | **265** | 374 | 522 | 270 | 80.2% | 15 | 6,656 | 80.3% | 15 |
| 46 | Bishop | 비숍 | 145 | 192 | **264** | 368 | 510 | 272 | 79.9% | 46 | 6,388 | 77.1% | 44 |
| 47 | Mihile | 미하일 | 141 | 188 | **259** | 365 | 507 | 261 | 78.4% | 15 | 6,448 | 77.8% | 14 |
| 48 | Mechanic | 메카닉 | 139 | 185 | **254** | 360 | 502 | 258 | 76.8% | 8 | 6,780 | 81.8% | 7 |

Notes on the table:

- **Spread is narrow**: top class (Cadena) to bottom (Mechanic) is only **1.30×** on the
  환산-normalised axis and **1.40×** on the 전투력 axis. Post-6th-job KMS balance is much flatter
  than older DPM charts suggested.
- The two normalisations agree only moderately (**Spearman ρ = 0.66** across 48 classes). They
  disagree exactly where you'd expect: classes with high innate IED/force/level bonuses (which
  전투력 ignores) rank higher on the 환산 axis; classes with unusual weapon constants rank higher
  on the 전투력 axis. Where they disagree, **the 환산 column is the better damage estimate and the
  전투력 column is the better thing for us to compute**, so store both.
- `n` is sample count; classes with n < 10 (Kinesis 5, Thunder Breaker 7, Blaze Wizard 7,
  Wild Hunter 7, Marksman 8, Shade 8, Lethe 8, Mechanic 8) are **low-confidence**.
- Sample bias: only characters with 전투력 ≥ 3억 can enter 연무장 at all, and only players who
  bother to record show up. These are good players. See §7.

### 3.1 The five priority classes, in absolute terms

| Class | KR | DPM @환산 11만 (조/min) | rank / 48 | % of top class | median DPS÷전투력 | rank / 48 |
|---|---|---:|---:|---:|---:|---:|
| **Ren** | 렌 | **269** | 40 | 81.6% | 6,831 (82.4%) | 33 |
| **Hero** | 히어로 | **278** | 27 | 84.2% | 7,027 (84.8%) | 24 |
| **Wind Archer** | 윈드브레이커 | **277** | 30 | 83.8% | 7,086 (85.5%) | 21 |
| **Battle Mage** | 배틀메이지 | **266** | 43 | 80.7% | 6,016 (72.6%) | 48 |
| **Night Walker** | 나이트워커 | **279** | 25 | 84.6% | 7,053 (85.1%) | 23 |

All five sit in a tight band, **80.7 %–84.6 % of Cadena**, i.e. within 5 % of each other. For a
clear-time estimator this means: *for these five classes specifically, class choice is close to
noise compared with spec.* Battle Mage is the clear laggard on the 전투력 axis (72.6 % of top) —
consistent with it having little innate IED, so it needs more of its 전투력 spent on 방무.

---

## 4. The conversion problem — full anchor records

These are individual real characters. Every row is `(class, level, 전투력, 헥사환산, DPS, DPM,
run length, cooldown-reduction)` measured on the same standardised dummy. **This is the most
directly usable thing in this document**: pick one, feed its 전투력 into our damage formula, and
the DPM column tells you what that spec produces on a 380 %-PDR boss-flagged target.

Full 933-record dataset: `docs/research/data/yeonmujang-2026-08.csv`.

Provenance for every row: DPS/전투력/level from **chuchu.gg** `battle-practice` (Nexon Open API),
헥사환산 from **MapleScouter** `/api/ranking/battle`, joined on nickname + DPS match (± 0.5 %).

### 4.1 Priority classes — top trusted records

| Class (GMS) | Nickname | Lv | 전투력 (combat power) | 헥사환산 | DPS | DPM | run (s) | 쿨감 |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| Ren | 낭인 | 295 | 1,280,814,012 | 130,074 | 8.963조/s | 537.8조/min | 336 | 5s |
| Ren | 키약새 | 295 | 1,097,136,682 | 126,039 | 7.742조/s | 464.5조/min | 339 | 5s |
| Ren | 링곰 | 295 | 1,079,895,267 | 124,746 | 7.562조/s | 453.7조/min | 339 | 5s |
| Hero | Face1ess | 296 | 966,219,936 | 121,662 | 6.894조/s | 413.6조/min | 339 | 3s |
| Hero | 으노 | 298 | 860,690,512 | 117,947 | 6.096조/s | 365.8조/min | 337 | 3s |
| Hero | 무궁화 | 296 | 820,179,595 | 117,644 | 5.900조/s | 354.0조/min | 339 | 3s |
| Wind Archer | Phalang | 296 | 914,025,557 | 120,365 | 6.920조/s | 415.2조/min | 333 | 5s |
| Wind Archer | 세살 | 295 | 696,698,459 | 113,850 | 5.501조/s | 330.1조/min | 334 | 5s |
| Wind Archer | 안깅 | 295 | 690,143,108 | 113,051 | 5.220조/s | 313.2조/min | 333 | 5s |
| Battle Mage | 리스크 | 297 | 1,116,056,741 | 124,235 | 6.811조/s | 408.6조/min | 340 | 2s |
| Battle Mage | 슈러 | 293 | 858,138,916 | 116,676 | 5.555조/s | 333.3조/min | 339 | 2s |
| Battle Mage | 쩝법사21세 | 299 | 703,784,854 | 111,231 | 4.618조/s | 277.1조/min | 343 | 0s |
| Night Walker | 펀시 | 295 | 871,669,470 | 118,473 | 6.334조/s | 380.1조/min | 336 | 4s |
| Night Walker | 점프캔슬초보 | 296 | 736,510,439 | 115,592 | 5.584조/s | 335.0조/min | 333 | 5s |
| Night Walker | 자히르 | 298 | 714,186,350 | 113,232 | 5.045조/s | 302.7조/min | 334 | 4s |

### 4.2 Scale sanity anchors (whole dataset)

| | 전투력 | 헥사환산 | DPS | DPM |
|---|---:|---:|---:|---:|
| Highest DPS record in the set — Kaiser `배배`, Lv 297 | 1,528,195,484 | 135,979 | 11.236조/s | 674조/min |
| Highest 전투력 in the set — Dual Blade `상온`, Lv 296 | 1,624,579,813 | 133,571 | 10.007조/s | 600조/min |
| Fitted 전투력 at 헥사환산 110,000 (log–log fit over 933 records) | **≈ 656,000,000** | 110,000 | — | — |
| Fitted log–log slope 헥사환산 → 전투력 | 2.55 | | | |

Per-class fit of `DPS = k × 전투력^α` over the CSV (41 classes with ≥ 8 samples): median
**α = 1.14**, range 1.03 (Ark) – 1.30 (Demon Avenger, Corsair), with Buccaneer an outlier at 1.49
on 11 samples. The slight super-linearity is expected — better-geared characters also carry more
IED / force / links, none of which 전투력 counts. Using α = 1 and a per-class `k` (the §3 column)
is a good first approximation; fitting α per class is a refinement worth doing later.

The 전투력 row above is also a useful bridge: **전투력 ∝ 헥사환산^2.55** empirically (933 points,
residual CV 11 %).

⚠ **Exponent disagreement — flag this before extrapolating.** Fitting the CSV directly gives
**measured DPS ∝ 헥사환산^3.09** (global; per-class median 3.09, range 2.74–3.66 over 41 classes).
But MapleScouter's own `dps9 → dps14` normalisation implies roughly **^3.6**, and `kms-tools.md`
§2.1 reports the boss-cut curve behaving like **^≈4** over 90 k–150 k. Three different exponents
for three different questions:

| Exponent | What it answers |
|---|---|
| **^3.09** (measured, cross-sectional) | "Two real players at different 환산 — how much more damage does the higher one actually do?" |
| **^3.6** (MapleScouter normaliser) | "If *this* character's gear were scaled to 환산 N, what would it do?" |
| **^≈4** (boss-cut curve) | "How much more damage is *required* to clear a harder boss?" |

The cross-sectional figure is shallower because higher-환산 players are not simply the same build
scaled up. For a clear-time estimator that models a *specific* stat line, the normaliser exponent
(^3.6) is the right one; the ^3.09 figure is the right one for "how much faster is a stronger
player than me". Using the §2.1 boss-cut curve to extrapolate DPM across spec will
**over-predict** the gain from stat at the top end.

---

## 5. Relative class multipliers

Three independent tables. Use them together; where they disagree, prefer the newest.

### 5.1 2026-08, 연무장, 환산-normalised — see the full table in §3

Top-to-bottom spread **1.30×**. This is the current, highest-confidence relative table.

### 5.2 2026-08, 연무장, DPS ÷ 전투력 — see §3 right-hand columns

Top-to-bottom spread **1.40×**. Lower confidence as a *damage* ranking (it ignores IED / force /
level), higher usefulness as an *engine input*.

### 5.3 2025-04, 8.8 Challenge, at 헥사환산 88 000 — historical

Compilation by 교행22 / 짱구는뿌리, summarised with Bishop-relative ratios by Leih.
Dates **2025-04-17 → 2025-04-19**, KMS, post-본섭 patch, "장인컨" (expert-play) figures.
Sources: <https://www.inven.co.kr/board/maple/5974/4909311> (ranked summary),
<https://www.inven.co.kr/board/maple/5974/4905635> (original, per-class evidence links),
<https://www.fmkorea.com/8264925583> (mirror with per-class cooldown/seed-ring notes and source links).

Confidence: **medium**. Every entry is one expert player's video, self-reported, at slightly
different cooldown-reduction and seed-ring setups (noted in the fmkorea mirror), and the compiler
repeatedly revised numbers on reader reports. **17 months stale — do not use for balance.** It is
included because it is the only public table that gives an absolute figure at a *low* spec
(88 000), and because the cross-check against it validates the whole unit chain (§5.4).

| # | Class (GMS) | KR | Total dmg / 5:40 (조) | DPM (조/min) | vs Bishop |
|---:|---|---|---:|---:|---:|
| 1 | Cadena | 카데나 | 705 | 124.4 | 123.50% |
| 2 | Evan | 에반 | 701 | 123.7 | 122.80% |
| 3 | Khali | 칼리 | 673 | 118.8 | 117.90% |
| 4 | Mercedes | 메르세데스 | 670 | 118.2 | 117.30% |
| 5 | Xenon | 제논 | 650 | 114.7 | 113.80% |
| 6 | Thunder Breaker | 스커 | 639 | 112.8 | 111.90% |
| 7 | Demon Avenger | 데몬어벤져 | 635 | 112.1 | 111.20% |
| 8 | Shadower | 섀도어 | 635 | 112.1 | 111.20% |
| 9 | Night Lord | 나이트로드 | 633 | 111.7 | 110.90% |
| 10 | Zero | 제로 | 633 | 111.7 | 110.90% |
| 11 | Blaze Wizard | 플레임위자드 | 630 | 111.2 | 110.30% |
| 12 | Bowmaster | 보우마스터 | 625 | 110.3 | 109.50% |
| 13 | Night Walker | 나이트워커 | 621 | 109.6 | 108.80% |
| 14 | Adele | 아델 | 620 | 109.4 | 108.60% |
| 15 | Kain | 카인 | 619 | 109.2 | 108.40% |
| 16 | Dark Knight | 다크나이트 | 615 | 108.5 | 107.70% |
| 17 | Battle Mage | 배틀메이지 | 612 | 108.0 | 107.20% |
| 18 | Buccaneer | 바이퍼 | 610 | 107.6 | 106.80% |
| 19 | Blaster | 블래스터 | 609 | 107.5 | 106.70% |
| 20 | Arch Mage (Fire, Poison) | 불독 | 607 | 107.1 | 106.30% |
| 21 | Corsair | 캡틴 | 607 | 107.1 | 106.30% |
| 22 | Hoyoung | 호영 | 604 | 106.6 | 105.80% |
| 23 | Phantom | 팬텀 | 603 | 106.4 | 105.60% |
| 24 | Hero | 히어로 | 602 | 106.2 | 105.40% |
| 25 | Cannoneer | 캐슈 | 588 | 103.8 | 103.00% |
| 26 | Ark | 아크 | 587 | 103.6 | 102.80% |
| 27 | Pathfinder | 패스파인더 | 586 | 103.4 | 102.60% |
| 28 | Kinesis | 키네시스 | 585 | 103.2 | 102.50% |
| 29 | Kaiser | 카이저 | 583 | 102.9 | 102.10% |
| 30 | Marksman | 신궁 | 583 | 102.9 | 102.10% |
| 31 | Aran | 아란 | 582 | 102.7 | 101.90% |
| 32 | Angelic Buster | 엔버 | 581 | 102.5 | 101.80% |
| 33 | Arch Mage (Ice, Lightning) | 썬콜 | 578 | 102.0 | 101.20% |
| 34 | Dual Blade | 듀얼블레이드 | 574 | 101.3 | 100.50% |
| 35 | Demon Slayer | 데몬슬레이어 | 573 | 101.1 | 100.40% |
| 36 | Bishop | 비숍 | 571 | 100.8 | 100.00% |
| 37 | Wind Archer | 윈드브레이커 | 570 | 100.6 | 99.80% |
| 38 | Paladin | 팔라딘 | 567 | 100.1 | 99.30% |
| 39 | Dawn Warrior | 소울마스터 | 562 | 99.2 | 98.40% |
| 40 | Lara | 라라 | 561 | 99.0 | 98.20% |
| 41 | Luminous | 루미너스 | 560 | 98.8 | 98.10% |
| 42 | Mihile | 미하일 | 556 | 98.1 | 97.40% |
| 43 | Wild Hunter | 와일드헌터 | 556 | 98.1 | 97.40% |
| 44 | Mechanic | 메카닉 | 545 | 96.2 | 95.40% |
| 45 | Shade | 은월 | 542 | 95.6 | 94.90% |

*(45 entries; Ren and Lethe did not yet exist. "스커"=Thunder Breaker, "불독"=Arch Mage F/P,
"캐슈"=Cannoneer, "엔버"=Angelic Buster, "썬콜"=Arch Mage I/L are community abbreviations.)*

### 5.4 Cross-check: 2025-04 → 2026-08 power creep at equal spec

Comparing the two tables at the same 헥사환산 (88 000, using the §2.1 curve to shift the 연무장
9만 column down by ×0.948):

| Class | 8.8 (2025-04) | 연무장 (2026-08) @ 88 k | ratio |
|---|---:|---:|---:|
| Hero | 106.2조/min | 145.1조/min | ×1.37 |
| Wind Archer | 100.6조/min | 145.1조/min | ×1.44 |
| Battle Mage | 108.0조/min | 140.3조/min | ×1.30 |
| Night Walker | 109.6조/min | 147.0조/min | ×1.34 |
| Cadena | 124.4조/min | 171.6조/min | ×1.38 |
| Bishop | 100.8조/min | 137.5조/min | ×1.36 |

A consistent **+30 % to +44 %** (median ×1.37) at equal 환산 over 16 months — Ascent skills, HEXA
expansion, level-6 seed rings, Destiny liberation. Two things follow:

1. The two datasets are **on the same absolute damage scale**, which independently confirms the
   unit interpretation in §2 and the "÷340 s" correction in §1.2. This is the strongest
   verification in this document.
2. **Any DPM number decays at roughly 2 %/month at fixed spec.** Timestamp every anchor and
   plan to re-scrape.

---

## 6. Caveats — read before using any number

**Region.** Every number in this document is **KMS**. GMS diverges:

- **Attack-speed cap.** GMS permits attack speed stage 0 ("AS0"), KMS does not. A 2024-11 arca
  compilation of a KMS-vs-GMS 8.8 comparison lists the classes that gain final damage from it:
  **Marksman, Thunder Breaker, Shade, Buccaneer, Wind Archer, Dawn Warrior, Corsair, Blaze
  Wizard** — the 속사기 (rapid-fire) group. The author states the gain was measured against
  matched KMS combat-analysis logs from each class's Discord and cites Reddit as the origin,
  and one comment quotes ~10 % final damage for Demon Slayer-adjacent cases.
  <https://arca.live/b/maplestory/120199327> — **the actual numeric table is a posted image,
  which this environment could not OCR. Unverified.** ⚠ **Wind Archer is one of our five
  priority classes and is in the GMS-boosted group**, so its KMS figure is likely an
  underestimate for GMS.
- **Cooldown-reduction rotations.** The same compilation notes Mercedes was run with the GMS-style
  2-second cooldown-cut cycle rather than the KMS 1-second cycle. Rotation conventions differ.
- **Patch lag.** GMS balance trails KMS by months; classes reworked in KMS after the GMS content
  freeze will be mis-ranked.
- **연무장 does not exist in GMS.** There is no GMS equivalent dataset, and the Nexon Open API
  that feeds all three Korean sites covers **KMS / TMS / MSEA only** (`kms-tools.md` §1). There is
  no path to GMS-native numbers except player self-measurement (§7).

**Burst vs sustained.** 연무장 is ~340 s containing **3 극딜 (burst) windows** with game-supplied
buffs and cooldowns reset on entry. It is *neither* pure burst *nor* a true 30-minute sustained
rotation. It overstates sustained DPM for classes whose power is front-loaded (long-cooldown
Origin/burst classes) relative to steady-damage classes. The 8.8 Challenge's explicit rule was
"rotate as if fighting Black Mage phase 2" and required the cycle to be repeatable for 30+
minutes; 연무장 has no such rule.

**Full 5th/6th job investment.** Yes, implicitly and heavily. The 전투력 ≥ 3억 entry gate plus the
observed 환산 range (68 k–136 k, median ≈ 110 k) means every record is a fully-built endgame
character: maxed HEXA, Ascent skills, level-5/6 seed rings, 290+ levels. **None of this data
describes a mid-game character**, and extrapolating the fitted curves far below 환산 90 k /
전투력 3억 is unsupported.

**Expert-player bias — the standard warning applies with full force.** Records are self-selected:
only players who choose to record appear. MapleScouter additionally excludes "samples differing by
more than a fixed ratio from the top record" and "records using 무공 soul", i.e. the publisher
already truncates the low tail. The §3 table uses **Q3** (the site's default) — the 75th percentile
of an already-truncated, self-selected sample. Real clear times will be **substantially** slower:
no mechanics, no movement, no death, no phase transitions, no invulnerability windows, no
downtime. `bosses.md` §5.5 (effective vs listed HP) applies on top.

**Staleness of the simulator route.** `oleneyl/maplestory_dpm_calc` — the Python skill-graph
simulator named in `bosses.md` §5.6 as "the reference implementation" — was **last pushed
2022-11-30**. That predates 6th job / HEXA entirely (Dec 2023). It ships no results table in the
repo (only `statistics/` plotting helpers). **It is unusable for current balance.** Do not build
on it.

**Sources that could not be reached from this environment:** namu.wiki (Cloudflare 403 on direct
curl and on WebFetch — the 연무장 dummy stats in §1.1 come from a search-result snippet of that
page, not from the page itself); `maplestalkersea.com/dpmchart` (Vercel bot checkpoint, 403/429);
`maplescouter.com/88dpm` (404, long dead — rules mirrored at
<https://arca.live/b/maplestory/117326641>); reddit.com (not attempted, blocked in prior runs).

---

## 7. Self-calibration procedure

Even with §3 in hand, our engine has a relative `damageIndex`, not 전투력 or 환산. The bridge
needs **one** measured point. It does **not** need one per class.

### 7.1 Minimum viable: one measurement total

1. On any one character, in-game, open the **Training Room / Combat Analysis** dummy
   (GMS: Henesys → Training Center; set the dummy to **Large, Boss, Level 1 or 200, 380 % defence
   rate, elemental resistance halved** — the settings the 8.8 rules and 연무장 both use).
2. Apply **your normal boss-fight buff set** and record what it was (this is the single biggest
   source of error — write it down).
3. Turn Combat Analysis **on**, run your normal boss rotation for **5 min 40 s (340 s)** — long
   enough for 2 burst windows on nearly every class — then turn it off.
4. Record, from the same session:
   - **Total damage** and the **elapsed time** shown by Combat Analysis → `DPM_measured`.
   - The **entire stat window** (both pages): main stat, sub stat, ATT/M.ATT, damage %, boss
     damage %, final damage %, IED (방무), crit rate, crit damage, cooldown reduction, buff
     duration, Arcane/Sacred/Grandis force, level.
   - The character's **Combat Power (전투력)** as displayed.
5. Feed that stat window into our damage formula → `damageIndex_measured`, and into the 전투력
   formula (`formulas.md` §2.3) → `CP_computed`. **Check `CP_computed` against the displayed
   전투력**; if they differ by more than ~1 %, the stat-window transcription is wrong. This is a
   free, exact self-test — use it.
6. Solve the single global constant:
   `κ = DPM_measured / (damageIndex_measured × classMultiplier[thisClass])`
   where `classMultiplier` comes from the §3 table normalised so that this class = 1.0.
7. Every other class is then derived from §3 with no further measurement.

**One data point is genuinely enough** if you trust §3's relative ordering. A second measurement
on a different class (ideally one at the other end of the table, e.g. Cadena vs Mechanic) is worth
taking purely as a check on the relative table, not as an additional degree of freedom.

### 7.2 If you would rather not measure at all

Skip step 1–4 and calibrate against a published record from `docs/research/data/yeonmujang-2026-08.csv`:

- Pick a class with a large sample in the CSV (Ren 46, Bishop 44, Dual Blade 40, Adele 38, Cadena 38, Zero 36).
- Take a record's **전투력** and its **DPM**.
- Build the same character's stat line in our engine until our computed 전투력 matches the record's
  전투력, then set `κ` so that our DPM matches.

This is weaker — you are matching a scalar (전투력) rather than a full stat window, and 전투력
ignores IED/force/level so two characters at the same 전투력 do not necessarily deal the same
damage — but it needs no in-game action and it is reproducible.

### 7.3 Recommended engine shape

```
DPM_dummy(class, spec)  = κ × damageIndex(spec) × classMultiplier[class]
DPM_boss(class, spec, boss)
        = DPM_dummy × pdrAdjust(boss.pdr vs 380%)
                    × elementAdjust(boss)
                    × levelCoef(myLevel − boss.level)     # kms-tools.md §2.2
                    × forceCoef(myForce / boss.forceReq)  # kms-tools.md §2.2
                    × uptime                              # see below
clearTime = effectiveHP(boss) / DPM_boss                  # bosses.md §5.5 for effectiveHP
```

`uptime` is the honest fudge factor and should be exposed in the UI, not hidden. Nothing in any
public dataset measures it. A defensible starting range is **0.5–0.7** for a first solo clear and
**0.75–0.9** for a farmed weekly, and it should be the thing the user tunes when the estimator
disagrees with their own clear times.

### 7.4 Storage shape suggestion

Store per class: `{ kr, gms, dpmAt110k, dpsPerCombatPower, sampleSize, source, measuredAt }`, plus
a global `κ`. Re-scrape `api.maplescouter.com/api/ranking/battle` and `chuchu.gg/battle-practice`
each KMS balance patch; §5.4 shows the numbers move ~2 %/month.

---

## 8. Source index

### Primary — used for the numbers in §3 and §4

| Source | URL | What it gave | Access | Confidence |
|---|---|---|---|---|
| MapleScouter 연무장 랭킹 (page) | <https://maplescouter.com/ko/battle-ranking> | per-class 환산-normalised DPS, publisher's exclusion notes | client-rendered; data via API below | High |
| MapleScouter battle-ranking API | `GET https://api.maplescouter.com/api/ranking/battle` (`?season=pre` for last season) | 1 001 records: `{id, class, dps, hexa, dps9…dps14, cool, seedring, time, reset, overcycle, trusted, invalid}` | open, no auth, no key | High |
| chuchu.gg 연무장 기록실 | <https://chuchu.gg/battle-practice> and `/battle-practice/<직업>` | per-class and per-record **DPS, 전투력, level, date**; server-rendered HTML | open | High |
| memujang | <https://memujang.com/> , `/jobs/<slug>` | independent 3rd copy of the same Nexon Open API data; JSON-LD with 전투력 + DPS | open | High |
| Nexon official 연무장 guide | <https://maplestory.nexon.com/Guide/N23GameInformation/Articles/144565> | entry gate, 400 s window, 300 s prep, buff rules | open | High (official) |
| namu.wiki 연무장 | <https://namu.wiki/w/연무장> | dummy stats (Lv 200 / 380 % PDR / element halving), patch date, ranking-reset rule | **403 Cloudflare** — snippet only | Medium ⚠ |

### Secondary — historical / cross-check

| Source | URL | What it gave | Confidence |
|---|---|---|---|
| Inven — 8.8챌린지 순위(배율) 요약, Leih, 2025-04-19 | <https://www.inven.co.kr/board/maple/5974/4909311> | 45-class table, absolute + Bishop-relative | Medium |
| Inven — original compilation, 교행22, 2025-04 | <https://www.inven.co.kr/board/maple/5974/4905635> | per-class evidence links | Medium |
| FMKorea mirror, 짱구는뿌리, 2025-04-17 | <https://www.fmkorea.com/8264925583> | same table **plus** per-class cooldown/seed-ring conditions and the two quotes that prove the "÷340 s" unit | Medium |
| arca — KMS vs GMS 8.8 DPM표, 2024-11-01 | <https://arca.live/b/maplestory/120199327> | list of GMS attack-speed-benefiting classes; numeric table is an image | Low ⚠ |
| arca — 각 직업 고점 dpm표, 2025-03-30 | <https://arca.live/b/maplestory/132631402> | pointer to <https://mapm.tistory.com/m/126> and Inven 4824875; body is a re-post | Low |
| arca — 8.8 rules verbatim, 2024-09-27 | <https://arca.live/b/maplestory/117326641> | 8.8 submission rules (the dead `maplescouter.com/88dpm`) | Medium |
| MapleScouter challenge index | <https://maplescouter.com/ko/challenge> ; APIs `/api/event/challenge`, `/api/event/challenge-season3/{rule,round-1-record,round-2-record}`, `/api/event/rt-challenge/{rule,list}` | per-class rulebooks, spec gates (103 000 ± 300 and ≈ 83 000), per-class submitted results with video links | High for rules, Medium for results |

### Checked and rejected

| Source | Verdict |
|---|---|
| `oleneyl/maplestory_dpm_calc` | **Last push 2022-11-30**, pre-6th-job. No results table in-repo. Unusable. |
| `maplestalkersea.com/dpmchart` | Vercel bot checkpoint; unreachable. Unknown region/date. |
| `andrew-eldridge/maplestory-damage-calculator`, `A-S-S-A/maplestory-dpm` | Not re-checked this pass; `bosses.md` §5.6 already flags them as unverified. |
| Gamer Empire / TierMaker GMS tier lists | Opinion tier lists, no DPM numbers, no stated spec. |

---

## 9. Open questions

1. **The 연무장 dummy stats are single-sourced from a blocked page.** Confirm Lv 200 / 380 % PDR /
   element-halving from the game client or an unblocked mirror before treating §1.1 as Tier A.
2. **GMS delta is unquantified.** The one source that has it publishes it as an image. Worth a
   retry with OCR, or asking in a GMS class Discord.
3. **The 환산 exponent disagreement** (§4.2): measured cross-sectional `DPS ∝ 환산^3.09` vs the
   normaliser's `^3.6` vs the boss-cut curve's `^≈4`. Decide which one the estimator should use
   before wiring the §2.1 curve into spec extrapolation.
4. **`overcycle` / `trusted` semantics.** MapleScouter flags `overcycle` = "impossible cycle —
   4준극 used" and `trusted`/`invalid` for exclusions. The §3 table uses trusted-only; the site
   also offers "현지인 보기" (records within ±5 000 환산 of the basis) which would be a *stricter*
   and arguably better filter. Not applied here — worth recomputing with it.
5. **Season boundaries.** MapleScouter calls the current set `period 4`; memujang labels the same
   Aug-2026 records "시즌 3"; chuchu calls it "시즌4 (Ver 1.2.417)". Numbering is inconsistent
   across sites — key on the record dates, not the season label.
