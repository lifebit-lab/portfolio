# LIFEBIT LAB Design System

## Overall Direction
- スタイル: editorial × experimental（Awwwards志向のダークエディトリアル）
- 用途: portfolio
- モード: dark only（`color-scheme: dark`）
- 一言で: 「個人ラボの実験ノートのような、静かな暗闇に光が差すポートフォリオ」

コンセプト: **DIGITAL LIFE EXPERIMENTS**
暮らしの小さな不便を、AIとコードで実験し、使える形に変える個人ラボ。
完成品だけでなく「試行錯誤そのもの」も展示物として扱う。

## Typography
- Display / Headings: Space Grotesk（700）
- Body（日本語）: Noto Sans JP（400/500/700）
- Mono（番号・ラベル・技術情報）: IBM Plex Mono（400/500）
- Hero: `clamp(2.6rem, 12.4vw, 13rem)` / line-height .86 / letter-spacing -.045em
- 見出しは行間0.88〜0.92、字間 -0.04em を基準にする
- **Inter は使わない**（旧デザインからの脱却点）

## Color Palette（dark only）
- Background: `#080A0F`（Ink Black）
- Surface: `#101521`（Deep Navy） / パネル `#0d121c`
- Border: `rgba(243,245,247,.14)` / 強め `rgba(243,245,247,.28)`
- Text primary: `#F3F5F7`
- Text secondary: `#9299A8` / tertiary `#646b7a`
- Accent 1（操作・重要ラベル）: `#C8FF45`（Electric Lime）
- Accent 2（光・奥行きの演出）: `#9274FF`（Electric Violet）

### 使い分けの原則
- ライムは「触れる場所」と「今ここ」を示すときだけ使う（ボタン、アクティブ、LIVE、番号ラベル）
- バイオレットは発光・奥行き・デモ状態の表示に限る
- 画面の大半は暗い面と余白。明るい要素が際立つよう、ネオンを広い面積に敷かない

## Spacing & Decoration
- Gutter: `clamp(16px, 5vw, 88px)` / 12カラムグリッド
- Border radius: 2〜3px（スマホ枠のみ30px）
- Shadow: **使わない**（暗闇では発光とコントラストで階層を作る）
- Motion: `cubic-bezier(.16,1,.3,1)`、0.3s（操作の反応）〜1.4s（出現）

## Prohibited
- Inter の過多使用
- 紫のグラデーション多用（バイオレットは局所的な発光のみ）
- 浮き出た均一なカードデザイン / 全作品を同じサイズ・同じ構図で並べること
- 中央揃えだけの退屈な Hero
- 過度・無意味なアニメーション（同時に動く主役は1つ）
- 真っ白背景 + 強すぎるコントラスト
- WebGLキャンバスに文字やナビゲーションを描くこと
- 実績・制作工程の誇張や捏造（公開状態は実際のまま記載する）

## Motion Rules
- 主役の演出を優先し、同時に動く要素を増やさない
- セクションごとに演出を変える（Hero=マスク、Intro=点灯、Projects=クリップ、Experiments=ずらし）
- `prefers-reduced-motion` ではすべて静止させ、内容と操作性を保つ
- スクロールを奪わない（ロック・ホイール乗っ取りの禁止）

## References
- 既存作品 Aurora Memoria（記憶が消えていく表現）の世界観を継承
