// Throwaway generator for src/lib/data/bosses.json.
// Every number below is transcribed from docs/research/*.md; nothing is estimated here.
// Run: node scripts/build-bosses.mjs
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const OUT = join(
	dirname(fileURLToPath(import.meta.url)),
	'..',
	'src',
	'lib',
	'data',
	'bosses.json'
);

const HEROIC = 5; // bosses.md §1.6: "Heroic (Reboot) worlds pay 5x the listed values."

/** §1.6 non-Heroic crystal values, by [solo, 2p ea, 3p ea, 4p ea, 5p ea, 6p ea]. */
const CRYSTAL = {
	'easy-zakum': [200000, 100000, 66666, 50000, 40000, 33333],
	'normal-zakum': [612500, 306250, 204166, 153125, 122500, 102083],
	'easy-papulatus': [684500, 342250, 228166, 171125, 136900, 114083],
	'easy-magnus': [722000, 361000, 240666, 180500, 144400, 120333],
	'normal-hilla': [800000, 400000, 266666, 200000, 160000, 133333],
	'normal-mori-ranmaru': [840500, 420250, 280166, 210125, 168100, 140083],
	'easy-horntail': [882000, 441000, 294000, 220500, 176400, 147000],
	'normal-pierre': [968000, 484000, 322666, 242000, 193600, 161333],
	'normal-von-bon': [968000, 484000, 322666, 242000, 193600, 161333],
	'normal-crimson-queen': [968000, 484000, 322666, 242000, 193600, 161333],
	'normal-vellum': [968000, 484000, 322666, 242000, 193600, 161333],
	'normal-horntail': [1012500, 506250, 337500, 253125, 202500, 168750],
	'easy-von-leon': [1058000, 529000, 352666, 264500, 211600, 176333],
	'easy-arkarium': [1152000, 576000, 384000, 288000, 230400, 192000],
	'normal-omni-cln': [1250000, 625000, 416666, 312500, 250000, 208333],
	'chaos-horntail': [1352000, 676000, 450666, 338000, 270400, 225333],
	'normal-pink-bean': [1404500, 702250, 468166, 351125, 280900, 234083],
	'normal-von-leon': [1458000, 729000, 486000, 364500, 291600, 243000],
	'hard-von-leon': [2450000, 1225000, 816666, 612500, 490000, 408333],
	'normal-arkarium': [2520500, 1260250, 840166, 630125, 504100, 420083],
	'normal-magnus': [2592000, 1296000, 864000, 648000, 518400, 432000],
	'normal-papulatus': [2664500, 1332250, 888166, 666125, 532900, 444083],
	'hard-mori-ranmaru': [2664500, 1332250, 888166, 666125, 532900, 444083],
	'easy-cygnus': [9112500, 4556250, 3037500, 2278125, 1822500, 1518750],
	'hard-hilla': [11250000, 5625000, 3750000, 2812500, 2250000, 1875000],
	'chaos-pink-bean': [12800000, 6400000, 4266666, 3200000, 2560000, 2133333],
	'normal-cygnus': [14450000, 7225000, 4816666, 3612500, 2890000, 2408333],
	'chaos-zakum': [16200000, 8100000, 5400000, 4050000, 3240000, 2700000],
	'chaos-pierre': [16200000, 8100000, 5400000, 4050000, 3240000, 2700000],
	'chaos-von-bon': [16200000, 8100000, 5400000, 4050000, 3240000, 2700000],
	'chaos-crimson-queen': [16200000, 8100000, 5400000, 4050000, 3240000, 2700000],
	'normal-princess-no': [16200000, 8100000, 5400000, 4050000, 3240000, 2700000],
	'hard-magnus': [19012500, 9506250, 6337500, 4753125, 3802500, 3168750],
	'chaos-vellum': [21012500, 10506250, 7004166, 5253125, 4202500, 3502083],
	'chaos-papulatus': [26450000, 13225000, 8816666, 6612500, 5290000, 4408333],
	'normal-akechi-mitsuhide': [28800000, 14400000, 9600000, 7200000, 5760000, 4800000],
	'normal-lotus': [32512500, 16256250, 10837500, 8128125, 6502500, 5418750],
	'normal-damien': [33800000, 16900000, 11266666, 8450000, 6760000, 5633333],
	'normal-guardian-angel-slime': [46334700, 23167350, 15444900, 11583675, 9266940, 7722450],
	'easy-lucid': [47401875, 23700937, 15800625, 11850468, 9480375, 7900312],
	'easy-will': [49348950, 24674475, 16449650, 12337237, 9869790, 8224825],
	'normal-lucid': [50765625, 25382812, 16921875, 12691406, 10153125, 8460937],
	'normal-will': [55815000, 27907500, 18605000, 13953750, 11163000, 9302500],
	'normal-gloom': [59535000, 29767500, 19845000, 14883750, 11907000, 9922500],
	'normal-darknell': [63375000, 31687500, 21125000, 15843750, 12675000, 10562500],
	'hard-damien': [84375000, 42187500, 28125000, 21093750, 16875000, 14062500],
	'hard-lotus': [88935000, 44467500, 29645000, 22233750, 17787000, 14822500],
	'hard-lucid': [100800000, 50400000, 33600000, 25200000, 20160000, 16800000],
	'chaos-gloom': [112789000, 56394500, 37596333, 28197250, 22557800, 18798166],
	'normal-verus-hilla': [116376000, 58188000, 38792000, 29094000, 23275200, 19396000],
	'chaos-guardian-angel-slime': [120115625, 60057812, 40038541, 30028906, 24023125, 20019270],
	'hard-will': [124362000, 62181000, 41454000, 31090500, 24872400, 20727000],
	'hard-darknell': [133584000, 66792000, 44528000, 33396000, 26716800, 22264000],
	'hard-verus-hilla': [152421000, 76210500, 50807000, 38105250, 30484200, 25403500],
	'normal-chosen-seren': [177804375, 88902187, 59268125, 44451093, 35560875, 29634062],
	'easy-kalos': [187500000, 93750000, 62500000, 46875000, 37500000, 31250000],
	'easy-first-adversary': [197000000, 98500000, 65666666, null, null, null],
	'easy-kaling': [206250000, 103125000, 68750000, 51562500, 41250000, 34375000],
	'hard-chosen-seren': [219312000, 109656000, 73104000, 54828000, 43862400, 36552000],
	'normal-kalos': [260000000, 130000000, 86666666, 65000000, 52000000, 43333333],
	'normal-first-adversary': [273000000, 136500000, 91000000, null, null, null],
	'extreme-lotus': [279500000, 139750000, null, null, null, null],
	'normal-malefic-star': [290400000, 145200000, 96800000, null, null, null],
	'normal-kaling': [301300000, 150650000, 100433333, 75325000, 60260000, 50216666],
	'normal-limbo': [420000000, 210000000, 140000000, null, null, null],
	'chaos-kalos': [520000000, 260000000, 173333333, 130000000, 104000000, 86666666],
	'normal-baldrix': [560000000, 280000000, 186666666, null, null, null],
	'hard-first-adversary': [588000000, 294000000, 196000000, null, null, null],
	'normal-jupiter': [593000000, 296500000, 197666666, null, null, null],
	'hard-kaling': [598000000, 299000000, 199333333, 149500000, 119600000, 99666666],
	'hard-limbo': [749000000, 374500000, 249666666, null, null, null],
	'hard-malefic-star': [798000000, 399000000, 266000000, null, null, null],
	'hard-baldrix': [840000000, 420000000, 280000000, null, null, null],
	'extreme-chosen-seren': [847000000, 423500000, 282333333, 211750000, 169400000, 141166666],
	'hard-black-mage': [900000000, 450000000, 300000000, 225000000, 180000000, 150000000],
	'extreme-kalos': [1040000000, 520000000, 346666666, 260000000, 208000000, 173333333],
	'extreme-first-adversary': [1176000000, 588000000, 392000000, null, null, null],
	'hard-jupiter': [1190600000, 595300000, 396866666, null, null, null],
	'extreme-kaling': [1205200000, 602600000, 401733333, 301300000, 241040000, 200866666],
	'extreme-black-mage': [3600000000, 1800000000, 1200000000, 900000000, 720000000, 600000000]
};

