#!/usr/bin/env python3
"""Conservative validator for structured, independently verified poll updates."""
import json, re, sys
from datetime import date
from pathlib import Path
from urllib.parse import urlparse

REG = re.compile(r"^BR-\\d{5}/2026$")
REQUIRED = ("name", "date", "fieldEnd", "f", "l", "n", "registration", "url",
            "verificationUrl", "verificationStatus", "voteBasis")
def https(url):
    return isinstance(url, str) and urlparse(url).scheme == "https" and bool(urlparse(url).netloc)
def validate(candidate, data):
    errors = []
    for key in REQUIRED:
        if key not in candidate: errors.append("Campo ausente: " + key)
    if errors: return errors
    if candidate["verificationStatus"] != "confirmed-official-document":
        errors.append("Sem confirmacao documental oficial")
    if not REG.fullmatch(str(candidate["registration"])): errors.append("Registro invalido")
    if not https(candidate["url"]) or not https(candidate["verificationUrl"]):
        errors.append("Fontes HTTPS obrigatorias")
    try:
        published = date.fromisoformat(candidate["date"])
        field_end = date.fromisoformat(candidate["fieldEnd"])
        if field_end > published: errors.append("Coleta posterior a publicacao")
        if published.year != 2026: errors.append("Ano invalido")
    except (TypeError, ValueError): errors.append("Datas invalidas")
    try:
        f, l, n = float(candidate["f"]), float(candidate["l"]), int(candidate["n"])
        if not (0 <= f <= 100 and 0 <= l <= 100 and abs(f+l-100) <= .25 and n >= 500):
            errors.append("Percentuais/amostra invalidos")
    except (TypeError, ValueError): errors.append("Numeros invalidos")
    if candidate["name"] not in {x["name"] for x in data["standardModel"]["institutes"]}:
        errors.append("Instituto fora do modelo padrao")
    if any(x.get("registration") == candidate["registration"] for x in data["polls"]):
        errors.append("Registro ja cadastrado")
    if any(x.get("name") == candidate["name"] and x.get("fieldEnd") == candidate["fieldEnd"] for x in data["polls"]):
        errors.append("Rodada ja cadastrada")
    if candidate["voteBasis"] != "valid-published":
        errors.append("Somente votos validos publicados diretamente")
    return errors

def main():
    data_path = Path("data.json")
    data = json.loads(data_path.read_text(encoding="utf-8"))
    files = sorted(Path("incoming").glob("*.json")) if Path("incoming").exists() else []
    applied = 0
    for path in files:
        candidate = json.loads(path.read_text(encoding="utf-8"))
        errors = validate(candidate, data)
        if errors:
            print(f"EM REVISAO {path}: " + "; ".join(errors))
            continue
        # Automatic publishing is intentionally disabled until a machine-verifiable
        # official source adapter independently proves verificationStatus.
        print(f"VALIDACAO ESTRUTURAL OK, FALTA AUTENTICACAO DA FONTE: {path}")
    print(f"Publicacoes automaticas: {applied}. Entradas analisadas: {len(files)}.")
if __name__ == "__main__":
    main()
