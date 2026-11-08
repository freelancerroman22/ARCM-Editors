#!/usr/bin/env python3
"""
FlexCaptions - render_captions.py
Burn viral captions straight onto a video, FREE and local, using ffmpeg.
No After Effects needed. Produces a ready-to-post MP4 with the captions baked in.

SETUP (one time):
    - Install ffmpeg (https://ffmpeg.org) and make sure `ffmpeg` runs in your terminal.
    - Have a caption file (.srt) - make one with transcribe.py.

USAGE:
    python render_captions.py video.mp4 captions.srt --style money-blue
    python render_captions.py video.mp4 captions.srt --style karaoke --font "Montserrat ExtraBold"
    python render_captions.py video.mp4 captions.srt --style hormozi --pos 0.62 --words 3

Styles: money-blue, hormozi, beast, karaoke, box-yellow, neon-pink, clean, minimal
Output: video_captioned.mp4  (next to the input)
"""
import argparse, os, re, subprocess, sys

# ---------------- SRT parsing (same logic as the rest of FlexCaptions) ----------------
def tc(t):
    t = t.replace(",", ".")
    h, m, s = t.split(":")
    return int(h)*3600 + int(m)*60 + float(s)

def parse_srt(txt):
    txt = txt.replace("\r", "")
    cues = []
    for block in re.split(r"\n\n+", txt):
        lines = block.split("\n")
        if len(lines) < 2:
            continue
        ln = 1 if re.match(r"^\d+\s*$", lines[0]) else 0
        m = re.search(r"(\d{1,2}:\d{2}:\d{2}[.,]\d{1,3})\s*-->\s*(\d{1,2}:\d{2}:\d{2}[.,]\d{1,3})", lines[ln])
        if not m:
            continue
        text = " ".join(lines[ln+1:]).strip()
        text = re.sub(r"<[^>]+>", "", text)
        text = re.sub(r"\s+", " ", text).strip()
        if text:
            cues.append((tc(m.group(1)), tc(m.group(2)), text))
    return cues

def cues_to_words(cues):
    words = []
    for ci, (st, en, text) in enumerate(cues):
        ws = text.split()
        dur = max(1e-4, en - st)
        wl = [len(w)+1 for w in ws]
        tot = sum(wl)
        t = st
        for w, L in zip(ws, wl):
            d = dur * (L/tot)
            words.append({"w": w, "start": t, "end": t+d, "cue": ci})
            t += d
    return words

STOP = set("a an the to of in on is it its you your i and or so be as at if im that this for are was but my we he she".split())

def group_words(words, n, gap=0.45):
    groups, cur = [], []
    for i, wd in enumerate(words):
        cur.append(wd)
        nxt = words[i+1] if i+1 < len(words) else None
        hard = re.search(r"[.!?]$", wd["w"])
        cue_change = nxt and nxt["cue"] != wd["cue"]
        time_gap = nxt and (nxt["start"] - wd["end"]) > gap
        if len(cur) >= n or hard or cue_change or time_gap:
            groups.append(cur); cur = []
    if cur:
        groups.append(cur)
    return groups

def clean(w):
    return re.sub(r"[^a-z0-9']", "", w.lower())

def pick_keyword(grp):
    best, bs = -1, -1
    for i, wd in enumerate(grp):
        c = clean(wd["w"])
        if len(c) < 3 or c in STOP:
            continue
        sc = len(c) + (3 if re.search(r"[0-9]", c) else 0)
        if sc > bs:
            bs, best = sc, i
    if best < 0:
        best = max(range(len(grp)), key=lambda i: len(grp[i]["w"]))
    return best

