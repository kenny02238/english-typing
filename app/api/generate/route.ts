import { NextRequest, NextResponse } from "next/server";
import groq from "@/lib/groq";
import { UserPreferences, Exercise } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const preferences: UserPreferences = await request.json();

    // 構建prompt
    const prompt = buildPrompt(preferences);

    // 呼叫Groq API
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content:
            "You are an English teacher creating typing practice exercises. Always respond in valid JSON format.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.8,
      max_tokens: 1000,
      response_format: { type: "json_object" },
    });

    const responseText = completion.choices[0]?.message?.content || "{}";
    const exercise: Exercise = JSON.parse(responseText);

    // 驗證回應格式
    if (
      !exercise.sentence ||
      !exercise.chunks ||
      !exercise.translation ||
      !exercise.wordMeanings
    ) {
      throw new Error("AI回應格式不正確");
    }

    return NextResponse.json(exercise);
  } catch (error) {
    console.error("生成題目錯誤:", error);
    return NextResponse.json(
      { error: "生成題目失敗，請稍後再試" },
      { status: 500 }
    );
  }
}

function buildPrompt(preferences: UserPreferences): string {
  // 句子長度對應的字數範圍
  const lengthMap = {
    short: "8-12",
    medium: "12-18",
    long: "18-25",
  };

  // 主題描述
  const topicsText =
    preferences.topics.length > 0
      ? `topics: ${preferences.topics.join(", ")}`
      : "any common topic";

  // 句型描述
  const sentenceTypesText =
    preferences.sentenceTypes.length > 0
      ? `sentence patterns: ${preferences.sentenceTypes.join(", ")}`
      : "any natural sentence pattern";

  return `Generate an English typing practice exercise with the following requirements:

1. **Difficulty**: ${preferences.difficulty} (CEFR standard)
2. **Sentence length**: ${lengthMap[preferences.sentenceLength]} words
3. **Topics**: ${topicsText}
4. **Sentence patterns**: ${sentenceTypesText}

Please create a natural, practical English sentence and break it down into progressive chunks for typing practice.

**Important**: You MUST respond in valid JSON format with this exact structure:

{
  "sentence": "The complete English sentence",
  "chunks": [
    "smallest meaningful phrase (2-3 words)",
    "medium phrase (4-6 words)",
    "complete sentence"
  ],
  "translation": "完整句子的繁體中文翻譯",
  "wordMeanings": {
    "word1": "單字1的繁體中文意思",
    "word2": "單字2的繁體中文意思"
  }
}

**Chunk rules**:
- Start with the smallest meaningful phrase (usually at the end of the sentence)
- Gradually expand to larger phrases
- Always end with the complete sentence
- Each chunk should be a continuous part of the sentence

**Example** (for reference only, create a NEW sentence):
{
  "sentence": "This is a photograph of our village",
  "chunks": [
    "our village",
    "of our village",
    "a photograph of our village",
    "This is a photograph of our village"
  ],
  "translation": "這是我們村莊的照片",
  "wordMeanings": {
    "photograph": "照片",
    "village": "村莊",
    "our": "我們的"
  }
}

Now generate a NEW exercise following all requirements above. Return ONLY the JSON object, no additional text.`;
}
