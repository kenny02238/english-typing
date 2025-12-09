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
      temperature: 1.0, // 提高溫度以增加多樣性
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
      !exercise.wordMeanings ||
      !exercise.chunkTranslations ||
      exercise.chunkTranslations.length !== exercise.chunks.length
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
  // 如果沒有選擇句子長度，隨機選擇一個
  const sentenceLength = preferences.sentenceLength || 
    (['short', 'medium', 'long'] as const)[Math.floor(Math.random() * 3)];
  
  // 如果沒有選擇難度，隨機選擇一個
  const difficulty = preferences.difficulty || 
    (['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'C3'] as const)[Math.floor(Math.random() * 7)];

  // 句子長度對應的字數範圍和特徵說明
  const lengthGuidelines: Record<string, { range: string; description: string }> = {
    short: {
      range: "5-8",
      description: `**Short Sentence (5-8 words) Requirements**:
- Simple, direct, and concise expression
- Express ONE clear idea or action
- Minimal modifiers and descriptive words
- Simple sentence structure (Subject-Verb-Object or Subject-Verb)
- Avoid complex clauses, multiple ideas, or extensive descriptions
- Examples: "I love reading books." / "She goes to school every day." / "The cat is sleeping."
- Keep it brief and straightforward - get to the point quickly`,
    },
    medium: {
      range: "10-15",
      description: `**Medium Sentence (10-15 words) Requirements**:
- Moderate complexity with some detail
- Can include ONE subordinate clause or a few modifiers
- May contain additional information (time, place, reason, manner)
- Balanced structure - not too simple, not overly complex
- Examples: "I enjoy reading books because they help me relax after work." / "She decided to visit the museum that her friend recommended last week."
- Provide context and detail while remaining clear and readable`,
    },
    long: {
      range: "18-25",
      description: `**Long Sentence (18-25 words) Requirements**:
- Complex structure with multiple clauses or extensive descriptions
- Can include multiple subordinate clauses, relative clauses, or detailed modifiers
- Rich in detail, context, and information
- May combine multiple related ideas or provide comprehensive descriptions
- Examples: "Despite the heavy rain that had been falling all morning, she decided to walk to the nearby bookstore that her friend had recommended."
- Create a more elaborate, detailed, and nuanced expression`,
    },
  };

  const lengthGuideline = lengthGuidelines[sentenceLength];

  // 主題描述：合併選擇的主題和自訂主題
  const allTopics = [...preferences.topics];
  if (preferences.customSentence?.trim()) {
    allTopics.push(preferences.customSentence.trim());
  }
  const topicsText =
    allTopics.length > 0
      ? `topics: ${allTopics.join(", ")}`
      : "any common topic";

  // 難度等級的詳細說明
  const difficultyGuidelines: Record<string, string> = {
    A1: `**A1 (Beginner) Requirements**:
- Use ONLY the most basic vocabulary (common everyday words)
- Simple present tense, present continuous, and basic past tense only
- No complex grammar structures
- Use short, simple sentences with basic word order (Subject-Verb-Object)
- Avoid idioms, phrasal verbs, or advanced vocabulary
- Examples of appropriate words: "hello", "book", "car", "happy", "go", "see"
- Avoid: complex verbs, abstract concepts, technical terms`,

    A2: `**A2 (Elementary) Requirements**:
- Use common, everyday vocabulary (slightly more varied than A1)
- Basic tenses: present, past, future (will/going to)
- Simple conjunctions: "and", "but", "or", "because"
- Basic prepositions and common phrasal verbs (e.g., "get up", "look for")
- Simple relative clauses with "who", "which", "that"
- Examples: "I want to visit the museum because it's interesting"`,

    B1: `**B1 (Intermediate) Requirements**:
- More varied vocabulary including some less common words
- Multiple tenses: present perfect, past perfect, conditionals
- Complex sentence structures with subordinate clauses
- Common phrasal verbs and idioms
- Passive voice occasionally
- Examples: "If I had more time, I would travel around the world"`,

    B2: `**B2 (Upper-Intermediate) Requirements**:
- Advanced vocabulary with nuanced meanings
- Complex grammar: mixed conditionals, advanced passive, reported speech
- Sophisticated sentence structures with multiple clauses
- Idiomatic expressions and phrasal verbs
- Abstract concepts and technical terms when appropriate
- Examples: "Despite having studied for hours, she couldn't recall the information"`,

    C1: `**C1 (Advanced) Requirements**:
- Very advanced and precise vocabulary
- Complex grammatical structures: inversion, advanced conditionals, subjunctive
- Sophisticated sentence patterns with multiple embedded clauses
- Nuanced expressions, idioms, and collocations
- Abstract and academic language
- Examples: "Had it not been for his intervention, the situation would have deteriorated further"`,

    C2: `**C2 (Proficiency) Requirements**:
- Native-level vocabulary with subtle distinctions
- Highly complex grammatical structures
- Sophisticated rhetorical devices and varied sentence patterns
- Advanced idiomatic expressions and cultural references
- Academic or professional language when appropriate
- Examples: "Notwithstanding the considerable obstacles that lay ahead, she remained undeterred"`,

    C3: `**C3 (Mastery) Requirements**:
- Extremely advanced vocabulary with precise, nuanced meanings
- Highly sophisticated grammatical structures and stylistic variations
- Complex rhetorical patterns and literary devices
- Advanced idiomatic expressions, cultural references, and domain-specific terminology
- Near-native fluency with subtle language nuances
- Examples: "In light of the aforementioned circumstances, one might reasonably infer that..."`,
  };

  const difficultyGuideline = difficultyGuidelines[difficulty] || difficultyGuidelines.A1;

  return `Generate an English typing practice exercise with the following requirements:

1. **Difficulty**: ${difficulty} (CEFR standard)
${difficultyGuideline}

2. **Sentence length**: ${sentenceLength} sentence (${lengthGuideline.range} words)
${lengthGuideline.description}

3. **Topics**: ${topicsText}

**VARIETY REQUIREMENTS** (to ensure different exercises each time):
- Use different verbs, nouns, and sentence patterns each time
- Vary the scenarios and contexts (daily life, work, travel, hobbies, etc.)
- Use different time references (present, past, future) when appropriate
- Include different types of modifiers, clauses, and phrases
- Be creative with vocabulary choices while staying within the difficulty level

**CRITICAL REQUIREMENTS**:
- The sentence MUST match the ${difficulty} difficulty level exactly. Use vocabulary and grammar structures appropriate ONLY for ${difficulty} level.
- The sentence MUST be a ${sentenceLength} sentence following the structure guidelines above, not just meet the word count.
- The sentence MUST have EXACTLY ${lengthGuideline.range} words (count carefully!)
- Combine both requirements: use ${difficulty}-level language in a ${sentenceLength} sentence structure.
- **IMPORTANT**: Create a COMPLETELY DIFFERENT and UNIQUE sentence each time. Do NOT repeat similar sentences or use the same sentence patterns. Be creative and vary the topics, vocabulary, and sentence structures while still meeting the requirements above.

Please create a natural, practical English sentence that:
- Has EXACTLY ${lengthGuideline.range} words
- Follows the ${sentenceLength} sentence structure guidelines
- Uses ${difficulty}-level vocabulary and grammar
- Breaks down into progressive chunks for typing practice
- Is DIFFERENT from any previous sentences you may have generated

**Important**: You MUST respond in valid JSON format with this exact structure:

{
  "sentence": "The complete English sentence",
  "chunks": [
    "smallest meaningful phrase (2-3 words)",
    "medium phrase (4-6 words)",
    "complete sentence"
  ],
  "translation": "完整句子的繁體中文翻譯",
  "chunkTranslations": [
    "第一個chunk的繁體中文翻譯",
    "第二個chunk的繁體中文翻譯",
    "第三個chunk的繁體中文翻譯"
  ],
  "wordMeanings": {
    "word1": "單字1的繁體中文意思 (詞性)",
    "word2": "單字2的繁體中文意思 (詞性)"
  }
}

**Chunk rules**:
- Start with the smallest meaningful phrase (usually at the end of the sentence)
- Gradually expand to larger phrases
- Always end with the complete sentence
- Each chunk should be a continuous part of the sentence

**Example** (for reference only, create a COMPLETELY DIFFERENT sentence each time):
{
  "sentence": "This is a photograph of our village",
  "chunks": [
    "our village",
    "of our village",
    "a photograph of our village",
    "This is a photograph of our village"
  ],
  "translation": "這是我們村莊的照片",
  "chunkTranslations": [
    "我們的村莊",
    "我們的村莊",
    "我們村莊的照片",
    "這是我們村莊的照片"
  ],
  "wordMeanings": {
    "photograph": "照片 (名詞)",
    "village": "村莊 (名詞)",
    "our": "我們的 (代名詞)",
    "this": "這 (代名詞)",
    "is": "是 (動詞)",
    "a": "一個 (冠詞)",
    "of": "的 (介系詞)"
  }
}

**Important notes**:
- chunkTranslations array MUST have the same length as chunks array
- Each chunkTranslation should be the natural Chinese translation of the corresponding chunk
- wordMeanings should include ALL words from the sentence, not just important ones
- Each word meaning MUST include the part of speech (詞性) in parentheses, such as: "照片 (名詞)", "是 (動詞)", "我們的 (代名詞)", "的 (介系詞)", "一個 (冠詞)"
- Common parts of speech in Chinese: 名詞, 動詞, 形容詞, 副詞, 代名詞, 介系詞, 冠詞, 連接詞, 感嘆詞

Now generate a COMPLETELY NEW and UNIQUE exercise following all requirements above. Make sure the sentence is different from any previous exercises. Be creative and vary the content, vocabulary, and sentence patterns. Return ONLY the JSON object, no additional text.`;
}
