# 🚀 快速安裝指南

## 步驟 1：申請 Groq API Key（1 分鐘）

1. 前往 👉 **https://console.groq.com**
2. 用 Google 或 GitHub 帳號登入
3. 點擊 **「Create API Key」**
4. 複製你的 API Key（看起來像 `gsk_xxxxxxxxxxxxxxxxxxxx`）

> 💡 **完全免費！** 每天有 14,400 次免費請求額度

## 步驟 2：設定 API Key

編輯專案根目錄的 `.env.local` 檔案：

\`\`\`bash
GROQ*API_KEY=gsk*你的實際 API*Key*在這裡
\`\`\`

⚠️ **重要**：把 `your_groq_api_key_here` 換成你剛才複製的真實 API Key！

## 步驟 3：安裝與啟動

\`\`\`bash

# 如果還沒安裝依賴，先執行：

npm install

# 啟動開發伺服器

npm run dev
\`\`\`

## 步驟 4：開始使用

打開瀏覽器訪問：**http://localhost:3000**

---

## ✅ 功能檢查清單

啟動後，你可以測試：

- [ ] 首頁條件選擇介面正常顯示
- [ ] 選擇主題、難度、句長、句型
- [ ] 點擊「開始練習」跳轉到練習頁面
- [ ] AI 生成題目（大約 1-2 秒）
- [ ] 自動播放英文語音
- [ ] 輸入單字並提交驗證
- [ ] 錯誤高亮顯示
- [ ] 完成後顯示翻譯與解釋
- [ ] 點擊「繼續練習」生成下一題

---

## 🔧 常見問題

### 問題 1：npm run dev 啟動失敗

**解決方法**：
\`\`\`bash

# 刪除 node_modules 重新安裝

rm -rf node_modules package-lock.json
npm install
\`\`\`

### 問題 2：API 報錯「unauthorized」

**原因**：API Key 沒有正確設定

**解決方法**：

1. 確認 `.env.local` 檔案中的 `GROQ_API_KEY` 已填入真實 key
2. 重新啟動開發伺服器（Ctrl+C 後再`npm run dev`）

### 問題 3：語音沒有播放

**解決方法**：

- 使用 Chrome 或 Edge 瀏覽器（Safari 可能不穩定）
- 確認瀏覽器允許網站播放聲音
- 點擊「重聽」按鈕手動播放

### 問題 4：生成題目很慢（超過 5 秒）

**原因**：網路連線或 Groq API 延遲

**解決方法**：

- 檢查網路連線
- 稍後再試（Groq API 偶爾會較慢）
- 如果持續發生，考慮更換 AI 服務（OpenAI 或 Ollama）

---

## 📞 需要幫助？

如果遇到問題：

1. 檢查瀏覽器開發者工具的 Console（F12）
2. 查看終端機的錯誤訊息
3. 確認 `.env.local` 的 API Key 正確

---

**準備好了嗎？開始練習吧！** 🎉
