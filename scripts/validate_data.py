#!/usr/bin/env python3
"""Validate Pulso data before publication. No guessed weights or poll numbers."""
import datetime as dt
import json
import math
from pathlib import Path
from urllib.parse import urlparse

p = Path(__file__).resolve().parents[1] / "data.json"
data = json.loads(p.read_text(encoding="utf-8"))
assert isinstance(data.get("polls"), list) and data["polls"], "Lista de pesquisas vazia"
assert isinstance(data.get("history"), list), "Histórico ausente"
seen = set()
for poll in data["polls"]:
    for key in ("name", "date", "f", "l", "url"):
        assert key in poll, f"Campo obrigatório ausente: {key}"
    dt.date.fromisoformat(poll["date"])
    assert poll["name"].strip(), "Instituto vazio"
    assert all(isinstance(poll[k], (float, int)) and math.isfinite(poll[k]) for k in ("f", "l"))
    assert 0 <= poll["f"] <= 100 and 0 <= poll["l"] <= 100
    assert abs(poll["f"] + poll["l"] - 100) <= .12, f"Votos válidos inválidos: {poll['name']}"
    assert urlparse(poll["url"]).scheme == "https", "Fonte deve usar HTTPS"
    key = (poll["name"].casefold(), poll["date"])
    assert key not in seen, f"Rodada duplicada: {key}"
    seen.add(key)
    if poll.get("converted"):
        assert all(k in poll for k in ("totalF", "totalL")), "Conversão sem dados originais"
        denominator = poll["totalF"] + poll["totalL"]
        assert denominator > 0
        assert abs(poll["f"] - 100 * poll["totalF"] / denominator) <= .02
dates = []
for point in data["history"]:
    dates.append(dt.date.fromisoformat(point["date"]))
    assert abs(point["f"] + point["l"] - 100) <= .12
assert dates == sorted(dates), "Histórico fora de ordem cronológica"
# Mais de um boletim pode ser publicado no mesmo dia. Datas repetidas
# são válidas quando os registros representam revisões distintas.
history_keys = set()
for point in data["history"]:
    key = (point["date"], point["f"], point["l"], point.get("revision", ""))
    assert key not in history_keys, f"Boletim histórico exatamente duplicado: {key}"
    history_keys.add(key)
print(f"Validação estrutural OK: {len(seen)} pesquisas, {len(dates)} médias históricas.")
print("ATENÇÃO: não verifica a veracidade externa das fontes nem audita pesos históricos.")
