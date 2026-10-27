
const countRegions=[
 {name:'Norte',ufs:['ac','ap','am','pa','ro','rr','to']},
 {name:'Nordeste',ufs:['al','ba','ce','ma','pb','pe','pi','rn','se']},
 {name:'Centro-Oeste',ufs:['df','go','mt','ms']},
 {name:'Sudeste',ufs:['es','mg','rj','sp']},
 {name:'Sul',ufs:['pr','rs','sc']}
];
let regionCountBusy=false,regionCounts={},regionErrors={};
function sumRegionCounts(states){
 const total=states.reduce((n,d)=>n+d.total,0),sections=states.reduce((n,d)=>n+d.sections,0);
 const candidates=['13','22'].map(number=>({number,votes:states.reduce((n,d)=>n+d.candidates.find(c=>c.number===number).votes,0)}));
 const valid=states.reduce((n,d)=>n+d.valid,0);
 return {total,sections,percent:total?100*sections/total:0,valid,candidates:candidates.map(c=>({...c,percent:valid?100*c.votes/valid:null})),states,checked:new Date().toLocaleTimeString('pt-BR',{timeZone:'America/Sao_Paulo'})};
}
function regionalCountMarkup(){
 return `<section aria-labelledby="regional-count-title" style="border-top:1px solid var(--line);margin-top:24px;padding-top:24px">
 <details class="regional-accordion"><summary id="regional-count-title">Apuração por região · ver Norte, Nordeste, Centro-Oeste, Sudeste e Sul <span aria-hidden="true">▾</span></summary><p class="small">Soma dos boletins estaduais do TSE. Percentuais dos candidatos calculados sobre os votos válidos contabilizados na região.</p>
 <style>.regional-count-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.regional-count-card{border:1px solid var(--line);border-radius:14px;padding:18px;min-width:0}.regional-count-card h4{font-size:19px;margin:0 0 12px}.regional-count-card .rejection-scores strong{font-size:clamp(24px,4vw,32px)}.regional-count-card .rejection-scores{gap:8px}.regional-count-card details{margin-top:14px}.regional-count-state{font-size:12px;border-top:1px solid var(--line);padding:10px 0;line-height:1.7}.regional-count-card .region-note{font-size:12px;margin:12px 0 0;color:var(--muted)}@media(max-width:700px){.regional-count-grid{grid-template-columns:1fr}.regional-count-card{padding:15px}}</style>
 <div class="regional-count-grid">${countRegions.map(r=>{
 const d=regionCounts[r.name],error=regionErrors[r.name];
 return `<article class="regional-count-card"><h4>${r.name}</h4>${d?`
 <div class="rejection-scores">${d.candidates.map(c=>`<div><span>${c.number==='13'?'Lula · PT':'Flávio Bolsonaro · PL'}</span><strong>${c.percent===null?'—':fmt(c.percent)+'%'}</strong><span>${fmt(c.votes)} votos</span></div>`).join('')}</div>
 <p class="small"><strong>${fmt(d.percent)}% das seções totalizadas</strong><br>${fmt(d.sections)} de ${fmt(d.total)} seções · ${fmt(d.valid)} votos válidos</p>
 <progress value="${d.percent}" max="100" aria-label="Seções totalizadas na região ${r.name}" style="width:100%;accent-color:#7774df"></progress>
 <p class="region-note">Consulta completa: ${liveEscape(d.checked)} · Brasília · ${d.states.length} UFs</p>
 <details><summary>Ver estados e horários dos boletins</summary>${d.states.map((s,i)=>`<div class="regional-count-state"><strong>${r.ufs[i].toUpperCase()}</strong> · ${fmt(s.percent)}% das seções<br>${s.candidates.map(c=>liveEscape(c.name)+': '+fmt(c.votes)+' votos').join(' · ')}<br>Boletim: ${liveEscape(s.day)} ${liveEscape(s.time)} (horário informado pelo TSE para a UF)<br><a class="link" href="https://resultados.tse.jus.br/oficial/ele2026/6258/dados/${r.ufs[i]}/${r.ufs[i]}-c0001-e006258-u.json" target="_blank" rel="noopener noreferrer">Boletim oficial ↗</a></div>`).join('')}</details>`:'<p class="small">Aguardando boletins de todas as UFs da região.</p>'}
 ${error?'<p class="notice" role="status">'+liveEscape(error)+'</p>':''}</article>`;
 }).join('')}</div>
 <p class="small" style="margin-top:16px">Exterior não integra as cinco regiões. Os boletins estaduais podem ter horários diferentes entre si e do nacional, por isso as somas podem divergir temporariamente. Uma região só é atualizada quando todas as suas UFs têm boletins válidos na consulta.</p></details></section>`;
}
async function refreshRegionalCounts(){
 if(regionCountBusy||document.hidden)return;regionCountBusy=true;
 const queue=countRegions.flatMap(r=>r.ufs),batch={},failures={};let cursor=0;
 async function worker(){while(cursor<queue.length){
  const uf=queue[cursor++],controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),10000);
  try{
   const response=await fetch('https://resultados.tse.jus.br/oficial/ele2026/6258/dados/'+uf+'/'+uf+'-c0001-e006258-u.json',{cache:'no-cache',signal:controller.signal});
   if(!response.ok)throw Error('HTTP '+response.status);
   batch[uf]=parseLiveCount(await response.json(),uf);
  }catch(error){failures[uf]=true;}finally{clearTimeout(timeout);}
 }}
 try{
  await Promise.all(Array.from({length:6},()=>worker()));
  countRegions.forEach(r=>{
   const previous=regionCounts[r.name];
   const invalid=r.ufs.filter((uf,i)=>failures[uf]||!batch[uf]||(previous&&batch[uf].stamp<previous.states[i].stamp));
   if(invalid.length){regionErrors[r.name]='Falha ou boletim anterior em '+invalid.map(u=>u.toUpperCase()).join(', ')+'. '+(previous?'Mantida a última consulta completa. ':'')+'Nova tentativa na próxima consulta.';return;}
   regionCounts[r.name]=sumRegionCounts(r.ufs.map(uf=>batch[uf]));delete regionErrors[r.name];
  });
 }finally{regionCountBusy=false;drawLiveCount();}
}
setInterval(refreshRegionalCounts,60000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshRegionalCounts();});

const liveCountUrl='https://resultados.tse.jus.br/oficial/ele2026/6258/dados/br/br-c0001-e006258-u.json';
let liveCountData=null,liveCountBusy=false,liveCountError='',liveCountChecked='';
function liveEscape(value){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function parseLiveCount(d,expectedArea='br'){
 const num=v=>{if(v===undefined||v===null||v==='')throw Error('Campo ausente');const n=Number(String(v).replace(',','.'));if(!Number.isFinite(n)||n<0)throw Error('Valor inválido');return n;};
 if(d.ele!=='6258'||d.t!=='2'||d.f!=='o'||d.cdabr!==expectedArea)throw Error('Eleição inesperada');
 const cargo=d.carg?.find(c=>c.cd==='1');if(!cargo)throw Error('Cargo ausente');
 const candidates=cargo.agr.flatMap(a=>a.par.flatMap(p=>p.cand.map(c=>({name:c.nmu,party:p.sg,votes:num(c.vap),percent:num(c.pvap),number:c.n}))));
 if(candidates.length!==2||!candidates.some(c=>c.number==='13')||!candidates.some(c=>c.number==='22'))throw Error('Candidaturas inesperadas');
 const result={candidates:candidates.sort((a,b)=>a.number.localeCompare(b.number)),sections:num(d.s.st),total:num(d.s.ts),percent:num(d.s.pst),votes:num(d.v.tv),valid:num(d.v.vvc),blank:num(d.v.vb),nullVotes:num(d.v.tvn),day:d.dg,time:d.hg};
 if(result.sections>result.total||result.percent>100||candidates.some(c=>c.percent>100)||!/^\d{2}\/\d{2}\/\d{4}$/.test(d.dg)||!/^\d{2}:\d{2}:\d{2}$/.test(d.hg))throw Error('Boletim inválido');
 result.stamp=Date.parse(d.dg.split('/').reverse().join('-')+'T'+d.hg+'-03:00');
 if(!Number.isFinite(result.stamp))throw Error('Horário inválido');
 return result;
}
function liveCountPanel(){return '<section class="card" id="live-count-panel" aria-labelledby="live-count-title" style="margin-bottom:30px;border:2px solid var(--purple)"></section>';}
function drawLiveCount(){
 const panel=document.getElementById('live-count-panel');if(!panel)return;
 const d=liveCountData;
 panel.innerHTML='<div class="eyebrow">APURAÇÃO OFICIAL · PRESIDENTE · 2º TURNO</div><h2 id="live-count-title">Total Brasil</h2><p class="small">Consulta automática a cada 60 segundos enquanto esta página estiver aberta.</p>'+
 (d?`<div id="national-count-total" style="background:#f0eef9;border:1px solid var(--line);border-radius:14px;padding:18px;margin:18px 0"><span class="small">TOTAL DE VOTOS CONTABILIZADOS · BRASIL + EXTERIOR</span><strong style="display:block;font-size:clamp(30px,7vw,44px);line-height:1.2;margin:8px 0;font-variant-numeric:tabular-nums">${fmt(d.votes)}</strong><span class="small">${fmt(d.valid)} válidos · ${fmt(d.blank)} brancos · ${fmt(d.nullVotes)} nulos</span></div><div class="rejection-scores">${d.candidates.map(c=>`<div><span>${liveEscape(c.name)} · ${liveEscape(c.party)}</span><strong>${fmt(c.percent)}%</strong><span>${fmt(c.votes)} votos</span></div>`).join('')}</div>
 <p><strong>${fmt(d.percent)}% das seções totalizadas</strong> · ${fmt(d.sections)} de ${fmt(d.total)}</p>
 <progress max="100" value="${d.percent}" style="width:100%;accent-color:#7774df" aria-label="Seções totalizadas"></progress>
 
 <p class="small">Boletim do TSE: <strong>${liveEscape(d.day)} às ${liveEscape(d.time)}</strong> · horário de Brasília.</p>`:'<p role="status">Aguardando o primeiro boletim oficial validado.</p>')+
 (liveCountError?'<p class="notice" role="status">'+liveEscape(liveCountError)+'</p>':'')+
 '<p class="small">'+(liveCountChecked?'Última consulta bem-sucedida: '+liveEscape(liveCountChecked)+' · Brasília. ':'')+'O TSE pode manter o mesmo boletim entre consultas. Os percentuais representam votos já contabilizados, não chances de vitória. Seções totalizadas não equivalem ao percentual de votos apurados.</p>'+
 '<a class="link" href="https://resultados.tse.jus.br/oficial/app/index.html" target="_blank" rel="noopener noreferrer">Fonte: Resultados do TSE ↗</a>'+regionalCountMarkup();
}
async function refreshLiveCount(){
 if(liveCountBusy||document.hidden)return;liveCountBusy=true;
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),15000);
 try{
  const response=await fetch(liveCountUrl,{cache:'no-cache',signal:controller.signal});if(!response.ok)throw Error('HTTP '+response.status);
  const d=parseLiveCount(await response.json());
  if(liveCountData&&d.stamp<liveCountData.stamp)throw Error('Boletim anterior');
  liveCountData=d;liveCountError='';liveCountChecked=new Date().toLocaleTimeString('pt-BR',{timeZone:'America/Sao_Paulo'});
 }catch(error){liveCountError=liveCountData?'Não foi possível atualizar. Os números acima são do último boletim recebido; nova tentativa em 60 segundos.':'Não foi possível consultar o TSE. Nenhum número foi estimado; nova tentativa em 60 segundos.';}
 finally{clearTimeout(timeout);liveCountBusy=false;drawLiveCount();updateElectionComparison();}
}
setInterval(refreshLiveCount,60000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshLiveCount();});
function upcomingPolls(){const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());const items=(dataset.agenda||[]).filter(p=>p.date>=today&&!polls.some(q=>q.registration===p.registration)).sort((a,b)=>a.date.localeCompare(b.date));const formatDay=s=>new Date(s+'T12:00:00Z').toLocaleDateString('pt-BR',{day:'2-digit',month:'short',timeZone:'UTC'}).replace('.','');return '<section class="card" id="agenda-pesquisas" aria-labelledby="agenda-title"><div class="card-head"><div><div class="eyebrow">CALENDÁRIO ELEITORAL</div><h2 id="agenda-title">Próximas pesquisas</h2><p class="small">Datas previstas nos registros; horários de divulgação ainda não confirmados.</p></div><span class="badge">Horário de Brasília</span></div>'+(items.length?'<div class="agenda-list">'+items.map(p=>'<div class="agenda-item" style="display:flex;align-items:center;gap:16px;padding:13px 0;border-bottom:1px solid var(--line)"><div style="min-width:68px;font-weight:800;font-size:18px">'+formatDay(p.date)+'</div><div style="flex:1"><strong>'+p.name+'</strong><div class="small">Registro '+p.registration+' · Coleta '+p.field+'</div></div><div style="text-align:right"><span class="small">Horário a confirmar</span><div><a class="link" target="_blank" rel="noopener noreferrer" href="'+p.source+'">Fonte ↗</a></div></div></div>').join('')+'</div>':'<p class="notice">Nenhuma pesquisa futura confirmada na agenda cadastrada.</p>')+'<p class="small" style="margin-top:16px">O registro no TSE informa a previsão, mas não garante publicação. Horários só serão exibidos quando confirmados. <a class="link" href="https://pesqele-divulgacao.tse.jus.br/" target="_blank" rel="noopener noreferrer">Consultar PesqEle ↗</a></p></section>';}
let polls=[], dataset=null;

