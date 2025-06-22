import json
with open('ddl.json', 'r', encoding="utf-8") as f:
    data = json.load(f)
with open('tables_info.json', 'r', encoding="utf-8") as f:
    data = json.load(f)