/** §3.2 solo (total) minimum Combat Power (CMS-tagged client data). */
const CP_SOLO = {
	'easy-zakum': 10000,
	'normal-zakum': 30000,
	'chaos-zakum': 300000,
	'easy-horntail': 10000,
	'normal-horntail': 30000,
	'chaos-horntail': 50000,
	'normal-hilla': 10000,
	'hard-hilla': 100000,
	'normal-pierre': 50000,
	'chaos-pierre': 300000,
	'normal-von-bon': 50000,
	'chaos-von-bon': 300000,
	'normal-crimson-queen': 50000,
	'chaos-crimson-queen': 300000,
	'normal-vellum': 100000,
	'chaos-vellum': 500000,
	'easy-von-leon': 10000,
	'normal-von-leon': 30000,
	'hard-von-leon': 50000,
	'easy-arkarium': 30000,
	'normal-arkarium': 100000,
	'easy-magnus': 10000,
	'normal-magnus': 100000,
	'hard-magnus': 300000,
	'normal-pink-bean': 50000,
	'chaos-pink-bean': 300000,
	'easy-cygnus': 300000,
	'normal-cygnus': 500000,
	'normal-lotus': 1500000,
	'hard-lotus': 5000000,
	'extreme-lotus': 200000000,
	'destiny-lotus': 5000000,
	'champion-lotus': 5000000,
	'normal-damien': 2000000,
	'hard-damien': 6000000,
	'destiny-damien': 6000000,
	'normal-gollux': 500000,
	'normal-mori-ranmaru': 50000,
	'hard-mori-ranmaru': 500000,
	'normal-princess-no': 300000,
	'easy-lucid': 2000000,
	'normal-lucid': 3500000,
	'hard-lucid': 18000000,
	'destiny-lucid': 18000000,
	'normal-omni-cln': 10000,
	'easy-papulatus': 10000,
	'normal-papulatus': 100000,
	'chaos-papulatus': 800000,
	'easy-will': 2000000,
	'normal-will': 3500000,
	'hard-will': 20000000,
	'destiny-will': 20000000,
	'normal-verus-hilla': 12000000,
	'hard-verus-hilla': 24000000,
	'destiny-verus-hilla': 24000000,
	'champion-verus-hilla': 24000000,
	'hard-black-mage': 50000000,
	'extreme-black-mage': 600000000,
	'champion-black-mage': 50000000,
	'normal-gloom': 3500000,
	'chaos-gloom': 20000000,
	'normal-darknell': 4000000,
	'hard-darknell': 22000000,
	'normal-chosen-seren': 50000000,
	'hard-chosen-seren': 80000000,
	'extreme-chosen-seren': 800000000,
	'destiny-chosen-seren': 300000000,
	'champion-chosen-seren': 80000000,
	'normal-guardian-angel-slime': 2000000,
	'chaos-guardian-angel-slime': 22000000,
	'easy-kalos': 35000000,
	'normal-kalos': 120000000,
	'chaos-kalos': 550000000,
	'extreme-kalos': 2500000000,
	'destiny-kalos': 550000000,
	'champion-kalos': 120000000,
	'easy-kaling': 80000000,
	'normal-kaling': 280000000,
	'hard-kaling': 1000000000,
	'extreme-kaling': 5500000000,
	'destiny-kaling': 850000000,
	'normal-limbo': 550000000,
	'hard-limbo': 1000000000,
	'normal-baldrix': 700000000,
	'hard-baldrix': 2000000000,
	'easy-first-adversary': 50000000,
	'normal-first-adversary': 150000000,
	'hard-first-adversary': 900000000,
	'extreme-first-adversary': 2500000000,
	'normal-malefic-star': 230000000,
	'hard-malefic-star': 1000000000,
	'normal-jupiter': 900000000,
	'hard-jupiter': 4500000000
};

/** §3.3 per-party-size CP floors that are actually published per boss. */
const CP_PER_MEMBER = {
	'easy-lucid': { 2: 650000, 3: 430000, 4: 320000, 5: 260000, 6: 210000 },
	'normal-lucid': { 2: 1100000, 3: 750000, 4: 560000, 5: 450000, 6: 370000 },
	'hard-lucid': { 2: 5800000, 3: 3900000, 4: 2900000, 5: 2300000, 6: 1900000 },
	'easy-kalos': { 6: 3700000 },
	'normal-kalos': { 6: 13000000 },
	'chaos-kalos': { 6: 59000000 },
	'extreme-kalos': { 6: 270000000 },
	'easy-kaling': { 6: 8600000 },
	'hard-kaling': { 6: 100000000 },
	'hard-black-mage': { 6: 5400000 },
	'extreme-black-mage': { 6: 65000000 },
	// existing-tools.md §5.2, verbatim from the Limbo/Monster infobox.
	'normal-limbo': { 2: 170000000, 3: 110000000 },
	'hard-limbo': { 2: 320000000, 3: 210000000 }
};

/** §4.5 force requirements. capAt = the "+50 / 150% ratio" cap-bonus target. */
const FORCE = {
	'easy-lucid': { type: 'arcane', required: 360, capAt: 540 },
	'normal-lucid': { type: 'arcane', required: 360, capAt: 540 },
	'hard-lucid': { type: 'arcane', required: 360, capAt: 540 },
	'destiny-lucid': { type: 'arcane', required: 360, capAt: 540 },
	'easy-will': { type: 'arcane', required: 560, capAt: 840 },
	'normal-will': { type: 'arcane', required: 760, capAt: 1140 },
	'hard-will': { type: 'arcane', required: 760, capAt: 1140 },
	'destiny-will': { type: 'arcane', required: 760, capAt: 1140 },
	'normal-gloom': { type: 'arcane', required: 730, capAt: 1095 },
	'chaos-gloom': { type: 'arcane', required: 730, capAt: 1095 },
	'normal-verus-hilla': { type: 'arcane', required: 820, capAt: 1230 },
	'hard-verus-hilla': { type: 'arcane', required: 900, capAt: 1350 },
	'destiny-verus-hilla': { type: 'arcane', required: 900, capAt: 1350 },
	'champion-verus-hilla': { type: 'arcane', required: 900, capAt: 1350 },
	'normal-darknell': { type: 'arcane', required: 850, capAt: 900 },
	'hard-darknell': { type: 'arcane', required: 850, capAt: 900 },
	'hard-black-mage': { type: 'arcane', required: 1320, capAt: 1980 },
	'extreme-black-mage': { type: 'arcane', required: 1320, capAt: 1980 },
	'champion-black-mage': { type: 'arcane', required: 1320, capAt: 1980 },
	'normal-chosen-seren': {
		type: 'sacred',
		required: 150,
		capAt: 200,
		phase2Required: 200,
		phase2CapAt: 250
	},
	'hard-chosen-seren': {
		type: 'sacred',
		required: 150,
		capAt: 200,
		phase2Required: 200,
		phase2CapAt: 250
	},
	'extreme-chosen-seren': {
		type: 'sacred',
		required: 150,
		capAt: 200,
		phase2Required: 200,
		phase2CapAt: 250
	},
	'destiny-chosen-seren': {
		type: 'sacred',
		required: 150,
		capAt: 200,
		phase2Required: 200,
		phase2CapAt: 250
	},
	'champion-chosen-seren': {
		type: 'sacred',
		required: 150,
		capAt: 200,
		phase2Required: 200,
		phase2CapAt: 250
	},
	'easy-kalos': { type: 'sacred', required: 200, capAt: 250 },
	'normal-kalos': {
		type: 'sacred',
		required: 250,
		capAt: 300,
		phase2Required: 300,
		phase2CapAt: 350
	},
	'chaos-kalos': { type: 'sacred', required: 330, capAt: 380 },
	'extreme-kalos': { type: 'sacred', required: 440, capAt: 490 },
	'destiny-kalos': { type: 'sacred', required: 330, capAt: 380 },
	'champion-kalos': { type: 'sacred', required: 250, capAt: 300 },
	'easy-first-adversary': { type: 'sacred', required: 220, capAt: 270 },
	'normal-first-adversary': { type: 'sacred', required: 320, capAt: 370 },
	'hard-first-adversary': { type: 'sacred', required: 340, capAt: 390 },
	'extreme-first-adversary': { type: 'sacred', required: 460, capAt: 510 },
	'easy-kaling': { type: 'sacred', required: 230, capAt: 280 },
	'normal-kaling': { type: 'sacred', required: 330, capAt: 380 },
	'hard-kaling': { type: 'sacred', required: 350, capAt: 400 },
	'extreme-kaling': { type: 'sacred', required: 480, capAt: 530 },
	'destiny-kaling': { type: 'sacred', required: 350, capAt: 400 },
	'normal-malefic-star': { type: 'sacred', required: 400, capAt: 450 },
	'hard-malefic-star': { type: 'sacred', required: 550, capAt: 600 },
	'normal-limbo': { type: 'sacred', required: 500, capAt: 550 },
	'hard-limbo': { type: 'sacred', required: 500, capAt: 550 },
	'normal-baldrix': { type: 'sacred', required: 700, capAt: 750 },
	'hard-baldrix': { type: 'sacred', required: 700, capAt: 750 },
	'normal-jupiter': { type: 'sacred', required: 810, capAt: 860 },
	'hard-jupiter': { type: 'sacred', required: 810, capAt: 860 }
};

