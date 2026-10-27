/**
 * Bizora Global Sound Service
 * High-performance Web Audio API sound synthesizer
 * 
 * Features:
 * - Pure Web Audio API: Zero external MP3/WAV requests, zero network latency, zero CORS or copyright issues.
 * - Autoplay compliance: AudioContext is created/resumed strictly after a user gesture (click/touch/key)
 *   to avoid browser console warnings ("The AudioContext was not allowed to start").
 * - Deduplication: Notification sounds track played IDs to prevent replay on rerenders or polling.
 * - Volume & mute settings persisted in localStorage ('bizora_sound_enabled', 'bizora_sound_volume').
 * - Graceful fallback: Safe no-op in headless/SSR/Node environments.
 */

class SoundService {
  private ctx: AudioContext | null = null;
  private enabled: boolean = true;
  private volume: number = 0.7;
  private playedNotificationIds = new Set<string>();
  private userHasInteracted: boolean = false;

  constructor() {
    this.loadPreferences();
    this.setupGestureListeners();
  }

  private loadPreferences() {
    if (typeof localStorage === 'undefined') return;
    try {
      const savedEnabled = localStorage.getItem('bizora_sound_enabled');
      if (savedEnabled !== null) {
        this.enabled = savedEnabled === 'true';
      }
      const savedVol = localStorage.getItem('bizora_sound_volume');
      if (savedVol !== null) {
        const parsed = parseFloat(savedVol);
        if (!isNaN(parsed) && parsed >= 0 && parsed <= 1) {
          this.volume = parsed;
        }
      }
    } catch {
      // Ignore storage errors in restricted iframes
    }
  }

  private setupGestureListeners() {
    if (typeof window === 'undefined') return;
    const unlock = () => {
      this.userHasInteracted = true;
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      window.removeEventListener('click', unlock, true);
      window.removeEventListener('keydown', unlock, true);
      window.removeEventListener('touchstart', unlock, true);
      window.removeEventListener('pointerdown', unlock, true);
    };

    window.addEventListener('click', unlock, { capture: true, passive: true });
    window.addEventListener('keydown', unlock, { capture: true, passive: true });
    window.addEventListener('touchstart', unlock, { capture: true, passive: true });
    window.addEventListener('pointerdown', unlock, { capture: true, passive: true });
  }

  /**
   * Manually signal user interaction (e.g., inside click handlers or unit tests)
   */
  public markUserInteracted() {
    this.userHasInteracted = true;
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public isInteracted(): boolean {
    return this.userHasInteracted;
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public setEnabled(enabled: boolean) {
    this.enabled = enabled;
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('bizora_sound_enabled', String(enabled));
      }
    } catch {
      // Ignore storage errors
    }
  }

  public getVolume(): number {
    return this.volume;
  }

