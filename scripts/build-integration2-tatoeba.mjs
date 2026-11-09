#!/usr/bin/env node
// build-integration2-tatoeba.mjs — Tatoeba example-sentence CANDIDATES (Đợt 2).
//
// Downloads the official Tatoeba weekly per-language exports (detailed
// sentences, which carry sentence_id + username, plus the separate CC0
// exports used ONLY to confirm CC0 status id-by-id), then applies a strict
// machine filter to produce a SMALL candidate set for human review:
//
//   src/content/examples-candidates.json   (courseId -> target -> [1 sentence])
//   scripts/tatoeba-review-list.txt        (one human-readable line per entry)
//
// Every entry has reviewStatus "machine-filtered". This script NEVER marks
// anything as human-approved; the coordinator reads the whole review list
// and approves/rejects by hand afterwards.
//
// NO Tatoeba audio is downloaded or used anywhere (audio licences are
// per-contributor and often empty = not reusable outside Tatoeba).
//
// Licences (verified 2026-11-09 on https://tatoeba.org/eng/downloads):
//   "These files are released under CC BY 2.0 FR. A part of our sentences
//    are also available under CC0 1.0."
// A sentence is labelled "CC0 1.0" ONLY when its id appears in the official
// per-language *_sentences_CC0.tsv.bz2 export downloaded alongside;
// everything else is labelled "CC BY 2.0 FR".
//
// Raw exports are cached in /tmp/tatoeba (NEVER committed). Re-run:
//   node scripts/build-integration2-tatoeba.mjs [--refresh]
// Full provenance: scripts/integration2-tatoeba-sources.md

import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = process.env.TATOEBA_DIR || "/tmp/tatoeba";
const REFRESH = process.argv.includes("--refresh");
const CAP_PER_LANG = 80; // 3 languages * 80 = 240 candidates max
const LICENSE_BY = "CC BY 2.0 FR";
const LICENSE_CC0 = "CC0 1.0";

const LANGS = [
  { courseId: "en-vi", tatoeba: "eng", pack: "en-vi.json" },
  { courseId: "ja-vi", tatoeba: "jpn", pack: "ja-vi.json" },
  { courseId: "zh-vi", tatoeba: "cmn", pack: "zh-vi.json" },
];

// ------------------------------------------------------------------ vocab ----
function loadPack(file) {
  const pack = JSON.parse(readFileSync(join(REPO, "src/content/packs", file), "utf8"));
  const targets = [];
  const have = new Set();
  for (const section of pack.sections ?? [])
    for (const unit of section.units ?? [])
      for (const word of unit.words ?? []) {
        if (!have.has(word.target)) { have.add(word.target); targets.push(word.target); }
      }
  return targets;
}

// --------------------------------------------------------------- downloads ----
function ensureFile(url, dest) {
  if (!REFRESH && existsSync(dest) && statSync(dest).size > 0) return "cached";
  execFileSync("curl", ["-fL", "--retry", "3", "-o", dest, url], { stdio: "inherit" });
  return "downloaded";
}

function lastModified(url) {
  try {
    const out = execFileSync("curl", ["-sI", url], { encoding: "utf8" });
    const m = out.match(/^Last-Modified:\s*(.+)$/im);
    return m ? m[1].trim() : null;
  } catch { return null; }
}

async function* streamLines(file) {
  const proc = spawn("bzcat", [file]);
  const rl = createInterface({ input: proc.stdout, crlfDelay: Infinity });
  for await (const line of rl) yield line;
}

// ============================================================== BLOCKLISTS ====
// Transparent, category-based blocklists. A sentence is rejected when it
// contains ANY entry of ANY category (substring match for ja/zh, whole-token
// match for en, except the phrase/abbreviation lists noted inline).
// Categories: sexual/dating, alcohol/tobacco/drugs, violence/death/scary,
// scary-illness, profanity/insult, money/crime, religion/politics.
// The lists deliberately avoid the app's own target words (e.g. en "stolen",
// "rich"; zh 生病/发烧/头疼/医院/药 are curriculum illness words — only severe
// illness terms are blocked; zh 酒店 is a target so alcohol is blocked by
// phrases like 喝酒/啤酒, never by the single character 酒).

