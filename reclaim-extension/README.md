# Reclaim — Reels & Shorts Blocker

A browser extension that helps you break the **Instagram Reels** and **YouTube Shorts** habit.

Most "blockers" just nag you. Reclaim actually removes the infinite-scroll feeds at
the source, puts a deliberate pause in front of them, and shows you the streak and
time you're winning back — so quitting feels like progress, not punishment.

## What it does

- **Removes the endless feeds.** Instagram's Reels tab and YouTube's Shorts shelves,
  Shorts tab, and Shorts-in-search all disappear.
- **Stops direct dives.** Opening `instagram.com/reels/`, a `/reel/…` link, or a
  `youtube.com/shorts/…` link hits a full-screen intervention instead of the feed.
- **A breathing pause.** Optional countdown before you can continue — the moment of
  friction that breaks the reflex.
- **Harm-reduction mode (YouTube).** Optionally turn any Shorts link into a *normal*
  video page. You still watch the one thing you clicked, but the swipe feed and its
  autoplay-next loop are gone.
- **A daily allowance (optional).** Set 0 for a hard wall, or give yourself N minutes
  of scrolling per day that counts down as you use it.
- **Progress you can see.** Day streak, times stopped, and estimated time reclaimed —
  on the intervention screen, the popup, and the toolbar badge.
- **100% local.** No accounts, no servers, no tracking. Everything lives in your
  browser's local storage.

## Install (Chrome / Edge / Brave / any Chromium browser)

1. Download or clone this folder (`reclaim-extension/`).
2. Go to `chrome://extensions` (or `edge://extensions`, `brave://extensions`).
3. Turn on **Developer mode** (top-right).
4. Click **Load unpacked** and select the `reclaim-extension/` folder.
5. Pin the Reclaim icon to your toolbar. Open Instagram or YouTube — the feeds are gone.

> Firefox: it's a standard MV3 extension; load it via `about:debugging` →
> *This Firefox* → *Load Temporary Add-on* and pick `manifest.json`.

## Using it

- Click the toolbar icon for the quick dashboard: master switch, per-platform toggles,
  and your streak.
- Click **All settings** for the full options page — pause length, daily allowance,
  Shorts mode (block vs. redirect), hide Instagram Explore, and a stats reset.

## How the blocking works

Two content scripts run on `instagram.com` and `youtube.com`. They watch for the
Reels/Shorts routes (both are single-page apps, so navigation is intercepted on every
in-app route change) and mount the intervention overlay, while a MutationObserver
continuously strips Shorts/Reels entry points as the pages re-render.

Because these sites change their markup often, the element-hiding is best-effort and
kept resilient (URL-based interception is the reliable backstop). If a new Shorts shelf
slips through, the selectors in `content/youtube.js` / `content/instagram.js` are easy
to extend.

## Regenerating the icons

The toolbar icons are generated with a dependency-free Python script:

```bash
python3 icons/make_icons.py
```

## Files

```
manifest.json          MV3 manifest
background.js          service worker (defaults + toolbar streak badge)
content/shared.js      settings, stats, streak logic, intervention overlay
content/instagram.js   Instagram Reels enforcement
content/youtube.js     YouTube Shorts enforcement
content/block.css      overlay styling + element-hiding rules
popup/                 toolbar dashboard
options/               full settings page
icons/                 generated PNGs + generator script
```

Not affiliated with Instagram/Meta or YouTube/Google.
