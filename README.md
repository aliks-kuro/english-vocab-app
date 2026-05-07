# VocabMaster — 英単語学習アプリ

英単語を検索・登録して、3種類のゲームで楽しく覚えるWebアプリ。

## 主な機能

### 単語管理
- **単語検索** — [dictionaryapi.dev](https://dictionaryapi.dev) で英英定義を取得し、[MyMemory API](https://mymemory.translated.net) で日本語訳を自動付与
- **マイ単語リスト** — 登録済み単語の一覧表示・検索・絞り込み（全て / 覚えた / 要復習）
- **インライン編集** — 定義（英語・日本語）を直接編集可能
- **覚えた管理** — 単語ごとに「覚えた」フラグをトグル

### ゲーム

| # | タイトル | 概要 |
|---|---------|------|
| 1 | **アナグラム** | 画面を飛び回る文字タイルをクリックして単語のスペルを完成させる |
| 2 | **トロッコ** | 分岐するレール上のA〜D選択肢から正しい意味を選びトロッコを誘導する |
| 3 | **ダンジョン・タイピング** | 暗闇のダンジョンでモンスターの意味を見て英単語を入力し撃破する |

#### Game 1 — アナグラム
- 物理演算で動く文字タイル（64px 円形ボタン）を順番にクリック
- 単語の長さに応じて制限時間が変わる（4文字以下: 30秒、以降1文字ごとに+5秒）
- 3ミス or タイムアップで次の単語へ（5ミスでゲームオーバー）
- 正解で100点

#### Game 2 — トロッコ
- 3Dパース視点のレール + TPS視点のトロッコ
- ← → キーまたは選択肢ボタンでレーンを選択、Enter/決定で回答
- 回答確定後にトロッコが約2秒走り続け、正解レールは緑に発光・不正解レールには落とし穴が出現
- タイムアウト時は現在のレーンを自動選択
- 画面下部に間違えた単語リストを表示

#### Game 3 — ダンジョン・タイピング
- Lv.1〜Lv.7の7段階難易度（単語の文字数で自動分類）
- 4文字以下→Lv.1（スライム）/ 13文字以上→Lv.7（魔王）
- コンボボーナス: ×1.5（2連続）/ ×2.0（4連続）/ ×3.0（6連続）
- タイムアウト時は正解単語を表示してEnterで次へ

## 技術スタック

| カテゴリ | 採用技術 |
|---------|---------|
| フレームワーク | React 19 + TypeScript |
| ビルドツール | Vite |
| スタイリング | Tailwind CSS |
| アニメーション | Framer Motion |
| 状態管理 | Zustand（localStorage永続化） |
| ゲーム描画 | Canvas 2D API（requestAnimationFrame） |
| ルーティング | React Router v7 |

## セットアップ

```bash
npm install
npm run dev
```

開発サーバーが `http://localhost:5173` で起動します。

```bash
npm run build    # 本番ビルド
npm run preview  # ビルド後のプレビュー
```

## 画面構成

```
/        ホーム（単語検索・おすすめ単語）
/list    マイ単語リスト
/test    フラッシュカードテスト
/game1   アナグラムゲーム
/game2   トロッコゲーム
/game3   ダンジョン・タイピング
```

## 外部API

| API | 用途 | 制限 |
|-----|------|------|
| [dictionaryapi.dev](https://dictionaryapi.dev) | 英英定義・発音記号・品詞・例文の取得 | 無料・APIキー不要 |
| [MyMemory](https://mymemory.translated.net) | 英語→日本語翻訳 | 無料・APIキー不要（1日5000文字） |

APIが利用できない場合でも、登録済み単語のデータはlocalStorageに保存されているため、オフラインでゲームをプレイできます。

## ディレクトリ構成

```
src/
├── components/
│   ├── NavBar.tsx           # 下部ナビゲーション
│   ├── SearchBox.tsx        # 単語検索コンポーネント
│   └── RecommendSection.tsx
├── pages/
│   ├── Home.tsx
│   ├── MyWordList.tsx
│   ├── WordTest.tsx
│   ├── Game1Anagram.tsx
│   ├── Game2Path.tsx
│   └── Game3Type.tsx
├── store/
│   └── wordStore.ts         # Zustandストア（単語データ管理）
├── types/
│   └── index.ts             # Word型など共通型定義
└── utils/
    ├── dictionaryApi.ts     # API呼び出しユーティリティ
    ├── wordDatabase.ts      # 内蔵サンプル単語データ
    └── recommendations.ts  # おすすめ単語ロジック
```