const EN_BLOCK_TOKENS = {
  sexualDating: ["sex", "sexual", "sexy", "kiss", "kissed", "kissing", "boyfriend", "girlfriend",
    "dating", "marry", "married", "marriage", "wedding", "bride", "groom", "naked", "pregnant",
    "flirt", "flirting", "crush", "romantic", "romance", "lover", "lovers", "mistress", "porn"],
  alcoholTobaccoDrugs: ["beer", "wine", "whiskey", "whisky", "vodka", "alcohol", "drunk",
    "cigarette", "cigarettes", "smoke", "smokes", "smoked", "smoking", "tobacco", "drug", "drugs",
    "marijuana", "cocaine", "heroin", "champagne", "liquor", "bar", "bars", "pub", "pubs"],
  violenceDeath: ["kill", "kills", "killed", "killing", "murder", "murdered", "dead", "death",
    "die", "dies", "died", "dying", "gun", "guns", "knife", "knives", "blood", "bloody", "war",
    "wars", "bomb", "bombs", "shoot", "shoots", "shot", "shooting", "attack", "attacked",
    "fight", "fighting", "fought", "enemy", "soldier", "soldiers", "army", "weapon", "weapons",
    "poison", "suicide", "corpse", "grave", "funeral", "bury", "buried", "violent", "violence",
    "destroy", "destroyed", "wound", "wounded", "brutal"],
  scaryIllness: ["ghost", "ghosts", "devil", "demon", "demons", "hell", "zombie", "vampire",
    "monsters", "witch", "curse", "haunted", "nightmare", "horror", "terrified", "cancer",
    "disease", "diseases", "surgery", "anxiety", "depressed", "depression", "stress", "stressed"],
  profanityInsult: ["damn", "damned", "stupid", "idiot", "idiots", "dumb", "hate", "hates",
    "hated", "crap", "suck", "sucks", "fool", "foolish", "ugly", "fat", "shut", "creep", "creeps",
    "fart", "farts", "farted", "burp", "burped", "annoying", "poop", "pee", "borked"],
  moneyCrime: ["money", "cash", "dollar", "dollars", "cent", "cents", "price", "prices",
    "steal", "steals", "stole", "stealing", "thief", "thieves", "rob", "robbed", "robber",
    "crime", "criminal", "prison", "jail", "police", "cop", "cops", "arrest", "arrested",
    "guilty", "court", "judge", "lawyer", "gambling", "gamble", "debt", "loan", "bank"],
  religionPolitics: ["god", "jesus", "christ", "christian", "church", "religion", "religious",
    "muslim", "jewish", "priest", "pray", "prayer", "prayers", "temple", "mosque", "bible",
    "president", "government", "political", "politics", "election", "elections", "vote",
    "voted", "voting", "democracy", "communist", "capitalist", "minister", "parliament",
    "congress", "senate", "republican", "democrat"],
};
// Abbreviations / hard shortenings rejected as raw substrings (case-sensitive).
// "feel blue" is an idiom (sad), not the colour — rejected as a phrase.
const EN_BLOCK_SUBSTRINGS = ["Mr.", "Mrs.", "Dr.", "Ms.", "St.", "e.g.", "i.e.", "U.S.", "U.K.", "etc.", "...", "feel blue", "feels blue", "feeling blue"];
// A sentence must contain a real verb (aux/modal or a common lexical verb);
// this kills noun-phrase fragments like "A red hat."
const EN_VERBS = new Set(("is am are was were has have had do does did can could will would may might must shall should " +
  "like likes liked need needs needed want wants wanted eat eats ate drink drinks drank see sees saw go goes went come comes came " +
  "read reads sit sits sat stand stands stood run runs ran walk walks walked sleep sleeps slept wake wakes woke play plays played " +
  "sing sings sang dance dances danced swim swims swam fly flies flew say says said tell tells told ask asks asked know knows knew " +
  "think thinks thought feel feels felt look looks looked hear hears heard help helps helped work works worked live lives lived " +
  "love loves loved keep keeps kept make makes made take takes took give gives gave get gets got find finds found buy buys bought " +
  "sell sells sold wear wears wore use uses used try tries tried open opens opened close closes closed put puts cut cuts rain rains rained " +
  "snow snows snowed fall falls fell grow grows grew start starts started stop stops stopped move moves moved turn turns turned call calls called " +
  "write writes wrote draw draws drew paint paints painted build builds built speak speaks spoke teach teaches taught learn learns learned " +
  "study studies studied cook cooks cooked wash washes washed clean cleans cleaned repair repairs repaired plant plants planted protect protects protected " +
  "recycle recycles count counts counted smile smiles smiled laugh laughs laughed cry cries cried jump jumps jumped climb climbs climbed ride rides rode " +
  "drive drives drove arrive arrives arrived leave leaves left stay stays stayed wait waits waited meet meets met visit visits visited travel travels travelled " +
  "begin begins began end ends ended win wins won lose loses lost send sends sent bring brings brought carry carries carried hold holds held show shows showed " +
  "point points pointed touch touches touched catch catches caught throw throws threw kick kicks kicked hit hits hurt hurts bark barks barked mooed chirps chirped " +
  "meow meows growl growls roar roars set sets sank sinks sink float floats floated shine shines shone blow blows blew freeze freezes froze melt melts melted").split(/\s+/));
