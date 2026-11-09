import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CloseButton } from "@/components/close-button";
import { makeThemedStyles, radius } from "@/lib/theme";

/**
 * Màn "Nguồn dữ liệu & Giấy phép" — ghi công tập trung cho MỌI nguồn dữ
 * liệu mở đang dùng trong app (Đợt kỹ năng + Đợt 1 tích hợp nguồn mở).
 * Mỗi mục: tên nguồn, dùng vào việc gì, giấy phép, ghi công theo đúng
 * yêu cầu của giấy phép đó. Dữ liệu trích từ các nguồn ShareAlike được
 * giữ trong file dữ liệu riêng (src/content/lexicon/*, strokes-*) và
 * phát hành lại theo đúng giấy phép của nguồn.
 */
type SourceEntry = {
  name: string;
  use: string;
  license: string;
  credit: string;
};

const SOURCES: SourceEntry[] = [
  {
    name: "FSRS (thư viện ts-fsrs)",
    use: "Thuật toán tính lịch ôn tập từ vựng (khoảng lặp theo độ nhớ) trong tab Ôn tập.",
    license: "MIT",
    credit: "ts-fsrs — © nhóm Open Spaced Repetition. Giấy phép MIT.",
  },
  {
    name: "CC-CEDICT (qua MDBG)",
    use: "Đối chiếu pinyin và bổ sung nghĩa tiếng Anh tham khảo cho từ vựng tiếng Trung (dữ liệu tra cứu phụ — nghĩa tiếng Việt của app vẫn là chính).",
    license: "CC BY-SA 4.0",
    credit:
      "CC-CEDICT — © MDBG (mdbg.net), bản phát hành ngày 09/11/2026, giấy phép Creative Commons Attribution-ShareAlike 4.0 (CC BY-SA 4.0).",
  },
  {
    name: "complete-hsk-vocabulary (drkameleon)",
    use: "Lớp ánh xạ từ tiếng Trung sang cấp độ HSK để gắn thẻ cấp độ cho từ vựng.",
    license: "MIT (lớp ánh xạ)",
    credit:
      "Lớp ánh xạ HSK trích từ repo complete-hsk-vocabulary của drkameleon (MIT). Piglingo không tuyên bố được CLEC/Hanban cấp phép; cấp HSK chính thức thuộc về đề cương của CLEC.",
  },
  {
    name: "Tanos — danh sách từ JLPT (Jonathan Waller)",
    use: "Gắn thẻ cấp độ JLPT cho từ vựng tiếng Nhật.",
    license: "CC BY",
    credit:
      "Danh sách từ JLPT của Jonathan Waller (tanos.co.uk), giấy phép Creative Commons Attribution (CC BY). Lưu ý: JLPT không công bố danh sách từ chính thức từ năm 2010 — cấp độ JLPT trong app là ƯỚC LƯỢNG của cộng đồng.",
  },
  {
    name: "JMdict + KANJIDIC2 (EDRDG)",
    use: "Bổ sung cách đọc kana, nghĩa tiếng Anh tham khảo cho từ tiếng Nhật và thông tin On/Kun, số nét của kanji trong Sổ tay. Nghĩa tiếng Việt của app vẫn là chính.",
    license: "CC BY-SA 4.0",
    credit:
      "This application uses data from the JMdict and KANJIDIC2 dictionary files, © the Electronic Dictionary Research and Development Group (EDRDG), used under the Creative Commons Attribution-ShareAlike 4.0 International licence (https://www.edrdg.org/edrdg/licence.html).",
  },
  {
    name: "kanjium — pitch accent tiếng Nhật",
    use: "Bổ sung điểm rơi trọng âm (pitch accent) cho các từ tiếng Nhật khớp chắc chắn cả dạng chữ và cách đọc.",
    license: "CC BY-SA 4.0",
    credit:
      "The pitch accent notation, verb particle data, phonetics, homonyms and other additions or modifications to EDICT, KANJIDIC or KRADFILE were provided by Uros O. through his free database. (kanjium © Uros O. and contributors, CC BY-SA 4.0.)",
  },
  {
    name: "Tatoeba — câu ví dụ",
    use: "Câu ví dụ ngắn cho từ vựng cả ba ngôn ngữ, hiện ở thẻ từ, Sổ tay và Luyện Đọc. Mọi câu nhúng vào app đều đã qua lọc máy và được đọc duyệt tay 100%; app TUYỆT ĐỐI không dùng audio của Tatoeba.",
    license: "CC BY 2.0 FR (một phần câu là CC0 1.0)",
    credit:
      "Các câu ví dụ trích từ Tatoeba (tatoeba.org), đóng góp bởi cộng đồng Tatoeba, giấy phép Creative Commons Attribution 2.0 France (CC BY 2.0 FR) trừ các câu ghi CC0 1.0. Tên tác giả (username), mã câu và giấy phép của TỪNG câu được giữ trong dữ liệu và hiển thị ngay dưới câu ví dụ trong app.",
  },
  {
    name: "CEFR-J Wordlist",
    use: "Gắn thẻ cấp độ CEFR (A1–B2) cho từ vựng tiếng Anh.",
    license: "Điều khoản của Tono Laboratory — dùng thương mại kèm ghi công nguồn",
    credit:
      "The CEFR-J Wordlist Version 1.6. Compiled by Yukio Tono, Tokyo University of Foreign Studies.",
  },
  {
    name: "NGSL + New Dolch List",
    use: "Khung tần suất và danh sách từ cơ bản cho trẻ em, dùng để sắp xếp ưu tiên ôn tập/hiển thị từ tiếng Anh.",
    license: "CC BY-SA 4.0",
    credit:
      "New General Service List (NGSL) và New Dolch List (NDL) — © Browne, Culligan & Phillips (newgeneralservicelist.com), giấy phép CC BY-SA 4.0.",
  },
  {
    name: "ECDICT",
    use: "Bổ sung hạng tần suất và định nghĩa tiếng Anh tham khảo cho thẻ từ tiếng Anh (tra cứu phụ).",
    license: "MIT",
    credit: "ECDICT — dự án của skywind3000 và cộng đồng đóng góp. Giấy phép MIT.",
  },
  {
    name: "ipa-dict (file en_US)",
    use: "Phiên âm IPA (giọng Anh–Mỹ) hiển thị cạnh từ tiếng Anh.",
    license: "MIT",
    credit:
      "ipa-dict — dự án open-dict-data, giấy phép MIT. Dữ liệu en_US được tạo từ CMU Pronouncing Dictionary — © Carnegie Mellon University, giấy phép BSD 2-Clause.",
  },
  {
    name: "Unicode Unihan Database (Unicode 18.0)",
    use: "Thông tin ký tự Hán/kanji: số nét, bộ thủ, cách đọc và nghĩa gốc — metadata phục vụ sắp xếp và tra cứu.",
    license: "Unicode License v3",
    credit:
      "© Unicode, Inc. Dữ liệu Unihan theo Unicode License v3 (unicode.org/license.txt).",
  },
  {
    name: "wordfreq",
    use: "Điểm tần suất từ tiếng Trung và tiếng Nhật để sắp xếp ưu tiên ôn tập/hiển thị.",
    license: "Dữ liệu CC BY-SA 4.0 (mã nguồn Apache-2.0)",
    credit:
      "wordfreq — © Robyn Speer và cộng đồng đóng góp; dữ liệu tần suất phát hành theo CC BY-SA 4.0 (tổng hợp từ nhiều corpus, gồm dữ liệu SUBTLEX qua giấy phép của Marc Brysbaert).",
  },
  {
    name: "Twemoji",
    use: "Ảnh minh họa PNG nhất quán cho từ vựng trong Sổ tay; emoji nào chưa có asset Twemoji thì app giữ emoji hệ thống như cũ.",
    license: "Hình ảnh CC BY 4.0; mã nguồn MIT",
    credit:
      "Twemoji graphics © Twitter, Inc. and other contributors, licensed under CC BY 4.0 (bản duy trì jdecked/twemoji 17.0.3). OpenMoji chỉ là nguồn dự phòng và chưa được dùng trong app.",
  },
  {
    name: "Lingua Libre (Wikimedia Commons)",
    use: "Một số bản ghi giọng người thật cho từng từ, phát qua nút “Nghe giọng thật”; từ chưa có bản ghi vẫn dùng giọng đọc của thiết bị.",
    license: "Giấy phép theo từng file — đợt này chỉ dùng CC0",
    credit:
      "Các bản ghi Lingua Libre đã đóng gói đều là CC0 và đã kiểm chứng trên trang file Wikimedia Commons: “dog” — Sravani Jampana; “cat” — Muldoonsamuel55; “bird” — Muldoonsamuel55; “fish” — Grendelkhan; “horse” — Grendelkhan; “blue” — Samuel Muldoon. Giấy phép đầy đủ và nguồn từng file được lưu trong dữ liệu của ứng dụng.",
  },
  {
    name: "Hanzi Writer + dữ liệu Make Me a Hanzi",
    use: "Thứ tự nét viết chữ Hán trong hoạt động Tập viết của khu Luyện Viết (tiếng Trung).",
    license: "Mã nguồn MIT; dữ liệu nét theo Arphic Public License",
    credit:
      "Hanzi Writer (MIT) — dữ liệu nét xây dựng từ phông chữ Arphic qua dự án Make Me a Hanzi, theo Arphic Public License (văn bản giấy phép ARPHICPL.TXT kèm trong dữ liệu nguồn).",
  },
  {
    name: "KanjiVG",
    use: "Thứ tự nét viết kanji trong hoạt động Tập viết của khu Luyện Viết (tiếng Nhật).",
    license: "CC BY-SA 3.0",
    credit: "KanjiVG — © Ulrich Apel (kanjivg.tagaini.net), giấy phép CC BY-SA 3.0.",
  },
];

