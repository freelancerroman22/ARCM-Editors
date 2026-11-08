# FlexCaptions — ARCM Editors

A self-updating After Effects panel that builds viral, CapCut-style captions
(word-by-word, keyword highlight, big-keyword layout, pop/bounce). Once installed it
checks this repo for updates and offers a one-click **Update** inside the panel.

## Install (one time)

1. Click the green **Code** button above → **Download ZIP**, and unzip it.
2. Run the installer:
   - **Windows:** double-click `install_win.bat` (if warned, "More info → Run anyway").
   - **Mac:** right-click `install_mac.command` → Open.
3. Quit After Effects completely, reopen it.
4. **Window → Extensions → FlexCaptions**.

The installer turns on CEP debug mode (needed for unsigned panels) and copies the
`extension/` folder into your Adobe CEP extensions folder. After this, updates are
automatic: when a new version is pushed here, the panel shows an **Update** button.

## Before using

- Install the free **Montserrat** font (fonts.google.com) for the intended look.
- Make a caption file: `pip install faster-whisper`, then
  `python extension/host/transcribe.py yourvideo.mp4` → gives a `.srt`.
  (Or use the panel's **Transcribe active video + caption** button.)

## Use

1. Put your video in a comp, open that comp.
2. In the panel: pick a **Template**, set Words / Position / Layout.
3. Click **Pick .srt and caption comp**, choose the `.srt`.

One Undo removes a whole batch.

## Repo layout

- `extension/` — the panel (installed to Adobe CEP). `version.json` drives auto-update.
- `install_win.bat`, `install_mac.command` — first-time installers.

## Maintainer note

To ship an update: change files under `extension/`, bump `extension/version.json`'s
`version` (and the `LOCAL_VERSION` baked into `extension/client/index.html`), list any
changed files in `version.json` `files`, and push to `main`. Installed panels pick it up.
