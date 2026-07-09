/*
 * Reclaim — shared helpers used by both content scripts.
 * Exposes a single global: window.__reclaim
 */
(() => {
  if (window.__reclaim) return; // guard against double injection

  const DEFAULTS = {
    enabled: true,
    blockInstagramReels: true,
    blockYouTubeShorts: true,
    // 'block'   -> hard intervention overlay, no access
    // 'redirect'-> on YouTube, turn /shorts/ID into /watch?v=ID (kills the swipe feed)
    youtubeShortsMode: 'block',
    hideInstagramExplore: false,
    interventionEnabled: true,
    pauseSeconds: 10,
    // 0 = no allowance (fully blocked). > 0 = minutes of scroll permitted per day.
    dailyAllowanceMinutes: 0,
    // rough estimate: minutes of scrolling avoided each time we stop you diving in.
    minutesPerIntercept: 5,
  };

  const STAT_DEFAULTS = {
    interceptCount: 0,
    secondsReclaimed: 0,
    streakDays: 0,
    lastActiveDate: '',   // last day the user actually hit a block (streak anchor)
    dayKey: '',           // YYYY-MM-DD the allowance counter belongs to
    dailyUsedSeconds: 0,  // allowance spent today
  };

  const todayKey = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const daysBetween = (a, b) => {
    if (!a || !b) return null;
    const da = new Date(a + 'T00:00:00');
    const db = new Date(b + 'T00:00:00');
    return Math.round((db - da) / 86400000);
  };

  async function getState() {
    const stored = await chrome.storage.local.get(['settings', 'stats']);
    const settings = Object.assign({}, DEFAULTS, stored.settings || {});
    let stats = Object.assign({}, STAT_DEFAULTS, stored.stats || {});

    // Roll the daily allowance counter over at midnight.
    const tk = todayKey();
    if (stats.dayKey !== tk) {
      stats.dayKey = tk;
      stats.dailyUsedSeconds = 0;
    }
    return { settings, stats };
  }

  async function saveStats(stats) {
    await chrome.storage.local.set({ stats });
  }

  // Called when we actually stop the user from entering a feed.
  async function recordIntercept(settings) {
    const { stats } = await getState();
    stats.interceptCount += 1;
    stats.secondsReclaimed += (settings.minutesPerIntercept || 5) * 60;

    // Streak: increments the first time you get blocked on a new calendar day,
    // as long as you didn't skip a day.
    const tk = todayKey();
    if (stats.lastActiveDate !== tk) {
      const gap = daysBetween(stats.lastActiveDate, tk);
      if (gap === 1 || stats.lastActiveDate === '') {
        stats.streakDays += 1;
      } else if (gap !== null && gap > 1) {
        stats.streakDays = 1; // missed a day, restart
      } else if (gap === null) {
        stats.streakDays = 1;
      }
      stats.lastActiveDate = tk;
    }
    await saveStats(stats);
    return stats;
  }

  async function addAllowanceUsage(seconds) {
    const { stats } = await getState();
    stats.dailyUsedSeconds += seconds;
    await saveStats(stats);
    return stats;
  }

  function fmtDuration(totalSeconds) {
    const m = Math.round(totalSeconds / 60);
    if (m < 60) return `${m} min`;
    const h = Math.floor(m / 60);
    const rem = m % 60;
    return rem ? `${h}h ${rem}m` : `${h}h`;
  }

  const QUOTES = [
    'The scroll will still be there. Your afternoon won’t.',
    'You opened this out of habit, not hunger.',
    'Nothing on the other side of this is worth your next hour.',
    'Boredom is where your real ideas start.',
    'Future you is begging you to close the tab.',
    'You are the product when you scroll. Log off, be a person.',
    'One reel is never one reel.',
    'Do the thing you opened your phone to avoid.',
  ];
  const randomQuote = () => QUOTES[Math.floor(Math.random() * QUOTES.length)];

  // Build & mount the full-screen intervention overlay.
  // Returns the overlay element. onContinue is only wired up when allowance remains.
  function mountIntervention({ platform, settings, stats, onContinue }) {
    // Nuke whatever the page was rendering behind us.
    try { document.documentElement.setAttribute('data-reclaim-blocked', '1'); } catch (_) {}

    const label = platform === 'instagram' ? 'Instagram Reels' : 'YouTube Shorts';
    const allowanceSeconds = (settings.dailyAllowanceMinutes || 0) * 60;
    const usedSeconds = stats.dailyUsedSeconds || 0;
    const remainingSeconds = Math.max(0, allowanceSeconds - usedSeconds);
    const canContinue = !!onContinue && allowanceSeconds > 0 && remainingSeconds > 0;

    const el = document.createElement('div');
    el.id = 'reclaim-overlay';
    el.innerHTML = `
      <div class="reclaim-card">
        <div class="reclaim-logo">Reclaim</div>
        <div class="reclaim-shield" aria-hidden="true">🛡️</div>
        <h1 class="reclaim-title">${label} is blocked</h1>
        <p class="reclaim-quote">${randomQuote()}</p>

        <div class="reclaim-stats">
          <div class="reclaim-stat">
            <span class="reclaim-stat-num" data-r="streak">${stats.streakDays || 0}</span>
            <span class="reclaim-stat-label">day streak</span>
          </div>
          <div class="reclaim-stat">
            <span class="reclaim-stat-num" data-r="intercepts">${stats.interceptCount || 0}</span>
            <span class="reclaim-stat-label">times stopped</span>
          </div>
          <div class="reclaim-stat">
            <span class="reclaim-stat-num" data-r="time">${fmtDuration(stats.secondsReclaimed || 0)}</span>
            <span class="reclaim-stat-label">reclaimed</span>
          </div>
        </div>

        <div class="reclaim-actions">
          <button class="reclaim-btn reclaim-btn-primary" data-r="leave">Take me somewhere better</button>
          ${canContinue ? `<button class="reclaim-btn reclaim-btn-ghost" data-r="continue" disabled>
              Continue anyway <span data-r="pause"></span>
            </button>
            <div class="reclaim-allowance">${Math.round(remainingSeconds / 60)} min of daily allowance left</div>` : ''}
        </div>
      </div>`;

    const attach = () => (document.body || document.documentElement).appendChild(el);
    if (document.body) attach();
    else document.addEventListener('DOMContentLoaded', attach, { once: true });

    // Primary action: go home. instagram.com / youtube.com feels less punishing
    // than a blank tab and keeps the user inside a "safe" surface.
    el.querySelector('[data-r="leave"]').addEventListener('click', () => {
      const home = platform === 'instagram'
        ? 'https://www.instagram.com/'
        : 'https://www.youtube.com/feed/subscriptions';
      window.location.replace(home);
    });

    // Optional "continue" gated behind a breathing countdown.
    if (canContinue) {
      const btn = el.querySelector('[data-r="continue"]');
      const pauseEl = el.querySelector('[data-r="pause"]');
      let left = Math.max(0, settings.pauseSeconds || 0);
      const tick = () => {
        if (left <= 0) {
          btn.disabled = false;
          pauseEl.textContent = '';
          return;
        }
        pauseEl.textContent = `(${left}s)`;
        left -= 1;
        setTimeout(tick, 1000);
      };
      tick();
      btn.addEventListener('click', () => { if (!btn.disabled) onContinue(el); });
    }

    return el;
  }

  window.__reclaim = {
    DEFAULTS,
    getState,
    saveStats,
    recordIntercept,
    addAllowanceUsage,
    fmtDuration,
    randomQuote,
    todayKey,
    mountIntervention,
  };
})();
