# 全面改修の記録（2026-10-10）

対象: https://lifebit-lab.github.io/portfolio/
ブランチ: `redesign/digital-life-experiments`

## 構成
ビルド工程なしの静的サイトを維持。追加ライブラリはゼロ（Google Fontsのみ）。

| ファイル | 役割 |
|---|---|
| `index.html` | 全セクションの内容。作品情報はHTMLに直書き（JS無効でも全文読める） |
| `css/style.css` | デザイントークン、12カラムの構図、出現演出、レスポンシブ |
| `js/main.js` | ナビ、シーン切替、出現、ジャンプナビ、Giscus遅延読込、カーソル、Auroraプレビュー |
| `js/hero-gl.js` | 背景の「デジタル実験体」（素のWebGL1・約11KB） |
| `images/*.webp` | 公開中アプリの実スクリーンショット（計129KB） |
| `images/og.jpg` | OGP画像（ヒーローから生成・89KB） |

## 実施したテスト（2026-10-10）

すべて `python3 -m http.server 8000` + Playwright（Chrome）で実施。

| 項目 | 結果 |
|---|---|
| 外部リンク10件のHTTPステータス | 全て200（各アプリ7件・フォーム・giscus） |
| 横方向のはみ出し（1440/1024/390/320） | なし（`scrollWidth === innerWidth`） |
| Consoleエラー | 0件（1440でWebGLドライバの性能警告のみ・Chrome由来） |
| JavaScript無効 | h1・作品10件・リンク7件すべて表示（本文3733文字） |
| WebGL無効（`--disable-webgl`） | `gl-on`付与なし→CSSのフォールバック表示、エラー0件 |
| prefers-reduced-motion | 出現演出が静止状態、カスタムカーソル無効、WebGLは1フレームのみ |
| キーボード操作 | Tabで全リンク到達、フォーカスリング（ライム2px）表示、Escでメニュー閉じる |
| モバイルメニュー | 開閉・Esc・リンクタップで閉じる、すべて動作 |
| Giscus（作品ごと） | iframe生成を確認（ダークテーマ） |
| 画像7枚の読み込み | 全て complete（404なし） |

### Lighthouse 実測値（localhost配信・Chrome headless）
- Desktop preset: Performance **100** / Accessibility **100** / Best Practices **100** / SEO **100**
  - LCP 0.3s / CLS 0.005 / TBT 0ms
- Mobile preset（3回計測）: Performance **100**（3回とも）
  - LCP 1.2s / CLS 0.001 / TBT 10〜70ms
  - ※localhost配信のため、ネットワーク条件は実環境と異なる。GitHub Pages公開後の再計測が必要。

### 計測中に見つけて直したもの
- Google Fontsが描画を2.16秒ブロック → `media="print"` + `onload` の非ブロック読み込みに変更（noscript併記）
- イントロの文字が暗い状態（opacity .14）でコントラスト基準未満 → 暗い状態を .6（小見出しは .72）に引き上げ
- ブランドリンクの `aria-label` が可視テキストと不一致 → aria-label を削除
- Coming Soonカードがスマホで最小幅を押し広げる → `minmax(0,1fr)` と `min-width:0` を指定
- 右端のセクションインジケーターのラベルが本文に重なる → ラベルはホバー・フォーカス時のみ表示

## 未解決の課題・今後の改善案
1. **GitHub Pages公開後の再計測** — Lighthouseはlocalhost計測のため、実ネットワークでのLCP/INPは未測定。
2. **家計簿PWA（01）の扱い** — 現在「停止中」と表示。公開先 `household-pwa.vercel.app` は200を返すがログイン画面のため、ポートフォリオ上は従来どおり停止中のまま据え置いた。再開時はカードの状態バッジとリンクを更新すること。
3. **スクリーンショットの鮮度** — 2026-10-10時点の画面。アプリ更新時は `images/*.webp` を撮り直す。
4. **実機確認** — iOS Safari / Android Chromeの実機では未確認（Playwrightのエミュレーションのみ）。特にWebGLの発熱と電池消費。
5. **サウンド** — 指示書では任意扱い。今回は無音で成立させ、未実装。
6. **Experimentsセクション** — 制作記録が乏しいため、実在する設計判断4件（確信度バッジ・150秒で消える記憶・投資助言にしない設計・URLだけで届く）で構成。制作過程の素材が貯まったら差し替え可能。

## 新しい作品を追加するとき
`index.html` の `<!-- 08: バリアフリー乗換ガイド -->` の直前に `<article class="work work--○○">` を追加する。
構図クラスは `work--right` / `work--left` / `work--wide` / `work--phone` / `work--feature` から選び、前後と違うものにする。
Coming Soon は `.lab__grid` の中に `work--lab` で追加する。ジャンプナビと作品IDはJSが自動生成する。
