// Twitch Low Latency Sync
// Keeps the stream synced to the live edge to minimize delay

(function() {
  'use strict';

  // Default config - will be overridden by saved settings
  let CONFIG = {
    enabled: true,
    checkInterval: 5000,
    maxDelay: 3,
    catchUpSpeed: 1.05,
    softSyncThreshold: 8,
    debug: false
  };

  let syncInterval = null;

  function log(...args) {
    if (CONFIG.debug) {
      console.log('[Low Latency Sync]', ...args);
    }
  }

  // Load settings from storage
  function loadSettings() {
    return new Promise((resolve) => {
      if (chrome.storage && chrome.storage.sync) {
        chrome.storage.sync.get({
          enabled: true,
          maxDelay: '3',
          catchUpSpeed: '1.05',
          softSyncThreshold: '8',
          checkInterval: 5,
          debug: false
        }, (settings) => {
          CONFIG.enabled = settings.enabled;
          CONFIG.maxDelay = parseFloat(settings.maxDelay);
          CONFIG.catchUpSpeed = parseFloat(settings.catchUpSpeed);
          CONFIG.softSyncThreshold = parseFloat(settings.softSyncThreshold);
          CONFIG.checkInterval = settings.checkInterval * 1000;
          CONFIG.debug = settings.debug;
          log('Settings loaded:', CONFIG);
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  // Listen for settings updates from popup
  if (chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'SETTINGS_UPDATED') {
        log('Settings updated from popup');
        CONFIG.enabled = message.settings.enabled;
        CONFIG.maxDelay = parseFloat(message.settings.maxDelay);
        CONFIG.catchUpSpeed = parseFloat(message.settings.catchUpSpeed);
        CONFIG.softSyncThreshold = parseFloat(message.settings.softSyncThreshold);
        CONFIG.checkInterval = message.settings.checkInterval * 1000;
        CONFIG.debug = message.settings.debug;

        // Restart the interval with new timing
        restartSyncInterval();
        log('New settings applied:', CONFIG);
      }
    });
  }

  // Get the video element
  function getVideoElement() {
    return document.querySelector('video');
  }

  // Calculate delay from live edge
  function getDelayFromLive(video) {
    if (!video || !video.buffered || video.buffered.length === 0) {
      return null;
    }

    const bufferEnd = video.buffered.end(video.buffered.length - 1);
    const currentTime = video.currentTime;
    const delay = bufferEnd - currentTime;

    return delay;
  }

  // Sync to live edge
  function syncToLive(video, delay) {
    if (!video) return;

    const bufferEnd = video.buffered.end(video.buffered.length - 1);

    if (delay > CONFIG.softSyncThreshold) {
      // Hard sync - jump directly to near live
      log('Hard sync: jumping to live edge (delay was', delay.toFixed(1), 's)');
      video.currentTime = bufferEnd - 1;
      video.playbackRate = 1.0;
    } else if (delay > CONFIG.maxDelay) {
      // Soft sync - speed up playback to catch up gradually
      if (video.playbackRate !== CONFIG.catchUpSpeed) {
        log('Soft sync: speeding up to catch up (delay:', delay.toFixed(1), 's)');
        video.playbackRate = CONFIG.catchUpSpeed;
      }
    } else {
      // We're caught up, ensure normal speed
      if (video.playbackRate !== 1.0) {
        log('Caught up! Returning to normal speed (delay:', delay.toFixed(1), 's)');
        video.playbackRate = 1.0;
      }
    }
  }

  // Main sync check function
  function checkAndSync() {
    if (!CONFIG.enabled) {
      log('Extension disabled, skipping sync');
      return;
    }

    const video = getVideoElement();
    if (!video) {
      log('No video element found');
      return;
    }

    // Only sync for live streams
    if (video.duration === Infinity || isNaN(video.duration)) {
      const delay = getDelayFromLive(video);

      if (delay !== null) {
        log('Current delay from live:', delay.toFixed(1), 's');

        if (delay > CONFIG.maxDelay) {
          syncToLive(video, delay);
        }
      }
    } else {
      log('Not a live stream, skipping sync');
    }
  }

  // Restart the sync interval (called when settings change)
  function restartSyncInterval() {
    if (syncInterval) {
      clearInterval(syncInterval);
    }
    syncInterval = setInterval(checkAndSync, CONFIG.checkInterval);
    log('Sync interval restarted:', CONFIG.checkInterval, 'ms');
  }

  // Initialize
  async function init() {
    await loadSettings();

    log('Twitch Low Latency Sync initialized');
    log('Max acceptable delay:', CONFIG.maxDelay, 's');
    log('Enabled:', CONFIG.enabled);

    // Start periodic sync checks
    restartSyncInterval();

    // Initial check after a short delay to let the player load
    setTimeout(checkAndSync, 3000);

    // Sync when visibility changes (user returns to tab)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        log('Tab became visible, checking sync');
        setTimeout(checkAndSync, 1000);
      }
    });

    // Listen for video element changes
    const observer = new MutationObserver(() => {
      const video = getVideoElement();
      if (video && !video.hasAttribute('data-low-latency-init')) {
        video.setAttribute('data-low-latency-init', 'true');
        log('New video element detected, will sync');
        setTimeout(checkAndSync, 2000);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  // Wait for page to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
