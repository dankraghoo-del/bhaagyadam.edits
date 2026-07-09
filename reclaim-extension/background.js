/* Reclaim — background service worker */

const DEFAULT_SETTINGS = {
  enabled: true,
  blockInstagramReels: true,
  blockYouTubeShorts: true,
  youtubeShortsMode: 'block',
  hideInstagramExplore: false,
  interventionEnabled: true,
  pauseSeconds: 10,
  dailyAllowanceMinutes: 0,
  minutesPerIntercept: 5,
};

// Seed settings on first install so the content scripts have something to read.
chrome.runtime.onInstalled.addListener(async () => {
  const { settings } = await chrome.storage.local.get('settings');
  if (!settings) {
    await chrome.storage.local.set({ settings: DEFAULT_SETTINGS });
  }
  updateBadge();
});

chrome.runtime.onStartup.addListener(updateBadge);

// Reflect the current day-streak on the toolbar icon.
async function updateBadge() {
  const { stats, settings } = await chrome.storage.local.get(['stats', 'settings']);
  const enabled = !settings || settings.enabled !== false;
  const streak = (stats && stats.streakDays) || 0;
  chrome.action.setBadgeBackgroundColor({ color: enabled ? '#3f6fe6' : '#8a8a8a' });
  chrome.action.setBadgeText({ text: streak > 0 ? String(streak) : '' });
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && (changes.stats || changes.settings)) updateBadge();
});
