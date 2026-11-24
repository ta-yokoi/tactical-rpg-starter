# 蒼の境界 — 小さな戦略RPG

オリジナルのピクセル戦略RPGの縦切りです。第1章では青の2人を指揮して峠を守り、第2章では渡し守のナギを対岸まで護衛し、終章では明け方まで見張り台を守ります。敵ターンは自動進行し、勝敗後はその章を再戦できます。地形とユニットは実行時に図形から生成し、音楽と効果音はWeb Audioで合成します。章ごとの背景はオリジナルのWebPイラストです。肖像は64×64ピクセルの透過WebPを1枚にまとめ、戦場のスプライトは実行時に描きます。音声ファイルは使いません。

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

青の味方を選択し、青いマスに移動するか橙の枠の敵を攻撃できます。1ターンに1人あたり最大3マス移動し、1回攻撃できます。騎士は隣接、星詠みは最大2マス先を攻撃します。石垣は移動と術の経路を遮ります。カーソルを合わせると移動経路、地形、敵のHPや攻撃結果を確認できます。橙の枠の敵を選ぶと戦闘予告が開き、攻撃と反撃によるHPの変化を確認できます。低木では被ダメージが1減ります。

戦場はクリック・タップ、またはTabで戦場にフォーカスして矢印キーとEnterで操作できます。「行動を終える」で敵AIが行動します。「♪ 音声」で合成音声を切り替えられます。

第1章の勝利画面で「編成へ進む」を選びます。アステルとリナの装備、部隊で一つの訓練を選び、能力値の変化を確認してから第2章に出撃します。編成の選択は出撃前にも保存され、第2章を再戦しても維持されます。ナギを選んで1ターンに最大2マス移動し、橋を渡って東岸の灯火台へ。ナギは攻撃・反撃ができず、倒されると敗北します。灯火台への到着が勝利条件です。第2章をクリアすると、編成を引き継いで終章に進めます。敵フェイズ終了時に味方が見張り台にいれば防衛が1回進み、3回連続で守るとエンディングが開きます。味方フェイズ中に守り手を交代できます。旧版から再開した終章は従来の2回でクリアできます。

行動の完了時と章の切り替え時に、現在の章・ターン・ユニットの状態を同じブラウザに自動保存します。タイトルの「続きから」で最後に完了した行動の後から再開できます。進行がある状態で「はじめから」を選ぶと、上書き前に確認を表示します。敵フェイズの途中でページを閉じた場合は、直前の味方ターンの状態に戻ります。第1章では、味方の選択、移動、攻撃予告、ターン終了の手順を戦況欄に表示します。

ゲームルールと敵AIは `src/game/` の純粋関数、描画・アニメーション・入力は `src/scene/`、合成音声は `src/audio/` にあります。E2Eテストは `window.__GAME_TEST__.getState()` で状態のコピーを読み、`isBusy()` でアニメーション完了を待ちます。テスト結果のスクリーンショット、ブラウザエラー、最後のゲーム状態は `test-results/` とPlaywrightレポートに残ります。

## 配信と容量

`main` へのpush、またはActionsの `CI and Pages` を `main` で手動実行すると、Vitest、ビルド、PlaywrightのあとにGitHub Pagesへデプロイします。公開URLから今回のビルドのJavaScriptを取得できることも確認します。Pull Requestでは検証のみ実行します。CIのPlaywrightはビルド済みファイルをPagesと同じサブパスで検証します。PagesのSourceは初回のみGitHub Actionsに設定します。`GITHUB_PAGES=true` でViteの `base` を `/<repository>/` に切り替えます。Cloudで同じ検証を実行する場合は次の通りです。

```sh
GITHUB_PAGES=true npm run build
GITHUB_PAGES=true PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium npm run test:e2e
```

`scripts/size-report.mjs` がgzip換算の初回転送量を2MiB以下、画像と音声それぞれの生データを500KiB以下に制限します。現在の実測値と改善計画は [開発計画](docs/production-roadmap.md) にまとめています。

製品版に向けた段階と完了条件は [開発計画](docs/production-roadmap.md) を参照してください。
