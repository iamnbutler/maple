# KMS tooling: MapleScouter boss-suitability model, 환산 주스탯, 전투력 (research notes)

Compiled 2026-09-06 from a research pass (WebSearch/WebFetch + reading MapleScouter's shipped JS
bundle). Companion to `bosses.md` §3.5 and `existing-tools.md` §1. Everything reverse-engineered
from the bundle may change on any deploy.

## 1. Facts

- There is **no in-game per-boss "recommended combat power"** in KMS or GMS. The boss UI shows a
  star **tier** (gold/silver/bronze/lead, 32 steps). Only **ChinaMS** has numeric CP entry gates
  (table in `bosses.md` §3.2–3.3).
- The metric KMS players use for boss gating is **환산 주스탯 / 헥사환산** from MapleScouter, not 전투력.
- MapleScouter is closed source (goma-o Co.), Nexon Open API backed (KMS/TMS/MSEA only), has a
  manual `/input` mode taking stat-window numbers (base / % / %-not-applied per stat, ATT, dmg%,
  FD%, boss%, IED, crit, CDR, buff duration, force…).
- 전투력 formula (verified to the digit, see `formulas.md` §2.3):
  `floor((4·main+sub)·0.01 · floor(bowNormATT·(1+ATT%)) · (1.35+CD) · (1+DMG+BD) · (1+FD_gear))`,
  skill-sourced FD divided out, IED/level/force/links/consumables excluded, HEXA stats included.
  Bow-equivalent base ATT: Destiny 349, Genesis 318, Arcane 276, AbsoLab 192.

## 2. MapleScouter's boss model (from bundle chunks 4281-…, 3723-…, served 2026-09-06)

### 2.1 환산 → damage curve
Monotone cubic Hermite (PCHIP) over 13 knots, one curve for 300%-defense bosses, one for 380%,
normalised so 환산 114,000 → 1,000,000,000:

```
x    = [0, 23669, 31571, 44859, 54997, 66681, 80448, 92420, 104603, 115271, 125592, 135121, 145777]
y380 = [0, 0x7c85422, 0xd6a725e, 0x1db110e3, 0x30ecb258, 0x4e46ba39, 0x7a91c572,
        0xa92bdb7c, 0xf4a23ef7, 0x161148007, 0x1f6659e79, 0x2acd89600, 0x38d42f36d]
m380 = [5516.4667, 8044.1943, 14789.2693, 25218.0241, 36148.7023, 47175.6992,
        59235.1310, 80154.5135, 129843.6161, 200526.6532, 277023.0546, 336216.9876, 353328.3706]
y300 = [0, 0x7ed8fad, 0xda11ba3, 0x1e0e6b06, 0x31744bb1, 0x4f0d6eb2, 0x7b8c552b,
        0xaa5d553e, 0xf62821e2, 0x162ddf0f5, 0x1f8c1a334, 0x2b0251045, 0x3918f7ef5]
value(s) = 1e9 / H(114000) * H(s)     # linear extrapolation past the last knot
```
Verified: 헥사환산 149,679 → 2,932,606,0xx (site shows 29억 3260만 6096). Damage ∝ 환산^≈4 in 90k–150k.

### 2.2 배율 (clear ratio)
`배율 ≈ damage(my 환산) / damage(bossCut) × easyRate × levelCoef × forceCoef`. Verified vs a live
page within ~3% (residual = level/force bonuses).

Level-gap coefficient (Δ = mine − boss): +5:120, +4:118, +3:116, +2:114, +1:112, 0:110,
−1:105.3, −2:100.7, −3:96.2, −4:91.8, −5:87.5, −6:85, then −2.5/level to −40:0.

Arcane coefficient (r = my/boss ×100): <10:10, <30:30, <50:60, <70:70, <100:80, <110:100,
<130:110, <150:130, ≥150:150 (%).

Authentic/Sacred coefficient (d = my − boss): <−90:5, <−80:10, <−70:20, <−60:30, <−50:40,
<−40:50, <−30:60, <−20:70, <−10:80, <0:90, <10:100, <20:105, <30:110, <40:115, <50:120, ≥50:125 (%).