const fmt=n=>n.toLocaleString('pt-BR',{maximumFractionDigits:2});const date=d=>d.slice(8,10)+'/'+d.slice(5,7);const main=document.querySelector('main');
const intro=(title,desc)=>`<div class="intro"><div><div class="eyebrow">OBSERVATÓRIO ELEITORAL / SEGUNDO TURNO</div><h1>${title}</h1><p class="sub">${desc}</p></div><span class="badge">Base de ${date(dataset.referenceDate)}/2026</span></div>`;
function comparableAverageHistory(){
 // Preserve legacy records in data.json, but never join incompatible models.
 // Only calculate a date when every institute has a documented, already-published
 // round with a known fieldwork end date. Missing historical metadata is a gap.
 const model=dataset.standardModel;
 const names=model.institutes.map(i=>i.name);
 const day=s=>Date.parse(s+'T00:00:00Z')/86400000;
 const cutoff=dataset.dataCutoffDate||dataset.referenceDate;
 const dates=[...new Set([...(dataset.history||[]).map(h=>h.date),cutoff])].sort();
 return dates.map(date=>{
  const rounds=names.map(name=>{
   const current=polls.find(p=>p.name===name);
   const past=(dataset.instituteHistory?.[name]||[]).filter(h=>h.date!==current?.date);
   const all=[...past,current].filter(Boolean);
   return all.filter(p=>p.date<=date&&p.fieldEnd&&p.fieldEnd<=date&&Number.isFinite(p.f)&&Number.isFinite(p.l)&&p.url).sort((a,b)=>b.date.localeCompare(a.date))[0];
  });
  if(rounds.some(p=>!p))return {date,available:rounds.filter(Boolean).length,total:names.length};
  const raw=rounds.map(p=>Math.pow(2,-Math.max(0,day(date)-day(p.fieldEnd))/(model.halfLifeDays||7)));
  const total=raw.reduce((a,b)=>a+b,0);
  const f=rounds.reduce((a,p,i)=>a+p.f*raw[i]/total,0);
  return {date,f,l:100-f,available:names.length,total:names.length};
 });
}
function chart(){
 const comparable=comparableAverageHistory();
 const valid=comparable.filter(p=>Number.isFinite(p.f));
 if(valid.length<2)return '<p class="notice">Histórico comparável ainda insuficiente. Há '+valid.length+' data(s) calculável(is) com os 18 institutos e a mesma regra de recência de 7 dias. Não ligamos médias de metodologias diferentes nem estimamos valores ausentes.</p>'+(valid.length?'<p class="small">Data comparável disponível: '+valid.map(p=>date(p.date)+': Flávio '+fmt(p.f)+'%, Lula '+fmt(p.l)+'%').join('; ')+'</p>':'');
 return timeChart(valid);
}
function sensitivityChart(latest){
  // Sensitivity scenario, not a confidence interval: shared-error SD of 1.5 pp
  // plus an approximate combined sampling SE from each institute's published margin.
  const rec=recencyAggregate();
  const marginValue=p=>{
    const m=String(p.margin||'').match(/±\s*([0-9]+(?:[.,][0-9]+)?)/);
    return m?Number(m[1].replace(',','.')):NaN;
  };
  const inputs=(rec?.rows||[]).map(r=>{
    const p=polls.filter(q=>q.name===r.name&&q.fieldEnd&&q.fieldEnd<=dataset.dataCutoffDate).sort((a,b)=>b.fieldEnd.localeCompare(a.fieldEnd))[0];
    return {weight:r.effective/100,margin:marginValue(p||{})};
  });
  const valid=inputs.length===dataset.standardModel.institutes.length&&inputs.every(r=>Number.isFinite(r.margin)&&r.margin>0);
  if(!valid)return '<p class="notice">Faixa de sensibilidade indisponível: faltam margens publicadas para todos os institutos.</p>';
  const samplingSE=Math.sqrt(inputs.reduce((sum,r)=>sum+Math.pow(r.weight*r.margin/1.96,2),0));
  const sharedSE=1.5;
  const range=1.96*Math.hypot(samplingSE,sharedSE);
  const values=[latest.f,latest.l];
  const axisMin=Math.floor(Math.min(...values)-range-1),axisMax=Math.ceil(Math.max(...values)+range+1);
  const x=n=>((n-axisMin)/(axisMax-axisMin)*100).toFixed(4)+'%';
  const ticks=[];for(let n=axisMin;n<=axisMax;n+=2)ticks.push(n);
  const row=(name,value,color)=>{
    const left=value-range,right=value+range;
    return `<div class="interval-row"><div class="interval-name">${name}</div><div class="interval-plot" role="img" aria-label="${name}: média ${fmt(value)} por cento; faixa de sensibilidade conservadora de ${fmt(left)} a ${fmt(right)} por cento"><span class="interval-line ${color}" style="left:${x(left)};width:${(2*range/(axisMax-axisMin)*100).toFixed(4)}%"><i class="interval-cap first"></i><i class="interval-cap last"></i></span><span class="interval-marker ${color}" style="left:${x(value)}"></span><span class="interval-value" style="left:${x(value)}">${fmt(value)}%</span><span class="interval-limit left" style="left:${x(left)}">${fmt(left)}%</span><span class="interval-limit right" style="left:${x(right)}">${fmt(right)}%</span></div></div>`;
  };
  return `<section class="sensitivity interval-chart" aria-labelledby="interval-title"><h3 id="interval-title">Faixa de sensibilidade · cenário conservador</h3><div class="interval-layout"><div class="interval-grid" aria-hidden="true">${ticks.map(n=>`<span class="interval-gridline ${n===50?'central':''}" style="left:${x(n)}"></span>`).join('')}</div>${row('Flávio Bolsonaro',latest.f,'violet')}${row('Lula',latest.l,'coral')}<div class="interval-axis"><span class="interval-axis-spacer"></span><div class="interval-ticks">${ticks.map(n=>`<span style="left:${x(n)}">${n}%</span>`).join('')}</div></div></div><p class="sensitivity-caption"><strong>CENÁRIO CONSERVADOR · ±${fmt(range)} P.P.</strong><span>Combina margens amostrais publicadas (aproximação) e hipótese de erro compartilhado com desvio-padrão de 1,5 p.p. Faixa de sensibilidade, não margem de erro oficial nem intervalo de confiança validado.</span></p></section>`;
}
function recencyAggregate(){
 const model=dataset.standardModel;if(!model||!model.enabled)return null;
 const cutoff=dataset.dataCutoffDate||dataset.referenceDate;
 const day=s=>Date.parse(s+'T00:00:00Z')/86400000;
 const halfLife=model.halfLifeDays||7;
 const rows=model.institutes.map(i=>{
  const p=polls.filter(q=>q.name===i.name&&q.date<=cutoff&&q.fieldEnd&&q.fieldEnd<=cutoff&&Number.isFinite(q.f)&&Number.isFinite(q.l)).sort((a,b)=>b.fieldEnd.localeCompare(a.fieldEnd))[0];
  if(!p)return null;
  const ageDays=Math.max(0,day(cutoff)-day(p.fieldEnd));
  const quality=model.qualityFactors?.[i.qualityTier]??1; const accuracy=Number.isFinite(i.firstRoundMaePp)?Math.sqrt((model.accuracyReferencePp||2.45)/Math.max(model.accuracyFloorPp||1.5,i.firstRoundMaePp)):1; return {name:i.name,f:p.f,l:p.l,fieldEnd:p.fieldEnd,ageDays,quality,accuracy,base:100/model.institutes.length,raw:Math.pow(2,-ageDays/halfLife)};
 }).filter(Boolean);
 if(!rows.length||rows.length!==model.institutes.length)return null;
 const ordered=[...rows].sort((a,b)=>a.f-b.f);
 const rawTotal=rows.reduce((sum,r)=>sum+r.raw,0);
 let cumulative=0,reference=ordered.at(-1).f;
 for(const r of ordered){cumulative+=r.raw;if(cumulative>=rawTotal/2){reference=r.f;break;}}
 rows.forEach(r=>{
  r.deviation=Math.abs(r.f-reference);
  r.excess=Math.max(0,r.deviation-2.5);
  r.reduction=Math.min(.30,.10*r.excess);
  r.adjustedRaw=r.raw*r.quality*r.accuracy*(1-r.reduction);
 });
 const total=rows.reduce((sum,r)=>sum+r.adjustedRaw,0);
 rows.forEach(r=>r.effective=100*r.adjustedRaw/total);
 const f=rows.reduce((sum,r)=>sum+r.f*r.effective/100,0);
 const sd=Math.sqrt(rows.reduce((sum,r)=>sum+r.effective/100*(r.f-f)**2,0));
 rows.forEach(r=>r.z=sd?(r.f-f)/sd:0);
 return {f,l:100-f,sd,reference,rows,excluded:polls.filter(p=>!rows.some(r=>r.name===p.name)).map(p=>p.name)};
}
function instituteAccuracyMarkup(officialF){
 const cutoff=dataset.dataCutoffDate||dataset.referenceDate;
 const latest=new Map();
 polls.filter(p=>p.date<=cutoff&&Number.isFinite(p.f)&&Number.isFinite(p.l)).forEach(p=>{
  const prev=latest.get(p.name);
  if(!prev||(p.fieldEnd||p.date)>(prev.fieldEnd||prev.date)||((p.fieldEnd||p.date)===(prev.fieldEnd||prev.date)&&p.date>prev.date))latest.set(p.name,p);
 });
 const rows=[...latest.values()].map(p=>({name:p.name,p,error:Number.isFinite(officialF)?Math.abs(p.f-officialF):null}))
  .sort((a,b)=>Number.isFinite(a.error)&&Number.isFinite(b.error)?a.error-b.error||a.name.localeCompare(b.name,'pt-BR'):a.name.localeCompare(b.name,'pt-BR'));
 const ranked=rows.filter(r=>Number.isFinite(r.error)),best=ranked[0],tie=best?ranked.filter(r=>Math.abs(r.error-best.error)<0.005):[];
 const marginValue=p=>{const m=String(p.margin||"").match(/±\s*([0-9]+(?:[.,][0-9]+)?)/);return m?Number(m[1].replace(",",".")):null;};
 const marginStatus=r=>{const m=marginValue(r.p);return !Number.isFinite(r.error)?"Aguardando TSE":!Number.isFinite(m)?"Margem não informada":r.error<=m+1e-9?"Dentro da margem declarada":"Fora da margem declarada";};
 const bar=r=>Number.isFinite(r.error)?'<div style="height:7px;background:var(--line);border-radius:6px;min-width:72px;overflow:hidden"><span style="display:block;height:100%;width:'+Math.min(100,r.error/10*100)+'%;background:#7774df"></span></div>':'—';
 return '<div class="election-accuracy"><h3>Ranking de precisão: '+rows.length+' institutos</h3>'+
 (best?'<div class="election-accuracy-winner"><span>Menor erro absoluto na última rodada</span><strong>'+tie.map(r=>liveEscape(r.name)).join(' · ')+'</strong><span>'+fmt(best.error)+' p.p. por candidato em votos válidos</span></div>':'<p class="notice">Aguardando boletim oficial do TSE para ordenar os erros. Todas as últimas rodadas estão listadas abaixo.</p>')+
 '<p class="small">Todos os institutos cadastrados, inclusive os excluídos da média. Última rodada divulgada até a votação, sem duplicar institutos. Ordem do menor para o maior erro quando houver resultado oficial. Arraste a tabela no celular.</p>'+
 '<details class="accuracy-accordion"><summary>Ver ranking completo dos '+rows.length+' institutos <span aria-hidden="true">▾</span></summary><div class="accuracy-mobile-list">'+rows.map((r,i)=>'<article class="accuracy-mobile-row"><div class="accuracy-mobile-head"><strong>'+(Number.isFinite(r.error)?i+1+'º':'—')+' · '+liveEscape(r.name)+'</strong><b>'+(Number.isFinite(r.error)?fmt(r.error)+' p.p.':'—')+'</b></div><div class="small"><strong>'+marginStatus(r)+'</strong> · margem '+liveEscape(r.p.margin||'não informada')+'</div><div class="small">Pesquisa '+date(r.p.date)+' · Flávio '+fmt(r.p.f)+'% · Lula '+fmt(r.p.l)+'%'+(r.p.converted?' · válidos estimados':'')+(r.p.excludeFromCalculations?' · fora da média':'')+'</div>'+bar(r)+(r.p.url?'<a class="link" href="'+liveEscape(r.p.url)+'" target="_blank" rel="noopener noreferrer">Ver fonte</a>':'')+'</article>').join('')+'</div><div class="table-wrap election-accuracy-table"><table><thead><tr><th>#</th><th>Instituto</th><th>Pesquisa</th><th>Flávio</th><th>Lula</th><th>Erro</th><th>Margem</th><th>Situação</th><th>Visualização</th></tr></thead><tbody>'+
 rows.map((r,i)=>'<tr><td>'+(Number.isFinite(r.error)?i+1:'—')+'</td><td>'+(r.p.url?'<a href="'+liveEscape(r.p.url)+'" target="_blank" rel="noopener noreferrer">'+liveEscape(r.name)+'</a>':liveEscape(r.name))+(r.p.converted?' <small>(estimado)</small>':'')+(r.p.excludeFromCalculations?' <small>(fora da média)</small>':'')+'</td><td>'+date(r.p.date)+'</td><td>'+fmt(r.p.f)+'%</td><td>'+fmt(r.p.l)+'%</td><td>'+(Number.isFinite(r.error)?fmt(r.error)+' p.p.':'Aguardando TSE')+'</td><td>'+liveEscape(r.p.margin||'—')+'</td><td>'+marginStatus(r)+'</td><td>'+bar(r)+'</td></tr>').join('')+
 '</tbody></table></div></details><p class="small">Erro absoluto em pontos percentuais entre votos válidos da última pesquisa e resultado oficial, por candidato. A escala visual vai de 0 a 10 p.p. e é limitada em 10 p.p. Pesquisas convertidas de votos totais são estimativas. A comparação com a margem declarada é apenas descritiva: a margem amostral não cobre vieses, erros não amostrais ou todas as diferenças de desenho. Pesquisas com votos válidos estimados por normalização requerem cautela adicional. Uma única eleição não comprova viés intencional.</p></div>';
}
function electionComparisonMarkup(f,l){
 const d=liveCountData,fl=d?.candidates.find(c=>c.number==='22'),lu=d?.candidates.find(c=>c.number==='13');
 const line=(label,a,b,meta)=>'<div class="election-compare-row"><div class="election-compare-label"><strong>'+label+'</strong><span>'+meta+'</span></div><div class="election-compare-bar" role="img" aria-label="'+label+': Flávio '+fmt(a)+' por cento; Lula '+fmt(b)+' por cento"><span style="width:'+a+'%;background:#7774df"></span><span style="width:'+b+'%;background:#f44330"></span></div><div class="election-compare-values"><span>Flávio '+fmt(a)+'%</span><span>Lula '+fmt(b)+'%</span></div></div>';
 const gapPoll=f-l,gapElection=fl&&lu?fl.percent-lu.percent:null;
 const inversion=gapElection!==null&&Math.sign(gapPoll)!==Math.sign(gapElection)&&Math.abs(gapPoll)>0.01&&Math.abs(gapElection)>0.01;
 const error=fl&&lu?Math.abs(fl.percent-f):null; const gapError=gapElection===null?null:Math.abs(gapPoll-gapElection);
 return '<section class="card election-compare" id="election-comparison" aria-labelledby="election-compare-title"><div class="eyebrow">AUDITORIA · PESQUISAS × URNAS</div><h2 id="election-compare-title">O erro das pesquisas em 2026</h2>'+
 (error!==null?'<div class="election-error-highlight"><strong>'+fmt(error)+' p.p. por candidato</strong><span>de erro absoluto da média ponderada em votos válidos, mesma medida do ranking dos institutos. Diferença entre vantagens: '+fmt(gapError)+' p.p.</span>'+(inversion?'<b>A média indicou a ordem inversa do resultado eleitoral.</b>':'')+'</div>':'<p class="notice">Aguardando dados oficiais para calcular a dimensão do erro.</p>')+
 '<p class="small">Comparação em votos válidos, na mesma escala de 0 a 100%. Roxo: Flávio Bolsonaro. Vermelho: Lula.</p>'+
 line('Média final das pesquisas',f,l,'Modelo padrão do Pulsa · corte '+date(dataset.dataCutoffDate||dataset.referenceDate)+'/2026')+
 (fl&&lu?line('Resultado da eleição',fl.percent,lu.percent,fmt(d.percent)+'% das seções totalizadas · boletim '+liveEscape(d.day)+' às '+liveEscape(d.time)):'<p class="notice">Aguardando dados oficiais do TSE para exibir a segunda barra.</p>')+
 (fl&&lu?'<p class="small"><strong>Erro por candidato:</strong> Flávio '+fmt(Math.abs(fl.percent-f))+' p.p. ('+(fl.percent<f?'superestimado':'subestimado')+' na média); Lula '+fmt(Math.abs(lu.percent-l))+' p.p. ('+(lu.percent<l?'superestimado':'subestimado')+' na média). A diferença entre vantagens é o dobro do erro por candidato numa disputa com dois candidatos.</p>':'')+
 instituteAccuracyMarkup(fl?.percent)+ '<p class="small">Fonte eleitoral: <a href="https://resultados.tse.jus.br/oficial/app/index.html" target="_blank" rel="noopener noreferrer">TSE</a>. O erro observado da média não demonstra, isoladamente, intenção ou viés persistente de cada instituto. Dados do TSE sujeitos à totalização.</p></section>';
}
function updateElectionComparison(){const el=document.getElementById('election-comparison');if(!el)return;const rec=recencyAggregate();const last=dataset.history.at(-1);el.outerHTML=electionComparisonMarkup(rec?rec.f:last.f,rec?rec.l:last.l);}
function average(){const rec=recencyAggregate();const cutoff=dataset.dataCutoffDate||dataset.referenceDate;const latest=rec?{...dataset.history.at(-1),f:rec.f,l:rec.l,date:cutoff}:dataset.history.at(-1);main.innerHTML=electionComparisonMarkup(latest.f,latest.l)+intro('O cenário, em perspectiva.','Pesquisas reunidas, critérios transparentes e uma leitura contextualizada da disputa presidencial.')+liveCountPanel()+`<section class="hero" aria-labelledby="average-title"><div class="hero-top"><span id="average-title">CENÁRIO ATUAL · MÉDIA PONDERADA</span><span class="tag">Modelo padrão</span></div><div class="scores"><div class="candidate"><span class="violet">●</span> Flávio Bolsonaro<div class="score">${fmt(latest.f)}<small>%</small></div></div><div class="difference">Diferença<strong>${fmt(latest.f-latest.l)}</strong>pontos percentuais</div><div class="candidate">Lula <span class="red">■</span><div class="score">${fmt(latest.l)}<small>%</small></div></div></div><div class="split" style="--share:${latest.f}%" aria-hidden="true"><span></span><span></span></div>${sensitivityChart(latest)}<div class="hero-bottom"><span>Votos válidos · ${rec?rec.rows.length:dataset.standardModel.institutes.length} institutos no modelo · modelo padrão · recência de 7 dias</span><span>Pesquisas até ${date(cutoff)}/2026</span></div></section><p class="notice">${rec?'Média de '+rec.rows.length+' institutos com categorias A/B/C provisórias, acurácia histórica moderada, meia-vida de 7 dias e ajuste robusto para discrepâncias superiores a 2,5 p.p. '+(rec.excluded.length?rec.excluded.length+' levantamentos sem dados válidos ficaram fora do cálculo. ':''):'Média consolidada preservada: faltam dados individuais de institutos configurados, portanto nenhum recálculo parcial foi aplicado.'} Data de corte: ${date(cutoff)}/2026. Só pesquisas efetivamente divulgadas entram no cálculo; sem novas publicações, a média e a data de corte permanecem inalteradas. Sem margem de erro agregada validada; não é uma previsão eleitoral. <a href="#metodologia">Entenda o método</a>.</p>${trendSection()}<div class="grid"><section class="card"><div class="card-head"><div><h2>Evolução da média</h2><p class="small">${comparableAverageHistory().filter(p=>Number.isFinite(p.f)).length} registros comparáveis · até ${date(latest.date)}</p></div><span class="badge">Histórico</span></div><div class="legend"><span><i class="dot"></i>Flávio</span><span><i class="dot r"></i>Lula · linha tracejada</span></div>${chart()}<p class="small">Atualizações de Datafolha, PoderData/Aya e Gerp substituem as rodadas anteriores. Os registros anteriores permanecem arquivados, mas não são ligados à média atual porque faltam dados de coleta para reconstruí-los com a mesma metodologia. Novos pontos serão exibidos somente quando houver rodadas documentadas e comparáveis. Sem projeção ou intervalo de confiança estimado.</p><details><summary>Consultar datas e disponibilidade</summary><table><tr><th>Data</th><th>Flávio</th><th>Lula</th><th>Institutos documentados</th></tr>${comparableAverageHistory().map(p=>`<tr><td>${date(p.date)}</td><td>${Number.isFinite(p.f)?fmt(p.f)+'%':'Não comparável'}</td><td>${Number.isFinite(p.l)?fmt(p.l)+'%':'Não comparável'}</td><td>${p.available} de ${p.total}</td></tr>`).join('')}</table></details></section><section class="card"><details class="weights-accordion"><summary>Pesos dos institutos · ver comparação <span aria-hidden="true">▾</span></summary><p class="small">Comparação entre pesos iguais e pesos efetivos por recência de 7 dias, com ajuste robusto para discrepâncias acima de 2,5 p.p.</p><div class="weight-legend"><span><i class="weight-key old"></i>Igual</span><span><i class="weight-key new"></i>Recência + ajuste robusto</span></div>${(rec?rec.rows.map(r=>({name:r.name,previous:r.base,current:r.effective,reduction:r.reduction})):dataset.standardModel.institutes.map(i=>({name:i.name,previous:100/dataset.standardModel.institutes.length,current:i.weightPercent}))).map(w=>`<div class="weight-comparison"><div class="weight-row"><span>${w.name}</span><strong>${fmt(w.current)}% ${w.reduction>0?"(redutor "+fmt(w.reduction*100)+"%)":""}</strong></div><div class="weight-pair"><i style="width:${Math.min(100,w.previous/20*100)}%" title="Peso igual: ${fmt(w.previous)}%"></i><b style="width:${Math.min(100,w.current/20*100)}%" title="Por recência: ${fmt(w.current)}%"></b></div></div>`).join('')}<p class="small">Escala de 0 a 20%. Pesos pelo encerramento da coleta; redutor de 10% por ponto excedente a 2,5 p.p. da mediana ponderada por recência, limitado a 30%.</p><a class="link" href="#metodologia">Conheça os critérios ↗</a></details></section></div><div class="section-title"><h2>Por trás dos números</h2><a class="link" href="#pesquisas">Explorar pesquisas ↗</a></div><div class="mini-grid"><div class="mini"><strong>${polls.length}</strong><span class="small">Levantamentos com fonte nesta versão</span></div><div class="mini"><strong>${dataset.history.length}</strong><span class="small">Registros históricos da média</span></div><div class="mini"><strong>100% visível</strong><span class="small">Critérios, fontes e limitações</span></div></div>`;drawLiveCount();refreshLiveCount();refreshRegionalCounts();}
function research(){main.innerHTML=intro('Cada pesquisa, em detalhe.','Compare os levantamentos publicados e consulte suas fontes. Os resultados abaixo estão em votos válidos.')+`<div class="tools"><label class="field">Buscar instituto<input id="search" type="search" placeholder="Nome do instituto" autocomplete="off"></label><label class="field">Divulgação a partir de<input id="from" type="date" min="2026-10-01" max="${dataset.referenceDate}"></label><label class="field">Ordenar<select id="sort"><option value="new">Mais recentes</option><option value="old">Mais antigas</option><option value="name">Nome do instituto</option></select></label><button class="button" id="export">Exportar CSV</button></div><p class="small" id="count" aria-live="polite"></p><div class="table-wrap"><table><caption class="sr-only">Pesquisas eleitorais em votos válidos</caption><thead><tr><th>Instituto / data de divulgação</th><th>Flávio</th><th>Lula</th><th>Coleta</th><th>Amostra</th><th>Margem publicada</th><th>Fonte</th></tr></thead><tbody id="rows"></tbody></table><div id="empty" class="empty" hidden>Nenhuma pesquisa encontrada. Ajuste a busca ou a data.</div></div><div id="mobile-poll-cards" class="mobile-poll-cards" aria-label="Pesquisas publicadas"></div>${upcomingPolls()}<p class="notice">Quaest e Palver foram convertidas de votos totais para válidos. Para Flávio: Quaest, 46 ÷ (46 + 44) = 51,11%; Palver, 50 ÷ (50 + 49) = 50,51%. A conversão utiliza os percentuais arredondados publicados. As margens são as publicadas nos levantamentos, sem recálculo para a conversão.</p><section class="card"><h2>Uma base em construção</h2><p class="sub">Esta página reúne ${polls.length} levantamentos com fontes identificadas. A média atual usa uma pesquisa por instituto, pesos-base iguais, redução exponencial por recência (meia-vida de 7 dias) e ajuste de discrepância acima de 2,5 p.p., limitado a 30%. Os resultados originais permanecem visíveis nesta tabela.</p><details><summary>Como os dados são atualizados?</summary><p>Esta primeira versão utiliza uma base editorial com fontes identificadas. A cada boletim atualizado nesta conversa, os dados revisados podem ser publicados no site. Enquanto a página está aberta, ela verifica novas versões a cada 30 segundos e ao voltar à aba. A verificação não pesquisa novos levantamentos: ela recebe os boletins publicados.</p></details></section>`;['search','from','sort'].forEach(id=>document.getElementById(id).addEventListener('input',rows));document.getElementById('export').addEventListener('click',download);rows();}
function filtered(){let p=polls.filter(p=>p.name.toLowerCase().includes(document.getElementById('search').value.toLowerCase())&&(!document.getElementById('from').value||p.date>=document.getElementById('from').value));let s=document.getElementById('sort').value;return p.sort((a,b)=>s==='name'?a.name.localeCompare(b.name):s==='old'?a.date.localeCompare(b.date):b.date.localeCompare(a.date));}
function rows(){const p=filtered();document.getElementById('count').textContent=`${p.length} de ${polls.length} levantamentos · Referência: ${date(dataset.referenceDate)}/2026`;document.getElementById('empty').hidden=p.length>0;document.getElementById('rows').innerHTML=p.map(p=>`<tr><td><strong>${p.name}</strong><br><span class="small">${date(p.date)}/2026${p.converted?' · convertido':''}</span></td><td class="num fv">${fmt(p.f)}%</td><td class="num lv">${fmt(p.l)}%</td><td>${p.field}</td><td>${p.n?fmt(p.n):'Não recuperada'}</td><td>${p.margin}</td><td><a class="link" target="_blank" rel="noopener noreferrer" href="${p.primaryUrl||p.url}" aria-label="Fonte de ${p.name}, abre em nova aba">${p.primaryUrl?"Instituto":"Divulgação"} ↗</a><br><a class="link" target="_blank" rel="noopener noreferrer" href="${p.url}">${p.primaryUrl?"Notícia ↗":"Detalhes ↗"}</a>${p.registration?`<br><a class="link" target="_blank" rel="noopener noreferrer" href="https://pesqele-divulgacao.tse.jus.br/" title="Número informado na divulgação; conferência individual pendente">TSE: ${p.registration} ↗</a>`:""}</td></tr>`).join('');const groups=new Map();for(const q of p){if(!groups.has(q.date))groups.set(q.date,[]);groups.get(q.date).push(q);}document.getElementById('mobile-poll-cards').innerHTML=[...groups].map(([day,items],index)=>`<details class="mobile-poll-day" ${index===0?'open':''}><summary style="cursor:pointer;padding:16px 4px;font-weight:750;font-size:18px">${new Date(day+'T12:00:00Z').toLocaleDateString('pt-BR',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'})} <span class="small" style="font-weight:400">· ${items.length} ${items.length===1?'pesquisa':'pesquisas'}</span></summary>${items.map(q=>`<article class="mobile-poll-card"><div class="mobile-poll-head"><div><strong>${q.name}</strong><div class="small">Divulgação: ${date(q.date)}/2026${q.converted?' · válidos convertidos':''}</div></div></div><div class="mobile-poll-scores"><div><span>Flávio</span><strong class="fv">${fmt(q.f)}%</strong></div><div><span>Lula</span><strong class="lv">${fmt(q.l)}%</strong></div></div><details><summary>Ver detalhes</summary><dl><div><dt>Coleta</dt><dd>${q.field}</dd></div><div><dt>Amostra</dt><dd>${q.n?fmt(q.n):'Não recuperada'}</dd></div><div><dt>Margem publicada</dt><dd>${q.margin}</dd></div>${q.registration?`<div><dt>Registro TSE</dt><dd>${q.registration}</dd></div>`:''}</dl><div class="mobile-poll-links"><a href="${q.primaryUrl||q.url}" target="_blank" rel="noopener noreferrer">Fonte principal ↗</a>${q.primaryUrl?`<a href="${q.url}" target="_blank" rel="noopener noreferrer">Notícia ↗</a>`:''}</div></details></article>`).join('')}</details>`).join('');}
function download(){const csv='\uFEFF'+[['Instituto','Divulgação','Flávio válidos (%)','Lula válidos (%)','Coleta','Amostra','Margem publicada','Fonte'],...filtered().map(p=>[p.name,p.date,fmt(p.f),fmt(p.l),p.field,p.n||'',p.margin,p.url])].map(row=>row.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(';')).join('\r\n');const u=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=u;a.download='pulsa-pesquisas-'+dataset.referenceDate+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);}
function methodology(){
 const rec=recencyAggregate(),model=dataset.standardModel;
 const rows=(rec?.rows||[]).slice().sort((a,b)=>b.effective-a.effective);
 const details=rows.map(r=>{const i=model.institutes.find(x=>x.name===r.name);return '<tr><td>'+r.name+'</td><td>'+i.qualityTier+'</td><td>'+(Number.isFinite(i.firstRoundMaePp)?fmt(i.firstRoundMaePp)+' p.p. (não auditado)':'Sem histórico')+'</td><td>'+fmt(r.effective)+'%</td></tr>';}).join('');
 main.innerHTML=intro('Transparência faz parte do método.','Qualidade, acurácia histórica moderada, recência de sete dias e redução de discrepâncias.')+`<section class="card"><h2>Modelo padrão: ${rows.length} institutos</h2><p>Entra uma pesquisa nacional mais recente por instituto, divulgada até a data de corte, em votos válidos. As rodadas anteriores permanecem no histórico. Data de referência: ${date(dataset.dataCutoffDate||dataset.referenceDate)}/2026.</p><h2>Como cada peso é calculado</h2><p><strong>Qualidade A/B/C:</strong> multiplicadores A = 1,30; B = 1,00; C = 0,70. As categorias são <strong>classificações editoriais provisórias</strong>, não certificações independentes de precisão. A distribuição por instituto está na tabela abaixo.</p><p><strong>Acurácia histórica moderada:</strong> fator = raiz quadrada de [2,45 ÷ máximo(1,5; erro histórico cadastrado em p.p.)]. Para institutos sem histórico, fator neutro 1,00. <strong>Os erros históricos cadastrados ainda não foram auditados individualmente</strong>; valores repetidos de 2,45 p.p. podem ser referências provisórias.</p><p><strong>Recência:</strong> peso reduzido à metade a cada sete dias desde o fim da coleta, não desde a divulgação.</p><p><strong>Discrepância:</strong> a mediana ponderada apenas pela recência é a referência; resultados acima de 2,5 pontos percentuais de distância recebem redução de 10% por ponto excedente, limitada a 30%. O critério é simétrico.</p><div class="formula">Peso bruto = categoria × acurácia × 2^(−dias desde o fim da coleta / 7) × (1 − redutor)</div><div class="formula">Redutor = mín(0,30; 0,10 × máx(0; |votos válidos − mediana| − 2,5))</div><div class="formula">Peso efetivo = peso bruto / soma de todos os pesos brutos</div><div class="formula">Média = soma (peso efetivo × percentual de votos válidos)</div><details class="weights-accordion"><summary>Pesos efetivos dos institutos <span aria-hidden="true">▾</span></summary><p>Pesos normalizados, recalculados quando entram novas pesquisas. Os pesos da tabela somam 100%.</p><div class="table-wrap"><table><thead><tr><th>Instituto</th><th>Categoria</th><th>Erro histórico cadastrado</th><th>Peso efetivo</th></tr></thead><tbody>${details}</tbody></table></div></details><h2>Limitações e interpretação</h2><p>A classificação de qualidade e parte dos indicadores históricos ainda carecem de validação documental. Não há garantia de que pesos maiores correspondam a maior precisão futura. O desvio padrão ponderado entre institutos é ${rec?fmt(rec.sd):'indisponível'} p.p., não uma margem de erro. A faixa de sensibilidade do painel é hipotética, não um intervalo de confiança validado. A média não indica probabilidade de vitória.</p><h2>Tendência histórica e projeção condicional</h2><p>A tendência experimental é reconstruída a partir da mudança entre a primeira e a última rodada documentada de cada instituto com pelo menos duas observações. Cada instituto é comparado consigo mesmo, com pesos efetivos do modelo padrão normalizados apenas entre institutos com histórico. As datas intermediárias são interpoladas linearmente: não são pesquisas diárias observadas. A última estimativa é ancorada na média ponderada atual. Quando não há data de fim de coleta histórica, utiliza-se provisoriamente a data de divulgação; essa aproximação limita a precisão temporal.</p><p>A projeção condicional até 25/10 parte da média atual M. Sua inclinação é a mudança ponderada entre rodadas dividida pela duração média ponderada, reduzida à metade por prudência e limitada a ±0,15 ponto percentual por dia. Não é previsão validada, não inclui eventos futuros nem intervalo de confiança calibrado.</p><div class="formula">P = M + dias até 25/10 × limite(0,50 × mudança ponderada ÷ duração média; −0,15; +0,15)</div><p><strong>Gerp:</strong> o erro pontual de 1,095 p.p. do primeiro turno foi preservado apenas como referência documental; o fator de acurácia no peso está neutro (1,00), pois um acerto isolado não demonstra precisão histórica consistente. O instituto permanece no modelo com recência, categoria e redutor de discrepância aplicáveis.</p><h2>Probabilidade experimental de vitória (modelo independente 1.0)</h2><p>O painel da aba Tendências não altera a média ponderada padrão. Parte da projeção condicional de Flávio (P), calculada sobre a média atual de votos válidos (M), e mede a evolução relativa da rejeição declarada dentro de cada instituto que tenha pelo menos duas rodadas nacionais comparáveis, divulgadas até a data de corte. Para cada instituto: Δ = (rejeição a Flávio − rejeição a Lula) na última rodada menos essa mesma diferença na primeira rodada cadastrada. R é a média simples dos Δ entre os institutos elegíveis. Rejeição exclusiva, como a do Datafolha, não é misturada com rejeição declarada. Institutos com uma única rodada não entram no cálculo da evolução.</p><div class="formula">Votação experimental de Flávio = P − 0,15 × R</div><div class="formula">Probabilidade de Flávio = Φ[(votação experimental − 50) ÷ 1,75]; probabilidade de Lula = 100% − probabilidade de Flávio</div><p>Φ é a distribuição normal acumulada. O fator de conversão de 15% e o desvio-padrão de 1,75 ponto percentual são <strong>hipóteses fixas e não calibradas historicamente</strong>. A evolução da rejeição pode já estar refletida nas intenções de voto; portanto, existe risco de dupla contagem. O modelo não incorpora rejeição exclusiva, ambiente digital ou eventos políticos. A projeção condicional já está incorporada em P, mas não foi calibrada historicamente. Não representa chance comprovada de vitória, margem de erro, nem intervalo de confiança. É recalculado com os dados verificados e mantém os parâmetros constantes, mesmo se o resultado contrariar expectativas.</p><p>O histórico probabilístico começa no primeiro registro da versão 1.0. Não são atribuídas probabilidades retrospectivas a datas em que o modelo não estava publicado.</p><h2>Fontes e histórico</h2><p>As fontes e registros TSE informados aparecem na aba Pesquisas. O registro não equivale a certificação do TSE. Os resultados históricos de metodologias diferentes não devem ser comparados sem reconstrução dos pesos.</p></section>`;
}
function independentToday(rec,cutoff){
 const day=s=>Date.parse(s+'T00:00:00Z')/86400000;
 let adjustment=0,coverage=0;
 for(const row of rec.rows){
  const rounds=[...(dataset.instituteHistory?.[row.name]||[]),...polls.filter(p=>p.name===row.name)].filter(p=>Number.isFinite(p.f)&&p.date<=cutoff);
  const unique=[...new Map(rounds.map(p=>[p.date,p])).values()].sort((a,b)=>day(a.fieldEnd||a.date)-day(b.fieldEnd||b.date));
  if(unique.length<2)continue;
  const last=unique.at(-1),prev=unique.at(-2),elapsed=day(last.fieldEnd||last.date)-day(prev.fieldEnd||prev.date);
  if(elapsed<=0)continue;
  const age=Math.max(0,day(cutoff)-day(row.fieldEnd));
  const slope=(last.f-prev.f)/elapsed;
  const correction=Math.max(-.15,Math.min(.15,slope*.5))*Math.min(age,5);
  adjustment+=row.effective/100*correction;
  coverage+=row.effective/100;
 }
 return {f:Math.max(0,Math.min(100,rec.f+adjustment)),adjustment,coverage};
}
function shortWindowTrend(cutoff){
 const model=dataset.standardModel,day=s=>Date.parse(s+'T00:00:00Z')/86400000;
 const values=[];
 for(let k=3;k>=0;k--){
  const date=new Date((day(cutoff)-k)*86400000).toISOString().slice(0,10);
  const rows=model.institutes.map(i=>{
   const rounds=[...(dataset.instituteHistory?.[i.name]||[]),...polls.filter(q=>q.name===i.name)];
   const p=rounds.filter(q=>q.date<=date&&q.fieldEnd&&q.fieldEnd<=date&&q.eligible!==false&&!q.excludeFromCalculations&&Number.isFinite(q.f)).sort((a,b)=>b.fieldEnd.localeCompare(a.fieldEnd)||b.date.localeCompare(a.date))[0];
   if(!p)return null;
   const age=Math.max(0,day(date)-day(p.fieldEnd));
   const raw=Math.pow(2,-age/(model.halfLifeDays||7));
   const quality=model.qualityFactors?.[i.qualityTier]??1;
   const accuracy=Number.isFinite(i.firstRoundMaePp)?Math.sqrt((model.accuracyReferencePp||2.45)/Math.max(model.accuracyFloorPp||1.5,i.firstRoundMaePp)):1;
   return {f:p.f,raw,quality,accuracy};
  }).filter(Boolean);
  if(!rows.length)return null;
  const ordered=[...rows].sort((a,b)=>a.f-b.f);
  const rawTotal=rows.reduce((a,b)=>a+b.raw,0);let cum=0,reference=ordered.at(-1).f;
  for(const row of ordered){cum+=row.raw;if(cum>=rawTotal/2){reference=row.f;break;}}
  let total=0,sum=0;
  for(const row of rows){
   const w=row.raw*row.quality*row.accuracy*(1-Math.min(.3,.1*Math.max(0,Math.abs(row.f-reference)-2.5)));
   total+=w;sum+=w*row.f;
  }
  values.push({date,f:sum/total,l:100-sum/total,available:rows.length});
 }
 const avg=values.reduce((a,b)=>a+b.f,0)/values.length;
 const slope=values.reduce((a,v,i)=>a+(i-1.5)*(v.f-avg),0)/5;
 return {points:values,slope};
}
function trendModel(){
 const rec=recencyAggregate();if(!rec)return null;
 const cutoff=dataset.dataCutoffDate||dataset.referenceDate;
 const today=independentToday(rec,cutoff);
 const day=s=>Date.parse(s+'T00:00:00Z')/86400000;
 const series=[];
 for(const row of rec.rows){
  const rounds=[...(dataset.instituteHistory?.[row.name]||[]),...polls.filter(p=>p.name===row.name)].filter(p=>Number.isFinite(p.f)&&p.date<=cutoff);
  const unique=[...new Map(rounds.map(p=>[p.date,p])).values()].sort((a,b)=>a.date.localeCompare(b.date));
  if(unique.length<2)continue;
  const first=unique[0],last=unique.at(-1),t0=day(first.fieldEnd||first.date),t1=day(last.fieldEnd||last.date);
  if(t1<=t0)continue;
  series.push({name:row.name,w:row.effective,t0,t1,delta:last.f-first.f});
 }
 if(series.length<4)return null;
 const coverage=series.reduce((a,r)=>a+r.w,0);
 const change=series.reduce((a,r)=>a+r.w*r.delta,0)/coverage;
 const dates=[...new Set(series.flatMap(r=>[r.t0,r.t1]))].sort((a,b)=>a-b);
 const points=dates.map(t=>{
  const delta=series.reduce((a,r)=>a+r.w*r.delta*Math.max(0,Math.min(1,(t-r.t0)/(r.t1-r.t0))),0)/coverage;
  const f=today.f-change+delta;
  return {date:new Date(t*86400000).toISOString().slice(0,10),f,l:100-f};
 });
 if(points.at(-1).date!==cutoff)points.push({date:cutoff,f:today.f,l:100-today.f});
 const days=series.reduce((a,r)=>a+r.w*(r.t1-r.t0),0)/coverage;
 const short=shortWindowTrend(cutoff);
 return {points:short?.points||points,fittedPoints:short?.points||points,n:series.length,cutoff,coverage,change,slope:short?.slope??change/days,meanF:rec.f,officialF:rec.f,todayAdjustment:today.adjustment,todayCoverage:today.coverage,lastPollDate:cutoff,trendWindowDays:4};
}
function conditionalProjection(model){
 const days=Math.max(0,(Date.parse('2026-10-25T11:00:00Z')-Date.parse(model.cutoff+'T00:00:00Z'))/86400000);
 const slope=Math.max(-.15,Math.min(.15,model.slope));
 const f=Math.max(0,Math.min(100,model.meanF+slope*days));
 return {date:'2026-10-25',days,slope,rawSlope:model.slope,f,l:100-f,from:{date:model.cutoff,f:model.meanF,l:100-model.meanF}};
}
function projectionChart(points,projection){
 const start=Date.parse(points[0].date),finish=Date.parse('2026-10-25T08:00:00Z'),x=p=>65+((p===projection?finish:Date.parse(p.date))-start)/(finish-start||1)*815;
 const vals=[...points.flatMap(p=>[p.f,p.l]),projection.f,projection.l];
 const low=Math.floor(Math.min(43,...vals)-1),high=Math.ceil(Math.max(57,...vals)+1),y=v=>25+(high-v)/(high-low)*265;
 const last=projection.from,xf=x(projection),xl=x(last);
 let out=`<svg class="projection-svg" viewBox="0 0 970 350" role="img" aria-label="Curvas suavizadas até ${date(last.date)} e extrapolação condicional tracejada até 25 de outubro às 8h (Brasília): Flávio ${fmt(projection.f)}%, Lula ${fmt(projection.l)}%. Não é previsão eleitoral.">`;
 for(let i=0;i<=4;i++){const v=low+(high-low)*i/4;out+=`<path d="M65 ${y(v)}H880" stroke="#e3e0e5" stroke-dasharray="3 6"/><text x="10" y="${y(v)+5}" font-size="15" fill="#68636c">${fmt(v)}%</text>`;}
 out+=`<path d="M${xl} 25V290" stroke="#aaa" stroke-dasharray="3 5"/>`;
 for(const [key,color] of [['f','#7774df'],['l','#f44330']]){
   out+=`<polyline fill="none" stroke="${color}" stroke-width="3" points="${points.map(p=>x(p)+','+y(p[key])).join(' ')}"/>`;
   out+=`<path d="M${xl} ${y(last[key])}L${xf} ${y(projection[key])}" stroke="${color}" stroke-width="3" stroke-dasharray="9 7" fill="none"/>`;
   out+=`<circle cx="${xf}" cy="${y(projection[key])}" r="5" fill="${color}"/><text x="890" y="${y(projection[key])+5}" fill="${color}" font-size="17" font-weight="700">${fmt(projection[key])}%</text>`;
 }
 out+=`<text x="65" y="326" fill="#68636c" font-size="15">${date(points[0].date)}</text><text x="${xl}" y="326" text-anchor="middle" fill="#68636c" font-size="15">${date(last.date)}</text><text x="${xf}" y="326" text-anchor="middle" fill="#68636c" font-size="15">25/10 · 8h</text></svg>`;
 return out;
}

