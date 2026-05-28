#!/usr/bin/env python3
"""Generate favicon.ico from assets/meta/favicon.png for app/ and public/."""

from pathlib import Path

try:
    from PIL import Image
except ImportError:
    Image = None

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "assets" / "meta" / "favicon.png"
TARGETS = [
    ROOT / "src" / "app" / "favicon.ico",
    ROOT / "public" / "favicon.ico",
]


def main() -> None:
    if not SRC.is_file():
        raise SystemExit(f"Missing source icon: {SRC}")

    if Image is None:
        if all(target.is_file() for target in TARGETS):
            print("  ⚠ Pillow not installed; using committed favicon.ico")
            return
        raise SystemExit(
            "Missing Pillow. Install it locally (pip install Pillow) or commit favicon.ico files."
        )

    image = Image.open(SRC)
    for target in TARGETS:
        target.parent.mkdir(parents=True, exist_ok=True)
        image.save(target, format="ICO", sizes=[(16, 16), (32, 32), (48, 48)])
        print(f"  ✓ {target.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
