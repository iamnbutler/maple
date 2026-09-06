# MapleStory (GMS) Data Tables — Part A

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

## 0. Version context — what changed in 2025-2026

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

# 1. Star Force Enhancement

## 1.1 System summary (current, post-v264 GMS)

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

## 1.2 Maximum stars by item level

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

### Exceptions

| Equipment | Max Star Force |
|---|---|
| Sweetwater Shoes / Gloves / Cape | 15★ |
| Ghost Ship Exorcist (badge) | 22★ |
| Sengoku Hakase Badge | 22★ |
| **Superior:** Elite Heliseum | 3★ |
| **Superior:** Nova | 8★ |
| **Superior:** Tyrant | 15★ |

Source: <https://maplestorywiki.net/w/Star_Force_Enhancement>

### Fixed-star / non-star-forceable items (calculator-relevant)

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

## 1.3 Stars 1-15 — the scaling tier

These are **item-level independent**. Attack on weapons is a percentage of the weapon's own
base attack and therefore *does* scale with the weapon.

### Weapons, stars 1-15 (per star)

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

### Armor & accessories, stars 1-15 (cumulative)

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

## 1.4 Stars 16-30 — the flat, item-level tier

This is the tier that matters for a damage calculator. **Stat is granted only for stars 16-22;
from 23★ onward star force grants attack only.**

### Class stat gain per star (stars 16-22), all slot types

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

### ATT / MATT gain per star — **armor & accessories** (delta)

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

### ATT / MATT gain per star — **armor & accessories** (cumulative, on top of the sub-15 curve)

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

### ATT / MATT gain per star — **weapons** (delta)

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

### ATT / MATT gain per star — **weapons** (cumulative, added on top of `f(15)` from §1.3)

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

#### ⚠️ The weapon 26★-30★ gap

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

### Badges (Ghost Ship Exorcist, Sengoku Hakase — max 22★)

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

### Superior equipment (Tyrant / Nova / Elite Heliseum) — max 15★

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

## 1.5 Success / Maintain / Destruction rates (KMS + GMS + JMS + MSEA)

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

### Event / modifier effects on rates

- **Star Catch**: ×1.05 to success rate, remainder redistributed proportionally.
- **"5/10/15" Sunny Sunday**: 5→6, 10→11, 15→16 become 100% success. (Safeguard is disabled on
  15→16 during this event since it would do nothing.) Does not apply to Superior items.
- **Destruction reduction Sunny Sunday**: −30% destruction chance when the item is **below 21★**
  (GMS/KMS). JMS/MSEA: −40% below 21★, −20% between 22★ and 24★. Does not apply to Superior.
- **Safeguard**: destruction outcome converted to Maintain, at 15★/16★/17★ only.

Source: <https://maplestorywiki.net/w/Star_Force_Enhancement>

### Star Force Enhancement Mode (GMS only, v269 — 2026-06-17)

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

## 1.6 Destruction, traces and recovery

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

### GMS-only restoration systems (v264)

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

## 1.7 Meso cost

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

## 1.8 Star Force hunting-map damage multipliers

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

## 1.9 Star Force Conversion (Xenon / Demon Avenger)

- **Xenon**: every 10 equipped Star Force → **+7 STR, +7 DEX, +7 LUK**, capped at 100 equipped
  Star Force (so max +70/+70/+70).
- **Demon Avenger**: tiered Max HP compensation based on equipped Star Force (excluding
  medal/title). Cap raised to **410 Star Force** in the revamp.

Sources: <https://strategywiki.org/wiki/MapleStory/Spell_Trace_and_Star_Force> ·
<https://www.nexon.com/maplestory/news/update/32522>

---

# 2. Flames / Bonus Stats ("Additional Options")

## 2.1 System summary

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

## 2.2 Which items are Flame Advantaged

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

## 2.3 The flames themselves (GMS names)

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

## 2.4 Number-of-lines probability

| Method | 1 line | 2 lines | 3 lines | 4 lines |
|---|---|---|---|---|
| Using any Rebirth Flame | 40% | 40% | 16% | 4% |
| Crafting (Master Craftsman) | 21% | 50% | 25% | 4% |
| Crafting (Meister) | — | 56% | 40% | 4% |
| Other (drop, purchase, etc.) | 41% | 40% | 15% | 4% |
| **Flame Advantage equipment** | **always 4 lines** | | | |

Source: <https://strategywiki.org/wiki/MapleStory/Bonus_Stats>