### 2.3 Verdict thresholds (배율 as ratio `e`, by boss max party size)

| partyLimit | 솔플 여유컷 (comfortable solo) | 솔플 가능 (solo) | 솔플 최소컷 (min solo) | 파티격 가능 (party) | 파티 최소컷 (min party) |
|---|---|---|---|---|---|
| 6 | ≥ 2.00 | ≥ 1.10 | ≥ 0.90 | ≥ 0.25 | ≥ 0.15 |
| 3 | ≥ 2.00 | ≥ 1.10 | ≥ 0.90 | ≥ 0.36 | ≥ 0.30 |
| 2 | ≥ 2.00 | ≥ 1.10 | ≥ 0.90 | ≥ 0.55 | ≥ 0.45 |
| 1 | ≥ 2.00 | ≥ 1.10 | ≥ 0.90 | — | — |

Site guidance: 100% is not "can clear"; **120–130% is the realistic minimum**, ~140% comfortable,
≥200% "여유컷". Cuts are set by ~5 expert players, refreshed at summer/winter updates; default
fight window 20 min; Hard Lucid judged on phase 3.

### 2.4 Boss-cut constants (환산 units; renewalDate mostly 2026-07-23)

| Boss family | base bossCut |
|---|---|
| Baldrix | 129,900 |
| Bellona (KMS only) | 128,200 |
| Limbo | 118,900 |
| Malefic Star | 117,500 |
| Jupiter | 111,700 (Hard uses partyBossCut) |
| First Adversary | 108,100 |
| Kaling | 105,800 (Extreme partyBossCut 108,350) |
| Seren | 105,700 |
| Black Mage (Extreme) | 94,500 |
| Kalos | 90,900 |
| Lotus (Extreme) | 64,500 |
| 검밑솔 group (BM/VHilla/Darknell/Gloom/GAS/Will/Lucid/Damien/Lotus/Mayrin) | 40,600 (difficulty via easyRate) |
| Chaos Papulatus and below | 500, easyRate 1.08 |

Derived required 헥사환산 at 배율 100% (reconstruction, not printed by the site) — selection:
Extreme Adversary 147,910 · Extreme Kalos 136,585 · Hard Baldrix 131,452 · Hard Limbo 120,380 ·
Hard Malefic Star 118,980 · Normal Jupiter 113,166 · Hard Adversary 109,567 · Normal Baldrix 107,811 ·
Hard Kaling 107,322 · Extreme Seren 107,225 · Normal Limbo 99,991 · Extreme BM 96,246 ·
Chaos Kalos 92,738 · Normal Kaling 71,053 · Normal Malefic Star 70,229 · Extreme Lotus 65,305 ·
Normal Adversary 53,140 · Normal Kalos 48,468 · Easy Kaling 40,536 · Hard Seren 38,661 ·
Easy Adversary 33,883 · Easy Kalos 30,229 · Hard BM 26,218 · Normal Seren 26,058 · Hard Lucid 24,067 ·
Chaos GAS 17,515 · Hard VHilla 17,451 · Hard Darknell 15,511 · Chaos Gloom 14,785 · Hard Will 12,539 ·
Normal VHilla 8,908 · Hard Damien 6,351 · Hard Lotus 4,667 · Normal Gloom 2,772 · Normal Will 2,317 ·
Normal Darknell 2,301 · Normal Lucid 2,206 · Easy Will 1,524 · Easy Lucid 1,259 · Normal GAS 903 ·
Normal Lotus 204 · Normal Damien 194.
namu.wiki's independent solo table agrees within ~5% (Extreme Adversary 15.1만, Extreme Kalos 14.1만,
Hard Baldrix 13.5만, Hard Limbo 12.2만, Normal Jupiter 11.7만, Hard Kaling 11.1만, Normal Limbo 10.2만,
Extreme BM 10.4만, Chaos Kalos 9.8만, Normal Kaling 7.6만, Extreme Lotus 6.7만, Normal Adversary 5.7만,
Normal Kalos 5.2만, Easy Kaling 4.4만).

