// 語音朗讀功能（使用Web Speech API）

export class SpeechService {
  private synth: SpeechSynthesis | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private pendingSpeak: { text: string; rate: number } | null = null;
  private speakTimeout: NodeJS.Timeout | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.synth = window.speechSynthesis;
    }
  }

  // 朗讀文字
  speak(text: string, rate: number = 0.9): void {
    if (!this.synth) return;

    if (!text || text.trim() === '') return;

    const trimmedText = text.trim();

    // 清除之前的pending播放
    if (this.speakTimeout) {
      clearTimeout(this.speakTimeout);
      this.speakTimeout = null;
    }

    // 如果正在播放，先停止並記錄要播放的內容
    if (this.synth.speaking || this.synth.pending) {
      this.synth.cancel();
      this.pendingSpeak = { text: trimmedText, rate };
      // 等待停止完成後播放
      this.speakTimeout = setTimeout(() => {
        if (this.pendingSpeak) {
          this.doSpeak(this.pendingSpeak.text, this.pendingSpeak.rate);
          this.pendingSpeak = null;
          this.speakTimeout = null;
        }
      }, 150);
      return;
    }

    // 直接播放
    this.doSpeak(trimmedText, rate);
  }

  // 實際執行播放的內部方法
  private doSpeak(text: string, rate: number): void {
    if (!this.synth) return;

    try {
      this.currentUtterance = new SpeechSynthesisUtterance(text);
      this.currentUtterance.lang = 'en-US';
      this.currentUtterance.rate = Math.max(0.1, Math.min(rate, 2));
      this.currentUtterance.pitch = 1.0;
      this.currentUtterance.volume = 1.0;

      this.currentUtterance.onend = () => {
        this.currentUtterance = null;
      };

      this.currentUtterance.onerror = () => {
        this.currentUtterance = null;
      };

      this.synth.speak(this.currentUtterance);
    } catch (error) {
      this.currentUtterance = null;
    }
  }

  // 停止播放
  stop(): void {
    if (this.synth) {
      if (this.synth.speaking || this.synth.pending) {
        this.synth.cancel();
      }
      this.currentUtterance = null;
    }
    // 清除pending播放
    if (this.speakTimeout) {
      clearTimeout(this.speakTimeout);
      this.speakTimeout = null;
    }
    this.pendingSpeak = null;
  }
}

// 匯出單例
export const speechService = typeof window !== 'undefined' ? new SpeechService() : null;

