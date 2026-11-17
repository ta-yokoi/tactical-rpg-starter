# 小さな戦略RPG

TypeScript strict mode、Phaser、Viteによるブラウザ向け2D戦略RPGの最小構成です。画像ファイルは使わず、Phaserの図形描画でマップとユニットを表示します。

## 起動・検証

```sh
npm ci
npx playwright install chromium
npm run dev
npm run test
npm run build
npm run test:e2e
```

青の部隊から始まります。ユニットをクリックすると移動範囲（緑）と隣接する攻撃範囲（橙の枠）が表示されます。移動先または敵をクリックして行動し、「ターン終了」で陣営を交代します。両陣営とも手動操作です。各ユニットは1ターンにつき3マスまで移動し、隣接する敵を1回攻撃できます。敵のHPを0にして全滅させると勝利です。

ゲームルールは `src/game/rules.ts` の純粋関数にあり、描画と入力は `src/scene/BattleScene.ts` にあります。E2Eテストは `window.__GAME_TEST__.getState()` でゲーム状態のコピーを参照できます。ブラウザのエラーと最後の状態はテストレポートに添付され、スクリーンショットは `test-results/` に保存されます。

## GitHub Pages

`main` へのpush時、GitHub Actionsがテスト・ビルド後にPagesへデプロイします。Actionsの `configure-pages` がPagesを有効化します。ビルド時の `GITHUB_PAGES=true` により、Viteの `base` は `/<repository>/` になります。Pull Requestでは検証だけ実行します。失敗時はActionsのログと `browser-report-*` artifactで原因を確認できます。
