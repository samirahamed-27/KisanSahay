import { useState, useCallback } from 'react';
import * as Speech from 'expo-speech';

export function useTTS() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speedRate, setSpeedRate] = useState(1.0);

  const speak = useCallback(
    async (text: string, language: string = 'hi') => {
      try {
        await Speech.stop();
        setIsSpeaking(true);

        const langMap: Record<string, string> = {
          en: 'en-IN',
          hi: 'hi-IN',
          mr: 'mr-IN',
          ta: 'ta-IN',
          te: 'te-IN',
          bn: 'bn-IN',
          gu: 'gu-IN',
          kn: 'kn-IN',
          pa: 'pa-IN',
        };

        const targetLang = langMap[language] || 'hi-IN';

        Speech.speak(text, {
          language: targetLang,
          rate: speedRate,
          onDone: () => setIsSpeaking(false),
          onError: () => setIsSpeaking(false),
          onStopped: () => setIsSpeaking(false),
        });
      } catch (e) {
        console.warn('[TTS] Speech synthesis error:', e);
        setIsSpeaking(false);
      }
    },
    [speedRate]
  );

  const stop = useCallback(async () => {
    try {
      await Speech.stop();
    } catch (e) {
      // ignore
    }
    setIsSpeaking(false);
  }, []);

  return {
    isSpeaking,
    speedRate,
    setSpeedRate,
    speak,
    stop,
  };
}
