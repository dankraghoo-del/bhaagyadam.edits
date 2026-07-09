# Reclaim on iPhone

iOS sandboxes the native Instagram and YouTube apps, so **no app can reach inside them
to hide just Reels/Shorts** — not Reclaim, not anything on the App Store. That leaves
three honest options. Pick one, or stack them.

| Method | Blocks Reels/Shorts *specifically*? | Keeps native apps? | Effort |
|---|---|---|---|
| **1. Safari + userscript** (recommended) | ✅ Yes, surgically | ❌ Use the web instead | 5 min, one-time |
| **2. Shortcuts friction** | ⚠️ Whole app, not just Reels | ✅ Yes | 5 min |
| **3. Screen Time limits** | ⚠️ Whole app, not just Reels | ✅ Yes | 2 min |

---

## Method 1 — Safari + the Reclaim userscript (surgical) ⭐

This is the only way to kill **just** Reels and Shorts on iPhone. You use Instagram and
YouTube in Safari instead of the apps, and the userscript hides the feeds exactly like
the desktop extension does.

**Steps**

1. Install the free **Userscripts** app from the App Store
   (open-source, by Justin Wasack — no account, nothing leaves your phone).
2. Open **Settings → Apps → Safari → Extensions → Userscripts** and turn it **On**.
   Set its permissions to **Allow** on `instagram.com` and `youtube.com`
   (choosing “Always Allow” on All Websites is easiest).
3. Open the Userscripts app once and pick a folder for it to use when prompted.
4. Get `reclaim.user.js` onto your phone:
   - Open this file's raw URL in Safari, **or** AirDrop/email it to yourself, then
   - in the Userscripts app tap the **+** → **Add from file / paste** and paste the
     contents of `reclaim.user.js`.
5. Delete (or just stop using) the Instagram and YouTube apps. Add Safari web shortcuts
   to your Home Screen instead:
   - Go to `instagram.com` in Safari → **Share → Add to Home Screen**.
   - Go to `youtube.com` in Safari → **Share → Add to Home Screen**.

Now opening those Home-Screen icons loads the web versions with Reels/Shorts stripped
out and the intervention screen in front of any `/reels/` or `/shorts/` link.

**Tuning it:** open `reclaim.user.js` in the Userscripts app and edit the `CONFIG`
block at the top — pause length, daily allowance (0 = hard wall), or switch YouTube to
`redirect` mode (a Shorts link opens as a normal video, no swipe feed). Save.

> Works the same in desktop Safari (Userscripts extension) and in any userscript
> manager (Tampermonkey/Violentmonkey) on other browsers.

---

## Method 2 — Shortcuts “pause” automation (keep the native apps)

Adds a friction screen every time you open Instagram or YouTube. It can't see *inside*
the app, so it gates the whole app — but that pause is often enough to break the reflex.
This is the same trick the “one sec” app is built on; you're building it yourself for
free.

1. Open the **Shortcuts** app → **Automation** tab → **+** → **Create Personal Automation**.
2. Choose **App** → **Choose** → select **Instagram** → **Is Opened** → **Next**.
3. Add these actions in order:
   - **Show Notification** (or **Show Alert**) → text like *“Do you actually want to
     scroll, or is this a reflex? Breathe.”**
   - **Wait** → `10` seconds.
   - *(optional, strongest)* add **Open App → Home Screen** to bounce you straight back
     out unless you consciously reopen.
4. Tap **Next**, turn **OFF** “Ask Before Running”, then **Done**.
5. Repeat the whole thing for **YouTube**.

Now every launch costs you a deliberate 10-second pause.

---

## Method 3 — Screen Time hard limits (bluntest, 2 minutes)

Good as a backstop, especially combined with Method 1 or 2.

1. **Settings → Screen Time → App Limits → Add Limit.**
2. Pick **Instagram** and **YouTube** (or the whole **Social** / **Entertainment**
   categories) and set a daily limit — e.g. **15 minutes**.
3. Turn on **Settings → Screen Time → Lock Screen Time Settings** and set a passcode
   *different from your unlock code*, and don't memorize it — future-you tapping
   “Ignore Limit” is the whole failure mode this prevents.
4. Optional: **Downtime** to blackout the apps during work/sleep hours.

---

## Which should I use?

- **Serious about quitting Reels/Shorts:** Method 1. It's the only surgical option and
  it removes the feed entirely instead of trusting your willpower.
- **Want to keep the apps but add friction:** Method 2 (+ Method 3 as a hard ceiling).
- **Zero setup patience:** Method 3 alone.

Stacking **1 + 3** is the strongest: the feed is gone in Safari, and Screen Time caps
total time as a safety net.