// Sentences ending in one of these are subordinate fragments / dangling
// ("I know who.", "He was in.", "I would never.", "I wish so.").
const EN_BLOCK_ENDINGS = new Set(["who", "whom", "whose", "what", "where", "why", "when", "how", "which", "in", "on", "so", "never", "up", "down", "out", "off", "away", "back"]);
// Person + be + colour as the whole sentence reads as race / nonsense
// ("I am white.", "We are gray.") — rejected; "It is green." stays.
const EN_COLOUR_IDENTITY = /^(I am|We are|They are|He is|She is) (red|blue|green|black|white|gray|grey|brown|pink|purple|orange|yellow)\.$/;
// Imperative / fragment starters rejected as the FIRST token.
const EN_BLOCK_STARTERS = new Set([
  "go", "come", "look", "listen", "sit", "stand", "stop", "give", "take", "tell", "show",
  "bring", "open", "close", "read", "write", "wait", "help", "let", "do", "don't", "be",
  "keep", "put", "get", "make", "try", "call", "play", "watch", "wash", "clean", "turn",
  "move", "run", "walk", "jump", "sing", "dance", "eat", "drink", "speak", "talk", "say",
  "see", "hear", "and", "but", "so", "because", "when", "although", "while", "which", "who",
  "what", "where", "why", "how", "yes", "no", "well", "oh", "ah", "wow", "hi", "hello", "hey",
]);
// Capitalised tokens allowed mid-sentence (plus "I"): days, months, languages/nationalities.
const EN_CAP_ALLOW = new Set(["I", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday",
  "Saturday", "Sunday", "January", "February", "March", "April", "May", "June", "July",
  "August", "September", "October", "November", "December", "English", "Japanese", "Chinese",
  "Vietnamese", "French", "German", "Spanish", "Korean", "American", "British"]);

const JA_BLOCK = {
  sexualDating: ["恋", "彼氏", "デート", "キス", "結婚", "セックス", "裸", "妊娠", "愛して", "離婚"],
  alcoholTobaccoDrugs: ["酒", "ビール", "ワイン", "タバコ", "煙草", "たばこ", "酔", "ウイスキー", "シャンパン", "麻薬"],
  violenceDeathScary: ["死", "殺", "戦争", "銃", "血", "自殺", "墓", "幽霊", "お化け", "化け物", "呪", "悪魔", "地獄", "爆弾", "敵", "兵士", "武器", "毒"],
  scaryIllness: ["病気", "入院", "癌", "ガン", "手術", "伝染病"],
  profanityInsult: ["バカ", "ばか", "阿呆", "あほ", "死ね", "くそ", "クソ", "ちくしょう", "黙れ", "すげー", "すげえ", "あばよ", "でたらめ", "キツイ", "からかう", "オシッコ", "おしっこ"],
  moneyCrime: ["泥棒", "盗む", "盗ん", "犯罪", "犯人", "刑務所", "牢屋", "逮捕", "借金", "詐欺", "誘拐", "賭"],
  religionPolitics: ["宗教", "キリスト", "イスラム", "ユダヤ", "仏教", "政治", "選挙", "政党", "大統領", "首相", "政府", "国会", "議会", "イエス"],
  properNames: ["トム", "クリス", "メアリー", "ジョン"],
};
// Per-target wrong-sense compounds: the target string occurs inside a
// different word, so the sentence does not illustrate the target at all.
const JA_TARGET_BLOCK = {
  "いち": ["いちいち"], "あし": ["あした", "あす"], "くつ": ["くつろ"],
  "ドレス": ["アドレス"], "ほん": ["ほんの"], "くろ": ["ごくろう", "ご苦労"],
  "ご": ["ごくろうさま", "ご苦労"], "め": ["めっきり", "めっちゃ"], "ペン": ["ペンキ"], "時": ["時々"],
};
// Rough imperative fragments: bare くれ/出せ/消せ/開けろ/しろ requests.
const JA_BLOCK_ROUGH = ["くれ。", "出せ", "消せ", "開けろ", "しろ。", "しろよ"];
const JA_BLOCK_STARTERS = ["そして", "それで", "でも", "しかし", "だから", "すると"];

