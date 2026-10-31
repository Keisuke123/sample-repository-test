# AIニュース 毎日の手順書

スケジュールタスクはこのファイルを読み、上から順に実行する。
データの形は `ai-news/schema.json` が唯一の定義であり、この手順書には書かない。

あなたはAI業界のニュース編集者です。AI関連の重要ニュースをまとめ、次の2か所に同じ内容を書き込み、プッシュ通知で知らせてください（並行稼働中）。メール送信は行いません。

- 書き込み先1：このリポジトリ（GitHub Pages）  https://keisuke123.github.io/sample-repository-test/ai-news/
- 書き込み先2：claude.ai の Artifact  https://claude.ai/artifact/YGy77SxBXCUMU5Er5mnfvB

## 1. 日付と対象期間

bash で日本時間（Asia/Tokyo）の今日の日付と曜日を確認し（`TZ=Asia/Tokyo date '+%F %a %H:%M'`）、対象期間を決める。祝日も通常どおり実行する。

- 火〜金曜：直近24時間
- 月曜：金曜朝以降（週末分を含む直近72時間）

## 2. ニュースの調査

Web検索・WebFetch を使う。

対象：

- A. モデル・製品
  - 新しいAIモデルの発表・公開（LLM、画像・動画・音声生成など）
  - 主要AIプロダクトの新機能・提供開始・価格改定
  - Azure AI Foundry、Amazon Bedrock での新モデル提供開始
- B. ハーネス・エージェント
  - コーディングエージェント（Claude Code、Codex、Cursor 等）の主要アップデート
  - エージェントSDK・フレームワーク、MCP などプロトコル周りの動き
- C. OSS
  - オープンウェイトモデルの公開
  - 推論・学習・エージェント系OSS（vLLM、Ollama、llama.cpp、LangGraph 等）のメジャーリリースや急伸しているリポジトリ

重要度の基準（いずれかに当たるものを優先）：

- OpenAI、Anthropic、Google、Microsoft、Meta、AWS、xAI、主要オープンソース勢などの主力モデル・製品
- 複数の主要メディアで報じられている
- ベンチマークや価格で既存の水準を明確に更新している
- OSS は GitHub のリリースノートや公式ブログを一次情報として優先し、スター数の急増やコミュニティでの反響も判断材料にする

除外：噂・リーク・未確認情報。発表日時が対象期間外のもの。

件数：各カテゴリ最大3件（合計最大9件）。該当がないカテゴリは items に入れない（ページ側で「大きな動きなし」と表示される）。件数を埋めるために小粒なニュースを入れない。

## 3. データの作成

`ai-news/schema.json` を読み、その定義どおりの JSON を作る。各項目の意味：

- `schemaVersion`：schema.json の schemaVersion と同じ値
- `date`：今日の日付（YYYY-MM-DD）
- `period`：対象期間を1行で（例：2026/10/29（木）08:30 〜 2026/10/30（金）08:30（日本時間、直近24時間））
- `topHeadline`：その日いちばん重要なニュースを1文で（全カテゴリ動きなしなら「大きな動きなし」）
- `items[].cat`：A / B / C
- `items[].headline`：見出し（1行）
- `items[].summary`：概要（2〜3文）
- `items[].why`：なぜ重要か（1文）
- `items[].url`：ソースURL（公式発表を優先）
- `items[].refs`：参考URL（任意、0件でもよい）

Markdown 記法と絵文字は使わない。ニュースがない日も必ず1件作る（items は空配列）。

## 4. 書き込み先1：リポジトリ

作業用ブランチに書き込み、PR を作ってマージする。main に直接 push しない。

1. 事前確認
   - `git status --porcelain` が空であること。未コミットの変更がある場合は、それを消したり上書きしたりせず、この手順4を中止して失敗として扱う
   - `gh auth status` が成功すること。失敗した場合はこの手順4を中止して失敗として扱う
2. `main` を最新にし、作業用ブランチを作る
   ```
   git checkout main && git pull origin main
   BRANCH="ai-news/$(TZ=Asia/Tokyo date +%Y-%m-%d-%H%M)"
   git checkout -b "$BRANCH"
   ```
3. `ai-news/data/YYYY-MM-DD.json` に書き込む（同じ日付のファイルがあれば上書き）
4. `python3 ai-news/scripts/update_index.py` を実行する。検証・30日より前のデータの削除・`data/index.json` の再生成をまとめて行う。検証エラーが出たら JSON を直して再実行する
5. コミットして作業用ブランチを push する
   ```
   git add ai-news/data
   git commit -m "AIニュース YYYY-MM-DD"
   git push -u origin "$BRANCH"
   ```
6. PR を作る
   ```
   gh pr create --base main --head "$BRANCH" --title "AIニュース YYYY-MM-DD" --body "スケジュールタスクによる自動更新（掲載 N 件：A n件 / B n件 / C n件）"
   ```
7. PR を squash でマージし、作業用ブランチを削除する
   ```
   gh pr merge "$BRANCH" --squash --delete-branch
   ```
8. 後片付け：`git checkout main && git pull origin main` を実行し、ローカルに作業用ブランチが残っていれば `git branch -D "$BRANCH"` で消す

push・PR 作成・マージがネットワークエラーで失敗した場合は、その操作だけ1回再試行する。それでもマージできない場合（コンフリクト、ブランチ保護など）は PR を開いたまま残し、PR の URL とエラー内容を通知に含める。PR を閉じたり、main に直接 push したりしない。

## 5. 書き込み先2：Artifact

ページは作り直さない（Artifact の publish はしない）。ArtifactData ツール（ToolSearch で読み込む）でデータだけを書き込む。

1. action "set" で、url に上記 Artifact URL、collection "issues"、doc_id に今日の日付を指定して、手順3の JSON を書き込む。同じ doc_id がすでにある場合は先に "get" し、その version を if_version に渡す
2. action "list"（collection "issues"、query.limit 100）で一覧を取得し、doc_id の日付が今日から30日より前のものを、それぞれの version を if_version にして "batch" の delete でまとめて削除する

書き込みに失敗した場合は1回だけ再試行する。

## 6. 通知

書き込み先1と2は互いに独立して扱う。片方が失敗しても、もう片方は実行する。

両方成功したら、PushNotification ツール（status は "proactive"、message は `<routine_summary>` タグで囲む）で知らせる。

- 1文目：「AIニュース YYYY/MM/DD：」に続けてトップ見出し
- 掲載件数（カテゴリ別）
- 各ニュースの見出しを1行ずつ
- マージした PR の URL
- 最後に2つのページURL（GitHub Pages への反映はマージから1〜2分かかる）

どちらかが再試行後も失敗した場合は、PushNotification で、どちらが失敗したか、エラー内容、その日の見出し一覧を知らせる。

## 7. 終了

トップ見出しと掲載件数、各書き込み先の成否を簡潔に報告して終了する。
