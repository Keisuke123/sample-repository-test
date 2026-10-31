#!/usr/bin/env python3
"""既存データを schema.json の最新 schemaVersion に一括変換する。

データ構造を変えるときの手順:
  1. schema.json を更新し、schemaVersion を 1 つ上げる
  2. 下の MIGRATIONS に「旧バージョン -> 変換関数」を追加する
  3. python3 ai-news/scripts/migrate.py を実行する
  4. python3 ai-news/scripts/update_index.py で検証と index 再生成を行う
  5. index.html と ROUTINE.md も新しい形に合わせ、すべて同じコミットに入れる
"""

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
SCHEMA_PATH = ROOT / "schema.json"


# 例:
# def v1_to_v2(issue):
#   for item in issue["items"]:
#     item.setdefault("tags", [])
#   return issue
MIGRATIONS = {
  # 1: v1_to_v2,
}


def main():
  latest = json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))["schemaVersion"]
  changed = 0
  for path in sorted(DATA_DIR.glob("????-??-??.json")):
    issue = json.loads(path.read_text(encoding="utf-8"))
    version = issue.get("schemaVersion", 1)
    if version == latest:
      continue
    while version < latest:
      if version not in MIGRATIONS:
        print(f"{path.name}: v{version} からの変換が MIGRATIONS にありません", file=sys.stderr)
        return 1
      issue = MIGRATIONS[version](issue)
      version += 1
      issue["schemaVersion"] = version
    path.write_text(json.dumps(issue, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    changed += 1
    print(f"変換: {path.name} -> v{latest}")
  print(f"{changed} 件を変換しました")
  return 0


if __name__ == "__main__":
  sys.exit(main())
