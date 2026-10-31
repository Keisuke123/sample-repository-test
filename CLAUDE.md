# CLAUDE.md

このリポジトリは、プライベート用途のWebページをまとめて管理するためのリポジトリです。

## リポジトリの目的

用途ごとにディレクトリを分けて、さまざまな静的HTMLページを整理・保管します。

## ディレクトリ構成

```
/
├── CLAUDE.md
├── index.html          # サイト一覧ページ（各ディレクトリへのリンク）
├── ai-news/            # AIニュース（スケジュールタスクが毎日 data/ を更新）
├── appliance-advisor/  # 家電製品アドバイザー 学習サイト
└── travel/
    ├── index.html      # 旅行一覧ページ
    └── *.html          # 旅行ごとのページ
```

用途が増えた場合は第一階層にディレクトリを追加し、ルートの `index.html` の一覧にもリンクを追加する。

## 開発ガイドライン

- 各ページは基本的に静的HTML（CSS・JSはインラインまたは同一ディレクトリに配置）
- ルートの `index.html` はサイト一覧ページ（AIニュースのカードには最新の見出しを表示する）
- 各ディレクトリにも `index.html` を置き、そのカテゴリ内のページ一覧を示す
- ファイル名はわかりやすい英語小文字＋ハイフン区切り（例: `singapore-2026.html`）
- 外部依存は最小限に抑える（CDN利用は可、npmビルドは不要）

## ai-news の運用

- 毎日の手順は `ai-news/ROUTINE.md`、データの定義は `ai-news/schema.json` が唯一の定義
- データ構造を変えるときは schemaVersion を上げ、`scripts/migrate.py` に移行処理を追加し、schema・ページ・ROUTINE.md・既存データを同じコミットで更新する
- `python3 ai-news/scripts/update_index.py --check` で検証できる

## コーディングスタイル

- HTML5 準拠
- インデントはスペース2つ
- 文字コードは UTF-8
