/**
 * "Hành trình xuyên Việt" — dữ liệu hiển thị 34 tỉnh/thành của Việt Nam
 * (theo đơn vị hành chính hiện nay, sau sắp xếp năm 2025) dùng cho bản đồ
 * tỉnh thành ở trang chủ. File này KHÔNG chứa dữ liệu học: bài học vẫn
 * lấy nguyên từ packs; ở đây chỉ quyết định mỗi unit "đặt" tại tỉnh nào
 * trên bản đồ, kèm thẻ thông tin giới thiệu / lịch sử / đặc sản của tỉnh
 * cho bé khám phá.
 *
 * Thứ tự mảng PROVINCES là THỨ TỰ HÀNH TRÌNH Bắc → Nam. Mỗi khóa học
 * (Anh 27 unit, Nhật 27 unit, Trung 26 unit) được rải đều khắp 34 tỉnh
 * theo thứ tự unit: unit đầu tiên luôn ở tỉnh đầu hành trình (Lai Châu),
 * unit cuối cùng luôn ở Cà Mau. Thứ tự unit, tiến độ và công thức khóa
 * bài KHÔNG thay đổi — chỉ đổi nơi đặt bài trên bản đồ.
 *
 * Tọa độ x/y là tọa độ tương đối (0–1) trên ảnh nền
 * assets/images/vietnam-map-bg.jpg (bản đồ cách điệu: Bắc ở trên-phải,
 * Tây Bắc ở phía trái, Nam ở dưới-giữa), đã tinh chỉnh để ghim nằm trên
 * đất liền đúng vùng của tỉnh.
 */

export type ProvinceRegion = "bac" | "trung" | "nam";

export type Province = {
  id: string;
  /** Tên hiển thị, ví dụ "Hà Nội", "TP. Hồ Chí Minh". */
  name: string;
  region: ProvinceRegion;
  /** Tọa độ tương đối 0–1 trên ảnh nền bản đồ. */
  x: number;
  y: number;
  /** Giới thiệu ngắn, thân thiện với trẻ. */
  intro: string;
  /** Một nét lịch sử nổi tiếng, chắc chắn đúng. */
  history: string;
  /** 2–4 đặc sản / sản vật trứ danh. */
  specialties: string[];
  /** Các tỉnh cũ hợp thành, ví dụ "Tuyên Quang + Hà Giang"; null nếu giữ nguyên. */
  mergedFrom: string | null;
};

/** Điểm biển đặc biệt: chỉ có thẻ thông tin, không chứa bài học. */
export type SeaPoint = {
  id: string;
  name: string;
  x: number;
  y: number;
  intro: string;
  history: string;
};

export const REGION_LABELS: Record<ProvinceRegion, string> = {
  bac: "Miền Bắc",
  trung: "Miền Trung",
  nam: "Miền Nam",
};

