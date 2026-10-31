# Keys & Doors

鍵と扉で自然演繹を遊ぶ、スマートフォンで遊びやすいパズルゲーム。

A phone-friendly puzzle game that turns natural deduction into keys and doors.

## 開発

Node.js 24以降で実行します。

```sh
npm ci
npm run dev
npm test
npm run build
npx playwright install chromium
npm run test:e2e
npm run lint
```

- 第1・第2層の9ステージをデータ順に実装。それ以降の20層は未対応の規則を必要とするためロックしています。`docs/design.md` の提案8問ではなく、`src/stages/` と `docs/stage-map.md` が出題順の正本です。
- `src/core.ts` はDOM非依存の不変状態遷移、構文解析、独立した証明検査、ヒント用の有限探索を提供します。`src/main.ts` は表示と操作、`src/progress.ts` は検査済みのクリア証明と設定の保存を担当します。
- 鍵をタップして対象をタップ、またはドラッグ。輪の鍵は空き枠で分解します。差し込み口の鍵を続けて2回タップすると、必要な鍵を補助目標として証明できます（stage-009）。鍵や扉の長押しで数式、下部ボタンでUndo・部屋リセット・ヒント・数式表示。リセットは今いる部屋を入室時点の鍵に戻し、長押しするとステージ全体を戻します。部屋の移動は取り消し履歴に入りません。
- 進捗は `keys-and-doors:v1` に保存します。読み込み時に証明を検査し、不正な記録は無視します。容量不足などで保存できなくても、その場のプレイは継続できます。
- Vitestで5規則・不正操作・スコープ・全9問の解と証明・保存を検証し、既存のデータテストで全119問と対応表を検証します。Playwrightで携帯・デスクトップの操作、全9問、保存、リプレイを検証します。スクリーンショットはリポジトリ外の `/tmp/kd/shots/` に保存します。
- PagesはリポジトリのSettings → PagesでGitHub Actionsを選択してください。デプロイはmainのみ。相対アセットパスなのでプロジェクト配下でも動作します。

## クレジット

ステージ構成と問題は、木原貴行さんによる「Proof Dungeon」（[kihara-logic/proof-dungeon](https://github.com/kihara-logic/proof-dungeon)）に基づいています。原作の告知は[こちら](https://x.com/tri_iro/status/2116094777720799282)です。数式と出題順の出典と対応は[ステージ対応表](docs/stage-map.md)に記録しています。ゲーム内でも、設定画面の「クレジット」から同じ内容を確認できます。

原作のコード・文章・物語・画像は一切コピーしていません。

原作は[LICENSE](https://github.com/kihara-logic/proof-dungeon/blob/main/LICENSE)を公開しており、ソフトウェアをMITライセンス、文章をCC BY-NC-SA 4.0で提供しています。このプロジェクトのクレジット表記は原作のライセンスに準拠させ、原作のライセンスが今後変更された場合もそれに従います。

## License / ライセンス

[MIT](LICENSE) © 2026 yasuhito
