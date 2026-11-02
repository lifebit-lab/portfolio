# ポートフォリオの週次点検

`~/projects/` を見て、ポートフォリオに載せるべき変化がないかを調べ、レポートを書き出す。
**調べて報告するだけで、サイトの変更はしない。**

## 何を調べるか

| | 内容 |
|---|---|
| 1. 未掲載のプロジェクト | `~/projects/` にあってポートフォリオに載っていないもの。デプロイ設定（Vercel / Cloudflare / Firebase）から公開URLを推測し、実際に応答があれば「公開中」と明示する |
| 2. 掲載済みで更新があったもの | 前回の点検以降にコミットが進んだもの。スクリーンショットや説明文が実態とずれていないか見直す手がかりになる |
| 3. 公開URLの死活 | `index.html` の外部リンクを実際に叩き、200を返さないものを報告する |

3つ目は、2026年10月に医療経営士試験対策PWAのバックエンド（Supabase）が停止し、
「公開中」と表示したまま全機能が動かなくなっていた事故を早く見つけるためのもの。

## 実行

```bash
node ~/projects/portfolio/.claude/scripts/weekly-check.mjs
```

結果は次の2つに出る。

- レポート: `.claude/notes/weekly-check.md`（毎回上書き）
- macOS の通知（件数の要約。クリックせずとも見える）

## 週次で自動実行する

`launchd` に登録すると毎週月曜9時に動く。**登録は手動で行う**（自動起動の登録は
Claude Code の安全制限により代行できない）。

```bash
cp ~/projects/portfolio/.claude/scripts/com.lifebit.portfolio-watch.plist ~/Library/LaunchAgents/
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.lifebit.portfolio-watch.plist
```

確認・解除は次のとおり。

```bash
launchctl print gui/$(id -u)/com.lifebit.portfolio-watch   # 状態を見る
launchctl kickstart gui/$(id -u)/com.lifebit.portfolio-watch  # 今すぐ1回動かす
launchctl bootout gui/$(id -u)/com.lifebit.portfolio-watch  # 解除する
```

Mac がスリープしていた場合は、次に起きたときに実行される。
`node` のパスが `/usr/local/bin/node` でない環境では plist を書き換えること。

## 設定

`.claude/portfolio-watch.json` で管理する。

| キー | 意味 |
|---|---|
| `listed` | 掲載済み（ディレクトリ名 → カードでの扱い）。**作品を追加したら手で足す** |
| `ignore` | 載せるつもりがないもの。未掲載の一覧に出したくなければここに足す |
| `lastCommit` | 前回点検時の最終コミット日時。スクリプトが自動で更新する |

初回は現状を記録するだけで、差分は次回から出る。
