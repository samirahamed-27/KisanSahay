import { useState, useEffect, useCallback } from 'react';
import Voice, { SpeechResultsEvent, SpeechErrorEvent } from '@react-native-voice/voice';

export function useVoiceInput(onSpeechResult?: (text: string) => void) {
  const [isListening, setIsListening] = useState(false);
  const [recognizedText, setRecognizedText] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function onSpeechResultsHandler(e: SpeechResultsEvent) {
      if (e.value && e.value.length > 0) {
        const text = e.value[0];
        setRecognizedText(text);
        if (onSpeechResult) {
          onSpeechResult(text);
        }
      }
    }

    function onSpeechErrorHandler(e: SpeechErrorEvent) {
      setError(e.error?.message || 'Speech recognition failed');
      setIsListening(false);
    }

    if (Voice && typeof Voice.onSpeechResults === 'function') {
      Voice.onSpeechResults = onSpeechResultsHandler;
      Voice.onSpeechError = onSpeechErrorHandler;
    }

    return () => {
      try {
        if (Voice && typeof Voice.destroy === 'function') {
          Voice.destroy().then(Voice.removeAllListeners);
        }
      } catch (e) {
        // ignore
      }
    };
  }, [onSpeechResult]);

  const startListening = useCallback(async (langCode: string = 'hi-IN') => {
    setError(null);
    setRecognizedText('');
    try {
      if (Voice && typeof Voice.start === 'function') {
        setIsListening(true);
        await Voice.start(langCode);
      } else {
        // Simulation fallback for emulators without native speech engine
        setIsListening(true);
        setTimeout(() => {
          const sample = 'Kisan Credit Card loan';
          setRecognizedText(sample);
          if (onSpeechResult) onSpeechResult(sample);
          setIsListening(false);
        }, 1500);
      }
    } catch (e: any) {
      setError(e?.message || 'Microphone error');
      setIsListening(false);
    }
  }, [onSpeechResult]);

  const stopListening = useCallback(async () => {
    try {
      if (Voice && typeof Voice.stop === 'function') {
        await Voice.stop();
      }
    } catch (e) {
      // ignore
    }
    setIsListening(false);
  }, []);

  return {
    isListening,
    recognizedText,
    error,
    startListening,
    stopListening,
  };
}
