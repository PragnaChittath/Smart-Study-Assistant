export interface AudioRecorderHandle {
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<{ blob: Blob; base64: string; durationSeconds: number }>;
  cancelRecording: () => void;
  isRecording: () => boolean;
}

export async function convertBlobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const base64Data = result.includes(',') ? result.split(',')[1] : result;
      resolve(base64Data);
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(blob);
  });
}

export function formatPlaybackTime(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = Math.floor(totalSeconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export class SpeechSynthesisCoordinator {
  private static activeUtterance: SpeechSynthesisUtterance | null = null;

  static isSupported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  static stopCurrentAudio(): void {
    if (this.isSupported()) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Safe fallback
      }
      this.activeUtterance = null;
    }
  }

  static speakText(
    text: string,
    options?: {
      rate?: number;
      pitch?: number;
      langCode?: string;
      onStart?: () => void;
      onEnd?: () => void;
      onError?: (err: any) => void;
    }
  ): boolean {
    if (!this.isSupported()) {
      options?.onError?.(new Error('SpeechSynthesis not supported'));
      return false;
    }

    try {
      this.stopCurrentAudio();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = options?.rate ?? 0.95;
      utterance.pitch = options?.pitch ?? 1.0;
      if (options?.langCode) {
        utterance.lang = options.langCode;
      }

      utterance.onstart = () => {
        options?.onStart?.();
      };

      utterance.onend = () => {
        this.activeUtterance = null;
        options?.onEnd?.();
      };

      utterance.onerror = (e) => {
        this.activeUtterance = null;
        options?.onError?.(e);
      };

      this.activeUtterance = utterance;
      window.speechSynthesis.speak(utterance);
      return true;
    } catch (err) {
      options?.onError?.(err);
      return false;
    }
  }
}