const ZH_BLOCK = {
  sexualDating: ["恋爱", "男朋友", "女朋友", "约会", "亲吻", "接吻", "结婚", "性感", "裸", "怀孕", "离婚", "情人"],
  alcoholTobaccoDrugs: ["喝酒", "啤酒", "白酒", "红酒", "葡萄酒", "抽烟", "吸烟", "烟草", "毒品", "大麻", "喝醉", "戒烟"],
  violenceDeathScary: ["杀", "死", "尸体", "战争", "枪", "血", "自杀", "墓地", "鬼", "魔鬼", "地狱", "恐怖", "打架", "敌人", "炸弹", "武器", "中毒", "灭亡"],
  scaryIllness: ["癌症", "手术", "传染", "住院", "疯了", "痛苦"],
  profanityInsult: ["笨蛋", "傻瓜", "混蛋", "滚开", "闭嘴", "蠢", "白痴", "神经病"],
  moneyCrime: ["偷", "抢劫", "抢", "犯罪", "犯人", "坐牢", "监狱", "赌博", "诈骗", "借钱", "欠钱", "小偷", "逮捕", "囚犯"],
  religionPolitics: ["宗教", "佛教", "基督", "伊斯兰", "犹太", "政治", "选举", "政府", "总统", "主席", "政党", "共产", "圣诞"],
  // Transliterated foreign proper names that recur in the cmn corpus.
  properNames: ["汤姆", "爱丽丝", "比尔", "健二"],
  // Idiom / wrong-sense matches: 被子 is the noun "quilt", not the passive
  // marker 被; 加把劲 is an effort idiom, not a use of the disposal marker 把.
  idiomWrongSense: ["被子", "加把劲"],
};
// Per-target wrong-sense compounds (target string inside a different word).
const ZH_TARGET_BLOCK = {
  "汤": ["汤姆"], "比": ["比尔", "比爾", "比赛"], "头": ["石头", "木头"], "二": ["健二"],
  "完": ["完全"], "被": ["被告"], "马": ["马屁"], "船": ["自然直"], "三": ["三十六计"],
  "热": ["热情"],
};
// Targets that ARE complete phrases (greetings/formulas): for these, a
// sentence equal to the target itself is the ideal example and gets the
// exact-match scoring bonus. All other targets do NOT get the bonus (it
// otherwise rewarded bare fragments like 食べた。).
const EXACT_BONUS_TARGETS = {
  "ja-vi": new Set(["ありがとう", "おはよう", "こんにちは", "こんばんは", "さようなら", "おやすみ", "はい", "いいえ"]),
  "zh-vi": new Set(["对不起", "没关系", "谢谢", "再见", "你好"]),
  "en-vi": new Set(),
};
// Bare verb-first starters are almost always instructions/imperatives.
const ZH_BLOCK_STARTERS = ["但是", "可是", "所以", "因为", "然后", "而且", "如果", "穿", "开", "张", "叫", "向"];
// The app teaches SIMPLIFIED Chinese, but Tatoeba cmn mixes in Traditional
// sentences. ZH_TRAD_PAIRS lists common simplified->traditional pairs whose
// two forms differ; the Traditional-side characters form the reject set.
// Not exhaustive for rare characters - the coordinator's full manual read
// of the review list is the backstop.
const ZH_TRAD_PAIRS = "云雲 电電 语語 国國 学學 车車 马馬 鸟鳥 鱼魚 红紅 绿綠 蓝藍 黄黃 长長 门門 开開 关關 见見 现現 时時 间間 点點 个個 们們 这這 么麼 说說 读讀 写寫 听聽 来來 对對 问問 题題 头頭 发髮 脸臉 脚腳 体體 气氣 风風 热熱 汤湯 面麵 盐鹽 酱醬 猫貓 龙龍 虫蟲 叶葉 树樹 课課 练練 习習 绩績 级級 园園 墙牆 柜櫃 装裝 带帶 链鏈 表錶 镜鏡 伞傘 钥鑰 钱錢 银銀 铜銅 铁鐵 价價 贵貴 卖賣 买買 换換 贷貸 费費 税稅 单單 号號 码碼 脑腦 网網 络絡 软軟 盘盤 桥橋 飞飛 机機 队隊 员員 场場 馆館 运運 动動 锻鍛 炼煉 画畫 弹彈 声聲 话話 词詞 页頁 册冊 报報 杂雜 志誌 剧劇 观觀 众眾 节節 礼禮 给給 乐樂 周週 后後 谁誰 里裡 别別 让讓 过過 应應 须須 怀懷 聪聰 岁歲 张張 丢丟 约約 护護 医醫 师師 农農 厂廠 铺鋪 宾賓 图圖 书書 远遠 轻輕 湿濕 净淨 脏髒 旧舊 坏壞 错錯 难難 简簡 复複 强強 药藥 伤傷 烧燒 厅廳 厨廚 卫衛 钟鐘 阳陽 阴陰 雾霧 凉涼 饭飯 饼餅 干幹 为為 样樣 钟鐘 东東 万萬 与與 义義 严嚴 丽麗 举舉 乌烏 乱亂 于於 产產 亲親 亿億 从從 仓倉 仪儀 优優 会會 传傳 伦倫 伪偽 余餘 佛佛 侠俠 侨僑 俭儉 债債 偿償 储儲 儿兒 兔兔 党黨 冈岡 册冊 写寫 军軍 农農 冠冠 冯馮 冲沖 决決 况況 冻凍 净淨 准準 凉涼 凌凌 减減 凑湊 凛凛 几幾 凤鳳 凯凱 凭憑 凶兇 击擊 函函 凿鑿 刨刨 删刪 刮刮 到到 创創 剁剁 剂劑 剃剃 则則 削削 剑劍 剧劇 剩剩 剪剪 割割 创創 剥剝 划劃 剧劇 劈劈 刘劉 剑劍 剂劑 力力 劝勸 办辦 务務 劣劣 动動 助助 劫劫 励勵 劲勁 劳勞 效効 势勢 劲勁 勃勃 勇勇 勉勉 勋勳 勒勒 动動 勘勘 务務 胜勝 劳勞 募募 势勢 勤勤 劝勧 胜勝 匀勻 钩鉤 汇匯 医醫 匿匿 区區 协協 华華 单單 卖賣 南南 博博 卢盧 卡卡 卧臥 卫衛 卯卯 印印 危危 即即 却卻 卷卷 卸卸 却卻 卿卿 厂廠 厅廳 历歷 厉厲 压壓 厌厭 厘厘 厚厚 厦廈 厨廚 厩廄 厌厭 历曆 厂廠 厉厲 县縣 参參 双雙 反反 收収 发發 叙敘 叠疊 丛叢";
const ZH_TRAD_ONLY = new Set();
for (const p of ZH_TRAD_PAIRS.split(/\s+/)) { const cs = [...p]; if (cs.length === 2 && cs[0] !== cs[1]) ZH_TRAD_ONLY.add(cs[1]); }
for (const p of "还還 没沒 着著 吗嗎 边邊 进進 达達 迁遷 选選 适適 递遞 逻邏 邮郵 邓鄧 郑鄭 释釋 鉴鑒 针針 钉釘 钓釣 钙鈣 钳鉗 钻鑽 铃鈴 铅鉛 铝鋁 铲鏟 锅鍋 锁鎖 镇鎮 镰鐮 闪閃 闷悶 闹鬧 闻聞 阁閣 阅閱 阎閻 阵陣 阶階 际際 陆陸 陇隴 陈陳 陨隕 随隨 隐隱 隽雋 灵靈 结結 种種 连連 续續 脱脫 狱獄 处處 庄莊 条條 计計 济濟 经經 颜顏 尔爾 裆襠 当當".split(/\s+/)) { const cs = [...p]; if (cs.length === 2 && cs[0] !== cs[1]) ZH_TRAD_ONLY.add(cs[1]); }
// Predicate check for zh: a sentence with no function/verb char at all is a
// noun phrase or idiom fragment ("地球母亲。", "晴天霹雳。", "好问题。").
const ZH_PREDICATE = new Set([..."是了有在不没会要想能可很着过得地被把比离跟让叫吃喝去来走跑看听说读写买卖飞游唱跳哭笑爱欢喜作工学玩睡起到做生变知认住坐站开闭穿洗望觉笑哭到离跟让叫把被比是了有在不没会要想能可很着过得地痛疼痒拍追摸停化坏怕追会"]);
// Greeting targets must be followed by 。 or 、 — otherwise the match is part
// of a different phrase (你好香 = "you smell nice", not the greeting 你好).
const ZH_BOUNDARY_TARGETS = new Set(["你好"]);

