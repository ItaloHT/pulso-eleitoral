#!/usr/bin/env python3
"""Discover candidate poll articles; do not infer poll numbers from headlines."""
import datetime
import json
import os
import subprocess
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

BASE = Path(__file__).resolve().parents[1]
data = json.loads((BASE / "data.json").read_text(encoding="utf-8"))
known = {p.get("url", "") for p in data.get("polls", [])}
terms = [
    '"pesquisa" "segundo turno" "Lula" "Flávio" eleições 2026',
    '"pesquisa eleitoral" "Flávio Bolsonaro" "Lula" 2026',
]
found = {}
for term in terms:
    url = "https://news.google.com/rss/search?" + urllib.parse.urlencode(
        {"q": term, "hl": "pt-BR", "gl": "BR", "ceid": "BR:pt-419"}
    )
    try:
        request = urllib.request.Request(url, headers={"User-Agent": "PulsoMonitor/1.0"})
        with urllib.request.urlopen(request, timeout=20) as response:
            root = ET.fromstring(response.read())
        for item in root.findall(".//item"):
            title = (item.findtext("title") or "").strip()
            link = (item.findtext("link") or "").strip()
            if title and link and link not in known:
                found[link] = title
    except Exception as exc:
        print(f"Falha na consulta: {exc}")
if not found:
    print("Nenhuma fonte candidata encontrada (ou consulta indisponível).")
    raise SystemExit(0)
today = datetime.datetime.now(datetime.timezone.utc).date().isoformat()
issue_title = f"Triagem automática de pesquisas — {today}"
existing = subprocess.run(
    ["gh", "issue", "list", "--state", "open", "--search", issue_title,
     "--json", "title", "--limit", "20"],
    capture_output=True, text=True, check=True,
)
if any(x["title"] == issue_title for x in json.loads(existing.stdout)):
    print("Triagem do dia já existe.")
    raise SystemExit(0)
lines = [
    "Fontes encontradas automaticamente. **Não são pesquisas validadas.**",
    "Antes de atualizar `data.json`, confirmar instituto, registro TSE,",
    "datas de coleta/divulgação, cenário, percentuais, base de votos, amostra",
    "e duplicidade. Não recalcular média sem pesos individuais auditados.",
    "",
]
for title, link in list(found.items())[:20]:
    lines.append(f"- {title} — {link}")
subprocess.run(
    ["gh", "issue", "create", "--title", issue_title,
     "--body", "\n".join(lines)],
    check=True,
)
print(f"Criada triagem com {min(len(found), 20)} fontes candidatas.")
