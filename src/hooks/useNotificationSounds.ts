import { useCallback, useRef, useEffect } from "react";
import {
  areChatNotificationsEnabled,
  WHATSAPP_NOTIFICATIONS_TOGGLE_EVENT,
} from "@/hooks/useChatNotificationToggle";

type SoundType = "message" | "lead" | "client" | "visit" | "questions" | "generic";

interface SoundConfig {
  frequency: number;
  duration: number;
  pattern?: number[]; // Array of [on, off, on, off...] durations in ms
  secondFrequency?: number; // For two-tone sounds
  thirdFrequency?: number; // For three-tone sounds
}

const SOUND_CONFIGS: Record<SoundType, SoundConfig> = {
  message: {
    frequency: 880, // A5 - higher pitch, short beep for messages
    duration: 0.15,
  },
  lead: {
    frequency: 523.25, // C5 - lower, more pleasant tone for leads
    duration: 0.3,
    pattern: [150, 100, 150], // Two-tone chime
  },
  client: {
    frequency: 440, // A4 - attention-grabbing urgent tone
    duration: 0.25,
    pattern: [200, 80, 200, 80, 200], // Triple chime for urgency
    secondFrequency: 554.37, // C#5 - creates a more distinctive alert
  },
  visit: {
    frequency: 587.33, // D5 - distinctive ascending fanfare for visits
    duration: 0.2,
    pattern: [180, 60, 180, 60, 250], // Rising triple tone - celebratory
    secondFrequency: 698.46, // F5 - ascending second note
    thirdFrequency: 880, // A5 - highest note for urgency
  },
  questions: {
    frequency: 659.25, // E5 - curious, inquisitive tone
    duration: 0.25,
    pattern: [200, 100, 200], // Two-tone chime - attention but not urgent
    secondFrequency: 783.99, // G5 - ascending question-like interval
  },
  generic: {
    frequency: 660, // E5
    duration: 0.2,
  },
};

export function useNotificationSounds() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const soundEnabledRef = useRef(areChatNotificationsEnabled());
  const activeOscillatorsRef = useRef<OscillatorNode[]>([]);

  const stopAllSounds = useCallback(() => {
    activeOscillatorsRef.current.forEach((oscillator) => {
      try {
        oscillator.stop(0);
      } catch {
        // Oscillator may already be stopped.
      }
      try {
        oscillator.disconnect();
      } catch {
        // Oscillator may already be disconnected.
      }
    });
    activeOscillatorsRef.current = [];

    const ctx = audioContextRef.current;
    if (ctx?.state === "running") {
      ctx.suspend().catch(() => undefined);
    }
  }, []);

  // Initialize audio context on first user interaction and react to global mute changes.
  useEffect(() => {
    const initContext = () => {
      if (!audioContextRef.current && areChatNotificationsEnabled()) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
    };

    const handleInteraction = () => {
      initContext();
      document.removeEventListener("click", handleInteraction);
      document.removeEventListener("keydown", handleInteraction);
    };

    const handleToggle = () => {
      const enabled = areChatNotificationsEnabled();
      soundEnabledRef.current = enabled;
      if (!enabled) {
        stopAllSounds();
      }
    };

    document.addEventListener("click", handleInteraction);
    document.addEventListener("keydown", handleInteraction);
    window.addEventListener(WHATSAPP_NOTIFICATIONS_TOGGLE_EVENT, handleToggle);
    window.addEventListener("storage", handleToggle);

    return () => {
      document.removeEventListener("click", handleInteraction);
      document.removeEventListener("keydown", handleInteraction);
      window.removeEventListener(WHATSAPP_NOTIFICATIONS_TOGGLE_EVENT, handleToggle);
      window.removeEventListener("storage", handleToggle);
      stopAllSounds();
    };
  }, [stopAllSounds]);

  const playTone = useCallback((frequency: number, duration: number, startTime: number = 0) => {
    if (!soundEnabledRef.current || !areChatNotificationsEnabled()) return;

    const ctx = audioContextRef.current;
    if (!ctx) return;

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    activeOscillatorsRef.current.push(oscillator);

    oscillator.onended = () => {
      activeOscillatorsRef.current = activeOscillatorsRef.current.filter((item) => item !== oscillator);
      try {
        oscillator.disconnect();
        gainNode.disconnect();
      } catch {
        // Already disconnected.
      }
    };

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime + startTime);

    // Envelope for smoother sound
    const attackTime = 0.01;
    const releaseTime = 0.05;
    const sustainLevel = 0.3;

    gainNode.gain.setValueAtTime(0, ctx.currentTime + startTime);
    gainNode.gain.linearRampToValueAtTime(sustainLevel, ctx.currentTime + startTime + attackTime);
    gainNode.gain.linearRampToValueAtTime(sustainLevel, ctx.currentTime + startTime + duration - releaseTime);
    gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + startTime + duration);

    oscillator.start(ctx.currentTime + startTime);
    oscillator.stop(ctx.currentTime + startTime + duration);
  }, []);

  const playSound = useCallback((type: SoundType = "generic") => {
    if (!soundEnabledRef.current || !areChatNotificationsEnabled()) {
      stopAllSounds();
      return;
    }

    const config = SOUND_CONFIGS[type];
    
    // Initialize context if needed
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    // Resume context if suspended
    if (audioContextRef.current.state === "suspended") {
      audioContextRef.current.resume();
    }

    try {
      if (config.pattern) {
        // Play pattern (for lead/client/visit notifications - multi-tone chime)
        let timeOffset = 0;
        config.pattern.forEach((ms, index) => {
          if (index % 2 === 0) {
            // Play tone - alternate between frequencies for more distinctive sound
            let freq = config.frequency;
            const toneIndex = Math.floor(index / 2); // Which tone in sequence (0, 1, 2...)
            
            if (config.thirdFrequency && config.secondFrequency) {
              // Three-tone ascending for visit alerts
              if (toneIndex === 0) freq = config.frequency;
              else if (toneIndex === 1) freq = config.secondFrequency;
              else freq = config.thirdFrequency;
            } else if (config.secondFrequency) {
              // Alternate between frequencies for client alerts
              freq = toneIndex === 0 ? config.frequency : (toneIndex === 1 ? config.secondFrequency : config.frequency);
            } else {
              // Original behavior for leads - second tone slightly higher
              freq = toneIndex === 0 ? config.frequency : config.frequency * 1.25;
            }
            playTone(freq, ms / 1000, timeOffset / 1000);
          }
          timeOffset += ms;
        });
      } else {
        // Single tone
        playTone(config.frequency, config.duration);
      }
    } catch (err) {
      console.warn("Could not play notification sound:", err);
    }
  }, [playTone, stopAllSounds]);

  const playMessageSound = useCallback(() => {
    playSound("message");
  }, [playSound]);

  const playLeadSound = useCallback(() => {
    playSound("lead");
  }, [playSound]);

  const playClientSound = useCallback(() => {
    playSound("client");
  }, [playSound]);

  const playVisitSound = useCallback(() => {
    playSound("visit");
  }, [playSound]);

  const playQuestionsSound = useCallback(() => {
    playSound("questions");
  }, [playSound]);

  const setSoundEnabled = useCallback((enabled: boolean) => {
    soundEnabledRef.current = enabled && areChatNotificationsEnabled();
    if (!soundEnabledRef.current) {
      stopAllSounds();
    }
  }, [stopAllSounds]);

  return {
    playSound,
    playMessageSound,
    playLeadSound,
    playClientSound,
    playVisitSound,
    playQuestionsSound,
    setSoundEnabled,
    stopAllSounds,
  };
}
