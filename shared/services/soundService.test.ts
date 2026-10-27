import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import soundService from './soundService.ts';

// Mock localStorage for Node test runner
const storage: Record<string, string> = {};
(globalThis as any).localStorage = {
  getItem: (k: string) => storage[k] ?? null,
  setItem: (k: string, v: string) => { storage[k] = String(v); },
  removeItem: (k: string) => { delete storage[k]; },
  clear: () => { Object.keys(storage).forEach(k => delete storage[k]); }
};

describe('SoundService', () => {
  beforeEach(() => {
    localStorage.clear();
    soundService.setEnabled(true);
    soundService.setVolume(0.7);
  });

  test('initializes with default enabled=true and volume=0.7', () => {
    assert.equal(soundService.isEnabled(), true);
    assert.equal(soundService.getVolume(), 0.7);
  });

  test('updates and persists enabled preference', () => {
    soundService.setEnabled(false);
    assert.equal(soundService.isEnabled(), false);
    assert.equal(localStorage.getItem('bizora_sound_enabled'), 'false');

    soundService.setEnabled(true);
    assert.equal(soundService.isEnabled(), true);
    assert.equal(localStorage.getItem('bizora_sound_enabled'), 'true');
  });

  test('clamps and persists volume between 0 and 1', () => {
    soundService.setVolume(0.5);
    assert.equal(soundService.getVolume(), 0.5);
    assert.equal(localStorage.getItem('bizora_sound_volume'), '0.50');

    soundService.setVolume(1.8);
    assert.equal(soundService.getVolume(), 1);

    soundService.setVolume(-0.4);
    assert.equal(soundService.getVolume(), 0);
  });

  test('safely handles play calls when audio context is unavailable or disabled', () => {
    soundService.setEnabled(false);
    assert.doesNotThrow(() => soundService.playNotification());
    assert.doesNotThrow(() => soundService.playSaleSuccess());
    assert.doesNotThrow(() => soundService.playOrderReceived());
    assert.doesNotThrow(() => soundService.playActionSuccess());
    assert.doesNotThrow(() => soundService.playWarning());
    assert.doesNotThrow(() => soundService.playScanSuccess());
    assert.doesNotThrow(() => soundService.playKitchenChime());
    assert.doesNotThrow(() => soundService.playPrinterBeep());
  });

  test('deduplicates notification sound plays by ID', () => {
    let playCount = 0;
    const origPlay = soundService.playNotification;
    soundService.playNotification = () => { playCount++; };

    try {
      soundService.playNotificationOnce('notif-101');
      assert.equal(playCount, 1);

      // Second call with same ID must be deduplicated
      soundService.playNotificationOnce('notif-101');
      assert.equal(playCount, 1);

      // Call with distinct ID plays
      soundService.playNotificationOnce('notif-102');
      assert.equal(playCount, 2);
    } finally {
      soundService.playNotification = origPlay;
    }
  });

  test('markNotificationAsSeen silences historical notifications loaded on page mount', () => {
    let playCount = 0;
    const origPlay = soundService.playNotification;
    soundService.playNotification = () => { playCount++; };

    try {
      soundService.markNotificationAsSeen('history-doc-1');
      soundService.markNotificationAsSeen('history-doc-2');

      // Attempting to play these existing notifications must not trigger audio
      soundService.playNotificationOnce('history-doc-1');
      soundService.playNotificationOnce('history-doc-2');
      assert.equal(playCount, 0, 'Pre-marked historical notifications must be silenced');

      // Fresh notification arriving later plays
      soundService.playNotificationOnce('new-order-live');
      assert.equal(playCount, 1, 'New un-seen notification must play');
    } finally {
      soundService.playNotification = origPlay;
    }
  });

  test('tracks user gesture interaction status', () => {
    soundService.markUserInteracted();
    assert.equal(soundService.isInteracted(), true);
  });
});
