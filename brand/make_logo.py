"""Generate the Is AI Down? logo files into ../public.

Concept: a heartbeat line (is it alive?) in a rounded blue square, with a
green status light in the corner. The big peak reads as the A; the small
narrow spike after it is the stem of an i, with the green status light as
its dot. Lettering is converted to outlines so the
files look the same everywhere. Needs: pip install fonttools.
Run: python3 brand/make_logo.py
"""
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

OUT = Path(__file__).resolve().parent.parent / "public"
FONT = "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"
BLUE, GREEN, INK, WHITE = "#1d4ed8", "#22c55e", "#14171f", "#ffffff"

font = TTFont(FONT)
gs = font.getGlyphSet()
cmap = font.getBestCmap()
upm = font["head"].unitsPerEm


def text_path(text, size, x, baseline):
    """Outline `text` at `size` px, left edge x, baseline y. Returns (path, width)."""
    scale = size / upm
    d, cx = [], x
    for ch in text:
        g = gs[cmap[ord(ch)]]
        pen = SVGPathPen(gs)
        g.draw(TransformPen(pen, (scale, 0, 0, -scale, cx, baseline)))
        d.append(pen.getCommands())
        cx += g.width * scale
    return " ".join(d), cx - x


def mark(x=0, y=0, size=64, bg=BLUE, line=WHITE, dot=GREEN, ring=None):
    """The icon, drawn on a 64 unit grid and scaled to `size`."""
    ring = ring or bg
    k = size / 64
    return (
        f'<g transform="translate({x} {y}) scale({k})">'
        f'<rect width="64" height="64" rx="15" fill="{bg}"/>'
        f'<path d="M8 37H17L24 20L31.5 51L38 37H44L47.5 27L51 37H56" fill="none" stroke="{line}" '
        f'stroke-width="4.6" stroke-linecap="round" stroke-linejoin="round"/>'
        f'<circle cx="47.5" cy="13" r="6.5" fill="{dot}" stroke="{ring}" stroke-width="3"/>'
        f"</g>"
    )


def svg(w, h, inner, title):
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}" '
        f'role="img" aria-label="{title}"><title>{title}</title>{inner}</svg>\n'
    )


# 1. Icon on its own (favicon, avatar, app icon).
(OUT / "logo-mark.svg").write_text(svg(64, 64, mark(), "Is AI Down?"))
(OUT / "favicon.svg").write_text(svg(64, 64, mark(), "Is AI Down?"))

# 2. Horizontal lockup, dark lettering for light backgrounds and a reversed one for dark.
def lockup(ink):
    size, base, gap = 44, 46, 18
    path, width = text_path("Is AI Down?", size, 64 + gap, base)
    w = round(64 + gap + width + 2)
    return svg(w, 64, mark() + f'<path d="{path}" fill="{ink}"/>', "Is AI Down?")


(OUT / "logo.svg").write_text(lockup(INK))
(OUT / "logo-reversed.svg").write_text(lockup(WHITE))

# 3. Social card, 1200x630.
W, H = 1200, 630
title, tw = text_path("Is AI Down?", 112, 0, 0)
sub1, w1 = text_path("Live status of ChatGPT, Claude,", 44, 0, 0)
sub2, w2 = text_path("Gemini and the other big AI services", 44, 0, 0)
card = (
    f'<rect width="{W}" height="{H}" fill="#f7f8fb"/>'
    f'<rect x="0" y="{H-14}" width="{W}" height="14" fill="{BLUE}"/>'
    + mark(96, 150, 150)
    + f'<g transform="translate(290 262)"><path d="{title}" fill="{INK}"/></g>'
    + f'<g transform="translate(96 430)"><path d="{sub1}" fill="#5b6475"/></g>'
    + f'<g transform="translate(96 492)"><path d="{sub2}" fill="#5b6475"/></g>'
)
(OUT / "og.svg").write_text(svg(W, H, card, "Is AI Down? Live status of the main AI services"))
print("written:", *sorted(p.name for p in OUT.glob("*.svg")))