/** kms-tools.md §2.4 (bossCut / partyBossCut / easyRate) + §2.5 (guard = PDR the site models). */
const SCOUTER = {
	'normal-baldrix': { bossCut: 129900, guard: 380 },
	'hard-baldrix': { bossCut: 129900, guard: 380 },
	'normal-limbo': { bossCut: 118900, guard: 380 },
	'hard-limbo': { bossCut: 118900, guard: 380 },
	'normal-malefic-star': { bossCut: 117500, guard: 380 },
	'hard-malefic-star': { bossCut: 117500, guard: 380 },
	'normal-jupiter': { bossCut: 111700, guard: 380 },
	'hard-jupiter': { bossCut: 111700, partyBossCut: 125600, easyRate: 0.93024, guard: 380 },
	'easy-first-adversary': { bossCut: 108100, guard: 380 },
	'normal-first-adversary': { bossCut: 108100, guard: 380 },
	'hard-first-adversary': { bossCut: 108100, guard: 380 },
	'extreme-first-adversary': { bossCut: 108100, partyBossCut: 113000, guard: 380 },
	'easy-kaling': { bossCut: 105800, guard: 380 },
	'normal-kaling': { bossCut: 105800, guard: 380 },
	'hard-kaling': { bossCut: 105800, guard: 380 },
	'extreme-kaling': { bossCut: 105800, partyBossCut: 108350, guard: 380 },
	'normal-chosen-seren': { bossCut: 105700, guard: 380 },
	'hard-chosen-seren': { bossCut: 105700, guard: 380 },
	'extreme-chosen-seren': { bossCut: 105700, guard: 380 },
	'extreme-black-mage': { bossCut: 94500, guard: 300 },
	'easy-kalos': { bossCut: 90900, guard: 380 },
	'normal-kalos': { bossCut: 90900, guard: 380 },
	'chaos-kalos': { bossCut: 90900, guard: 380 },
	'extreme-kalos': { bossCut: 90900, guard: 380 },
	'extreme-lotus': { bossCut: 64500, guard: 380 },
	// "검밑솔" group (Black Mage / Verus Hilla / Darknell / Gloom / GAS / Will / Lucid /
	// Damien / Lotus), base cut 40,600 with difficulty carried by easyRate (unpublished).
	'hard-black-mage': { bossCut: 40600, guard: 300 },
	'normal-verus-hilla': { bossCut: 40600, guard: 300 },
	'hard-verus-hilla': { bossCut: 40600, guard: 300 },
	'normal-darknell': { bossCut: 40600, guard: 300 },
	'hard-darknell': { bossCut: 40600, guard: 300 },
	'normal-gloom': { bossCut: 40600, guard: 300 },
	'chaos-gloom': { bossCut: 40600, guard: 300 },
	'normal-guardian-angel-slime': { bossCut: 40600, guard: 300 },
	'chaos-guardian-angel-slime': { bossCut: 40600, guard: 300 },
	'easy-will': { bossCut: 40600, guard: 300 },
	'normal-will': { bossCut: 40600, guard: 300 },
	'hard-will': { bossCut: 40600, guard: 300 },
	'easy-lucid': { bossCut: 40600, guard: 300 },
	'normal-lucid': { bossCut: 40600, guard: 300 },
	'hard-lucid': { bossCut: 40600, guard: 300 },
	'normal-damien': { bossCut: 40600, guard: 300 },
	'hard-damien': { bossCut: 40600, guard: 300 },
	'normal-lotus': { bossCut: 40600, guard: 300 },
	'hard-lotus': { bossCut: 40600, guard: 300 },
	'chaos-papulatus': { bossCut: 500, easyRate: 1.08, guard: 300 },
	// §2.5 ships a guard (PDR) for these but no bossCut of its own.
	'chaos-vellum': { guard: 200 },
	'hard-magnus': { guard: 120 },
	'chaos-crimson-queen': { guard: 120 },
	'chaos-von-bon': { guard: 100 },
	'chaos-zakum': { guard: 100 },
	'chaos-pierre': { guard: 80 }
};

/** Korean names that a source actually supplies (bosses.md App. A, existing-tools.md §2). */
const NAME_KO = {
	lotus: '스우',
	damien: '데미안',
	gloom: '더스크',
	darknell: '듄켈',
	'verus-hilla': '진 힐라',
	'chosen-seren': '선택받은 세렌',
	kalos: '감시자 칼로스',
	'first-adversary': '최초의 대적자',
	kaling: '카링',
	'malefic-star': '찬란한 흉성',
	limbo: '림보',
	baldrix: '발드릭스',
	jupiter: '유피테르',
	'guardian-angel-slime': '가디언 엔젤 슬라임',
	'black-mage': '검은마법사',
	will: '윌'
};

const NOTES = {
	'easy-zakum': 'Nine HP entries: eight equal parts plus a larger final part.',
	'normal-zakum': 'Nine HP entries: eight equal parts plus a larger final part.',
	'chaos-zakum': 'Nine HP entries: eight equal parts plus a larger final part.',
	'easy-horntail':
		'§1.3 correction: the naive per-part sum is 1.835B. The Horntail body entry dies automatically once the eight Phase-3 parts are down, duplicating the Phase-3 subtotal, so per-part HP is deliberately not stored.',
	'normal-horntail':
		'§1.3 correction: naive per-part sum 4.84B; the body entry duplicates the Phase-3 subtotal.',
	'chaos-horntail':
		'§1.3 correction: naive per-part sum 46.6B; the body entry duplicates the Phase-3 subtotal.',
	'normal-pierre':
		'§1.3 correction: naive sum 945M. The three colour forms share one HP bar and are not additive.',
	'chaos-pierre':
		'§1.3 correction: naive sum 240B. The three colour forms share one HP bar and are not additive.',
	'normal-crimson-queen':
		'§1.3 correction: naive sum 1.26B. The four mood forms share one HP bar and are not additive.',
	'chaos-crimson-queen':
		'§1.3 correction: naive sum 560B. The four mood forms share one HP bar and are not additive.',
	'chaos-vellum': '§1.5: 200B in GMS vs 120B in MSEA. Do not import the MSEA figure.',
	'hard-mori-ranmaru':
		'§1.5: GMS HP is 2.1B, roughly 40x lower than the 84B used in other regions — GMS never received the HP buff. Largest GMS-vs-global divergence in the roster.',
	'normal-omni-cln':
		'§1.2: reset type could not be independently confirmed (recorded as "Daily?").',
	'normal-akechi-mitsuhide':
		'HP is annotated on the wiki as "Estimated, may not be 100% accurate" even by the standards of the other rows (§1.8).',
	'easy-gollux':
		'§1.4: Gollux is one Boss-tab entry, not selectable tiers — difficulty is set by how many weak points you destroy before killing the head, and all tiers share the single daily entry. Pays Gollux Pennies/Coins, not an Intense Power Crystal. Fixed weak points at every difficulty (Lv 150, PDR 15%): Left Shoulder 40M, Right Shoulder 40M, Abdomen 60M.',
	'normal-gollux':
		'§1.4: shares the single daily Gollux entry; PDR is recorded as "?%" on the wiki (§1.8). Pays Gollux Pennies/Coins, not a crystal.',
	'hard-gollux':
		'§1.4: shares the single daily Gollux entry. A fourth "Hell" tier exists (head total 770B, mob Lv 200, PDR 250%) but has no matching difficulty key in this dataset. Pays Gollux Pennies/Coins, not a crystal.',
	'normal-ursus':
		'§1.4: no time limit, 80 shared lives, party 1-18 (three parties of 6), 3 entries/day/account. Drops no items; pays mesos by rank, doubled during Golden Time (01:00-05:00 and 18:00-22:00 UTC) and 5x in Heroic worlds.',
	'easy-balrog':
		'§1.4: three sequential forms — 2,400,000 (Lv 45) + 1,152,000 (Lv 49) + 1,235,520 (Lv 49). Mob level is therefore not a single value and is omitted. Death count and reset limit are blank on the wiki (§1.8).',
	'normal-hilla': 'Death count is blank on the wiki (§1.8).',
	'extreme-lotus':
		'§5.5: cannot receive the +20% gimmick final damage nor the +25% Sacred boost; phase 1 carries a shield. Effective HP is materially above the listed value.',
	'hard-damien':
		'§2.3: 7 Brand stacks deal 100% HP, kill instantly and ignore death protection (Heaven’s Gate, Might of the Nova).',
	'chaos-guardian-angel-slime':
		'§5.5: no force boost applies, a permanent 15% damage reduction, and it recovers 1% HP every 30 s. Effective HP is well above the listed 90T.',
	'hard-lucid':
		'§5.5: phase 3 is a hard DPS check — 12.8T within 40 seconds. §2.3: Lucid Rage deals 100% HP at Hard and cannot be out-HP’d.',
	'normal-lucid': '§2.3: Lucid Rage deals 70% HP at Normal; most attacks are %HP-based.',
	'easy-lucid': '§2.3: Lucid Rage deals 50% HP at Easy; most attacks are %HP-based.',
	'hard-will': '§2.3: Will’s signature attack deals 100% HP and cannot be out-HP’d.',
	'normal-will': '§2.3: Will’s signature attack deals 100% HP and cannot be out-HP’d.',
	'easy-will': '§2.3: Will’s signature attack deals 100% HP and cannot be out-HP’d.',
	'chaos-gloom':
		'§5.5: takes 90% reduced damage while its eye is closed — effective HP is far above 127.05T.',
	'normal-verus-hilla': '§2.3: large spikes deal up to 50% HP. Death count is 5 Spirit Stones.',
	'hard-verus-hilla': '§2.3: large spikes deal up to 50% HP. Death count is 5 Spirit Stones.',
	'hard-black-mage':
		'§5.5: Arcane boost is capped at ~110% (150% is unreachable), shields refresh frequently, and phase 1 carries +750B per shield. Death count is a 12-step Life Gauge. Only monthly-reset boss (1 clear/month plus a separate 1 entry/day limit).',
	'extreme-black-mage':
		'§5.5: Arcane boost capped at ~110% (150% unreachable); frequently-refreshed shields. Death count is a 12-step Life Gauge. Monthly reset.',
	'normal-chosen-seren':
		'§4.4: Sacred Symbol: Cernium at level 11 grants +20% damage to Seren. §2.3: Normal Seren and above impose a 10-second consumable cooldown. §4.3: phase 2 requires 200 SAC, not 150.',
	'hard-chosen-seren':
		'§5.5: heals by the remaining shield amount on the dawn→noon transition, so a slower fight is strictly worse. §4.4: Sacred Symbol: Cernium at 11 grants +20% damage. §4.3: phase 2 requires 200 SAC.',
	'extreme-chosen-seren':
		'§4.4: Sacred Symbol: Cernium at 11 grants +20% damage. §4.3: phase 2 requires 200 SAC. masonym lists the phase split as 1.32Q + 5.16Q (sums to the stored 6.48Q).',
	'easy-kalos': '§4.4: Sacred Symbol: Arcus at level 11 grants +20% damage to Kalos.',
	'normal-kalos':
		'§4.3: phase 2 requires 300 SAC, not 250. §4.4: Sacred Symbol: Arcus at 11 grants +20% damage.',
	'chaos-kalos': '§4.4: Sacred Symbol: Arcus at level 11 grants +20% damage to Kalos.',
	'extreme-kalos': '§4.4: Sacred Symbol: Arcus at level 11 grants +20% damage to Kalos.',
	'easy-first-adversary':
		'§5.5: +20% final damage while the Order gauge is at or above 800. Sacred Symbol: Odium at 11 grants +20% damage (§5.5).',
	'normal-first-adversary':
		'§5.5: +20% final damage while the Order gauge is at or above 800. Sacred Symbol: Odium at 11 grants +20% damage.',
	'hard-first-adversary':
		'§5.5: +20% final damage while the Order gauge is at or above 800. Sacred Symbol: Odium at 11 grants +20% damage.',
	'extreme-first-adversary':
		'§5.5: +20% final damage while the Order gauge is at or above 800. Sacred Symbol: Odium at 11 grants +20% damage.',
	'easy-kaling': '§4.4: Sacred Symbol: Shangri-La at level 11 grants +20% damage to Kaling.',
	'normal-kaling': '§4.4: Sacred Symbol: Shangri-La at level 11 grants +20% damage to Kaling.',
	'hard-kaling':
		'§2.2: the widely-copied 5%-HP chart still lists 17.775Q, the pre-nerf value; Kaling was reduced to 12.091Q in the Carcion Octo Festival patch. §4.4: Sacred Symbol: Shangri-La at 11 grants +20% damage, plus +20% final damage to Hard during the Destiny Mission.',
	'extreme-kaling': '§4.4: Sacred Symbol: Shangri-La at level 11 grants +20% damage to Kaling.',
	'normal-malefic-star':
		'§5.5: +30% final damage near-permanently under the standard "테토" build. Sacred Symbol: Arteria at 11 grants +20% damage.',
	'hard-malefic-star':
		'§5.5: +30% final damage near-permanently under the standard "테토" build. Sacred Symbol: Arteria at 11 grants +20% damage.',
	'normal-limbo': '§5.5: Sacred Symbol: Carcion at level 11 grants +20% damage to Limbo.',
	'hard-limbo': '§5.5: Sacred Symbol: Carcion at level 11 grants +20% damage to Limbo.',
	'normal-baldrix':
		'§5.5: Sacred Symbol: Tallahart at level 11 grants +20% damage to Baldrix. §1.8: a secondary report describes a KMS OVERDRIVE change (2026-06-19) cutting the time limit to 20 minutes and stamina ~32.2%; unconfirmed in GMS.',
	'hard-baldrix':
		'§5.5: Sacred Symbol: Tallahart at level 11 grants +20% damage to Baldrix. §1.8: unconfirmed KMS OVERDRIVE report of a 20-minute limit.',
	'normal-jupiter': '§5.5: Sacred Symbol: Gearlock at level 11 grants +20% damage to Jupiter.',
	'hard-jupiter': '§5.5: Sacred Symbol: Gearlock at level 11 grants +20% damage to Jupiter.',
	'destiny-lotus':
		'Genesis-weapon-liberation ("Destiny") run of the same fight; §3.2 publishes only its Combat Power gate, so no independent HP/level data is stored.',
	'champion-lotus':
		'Champion-mode variant of the same fight; §3.2 publishes only its Combat Power gate.',
	'destiny-damien':
		'Genesis-weapon-liberation ("Destiny") run; §3.2 publishes only its Combat Power gate.',
	'destiny-lucid':
		'Genesis-weapon-liberation ("Destiny") run; §3.2 publishes only its Combat Power gate.',
	'destiny-will':
		'Genesis-weapon-liberation ("Destiny") run; §3.2 publishes only its Combat Power gate.',
	'destiny-verus-hilla':
		'Genesis-weapon-liberation ("Destiny") run; §3.2 publishes only its Combat Power gate.',
	'champion-verus-hilla': 'Champion-mode variant; §3.2 publishes only its Combat Power gate.',
	'champion-black-mage': 'Champion-mode variant; §3.2 publishes only its Combat Power gate.',
	'destiny-chosen-seren':
		'Genesis-weapon-liberation ("Destiny") run; §3.2 publishes only its Combat Power gate.',
	'champion-chosen-seren': 'Champion-mode variant; §3.2 publishes only its Combat Power gate.',
	'destiny-kalos':
		'Genesis-weapon-liberation ("Destiny") run. kms-tools.md §2.5 groups it with Chaos Kalos (Lv 285, 380% guard, 330 SAC, party 6).',
	'champion-kalos': 'Champion-mode variant; §3.2 publishes only its Combat Power gate.',
	'destiny-kaling':
		'Genesis-weapon-liberation ("Destiny") run. kms-tools.md §2.5 groups it with Hard Kaling (Lv 285, 380% guard, 350 SAC).',
	'chaos-papulatus': 'Phase 1 is the 539,925 HP clock entry.',
	'normal-papulatus': 'Phase 1 is the 539,925 HP clock entry.',
	'easy-papulatus': 'Phase 1 is the 539,925 HP clock entry.'
};