  public setVolume(vol: number) {
    const clamped = Math.max(0, Math.min(1, vol));
    this.volume = clamped;
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('bizora_sound_volume', clamped.toFixed(2));
      }
    } catch {
      // Ignore storage errors
    }
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return null;

    // Do not create AudioContext eagerly before any user gesture to conform with Autoplay policies
    if (!this.ctx) {
      if (!this.userHasInteracted) {
        return null;
      }
      try {
        this.ctx = new AudioCtx();
      } catch {
        return null;
      }
    }

    if (this.ctx && this.ctx.state === 'suspended' && this.userHasInteracted) {
      this.ctx.resume().catch(() => {});
    }

    return this.ctx;
  }

  /**
   * Helper to play a tone or sequential harmonic tones
   */
  public playTone(
    freq: number, 
    type: OscillatorType, 
    duration: number, 
    gainLevel: number, 
    startTimeOffset: number = 0
  ) {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime + startTimeOffset);

      const effectiveGain = Math.max(0.001, gainLevel * this.volume);
      const start = ctx.currentTime + startTimeOffset;

      // Soft attack & decay to prevent clicking/popping
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(effectiveGain, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(start);
      osc.stop(start + duration + 0.05);
    } catch {
      // Safe no-op on audio synthesis issues
    }
  }

  /**
   * 1. Melodic double-ping chime for notifications
   * ~587.33Hz (D5) -> ~880Hz (A5)
   */
  public playNotification() {
    if (!this.enabled || this.volume <= 0) return;
    this.playTone(587.33, 'sine', 0.12, 0.35, 0.0);
    this.playTone(880.00, 'sine', 0.22, 0.40, 0.10);
  }

  /**
   * Mark a notification ID as seen so historical ones loaded on page mount do not chime.
   */
  public markNotificationAsSeen(id: string) {
    if (!id) return;
    this.playedNotificationIds.add(id);
    if (this.playedNotificationIds.size > 500) {
      const it = this.playedNotificationIds.values();
      for (let i = 0; i < 200; i++) {
        const item = it.next();
        if (item.value) this.playedNotificationIds.delete(item.value);
      }
    }
  }

  /**
   * Deduplicated notification playback:
   * Will only play if this specific notification ID hasn't triggered audio yet.
   */
  public playNotificationOnce(id: string) {
    if (!id || this.playedNotificationIds.has(id)) return;
    this.playedNotificationIds.add(id);
    // Keep max 500 entries in memory
    if (this.playedNotificationIds.size > 500) {
      const it = this.playedNotificationIds.values();
      for (let i = 0; i < 200; i++) {
        const item = it.next();
        if (item.value) this.playedNotificationIds.delete(item.value);
      }
    }
    this.playNotification();
  }

  /**
   * 2. Triumphant sale success arpeggio:
   * C5 (523.25Hz) -> E5 (659.25Hz) -> G5 (783.99Hz) -> C6 (1046.50Hz)
   */
  public playSaleSuccess() {
    if (!this.enabled || this.volume <= 0) return;
    this.playTone(523.25, 'triangle', 0.12, 0.35, 0.00);
    this.playTone(659.25, 'triangle', 0.12, 0.40, 0.08);
    this.playTone(783.99, 'triangle', 0.14, 0.45, 0.16);
    this.playTone(1046.50, 'sine', 0.35, 0.50, 0.25);
  }

  /**
   * 3. Online order received bell:
   * E5 (659.25Hz) -> B5 (987.77Hz)
   */
  public playOrderReceived() {
    if (!this.enabled || this.volume <= 0) return;
    this.playTone(659.25, 'sine', 0.18, 0.40, 0.00);
    this.playTone(987.77, 'sine', 0.32, 0.45, 0.12);
  }

  /**
   * 4. Quick confirmation pop for button actions, cart updates, barcode scan
   */
  public playActionSuccess() {
    if (!this.enabled || this.volume <= 0) return;
    this.playTone(800, 'sine', 0.08, 0.30, 0.0);
  }

  /**
   * 5. Warning / Caution alert tone
   */
  public playWarning() {
    if (!this.enabled || this.volume <= 0) return;
    this.playTone(392.00, 'sawtooth', 0.12, 0.25, 0.00);
    this.playTone(329.63, 'sawtooth', 0.20, 0.25, 0.10);
  }

  /**
   * 6. Barcode scan feedback chime
   */
  public playScanSuccess() {
    if (!this.enabled || this.volume <= 0) return;
    this.playTone(880, 'sine', 0.08, 0.25, 0.0);
  }

  /**
   * 7. Kitchen Display & Order Bell
   */
  public playKitchenChime() {
    if (!this.enabled || this.volume <= 0) return;
    this.playTone(880, 'sine', 0.12, 0.30, 0.0);
    this.playTone(1174, 'sine', 0.25, 0.35, 0.10);
  }

  /**
   * 8. Thermal printer test chime
   */
  public playPrinterBeep() {
    if (!this.enabled || this.volume <= 0) return;
    this.playTone(2000, 'sine', 0.15, 0.20, 0.0);
  }
}

export const soundService = new SoundService();
export default soundService;