### 2.5 Boss reference data the site ships (level / PDR / force / max party)
Jupiter 295/380%/Sacred 810/3 · Baldrix 290/380/700/(1,3,3) · Extreme Adversary 290/380/460/3 ·
Limbo 285/380/500/(1,3,3) · Extreme Kaling 285/380/480/6 · Extreme Kalos 285/380/440/6 ·
Hard/Destiny Kaling 285/380/350 · Hard/Destiny Adversary 285/380/340 · Normal Kaling 285/380/330 ·
Chaos/Destiny Kalos 285/380/330 · Extreme Lotus 285/380/—/2 · Hard Malefic Star 280/380/550/3 ·
Normal Malefic Star 280/380/400/3 · Normal Adversary 280/380/320/3 · Normal Kalos 280/380/300/6 ·
Extreme Seren 280/380/200/6 · Extreme BM 280/300/Arcane 1320/6 · Easy Kaling 275/380/230/6 ·
Hard Seren 275/380/200/6 · Hard BM 275/300/1320/6 · Easy Adversary 270/380/220/3 ·
Easy Kalos & Normal Seren 270/380/200/6 · Darknell 265/300/850/6 · Gloom 255/300/730/6 ·
Hard VHilla 250/300/900/6 · Normal VHilla 250/300/820/6 · Will 250/300/760/6 · Chaos GAS 250/300/—/6 ·
Easy Will 235/300/560/6 · Lucid 230/300/360/6 · Normal GAS 220/300/—/6 · Damien & Lotus 210/300/—/6 ·
Chaos Papulatus 200/300/—/1 · Vellum 200% · Magnus & CQueen 120% · Von Bon & Zakum 100% · Pierre 80%.

### 2.6 환산 grade table (ranking-analysis, 759,020 users ≥ 40k)
Challenger 129k (0.02%) · GM 125k · Master 116k · Diamond 109k (1.2%) · Emerald 94k (4%) ·
Platinum 77k (12%) · Gold 63k (28%) · Silver 57k (46%) · Bronze 51k (72%) · Iron 40k.

### 2.7 DPM source
MapleScouter's "8.8 DPM challenge" and the in-game 연무장 (Battle Arena) ranking
(`maplescouter.com/ko/battle-ranking`) give per-class 환산-normalised DPS.

## 3. 환산 주스탯 definition (community)
No published closed form. Concept: convert every multiplier (ATT, dmg%, boss, IED, crit dmg, FD,
force, level) into the equivalent main stat under a standardised doping frame, evaluated at 300% or
380% defense. Simplified basis: `스공 = (주스탯×4+부스탯)/100 × 총공격력 × (1+dmg%) × (1+FD%) × 무기상수 × 직업상수`.
Note: `RonaldLiu2143/maplecompile`'s `convertedMain` reduces algebraically to `statNumerator/4`
(plain total main stat) — it is a placeholder, not a real 환산 implementation. Do not port it.

## 4. Community 전투력 → boss tables (unofficial, generous)
2025-07 table (loat.tistory.com): Hard Lucid/Will 4000만 · Hard VHilla 5000만 · Normal Seren 8000만 ·
Hard BM 1.2억 · Easy Kalos 1.2억 · Hard Seren 1.8억 · Easy Kaling 2.5억 · Normal Kalos 2.5억 ·
Extreme Lotus 3.4억 · Normal Kaling 6억 · Normal Limbo 7억 · Chaos Kalos 7억 · Normal Baldrix 8억 ·
Hard Kaling 10억 · Hard Adversary 12억 · Hard Limbo 14억 · Extreme Kalos 16억 · Hard Baldrix 17억 ·
Extreme Kaling 25억 · Extreme Adversary 30억. namu anchors: 환산 4만 ≈ 전투력 7,000–9,000만;
환산 <2만 ≈ 전투력 <2,000만.