const CONFLICTS = {
	'hard-jupiter': [
		{
			field: 'hp.total',
			chosen: 49.4e15,
			chosenSource: 'bosses.md §1.2 (maplestorywiki Jupiter/Monster), recommended',
			alternatives: [
				{
					value: 49.4e15,
					source:
						'masonym.dev bossData.js phase split 9.88Q + 19.76Q + 19.76Q (existing-tools.md §5.1), which sums to the same total'
				},
				{
					value: 148.2e15,
					source:
						'existing-tools.md §5.2 reads the wiki as quoting 49.4Q *per phase*, which would triple the total'
				}
			],
			note: 'The two published readings agree on 49.4Q as the total and disagree only on whether 49.4Q is per phase. bosses.md §1.2 stores it as the total; that is what is used here. Phase splits are not stored because §1.2 leaves the column blank.'
		},
		{
			field: 'crystal.nonHeroic.solo',
			chosen: 1190600000,
			chosenSource: 'bosses.md §1.2 and §1.6 (Intense Power Crystal page, GMS v270)',
			alternatives: [
				{ value: 1205200000, source: 'masonym.dev bossData.js (existing-tools.md §5.1)' }
			]
		}
	],
	'normal-jupiter': [
		{
			field: 'crystal.nonHeroic.solo',
			chosen: 593000000,
			chosenSource: 'bosses.md §1.2 and §1.6',
			alternatives: [
				{ value: 591000000, source: 'masonym.dev bossData.js (existing-tools.md §5.1)' }
			]
		}
	],
	'hard-kaling': [
		{
			field: 'hp.total',
			chosen: 12.091e15,
			chosenSource: 'bosses.md §1.2 / §2.2 (maplestorywiki Kaling/Monster), recommended',
			alternatives: [
				{ value: 17.775e15, source: 'thedigitalcrowns.com 5%-HP chart — the pre-nerf value, stale' }
			],
			note: 'Kaling was reduced to 12.091Q in the Carcion Octo Festival patch.'
		}
	],
	'hard-mori-ranmaru': [
		{
			field: 'hp.total',
			chosen: 2.1e9,
			chosenSource: 'bosses.md §1.2 / §1.5 (GMS), recommended',
			alternatives: [
				{ value: 84e9, source: 'non-GMS regions; GMS never received the HP buff (bosses.md §1.5)' }
			]
		}
	],
	'chaos-vellum': [
		{
			field: 'hp.total',
			chosen: 200e9,
			chosenSource: 'bosses.md §1.2 / §1.5 (GMS), recommended',
			alternatives: [{ value: 120e9, source: 'MSEA (bosses.md §1.5)' }]
		}
	],
	'hard-limbo': [
		{
			field: 'cpGate.solo',
			chosen: 1000000000,
			chosenSource:
				'bosses.md §3.2 summary table and the Limbo/Monster infobox — §3.3 says "prefer the summary table in §3.2"',
			alternatives: [
				{
					value: 1500000000,
					source: 'the Combat_Power page worked example quoted in bosses.md §3.1 / §3.3'
				}
			],
			note: 'bosses.md §3.3 and §6.4 flag this as an unresolved internal wiki inconsistency.'
		},
		{
			field: 'cpGate.perMember.3',
			chosen: 210000000,
			chosenSource:
				'Limbo/Monster infobox, verbatim in existing-tools.md §5.2 (combatPower3: 3-Person 210,000,000)',
			alternatives: [
				{
					value: 320000000,
					source:
						'the Combat_Power worked example (bosses.md §3.1): "when entering with 3 players, the minimum Combat Power of each party member cannot be lower than 320,000,000" against a 1,500,000,000 total'
				}
			],
			note: 'The same infobox lists 320,000,000 as the 2-person floor. Both readings are internally consistent (21.3% and 21.0% of their respective totals) — only the pairing differs.'
		}
	],
	'hard-will': [
		{
			field: 'cpGate.solo',
			chosen: 20000000,
			chosenSource: 'bosses.md §3.2 summary table — §3.3 says to prefer it',
			alternatives: [
				{ value: 18000000, source: 'the Will boss-page infobox (bosses.md §3.3 note)' }
			]
		},
		{
			field: 'hp.phases',
			chosen: '3 phases: 42T + 31.5T + 52.5T',
			chosenSource: 'bosses.md §1.2',
			alternatives: [
				{
					value: '4 phases: 21T + 21T + 31.5T + 52.5T',
					source: 'masonym.dev bossData.js (existing-tools.md §5.1)'
				}
			],
			note: 'Same total (126T); masonym splits the first phase in two.'
		}
	],
	'chaos-gloom': [
		{
			field: 'cpGate.solo',
			chosen: 20000000,
			chosenSource: 'bosses.md §3.2 summary table — §3.3 says to prefer it',
			alternatives: [
				{ value: 18000000, source: 'the Gloom boss-page infobox (bosses.md §3.3 note)' }
			]
		},
		{
			field: 'hp.total',
			chosen: 127.05e12,
			chosenSource: 'bosses.md §1.2',
			alternatives: [
				{ value: 127.5e12, source: 'masonym.dev bossData.js (existing-tools.md §5.1)' }
			]
		}
	],
	'normal-gloom': [
		{
			field: 'hp.total',
			chosen: 25.41e12,
			chosenSource: 'bosses.md §1.2',
			alternatives: [{ value: 25.5e12, source: 'masonym.dev bossData.js (existing-tools.md §5.1)' }]
		}
	],
	'normal-darknell': [
		{
			field: 'force.type',
			chosen: 'arcane',
			chosenSource:
				'bosses.md §1.2 uses the ✦ (Arcane) glyph; existing-tools.md §2 lists 하드 듄켈 as Arcane 850; kms-tools.md §2.5 groups Darknell with the 300%-guard Arcane bosses; masonym records AF 850',
			alternatives: [{ value: 'sacred', source: 'bosses.md §4.5 table lists Darknell as SAC' }],
			note: 'Darknell is a Tenebris (Arcane River) boss; §4.5 appears to be the outlier. Flagged for re-verification.'
		},
		{
			field: 'hp.total',
			chosen: 26.25e12,
			chosenSource: 'bosses.md §1.2',
			alternatives: [{ value: 26e12, source: 'masonym.dev bossData.js (existing-tools.md §5.1)' }]
		}
	],
	'hard-darknell': [
		{
			field: 'force.type',
			chosen: 'arcane',
			chosenSource:
				'bosses.md §1.2 ✦ glyph; existing-tools.md §2 (Arcane 850); kms-tools.md §2.5; masonym AF 850',
			alternatives: [{ value: 'sacred', source: 'bosses.md §4.5 table lists Darknell as SAC' }],
			note: 'Darknell is a Tenebris (Arcane River) boss; §4.5 appears to be the outlier.'
		}
	],
	'normal-verus-hilla': [
		{
			field: 'hp.total',
			chosen: 89.25e12,
			chosenSource: 'bosses.md §1.2 (GMS wiki) — §6.7 says not to mix KMS and GMS HP datasets',
			alternatives: [
				{ value: 61.2e12, source: 'namu.wiki (KMS), bosses.md §6.7' },
				{ value: 88e12, source: 'masonym.dev bossData.js (existing-tools.md §5.1)' }
			]
		}
	],
	'hard-verus-hilla': [
		{
			field: 'hp.total',
			chosen: 178.5e12,
			chosenSource: 'bosses.md §1.2 (GMS wiki)',
			alternatives: [{ value: 176e12, source: 'masonym.dev bossData.js (existing-tools.md §5.1)' }]
		}
	],
	'hard-black-mage': [
		{
			field: 'hp.total',
			chosen: 472.5e12,
			chosenSource: 'bosses.md §1.2 (GMS wiki) — §6.7 says not to mix KMS and GMS HP datasets',
			alternatives: [{ value: 165.8e12, source: 'namu.wiki (KMS), bosses.md §6.7' }]
		},
		{
			field: 'level',
			chosen: 265,
			chosenSource: 'bosses.md §1.2',
			alternatives: [
				{ value: 275, source: 'kms-tools.md §2.5 and masonym.dev (existing-tools.md §5.1)' }
			]
		}
	],
	'extreme-black-mage': [
		{
			field: 'level',
			chosen: 275,
			chosenSource: 'bosses.md §1.2',
			alternatives: [{ value: 280, source: 'kms-tools.md §2.5' }]
		},
		{
			field: 'hp.total',
			chosen: 4.811e15,
			chosenSource: 'bosses.md §1.2',
			alternatives: [
				{
					value: 4.807e15,
					source: 'masonym.dev phase split 1.18Q + 1.19Q + 1.285Q + 1.152Q (existing-tools.md §5.1)'
				}
			]
		}
	],
	'chaos-papulatus': [
		{
			field: 'pdr',
			chosen: 25,
			chosenSource: 'bosses.md §1.2 (wiki Monster template)',
			alternatives: [
				{ value: 250, source: 'masonym.dev bossData.js (existing-tools.md §5.1)' },
				{ value: 300, source: 'MapleScouter guard value, kms-tools.md §2.5' }
			],
			note: 'The 25% figure is shared by every Papulatus difficulty in the wiki template and looks like a template artefact; a 25% PDR at Chaos is implausible next to its neighbours. Flagged for re-verification.'
		},
		{
			field: 'level',
			chosen: 190,
			chosenSource: 'bosses.md §1.2',
			alternatives: [{ value: 200, source: 'kms-tools.md §2.5' }]
		},
		{
			field: 'partyMax',
			chosen: 6,
			chosenSource: 'bosses.md §1.2 and §1.6 (six crystal columns)',
			alternatives: [{ value: 1, source: 'MapleScouter partyLimit, kms-tools.md §2.5' }]
		}
	],
	'chaos-zakum': [
		{
			field: 'pdr',
			chosen: 50,
			chosenSource: 'bosses.md §1.2',
			alternatives: [
				{
					value: 100,
					source: 'MapleScouter guard value, kms-tools.md §2.5; masonym.dev also records 100%'
				}
			]
		}
	],
	'normal-kalos': [
		{
			field: 'level',
			chosen: 275,
			chosenSource: 'bosses.md §1.2',
			alternatives: [{ value: 280, source: 'kms-tools.md §2.5' }]
		},
		{
			field: 'pdr',
			chosen: 330,
			chosenSource: 'bosses.md §1.2',
			alternatives: [{ value: 380, source: 'MapleScouter guard value, kms-tools.md §2.5' }]
		}
	],
	'easy-kalos': [
		{
			field: 'pdr',
			chosen: 330,
			chosenSource: 'bosses.md §1.2',
			alternatives: [{ value: 380, source: 'MapleScouter guard value, kms-tools.md §2.5' }]
		}
	],
	'extreme-kalos': [
		{
			field: 'hp.phases',
			chosen: '5.798Q + 15.498Q',
			chosenSource: 'bosses.md §1.2',
			alternatives: [
				{ value: '5.97Q + 15.6Q', source: 'masonym.dev bossData.js (existing-tools.md §5.1)' }
			]
		}
	],
	'extreme-lotus': [
		{
			field: 'hp.phases',
			chosen: '543.3T + 543.3T + 724.4T',
			chosenSource: 'bosses.md §1.2',
			alternatives: [
				{ value: '545T + 545T + 720T', source: 'masonym.dev bossData.js (existing-tools.md §5.1)' }
			]
		}
	],
	'extreme-chosen-seren': [
		{
			field: 'level',
			chosen: 275,
			chosenSource: 'bosses.md §1.2',
			alternatives: [{ value: 280, source: 'kms-tools.md §2.5' }]
		}
	],
	'extreme-kaling': [
		{
			field: 'hp.phases',
			chosen: '8 phases: 6.018Q x3 + 6.93Q x4 + 8.662Q (sum 54.436Q)',
			chosenSource: 'bosses.md §1.2',
			alternatives: [
				{
					value: '4 phases: 18.2Q + 6.93Q + 8.662Q + 20.8Q (sum 54.592Q)',
					source: 'masonym.dev bossData.js (existing-tools.md §5.1)'
				}
			]
		}
	],
	'hard-baldrix': [
		{
			field: 'hp.total',
			chosen: 20.3397e15,
			chosenSource: 'bosses.md §1.2',
			alternatives: [
				{
					value: 20.3394e15,
					source: 'masonym.dev phase split 5.3446Q + 5.6858Q + 9.309Q (existing-tools.md §5.1)'
				}
			]
		}
	],
	'hard-malefic-star': [
		{
			field: 'hp.phases',
			chosen: 'not stored — bosses.md §1.2 leaves the phase column blank',
			chosenSource: 'bosses.md §1.2',
			alternatives: [
				{
					value: '2.948Q + 5.896Q + 5.896Q (sums to the stored 14.74Q)',
					source: 'masonym.dev bossData.js (existing-tools.md §5.1)'
				}
			]
		}
	],
	'normal-baldrix': [
		{
			field: 'timeLimitMin',
			chosen: 30,
			chosenSource: 'bosses.md §1.2 / §1.8 (wiki v270), recommended as current-GMS',
			alternatives: [
				{
					value: 20,
					source:
						'vortexgaming.io report of a KMS OVERDRIVE change on 2026-06-19; unconfirmed in GMS (bosses.md §1.8)'
				}
			]
		}
	]
};
CONFLICTS['hard-baldrix'].push({
	field: 'timeLimitMin',
	chosen: 30,
	chosenSource: 'bosses.md §1.2 / §1.8 (wiki v270), recommended as current-GMS',
	alternatives: [{ value: 20, source: 'vortexgaming.io KMS OVERDRIVE report; unconfirmed in GMS' }]
});

