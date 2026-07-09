/* Reclaim — Instagram Reels enforcement */
(() => {
  const R = window.__reclaim;
  let settings = null;
  let stats = null;
  let overlayUp = false;
  let allowanceTimer = null;

  // The infinite-scroll surfaces we stop. A user's /username/reels/ grid is left
  // alone (it isn't the endless feed); tapping any tile from it lands on /reel/ID,
  // which IS blocked.
  const isBlockedPath = (path) =>
    /^\/reels(\/|$)/.test(path) || /^\/reel\//.test(path);

  function clearOverlay() {
    const el = document.getElementById('reclaim-overlay');
    if (el) el.remove();
    document.documentElement.removeAttribute('data-reclaim-blocked');
    overlayUp = false;
    if (allowanceTimer) { clearInterval(allowanceTimer); allowanceTimer = null; }
  }

  // Grant a timed pass by spending the daily allowance while the tab is visible.
  function startAllowanceMeter() {
    if (allowanceTimer) clearInterval(allowanceTimer);
    allowanceTimer = setInterval(async () => {
      if (document.hidden) return;
      stats = await R.addAllowanceUsage(5);
      const allowed = (settings.dailyAllowanceMinutes || 0) * 60;
      if (stats.dailyUsedSeconds >= allowed) {
        clearInterval(allowanceTimer);
        allowanceTimer = null;
        enforce(true); // allowance spent — slam the door again
      }
    }, 5000);
  }

  async function enforce(force = false) {
    if (!settings || !settings.enabled || !settings.blockInstagramReels) return;
    const onBlocked = isBlockedPath(location.pathname);

    if (!onBlocked) { if (overlayUp) clearOverlay(); return; }
    if (overlayUp && !force) return;
    overlayUp = true; // claim synchronously so rapid SPA events don't double-count

    stats = await R.recordIntercept(settings);

    const allowanceSeconds = (settings.dailyAllowanceMinutes || 0) * 60;
    const remaining = allowanceSeconds - (stats.dailyUsedSeconds || 0);
    const onContinue = (remaining > 0 && settings.interventionEnabled)
      ? (el) => { el.remove(); document.documentElement.removeAttribute('data-reclaim-blocked'); overlayUp = false; startAllowanceMeter(); }
      : null;

    clearOverlay();
    R.mountIntervention({ platform: 'instagram', settings, stats, onContinue });
    overlayUp = true;
  }

  // Best-effort removal of the Reels entry point + (optionally) Explore.
  function hideChrome() {
    if (!settings || !settings.enabled) return;
    const sel = [];
    if (settings.blockInstagramReels) {
      sel.push('a[href="/reels/"]', 'a[href^="/reels/"]');
    }
    if (settings.hideInstagramExplore) {
      sel.push('a[href="/explore/"]', 'a[href^="/explore/"]');
    }
    if (!sel.length) return;
    document.querySelectorAll(sel.join(',')).forEach((a) => {
      // Hide the whole nav row, not just the icon.
      const row = a.closest('[role="listitem"], li, div[role="button"]') || a;
      row.classList.add('reclaim-hide');
    });
  }

  function onNavigate() {
    enforce();
    hideChrome();
  }

  // Instagram is a single-page app; watch every route change.
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

    // Fallback: catch SPA transitions that don't go through history (rare) and
    // keep the chrome hidden as Instagram re-renders.
    let lastPath = location.pathname;
    setInterval(() => {
      if (location.pathname !== lastPath) {
        lastPath = location.pathname;
        onNavigate();
      }
    }, 800);

    // React live to settings changes from the popup/options page.
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'local' || !changes.settings) return;
      settings = Object.assign({}, R.DEFAULTS, changes.settings.newValue || {});
      clearOverlay();
      onNavigate();
    });
  }

  init();
})();
