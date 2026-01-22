# Twitch Chrome Extensions

Two personal Chrome extensions for a better Twitch experience.

## Extensions

### 1. Twitch Auto Channel Points

Automatically clicks the green bonus channel points button when it appears on streams.

**Features:**
- Uses MutationObserver for instant detection
- Fallback interval checker for reliability
- Small delay before clicking to be less robotic

### 2. Twitch Low Latency Sync

Keeps your stream synced to the live edge so you're never behind.

**Features:**
- Automatically detects when you're behind the live edge
- Soft sync: speeds up playback slightly to catch up gradually
- Hard sync: jumps to live if you're way behind (>8 seconds)
- Re-syncs when you return to the tab after being away

**Configuration (in content.js):**
- `maxDelay`: Maximum acceptable delay from live (default: 3 seconds)
- `catchUpSpeed`: Playback speed when catching up (default: 1.05 = 5% faster)
- `softSyncThreshold`: Delay threshold to trigger hard sync (default: 8 seconds)

## Installation

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the extension folder (`twitch-auto-points` or `twitch-low-latency`)
5. The extension will now be active on Twitch

## Usage

Just navigate to any Twitch stream. The extensions work automatically in the background.

- **Auto Points**: No action needed - bonus points will be claimed automatically
- **Low Latency**: Stream will stay synced - you can enable debug mode in the config to see logs