const P = (...hp) => hp.map((h, i) => ({ label: `Phase ${i + 1}`, hp: h }));

// [boss, bossName, difficulty, level, entryLevel, hpTotal, phases, pdr, timeLimitMin,
//  deathCount, deathGauge, partyMax, reset]
const MASTER = [
	[
		'zakum',
		'Zakum',
		'easy',
		50,
		50,
		3.832e6,
		P(204e3, 204e3, 204e3, 204e3, 204e3, 204e3, 204e3, 204e3, 2.2e6),
		20,
		20,
		50,
		null,
		6,
		'daily'
	],
	[
		'zakum',
		'Zakum',
		'normal',
		110,
		90,
		12.6e6,
		P(700e3, 700e3, 700e3, 700e3, 700e3, 700e3, 700e3, 700e3, 7e6),
		40,
		30,
		5,
		null,
		6,
		'daily'
	],
	[
		'zakum',
		'Zakum',
		'chaos',
		180,
		90,
		168e9,
		P(10.5e9, 10.5e9, 10.5e9, 10.5e9, 10.5e9, 10.5e9, 10.5e9, 10.5e9, 84e9),
		50,
		30,
		5,
		null,
		6,
		'weekly'
	],
	['hilla', 'Hilla', 'normal', 110, 85, 500e6, null, 50, 30, null, null, 6, 'daily'],
	['hilla', 'Hilla', 'hard', 190, 170, 16.8e9, null, 100, 30, 15, null, 6, 'weekly'],
	['pink-bean', 'Pink Bean', 'normal', 180, 140, 2.1e9, null, 70, 30, 5, null, 6, 'daily'],
	['pink-bean', 'Pink Bean', 'chaos', 190, 170, 69.3e9, null, 100, 30, 5, null, 6, 'weekly'],
	['cygnus', 'Cygnus', 'easy', 140, 165, 10.5e9, null, 100, 30, 5, null, 6, 'weekly'],
	['cygnus', 'Cygnus', 'normal', 190, 165, 63e9, null, 100, 30, 5, null, 6, 'weekly'],
	['pierre', 'Pierre', 'normal', 120, 125, 315e6, null, 50, 15, 5, null, 6, 'daily'],
	['pierre', 'Pierre', 'chaos', 190, 180, 80e9, null, 80, 20, 5, null, 6, 'weekly'],
	['von-bon', 'Von Bon', 'normal', 120, 125, 315e6, null, 50, 8, 5, null, 6, 'daily'],
	['von-bon', 'Von Bon', 'chaos', 190, 180, 100e9, null, 100, 10, 5, null, 6, 'weekly'],
	['crimson-queen', 'Crimson Queen', 'normal', 120, 125, 315e6, null, 50, 15, 5, null, 6, 'daily'],
	['crimson-queen', 'Crimson Queen', 'chaos', 190, 180, 140e9, null, 120, 20, 5, null, 6, 'weekly'],
	['vellum', 'Vellum', 'normal', 130, 125, 550e6, null, 55, 15, 5, null, 6, 'daily'],
	['vellum', 'Vellum', 'chaos', 190, 180, 200e9, null, 200, 20, 5, null, 6, 'weekly'],
	['von-leon', 'Von Leon', 'easy', 120, 125, 700e6, null, 50, 30, 5, null, 6, 'daily'],
	['von-leon', 'Von Leon', 'normal', 129, 125, 6.3e9, null, 80, 30, 5, null, 6, 'daily'],
	['von-leon', 'Von Leon', 'hard', 150, 125, 10.5e9, null, 90, 30, 5, null, 6, 'daily'],
	['horntail', 'Horntail', 'easy', 130, 130, 1.0176e9, null, 40, 30, 10, null, 6, 'daily'],
	['horntail', 'Horntail', 'normal', 160, 130, 2.75e9, null, 40, 30, 5, null, 6, 'daily'],
	['horntail', 'Horntail', 'chaos', 160, 135, 26.6e9, null, 50, 30, 5, null, 6, 'daily'],
	['arkarium', 'Arkarium', 'easy', 130, 140, 2.1e9, null, 60, 30, 5, null, 6, 'daily'],
	['arkarium', 'Arkarium', 'normal', 170, 140, 12.6e9, null, 90, 30, 5, null, 6, 'daily'],
	['magnus', 'Magnus', 'easy', 110, 115, 400e6, null, 50, 30, 5, null, 6, 'daily'],
	['magnus', 'Magnus', 'normal', 130, 155, 6e9, null, 50, 30, 10, null, 6, 'daily'],
	['magnus', 'Magnus', 'hard', 190, 175, 120e9, null, 120, 30, 15, null, 6, 'weekly'],
	[
		'papulatus',
		'Papulatus',
		'easy',
		125,
		115,
		400539925,
		P(539925, 300e6, 100e6),
		25,
		20,
		50,
		null,
		6,
		'daily'
	],
	[
		'papulatus',
		'Papulatus',
		'normal',
		155,
		155,
		16800539925,
		P(539925, 12.6e9, 4.2e9),
		25,
		30,
		5,
		null,
		6,
		'daily'
	],
	[
		'papulatus',
		'Papulatus',
		'chaos',
		190,
		190,
		504000539925,
		P(539925, 378e9, 126e9),
		25,
		30,
		5,
		null,
		6,
		'weekly'
	],
	['mori-ranmaru', 'Mori Ranmaru', 'normal', 129, 120, 1e9, null, 55, 60, 10, null, 6, 'daily'],
	['mori-ranmaru', 'Mori Ranmaru', 'hard', 195, 180, 2.1e9, null, 90, 60, 5, null, 6, 'daily'],
	[
		'gollux',
		'Gollux',
		'easy',
		180,
		180,
		120e6,
		[
			{ label: 'Head P1 (jaw)', hp: 50e6 },
			{ label: 'Head P2 (eyes)', hp: 50e6 },
			{ label: 'Head P3 (jewel)', hp: 10e6 },
			{ label: 'Corrupted Heart', hp: 10e6 }
		],
		10,
		30,
		5,
		null,
		6,
		'daily'
	],
	[
		'gollux',
		'Gollux',
		'normal',
		180,
		180,
		6.61e9,
		[
			{ label: 'Head P1 (jaw)', hp: 3e9 },
			{ label: 'Head P2 (eyes)', hp: 3e9 },
			{ label: 'Head P3 (jewel)', hp: 600e6 },
			{ label: 'Corrupted Heart', hp: 10e6 }
		],
		null,
		30,
		5,
		null,
		6,
		'daily'
	],
	[
		'gollux',
		'Gollux',
		'hard',
		190,
		180,
		165.01e9,
		[
			{ label: 'Head P1 (jaw)', hp: 75e9 },
			{ label: 'Head P2 (eyes)', hp: 75e9 },
			{ label: 'Head P3 (jewel)', hp: 15e9 },
			{ label: 'Corrupted Heart', hp: 10e6 }
		],
		150,
		30,
		5,
		null,
		6,
		'daily'
	],
	[
		'ursus',
		'Ursus',
		'normal',
		129,
		100,
		2.625e12,
		null,
		10,
		null,
		null,
		'80 shared lives',
		18,
		'daily'
	],
	[
		'balrog',
		'Balrog',
		'easy',
		null,
		65,
		4787520,
		P(2400000, 1152000, 1235520),
		25,
		20,
		null,
		null,
		6,
		null
	],
	['omni-cln', 'OMNI-CLN', 'normal', 180, 180, 1.68e9, null, 60, 30, 5, null, 6, 'daily'],
	['princess-no', 'Princess No', 'normal', 180, 180, 500e9, null, 100, 30, 5, null, 6, 'weekly'],
	[
		'akechi-mitsuhide',
		'Akechi Mitsuhide',
		'normal',
		210,
		200,
		701e9,
		P(350e9, 350e9, 1e9),
		300,
		30,
		5,
		null,
		6,
		'weekly'
	],
	[
		'lotus',
		'Lotus',
		'normal',
		210,
		190,
		1.575e12,
		P(472.5e9, 472.5e9, 630e9),
		300,
		30,
		5,
		null,
		6,
		'weekly'
	],
	[
		'lotus',
		'Lotus',
		'hard',
		210,
		190,
		33.285e12,
		P(9.9855e12, 9.9855e12, 13.314e12),
		300,
		30,
		5,
		null,
		6,
		'weekly'
	],
	[
		'lotus',
		'Lotus',
		'extreme',
		285,
		190,
		1.811e15,
		P(543.3e12, 543.3e12, 724.4e12),
		380,
		30,
		5,
		null,
		2,
		'weekly'
	],
	['damien', 'Damien', 'normal', 210, 190, 1.2e12, P(840e9, 360e9), 300, 30, 10, null, 6, 'weekly'],
	[
		'damien',
		'Damien',
		'hard',
		210,
		190,
		36e12,
		P(25.2e12, 10.8e12),
		300,
		30,
		10,
		null,
		6,
		'weekly'
	],
	[
		'guardian-angel-slime',
		'Guardian Angel Slime',
		'normal',
		220,
		210,
		5e12,
		null,
		300,
		30,
		5,
		null,
		6,
		'weekly'
	],
	[
		'guardian-angel-slime',
		'Guardian Angel Slime',
		'chaos',
		250,
		210,
		90e12,
		null,
		300,
		30,
		5,
		null,
		6,
		'weekly'
	],
	['lucid', 'Lucid', 'easy', 230, 220, 12e12, P(6e12, 6e12), 300, 30, 10, null, 6, 'weekly'],
	['lucid', 'Lucid', 'normal', 230, 220, 24e12, P(12e12, 12e12), 300, 30, 10, null, 6, 'weekly'],
	[
		'lucid',
		'Lucid',
		'hard',
		230,
		220,
		117.6e12,
		P(50.8e12, 54e12, 12.8e12),
		300,
		30,
		10,
		null,
		6,
		'weekly'
	],
	[
		'will',
		'Will',
		'easy',
		235,
		235,
		16.8e12,
		P(5.6e12, 4.2e12, 7e12),
		300,
		30,
		10,
		null,
		6,
		'weekly'
	],
	[
		'will',
		'Will',
		'normal',
		250,
		235,
		25.2e12,
		P(8.4e12, 6.3e12, 10.5e12),
		300,
		30,
		10,
		null,
		6,
		'weekly'
	],
	[
		'will',
		'Will',
		'hard',
		250,
		235,
		126e12,
		P(42e12, 31.5e12, 52.5e12),
		300,
		30,
		10,
		null,
		6,
		'weekly'
	],
	['gloom', 'Gloom', 'normal', 255, 245, 25.41e12, null, 300, 30, 5, null, 6, 'weekly'],
	['gloom', 'Gloom', 'chaos', 255, 245, 127.05e12, null, 300, 30, 5, null, 6, 'weekly'],
	[
		'verus-hilla',
		'Verus Hilla',
		'normal',
		250,
		250,
		89.25e12,
		null,
		300,
		30,
		5,
		'5 Spirit Stones',
		6,
		'weekly'
	],
	[
		'verus-hilla',
		'Verus Hilla',
		'hard',
		250,
		250,
		178.5e12,
		null,
		300,
		30,
		5,
		'5 Spirit Stones',
		6,
		'weekly'
	],
	['darknell', 'Darknell', 'normal', 265, 255, 26.25e12, null, 300, 30, 5, null, 6, 'weekly'],
	['darknell', 'Darknell', 'hard', 265, 255, 157.5e12, null, 300, 30, 5, null, 6, 'weekly'],
	[
		'black-mage',
		'Black Mage',
		'hard',
		265,
		255,
		472.5e12,
		null,
		300,
		60,
		12,
		'12-step Life Gauge',
		6,
		'monthly'
	],
	[
		'black-mage',
		'Black Mage',
		'extreme',
		275,
		255,
		4.811e15,
		null,
		300,
		30,
		12,
		'12-step Life Gauge',
		6,
		'monthly'
	],
	[
		'chosen-seren',
		'Chosen Seren',
		'normal',
		270,
		260,
		207.9e12,
		null,
		380,
		30,
		5,
		null,
		6,
		'weekly'
	],
	['chosen-seren', 'Chosen Seren', 'hard', 275, 260, 483e12, null, 380, 30, 5, null, 6, 'weekly'],
	[
		'chosen-seren',
		'Chosen Seren',
		'extreme',
		275,
		260,
		6.48e15,
		null,
		380,
		30,
		8,
		null,
		6,
		'weekly'
	],
	[
		'kalos',
		'Kalos the Guardian',
		'easy',
		270,
		265,
		357e12,
		P(94.5e12, 262.5e12),
		330,
		30,
		5,
		null,
		6,
		'weekly'
	],
	[
		'kalos',
		'Kalos the Guardian',
		'normal',
		275,
		265,
		1.056e15,
		P(336e12, 720e12),
		330,
		30,
		5,
		null,
		6,
		'weekly'
	],
	[
		'kalos',
		'Kalos the Guardian',
		'chaos',
		285,
		265,
		5.126e15,
		P(1.066e15, 4.06e15),
		380,
		30,
		8,
		null,
		6,
		'weekly'
	],
	[
		'kalos',
		'Kalos the Guardian',
		'extreme',
		285,
		265,
		21.296e15,
		P(5.798e15, 15.498e15),
		380,
		30,
		8,
		null,
		6,
		'weekly'
	],
	[
		'first-adversary',
		'First Adversary',
		'easy',
		270,
		270,
		570e12,
		P(171e12, 171e12, 228e12),
		380,
		30,
		null,
		'Adversarial Will 1000->0; -200 per death (per player)',
		3,
		'weekly'
	],
	[
		'first-adversary',
		'First Adversary',
		'normal',
		280,
		270,
		1.65e15,
		P(495e12, 495e12, 660e12),
		380,
		30,
		null,
		'Adversarial Will 1000->0; -200 per death (per player)',
		3,
		'weekly'
	],
	[
		'first-adversary',
		'First Adversary',
		'hard',
		285,
		270,
		10.45e15,
		P(3.135e15, 3.135e15, 4.18e15),
		380,
		30,
		null,
		'Adversarial Will 1000->0; -200 per death (per player)',
		3,
		'weekly'
	],
	[
		'first-adversary',
		'First Adversary',
		'extreme',
		290,
		270,
		32.18e15,
		P(9.655e15, 9.655e15, 12.87e15),
		380,
		30,
		null,
		'Adversarial Will 1000->0; -200 per death (per player)',
		3,
		'weekly'
	],
	[
		'kaling',
		'Kaling',
		'easy',
		275,
		275,
		921e12,
		null,
		380,
		30,
		null,
		'Willpower 1000 shared; -160/100/80/70/60/50 per death at party size 1-6',
		6,
		'weekly'
	],
	[
		'kaling',
		'Kaling',
		'normal',
		285,
		275,
		3.923e15,
		P(399e12, 399e12, 399e12, 468e12, 512e12, 512e12, 512e12, 722e12),
		380,
		30,
		null,
		'Willpower 1000 shared; -160/100/80/70/60/50 per death at party size 1-6',
		6,
		'weekly'
	],
	[
		'kaling',
		'Kaling',
		'hard',
		285,
		275,
		12.091e15,
		P(920e12, 920e12, 920e12, 1.404e15, 1.827e15, 1.827e15, 1.827e15, 2.446e15),
		380,
		30,
		null,
		'Willpower 1000 shared; -160/100/80/70/60/50 per death at party size 1-6',
		6,
		'weekly'
	],
	[
		'kaling',
		'Kaling',
		'extreme',
		285,
		275,
		54.436e15,
		P(6.018e15, 6.018e15, 6.018e15, 6.93e15, 6.93e15, 6.93e15, 6.93e15, 8.662e15),
		380,
		30,
		null,
		'Willpower 1000 shared; -160/100/80/70/60/50 per death at party size 1-6',
		6,
		'weekly'
	],
	[
		'malefic-star',
		'Malefic Star',
		'normal',
		280,
		280,
		3.288e15,
		null,
		380,
		30,
		5,
		null,
		3,
		'weekly'
	],
	['malefic-star', 'Malefic Star', 'hard', 280, 280, 14.74e15, null, 380, 30, 5, null, 3, 'weekly'],
	[
		'limbo',
		'Limbo',
		'normal',
		285,
		285,
		6.505e15,
		null,
		380,
		30,
		null,
		'Erosion 0->1000 per player; +150 per death',
		3,
		'weekly'
	],
	[
		'limbo',
		'Limbo',
		'hard',
		285,
		285,
		12.5e15,
		null,
		380,
		30,
		null,
		'Erosion 0->1000 per player; +150 per death',
		3,
		'weekly'
	],
	[
		'baldrix',
		'Baldrix',
		'normal',
		290,
		290,
		9.05681e15,
		null,
		380,
		30,
		null,
		'Magic Encroachment 0->1000 shared; +200/100/70 per death at party size 1/2/3',
		3,
		'weekly'
	],
	[
		'baldrix',
		'Baldrix',
		'hard',
		290,
		290,
		20.3397e15,
		null,
		380,
		30,
		null,
		'Magic Encroachment 0->1000 shared; +200/100/70 per death at party size 1/2/3',
		3,
		'weekly'
	],
	[
		'jupiter',
		'Jupiter',
		'normal',
		295,
		295,
		10.266e15,
		null,
		380,
		30,
		null,
		'Rupture 0->1000; +150 (separated) / +200 (combined) per death [low confidence]',
		3,
		'weekly'
	],
	[
		'jupiter',
		'Jupiter',
		'hard',
		295,
		295,
		49.4e15,
		null,
		380,
		30,
		null,
		'Rupture 0->1000; +150 (separated) / +200 (combined) per death [low confidence]',
		3,
		'weekly'
	],
	// Destiny (Genesis liberation) and Champion mode variants. §3.2 publishes a Combat Power
	// gate for each; no other field is sourced, so everything else is deliberately absent.
	['lotus', 'Lotus', 'destiny', null, null, null, null, null, null, null, null, null, null],
	['lotus', 'Lotus', 'champion', null, null, null, null, null, null, null, null, null, null],
	['damien', 'Damien', 'destiny', null, null, null, null, null, null, null, null, null, null],
	['lucid', 'Lucid', 'destiny', null, null, null, null, null, null, null, null, null, null],
	['will', 'Will', 'destiny', null, null, null, null, null, null, null, null, null, null],
	[
		'verus-hilla',
		'Verus Hilla',
		'destiny',
		null,
		null,
		null,
		null,
		null,
		null,
		null,
		null,
		null,
		null
	],
	[
		'verus-hilla',
		'Verus Hilla',
		'champion',
		null,
		null,
		null,
		null,
		null,
		null,
		null,
		null,
		null,
		null
	],
	[
		'black-mage',
		'Black Mage',
		'champion',
		null,
		null,
		null,
		null,
		null,
		null,
		null,
		null,
		null,
		null
	],
	[
		'chosen-seren',
		'Chosen Seren',
		'destiny',
		null,
		null,
		null,
		null,
		null,
		null,
		null,
		null,
		null,
		null
	],
	[
		'chosen-seren',
		'Chosen Seren',
		'champion',
		null,
		null,
		null,
		null,
		null,
		null,
		null,
		null,
		null,
		null
	],
	['kalos', 'Kalos the Guardian', 'destiny', 285, null, null, null, 380, null, null, null, 6, null],
	[
		'kalos',
		'Kalos the Guardian',
		'champion',
		null,
		null,
		null,
		null,
		null,
		null,
		null,
		null,
		null,
		null
	],
	['kaling', 'Kaling', 'destiny', 285, null, null, null, 380, null, null, null, 6, null]
];