function openVoteSection(){
 const raw=Array.isArray(dataset.openVote)?dataset.openVote:[];
 const rows=raw.filter(p=>!p.excludeFromCalculations&&p.scope==='second_round'&&p.basis==='total_respondents'&&p.categoriesExclusive===true&&typeof p.institute==='string'&&/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(p.date)&&Number.isFinite(p.blankNull)&&Number.isFinite(p.undecided)&&p.blankNull>=0&&p.undecided>=0&&p.blankNull+p.undecided<=100&&typeof p.source==='string'&&p.source.startsWith('https://'));
 const safe=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const groups=rows.reduce((a,p)=>((a[p.institute]??=[]).push(p),a),{});
 const latest=[...new Map([...rows].sort((a,b)=>a.date.localeCompare(b.date)).map(p=>[p.institute,p])).values()];
 const mean=k=>latest.reduce((sum,p)=>sum+p[k],0)/latest.length;
 const overview=latest.length?(()=>{
   const blank=mean('blankNull'),undecided=mean('undecided'),total=blank+undecided;
   const display=v=>v.toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1});
   const count=latest.length;
   const title=count===1?'Última pesquisa · '+safe(latest[0].institute):'Média simples · '+count+' institutos';
   const metric=(label,value,kind)=>'<div class="open-vote-metric '+kind+'"><span>'+label+'</span><strong>'+display(value)+'%</strong></div>';
   return '<div class="open-vote-overview" aria-label="'+safe(title)+'"><div class="eyebrow">PANORAMA GERAL</div><p class="open-vote-overview-subtitle">'+title+'</p><div class="open-vote-metrics">'+metric('Brancos/nulos',blank,'blank')+metric('Indecisos',undecided,'undecided')+metric('Total',total,'total')+'</div><div class="open-vote-overview-track" role="img" aria-label="Brancos e nulos: '+display(blank)+'%; indecisos: '+display(undecided)+'%; demais respostas: '+display(100-total)+'%"><span class="blank" style="width:'+blank+'%"></span><span class="undecided" style="width:'+undecided+'%"></span></div><p class="open-vote-overview-summary"><strong>'+display(total)+'%</strong> não indicaram voto em um dos finalistas.</p><p class="small">'+(count>1?'Última rodada de cada instituto, com pesos iguais. Média descritiva, sem margem de erro própria.':'Resultado de um instituto; não é média entre institutos.')+' Brancos/nulos e indecisos não representam necessariamente votos disponíveis para os candidatos.</p></div>';
 })():'';

 const series=Object.entries(groups).sort(([a],[b])=>a.localeCompare(b)).map(([name,points])=>{
   const ordered=points.sort((a,b)=>a.date.localeCompare(b.date));
   const latest=ordered.at(-1);
   const latestText='<p class="small"><strong>Última rodada:</strong> '+date(latest.date)+' · Brancos/nulos: '+fmt(latest.blankNull)+'% · Indecisos: '+fmt(latest.undecided)+'% · Total: '+fmt(latest.blankNull+latest.undecided)+'%</p>';
   const table='<div class="table-wrap"><table><thead><tr><th>Data</th><th>Brancos/nulos</th><th>Indecisos</th><th>Total</th><th>Fonte</th></tr></thead><tbody>'+ordered.map(p=>'<tr><td>'+date(p.date)+'</td><td>'+fmt(p.blankNull)+'%</td><td>'+fmt(p.undecided)+'%</td><td>'+fmt(p.blankNull+p.undecided)+'%</td><td><a href="'+safe(p.source)+'" target="_blank" rel="noopener noreferrer">Fonte ↗</a></td></tr>').join('')+'</tbody></table></div>';
   const graph=ordered.length<2?'<p class="small">Ainda há apenas uma rodada comparável deste instituto.</p>':(()=>{
     const first=ordered[0],last=ordered.at(-1);
     const pct=v=>v.toLocaleString('pt-BR',{maximumFractionDigits:1})+'%';
     const delta=v=>(v>0?'+':'')+v.toLocaleString('pt-BR',{maximumFractionDigits:1})+' p.p.';
     const defs=[
       {label:'Brancos/nulos',key:p=>p.blankNull,color:'#7774df'},
       {label:'Indecisos',key:p=>p.undecided,color:'#e45440'}
     ];
     const legend=defs.map(d=>{
       const before=d.key(first),after=d.key(last),change=Math.round((after-before)*10)/10;
       return '<div class="open-vote-series-card" style="--series-color:'+d.color+'"><span class="open-vote-series-label"><i aria-hidden="true"></i>'+d.label+'</span><div class="open-vote-series-numbers"><span>'+pct(before)+'</span><span aria-hidden="true">→</span><strong>'+pct(after)+'</strong><em>'+delta(change)+'</em></div></div>';
     }).join('');
     const w=600,h=280,left=48,right=568,top=20,bottom=228;
     const values=ordered.flatMap(p=>defs.map(d=>d.key(p)));
     const max=Math.max(10,Math.ceil(Math.max(...values)/2)*2);
     const x=i=>left+30+i*(right-left-60)/(ordered.length-1);
     const y=v=>bottom-(v/max)*(bottom-top);
     const grid=Array.from({length:6},(_,i)=>{const value=i*max/5,yy=y(value);return '<line x1="'+left+'" y1="'+yy+'" x2="'+right+'" y2="'+yy+'" stroke="#e8e5ed" stroke-width="1"/><text x="'+(left-8)+'" y="'+(yy+4)+'" text-anchor="end" fill="#77717e" font-size="12">'+value.toLocaleString('pt-BR',{maximumFractionDigits:1})+'%</text>';}).join('');
     const lines=defs.map(d=>{
       const points=ordered.map((p,i)=>x(i)+','+y(d.key(p))).join(' ');
       return '<polyline points="'+points+'" fill="none" stroke="'+d.color+'" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>'+ordered.map((p,i)=>'<circle cx="'+x(i)+'" cy="'+y(d.key(p))+'" r="5.5" fill="#fff" stroke="'+d.color+'" stroke-width="3"/>').join('');
     }).join('');
     const dates=ordered.map((p,i)=>'<text x="'+x(i)+'" y="'+(bottom+30)+'" text-anchor="middle" font-size="14" fill="#5c5664">'+date(p.date)+'</text>').join('');
     return '<div class="open-vote-evolution" aria-label="Evolução entre '+date(first.date)+' e '+date(last.date)+'"><div class="open-vote-evolution-head"><strong>Evolução das respostas</strong><span>'+date(first.date)+' → '+date(last.date)+'</span></div><div class="open-vote-series-legend" aria-label="Legenda e valores das séries">'+legend+'</div><svg class="open-vote-evolution-chart" viewBox="0 0 '+w+' '+h+'" role="img" aria-label="Linhas de evolução de brancos e nulos e indecisos; valores exatos na legenda acima">'+grid+lines+dates+'</svg><p class="small">Os pontos são resultados de pesquisas, não estimativas diárias. A variação está em pontos percentuais; duas rodadas não comprovam tendência consolidada.</p></div>';
   })();
   return '<div class="open-vote-institute" data-institute="'+safe(name)+'"><h3>'+safe(name)+'</h3>'+latestText+graph+table+'</div>';
 }).join('');
 return '<section class="card open-vote-section" aria-labelledby="open-vote-title"><div class="card-head"><div><div class="eyebrow">ELEITORES SEM VOTO EM UM DOS FINALISTAS</div><h2 id="open-vote-title">O voto ainda em aberto</h2><p class="sub">Evolução de brancos/nulos e indecisos nas pesquisas de segundo turno.</p></div></div><div class="open-vote-legend"><span><i class="open-vote-key key-blank"></i>Brancos e nulos</span><span><i class="open-vote-key key-undecided"></i>Indecisos</span><span><i class="open-vote-key key-total"></i>Total</span></div>'+overview+(rows.length?'<label class="field" style="display:block;max-width:380px;margin:20px 0">Instituto<select id="open-vote-select" style="display:block;width:100%;margin-top:8px">'+Object.keys(groups).sort().map(n=>'<option value="'+safe(n)+'">'+safe(n)+'</option>').join('')+'</select></label><div id="open-vote-series">'+series+'</div>':'<p class="notice">Aguardando rodadas verificadas com percentuais separados de brancos/nulos e indecisos sobre o total de entrevistados. Nenhum valor foi estimado ou convertido a partir de votos válidos.</p>')+'<p class="small">As séries são exibidas por instituto, sem misturar perguntas ou métodos distintos. O total soma brancos/nulos e indecisos apenas quando as categorias são mutuamente exclusivas na mesma pergunta. Não representa automaticamente votos que migrarão para algum candidato.</p></section>';
}
function bindOpenVoteSelect(){const select=document.getElementById('open-vote-select'),root=document.getElementById('open-vote-series');if(!select||!root)return;const items=[...root.querySelectorAll('[data-institute]')];const show=()=>items.forEach(el=>{el.style.display=el.getAttribute('data-institute')===select.value?'':'none';});select.addEventListener('change',show);show();}

