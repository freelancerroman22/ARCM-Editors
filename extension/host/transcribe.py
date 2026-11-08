#!/usr/bin/env python3
"""
FlexCaptions - transcribe.py
Turn a video/audio file into word-level captions (.srt + .json) locally, for FREE.
Runs OpenAI Whisper on your own machine (faster-whisper). No account, no upload, no cloud.

The .json it writes feeds FlexCaptions_AE.jsx directly (accurate per-word timing).
The .srt works anywhere (Premiere import, YouTube, etc).

--------------------------------------------------------------------------------
ONE-TIME SETUP  (open Terminal / CMD, you need Python 3.9+ installed)

    pip install faster-whisper

That's it. First run downloads the model (~150 MB for "small"), then it's offline.

--------------------------------------------------------------------------------
USAGE

    python transcribe.py myvideo.mp4
    python transcribe.py myvideo.mp4 --model medium --lang en
    python transcribe.py myvideo.mp4 --max-words 3     # group size hint for SRT

Outputs next to the input:  myvideo.srt  and  myvideo.json

Models (accuracy vs speed):  tiny < base < small < medium < large-v3
  - "small"  = good default for English, fast on most laptops
  - "medium" = noticeably better, needs a bit more RAM/time
  - "large-v3" = best, slower (use if you have a decent GPU)
--------------------------------------------------------------------------------
"""
import argparse, json, os, sys

def fmt_ts(t):
    if t < 0: t = 0
    h = int(t // 3600); t -= h * 3600
    m = int(t // 60);   t -= m * 60
    s = int(t)
    ms = int(round((t - s) * 1000))
    if ms == 1000:
        ms = 0; s += 1
    return "%02d:%02d:%02d,%03d" % (h, m, s, ms)

def main():
    ap = argparse.ArgumentParser(description="Local Whisper transcription -> word-level SRT + JSON")
    ap.add_argument("input", help="video or audio file")
    ap.add_argument("--model", default="small",
                    help="tiny|base|small|medium|large-v3 (default: small)")
    ap.add_argument("--lang", default="en", help="language code, e.g. en (default: en)")
    ap.add_argument("--max-words", type=int, default=3,
                    help="words per caption line in the SRT (default: 3)")
    ap.add_argument("--device", default="auto", help="auto|cpu|cuda")
    args = ap.parse_args()

    if not os.path.isfile(args.input):
        sys.exit("File not found: " + args.input)

    try:
        from faster_whisper import WhisperModel
    except ImportError:
        sys.exit("Missing dependency. Run:  pip install faster-whisper")

    device = args.device
    compute = "int8"
    if device == "auto":
        try:
            import torch  # noqa
            device = "cuda" if torch.cuda.is_available() else "cpu"
        except Exception:
            device = "cpu"
    if device == "cuda":
        compute = "float16"

    print("Loading Whisper model '%s' on %s (first time downloads it)..." % (args.model, device))
    model = WhisperModel(args.model, device=device, compute_type=compute)

    print("Transcribing... (this can take a little while)")
    segments, info = model.transcribe(
        args.input, language=args.lang, word_timestamps=True,
        vad_filter=True, beam_size=5,
    )

    words = []
    for seg in segments:
        if seg.words:
            for w in seg.words:
                token = w.word.strip()
                if token:
                    words.append({"w": token, "start": round(w.start, 3), "end": round(w.end, 3)})
        else:
            words.append({"w": seg.text.strip(), "start": round(seg.start, 3), "end": round(seg.end, 3)})

    base = os.path.splitext(args.input)[0]

    # JSON (per-word, best for the AE script)
    with open(base + ".json", "w", encoding="utf-8") as f:
        json.dump({"words": words}, f, ensure_ascii=False, indent=0)

    # SRT (grouped N words per cue, readable + universal)
    n = max(1, args.max_words)
    with open(base + ".srt", "w", encoding="utf-8") as f:
        idx = 1
        for i in range(0, len(words), n):
            chunk = words[i:i + n]
            start = chunk[0]["start"]
            end = chunk[-1]["end"]
            text = " ".join(c["w"] for c in chunk)
            f.write("%d\n%s --> %s\n%s\n\n" % (idx, fmt_ts(start), fmt_ts(end), text))
            idx += 1

    print("\nDone.")
    print("  " + base + ".json   (feed this to FlexCaptions_AE.jsx for best accuracy)")
    print("  " + base + ".srt    (import anywhere, or also works in the AE script)")

if __name__ == "__main__":
    main()
