export class SpeechService {
  private synth: SpeechSynthesis | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private pendingSpeak: { text: string; rate: number } | null = null;
  private speakTimeout: NodeJS.Timeout | null = null;
  private isInitialized: boolean = false;
  private clearQueueInterval: NodeJS.Timeout | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.synth = window.speechSynthesis;
      this.initialize();
    }
  }

  private async initialize(): Promise<void> {
    if (!this.synth || this.isInitialized) return;
    
    try {
      const voices = this.synth.getVoices();
      if (voices.length > 0) {
        this.isInitialized = true;
        return;
      }
      
      const checkVoices = () => {
        const voices = this.synth?.getVoices();
        if (voices && voices.length > 0) {
          this.isInitialized = true;
        } else {
          setTimeout(checkVoices, 100);
        }
      };
      
      if (this.synth.onvoiceschanged !== undefined) {
        this.synth.onvoiceschanged = () => {
          this.isInitialized = true;
        };
      }
      
      checkVoices();
    } catch (error) {
      this.isInitialized = true;
    }
  }

  private async ensureInitialized(): Promise<boolean> {
    if (this.isInitialized) return true;
    
    await this.initialize();
    
    let attempts = 0;
    while (!this.isInitialized && attempts < 10) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    return this.isInitialized;
  }

  private forceReset(): void {
    if (!this.synth) return;
    
    try {
      this.synth.cancel();
      this.synth.cancel();
      
      setTimeout(() => {
        if (this.synth) {
          this.synth.cancel();
        }
      }, 100);
    } catch (error) {
      console.warn('強制重置語音服務時發生錯誤:', error);
    }
  }

  private isStuck(): boolean {
    if (!this.synth) return false;
    
    const isStuckState = (this.synth.speaking || this.synth.pending) && !this.currentUtterance;
    
    if (isStuckState) {
      this.forceReset();
      return true;
    }
    
    return false;
  }

  async speak(text: string, rate: number = 0.9): Promise<void> {
    if (!this.synth) return;

    if (!text || text.trim() === '') return;

    await this.ensureInitialized();

    if (this.isStuck()) {
      console.warn('語音服務可能卡住，嘗試重置...');
      this.forceReset();
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    const trimmedText = text.trim();

    if (this.speakTimeout) {
      clearTimeout(this.speakTimeout);
      this.speakTimeout = null;
    }

    if (this.synth.speaking || this.synth.pending) {
      this.synth.cancel();
      this.pendingSpeak = { text: trimmedText, rate };
      this.speakTimeout = setTimeout(() => {
        if (this.pendingSpeak) {
          this.doSpeak(this.pendingSpeak.text, this.pendingSpeak.rate);
          this.pendingSpeak = null;
          this.speakTimeout = null;
        }
      }, 200);
      return;
    }

    this.doSpeak(trimmedText, rate);
  }

  private doSpeak(text: string, rate: number): void {
    if (!this.synth) return;

    try {
      if (this.currentUtterance) {
        this.currentUtterance = null;
      }

      this.currentUtterance = new SpeechSynthesisUtterance(text);
      this.currentUtterance.lang = 'en-US';
      this.currentUtterance.rate = Math.max(0.1, Math.min(rate, 2));
      this.currentUtterance.pitch = 1.0;
      this.currentUtterance.volume = 1.0;

      this.currentUtterance.onstart = () => {
        this.pendingSpeak = null;
      };

      this.currentUtterance.onend = () => {
        this.currentUtterance = null;
      };

      this.currentUtterance.onerror = (e) => {
        console.warn('語音播放錯誤:', e.error, e.type);
        this.currentUtterance = null;
        this.forceReset();
      };

      this.synth.speak(this.currentUtterance);
    } catch (error) {
      console.error('播放語音時發生錯誤:', error);
      this.currentUtterance = null;
      this.forceReset();
    }
  }

  stop(): void {
    if (this.synth) {
      if (this.synth.speaking || this.synth.pending) {
        this.synth.cancel();
      }
      this.currentUtterance = null;
    }
    if (this.speakTimeout) {
      clearTimeout(this.speakTimeout);
      this.speakTimeout = null;
    }
    this.pendingSpeak = null;
  }

  clearQueue(): void {
    if (!this.synth) return;
    
    if (this.clearQueueInterval) {
      clearInterval(this.clearQueueInterval);
      this.clearQueueInterval = null;
    }
    
    this.stop();
    this.forceReset();
    
    let attempts = 0;
    this.clearQueueInterval = setInterval(() => {
      if (this.synth) {
        this.synth.cancel();
        attempts++;
        if (attempts >= 3) {
          if (this.clearQueueInterval) {
            clearInterval(this.clearQueueInterval);
            this.clearQueueInterval = null;
          }
        }
      }
    }, 100);
    
    setTimeout(() => {
      if (this.clearQueueInterval) {
        clearInterval(this.clearQueueInterval);
        this.clearQueueInterval = null;
      }
    }, 500);
  }
}

export const speechService = typeof window !== 'undefined' ? new SpeechService() : null;

