/* Reclaim — options page */
const R = window.__reclaim;

const checkboxes = ['enabled', 'blockInstagramReels', 'hideInstagramExplore', 'blockYouTubeShorts', 'interventionEnabled'];
const numbers = ['pauseSeconds', 'dailyAllowanceMinutes'];
const selects = ['youtubeShortsMode'];

let settings = null;

function flashSaved() {
  const m = document.getElementById('savedMsg');
  m.classList.add('show');
  setTimeout(() => m.classList.remove('show'), 900);
}

async function save(patch) {
  settings = Object.assign({}, settings, patch);
  await chrome.storage.local.set({ settings });
  flashSaved();
}

function renderStats(stats) {
  document.getElementById('statsLine').textContent =
    `${stats.streakDays || 0}-day streak · stopped ${stats.interceptCount || 0} times · ` +
    `${R.fmtDuration(stats.secondsReclaimed || 0)} reclaimed`;
}

async function load() {
  const state = await R.getState();
  settings = state.settings;

  checkboxes.forEach((id) => { document.getElementById(id).checked = !!settings[id]; });
  numbers.forEach((id) => { document.getElementById(id).value = settings[id]; });
  selects.forEach((id) => { document.getElementById(id).value = settings[id]; });

  renderStats(state.stats);
}

checkboxes.forEach((id) => {
  document.getElementById(id).addEventListener('change', (e) => save({ [id]: e.target.checked }));
});
numbers.forEach((id) => {
  document.getElementById(id).addEventListener('change', (e) => {
    let v = parseInt(e.target.value, 10);
    if (isNaN(v) || v < 0) v = 0;
    e.target.value = v;
    save({ [id]: v });
  });
});
selects.forEach((id) => {
  document.getElementById(id).addEventListener('change', (e) => save({ [id]: e.target.value }));
});

document.getElementById('resetStats').addEventListener('click', async () => {
  if (!confirm('Reset your streak and all stats to zero?')) return;
  await chrome.storage.local.set({
    stats: {
      interceptCount: 0, secondsReclaimed: 0, streakDays: 0,
      lastActiveDate: '', dayKey: R.todayKey(), dailyUsedSeconds: 0,
    },
  });
  load();
});

load();
