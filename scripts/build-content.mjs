// Piglingo Kids — content generator (original content, authored for this project).
// Run: node scripts/build-content.mjs
// Writes src/content/packs/{en-vi,ja-vi,zh-vi}.json, packs/index.ts and catalog.json.
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "src/content/packs");

// ---------- helpers ----------
function rng(seedStr) {
  let h = 2166136261;
  for (const c of seedStr) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h ^= h << 13; h ^= h >>> 17; h ^= h << 5;
    return ((h >>> 0) % 100000) / 100000;
  };
}
function shuffle(arr, seed) {
  const r = rng(seed);
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
const W = (target, native, emoji, romanization) =>
  romanization ? { target, native, emoji, romanization } : { target, native, emoji };

// ---------- course data ----------
// sentence: t = target tokens, n = native tokens, r = romanization line (optional),
// blank = target token to blank out, dT/dN = distractor tokens.
const COURSES = [
  {
    id: "en-vi",
    targetLanguage: "Tiếng Anh",
    targetCode: "en",
    flag: "🇺🇸",
    sectionTitle: "Phần 1: Bắt đầu",
    kana: false,
    joiner: " ",
    listenTyping: true,
    units: [
      {
        title: "Con vật",
        description: "Gọi tên các con vật quen thuộc bằng tiếng Anh.",
        guidebook:
          "Chào mừng đến với tiếng Anh! 🇺🇸\n\n**Các con vật**\n- dog = con chó, cat = con mèo, bird = con chim.\n- Hãy bấm vào loa 🔊 để nghe phát âm và đọc theo thật to nhé!\n\n**Mẹo nhỏ**\nTrong tiếng Anh, trước tên con vật ta hay thêm *a* hoặc *the*: a dog (một con chó).",
        words: [
          W("dog", "chó", "🐶"), W("cat", "mèo", "🐱"), W("bird", "chim", "🐦"), W("fish", "cá", "🐟"),
          W("rabbit", "thỏ", "🐰"), W("horse", "ngựa", "🐴"), W("cow", "bò", "🐮"), W("duck", "vịt", "🦆"),
        ],
        sentences: [
          { t: ["I", "see", "a", "cat"], n: ["Tôi", "thấy", "một", "con", "mèo"], blank: "cat", dT: ["dog", "run"], dN: ["chó", "ăn"] },
          { t: ["The", "bird", "can", "fly"], n: ["Con", "chim", "biết", "bay"], blank: "bird", dT: ["swim", "fish"], dN: ["bơi", "cá"] },
          { t: ["The", "horse", "is", "big"], n: ["Con", "ngựa", "to"], blank: "horse", dT: ["small", "a"], dN: ["nhỏ", "chó"] },
          { t: ["A", "duck", "can", "swim"], n: ["Một", "con", "vịt", "biết", "bơi"], blank: "duck", dT: ["fly", "bird"], dN: ["bay", "chim"] },
        ],
      },
      {
        title: "Màu sắc",
        description: "Học tên các màu bằng tiếng Anh.",
        guidebook:
          "Thế giới đầy màu sắc! 🌈\n\n**Các màu**\n- red = đỏ, blue = xanh dương, green = xanh lá, yellow = vàng.\n- black = đen, white = trắng, orange = cam, purple = tím.\n\n**Mẹo nhỏ**\nTrong tiếng Anh, từ chỉ màu đứng *trước* danh từ: a red apple (một quả táo đỏ).",
        words: [
          W("red", "đỏ", "🔴"), W("blue", "xanh dương", "🔵"), W("green", "xanh lá", "🟢"), W("yellow", "vàng", "🟡"),
          W("black", "đen", "⚫"), W("white", "trắng", "⚪"), W("orange", "cam", "🟠"), W("purple", "tím", "🟣"),
        ],
        sentences: [
          { t: ["The", "apple", "is", "red"], n: ["Quả", "táo", "màu", "đỏ"], blank: "red", dT: ["blue", "an"], dN: ["đen", "vàng"] },
          { t: ["The", "sky", "is", "blue"], n: ["Bầu", "trời", "màu", "xanh", "dương"], blank: "blue", dT: ["red", "cat"], dN: ["đỏ", "cam"] },
          { t: ["The", "banana", "is", "yellow"], n: ["Quả", "chuối", "màu", "vàng"], blank: "yellow", dT: ["purple", "are"], dN: ["tím", "nước"] },
          { t: ["I", "like", "green"], n: ["Tôi", "thích", "màu", "xanh", "lá"], blank: "green", dT: ["see", "red"], dN: ["ghét", "đỏ"] },
        ],
      },
      {
        title: "Gia đình",
        description: "Nói về những người thân yêu của em.",
        guidebook:
          "Gia đình của em 👨‍👩‍👧‍👦\n\n**Người thân**\n- mom = mẹ, dad = bố, brother = anh/em trai, sister = chị/em gái.\n- grandma = bà, grandpa = ông, baby = em bé, friend = bạn.\n\n**Mẹo nhỏ**\n*my* nghĩa là \"của tôi\": my mom = mẹ của tôi.",
        words: [
          W("mom", "mẹ", "👩"), W("dad", "bố", "👨"), W("brother", "anh/em trai", "👦"), W("sister", "chị/em gái", "👧"),
          W("grandma", "bà", "👵"), W("grandpa", "ông", "👴"), W("baby", "em bé", "👶"), W("friend", "bạn", "🧑‍🤝‍🧑"),
        ],
        sentences: [
          { t: ["This", "is", "my", "mom"], n: ["Đây", "là", "mẹ", "của", "tôi"], blank: "mom", dT: ["dad", "your"], dN: ["bố", "bạn"] },
          { t: ["I", "love", "my", "grandma"], n: ["Tôi", "yêu", "bà", "của", "tôi"], blank: "grandma", dT: ["grandpa", "hate"], dN: ["ông", "em"] },
          { t: ["My", "brother", "is", "tall"], n: ["Anh", "trai", "tôi", "cao"], blank: "brother", dT: ["short", "sister"], dN: ["thấp", "chị"] },
          { t: ["The", "baby", "is", "very", "small"], n: ["Em", "bé", "rất", "nhỏ"], blank: "baby", dT: ["big", "are"], dN: ["to", "bố"] },
        ],
      },
      {
        title: "Đồ ăn",
        description: "Gọi tên các món ăn và đồ uống.",
        guidebook:
          "Đói bụng rồi! 🍽️\n\n**Đồ ăn, đồ uống**\n- apple = táo, banana = chuối, bread = bánh mì, milk = sữa.\n- egg = trứng, rice = cơm, cake = bánh ngọt, water = nước.\n\n**Mẹo nhỏ**\n*eat* = ăn, *drink* = uống: I eat rice. I drink milk.",
        words: [
          W("apple", "táo", "🍎"), W("banana", "chuối", "🍌"), W("bread", "bánh mì", "🍞"), W("milk", "sữa", "🥛"),
          W("egg", "trứng", "🥚"), W("rice", "cơm", "🍚"), W("cake", "bánh ngọt", "🍰"), W("water", "nước", "💧"),
        ],
        sentences: [
          { t: ["I", "eat", "an", "apple"], n: ["Tôi", "ăn", "một", "quả", "táo"], blank: "apple", dT: ["drink", "a"], dN: ["uống", "chuối"] },
          { t: ["I", "drink", "milk"], n: ["Tôi", "uống", "sữa"], blank: "milk", dT: ["eat", "an"], dN: ["ăn", "nước"] },
          { t: ["She", "eats", "bread"], n: ["Cô", "ấy", "ăn", "bánh", "mì"], blank: "bread", dT: ["drinks", "eat"], dN: ["uống", "anh"] },
          { t: ["We", "eat", "rice"], n: ["Chúng", "ta", "ăn", "cơm"], blank: "rice", dT: ["drink", "eggs"], dN: ["uống", "trứng"] },
        ],
      },
      {
        title: "Con số",
        description: "Đếm từ một đến tám.",
        guidebook:
          "Cùng đếm nào! 🔢\n\n**Các số**\n- one = 1, two = 2, three = 3, four = 4.\n- five = 5, six = 6, seven = 7, eight = 8.\n\n**Mẹo nhỏ**\nĐếm to: one, two, three! Rồi đếm đồ vật xung quanh em.",
        words: [
          W("one", "một", "1️⃣"), W("two", "hai", "2️⃣"), W("three", "ba", "3️⃣"), W("four", "bốn", "4️⃣"),
          W("five", "năm", "5️⃣"), W("six", "sáu", "6️⃣"), W("seven", "bảy", "7️⃣"), W("eight", "tám", "8️⃣"),
        ],
        sentences: [
          { t: ["I", "have", "one", "book"], n: ["Tôi", "có", "một", "quyển", "sách"], blank: "one", dT: ["two", "has"], dN: ["hai", "chó"] },
          { t: ["I", "have", "two", "eyes"], n: ["Tôi", "có", "hai", "mắt"], blank: "two", dT: ["three", "ears"], dN: ["ba", "tai"] },
          { t: ["There", "are", "three", "cats"], n: ["Có", "ba", "con", "mèo"], blank: "three", dT: ["four", "dogs"], dN: ["bốn", "chó"] },
          { t: ["I", "am", "five", "years", "old"], n: ["Tôi", "năm", "tuổi"], blank: "five", dT: ["six", "are"], dN: ["sáu", "bảy"] },
        ],
      },
      {
        title: "Trường học",
        description: "Những đồ vật quen thuộc ở trường.",
        guidebook:
          "Đến trường thôi! 🏫\n\n**Đồ dùng học tập**\n- book = sách, pen = bút, bag = cặp sách, ruler = thước kẻ.\n- teacher = giáo viên, desk = bàn học, school = trường học, clock = đồng hồ.\n\n**Mẹo nhỏ**\n*on the desk* = ở trên bàn học.",
        words: [
          W("book", "sách", "📖"), W("pen", "bút", "🖊️"), W("bag", "cặp sách", "🎒"), W("teacher", "giáo viên", "🧑‍🏫"),
          W("desk", "bàn học", "🪑"), W("school", "trường học", "🏫"), W("clock", "đồng hồ", "⏰"), W("ruler", "thước kẻ", "📏"),
        ],
        sentences: [
          { t: ["I", "read", "a", "book"], n: ["Tôi", "đọc", "một", "quyển", "sách"], blank: "book", dT: ["write", "pen"], dN: ["viết", "bút"] },
          { t: ["I", "write", "with", "a", "pen"], n: ["Tôi", "viết", "bằng", "bút"], blank: "pen", dT: ["read", "book"], dN: ["đọc", "sách"] },
          { t: ["The", "teacher", "is", "nice"], n: ["Giáo", "viên", "rất", "tốt"], blank: "teacher", dT: ["bad", "a"], dN: ["xấu", "bàn"] },
          { t: ["My", "bag", "is", "on", "the", "desk"], n: ["Cặp", "sách", "của", "tôi", "ở", "trên", "bàn", "học"], blank: "bag", dT: ["under", "book"], dN: ["dưới", "sách"] },
        ],
      },
      {
        title: "Gia đình 2",
        description: "Thêm người thân: dì, chú, anh em họ và cả gia đình.",
        guidebook:
          "Gia đình lớn của em 👨‍👩‍👧‍👦\n\n**Thêm người thân**\n- aunt = dì, uncle = chú, cousin = anh/em họ, son = con trai.\n- daughter = con gái, children = các con, family = gia đình, parents = cha mẹ.\n\n**Mẹo nhỏ**\nHỏi thăm gia đình bạn: How is your family?",
        words: [
          W("aunt", "dì", "👩‍🦱"), W("uncle", "chú", "👨‍🦱"), W("cousin", "anh/em họ", "🧒"), W("son", "con trai", "👦"),
          W("daughter", "con gái", "👧"), W("children", "các con", "👨‍👩‍👧‍👦"), W("family", "gia đình", "🏠"), W("parents", "cha mẹ", "👨‍👩‍👧"),
        ],
        sentences: [
          { t: ["This", "is", "my", "aunt"], n: ["Đây", "là", "dì", "của", "tôi"], blank: "aunt", dT: ["uncle", "your"], dN: ["chú", "bạn"] },
          { t: ["I", "love", "my", "family"], n: ["Tôi", "yêu", "gia", "đình", "của", "tôi"], blank: "family", dT: ["house", "hate"], dN: ["nhà", "ghét"] },
          { t: ["My", "cousin", "is", "my", "friend"], n: ["Anh", "họ", "là", "bạn", "của", "tôi"], blank: "cousin", dT: ["sister", "tall"], dN: ["chị", "cao"] },
          { t: ["My", "parents", "are", "kind"], n: ["Cha", "mẹ", "tôi", "rất", "tốt"], blank: "parents", dT: ["children", "is"], dN: ["các con", "là"] },
        ],
      },
      {
        title: "Số đếm 2",
        description: "Đếm tiếp từ chín đến mười sáu.",
        guidebook:
          "Đếm cao hơn nữa! 🔢\n\n**Các số tiếp theo**\n- nine = 9, ten = 10, eleven = 11, twelve = 12.\n- thirteen = 13, fourteen = 14, fifteen = 15, sixteen = 16.\n\n**Mẹo nhỏ**\nTừ 13 đến 19 trong tiếng Anh thường kết thúc bằng *-teen*.",
        words: [
          W("nine", "chín", "9️⃣"), W("ten", "mười", "🔟"), W("eleven", "mười một", "⑪"), W("twelve", "mười hai", "⑫"),
          W("thirteen", "mười ba", "⑬"), W("fourteen", "mười bốn", "⑭"), W("fifteen", "mười lăm", "⑮"), W("sixteen", "mười sáu", "⑯"),
        ],
        sentences: [
          { t: ["I", "have", "nine", "books"], n: ["Tôi", "có", "chín", "quyển", "sách"], blank: "nine", dT: ["ten", "has"], dN: ["mười", "sách"] },
          { t: ["There", "are", "ten", "cats"], n: ["Có", "mười", "con", "mèo"], blank: "ten", dT: ["nine", "dogs"], dN: ["chín", "chó"] },
          { t: ["I", "am", "eleven", "years", "old"], n: ["Tôi", "mười", "một", "tuổi"], blank: "eleven", dT: ["twelve", "are"], dN: ["mười hai", "sáu"] },
          { t: ["He", "has", "twelve", "books"], n: ["Anh", "ấy", "có", "mười", "hai", "quyển", "sách"], blank: "twelve", dT: ["eleven", "book"], dN: ["mười một", "bút"] },
        ],
      },
      {
        title: "Màu sắc 2",
        description: "Thêm nhiều màu đẹp: hồng, nâu, xám và cầu vồng.",
        guidebook:
          "Thêm màu mới! 🎨\n\n- pink = hồng, brown = nâu, gray = xám, light blue = xanh nhạt.\n- dark green = xanh đậm, rainbow = cầu vồng, color = màu sắc, golden = ánh vàng.\n\n**Mẹo nhỏ**\n*light* = nhạt/sáng, *dark* = đậm/tối: light blue, dark green.",
        words: [
          W("pink", "hồng", "🩷"), W("brown", "nâu", "🟤"), W("gray", "xám", "🩶"), W("light blue", "xanh nhạt", "🩵"),
          W("dark green", "xanh đậm", "💚"), W("rainbow", "cầu vồng", "🌈"), W("color", "màu sắc", "🎨"), W("golden", "ánh vàng", "✨"),
        ],
        sentences: [
          { t: ["The", "flower", "is", "pink"], n: ["Bông", "hoa", "màu", "hồng"], blank: "pink", dT: ["brown", "a"], dN: ["nâu", "xám"] },
          { t: ["The", "bear", "is", "brown"], n: ["Con", "gấu", "màu", "nâu"], blank: "brown", dT: ["gray", "big"], dN: ["xám", "hồng"] },
          { t: ["I", "see", "a", "rainbow"], n: ["Tôi", "thấy", "một", "cầu", "vồng"], blank: "rainbow", dT: ["color", "sky"], dN: ["màu", "mây"] },
          { t: ["My", "favorite", "color", "is", "pink"], n: ["Màu", "tôi", "thích", "nhất", "là", "màu", "hồng"], blank: "color", dT: ["colors", "pink"], dN: ["màu sắc", "hoa"] },
        ],
      },
      {
        title: "Thức ăn 2",
        description: "Món ngon nữa: pizza, mì, súp, kẹo và kem.",
        guidebook:
          "Ăn ngon miệng! 😋\n\n- pizza = pizza, noodle = mì, soup = súp, candy = kẹo.\n- cookie = bánh quy, juice = nước ép, cheese = phô mai, ice cream = kem.\n\n**Mẹo nhỏ**\n*yummy* nghĩa là ngon tuyệt: This pizza is yummy!",
        words: [
          W("pizza", "pizza", "🍕"), W("noodle", "mì", "🍜"), W("soup", "súp", "🍲"), W("candy", "kẹo", "🍬"),
          W("cookie", "bánh quy", "🍪"), W("juice", "nước ép", "🧃"), W("cheese", "phô mai", "🧀"), W("ice cream", "kem", "🍦"),
        ],
        sentences: [
          { t: ["I", "eat", "pizza"], n: ["Tôi", "ăn", "pizza"], blank: "pizza", dT: ["drink", "soup"], dN: ["uống", "mì"] },
          { t: ["I", "drink", "juice"], n: ["Tôi", "uống", "nước", "ép"], blank: "juice", dT: ["eat", "milk"], dN: ["ăn", "súp"] },
          { t: ["The", "soup", "is", "hot"], n: ["Món", "súp", "nóng"], blank: "soup", dT: ["cold", "candy"], dN: ["nguội", "kẹo"] },
          { t: ["She", "likes", "ice", "cream"], n: ["Cô", "ấy", "thích", "kem"], blank: "cream", dT: ["cookie", "eats"], dN: ["bánh", "ăn"] },
        ],
      },
      {
        title: "Trường học 2",
        description: "Thêm đồ dùng học tập: bút chì, kéo, vở và máy tính.",
        guidebook:
          "Đồ dùng của em ✏️\n\n- pencil = bút chì, crayon = bút sáp màu, scissors = kéo, notebook = vở.\n- paper = giấy, map = bản đồ, globe = quả địa cầu, computer = máy tính.\n\n**Mẹo nhỏ**\n*draw* = vẽ: I draw with a crayon.",
        words: [
          W("pencil", "bút chì", "✏️"), W("crayon", "bút sáp màu", "🖍️"), W("scissors", "kéo", "✂️"), W("notebook", "vở", "📓"),
          W("paper", "giấy", "📄"), W("map", "bản đồ", "🗺️"), W("globe", "quả địa cầu", "🌍"), W("computer", "máy tính", "💻"),
        ],
        sentences: [
          { t: ["I", "write", "with", "a", "pencil"], n: ["Tôi", "viết", "bằng", "bút", "chì"], blank: "pencil", dT: ["crayon", "read"], dN: ["sáp", "đọc"] },
          { t: ["I", "draw", "on", "paper"], n: ["Tôi", "vẽ", "trên", "giấy"], blank: "paper", dT: ["notebook", "under"], dN: ["vở", "dưới"] },
          { t: ["The", "map", "is", "big"], n: ["Tấm", "bản", "đồ", "to"], blank: "map", dT: ["small", "globe"], dN: ["nhỏ", "giấy"] },
          { t: ["We", "use", "a", "computer"], n: ["Chúng", "ta", "dùng", "máy", "tính"], blank: "computer", dT: ["notebook", "an"], dN: ["vở", "kéo"] },
        ],
      },
      {
        title: "Cơ thể",
        description: "Học tên các bộ phận trên cơ thể của em.",
        guidebook:
          "Cơ thể của em 🧑\n\n**Các bộ phận**\n- head = đầu, eye = mắt, nose = mũi, mouth = miệng.\n- ear = tai, hand = tay, leg = chân, hair = tóc.\n\n**Mẫu câu**\n*This is my nose.* = Đây là mũi của tôi.",
        words: [
          W("head", "đầu", "🧑"), W("eye", "mắt", "👁️"), W("nose", "mũi", "👃"), W("mouth", "miệng", "👄"),
          W("ear", "tai", "👂"), W("hand", "tay", "✋"), W("leg", "chân", "🦵"), W("hair", "tóc", "💇"),
        ],
        sentences: [
          { t: ["This", "is", "my", "head"], n: ["Đây", "là", "đầu", "của", "tôi"], blank: "head", dT: ["hand", "a"], dN: ["tay", "mắt"] },
          { t: ["This", "is", "my", "nose"], n: ["Đây", "là", "mũi", "của", "tôi"], blank: "nose", dT: ["ear", "the"], dN: ["tai", "miệng"] },
          { t: ["I", "have", "a", "mouth"], n: ["Tôi", "có", "một", "cái", "miệng"], blank: "mouth", dT: ["eye", "two"], dN: ["mắt", "tóc"] },
        ],
      },
      {
        title: "Quần áo",
        description: "Gọi tên quần áo em mặc mỗi ngày.",
        guidebook:
          "Mặc đẹp nào! 👕\n\n**Quần áo**\n- shirt = áo sơ mi, pants = quần dài, dress = váy, hat = mũ.\n- shoes = giày, socks = tất, coat = áo khoác, scarf = khăn quàng.\n\n**Mẹo nhỏ**\n*wear* = mặc, đội: I wear a hat. = Tôi đội một cái mũ.",
        words: [
          W("shirt", "áo sơ mi", "👕"), W("pants", "quần dài", "👖"), W("dress", "váy", "👗"), W("hat", "mũ", "🧢"),
          W("shoes", "giày", "👟"), W("socks", "tất", "🧦"), W("coat", "áo khoác", "🧥"), W("scarf", "khăn quàng", "🧣"),
        ],
        sentences: [
          { t: ["I", "wear", "a", "hat"], n: ["Tôi", "đội", "một", "cái", "mũ"], blank: "hat", dT: ["dress", "the"], dN: ["váy", "áo"] },
          { t: ["My", "shirt", "is", "blue"], n: ["Áo", "sơ", "mi", "của", "tôi", "màu", "xanh", "dương"], blank: "shirt", dT: ["coat", "red"], dN: ["áo khoác", "quần"] },
          { t: ["She", "wears", "a", "dress"], n: ["Cô", "ấy", "mặc", "một", "cái", "váy"], blank: "dress", dT: ["scarf", "shoes"], dN: ["khăn", "tất"] },
        ],
      },
      {
        title: "Giao thông",
        description: "Các phương tiện đi lại quanh em.",
        guidebook:
          "Đi lại an toàn! 🚗\n\n**Phương tiện**\n- car = ô tô, bus = xe buýt, bicycle = xe đạp, train = tàu hỏa.\n- airplane = máy bay, boat = thuyền, motorbike = xe máy, truck = xe tải.\n\n**Mẹo nhỏ**\n*by* + phương tiện = đi bằng: I go by bus. = Tôi đi bằng xe buýt.",
        words: [
          W("car", "ô tô", "🚗"), W("bus", "xe buýt", "🚌"), W("bicycle", "xe đạp", "🚲"), W("train", "tàu hỏa", "🚆"),
          W("airplane", "máy bay", "✈️"), W("boat", "thuyền", "⛵"), W("motorbike", "xe máy", "🏍️"), W("truck", "xe tải", "🚚"),
        ],
        sentences: [
          { t: ["I", "go", "by", "bus"], n: ["Tôi", "đi", "bằng", "xe", "buýt"], blank: "bus", dT: ["car", "train"], dN: ["ô tô", "tàu"] },
          { t: ["The", "train", "is", "fast"], n: ["Tàu", "hỏa", "chạy", "nhanh"], blank: "train", dT: ["boat", "slow"], dN: ["thuyền", "xe đạp"] },
          { t: ["I", "ride", "a", "bicycle"], n: ["Tôi", "đi", "xe", "đạp"], blank: "bicycle", dT: ["truck", "an"], dN: ["xe tải", "máy bay"] },
        ],
      },
      {
        title: "Thời tiết",
        description: "Nói về thời tiết: nắng, mưa, gió và tuyết.",
        guidebook:
          "Thời tiết hôm nay ☀️\n\n**Thời tiết**\n- sun = mặt trời, rain = mưa, cloud = mây, snow = tuyết.\n- wind = gió, hot = nóng, cold = lạnh, lightning = tia chớp.\n\n**Mẫu câu**\n*It is cold today.* = Hôm nay trời lạnh.",
        words: [
          W("sun", "mặt trời", "☀️"), W("rain", "mưa", "🌧️"), W("cloud", "mây", "☁️"), W("snow", "tuyết", "❄️"),
          W("wind", "gió", "💨"), W("hot", "nóng", "🥵"), W("cold", "lạnh", "🥶"), W("lightning", "tia chớp", "⚡"),
        ],
        sentences: [
          { t: ["The", "sun", "is", "hot"], n: ["Mặt", "trời", "nóng"], blank: "sun", dT: ["rain", "cold"], dN: ["mưa", "mây"] },
          { t: ["It", "is", "cold", "today"], n: ["Hôm", "nay", "trời", "lạnh"], blank: "cold", dT: ["hot", "snow"], dN: ["nóng", "gió"] },
          { t: ["I", "see", "a", "big", "cloud"], n: ["Tôi", "thấy", "một", "đám", "mây", "to"], blank: "cloud", dT: ["wind", "the"], dN: ["gió", "tuyết"] },
        ],
      },
      {
        title: "Các thì trong tiếng Anh",
        band: "thcs",
        description: "Làm quen các thì quan trọng: quá khứ, tương lai và hiện tại hoàn thành.",
        guidebook:
          "Chìa khóa của các thì ⏰\n\n**Những từ khóa quan trọng**\n- *will* = sẽ (tương lai đơn): I will visit Hue tomorrow.\n- *was/were* = đã là (quá khứ của am/is/are), *did* = đã (trợ động từ quá khứ).\n- *have/has* = đã (hiện tại hoàn thành): I have lived here since 2020. She has finished.\n- *can* = có thể (hiện tại), *could* = có thể (quá khứ).\n\n**Dấu hiệu nhận biết**\n- yesterday (hôm qua) → quá khứ; tomorrow (ngày mai) → will; since/for → have/has.",
        words: [
          W("will", "sẽ (tương lai đơn)", "🔮"), W("was", "đã là (quá khứ của am/is)", "⏪"), W("were", "đã là (quá khứ của are)", "⏪"), W("did", "đã (trợ động từ quá khứ)", "🕰️"),
          W("have", "đã (hoàn thành, với I/you/we/they)", "✅"), W("has", "đã (hoàn thành, với he/she/it)", "✅"), W("can", "có thể (hiện tại)", "💪"), W("could", "có thể (quá khứ)", "🌙"),
        ],
        sentences: [
          { t: ["I", "will", "visit", "Hue", "tomorrow"], n: ["Tôi", "sẽ", "đi", "thăm", "Huế", "vào", "ngày", "mai"], blank: "will", dT: ["was", "did"], dN: ["đã", "đang"] },
          { t: ["She", "has", "finished", "her", "homework"], n: ["Cô", "ấy", "đã", "làm", "xong", "bài", "tập"], blank: "has", dT: ["have", "did"], dN: ["sẽ", "rồi"] },
          { t: ["They", "were", "happy", "yesterday"], n: ["Họ", "đã", "rất", "vui", "hôm", "qua"], blank: "were", dT: ["was", "will"], dN: ["là", "sẽ"] },
          { t: ["He", "did", "his", "homework", "yesterday"], n: ["Anh", "ấy", "đã", "làm", "bài", "tập", "hôm", "qua"], blank: "did", dT: ["does", "will"], dN: ["làm", "sẽ"] },
          { t: ["We", "have", "lived", "here", "since", "2020"], n: ["Chúng", "tôi", "đã", "sống", "ở", "đây", "từ", "năm", "2020"], blank: "have", dT: ["has", "did"], dN: ["đã từng", "sẽ"] },
          { t: ["He", "could", "swim", "when", "he", "was", "five"], n: ["Anh", "ấy", "đã", "biết", "bơi", "khi", "năm", "tuổi"], blank: "could", dT: ["can", "will"], dN: ["có thể", "sẽ"] },
        ],
      },
      {
        title: "Câu bị động",
        band: "thcs",
        description: "Học cách nói một việc được làm: be + động từ dạng V3.",
        guidebook:
          "Câu bị động 🔧\n\n**Công thức**: be + V3 (động từ dạng quá khứ phân từ)\n- The room *is cleaned* every day. = Căn phòng được dọn sạch mỗi ngày.\n- This bridge *was built* long ago. = Cây cầu này được xây từ lâu.\n\n**Các V3 hay gặp**\n- made (được làm ra), built (được xây), written (được viết), cleaned (được dọn sạch).\n- planted (được trồng), invented (được phát minh), spoken (được nói), painted (được vẽ).",
        words: [
          W("made", "được làm ra", "🏭"), W("built", "được xây dựng", "🏗️"), W("written", "được viết", "✍️"), W("cleaned", "được dọn sạch", "🧹"),
          W("planted", "được trồng", "🌱"), W("invented", "được phát minh", "💡"), W("spoken", "được nói (ngôn ngữ)", "🗣️"), W("painted", "được vẽ", "🎨"),
        ],
        sentences: [
          { t: ["This", "toy", "is", "made", "of", "wood"], n: ["Món", "đồ", "chơi", "này", "được", "làm", "bằng", "gỗ"], blank: "made", dT: ["built", "is"], dN: ["xây", "trồng"] },
          { t: ["This", "bridge", "was", "built", "long", "ago"], n: ["Cây", "cầu", "này", "được", "xây", "từ", "lâu"], blank: "built", dT: ["made", "cleaned"], dN: ["làm", "vẽ"] },
          { t: ["The", "room", "is", "cleaned", "every", "day"], n: ["Căn", "phòng", "được", "dọn", "sạch", "mỗi", "ngày"], blank: "cleaned", dT: ["painted", "was"], dN: ["vẽ", "trồng"] },
          { t: ["The", "telephone", "was", "invented", "in", "1876"], n: ["Điện", "thoại", "được", "phát", "minh", "vào", "năm", "1876"], blank: "invented", dT: ["written", "built"], dN: ["viết", "xây"] },
          { t: ["English", "is", "spoken", "in", "many", "countries"], n: ["Tiếng", "Anh", "được", "nói", "ở", "nhiều", "nước"], blank: "spoken", dT: ["written", "is"], dN: ["viết", "đọc"] },
          { t: ["The", "famous", "song", "was", "written", "by", "a", "singer"], n: ["Bài", "hát", "nổi", "tiếng", "được", "viết", "bởi", "một", "ca", "sĩ"], blank: "written", dT: ["painted", "made"], dN: ["vẽ", "làm"] },
        ],
      },
      {
        title: "Câu điều kiện",
        band: "thcs",
        description: "Nói về điều kiện và kết quả: nếu... thì... với loại 1 và loại 2.",
        guidebook:
          "Nếu... thì... 🤔\n\n**Loại 1 — điều có thể xảy ra**: If + hiện tại, will + động từ\n- If it rains, we *will* stay at home.\n\n**Loại 2 — giả định, khó xảy ra**: If + quá khứ, would + động từ\n- If I were rich, I *would* travel the world.\n\n**Từ khóa**: if = nếu, would = sẽ (giả định), might = có lẽ sẽ, unless = trừ khi.",
        words: [
          W("if", "nếu", "🤔"), W("would", "sẽ (trong câu giả định)", "💭"), W("might", "có lẽ sẽ", "🎲"), W("unless", "trừ khi", "🚫"),
          W("rains", "mưa (động từ)", "🌧️"), W("rich", "giàu", "💎"), W("pass", "thi đỗ", "🎓"), W("miss", "bỏ lỡ", "🚌"),
        ],
        sentences: [
          { t: ["If", "it", "rains", "we", "will", "stay", "at", "home"], n: ["Nếu", "trời", "mưa", "chúng", "ta", "sẽ", "ở", "nhà"], blank: "will", dT: ["would", "rains"], dN: ["đi chơi", "đi"] },
          { t: ["If", "I", "were", "rich", "I", "would", "travel", "the", "world"], n: ["Nếu", "tôi", "giàu", "tôi", "sẽ", "đi", "du", "lịch", "khắp", "thế", "giới"], blank: "would", dT: ["will", "were"], dN: ["sẽ (thật)", "là"] },
          { t: ["If", "you", "study", "hard", "you", "will", "pass", "the", "exam"], n: ["Nếu", "bạn", "học", "chăm", "bạn", "sẽ", "thi", "đỗ"], blank: "pass", dT: ["miss", "fail"], dN: ["trượt", "lỡ"] },
          { t: ["If", "we", "leave", "late", "we", "might", "miss", "the", "bus"], n: ["Nếu", "chúng", "ta", "đi", "muộn", "chúng", "ta", "có", "lẽ", "sẽ", "lỡ", "xe", "buýt"], blank: "might", dT: ["will", "would"], dN: ["chắc chắn", "đã"] },
          { t: ["If", "I", "had", "wings", "I", "would", "fly"], n: ["Nếu", "tôi", "có", "đôi", "cánh", "tôi", "sẽ", "bay"], blank: "would", dT: ["will", "had"], dN: ["bay", "có"] },
          { t: ["You", "will", "save", "money", "if", "you", "walk"], n: ["Bạn", "sẽ", "tiết", "kiệm", "tiền", "nếu", "bạn", "đi", "bộ"], blank: "save", dT: ["spend", "miss"], dN: ["tiêu", "lỡ"] },
        ],
      },
      {
        title: "Mệnh đề quan hệ và lời nói gián tiếp",
        band: "thcs",
        description: "Dùng who, which, where để nối câu và thuật lại lời người khác.",
        guidebook:
          "Nối câu và thuật lại 🔗\n\n**Mệnh đề quan hệ**\n- *who* chỉ người: The girl who is singing is my sister.\n- *which* chỉ vật: The book which I bought is new.\n- *where* chỉ nơi chốn: the village where I was born.\n\n**Lời nói gián tiếp**\n- He *said* that he was tired. = Anh ấy nói rằng anh ấy mệt.\n- She *asked* me where I lived. / The teacher *told* us to be quiet.",
        words: [
          W("who", "người mà", "🧑"), W("which", "vật mà", "📦"), W("whose", "mà của người đó", "🔑"), W("where", "nơi mà", "📍"),
          W("said", "đã nói rằng", "💬"), W("told", "đã bảo, đã kể", "📣"), W("asked", "đã hỏi", "❓"), W("that", "rằng, mà", "🔗"),
        ],
        sentences: [
          { t: ["The", "girl", "who", "is", "singing", "is", "my", "sister"], n: ["Cô", "bé", "đang", "hát", "là", "chị", "của", "tôi"], blank: "who", dT: ["which", "where"], dN: ["vật mà", "nơi mà"] },
          { t: ["The", "book", "which", "I", "bought", "is", "very", "new"], n: ["Quyển", "sách", "tôi", "đã", "mua", "rất", "mới"], blank: "which", dT: ["who", "that"], dN: ["người mà", "mới"] },
          { t: ["He", "said", "that", "he", "was", "tired"], n: ["Anh", "ấy", "nói", "rằng", "anh", "ấy", "mệt"], blank: "said", dT: ["told", "asked"], dN: ["bảo", "hỏi"] },
          { t: ["She", "asked", "me", "where", "I", "lived"], n: ["Cô", "ấy", "hỏi", "tôi", "sống", "ở", "đâu"], blank: "asked", dT: ["said", "told"], dN: ["nói", "bảo"] },
          { t: ["This", "is", "the", "village", "where", "I", "was", "born"], n: ["Đây", "là", "ngôi", "làng", "nơi", "tôi", "đã", "sinh", "ra"], blank: "where", dT: ["which", "who"], dN: ["mà", "ở đó"] },
          { t: ["The", "teacher", "told", "us", "to", "be", "quiet"], n: ["Thầy", "giáo", "bảo", "chúng", "tôi", "giữ", "im", "lặng"], blank: "told", dT: ["said", "asked"], dN: ["nói", "hỏi"] },
        ],
      },
      {
        title: "Bảo vệ môi trường",
        band: "thcs",
        description: "Từ vựng về môi trường và những việc làm xanh mỗi ngày.",
        guidebook:
          "Chung tay bảo vệ Trái Đất 🌍\n\n**Từ vựng xanh**\n- environment = môi trường, pollution = sự ô nhiễm, rubbish = rác.\n- recycle = tái chế, protect = bảo vệ, plastic = nhựa.\n- forest = khu rừng, energy = năng lượng.\n\n**Mẫu câu**\n- We must protect the environment. = Chúng ta phải bảo vệ môi trường.\n- We should recycle plastic bottles. = Chúng ta nên tái chế chai nhựa.",
        words: [
          W("environment", "môi trường", "🌍"), W("pollution", "sự ô nhiễm", "🏭"), W("recycle", "tái chế", "♻️"), W("protect", "bảo vệ", "🛡️"),
          W("plastic", "nhựa", "🥤"), W("rubbish", "rác", "🗑️"), W("forest", "khu rừng", "🌲"), W("energy", "năng lượng", "🔋"),
        ],
        sentences: [
          { t: ["We", "must", "protect", "the", "environment"], n: ["Chúng", "ta", "phải", "bảo", "vệ", "môi", "trường"], blank: "protect", dT: ["recycle", "pollute"], dN: ["tái chế", "làm bẩn"] },
          { t: ["We", "should", "recycle", "plastic", "bottles"], n: ["Chúng", "ta", "nên", "tái", "chế", "chai", "nhựa"], blank: "recycle", dT: ["protect", "throw"], dN: ["bảo vệ", "vứt bỏ"] },
          { t: ["Pollution", "makes", "the", "air", "dirty"], n: ["Ô", "nhiễm", "làm", "cho", "không", "khí", "bẩn"], blank: "Pollution", dT: ["Energy", "Forest"], dN: ["năng lượng", "rừng"] },
        ],
      },
      {
        title: "Công nghệ và nghề nghiệp",
        band: "thcs",
        description: "Từ vựng về công nghệ hiện đại và các nghề em mơ ước.",
        guidebook:
          "Thế giới công nghệ và nghề nghiệp 💼\n\n**Từ vựng**\n- robot = người máy, internet = mạng internet, smartphone = điện thoại thông minh.\n- engineer = kỹ sư, doctor = bác sĩ, farmer = nông dân, pilot = phi công, designer = nhà thiết kế.\n\n**Mẫu câu**\n- She wants to be a doctor. = Cô ấy muốn trở thành bác sĩ.\n- A robot can help people work. = Người máy có thể giúp con người làm việc.",
        words: [
          W("robot", "người máy", "🤖"), W("internet", "mạng internet", "🌐"), W("smartphone", "điện thoại thông minh", "📱"), W("engineer", "kỹ sư", "👷"),
          W("doctor", "bác sĩ", "🧑‍⚕️"), W("farmer", "nông dân", "🧑‍🌾"), W("pilot", "phi công", "🧑‍✈️"), W("designer", "nhà thiết kế", "🎨"),
        ],
        sentences: [
          { t: ["My", "uncle", "is", "an", "engineer"], n: ["Chú", "của", "tôi", "là", "một", "kỹ", "sư"], blank: "engineer", dT: ["doctor", "pilot"], dN: ["bác sĩ", "nông dân"] },
          { t: ["She", "wants", "to", "be", "a", "doctor"], n: ["Cô", "ấy", "muốn", "trở", "thành", "bác", "sĩ"], blank: "doctor", dT: ["farmer", "robot"], dN: ["phi công", "người máy"] },
          { t: ["A", "robot", "can", "help", "people", "work"], n: ["Người", "máy", "có", "thể", "giúp", "con", "người", "làm", "việc"], blank: "robot", dT: ["smartphone", "engineer"], dN: ["internet", "kỹ sư"] },
        ],
      },
      {
        title: "Câu điều kiện nâng cao và câu ước",
        band: "thpt",
        description: "Điều kiện loại 3, câu ước wish và if only cho những điều trái với quá khứ.",
        guidebook:
          "Điều kiện loại 3 và câu ước 🎓\n\n**Loại 3 — trái với quá khứ**: If + had + V3, would have + V3\n- If I had studied hard, I would have passed the exam. = Nếu tôi đã học chăm thì tôi đã thi đỗ.\n\n**Câu ước**\n- *wish* = ước: I wish I were taller. = Tôi ước tôi cao hơn.\n- *if only* = giá mà: If only I had listened to my mother.\n\n**Cụm hay gặp**\n- even if = ngay cả khi, as if = như thể, in case = phòng khi, only if = chỉ khi.",
        words: [
          W("had", "đã (quá khứ hoàn thành, had + V3)", "⏪"), W("would have", "đã sẽ (kết quả loại 3)", "💭"), W("wish", "ước, mong ước", "🌠"), W("if only", "giá mà", "🙏"),
          W("even if", "ngay cả khi", "🌧️"), W("as if", "như thể", "🎭"), W("in case", "phòng khi", "☂️"), W("only if", "chỉ khi", "🔑"),
        ],
        sentences: [
          { t: ["If", "I", "had", "studied", "hard", "I", "would", "have", "passed", "the", "exam"], n: ["Nếu", "tôi", "đã", "học", "chăm", "tôi", "đã", "thi", "đỗ"], blank: "had", dT: ["were", "will"], dN: ["đang", "sẽ"] },
          { t: ["I", "wish", "I", "were", "taller"], n: ["Tôi", "ước", "tôi", "cao", "hơn"], blank: "wish", dT: ["want", "hope"], dN: ["muốn", "thích"] },
          { t: ["If", "only", "I", "had", "listened", "to", "my", "mother"], n: ["Giá", "mà", "tôi", "đã", "nghe", "lời", "mẹ"], blank: "had", dT: ["have", "did"], dN: ["đang", "sẽ"] },
          { t: ["We", "will", "go", "out", "even", "if", "it", "rains", "tomorrow"], n: ["Chúng", "ta", "sẽ", "đi", "ra", "ngoài", "ngay", "cả", "khi", "trời", "mưa", "vào", "ngày", "mai"], blank: "even", dT: ["as", "only"], dN: ["như", "chỉ"] },
          { t: ["He", "talks", "as", "if", "he", "knew", "everything"], n: ["Anh", "ấy", "nói", "như", "thể", "anh", "ấy", "biết", "mọi", "thứ"], blank: "as", dT: ["even", "like"], dN: ["ngay", "giống"] },
          { t: ["You", "can", "play", "only", "if", "you", "finish", "your", "homework"], n: ["Bạn", "có", "thể", "chơi", "chỉ", "khi", "bạn", "làm", "xong", "bài", "tập"], blank: "only", dT: ["even", "as"], dN: ["ngay", "như"] },
        ],
      },
      {
        title: "Mệnh đề quan hệ nâng cao",
        band: "thpt",
        description: "Dùng whom, what, when, why và rút gọn mệnh đề quan hệ bằng phân từ.",
        guidebook:
          "Mệnh đề quan hệ nâng cao 🔗\n\n**Đại từ nâng cao**\n- *whom* chỉ người làm tân ngữ, thường sau giới từ: the man to whom I talked.\n- *what* = điều mà, *when* = khi mà, *why* = lý do mà.\n\n**Rút gọn bằng phân từ**\n- The boy standing there = cậu bé mà đang đứng ở đó (V-ing khi chủ động).\n- wearing = đang mặc, holding = đang cầm, carrying = đang mang, đang bê.",
        words: [
          W("whom", "người mà (làm tân ngữ)", "🧑"), W("what", "điều mà, cái mà", "💡"), W("when", "khi mà, lúc mà", "🕰️"), W("why", "lý do mà", "❓"),
          W("standing", "đang đứng", "🧍"), W("wearing", "đang mặc", "👕"), W("holding", "đang cầm, đang ôm", "🤲"), W("carrying", "đang mang, đang bê", "🎒"),
        ],
        sentences: [
          { t: ["The", "man", "to", "whom", "I", "talked", "is", "my", "teacher"], n: ["Người", "đàn", "ông", "mà", "tôi", "đã", "nói", "chuyện", "là", "thầy", "giáo", "của", "tôi"], blank: "whom", dT: ["who", "which"], dN: ["vật mà", "nơi mà"] },
          { t: ["The", "boy", "standing", "there", "is", "my", "brother"], n: ["Cậu", "bé", "đang", "đứng", "ở", "đó", "là", "anh", "trai", "của", "tôi"], blank: "standing", dT: ["wearing", "holding"], dN: ["đang mặc", "đang cầm"] },
          { t: ["The", "girl", "wearing", "a", "red", "dress", "is", "Lan"], n: ["Cô", "gái", "đang", "mặc", "váy", "đỏ", "là", "Lan"], blank: "wearing", dT: ["standing", "carrying"], dN: ["đang đứng", "đang mang"] },
          { t: ["I", "know", "the", "reason", "why", "he", "left", "early"], n: ["Tôi", "biết", "lý", "do", "mà", "anh", "ấy", "đã", "về", "sớm"], blank: "why", dT: ["when", "what"], dN: ["khi mà", "điều mà"] },
          { t: ["Sunday", "is", "the", "day", "when", "we", "rest"], n: ["Chủ", "nhật", "là", "ngày", "mà", "chúng", "ta", "nghỉ", "ngơi"], blank: "when", dT: ["why", "whom"], dN: ["lý do mà", "người mà"] },
          { t: ["What", "the", "man", "carrying", "a", "bag", "said", "was", "true"], n: ["Điều", "người", "đàn", "ông", "đang", "mang", "túi", "nói", "là", "đúng"], blank: "What", dT: ["Why", "When"], dN: ["lý do", "khi"] },
        ],
      },
      {
        title: "Câu bị động nâng cao",
        band: "thpt",
        description: "Bị động với have/get something done và bị động tường thuật is said, is known.",
        guidebook:
          "Bị động nâng cao 🔧\n\n**Nhờ ai làm việc gì**: have/get + vật + V3\n- I had my bike repaired yesterday. = Tôi đã cho sửa xe đạp hôm qua.\n- She got her hair cut last week. = Cô ấy đã đi cắt tóc tuần trước.\n\n**Bị động tường thuật**\n- She is known to be very kind. = Cô ấy được biết là rất tốt bụng.\n- He is said to be rich. = Người ta nói anh ấy giàu.\n\n**Các V3 mới**: given, sent, taught, stolen, repaired, delivered, known, cut.",
        words: [
          W("given", "được cho, được tặng (V3 của give)", "🎁"), W("sent", "được gửi đi (V3 của send)", "✉️"), W("taught", "được dạy (V3 của teach)", "📚"), W("stolen", "bị lấy trộm (V3 của steal)", "🚨"),
          W("repaired", "được sửa chữa", "🔧"), W("delivered", "được giao đến", "📦"), W("known", "được biết đến (V3 của know)", "🌟"), W("cut", "được cắt (V3 của cut)", "✂️"),
        ],
        sentences: [
          { t: ["I", "had", "my", "bike", "repaired", "yesterday"], n: ["Tôi", "đã", "cho", "sửa", "xe", "đạp", "hôm", "qua"], blank: "repaired", dT: ["delivered", "stolen"], dN: ["giao đến", "lấy trộm"] },
          { t: ["The", "letter", "given", "to", "me", "was", "delivered", "this", "morning"], n: ["Bức", "thư", "được", "đưa", "cho", "tôi", "đã", "được", "giao", "sáng", "nay"], blank: "delivered", dT: ["repaired", "sent"], dN: ["sửa chữa", "gửi đi"] },
          { t: ["He", "is", "known", "to", "have", "been", "taught", "piano", "as", "a", "child"], n: ["Anh", "ấy", "được", "biết", "là", "đã", "được", "dạy", "đàn", "piano", "khi", "còn", "nhỏ"], blank: "known", dT: ["given", "said"], dN: ["cho", "nói"] },
          { t: ["My", "wallet", "was", "stolen", "last", "night"], n: ["Ví", "của", "tôi", "đã", "bị", "lấy", "trộm", "đêm", "qua"], blank: "stolen", dT: ["cut", "sent"], dN: ["cắt", "gửi"] },
          { t: ["She", "got", "her", "hair", "cut", "last", "week"], n: ["Cô", "ấy", "đã", "đi", "cắt", "tóc", "tuần", "trước"], blank: "cut", dT: ["stolen", "given"], dN: ["lấy trộm", "cho"] },
          { t: ["The", "parcel", "was", "sent", "to", "my", "house", "yesterday"], n: ["Bưu", "kiện", "đã", "được", "gửi", "đến", "nhà", "tôi", "hôm", "qua"], blank: "sent", dT: ["taught", "delivered"], dN: ["dạy", "giao đến"] },
        ],
      },
      {
        title: "Lời nói gián tiếp nâng cao",
        band: "thpt",
        description: "Thuật lại câu hỏi, mệnh lệnh và lời hứa với whether, ordered, suggested.",
        guidebook:
          "Lời nói gián tiếp nâng cao 💬\n\n**Thuật câu hỏi**\n- He asked me whether I liked coffee. = Anh ấy hỏi tôi có thích cà phê không.\n- *whether* = liệu có... không (giống if trong câu hỏi gián tiếp).\n\n**Mệnh lệnh, lời khuyên, đề nghị**\n- ordered = ra lệnh, advised = khuyên, suggested = gợi ý.\n- She suggested going to the beach. = Cô ấy gợi ý đi biển (suggest + V-ing).\n\n**Các động từ thuật lại khác**: promised = hứa, agreed = đồng ý, explained = giải thích, refused = từ chối.",
        words: [
          W("whether", "liệu có... không", "🤔"), W("ordered", "đã ra lệnh", "📢"), W("advised", "đã khuyên", "🩺"), W("suggested", "đã gợi ý", "💡"),
          W("promised", "đã hứa", "🤞"), W("agreed", "đã đồng ý", "🤝"), W("explained", "đã giải thích", "📖"), W("refused", "đã từ chối", "🚫"),
        ],
        sentences: [
          { t: ["He", "asked", "me", "whether", "I", "liked", "coffee"], n: ["Anh", "ấy", "hỏi", "tôi", "liệu", "tôi", "có", "thích", "cà", "phê", "không"], blank: "whether", dT: ["that", "why"], dN: ["rằng", "tại sao"] },
          { t: ["The", "teacher", "ordered", "us", "to", "open", "our", "books"], n: ["Thầy", "giáo", "ra", "lệnh", "cho", "chúng", "tôi", "mở", "sách"], blank: "ordered", dT: ["advised", "asked"], dN: ["khuyên", "hỏi"] },
          { t: ["The", "doctor", "advised", "me", "to", "rest", "more"], n: ["Bác", "sĩ", "khuyên", "tôi", "nghỉ", "ngơi", "nhiều", "hơn"], blank: "advised", dT: ["ordered", "promised"], dN: ["ra lệnh", "hứa"] },
          { t: ["She", "suggested", "going", "to", "the", "beach"], n: ["Cô", "ấy", "gợi", "ý", "đi", "biển"], blank: "suggested", dT: ["refused", "explained"], dN: ["từ chối", "giải thích"] },
          { t: ["He", "promised", "to", "come", "and", "agreed", "to", "help", "us"], n: ["Anh", "ấy", "hứa", "sẽ", "đến", "và", "đồng", "ý", "giúp", "chúng", "tôi"], blank: "promised", dT: ["suggested", "refused"], dN: ["gợi ý", "từ chối"] },
          { t: ["He", "explained", "why", "he", "refused", "to", "answer"], n: ["Anh", "ấy", "giải", "thích", "vì", "sao", "anh", "ấy", "từ", "chối", "trả", "lời"], blank: "explained", dT: ["agreed", "ordered"], dN: ["đồng ý", "ra lệnh"] },
        ],
      },
      {
        title: "Thế giới quanh ta",
        band: "thpt",
        description: "Từ vựng học thuật về khí hậu, dân số, văn hóa và những việc làm vì cộng đồng.",
        guidebook:
          "Thế giới quanh ta 🌏\n\n**Vấn đề toàn cầu**\n- climate change = biến đổi khí hậu, global warming = nóng lên toàn cầu.\n- population = dân số, future = tương lai.\n\n**Văn hóa và cộng đồng**\n- culture = văn hóa, tradition = truyền thống.\n- volunteer = tình nguyện viên, đi tình nguyện; charity = từ thiện, hội từ thiện.\n\n**Mẫu câu**\n- Global warming is part of climate change. = Nóng lên toàn cầu là một phần của biến đổi khí hậu.",
        words: [
          W("climate change", "biến đổi khí hậu", "🌡️"), W("global warming", "nóng lên toàn cầu", "🔥"), W("population", "dân số", "👥"), W("culture", "văn hóa", "🎎"),
          W("tradition", "truyền thống", "🏮"), W("volunteer", "tình nguyện viên, đi tình nguyện", "🙋"), W("charity", "từ thiện", "❤️"), W("future", "tương lai", "🔮"),
        ],
        sentences: [
          { t: ["Global", "warming", "is", "part", "of", "climate", "change"], n: ["Nóng", "lên", "toàn", "cầu", "là", "một", "phần", "của", "biến", "đổi", "khí", "hậu"], blank: "warming", dT: ["change", "future"], dN: ["thay đổi", "tương lai"] },
          { t: ["The", "population", "will", "grow", "in", "the", "future"], n: ["Dân", "số", "sẽ", "tăng", "trong", "tương", "lai"], blank: "population", dT: ["culture", "tradition"], dN: ["văn hóa", "truyền thống"] },
          { t: ["Students", "volunteer", "for", "charity", "work", "every", "summer"], n: ["Học", "sinh", "đi", "tình", "nguyện", "làm", "việc", "từ", "thiện", "mỗi", "mùa", "hè"], blank: "volunteer", dT: ["charity", "future"], dN: ["từ thiện", "tương lai"] },
        ],
      },
      {
        title: "Ôn tập tổng hợp",
        band: "thpt",
        description: "Ôn chung các thì, bị động, điều kiện, mệnh đề quan hệ và lời nói gián tiếp.",
        guidebook:
          "Ôn tập tổng hợp 🏆\n\n**Trạng từ dấu hiệu hay gặp**\n- already = đã rồi, yet = chưa (cuối câu hỏi, phủ định), ever = đã từng, never = chưa bao giờ.\n- since = kể từ khi, ago = cách đây, recently = gần đây, finally = cuối cùng.\n\n**Nhớ lại**\n- Hiện tại hoàn thành: have/has + V3, dùng với already, ever, never, since.\n- Điều kiện loại 3: If + had + V3, would have + V3.\n- Câu hỏi gián tiếp: asked me whether/if...; bị động: be + V3.",
        words: [
          W("already", "đã rồi", "✅"), W("yet", "chưa (dùng với phủ định, câu hỏi)", "⌛"), W("ever", "đã từng", "🌟"), W("never", "chưa bao giờ", "🚫"),
          W("since", "kể từ khi, kể từ", "📅"), W("ago", "cách đây", "⏪"), W("recently", "gần đây", "🆕"), W("finally", "cuối cùng", "🏁"),
        ],
        sentences: [
          { t: ["If", "I", "had", "already", "finished", "I", "would", "have", "gone", "out"], n: ["Nếu", "tôi", "đã", "làm", "xong", "rồi", "tôi", "đã", "đi", "ra", "ngoài"], blank: "already", dT: ["yet", "never"], dN: ["chưa", "chưa bao giờ"] },
          { t: ["This", "house", "was", "built", "two", "years", "ago"], n: ["Ngôi", "nhà", "này", "được", "xây", "cách", "đây", "hai", "năm"], blank: "ago", dT: ["since", "ever"], dN: ["kể từ", "đã từng"] },
          { t: ["If", "I", "ever", "won", "a", "lot", "of", "money", "I", "would", "travel"], n: ["Nếu", "tôi", "trúng", "nhiều", "tiền", "tôi", "sẽ", "đi", "du", "lịch"], blank: "ever", dT: ["never", "already"], dN: ["chưa bao giờ", "đã rồi"] },
          { t: ["The", "book", "which", "I", "bought", "has", "never", "been", "read"], n: ["Quyển", "sách", "mà", "tôi", "đã", "mua", "chưa", "bao", "giờ", "được", "đọc"], blank: "never", dT: ["ever", "yet"], dN: ["đã từng", "chưa"] },
          { t: ["He", "asked", "me", "whether", "I", "had", "finished", "yet"], n: ["Anh", "ấy", "hỏi", "tôi", "liệu", "tôi", "đã", "làm", "xong", "chưa"], blank: "yet", dT: ["already", "finally"], dN: ["đã rồi", "cuối cùng"] },
          { t: ["Since", "2020", "we", "have", "lived", "here", "and", "recently", "we", "finally", "bought", "a", "car"], n: ["Kể", "từ", "năm", "2020", "chúng", "tôi", "đã", "sống", "ở", "đây", "và", "gần", "đây", "cuối", "cùng", "chúng", "tôi", "đã", "mua", "một", "chiếc", "xe", "hơi"], blank: "finally", dT: ["recently", "already"], dN: ["gần đây", "đã rồi"] },
        ],
      },
    ],
  },
  {
    id: "ja-vi",
    targetLanguage: "Tiếng Nhật",
    targetCode: "ja",
    flag: "🇯🇵",
    sectionTitle: "Phần 1: Bảng chữ cái và từ đầu tiên",
    joiner: " ",
    units: [
      {
        title: "Hiragana 1",
        kana: true,
        description: "Tám chữ Hiragana đầu tiên: a, i, u, e, o, ka, ki, ku.",
        guidebook:
          "Hiragana là bảng chữ mềm mại của tiếng Nhật 🎌\n\n**Mỗi chữ một âm**\n- あ (a) như trong あり (ari, con kiến)\n- い (i) như trong いぬ (inu, con chó)\n- う (u) như trong うま (uma, con ngựa)\n- え (e) như trong えんぴつ (enpitsu, bút chì)\n- お (o) như trong おにぎり (onigiri, cơm nắm)\n- か (ka) かめ, き (ki) きつね, く (ku) くるま\n\nBấm loa 🔊 và đọc theo nhé!",
        words: [
          W("あ", "a", "🐜"), W("い", "i", "🐶"), W("う", "u", "🐴"), W("え", "e", "✏️"),
          W("お", "o", "🍙"), W("か", "ka", "🐢"), W("き", "ki", "🦊"), W("く", "ku", "🚗"),
        ],
      },
      {
        title: "Hiragana 2",
        kana: true,
        description: "Tám chữ tiếp theo: ke, ko, sa, shi, su, se, so, ta.",
        guidebook:
          "Thêm tám chữ Hiragana nữa! ✨\n\n- け (ke) けむし (sâu bướm)\n- こ (ko) こあら (gấu koala)\n- さ (sa) さかな (con cá)\n- し (shi) しか (con nai)\n- す (su) すし (sushi)\n- せ (se) せかい (thế giới)\n- そ (so) そら (bầu trời)\n- た (ta) たまご (quả trứng)",
        words: [
          W("け", "ke", "🐛"), W("こ", "ko", "🐨"), W("さ", "sa", "🐟"), W("し", "shi", "🦌"),
          W("す", "su", "🍣"), W("せ", "se", "🌍"), W("そ", "so", "☁️"), W("た", "ta", "🥚"),
        ],
      },
      {
        title: "Hiragana 3",
        kana: true,
        description: "Tám chữ nữa: chi, tsu, te, to, na, ni, nu, ne.",
        guidebook:
          "Sắp thuộc hết rồi! 💪\n\n- ち (chi) ちず (bản đồ)\n- つ (tsu) つき (mặt trăng)\n- て (te) て (bàn tay)\n- と (to) とり (con chim)\n- な (na) なす (quả cà tím)\n- に (ni) にく (thịt)\n- ぬ (nu) ぬいぐるみ (thú nhồi bông)\n- ね (ne) ねこ (con mèo)",
        words: [
          W("ち", "chi", "🗺️"), W("つ", "tsu", "🌙"), W("て", "te", "✋"), W("と", "to", "🐦"),
          W("な", "na", "🍆"), W("に", "ni", "🥩"), W("ぬ", "nu", "🧸"), W("ね", "ne", "🐱"),
        ],
      },
      {
        title: "Katakana 1",
        kana: true,
        description: "Katakana dùng để viết tên con vật và từ mượn: ア, イ, ウ, エ, オ, カ, キ, ク.",
        guidebook:
          "Katakana là bảng chữ thứ hai, nét cứng và gọn hơn 🦒\n\n- ア (a) アイス (kem)\n- イ (i) イルカ (cá heo)\n- ウ (u) ウサギ (con thỏ)\n- エ (e) エビ (con tôm)\n- オ (o) オウム (con vẹt)\n- カ (ka) カメラ (máy ảnh)\n- キ (ki) キリン (hươu cao cổ)\n- ク (ku) クマ (con gấu)",
        words: [
          W("ア", "a", "🍦"), W("イ", "i", "🐬"), W("ウ", "u", "🐰"), W("エ", "e", "🦐"),
          W("オ", "o", "🦜"), W("カ", "ka", "📷"), W("キ", "ki", "🦒"), W("ク", "ku", "🐻"),
        ],
      },
      {
        title: "Từ đầu tiên",
        description: "Những từ đơn giản viết bằng Hiragana.",
        guidebook:
          "Ghép chữ thành từ! 🍎\n\n- りんご (ringo) = quả táo, みず (mizu) = nước, ねこ (neko) = con mèo, いぬ (inu) = con chó.\n- さかな (sakana) = con cá, ほん (hon) = sách, いえ (ie) = ngôi nhà, くるま (kuruma) = xe hơi.\n\n**Mẫu câu**\nこれ は ～ です。= Đây là ～.\nChữ は ở đây đọc là *wa*.",
        words: [
          W("りんご", "quả táo", "🍎", "ringo"), W("みず", "nước", "💧", "mizu"), W("ねこ", "con mèo", "🐱", "neko"), W("いぬ", "con chó", "🐶", "inu"),
          W("さかな", "con cá", "🐟", "sakana"), W("ほん", "quyển sách", "📖", "hon"), W("いえ", "ngôi nhà", "🏠", "ie"), W("くるま", "xe hơi", "🚗", "kuruma"),
        ],
        sentences: [
          { t: ["これ", "は", "りんご", "です"], n: ["Đây", "là", "quả", "táo"], r: "kore wa ringo desu", blank: "りんご", dT: ["ねこ", "みず"], dN: ["mèo", "nước"] },
          { t: ["これ", "は", "ほん", "です"], n: ["Đây", "là", "quyển", "sách"], r: "kore wa hon desu", blank: "ほん", dT: ["いえ", "くるま"], dN: ["nhà", "xe"] },
          { t: ["これ", "は", "さかな", "です"], n: ["Đây", "là", "con", "cá"], r: "kore wa sakana desu", blank: "さかな", dT: ["いぬ", "ねこ"], dN: ["chó", "mèo"] },
          { t: ["これ", "は", "くるま", "です"], n: ["Đây", "là", "chiếc", "xe", "hơi"], r: "kore wa kuruma desu", blank: "くるま", dT: ["ほん", "みず"], dN: ["nhà", "sách"] },
        ],
      },
      {
        title: "Chào hỏi",
        description: "Những câu chào hỏi lịch sự mỗi ngày.",
        guidebook:
          "Người Nhật rất lịch sự 🙇\n\n- おはよう (ohayou) = chào buổi sáng\n- こんにちは (konnichiwa) = xin chào\n- こんばんは (konbanwa) = chào buổi tối\n- ありがとう (arigatou) = cảm ơn\n- さようなら (sayounara) = tạm biệt\n- おやすみ (oyasumi) = chúc ngủ ngon\n- はい (hai) = vâng, いいえ (iie) = không",
        words: [
          W("おはよう", "chào buổi sáng", "🌅", "ohayou"), W("こんにちは", "xin chào", "☀️", "konnichiwa"),
          W("こんばんは", "chào buổi tối", "🌙", "konbanwa"), W("ありがとう", "cảm ơn", "🙏", "arigatou"),
          W("さようなら", "tạm biệt", "👋", "sayounara"), W("おやすみ", "chúc ngủ ngon", "😴", "oyasumi"),
          W("はい", "vâng", "✅", "hai"), W("いいえ", "không", "❌", "iie"),
        ],
      },
      {
        title: "Gia đình",
        description: "Gọi tên những người thân yêu: かぞく (gia đình).",
        guidebook:
          "Gia đình của em 👨‍👩‍👧‍👦\n\n- おとうさん (otousan) = bố, おかあさん (okaasan) = mẹ\n- おにいさん (oniisan) = anh trai, おねえさん (oneesan) = chị gái\n- あかちゃん (akachan) = em bé, おじいさん (ojiisan) = ông, おばあさん (obaasan) = bà\n- ともだち (tomodachi) = bạn\n\n**Mẫu câu**\nこれ は わたし の ～ です。= Đây là ～ của tôi.",
        words: [
          W("おとうさん", "bố", "👨", "otousan"), W("おかあさん", "mẹ", "👩", "okaasan"), W("おにいさん", "anh trai", "👦", "oniisan"), W("おねえさん", "chị gái", "👧", "oneesan"),
          W("あかちゃん", "em bé", "👶", "akachan"), W("おじいさん", "ông", "👴", "ojiisan"), W("おばあさん", "bà", "👵", "obaasan"), W("ともだち", "bạn", "🧑‍🤝‍🧑", "tomodachi"),
        ],
        sentences: [
          { t: ["これ", "は", "わたし", "の", "おとうさん", "です"], n: ["Đây", "là", "bố", "của", "tôi"], r: "kore wa watashi no otousan desu", blank: "おとうさん", dT: ["おかあさん", "ねこ"], dN: ["mẹ", "mèo"] },
          { t: ["これ", "は", "わたし", "の", "おかあさん", "です"], n: ["Đây", "là", "mẹ", "của", "tôi"], r: "kore wa watashi no okaasan desu", blank: "おかあさん", dT: ["おとうさん", "いぬ"], dN: ["bố", "chó"] },
          { t: ["これ", "は", "わたし", "の", "おじいさん", "です"], n: ["Đây", "là", "ông", "của", "tôi"], r: "kore wa watashi no ojiisan desu", blank: "おじいさん", dT: ["おばあさん", "とり"], dN: ["bà", "chim"] },
          { t: ["これ", "は", "わたし", "の", "ともだち", "です"], n: ["Đây", "là", "bạn", "của", "tôi"], r: "kore wa watashi no tomodachi desu", blank: "ともだち", dT: ["あかちゃん", "ほん"], dN: ["em bé", "sách"] },
        ],
      },
      {
        title: "Số đếm",
        description: "Đếm từ một đến tám bằng tiếng Nhật.",
        guidebook:
          "Cùng đếm nào! 🔢\n\n- いち (ichi) = 1, に (ni) = 2, さん (san) = 3, よん (yon) = 4\n- ご (go) = 5, ろく (roku) = 6, なな (nana) = 7, はち (hachi) = 8\n\nĐếm to: いち、に、さん!",
        words: [
          W("いち", "một", "1️⃣", "ichi"), W("に", "hai", "2️⃣", "ni"), W("さん", "ba", "3️⃣", "san"), W("よん", "bốn", "4️⃣", "yon"),
          W("ご", "năm", "5️⃣", "go"), W("ろく", "sáu", "6️⃣", "roku"), W("なな", "bảy", "7️⃣", "nana"), W("はち", "tám", "8️⃣", "hachi"),
        ],
        sentences: [
          { t: ["これ", "は", "さん", "です"], n: ["Đây", "là", "số", "ba"], r: "kore wa san desu", blank: "さん", dT: ["に", "ご"], dN: ["hai", "năm"] },
          { t: ["これ", "は", "ご", "です"], n: ["Đây", "là", "số", "năm"], r: "kore wa go desu", blank: "ご", dT: ["よん", "ろく"], dN: ["bốn", "sáu"] },
          { t: ["これ", "は", "はち", "です"], n: ["Đây", "là", "số", "tám"], r: "kore wa hachi desu", blank: "はち", dT: ["なな", "いち"], dN: ["bảy", "một"] },
          { t: ["これ", "は", "いち", "です"], n: ["Đây", "là", "số", "một"], r: "kore wa ichi desu", blank: "いち", dT: ["に", "さん"], dN: ["hai", "ba"] },
        ],
      },
      {
        title: "Màu sắc",
        description: "Tên các màu bằng tiếng Nhật.",
        guidebook:
          "Thế giới đầy màu sắc! 🌈\n\n- あか (aka) = đỏ, あお (ao) = xanh dương, みどり (midori) = xanh lá, きいろ (kiiro) = vàng\n- くろ (kuro) = đen, しろ (shiro) = trắng, ピンク (pinku) = hồng, オレンジ (orenji) = cam\n\n**Mẫu câu**\nこれ は あか です。= Đây là màu đỏ.",
        words: [
          W("あか", "đỏ", "🔴", "aka"), W("あお", "xanh dương", "🔵", "ao"), W("みどり", "xanh lá", "🟢", "midori"), W("きいろ", "vàng", "🟡", "kiiro"),
          W("くろ", "đen", "⚫", "kuro"), W("しろ", "trắng", "⚪", "shiro"), W("ピンク", "hồng", "🩷", "pinku"), W("オレンジ", "cam", "🟠", "orenji"),
        ],
        sentences: [
          { t: ["これ", "は", "あか", "です"], n: ["Đây", "là", "màu", "đỏ"], r: "kore wa aka desu", blank: "あか", dT: ["あお", "くろ"], dN: ["xanh dương", "đen"] },
          { t: ["これ", "は", "みどり", "です"], n: ["Đây", "là", "màu", "xanh", "lá"], r: "kore wa midori desu", blank: "みどり", dT: ["きいろ", "しろ"], dN: ["vàng", "trắng"] },
          { t: ["これ", "は", "ピンク", "です"], n: ["Đây", "là", "màu", "hồng"], r: "kore wa pinku desu", blank: "ピンク", dT: ["オレンジ", "あか"], dN: ["cam", "đỏ"] },
          { t: ["これ", "は", "しろ", "です"], n: ["Đây", "là", "màu", "trắng"], r: "kore wa shiro desu", blank: "しろ", dT: ["くろ", "あお"], dN: ["đen", "xanh"] },
        ],
      },
      {
        title: "Thức ăn",
        description: "Các món ăn ngon bằng tiếng Nhật.",
        guidebook:
          "Đói bụng rồi! 🍽️\n\n- パン (pan) = bánh mì, たまご (tamago) = trứng, ぎゅうにゅう (gyuunyuu) = sữa, おかし (okashi) = bánh kẹo\n- アイス (aisu) = kem, バナナ (banana) = chuối, みかん (mikan) = quýt, すいか (suika) = dưa hấu\n\n**Mẫu câu**\nこれ は パン です。= Đây là bánh mì.",
        words: [
          W("パン", "bánh mì", "🍞", "pan"), W("たまご", "trứng", "🥚", "tamago"), W("ぎゅうにゅう", "sữa", "🥛", "gyuunyuu"), W("おかし", "bánh kẹo", "🍬", "okashi"),
          W("アイス", "kem", "🍦", "aisu"), W("バナナ", "chuối", "🍌", "banana"), W("みかん", "quýt", "🍊", "mikan"), W("すいか", "dưa hấu", "🍉", "suika"),
        ],
        sentences: [
          { t: ["これ", "は", "パン", "です"], n: ["Đây", "là", "bánh", "mì"], r: "kore wa pan desu", blank: "パン", dT: ["たまご", "みず"], dN: ["trứng", "nước"] },
          { t: ["これ", "は", "すいか", "です"], n: ["Đây", "là", "dưa", "hấu"], r: "kore wa suika desu", blank: "すいか", dT: ["みかん", "ほん"], dN: ["quýt", "sách"] },
          { t: ["これ", "は", "アイス", "です"], n: ["Đây", "là", "kem"], r: "kore wa aisu desu", blank: "アイス", dT: ["バナナ", "ねこ"], dN: ["chuối", "mèo"] },
          { t: ["これ", "は", "ぎゅうにゅう", "です"], n: ["Đây", "là", "sữa"], r: "kore wa gyuunyuu desu", blank: "ぎゅうにゅう", dT: ["おかし", "いぬ"], dN: ["kẹo", "chó"] },
        ],
      },
      {
        title: "Trường học",
        description: "Đồ dùng học tập bằng tiếng Nhật.",
        guidebook:
          "Đến trường thôi! 🏫\n\n- えんぴつ (enpitsu) = bút chì, ノート (nooto) = vở, ペン (pen) = bút, かばん (kaban) = cặp sách\n- せんせい (sensei) = giáo viên, がっこう (gakkou) = trường học, とけい (tokei) = đồng hồ, けしゴム (keshigomu) = cục tẩy\n\n**Mẫu câu**\nこれ は えんぴつ です。= Đây là bút chì.",
        words: [
          W("えんぴつ", "bút chì", "✏️", "enpitsu"), W("ノート", "vở", "📓", "nooto"), W("ペン", "bút", "🖊️", "pen"), W("かばん", "cặp sách", "🎒", "kaban"),
          W("せんせい", "giáo viên", "🧑‍🏫", "sensei"), W("がっこう", "trường học", "🏫", "gakkou"), W("とけい", "đồng hồ", "⏰", "tokei"), W("けしゴム", "cục tẩy", "🧽", "keshigomu"),
        ],
        sentences: [
          { t: ["これ", "は", "えんぴつ", "です"], n: ["Đây", "là", "bút", "chì"], r: "kore wa enpitsu desu", blank: "えんぴつ", dT: ["ペン", "ほん"], dN: ["bút", "sách"] },
          { t: ["これ", "は", "ノート", "です"], n: ["Đây", "là", "quyển", "vở"], r: "kore wa nooto desu", blank: "ノート", dT: ["かばん", "みず"], dN: ["cặp", "nước"] },
          { t: ["これ", "は", "がっこう", "です"], n: ["Đây", "là", "trường", "học"], r: "kore wa gakkou desu", blank: "がっこう", dT: ["いえ", "くるま"], dN: ["nhà", "xe"] },
          { t: ["これ", "は", "とけい", "です"], n: ["Đây", "là", "đồng", "hồ"], r: "kore wa tokei desu", blank: "とけい", dT: ["けしゴム", "ねこ"], dN: ["tẩy", "mèo"] },
        ],
      },
      {
        title: "Cơ thể",
        description: "Học tên các bộ phận trên cơ thể bằng tiếng Nhật.",
        guidebook:
          "Cơ thể của em 🧑\n\n- あたま (atama) = đầu, め (me) = mắt, はな (hana) = mũi, くち (kuchi) = miệng\n- みみ (mimi) = tai, て (te) = tay, あし (ashi) = chân, かみ (kami) = tóc\n\n**Mẫu câu**\nこれ は わたし の て です。= Đây là tay của tôi.",
        words: [
          W("あたま", "đầu", "🧑", "atama"), W("め", "mắt", "👁️", "me"), W("はな", "mũi", "👃", "hana"), W("くち", "miệng", "👄", "kuchi"),
          W("みみ", "tai", "👂", "mimi"), W("て", "tay", "✋", "te"), W("あし", "chân", "🦵", "ashi"), W("かみ", "tóc", "💇", "kami"),
        ],
        sentences: [
          { t: ["これ", "は", "わたし", "の", "あたま", "です"], n: ["Đây", "là", "đầu", "của", "tôi"], r: "kore wa watashi no atama desu", blank: "あたま", dT: ["め", "みず"], dN: ["mắt", "nước"] },
          { t: ["これ", "は", "わたし", "の", "て", "です"], n: ["Đây", "là", "tay", "của", "tôi"], r: "kore wa watashi no te desu", blank: "て", dT: ["あし", "ほん"], dN: ["chân", "sách"] },
          { t: ["これ", "は", "わたし", "の", "みみ", "です"], n: ["Đây", "là", "tai", "của", "tôi"], r: "kore wa watashi no mimi desu", blank: "みみ", dT: ["くち", "ねこ"], dN: ["miệng", "mèo"] },
        ],
      },
      {
        title: "Quần áo",
        description: "Gọi tên quần áo bằng tiếng Nhật.",
        guidebook:
          "Mặc đẹp nào! 👕\n\n- シャツ (shatsu) = áo sơ mi, ズボン (zubon) = quần dài, ドレス (doresu) = váy, ぼうし (boushi) = mũ\n- くつ (kutsu) = giày, くつした (kutsushita) = tất, コート (kooto) = áo khoác, マフラー (mafuraa) = khăn quàng\n\n**Mẫu câu**\nこれ は シャツ です。= Đây là áo sơ mi.",
        words: [
          W("シャツ", "áo sơ mi", "👕", "shatsu"), W("ズボン", "quần dài", "👖", "zubon"), W("ドレス", "váy", "👗", "doresu"), W("ぼうし", "mũ", "🧢", "boushi"),
          W("くつ", "giày", "👟", "kutsu"), W("くつした", "tất", "🧦", "kutsushita"), W("コート", "áo khoác", "🧥", "kooto"), W("マフラー", "khăn quàng", "🧣", "mafuraa"),
        ],
        sentences: [
          { t: ["これ", "は", "シャツ", "です"], n: ["Đây", "là", "áo", "sơ", "mi"], r: "kore wa shatsu desu", blank: "シャツ", dT: ["ズボン", "みず"], dN: ["quần", "nước"] },
          { t: ["これ", "は", "ぼうし", "です"], n: ["Đây", "là", "cái", "mũ"], r: "kore wa boushi desu", blank: "ぼうし", dT: ["くつ", "ほん"], dN: ["giày", "sách"] },
          { t: ["これ", "は", "コート", "です"], n: ["Đây", "là", "áo", "khoác"], r: "kore wa kooto desu", blank: "コート", dT: ["ドレス", "ねこ"], dN: ["váy", "mèo"] },
        ],
      },
      {
        title: "Giao thông",
        description: "Các phương tiện đi lại bằng tiếng Nhật.",
        guidebook:
          "Đi lại an toàn! 🚗\n\n- しんかんせん (shinkansen) = tàu siêu tốc, バス (basu) = xe buýt, じてんしゃ (jitensha) = xe đạp, でんしゃ (densha) = tàu điện\n- ひこうき (hikouki) = máy bay, ふね (fune) = thuyền, バイク (baiku) = xe máy, トラック (torakku) = xe tải\n\n**Mẫu câu**\nこれ は でんしゃ です。= Đây là tàu điện.",
        words: [
          W("しんかんせん", "tàu siêu tốc", "🚅", "shinkansen"), W("バス", "xe buýt", "🚌", "basu"), W("じてんしゃ", "xe đạp", "🚲", "jitensha"), W("でんしゃ", "tàu điện", "🚆", "densha"),
          W("ひこうき", "máy bay", "✈️", "hikouki"), W("ふね", "thuyền", "🚢", "fune"), W("バイク", "xe máy", "🏍️", "baiku"), W("トラック", "xe tải", "🚚", "torakku"),
        ],
        sentences: [
          { t: ["これ", "は", "でんしゃ", "です"], n: ["Đây", "là", "tàu", "điện"], r: "kore wa densha desu", blank: "でんしゃ", dT: ["バス", "みず"], dN: ["xe buýt", "nước"] },
          { t: ["これ", "は", "ひこうき", "です"], n: ["Đây", "là", "máy", "bay"], r: "kore wa hikouki desu", blank: "ひこうき", dT: ["ふね", "ほん"], dN: ["thuyền", "sách"] },
          { t: ["これ", "は", "しんかんせん", "です"], n: ["Đây", "là", "tàu", "siêu", "tốc"], r: "kore wa shinkansen desu", blank: "しんかんせん", dT: ["トラック", "ねこ"], dN: ["xe tải", "mèo"] },
        ],
      },
      {
        title: "Thời tiết",
        description: "Nói về thời tiết bằng tiếng Nhật.",
        guidebook:
          "Thời tiết hôm nay ☀️\n\n- たいよう (taiyou) = mặt trời, あめ (ame) = mưa, くも (kumo) = mây, ゆき (yuki) = tuyết\n- かぜ (kaze) = gió, あつい (atsui) = nóng, さむい (samui) = lạnh, にじ (niji) = cầu vồng\n\n**Mẫu câu**\nきょう は あつい です。= Hôm nay trời nóng.",
        words: [
          W("たいよう", "mặt trời", "☀️", "taiyou"), W("あめ", "mưa", "🌧️", "ame"), W("くも", "mây", "☁️", "kumo"), W("ゆき", "tuyết", "❄️", "yuki"),
          W("かぜ", "gió", "💨", "kaze"), W("あつい", "nóng", "🥵", "atsui"), W("さむい", "lạnh", "🥶", "samui"), W("にじ", "cầu vồng", "🌈", "niji"),
        ],
        sentences: [
          { t: ["これ", "は", "たいよう", "です"], n: ["Đây", "là", "mặt", "trời"], r: "kore wa taiyou desu", blank: "たいよう", dT: ["くも", "みず"], dN: ["mây", "nước"] },
          { t: ["これ", "は", "にじ", "です"], n: ["Đây", "là", "cầu", "vồng"], r: "kore wa niji desu", blank: "にじ", dT: ["ゆき", "ほん"], dN: ["tuyết", "sách"] },
          { t: ["きょう", "は", "あつい", "です"], n: ["Hôm", "nay", "trời", "nóng"], r: "kyou wa atsui desu", blank: "あつい", dT: ["さむい", "かぜ"], dN: ["lạnh", "gió"] },
        ],
      },
      {
        title: "Kanji cơ bản 1",
        band: "thcs",
        description: "Tám chữ Kanji đầu tiên về thiên nhiên và con người.",
        guidebook:
          "Chữ Hán đầu tiên! 🎌\n\n**Kanji quanh em**\n- 日 (nichi / hi) = ngày, mặt trời; 本 (hon / moto) = sách, gốc\n- 人 (hito / jin) = người; 山 (yama / san) = núi; 川 (kawa / sen) = sông\n- 田 (ta / den) = ruộng; 大 (ookii / dai) = to, lớn; 小 (chiisai / shou) = nhỏ\n\n**Mẫu câu**\nこれ は 山 です。= Đây là núi.\nChữ は ở đây đọc là *wa* đấy!",
        words: [
          W("日", "ngày, mặt trời", "☀️", "nichi / hi"), W("本", "sách, gốc", "📖", "hon / moto"), W("人", "người", "🧑", "hito / jin"), W("大", "to, lớn", "🐘", "ookii / dai"),
          W("小", "nhỏ", "🐜", "chiisai / shou"), W("山", "núi", "⛰️", "yama / san"), W("川", "sông", "🏞️", "kawa / sen"), W("田", "ruộng", "🌾", "ta / den"),
        ],
        sentences: [
          { t: ["これ", "は", "山", "です"], n: ["Đây", "là", "núi"], r: "kore wa yama desu", blank: "山", dT: ["川", "田"], dN: ["sông", "ruộng"] },
          { t: ["これ", "は", "川", "です"], n: ["Đây", "là", "sông"], r: "kore wa kawa desu", blank: "川", dT: ["山", "日"], dN: ["núi", "ngày"] },
          { t: ["あの", "人", "は", "せんせい", "です"], n: ["Người", "kia", "là", "giáo", "viên"], r: "ano hito wa sensei desu", blank: "人", dT: ["山", "本"], dN: ["núi", "sách"] },
        ],
      },
      {
        title: "Kanji cơ bản 2",
        band: "thcs",
        description: "Tám chữ Kanji nữa: trăng, lửa, nước, cây, vàng, đất, mưa và học.",
        guidebook:
          "Thêm tám chữ Kanji quen thuộc! 🌙\n\n**Kanji quanh em**\n- 月 (tsuki / getsu) = mặt trăng, tháng; 火 (hi / ka) = lửa; 水 (mizu / sui) = nước\n- 木 (ki / moku) = cây, gỗ; 金 (kane / kin) = vàng, tiền; 土 (tsuchi / do) = đất\n- 雨 (ame / u) = mưa; 学 (manabu / gaku) = học\n\n**Mẹo nhỏ**\nTên các thứ trong tuần cũng dùng các chữ này đấy: 月曜日 (thứ Hai), 火曜日 (thứ Ba), 水曜日 (thứ Tư)!\n\n**Mẫu câu**\n月 が きれい です。= Mặt trăng đẹp.",
        words: [
          W("月", "mặt trăng, tháng", "🌙", "tsuki / getsu"), W("火", "lửa", "🔥", "hi / ka"), W("水", "nước", "💧", "mizu / sui"), W("木", "cây, gỗ", "🌳", "ki / moku"),
          W("金", "vàng, tiền", "💰", "kane / kin"), W("土", "đất", "🟫", "tsuchi / do"), W("雨", "mưa", "🌧️", "ame / u"), W("学", "học", "🎒", "manabu / gaku"),
        ],
        sentences: [
          { t: ["これ", "は", "木", "です"], n: ["Đây", "là", "cây"], r: "kore wa ki desu", blank: "木", dT: ["水", "火"], dN: ["nước", "lửa"] },
          { t: ["きょう", "は", "雨", "です"], n: ["Hôm", "nay", "trời", "mưa"], r: "kyou wa ame desu", blank: "雨", dT: ["月", "土"], dN: ["trăng", "đất"] },
          { t: ["月", "が", "きれい", "です"], n: ["Mặt", "trăng", "đẹp"], r: "tsuki ga kirei desu", blank: "月", dT: ["火", "金"], dN: ["lửa", "tiền"] },
        ],
      },
      {
        title: "Thể te — nối câu và nhờ vả",
        band: "thcs",
        description: "Dùng thể te để nối hai việc liền nhau và nhờ vả thật lịch sự.",
        guidebook:
          "Thể て (te) kỳ diệu! ✨\n\n- Thể te giúp nối hai việc: 食べて 行きます = ăn rồi đi.\n- Thêm ください (kudasai) sau thể te để nhờ vả lịch sự: 読んで ください = hãy đọc giúp em.\n\n**Các động từ thể te**\n- 食べて (tabete) ăn, 飲んで (nonde) uống, 見て (mite) xem, 聞いて (kiite) nghe\n- 読んで (yonde) đọc, 書いて (kaite) viết, 行って (itte) đi, 来て (kite) đến\n\n**Mẫu câu**\nみず を 飲んで ください。= Hãy uống nước.",
        words: [
          W("食べて", "ăn thể te", "🍽️", "tabete"), W("飲んで", "uống thể te", "🥤", "nonde"), W("見て", "xem thể te", "👀", "mite"), W("聞いて", "nghe thể te", "👂", "kiite"),
          W("読んで", "đọc thể te", "📖", "yonde"), W("書いて", "viết thể te", "✍️", "kaite"), W("行って", "đi thể te", "🚶", "itte"), W("来て", "đến thể te", "🙋", "kite"),
        ],
        sentences: [
          { t: ["ごはん", "を", "食べて", "がっこう", "へ", "行きます"], n: ["Ăn", "cơm", "xong", "tôi", "đi", "đến", "trường"], r: "gohan wo tabete gakkou e ikimasu", blank: "食べて", dT: ["飲んで", "見て"], dN: ["uống", "xem"] },
          { t: ["みず", "を", "飲んで", "ください"], n: ["Hãy", "uống", "nước"], r: "mizu wo nonde kudasai", blank: "飲んで", dT: ["食べて", "聞いて"], dN: ["ăn", "nghe"] },
          { t: ["テレビ", "を", "見て", "から", "ねます"], n: ["Xem", "ti-vi", "xong", "rồi", "đi", "ngủ"], r: "terebi wo mite kara nemasu", blank: "見て", dT: ["聞いて", "読んで"], dN: ["nghe", "đọc"] },
          { t: ["ほん", "を", "読んで", "ください"], n: ["Hãy", "đọc", "sách"], r: "hon wo yonde kudasai", blank: "読んで", dT: ["書いて", "見て"], dN: ["viết", "xem"] },
          { t: ["せんせい", "の", "はなし", "を", "聞いて", "ください"], n: ["Hãy", "nghe", "câu", "chuyện", "của", "giáo", "viên"], r: "sensei no hanashi wo kiite kudasai", blank: "聞いて", dT: ["読んで", "食べて"], dN: ["đọc", "ăn"] },
          { t: ["ここ", "へ", "来て", "ください"], n: ["Hãy", "đến", "đây"], r: "koko e kite kudasai", blank: "来て", dT: ["行って", "見て"], dN: ["đi", "xem"] },
        ],
      },
      {
        title: "Thể ta — quá khứ và kinh nghiệm",
        band: "thcs",
        description: "Dùng thể ta để kể việc đã qua và nói về điều em từng làm.",
        guidebook:
          "Thể た (ta) kể chuyện hôm qua! 🕰️\n\n- Thể ta là dạng thân mật của quá khứ: 見た (mita) = đã xem.\n- Mẫu ～た こと が あります nói về kinh nghiệm: 食べた こと が あります = tôi đã từng ăn.\n\n**Các động từ thể ta**\n- 食べた (tabeta) đã ăn, 飲んだ (nonda) đã uống, 見た (mita) đã xem, 聞いた (kiita) đã nghe\n- 読んだ (yonda) đã đọc, 書いた (kaita) đã viết, 行った (itta) đã đi, 会った (atta) đã gặp\n\n**Mẫu câu**\nきのう えいが を 見た。= Hôm qua tôi đã xem phim.",
        words: [
          W("食べた", "đã ăn", "🍽️", "tabeta"), W("飲んだ", "đã uống", "🥤", "nonda"), W("見た", "đã xem", "👀", "mita"), W("聞いた", "đã nghe", "👂", "kiita"),
          W("読んだ", "đã đọc", "📖", "yonda"), W("書いた", "đã viết", "✍️", "kaita"), W("行った", "đã đi", "🚶", "itta"), W("会った", "đã gặp", "🤝", "atta"),
        ],
        sentences: [
          { t: ["きのう", "えいが", "を", "見た"], n: ["Hôm", "qua", "tôi", "đã", "xem", "phim"], r: "kinou eiga wo mita", blank: "見た", dT: ["食べた", "聞いた"], dN: ["ăn", "nghe"] },
          { t: ["すし", "を", "食べた", "こと", "が", "あります"], n: ["Tôi", "đã", "từng", "ăn", "sushi"], r: "sushi wo tabeta koto ga arimasu", blank: "食べた", dT: ["飲んだ", "見た"], dN: ["uống", "xem"] },
          { t: ["ともだち", "に", "会った"], n: ["Tôi", "đã", "gặp", "bạn"], r: "tomodachi ni atta", blank: "会った", dT: ["行った", "読んだ"], dN: ["đi", "đọc"] },
          { t: ["この", "ほん", "を", "読んだ"], n: ["Tôi", "đã", "đọc", "quyển", "sách", "này"], r: "kono hon wo yonda", blank: "読んだ", dT: ["書いた", "見た"], dN: ["viết", "xem"] },
          { t: ["コーヒー", "を", "飲んだ"], n: ["Tôi", "đã", "uống", "cà", "phê"], r: "koohii wo nonda", blank: "飲んだ", dT: ["食べた", "聞いた"], dN: ["ăn", "nghe"] },
          { t: ["うた", "を", "聞いた"], n: ["Tôi", "đã", "nghe", "bài", "hát"], r: "uta wo kiita", blank: "聞いた", dT: ["見た", "読んだ"], dN: ["xem", "đọc"] },
        ],
      },
      {
        title: "Thể ý định và mong muốn",
        band: "thcs",
        description: "Nói điều em muốn làm và rủ bạn cùng làm một việc.",
        guidebook:
          "Em muốn làm gì nào? 🌟\n\n- Thêm たい (tai) sau gốc động từ để nói điều muốn làm: 食べたい = muốn ăn.\n- ましょう (mashou) để rủ rê: 行きましょう = chúng ta hãy đi nào!\n- よう (you) là thể ý định thân mật: 食べよう = ăn thôi nào!\n\n**Từ mới**\n- 食べたい (tabetai) muốn ăn, 行きたい (ikitai) muốn đi, 見たい (mitai) muốn xem, 買いたい (kaitai) muốn mua\n- 話したい (hanashitai) muốn nói chuyện, 会いたい (aitai) muốn gặp\n\n**Mẫu câu**\nわたし は すし を 食べたい です。= Tôi muốn ăn sushi.",
        words: [
          W("食べたい", "muốn ăn", "🍣", "tabetai"), W("行きたい", "muốn đi", "✈️", "ikitai"), W("見たい", "muốn xem", "👀", "mitai"), W("買いたい", "muốn mua", "🛍️", "kaitai"),
          W("話したい", "muốn nói chuyện", "💬", "hanashitai"), W("会いたい", "muốn gặp", "🤗", "aitai"), W("行きましょう", "chúng ta hãy đi", "🚶", "ikimashou"), W("食べよう", "ăn thôi nào", "🍽️", "tabeyou"),
        ],
        sentences: [
          { t: ["わたし", "は", "すし", "を", "食べたい", "です"], n: ["Tôi", "muốn", "ăn", "sushi"], r: "watashi wa sushi wo tabetai desu", blank: "食べたい", dT: ["行きたい", "見たい"], dN: ["đi", "xem"] },
          { t: ["にほん", "へ", "行きたい", "です"], n: ["Tôi", "muốn", "đi", "Nhật", "Bản"], r: "nihon e ikitai desu", blank: "行きたい", dT: ["食べたい", "買いたい"], dN: ["ăn", "mua"] },
          { t: ["えいが", "を", "見たい", "です"], n: ["Tôi", "muốn", "xem", "phim"], r: "eiga wo mitai desu", blank: "見たい", dT: ["会いたい", "話したい"], dN: ["gặp", "nói"] },
          { t: ["あたらしい", "くつ", "を", "買いたい", "です"], n: ["Tôi", "muốn", "mua", "đôi", "giày", "mới"], r: "atarashii kutsu wo kaitai desu", blank: "買いたい", dT: ["食べたい", "行きたい"], dN: ["ăn", "đi"] },
          { t: ["ともだち", "に", "会いたい", "です"], n: ["Tôi", "muốn", "gặp", "bạn"], r: "tomodachi ni aitai desu", blank: "会いたい", dT: ["見たい", "買いたい"], dN: ["xem", "mua"] },
          { t: ["いっしょに", "がっこう", "へ", "行きましょう"], n: ["Chúng", "ta", "hãy", "cùng", "đi", "đến", "trường"], r: "issho ni gakkou e ikimashou", blank: "行きましょう", dT: ["食べよう", "食べたい"], dN: ["ăn", "xem"] },
        ],
      },
      {
        title: "Câu điều kiện và mẫu câu N4",
        band: "thcs",
        description: "Các mẫu câu điều kiện, dự đoán và mục đích ở trình độ N4.",
        guidebook:
          "Mẫu câu nâng cao N4! 🎓\n\n- たら (tara) = nếu ~ thì; なら (nara) = nếu là ~\n- ても (temo) = dù ~ cũng; かも しれません (kamo shiremasen) = có lẽ\n- はず (hazu) = chắc chắn là; ように (youni) = để ~\n- ために (tameni) = để/vì ~; すぎる (sugiru) = quá ~\n\n**Mẫu câu**\nあめ が ふっ たら うち に います。= Nếu trời mưa thì tôi ở nhà.",
        words: [
          W("たら", "nếu ~ thì", "🌦️", "tara"), W("なら", "nếu là ~", "💬", "nara"), W("ても", "dù ~ cũng", "💪", "temo"), W("かも", "có lẽ", "🤔", "kamo"),
          W("はず", "chắc chắn là", "✅", "hazu"), W("ように", "để ~", "🎯", "youni"), W("ために", "để/vì ~", "🎁", "tameni"), W("すぎる", "quá ~", "🔥", "sugiru"),
        ],
        sentences: [
          { t: ["あめ", "が", "ふっ", "たら", "うち", "に", "います"], n: ["Nếu", "trời", "mưa", "thì", "tôi", "ở", "nhà"], r: "ame ga futtara uchi ni imasu", blank: "たら", dT: ["なら", "ても"], dN: ["nếu", "dù"] },
          { t: ["にほん", "へ", "行く", "なら", "ひこうき", "が", "はやい", "です"], n: ["Nếu", "đi", "Nhật", "Bản", "thì", "máy", "bay", "nhanh"], r: "nihon e iku nara hikouki ga hayai desu", blank: "なら", dT: ["たら", "かも"], dN: ["mưa", "chậm"] },
          { t: ["たかく", "ても", "買いたい", "です"], n: ["Dù", "đắt", "tôi", "cũng", "muốn", "mua"], r: "takakutemo kaitai desu", blank: "ても", dT: ["たら", "はず"], dN: ["nếu", "chắc"] },
          { t: ["あした", "は", "あめ", "かも", "しれません"], n: ["Ngày", "mai", "có", "lẽ", "trời", "mưa"], r: "ashita wa ame kamo shiremasen", blank: "かも", dT: ["なら", "ように"], dN: ["nếu", "để"] },
          { t: ["かれ", "は", "来る", "はず", "です"], n: ["Anh", "ấy", "chắc", "chắn", "sẽ", "đến"], r: "kare wa kuru hazu desu", blank: "はず", dT: ["かも", "ても"], dN: ["lẽ", "dù"] },
          { t: ["およげる", "ように", "れんしゅう", "します"], n: ["Tôi", "luyện", "tập", "để", "biết", "bơi"], r: "oyogeru youni renshuu shimasu", blank: "ように", dT: ["ために", "すぎる"], dN: ["vì", "quá"] },
        ],
      },
      {
        title: "Kanji N3 cơ bản 1",
        band: "thpt",
        description: "Tám chữ Kanji N3 quen thuộc về thời gian, công ty và gia đình.",
        guidebook:
          "Kanji trình độ N3! 🎌\n\n**Kanji quanh em**\n- 会 (au / kai) = gặp, hội; 社 (sha) = công ty\n- 年 (toshi / nen) = năm; 時 (toki / ji) = giờ, lúc\n- 今 (ima / kon) = bây giờ; 明 (akarui / mei) = sáng, ngày mai\n- 友 (tomo / yuu) = bạn; 母 (haha / bo) = mẹ\n\n**Ghép chữ quen thuộc**\n会社 (kaisha) = công ty; 友だち (tomodachi) = bạn bè; 明日 (ashita) = ngày mai.\n\n**Mẫu câu**\n今 は 三時 です。= Bây giờ là ba giờ.",
        words: [
          W("会", "gặp, hội", "🤝", "au / kai"), W("社", "công ty", "🏢", "sha"), W("年", "năm", "📅", "toshi / nen"), W("時", "giờ, lúc", "🕐", "toki / ji"),
          W("今", "bây giờ", "⏰", "ima / kon"), W("明", "sáng, ngày mai", "🌅", "akarui / mei"), W("友", "bạn", "🧑‍🤝‍🧑", "tomo / yuu"), W("母", "mẹ", "👩", "haha / bo"),
        ],
        sentences: [
          { t: ["今", "は", "三時", "です"], n: ["Bây", "giờ", "là", "ba", "giờ"], r: "ima wa sanji desu", blank: "今", dT: ["時", "年"], dN: ["giờ", "năm"] },
          { t: ["あの", "人", "は", "母", "です"], n: ["Người", "kia", "là", "mẹ"], r: "ano hito wa haha desu", blank: "母", dT: ["友", "社"], dN: ["bạn", "công ty"] },
          { t: ["友", "は", "やさしい", "です"], n: ["Bạn", "tôi", "rất", "hiền"], r: "tomo wa yasashii desu", blank: "友", dT: ["母", "会"], dN: ["mẹ", "hội"] },
        ],
      },
      {
        title: "Kanji N3 cơ bản 2",
        band: "thpt",
        description: "Tám chữ Kanji N3 nữa: trường học, điện, xe, nhà ga và ngôn ngữ.",
        guidebook:
          "Thêm tám chữ Kanji N3! 🚉\n\n**Kanji quanh em**\n- 先 (saki / sen) = trước, đầu; 生 (ikiru / sei) = sinh, sống\n- 校 (kou) = trường; 電 (den) = điện; 車 (kuruma / sha) = xe\n- 駅 (eki) = nhà ga; 語 (go) = ngôn ngữ; 間 (aida / kan) = khoảng, giữa\n\n**Ghép chữ quen thuộc**\n学校 (gakkou) = trường học; 電車 (densha) = tàu điện; 日本語 (nihongo) = tiếng Nhật.\n\n**Mẫu câu**\n駅 は 近い です。= Nhà ga ở gần đây.",
        words: [
          W("先", "trước, đầu", "👉", "saki / sen"), W("生", "sinh, sống", "🌱", "ikiru / sei"), W("校", "trường", "🏫", "kou"), W("電", "điện", "⚡", "den"),
          W("車", "xe", "🚗", "kuruma / sha"), W("駅", "nhà ga", "🚉", "eki"), W("語", "ngôn ngữ", "🗣️", "go"), W("間", "khoảng, giữa", "↔️", "aida / kan"),
        ],
        sentences: [
          { t: ["駅", "は", "近い", "です"], n: ["Nhà", "ga", "ở", "gần"], r: "eki wa chikai desu", blank: "駅", dT: ["車", "校"], dN: ["xe", "trường"] },
          { t: ["この", "車", "は", "新しい", "です"], n: ["Chiếc", "xe", "này", "mới"], r: "kono kuruma wa atarashii desu", blank: "車", dT: ["駅", "間"], dN: ["ga", "khoảng"] },
          { t: ["わたし", "は", "先", "に", "帰ります"], n: ["Tôi", "về", "trước"], r: "watashi wa saki ni kaerimasu", blank: "先", dT: ["間", "語"], dN: ["khoảng", "ngôn ngữ"] },
        ],
      },
      {
        title: "Thể bị động",
        band: "thpt",
        description: "Học thể bị động: được ai làm gì cho mình, hoặc bị ai làm gì.",
        guidebook:
          "Thể bị động (ukemi) 🎌\n\n- Thể bị động nói ai đó *được* hoặc *bị* làm gì đó.\n- Người thực hiện hành động đi với trợ từ に: せんせい に ほめられた = được thầy khen.\n\n**Các động từ bị động**\n- 食べられた (taberareta) bị ăn; 見られた (mirareta) bị xem; 聞かれた (kikareta) bị hỏi\n- 書かれた (kakareta) được viết; 読まれた (yomareta) được đọc; 叱られた (shikarareta) bị mắng\n- 褒められた (homerareta) được khen; 呼ばれた (yobareta) được gọi\n\n**Mẫu câu**\nわたし は せんせい に ほめられた。= Tôi được thầy khen.",
        words: [
          W("食べられた", "bị ăn, được ăn", "🍽️", "taberareta"), W("見られた", "bị xem, được xem", "👀", "mirareta"), W("聞かれた", "bị hỏi, được nghe", "👂", "kikareta"), W("書かれた", "được viết", "✍️", "kakareta"),
          W("読まれた", "được đọc", "📖", "yomareta"), W("叱られた", "bị mắng", "😠", "shikarareta"), W("褒められた", "được khen", "🌟", "homerareta"), W("呼ばれた", "được gọi", "📣", "yobareta"),
        ],
        sentences: [
          { t: ["わたし", "は", "せんせい", "に", "褒められた"], n: ["Tôi", "được", "thầy", "khen"], r: "watashi wa sensei ni homerareta", blank: "褒められた", dT: ["叱られた", "呼ばれた"], dN: ["bị mắng", "được gọi"] },
          { t: ["わたし", "の", "ケーキ", "は", "犬", "に", "食べられた"], n: ["Bánh", "của", "tôi", "bị", "chó", "ăn"], r: "watashi no keeki wa inu ni taberareta", blank: "食べられた", dT: ["読まれた", "見られた"], dN: ["được đọc", "bị xem"] },
          { t: ["わたし", "は", "雨", "に", "ふられた"], n: ["Tôi", "bị", "mưa", "làm", "ướt"], r: "watashi wa ame ni furareta", blank: "ふられた", dT: ["ほめられた", "しかれた"], dN: ["được khen", "bị mắng"] },
          { t: ["この", "ほん", "は", "おおく", "の", "人", "に", "読まれた"], n: ["Quyển", "sách", "này", "được", "nhiều", "người", "đọc"], r: "kono hon wa ooku no hito ni yomareta", blank: "読まれた", dT: ["書かれた", "見られた"], dN: ["được viết", "bị xem"] },
          { t: ["わたし", "は", "母", "に", "叱られた"], n: ["Tôi", "bị", "mẹ", "mắng"], r: "watashi wa haha ni shikarareta", blank: "叱られた", dT: ["褒められた", "呼ばれた"], dN: ["được khen", "được gọi"] },
          { t: ["わたし", "の", "日記", "は", "友だち", "に", "見られた"], n: ["Nhật", "ký", "của", "tôi", "bị", "bạn", "xem"], r: "watashi no nikki wa tomodachi ni mirareta", blank: "見られた", dT: ["聞かれた", "食べられた"], dN: ["bị hỏi", "bị ăn"] },
        ],
      },
      {
        title: "Thể sai khiến và kính ngữ cơ bản",
        band: "thpt",
        description: "Thể sai khiến cùng kính ngữ và khiêm nhường ngữ khi nói với người trên.",
        guidebook:
          "Sai khiến và kính ngữ 🎩\n\n- Thể sai khiến させる (saseru) = bắt hoặc cho phép ai làm gì.\n- Kính ngữ dùng khi nói về việc của người trên: おっしゃる (nói), なさる (làm).\n- Khiêm nhường ngữ dùng khi nói về việc của mình: いただく (nhận), まいる (đi, đến).\n\n**Từ mới**\n- 行かせる (ikaseru) cho đi; 食べさせる (tabesaseru) cho ăn; 読ませる (yomaseru) cho đọc\n\n**Mẫu câu**\n社長 は 何 と おっしゃいました か。= Giám đốc đã nói gì vậy?",
        words: [
          W("させる", "bắt/cho làm (sai khiến)", "👉", "saseru"), W("行かせる", "bắt đi, cho đi", "🚶", "ikaseru"), W("食べさせる", "cho ăn, bắt ăn", "🥄", "tabesaseru"), W("読ませる", "cho đọc, bắt đọc", "📖", "yomaseru"),
          W("おっしゃる", "nói (tôn kính)", "🎩", "ossharu"), W("なさる", "làm (tôn kính)", "🎩", "nasaru"), W("いただく", "nhận (khiêm nhường)", "🙏", "itadaku"), W("まいる", "đi/đến (khiêm nhường)", "🚶", "mairu"),
        ],
        sentences: [
          { t: ["母", "は", "子ども", "に", "野菜", "を", "食べさせる"], n: ["Mẹ", "cho", "em", "bé", "ăn", "rau"], r: "haha wa kodomo ni yasai wo tabesaseru", blank: "食べさせる", dT: ["読ませる", "行かせる"], dN: ["cho đọc", "cho đi"] },
          { t: ["母", "は", "弟", "を", "店", "へ", "行かせる"], n: ["Mẹ", "bảo", "em", "trai", "đi", "cửa", "hàng"], r: "haha wa otouto wo mise e ikaseru", blank: "行かせる", dT: ["食べさせる", "させる"], dN: ["cho ăn", "bắt làm"] },
          { t: ["せんせい", "は", "学生", "に", "本", "を", "読ませる"], n: ["Thầy", "cho", "học", "sinh", "đọc", "sách"], r: "sensei wa gakusei ni hon wo yomaseru", blank: "読ませる", dT: ["行かせる", "食べさせる"], dN: ["cho đi", "cho ăn"] },
          { t: ["社長", "は", "何", "と", "おっしゃいました", "か"], n: ["Giám", "đốc", "đã", "nói", "gì", "vậy"], r: "shachou wa nan to osshaimashita ka", blank: "おっしゃいました", dT: ["なさいました", "いただきました"], dN: ["đã làm (tôn kính)", "đã nhận (khiêm nhường)"] },
          { t: ["わたし", "は", "せんせい", "から", "本", "を", "いただきました"], n: ["Tôi", "đã", "nhận", "sách", "từ", "thầy"], r: "watashi wa sensei kara hon wo itadakimashita", blank: "いただきました", dT: ["まいりました", "おっしゃいました"], dN: ["đã đến (khiêm nhường)", "đã nói (tôn kính)"] },
          { t: ["わたし", "は", "明日", "学校", "へ", "まいります"], n: ["Ngày", "mai", "tôi", "sẽ", "đến", "trường"], r: "watashi wa ashita gakkou e mairimasu", blank: "まいります", dT: ["いただきます", "なさいます"], dN: ["nhận (khiêm nhường)", "làm (tôn kính)"] },
        ],
      },
      {
        title: "Mẫu câu N3 thường gặp",
        band: "thpt",
        description: "Tám mẫu câu N3 hay gặp trong hội thoại và bài đọc.",
        guidebook:
          "Mẫu câu N3 thường gặp 🎓\n\n- ばかり (bakari) = chỉ, toàn là; ところ (tokoro) = vừa mới, sắp\n- わけ (wake) = lý do, nghĩa là; はずがない (hazu ga nai) = không thể nào\n- くらい (kurai) = khoảng, đến mức; ば (ba) = nếu ~\n- ずに (zuni) = mà không; のに (noni) = mặc dù\n\n**Mẫu câu**\n食べた ばかり です。= Tôi vừa mới ăn xong.",
        words: [
          W("ばかり", "chỉ, toàn là", "🎯", "bakari"), W("ところ", "vừa mới, sắp", "⏳", "tokoro"), W("わけ", "lý do, nghĩa là", "💡", "wake"), W("はずがない", "không thể nào", "🚫", "hazu ga nai"),
          W("くらい", "khoảng, đến mức", "📏", "kurai"), W("ば", "nếu (điều kiện)", "🌦️", "ba"), W("ずに", "mà không", "🙅", "zuni"), W("のに", "mặc dù", "😮", "noni"),
        ],
        sentences: [
          { t: ["わたし", "は", "食べた", "ばかり", "です"], n: ["Tôi", "vừa", "mới", "ăn", "xong"], r: "watashi wa tabeta bakari desu", blank: "ばかり", dT: ["ところ", "わけ"], dN: ["vừa mới", "lý do"] },
          { t: ["今", "から", "出かける", "ところ", "です"], n: ["Tôi", "sắp", "ra", "ngoài", "bây", "giờ"], r: "ima kara dekakeru tokoro desu", blank: "ところ", dT: ["ばかり", "くらい"], dN: ["chỉ", "khoảng"] },
          { t: ["かれ", "が", "知らない", "はずがない"], n: ["Không", "thể", "nào", "anh", "ấy", "không", "biết"], r: "kare ga shiranai hazuganai", blank: "はずがない", dT: ["はず", "ばかり"], dN: ["chắc chắn", "chỉ"] },
          { t: ["早く", "行け", "ば", "間に合います"], n: ["Nếu", "đi", "sớm", "thì", "sẽ", "kịp"], r: "hayaku ikeba maniaimasu", blank: "ば", dT: ["ずに", "のに"], dN: ["mà không", "mặc dù"] },
          { t: ["朝ごはん", "を", "食べ", "ずに", "学校", "へ", "行った"], n: ["Tôi", "đi", "học", "mà", "không", "ăn", "sáng"], r: "asagohan wo tabezuni gakkou e itta", blank: "ずに", dT: ["のに", "ばかり"], dN: ["mặc dù", "chỉ"] },
          { t: ["約束", "した", "のに", "かれ", "は", "来なかった"], n: ["Mặc", "dù", "đã", "hứa", "anh", "ấy", "vẫn", "không", "đến"], r: "yakusoku shita noni kare wa konakatta", blank: "のに", dT: ["ずに", "わけ"], dN: ["mà không", "lý do"] },
        ],
      },
      {
        title: "Hội thoại và đọc hiểu N3",
        band: "thpt",
        description: "Từ vựng và câu hội thoại tình huống ở trường học, nhà ga và chuyến du lịch.",
        guidebook:
          "Hội thoại tình huống N3 🗣️\n\n**Từ vựng tình huống**\n- 予約 (yoyaku) đặt trước; 切符 (kippu) vé; 案内 (annai) hướng dẫn\n- 遅れる (okureru) bị muộn; 忘れ物 (wasuremono) đồ bỏ quên; 窓口 (madoguchi) quầy\n- 助ける (tasukeru) giúp đỡ; 困る (komaru) gặp khó khăn\n\n**Mẫu câu**\nすみません、切符 は どこ で 買えます か。= Xin lỗi, vé mua ở đâu được ạ?",
        words: [
          W("予約", "đặt trước", "📅", "yoyaku"), W("切符", "vé", "🎫", "kippu"), W("案内", "hướng dẫn", "🪧", "annai"), W("遅れる", "bị muộn, trễ", "⏰", "okureru"),
          W("忘れ物", "đồ bỏ quên", "🎒", "wasuremono"), W("窓口", "quầy, cửa sổ giao dịch", "🪟", "madoguchi"), W("助ける", "giúp đỡ", "🤝", "tasukeru"), W("困る", "gặp khó khăn", "😣", "komaru"),
        ],
        sentences: [
          { t: ["すみません", "切符", "は", "どこ", "で", "買えます", "か"], n: ["Xin", "lỗi", "vé", "mua", "ở", "đâu", "được", "ạ"], r: "sumimasen kippu wa doko de kaemasu ka", blank: "切符", dT: ["予約", "窓口"], dN: ["đặt trước", "quầy"] },
          { t: ["来週", "の", "ホテル", "を", "予約", "したい", "です"], n: ["Tôi", "muốn", "đặt", "khách", "sạn", "cho", "tuần", "tới"], r: "raishuu no hoteru wo yoyaku shitai desu", blank: "予約", dT: ["案内", "切符"], dN: ["hướng dẫn", "vé"] },
          { t: ["わたし", "は", "バス", "が", "遅れて", "学校", "に", "遅れました"], n: ["Xe", "buýt", "đến", "trễ", "nên", "tôi", "bị", "muộn", "học"], r: "watashi wa basu ga okurete gakkou ni okuremashita", blank: "遅れました", dT: ["困りました", "助けました"], dN: ["gặp khó khăn", "đã giúp"] },
          { t: ["すみません", "忘れ物", "は", "窓口", "に", "届いて", "います", "か"], n: ["Xin", "lỗi", "đồ", "bỏ", "quên", "có", "ở", "quầy", "không", "ạ"], r: "sumimasen wasuremono wa madoguchi ni todoite imasu ka", blank: "窓口", dT: ["案内", "予約"], dN: ["hướng dẫn", "đặt trước"] },
          { t: ["困って", "いる", "人", "を", "助ける", "こと", "が", "大切", "です"], n: ["Giúp", "đỡ", "người", "đang", "gặp", "khó", "khăn", "là", "điều", "quan", "trọng"], r: "komatte iru hito wo tasukeru koto ga taisetsu desu", blank: "助ける", dT: ["困る", "遅れる"], dN: ["gặp khó khăn", "bị muộn"] },
          { t: ["初めて", "の", "町", "で", "道", "に", "迷って", "困りました"], n: ["Ở", "thị", "trấn", "lạ", "tôi", "bị", "lạc", "đường", "và", "rất", "lo"], r: "hajimete no machi de michi ni mayotte komarimashita", blank: "困りました", dT: ["遅れました", "忘れました"], dN: ["bị muộn", "đã quên"] },
        ],
      },
    ],
  },
  {
    id: "zh-vi",
    targetLanguage: "Tiếng Trung",
    targetCode: "zh",
    flag: "🇨🇳",
    sectionTitle: "Phần 1: Chữ Hán đầu tiên",
    joiner: " ",
    units: [
      {
        title: "Con số",
        description: "Đếm từ 一 đến 八 bằng chữ Hán và pinyin.",
        guidebook:
          "Chữ Hán và pinyin 🇨🇳\n\n**Pinyin** là cách đọc chữ Hán bằng chữ cái. Dấu trên chữ cho biết **thanh điệu** (giọng lên xuống).\n\n**Các số**\n- 一 (yī) = 1, 二 (èr) = 2, 三 (sān) = 3, 四 (sì) = 4\n- 五 (wǔ) = 5, 六 (liù) = 6, 七 (qī) = 7, 八 (bā) = 8\n\nĐếm to: yī, èr, sān!",
        words: [
          W("一", "một", "1️⃣", "yī"), W("二", "hai", "2️⃣", "èr"), W("三", "ba", "3️⃣", "sān"), W("四", "bốn", "4️⃣", "sì"),
          W("五", "năm", "5️⃣", "wǔ"), W("六", "sáu", "6️⃣", "liù"), W("七", "bảy", "7️⃣", "qī"), W("八", "tám", "8️⃣", "bā"),
        ],
      },
      {
        title: "Chào hỏi",
        description: "Những câu nói lịch sự đầu tiên.",
        guidebook:
          "Xin chào, 你好! 👋\n\n- 你好 (nǐ hǎo) = xin chào\n- 谢谢 (xièxie) = cảm ơn\n- 再见 (zàijiàn) = tạm biệt\n- 对不起 (duìbuqǐ) = xin lỗi\n- 没关系 (méi guānxi) = không sao đâu\n- 请 (qǐng) = xin mời / làm ơn\n- 是 (shì) = là, 不 (bù) = không",
        words: [
          W("你好", "xin chào", "👋", "nǐ hǎo"), W("谢谢", "cảm ơn", "🙏", "xièxie"), W("再见", "tạm biệt", "🚪", "zàijiàn"),
          W("对不起", "xin lỗi", "😔", "duìbuqǐ"), W("没关系", "không sao đâu", "😊", "méi guānxi"), W("请", "xin mời", "🤲", "qǐng"),
          W("是", "là", "✅", "shì"), W("不", "không", "❌", "bù"),
        ],
        sentences: [
          { t: ["谢谢", "你"], n: ["Cảm", "ơn", "bạn"], r: "xièxie nǐ", blank: "谢谢", dT: ["请", "不"], dN: ["xin", "lỗi"] },
          { t: ["再见", "朋友"], n: ["Tạm", "biệt", "bạn"], r: "zàijiàn péngyou", blank: "再见", dT: ["谢谢", "好"], dN: ["cảm", "ơn"] },
        ],
      },
      {
        title: "Gia đình",
        description: "Gọi tên người thân trong gia đình.",
        guidebook:
          "Gia đình em 👨‍👩‍👧‍👦\n\n- 爸爸 (bàba) = bố, 妈妈 (māma) = mẹ\n- 哥哥 (gēge) = anh trai, 姐姐 (jiějie) = chị gái\n- 弟弟 (dìdi) = em trai, 妹妹 (mèimei) = em gái\n- 爷爷 (yéye) = ông nội, 奶奶 (nǎinai) = bà nội\n\n**Mẫu câu**\n这 是 我 ～ = Đây là ～ của tôi.",
        words: [
          W("爸爸", "bố", "👨", "bàba"), W("妈妈", "mẹ", "👩", "māma"), W("哥哥", "anh trai", "👦", "gēge"), W("姐姐", "chị gái", "👧", "jiějie"),
          W("弟弟", "em trai", "🧒", "dìdi"), W("妹妹", "em gái", "👶", "mèimei"), W("爷爷", "ông nội", "👴", "yéye"), W("奶奶", "bà nội", "👵", "nǎinai"),
        ],
        sentences: [
          { t: ["这", "是", "我", "爸爸"], n: ["Đây", "là", "bố", "của", "tôi"], r: "zhè shì wǒ bàba", blank: "爸爸", dT: ["妈妈", "不"], dN: ["mẹ", "không"] },
          { t: ["我", "爱", "妈妈"], n: ["Tôi", "yêu", "mẹ"], r: "wǒ ài māma", blank: "妈妈", dT: ["喜欢", "狗"], dN: ["thích", "bố"] },
          { t: ["这", "是", "我", "哥哥"], n: ["Đây", "là", "anh", "trai", "của", "tôi"], r: "zhè shì wǒ gēge", blank: "哥哥", dT: ["姐姐", "你"], dN: ["chị", "bạn"] },
        ],
      },
      {
        title: "Con vật",
        description: "Gọi tên các con vật dễ thương.",
        guidebook:
          "Vườn thú nhỏ 🐼\n\n- 猫 (māo) = mèo, 狗 (gǒu) = chó, 鸟 (niǎo) = chim, 鱼 (yú) = cá\n- 马 (mǎ) = ngựa, 牛 (niú) = bò, 兔子 (tùzi) = thỏ, 熊猫 (xióngmāo) = gấu trúc\n\n**Mẹo nhỏ**\n一 只 ～ = một con ～ (只 là từ đếm con vật).",
        words: [
          W("猫", "mèo", "🐱", "māo"), W("狗", "chó", "🐶", "gǒu"), W("鸟", "chim", "🐦", "niǎo"), W("鱼", "cá", "🐟", "yú"),
          W("马", "ngựa", "🐴", "mǎ"), W("牛", "bò", "🐮", "niú"), W("兔子", "thỏ", "🐰", "tùzi"), W("熊猫", "gấu trúc", "🐼", "xióngmāo"),
        ],
        sentences: [
          { t: ["我", "喜欢", "猫"], n: ["Tôi", "thích", "mèo"], r: "wǒ xǐhuan māo", blank: "猫", dT: ["狗", "不"], dN: ["chó", "không"] },
          { t: ["这", "是", "一", "只", "狗"], n: ["Đây", "là", "một", "con", "chó"], r: "zhè shì yì zhī gǒu", blank: "狗", dT: ["猫", "我"], dN: ["mèo", "tôi"] },
          { t: ["我", "有", "一", "只", "鸟"], n: ["Tôi", "có", "một", "con", "chim"], r: "wǒ yǒu yì zhī niǎo", blank: "鸟", dT: ["鱼", "是"], dN: ["cá", "là"] },
        ],
      },
      {
        title: "Màu sắc",
        description: "Màu sắc và những thứ trên bầu trời.",
        guidebook:
          "Thế giới rực rỡ 🌈\n\n- 红色 (hóngsè) = đỏ, 蓝色 (lánsè) = xanh dương, 绿色 (lǜsè) = xanh lá, 黄色 (huángsè) = vàng\n- 黑色 (hēisè) = đen, 白色 (báisè) = trắng\n- 太阳 (tàiyáng) = mặt trời, 月亮 (yuèliang) = mặt trăng\n\n**Mẫu câu**\n～ 是 红色 = ～ màu đỏ.",
        words: [
          W("红色", "đỏ", "🔴", "hóngsè"), W("蓝色", "xanh dương", "🔵", "lánsè"), W("绿色", "xanh lá", "🟢", "lǜsè"), W("黄色", "vàng", "🟡", "huángsè"),
          W("黑色", "đen", "⚫", "hēisè"), W("白色", "trắng", "⚪", "báisè"), W("太阳", "mặt trời", "☀️", "tàiyáng"), W("月亮", "mặt trăng", "🌙", "yuèliang"),
        ],
        sentences: [
          { t: ["太阳", "是", "黄色"], n: ["Mặt", "trời", "màu", "vàng"], r: "tàiyáng shì huángsè", blank: "黄色", dT: ["红色", "不"], dN: ["đỏ", "không"] },
          { t: ["月亮", "是", "白色"], n: ["Mặt", "trăng", "màu", "trắng"], r: "yuèliang shì báisè", blank: "白色", dT: ["黑色", "我"], dN: ["đen", "tôi"] },
          { t: ["天", "是", "蓝色"], n: ["Bầu", "trời", "màu", "xanh", "dương"], r: "tiān shì lánsè", blank: "蓝色", dT: ["绿色", "狗"], dN: ["đỏ", "chó"] },
        ],
      },
      {
        title: "Gia đình 2",
        description: "Thêm người thân: ông bà ngoại, chú, dì và các con.",
        guidebook:
          "Gia đình lớn của em 👨‍👩‍👧‍👦\n\n- 外公 (wàigōng) = ông ngoại, 外婆 (wàipó) = bà ngoại\n- 叔叔 (shūshu) = chú, 阿姨 (āyí) = dì\n- 儿子 (érzi) = con trai, 女儿 (nǚ'ér) = con gái\n- 孩子 (háizi) = trẻ em, 家人 (jiārén) = người nhà\n\n**Mẫu câu**\n这 是 我 ～ = Đây là ～ của tôi.",
        words: [
          W("外公", "ông ngoại", "👨‍🦳", "wàigōng"), W("外婆", "bà ngoại", "👩‍🦳", "wàipó"), W("叔叔", "chú", "👨", "shūshu"), W("阿姨", "dì", "👩", "āyí"),
          W("儿子", "con trai", "👦", "érzi"), W("女儿", "con gái", "👧", "nǚ'ér"), W("孩子", "trẻ em", "🧒", "háizi"), W("家人", "gia đình", "🏠", "jiārén"),
        ],
        sentences: [
          { t: ["这", "是", "我", "外公"], n: ["Đây", "là", "ông", "ngoại", "của", "tôi"], r: "zhè shì wǒ wàigōng", blank: "外公", dT: ["外婆", "不"], dN: ["bà ngoại", "không"] },
          { t: ["我", "爱", "我", "的", "家人"], n: ["Tôi", "yêu", "gia", "đình", "của", "tôi"], r: "wǒ ài wǒ de jiārén", blank: "家人", dT: ["孩子", "狗"], dN: ["trẻ em", "chó"] },
          { t: ["这", "是", "我", "阿姨"], n: ["Đây", "là", "dì", "của", "tôi"], r: "zhè shì wǒ āyí", blank: "阿姨", dT: ["叔叔", "你"], dN: ["chú", "bạn"] },
          { t: ["叔叔", "有", "一", "个", "孩子"], n: ["Chú", "có", "một", "đứa", "trẻ"], r: "shūshu yǒu yí gè háizi", blank: "孩子", dT: ["儿子", "是"], dN: ["con trai", "là"] },
        ],
      },
      {
        title: "Số đếm 2",
        description: "Đếm tiếp: 九 đến 二十.",
        guidebook:
          "Đếm cao hơn nữa! 🔢\n\n- 九 (jiǔ) = 9, 十 (shí) = 10\n- 十一 (shíyī) = 11, 十二 (shí'èr) = 12, 十三 (shísān) = 13\n- 十四 (shísì) = 14, 十五 (shíwǔ) = 15, 二十 (èrshí) = 20\n\n**Mẹo nhỏ**\nSố từ 11 đến 19 là 十 + số đơn vị: 十一 = mười một.",
        words: [
          W("九", "chín", "9️⃣", "jiǔ"), W("十", "mười", "🔟", "shí"), W("十一", "mười một", "⑪", "shíyī"), W("十二", "mười hai", "⑫", "shí'èr"),
          W("十三", "mười ba", "⑬", "shísān"), W("十四", "mười bốn", "⑭", "shísì"), W("十五", "mười lăm", "⑮", "shíwǔ"), W("二十", "hai mươi", "⑳", "èrshí"),
        ],
        sentences: [
          { t: ["我", "有", "九", "本", "书"], n: ["Tôi", "có", "chín", "quyển", "sách"], r: "wǒ yǒu jiǔ běn shū", blank: "九", dT: ["十", "是"], dN: ["mười", "là"] },
          { t: ["这", "是", "十", "只", "猫"], n: ["Đây", "là", "mười", "con", "mèo"], r: "zhè shì shí zhī māo", blank: "十", dT: ["九", "我"], dN: ["chín", "tôi"] },
          { t: ["我", "十一", "岁"], n: ["Tôi", "mười", "một", "tuổi"], r: "wǒ shíyī suì", blank: "十一", dT: ["十二", "八"], dN: ["mười hai", "tám"] },
          { t: ["他", "有", "二十", "本", "书"], n: ["Anh", "ấy", "có", "hai", "mươi", "quyển", "sách"], r: "tā yǒu èrshí běn shū", blank: "二十", dT: ["十五", "不"], dN: ["mười lăm", "không"] },
        ],
      },
      {
        title: "Màu sắc 2",
        description: "Thêm màu đẹp: hồng, tím, cam và cầu vồng.",
        guidebook:
          "Thêm màu mới! 🎨\n\n- 粉色 (fěnsè) = hồng, 棕色 (zōngsè) = nâu, 灰色 (huīsè) = xám, 紫色 (zǐsè) = tím\n- 橙色 (chéngsè) = cam, 金色 (jīnsè) = vàng kim, 银色 (yínsè) = bạc, 彩虹 (cǎihóng) = cầu vồng\n\n**Mẫu câu**\n这 是 粉色 = Đây là màu hồng.",
        words: [
          W("粉色", "hồng", "🩷", "fěnsè"), W("棕色", "nâu", "🟤", "zōngsè"), W("灰色", "xám", "🩶", "huīsè"), W("紫色", "tím", "🟣", "zǐsè"),
          W("橙色", "cam", "🟠", "chéngsè"), W("金色", "vàng kim", "🥇", "jīnsè"), W("银色", "bạc", "🥈", "yínsè"), W("彩虹", "cầu vồng", "🌈", "cǎihóng"),
        ],
        sentences: [
          { t: ["这", "是", "粉色"], n: ["Đây", "là", "màu", "hồng"], r: "zhè shì fěnsè", blank: "粉色", dT: ["紫色", "不"], dN: ["tím", "không"] },
          { t: ["我", "喜欢", "紫色"], n: ["Tôi", "thích", "màu", "tím"], r: "wǒ xǐhuan zǐsè", blank: "紫色", dT: ["灰色", "狗"], dN: ["xám", "chó"] },
          { t: ["天上", "有", "彩虹"], n: ["Trên", "trời", "có", "cầu", "vồng"], r: "tiānshàng yǒu cǎihóng", blank: "彩虹", dT: ["月亮", "我"], dN: ["mặt trăng", "tôi"] },
          { t: ["这", "是", "橙色"], n: ["Đây", "là", "màu", "cam"], r: "zhè shì chéngsè", blank: "橙色", dT: ["金色", "是"], dN: ["vàng kim", "là"] },
        ],
      },
      {
        title: "Thức ăn 2",
        description: "Món ngon nữa: mì, súp, kẹo và kem.",
        guidebook:
          "Ăn ngon miệng! 😋\n\n- 面条 (miàntiáo) = mì, 汤 (tāng) = súp, 糖果 (tángguǒ) = kẹo, 饼干 (bǐnggān) = bánh quy\n- 果汁 (guǒzhī) = nước ép, 奶酪 (nǎilào) = phô mai, 冰淇淋 (bīngqílín) = kem, 比萨 (bǐsà) = pizza\n\n**Mẫu câu**\n我 喜欢 吃 ～ = Tôi thích ăn ～.",
        words: [
          W("面条", "mì", "🍜", "miàntiáo"), W("汤", "súp", "🍲", "tāng"), W("糖果", "kẹo", "🍬", "tángguǒ"), W("饼干", "bánh quy", "🍪", "bǐnggān"),
          W("果汁", "nước ép", "🧃", "guǒzhī"), W("奶酪", "phô mai", "🧀", "nǎilào"), W("冰淇淋", "kem", "🍦", "bīngqílín"), W("比萨", "pizza", "🍕", "bǐsà"),
        ],
        sentences: [
          { t: ["我", "喜欢", "吃", "面条"], n: ["Tôi", "thích", "ăn", "mì"], r: "wǒ xǐhuan chī miàntiáo", blank: "面条", dT: ["汤", "不"], dN: ["súp", "không"] },
          { t: ["我", "喝", "果汁"], n: ["Tôi", "uống", "nước", "ép"], r: "wǒ hē guǒzhī", blank: "果汁", dT: ["汤", "猫"], dN: ["súp", "mèo"] },
          { t: ["这", "是", "冰淇淋"], n: ["Đây", "là", "kem"], r: "zhè shì bīngqílín", blank: "冰淇淋", dT: ["糖果", "我"], dN: ["kẹo", "tôi"] },
          { t: ["妹妹", "吃", "糖果"], n: ["Em", "gái", "ăn", "kẹo"], r: "mèimei chī tángguǒ", blank: "糖果", dT: ["饼干", "是"], dN: ["bánh quy", "là"] },
        ],
      },
      {
        title: "Trường học 2",
        description: "Thêm đồ dùng học tập: bút chì, kéo, vở và máy tính.",
        guidebook:
          "Đồ dùng của em ✏️\n\n- 铅笔 (qiānbǐ) = bút chì, 蜡笔 (làbǐ) = bút sáp màu, 剪刀 (jiǎndāo) = kéo, 本子 (běnzi) = vở\n- 纸 (zhǐ) = giấy, 地图 (dìtú) = bản đồ, 地球 (dìqiú) = quả địa cầu, 电脑 (diànnǎo) = máy tính\n\n**Mẫu câu**\n这 是 我 的 ～ = Đây là ～ của tôi.",
        words: [
          W("铅笔", "bút chì", "✏️", "qiānbǐ"), W("蜡笔", "bút sáp màu", "🖍️", "làbǐ"), W("剪刀", "kéo", "✂️", "jiǎndāo"), W("本子", "vở", "📓", "běnzi"),
          W("纸", "giấy", "📄", "zhǐ"), W("地图", "bản đồ", "🗺️", "dìtú"), W("地球", "quả địa cầu", "🌍", "dìqiú"), W("电脑", "máy tính", "💻", "diànnǎo"),
        ],
        sentences: [
          { t: ["这", "是", "我", "的", "铅笔"], n: ["Đây", "là", "bút", "chì", "của", "tôi"], r: "zhè shì wǒ de qiānbǐ", blank: "铅笔", dT: ["蜡笔", "不"], dN: ["sáp màu", "không"] },
          { t: ["我", "有", "一", "本", "本子"], n: ["Tôi", "có", "một", "quyển", "vở"], r: "wǒ yǒu yì běn běnzi", blank: "本子", dT: ["纸", "狗"], dN: ["giấy", "chó"] },
          { t: ["这", "是", "地图"], n: ["Đây", "là", "bản", "đồ"], r: "zhè shì dìtú", blank: "地图", dT: ["地球", "我"], dN: ["địa cầu", "tôi"] },
          { t: ["哥哥", "用", "电脑"], n: ["Anh", "trai", "dùng", "máy", "tính"], r: "gēge yòng diànnǎo", blank: "电脑", dT: ["剪刀", "是"], dN: ["kéo", "là"] },
        ],
      },
      {
        title: "Cơ thể",
        description: "Học tên các bộ phận trên cơ thể bằng tiếng Trung.",
        guidebook:
          "Cơ thể của em 🧑\n\n- 头 (tóu) = đầu, 眼睛 (yǎnjing) = mắt, 鼻子 (bízi) = mũi, 嘴 (zuǐ) = miệng\n- 耳朵 (ěrduo) = tai, 手 (shǒu) = tay, 脚 (jiǎo) = chân, 头发 (tóufa) = tóc\n\n**Mẫu câu**\n这 是 我 的 手。= Đây là tay của tôi.",
        words: [
          W("头", "đầu", "🧑", "tóu"), W("眼睛", "mắt", "👁️", "yǎnjing"), W("鼻子", "mũi", "👃", "bízi"), W("嘴", "miệng", "👄", "zuǐ"),
          W("耳朵", "tai", "👂", "ěrduo"), W("手", "tay", "✋", "shǒu"), W("脚", "chân", "🦶", "jiǎo"), W("头发", "tóc", "💇", "tóufa"),
        ],
        sentences: [
          { t: ["这", "是", "我", "的", "头"], n: ["Đây", "là", "đầu", "của", "tôi"], r: "zhè shì wǒ de tóu", blank: "头", dT: ["手", "不"], dN: ["tay", "không"] },
          { t: ["这", "是", "我", "的", "手"], n: ["Đây", "là", "tay", "của", "tôi"], r: "zhè shì wǒ de shǒu", blank: "手", dT: ["脚", "狗"], dN: ["chân", "chó"] },
          { t: ["这", "是", "我", "的", "鼻子"], n: ["Đây", "là", "mũi", "của", "tôi"], r: "zhè shì wǒ de bízi", blank: "鼻子", dT: ["嘴", "你"], dN: ["miệng", "bạn"] },
        ],
      },
      {
        title: "Quần áo",
        description: "Gọi tên quần áo bằng tiếng Trung.",
        guidebook:
          "Mặc đẹp nào! 👕\n\n- 衬衫 (chènshān) = áo sơ mi, 裤子 (kùzi) = quần dài, 连衣裙 (liányīqún) = váy liền, 帽子 (màozi) = mũ\n- 鞋子 (xiézi) = giày, 袜子 (wàzi) = tất, 外套 (wàitào) = áo khoác, 围巾 (wéijīn) = khăn quàng\n\n**Mẫu câu**\n这 是 我 的 帽子。= Đây là mũ của tôi.",
        words: [
          W("衬衫", "áo sơ mi", "👕", "chènshān"), W("裤子", "quần dài", "👖", "kùzi"), W("连衣裙", "váy liền", "👗", "liányīqún"), W("帽子", "mũ", "🧢", "màozi"),
          W("鞋子", "giày", "👟", "xiézi"), W("袜子", "tất", "🧦", "wàzi"), W("外套", "áo khoác", "🧥", "wàitào"), W("围巾", "khăn quàng", "🧣", "wéijīn"),
        ],
        sentences: [
          { t: ["这", "是", "我", "的", "衬衫"], n: ["Đây", "là", "áo", "sơ", "mi", "của", "tôi"], r: "zhè shì wǒ de chènshān", blank: "衬衫", dT: ["裤子", "不"], dN: ["quần", "không"] },
          { t: ["这", "是", "我", "的", "帽子"], n: ["Đây", "là", "mũ", "của", "tôi"], r: "zhè shì wǒ de màozi", blank: "帽子", dT: ["鞋子", "狗"], dN: ["giày", "chó"] },
          { t: ["妹妹", "穿", "连衣裙"], n: ["Em", "gái", "mặc", "váy", "liền"], r: "mèimei chuān liányīqún", blank: "连衣裙", dT: ["外套", "是"], dN: ["áo khoác", "là"] },
        ],
      },
      {
        title: "Giao thông",
        description: "Các phương tiện đi lại bằng tiếng Trung.",
        guidebook:
          "Đi lại an toàn! 🚗\n\n- 汽车 (qìchē) = ô tô, 公共汽车 (gōnggòng qìchē) = xe buýt, 自行车 (zìxíngchē) = xe đạp, 火车 (huǒchē) = tàu hỏa\n- 飞机 (fēijī) = máy bay, 船 (chuán) = thuyền, 摩托车 (mótuōchē) = xe máy, 卡车 (kǎchē) = xe tải\n\n**Mẫu câu**\n这 是 汽车。= Đây là ô tô.",
        words: [
          W("汽车", "ô tô", "🚗", "qìchē"), W("公共汽车", "xe buýt", "🚌", "gōnggòng qìchē"), W("自行车", "xe đạp", "🚲", "zìxíngchē"), W("火车", "tàu hỏa", "🚆", "huǒchē"),
          W("飞机", "máy bay", "✈️", "fēijī"), W("船", "thuyền", "🚢", "chuán"), W("摩托车", "xe máy", "🏍️", "mótuōchē"), W("卡车", "xe tải", "🚚", "kǎchē"),
        ],
        sentences: [
          { t: ["这", "是", "汽车"], n: ["Đây", "là", "ô", "tô"], r: "zhè shì qìchē", blank: "汽车", dT: ["火车", "不"], dN: ["tàu hỏa", "không"] },
          { t: ["我", "坐", "公共汽车"], n: ["Tôi", "đi", "xe", "buýt"], r: "wǒ zuò gōnggòng qìchē", blank: "公共汽车", dT: ["飞机", "狗"], dN: ["máy bay", "chó"] },
          { t: ["哥哥", "骑", "自行车"], n: ["Anh", "trai", "đi", "xe", "đạp"], r: "gēge qí zìxíngchē", blank: "自行车", dT: ["摩托车", "是"], dN: ["xe máy", "là"] },
        ],
      },
      {
        title: "Thời tiết",
        description: "Nói về thời tiết bằng tiếng Trung.",
        guidebook:
          "Thời tiết hôm nay ☀️\n\n- 晴天 (qíngtiān) = trời nắng, 雨 (yǔ) = mưa, 云 (yún) = mây, 雪 (xuě) = tuyết\n- 风 (fēng) = gió, 热 (rè) = nóng, 冷 (lěng) = lạnh, 闪电 (shǎndiàn) = tia chớp\n\n**Mẫu câu**\n今天 很 冷。= Hôm nay trời rất lạnh.",
        words: [
          W("晴天", "trời nắng", "☀️", "qíngtiān"), W("雨", "mưa", "🌧️", "yǔ"), W("云", "mây", "☁️", "yún"), W("雪", "tuyết", "❄️", "xuě"),
          W("风", "gió", "💨", "fēng"), W("热", "nóng", "🥵", "rè"), W("冷", "lạnh", "🥶", "lěng"), W("闪电", "tia chớp", "⚡", "shǎndiàn"),
        ],
        sentences: [
          { t: ["今天", "是", "晴天"], n: ["Hôm", "nay", "trời", "nắng"], r: "jīntiān shì qíngtiān", blank: "晴天", dT: ["雪", "不"], dN: ["tuyết", "không"] },
          { t: ["今天", "很", "冷"], n: ["Hôm", "nay", "trời", "rất", "lạnh"], r: "jīntiān hěn lěng", blank: "冷", dT: ["热", "我"], dN: ["nóng", "tôi"] },
          { t: ["天上", "有", "云"], n: ["Trên", "trời", "có", "mây"], r: "tiānshàng yǒu yún", blank: "云", dT: ["风", "是"], dN: ["gió", "là"] },
        ],
      },
      {
        title: "Mua sắm và giá cả",
        band: "thcs",
        description: "Đi mua sắm: hỏi giá, nói đắt rẻ và mua bán.",
        guidebook:
          "Đi chợ, đi mua sắm! 🛍️\n\n**Từ mới**\n- 钱 (qián) = tiền, 贵 (guì) = đắt, 便宜 (piányi) = rẻ, 买 (mǎi) = mua\n- 卖 (mài) = bán, 多少钱 (duōshao qián) = bao nhiêu tiền, 商店 (shāngdiàn) = cửa hàng, 衣服 (yīfu) = quần áo\n\n**Mẫu câu**\n这 件 衣服 多少钱？= Chiếc áo này bao nhiêu tiền?\n**Mẹo nhỏ**\n买 (mǎi, mua) và 卖 (mài, bán) chỉ khác nhau dấu thanh, nhớ đọc đúng nhé!",
        words: [
          W("钱", "tiền", "💰", "qián"), W("贵", "đắt", "💸", "guì"), W("便宜", "rẻ", "🏷️", "piányi"), W("买", "mua", "🛍️", "mǎi"),
          W("卖", "bán", "🏪", "mài"), W("多少钱", "bao nhiêu tiền", "❓", "duōshao qián"), W("商店", "cửa hàng", "🏬", "shāngdiàn"), W("衣服", "quần áo", "👕", "yīfu"),
        ],
        sentences: [
          { t: ["这", "件", "衣服", "多少钱"], n: ["Chiếc", "áo", "này", "bao", "nhiêu", "tiền"], r: "zhè jiàn yīfu duōshao qián", blank: "多少钱", dT: ["贵", "商店"], dN: ["đắt", "cửa hàng"] },
          { t: ["这", "件", "衣服", "很", "贵"], n: ["Chiếc", "áo", "này", "rất", "đắt"], r: "zhè jiàn yīfu hěn guì", blank: "贵", dT: ["便宜", "钱"], dN: ["rẻ", "tiền"] },
          { t: ["我", "想", "买", "一", "件", "衣服"], n: ["Tôi", "muốn", "mua", "một", "chiếc", "áo"], r: "wǒ xiǎng mǎi yí jiàn yīfu", blank: "买", dT: ["卖", "衣服"], dN: ["bán", "tiền"] },
        ],
      },
      {
        title: "Du lịch và hỏi đường",
        band: "thcs",
        description: "Đi du lịch và hỏi đường đến bến xe.",
        guidebook:
          "Xách ba lô lên và đi! 🧳\n\n**Từ mới**\n- 旅游 (lǚyóu) = du lịch, 酒店 (jiǔdiàn) = khách sạn, 怎么走 (zěnme zǒu) = đi thế nào, 左 (zuǒ) = trái\n- 右 (yòu) = phải, 远 (yuǎn) = xa, 近 (jìn) = gần, 车站 (chēzhàn) = bến xe, nhà ga\n\n**Mẫu câu**\n请问，车站 怎么走？= Xin hỏi, bến xe đi thế nào?\n**Mẹo nhỏ**\n离 (lí) nghĩa là *cách*: 车站 离 这儿 很 远。= Bến xe cách đây rất xa.",
        words: [
          W("旅游", "du lịch", "🧳", "lǚyóu"), W("酒店", "khách sạn", "🏨", "jiǔdiàn"), W("怎么走", "đi thế nào", "🧭", "zěnme zǒu"), W("左", "trái", "⬅️", "zuǒ"),
          W("右", "phải", "➡️", "yòu"), W("远", "xa", "🔭", "yuǎn"), W("近", "gần", "📍", "jìn"), W("车站", "bến xe, nhà ga", "🚉", "chēzhàn"),
        ],
        sentences: [
          { t: ["请问", "车站", "怎么走"], n: ["Xin", "hỏi", "bến", "xe", "đi", "thế", "nào"], r: "qǐngwèn chēzhàn zěnme zǒu", blank: "怎么走", dT: ["旅游", "车站"], dN: ["du lịch", "gần"] },
          { t: ["我", "喜欢", "旅游"], n: ["Tôi", "thích", "du", "lịch"], r: "wǒ xǐhuan lǚyóu", blank: "旅游", dT: ["酒店", "近"], dN: ["khách sạn", "xa"] },
          { t: ["车站", "离", "这儿", "很", "远"], n: ["Bến", "xe", "cách", "đây", "rất", "xa"], r: "chēzhàn lí zhèr hěn yuǎn", blank: "远", dT: ["近", "左"], dN: ["gần", "trái"] },
        ],
      },
      {
        title: "Sức khỏe và đi khám bệnh",
        band: "thcs",
        description: "Nói về sức khỏe và khi bị ốm phải đi khám.",
        guidebook:
          "Giữ gìn sức khỏe nhé! 🏥\n\n**Từ mới**\n- 身体 (shēntǐ) = cơ thể, sức khỏe, 生病 (shēngbìng) = bị ốm, 医院 (yīyuàn) = bệnh viện, 医生 (yīshēng) = bác sĩ\n- 药 (yào) = thuốc, 头疼 (tóuténg) = đau đầu, 休息 (xiūxi) = nghỉ ngơi, 发烧 (fāshāo) = bị sốt\n\n**Mẫu câu**\n我 生病 了。= Tôi bị ốm rồi.\n**Mẹo nhỏ**\nKhi ốm, bác sĩ hay dặn: 你 要 多 休息。= Bạn cần nghỉ ngơi nhiều.",
        words: [
          W("身体", "cơ thể, sức khỏe", "🧍", "shēntǐ"), W("生病", "bị ốm", "🤒", "shēngbìng"), W("医院", "bệnh viện", "🏥", "yīyuàn"), W("医生", "bác sĩ", "🧑‍⚕️", "yīshēng"),
          W("药", "thuốc", "💊", "yào"), W("头疼", "đau đầu", "🤕", "tóuténg"), W("休息", "nghỉ ngơi", "😴", "xiūxi"), W("发烧", "bị sốt", "🌡️", "fāshāo"),
        ],
        sentences: [
          { t: ["我", "生病", "了"], n: ["Tôi", "bị", "ốm"], r: "wǒ shēngbìng le", blank: "生病", dT: ["发烧", "休息"], dN: ["sốt", "thuốc"] },
          { t: ["他", "去", "医院", "看", "医生"], n: ["Anh", "ấy", "đến", "bệnh", "viện", "khám", "bác", "sĩ"], r: "tā qù yīyuàn kàn yīshēng", blank: "医院", dT: ["身体", "药"], dN: ["sức khỏe", "bác sĩ"] },
          { t: ["你", "要", "多", "休息"], n: ["Bạn", "cần", "nghỉ", "ngơi", "nhiều"], r: "nǐ yào duō xiūxi", blank: "休息", dT: ["生病", "头疼"], dN: ["ốm", "đau đầu"] },
        ],
      },
      {
        title: "Học tập và nghề nghiệp",
        band: "thcs",
        description: "Học tập, kỳ thi và những nghề nghiệp quen thuộc.",
        guidebook:
          "Học chăm, mơ lớn! 📚\n\n**Từ mới**\n- 学习 (xuéxí) = học tập, 工作 (gōngzuò) = công việc, 学生 (xuésheng) = học sinh, 问题 (wèntí) = câu hỏi, vấn đề\n- 回答 (huídá) = trả lời, 考试 (kǎoshì) = kỳ thi, 公司 (gōngsī) = công ty, 经理 (jīnglǐ) = quản lý\n\n**Mẫu câu**\n我 是 一 个 学生。= Tôi là một học sinh.\n**Mẹo nhỏ**\n有 问题 (có câu hỏi) là cụm hay dùng khi em chưa hiểu bài.",
        words: [
          W("学习", "học tập", "📚", "xuéxí"), W("工作", "công việc", "💼", "gōngzuò"), W("学生", "học sinh", "🧑‍🎓", "xuésheng"), W("问题", "câu hỏi, vấn đề", "❓", "wèntí"),
          W("回答", "trả lời", "💬", "huídá"), W("考试", "kỳ thi", "📝", "kǎoshì"), W("公司", "công ty", "🏢", "gōngsī"), W("经理", "quản lý", "🧑‍💼", "jīnglǐ"),
        ],
        sentences: [
          { t: ["我", "是", "一", "个", "学生"], n: ["Tôi", "là", "một", "học", "sinh"], r: "wǒ shì yí gè xuésheng", blank: "学生", dT: ["问题", "公司"], dN: ["câu hỏi", "công việc"] },
          { t: ["老师", "问", "一", "个", "问题"], n: ["Giáo", "viên", "hỏi", "một", "câu", "hỏi"], r: "lǎoshī wèn yí gè wèntí", blank: "问题", dT: ["回答", "考试"], dN: ["trả lời", "kỳ thi"] },
          { t: ["明天", "我们", "有", "考试"], n: ["Ngày", "mai", "chúng", "ta", "có", "kỳ", "thi"], r: "míngtiān wǒmen yǒu kǎoshì", blank: "考试", dT: ["学习", "工作"], dN: ["học tập", "quản lý"] },
        ],
      },
      {
        title: "Thể thao và sở thích",
        band: "thcs",
        description: "Vận động mỗi ngày và nói về sở thích của em.",
        guidebook:
          "Khỏe và vui mỗi ngày! 🏃\n\n**Từ mới**\n- 运动 (yùndòng) = thể thao, vận động, 跑步 (pǎobù) = chạy bộ, 游泳 (yóuyǒng) = bơi lội, 踢足球 (tī zúqiú) = đá bóng\n- 打篮球 (dǎ lánqiú) = chơi bóng rổ, 爱好 (àihào) = sở thích, 唱歌 (chànggē) = hát, 跳舞 (tiàowǔ) = nhảy múa\n\n**Mẫu câu**\n我 的 爱好 是 唱歌。= Sở thích của tôi là hát.\n**Mẹo nhỏ**\n踢 (tī) dùng cho môn chơi bằng chân, 打 (dǎ) dùng cho môn chơi bằng tay.",
        words: [
          W("运动", "thể thao, vận động", "🏃", "yùndòng"), W("跑步", "chạy bộ", "👟", "pǎobù"), W("游泳", "bơi lội", "🏊", "yóuyǒng"), W("踢足球", "đá bóng", "⚽", "tī zúqiú"),
          W("打篮球", "chơi bóng rổ", "🏀", "dǎ lánqiú"), W("爱好", "sở thích", "🎨", "àihào"), W("唱歌", "hát", "🎤", "chànggē"), W("跳舞", "nhảy múa", "💃", "tiàowǔ"),
        ],
        sentences: [
          { t: ["我", "的", "爱好", "是", "唱歌"], n: ["Sở", "thích", "của", "tôi", "là", "hát"], r: "wǒ de àihào shì chànggē", blank: "爱好", dT: ["运动", "跳舞"], dN: ["thể thao", "bơi"] },
          { t: ["他", "每天", "跑步"], n: ["Anh", "ấy", "mỗi", "ngày", "chạy", "bộ"], r: "tā měitiān pǎobù", blank: "跑步", dT: ["游泳", "唱歌"], dN: ["bơi lội", "hát"] },
          { t: ["我们", "一起", "去", "游泳", "吧"], n: ["Chúng", "ta", "cùng", "đi", "bơi", "nhé"], r: "wǒmen yìqǐ qù yóuyǒng ba", blank: "游泳", dT: ["跑步", "踢足球"], dN: ["chạy bộ", "đá bóng"] },
        ],
      },
      {
        title: "Môi trường và bảo vệ thiên nhiên",
        band: "thcs",
        description: "Yêu thiên nhiên và cùng bảo vệ môi trường.",
        guidebook:
          "Yêu Trái Đất xanh! 🌍\n\n**Từ mới**\n- 环境 (huánjìng) = môi trường, 保护 (bǎohù) = bảo vệ, 空气 (kōngqì) = không khí, 污染 (wūrǎn) = ô nhiễm\n- 树 (shù) = cây, 河流 (héliú) = sông, 干净 (gānjìng) = sạch sẽ, 大自然 (dàzìrán) = thiên nhiên\n\n**Mẫu câu**\n我们 要 保护 环境。= Chúng ta cần bảo vệ môi trường.\n**Mẹo nhỏ**\nCâu so sánh dùng 比 (bǐ): 这儿 的 空气 比 城里 干净。= Không khí ở đây sạch hơn trong thành phố.",
        words: [
          W("环境", "môi trường", "🌍", "huánjìng"), W("保护", "bảo vệ", "🛡️", "bǎohù"), W("空气", "không khí", "🌬️", "kōngqì"), W("污染", "ô nhiễm", "🏭", "wūrǎn"),
          W("树", "cây", "🌳", "shù"), W("河流", "sông", "🏞️", "héliú"), W("干净", "sạch sẽ", "✨", "gānjìng"), W("大自然", "thiên nhiên", "🌿", "dàzìrán"),
        ],
        sentences: [
          { t: ["我们", "要", "保护", "环境"], n: ["Chúng", "ta", "cần", "bảo", "vệ", "môi", "trường"], r: "wǒmen yào bǎohù huánjìng", blank: "保护", dT: ["空气", "污染"], dN: ["không khí", "sạch"] },
          { t: ["这儿", "的", "空气", "比", "城里", "干净"], n: ["Không", "khí", "ở", "đây", "sạch", "hơn", "trong", "thành", "phố"], r: "zhèr de kōngqì bǐ chénglǐ gānjìng", blank: "干净", dT: ["环境", "树"], dN: ["môi trường", "ô nhiễm"] },
          { t: ["大自然", "是", "我们", "的", "家"], n: ["Thiên", "nhiên", "là", "mái", "nhà", "của", "chúng", "ta"], r: "dàzìrán shì wǒmen de jiā", blank: "大自然", dT: ["河流", "保护"], dN: ["sông", "bảo vệ"] },
        ],
      },
      {
        title: "Công nghệ và internet",
        band: "thpt",
        description: "Dùng internet, điện thoại và phần mềm trong học tập mỗi ngày.",
        guidebook:
          "Lướt mạng thông minh! 🌐\n\n**Từ mới**\n- 网络 (wǎngluò) = mạng, 网站 (wǎngzhàn) = trang web, 软件 (ruǎnjiàn) = phần mềm, 下载 (xiàzài) = tải xuống\n- 信息 (xìnxī) = thông tin, 方便 (fāngbiàn) = tiện lợi, 手机 (shǒujī) = điện thoại di động, 电子邮件 (diànzǐ yóujiàn) = thư điện tử\n\n**Mẫu câu**\n这个 网站 很 方便。= Trang web này rất tiện lợi.\n**Mẹo nhỏ**\n上网 (shàngwǎng) nghĩa là *lên mạng*: học bài trên mạng nhớ chọn 网站 đáng tin nhé!",
        words: [
          W("网络", "mạng", "🌐", "wǎngluò"), W("网站", "trang web", "💻", "wǎngzhàn"), W("软件", "phần mềm", "🧩", "ruǎnjiàn"), W("下载", "tải xuống", "⬇️", "xiàzài"),
          W("信息", "thông tin", "ℹ️", "xìnxī"), W("方便", "tiện lợi", "✅", "fāngbiàn"), W("手机", "điện thoại di động", "📱", "shǒujī"), W("电子邮件", "thư điện tử", "📧", "diànzǐ yóujiàn"),
        ],
        sentences: [
          { t: ["我", "每天", "用", "手机", "看", "信息"], n: ["Tôi", "mỗi", "ngày", "dùng", "điện", "thoại", "xem", "thông", "tin"], r: "wǒ měitiān yòng shǒujī kàn xìnxī", blank: "手机", dT: ["网站", "软件"], dN: ["trang web", "phần mềm"] },
          { t: ["这个", "网站", "很", "方便"], n: ["Trang", "web", "này", "rất", "tiện", "lợi"], r: "zhège wǎngzhàn hěn fāngbiàn", blank: "方便", dT: ["网络", "下载"], dN: ["mạng", "tải xuống"] },
          { t: ["我", "下载", "了", "一个", "新", "软件"], n: ["Tôi", "đã", "tải", "xuống", "một", "phần", "mềm", "mới"], r: "wǒ xiàzài le yí gè xīn ruǎnjiàn", blank: "下载", dT: ["信息", "电子邮件"], dN: ["thông tin", "thư điện tử"] },
        ],
      },
      {
        title: "Văn hóa và lễ hội",
        band: "thpt",
        description: "Tìm hiểu văn hóa, lễ hội truyền thống và những câu chuyện hay.",
        guidebook:
          "Lễ hội rộn ràng! 🏮\n\n**Từ mới**\n- 文化 (wénhuà) = văn hóa, 节日 (jiérì) = lễ hội, 春节 (Chūnjié) = Tết Nguyên Đán, 传统 (chuántǒng) = truyền thống\n- 礼物 (lǐwù) = quà tặng, 故事 (gùshi) = câu chuyện, 表演 (biǎoyǎn) = biểu diễn, 热闹 (rènào) = náo nhiệt\n\n**Mẫu câu**\n春节 是 我们 重要 的 节日。= Tết Nguyên Đán là lễ hội quan trọng của chúng ta.\n**Mẹo nhỏ**\n春节 là tên riêng nên pinyin viết hoa chữ cái đầu: Chūnjié, giống như tên người vậy!",
        words: [
          W("文化", "văn hóa", "🏮", "wénhuà"), W("节日", "lễ hội", "🎉", "jiérì"), W("春节", "Tết Nguyên Đán", "🧧", "Chūnjié"), W("传统", "truyền thống", "🏯", "chuántǒng"),
          W("礼物", "quà tặng", "🎁", "lǐwù"), W("故事", "câu chuyện", "📖", "gùshi"), W("表演", "biểu diễn", "🎭", "biǎoyǎn"), W("热闹", "náo nhiệt", "🎊", "rènào"),
        ],
        sentences: [
          { t: ["春节", "是", "我们", "重要", "的", "节日"], n: ["Tết", "Nguyên", "Đán", "là", "lễ", "hội", "quan", "trọng", "của", "chúng", "ta"], r: "Chūnjié shì wǒmen zhòngyào de jiérì", blank: "节日", dT: ["文化", "礼物"], dN: ["văn hóa", "quà tặng"] },
          { t: ["大家", "一起", "看", "表演", "很", "热闹"], n: ["Mọi", "người", "cùng", "xem", "biểu", "diễn", "rất", "náo", "nhiệt"], r: "dàjiā yìqǐ kàn biǎoyǎn hěn rènào", blank: "表演", dT: ["故事", "传统"], dN: ["câu chuyện", "truyền thống"] },
          { t: ["奶奶", "给", "我", "讲", "故事"], n: ["Bà", "kể", "cho", "tôi", "nghe", "câu", "chuyện"], r: "nǎinai gěi wǒ jiǎng gùshi", blank: "故事", dT: ["礼物", "文化"], dN: ["quà tặng", "lễ hội"] },
        ],
      },
      {
        title: "Thiên nhiên và bảo vệ môi trường nâng cao",
        band: "thpt",
        description: "Bảo vệ rừng, biển và tài nguyên: tiết kiệm và giảm rác mỗi ngày.",
        guidebook:
          "Chung tay vì hành tinh xanh! 🌍\n\n**Từ mới**\n- 森林 (sēnlín) = rừng, 海洋 (hǎiyáng) = đại dương, 气候 (qìhòu) = khí hậu, 节约 (jiéyuē) = tiết kiệm\n- 垃圾 (lājī) = rác, 减少 (jiǎnshǎo) = giảm thiểu, 资源 (zīyuán) = tài nguyên, 动物 (dòngwù) = động vật\n\n**Mẫu câu**\n我们 要 节约 水 和 资源。= Chúng ta cần tiết kiệm nước và tài nguyên.\n**Mẹo nhỏ**\n节约 (tiết kiệm) khác 保护 (bảo vệ) đã học: một bên là *dùng ít đi*, một bên là *giữ gìn không để hỏng*.",
        words: [
          W("森林", "rừng", "🌲", "sēnlín"), W("海洋", "đại dương", "🌊", "hǎiyáng"), W("气候", "khí hậu", "🌦️", "qìhòu"), W("节约", "tiết kiệm", "💧", "jiéyuē"),
          W("垃圾", "rác", "🗑️", "lājī"), W("减少", "giảm thiểu", "📉", "jiǎnshǎo"), W("资源", "tài nguyên", "💎", "zīyuán"), W("动物", "động vật", "🐾", "dòngwù"),
        ],
        sentences: [
          { t: ["我们", "要", "节约", "水", "和", "资源"], n: ["Chúng", "ta", "cần", "tiết", "kiệm", "nước", "và", "tài", "nguyên"], r: "wǒmen yào jiéyuē shuǐ hé zīyuán", blank: "节约", dT: ["减少", "垃圾"], dN: ["giảm thiểu", "rác"] },
          { t: ["森林", "里", "有", "很多", "动物"], n: ["Trong", "rừng", "có", "rất", "nhiều", "động", "vật"], r: "sēnlín lǐ yǒu hěn duō dòngwù", blank: "森林", dT: ["海洋", "气候"], dN: ["đại dương", "khí hậu"] },
          { t: ["我们", "应该", "减少", "垃圾"], n: ["Chúng", "ta", "nên", "giảm", "thiểu", "rác"], r: "wǒmen yīnggāi jiǎnshǎo lājī", blank: "减少", dT: ["节约", "资源"], dN: ["tiết kiệm", "tài nguyên"] },
        ],
      },
      {
        title: "Học thuật và thi cử",
        band: "thpt",
        description: "Học tập nghiêm túc ở bậc cao hơn: luyện tập, điểm số và thành công.",
        guidebook:
          "Chinh phục tri thức! 🎓\n\n**Từ mới**\n- 大学 (dàxué) = đại học, 毕业 (bìyè) = tốt nghiệp, 成绩 (chéngjì) = thành tích, điểm số, 练习 (liànxí) = luyện tập\n- 认真 (rènzhēn) = nghiêm túc, chăm chỉ, 努力 (nǔlì) = nỗ lực, 成功 (chénggōng) = thành công, 知识 (zhīshi) = kiến thức\n\n**Mẫu câu**\n他 学习 很 认真。= Anh ấy học rất nghiêm túc.\n**Mẹo nhỏ**\n努力 (nǔlì, nỗ lực) là *quá trình cố gắng*, còn 成功 (chénggōng, thành công) là *kết quả* — cố gắng trước, thành công sau!",
        words: [
          W("大学", "đại học", "🎓", "dàxué"), W("毕业", "tốt nghiệp", "🧑‍🎓", "bìyè"), W("成绩", "thành tích, điểm số", "📊", "chéngjì"), W("练习", "luyện tập", "✍️", "liànxí"),
          W("认真", "nghiêm túc, chăm chỉ", "📖", "rènzhēn"), W("努力", "nỗ lực", "💪", "nǔlì"), W("成功", "thành công", "🏆", "chénggōng"), W("知识", "kiến thức", "🧠", "zhīshi"),
        ],
        sentences: [
          { t: ["哥哥", "明年", "从", "大学", "毕业"], n: ["Anh", "trai", "năm", "sau", "sẽ", "tốt", "nghiệp", "đại", "học"], r: "gēge míngnián cóng dàxué bìyè", blank: "大学", dT: ["成绩", "知识"], dN: ["điểm số", "kiến thức"] },
          { t: ["他", "学习", "很", "认真"], n: ["Anh", "ấy", "học", "rất", "nghiêm", "túc"], r: "tā xuéxí hěn rènzhēn", blank: "认真", dT: ["努力", "练习"], dN: ["nỗ lực", "luyện tập"] },
          { t: ["只要", "努力", "练习", "就", "能", "成功"], n: ["Chỉ", "cần", "nỗ", "lực", "luyện", "tập", "là", "có", "thể", "thành", "công"], r: "zhǐyào nǔlì liànxí jiù néng chénggōng", blank: "努力", dT: ["认真", "毕业"], dN: ["nghiêm túc", "tốt nghiệp"] },
        ],
      },
      {
        title: "Xã hội và truyền thông",
        band: "thpt",
        description: "Xem tin tức, chương trình và hiểu đời sống xã hội quanh em.",
        guidebook:
          "Theo dõi tin tức mỗi ngày! 📰\n\n**Từ mới**\n- 社会 (shèhuì) = xã hội, 新闻 (xīnwén) = tin tức, 广告 (guǎnggào) = quảng cáo, 节目 (jiémù) = chương trình\n- 明星 (míngxīng) = ngôi sao, người nổi tiếng, 报纸 (bàozhǐ) = báo giấy, 观众 (guānzhòng) = khán giả, 电视 (diànshì) = ti vi, truyền hình\n\n**Mẫu câu**\n这个 节目 有 很多 观众。= Chương trình này có rất nhiều khán giả.\n**Mẹo nhỏ**\n新闻 (tin tức) là nội dung, 报纸 (báo giấy) và 电视 (ti vi) là nơi em xem hoặc đọc tin — đừng nhầm nhé!",
        words: [
          W("社会", "xã hội", "🏙️", "shèhuì"), W("新闻", "tin tức", "📰", "xīnwén"), W("广告", "quảng cáo", "📢", "guǎnggào"), W("节目", "chương trình", "🎬", "jiémù"),
          W("明星", "ngôi sao, người nổi tiếng", "⭐", "míngxīng"), W("报纸", "báo giấy", "🗞️", "bàozhǐ"), W("观众", "khán giả", "👀", "guānzhòng"), W("电视", "ti vi, truyền hình", "📺", "diànshì"),
        ],
        sentences: [
          { t: ["爸爸", "每天", "看", "电视", "新闻"], n: ["Bố", "mỗi", "ngày", "xem", "tin", "tức", "trên", "truyền", "hình"], r: "bàba měitiān kàn diànshì xīnwén", blank: "新闻", dT: ["广告", "报纸"], dN: ["quảng cáo", "báo giấy"] },
          { t: ["这个", "节目", "有", "很多", "观众"], n: ["Chương", "trình", "này", "có", "rất", "nhiều", "khán", "giả"], r: "zhège jiémù yǒu hěn duō guānzhòng", blank: "观众", dT: ["明星", "社会"], dN: ["ngôi sao", "xã hội"] },
          { t: ["妈妈", "在", "报纸", "上", "看", "广告"], n: ["Mẹ", "đang", "xem", "quảng", "cáo", "trên", "báo", "giấy"], r: "māma zài bàozhǐ shang kàn guǎnggào", blank: "广告", dT: ["新闻", "节目"], dN: ["tin tức", "chương trình"] },
        ],
      },
      {
        title: "Ôn tập tổng hợp HSK",
        band: "thpt",
        description: "Ôn các cấu trúc HSK 4: câu chữ bǎ, câu bị động, so sánh và bổ ngữ kết quả.",
        guidebook:
          "Ôn cấu trúc như cao thủ! 🥋\n\n**Cấu trúc mới**\n- 把 (bǎ) = trợ từ 'đem' trong câu chữ bǎ, 被 (bèi) = bị (câu bị động), 比 (bǐ) = hơn (so sánh), 完 (wán) = xong (bổ ngữ kết quả)\n- 到 (dào) = được, đến (bổ ngữ kết quả), 懂 (dǒng) = hiểu (bổ ngữ kết quả), 越来越 (yuèláiyuè) = càng ngày càng, 离 (lí) = cách (khoảng cách)\n\n**Mẫu câu**\n我 把 作业 做 完 了。= Tôi đã làm xong bài tập.\n**Mẹo nhỏ**\n离 (lí) nói khoảng cách: 学校 离 我 家 很 近。= Trường học cách nhà tôi rất gần. Còn bổ ngữ kết quả đứng ngay sau động từ: 听懂 (nghe hiểu), 找到 (tìm thấy), 做完 (làm xong).",
        words: [
          W("把", "trợ từ đem (câu chữ bǎ)", "🖐️", "bǎ"), W("被", "bị (câu bị động)", "🔄", "bèi"), W("比", "hơn (so sánh)", "⚖️", "bǐ"), W("完", "xong (bổ ngữ kết quả)", "✅", "wán"),
          W("到", "được, đến (bổ ngữ kết quả)", "🎯", "dào"), W("懂", "hiểu (bổ ngữ kết quả)", "💡", "dǒng"), W("越来越", "càng ngày càng", "📈", "yuèláiyuè"), W("离", "cách (khoảng cách)", "📏", "lí"),
        ],
        sentences: [
          { t: ["我", "把", "作业", "做", "完", "了"], n: ["Tôi", "đã", "làm", "xong", "bài", "tập"], r: "wǒ bǎ zuòyè zuò wán le", blank: "把", dT: ["被", "比"], dN: ["bị", "hơn"] },
          { t: ["杯子", "被", "打", "破", "了"], n: ["Cái", "cốc", "bị", "đánh", "vỡ", "rồi"], r: "bēizi bèi dǎ pò le", blank: "被", dT: ["把", "完"], dN: ["đem", "xong"] },
          { t: ["今天", "比", "昨天", "冷"], n: ["Hôm", "nay", "lạnh", "hơn", "hôm", "qua"], r: "jīntiān bǐ zuótiān lěng", blank: "比", dT: ["离", "被"], dN: ["cách", "bị"] },
          { t: ["我", "听", "懂", "了", "老师", "的", "话"], n: ["Tôi", "đã", "nghe", "hiểu", "lời", "của", "giáo", "viên"], r: "wǒ tīng dǒng le lǎoshī de huà", blank: "懂", dT: ["完", "到"], dN: ["xong", "được"] },
          { t: ["天气", "越来越", "热", "了"], n: ["Thời", "tiết", "càng", "ngày", "càng", "nóng"], r: "tiānqì yuèláiyuè rè le", blank: "越来越", dT: ["比", "离"], dN: ["hơn", "cách"] },
          { t: ["我", "找", "到", "了", "钥匙"], n: ["Tôi", "đã", "tìm", "thấy", "chìa", "khóa"], r: "wǒ zhǎo dào le yàoshi", blank: "到", dT: ["懂", "完"], dN: ["hiểu", "xong"] },
        ],
      },
    ],
  },
];

// ---------- exercise builders ----------
function build(course) {
  const packId = course.id;
  const sections = [{ id: `${packId}:section-1`, title: course.sectionTitle, units: [] }];

  course.units.forEach((unit, ui) => {
    const kana = !!unit.kana;
    const words = unit.words;
    const seedBase = `${packId}:${ui}`;
    const display = (w) => (w.romanization ? `${w.target} (${w.romanization})` : w.target);
    const tgtSentence = (s) => s.t.join(course.joiner);

    const others = (w, n, seed) =>
      shuffle(words.filter((x) => x.target !== w.target && x.native !== w.native), seed).slice(0, n);

    const mkSelect = (w, mode, id) => {
      const distract = others(w, 3, `${seedBase}:${id}`);
      if (mode === "targetToNative") {
        const opts = shuffle([w, ...distract], `${seedBase}:o:${id}`);
        return {
          type: "select", id, mode, prompt: display(w), audioTarget: w.target,
          options: opts.map((o) => ({ text: o.native, emoji: o.emoji })),
          correct: opts.findIndex((o) => o.target === w.target),
        };
      }
      const opts = shuffle([w, ...distract], `${seedBase}:o:${id}`);
      return {
        type: "select", id, mode,
        prompt: mode === "listen" ? w.target : kana ? `Chữ nào đọc là "${w.native}"?` : w.native,
        audioTarget: mode === "listen" ? w.target : undefined,
        options: opts.map((o) => ({ text: o.target, emoji: o.emoji })),
        correct: opts.findIndex((o) => o.target === w.target),
      };
    };
    const mkMatch = (ws, id) => ({
      type: "match", id,
      pairs: ws.map((w) => ({ target: w.target, native: w.native })),
    });
    const mkTyping = (w, mode, id) => ({
      type: "typeAnswer", id, mode,
      prompt: mode === "listen" ? w.target : w.native,
      audioTarget: mode === "listen" ? w.target : undefined,
      answer: w.target, alternatives: [],
    });

    const sentences = unit.sentences ?? [];
    const mkWordBank = (s, i, id) => {
      const t2n = i % 2 === 0;
      const promptText = tgtSentence(s) + (course.targetCode === "en" ? "." : "。");
      if (t2n) {
        return {
          type: "wordBank", id, direction: "targetToNative",
          prompt: s.r ? `${promptText}\n${s.r}` : promptText,
          audioTarget: tgtSentence(s),
          tokens: shuffle([...s.n, ...s.dN], `${seedBase}:wb:${id}`),
          answer: s.n,
        };
      }
      return {
        type: "wordBank", id, direction: "nativeToTarget",
        prompt: s.n.join(" ") + ".",
        tokens: shuffle([...s.t, ...s.dT], `${seedBase}:wb:${id}`),
        answer: s.t,
      };
    };
    const mkFill = (s, id) => {
      const idx = s.t.findIndex((x) => x.toLowerCase() === s.blank.toLowerCase());
      if (idx < 0) throw new Error(`blank "${s.blank}" not in sentence ${tgtSentence(s)}`);
      const shown = s.t.map((x, k) => (k === idx ? "___" : x)).join(course.joiner);
      const correctToken = s.t[idx];
      const pool = words.map((w) => w.target).filter((x) => x.toLowerCase() !== correctToken.toLowerCase());
      const opts = shuffle([correctToken, ...shuffle(pool, `${seedBase}:f:${id}`).slice(0, 3)], `${seedBase}:fo:${id}`);
      return {
        type: "fillBlank", id,
        sentence: shown + (course.targetCode === "en" ? "." : "。"),
        translation: s.n.join(" ") + ".",
        audioTarget: tgtSentence(s),
        options: opts, correct: opts.indexOf(correctToken),
      };
    };

    const lessons = [];
    const addLesson = (title, makers) => {
      const li = lessons.length;
      const lid = `${packId}:u${ui}-l${li}`;
      const exercises = makers.map((fn, ei) => fn(`${lid}-e${ei}`));
      lessons.push({ id: lid, title, exercises });
    };

    const group = (from) => words.slice(from, from + 4);
    for (const [gi, from] of [[1, 0], [2, 4]]) {
      const g = group(from);
      addLesson(`Bài ${gi}`, [
        ...g.map((w) => (id) => mkSelect(w, "targetToNative", id)),
        (id) => mkSelect(g[1], "nativeToTarget", id),
        (id) => mkSelect(g[3], "nativeToTarget", id),
        (id) => mkMatch(g, id),
      ]);
    }
    addLesson("Bài 3: Ôn tập", [
      ...[0, 2, 4, 6].map((k) => (id) => mkSelect(words[k], "listen", id)),
      ...[1, 3, 5, 7].map((k) => (id) => mkSelect(words[k], "nativeToTarget", id)),
      (id) => mkMatch([words[1], words[2], words[5], words[7]], id),
      ...(course.listenTyping
        ? [(id) => mkTyping(words[0], "listen", id), (id) => mkTyping(words[5], "translate", id)]
        : []),
    ]);
    if (sentences.length) {
      addLesson("Bài 4: Câu", sentences.flatMap((s, i) => [
        (id) => mkWordBank(s, i, id),
        (id) => mkFill(s, id),
      ]));
    }

    sections[0].units.push({
      id: `${packId}:unit-${ui + 1}`,
      band: unit.band ?? "tieu-hoc",
      title: unit.title,
      description: unit.description,
      guidebook: unit.guidebook,
      words,
      lessons,
    });
  });

  return {
    id: packId, version: 1,
    targetLanguage: course.targetLanguage, targetCode: course.targetCode,
    nativeLanguage: "Tiếng Việt", nativeCode: "vi",
    flag: course.flag, sections,
  };
}

// ---------- validate + write ----------
const catalog = { version: 1, courses: [] };
for (const course of COURSES) {
  const pack = build(course);
  for (const u of pack.sections[0].units) {
    for (const l of u.lessons) {
      for (const e of l.exercises) {
        if (e.type === "select" && (e.correct < 0 || !e.options[e.correct])) throw new Error(`bad select ${e.id}`);
        if (e.type === "fillBlank" && e.correct < 0) throw new Error(`bad fill ${e.id}`);
        if (e.type === "wordBank" && !e.answer.every((a) => e.tokens.includes(a))) throw new Error(`bad wb ${e.id}`);
      }
    }
  }
  writeFileSync(join(OUT, `${pack.id}.json`), JSON.stringify(pack));
  catalog.courses.push({
    id: pack.id, targetLanguage: pack.targetLanguage, targetCode: pack.targetCode,
    nativeLanguage: pack.nativeLanguage, flag: pack.flag,
    unitCount: pack.sections[0].units.length,
    lessonCount: pack.sections[0].units.reduce((n, u) => n + u.lessons.length, 0),
  });
}
writeFileSync(join(ROOT, "src/content/catalog.json"), JSON.stringify(catalog, null, 2) + "\n");

const ids = COURSES.map((c) => c.id);
const ident = (id) => id.replace("-", "_");
writeFileSync(
  join(OUT, "index.ts"),
  `// Generated by scripts/build-content.mjs — do not edit.\n` +
    ids.map((id) => `import ${ident(id)} from "./${id}.json";`).join("\n") +
    `\nimport type { Pack } from "../../lib/types";\n\nexport const PACKS: Record<string, Pack> = {\n` +
    ids.map((id) => `  "${id}": ${ident(id)} as Pack,`).join("\n") +
    `\n};\n`
);
console.log("OK", JSON.stringify(catalog.courses.map((c) => [c.id, c.unitCount, c.lessonCount])));