// ================================================================ FILTERS ====
const stats = {};

function reject(langStats, reason) { langStats.rejected[reason] = (langStats.rejected[reason] || 0) + 1; return null; }

// ---- English: returns {tokens} if the sentence passes all hard filters.
function filterEn(text, S) {
  if (text.length > 48) return reject(S, "length");
  if (!text.endsWith(".")) return reject(S, "not-declarative"); // drops "?" and "!" too
  if (/[?!:;\"“”()\[\]{}<>#$%€£¥@&*+=/\\|~^_0-9]/.test(text)) return reject(S, "charset/digits");
  if (!/^[A-Za-z][A-Za-z'’ ,.\-]*$/.test(text)) return reject(S, "charset/digits");
  for (const s of EN_BLOCK_SUBSTRINGS) if (text.includes(s)) return reject(S, "abbreviation");
  const tokens = text.replace(/[.,]/g, "").split(/\s+/).filter(Boolean);
  if (tokens.length < 3 || tokens.length > 8) return reject(S, "length");
  const lower = tokens.map((t) => t.toLowerCase().replace(/’/g, "'"));
  if (EN_BLOCK_STARTERS.has(lower[0])) return reject(S, "imperative/fragment-start");
  if (lower.includes("please")) return reject(S, "imperative/fragment-start");
  for (let i = 1; i < tokens.length; i++) {
    if (/^[A-Z]/.test(tokens[i]) && !EN_CAP_ALLOW.has(tokens[i])) return reject(S, "proper-name?");
  }
  for (const t of lower) if (t.length === 1 && t !== "a" && t !== "i") return reject(S, "fragment-token");
  for (const [cat, words] of Object.entries(EN_BLOCK_TOKENS)) {
    const set = EN_BLOCK_TOKENS[cat];
    for (const t of lower) if (set.includes(t)) return reject(S, "blocklist:" + cat);
  }
  if (EN_COLOUR_IDENTITY.test(text)) return reject(S, "colour-identity");
  if (EN_BLOCK_ENDINGS.has(lower[lower.length - 1])) return reject(S, "fragment-ending");
  if (!lower.some((t) => EN_VERBS.has(t))) return reject(S, "no-verb");
  return { tokens: lower, rawTokens: tokens };
}

function scoreEn(text, tokens, targetStartIdx, isCC0, author) {
  // Prefer a full-but-simple sentence (~4 words) over a bare 3-word stub.
  let s = Math.abs(tokens.length - 4) * 1.2 + text.length * 0.1 + targetStartIdx * 0.1;
  s += (text.match(/,/g) || []).length * 1.5;
  if (text.includes("'") || text.includes("’")) s += 0.5;
  if (["i", "you", "he", "she", "it", "we", "they", "this", "that", "the", "a", "an", "my"].includes(tokens[0])) s -= 1.5;
  if (isCC0) s -= 1.5;
  if (!author) s += 3; // orphaned sentence: attribution is weaker, prefer a named author
  return s;
}

// ---- Japanese
function filterJa(text, S) {
  const chars = [...text];
  if (chars.length < 3 || chars.length > 18) return reject(S, "length");
  if (!text.endsWith("。")) return reject(S, "not-declarative");
  if (!/^[\u3005\u3040-\u30FF\u4E00-\u9FFF、。]+$/.test(text)) return reject(S, "charset/digits");
  for (const st of JA_BLOCK_STARTERS) if (text.startsWith(st)) return reject(S, "imperative/fragment-start");
  if (/[はがをにへでとやか]。$/.test(text) || text.endsWith("から。") || text.endsWith("まで。")) return reject(S, "fragment-ending");
  // Bare て/で-final or てよ-final sentences are requests/imperatives in
  // isolation; ろ-final is imperative/volitional slang in this corpus.
  if (/(て|で)。$/.test(text) || /(て|で)よ。$/.test(text) || /なよ。$/.test(text) || /ろ。$/.test(text) || /の。$/.test(text)) return reject(S, "imperative-te/ro");
  if (text.includes("なさい")) return reject(S, "imperative-nasai");
  for (const w of JA_BLOCK_ROUGH) if (text.includes(w)) return reject(S, "imperative-rough");
  for (const [cat, words] of Object.entries(JA_BLOCK))
    for (const w of words) if (text.includes(w)) return reject(S, "blocklist:" + cat);
  return { chars };
}

// ---- Chinese
function filterZh(text, S) {
  const chars = [...text];
  if (chars.length < 4 || chars.length > 12) return reject(S, "length");
  if (!text.endsWith("。")) return reject(S, "not-declarative");
  if (!/^[\u4E00-\u9FFF，。、]+$/.test(text)) return reject(S, "charset/digits");
  if (chars.some((c) => ZH_TRAD_ONLY.has(c))) return reject(S, "traditional-chars");
  for (const st of ZH_BLOCK_STARTERS) if (text.startsWith(st)) return reject(S, "imperative/fragment-start");
  if (text.endsWith("把。") || text.endsWith("被。") || text.endsWith("和。") || text.endsWith("跟。")) return reject(S, "fragment-ending");
  if (/^.{2,4}点。$/.test(text)) return reject(S, "imperative-dian"); // 认真点。/冷静点。 = "be serious / calm down!"
  for (const [cat, words] of Object.entries(ZH_BLOCK))
    for (const w of words) if (text.includes(w)) return reject(S, "blocklist:" + cat);
  if (!chars.some((c) => ZH_PREDICATE.has(c))) return reject(S, "no-predicate");
  return { chars };
}

function scoreCjk(text, chars, targetPos, isCC0, kanjiCount, target, exactOk, author) {
  // Prefer a complete everyday sentence near the ideal length over a bare
  // stub (CJK drops subjects, so shortest-first filled the set with
  // fragments and bare verb phrases in the first pass).
  const ideal = kanjiCount != null ? 10 : 8; // ja sentences run longer than zh ones
  let s = Math.abs(chars.length - ideal) + targetPos * 0.3;
  if (text.includes("、") || text.includes("，")) s += 1.5;
  if (kanjiCount != null) s += kanjiCount * 0.2; // ja: prefer kana-light, kid-readable
  if (isCC0) s -= 1.5;
  if (exactOk && target && text === target + "。") s -= 10; // the phrase itself (greetings etc.)
  if (!author) s += 3; // orphaned sentence: attribution is weaker, prefer a named author
  return s;
}

// ================================================================== MAIN =====
mkdirSync(SRC, { recursive: true });
const output = {};
const allKept = []; // {courseId, target, entry, score}
const provenance = { files: [] };

for (const lang of LANGS) {
  const { courseId, tatoeba } = lang;
  const targets = loadPack(lang.pack);
  const detailedName = `${tatoeba}_sentences_detailed.tsv.bz2`;
  const cc0Name = `${tatoeba}_sentences_CC0.tsv.bz2`;
  const detailedUrl = `https://downloads.tatoeba.org/exports/per_language/${tatoeba}/${detailedName}`;
  const cc0Url = `https://downloads.tatoeba.org/exports/per_language/${tatoeba}/${cc0Name}`;
  const detailedPath = join(SRC, detailedName);
  const cc0Path = join(SRC, cc0Name);
  const howD = ensureFile(detailedUrl, detailedPath);
  const howC = ensureFile(cc0Url, cc0Path);

  // CC0 id set — the ONLY basis for a CC0 label.
  const cc0Ids = new Set();
  for await (const line of streamLines(cc0Path)) {
    const id = line.split("\t")[0];
    if (/^\d+$/.test(id)) cc0Ids.add(id);
  }

  const S = { scanned: 0, rejected: {}, matchedSentences: 0 };
  stats[courseId] = S;

  // Target indexes for fast matching.
  let targetIndex; // en: Map firstToken -> [{target, toks}]; cjk: Map firstChar -> [target]
  if (courseId === "en-vi") {
    targetIndex = new Map();
    for (const t of targets) {
      const toks = t.toLowerCase().split(/\s+/);
      if (!targetIndex.has(toks[0])) targetIndex.set(toks[0], []);
      targetIndex.get(toks[0]).push({ target: t, toks });
    }
  } else {
    targetIndex = new Map();
    for (const t of targets) {
      const c = [...t][0];
      if (!targetIndex.has(c)) targetIndex.set(c, []);
      targetIndex.get(c).push(t);
    }
  }

  const best = new Map(); // target -> {entry, score}
  for await (const line of streamLines(detailedPath)) {
    const parts = line.split("\t");
    if (parts.length < 4) continue;
    const [id, , text, usernameRaw] = parts;
    if (!/^\d+$/.test(id) || !text) continue;
    S.scanned++;
    const author = !usernameRaw || usernameRaw === "\\N" ? "" : usernameRaw;
    const isCC0 = cc0Ids.has(id);
    const license = isCC0 ? LICENSE_CC0 : LICENSE_BY;

    if (courseId === "en-vi") {
      const f = filterEn(text, S);
      if (!f) continue;
      let matched = false;
      for (let i = 0; i < f.tokens.length; i++) {
        const cands = targetIndex.get(f.tokens[i]);
        if (!cands) continue;
        for (const { target, toks } of cands) {
          if (i + toks.length > f.tokens.length) continue;
          let ok = true;
          for (let k = 0; k < toks.length; k++) if (f.tokens[i + k] !== toks[k]) { ok = false; break; }
          if (!ok) continue;
          matched = true;
          const sc = scoreEn(text, f.tokens, i, isCC0, author);
          const prev = best.get(target);
          if (!prev || sc < prev.score) best.set(target, { score: sc, entry: { id: Number(id), text, author, license, reviewStatus: "machine-filtered" } });
        }
      }
      if (matched) S.matchedSentences++;
    } else {
      const f = courseId === "ja-vi" ? filterJa(text, S) : filterZh(text, S);
      if (!f) continue;
      const chars = f.chars;
      const kanjiCount = courseId === "ja-vi" ? chars.filter((c) => /[\u4E00-\u9FFF]/.test(c)).length : null;
      let matched = false;
      for (let i = 0; i < chars.length; i++) {
        const cands = targetIndex.get(chars[i]);
        if (!cands) continue;
        for (const target of cands) {
          // Direct char-by-char check: does the substring at char position i equal target?
          const tChars = [...target];
          if (i + tChars.length > chars.length) continue;
          let ok = true;
          for (let k = 0; k < tChars.length; k++) if (chars[i + k] !== tChars[k]) { ok = false; break; }
          if (!ok) continue;
          if (courseId === "zh-vi" && ZH_BOUNDARY_TARGETS.has(target)) {
            const after = chars[i + tChars.length];
            if (after && after !== "。" && after !== "、" && after !== "，") continue;
          }
          const targetBlock = (courseId === "ja-vi" ? JA_TARGET_BLOCK : ZH_TARGET_BLOCK)[target];
          if (targetBlock && targetBlock.some((w) => text.includes(w))) continue;
          matched = true;
          const sc = scoreCjk(text, chars, i, isCC0, kanjiCount, target, EXACT_BONUS_TARGETS[courseId].has(target), author);
          const prev = best.get(target);
          if (!prev || sc < prev.score) best.set(target, { score: sc, entry: { id: Number(id), text, author, license, reviewStatus: "machine-filtered" } });
        }
      }
      if (matched) S.matchedSentences++;
    }
  }

  // Rank covered targets by candidate score, keep the best CAP_PER_LANG.
  const ranked = [...best.entries()].sort((a, b) => a[1].score - b[1].score);
  const keptSet = new Set(ranked.slice(0, CAP_PER_LANG).map(([t]) => t));
  const courseOut = {};
  for (const t of targets) { // pack order in the output file
    if (keptSet.has(t)) {
      courseOut[t] = [best.get(t).entry];
      allKept.push({ courseId, target: t, entry: best.get(t).entry, score: best.get(t).score });
    }
  }
  output[courseId] = courseOut;
  S.targetsTotal = targets.length;
  S.targetsCoveredBeforeCap = best.size;
  S.uncoveredTargets = targets.filter((t) => !best.has(t));
  S.targetsKept = keptSet.size;
  S.cc0Kept = Object.values(courseOut).flat().filter((e) => e.license === LICENSE_CC0).length;
  S.emptyAuthorKept = Object.values(courseOut).flat().filter((e) => e.author === "").length;

  provenance.files.push({
    courseId, detailed: detailedName, detailedUrl, how: howD,
    bytes: statSync(detailedPath).size, lastModified: lastModified(detailedUrl),
    lines: S.scanned, cc0File: cc0Name, cc0Url, cc0Bytes: statSync(cc0Path).size,
    cc0Ids: cc0Ids.size,
  });
  console.error(`[${courseId}] scanned=${S.scanned} covered=${best.size}/${targets.length} kept=${keptSet.size}`);
}

// ---------------------------------------------------------------- outputs ----
const outPath = join(REPO, "src/content/examples-candidates.json");
writeFileSync(outPath, JSON.stringify(output, null, 2) + "\n", "utf8");

const reviewLines = [
  "# Tatoeba candidate review list — Piglingo Kids Đợt 2 (machine-filtered, NOT yet human-approved)",
  "# One line per candidate: [course] target :: text (sentence_id, author). Coordinator reviews EVERY line.",
  "# Licences per sentence are in src/content/examples-candidates.json (CC BY 2.0 FR unless the id is in the official CC0 export).",
];
for (const lang of LANGS) {
  for (const [target, arr] of Object.entries(output[lang.courseId])) {
    const e = arr[0];
    reviewLines.push(`[${lang.courseId}] ${target} :: ${e.text} (${e.id}, ${e.author})`);
  }
}
const reviewPath = join(REPO, "scripts/tatoeba-review-list.txt");
writeFileSync(reviewPath, reviewLines.join("\n") + "\n", "utf8");

console.log(JSON.stringify({
  stats, provenance,
  outBytes: statSync(outPath).size, reviewBytes: statSync(reviewPath).size,
  totalKept: allKept.length,
}, null, 2));