/* Probabilidade experimental v1.0: independente da média padrão.
   15% da evolução relativa de rejeição declarada, sigma fixo 1,75 p.p.
   Não usar rejeição exclusiva nem inferir evolução de instituto com uma rodada. */
function experimentalWinModel(){
 const rec=recencyAggregate();if(!rec)return null;
 const cutoff=dataset.dataCutoffDate||dataset.referenceDate;
 const groups=new Map();
 for(const p of dataset.rejection||[]){
  if(p.group!=='declared'||p.scope!=='second_round'||p.date>cutoff||!Number.isFinite(p.f)||!Number.isFinite(p.l))continue;
  if(!groups.has(p.institute))groups.set(p.institute,[]);
  groups.get(p.institute).push(p);
 }
 const series=[...groups].map(([name,rows])=>{
  rows.sort((a,b)=>a.date.localeCompare(b.date));
  if(rows.length<2)return null;
  const first=rows[0],last=rows.at(-1);
  return {name,first:first.date,last:last.date,change:(last.f-last.l)-(first.f-first.l)};
 }).filter(Boolean);
 if(!series.length)return null;
 const rejectionChange=series.reduce((sum,r)=>sum+r.change,0)/series.length;
 const trend=trendModel(),forecast=trend?conditionalProjection(trend):null;const conversion=.15,sigma=1.75,projectedF=(forecast?forecast.f:rec.f)-conversion*rejectionChange;
 // Aproximação da função de distribuição normal acumulada.
 const x=(projectedF-50)/sigma;
 const z=Math.abs(x),t=1/(1+.2316419*z);
 const density=Math.exp(-z*z/2)/Math.sqrt(2*Math.PI);
 const cdf=1-density*(.319381530*t-.356563782*t*t+1.781477937*t**3-1.821255978*t**4+1.330274429*t**5);
 const probabilityF=100*(x>=0?cdf:1-cdf);
 return {cutoff,meanF:rec.f,rejectionChange,conversion,sigma,projectedF,probabilityF,probabilityL:100-probabilityF,series,forecast};
}
function experimentalWinPanel(){
 const p=experimentalWinModel();
 if(!p)return '<section class="card"><h2>Cenário e probabilidade experimental</h2><p class="notice">Ainda não há séries comparáveis de rejeição suficientes para calcular a estimativa.</p></section>';
 const votes=Math.max(0,Math.min(100,p.projectedF));
 const chance=Math.max(0,Math.min(100,p.probabilityF));
 const difference=Math.abs(2*votes-100);
 return '<section class="card pulsa-combined" id="win-probability"><div class="card-head"><div><div class="eyebrow">PULSA · MODELO EXPERIMENTAL</div><h2>Cenário e probabilidade de vitória</h2><p class="small">Dados até '+date(p.cutoff)+'/2026 · Projeção condicional para 25/10, às 8h</p></div><span class="badge">Não calibrado</span></div>'+
 '<h3>Cenário eleitoral projetado</h3><p class="small">Estimativa de votos válidos com tendência e ajuste pela evolução da rejeição declarada.</p>'+
 '<div class="pulsa-combined-votes"><div><span>Flávio Bolsonaro</span><strong class="fv">'+fmt(votes)+'%</strong></div><div><span>Lula</span><strong class="lv">'+fmt(100-votes)+'%</strong></div></div>'+
 '<div class="split" style="--share:'+votes+'%" role="img" aria-label="Votos válidos projetados: Flávio '+fmt(votes)+' por cento, Lula '+fmt(100-votes)+' por cento"><span></span><span></span></div>'+
 '<p class="pulsa-combined-gap">Diferença projetada: '+fmt(difference)+' ponto(s) percentual(is)</p>'+
 '<div class="pulsa-combined-secondary"><h3>E qual é a chance de vitória?</h3><p class="small">Probabilidade matemática experimental, não calibrada.</p>'+
 '<div class="pulsa-combined-chances"><div><span>Flávio</span><strong class="fv">'+fmt(chance)+'%</strong></div><div><span>Lula</span><strong class="lv">'+fmt(p.probabilityL)+'%</strong></div></div></div>'+
 '<p class="small">O cenário considera a tendência das pesquisas e a evolução da rejeição declarada ('+p.series.length+' institutos comparáveis). Conversão hipotética de 15%; incerteza fixa de 1,75 p.p. A rejeição exclusiva não entra neste ajuste. Esses parâmetros não foram calibrados e os percentuais de probabilidade não constituem previsão validada. <a href="#metodologia">Entenda a metodologia</a>.</p></section>';
}