## 2.5 Tier probability distribution

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

## 2.6 Flame stat values by tier and item level

### Single main stat (STR / DEX / INT / LUK) and Defense

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

### Combined two-stat lines (STR&DEX, STR&INT, STR&LUK, DEX&INT, DEX&LUK, INT&LUK)

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

### Attack Power / Magic Attack — **NON-weapons** (armor, accessories)

**Flat, item-level independent:**

| All item levels | T1 | T2 | T3 | T4 | T5 | T6 | T7 |
|---|---|---|---|---|---|---|---|
| ATT or MATT | +1 | +2 | +3 | +4 | +5 | +6 | +7 |

**Maximum possible attack flame on any armor/accessory is +7.**

Source: <https://maplestorywiki.net/w/Bonus_Stats/Stat_Tables>

### Attack Power / Magic Attack — **WEAPONS** (multiplicative on base ATT)

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

### Max HP / Max MP (identical tables)

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

### Percentage and special lines

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

## 2.7 Flame score conventions

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

### Target flame scores (StrategyWiki benchmarks, using the ÷10 / ×4 / ×15 ratios)

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

## 2.8 Systems not in GMS

- **Bonus Stats Reset System** (reset flames with mesos at a fixed cost, same rates as Black
  Rebirth Flame) — **not available in GMS or CMS**.
- **Auto Enhancement System** for flames (set target tiers, auto-reroll) — **not available in GMS**.

Source: <https://maplestorywiki.net/w/Bonus_Stats> (current revision as of 2026-09-06)

---

# 3. Potential and Bonus Potential

> **Source-quality warning for this section.** MapleStory Wiki's `Potential/Stat_Tables` page is
> **empty ("Under construction")** as of 2026-09-06
> (<https://maplestorywiki.net/w/Potential/Stat_Tables>). The only exhaustive public line-by-line
> tables are on **StrategyWiki**, which is *accurate on values* but *stale on item names*
> (it still calls GMS cubes "Red/Black/Meister/Master Craftsman/Occult" — see §3.7 for the
> current GMS names). Treat StrategyWiki values as good and its cube/stamp economy as historical.

## 3.1 System summary

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

### 2025-2026 changes

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

## 3.2 Rank × item-level percentage scale (the master table)

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

## 3.3 Regular Potential — Legendary (prime) line pools and values

Values below are for **GMS Lv151+ items** (the top row of §3.2). Probabilities are given as
`initial / in-game cube / cash cube` where StrategyWiki publishes them.

### Weapon (Legendary prime pool)

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

### Weapon — Unique (prime) / Legendary (non-prime) pool

Same stat lines at the Unique value (**+10%** for STR%/ATT%/crit/damage, **+7%** All Stat), plus:

| Line | Value | Chance |
|---|---|---|
| **Ignore 30% of Monster DEF** (Lv50+) | 30% IED | 6.667% / 6.667% / 6.977% |
| **Boss Damage +30%** (Lv100+) | +30% | 6.667% / 6.667% / 6.977% |

### Armor — Hat (Legendary prime pool), representative of all armor

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

### Accessories (Face, Eye, Ring, Earring, Pendant) — Legendary prime pool

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

### Cape / Belt / Shoulderpad, Top / Overall / Bottom, Gloves, Shoes, Secondary, Emblem, Heart/Badge

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

## 3.4 Prime-line rates

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

## 3.5 Rank-up rates

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

## 3.6 Bonus Potential

Bonus Potential is weaker in `%` terms but offers lines regular potential cannot — most notably
**flat Attack Power on armor and accessories**.

### Rank × item-level scale — STR / DEX / INT / LUK %

| Item level | Rare | Epic | Unique | Legendary |
|---|---|---|---|---|
| 0-20 | 1% | 1% | 2% | 3% |
| 21-50 | 1% | 2% | 3% | 4% |
| 51-90 | 1% | 3% | 4% | 5% |
| **91-150** (GMS/TMS) | 2% | 4% | 5% | 7% |
| **151+** (GMS/TMS) | 3% | 5% | 6% | **8%** |

### Rank × item-level scale — Max HP %

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

### Flat lines on armor / accessories — Legendary (prime) values

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

### Weapon bonus potential — Legendary (prime)

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

### Bonus Potential rank-up and prime rates (KMS-published)

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

## 3.7 Current GMS cube inventory (name mapping)

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

# 4. Open questions / things to verify in-game

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

# Appendix: primary source index

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