export default function DataSourcesScreen() {
  const styles = useStyles();
  return (
    <SafeAreaView style={styles.screen} edges={["top", "left", "right"]}>
      <View style={styles.topBar}>
        <CloseButton />
        <Text style={styles.title} numberOfLines={1} maxFontSizeMultiplier={1.2}>
          Nguồn dữ liệu & Giấy phép
        </Text>
        <View style={{ width: 44 }} />
      </View>
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.intro} maxFontSizeMultiplier={1.3}>
          Piglingo Kids được xây trên nền nhiều nguồn dữ liệu mở. Trang này
          liệt kê mọi nguồn đang dùng trong app, mục đích sử dụng và giấy
          phép của từng nguồn. Nội dung bài học (từ vựng, nghĩa tiếng Việt,
          câu mẫu) là của Piglingo; các nguồn dưới đây chỉ bổ sung dữ liệu
          tra cứu và tính năng phụ trợ.
        </Text>
        {SOURCES.map((s) => (
          <View key={s.name} style={styles.card}>
            <Text style={styles.name} maxFontSizeMultiplier={1.3}>
              {s.name}
            </Text>
            <Text style={styles.use} maxFontSizeMultiplier={1.3}>
              {s.use}
            </Text>
            <Text style={styles.license} maxFontSizeMultiplier={1.3}>
              Giấy phép: {s.license}
            </Text>
            <Text style={styles.credit} maxFontSizeMultiplier={1.3}>
              {s.credit}
            </Text>
          </View>
        ))}
        <Text style={styles.footnote} maxFontSizeMultiplier={1.3}>
          Nếu ba/mẹ là tác giả của một nguồn dữ liệu trên đây và muốn điều
          chỉnh cách ghi công, hãy liên hệ qua địa chỉ hỗ trợ của ứng dụng.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const useStyles = makeThemedStyles((colors) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    topBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderBottomWidth: 2,
      borderBottomColor: colors.neutral200,
    },
    title: { fontSize: 17, fontWeight: "800", color: colors.neutral700 },
    body: {
      padding: 20,
      gap: 12,
      paddingBottom: 60,
      width: "100%",
      maxWidth: 720,
      alignSelf: "center",
    },
    intro: { fontSize: 14, color: colors.textMuted, lineHeight: 21 },
    card: {
      backgroundColor: colors.neutral100,
      borderRadius: radius.md,
      padding: 14,
      gap: 4,
    },
    name: { fontSize: 16, fontWeight: "800", color: colors.neutral700 },
    use: { fontSize: 14, color: colors.text, lineHeight: 20 },
    license: { fontSize: 13, fontWeight: "700", color: colors.text },
    credit: { fontSize: 13, color: colors.textMuted, lineHeight: 19 },
    footnote: { fontSize: 12, color: colors.textMuted, marginTop: 4, lineHeight: 18 },
  })
);
