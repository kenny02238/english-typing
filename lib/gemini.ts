import { GoogleGenAI } from "@google/genai";

// 初始化 Google Gemini client
// API key 從環境變數 GEMINI_API_KEY 讀取
if (!process.env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY 環境變數未設定");
}

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export default ai;

