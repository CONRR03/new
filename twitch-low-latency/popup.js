// Default settings
const DEFAULTS = {
  enabled: true,
  maxDelay: '3',
  catchUpSpeed: '1.05',
  softSyncThreshold: '8',
  checkInterval: 5,
  debug: false
};

// Load settings when popup opens
document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.sync.get(DEFAULTS, (settings) => {
    document.getElementById('enabled').checked = settings.enabled;
    document.getElementById('maxDelay').value = settings.maxDelay;
    document.getElementById('catchUpSpeed').value = settings.catchUpSpeed;
    document.getElementById('softSyncThreshold').value = settings.softSyncThreshold;
    document.getElementById('checkInterval').value = settings.checkInterval;
    document.getElementById('checkIntervalValue').textContent = settings.checkInterval + 's';
    document.getElementById('debug').checked = settings.debug;
  });

  // Update range display
  document.getElementById('checkInterval').addEventListener('input', (e) => {
    document.getElementById('checkIntervalValue').textContent = e.target.value + 's';
  });

  // Save on any change
  const inputs = document.querySelectorAll('select, input');
  inputs.forEach(input => {
    input.addEventListener('change', saveSettings);
  });
});

function saveSettings() {
  const settings = {
    enabled: document.getElementById('enabled').checked,
    maxDelay: document.getElementById('maxDelay').value,
    catchUpSpeed: document.getElementById('catchUpSpeed').value,
    softSyncThreshold: document.getElementById('softSyncThreshold').value,
    checkInterval: parseInt(document.getElementById('checkInterval').value),
    debug: document.getElementById('debug').checked
  };

  chrome.storage.sync.set(settings, () => {
    // Show saved message
    const saved = document.getElementById('saved');
    saved.classList.add('show');
    setTimeout(() => saved.classList.remove('show'), 1500);

    // Notify content script to reload settings
    chrome.tabs.query({ url: 'https://www.twitch.tv/*' }, (tabs) => {
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, { type: 'SETTINGS_UPDATED', settings });
      });
    });
  });
}
