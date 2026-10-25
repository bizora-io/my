import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import soundService from '../services/soundService';

interface SoundContextType {
  soundEnabled: boolean;
  soundVolume: number;
  toggleSound: () => void;
  setSoundEnabled: (enabled: boolean) => void;
  setSoundVolume: (volume: number) => void;
  playNotification: (id?: string) => void;
  playSaleSuccess: () => void;
  playOrderReceived: () => void;
  playActionSuccess: () => void;
  playWarning: () => void;
  previewSound: (type: 'notification' | 'sale' | 'order' | 'action' | 'warning') => void;
}

const SoundContext = createContext<SoundContextType | undefined>(undefined);

export const SoundProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [soundEnabled, setSoundEnabledState] = useState<boolean>(soundService.isEnabled());
  const [soundVolume, setSoundVolumeState] = useState<number>(soundService.getVolume());

  // Listen for storage events across tabs
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'bizora_sound_enabled' && e.newValue !== null) {
        setSoundEnabledState(e.newValue === 'true');
      }
      if (e.key === 'bizora_sound_volume' && e.newValue !== null) {
        const v = parseFloat(e.newValue);
        if (!isNaN(v)) setSoundVolumeState(v);
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const setSoundEnabled = useCallback((enabled: boolean) => {
    soundService.setEnabled(enabled);
    setSoundEnabledState(enabled);
  }, []);

  const toggleSound = useCallback(() => {
    setSoundEnabled(!soundEnabled);
  }, [soundEnabled, setSoundEnabled]);

  const setSoundVolume = useCallback((volume: number) => {
    soundService.setVolume(volume);
    setSoundVolumeState(soundService.getVolume());
  }, []);

  const playNotification = useCallback((id?: string) => {
    if (id) {
      soundService.playNotificationOnce(id);
    } else {
      soundService.playNotification();
    }
  }, []);

  const playSaleSuccess = useCallback(() => {
    soundService.playSaleSuccess();
  }, []);

  const playOrderReceived = useCallback(() => {
    soundService.playOrderReceived();
  }, []);

  const playActionSuccess = useCallback(() => {
    soundService.playActionSuccess();
  }, []);

  const playWarning = useCallback(() => {
    soundService.playWarning();
  }, []);

  const previewSound = useCallback((type: 'notification' | 'sale' | 'order' | 'action' | 'warning') => {
    switch (type) {
      case 'notification':
        soundService.playNotification();
        break;
      case 'sale':
        soundService.playSaleSuccess();
        break;
      case 'order':
        soundService.playOrderReceived();
        break;
      case 'action':
        soundService.playActionSuccess();
        break;
      case 'warning':
        soundService.playWarning();
        break;
    }
  }, []);

  return (
    <SoundContext.Provider value={{
      soundEnabled,
      soundVolume,
      toggleSound,
      setSoundEnabled,
      setSoundVolume,
      playNotification,
      playSaleSuccess,
      playOrderReceived,
      playActionSuccess,
      playWarning,
      previewSound,
    }}>
      {children}
    </SoundContext.Provider>
  );
};

export const useSound = () => {
  const context = useContext(SoundContext);
  if (!context) {
    // Graceful fallback dummy if outside provider
    return {
      soundEnabled: soundService.isEnabled(),
      soundVolume: soundService.getVolume(),
      toggleSound: () => {},
      setSoundEnabled: (en: boolean) => soundService.setEnabled(en),
      setSoundVolume: (v: number) => soundService.setVolume(v),
      playNotification: (id?: string) => id ? soundService.playNotificationOnce(id) : soundService.playNotification(),
      playSaleSuccess: () => soundService.playSaleSuccess(),
      playOrderReceived: () => soundService.playOrderReceived(),
      playActionSuccess: () => soundService.playActionSuccess(),
      playWarning: () => soundService.playWarning(),
      previewSound: () => {},
    };
  }
  return context;
};

export default SoundContext;
