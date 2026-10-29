import type { SchoolBand } from "@/lib/types";

/**
 * Danh sách cuộc thi & chứng chỉ tiếng Anh theo 3 khối lớp của lộ trình
 * Piglingo. Mọi liên kết đều trỏ tới trang CHÍNH THỨC của đơn vị tổ chức
 * (đã kiểm chứng khi biên soạn) — app chỉ giới thiệu và mở trang ngoài
 * bằng Linking, không thu lệ phí, không đăng ký hộ, không lưu dữ liệu gì
 * về các kỳ thi này.
 */
export type Competition = {
  id: string;
  band: SchoolBand;
  name: string;
  org: string;
  levelLabel: string;
  desc: string;
  url: string;
};

export const COMPETITION_SECTIONS: { band: SchoolBand; title: string }[] = [
  { band: "tieu-hoc", title: "Khối Tiểu học (lớp 1–5)" },
  { band: "thcs", title: "Khối THCS (lớp 6–9)" },
  { band: "thpt", title: "Khối THPT (lớp 10–12)" },
];

export const COMPETITIONS: Competition[] = [
  // ---------- Khối Tiểu học ----------
  {
    id: "ioe-tieu-hoc",
    band: "tieu-hoc",
    name: "IOE — Olympic tiếng Anh trên Internet",
    org: "IOE (Bộ Giáo dục & Đào tạo)",
    levelLabel: "Từ lớp 3",
    desc: "Cuộc thi tiếng Anh qua mạng miễn phí cho học sinh phổ thông Việt Nam, thi theo vòng quanh năm học.",
    url: "https://ioe.vn",
  },
  {
    id: "cambridge-young-learners",
    band: "tieu-hoc",
    name: "Cambridge Young Learners (Starters, Movers, Flyers)",
    org: "Cambridge English",
    levelLabel: "A1–A2 · 7–12 tuổi",
    desc: "Hệ chứng chỉ tiếng Anh thiếu nhi quốc tế của Cambridge, đánh giá nhẹ nhàng qua hình ảnh và hoạt động vui.",
    url: "https://www.cambridgeenglish.org/exams-and-tests/young-learners-english/",
  },
  {
    id: "toefl-primary",
    band: "tieu-hoc",
    name: "TOEFL Primary",
    org: "ETS",
    levelLabel: "Từ 8 tuổi",
    desc: "Bài thi tiếng Anh quốc tế của ETS dành cho học sinh tiểu học, đo nghe hiểu, đọc hiểu và nói.",
    url: "https://www.ets.org/toefl/primary.html",
  },
  {
    id: "toefl-primary-iig",
    band: "tieu-hoc",
    name: "Thi TOEFL Primary tại Việt Nam",
    org: "IIG Việt Nam",
    levelLabel: "Đơn vị tổ chức thi",
    desc: "IIG Việt Nam là đơn vị tổ chức các kỳ thi TOEFL tại Việt Nam — xem lịch thi và cách đăng ký tại đây.",
    url: "https://iigvietnam.com",
  },
  // ---------- Khối THCS ----------
  {
    id: "ioe-thcs",
    band: "thcs",
    name: "IOE — Olympic tiếng Anh trên Internet",
    org: "IOE",
    levelLabel: "Lớp 6–9",
    desc: "Tiếp tục thi IOE ở cấp THCS với vòng thi cấp trường, cấp tỉnh và cấp quốc gia.",
    url: "https://ioe.vn",
  },
  {
    id: "cambridge-key-schools",
    band: "thcs",
    name: "Cambridge A2 Key for Schools",
    org: "Cambridge English",
    levelLabel: "A2",
    desc: "Chứng chỉ tiếng Anh quốc tế mức A2 dành cho học sinh, phù hợp đầu cấp THCS.",
    url: "https://www.cambridgeenglish.org/exams-and-tests/key-for-schools/",
  },
  {
    id: "cambridge-preliminary-schools",
    band: "thcs",
    name: "Cambridge B1 Preliminary for Schools",
    org: "Cambridge English",
    levelLabel: "B1",
    desc: "Chứng chỉ mức B1 cho học sinh cuối THCS, là bước đệm tốt trước IELTS.",
    url: "https://www.cambridgeenglish.org/exams-and-tests/preliminary-for-schools/",
  },
  {
    id: "toefl-junior",
    band: "thcs",
    name: "TOEFL Junior",
    org: "ETS",
    levelLabel: "Từ 11 tuổi · A2–B2",
    desc: "Bài thi của ETS đo năng lực tiếng Anh học sinh THCS, dùng để xếp lớp và theo dõi tiến bộ.",
    url: "https://www.ets.org/toefl/junior.html",
  },
  // ---------- Khối THPT ----------
  {
    id: "ielts-british-council",
    band: "thpt",
    name: "IELTS — Hội đồng Anh",
    org: "British Council Việt Nam",
    levelLabel: "Mọi mức · du học & xét tuyển",
    desc: "Kỳ thi IELTS chính thức tại Việt Nam: lịch thi, lệ phí và đăng ký trực tuyến.",
    url: "https://www.britishcouncil.vn/thi/ielts",
  },
  {
    id: "ielts-idp",
    band: "thpt",
    name: "IELTS — IDP Việt Nam",
    org: "IDP",
    levelLabel: "Mọi mức · du học & xét tuyển",
    desc: "IDP là đơn vị đồng sở hữu và tổ chức thi IELTS tại Việt Nam, có thi trên máy và trên giấy.",
    url: "https://ielts.idp.com/vietnam",
  },
  {
    id: "toefl-ibt",
    band: "thpt",
    name: "TOEFL iBT",
    org: "ETS",
    levelLabel: "B1–C1 · du học",
    desc: "Bài thi tiếng Anh học thuật của ETS được các trường đại học trên thế giới công nhận.",
    url: "https://www.ets.org/toefl/test-takers/ibt/about.html",
  },
  {
    id: "cambridge-first-schools",
    band: "thpt",
    name: "Cambridge B2 First for Schools",
    org: "Cambridge English",
    levelLabel: "B2",
    desc: "Chứng chỉ mức B2 cho học sinh THPT, giá trị lâu dài cho hồ sơ học tập.",
    url: "https://www.cambridgeenglish.org/exams-and-tests/first-for-schools/",
  },
  {
    id: "ioe-thpt",
    band: "thpt",
    name: "IOE — Olympic tiếng Anh trên Internet",
    org: "IOE",
    levelLabel: "Lớp 10–12",
    desc: "IOE cũng có vòng thi cho học sinh THPT trên toàn quốc.",
    url: "https://ioe.vn",
  },
];

export function competitionsForBand(band: SchoolBand): Competition[] {
  return COMPETITIONS.filter((c) => c.band === band);
}
