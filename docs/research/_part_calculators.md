# Research: Existing MapleStory damage / gear calculators (GMS, 2026)

Research date: **2026-09-06**. All claims below were verified by fetching the live sites/APIs unless
explicitly marked as uncertain. Where a source is Korean, the Korean term is given so it can be re-found.

**Confidence key:** ✅ verified live this session · ⚠️ partially verified / inferred · ❓ unverified, flagged

---

## 0. TL;DR for our purposes

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

## 1. MapleScouter (maplescouter.com)

### What it is

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

### The core metric: 환산 주스탯 ("converted / equivalent main stat")

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

### Inputs

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

### Outputs

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

### Is it open source?

**No.** ✅ The GitHub org https://github.com/Maplescouter exists but states *"This organization has
no public repositories."* No public repo, no published formula source. Community support is via
Discord (`https://discord.com/invite/hD2bEFBqZq`) and `maplescouter@gmail.com`.

### GMS version?

**No.** ✅ KMS only, for the structural reason that the Nexon Open API it depends on does not serve
GMS (see §4).

---

## 2. "Suckhard's" calculators

### Important correction: the domain in the brief does not exist

- `suckhardswebsite.com`, `www.suckhardswebsite.com`, `suckhard.website`, `suckhards.website` →
  **NXDOMAIN** ✅ (DNS checked).
- Bing returns **zero results** for the literal string `"suckhardswebsite.com"` ✅.
- The Wayback Machine has **no snapshots** for it ✅.
- `shikkokuhime.xyz`, which older search snippets label "SuckHard's Cubing Calculator", now 307s to
  a GoDaddy "domain for sale" parking page ✅.

### What actually happened: SuckHard → MathBro

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

### Full tool list (✅ verified live at https://brendonmay.github.io/)

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

### Stat Equivalence Calculator — exact input set ✅

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

### How it computes "% damage gain per stat" ✅ (read from source)

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

### Published methodology page?

**No dedicated methodology page.** ⚠️ The site has per-step "Click for details" modals and a Discord
(`MathBro's Calculators Discord`), but no written formula doc. The formulas are documented instead
by the community wikis — see §3.

---

## 3. Other calculators, wikis and spreadsheets

### 3a. The canonical formula references (use these as our spec)

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

### 3b. GMS calculator sites

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

### 3c. Open-source damage simulators on GitHub

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

## 4. Data ingestion options

### 4a. Official Nexon Open API — **KMS/TMS/MSEA only, not GMS** ✅

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

### 4b. Unofficial GMS rankings JSON API — **works, but thin** ✅

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

### 4c. MapleRanks — GMS coverage, no stats ✅

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

### 4d. maplestory.io — game data, not character data ✅

https://maplestory.io — community REST API + Wiki + Studio + Simulator serving **game assets and item
metadata** per region/version (URL pattern `/api/GMS/<version>/…`, e.g.
`/api/GMS/208.2.0/npc/9200000/render/stand`). Useful to us for **item base stats, icons, item IDs, set
membership, req level, weapon type** — i.e. the static side of a gear database. Not a source of
*your* character's data.

### 4e. Screenshots / OCR

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

## 5. Recommendation

### Verdict: **(b) stat-window baseline + deltas.** Not close.

Every credible tool in the English community does this, and the one tool that does (a) only does it
because Korea has an API that hands over set effects, link skills, V/HEXA matrix, inner ability and
symbols. We have none of that.

### Why bottom-up is not merely harder but *impossible* to get right

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

### Why deltas from the stat window work

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

### Minimum input set for "absolute % damage gain per upgrade"

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

### Accuracy honesty (what to tell the user in-product)

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

### Suggested architecture

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

## Open questions / follow-ups

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

## Source index

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
