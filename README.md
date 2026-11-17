# 蒼の境界 — 小さな戦略RPG

オリジナルのピクセル戦略RPGの縦切りです。青の2人を指揮して峠の敵2人を倒します。敵ターンは自動進行し、勝敗後は再戦できます。地形とユニットは実行時に図形から生成し、音楽と効果音はWeb Audioで合成します。画像・音声ファイルは使いません。

## Codex Cloudで起動・検証

```sh
npm ci
# Playwright標準Chromiumを取得できない環境では、システムのChromiumを指定する
PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium npm run test:e2e
npm run dev
npm run test
npm run build
```

`npm run build` はTypeScript strict検査、Viteビルド、容量検査を実行します。通常の環境では `npx playwright install chromium` 後に `npm run test:e2e` を実行できます。CIではPlaywrightのChromiumを自動インストールします。

味方を選択すると移動可能なマスが緑、攻撃範囲が橙で表示されます。1ターンにつき1人あたり最大3マス移動し、隣接する敵を1回攻撃できます。移動後の攻撃も可能です。「行動を終える」で敵AIが行動します。「♪ 音声」で合成音声を切り替えられます。

ゲームルールと敵AIは `src/game/` の純粋関数、描画・アニメーション・入力は `src/scene/`、合成音声は `src/audio/` にあります。E2Eテストは `window.__GAME_TEST__.getState()` で状態のコピーを読み、`isBusy()` でアニメーション完了を待ちます。テスト結果のスクリーンショット、ブラウザエラー、最後のゲーム状態は `test-results/` とPlaywrightレポートに残ります。

## 配信と容量

`main` にpushするとGitHub ActionsがVitest、ビルド、Playwrightを実行してGitHub Pagesへデプロイします。Pull Requestでは検証のみ実行します。PagesのSourceは初回のみGitHub Actionsに設定します。`GITHUB_PAGES=true` でViteの `base` を `/<repository>/` に切り替えます。

`scripts/size-report.mjs` がgzip換算の初回転送量を2MiB以下、画像と音声それぞれの生データを500KiB以下に制限します。実測値と次の改善計画は [マイルストーン記録](docs/milestone-1.md) を参照してください。