function experimentalTrend(){
 const model=trendModel();
 if(!model){main.innerHTML=intro('Tendência experimental.','Ainda não há observações suficientes para calcular uma trajetória.')+'<p class="notice">Sem dados suficientes para exibir a curva. O painel principal permanece disponível.</p>';return;}
 const ps=model.points,first=ps[0],last=ps.at(-1),projection=conditionalProjection(model);
 const direction=Math.abs(model.change)<.2?'Estabilidade aparente':model.change>0?'Alta aparente de Flávio':'Aproximação aparente de Lula';
 main.innerHTML=intro('Tendência experimental.','Uma leitura exploratória da direção das pesquisas, separada da média principal.')+
 `<section class="card trend-card experimental-trend-card"><div class="card-head"><div><div class="eyebrow">MODELO ESTATÍSTICO EXPERIMENTAL</div><h2>Cenário de hoje</h2><p class="sub">Reconstrução experimental das mudanças dentro de cada instituto até ${date(model.cutoff)}/2026, encerrada na última data de coleta, ${date(model.lastPollDate)}. Usa os pesos oficiais, mas estima o cenário atual independentemente, extrapolando de forma limitada as duas últimas rodadas comparáveis de cada instituto. Datas intermediárias são interpoladas entre rodadas, não observações diárias.</p></div><span class="badge">${model.n} institutos</span></div>
 <div class="trend-summary"><div><span>Leitura do período</span><strong>${direction}</strong></div><div><span>Variação entre rodadas de Flávio</span><strong class="fv">${model.change>0?'+':''}${fmt(model.change)} p.p.</strong></div><div><span>Período da curva</span><strong>${date(first.date)} a ${date(last.date)}</strong></div></div>
 <div class="forecast-numbers trend-current-numbers" aria-label="Valores reconstruídos em ${date(last.date)}"><div><span>Flávio Bolsonaro</span><strong class="fv">${fmt(last.f)}%</strong></div><div><span>Lula</span><strong class="lv">${fmt(last.l)}%</strong></div></div>
 <p class="small">Cenário de hoje: estimativa experimental independente da média oficial. A diferença decorre de extrapolação limitada entre a última coleta e a data de corte; institutos sem duas rodadas comparáveis mantêm o valor observado. Não são pesquisas realizadas diariamente.</p>
 <div class="legend"><span><i class="dot"></i>Flávio Bolsonaro</span><span><i class="dot r"></i>Lula · linha tracejada</span></div>
 ${timeChart(ps)}
 <section class="conditional-forecast" aria-labelledby="conditional-title"><div class="eyebrow">SIMULAÇÃO · NÃO É PREVISÃO ELEITORAL</div><h3 id="conditional-title">E se a tendência continuar até 25/10 às 8h?</h3><p class="small">Continuação condicional até a abertura da votação, às 8h de Brasília, a partir do cenário de hoje, com metade da inclinação média entre rodadas e limite de 0,15 ponto percentual por dia. Não é previsão eleitoral.</p>
 <div class="forecast-numbers"><div><span>Flávio Bolsonaro</span><strong class="fv">${fmt(projection.f)}%</strong></div><div><span>Lula</span><strong class="lv">${fmt(projection.l)}%</strong></div></div>
 <div class="legend"><span><i class="dot"></i>Flávio</span><span><i class="dot r"></i>Lula</span><span>Linha tracejada: simulação</span></div>
 ${projectionChart(ps,projection)}
 <p class="notice">A simulação parte do cenário de hoje, calculado separadamente da média do painel principal. Pressupõe continuidade da tendência recente e não incorpora eventos futuros, indecisos, abstenção nem mudanças de comportamento. Não possui intervalo de confiança validado. Não indica probabilidade de vitória.</p></section>
 <p class="small"><strong>Como ler:</strong> reconstrução interpolada das mudanças dentro de cada instituto; não são observações diárias. O último ponto representa o cenário de hoje, estimado separadamente da média oficial. Cobertura: ${fmt(model.coverage)}% do peso atual em ${model.n} institutos com rodadas comparáveis. Quando falta data de coleta histórica, utiliza-se a data de publicação como aproximação.</p>
 ${experimentalWinPanel()}
 ${openVoteSection()}
 <p class="notice"><strong>Limitações:</strong> série reconstruída com cobertura parcial e datas aproximadas; não é trajetória observada dia a dia. Probabilidade experimental não calibrada.</p>
 <details><summary>Dados da curva e parâmetros</summary><p class="small">Variação dentro dos institutos, ponderada pelo peso atual; interpolação entre primeira e última rodadas; projeção reduzida em 50%, limitada a ±0,15 p.p./dia.</p><div class="table-wrap"><table><tr><th>Data estimada</th><th>Flávio</th><th>Lula</th></tr>${ps.map(p=>`<tr><td>${date(p.date)}</td><td>${fmt(p.f)}%</td><td>${fmt(p.l)}%</td></tr>`).join('')}</table></div></details></section>`;
}

