// countries.json から問題プール（questions-1kyu.json / questions-2kyu.json）を作る。
// 乱数はシード固定なので、何度実行しても同じ結果になる。
// 使い方: npm run gen:questions
import fs from 'node:fs';

const countries = JSON.parse(fs.readFileSync('src/data/countries.json', 'utf8'));
const byId = new Map(countries.map((c) => [c.id, c]));

function mulberry32(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
let rand = mulberry32(1);
const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// 4:3の画像では見分けがつかない組み合わせ（インドネシアとモナコは縦横比しかちがわない）
const LOOKALIKE = [['ID', 'MC']];
const lookalike = (a, b) => LOOKALIKE.some(([x, y]) => (a === x && b === y) || (a === y && b === x));

const COLOR_NAMES = {
  red: '赤', white: '白', blue: '青', yellow: '黄色', green: '緑', black: '黒', orange: 'オレンジ', maroon: 'えんじ色',
};
const REGION_NAMES = {
  asia: 'アジア', europe: 'ヨーロッパ', africa: 'アフリカ', namerica: '北アメリカ', samerica: '南アメリカ', oceania: 'オセアニア',
};

const explain = (c) => `${c.name}の国旗：${c.flag}${c.meaning}\n【見分け方】${c.tip}`;
const hideName = (c, text) => text.split(c.name).join('〇〇');

// ダミーの国をえらぶ。hard=似た国旗→同じ地域→その他、easy=ちがう地域から
function pickDistractors(c, n, { hard, exclude = () => false }) {
  const ok = (d, chosen) =>
    d.id !== c.id && !lookalike(d.id, c.id) && !exclude(d) && !chosen.some((x) => x.id === d.id || lookalike(x.id, d.id));
  const tiers = hard
    ? [
        shuffle(c.similar.map((id) => byId.get(id))),
        shuffle(countries.filter((d) => d.similar.includes(c.id))),
        shuffle(countries.filter((d) => d.region === c.region)),
        shuffle(countries),
      ]
    : [shuffle(countries.filter((d) => d.region !== c.region)), shuffle(countries)];
  const chosen = [];
  for (const tier of tiers) {
    for (const d of tier) {
      if (chosen.length >= n) return chosen;
      if (ok(d, chosen)) chosen.push(d);
    }
  }
  return chosen;
}

const textChoices = (answer, others) => {
  const labels = [answer, ...others];
  return { choices: labels.map((text, i) => ({ id: `t${i}`, text })), answer: 't0' };
};

// ---- 選択式の問題の作り方 ----

function flagToName(c, hard) {
  const ds = pickDistractors(c, 3, { hard });
  return {
    type: 'flagToName',
    prompt: 'この国旗はどこの国かな？',
    flag: c.id,
    choices: [c, ...ds].map((d) => ({ id: d.id, text: d.name })),
    answer: c.id,
    answerText: c.name,
    explanation: explain(c),
    countryIds: [c.id],
  };
}

function nameToFlag(c, hard) {
  const ds = pickDistractors(c, 3, { hard });
  return {
    type: 'nameToFlag',
    prompt: `「${c.name}」の国旗はどれかな？`,
    choices: [c, ...ds].map((d) => ({ id: d.id, flag: d.id })),
    answer: c.id,
    answerText: c.name,
    explanation: explain(c),
    countryIds: [c.id],
  };
}

// 図柄・色・星・説明の問題は、国旗を見せずに知識で答えさせる（見れば分かる問題にしない）

function descriptionToName(c) {
  // 説明に出てくる色をすべてふくむ国旗は、ダミーにしない（答えが2つになるのをふせぐ）
  const covers = (d) => c.colors.every((col) => d.colors.includes(col));
  const ds = pickDistractors(c, 3, { hard: true, exclude: (d) => covers(d) || c.similar.includes(d.id) });
  return {
    type: 'descriptionToName',
    prompt: `「${hideName(c, c.flag)}」\nこんな国旗の国はどれかな？`,
    choices: [c, ...ds].map((d) => ({ id: d.id, text: d.name })),
    answer: c.id,
    answerText: c.name,
    explanation: explain(c),
    countryIds: [c.id],
  };
}

const SYMBOLS = {
  animal: '動物', plant: '植物', crown: '王冠（おうかん）', weapon: '武器', building: '建物',
  map: '国の地図', text: '文字', unionjack: 'イギリスの国旗（ユニオンジャック）', sun: '太陽', crescent: '三日月', cross: '十字',
};
// この記号のダミーにしてはいけない国旗（まぎらわしいもの）
const SYMBOL_EXCLUDE = {
  sun: (d) => d.symbols.includes('circle'),
  cross: (d) => d.symbols.includes('unionjack'),
};

// 「ワシ」「カエデの葉」のように具体的に言えるものは具体的に聞く
function symbolLabel(c, sym) {
  if (sym === 'animal' && c.animal && animalName(c.animal) !== '鳥') return animalName(c.animal);
  if (sym === 'plant' && c.plant && c.plant !== '木') return c.plant;
  if (sym === 'weapon' && c.item) return c.item;
  return SYMBOLS[sym];
}

function symbolToName(c, sym, hard) {
  const ds = pickDistractors(c, 3, {
    hard,
    exclude: (d) => d.symbols.includes(sym) || d.symbols.includes('emblem') || (SYMBOL_EXCLUDE[sym]?.(d) ?? false),
  });
  return {
    type: 'symbolToName',
    prompt: `国旗に${symbolLabel(c, sym)}がえがかれている国はどれかな？`,
    choices: [c, ...ds].map((d) => ({ id: d.id, text: d.name })),
    answer: c.id,
    answerText: c.name,
    explanation: explain(c),
    countryIds: [c.id],
  };
}

const animalName = (v) => (v.match(/（(.+)）/)?.[1] ?? v);
const ANIMAL_EXTRA = ['ゾウ', 'トラ', 'ウマ', 'クマ'];
const PLANT_EXTRA = ['サクラ', 'ヒマワリ', 'バラ', 'イネ'];
const ITEM_EXTRA = ['弓と矢', 'ハンマー'];
const BLADES = ['刀', '剣', 'なた'];

function whatIsDrawn(c, kind) {
  let answer, pool, prompt;
  if (kind === 'animal') {
    answer = animalName(c.animal);
    pool = [...new Set([...countries.filter((d) => d.animal).map((d) => animalName(d.animal)), ...ANIMAL_EXTRA])]
      .filter((a) => a !== '鳥');
    prompt = `${c.name}の国旗にえがかれている動物はどれかな？`;
  } else if (kind === 'plant') {
    answer = c.plant;
    pool = [...new Set([...countries.filter((d) => d.plant).map((d) => d.plant), ...PLANT_EXTRA])].filter((p) => p !== '木');
    prompt = `${c.name}の国旗にえがかれている植物はどれかな？`;
  } else {
    answer = c.item;
    pool = [...new Set([...countries.filter((d) => d.item).map((d) => d.item), ...ITEM_EXTRA])];
    prompt = `${c.name}の国旗にえがかれているものはどれかな？`;
  }
  const others = shuffle(pool.filter((p) => p !== answer && !(BLADES.includes(answer) && BLADES.includes(p)))).slice(0, 3);
  return {
    type: 'whatIsDrawn',
    prompt,
    ...textChoices(answer, others),
    answerText: answer,
    explanation: explain(c),
    countryIds: [c.id],
  };
}

function starCount(c) {
  const n = c.stars;
  const cands = shuffle([n - 2, n - 1, n + 1, n + 2, n + 3].filter((x) => x >= 1)).slice(0, 3);
  return {
    type: 'starCount',
    prompt: `${c.name}の国旗には、星がいくつえがかれているかな？`,
    ...textChoices(`${n}個`, cands.map((x) => `${x}個`)),
    answerText: `${n}個`,
    explanation: explain(c),
    countryIds: [c.id],
  };
}

const BASIC_COLORS = ['red', 'white', 'blue', 'yellow', 'green', 'black'];
const unusedColors = (c) =>
  BASIC_COLORS.filter(
    (col) => !c.colors.includes(col) && !(col === 'red' && (c.colors.includes('maroon') || c.colors.includes('orange'))),
  );
function unusedColor(c) {
  const used = shuffle(c.colors).slice(0, 3);
  const unused = shuffle(unusedColors(c))[0];
  return {
    type: 'unusedColor',
    prompt: `${c.name}の国旗に使われていない色はどれかな？`,
    ...textChoices(COLOR_NAMES[unused], used.map((col) => COLOR_NAMES[col])),
    answerText: COLOR_NAMES[unused],
    explanation: explain(c),
    countryIds: [c.id],
  };
}

// 意味・由来：その国の説明と、ほかの国の説明3つから選ぶ
function meaningOf(c) {
  // ダミーは、ちがう地域で、答えの国旗にない色を使っている国から選ぶ（色の意味が答えの国にもあてはまるのをふせぐ）
  const ds = pickDistractors(c, 3, {
    hard: false,
    exclude: (d) => d.region === c.region || d.colors.every((col) => c.colors.includes(col)) || c.similar.includes(d.id),
  });
  const [answer, ...others] = [c, ...ds].map((d) => hideName(d, d.meaning));
  return {
    type: 'meaning',
    prompt: `${c.name}の国旗の意味・由来として正しいのはどれかな？`,
    ...textChoices(answer, others),
    answerText: answer,
    explanation: explain(c),
    countryIds: [c.id],
  };
}

// ---- 記述式 ----

// iPadのキーボードや音声入力では漢字で入ることもあるので、国名・正式名称（漢字まじり）も正解にする
const accepted = (c) => [...new Set([c.reading, ...c.aliases, c.name, c.official])];

function writeName(c, withHint) {
  const hint = withHint
    ? `\nヒント：${REGION_NAMES[c.region]}の国。「${c.reading[0]}」で始まる${[...c.reading].length}文字。`
    : '';
  return {
    type: 'writeName',
    prompt: `この国旗の国の名前を書こう。${hint}`,
    flag: c.id,
    acceptedAnswers: accepted(c),
    answerText: c.name,
    explanation: explain(c),
    countryIds: [c.id],
  };
}

function writeFromDescription(c) {
  return {
    type: 'writeFromDescription',
    prompt: `「${hideName(c, c.flag)}」\nこんな国旗の国はどこかな？名前を書こう。`,
    acceptedAnswers: accepted(c),
    answerText: c.name,
    explanation: explain(c),
    countryIds: [c.id],
  };
}

// ---- 組み立て ----

const take = (list, n, label) => {
  if (list.length < n) throw new Error(`${label}: ${n}問ほしいが${list.length}問しか作れない`);
  return list.slice(0, n);
};
const cycle = (list, start, n) => Array.from({ length: n }, (_, i) => list[(start + i) % list.length]);

// イギリスは旗そのものがユニオンジャックなので「ユニオンジャックがえがかれている国」の答えにしない
const symbolPairs = () =>
  shuffle(
    countries.flatMap((c) =>
      Object.keys(SYMBOLS)
        .filter((s) => c.symbols.includes(s) && !(c.id === 'GB' && s === 'unionjack'))
        .map((s) => [c, s]),
    ),
  );
const colorTargets = () =>
  shuffle(countries.filter((c) => !c.symbols.includes('emblem') && c.colors.length >= 3 && unusedColors(c).length > 0));
// 説明だけで1つの国に決まりやすい、特ちょうのある国旗
const DISTINCT = ['animal', 'plant', 'crown', 'weapon', 'building', 'map', 'text', 'unionjack', 'sun', 'crescent'];
const distinctive = () =>
  shuffle(countries.filter((c) => DISTINCT.some((s) => c.symbols.includes(s)) || (c.stars ?? 0) >= 2));

function finalize(prefix, grade, format, items) {
  return items.map((q, i) => ({ id: `${prefix}-${String(i + 1).padStart(3, '0')}`, grade, format, ...q }));
}

function build1kyu() {
  rand = mulberry32(101);
  const order = shuffle(countries);
  const drawn = shuffle([
    ...countries.filter((c) => c.animal && animalName(c.animal) !== '鳥').map((c) => whatIsDrawn(c, 'animal')),
    ...countries.filter((c) => c.plant && c.plant !== '木').map((c) => whatIsDrawn(c, 'plant')),
    ...countries.filter((c) => c.item).map((c) => whatIsDrawn(c, 'item')),
    ...countries.filter((c) => (c.stars ?? 0) >= 2).map(starCount),
  ]);
  const choice = [
    ...cycle(order, 0, 60).map((c) => flagToName(c, true)),
    ...cycle(order, 60, 60).map((c) => nameToFlag(c, true)),
    ...take(shuffle(countries), 20, '1級 意味・由来').map(meaningOf),
    ...take(distinctive(), 40, '1級 説明→国名').map(descriptionToName),
    ...take(symbolPairs(), 25, '1級 図柄→国名').map(([c, s]) => symbolToName(c, s, true)),
    ...take(drawn, 25, '1級 何がえがかれている'),
    ...take(colorTargets(), 20, '1級 色').map(unusedColor),
  ];
  const writeDesc = take(distinctive(), 52, '1級 説明→記述');
  const written = [...order.map((c) => writeName(c, false)), ...writeDesc.map(writeFromDescription)];
  return [...finalize('k1-s', 1, 'choice', choice), ...finalize('k1-w', 1, 'written', written)];
}

function build2kyu() {
  rand = mulberry32(202);
  const order = shuffle(countries);
  const choice = [
    ...cycle(order, 0, 70).map((c) => flagToName(c, false)),
    ...cycle(order, 70, 70).map((c) => nameToFlag(c, false)),
    ...take(shuffle(countries), 20, '2級 意味・由来').map(meaningOf),
    ...take(symbolPairs(), 35, '2級 図柄→国名').map(([c, s]) => symbolToName(c, s, false)),
    ...take(colorTargets(), 30, '2級 色').map(unusedColor),
  ];
  // 2級の記述式は、名前の長い国をのぞいた175か国。ヒント付き
  const shortest = [...countries].sort((a, b) => [...a.reading].length - [...b.reading].length).slice(0, 175);
  const written = shuffle(shortest).map((c) => writeName(c, true));
  return [...finalize('k2-s', 2, 'choice', choice), ...finalize('k2-w', 2, 'written', written)];
}

const write = (file, qs) => fs.writeFileSync(file, '[\n' + qs.map((q) => JSON.stringify(q)).join(',\n') + '\n]\n');
const q1 = build1kyu();
const q2 = build2kyu();
write('src/data/questions-1kyu.json', q1);
write('src/data/questions-2kyu.json', q2);
const count = (qs, f) => qs.filter((q) => q.format === f).length;
console.log(`1級: 選択式${count(q1, 'choice')} 記述式${count(q1, 'written')}`);
console.log(`2級: 選択式${count(q2, 'choice')} 記述式${count(q2, 'written')}`);
