// Twitch Low Latency Sync
// Keeps the stream synced to the live edge to minimize delay

(function() {
  'use strict';

  const CONFIG = {
    // How often to check if we need to sync (ms)
    checkInterval: 5000,
    // Maximum acceptable delay from live edge (seconds)
    maxDelay: 3,
    // Speed boost when catching up (1.0 = normal, 1.1 = 10% faster)
    catchUpSpeed: 1.05,
    // Threshold to trigger speed catchup vs hard sync (seconds)
    softSyncThreshold: 8,
    // Debug mode
    debug: false
  };

  let isActive = true;
  let player = null;

  function log(...args) {
    if (CONFIG.debug) {
      console.log('[Low Latency Sync]', ...args);
    }
  }

  // Get the video element
  function getVideoElement() {
    return document.querySelector('video');
  }

  // Try to get Twitch's internal player API
  function getTwitchPlayer() {
    try {
      // Twitch stores player instance on the window
      const playerRoot = document.querySelector('.video-player');
      if (playerRoot && playerRoot.__reactFiber$) {
        // Navigate React fiber to find player
        let fiber = playerRoot.__reactFiber$;
        while (fiber) {
          if (fiber.memoizedProps?.mediaPlayerInstance) {
            return fiber.memoizedProps.mediaPlayerInstance;
          }
          if (fiber.memoizedState?.mediaPlayerInstance) {
            return fiber.memoizedState.mediaPlayerInstance;
          }
          fiber = fiber.return;
        }
      }
    } catch (e) {
      log('Could not access Twitch player API:', e);
    }
    return null;
  }

  // Calculate delay from live edge
  function getDelayFromLive(video) {
    if (!video || !video.buffered || video.buffered.length === 0) {
      return null;
    }

    // The end of the buffer is roughly the live edge
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

  // Click the "Skip to Live" button if available
  function clickSkipToLive() {
    const skipButton = document.querySelector(
      'button[data-a-target="player-skip-to-live-button"],' +
      'button[aria-label*="Skip to Live"],' +
      '[data-a-target="player-seekbar-current-time"]'
    );

    if (skipButton) {
      log('Found Skip to Live button, clicking');
      skipButton.click();
      return true;
    }
    return false;
  }

  // Enable low latency mode in settings if available
  function enableLowLatencyMode() {
    try {
      // Try to find and enable low latency in player settings
      const settingsButton = document.querySelector('[data-a-target="player-settings-button"]');
      if (settingsButton) {
        // This is a simplified approach - full implementation would navigate the settings menu
        log('Settings button found - low latency can be enabled manually in Settings > Advanced > Low Latency');
      }
    } catch (e) {
      log('Could not auto-enable low latency mode:', e);
    }
  }

  // Main sync check function
  function checkAndSync() {
    if (!isActive) return;

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

  // Initialize
  function init() {
    log('Twitch Low Latency Sync initialized');
    log('Max acceptable delay:', CONFIG.maxDelay, 's');

    // Start periodic sync checks
    setInterval(checkAndSync, CONFIG.checkInterval);

    // Initial check after a short delay to let the player load
    setTimeout(() => {
      checkAndSync();
      enableLowLatencyMode();
    }, 3000);

    // Also sync when visibility changes (user returns to tab)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        log('Tab became visible, checking sync');
        setTimeout(checkAndSync, 1000);
      }
    });

    // Listen for video element changes
    const observer = new MutationObserver((mutations) => {
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
