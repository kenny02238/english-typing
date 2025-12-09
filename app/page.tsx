'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { UserPreferences } from '@/types';

export default function Home() {
  const router = useRouter();
  
  const [preferences, setPreferences] = useState<UserPreferences>({
    topics: [],
  });
  const [customSentence, setCustomSentence] = useState<string>('');

  const handleStartPractice = () => {
    // 將偏好設定存到sessionStorage，讓練習頁面使用
    const prefsToSave: UserPreferences = {
      ...preferences,
      ...(customSentence.trim() && { customSentence: customSentence.trim() }),
    };
    sessionStorage.setItem('userPreferences', JSON.stringify(prefsToSave));
    router.push('/practice');
  };

  // 監聽 Enter 鍵
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 如果正在輸入框中，不處理
      if (e.target instanceof HTMLInputElement) {
        return;
      }
      
      // 按 Enter 鍵觸發開始練習
      if (e.key === 'Enter') {
        e.preventDefault();
        // 將偏好設定存到sessionStorage，讓練習頁面使用
        const prefsToSave: UserPreferences = {
          ...preferences,
          ...(customSentence.trim() && { customSentence: customSentence.trim() }),
        };
        sessionStorage.setItem('userPreferences', JSON.stringify(prefsToSave));
        router.push('/practice');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [preferences, customSentence, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* 標題 */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-800 mb-3">
            AI 英文聽寫練習
          </h1>
          <p className="text-slate-600 text-lg">
            選擇你的偏好條件，AI將為你量身打造練習題目
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8 space-y-8">
          {/* 主題輸入 */}
          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-4">
              📚 主題（選填）
            </h2>
            <p className="text-sm text-slate-600 mb-3">
              輸入你想練習的主題，留空則由 AI 隨機生成
            </p>
            <input
              type="text"
              value={customSentence}
              onChange={(e) => setCustomSentence(e.target.value)}
              placeholder="例如：旅遊、餐廳、商務、日常生活等"
              className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-slate-800 placeholder-slate-400"
            />
          </section>

          {/* 句子長度 */}
          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-4">
              📏 句子長度
            </h2>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: 'short' as const, label: '短句', desc: '5-8字' },
                { value: 'medium' as const, label: '中句', desc: '10-15字' },
                { value: 'long' as const, label: '長句', desc: '18-25字' },
              ].map(option => (
                <button
                  key={option.value}
                  onClick={() => setPreferences(prev => ({ ...prev, sentenceLength: option.value }))}
                  className={`py-4 px-4 rounded-lg border-2 transition-all cursor-pointer ${
                    preferences.sentenceLength === option.value
                      ? 'border-green-500 bg-green-50 text-green-700 font-medium'
                      : 'border-slate-200 hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <div className="font-semibold">{option.label}</div>
                  <div className="text-sm opacity-70">{option.desc}</div>
                </button>
              ))}
            </div>
          </section>

          {/* 難度等級 */}
          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-4">
              🎯 難度等級（CEFR）
            </h2>
            <div className="grid grid-cols-7 gap-3">
              {(['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'C3'] as const).map(level => (
                <button
                  key={level}
                  onClick={() => setPreferences(prev => ({ ...prev, difficulty: level }))}
                  className={`py-3 px-4 rounded-lg border-2 transition-all font-semibold cursor-pointer ${
                    preferences.difficulty === level
                      ? 'border-purple-500 bg-purple-50 text-purple-700'
                      : 'border-slate-200 hover:border-slate-300 text-slate-700'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </section>

          {/* 開始按鈕 */}
          <div className="pt-6">
            <button
              onClick={handleStartPractice}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleStartPractice();
                }
              }}
              className="w-full py-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all cursor-pointer"
            >
              🚀 開始練習
            </button>
          </div>
        </div>

        {/* 說明 */}
        <div className="mt-8 text-center text-slate-600 text-sm">
          <p>💡 提示：練習時會先讓你打小片段，再逐步組成完整句子</p>
        </div>
      </div>
    </div>
  );
}