export const PROVINCES: Province[] = [
  /* ------------------------------ MIỀN BẮC ------------------------------ */
  {
    id: "lai-chau",
    name: "Lai Châu",
    region: "bac",
    x: 0.176,
    y: 0.343,
    intro:
      "Lai Châu là tỉnh miền núi cao ở Tây Bắc, có những dãy núi hùng vĩ và con đèo Ô Quy Hồ dài, quanh co giữa mây trời.",
    history:
      "Từ xưa, vùng đất này là quê hương của nhiều dân tộc anh em như Thái, Mông, Dao, cùng nhau giữ đất, giữ bản nơi biên cương Tổ quốc.",
    specialties: ["Thịt trâu gác bếp", "Mật ong rừng", "Xôi nếp thơm"],
    mergedFrom: null,
  },
  {
    id: "dien-bien",
    name: "Điện Biên",
    region: "bac",
    x: 0.115,
    y: 0.396,
    intro:
      "Điện Biên nằm ở phía Tây của Tổ quốc, nổi tiếng với cánh đồng Mường Thanh rộng mênh mông, lúa vàng óng ả.",
    history:
      "Năm 1954, tại thung lũng Mường Thanh, quân và dân ta làm nên chiến thắng Điện Biên Phủ “lừng lẫy năm châu, chấn động địa cầu”.",
    specialties: ["Gạo Điện Biên", "Thịt trâu gác bếp", "Măng đắng"],
    mergedFrom: null,
  },
  {
    id: "son-la",
    name: "Sơn La",
    region: "bac",
    x: 0.21,
    y: 0.42,
    intro:
      "Sơn La là tỉnh miền núi Tây Bắc với cao nguyên Mộc Châu xanh mát, đồi chè trải dài và những mùa hoa mận, hoa cải trắng khắp bản làng.",
    history:
      "Sơn La có di tích nhà tù Sơn La, nơi từng giam giữ nhiều chiến sĩ cách mạng và hun đúc ý chí yêu nước của bao thế hệ.",
    specialties: ["Chè Tà Xùa", "Sữa Mộc Châu", "Táo mèo"],
    mergedFrom: null,
  },
  {
    id: "lao-cai",
    name: "Lào Cai",
    region: "bac",
    x: 0.685,
    y: 0.148,
    intro:
      "Lào Cai có Sa Pa mờ sương, đỉnh Fansipan cao nhất Việt Nam được gọi là “nóc nhà Đông Dương”, và những thửa ruộng bậc thang đẹp như tranh.",
    history:
      "Từ xưa, đây là cửa ngõ giao thương quan trọng trên sông Hồng, nối miền xuôi với vùng cao biên giới phía Bắc.",
    specialties: ["Cá hồi Sa Pa", "Cốm Tú Lệ", "Thịt lợn cắp nách"],
    mergedFrom: "Lào Cai + Yên Bái",
  },
  {
    id: "tuyen-quang",
    name: "Tuyên Quang",
    region: "bac",
    x: 0.723,
    y: 0.137,
    intro:
      "Tuyên Quang hôm nay gồm cả vùng đất Hà Giang xưa, có cột cờ Lũng Cú nơi cực Bắc Tổ quốc và cao nguyên đá Đồng Văn hùng vĩ được UNESCO công nhận.",
    history:
      "Tân Trào (Tuyên Quang) là thủ đô kháng chiến, nơi diễn ra Quốc dân Đại hội Tân Trào trước Cách mạng Tháng Tám năm 1945.",
    specialties: ["Cam sành Hàm Yên", "Mật ong bạc hà", "Chè Shan tuyết"],
    mergedFrom: "Tuyên Quang + Hà Giang",
  },
  {
    id: "cao-bang",
    name: "Cao Bằng",
    region: "bac",
    x: 0.859,
    y: 0.181,
    intro:
      "Cao Bằng là tỉnh biên giới phía Bắc có thác Bản Giốc hùng vĩ — một trong những thác nước đẹp nhất Việt Nam — và suối Lê-nin trong xanh ở Pác Bó.",
    history:
      "Năm 1941, sau 30 năm bôn ba ở nước ngoài, Bác Hồ về nước qua Pác Bó (Cao Bằng) để lãnh đạo cách mạng Việt Nam.",
    specialties: ["Hạt dẻ Trùng Khánh", "Miến dong", "Thạch đen"],
    mergedFrom: null,
  },
  {
    id: "lang-son",
    name: "Lạng Sơn",
    region: "bac",
    x: 0.892,
    y: 0.221,
    intro:
      "Lạng Sơn là cửa ngõ phía Bắc có ải Chi Lăng nổi tiếng, động Tam Thanh và những phiên chợ biên giới nhộn nhịp.",
    history:
      "Ải Chi Lăng là nơi quân dân ta nhiều lần đánh thắng giặc ngoại xâm, nổi tiếng với chiến thắng của nghĩa quân Lam Sơn năm 1427.",
    specialties: ["Vịt quay Lạng Sơn", "Hồi xứ Lạng", "Na Chi Lăng"],
    mergedFrom: null,
  },
  {
    id: "thai-nguyen",
    name: "Thái Nguyên",
    region: "bac",
    x: 0.796,
    y: 0.174,
    intro:
      "Thái Nguyên nổi tiếng là “thủ phủ chè” với những đồi chè Tân Cương xanh mướt; vùng Bắc Kạn xưa có hồ Ba Bể — hồ nước ngọt tự nhiên trên núi đẹp bậc nhất Việt Nam.",
    history:
      "Trong kháng chiến chống Pháp, vùng Việt Bắc trong đó có Thái Nguyên là căn cứ địa cách mạng với An toàn khu (ATK) Định Hóa.",
    specialties: ["Chè Tân Cương", "Bánh chưng Bờ Đậu", "Miến dong"],
    mergedFrom: "Thái Nguyên + Bắc Kạn",
  },
  {
    id: "phu-tho",
    name: "Phú Thọ",
    region: "bac",
    x: 0.69,
    y: 0.18,
    intro:
      "Phú Thọ là đất Tổ của người Việt, có đền Hùng linh thiêng; vùng đất này còn có lòng hồ Hòa Bình mênh mông và Tam Đảo mờ sương của Vĩnh Phúc xưa.",
    history:
      "Theo truyền thuyết, các Vua Hùng đã dựng nước Văn Lang và đóng đô ở vùng Phong Châu (Phú Thọ); ngày Giỗ Tổ Hùng Vương mùng 10 tháng 3 là ngày lễ lớn của cả dân tộc.",
    specialties: ["Bưởi Đoan Hùng", "Thịt chua Thanh Sơn", "Cá thính"],
    mergedFrom: "Phú Thọ + Hòa Bình + Vĩnh Phúc",
  },
  {
    id: "bac-ninh",
    name: "Bắc Ninh",
    region: "bac",
    x: 0.832,
    y: 0.212,
    intro:
      "Bắc Ninh là quê hương của những làn điệu dân ca Quan họ mượt mà, được UNESCO công nhận là di sản văn hóa phi vật thể của nhân loại.",
    history:
      "Vùng Kinh Bắc xưa là cái nôi văn hiến với chùa Dâu — một trong những ngôi chùa cổ nhất của Phật giáo Việt Nam — và truyền thống khoa bảng lừng lẫy.",
    specialties: ["Bánh phu thê Đình Bảng", "Vải thiều Lục Ngạn", "Bánh đa Kế"],
    mergedFrom: "Bắc Ninh + Bắc Giang",
  },
  {
    id: "ha-noi",
    name: "Hà Nội",
    region: "bac",
    x: 0.79,
    y: 0.22,
    intro:
      "Hà Nội là thủ đô ngàn năm văn hiến của Việt Nam, có Hồ Gươm xanh trong với Tháp Rùa cổ kính và 36 phố phường rộn rịp.",
    history:
      "Năm 1010, vua Lý Thái Tổ dời đô về Thăng Long — Hà Nội ngày nay; Văn Miếu – Quốc Tử Giám nơi đây là trường đại học đầu tiên của nước ta.",
    specialties: ["Phở Hà Nội", "Cốm Làng Vòng", "Bún chả"],
    mergedFrom: null,
  },
  {
    id: "quang-ninh",
    name: "Quảng Ninh",
    region: "bac",
    x: 0.872,
    y: 0.232,
    intro:
      "Quảng Ninh có vịnh Hạ Long — kỳ quan thiên nhiên thế giới được UNESCO công nhận — với hàng nghìn đảo đá vôi nhô lên giữa biển xanh.",
    history:
      "Trên sông Bạch Đằng, cha ông ta đã ba lần đánh thắng quân xâm lược bằng trận địa cọc gỗ nhọn cắm dưới lòng sông.",
    specialties: ["Chả mực Hạ Long", "Gà đồi Tiên Yên", "Sá sùng"],
    mergedFrom: null,
  },
  {
    id: "hai-phong",
    name: "Hải Phòng",
    region: "bac",
    x: 0.845,
    y: 0.3,
    intro:
      "Hải Phòng là thành phố cảng lớn của miền Bắc, rực rỡ hoa phượng đỏ mỗi mùa hè, có đảo Cát Bà xanh mát giữa vịnh Lan Hạ.",
    history:
      "Sông Bạch Đằng chảy qua vùng Hải Phòng là chứng tích của ba trận thủy chiến lừng danh chống giặc ngoại xâm trong lịch sử nước ta.",
    specialties: ["Bánh đa cua", "Bánh đậu xanh Hải Dương", "Vải thiều Thanh Hà"],
    mergedFrom: "Hải Phòng + Hải Dương",
  },
  {
    id: "hung-yen",
    name: "Hưng Yên",
    region: "bac",
    x: 0.84,
    y: 0.25,
    intro:
      "Hưng Yên nằm giữa đồng bằng sông Hồng, nổi tiếng với nhãn lồng ngọt thơm và Phố Hiến xưa — “thứ nhất Kinh Kỳ, thứ nhì Phố Hiến”.",
    history:
      "Phố Hiến từng là thương cảng sầm uất bậc nhất Đàng Ngoài từ thế kỷ 17, nơi tàu bè của nhiều nước đến buôn bán.",
    specialties: ["Nhãn lồng Hưng Yên", "Bánh cáy Thái Bình", "Gà Đông Tảo"],
    mergedFrom: "Hưng Yên + Thái Bình",
  },
  {
    id: "ninh-binh",
    name: "Ninh Bình",
    region: "bac",
    x: 0.75,
    y: 0.28,
    intro:
      "Ninh Bình có Tràng An — di sản văn hóa và thiên nhiên thế giới — với núi đá vôi, hang động và dòng sông uốn lượn như tranh vẽ.",
    history:
      "Hoa Lư (Ninh Bình) là kinh đô của nước ta dưới thời vua Đinh Tiên Hoàng, mở đầu thời kỳ độc lập lâu dài sau nghìn năm Bắc thuộc (năm 968).",
    specialties: ["Cơm cháy Ninh Bình", "Dê núi Ninh Bình", "Phở bò Nam Định"],
    mergedFrom: "Ninh Bình + Hà Nam + Nam Định",
  },

  /* ----------------------------- MIỀN TRUNG ----------------------------- */
  {
    id: "thanh-hoa",
    name: "Thanh Hóa",
    region: "trung",
    x: 0.5,
    y: 0.413,
    intro:
      "Thanh Hóa là tỉnh lớn ở Bắc Trung Bộ, có bãi biển Sầm Sơn nổi tiếng và dòng sông Mã hùng tráng chảy qua cầu Hàm Rồng.",
    history:
      "Thanh Hóa là quê hương của cuộc khởi nghĩa Lam Sơn do anh hùng Lê Lợi lãnh đạo, đánh đuổi giặc Minh và lập nên nhà Lê.",
    specialties: ["Nem chua Thanh Hóa", "Chả tôm", "Bánh gai Tứ Trụ"],
    mergedFrom: null,
  },
  {
    id: "nghe-an",
    name: "Nghệ An",
    region: "trung",
    x: 0.495,
    y: 0.47,
    intro:
      "Nghệ An là tỉnh có diện tích lớn bậc nhất nước ta, có bãi biển Cửa Lò và làng Sen thơm ngát hương sen mỗi mùa hạ.",
    history: "Nghệ An là quê hương của Chủ tịch Hồ Chí Minh kính yêu — Người sinh ra tại làng Sen, xã Kim Liên.",
    specialties: ["Cam Vinh", "Tương Nam Đàn", "Cháo lươn Nghệ An"],
    mergedFrom: null,
  },
  {
    id: "ha-tinh",
    name: "Hà Tĩnh",
    region: "trung",
    x: 0.466,
    y: 0.502,
    intro:
      "Hà Tĩnh nằm giữa dãy Trường Sơn và biển Đông, có hồ Kẻ Gỗ mênh mông và những làn điệu ví, giặm thân thương được UNESCO công nhận.",
    history:
      "Hà Tĩnh là quê hương của đại thi hào Nguyễn Du — tác giả Truyện Kiều, kiệt tác văn học của dân tộc.",
    specialties: ["Kẹo cu đơ", "Bưởi Phúc Trạch", "Cam Khe Mây"],
    mergedFrom: null,
  },
  {
    id: "quang-tri",
    name: "Quảng Trị",
    region: "trung",
    x: 0.46,
    y: 0.555,
    intro:
      "Quảng Trị hôm nay gồm cả vùng đất Quảng Bình xưa, có Phong Nha – Kẻ Bàng với hang Sơn Đoòng lớn nhất thế giới, di sản thiên nhiên được UNESCO công nhận.",
    history:
      "Thành Cổ Quảng Trị và dòng sông Thạch Hãn là chứng tích hào hùng của 81 ngày đêm giữ thành năm 1972; cầu Hiền Lương – sông Bến Hải từng là giới tuyến chia cắt đất nước suốt 21 năm.",
    specialties: ["Bánh bột lọc", "Cháo canh Quảng Bình", "Khoai deo"],
    mergedFrom: "Quảng Trị + Quảng Bình",
  },
  {
    id: "hue",
    name: "Huế",
    region: "trung",
    x: 0.505,
    y: 0.598,
    intro:
      "Huế là thành phố mộng mơ bên dòng sông Hương, có Kinh thành cổ kính và những lăng tẩm của các vua nhà Nguyễn được UNESCO công nhận.",
    history:
      "Huế từng là kinh đô của triều Nguyễn — triều đại phong kiến cuối cùng của Việt Nam — trong hơn 140 năm.",
    specialties: ["Bún bò Huế", "Cơm hến", "Bánh bèo chén"],
    mergedFrom: null,
  },
  {
    id: "da-nang",
    name: "Đà Nẵng",
    region: "trung",
    x: 0.735,
    y: 0.512,
    intro:
      "Đà Nẵng là thành phố biển xinh đẹp với cầu Rồng phun lửa và bãi biển Mỹ Khê; vùng Quảng Nam xưa có phố cổ Hội An đèn lồng rực rỡ và thánh địa Mỹ Sơn — đều là di sản thế giới.",
    history:
      "Phố cổ Hội An từng là thương cảng quốc tế sầm uất vào thế kỷ 16–17, nơi thuyền buôn của nhiều nước ghé tới giao thương.",
    specialties: ["Mì Quảng", "Cơm gà Hội An", "Bánh tráng cuốn thịt heo"],
    mergedFrom: "Đà Nẵng + Quảng Nam",
  },
  {
    id: "quang-ngai",
    name: "Quảng Ngãi",
    region: "trung",
    x: 0.762,
    y: 0.545,
    intro:
      "Quảng Ngãi có đảo Lý Sơn — “vương quốc tỏi” giữa biển khơi; vùng Kon Tum xưa thuộc Tây Nguyên có nhà rông Ba Na cao vút và dòng sông Đăk Bla thơ mộng.",
    history:
      "Quảng Ngãi là quê hương của đội du kích Ba Tơ — một trong những đội du kích đầu tiên của cách mạng ở miền Trung năm 1945.",
    specialties: ["Tỏi Lý Sơn", "Cá bống sông Trà", "Đường phèn"],
    mergedFrom: "Quảng Ngãi + Kon Tum",
  },
  {
    id: "gia-lai",
    name: "Gia Lai",
    region: "trung",
    x: 0.738,
    y: 0.562,
    intro:
      "Gia Lai nằm trên cao nguyên Tây Nguyên với Biển Hồ xanh trong như đôi mắt; vùng Bình Định xưa là “đất võ trời văn” với thành phố biển Quy Nhơn và những tháp Chăm cổ kính.",
    history:
      "Bình Định là quê hương của anh hùng áo vải Quang Trung – Nguyễn Huệ, người lãnh đạo phong trào Tây Sơn và đại phá quân Thanh năm 1789.",
    specialties: ["Bò một nắng", "Nem chợ Huyện", "Bánh hỏi lòng heo"],
    mergedFrom: "Gia Lai + Bình Định",
  },
  {
    id: "dak-lak",
    name: "Đắk Lắk",
    region: "trung",
    x: 0.764,
    y: 0.59,
    intro:
      "Đắk Lắk là thủ phủ cà phê của Việt Nam với Buôn Ma Thuột thơm lừng mùa hoa cà phê trắng; vùng Phú Yên xưa có ghềnh Đá Đĩa kỳ lạ bên bờ biển xanh.",
    history:
      "Đắk Lắk là quê hương của những chú voi Bản Đôn lừng danh và trường ca Đam San của người Êđê được lưu truyền qua bao thế hệ.",
    specialties: ["Cà phê Buôn Ma Thuột", "Bơ sáp Đắk Lắk", "Cá ngừ đại dương"],
    mergedFrom: "Đắk Lắk + Phú Yên",
  },
  {
    id: "khanh-hoa",
    name: "Khánh Hòa",
    region: "trung",
    x: 0.786,
    y: 0.612,
    intro:
      "Khánh Hòa có thành phố biển Nha Trang xinh đẹp và là tỉnh quản lý quần đảo Trường Sa thiêng liêng của Tổ quốc; vùng Ninh Thuận xưa đầy nắng gió với những vườn nho xanh và tháp Chăm cổ.",
    history:
      "Từ thế kỷ 17, các đội hùng binh Hoàng Sa của nước ta đã dong thuyền ra Biển Đông khai thác hải sản và khẳng định chủ quyền biển, đảo quê hương.",
    specialties: ["Yến sào Khánh Hòa", "Nho Ninh Thuận", "Bún chả cá Nha Trang"],
    mergedFrom: "Khánh Hòa + Ninh Thuận",
  },
  {
    id: "lam-dong",
    name: "Lâm Đồng",
    region: "trung",
    x: 0.478,
    y: 0.652,
    intro:
      "Lâm Đồng có thành phố Đà Lạt ngàn hoa mờ sương trên cao nguyên; vùng Bình Thuận xưa có Mũi Né cát vàng biển xanh, còn Đắk Nông xưa có Công viên địa chất toàn cầu được UNESCO công nhận.",
    history:
      "Năm 1893, bác sĩ Yersin tìm ra cao nguyên Lang Biang — vùng đất sau này trở thành thành phố Đà Lạt mộng mơ.",
    specialties: ["Dâu tây Đà Lạt", "Thanh long Bình Thuận", "Hồng giòn Đà Lạt"],
    mergedFrom: "Lâm Đồng + Bình Thuận + Đắk Nông",
  },

  /* ------------------------------ MIỀN NAM ------------------------------ */
  {
    id: "dong-nai",
    name: "Đồng Nai",
    region: "nam",
    x: 0.472,
    y: 0.684,
    intro:
      "Đồng Nai là tỉnh lớn ở Đông Nam Bộ, có hồ Trị An mênh mông và Vườn quốc gia Cát Tiên — lá phổi xanh với nhiều loài thú quý.",
    history:
      "Từ thế kỷ 17, vùng đất Đồng Nai – Gia Định xưa là nơi những đoàn lưu dân Việt đầu tiên đến mở cõi về phương Nam.",
    specialties: ["Bưởi Tân Triều", "Hạt điều Bình Phước", "Gỏi cá Biên Hòa"],
    mergedFrom: "Đồng Nai + Bình Phước",
  },
  {
    id: "tay-ninh",
    name: "Tây Ninh",
    region: "nam",
    x: 0.432,
    y: 0.682,
    intro:
      "Tây Ninh có núi Bà Đen — “nóc nhà Nam Bộ” — và Tòa Thánh Cao Đài tráng lệ; vùng Long An xưa là cửa ngõ về miền Tây với dòng sông Vàm Cỏ thơ mộng.",
    history:
      "Trong kháng chiến chống Mỹ, Tây Ninh là nơi đặt căn cứ của Trung ương Cục miền Nam — cơ quan lãnh đạo cách mạng ở miền Nam.",
    specialties: ["Muối tôm Tây Ninh", "Bánh tráng phơi sương", "Dưa hấu Long An"],
    mergedFrom: "Tây Ninh + Long An",
  },
  {
    id: "tp-ho-chi-minh",
    name: "TP. Hồ Chí Minh",
    region: "nam",
    x: 0.472,
    y: 0.73,
    intro:
      "Thành phố Hồ Chí Minh là đô thị lớn nhất nước ta, sôi động ngày đêm với Nhà thờ Đức Bà và chợ Bến Thành; vùng đất này nay còn gồm Bình Dương và phố biển Vũng Tàu.",
    history:
      "Năm 1911, tại Bến Nhà Rồng, chàng thanh niên Nguyễn Tất Thành lên tàu ra đi tìm đường cứu nước — Người chính là Bác Hồ kính yêu sau này.",
    specialties: ["Cơm tấm Sài Gòn", "Hủ tiếu", "Bánh mì"],
    mergedFrom: "TP. Hồ Chí Minh + Bình Dương + Bà Rịa – Vũng Tàu",
  },
  {
    id: "dong-thap",
    name: "Đồng Tháp",
    region: "nam",
    x: 0.424,
    y: 0.722,
    intro:
      "Đồng Tháp nằm giữa đồng bằng sông Cửu Long, có Đồng Tháp Mười mênh mông mùa nước nổi với sen hồng khoe sắc và sếu đầu đỏ ở Vườn quốc gia Tràm Chim.",
    history:
      "Cụ Phó bảng Nguyễn Sinh Sắc — thân sinh của Bác Hồ — đã sống những năm cuối đời tại Cao Lãnh (Đồng Tháp), nơi nay có khu di tích tưởng nhớ Cụ.",
    specialties: ["Xoài Cao Lãnh", "Hủ tiếu Mỹ Tho", "Sen Tháp Mười"],
    mergedFrom: "Đồng Tháp + Tiền Giang",
  },
  {
    id: "an-giang",
    name: "An Giang",
    region: "nam",
    x: 0.418,
    y: 0.754,
    intro:
      "An Giang có núi Sam, núi Cấm và rừng tràm Trà Sư xanh ngát; vùng Kiên Giang xưa có đảo Phú Quốc — “đảo ngọc” lớn nhất Việt Nam giữa vịnh Thái Lan.",
    history:
      "Đầu thế kỷ 19, danh thần Thoại Ngọc Hầu cho đào kênh Vĩnh Tế, giúp người dân khai phá và giữ vững vùng đất biên giới Tây Nam.",
    specialties: ["Nước mắm Phú Quốc", "Đường thốt nốt", "Cá linh mùa nước nổi"],
    mergedFrom: "An Giang + Kiên Giang",
  },
  {
    id: "vinh-long",
    name: "Vĩnh Long",
    region: "nam",
    x: 0.45,
    y: 0.746,
    intro:
      "Vĩnh Long nằm giữa hai dòng sông Tiền và sông Hậu với miệt vườn cây trái sum suê; vùng Bến Tre xưa là xứ dừa xanh mát, còn Trà Vinh có những ngôi chùa Khmer cổ kính.",
    history:
      "Bến Tre là quê hương của phong trào Đồng Khởi năm 1960, mở đầu cao trào cách mạng mạnh mẽ ở miền Nam.",
    specialties: ["Dừa Bến Tre", "Bưởi Năm Roi", "Kẹo dừa"],
    mergedFrom: "Vĩnh Long + Bến Tre + Trà Vinh",
  },
  {
    id: "can-tho",
    name: "Cần Thơ",
    region: "nam",
    x: 0.429,
    y: 0.776,
    intro:
      "Cần Thơ là thành phố trung tâm của miền Tây, có bến Ninh Kiều thơ mộng và chợ nổi Cái Răng nhộn nhịp từ tờ mờ sáng — nét văn hóa sông nước độc đáo.",
    history:
      "Từ xưa, Cần Thơ đã là đầu mối giao thương lớn của vùng đất Tây Đô, nơi ghe thuyền khắp miền Tây tụ hội buôn bán trên sông.",
    specialties: ["Bánh pía Sóc Trăng", "Bánh cống Cần Thơ", "Dâu Hạ Châu"],
    mergedFrom: "Cần Thơ + Hậu Giang + Sóc Trăng",
  },
  {
    id: "ca-mau",
    name: "Cà Mau",
    region: "nam",
    x: 0.417,
    y: 0.802,
    intro:
      "Cà Mau là vùng đất cực Nam của Tổ quốc, nơi “đất nở ra, rừng trỗi dậy” với rừng đước, rừng tràm U Minh và Mũi Cà Mau vươn dài ra biển.",
    history:
      "Hơn ba thế kỷ trước, những đoàn lưu dân đầu tiên đã đến khai phá vùng đất Cà Mau hoang sơ, đắp nên miệt đất tận cùng phía Nam của đất nước.",
    specialties: ["Cua Cà Mau", "Mật ong rừng U Minh", "Ba khía Rạch Gốc"],
    mergedFrom: "Cà Mau + Bạc Liêu",
  },
];

