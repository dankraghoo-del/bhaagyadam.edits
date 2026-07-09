/* Reclaim — YouTube Shorts enforcement */
(() => {
  const R = window.__reclaim;
  let settings = null;
  let stats = null;
  let overlayUp = false;
  let allowanceTimer = null;

  const isShortsPath = (path) => /^\/shorts\//.test(path);
  const shortsIdFromPath = (path) => {
    const m = path.match(/^\/shorts\/([^/?#]+)/);
    return m ? m[1] : null;
  };

  function clearOverlay() {
    const el = document.getElementById('reclaim-overlay');
    if (el) el.remove();
    document.documentElement.removeAttribute('data-reclaim-blocked');
    overlayUp = false;
    if (allowanceTimer) { clearInterval(allowanceTimer); allowanceTimer = null; }
  }

  function startAllowanceMeter() {
    if (allowanceTimer) clearInterval(allowanceTimer);
    allowanceTimer = setInterval(async () => {
      if (document.hidden) return;
      stats = await R.addAllowanceUsage(5);
      const allowed = (settings.dailyAllowanceMinutes || 0) * 60;
      if (stats.dailyUsedSeconds >= allowed) {
        clearInterval(allowanceTimer);
        allowanceTimer = null;
        enforce(true);
      }
    }, 5000);
  }

  async function enforce(force = false) {
    if (!settings || !settings.enabled || !settings.blockYouTubeShorts) return;
    if (!isShortsPath(location.pathname)) { if (overlayUp) clearOverlay(); return; }

    // Redirect mode: convert the swipe feed into a single normal video page.
    // You still get to watch the one thing you clicked — but the endless
    // vertical feed and its autoplay-next loop are gone.
    if (settings.youtubeShortsMode === 'redirect') {
      const id = shortsIdFromPath(location.pathname);
      if (id) {
        await R.recordIntercept(settings);
        location.replace(`https://www.youtube.com/watch?v=${id}`);
        return;
      }
    }

    if (overlayUp && !force) return;
    overlayUp = true; // claim synchronously so rapid SPA events don't double-count
    stats = await R.recordIntercept(settings);

    const allowanceSeconds = (settings.dailyAllowanceMinutes || 0) * 60;
    const remaining = allowanceSeconds - (stats.dailyUsedSeconds || 0);
    const onContinue = (remaining > 0 && settings.interventionEnabled)
      ? (el) => { el.remove(); document.documentElement.removeAttribute('data-reclaim-blocked'); overlayUp = false; startAllowanceMeter(); }
      : null;

    clearOverlay();
    R.mountIntervention({ platform: 'youtube', settings, stats, onContinue });
    overlayUp = true;
  }

  // Strip Shorts shelves, nav entries and feed items across desktop + mobile.
  function hideChrome() {
    if (!settings || !settings.enabled || !settings.blockYouTubeShorts) return;

    // Whole Shorts shelves.
    document.querySelectorAll(
      'ytd-rich-shelf-renderer[is-shorts], ytd-reel-shelf-renderer, ' +
      'ytm-rich-shelf-renderer[data-is-shorts], grid-shelf-view-model'
    ).forEach((n) => n.classList.add('reclaim-hide'));

    // Nav entries (sidebar, mini sidebar, mobile pivot bar).
    document.querySelectorAll(
      'ytd-guide-entry-renderer, ytd-mini-guide-entry-renderer, ' +
      'ytm-pivot-bar-item-renderer, yt-tab-shape, tp-yt-paper-tab'
    ).forEach((n) => {
      const t = (n.getAttribute('aria-label') || n.title || n.textContent || '').trim().toLowerCase();
      const link = n.querySelector && n.querySelector('a[href^="/shorts"], a[title="Shorts"]');
      if (t === 'shorts' || link) n.classList.add('reclaim-hide');
    });

    // Individual Shorts cards scattered through feeds and search results.
    document.querySelectorAll('a[href^="/shorts/"]').forEach((a) => {
      const item = a.closest(
        'ytd-video-renderer, ytd-rich-item-renderer, ytd-grid-video-renderer, ' +
        'ytm-video-with-context-renderer, ytm-media-item, ytd-compact-video-renderer'
      );
      if (item) item.classList.add('reclaim-hide');
    });
  }

  function onNavigate() {
    enforce();
    hideChrome();
  }

  function hookHistory() {
    const wrap = (type) => {
      const orig = history[type];
      history[type] = function (...args) {
        const ret = orig.apply(this, args);
        window.dispatchEvent(new Event('reclaim:navigate'));
        return ret;
      };
    };
    wrap('pushState');
    wrap('replaceState');
    window.addEventListener('popstate', () => window.dispatchEvent(new Event('reclaim:navigate')));
    // YouTube fires this on every SPA route change.
    window.addEventListener('yt-navigate-finish', () => window.dispatchEvent(new Event('reclaim:navigate')));
    window.addEventListener('reclaim:navigate', onNavigate);
  }

  async function init() {
    const state = await R.getState();
    settings = state.settings;
    stats = state.stats;

    hookHistory();
    enforce();

    const mo = new MutationObserver(() => hideChrome());
    const startObserving = () => mo.observe(document.documentElement, { childList: true, subtree: true });
    if (document.body) startObserving();
    else document.addEventListener('DOMContentLoaded', startObserving, { once: true });

    let lastPath = location.pathname;
    setInterval(() => {
      if (location.pathname !== lastPath) {
        lastPath = location.pathname;
        onNavigate();
      }
    }, 800);

    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'local' || !changes.settings) return;
      settings = Object.assign({}, R.DEFAULTS, changes.settings.newValue || {});
      clearOverlay();
      onNavigate();
    });
  }

  init();
})();
