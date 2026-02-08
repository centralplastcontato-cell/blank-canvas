import { useCallback, useRef, useEffect } from "react";

interface UseNotificationsOptions {
  soundEnabled?: boolean;
  browserNotificationsEnabled?: boolean;
}

interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
}

export function useNotifications(options: UseNotificationsOptions = {}) {
  const { soundEnabled = true, browserNotificationsEnabled = true } = options;
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const permissionRef = useRef<NotificationPermission>("default");

  // Initialize audio element with a simple beep sound (base64 encoded)
  useEffect(() => {
    // Create a simple notification sound using Web Audio API
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Create a simple beep sound as a data URL
    // This is a simple 440Hz beep for 200ms
    const createBeepDataUrl = () => {
      const sampleRate = 44100;
      const duration = 0.2; // 200ms
      const frequency = 880; // Hz
      const numSamples = Math.floor(sampleRate * duration);
      
      // Create WAV header
      const numChannels = 1;
      const bitsPerSample = 16;
      const bytesPerSample = bitsPerSample / 8;
      const blockAlign = numChannels * bytesPerSample;
      const byteRate = sampleRate * blockAlign;
      const dataSize = numSamples * blockAlign;
      const headerSize = 44;
      const totalSize = headerSize + dataSize;
      
      const buffer = new ArrayBuffer(totalSize);
      const view = new DataView(buffer);
      
      // RIFF header
      writeString(view, 0, 'RIFF');
      view.setUint32(4, totalSize - 8, true);
      writeString(view, 8, 'WAVE');
      
      // fmt chunk
      writeString(view, 12, 'fmt ');
      view.setUint32(16, 16, true); // chunk size
      view.setUint16(20, 1, true); // audio format (PCM)
      view.setUint16(22, numChannels, true);
      view.setUint32(24, sampleRate, true);
      view.setUint32(28, byteRate, true);
      view.setUint16(32, blockAlign, true);
      view.setUint16(34, bitsPerSample, true);
      
      // data chunk
      writeString(view, 36, 'data');
      view.setUint32(40, dataSize, true);
      
      // Generate sine wave samples
      for (let i = 0; i < numSamples; i++) {
        const t = i / sampleRate;
        // Apply envelope for smoother sound
        const envelope = Math.min(1, Math.min(t * 20, (duration - t) * 20));
        const sample = Math.sin(2 * Math.PI * frequency * t) * envelope * 0.3;
        const intSample = Math.max(-32768, Math.min(32767, Math.floor(sample * 32767)));
        view.setInt16(headerSize + i * 2, intSample, true);
      }
      
      function writeString(view: DataView, offset: number, str: string) {
        for (let i = 0; i < str.length; i++) {
          view.setUint8(offset + i, str.charCodeAt(i));
        }
      }
      
      const blob = new Blob([buffer], { type: 'audio/wav' });
      return URL.createObjectURL(blob);
    };
    
    const audio = new Audio(createBeepDataUrl());
    audio.volume = 0.5;
    audioRef.current = audio;

    // Check notification permission
    if ('Notification' in window) {
      permissionRef.current = Notification.permission;
    }

    return () => {
      if (audioRef.current) {
        URL.revokeObjectURL(audioRef.current.src);
      }
    };
  }, []);

  // Request browser notification permission
  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      permissionRef.current = 'granted';
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      permissionRef.current = permission;
      return permission === 'granted';
    }

    return false;
  }, []);

  // Play notification sound
  const playSound = useCallback(() => {
    if (!soundEnabled || !audioRef.current) return;

    try {
      // Reset audio to beginning
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch((err) => {
        // Autoplay might be blocked, that's ok
        console.log('Could not play notification sound:', err.message);
      });
    } catch (err) {
      console.error('Error playing notification sound:', err);
    }
  }, [soundEnabled]);

  // Show browser notification
  const showBrowserNotification = useCallback(
    (payload: NotificationPayload) => {
      if (!browserNotificationsEnabled) return;
      if (!('Notification' in window)) return;
      if (permissionRef.current !== 'granted') return;

      // Don't show notification if the page is visible
      if (document.visibilityState === 'visible') return;

      try {
        const notification = new Notification(payload.title, {
          body: payload.body,
          icon: payload.icon || '/favicon.ico',
          tag: payload.tag, // Prevents duplicate notifications
          silent: true, // We handle sound ourselves
        });

        // Auto-close after 5 seconds
        setTimeout(() => notification.close(), 5000);

        // Focus window when clicked
        notification.onclick = () => {
          window.focus();
          notification.close();
        };
      } catch (err) {
        console.error('Error showing notification:', err);
      }
    },
    [browserNotificationsEnabled]
  );

  // Combined notify function
  const notify = useCallback(
    (payload: NotificationPayload) => {
      playSound();
      showBrowserNotification(payload);
    },
    [playSound, showBrowserNotification]
  );

  return {
    notify,
    playSound,
    showBrowserNotification,
    requestPermission,
    hasPermission: permissionRef.current === 'granted',
  };
}
