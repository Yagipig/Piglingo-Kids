import React from "react";
import { StyleSheet, Text, View } from "react-native";

import {
  enrichEn,
  enrichJa,
  enrichZh,
  exampleSentence,
  kanjidicInfo,
  type ExampleSentence,
} from "@/lib/lexicon";
import { makeThemedStyles } from "@/lib/theme";
import type { Word } from "@/lib/types";

/**
 * Dòng metadata từ điển bổ sung (Đợt 1 tích hợp nguồn mở) hiển thị cạnh
 * thẻ từ: phiên âm IPA (Anh), chip cấp độ (CEFR/Dolch cho Anh, HSK cho
 * Trung, JLPT cho Nhật). Trả về null khi từ không có dữ liệu nguồn nào
 * — không bịa. Nghĩa/pinyin chính thức của app luôn là dòng chính;
 * dữ liệu ở đây là tra cứu phụ (gloss tiếng Anh của ECDICT/CC-CEDICT
 * chỉ hiện khi `showGloss` — dùng ở Sổ tay).
 *
 * Lưu ý JLPT: cấp độ là ƯỚC LƯỢNG của cộng đồng (Tanos) — màn hình
 * chứa danh sách từ tiếng Nhật phải kèm ghi chú này (xem JLPT_NOTE).
 */
export const JLPT_NOTE =
  "Cấp JLPT là ước lượng của cộng đồng (Tanos) — JLPT không công bố danh sách từ chính thức.";

export function WordMeta({
  courseId,
  word,
  showGloss = false,
}: {
  courseId: string;
  word: Word;
  showGloss?: boolean;
}) {
  const styles = useStyles();

  if (courseId === "en-vi") {
    const e = enrichEn(word.target);
    const example = exampleSentence(courseId, word.target);
    if (!e && !example) return null;
    return (
      <View style={styles.wrap}>
        <View style={styles.row}>
          {e?.ipa ? (
            <Text style={styles.ipa} maxFontSizeMultiplier={1.2}>
              {e.ipa}
            </Text>
          ) : null}
          {e?.cefr ? <Chip label={`CEFR ${e.cefr}`} styles={styles} /> : null}
          {e?.dolch ? <Chip label="Từ cơ bản" styles={styles} /> : null}
        </View>
        {showGloss && e?.gloss ? (
          <Text style={styles.gloss} maxFontSizeMultiplier={1.2}>
            Tham khảo (tiếng Anh): {e.gloss}
          </Text>
        ) : null}
        <ExampleLine example={example} styles={styles} />
      </View>
    );
  }

  if (courseId === "zh-vi") {
    const z = enrichZh(word.target);
    const example = exampleSentence(courseId, word.target);
    if (!z && !example) return null;
    return (
      <View style={styles.wrap}>
        <View style={styles.row}>
          {z?.hsk ? <Chip label={`HSK ${z.hsk}`} styles={styles} /> : null}
          {/* Pinyin của app (romanization) là chính; chỉ khi app chưa có
              mới mượn pinyin CC-CEDICT để hiển thị. */}
          {!word.romanization && z?.pinyin ? (
            <Text style={styles.ipa} maxFontSizeMultiplier={1.2}>
              {z.pinyin}
            </Text>
          ) : null}
          {z?.trad ? (
            <Text style={styles.gloss} maxFontSizeMultiplier={1.2}>
              Chữ phồn thể: {z.trad}
            </Text>
          ) : null}
        </View>
        {showGloss && z?.gloss ? (
          <Text style={styles.gloss} maxFontSizeMultiplier={1.2}>
            Tham khảo (tiếng Anh): {z.gloss}
          </Text>
        ) : null}
        <ExampleLine example={example} styles={styles} />
      </View>
    );
  }

  if (courseId === "ja-vi") {
    const j = enrichJa(word.target);
    const example = exampleSentence(courseId, word.target);
    const kanjiDetails = showGloss
      ? [...word.target]
          .map((char) => ({ char, info: kanjidicInfo(char) }))
          .filter((x) => x.info)
          .slice(0, 2)
      : [];
    const hasMeta =
      j?.jlpt || j?.pitch != null || j?.jmReading || (showGloss && j?.jmGloss) ||
      kanjiDetails.length > 0 || example;
    if (!hasMeta) return null;
    return (
      <View style={styles.wrap}>
        <View style={styles.row}>
          {j?.jlpt ? <Chip label={`JLPT ${j.jlpt}*`} styles={styles} /> : null}
          {j?.pitch != null ? (
            <Chip label={`Trọng âm: ${j.pitch}`} styles={styles} />
          ) : null}
          {j?.jmReading ? (
            <Text style={styles.ipa} maxFontSizeMultiplier={1.2}>
              {j.jmReading}
            </Text>
          ) : null}
        </View>
        {j?.pitch != null && j.pitchReading ? (
          <Text style={styles.gloss} maxFontSizeMultiplier={1.2}>
            Điểm rơi trọng âm theo cách đọc {j.pitchReading}: mora {j.pitch}
          </Text>
        ) : null}
        {showGloss && j?.jmGloss ? (
          <Text style={styles.gloss} maxFontSizeMultiplier={1.2}>
            Tham khảo JMdict (tiếng Anh): {j.jmGloss}
          </Text>
        ) : null}
        {kanjiDetails.map(({ char, info }) => (
          <Text
            key={char}
            style={styles.gloss}
            maxFontSizeMultiplier={1.2}
          >
            Kanji {char}: On {info!.on?.join("・") || "—"} · Kun{" "}
            {info!.kun?.join("・") || "—"} · {info!.strokes} nét
            {info!.gloss ? ` · ${info!.gloss}` : ""}
          </Text>
        ))}
        <ExampleLine example={example} styles={styles} />
      </View>
    );
  }

  return null;
}

/** Câu ví dụ Tatoeba đã duyệt tay, kèm ghi công tác giả theo giấy phép. */
function ExampleLine({
  example,
  styles,
}: {
  example: ExampleSentence | undefined;
  styles: ReturnType<typeof useStyles>;
}) {
  if (!example) return null;
  return (
    <View>
      <Text style={styles.example} maxFontSizeMultiplier={1.2}>
        Ví dụ: {example.text}
      </Text>
      <Text style={styles.exampleCredit} maxFontSizeMultiplier={1.2}>
        Câu của {example.author} (Tatoeba #{example.id}), {example.license}
      </Text>
    </View>
  );
}

function Chip({
  label,
  styles,
}: {
  label: string;
  styles: ReturnType<typeof useStyles>;
}) {
  return (
    <View style={styles.chip}>
      <Text style={styles.chipText} maxFontSizeMultiplier={1.2}>
        {label}
      </Text>
    </View>
  );
}

const useStyles = makeThemedStyles((colors) =>
  StyleSheet.create({
    wrap: { gap: 3, marginTop: 2 },
    row: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6 },
    ipa: { fontSize: 13, color: colors.textMuted, fontStyle: "italic" },
    chip: {
      backgroundColor: colors.neutral100,
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
    chipText: { fontSize: 11, fontWeight: "700", color: colors.neutral700 },
    gloss: { fontSize: 12, color: colors.textMuted },
    example: { fontSize: 12, color: colors.text, fontStyle: "italic" },
    exampleCredit: { fontSize: 10, color: colors.textMuted },
  })
);
