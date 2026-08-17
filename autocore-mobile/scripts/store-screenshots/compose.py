#!/usr/bin/env python3
"""Composite simulator captures into App Store 6.5\" frames with a caption band."""

from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

SIZES = [(1284, 2778), (1242, 2688)]
BG = (13, 14, 18)
FG = (245, 245, 247)
MUTED = (168, 172, 184)
ACCENT = (77, 150, 255)

SHOTS = [
    ("01-login.png", "Sign in. Same workspace\nas the office.", "North Yard on your phone"),
    ("02-work.png", "Work is what you can\ndo right now.", "Intake, engines, orders, warehouse"),
    ("03-engines.png", "Add engines like\na spreadsheet.", "Serial, brand, code, shelf"),
    ("04-scan.png", "Scan VIN or barcode.\nFind it on the yard.", "Camera built for stock"),
    ("05-finance.png", "Money from real\noperations.", "Not a separate spreadsheet"),
    ("06-paywall.png", "Your entire operation.\nOne workspace.", "AutoCore Pro"),
]


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    candidates = [
        "/System/Library/Fonts/SFNS.ttf",
        "/System/Library/Fonts/SFCompact.ttf",
        "/Library/Fonts/SF-Pro.ttf",
        "/System/Library/Fonts/Supplemental/Arial Unicode.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
    ]
    for path in candidates:
        try:
            return ImageFont.truetype(path, size=size, index=0)
        except OSError:
            continue
    return ImageFont.load_default()


def wrap(draw: ImageDraw.ImageDraw, text: str, fnt: ImageFont.FreeTypeFont, max_w: int) -> str:
    if "\n" in text:
        return text
    words = text.split()
    lines: list[str] = []
    current = ""
    for word in words:
        trial = f"{current} {word}".strip()
        if draw.textlength(trial, font=fnt) <= max_w:
            current = trial
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return "\n".join(lines)


def compose(raw: Image.Image, title: str, subtitle: str, canvas_w: int, canvas_h: int) -> Image.Image:
    canvas = Image.new("RGB", (canvas_w, canvas_h), BG)
    draw = ImageDraw.Draw(canvas)
    pad = int(canvas_w * 0.08)
    title_font = font(int(canvas_w * 0.072), bold=True)
    sub_font = font(int(canvas_w * 0.036))

    title_text = wrap(draw, title, title_font, canvas_w - pad * 2)
    y = int(canvas_h * 0.055)
    draw.multiline_text((pad, y), title_text, font=title_font, fill=FG, spacing=8)
    bbox = draw.multiline_textbbox((pad, y), title_text, font=title_font, spacing=8)
    sub_y = bbox[3] + int(canvas_h * 0.018)
    draw.text((pad, sub_y), subtitle, font=sub_font, fill=MUTED)
    draw.rectangle((pad, sub_y + int(canvas_h * 0.038), pad + 48, sub_y + int(canvas_h * 0.038) + 4), fill=ACCENT)

    frame_top = sub_y + int(canvas_h * 0.055)
    frame_h = canvas_h - frame_top
    shot = raw.convert("RGB")
    scale = canvas_w / shot.width
    nw, nh = canvas_w, int(shot.height * scale)
    shot = shot.resize((nw, nh), Image.Resampling.LANCZOS)
    if nh > frame_h:
        # Keep the top of the UI (status + header), crop the bottom.
        shot = shot.crop((0, 0, nw, frame_h))
    canvas.paste(shot, (0, frame_top))
    return canvas


def main() -> int:
    raw_dir = Path(sys.argv[1] if len(sys.argv) > 1 else "autocore-mobile/store-assets/app-store/raw")
    out_dir = Path(sys.argv[2] if len(sys.argv) > 2 else "autocore-mobile/store-assets/app-store/iphone-6.5")
    out_dir.mkdir(parents=True, exist_ok=True)

    for filename, title, subtitle in SHOTS:
        src = raw_dir / filename
        if not src.exists():
            print(f"skip missing {src}")
            continue
        raw = Image.open(src)
        for w, h in SIZES:
            framed = compose(raw, title, subtitle, w, h)
            dest = out_dir / f"{w}x{h}-{filename}"
            framed.save(dest, "PNG", optimize=True)
            print(f"wrote {dest}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
