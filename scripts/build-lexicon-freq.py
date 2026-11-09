#!/usr/bin/env python3
# build-lexicon-freq.py — Zipf frequency (wordfreq) for Piglingo CJK vocab.
#
# Source: wordfreq 3.1.1 (Python package)
#   - Code: Apache-2.0 — https://github.com/rspeer/wordfreq
#   - Data: CC BY-SA 4.0 (wordfreq bundles data from Wikipedia, OpenSubtitles,
#     and other corpora; see the wordfreq paper / repo for provenance)
#   - Install: pip install wordfreq jieba mecab-python3 ipadic
#     (jieba is required for 'zh' tokenisation, MeCab+ipadic for 'ja')
#
# Usage:
#   python3 scripts/build-lexicon-freq.py
# Writes /tmp/lex-cjk/freq.json = {"zh": {word: zipf, ...}, "ja": {...}}
# which scripts/build-lexicon-cjk.mjs then merges into the lexicon files.
# Words with zipf == 0 (absent from the corpus) are omitted, per spec.

import json
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
OUT = Path("/tmp/lex-cjk/freq.json")


def unique_targets(pack_file: str) -> list[str]:
    pack = json.loads((REPO / "src/content/packs" / pack_file).read_text(encoding="utf-8"))
    seen: list[str] = []
    have = set()
    for section in pack.get("sections", []):
        for unit in section.get("units", []):
            for word in unit.get("words", []):
                t = word["target"]
                if t not in have:
                    have.add(t)
                    seen.append(t)
    return seen


def main() -> int:
    try:
        from wordfreq import zipf_frequency
    except ImportError:
        print(
            "ERROR: wordfreq is not installed. Run:\n"
            "  pip install wordfreq jieba mecab-python3 ipadic",
            file=sys.stderr,
        )
        return 1

    result: dict[str, dict[str, float]] = {}
    for pack_file, lang in (("zh-vi.json", "zh"), ("ja-vi.json", "ja")):
        words = unique_targets(pack_file)
        freqs: dict[str, float] = {}
        for w in words:
            z = round(zipf_frequency(w, lang), 1)
            if z != 0:
                freqs[w] = z
        result[lang] = freqs
        print(f"{lang}: zipf for {len(freqs)}/{len(words)} words")

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(result, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"wrote {OUT}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