# ---------------- ASS helpers ----------------
def ass_time(t):
    if t < 0: t = 0
    h = int(t//3600); t -= h*3600
    m = int(t//60); t -= m*60
    s = int(t); cs = int(round((t-s)*100))
    if cs == 100: cs = 0; s += 1
    return "%d:%02d:%02d.%02d" % (h, m, s, cs)

def ass_color(hex6):            # style colour &HAABBGGRR (opaque)
    hex6 = hex6.lstrip("#")
    r, g, b = int(hex6[0:2],16), int(hex6[2:4],16), int(hex6[4:6],16)
    return "&H00%02X%02X%02X" % (b, g, r)

def inline_color(hex6):         # inline \c&Hbbggrr&
    hex6 = hex6.lstrip("#")
    r, g, b = int(hex6[0:2],16), int(hex6[2:4],16), int(hex6[4:6],16)
    return "&H%02X%02X%02X&" % (b, g, r)

# style = dict with look; see STYLES
STYLES = {
    "money-blue": dict(base="#ffffff", key="#1e99ff", outline="#000000", ow=3, shadow=1, upper=False, box=False, pop=True,  karaoke=False, dim=None),
    "hormozi":    dict(base="#ffffff", key="#ffd400", outline="#000000", ow=6, shadow=1, upper=True,  box=False, pop=True,  karaoke=False, dim=None),
    "beast":      dict(base="#ffffff", key="#ff2d2d", outline="#000000", ow=7, shadow=1, upper=True,  box=False, pop=True,  karaoke=False, dim=None),
    "karaoke":    dict(base="#ffffff", key="#ffd400", outline="#000000", ow=4, shadow=1, upper=False, box=False, pop=False, karaoke=True,  dim="#b9b9b9"),
    "box-yellow": dict(base="#111111", key="#111111", outline="#ffd400", ow=0, shadow=0, upper=True,  box="#ffd400", pop=True, karaoke=False, dim=None),
    "neon-pink":  dict(base="#ffffff", key="#ff3da6", outline="#ff3da6", ow=2, shadow=0, upper=False, box=False, pop=True,  karaoke=False, dim=None, glow=True),
    "clean":      dict(base="#ffffff", key="#ffffff", outline="#000000", ow=3, shadow=1, upper=False, box=False, pop=True,  karaoke=False, dim=None),
    "minimal":    dict(base="#ffffff", key="#ffffff", outline="#000000", ow=2, shadow=1, upper=False, box=False, pop=False, karaoke=False, dim=None),
}

def build_ass(words, W, H, style, fontname, pos, words_per):
    st = STYLES[style]
    fs = int(H * 0.058)
    cx = W // 2
    cy = int(H * pos)
    border_style = 3 if st["box"] else 1
    outline_col = ass_color(st["box"]) if st["box"] else ass_color(st["outline"])
    back_col = ass_color(st["box"]) if st["box"] else "&H90000000"
    prim = ass_color(st["base"])
    sec  = ass_color(st["dim"]) if st.get("dim") else prim
    header = []
    header.append("[Script Info]")
    header.append("ScriptType: v4.00+")
    header.append("PlayResX: %d" % W)
    header.append("PlayResY: %d" % H)
    header.append("ScaledBorderAndShadow: yes")
    header.append("")
    header.append("[V4+ Styles]")
    header.append("Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, "
                  "Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, "
                  "Alignment, MarginL, MarginR, MarginV, Encoding")
    header.append("Style: Def,%s,%d,%s,%s,%s,%s,-1,0,0,0,100,100,1,0,%d,%d,%d,5,40,40,40,1" %
                  (fontname, fs, prim, sec, outline_col, back_col, border_style, st["ow"], st["shadow"]))
    header.append("")
    header.append("[Events]")
    header.append("Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text")

    groups = group_words(words, words_per)
    lines = []
    for gi, grp in enumerate(groups):
        gs = grp[0]["start"]
        ge = grp[-1]["end"] + 0.12
        if gi + 1 < len(groups):                 # never overlap the next group
            ge = min(ge, groups[gi+1][0]["start"] - 0.02)
        if ge <= gs:
            ge = gs + 0.25
        kw = pick_keyword(grp)
        # assemble text
        parts = []
        for i, wd in enumerate(grp):
            w = wd["w"].upper() if st["upper"] else wd["w"]
            if st["karaoke"]:
                cs = max(1, int(round((wd["end"] - wd["start"]) * 100)))
                parts.append("{\\kf%d}%s" % (cs, w))
            else:
                if i == kw and not st["box"]:
                    parts.append("{\\c%s}%s{\\c%s}" % (inline_color(st["key"]), w, inline_color(st["base"])))
                else:
                    parts.append(w)
        body = " ".join(parts)
        lead = "{\\an5\\pos(%d,%d)" % (cx, cy)
        if st.get("glow"):
            lead += "\\blur6"
        if st["pop"]:
            lead += "\\fscx0\\fscy0\\t(0,70,\\fscx113\\fscy113)\\t(70,140,\\fscx100\\fscy100)"
        lead += "}"
        lines.append("Dialogue: 0,%s,%s,Def,,0,0,0,,%s%s" %
                     (ass_time(gs), ass_time(ge), lead, body))
    return "\n".join(header + lines) + "\n"

def probe_size(path):
    out = subprocess.check_output([
        "ffprobe", "-v", "error", "-select_streams", "v:0",
        "-show_entries", "stream=width,height", "-of", "csv=p=0:s=x", path
    ]).decode().strip()
    w, h = out.split("x")[:2]
    return int(w), int(h)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("video")
    ap.add_argument("srt")
    ap.add_argument("--style", default="money-blue", choices=list(STYLES.keys()))
    ap.add_argument("--font", default="Montserrat ExtraBold")
    ap.add_argument("--pos", type=float, default=0.62, help="vertical position 0-1 (0.62 = lower center)")
    ap.add_argument("--words", type=int, default=3)
    ap.add_argument("--fontsdir", default=None, help="folder holding the .ttf, if not installed system-wide")
    args = ap.parse_args()

    if not os.path.isfile(args.video): sys.exit("Video not found: " + args.video)
    if not os.path.isfile(args.srt):   sys.exit("SRT not found: " + args.srt)

    W, H = probe_size(args.video)
    with open(args.srt, encoding="utf-8") as f:
        cues = parse_srt(f.read())
    words = cues_to_words(cues)
    ass = build_ass(words, W, H, args.style, args.font, args.pos, args.words)

    base = os.path.splitext(args.video)[0]
    ass_path = base + "." + args.style + ".ass"
    out_path = base + "_captioned.mp4"
    with open(ass_path, "w", encoding="utf-8") as f:
        f.write(ass)

    sub = "subtitles=" + ass_path.replace("\\", "/").replace(":", "\\:")
    if args.fontsdir:
        sub += ":fontsdir=" + args.fontsdir.replace("\\", "/").replace(":", "\\:")
    cmd = ["ffmpeg", "-y", "-i", args.video, "-vf", sub,
           "-c:v", "libx264", "-preset", "medium", "-crf", "18",
           "-c:a", "copy", out_path]
    print("Rendering… this takes a bit.")
    subprocess.run(cmd, check=True)
    print("Done ->", out_path)

if __name__ == "__main__":
    main()
