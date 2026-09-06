# Existing tools, APIs and data sources for a GMS gear-progression tracker

Research date: **2026-09-06**. Target: personal Global MapleStory (GMS) gear-progression
tracker that computes damage and suggests the next-best upgrade.

Everything below was verified by fetching the live page/endpoint or reading the actual
source file. Where a claim could not be verified it is marked **[unverified]**.

---

## TL;DR / decisions

| Need | Best answer | Confidence |
| --- | --- | --- |
| Character import for **GMS** | **There is no API. Screenshots (VLM) are the only channel.** Nexon Open API has KMS/MSEA/TMS only. | High |
| GMS level/class/world/avatar lookup | `https://www.nexon.com/api/maplestory/no-auth/ranking/v2/{na,eu}?character_name=X` — public, no key | High |
| Gear JSON schema to adopt | Nexon Open API `character/item-equipment` response shape (base/add/etc/starforce/total split) | High |
| Damage + 환산 formula | `RonaldLiu2143/maplecompile` `src/lib/scouter/calc.ts` (spec, no license — reimplement) | High |
| Boss suitability model | `maplecompile/src/lib/scouter/boss-cuts.ts` — a full reverse-engineering of MapleScouter's clear-rate math | High |
| Boss HP / crystal meso / PDR / force | `maplecompile/src/lib/scouter/boss-info-data.json` + `maplescouter.com/en/boss-data` (SSR HTML table) | High |
| Item base stats, set effects, potentials, icons | **maplestory.io at `GMS/270`** — incl. its raw-WZ endpoint `/api/wz/GMS/270/Etc/SetItemInfo.img` and `/Item/ItemOption.img`. No `latest` alias; enumerate `/api/wz` | High |
| Pre-extracted item JSON (skip the crawl) | `chablades/mapledoro` `manifests/v270/item-stats.json` (69,418 entries, has `setItemID`); `masonym.dev/public/equip-data/*.json` for a curated 4,917-item GMS view | High |
| Star Force rates (2026 GMS) | `masonym/masonym.dev` `src/app/star-force/utils.js`; MIT alternative `hewkow/yasf` | High |
| Cube rates | Nexon's official probability pages, scraped (MathBro's scraper) | High |

---

## 1. MapleScouter (maplescouter.com)

### What it is

MapleScouter — Korean name **환산주스탯** ("converted main stat") — is the dominant
Korean MapleStory character-power calculator. Homepage <https://maplescouter.com/ko>,
English locale <https://maplescouter.com/en>.

