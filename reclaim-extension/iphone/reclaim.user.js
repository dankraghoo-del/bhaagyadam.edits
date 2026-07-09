// ==UserScript==
// @name         Reclaim — Reels & Shorts Blocker
// @namespace    reclaim.local
// @version      1.0.0
// @description  Block Instagram Reels and YouTube Shorts in Safari on iPhone (via the free Userscripts app) or any userscript manager. Removes the feeds, adds a breathing pause, tracks your streak.
// @author       Reclaim
// @match        *://*.instagram.com/*
// @match        *://*.youtube.com/*
// @match        *://m.youtube.com/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  /* ------------------------------------------------------------------ *
   *  CONFIG — edit these values to taste, then re-save the script.
   * ------------------------------------------------------------------ */
  const CONFIG = {
    blockInstagramReels: true,
    blockYouTubeShorts: true,
    // 'block'    -> hard intervention screen
    // 'redirect' -> a Shorts link opens as a normal video (no swipe feed)
    youtubeShortsMode: 'block',
    hideInstagramExplore: false,
    interventionEnabled: true,
    pauseSeconds: 10,
    // 0 = a hard wall. Above 0 = minutes of scrolling allowed per day.
    dailyAllowanceMinutes: 0,
    // rough estimate of scrolling avoided each time we stop you.
    minutesPerIntercept: 5,
  };

  /* ------------------------------------------------------------------ *
   *  Storage (localStorage — works with @grant none everywhere).
   * ------------------------------------------------------------------ */
  const STORE_KEY = 'reclaim_stats_v1';
  const STAT_DEFAULTS = {
    interceptCount: 0, secondsReclaimed: 0, streakDays: 0,
    lastActiveDate: '', dayKey: '', dailyUsedSeconds: 0,
  };

  const todayKey = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  const daysBetween = (a, b) => {
    if (!a || !b) return null;
    return Math.round((new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / 86400000);
  };

  function loadStats() {
    let s;
    try { s = JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch (_) { s = {}; }
    s = Object.assign({}, STAT_DEFAULTS, s);
    const tk = todayKey();
    if (s.dayKey !== tk) { s.dayKey = tk; s.dailyUsedSeconds = 0; }
    return s;
  }
  function saveStats(s) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(s)); } catch (_) {}
  }

  function recordIntercept() {
    const s = loadStats();
    s.interceptCount += 1;
    s.secondsReclaimed += (CONFIG.minutesPerIntercept || 5) * 60;
    const tk = todayKey();
    if (s.lastActiveDate !== tk) {
      const gap = daysBetween(s.lastActiveDate, tk);
      if (gap === 1 || s.lastActiveDate === '') s.streakDays += 1;
      else s.streakDays = 1;
      s.lastActiveDate = tk;
    }
    saveStats(s);
    return s;
  }
  function addAllowanceUsage(sec) {
    const s = loadStats();
    s.dailyUsedSeconds += sec;
    saveStats(s);
    return s;
  }

  const fmtDuration = (t) => {
    const m = Math.round(t / 60);
    if (m < 60) return `${m} min`;
    const h = Math.floor(m / 60), r = m % 60;
    return r ? `${h}h ${r}m` : `${h}h`;
  };

  const QUOTES = [
    'The scroll will still be there. Your afternoon won’t.',
    'You opened this out of habit, not hunger.',
    'Nothing on the other side of this is worth your next hour.',
    'Boredom is where your real ideas start.',
    'Future you is begging you to close the tab.',
    'One reel is never one reel.',
    'Do the thing you opened your phone to avoid.',
  ];
  const randomQuote = () => QUOTES[Math.floor(Math.random() * QUOTES.length)];

  /* ------------------------------------------------------------------ *
   *  Styles.
   * ------------------------------------------------------------------ */
  function injectStyle() {
    if (document.getElementById('reclaim-style')) return;
    const css = `
      .reclaim-hide{display:none!important}
      html[data-reclaim-blocked]{overflow:hidden!important}
      #reclaim-overlay{position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;padding:24px;
        background:radial-gradient(1200px 600px at 50% -10%,#1d2b4a 0%,#0b1220 55%,#060a12 100%);
        font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:#eaf0ff;-webkit-font-smoothing:antialiased;animation:reclaimfade .25s ease-out}
      @keyframes reclaimfade{from{opacity:0}to{opacity:1}}
      #reclaim-overlay .rc{width:min(520px,100%);text-align:center;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:22px;padding:40px 28px;box-shadow:0 30px 80px rgba(0,0,0,.55)}
      #reclaim-overlay .rl{font-weight:800;letter-spacing:.14em;text-transform:uppercase;font-size:13px;color:#7aa2ff;margin-bottom:16px}
      #reclaim-overlay .rs{font-size:44px;line-height:1}
      #reclaim-overlay h1{font-size:24px;font-weight:800;margin:12px 0 8px}
      #reclaim-overlay .rq{font-size:17px;line-height:1.5;color:#b7c4e0;margin:0 auto 24px;max-width:40ch}
      #reclaim-overlay .rst{display:flex;gap:10px;justify-content:center;margin-bottom:26px}
      #reclaim-overlay .rstat{flex:1;background:rgba(255,255,255,.05);border-radius:14px;padding:14px 6px}
      #reclaim-overlay .rn{display:block;font-size:22px;font-weight:800;color:#fff}
      #reclaim-overlay .rlb{display:block;font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#8ba0c6;margin-top:4px}
      #reclaim-overlay .ra{display:flex;flex-direction:column;gap:12px}
      #reclaim-overlay button{appearance:none;border:0;border-radius:12px;padding:14px 20px;font-size:15px;font-weight:700;cursor:pointer}
      #reclaim-overlay .rp{background:linear-gradient(180deg,#5b8bff,#3f6fe6);color:#fff;box-shadow:0 10px 24px rgba(63,111,230,.4)}
      #reclaim-overlay .rg{background:transparent;color:#9fb0d4;border:1px solid rgba(255,255,255,.12)}
      #reclaim-overlay .rg:disabled{opacity:.45;cursor:not-allowed}
      #reclaim-overlay .rallow{font-size:12px;color:#7c8bab;margin-top:2px}`;
    const st = document.createElement('style');
    st.id = 'reclaim-style';
    st.textContent = css;
    (document.head || document.documentElement).appendChild(st);
  }

  /* ------------------------------------------------------------------ *
   *  Intervention overlay.
   * ------------------------------------------------------------------ */
  let overlayUp = false;
  let allowanceTimer = null;

  function clearOverlay() {
    const el = document.getElementById('reclaim-overlay');
    if (el) el.remove();
    document.documentElement.removeAttribute('data-reclaim-blocked');
    overlayUp = false;
    if (allowanceTimer) { clearInterval(allowanceTimer); allowanceTimer = null; }
  }

  function mountIntervention(platform, stats, onContinue) {
    injectStyle();
    document.documentElement.setAttribute('data-reclaim-blocked', '1');
    const label = platform === 'instagram' ? 'Instagram Reels' : 'YouTube Shorts';
    const allowanceSeconds = (CONFIG.dailyAllowanceMinutes || 0) * 60;
    const remaining = Math.max(0, allowanceSeconds - (stats.dailyUsedSeconds || 0));
    const canContinue = !!onContinue && allowanceSeconds > 0 && remaining > 0;

    const el = document.createElement('div');
    el.id = 'reclaim-overlay';
    el.innerHTML =
      '<div class="rc"><div class="rl">Reclaim</div><div class="rs">🛡️</div>' +
      '<h1>' + label + ' is blocked</h1><p class="rq">' + randomQuote() + '</p>' +
      '<div class="rst">' +
        '<div class="rstat"><span class="rn">' + (stats.streakDays || 0) + '</span><span class="rlb">day streak</span></div>' +
        '<div class="rstat"><span class="rn">' + (stats.interceptCount || 0) + '</span><span class="rlb">times stopped</span></div>' +
        '<div class="rstat"><span class="rn">' + fmtDuration(stats.secondsReclaimed || 0) + '</span><span class="rlb">reclaimed</span></div>' +
      '</div><div class="ra">' +
        '<button class="rp" data-r="leave">Take me somewhere better</button>' +
        (canContinue
          ? '<button class="rg" data-r="continue" disabled>Continue anyway <span data-r="pause"></span></button>' +
            '<div class="rallow">' + Math.round(remaining / 60) + ' min of daily allowance left</div>'
          : '') +
      '</div></div>';

    const attach = () => (document.body || document.documentElement).appendChild(el);
    if (document.body) attach();
    else document.addEventListener('DOMContentLoaded', attach, { once: true });

    el.querySelector('[data-r="leave"]').addEventListener('click', () => {
      window.location.replace(platform === 'instagram'
        ? 'https://www.instagram.com/'
        : 'https://m.youtube.com/feed/subscriptions');
    });

    if (canContinue) {
      const btn = el.querySelector('[data-r="continue"]');
      const pauseEl = el.querySelector('[data-r="pause"]');
      let left = Math.max(0, CONFIG.pauseSeconds || 0);
      (function tick() {
        if (left <= 0) { btn.disabled = false; pauseEl.textContent = ''; return; }
        pauseEl.textContent = '(' + left + 's)';
        left -= 1;
        setTimeout(tick, 1000);
      })();
      btn.addEventListener('click', () => { if (!btn.disabled) onContinue(el); });
    }
    return el;
  }

  function startAllowanceMeter(reEnforce) {
    if (allowanceTimer) clearInterval(allowanceTimer);
    allowanceTimer = setInterval(() => {
      if (document.hidden) return;
      const s = addAllowanceUsage(5);
      if (s.dailyUsedSeconds >= (CONFIG.dailyAllowanceMinutes || 0) * 60) {
        clearInterval(allowanceTimer); allowanceTimer = null;
        reEnforce(true);
      }
    }, 5000);
  }

  /* ------------------------------------------------------------------ *
   *  Platform enforcement.
   * ------------------------------------------------------------------ */
  const host = location.hostname;
  const isInstagram = /(^|\.)instagram\.com$/.test(host);
  const isYouTube = /(^|\.)youtube\.com$/.test(host);

  const igBlocked = (p) => /^\/reels(\/|$)/.test(p) || /^\/reel\//.test(p);
  const ytShorts = (p) => /^\/shorts\//.test(p);
  const ytShortsId = (p) => { const m = p.match(/^\/shorts\/([^/?#]+)/); return m ? m[1] : null; };

  function enforce(force) {
    if (isInstagram) {
      if (!CONFIG.blockInstagramReels) return;
      if (!igBlocked(location.pathname)) { if (overlayUp) clearOverlay(); return; }
      if (overlayUp && !force) return;
      overlayUp = true;
      const stats = recordIntercept();
      const remaining = (CONFIG.dailyAllowanceMinutes || 0) * 60 - (stats.dailyUsedSeconds || 0);
      const onContinue = (remaining > 0 && CONFIG.interventionEnabled)
        ? (el) => { el.remove(); document.documentElement.removeAttribute('data-reclaim-blocked'); overlayUp = false; startAllowanceMeter(enforce); }
        : null;
      clearOverlay();
      mountIntervention('instagram', stats, onContinue);
      overlayUp = true;
    } else if (isYouTube) {
      if (!CONFIG.blockYouTubeShorts) return;
      if (!ytShorts(location.pathname)) { if (overlayUp) clearOverlay(); return; }
      if (CONFIG.youtubeShortsMode === 'redirect') {
        const id = ytShortsId(location.pathname);
        if (id) { recordIntercept(); location.replace('https://www.youtube.com/watch?v=' + id); return; }
      }
      if (overlayUp && !force) return;
      overlayUp = true;
      const stats = recordIntercept();
      const remaining = (CONFIG.dailyAllowanceMinutes || 0) * 60 - (stats.dailyUsedSeconds || 0);
      const onContinue = (remaining > 0 && CONFIG.interventionEnabled)
        ? (el) => { el.remove(); document.documentElement.removeAttribute('data-reclaim-blocked'); overlayUp = false; startAllowanceMeter(enforce); }
        : null;
      clearOverlay();
      mountIntervention('youtube', stats, onContinue);
      overlayUp = true;
    }
  }

  function hideChrome() {
    if (isInstagram) {
      const sel = [];
      if (CONFIG.blockInstagramReels) sel.push('a[href="/reels/"]', 'a[href^="/reels/"]');
      if (CONFIG.hideInstagramExplore) sel.push('a[href="/explore/"]', 'a[href^="/explore/"]');
      if (!sel.length) return;
      document.querySelectorAll(sel.join(',')).forEach((a) => {
        (a.closest('[role="listitem"], li, div[role="button"]') || a).classList.add('reclaim-hide');
      });
    } else if (isYouTube && CONFIG.blockYouTubeShorts) {
      document.querySelectorAll(
        'ytd-rich-shelf-renderer[is-shorts],ytd-reel-shelf-renderer,ytm-rich-shelf-renderer[data-is-shorts],grid-shelf-view-model,ytm-reel-shelf-renderer'
      ).forEach((n) => n.classList.add('reclaim-hide'));
      document.querySelectorAll(
        'ytd-guide-entry-renderer,ytd-mini-guide-entry-renderer,ytm-pivot-bar-item-renderer,yt-tab-shape,tp-yt-paper-tab'
      ).forEach((n) => {
        const t = (n.getAttribute('aria-label') || n.title || n.textContent || '').trim().toLowerCase();
        const link = n.querySelector && n.querySelector('a[href^="/shorts"],a[title="Shorts"]');
        if (t === 'shorts' || link) n.classList.add('reclaim-hide');
      });
      document.querySelectorAll('a[href^="/shorts/"]').forEach((a) => {
        const item = a.closest(
          'ytd-video-renderer,ytd-rich-item-renderer,ytd-grid-video-renderer,ytm-video-with-context-renderer,ytm-media-item,ytd-compact-video-renderer'
        );
        if (item) item.classList.add('reclaim-hide');
      });
    }
  }

  function onNavigate() { enforce(false); hideChrome(); }

  function hookHistory() {
    ['pushState', 'replaceState'].forEach((type) => {
      const orig = history[type];
      history[type] = function () {
        const r = orig.apply(this, arguments);
        window.dispatchEvent(new Event('reclaim:navigate'));
        return r;
      };
    });
    window.addEventListener('popstate', () => window.dispatchEvent(new Event('reclaim:navigate')));
    window.addEventListener('yt-navigate-finish', () => window.dispatchEvent(new Event('reclaim:navigate')));
    window.addEventListener('reclaim:navigate', onNavigate);
  }

  function init() {
    if (!isInstagram && !isYouTube) return;
    injectStyle();
    hookHistory();
    enforce(false);

    const mo = new MutationObserver(hideChrome);
    const start = () => mo.observe(document.documentElement, { childList: true, subtree: true });
    if (document.body) start();
    else document.addEventListener('DOMContentLoaded', start, { once: true });

    let last = location.pathname;
    setInterval(() => {
      if (location.pathname !== last) { last = location.pathname; onNavigate(); }
    }, 800);
  }

  init();
})();