/** Hai điểm biển đặc biệt trên bản đồ: chỉ xem thông tin, không có bài học. */
export const SEA_POINTS: SeaPoint[] = [
  {
    id: "hoang-sa",
    name: "Quần đảo Hoàng Sa",
    x: 0.552,
    y: 0.768,
    intro:
      "Quần đảo Hoàng Sa là quần đảo của Việt Nam giữa Biển Đông, thuộc thành phố Đà Nẵng, với những bãi cát vàng và rạn san hô đầy tôm cá.",
    history:
      "Từ thế kỷ 17, các đội hùng binh Hoàng Sa của nước ta đã dong thuyền ra quần đảo này khai thác hải sản và khẳng định chủ quyền biển, đảo của Tổ quốc.",
  },
  {
    id: "truong-sa",
    name: "Quần đảo Trường Sa",
    x: 0.2,
    y: 0.86,
    intro:
      "Quần đảo Trường Sa là quần đảo thiêng liêng của Việt Nam giữa Biển Đông, thuộc tỉnh Khánh Hòa, nơi các chú bộ đội hải quân ngày đêm canh giữ biển trời quê hương.",
    history:
      "Từ bao đời nay, ngư dân Việt Nam đã ra khơi đánh bắt quanh quần đảo Trường Sa; Nhà nước ta luôn khẳng định chủ quyền đối với quần đảo này.",
  },
];