function rejection(){
  const records=(Array.isArray(dataset.rejection)?dataset.rejection:[]).filter(p=>p.scope==='second_round');
  const groups=[
    {id:'declared',title:'Rejeição declarada',description:'Respostas sobre em quem o eleitor não votaria de jeito nenhum. A redação da pergunta e a possibilidade de múltiplas respostas devem ser conferidas em cada levantamento.'},
    {id:'exclusive',title:'Rejeição exclusiva',description:'Eleitores que rejeitam apenas um dos candidatos. Não é diretamente comparável à rejeição declarada.'}
  ];
  const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const render=p=>'<article class="rejection-entry"><div class="rejection-entry-head"><strong>'+safe(p.institute)+'</strong><span class="small">'+safe(p.date?date(p.date):'')+'</span></div><div class="rejection-scores"><div><span>Flávio Bolsonaro</span><strong class="fv">'+fmt(p.f)+'%</strong></div><div><span>Lula</span><strong class="lv">'+fmt(p.l)+'%</strong></div></div><p class="small">'+safe(p.question||'')+'</p><details><summary>Metodologia e fonte</summary><p class="small">Coleta: '+safe(p.field||'Não informada')+' · Amostra: '+safe(p.n||'Não informada')+' · Margem: '+safe(p.margin==null?'Não informada':'±'+p.margin+' p.p.')+'</p><p class="small">Método: '+safe(p.method||'Não informado')+' · Registro: '+safe(p.registration||'Não informado')+'</p>'+(p.source?'<a class="link" target="_blank" rel="noopener noreferrer" href="'+safe(p.source)+'">Consultar fonte ↗</a>':'')+'</details></article>';
  const summary=entries=>{
    if(!entries.length)return '';
    const latest=[...new Map([...entries].sort((a,b)=>a.date.localeCompare(b.date)).map(p=>[p.institute,p])).values()];
    const multiple=latest.length>1;
    const avg=k=>latest.reduce((sum,p)=>sum+p[k],0)/latest.length;
    const subtitle=multiple?'Média simples das últimas rodadas de '+latest.length+' institutos':'Resultado da última rodada · '+safe(latest[0].institute);
    return '<div class="rejection-summary" aria-label="'+safe(subtitle)+'"><div class="eyebrow">'+(multiple?'SÍNTESE DO GRUPO':'PESQUISA MAIS RECENTE')+'</div><h3>'+subtitle+'</h3><div class="rejection-scores"><div><span>Flávio Bolsonaro</span><strong class="fv">'+fmt(avg('f'))+'%</strong></div><div><span>Lula</span><strong class="lv">'+fmt(avg('l'))+'%</strong></div></div><p class="small">'+(multiple?'Cada instituto conta uma vez, usando apenas sua rodada mais recente. Média descritiva, sem ponderação por amostra ou precisão; não é uma estimativa estatística nem possui margem de erro própria.':'Há apenas um instituto neste grupo; o valor exibido não é uma média entre institutos.')+'</p></div>';
  };
  const hero=()=>{
    const panel=(group,title,id)=>{
      const entries=records.filter(p=>p.group===group).sort((a,b)=>a.date.localeCompare(b.date));
      if(!entries.length)return '<section class="hero rejection-hero"><h2>'+title+'</h2><p>Sem levantamentos cadastrados.</p></section>';
      const latest=[...new Map(entries.map(p=>[p.institute,p])).values()];
      const mean=k=>latest.reduce((sum,p)=>sum+p[k],0)/latest.length;
      const f=mean('f'),l=mean('l');
      const subtitle=latest.length===1?'Última rodada · '+safe(latest[0].institute)+' · '+date(latest[0].date):'Média simples das últimas rodadas · '+latest.length+' institutos';
      const bar=(name,value,color)=>'<div class="rejection-hero-bar"><div class="rejection-hero-label"><span>'+name+'</span><strong>'+fmt(value)+'%</strong></div><div class="rejection-hero-track" role="img" aria-label="'+name+': '+fmt(value)+' por cento"><span class="'+color+'" style="width:'+Math.max(0,Math.min(100,value))+'%"></span></div></div>';
      return '<section class="hero rejection-hero" aria-labelledby="'+id+'"><div class="eyebrow">SEGUNDO TURNO</div><h2 id="'+id+'">'+title+'</h2><p class="rejection-hero-subtitle">'+subtitle+'</p><div class="rejection-hero-bars">'+bar('Flávio Bolsonaro',f,'violet')+bar('Lula',l,'coral')+'</div><div class="rejection-hero-bottom"><strong>Diferença: '+fmt(Math.abs(f-l))+' p.p.</strong></div><p class="rejection-hero-note">'+(latest.length>1?'Média descritiva, sem ponderação e sem margem de erro agregada. Perguntas podem variar entre institutos.':'Resultado de um único instituto; não é média entre institutos.')+' Não comparar diretamente com o outro painel. Rejeições não precisam somar 100%.</p></section>';
    };
    return '<section class="hero rejection-unified"><h2>Rejeição eleitoral</h2><p>Duas metodologias de aferição</p><div class="rejection-hero-grid">'+panel('declared','Rejeição declarada','rejection-declared-title')+panel('exclusive','Rejeição exclusiva','rejection-exclusive-title')+'</div><p>Indicadores distintos; não combinar em uma média.</p></section>';
  };
  main.innerHTML=intro('Rejeição','O limite de crescimento de cada candidatura, com perguntas e metodologias contextualizadas.')+hero()+'<section class="card rejection-explainer" aria-labelledby="rejection-explainer-title"><div class="eyebrow">ENTENDA O INDICADOR</div><h2 id="rejection-explainer-title">O que é rejeição eleitoral?</h2><p>A rejeição mede a parcela de eleitores que declara não votar em determinado candidato. No segundo turno, ajuda a compreender a resistência enfrentada por cada candidatura e suas possibilidades de conquistar novos votos.</p><p>Uma rejeição elevada pode dificultar o crescimento eleitoral, mas não determina o resultado. A decisão também depende da mobilização dos eleitores, da abstenção e dos votos brancos e nulos.</p><p class="small"><strong>Rejeição exclusiva:</strong> considera quem rejeita apenas um dos dois candidatos. É diferente da rejeição geral, que pode incluir eleitores que rejeitam ambos. Rejeição não equivale a intenção de voto nem a uma previsão do resultado.</p></section>'+'<section class="card"><div class="card-head"><div><div class="eyebrow">COMPARAÇÃO RESPONSÁVEL</div><h2>Rejeição dos candidatos</h2><p class="small">Somente perguntas comprovadamente referentes ao confronto de segundo turno entre Lula e Flávio Bolsonaro entram no painel. Os levantamentos são separados pela definição do indicador.</p></div></div><p class="notice">As sínteses abaixo são descritivas e usam apenas a rodada mais recente de cada instituto dentro de seu grupo. Não há média geral entre grupos nem margem de erro calculada para essas sínteses.</p></section>'+groups.map(g=>{const entries=records.filter(p=>p.group===g.id).sort((a,b)=>b.date.localeCompare(a.date));return '<section class="card"><div class="card-head"><div><div class="eyebrow">INDICADOR</div><h2>'+g.title+'</h2><p class="small">'+g.description+'</p></div></div>'+(entries.length?summary(entries)+'<div class="rejection-list">'+entries.map(render).join('')+'</div>'+[...new Set(entries.map(p=>p.institute))].map(name=>{const rounds=entries.filter(p=>p.institute===name).sort((a,b)=>a.date.localeCompare(b.date));return rounds.length>1?'<div class="rejection-evolution"><h3>Evolução · '+safe(name)+'</h3>'+timeChart(rounds)+'</div>':'';}).join(''):'<p class="notice">Nenhum levantamento deste grupo foi confirmado como referente exclusivamente ao segundo turno. Resultados de rejeição geral ficam de fora.</p>')+'</section>';}).join('')+'<p class="small">Rejeição não equivale à intenção de voto. Mesmo dentro de um grupo, mudanças na pergunta, universo ou coleta podem impedir comparações diretas.</p>';
}
let current='';function route(){const h=location.hash.slice(1)||'media';if(['criterios','calculo','limites','historico'].includes(h)){if(current!=='metodologia'){methodology();current='metodologia';}requestAnimationFrame(()=>document.getElementById(h)?.scrollIntoView({behavior:'smooth'}));return;}current=['media','pesquisas','metodologia','tendencia','rejeicao'].includes(h)?h:'media';({media:average,pesquisas:research,metodologia:methodology,tendencia:experimentalTrend,rejeicao:rejection})[current]();document.querySelectorAll('nav a').forEach(a=>{if(a.hash==='#'+current)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});document.title=({media:'Média',pesquisas:'Pesquisas',metodologia:'Metodologia',tendencia:'Tendência experimental',rejeicao:'Rejeição'})[current]+' • Pulsa';bindTrend();bindOpenVoteSelect();window.scrollTo(0,0);}window.addEventListener('hashchange',route);
function trendSeries(name){const historical=dataset.instituteHistory?.[name]||[];const rounds=[...historical,...polls.filter(p=>p.name===name)];return [...new Map(rounds.filter(p=>p.date&&Number.isFinite(p.f)&&Number.isFinite(p.l)).map(p=>[p.registration||p.date,p])).values()].sort((a,b)=>a.date.localeCompare(b.date));}
function trendSection(){const sorted=[...polls].map((p,index)=>({...p,publicationOrder:index})).sort((a,b)=>(b.fieldEnd||b.date).localeCompare(a.fieldEnd||a.date)||b.date.localeCompare(a.date)||(b.publicationTime||'').localeCompare(a.publicationTime||'')||b.publicationOrder-a.publicationOrder);const seen=new Set();const latest=sorted.filter(p=>{if(seen.has(p.name))return false;seen.add(p.name);return true;});const selected=latest[0]?.name||'';return `<section class="card trend-card" id="rodadas-institutos"><div class="card-head"><div><div class="eyebrow">RODADAS DO MESMO INSTITUTO</div><h2>Tendência das intenções de voto</h2><p class="sub">Compare a evolução dentro de uma mesma pesquisa.</p></div><label class="field trend-select">Instituto<select id="trend-institute">${latest.map(p=>`<option value="${p.name}" ${p.name===selected?'selected':''}>${p.name}</option>`).join('')}</select></label></div><div id="trend-content">${renderTrend(selected)}</div></section>`;}
function renderTrend(name){const points=trendSeries(name),last=points.at(-1),first=points[0];if(!last)return '<p>Sem dados disponíveis.</p>';const changes=points.length>1?`<span class="small">Desde ${date(first.date)}: Flávio ${fmt(last.f-first.f)} p.p. · Lula ${last.l-first.l>0?'+':''}${fmt(last.l-first.l)} p.p.</span>`:'';return `<div class="trend-summary"><div><span><i class="dot"></i>Flávio Bolsonaro</span><strong class="fv">${fmt(last.f)}%</strong></div><div><span><i class="dot r"></i>Lula</span><strong class="lv">${fmt(last.l)}%</strong></div><div class="trend-change">${changes}</div></div>${points.length>1?timeChart(points):'<p class="notice">Apenas uma rodada disponível neste instituto. A linha de tendência aparecerá quando uma segunda rodada for incluída.</p>'}<p class="small">${name} · Votos válidos · Datas de divulgação. ${points.length>1?'A diferença entre os candidatos passou de '+fmt(first.f-first.l)+' para '+fmt(last.f-last.l)+' p.p. A variação observada não comprova, sozinha, uma mudança estatisticamente significativa.':'Não há projeção a partir de uma única observação.'}</p><details><summary>Ver dados e fonte</summary><div class="table-wrap"><table><tr><th>Divulgação</th><th>Flávio</th><th>Lula</th></tr>${points.map(p=>`<tr><td>${date(p.date)}</td><td>${fmt(p.f)}%</td><td>${fmt(p.l)}%</td></tr>`).join('')}</table></div><p><a class="link" href="${polls.find(p=>p.name===name).url}" target="_blank" rel="noopener noreferrer">Consultar publicação ↗</a></p></details>`;}
function timeChart(points){const minT=Date.parse(points[0].date),maxT=Date.parse(points.at(-1).date);const low=Math.min(44,...points.flatMap(p=>[p.f,p.l])),high=Math.max(56,...points.flatMap(p=>[p.f,p.l]));const x=p=>70+(Date.parse(p.date)-minT)/(maxT-minT||1)*790,y=v=>30+(high-v)/(high-low)*270;let out=`<svg class="trend-svg" viewBox="0 0 980 355" role="img" aria-label="Evolução entre rodadas: ${points.map(p=>date(p.date)+', Flávio '+fmt(p.f)+'%, Lula '+fmt(p.l)+'%').join('; ')}">`;for(let i=0;i<=4;i++){const v=high-(high-low)*i/4;out+=`<path d="M70 ${y(v)}H860" stroke="#e3e0e5" stroke-dasharray="3 6"/><text x="15" y="${y(v)+5}">${fmt(v)}%</text>`;}out+=`<path d="M70 ${y(50)}H860" stroke="#9e97a3" stroke-dasharray="5 5"/>`;['f','l'].forEach((k,i)=>{const c=i?'#f44330':'#7774df';out+=`<polyline points="${points.map(p=>x(p)+','+y(p[k])).join(' ')}" stroke="${c}" fill="none" stroke-width="3" ${i?'stroke-dasharray="8 4"':''}/>`;points.forEach(p=>{out+=`<circle cx="${x(p)}" cy="${y(p[k])}" r="6" fill="${c}" stroke="white" stroke-width="2"><title>${date(p.date)}: ${fmt(p[k])}%</title></circle>`;});const last=points.at(-1);out+=`<text x="880" y="${y(last[k])+5}" style="fill:${i?'#b8291b':'#514bb0'};font-weight:700">${fmt(last[k])}%</text>`;});points.forEach(p=>out+=`<text x="${x(p)}" y="335" text-anchor="middle">${date(p.date)}</text>`);return out+'</svg>';}
function bindTrend(){const select=document.getElementById('trend-institute');if(!select)return;const content=document.getElementById('trend-content');if(select.options.length){select.selectedIndex=0;content.innerHTML=renderTrend(select.value);}select.addEventListener('change',()=>{content.innerHTML=renderTrend(select.value);});}
window.addEventListener('pageshow',event=>{if(event.persisted&&current==='media'){const select=document.getElementById('trend-institute');if(select&&select.options.length){select.selectedIndex=0;document.getElementById('trend-content').innerHTML=renderTrend(select.value);}}});
let checking=false;
async function refreshData(){if(checking)return;checking=true;const status=document.getElementById('sync-status');try{const response=await fetch('data.json?t='+Date.now(),{cache:'no-store'});if(!response.ok)throw Error('HTTP '+response.status);const incoming=await response.json();if(!Array.isArray(incoming.polls)||!Array.isArray(incoming.history))throw Error('Formato inválido');const changed=dataset&&incoming.revision!==dataset.revision;dataset=incoming;polls=incoming.polls;if(!current){route();}else if(changed){const scroll=window.scrollY;if(current==='media'){average();bindTrend();}else if(current==='pesquisas'){research();}else if(current==='tendencia'){experimentalTrend();}else if(current==='rejeicao'){rejection();}else if(current==='metodologia'){methodology();}window.scrollTo(0,scroll);}if(status)status.textContent='Verificado às '+new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})+' · Nova versão a cada boletim publicado';}catch(error){if(status)status.textContent='Não foi possível sincronizar. Tentaremos novamente em 30 s.';if(!dataset)main.innerHTML='<p class="notice">Não foi possível carregar os dados. Use “Verificar atualização” para tentar novamente.</p>';}finally{checking=false;}}
function startData(){document.querySelector('.campaign-banner').insertAdjacentHTML('afterend','<div class="sync-bar"><span id="sync-status" role="status">Carregando dados…</span><button id="sync-now" type="button">Verificar atualização ↻</button></div>');document.getElementById('sync-now').addEventListener('click',refreshData);refreshData();setInterval(()=>{if(!document.hidden)refreshData();},30000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshData();});}

startData();

/* Comparação pesquisas × urnas */