const REGION_BY_FORCE = { arcane: 'arcane-river', sacred: 'grandis', none: 'legacy' };

const bosses = MASTER.map((row) => {
	const [
		boss,
		bossName,
		difficulty,
		level,
		entryLevel,
		hpTotal,
		phases,
		pdr,
		timeLimitMin,
		deathCount,
		deathGauge,
		partyMax,
		reset
	] = row;
	const id = `${difficulty}-${boss}`;
	const e = { id, boss, bossName };
	if (NAME_KO[boss]) e.nameKo = NAME_KO[boss];
	e.difficulty = difficulty;
	if (level != null) e.level = level;
	if (entryLevel != null) e.entryLevel = entryLevel;
	if (hpTotal != null) {
		e.hp = { total: hpTotal };
		if (phases) e.hp.phases = phases;
		e.hp.note =
			'All wiki HP figures are tagged "Estimated, may not be 100% accurate" (bosses.md §1.8).';
	}
	if (pdr != null) e.pdr = pdr;
	const force = FORCE[id];
	e.force = force ? { ...force } : { type: 'none' };
	if (timeLimitMin != null) e.timeLimitMin = timeLimitMin;
	if (deathCount != null) e.deathCount = deathCount;
	if (deathGauge != null) e.deathGauge = deathGauge;
	if (partyMax != null) e.partyMax = partyMax;
	if (reset != null) e.reset = reset;

	const crystal = CRYSTAL[id];
	if (crystal) {
		e.crystal = {
			solo: crystal[0] * HEROIC,
			byPartySize: crystal.map((v) => (v == null ? null : v * HEROIC)),
			heroicMultiplier: HEROIC,
			nonHeroic: { solo: crystal[0], byPartySize: crystal.slice() }
		};
	}
	const cpSolo = CP_SOLO[id];
	const cpPer = CP_PER_MEMBER[id];
	if (cpSolo != null || cpPer) {
		e.cpGate = {};
		if (cpSolo != null) e.cpGate.solo = cpSolo;
		if (cpPer) e.cpGate.perMember = { ...cpPer };
	}
	if (SCOUTER[id]) e.scouter = { ...SCOUTER[id] };

	e.region = REGION_BY_FORCE[e.force.type];

	const sources = ['bosses.md §1.2'];
	if (hpTotal != null) sources.push('bosses.md §1.8');
	if (['easy-gollux', 'normal-gollux', 'hard-gollux', 'normal-ursus', 'easy-balrog'].includes(id))
		sources.push('bosses.md §1.4');
	if (crystal) sources.push('bosses.md §1.6');
	if (cpSolo != null) sources.push('bosses.md §3.2');
	if (cpPer) sources.push(id.endsWith('-limbo') ? 'existing-tools.md §5.2' : 'bosses.md §3.3');
	if (force) sources.push('bosses.md §4.5');
	if (SCOUTER[id]) sources.push('kms-tools.md §2.4', 'kms-tools.md §2.5');
	e.sources = sources;

	if (NOTES[id]) e.notes = NOTES[id];
	if (CONFLICTS[id]) e.conflicts = CONFLICTS[id];
	return e;
});

