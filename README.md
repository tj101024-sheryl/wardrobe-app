# 穿搭衣櫃（Wardrobe）

個人穿搭與衣櫃管理網站。可貼商品網址抓圖、上傳截圖、一鍵摳圖，並規劃穿搭編輯器與社群分享。

## 技術棧

| 層 | 技術 |
|---|---|
| 前端 | Expo (React Native) + TypeScript + Expo Router（Web / 日後 iOS・Android） |
| 後端 | Python FastAPI + SQLite + JWT |
| 抓圖 | httpx + BeautifulSoup（OG / JSON-LD / img / 內嵌 JSON） |
| 摳圖 | rembg（本地、免費） |

## 啟動方式

### 1. 後端（port 8000）

```bash
cd backend
pip install -r requirements.txt
pip install "rembg[cpu]" email-validator
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

### 2. 前端（port 8190）

```bash
cd frontend
npm install
npx expo start --web --port 8190
```

開啟 http://localhost:8190

> **測試階段免登入**：後端 `backend/app/config.py` 的 `GUEST_MODE = True`，
> 開站直接進衣櫃，資料記在 `guest` 帳號下。
> 要恢復登入：把 `GUEST_MODE` 改 `False`，
> 並把 `frontend/src/app/index.tsx` 的重導向改回依 `useAuth().user` 判斷
> （login/register 路由與後端帳號系統都保留著）。

## 功能

- 衣櫃：上傳截圖或相簿選圖、分類、季節/場合/天氣/風格標籤、搜尋篩選
- 抓圖：貼商品網址 → 列出頁面圖片 → 勾選存入衣櫃（保留來源網址）
- 摳圖：一鍵移除背景，透明 PNG，原圖/摳圖切換檢視
- 穿搭：每日 Look、穿搭照／妝容照、快速列表與畫布拼貼（拖曳、縮放、旋轉、圖層）
- 日曆與未來穿搭：排程、到當天提醒、確認後才累計穿著次數
- 天氣穿搭：Open-Meteo／手動天氣、推薦清單、所有場合自動配整套
- 顏色牆：12 色＋HSV 色彩圓盤、衣服／穿搭分頁、單色或整套篩選
- 卡片堆疊：點擊左／右收藏或跳過、撤銷、洗牌、收藏帶入今日穿搭
- 社群：動態牆（探索／追蹤）、男生／女生／中性內容取向、穿搭／妝容／保養／教學／產品推薦篩選、按讚、留言、追蹤、個人頁
- 分享：IG 限動／貼文、FB 貼文分享圖與系統分享面板
- 離線快取：動態牆與穿搭首頁斷線時顯示上次資料

### 後續可擴充

- IG 限動原生深度連結（需開發版）
- 完整論壇／通知推播
- 更智慧的個人化穿搭推薦

## 資料位置

- 資料庫：`backend/data/wardrobe.db`
- 原圖：`backend/data/uploads/`
- 摳圖：`backend/data/cutouts/`

## 抓圖限制說明

僅解析「使用者主動貼上的單一網址」並下載到個人衣櫃，不做批量爬取。部分網站（蝦皮等）有反爬或純動態載入會抓不到，此時請改用截圖上傳。

## 期末報告

- 需求與架構：`計畫書.md`
