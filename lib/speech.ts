// 語音朗讀功能（使用Web Speech API）

export class SpeechService {
  private synth: SpeechSynthesis | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private pendingSpeak: { text: string; rate: number } | null = null;
  private speakTimeout: NodeJS.Timeout | null = null;
  private isInitialized: boolean = false;
  private clearQueueInterval: NodeJS.Timeout | null = null; // 追蹤 clearQueue 的 interval

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

  // 強制重置 speechSynthesis 狀態（用於修復異常狀態）
  private forceReset(): void {
    if (!this.synth) return;
    
    try {
      // 多次調用 cancel 來強制重置
      this.synth.cancel();
      this.synth.cancel();
      
      // 等待一小段時間讓狀態重置
      setTimeout(() => {
        if (this.synth) {
          this.synth.cancel();
        }
      }, 100);
    } catch (error) {
      console.warn('強制重置語音服務時發生錯誤:', error);
    }
  }

  // 檢查 speechSynthesis 是否處於異常狀態
  private isStuck(): boolean {
    if (!this.synth) return false;
    
    // 如果顯示正在播放或等待中，但實際上沒有 utterance，可能是卡住了
    const isStuckState = (this.synth.speaking || this.synth.pending) && !this.currentUtterance;
    
    // 如果狀態持續超過 2 秒，也可能是卡住了
    if (isStuckState) {
      // 強制重置
      this.forceReset();
      return true;
    }
    
    return false;
  }

  // 朗讀文字
  async speak(text: string, rate: number = 0.9): Promise<void> {
    if (!this.synth) return;

    if (!text || text.trim() === '') return;

    // 確保語音服務已初始化
    await this.ensureInitialized();

    // 檢查是否卡住
    if (this.isStuck()) {
      console.warn('語音服務可能卡住，嘗試重置...');
      this.forceReset();
      // 等待重置完成
      await new Promise(resolve => setTimeout(resolve, 200));
    }

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
      }, 200); // 稍微增加等待時間，確保狀態重置完成
      return;
    }

    // 直接播放
    this.doSpeak(trimmedText, rate);
  }

  // 實際執行播放的內部方法
  private doSpeak(text: string, rate: number): void {
    if (!this.synth) return;

    try {
      // 先確保清空當前 utterance
      if (this.currentUtterance) {
        this.currentUtterance = null;
      }

      this.currentUtterance = new SpeechSynthesisUtterance(text);
      this.currentUtterance.lang = 'en-US';
      this.currentUtterance.rate = Math.max(0.1, Math.min(rate, 2));
      this.currentUtterance.pitch = 1.0;
      this.currentUtterance.volume = 1.0;

      this.currentUtterance.onstart = () => {
        // 播放開始時清除 pending
        this.pendingSpeak = null;
      };

      this.currentUtterance.onend = () => {
        this.currentUtterance = null;
      };

      this.currentUtterance.onerror = (e) => {
        console.warn('語音播放錯誤:', e.error, e.type);
        this.currentUtterance = null;
        // 如果發生錯誤，強制重置
        this.forceReset();
      };

      this.synth.speak(this.currentUtterance);
    } catch (error) {
      console.error('播放語音時發生錯誤:', error);
      this.currentUtterance = null;
      // 發生錯誤時強制重置
      this.forceReset();
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
    
    // 先清理之前的 interval（如果有的話）
    if (this.clearQueueInterval) {
      clearInterval(this.clearQueueInterval);
      this.clearQueueInterval = null;
    }
    
    // 停止所有播放
    this.stop();
    
    // 強制重置狀態
    this.forceReset();
    
    // 多次調用 cancel 確保清空所有佇列
    // 某些瀏覽器需要多次調用才能完全清空
    let attempts = 0;
    this.clearQueueInterval = setInterval(() => {
      if (this.synth) {
        this.synth.cancel();
        attempts++;
        // 最多嘗試 3 次（減少次數避免過度調用）
        if (attempts >= 3) {
          if (this.clearQueueInterval) {
            clearInterval(this.clearQueueInterval);
            this.clearQueueInterval = null;
          }
        }
      }
    }, 100); // 增加間隔時間
    
    // 確保在 500ms 後停止嘗試
    setTimeout(() => {
      if (this.clearQueueInterval) {
        clearInterval(this.clearQueueInterval);
        this.clearQueueInterval = null;
      }
    }, 500);
  }
}

// 匯出單例
export const speechService = typeof window !== 'undefined' ? new SpeechService() : null;

