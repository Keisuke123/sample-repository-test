#!/usr/bin/env python3
"""AIニュースのデータを検証し、古いデータを削除して data/index.json を作り直す。

使い方:
  python3 ai-news/scripts/update_index.py            # 検証・削除・index 再生成
  python3 ai-news/scripts/update_index.py --check    # 検証のみ（ファイルを変更しない）

標準ライブラリのみで動く。schema.json の定義（JSON Schema のサブセット）に従って検証する。
検証エラーがあれば終了コード 1 で終わり、ファイルは変更しない。
"""

import argparse
import datetime
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
SCHEMA_PATH = ROOT / "schema.json"
INDEX_PATH = DATA_DIR / "index.json"
DATE_FILE = re.compile(r"^\d{4}-\d{2}-\d{2}\.json$")
JST = datetime.timezone(datetime.timedelta(hours=9))

# Markdown 記法と絵文字は禁止（本文はプレーンテキスト）
MARKDOWN = re.compile(r"\*\*|__|`|\[[^\]]*\]\([^)]*\)|^\s*#{1,6}\s|^\s*[-*]\s", re.M)
EMOJI = re.compile("[\U0001F000-\U0001FAFF☀-➿️]")


def validate(value, schema, path, errors):
  """JSON Schema のサブセット（type/const/enum/pattern/minLength/required/properties/items）で検証する。"""
  types = {"object": dict, "array": list, "string": str, "integer": int}
  expected = schema.get("type")
  if expected and not (isinstance(value, types[expected]) and not isinstance(value, bool)):
    errors.append(f"{path}: {expected} である必要があります")
    return
  if "const" in schema and value != schema["const"]:
    errors.append(f"{path}: {schema['const']!r} である必要があります（実際: {value!r}）")
  if "enum" in schema and value not in schema["enum"]:
    errors.append(f"{path}: {schema['enum']} のいずれかである必要があります（実際: {value!r}）")
  if isinstance(value, str):
    if len(value) < schema.get("minLength", 0):
      errors.append(f"{path}: 空にできません")
    if "pattern" in schema and not re.search(schema["pattern"], value):
      errors.append(f"{path}: 形式が不正です（{schema['pattern']}）")
    if MARKDOWN.search(value):
      errors.append(f"{path}: Markdown 記法は使えません")
    if EMOJI.search(value):
      errors.append(f"{path}: 絵文字は使えません")
  if isinstance(value, dict):
    props = schema.get("properties", {})
    for key in schema.get("required", []):
      if key not in value:
        errors.append(f"{path}.{key}: 必須です")
    for key, child in value.items():
      if key in props:
        validate(child, props[key], f"{path}.{key}", errors)
      elif schema.get("additionalProperties") is False:
        errors.append(f"{path}.{key}: schema.json に定義されていない項目です")
  if isinstance(value, list) and "items" in schema:
    for i, child in enumerate(value):
      validate(child, schema["items"], f"{path}[{i}]", errors)


def validate_issue(path, schema):
  errors = []
  try:
    issue = json.loads(path.read_text(encoding="utf-8"))
  except json.JSONDecodeError as e:
    return None, [f"{path.name}: JSON として読めません（{e}）"]
  validate(issue, schema, path.stem, errors)
  if not errors:
    if issue["date"] != path.stem:
      errors.append(f"{path.stem}.date: ファイル名と一致しません（{issue['date']}）")
    for cat in schema["categories"]:
      count = sum(1 for item in issue["items"] if item["cat"] == cat)
      if count > schema["maxItemsPerCategory"]:
        errors.append(f"{path.stem}.items: カテゴリ {cat} が {count} 件あります（最大 {schema['maxItemsPerCategory']} 件）")
  return issue, errors


def main():
  parser = argparse.ArgumentParser()
  parser.add_argument("--check", action="store_true", help="検証のみ行う")
  parser.add_argument("--today", help="基準日 YYYY-MM-DD（省略時は日本時間の今日）")
  parser.add_argument("--retention-days", type=int, default=30)
  args = parser.parse_args()

  today = datetime.date.fromisoformat(args.today) if args.today else datetime.datetime.now(JST).date()
  cutoff = today - datetime.timedelta(days=args.retention_days)
  schema = json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))

  issues, errors, expired = [], [], []
  for path in sorted(DATA_DIR.glob("*.json")):
    if not DATE_FILE.match(path.name):
      continue
    if datetime.date.fromisoformat(path.stem) < cutoff:
      expired.append(path)
      continue
    issue, file_errors = validate_issue(path, schema)
    errors.extend(file_errors)
    if issue and not file_errors:
      issues.append(issue)

  if errors:
    print("検証エラー:", file=sys.stderr)
    for e in errors:
      print(f"  {e}", file=sys.stderr)
    return 1
  if args.check:
    print(f"OK: {len(issues)} 件（削除対象 {len(expired)} 件）")
    return 0

  for path in expired:
    path.unlink()
    print(f"削除: {path.name}")

  index = {
    "schemaVersion": schema["schemaVersion"],
    "generatedAt": datetime.datetime.now(JST).isoformat(timespec="seconds"),
    "issues": [
      {
        "date": issue["date"],
        "topHeadline": issue["topHeadline"],
        "counts": {cat: sum(1 for item in issue["items"] if item["cat"] == cat) for cat in schema["categories"]},
      }
      for issue in sorted(issues, key=lambda x: x["date"], reverse=True)
    ],
  }
  INDEX_PATH.write_text(json.dumps(index, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
  print(f"index.json を更新しました（{len(issues)} 件）")
  return 0


if __name__ == "__main__":
  sys.exit(main())
