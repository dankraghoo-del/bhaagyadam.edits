/* Reclaim — popup dashboard */
const R = window.__reclaim;

const els = {
  enabled: document.getElementById('enabled'),
  streak: document.getElementById('streak'),
  heroSub: document.getElementById('heroSub'),
  intercepts: document.getElementById('intercepts'),
  reclaimed: document.getElementById('reclaimed'),
  allowance: document.getElementById('allowance'),
  blockInstagramReels: document.getElementById('blockInstagramReels'),
  blockYouTubeShorts: document.getElementById('blockYouTubeShorts'),
  youtubeRedirect: document.getElementById('youtubeRedirect'),
  openOptions: document.getElementById('openOptions'),
};

let settings = null;

async function saveSettings(patch) {
  settings = Object.assign({}, settings, patch);
  await chrome.storage.local.set({ settings });
}

function render(stats) {
  els.enabled.checked = settings.enabled !== false;
  els.blockInstagramReels.checked = !!settings.blockInstagramReels;
  els.blockYouTubeShorts.checked = !!settings.blockYouTubeShorts;
  els.youtubeRedirect.checked = settings.youtubeShortsMode === 'redirect';

  els.streak.textContent = stats.streakDays || 0;
  els.intercepts.textContent = stats.interceptCount || 0;
  els.reclaimed.textContent = R.fmtDuration(stats.secondsReclaimed || 0);

  const allowMin = settings.dailyAllowanceMinutes || 0;
  if (allowMin > 0) {
    const usedMin = Math.round((stats.dailyUsedSeconds || 0) / 60);
    els.allowance.textContent = `${Math.max(0, allowMin - usedMin)}m`;
  } else {
    els.allowance.textContent = 'Off';
  }

  document.body.style.opacity = settings.enabled === false ? '0.6' : '1';
  els.heroSub.textContent = settings.enabled === false
    ? 'Paused — nothing is blocked'
    : 'Blocking Reels & Shorts';
}

async function refresh() {
  const state = await R.getState();
  settings = state.settings;
  render(state.stats);
}

els.enabled.addEventListener('change', async () => {
  await saveSettings({ enabled: els.enabled.checked });
  refresh();
});
els.blockInstagramReels.addEventListener('change', async () => {
  await saveSettings({ blockInstagramReels: els.blockInstagramReels.checked });
  refresh();
});
els.blockYouTubeShorts.addEventListener('change', async () => {
  await saveSettings({ blockYouTubeShorts: els.blockYouTubeShorts.checked });
  refresh();
});
els.youtubeRedirect.addEventListener('change', async () => {
  await saveSettings({ youtubeShortsMode: els.youtubeRedirect.checked ? 'redirect' : 'block' });
  refresh();
});
els.openOptions.addEventListener('click', () => chrome.runtime.openOptionsPage());

refresh();