const doc = {
	_comment: [
		'Generated by scripts/build-bosses.mjs from docs/research/bosses.md (primary),',
		'docs/research/kms-tools.md and docs/research/existing-tools.md. Do not hand-edit.',
		'',
		'HEROIC ONLY. This tracker targets Heroic (Reboot) worlds exclusively. bosses.md §1.6',
		'publishes only the non-Heroic Intense Power Crystal prices and states "Heroic (Reboot)',
		'worlds pay 5x the listed values", so crystal.solo and crystal.byPartySize below are the',
		'listed value x5 (the Heroic payout). The untouched source figures are kept alongside in',
		'crystal.nonHeroic so nothing is lost.',
		'',
		'hp is in raw HP. pdr is a percentage (300 = 300%), not the 3.00 decimal factor.',
		'cpGate values are the ChinaMS (CMS) minimum Combat Power entry gates; the wiki tags them',
		'(CMS) and GMS enforcement is unconfirmed (bosses.md §3.1, §6.3) — treat as advisory.',
		'region is DERIVED, not sourced: force.type arcane -> arcane-river, sacred -> grandis,',
		'none -> legacy. It is a grouping convenience, not a claim about in-game geography.',
		'Any field a source did not supply is omitted rather than estimated.'
	].join('\n'),
	generatedAt: new Date().toISOString().slice(0, 10),
	server: 'heroic',
	sources: [
		'docs/research/bosses.md §1.2 — master table (level, entry level, HP, phases, PDR, force, time, deaths, party, reset, crystal, min CP)',
		'docs/research/bosses.md §1.3 — corrections applied to naive HP sums (Horntail, Pierre, Crimson Queen)',
		'docs/research/bosses.md §1.4 — special-cased bosses (Gollux, Ursus, Balrog)',
		'docs/research/bosses.md §1.5 — GMS-specific divergences (Hard Mori Ranmaru, Chaos Vellum, crystal caps)',
		'docs/research/bosses.md §1.6 — full Intense Power Crystal price table, GMS v270 (non-Heroic; Heroic = x5)',
		'docs/research/bosses.md §1.7/§1.8 — reset boundaries and unsourced fields',
		'docs/research/bosses.md §2.2 — the 5%-of-total-HP loot contribution rule',
		'docs/research/bosses.md §3.2/§3.3 — CMS minimum Combat Power, solo and per party size',
		'docs/research/bosses.md §4.1-§4.5 — Arcane Power / Sacred Power tables and per-boss requirements',
		'docs/research/bosses.md §5.5 — mechanics that make effective HP diverge from listed HP',
		'docs/research/bosses.md Appendix A — Korean <-> GMS name mapping',
		'docs/research/bosses.md Appendix B — porting notes',
		'docs/research/kms-tools.md §2.4 — MapleScouter boss-cut constants',
		'docs/research/kms-tools.md §2.5 — MapleScouter boss reference data (level / guard / force / max party)',
		'docs/research/existing-tools.md §5.1/§5.2 — masonym.dev and maplestorywiki cross-checks used for the conflict records'
	],
	notes: [
		'Heroic-only dataset: crystal.solo / crystal.byPartySize are Heroic (Reboot) payouts, derived as the bosses.md §1.6 listed value x5 per the same section’s "Heroic (Reboot) worlds pay 5x" rule. bosses.md publishes no separate Heroic table.',
		'Crystal caps in GMS: 180 crystals per world per week and 14 Weekly-type crystals per character per week (bosses.md §1.5).',
		'Reset boundaries (daily 00:00 UTC, weekly Thursday 00:00 UTC) are community-sourced and not stored per boss (bosses.md §1.7).',
		'Black Mage is the only monthly-reset boss (1 clear/month, plus a separate 1 entry/day limit).',
		'Per-party-size CP floors are published for only a handful of bosses. Where absent, bosses.md §3.3 gives the approximation solo x {1, 0.325, 0.215, 0.16, 0.13, 0.106}[n] — exported from bosses.ts as CP_PARTY_SIZE_RATIOS rather than baked into this file.'
	],
	excluded: [
		{
			name: 'Bellona',
			nameKo: '벨로니아',
			reason:
				'KMS only — not in GMS (bosses.md §1.1, Appendix A). maplestorywiki lists Lv280, SAC 400/450/550, HP 316T / 463T / 1.652Q.'
		},
		{
			name: 'Malitia',
			reason:
				'JMS / CMS / TMS only — not in GMS (bosses.md §1.1). bosses.md §3.2 lists CMS CP gates of 25,000,000 (Normal) and 6,000,000,000 (Extreme).'
		},
		{
			name: 'Kai',
			reason:
				'Not in the GMS 2026 roster (bosses.md §1.1) and absent from the §1.2 master table. It appears only in the §3.2 CMS Combat Power table (Normal 20,000,000 / Hard 70,000,000) and as a `seasonal` entry in masonym.dev.'
		},
		{
			name: 'Yakuza Boss',
			reason:
				'Appears only in the §1.6 crystal price table (solo 722,000 non-Heroic). No HP, level, PDR, force, time limit or party data is tabulated anywhere in bosses.md.'
		},
		{
			name: 'Gigatoad',
			reason:
				'Appears only in the §1.6 crystal price table (solo 882,000 non-Heroic). No game data tabulated.'
		},
		{
			name: 'Frenzied Gigatoad',
			reason:
				'Appears only in the §1.6 crystal price table (solo 1,153,000 non-Heroic). No game data tabulated.'
		},
		{
			name: 'Gollux (Hell)',
			reason:
				'Real GMS content (§1.4: head total 770B, mob Lv 200, PDR 250%) but "hell" is not one of the difficulty keys this dataset uses; recorded in the notes on hard-gollux instead.'
		}
	],
	bosses
};

writeFileSync(OUT, JSON.stringify(doc, null, '\t') + '\n');
console.log(`wrote ${bosses.length} entries to ${OUT}`);
