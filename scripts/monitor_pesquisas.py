#!/usr/bin/env python3
"""Monitor conservador: cria apenas issues de triagem; nunca altera data.json."""
import json, os, re, urllib.parse, urllib.request, xml.etree.ElementTree as ET, subprocess
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime

TERMS = ['"Flávio Bolsonaro" "Lula" "pesquisa" "segundo turno"',
         '"Ipespe" "Lula" "Flávio" pesquisa',
         '"Datafolha" "Quaest" "AtlasIntel" "PoderData" "Futura" pesquisa']
AGENCIES = ('ipespe','datafolha','quaest','atlasintel','poderdata','cnt/mda','futura',
            'gerp','veritá','vox brasil','datatrends','nexus','phoenix','real time big data',
            'instituto','pesquisa')
MAX_AGE_HOURS = 72

def read_feed(query):
    url = 'https://news.google.com/rss/search?' + urllib.parse.urlencode(
        {'q': query + ' when:3d', 'hl':'pt-BR','gl':'BR','ceid':'BR:pt-419'})
    req = urllib.request.Request(url,headers={'User-Agent':'PulsaMonitor/1.0'})
    with urllib.request.urlopen(req,timeout=25) as response:
        root = ET.fromstring(response.read())
    for item in root.findall('./channel/item'):
        title = item.findtext('title','')
        link = item.findtext('link','')
        date = item.findtext('pubDate','')
        if not link.startswith('https://'): continue
        try:
            age = (datetime.now(timezone.utc)-parsedate_to_datetime(date)).total_seconds()/3600
            if not 0 <= age <= MAX_AGE_HOURS: continue
        except (TypeError, ValueError): continue
        yield title,link,date

def gh(*args, input_text=None):
    return subprocess.run(['gh',*args],input=input_text,text=True,
                          check=True,capture_output=True).stdout

def main():
    with open('data.json',encoding='utf-8') as file: data=json.load(file)
    existing = {p.get('registration','').upper() for p in data.get('polls',[])}
    existing_urls = {p.get('url','').split('?')[0] for p in data.get('polls',[])}
    repo=os.environ.get('GH_REPOSITORY')
    if not repo: raise RuntimeError('GH_REPOSITORY ausente')
    open_issues=json.loads(gh('issue','list','--repo',repo,'--state','open',
                              '--limit','100','--json','title,body'))
    seen = ' '.join((x.get('title','')+' '+x.get('body','')) for x in open_issues)
    candidates={}
    errors=[]
    for term in TERMS:
        try:
            for title,link,date in read_feed(term):
                low=title.lower()
                if not ('lula' in low and ('flávio' in low or 'flavio' in low)): continue
                if not any(a in low for a in AGENCIES): continue
                if link.split('?')[0] in existing_urls or link in seen: continue
                key=re.sub(r'\\W+',' ',title.lower()).strip()
                candidates[key]=(title,link,date)
        except Exception as exc:
            errors.append(str(exc))
    if errors and not candidates: raise RuntimeError('Falha nas fontes RSS: '+'; '.join(errors))
    if errors: print('Fontes parcialmente indisponíveis:',errors)
    for title,link,date in list(candidates.values())[:10]:
        if link in seen: continue
        body=('Possível divulgação detectada automaticamente. **NÃO VERIFICADA.**\\n\\n'
              f'Notícia: {title}\\nFonte: {link}\\nData RSS: {date}\\n\\n'
              'Antes de incluir no Pulsa, conferir fonte original, registro TSE, abrangência nacional, '
              'candidatos, datas de campo e publicação, amostra, margem, votos totais/válidos, '
              'rodada anterior e duplicações. Conferir especialmente se já consta no data.json. '
              'Não publicar apenas com base nesta notícia.\\n\\n'
              f'Registros já cadastrados: {", ".join(sorted(existing))}')
        gh('issue','create','--repo',repo,'--title','[Triagem] '+title[:160],
           '--body',body)
        print('Criada triagem:',title)
    print('Monitor concluído; nenhuma alteração em data.json ou na metodologia.')

if __name__=='__main__': main()