export const PROVINCE_COUNT = PROVINCES.length;

/**
 * Tỉnh (theo chỉ số hành trình 0–33) chứa unit thứ `unitIndex` của một
 * khóa có `unitCount` unit: rải đều tuyến tính, unit đầu → tỉnh đầu,
 * unit cuối → tỉnh cuối (Cà Mau). Đơn điệu tăng theo unitIndex.
 */
export function provinceIndexForUnit(unitIndex: number, unitCount: number): number {
  if (unitCount <= 1) return 0;
  const clamped = Math.min(Math.max(unitIndex, 0), unitCount - 1);
  return Math.round((clamped * (PROVINCE_COUNT - 1)) / (unitCount - 1));
}

/**
 * Unit của khóa (có `unitCount` unit) đang đặt tại tỉnh thứ
 * `journeyIndex`; null nếu khóa đó không có bài ở tỉnh này.
 */
export function unitIndexForProvince(
  journeyIndex: number,
  unitCount: number
): number | null {
  if (journeyIndex < 0 || journeyIndex >= PROVINCE_COUNT || unitCount <= 0) {
    return null;
  }
  for (let u = 0; u < unitCount; u++) {
    if (provinceIndexForUnit(u, unitCount) === journeyIndex) return u;
  }
  return null;
}

/** Tỉnh chứa unit thứ `unitIndex` của khóa có `unitCount` unit. */
export function provinceForUnit(unitIndex: number, unitCount: number): Province {
  return PROVINCES[provinceIndexForUnit(unitIndex, unitCount)];
}
