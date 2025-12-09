'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserPreferences } from '@/types';

export default function Home() {
  const router = useRouter();
  
  const [preferences, setPreferences] = useState<UserPreferences>({
    topics: [],
    sentenceLength: 'medium',
    difficulty: 'A2',
    sentenceTypes: [],
  });

  // 可選主題
  const availableTopics = [
    { id: 'travel', label: '🌍 旅遊' },
    { id: 'restaurant', label: '🍽️ 餐廳' },
    { id: 'business', label: '🏢 商務' },
    { id: 'daily', label: '👶 日常生活' },
    { id: 'emotion', label: '💬 情緒表達' },
    { id: 'shopping', label: '🛒 購物' },
    { id: 'health', label: '🏥 健康醫療' },
    { id: 'technology', label: '💻 科技' },
  ];

  // 可選句型
  const availableSentenceTypes = [
    { id: 'prepositional', label: '介系詞片語' },
    { id: 'gerund', label: '動名詞' },
    { id: 'from_to', label: 'from ... to ...' },
    { id: 'if_then', label: 'if ... then ...' },
    { id: 'passive', label: '被動語態' },
    { id: 'conversational', label: '會話句' },
    { id: 'narrative', label: '敘述句' },
  ];

  const handleTopicToggle = (topicId: string) => {
    setPreferences(prev => ({
      ...prev,
      topics: prev.topics.includes(topicId)
        ? prev.topics.filter(t => t !== topicId)
        : [...prev.topics, topicId],
    }));
  };

  const handleSentenceTypeToggle = (typeId: string) => {
    setPreferences(prev => ({
      ...prev,
      sentenceTypes: prev.sentenceTypes.includes(typeId)
        ? prev.sentenceTypes.filter(t => t !== typeId)
        : [...prev.sentenceTypes, typeId],
    }));
  };

  const handleStartPractice = () => {
    // 將偏好設定存到sessionStorage，讓練習頁面使用
    sessionStorage.setItem('userPreferences', JSON.stringify(preferences));
    router.push('/practice');
  };

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
          {/* 主題選擇 */}
          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-4">
              📚 主題（可多選）
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {availableTopics.map(topic => (
                <button
                  key={topic.id}
                  onClick={() => handleTopicToggle(topic.id)}
                  className={`py-3 px-4 rounded-lg border-2 transition-all ${
                    preferences.topics.includes(topic.id)
                      ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                      : 'border-slate-200 hover:border-slate-300 text-slate-700'
                  }`}
                >
                  {topic.label}
                </button>
              ))}
            </div>
          </section>

          {/* 句子長度 */}
          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-4">
              📏 句子長度
            </h2>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: 'short' as const, label: '短句', desc: '8-12字' },
                { value: 'medium' as const, label: '中句', desc: '12-18字' },
                { value: 'long' as const, label: '長句', desc: '18字以上' },
              ].map(option => (
                <button
                  key={option.value}
                  onClick={() => setPreferences(prev => ({ ...prev, sentenceLength: option.value }))}
                  className={`py-4 px-4 rounded-lg border-2 transition-all ${
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
            <div className="grid grid-cols-5 gap-3">
              {(['A1', 'A2', 'B1', 'B2', 'C1'] as const).map(level => (
                <button
                  key={level}
                  onClick={() => setPreferences(prev => ({ ...prev, difficulty: level }))}
                  className={`py-3 px-4 rounded-lg border-2 transition-all font-semibold ${
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

          {/* 句型偏好 */}
          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-4">
              ✏️ 句型偏好（可多選，不選則隨機）
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {availableSentenceTypes.map(type => (
                <button
                  key={type.id}
                  onClick={() => handleSentenceTypeToggle(type.id)}
                  className={`py-3 px-4 rounded-lg border-2 transition-all ${
                    preferences.sentenceTypes.includes(type.id)
                      ? 'border-orange-500 bg-orange-50 text-orange-700 font-medium'
                      : 'border-slate-200 hover:border-slate-300 text-slate-700'
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </section>

          {/* 開始按鈕 */}
          <div className="pt-6">
            <button
              onClick={handleStartPractice}
              className="w-full py-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all"
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
