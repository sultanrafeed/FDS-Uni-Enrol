"""Draw the app icons (run once): python3 docs/tools/make_icons.py"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

OUT = Path(__file__).resolve().parents[1] / "icons"
OUT.mkdir(exist_ok=True)


def draw(size):
    img = Image.new("RGB", (size, size))
    d = ImageDraw.Draw(img)
    for y in range(size):  # blue -> indigo gradient
        t = y / size
        d.line([(0, y), (size, y)], fill=(int(0 + 88 * t), int(122 - 36 * t), int(255 - 41 * t)))
    s = size / 180
    # mortarboard
    d.polygon([(90 * s, 38 * s), (150 * s, 64 * s), (90 * s, 90 * s), (30 * s, 64 * s)], fill="white")
    d.rectangle([62 * s, 74 * s, 118 * s, 100 * s], fill="white")
    d.line([(146 * s, 66 * s), (146 * s, 100 * s)], fill="white", width=max(2, int(4 * s)))
    d.ellipse([140 * s, 98 * s, 152 * s, 110 * s], fill="white")
    try:
        font = ImageFont.truetype("DejaVuSans-Bold.ttf", int(40 * s))
    except OSError:
        font = ImageFont.load_default()
    text = "</>"
    w = d.textlength(text, font=font)
    d.text(((size - w) / 2, 112 * s), text, font=font, fill="white")
    return img


for n in (180, 192, 512):
    draw(n).save(OUT / f"icon-{n}.png")
print("icons written to", OUT)
