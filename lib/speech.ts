// 語音朗讀功能（使用Web Speech API）

export class SpeechService {
  private synth: SpeechSynthesis | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private pendingSpeak: { text: string; rate: number } | null = null;
  private speakTimeout: NodeJS.Timeout | null = null;
  private isInitialized: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.synth = window.speechSynthesis;
      // 初始化語音服務（某些瀏覽器需要先調用一次才能正常使用）
      this.initialize();
    }
  }

  // 初始化語音服務
  private async initialize(): Promise<void> {
    if (!this.synth || this.isInitialized) return;
    
    try {
      // 嘗試獲取語音列表來觸發初始化
      const voices = this.synth.getVoices();
      if (voices.length > 0) {
        this.isInitialized = true;
        return;
      }
      
      // 如果沒有語音，等待語音列表載入
      const checkVoices = () => {
        const voices = this.synth?.getVoices();
        if (voices && voices.length > 0) {
          this.isInitialized = true;
        } else {
          setTimeout(checkVoices, 100);
        }
      };
      
      // 監聽語音列表載入事件
      if (this.synth.onvoiceschanged !== undefined) {
        this.synth.onvoiceschanged = () => {
          this.isInitialized = true;
        };
      }
      
      checkVoices();
    } catch (error) {
      // 如果初始化失敗，仍然標記為已初始化，讓後續嘗試播放
      this.isInitialized = true;
    }
  }

  // 確保語音服務已初始化
  private async ensureInitialized(): Promise<boolean> {
    if (this.isInitialized) return true;
    
    await this.initialize();
    
    // 等待最多 1 秒讓語音服務初始化
    let attempts = 0;
    while (!this.isInitialized && attempts < 10) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    return this.isInitialized;
  }

  // 朗讀文字
  async speak(text: string, rate: number = 0.9): Promise<void> {
    if (!this.synth) return;

    if (!text || text.trim() === '') return;

    // 確保語音服務已初始化
    await this.ensureInitialized();

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

  // 完全清空語音佇列（用於初始化或重置）
  clearQueue(): void {
    if (!this.synth) return;
    
    // 停止所有播放
    this.stop();
    
    // 多次調用 cancel 確保清空所有佇列
    // 某些瀏覽器需要多次調用才能完全清空
    let attempts = 0;
    const clearAttempts = setInterval(() => {
      if (this.synth) {
        this.synth.cancel();
        attempts++;
        // 最多嘗試 5 次
        if (attempts >= 5) {
          clearInterval(clearAttempts);
        }
      }
    }, 50);
    
    // 確保在 300ms 後停止嘗試
    setTimeout(() => {
      clearInterval(clearAttempts);
    }, 300);
  }
}

// 匯出單例
export const speechService = typeof window !== 'undefined' ? new SpeechService() : null;

