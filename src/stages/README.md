# ステージデータ

`index.json` のファイル順、各ファイルの `stages` 順が全体の順序。22層・119ステージ。
対応する原番号と規則は [対応表](../../docs/stage-map.md) を参照する。

- `id`: このプロジェクトの層・ステージ識別子。
- `kind`: `prove` は証明、`countermodel` は反例、`classify` は各小問の証明可能性の判定、`infinite-countermodel` は無限Kripkeモデルによる反例。
- `logic`: 古典論理または直観主義論理。古典的な式が前提にあっても、背理法を禁止する問題は `intuitionistic`。
- `induction`: 自然数の帰納法を利用できるか。再帰式の存在だけから帰納法を補わない。
- `tasks`: 小問の順序付き配列。通常問題も要素数1で表す。各要素の `goal` が目標、`assumptions` が初期前提の順序付き配列。
- `lemmas`: 初期前提に追加して利用できる既証明の式。省略時は空配列。各小問に共通。
- `definitions`: `sets` は集合・範囲量化の定義展開、`additive-order` は `x ≤ y` の `∃z.(x + z = y)` への展開。省略時は追加定義なし。

数式はUnicodeの文字列。結合子は `∧ ∨ → ¬ ⊥`、量化子は `∀ ∃`。量化子の `.` の右側が作用域であり、括弧を優先する。原子式・項の記号は保持する。構文木・証明・正誤の解答・画面表示用の文章は含めない。

確認コマンド: `node --test src/stages/stages.test.mjs`