Verified from the site footer (SSR HTML of <https://maplescouter.com/en/input>):

- Copyright **"2023. 고마오 Co."** — built by the KMS player 고마오 (Gomao, Elysium world),
  credited alongside `스카니아@환산`, `엘리시움@예띰`, `엘리시움@비숍링크부들`.
- Footer badge: **"MAPLESTORY PARTNERS | Data Based on NEXON OPEN API"** — it is an
  official Nexon MapleStory Partners program participant, sourcing from the Nexon
  Open API.
- Disclaimer: *"Maplescouter is not associated with NEXON Korea and does not provide
  any warranty."*
- Contact: maplescouter@gmail.com, plus a Discord.

### Regions

**KMS only.** The region selector in the SSR HTML contains exactly one region token,
`kms`. Confirmed independently by the third-party Chrome extension
[MapleScouter Enhancements](https://chromewebstore.google.com/detail/maplescouter-english-fix/alopdmlliacajfcgnphmojmneanikbdg)
(author `tomerh2001`), whose store description states verbatim:

> "MapleScouter (환산주스탯) is the best MapleStory stat calculator around, but its
> English mode is missing thousands of translations and **it cannot load GMS
> characters**."

That extension's job is to (a) add ~4,500 missing English translations, (b) map
~55,000 KMS item/monster/map names to their official GMS names, and (c) add a
character-save/cloud-sync layer. Its existence is strong evidence of GMS demand and of
the exact gap our project fills.

So: **auto-import works only for KMS characters** (via Nexon Open API). GMS players use
MapleScouter in *manual entry* mode ("Enter Directly") on `/en/input`.

### Data it pulls

Client-side JS chunks reference `https://open.api.nexon.com` in 53 places — but only for
**static asset CDN paths**, `open.api.nexon.com/static/maplestory/item/icon/{hash}` and
`.../skill/icon/{hash}`. The actual character queries go through its own backend.

Its own backend is **`https://api.maplescouter.com`** (Express). It is live but gated:

```
GET https://api.maplescouter.com/          -> 200 "root page"
GET https://api.maplescouter.com/api/id?name=test
   -> 500 {"code":500,"message":"권한이 없습니다.","api":0}   # "no permission"
```

So **there is an API, but it is private/keyed. No public API for third parties.**
No source repo exists — the site is closed-source Next.js (App Router).

Route inventory extracted from the JS bundles (`/api/...` paths, all behind
`api.maplescouter.com`):

```
/api/calc/dmg              /api/calc/dmg-simulator     /api/calc/hunt-dmg-simulator
/api/calc/item-score       /api/calc/spec-order        /api/calc/starforce
/api/calc/hexa-order       /api/calc/hexa-preview      /api/calc/tax
/api/analysis              /api/analysis/class         /api/analysis/equipment
/api/analysis/equipment/top-scores                     /api/analysis/union
/api/archive/item-price    /api/archive/billboard      /api/id  /api/id/multi-search
/api/ranking (+ /battle /item /union /class-top10 /nickname)
/api/info/{preset,profile,seedring,title,ban,contributor,donation,met,user}
```

That list *is* the feature map: `calc/dmg`, `calc/item-score`, `calc/spec-order`
(spec-up order = "what to upgrade next"), `calc/starforce`, `analysis/equipment`.

### What the `/input` page asks for

The `/en/input` page is a Next.js App Router SPA but **server-renders its form**, so a
plain `curl` yields all the labels. Full field inventory:

**Header / identity**

- Level, Class (dropdown), **Liberation** (최초의 유산 / Genesis-liberation state),
  **Mugong Soul** (무공 소울)
- Preset save/recall ("Recall Saved Preset", "Save Preset"), Favorite/Edit
- Standard-condition declaration, which is the calibration baseline:
  - *"No Buffs, Link Equipped (No Stacks), Oz Ring Equipped"*
  - 소환수(ex, 솔 헤카테) On — summons on
  - (Decent) Combat Orders, Sharp Eyes On
  - Soul Gauge 0/1000
  - Familiars On
  - Class-specific: *"Maple Warrior, Ancient Warding, Elvish Blessing, 0 Stacks"*

**Stat block** — each entered as **Base Value / % Value / "% Value Not Applied"** (three
columns, matching the in-game stat-window hover decomposition):

```
STR, DEX (main/secondary per class)
Attack, M.Attack
General Range            (표기 공격력, the displayed range)
Damage, Final Damage
Boss Damage, Normal Enemy Damage
Ignore Enemy Defense
Critical Rate, Critical Damage
Cooldown Reduction (Second / %), Cooldown Skip
Buff Duration, Summon Duration
Ignore Elemental Resistance
Additional Status Damage
Arcane Force, Sacred Force
```

**Toggle sections**

- **Buffs** (~30 icons, "Select All") — the `doping_v2/*.png` assets name them:
  `bighero, buff300, champion, collector, dragonsmeal, extreme, fish, hero, jangbi,
  legendhero, moonshine, noblessboss, noblesscridam, noblessdam, noblessignore,
  rainbow, sayram, ...`
- **Links / Legion** (link-skill icons, incl. Wild Hunter Legion)
- **HEXA Enhancement**
- **Legion Artifact** (presets)
- **Special Inner Ability**: None / Passive Skills +1 / +1 Mob Targeted
- **Oz Ring**
- Buttons: Challenge Verification, Result, Reset, Hard Reset

**Design takeaway:** MapleScouter's input model is *derived stats*, not gear. It asks
for the numbers already aggregated in the character's stat window, then splits them
`base / % / not-applied`. Our screenshot importer should target the same three-way
split (see §6), because it makes the model class-agnostic.

### Full route list

From the nav of the SSR HTML:

```
/en/input  /en/multi-result
/en/boss-data  /en/dojo-data
/en/total-ranking  /en/union-ranking  /en/item-ranking  /en/battle-ranking
/en/ranking-analysis  /en/class-analysis  /en/hall-of-fame  /en/destiny-ranking
/en/hexa-preview  /en/hexpago  /en/lucid  /en/octopus
/en/challenge /en/challenge_2 /en/challenge_3 /en/timeattack /en/punchking-season3
/en/guide  /en/sitemap  /en/quick-link  /en/profile-motion  /en/donate
/en/game/{roulette,draw,ladder,spec-quiz,stop-watch,bulls-and-cows}
```

Korean-only nav additionally exposes: 효율∙보스컷 (Efficiency/Boss-cut),
파티 보스컷, 보스 세팅 최적화, 주간 보스 분석, 사냥컷 분석, 스펙업 순서 (Spec-Up
Order), 스타포스 효율, 잠재/추가옵션 효율, 심볼 효율, 레벨 시뮬레이터, plus a whole
family of simulators (강화/잠재능력/에디잠재/스타포스/환생의 불꽃/연마석/인게임).

### What it computes, and how

**환산 주스탯 ("converted main stat")** is the headline number. It is a
*marginal-substitution* metric: take your full expected boss damage and divide by the
per-point derivative of that damage w.r.t. main stat, i.e. *"how much raw main stat
alone would reproduce your entire expected damage."* That folds ATT, %DMG, %BD, crit
rate/damage, FD and IED into one comparable scalar.

The reference open implementation is `maplecompile/src/lib/scouter/calc.ts`
(<https://github.com/RonaldLiu2143/maplecompile>), read directly:

```
range        = (4*main + sec) * ATT / 100          // Xenon: (STR+DEX+LUK)*4 ; DA: HP/3.5
critMult     = (1 - CR) + CR * (1.35 + CD%)
iedMult      = max(0, 1 - PDR * (1 - IED))         // PDR presets 300% / 350% / 380%
expectedBoss = range * critMult * (1 + DMG% + BD%) * (1 + FD%) * iedMult * masteryAvg
convertedMain = expectedBoss / (∂expectedBoss/∂main)
```

Stat layering uses the in-game floor: `floor(Number((base*(1+pct/100)+flat).toFixed(10)))`.
IED stacks multiplicatively: `1 - (1-a)(1-b)`. It emits both `boss300Stat` and
`boss380Stat` — the same 환산 recomputed at 300% and 380% boss PDR — because different
bosses use different PDR.

**Item score** — this is the "what to upgrade next" primitive, and MapleScouter's own
FAQ (`/ko/guide`, extracted from the RSC payload) explains it exactly:

> "아이템 점수는 환산 11만급 유저들의 평균 아이템 세팅을 기준(100)으로 계산된 값입니다.
> 주스탯 10에 해당하는 스펙 차이당 1로 계산되며, 부위별로 기준을 잡기 때문에 서로 다른
> 부위 간의 점수 비교는 정확하지 않을 수 있습니다."

Translated: **item score is normalised so that the average gear setup of ~110,000-환산
players = 100 for that slot, and 1 point = 10 main stat of spec difference. The baseline
is per-slot, so scores are not directly comparable across slots.** A "better" item can
score lower because it is being judged against a stronger per-slot baseline.

Other FAQ facts worth knowing (same source):

- 환산 refreshes every **5–15 minutes**; relogging the character is the fastest refresh.
- The **Nexon Open API only serves data as of "1 day ago" (D-1)** — you cannot select
  today's date.
- **There is no inventory API**, so owned-but-unequipped seed rings are *estimated*
  from the equipped ring, or guessed from the player's spec bracket.
- **Xenon and Demon Avenger item scores are indefinitely postponed** because of the
  difficulty of a fair cross-class baseline. (Expect the same problem in our tool.)
- Overall ranking refreshes every 3–7 days.

### Boss suitability

`/en/boss-data` is **server-rendered** and contains the whole boss table as HTML. Columns:

```
보스 이름 | Level | Percent Damage Reduction (PDR) | 아케인 (Arcane Force req)
        | 어센틱 (Authentic/Sacred Force req) | 레벨 계수 (level coefficient)
        | 포스 계수 (force coefficient) | 레벨 포스 반감 (combined level+force reduction)
```

Real rows (as fetched, KMS content — GMS lags behind these):

| Boss | Lv | PDR | Arcane | Authentic | Lv coef | Force coef | Combined |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 하드 유피테르 (Hard Jupiter) | 295 | 380% | – | 810 | 0% | 5% | −100.00% |
| 하드 발드릭스 (Hard Baldrix) | 290 | 380% | – | 700 | 0% | 5% | −100.00% |
| 익스트림 대적자 (Extreme First Adversary) | 290 | 380% | – | 460 | 0% | 5% | −100.00% |
| 하드 림보 (Hard Limbo) | 285 | 380% | – | 500 | 13% | 5% | −99.58% |
| 익스트림 카링 (Extreme Kaling) | 285 | 380% | – | 480 | 13% | 5% | −99.58% |
| 익스트림 칼로스 (Extreme Kalos) | 285 | 380% | – | 440 | 13% | 5% | −99.58% |
| 하드 세렌 (Hard Seren) | 275 | 380% | – | 200 | 38% | 5% | −98.75% |
| 하드 검은마법사 (Hard Black Mage) | 275 | 300% | 1,320 | – | 38% | 10% | −96.88% |
| 하드 듄켈 (Hard Darknell) | 265 | 300% | 850 | – | 63% | 10% | −96.53% |
| 하드 진힐라 (Hard Verus Hilla) | 250 | 300% | 900 | – | 110% | 10% | −93.89% |
| 하드 윌 (Hard Will) | 250 | 300% | 760 | – | 110% | 10% | −93.89% |

(The "Lv coef / Force coef" columns are computed against the currently-loaded character —
the fetch above was rendered against a Lv.250 Adele sample, hence −100% at Jupiter.)

Boss **HP** is not in the SSR HTML; the page loads it on hover from the private API
("※ 보스 이미지에 커서를 올리면 보스 HP 정보를 확인할 수 있습니다").

### How boss suitability is actually computed

`maplecompile/src/lib/scouter/boss-cuts.ts` (1,695 lines) is an explicit
reverse-engineering of MapleScouter's model, and it is the single most valuable artifact
found in this research. Structure:

```ts
type BossCutEntry = {
  id; nameEn; nameKo; difficulty;      // Easy|Normal|Hard|Chaos|Extreme|Destiny|Champion
  bossCut: number | null;              // solo cut, in 환산 주스탯 units
  partyBossCut: number | null;         // party-boss cut
  easyRate: number;                    // e.g. 0.93024
  newbieCut: number; guard: 300 | 380; // guard = boss PDR
  level: number;                       // combat level for level-gap damage
  partyLimit: number;                  // 2 | 3 | 6
  arcaneForce: number; authenticForce: number;
};
```

Example real entries:

```json
{ "id":"jupiter","nameEn":"Jupiter","difficulty":"Hard","partyBossCut":125600,
  "easyRate":0.93024,"guard":380,"level":295,"partyLimit":3,"authenticForce":810 }
{ "id":"kaling","difficulty":"Extreme","partyBossCut":108350,"guard":380,
  "level":285,"partyLimit":6,"authenticForce":480 }
{ "id":"adversary","nameEn":"First Adversary","difficulty":"Extreme",
  "partyBossCut":113000,"guard":380,"level":290 }
```

Boss **entry levels** (character level required to enter):

```
lotus 190, damien 190, slime 210, lucid 220, will 235, gloom 245, verusHilla 250,
darknell 255, blackMage 255, seren 260, kalos 265, adversary 270, kai 270 (Hard 280),
kaling 275, maleficStar 280, limbo 285, bardrix 290, jupiter 295
```

The clear-rate math (`evaluateBossClears`):

```
I         = damage * arcaneGapMult * authenticGapMult * levelGapMult / forceDenom
E         = splineDamage(spline, bossCut)              // damage implied by the cut
z         = (I / E) * easyRate * regionScale
clearRate = z * (1 + G)                                // G = burst-window correction
```

- `regionScale = (kmsHp / targetHp) * (fightMinutes / 20)`. MapleScouter calibrates to a
  **20-minute KMS fight window**; GMS bosses have different HP and a **30-minute** window,
  so the repo carries both `hp` (GMS wiki) and `hpKms` totals per boss and rescales.
- `burstSlots = min(3, ceil(fightMinutes / z / 5.667))` — models 3 burst cycles.
- **Arcane Force gap multiplier** (step function on `userArc/bossArc * 100`):
  `<10% → 0.10, <30% → 0.30, <50% → 0.60, <70% → 0.70, <100% → 0.80, <110% → 1.00,
  <130% → 1.10, <150% → 1.30, else 1.50`
- **Authentic (Sacred) Force gap multiplier** (step function on `userAuth − bossAuth`):
  `< −90 → 0.05, −80 → 0.10, −70 → 0.20, −60 → 0.30, −50 → 0.40, −40 → 0.50, −30 → 0.60,
  −20 → 0.70, −10 → 0.80, <0 → 0.90, <+10 → 1.00, +10 → 1.05, +20 → 1.10, +30 → 1.15,
  +40 → 1.20, else 1.25` (cap 1.25)
- **Level gap multiplier**: `diff = clamp(floor(userLevel) − bossLevel, −40, +5)`, table
  lookup, cap **1.20** at +5 levels.
- Per-boss overrides: Kaling uses a separate HEXA damage figure; Maerin uses
  `0.95*hexa380 + 0.05*nonHexa380`; Hard Lucid uses `burstSlots = 0.4`.
- **Force block**: a boss is marked impossible if `userArcane + 50 < bossArcane` or
  `userAuthentic + 20 < bossAuthentic`.

The resulting `clearRate` is then bucketed into human labels — **this is precisely the
"can I solo this / do I need a party / am I getting carried" answer**:

Non-party boss, `partyLimit 6`:
```
>= 2.00  솔플 여유컷   "comfortable solo"
>= 1.10  솔플 가능     "solo possible"
>= 0.90  솔플 최소컷   "solo minimum cut"
>= 0.25  파티격 가능   "can contribute in a party"
>= 0.15  파티 최소컷   "party minimum"
else     불가능        impossible
```

Party boss, `partyLimit 6`: `>=5.1 solo, >=2.55 duo, >=1.7 trio, >=1.275 4-man, >=0.9 6-man`.
Party boss, `partyLimit 3`: `>=2.7 solo, >=1.35 duo, >=0.9 trio`.

There is also a "newbie mode" ladder (`[뉴비] 여유컷 / 솔플 / 2인 / 4인 / 6인`) and a
relevance filter that hides bosses where `clearRate > 10` or far below range.

**Bottom line for us:** MapleScouter's boss recommendation = *(your converted damage,
adjusted for level gap and force gap) ÷ (a hand-calibrated per-boss "cut" expressed in
환산 units), rescaled for the region's boss HP and fight-timer.* We can reimplement this
directly; the cut values, HP totals and force requirements are all available in the
maplecompile JSON.

### "What to upgrade next"

Two mechanisms, and they are different:

1. **Item score** (per-slot, baseline-normalised, described above) — a diagnostic:
   "your gloves are behind your peers."
2. **스펙업 순서 / Spec-Up Order** (`/api/calc/spec-order`, plus dedicated
   스타포스 효율 / 잠재·추가옵션 효율 / 심볼 효율 pages) — a true efficiency ranking.

The open equivalent, `maplecompile/src/lib/planner/rank.ts`, is explicit:

```
base       = calculateScouter(input).expectedBoss
next       = calculateScouter(applyStatDelta(input, delta)).expectedBoss
fdPercent  = (next / base - 1) * 100
efficiency = fdPercent / (mesoCost / 1e9)          // "FD% per billion meso"
```

Candidates are generated per equip piece for **starforce**, **flame** and **cube**
upgrades (`planner/candidates.ts`), each carrying a `delta` (stat change) and a
`mesoCost`, then sorted by `fdPerBillionMeso`. **This is the model to copy.** It is
better than item-score for our purpose because it is cost-aware and directly actionable.

---

## 2. Official and semi-official APIs

### Nexon Open API — <https://openapi.nexon.com>

**Regions with a MapleStory character API (verified by probing the game pages):**

| Path | HTTP | Region |
| --- | --- | --- |
| `/game/maplestory/` | 200 | **KMS** (Korea) |
| `/game/maplestorysea/` | 200 | **MSEA** |
| `/game/maplestorym/` | 200 | MapleStory M |
| `/game/maplestorytw/` | 200 | **TMS** (Taiwan) |
| `/game/maplestoryglobal/` | 307 → `/game` | does not exist |
| `/game/maplestorygms/` | 307 → `/game` | does not exist |
| `/game/maplestoryjp/` | 307 → `/game` | does not exist |

Corroborated by the region badges in SpiralMoon's official-adjacent client library
<https://github.com/SpiralMoon/maplestory.openapi> (MIT): **KMS ✅, MSEA ✅, TMS ✅,
GMS ❌, JMS ❌, CMS ❌.** README: *"This library can only retrieve data from the service
regions supported by the Nexon Open API."*

**Answer to the core question: as of September 2026 there is NO official Nexon API for
GMS characters, gear, or stats.** Nothing in the Nexon Open API notices indicates a GMS
rollout. (MapleSEA's <http://www.maplesea.com/news/view/SEA_OpenAPI/> documents the
MSEA rollout; nothing equivalent exists for GMS.) *"MapleStory Universe Open API"*
(<https://medium.com/maplestory-universe/announcement-maplestory-universe-open-api-release-v1rc1-a1f78d6e6af9>,
keys from 2025-09-11) is the blockchain/MSU product — **not** GMS live-server data.

KMS endpoint families (from the docs nav at `/game/maplestory/`):
캐릭터 정보 조회 (character), 유니온 정보 조회 (union), 길드 정보 조회 (guild),
연무장 정보 조회 (Mu Lung Dojo), 확률 정보 조회 (probability), 스케줄러 정보 조회,
랭킹 정보 조회 (ranking), 공지 정보 조회 (notices). Plus
`/maplestory/v1/character/list`, `/maplestory/v1/history/{cube,potential,starforce}`,
`/maplestory/v1/user/trade`.

The one that matters to us is **`/maplestory/v1/character/item-equipment`**, whose
response shape we should adopt wholesale (details in §6).

Constraints (from MapleScouter's own FAQ): data is only available up to **D-1**, and
there is **no inventory endpoint** — only equipped items.

### Nexon's public GMS rankings API — the only GMS endpoint that exists

> **Verified live 2026-09-06** against a real character:
> `GET https://www.nexon.com/api/maplestory/no-auth/ranking/v2/na?type=overall&id=weekly&character_name=<IGN>&page_index=1`
> returns `{characterName, level, exp, gap, rank, worldID, jobName, characterImgURL,
> legionLevel, raidPower, tierID, score}`.
>
> `jobName` is populated and useful (e.g. `"Ren"`). **`legionLevel`, `raidPower`,
> `tierID`, `score` and `characterID` are always 0** — the fields exist in the schema
> but Nexon never fills them. There is no gear, stat or Combat Power data of any kind.
> This confirms screenshots as the only equipment-import channel for GMS.
>
> **worldID mapping** (undocumented; build it up by observation):
>
> | worldID | World |
> |---|---|
> | 45 | Kronos (Heroic) |
>
> The rankings web page is a client-rendered shell (~3.7 KB) and carries no world
> table, so the mapping cannot be scraped from it.

Undocumented but public, no key, no auth:

```
GET https://www.nexon.com/api/maplestory/no-auth/ranking/v2/{region}
      ?type=overall&id=weekly&reboot_index=0&page_index=1
      [&character_name=<IGN>]
region = na | eu
```

Verified live:

```jsonc
// .../v2/na?type=overall&id=weekly&reboot_index=0&page_index=1&character_name=Keishmer
{
  "totalCount": 1,
  "ranks": [{
    "characterID": 0,
    "characterName": "Keishmer",
    "exp": 746310293003533,
    "gap": 755742434817856,
    "level": 299,
    "rank": 2,
    "startRank": 0,
    "characterImgURL": "https://msavatar1.nexon.net/Character/BNMHNFGG…png",
    "jobName": "Buccaneer",
    "worldID": 1,
    "isSearchTarget": true,
    "legionLevel": 0,
    "raidPower": 0,
    "tierID": 0,
    "score": 0
  }]
}
```

Notes:

- `totalCount` for the unfiltered NA overall ranking was **16,586,917**; EU **1,380,513**.
- `character_name=` performs an exact-name lookup and returns that one row — this is a
  free GMS character-existence + level + class + world + avatar-render lookup.
- `legionLevel`, `raidPower`, `tierID`, `score` are present in the schema but **0** on
  the `type=overall` list. `type=legion|union|guild|raid-power` all return
  `{"totalCount":0,"ranks":[]}` on the paths tried — the correct `type`/`id` combination
  for those was not found. **[unverified]** whether raidPower/legion are retrievable.
- **No gear, no stats, no potentials.** Level/class/world/legion at best.
- **Rate limited hard.** Per <https://github.com/ebenitez1/maplestory-level-stats>
  (daily GMS rankings scraper, GitHub Actions matrix, one runner per class specifically
  to spread IPs): ~800 successful requests triggers a **persistent per-IP HTTP 403**;
  below that threshold Nexon sometimes returns 200 with an empty `ranks` array, so use
  `totalCount` to distinguish "empty page" from "end of data".

`maplestory.nexon.net/rankings/...` and `maplestory.nexon.net/api/ranking/...` both
302'd for us; `www.nexon.com/api/...` is the live path.

### MapleStory Network — <https://maplestory.net>, API at `https://api.maplestory.net`

An **unofficial** community platform (per <https://maplestory.net/about>) with OAuth 2.0
apps and personal access tokens. Its docs SPA (`/develop`, `/develop/documentation`)
renders client-side and could not be read; `develop.maplestory.net` **does not resolve**
(NXDOMAIN) despite being indexed.

But the API itself is live, **unauthenticated for read**, and has a Swagger spec:

```
GET https://api.maplestory.net/swagger.json     # reitit/Clojure, 20 paths
GET https://api.maplestory.net/version/default  # {"version":232,"subversion":1,"locale":0}
```

Endpoints:

```
GET /version/default
GET /image/{path1}/{path2}/{path3}/{path4}/{img}
GET /items/            ?nameText&name&category&categoryText&subcategory&overallCategory
                        &minLevel&maxLevel&cash&gender&sortBy&page&maxEntries
                        &version&subversion&locale
GET /item/{id}   /item/{id}/icon   /item/{id}/iconRaw   /item/{id}/rawData
GET /monsters/         ?boss&minLevel&maxLevel&nameText&sortBy(±level|±name)&page
GET /monster/{id}  /monster/{id}/rawData  /monster/{id}/icon
GET /faces  /face/{id}  /face/{id}/icon
GET /hairs  /hair/{id}  /hair/{id}/icon
POST /character/render
GET /user/{id}/profile   PATCH /user/{id}/profile   GET /profiles
```

The item schema is **much cleaner than raw WZ** — human-named keys, not `incSTR`:

```jsonc
// GET /item/1212063
{ "name":"Fafnir Mana Cradle","itemId":1212063,
  "overallCategory":"Equip","category":"One-Handed Weapon","subcategory":"Shining Rod",
  "requiredStats":{"level":150,"gender":"any","jobTrees":["magician"],
                   "str":0,"dex":0,"int":450,"luk":0},
  "stats":{"int":40,"luk":40,"attack":119,"magicAttack":201,"accuracy":120,
           "bossRate":30,"ignoreDefense":10,"charm":100},
  "availability":{"cash":false,"tradeable":false,"tradesAvailable":2,"exclusive":true,
                  "superior":false,"bossDrop":true,"shopPrice":1,"durability":false},
  "version":{"version":232,"subversion":1,"locale":0} }
```

`GET /items/?nameText=Arcane%20Umbra` returns Arcane Umbra Knight/Mage/Archer Hats
(`1004808/1004809/1004810`, reqLevel 200, `str/dex 65`, `defense 600`,
`ignoreDefense 15`, `charm 200`) — so **level-200 endgame gear is present**.

**Critical limitation: it is frozen at version 232 only.**
`?version=245` / `?version=250` → `404 OBJECT_NOT_FOUND`. Consequently
`nameText=Whisper of the Source` returns `[]`, and "Eternal" only matches old cash items
— **no Eternal (Genesis-era) armor, no post-v232 Pitched accessories.** GMS v232 is
roughly late 2022.

Monster data is also of limited use for bossing: `GET /monster/8880000` (Magnus) returns
`maxHp: 2000000000` — the WZ 32-bit cap, not the real modern boss HP — and `defense: 120`
is flat physical DEF, **not** the PDR% our damage formula needs.

**Verdict:** good as a *supplementary* item catalogue with a nice schema and free icons,
useless for post-2022 gear and for boss HP.

### Community character sites

| Site | Status (2026-09-06) | Data |
| --- | --- | --- |
| <https://mapleranks.com/> | live; **403s automated fetches** (Cloudflare) | GMS character pages: level, class, world, legion, avatar, level history. No gear. |
| <https://maplestory.gg/> and `api.maplestory.gg` | **HTTP 522** on every attempt (Cloudflare origin timeout) — down at time of research | GMS ranking scrape; per prior art, no gear data |
| <https://maple.gg/> | live | KMS/MSEA, consumes Nexon Open API |

Both mapleranks and maplestory.gg ultimately derive from the same
`www.nexon.com/api/maplestory/no-auth/ranking/v2/*` endpoint we can call directly.

### Nexon's official probability pages (KMS) — useful and machine-readable

`https://maplestory.nexon.com/Guide/OtherProbability/cube/{red|black|master|…}` publishes
the legally-mandated cube probability tables: Red Cube tier-up
**6.0000002444% / 1.8000% / 0.3000%**, pity counters **25 / 83 / 500**, line-tier rates
(1st line 100% at item tier; 2nd 10%/90%; 3rd 1%/99%), and the mutual-exclusion rules
with renormalisation `p / (100% − Σ excluded)`. Fetchable with `curl` + a browser UA
(WebFetch is 403'd). MathBro's repo ships a scraper for exactly this (§4).

---

## 3. Item / equipment databases

### 3.1 `masonym/masonym.dev` `public/equip-data/` — fastest path to a working prototype

*(Read §3.2 first for the authoritative source. This one is smaller and already curated
for GMS, which makes it the best thing to build against on day one.)*


Four static JSON files, no auth, no rate limit, served from raw.githubusercontent:

```
https://raw.githubusercontent.com/masonym/masonym.dev/HEAD/public/equip-data/meta.json
                                                             .../items.json       1.14 MB
                                                             .../sets.json         68 KB
                                                             .../potentials.json  171 KB
```

`meta.json` (fetched verbatim):

```jsonc
{ "generatedAt":"2026-08-09T08:11:10.534Z", "region":"GMS", "minItemLevel":100,
  "counts":{"items":4917,"notableItems":2874,"duplicatesRemoved":245,
            "potentials":623,"sets":177},
  "slots":{ "Cp":{"label":"Hat","occupies":["hat"]},
            "MaPn":{"label":"Overall","occupies":["top","bottom"]},
            "WpSi":{"label":"Weapon (2H)","occupies":["weapon","secondary"]},
            "Ht":{"label":"Heart","occupies":["heart"]}, … 22 slots },
  "slotCounts":{"Wp":1976,"WpSi":498,"Si":510,"Me":307,"Cp":206,"Gv":185,"Ri":180,
                "So":170,"MaPn":162,"Sr":124,"Be":96,"Sh":93,"Pe":90,"Ae":63,"Af":62,
                "Ba":45,"Em":43,"Ma":29,"Pn":28,"Ay":20,"Po":20,"Ht":10},
  "multiplicativeStats":["ied"],
  "optionTypeSlots":{"10":["Wp","WpSi","Si"],
                     "11":["Cp","Ma","Pn","MaPn","So","Gv","Sr","Sh"],
                     "40":["Af","Ay","Ae","Pe","Ri","Be","Tm"],
                     "51":["Cp"],"52":["Ma","MaPn"],"53":["Pn","MaPn"],
                     "54":["Gv"],"55":["So"]} }
```

**It is explicitly `"region":"GMS"` and regenerated 2026-08-09**, which no other source
can claim. Item shape:

```jsonc
{"id":1005980,"name":"Eternal Knight Helm","slot":"Cp","reqLevel":250,
 "stats":{"str":80,"dex":80,"def":750,"att":10,"ied":15},
 "icon":"Cap/1005980.png","setId":886,"tuc":12,"reqJob":1,
 "bossDrop":true,"category":"Cap","notable":true}
```

`tuc` = upgrade (scroll) slots, `setId` joins to `sets.json`, `notable` flags the
progression-relevant subset (2,874 of 4,917), `attackSpeed` on weapons,
`exceptionalSlots` + `exceptional` on Pitched accessories.

**All the endgame gear the project needs is present** (verified by direct lookup):

| Item | id | reqLevel | slot | setId | key stats |
| --- | --- | --- | --- | --- | --- |
| Eternal Knight Helm | 1005980 | 250 | Cp | 886 | str/dex 80, def 750, att 10, ied 15 |
| Arcane Umbra Knight Hat | 1004808 | 200 | Cp | 617 | str/dex 65, def 600, att 7, ied 15 |
| Whisper of the Source | 1113341 | 250 | Ri | 1055 | all 10, att/matt 5, hp/mp 500 |
| Dreamy Belt | 1132308 | 200 | Be | 677 | all 50, att/matt 6, exceptionalSlots 1 |
| Commanding Force Earring | 1032316 | 200 | Ae | 677 | all 7, att/matt 5, hp/mp 500 |
| Source of Suffering | 1122430 | 160 | Pe | 677 | all 10, att/matt 3, hpP 5 |
| Berserked | 1012632 | 160 | Af | 677 | all 10, att/matt 10 |
| Loveless Dead End | 1212044 | 135 | Wp | 126 | matt 174, int 38, attackSpeed 6 |

("Grindstone" is not present under that name — check the in-game GMS name before
concluding it's missing.)

**`sets.json` — 177 sets with per-count effect tables.** This directly answers the set-bonus
question:

```jsonc
{"id":677,"name":"Pitched Boss Set",
 "members":[1012632,1022278,1032316,1113306,1122430,1132308,1162080,…,1672095],
 "effects":{
   "2":{"allStat":10,"hp":250,"boss":10},
   "3":{"allStat":10,"hp":250,"def":250,"ied":10},
   "4":{"allStat":15,"hp":375,"critDmg":5},
   "5":{"allStat":15,"hp":375,"boss":10},
   "6":{"allStat":15,"hp":375,"ied":10},
   "7":{"allStat":15,"hp":375,"critDmg":5},
   "8":{"allStat":15,"hp":375,"boss":10},
   "9":{"allStat":15,"hp":375,"critDmg":5},
   "10":{"allStat":20,"hp":500,"boss":10}},
 "perPiece":{"allStat":13,"hp":325,"boss":4,"def":25,"ied":2,"critDmg":1.5}}

{"id":617,"name":"Arcane Umbra Set (Warrior)",
 "effects":{"2":{"att":30,"matt":30,"boss":10},
            "3":{"att":30,"matt":30,"def":400,"ied":10},
            "4":{"att":35,"matt":35,"allStat":50,"boss":10},
            "5":{"hp":2000,"mp":2000,"att":40,"matt":40,"boss":10},
            "6":{"att":30,"matt":30},
            "7":{"att":30,"matt":30,"ied":10}}}

{"id":886,"name":"Eternal Set (Warrior)",
 "effects":{"2":{"att":40,"matt":40,"hp":2500,"mp":2500,"boss":10},
            "3":{"att":40,"matt":40,"allStat":50,"def":600,"boss":10},
            "4":{"att":40,"matt":40,"boss":10},
            "5":{"att":40,"matt":40,"ied":20}, …}}
```

The `perPiece` field is a precomputed marginal value per set piece — exactly what an
upgrade-ranker wants when evaluating "is one more set piece worth it".

**`potentials.json` — 623 potential option definitions with per-tier values:**

```jsonc
{"id":1,"grade":0,"gradeName":"legacy","kind":"regular","desc":"STR: +#incSTR",
 "tiers":[{"from":1,"stats":{"str":1}},{"from":3,"stats":{"str":2}},
          {"from":5,"stats":{"str":3}},{"from":6,"stats":{"str":4}},
          {"from":8,"stats":{"str":5}},{"from":10,"stats":{"str":6}}]}
```

with `kind` distinguishing regular vs bonus potential, and `optionTypeSlots` in
`meta.json` mapping WZ option-type codes to slot groups — enough to model which lines can
roll on which slot.

**Caveat: the repo has no LICENSE.** The data is factual game data (safe to re-encode);
the surrounding code is not. Pin a commit SHA; regenerate/verify rather than blindly
tracking `HEAD`.

### 3.2 maplestory.io — **live, current (GMS v270), and the most complete source**

<https://maplestory.io/api> — the long-standing community asset/data API.
Source: <https://github.com/crrio/maplestory.io> (C#, 26★, **no license**, frozen 2022 —
the live API has since diverged); earlier mirrors `telunc/maplestory.io` (MIT, 2019),
`Keerkeer/maplestory.io-node`. Extraction pipeline is
<https://github.com/Xterminatorz/WZ-Dumper> (62★, MIT, pushed 2026-05-30).

**Status: live.** `GET https://maplestory.io/api/wz` → 200 in ~73 ms, behind Cloudflare,
`access-control-allow-origin: *` (browser-usable), `cache-control: max-age=86400`.

#### Regions and versions

`/api/wz` returns **629 version records** as `{isReady, hasImages, mapleVersionId, region}`.
Counts: **GMS 239 (max `270`)**, KMS 95 (max 389), KMST 84, CMS 55, JMS 53, SEA 47,
TWMS 31, CMST 12, EMS 7, plus TMS/VMS/THMS/MCW.

- **There is no `latest` alias.** `/api/GMS/latest/item/1212063` → **404**; `GMS/271`,
  `GMS/275` → **500**. Enumerate `/api/wz`, filter `region == "GMS"`, take the max.
- GMS version IDs are sparse: 253 → 255 → 263 → 270.
- **v270 is genuinely current.** Equip counts: v255 = 51,800; v263 = 55,205;
  **v270 = 58,762**. v270 contains `1007025 Baldrix Helmet`, `1143455 Serpentine
  Swordsman`, `2539003 Grindstone of Faith`, `2639252 Trace of Eternal Loyalty` — i.e.
  NEXT/Assemble-era content.
- ⚠️ Version availability differs **per endpoint**: the *mob* endpoint only answered on
  GMS 253/255 during testing (264–270 → 404), while the *item* endpoints work fine at
  270. Probe each endpoint family separately.

#### Item endpoints (all verified live)

```
GET /api/{region}/{version}/item
      ?startPosition&count&overallCategoryFilter&categoryFilter&subCategoryFilter
      &jobFilter&cashFilter&minLevelFilter&maxLevelFilter&genderFilter&searchFor
GET /api/GMS/270/item/{id}          # full doc {frameBooks, equipGroup, id, description,
                                    #           metaInfo, typeInfo}, avg ~32 KB
GET /api/GMS/270/item/{id}/name     # {"id":1005980,"name":"Eternal Knight Helm",...}
GET /api/GMS/270/item/{id}/icon     # image/png, supports ?resize=4
GET /api/GMS/270/item/{id}/iconRaw
GET /api/GMS/270/item/category      # slot → ID-range table
GET /api/GMS/270/mob?searchFor=Lucid    /mob/{id}  /mob/{id}/icon  /mob/{id}/render/{fb}
GET /api/GMS/270/map/100000000
```

`?overallCategoryFilter=Equip` returns **21.4 MB / 58,762 rows in one request**.
`minLevelFilter=200` → 515 equips; `=140` → 1,724.
`/item/bulk/{ids}` exists in the repo source but **404s live**. `/swagger/index.html`
loads but its spec 404s — no machine-readable docs.

`metaInfo` shape (real response, `1212063` Fafnir Mana Cradle, GMS/270):

```json
{"only":false,"cash":false,"reqLevel":150,"reqJob":2,"reqLevelEquip":150,"tuc":9,
 "incINT":40,"incLUK":40,"incPAD":119,"incMAD":201,"incACC":120,"equipTradeBlock":true,
 "charmEXP":100,"tradeAvailable":2,"attack":6,"attackSpeed":6,"bdR":30,
 "bossReward":true,"imdR":10,"vslots":["Wp"],"islots":["Wp"],"setCompleteCount":0}
```

Full key union across all level-140+ equips: `accountSharable, androidGrade, attack,
attackSpeed, bdR, bossReward, cash, charismaEXP, charmEXP, equipTradeBlock, exItem, imdR,
incACC, incCraft, incDEX, incEVA, incINT, incJump, incLUK, incMAD, incMDD, incMHP, incMMP,
incPAD, incPDD, incSTR, incSpeed, islots, mob, notSale, only, price, reqDEX, reqINT,
reqJob, reqJob2, reqLUK, reqLevel, reqLevelEquip, reqPOP, reqSTR, reqSpecJob,
setCompleteCount, slotMax, superiorEqp, tradeAvailable, tradeBlock, tuc, unchangeable,
vslots, willEXP`.

**Gap: `metaInfo` strips `setItemID`.** Raw WZ `info` for `01212129` has 34 children
(`setItemID, exceptUpgrade, noDrop, onlyEquip, jokerToSetItem, undecomposable`, …); the
API surfaces only 24. Work around it via the raw-WZ endpoint below or via mapledoro (§3.3).

**All modern endgame gear is present in GMS/270** (verified by `searchFor`): Arcane Umbra
(shoulders `1152196–1152200`, Spear `1432218`), Eternal Knight Helm `1005980` (L250),
Genesis Shining Rod `1212129`, AbsoLab `1152174+`, CRA/Root Abyss (`1004234` Royal Von
Leon), Superior Gollux Ring `1113075` / Earrings `1032223`, Berserked `1012632`, Loveless
weapons `1212044+`, Dreamy Belt `1132308`, Source of Suffering `1122430`, Commanding Force
Earring `1032316`, Endless Terror `1113306`, Whisper of the Source `1113341` (L250),
Mitra's Rage `1190555–1190559`, Papulatus Mark `1022277`, Sweetwater, Dominator Pendant.

Spot-check `1432218` Arcane Umbra Spear: `incSTR 100, incDEX 100, incPAD 295, bdR 30,
imdR 20, tuc 9, reqLevel 200` — matches
<https://maplestorywiki.net/w/Arcane_Umbra_Spear>. Two known WZ-vs-in-game deltas:
the wiki says GMS scroll slots = 10 vs WZ `tuc` 9 (**in-game slots = `tuc` + 1**), and the
wiki's `attackSpeed 4` is the *displayed* speed vs raw WZ `6`.

#### The raw-WZ endpoint — the real unlock

```
GET /api/wz/{region}/{version}/{*path}
```

exposes the entire WZ tree as JSON. Root children: `Character, Mob, Npc, Map, Quest, Item,
Reactor, UI, Etc, Sound, Skill, TamingMob, String, Effect, Morph, Base`.

**Set effects — `Etc/SetItemInfo.img` (872 sets):**

```jsonc
// /api/wz/GMS/270/Etc/SetItemInfo.img/617
{"completeCount":7,"setItemName":"Arcane Umbra Set (Warrior)",
 "Effect":{"2":{"incPAD":30,"incMAD":30},
           "3":{"incPAD":30,"incMAD":30,"incPDD":400},
           "4":{"incAllStat":50,"incPAD":35,"incMAD":35},
           "5":{"incPAD":40,"incMAD":40,"incMHP":2000,"incMMP":2000},
           "6":{"incPAD":30,"incMAD":30,"incMHPr":30,"incMMPr":30}, "7":{…}},
 "ItemID":{"1":1004808,"15":1152196,…}}
```

Verified set IDs: **617–621** Arcane Umbra, **886–890** Eternal, **504–508** AbsoLab,
**247–251** Root Abyss, **462** Boss Accessory Set (completeCount 19, 36 members),
**677** Pitched Boss Set (completeCount 11, 19 members incl. 1012632 / 1122430 / 1182285 /
1032316 / 1113306 / 1190555–9 / 1132308), **315–318** Gollux, **869** Dawn Boss Set,
**1055** Brilliant Boss Set.

Set-effect `Option` nodes resolve into `Item/ItemOption.img/{option zero-padded to 6}/level/{n}`
— e.g. Pitched Boss 3-set `{"option":60023,"level":13}` →
`Item/ItemOption.img/060023/level/13` = `{"ignoreTargetDEF":10}`, with
`info.string = "Ignore Defense +#ignoreTargetDEF%"`.

Other useful nodes:

- **`Item/ItemOption.img`** — 743 potential option IDs, each with an `info.string`
  template and `level/1..25` values.
- **`Etc/potentialCostTable.img`** — `additionalPotential/{rare,epic,unique,legendary}`.
- **`Etc/starStatic.img`** — statistics, *not* the enhancement rate table.
- **`setItemID`** per item via
  `Character/{Cap,Coat,Longcoat,Pants,Shoes,Glove,Cape,Shield,Ring,Accessory,Weapon}/0{id}.img/info/setItemID`.
  Easier: invert `SetItemInfo.img/{id}/ItemID` — **872 sets → 5,452 memberships in 9.8 s**.
- `/api/wz/export/...` returns empty 22-byte zips — dead.

#### Rate limits, throughput, legal

**No rate limiting observed.** 30 sequential → all 200; 61 requests at 20-way parallelism
→ all 200; 872 concurrent set-name fetches (16 threads) in 11 s. At 8 threads:
**36.7 full item docs/s**, 515/515 and 1,724/1,724 with zero failures. **At 24 threads,
`IncompleteRead` truncation appeared on large item docs — cap concurrency at ~8–12.**
A full 58,762-equip `metaInfo` crawl takes **≈27 minutes**.

No API key, no auth, no published rate-limit policy. The site
[disclaims](https://maplestory.io/) that all assets are "the sole property of NEXON";
it is funded via Patreon/Ko-fi. **Be polite: cache aggressively by version ID, never
re-crawl per user request.**

### 3.3 Bulk pre-extracted JSON (skip the 27-minute crawl)

- **`chablades/mapledoro`** — <https://github.com/chablades/mapledoro> — 3★, pushed
  2026-09-06, **no LICENSE**. `manifests/v270/item-stats.json` (6.3 MB) =
  **69,418 entries including `setItemID`**, which maplestory.io omits. Verified
  byte-identical to maplestory.io v270:
  `01005980 → {islot:"Cp", reqLevel:250, incSTR:80, incDEX:80, incPAD:10, incPDD:750,
  imdR:15, tuc:12, setItemID:886}`. Also ships `set.json` (872 sets) and `item.json`
  (30 MB, English names). Its `_meta` warns: *"tuc is RAW: in-game upgrade slots equal
  tuc plus 1."* Fetch from raw.githubusercontent (mapledoro.com's own `/manifests/`
  404s). **Pin a commit SHA — no license.**
- **`simaple-team/simaple`** — <https://github.com/simaple-team/simaple> — 36★, **MIT**
  (the only cleanly licensed dump found). `gear_data.json` = 9,254 gears with normalised
  keys; `set_item.json` = 549 sets. Korean names.
- **`MrReds1324/maplestory_builder`** — <https://github.com/MrReds1324/maplestory_builder>
  — has exactly the derived tables nobody else publishes: `starforce_stats.dart`,
  `flame_stats.dart`, `potential_stats.dart`, `set_effect_stats.dart`,
  `pitched_boss_upgrades.dart`, with **English GMS naming**.
- **`Bratah123/ElectronMS`** — a v316 KMS server that actually ships WZ XML:
  `Item.wz/ItemOption.img.xml` (960 KB), `Etc.wz/SetItemInfo.img.xml` (437 KB),
  36,654 `Character.wz` files. Korean strings.

### 3.4 `api.maplestory.net` (MapleStory Network)

Covered in detail in §2. Clean normalised item schema (`requiredStats`, `stats`,
`availability`, `jobTrees`), free and unauthenticated, Swagger at `/swagger.json` —
**but frozen at version 232 only** (~late 2022), so it has Arcane Umbra and AbsoLab but
**no Eternal armor and no post-v232 Pitched accessories**. Useful as a schema reference
and a cross-check for pre-2023 gear; not a primary source.

### 3.5 WZ extraction tooling (if we ever need to regenerate ground truth)

- **WzComparerR2** (Kagamia) — <https://github.com/Kagamia/WzComparerR2> — 609★, **MIT**.
  The tool most Korean/Chinese data sites use; renders in-game-accurate tooltips and can
  dump item/set/potential tables.
- **HaRepacker / HaCreator / MapleLib** —
  <https://github.com/lastbattle/Harepacker-resurrected> (63★, **GPL-3.0**) — the standard
  C# WZ editor/extractor. `Xterminatorz/MapleLib` (MIT) is archived.
- **`Xterminatorz/WZ-Dumper`** — <https://github.com/Xterminatorz/WZ-Dumper> — 62★, MIT,
  pushed 2026-05-30. This is the pipeline behind maplestory.io.
- **Dead for modern gear:** HeavenMS (archived 2019, v83, ships no WZ), Cosmic / Swordie /
  Solaxia forks (v83), orion-server (v90), TWMS_134, gms-232 (stub Data.wz only).

### 3.6 Wikis and other DBs (for what WZ does not contain)

- **MapleStory Wiki** <https://maplestorywiki.net/> — MediaWiki 1.45.4, `api.php` → 200.
  `action=parse&prop=wikitext` returns clean `{{Equipment}}` templates carrying the WZ
  item ID in an HTML comment, plus `starForceEnhancements`, **GMS-specific**
  `scrollEnhancements`, and `set=` links. The `Star Force Enhancement` page (40 KB
  wikitext) has the full max-star / success / destroy-rate / stat tables.
  ⚠️ The structured `action=bucket` API is Cloudflare-Turnstile-gated for scripts
  (`action=parse` and `action=query` are not). **License: CC BY-NC-SA 3.0 —
  noncommercial.**
- **StrategyWiki** <https://strategywiki.org/wiki/MapleStory/Bonus_Stats> — flame /
  bonus-stat tables, MediaWiki API 200 (45 KB wikitext), CC BY-SA.
- **maplestory.fandom.com** — API 200; set-effect pages are hand-written. Cross-check only.
- **Grandis Library** <https://grandislibrary.com/> — excellent human-readable equip and
  upgrade guides (<https://grandislibrary.com/content/upgrading-enhancing-equipment>), but
  prose. Its repos ship 3 JSON files, none of them equipment.
- **Verified dead ends:** maplestory.gg → **522**; bbb.hidden-street.net → **403**
  Cloudflare challenge; maplestorydb.com → only `/tools/tip/qtip.php` returning encrypted
  blobs; meowdb.com/msclassic → Classic server only; namu.wiki → 403.
- **Nexon Open API** has **no item reference catalog** at all — only per-character and
  ranking endpoints, and no GMS (§2).

### 3.7 Recommendation

1. **maplestory.io `/api/wz/GMS/270/…` (raw WZ) + `/api/GMS/270/item/…`** — primary.
   The only source that is simultaneously current (v270), complete (all Pitched / Eternal /
   Genesis gear), and programmatic. Use `/api/wz/…/Etc/SetItemInfo.img` for set effects and
   membership, `/Item/ItemOption.img` for potentials, `/item/{id}` for base stats, and
   `/item/{id}/icon` for icons.
2. **`chablades/mapledoro` `manifests/v270/`** — pull once as a seed and diff oracle;
   it gives `setItemID` inline plus English names for free, and was verified to agree
   exactly with maplestory.io v270. Pin a commit SHA (no license).
3. **`masonym.dev/public/equip-data/*.json`** — a smaller, already-curated GMS view
   (4,917 items, `notable` flag, set `perPiece` marginals, potential tier tables). Fastest
   path to a working prototype; use #1/#2 when it proves too narrow.
4. **maplestorywiki.net MediaWiki API** — override/verification layer for star force
   tables, GMS-vs-KMS scroll-slot deltas, and drop sources. **NC license** — fine for a
   personal tool, a problem if this ever becomes commercial.
5. **`simaple-team/simaple` (MIT)** and **`MrReds1324/maplestory_builder`** — license-safe
   fallback, plus the derived starforce/flame/potential/set tables nobody else publishes.
6. **`api.maplestory.net`** — secondary schema reference for pre-2023 items only.

**Build plan:** enumerate `/api/wz` → take max GMS version → one
`GET /item?overallCategoryFilter=Equip` call (21 MB) → crawl `metaInfo` at 8 threads
(~27 min) → crawl `Etc/SetItemInfo.img` (~10 s for membership, ~4 min for full effects) →
join on `setItemID`. Cache by version ID; re-run only when a new GMS version appears in
`/api/wz`. Remember **in-game upgrade slots = `tuc` + 1**.

---

## 4. Open-source calculators and reusable formula code

Ranked by usefulness to a TS/JS (or Rust) tracker that computes damage from gear and
suggests the next upgrade.

### 4.1 `RonaldLiu2143/maplecompile` — the single most valuable repo

<https://github.com/RonaldLiu2143/maplecompile> · live at <https://maplecompile.vercel.app>
· TypeScript / Next.js · **no LICENSE file (all rights reserved)** · 0★ · last push
**2026-09-05**, active daily.

This is essentially our project, already written in TypeScript, for GMS. `src/lib/`:

| File | Size | Contents |
| --- | --- | --- |
| `scouter/calc.ts` | 11 KB | damage model + 환산 주스탯 derivation (quoted in §1) |
| `scouter/combat-power.ts` | 1.8 KB | KMS 전투력 formula |
| `scouter/weapon-constant.ts` | – | per-class weapon constants (~55 GMS classes) |
| `scouter/class-fd.ts` | 5 KB | per-class base Final Damage table |
| `scouter/boss-cuts.ts` | **42 KB** | boss cut standards + full clear-rate math (§1) |
| `scouter/boss-info-data.json` | **64 KB** | boss HP per phase (KMS **and** GMS), crystal meso, drop tables |
| `scouter/buffs.ts` | 14 KB | buff/doping definitions |
| `scouter/{from,to}-maplescouter-preset.ts` | 13 KB | **import/export of MapleScouter presets** |
| `scouter/share.ts` | 34 KB | build sharing |
| `flames.ts` | 21 KB | flame tier value *generator* (not a hardcoded table) |
| `cubing/cubeRates.json` | **1.36 MB** | per-slot/per-cube/per-tier/per-line potential tables |
| `cubing/probability.ts` | – | exact (non-Monte-Carlo) line probability |
| `starforce/rates.ts`, `planner/starforce.ts` | – | GMS v269 rates incl. Enhancement Modes |
| `planner/{fd,rank,candidates,pieces}.ts` | – | **upgrade ranking: FD% per billion meso** |
| `equip-tooltip-stats.ts` | 13 KB | tooltip stat decomposition |
| `equip-catalog.ts`, `equip-capabilities.ts`, `frozen-equips.ts`, `pensalir-equips.ts` | – | GMS equip catalogue |
| `hexa-costs.ts`, `hexa-priority.ts`, `hexa-tracker.ts`, `data/hexa-priority-bands.json` (241 KB) | – | HEXA progression |
| `bosses/{crystals,income,presets,weekly-reset}.ts` | – | crystal meso, weekly income, reset logic |
| `liberation/calc.ts` | – | Genesis/Destiny liberation |

Boss HP data sample (`boss-info-data.json`):

```jsonc
"destiny_adversary": {
  "crystalMeso": 1435000000,
  "hp": { "phases": [
            {"label":"Phase 1","entities":[3135000000000000],"total":3135000000000000},
            {"label":"Phase 2","entities":[3135000000000000],"total":3135000000000000},
            {"label":"Phase 3","entities":[4180000000000000],"total":4180000000000000}],
          "totalHp": 10450000000000000 },
  "drops": [ {"name":"Immortal Legacy",...}, {"name":"Adversary Eternel Armor Box",...},
             {"name":"Whetstone of Life",...}, {"name":"Life Boss Ring Box",...} ]
}
```

Records carry **both** `hp` (GMS wiki totals) and `hpKms` (MapleScouter/KMS totals), plus
`crystalMeso` and per-boss drop lists with icon URLs. This is the boss dataset to ingest.

**Caveat: no license → all rights reserved.** Numeric game data (rates, HP, boss cuts,
weapon constants) is factual and safe to re-encode; the *code* is not. Use as a spec.

### 4.2 `masonym/masonym.dev` — current GMS Star Force tables

<https://github.com/masonym/masonym.dev> · JS/Next.js · **no license** · 2★ · pushed
2026-09-03 · live <https://masonym.dev/star-force>

`src/app/star-force/utils.js` (553 lines) is the cleanest *current* GMS data:

- `STAR_FORCE_RATES` 0→30 with `{success, maintain, decrease, destroy}`
  (e.g. 17★ `0.15/0.782/0/0.068`; 22★ `0.15/0.68/0/0.17`; 29–30★ `0.01/0.792/0/0.198`)
- `ENHANCE_MODE` lookup for stars 15–21 — **the 2026 GMS system is NOT classic Savior**:
  max **30 stars** (lvl 138+), no star decrease at 15+, and a **Enhancement Mode 1–4**
  slider at 15–21 trading meso for boom chance (Mode 1 = legacy rates, Mode 4 = 0%
  destroy). Cost multipliers cluster `1/1.5/2.5/3` (15–17) and `1/2/3.5/6.5` (18–21).
  A source comment says Mode 1 was verified in-game at item levels 160 and 200.
  Cross-check: <https://starforce.tadeucci.dev/>,
  <https://maplestorywiki.net/w/Star_Force_Enhancement>
- `calculateMesoCost`: `100 * round(L³ * (s+1) / 2500 + 10)` for ≤9★, else
  `100 * round(L³ * (s+1)^2.7 / divisor + 10)` with divisors
  `{10:40000, 11:22000, 12:15000, 13:11000, 14:7500, 15:20000, 16:20000, 17:15000,
    18:7000, 19:4500, 20:20000, 21:12500}`, `L = floor(level/10)*10`
- `getMaxStars`: `<95→5, <108→8, <118→10, <128→15, <138→20, else 30`
- **Star catching = ×1.05 multiplicative on success**, remainder redistributed pro-rata
- MVP silver 3% / gold 5% / diamond 10%, only below 17★; 30%-off event `×0.7`
- `getRecoveredStars` (destroy recovery): `15–19→12, 20→15, 21–22→17, 23–25→19, 26–30→20`
- Also: `legion/utils/solver.js`, `hexa/`, familiars, `data/skill-delays/v269-skills.json`
  (1.5 MB), `data/bossData.js`

### 4.3 `hewkow/yasf` — the MIT-licensed one

<https://github.com/hewkow/yasf> · **Rust + WASM (Dioxus)** · **MIT** · pushed 2026-07-31.
`src/starforce.rs`: `EnhancementMode` enum, `StarProp::get_base_rates`, star-catch
(`×1.05`, boom rescaled by `(1-new)/(1-old)`), safeguard 15–17 (`boom=0, cost×3`),
SSF boom `×0.7`, Monte Carlo histograms, Transfer Hammer chains. **If we go Rust, this
is the legally clean starting point.**

### 4.4 `brendonmay/brendonmay.github.io` — MathBro's Calculators

<https://brendonmay.github.io/> · <https://github.com/brendonmay/brendonmay.github.io>
· JS · **no license** · 19★ · active Jan 2026. The long-running GMS community calculator
suite: `starforceCalculator/`, `cubingCalculator/`, `flameCalculator/`, `hyperCalculator/`,
`innerAbilityCalculator/`, `statEquivalentCalculator/`, `wseCalculator/`,
`LegionCalculator/`.

- `starforceCalculator/serverDiffs.js` is the best **multi-server / historical** data file:
  `makeMesoFn(divisor, exp=2.7, extraMult=1)` plus `preSaviorRates` / `saviorRates` /
  `kmsRates` / `TMSRates` / `tyrantAEERates`. GMS currently maps to `kmsCost`. Cites
  <https://strategywiki.org/wiki/MapleStory/Spell_Trace_and_Star_Force>.
- `cubingCalculator/cubing_data_scraper/` — a documented **Python scraper for Nexon's
  official probability pages** (~140 requests) that emits `cubeRates.js`, with a
  `translator.py` for KR→EN line names. **This is the reusable data pipeline** — better
  than depending on anyone's snapshot.

### 4.5 `Francesco149/cubecalc` — public-domain cube data

<https://github.com/Francesco149/cubecalc> · C + Python · **UNLICENSE (public domain)**.
Ships raw KMS cube-data caches (`src/data/kms/cache/*.txt`), familiar/red-card data, and
`src/cubecalc.py`. Feels archived (2022) but the licensing makes it uniquely reusable.

### 4.6 `blushiemagic/Maplestory-Starforce-Calculator` — closed-form math

<https://github.com/blushiemagic/Maplestory-Starforce-Calculator> · JS · no license · 4★
· pushed 2026-07. Small, but `math.txt` derives **closed-form** expected cost and booms:
`x = c + f(1-p)/p`, `y = d(1-p)/p`, no-destroy chance `p/(p+d-pd)`. **Use these instead
of Monte Carlo** so upgrade ranking is instant. Same author's
`blushiemagic/Maplestory-Optimizer` has a declarative `features` map
(AP/base/percent/final per stat) driving a generic optimizer — decent structural
inspiration.

### 4.7 `oleneyl/maplestory_dpm_calc` — true per-skill DPM

<https://github.com/oleneyl/maplestory_dpm_calc> · Python · 62★ / 30 forks · **MIT-like
but with an added "commercial usage must be reported and permitted" clause** (GitHub
reports NOASSERTION). The KMS-community reference DPM simulator: full skill-graph
simulation, `dpmModule/jobs/*.py` (~50 classes), `kernel/core/modifier.py`
(`CharacterModifier` with `crit, crit_damage, pdamage, pdamage_indep, stat_main,
stat_sub, pstat_main, boss_pdamage, armor_ignore, att, patt`),
`character/{hyperStat,union,linkSkill,doping,weaponPotential}.py`,
`gear/{Gear,GearBuilder,Scroll,SetItem}.py`, `util/optimizer.py`, plus YAML spec presets
(4500/6000/7000/8000/8500, reboot variants). **Last pushed 2022-11** — skill data is
stale, but the architecture (per-skill graph + modifier algebra) is the best open
blueprint if we ever want real DPM rather than a range proxy.
`ParkKyuSeon/Maplestory_DPM` (R, 50★, 2026) is an analysis companion.

### 4.8 Korean power metrics: 환산 주스탯 and 전투력

**환산 주스탯 (hwansan / converted main stat)** — a *community* metric, never official
Nexon. Canonical implementation is MapleScouter (closed). Formula confirmed independently
at <https://www.mowatool.com/calculators/game/maple-stat-converter>:

```
표기공 (displayed range) = (main*4 + sub) * ATT / 100
기대값 (expected)        = 표기공 * 크리(crit) * (뎀%/보공) * 최종(FD) * 방무(PDR term)
방무 stacks multiplicatively: 1 - (1-a)(1-b)(1-c)
boss PDR baseline: 300% normal, 350–380% hard
```

This matches `maplecompile/scouter/calc.ts` line for line. Related open repos:
`hwangseonu/maple-tools` (Svelte, **MIT**), `llzzangwhll/maplescouter_flutter`,
and the tomerh2001 GMS wrapper cluster (`maplescouter-en-fix` MIT, `-sync`, `-proxy`,
`-cloud`, `-reskin`, `-gms-tracker-sync`).

**전투력 (Combat Power)** — the *in-game* number, reverse-engineered. From
`maplecompile/src/lib/scouter/combat-power.ts`, cited to
<https://maplestorywiki.net/w/Combat_Power>:

```
CP = floor( (4*main + sub) * 0.01
          * floor(ATT_base * (1 + ATT%))
          * weaponConstantRatio        // normally 1 — WC normalises out
          * (1 + DMG% + BD%)
          * (1 + FD%)
          * (1.35 + CD%) )
```

ATT is skill-excluded and bow-normalised; FD is skill-excluded (Reboot ×1.35 below
level 250 else ×1.45; Liberation ×1.1; gear only). A second, longer derivation is
`hanshino/maple-hub/docs/combat-power-formulas.md` (<https://github.com/hanshino/maple-hub>,
JS, no license), documenting the four stat layers
(`floor((pure + floor(added)) * (1+%)) + final`), the full weapon-constant table
(1.20 staff → 1.75 claw), the multiplicative `calcImprove` gear-swap ratio, boss
elemental resistance halving FD, ARC/AUT map suppression (up to +150% at 1.5×
requirement), and DoT/summon exceptions. It credits
`TamakiSilSha/MapleStoryCalculatorV3` (Python, no license, 5★) whose `Charactor.py` has
`calcAttributeByClass`, `calcIgnore`, `calcImprove`, `getEquivalent`.

### 4.9 Flames / Additional Options

**GMS flame-score convention** (per <https://gms-upgrade-tracker.vercel.app/tools/flame-calculator>):
main stat ×1, secondary ×**1/12**, ATT/MATT ×**3**, All Stat% ×**10**.
`maplecompile/src/lib/flames.ts` ships a slightly different user-editable default
(`sec 0.125, att 4, allStats 10, boss 12`) — **treat weights as configurable**, since
per-class ATT value genuinely differs.

**Flame tier value generator** (`flames.ts`, `buildFlameTable`) — the actual formula,
not a table:

```
level      = min(300, floor(equipLevel/10)*10)
pureMult   = level >= 250 ? 12 : floor(level/20) + 1      // hpBase 233.333 at 250+
mixedMult  = floor(level/40) + 1
pure stat  tier t (1..7) = t * pureMult
mixed stat tier t        = t * mixedMult
ATT (normal flame)   = ceil(WA/100 * (floor(level/40)+1) * NORMAL_ATT_MULT[t-1])
   NORMAL_ATT_MULT = [1, 2.2, 3.63, 5.324, 7.3205, 8.7846, 10.2487]
ATT (powerful/special) = ceil(WA/100 * (floor(level/40)+1) * t * 1.1^(t-3))
```

It also encodes `isFlammable()` (rings/android/heart/emblem/badge/secondary excluded;
Scarlet Shoulderpads and the Immortal Legacy medal are exceptions) and
`getPrimarySecondary()` for all classes including Xenon (STR+DEX+LUK), Demon Avenger
(HP/ATT) and the LUK+STR/DEX thieves.

Smaller: `ktnyt/ms-flame` (TS), `HT413/maplestory_flame_score_estimate` (JS),
`chengda300/maplestory-flame-score` (Java), `Xenogents/maplestory-calculators`
(cube/flame/familiar, JS, no license, slightly stale).

### 4.10 Closed-source tools worth knowing (do not depend on)

- **"SuckHard's" cubing calculator** → now at <https://shikkokuhime.xyz/>. Closed source.
  `Francesco149/cubecalc` is the closest open equivalent.
- **Grandis Library** <https://grandislibrary.com/> (source: <https://github.com/ikasuu/grandislibrary>)
  — guides and content, **no calculators or formulas**.
- **MapleIsland** <https://www.mapleisland.app/>, `starforcecalculator.store`,
  `mapledoro.com`, `boostingbros` — closed-source commercial/SEO tools.

### Licensing bottom line

The three highest-value sources (maplecompile, masonym.dev, MathBro) have **no license at
all**. Numeric game data — rate tables, meso divisors, weapon constants, boss HP, boss
cuts — is factual and safe to re-encode. Their *code* is not. Only `hewkow/yasf` (MIT)
and `Francesco149/cubecalc` (Unlicense) can be copied outright.

---

## 5. Boss data and benchmarks

### 5.1 `masonym/masonym.dev` → `src/data/bossData.js` — the primary seed

<https://raw.githubusercontent.com/masonym/masonym.dev/HEAD/src/data/bossData.js>
(21 KB, 888 lines) · repo <https://github.com/masonym/masonym.dev> · rendered at
<https://masonym.dev/bosses> ("mason's maple matrix"; the site 403s WebFetch but serves
fine to `curl` with a browser UA).

Schema:

```
name, category, frequency, level, pdr, afRequirement, sacRequirement,
maxPartySize, challengerSeason,
difficulties: [{ name, intensePowerCrystalValue, hpPhases: [{ hp, segments, note }] }]
```

**Actively maintained** — the repo carries dated changelogs including
`src/content/changelog/2026-08-06-bosses.mdx` ("Added Jupiter's power crystal price"),
repo last pushed 2026-09-03.

Verbatim extract:

| Boss | Freq | Lv | PDR | Force req | Difficulty crystals (meso) | HP phases |
| --- | --- | --- | --- | --- | --- | --- |
| Chaos Zakum | weekly | 180 | 100% | — | 16,200,000 | 84B |
| Chaos Papulatus | weekly | 190 | 250% | — | 26,450,000 | 378B / 126B |
| Lotus | weekly | 210 | 300% | — | N 32,512,500 / H 88,935,000 / X 279,500,000 | N 470B·470B·630B; X 545T·545T·720T |
| Lucid | weekly | 230 | 300% | AF 360 | E 47,401,875 / N 50,765,625 / H 100,800,000 | H 50.8T·54T·12.8T |
| Will | weekly | 235 | 300% | AF 560 | E 49,348,950 / N 55,815,000 / H 124,362,000 | H 21T·21T·31.5T·52.5T |
| Gloom | weekly | 255 | 300% | AF 730 | N 59,535,000 / C 112,789,000 | N 25.5T; C 127.5T |
| Darknell | weekly | 265 | 300% | AF 850 | N 63,375,000 / H 133,584,000 | N 26T; H 157.5T |
| Verus Hilla | weekly | 250 | 300% | AF 820 | N 116,376,000 / H 152,421,000 | 88T / 176T |
| Chosen Seren | weekly | 270 | 380% | SAC 200 | N 177,804,375 / H 219,312,000 / X 847,000,000 | X 1.32Q·5.16Q |
| Kalos | weekly | 270 | 380% | SAC 200 | E 187.5M / N 260M / C 520M / X 1,040,000,000 | X 5.97Q·15.6Q |
| Kaling | weekly | 275 | 380% | SAC 230 | E 206.25M / N 301.3M / H 598M / X 1,205,200,000 | X 18.2Q·6.93Q·8.662Q·20.8Q |
| **Malefic Star** | weekly | 280 | 380% | SAC 400 | N 290,400,000 / H 798,000,000 | H 2.948Q·5.896Q·5.896Q |
| **Limbo** | weekly | 285 | 380% | SAC 500 | N 420,000,000 / H 749,000,000 | H 3.78Q·3.78Q·4.99Q |
| **Baldrix** | weekly | 290 | 380% | SAC 700 | N 560,000,000 / H 840,000,000 | H 5.3446Q·5.6858Q·9.309Q |
| **Jupiter** | weekly | 295 | 380% | SAC 810 | N 591,000,000 / H 1,205,200,000 | H 9.88Q·19.76Q·19.76Q |
| Black Mage | **monthly** | 275 | 300% | AF 1320 | H 900,000,000 / X 3,600,000,000 | X 1.18Q·1.19Q·1.285Q·1.152Q |

**Newest GMS bosses as of 2026: Malefic Star (Lv280), Limbo (285), Baldrix (290),
Jupiter (295)**, plus `Kai` (category `seasonal`, maxPartySize 1) and `First Adversary`
(Lv270, maxPartySize 3). **Black Mage is the only `monthly` boss; everything else is
`weekly`.**

Two caveats: the site footer says *"Boss HP values are estimated and sourced from the
MapleStory Wiki"*, and the file stores only **one** `sacRequirement` per boss even though
the real requirement varies by difficulty (see 5.2). The file also uses
`formatShortformNumber("84B")` wrappers and `591_000_000` numeric separators — a
JS→JSON transform must strip both. Pin a commit SHA and diff on update.

The repo also ships `public/equip-data/{items,potentials,sets}.json` and
`public/map-data/maps.json`, plus `src/data/skill-delays/v266|v267|v269-skills.json`
(confirming GMS is on v269+ in 2026).

### 5.2 maplestorywiki.net — richest, and it has a real API

`https://maplestorywiki.net` runs **MediaWiki 1.45.4 with a working `api.php`**
(confirmed via `action=query&meta=siteinfo`). No Cargo/SMW, but there is a
`Template:Infobox boss` and Scribunto.

```
# enumerate the boss roster (40 pages)
GET https://maplestorywiki.net/api.php?action=query&list=embeddedin
      &eititle=Template:Infobox%20boss&format=json
# per-boss stats live on <Boss>/Monster subpages
GET https://maplestorywiki.net/api.php?action=parse&page=Limbo/Monster
      &prop=wikitext&format=json
```

The infobox is far more granular than masonym — **per-difficulty** force, party size,
time limit, potion cooldown, death count, **and per-party-size Combat Power**. Verbatim
from `Limbo/Monster`:

```
|level2=285+  |partySize2=1 - 3  |power2=⬢500 SAC / AUT
|potionCooldown2=10 seconds  |timeLimit2=30 minutes  |deathCount2=None
|combatPower2= Total or 1-Person: 550,000,000 / 2-Person: 170,000,000 / 3-Person: 110,000,000
|combatPower3= Total or 1-Person: 1,000,000,000 / 2-Person: 320,000,000 / 3-Person: 210,000,000
```

Exact per-phase HP (not rounded like masonym): Normal Limbo `1,944,000,000,000,000` (P1),
`972,000,000,000,000` ×3 (P2), `2,592,000,000,000,000` (P3); Hard Limbo P1
`3,774,000,000,000,000`, P3 `4,884,000,000,000,000`.

**Force requirement scales per difficulty** — `First Adversary`: Easy ⬢220, Normal ⬢320,
Hard ⬢340, Extreme ⬢460 SAC/AUT. masonym's single `sacRequirement: 220` is therefore
wrong at higher difficulties. Wiki notation `SAC / AUT` = Sacred Power / **Authentic
Force** — the newer force stat.

The wiki also has bosses masonym lacks: **Bellona** (Lv280, ⬢400/450/550 SAC, HP
316T / 463T / 1.652Q) and **Malitia**.

All HP values are tagged `<ref name="BossHP">Estimated, may not be 100% accurate</ref>`
— **nobody has client-dumped endgame HP; treat every figure as a community estimate.**

⚠️ **Known discrepancy to resolve:** for Hard Jupiter, masonym lists phases
`9.88Q · 19.76Q · 19.76Q` while the wiki quotes `49,400,000,000,000,000` (49.4Q) per
phase. Do not trust either blindly; the maplecompile `boss-info-data.json` is a third
independent snapshot to triangulate against.

### 5.3 Combat Power entry gates — the hard, game-enforced cutoff

<https://maplestorywiki.net/w/Combat_Power> documents a **minimum CP to even enter a boss
map**. This is the most tracker-friendly signal available, because it is a hard rule
rather than an opinion. Solo/total values:

| Boss | Easy | Normal | Hard/Chaos | Extreme |
| --- | --- | --- | --- | --- |
| Zakum | 10,000 | 30,000 | 300,000 | — |
| Vellum | — | 100,000 | 500,000 | — |
| Lotus | — | 1,500,000 | 5,000,000 | 200,000,000 |
| Damien | — | 2,000,000 | 6,000,000 | — |
| Lucid | 2,000,000 | 3,500,000 | 18,000,000 | — |
| Will | 2,000,000 | 3,500,000 | 20,000,000 | — |
| Gloom | — | 3,500,000 | 20,000,000 | — |
| Darknell | — | 4,000,000 | 22,000,000 | — |
| Verus Hilla | — | 12,000,000 | 24,000,000 | — |
| Black Mage | — | — | 50,000,000 | 600,000,000 |
| Chosen Seren | — | 50,000,000 | 80,000,000 | 800,000,000 |
| Kalos | 35,000,000 | 120,000,000 | 550,000,000 | 2,500,000,000 |
| Kaling | 80,000,000 | 280,000,000 | 1,000,000,000 | 5,500,000,000 |
| First Adversary | 50,000,000 | 150,000,000 | 900,000,000 | 2,500,000,000 |
| Malefic Star | — | 230,000,000 | 1,000,000,000 | — |
| Limbo | — | 550,000,000 | 1,000,000,000 | — |
| Baldrix | — | 700,000,000 | 2,000,000,000 | — |
| Jupiter | — | 900,000,000 | 4,500,000,000 | — |
| Kai | — | 20,000,000 | 70,000,000 | — |

Party rule, verbatim: *"Hard Limbo requires 1,500,000,000 Combat Power in total, and when
entering with 3 players, the minimum Combat Power of each party members cannot be lower
than 320,000,000."* Practice Mode is exempt.

⚠️ **[unverified]** The wiki attributes this table to *"the NEXT Update in ChinaMS"*.
Whether GMS enforces identical numbers is not confirmed — treat as strong guidance, not
certain GMS truth.

The same page gives the CP formula, with a working reference implementation at
<https://python-fiddle.com/saved/Hv6sN7miNlXfTijSoTO6>:

```python
combatPower = math.floor(
    (4 * totalStat1 + totalStat2) * 0.01 *
    math.floor(totalFlatAtt * attMul) *
    toMultiplier(critDmg - innateCritDmg + 35) *
    toMultiplier(bossDmg - innateBossDmg + dmg - innateDmg) *
    (toMultiplier(finalDmg) / innateFinalDmg))
```

CP **excludes** IED, elemental resist ignore, level-advantage and map multipliers, and all
skill/link/guild/consumable stat buffs. **CP is not DPM** — model IED separately.

### 5.4 maplestory.io mob endpoints — tested, narrowly useful

- **`latest` is not a valid version alias.** `https://maplestory.io/api/GMS/latest/mob/8880000`
  → **404**. Numeric versions only.
- `https://maplestory.io/api/wz` lists 239 GMS versions, but most recent ones fail **on the
  mob endpoint specifically**. Probing 254→270: only **GMS 255 returned 200**;
  254/256/258/262 → 500; 264/265/267/268/269/270 → 404. **Usable mob versions: GMS 253 and
  255** — note this is a mob-endpoint limitation only; the *item* endpoints work fine at
  GMS 270 (§3.2).
- Bulk works: `https://maplestory.io/api/GMS/255/mob` → 1.3 MB, **11,497 mobs, 5,182
  flagged `isBoss`**. Search: `?searchFor=Kalos`.

```jsonc
// GET https://maplestory.io/api/GMS/253/mob/8800002   (Chaos Zakum)
{"level":110,"maxHP":7000000,"physicalDamage":9300,"accuracy":450,
 "evasion":144,"physicalDefenseRate":40,"magicDefenseRate":40,"isBoss":true}
```

**Fatal limitation:** `maxHP` caps at **2,100,000,000** (int32). Kalos, Kaling, Chosen
Seren and Limbo all return exactly `2100000000`; Lucid (`8880150`), Damien (`8880101`)
and Verus Hilla (`8880450`) **omit `maxHP` entirely**.

What it *is* good for — PDR and elemental data, which match community values:

| Mob | ID | Lv | PDR | Elemental |
| --- | --- | --- | --- | --- |
| Zakum | 8800002 | 110 | 40 | — |
| Lucid | 8880150 | 230 | 300 | `P2H2F2I2S2L2D2` |
| Kalos | 8880802 | 280 | 380 | `P2H2F2I2S2L2D2` |
| Kaling | 8880837 | 285 | 380 | — |
| Chosen Seren | 8880600 | 275 | 380 | — |

Note the API's *mob level* differs from the *entry level* (API says Kalos Lv280; the UI
gates at 270+). And **beware ID collisions**: mob `8645436` "Limbo" has PDR 10 and
accuracy 1121 — a story-mode Limbo, not the raid boss. Never name-match blindly.

### 5.5 Community benchmarks ("how much range for X")

Best structured table found: <https://gameslikefinder.com/article/maplestory-boss-ranges-guide/>
(last updated **2026-08-15**), tiered Grey → Bronze → Silver → Gold:

| Boss | Boss HP | Main Stat | Effective IED | Combat Power |
| --- | --- | --- | --- | --- |
| Chaos Zakum | 84B | 10k | 85 | 1.5M |
| Chaos Vellum | 200B | 11k | 90 | 2.5M (1M party) |
| Normal Lotus | 2T | 16k | 93 | 3.5M (1.5M party) |
| Normal Damien | 1T | 19k | 93 | 4M (1.5M party) |
| Normal Lucid | 24T | 24k | 93 | 18M |
| Normal Will | 25T | 24k | 93 | 18M |
| Hard Lucid | 118T | 32k | 95 | 50M |
| Hard Will | 126T | 32k | 95 | 50M |
| Chaos Gloom | 128T | 33k | 95 | 55M |
| Hard Darknell | 158T | 38k | 95 | 60M |
| Hard Verus Hilla | 176T | 40k | 95 | 70M |
| Normal Seren | 208T | 45k | 96 | 80M |
| Hard Black Mage | 472T | 40k | 96 | 60M party |
| Easy Kalos | 357T | 45k | 96 | 85M party |
| Hard Seren | 483T | 50k | 96 | 95M party |

Above Silver it declines to tabulate: *"Soloing even the first gold star boss (Easy
Kaling) requires ~220M solo Combat Power or ~100M party."*

**Its CP numbers are materially higher than the game's entry gates** (Easy Kalos: 85M
"comfortable" vs a 35M gate). **That gap is exactly the "carried / blue dot / just
survive" band** — a good way to render three states per boss: *cannot enter* / *can be
carried* / *can solo*.

Grandis Library's <https://grandislibrary.com/content/progression-guide> only buckets
bosses at `<2k / >3k / >5k / >8k` main stat and explicitly disclaims precision;
hand-authored prose, no API.

### 5.6 Korean 딜컷 (damage-cut) figures

Low confidence — namu.wiki and en.namu.wiki both 403 automated fetches, so these are
snippet-level:

- Normal Limbo HP quoted as **4368조 6000억 ≈ 4,368.6 trillion**, "equivalent to Extreme
  Black Mage."
- Chaos Kalos minimum cut: **헥사 10만 이상** (100k+ hexa-converted stat).
- Rules of thumb (units of 만 / 10k 환산): Normal Limbo 9–9.5, Hard Limbo 9–9.5,
  Hard Kaling **11+**.
- Kaling and Limbo are rated *above* Chaos Kalos in required spec specifically because
  they cap at **3-player parties**, concentrating the DPM requirement.

Useful Korean search terms confirmed live: 딜컷, 환산주스탯, 보스 티어, 스펙컷, 최소컷.
Sources: <https://namu.wiki/w/메이플스토리/보스%20몬스터/보스%20티어>,
<https://www.inven.co.kr/board/maple/5974/5727009>, <https://www.fmkorea.com/7931346429>.

### 5.7 Other boss repos

- **`spd789562/Maplestory-Boss-Crystal-Calculator`**
  (<https://github.com/spd789562/Maplestory-Boss-Crystal-Calculator>, live at
  <https://maplestory-boss-crystal-calculator.vercel.app/en>) — solves the weekly-crystal
  optimisation and contains crystal price data.
- **`gaoshaosuhai/maple-ahead`** — "KMS→GMS roadmap, Hexa Matrix planner, and weekly
  bossing ROI."
- `ShlomiRex/Maplestory-Monster-DB` — CSV monster dump, old version.
- `ronancpl/HeavenMS` has a `MapleBossHpBarFetcher` but is v83-era — useless for 2026.

**Crystal cap [unverified, medium confidence]:** 180 crystals per week per world, and 14
weekly boss crystals per character (raised from 12), current mid-2026. Verify against
<https://forums.maplestory.nexon.net/discussion/35424/boss-crystal-sell-limit> and
<https://en.namu.wiki/w/강렬한%20힘의%20결정> before shipping.

### 5.8 Ranked ingestion plan for boss data

1. **`masonym/masonym.dev` `src/data/bossData.js`** — primary seed. One
   raw.githubusercontent fetch, maintained monthly, gives boss → difficulty →
   {crystal meso, HP phases} + PDR + frequency + maxPartySize in one shot.
2. **maplestorywiki.net MediaWiki API** — enrichment and override layer. Per-difficulty
   force requirement, per-party-size Combat Power, time limit, death count, exact
   per-phase HP, and the bosses masonym lacks.
3. **`maplecompile/src/lib/scouter/boss-info-data.json`** — third snapshot with **both**
   GMS and KMS HP totals plus drop tables; use to triangulate the discrepancies.
4. **`Combat_Power` entry table** — encode as a hard "can enter" filter, separate from
   the damage model.
5. **gameslikefinder boss-ranges table** — static "comfortable solo" tier layer; editorial,
   so don't auto-refresh. Delta vs the entry gate = the carried-vs-solo band.
6. **maplestory.io `GMS/255`** — ingest **PDR, level, accuracy, evasion, elemental
   attributes only**, keyed by a hand-curated mob-ID map. **Never ingest its HP.**
7. **Skip:** Grandis Library (prose), StrategyWiki (unstructured), Namu Wiki (403-gated,
   though the best narrative source on Korean spec cuts if proxied), MapleScouter itself
   (closed API).

**Modelling note:** with PDR at 300–380% from Lotus onward and effective-IED benchmarks at
93–96%, **IED is the dominant nonlinearity** in the damage calc — and since Combat Power
explicitly excludes IED, CP alone cannot predict clears. Use **CP for the entry gate**,
then **DPM vs HP over the time limit** (all endgame bosses: 30 minutes) for the real
"can beat" verdict.

### 5.9 Restating the MapleScouter-derived boss facts

Already established in §1 and worth keeping together with the above:

- **`maplecompile/src/lib/scouter/boss-info-data.json`** is the best single machine-readable
  boss dataset found: per-boss `crystalMeso`, `hp.phases[].entities[]` + `totalHp` for
  **both** GMS (`hp`) and KMS (`hpKms`), and drop tables with icons.
- **`maplescouter.com/en/boss-data`** SSR HTML gives level, PDR (300/380), Arcane Force,
  Authentic Force per boss/difficulty (KMS content).
- **`maplecompile/src/lib/scouter/boss-cuts.ts`** gives per-boss/per-difficulty
  `bossCut` / `partyBossCut` (in 환산 units), `easyRate`, `partyLimit`, entry levels, and
  the full label ladder from "솔플 여유컷" down to "파티 최소컷" / "불가능".
- WZ-derived monster data (`api.maplestory.net/monster/{id}`, maplestory.io) is **not
  usable** for modern boss HP — it returns the 2,000,000,000 WZ cap and flat DEF rather
  than PDR%.

---

## 6. LLM-friendly gear import (screenshots / OCR)

### Prior art

**`miamdaegun/maplescouter_ocr`** — <https://github.com/miamdaegun/maplescouter_ocr> —
is the closest existing thing to what we want. A Chrome MV3 extension that sends a
**single item-tooltip screenshot** to **Gemini 2.5 Flash / 3.1 Flash-Lite** as a vision
call and writes the parsed item into maplescouter.com's `equipBookmarkList` localStorage
key. Its prompt (`popup/popup.js`, `GEMINI_PROMPT` ~line 609) encodes hard-won lessons:

- **Omit keys entirely when a value is 0** — never emit `""` or `"0"`; models hallucinate
  zeros.
- **Force potential / additional-potential arrays to exactly 3 entries** whenever a grade
  was detected ("guess if unreadable") — otherwise the model silently drops lines.
- For stat lines, **read only the large leading total and ignore the parenthesised
  breakdown** — the breakdown is where VLMs get confused.
- **Do not try to read Star Force from the image.** The prompt explicitly instructs the
  model to omit `starforce` and warns it not to confuse star glyphs or the
  "scissors uses remaining" number for the star count. **Star count is entered by hand.**
- Strip the crafter's `"<IGN>의"` prefix above the item name; take only the largest bold
  text.
- Constrain soul options to a **closed enum** (~21 valid strings) rather than free text.
- Weapon `part` comes from the 3rd tooltip line (Staff / Two-handed Sword / Katara),
  ignoring the one-handed/two-handed line.

**`SomethinggMax/maple-autofill`** — <https://github.com/SomethinggMax/maple-autofill> —
MV3 extension using **on-device Tesseract WASM** to OCR the **Stat window** (not item
tooltips) into MapleScouter's "Enter Directly" form. Its README is a good design doc: one
Stat-panel screenshot fills all percentage fields; **four** screenshots (panel + main-stat,
secondary-stat and ATT hover tooltips) are needed for the Base / % / %-not-applied split,
because that split exists only in the hover tooltips. It cross-checks OCR against the
panel with `floor(base * (1 + pct/100)) + notApplied` and **annotates mismatches rather
than withholding values** — a UX pattern worth copying.

Others: `Dravis/MapleEquips` (Python/OpenCV template matching, pre-VLM, incomplete);
`hangwl/MaplestoryOCR` (GMS guild contribution, not gear); `Kowagatte/maple-inv` (React
clone of the equip window); `MapleStory-Archive/ms-equips` (archived; README lists
"screenshot inputs" as intended future work). Flame-score calculators
(<https://sethyboy0.github.io/flameScoreCalc/>, mapledoro, gms-upgrade-tracker) are all
manual entry.

**Beware:** <https://maplestoryidle.info/equipment-compare.html> advertises
paste-a-screenshot OCR equipment compare — but that is **MapleStory Idle RPG, a different
game**.

**Conclusion: nobody has shipped a good English/GMS screenshot-to-gear importer.** The one
VLM tooltip parser that exists is Korean, targets a third-party calculator, and punts on
star force.

### What the in-game tooltip actually shows

Structure verified against <https://misaomaki.github.io/starforce2.html>, a pixel-faithful
GMS tooltip reimplementation whose DOM and `starforce/{item_prototype.js,vars.js,starforce.css}`
were read directly. Top to bottom:

1. **Star Force star row** — 30 sprites in groups of 5, **15 per line with a hard break
   after star 15**. Filled lit, rest greyed; stars above the item's max hidden entirely.
   17★ = full row + 2; 22★ = 15 + 7; 25★ = 15 + 10; 30★ = two full rows.
   **There is no numeric star count anywhere in the tooltip.**
2. **Item name**, with `(+N)` = successful scroll upgrades (not stars).
3. **Sub-description** `(Legendary Item)` / `(Unique Item)` — reflects the *higher* of
   potential and bonus potential; also drives the icon border colour.
4. Icon (corner dot = flame eligibility: transparent = all Rebirth Flames, white =
   Powerful/Eternal only, per <https://grandislibrary.com/content/upgrading-enhancing-equipment>)
   and the **REQ block**: `REQ LEV` in sprite digits (shows `(200-25)` when a flame reduced
   it), then REQ STR / DEX and REQ LUK / INT.
5. Small icon row: **DEF, Boss Damage %, Ignore Enemy DEF %**.
6. Job-class icons.
7. **Stat block**, in this exact order with these exact GMS labels
   (`GLOBAL.item_stat_order`): `Type:`, `Attack Speed:` (weapons), Rank, **STR, DEX, INT,
   LUK, MaxHP, MaxHP %, MaxMP, MaxMP %, MaxDF, Attack Power, Magic Attack, Defense, Speed,
   Jump, Knockback Chance %, Boss Damage %, Ignored Enemy DEF %, Damage %, All Stats %,
   Required Level**. Zero lines are omitted.
8. `Remaining Enhancements: N`, `(Available Recoveries: N)`, `Hammers Applied: N (MAX)`.
9. **Potential** — coloured diamond + up to 3 lines.
10. **Bonus Potential** — same, lines prefixed `+`.
11. **Exceptional** — `All Stats`, `MaxHP / MaxMP`, `Attack Power & Magic ATT`.
12. Soul line (weapons), flavour text, skill text, tradeability.

**The breakdown format** — GMS classic renders `LABEL: +total (base +flame +upgrades)`,
e.g. `STR: +250 (100 +60 +90)`, where the **third number merges star force AND scrolls**
into one cyan value. The newer KMS/NEXT format splits into **four**:
`(base +flame +scroll +starforce)`.

Colour codes (useful as VLM hints — but note the collisions):

| Component | RGB |
| --- | --- |
| base | white |
| flame / bonus stat / soul | `204,255,0` yellow-green |
| combined upgrade (GMS classic) | `102,255,255` cyan |
| scroll (KMS split) | `170,170,255` lavender |
| star force (KMS split) | `255,204,0` gold |
| negative | `255,0,102` |

Potential grade colours: Rare `102,255,255`, Epic `153,102,255`, Unique `255,204,0`,
Legendary `204,255,0`. **Legendary collides with flame text; Rare collides with the
GMS-classic upgrade number — never key off colour alone.**

**Item level is not shown** — only REQ LEV. Item level must be inferred from item name.

**Forward-looking:** the MapleSEA v244 "NEXT UI" revamp patch notes
(<https://www.maplesea.com/updates/view/v244_Patch_Notes_2/>) reorder the tooltip
(enhancement summary + name → combat power increase, type, appearance, requirements →
set info, equip skills, growth level → base stats *including* SF/scroll/add-option
increases → description → enhancement info → soul/Exceptional → trade restrictions).
Critically: *"Star Force, scroll, additional options enhancement information will be
displayed summarized, and you can now check the details with the NPC/gather key"*
(disabled in boss fights), and 23★+ items get an extra top-of-tooltip effect. **So the
"hold a key for detail" behaviour is the NPC chat/harvest key, not Ctrl** — our import UX
must tell users to hold it before screenshotting, since the collapsed view loses the
breakdown.

### No non-OCR export path for GMS

- Nexon Open API: no GMS (§2).
- GMS rankings API: level/class/world/legion only, no gear (§2).
- In-game **item chat link** exists (2nd button in the chat UI) but renders a client-side
  tooltip popup for other players — no clipboard text, no export.
- **"Character Cards"** are the Legion-precursor stat-bonus system
  (<https://maplestorywiki.net/w/Character_Cards>), not a shareable export.
- maple.gg is KMS/MSEA; maplestory.gg has no gear data (and was 522 at research time).

**Screenshots are the only import channel for GMS in 2026.** That is exactly why this
project has a reason to exist.

### Schema to adopt

Use the **Nexon Open API `character/item-equipment` shape** as our gear model, even though
GMS cannot call it — it is the community's de-facto interchange format, and MapleScouter's
own client-side bookmark objects mirror it, so we interoperate with Korean tooling for
free. Exact fields verified from
<https://github.com/SpiralMoon/maplestory.openapi/blob/develop/js/src/maplestory/api/kms/response/character/characterItemEquipmentBody.ts>:

Per item (`CharacterItemEquipmentInfoBody`):

```
item_equipment_part, item_equipment_slot, item_name, item_icon, item_description,
item_shape_name, item_shape_icon, item_gender,
item_total_option, item_base_option, item_add_option, item_etc_option,
item_starforce_option, item_exceptional_option,
potential_option_flag, additional_potential_option_flag,
potential_option_grade, additional_potential_option_grade,
potential_option_1/2/3, additional_potential_option_1/2/3,
equipment_level_increase, growth_exp, growth_level,
scroll_upgrade, scroll_resilience_count, scroll_upgradeable_count,
cuttable_count (255 = unlimited/tradeable), golden_hammer_flag,
soul_name, soul_option, starforce, starforce_scroll_flag,
special_ring_level, date_expire, freestyle_flag
```

**The five parallel stat objects are the important design idea** — they are exactly the
tooltip's parenthesised decomposition, modelled properly:

| Object | Meaning |
| --- | --- |
| `item_base_option` | base stats + `base_equipment_level` |
| `item_add_option` | **flames / bonus stats** (str…jump, boss_damage, damage, all_stat, `equipment_level_decrease`) |
| `item_etc_option` | **scrolls** (str…jump only; no % stats) |
| `item_starforce_option` | same shape as etc |
| `item_total_option` | the big leading number, plus boss_damage, ignore_monster_armor, all_stat, damage, max_hp_rate, max_mp_rate |
| `item_exceptional_option` | str/dex/int/luk/hp/mp/att/matt + `exceptional_upgrade` |

Container level: `date`, `character_gender`, `character_class`, `preset_no`,
`item_equipment[]`, `item_equipment_preset_1/2/3[]`, `title`, `medal_shape`,
`dragon_equipment[]` (Evan), `mechanic_equipment[]` (Mechanic).
**All numeric stats are strings in this API** — decide early whether to mirror or coerce.

### Import design implications

1. A VLM can reliably fill `item_total_option`, both potential grades and all six
   potential lines, `scroll_upgrade`, `soul_name`/`soul_option`, and
   `item_exceptional_option`; and can plausibly fill `item_add_option` from the green
   flame number.
2. It **cannot** reliably fill `starforce` (no numeral; sprite counting) and cannot cleanly
   separate `item_etc_option` from `item_starforce_option` unless the user is on the new
   KMS-style split tooltip. **Make star force a dropdown next to the parsed result,
   pre-filled with a best guess and visibly flagged.**
3. Because `total = base + add + etc + starforce`, parse the total *and* the components and
   run the identity as a free validation pass — **annotate mismatches, don't reject**.
4. `maplecompile/src/lib/scouter/{from,to}-maplescouter-preset.ts` shows how to
   import/export MapleScouter presets — worth supporting so users can round-trip.

---

## Recommended architecture

1. **Gear model** = Nexon Open API `item_equipment` shape (base/add/etc/starforce/total/
   exceptional + 2×3 potential lines).
2. **Import** = VLM screenshot parsing per item tooltip, star force entered manually,
   component-sum validation, plus a MapleScouter-preset import path.
3. **Damage** = `range = (4*main + sec) * ATT / 100`, then
   `expected = range * crit * (1+DMG+BD) * (1+FD) * iedMult * mastery`, computed at both
   300% and 380% PDR. Surface 환산 주스탯 as the headline scalar.
4. **Upgrade ranking** = generate starforce/flame/cube candidates per slot, compute
   `ΔexpectedBoss%` and `mesoCost`, sort by **FD% per billion meso**. Use closed-form
   starforce expectations (`blushiemagic/math.txt`) so it recomputes instantly.
5. **Boss suitability** = `clearRate = (damage * arcGap * authGap * lvlGap / forceDenom)
   / cutDamage * easyRate * regionScale`, bucketed into the solo/duo/trio/party ladder.
   Ingest boss cuts, HP (GMS variant), PDR, force requirements and entry levels from
   `maplecompile`, and re-verify against the GMS wiki.
6. **Item catalogue** = maplestory.io at `GMS/270` (item + raw-WZ `SetItemInfo.img` /
   `ItemOption.img`), seeded from `chablades/mapledoro` `manifests/v270/`; maplestorywiki.net
   `api.php` as the override layer. `masonym.dev/public/equip-data/*.json` is the fastest
   path to a working prototype.
7. **Rates data** = scrape Nexon's official cube probability pages ourselves; take
   starforce tables from `masonym.dev` (facts) or `yasf` (MIT code).

### Open questions / gaps

- The exact `type`/`id` combination for GMS **legion / raid-power rankings** was not found
  — `raidPower` and `legionLevel` exist in the schema but returned 0. **[unverified]**
- MapleScouter's boss HP hover data comes from its private API; the maplecompile JSON is a
  snapshot and will drift.
- `maplestory.gg` was returning HTTP 522 throughout this research — treat as unreliable.
- Xenon and Demon Avenger are known-hard for any 환산-style single-scalar metric;
  MapleScouter itself has indefinitely postponed their item scores.
