// Twitch Auto Channel Points Collector
// Automatically clicks the bonus channel points button when it appears

(function() {
  'use strict';

  const CONFIG = {
    // How often to check for the bonus button (ms)
    checkInterval: 1000,
    // Delay before clicking to seem more natural (ms)
    clickDelay: 500,
    // Debug mode - logs to console
    debug: false
  };

  function log(...args) {
    if (CONFIG.debug) {
      console.log('[Auto Points]', ...args);
    }
  }

  // Selectors for the bonus channel points button
  // Twitch updates their UI occasionally, so we check multiple possible selectors
  const BONUS_BUTTON_SELECTORS = [
    // Main bonus button (the claimable bonus)
    'button[aria-label="Claim Bonus"]',
    'button.claimable-bonus__icon',
    // The clickable container for channel points bonus
    '[data-test-selector="community-points-summary"] button.tw-button--success',
    // Alternative selector for the green bonus icon
    '.community-points-summary button[aria-label*="laim"]',
    // Catch-all for any claimable bonus button in the points area
    '.community-points-summary .claimable-bonus__icon',
    // New UI selectors
    '[class*="claimable-bonus"]',
    'button[class*="ScCoreButtonSuccess"]'
  ];

  function findBonusButton() {
    for (const selector of BONUS_BUTTON_SELECTORS) {
      const button = document.querySelector(selector);
      if (button) {
        log('Found bonus button with selector:', selector);
        return button;
      }
    }
    return null;
  }

  function clickBonusButton() {
    const button = findBonusButton();

    if (button) {
      log('Bonus button found! Clicking in', CONFIG.clickDelay, 'ms');

      setTimeout(() => {
        try {
          button.click();
          log('Clicked bonus button!');
        } catch (e) {
          log('Error clicking button:', e);
        }
      }, CONFIG.clickDelay);

      return true;
    }

    return false;
  }

  // Use MutationObserver to detect when the bonus button appears
  function setupObserver() {
    const observer = new MutationObserver((mutations) => {
      // Check if any mutation added the bonus button
      for (const mutation of mutations) {
        if (mutation.addedNodes.length > 0) {
          clickBonusButton();
        }
      }
    });

    // Observe the entire document for changes
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    log('MutationObserver set up');
    return observer;
  }

  // Fallback interval checker in case observer misses it
  function setupIntervalChecker() {
    setInterval(() => {
      clickBonusButton();
    }, CONFIG.checkInterval);

    log('Interval checker set up, checking every', CONFIG.checkInterval, 'ms');
  }

  // Initialize the extension
  function init() {
    log('Twitch Auto Channel Points initialized');

    // Set up both methods for reliability
    setupObserver();
    setupIntervalChecker();

    // Initial check
    clickBonusButton();
  }

  // Wait for the page to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
