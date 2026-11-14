#!/usr/bin/env python3
"""Build official aiphonecompare logo SVGs from the site mark and Newsreader 600.

Writes icon.svg and wordmark.svg. The wordmark outlines match the header:
Newsreader 600, 1.35rem next to a 28px mark, letter-spacing -0.03em.
"""
from __future__ import annotations

import argparse
from pathlib import Path

from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

NEWSREADER = Path(
    "/usr/share/fonts/truetype/sand-box/google/Newsreader/"
    "Newsreader-VariableFont_opsz,wght.ttf"
)

# Canonical mark, same geometry as public/favicon.svg.
ICON_MARK = """  <rect width="32" height="32" rx="8" fill="#1c1915"/>
  <path d="M9 16.4 13.2 20.6 23.2 10.6" fill="none" stroke="#f3efe6" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>"""

WORD = "aiphonecompare"
# Site header: 28px mark, 10px gap, 1.35rem type. Lockup is drawn at a 32-unit mark.
MARK = 32
FONT_PX = 21.6 * MARK / 28
GAP = 10 * MARK / 28


def x_adv(value) -> int:
    if not value:
        return 0
    return getattr(value, "XAdvance", 0) or 0


def collect_kerning(font):
    pair_adv = {}
    class_lookups = []

    def walk_lookup(lookup):
        if lookup.LookupType == 9:
            for sub in lookup.SubTable:
                ext = type("L", (), {})()
                ext.LookupType = sub.ExtensionLookupType
                ext.SubTable = [sub.ExtSubTable]
                walk_lookup(ext)
            return
        if lookup.LookupType != 2:
            return
        for sub in lookup.SubTable:
            if sub.Format == 1:
                for i, pset in enumerate(sub.PairSet):
                    left = sub.Coverage.glyphs[i]
                    for rec in pset.PairValueRecord:
                        x = x_adv(rec.Value1) + x_adv(rec.Value2)
                        if x:
                            pair_adv[(left, rec.SecondGlyph)] = (
                                pair_adv.get((left, rec.SecondGlyph), 0) + x
                            )
            elif sub.Format == 2:
                cov = set(sub.Coverage.glyphs)
                c1 = dict(sub.ClassDef1.classDefs)
                c2 = dict(sub.ClassDef2.classDefs)
                matrix = {}
                for i, rec1 in enumerate(sub.Class1Record):
                    for j, rec2 in enumerate(rec1.Class2Record):
                        x = x_adv(rec2.Value1) + x_adv(rec2.Value2)
                        if x:
                            matrix[(i, j)] = x
                class_lookups.append((cov, c1, c2, matrix))

    if "GPOS" in font:
        for lookup in font["GPOS"].table.LookupList.Lookup:
            walk_lookup(lookup)
    return pair_adv, class_lookups


def build_wordmark() -> str:
    font = instantiateVariableFont(TTFont(str(NEWSREADER)), {"wght": 600, "opsz": 18})
    upem = font["head"].unitsPerEm
    asc = font["OS/2"].sTypoAscender
    glyph_set = font.getGlyphSet()
    cmap = font.getBestCmap()
    hmtx = font["hmtx"]
    pair_adv, class_lookups = collect_kerning(font)

    x = 0
    prev = None
    parts = []
    for i, ch in enumerate(WORD):
        gname = cmap[ord(ch)]
        if prev is not None:
            x += pair_adv.get((prev, gname), 0)
            for cov, c1, c2, matrix in class_lookups:
                if prev in cov:
                    x += matrix.get((c1.get(prev, 0), c2.get(gname, 0)), 0)
        parts.append((gname, x))
        x += hmtx[gname][0]
        if i < len(WORD) - 1:
            x += -0.03 * upem
        prev = gname

    scale = FONT_PX / upem
    text_width = x * scale
    em_top = (MARK - FONT_PX) / 2
    baseline = em_top + (asc / upem) * FONT_PX
    width = MARK + GAP + text_width

    inner = []
    for gname, gx in parts:
        pen = SVGPathPen(glyph_set)
        glyph_set[gname].draw(pen)
        inner.append(
            f'    <path transform="translate({gx:.3f} 0)" d="{pen.getCommands()}"/>'
        )

    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width:.3f} {MARK}" role="img" aria-label="aiphonecompare">
  <title>aiphonecompare</title>
{ICON_MARK}
  <g fill="#1c1915" transform="translate({MARK + GAP:.3f} {baseline:.3f}) scale({scale:.8f} {-scale:.8f})">
{chr(10).join(inner)}
  </g>
</svg>
"""


def build_icon() -> str:
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" role="img" aria-label="aiphonecompare">
  <title>aiphonecompare</title>
{ICON_MARK}
</svg>
"""


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("outdir", type=Path)
    args = parser.parse_args()
    args.outdir.mkdir(parents=True, exist_ok=True)
    (args.outdir / "icon.svg").write_text(build_icon())
    (args.outdir / "wordmark.svg").write_text(build_wordmark())
    print(f"wrote {args.outdir / 'icon.svg'} and {args.outdir / 'wordmark.svg'}")


if __name__ == "__main__":
    main()
