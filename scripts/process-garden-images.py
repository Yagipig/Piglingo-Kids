#!/usr/bin/env python3
"""
Xử lý ảnh AI thô (media-generation-garden-*) thành tài sản cuối cho
Magical Garden homepage:

- garden-scene-bg.jpg        : resize rộng <= 1600px, JPEG q80 (<= ~450KB)
- garden-magic-tree.png      : chroma-key nền trắng -> alpha (flood fill từ
                               mép), feather mép, resize <= 760px (<= ~400KB)
- garden-portal-*.png        : tương tự cây, resize <= 600px (<= ~350KB)

Sau khi xử lý, file thô media-generation-* được DI CHUYỂN sang
~/workspace/garden-raw/ để không bị đóng gói vào app.

Chạy: python3 scripts/process-garden-images.py
Script an toàn khi chạy lại: chỉ xử lý các file thô đang có trong
assets/images/ (ảnh lantern có thể được bổ sung sau và chạy lại script).
"""

from __future__ import annotations

import glob
import os
import shutil
import sys

from PIL import Image, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMG_DIR = os.path.join(ROOT, "assets", "images")
RAW_BACKUP_DIR = os.path.expanduser("~/workspace/garden-raw")

SENTINEL = (255, 0, 255)  # màu đánh dấu nền — không xuất hiện trong tranh
FILL_THRESH = 20          # dung sai flood fill so với điểm gieo ở mép


def find_raw(kind: str) -> str | None:
    """Tìm file thô media-generation-garden-<kind>-*.png/.jpg trong assets."""
    for pattern in (f"media-generation-garden-{kind}-*.png", f"media-generation-garden-{kind}-*.jpg"):
        hits = sorted(glob.glob(os.path.join(IMG_DIR, pattern)))
        if hits:
            return hits[0]
    return None


def process_scene(src: str, dest: str) -> int:
    im = Image.open(src).convert("RGB")
    if im.width > 1600:
        im = im.resize((1600, round(im.height * 1600 / im.width)), Image.LANCZOS)
    im.save(dest, "JPEG", quality=80, optimize=True, progressive=True)
    return os.path.getsize(dest)


def flood_background_mask(im: Image.Image) -> Image.Image:
    """Trả về ảnh L: 255 = nền (trắng nối với mép), 0 = vật thể."""
    work = im.convert("RGB").copy()
    w, h = work.size
    seeds: list[tuple[int, int]] = []
    step = 6
    for x in range(0, w, step):
        seeds.append((x, 0))
        seeds.append((x, h - 1))
    for y in range(0, h, step):
        seeds.append((0, y))
        seeds.append((w - 1, y))
    from PIL import ImageDraw

    for seed in seeds:
        if work.getpixel(seed) != SENTINEL:
            ImageDraw.floodfill(work, seed, SENTINEL, thresh=FILL_THRESH)
    # Mask: pixel nào đã bị tô sentinel thì là nền
    import numpy as np

    arr = np.asarray(work)
    is_bg = (
        (arr[:, :, 0] == SENTINEL[0])
        & (arr[:, :, 1] == SENTINEL[1])
        & (arr[:, :, 2] == SENTINEL[2])
    )
    return Image.fromarray((is_bg * 255).astype("uint8"), "L")


def process_cutout(src: str, dest: str, max_width: int, budget_kb: int) -> int:
    im = Image.open(src).convert("RGB")
    bg = flood_background_mask(im)

    # Alpha = nghịch đảo của mask nền; gọt 1px viền trắng rồi làm mềm mép.
    alpha = bg.point(lambda v: 0 if v > 0 else 255)
    alpha = alpha.filter(ImageFilter.MinFilter(3))
    alpha = alpha.filter(ImageFilter.GaussianBlur(1.1))

    out = im.convert("RGBA")
    out.putalpha(alpha)

    # Cắt sát vật thể (cộng đệm nhỏ) để portal/cây hiển thị lớn trong khung.
    bbox = alpha.getbbox()
    if bbox:
        pad = 10
        box = (
            max(0, bbox[0] - pad),
            max(0, bbox[1] - pad),
            min(out.width, bbox[2] + pad),
            min(out.height, bbox[3] + pad),
        )
        out = out.crop(box)

    if out.width > max_width:
        out = out.resize(
            (max_width, round(out.height * max_width / out.width)), Image.LANCZOS
        )

    out.save(dest, "PNG", optimize=True)
    size = os.path.getsize(dest)
    if size > budget_kb * 1024:
        quantized = out.quantize(colors=256, method=Image.Quantize.FASTOCTREE)
        quantized.save(dest, "PNG", optimize=True)
        size = os.path.getsize(dest)
    return size


def main() -> int:
    os.makedirs(RAW_BACKUP_DIR, exist_ok=True)
    results: list[tuple[str, int | None]] = []

    jobs = [
        ("scene-bg", "garden-scene-bg.jpg", "scene"),
        ("magic-tree", "garden-magic-tree.png", "tree"),
        ("portal-storybook", "garden-portal-storybook.png", "portal"),
        ("portal-sakura", "garden-portal-sakura.png", "portal"),
        ("portal-lantern", "garden-portal-lantern.png", "portal"),
    ]

    processed_raws: list[str] = []
    for kind, final_name, job_kind in jobs:
        raw = find_raw(kind)
        dest = os.path.join(IMG_DIR, final_name)
        if raw is None:
            if os.path.exists(dest):
                results.append((final_name, os.path.getsize(dest)))
            else:
                results.append((final_name, None))
            continue
        if job_kind == "scene":
            size = process_scene(raw, dest)
        elif job_kind == "tree":
            size = process_cutout(raw, dest, max_width=760, budget_kb=400)
        else:
            size = process_cutout(raw, dest, max_width=600, budget_kb=350)
        results.append((final_name, size))
        processed_raws.append(raw)

    # Di chuyển toàn bộ file thô media-generation-garden-* (ảnh + json mô tả)
    # đã có mặt ra khỏi assets/ để không bị đóng gói vào app.
    for raw in glob.glob(os.path.join(IMG_DIR, "media-generation-garden-*")):
        target = os.path.join(RAW_BACKUP_DIR, os.path.basename(raw))
        shutil.move(raw, target)

    print("=== Kết quả xử lý ảnh Magical Garden ===")
    for name, size in results:
        if size is None:
            print(f"  {name}: CHƯA CÓ (thiếu ảnh thô)")
        else:
            print(f"  {name}: {size / 1024:.0f} KB")
    return 0


if __name__ == "__main__":
    sys.exit(main())
