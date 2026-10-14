// Discovery 0.4, with protocol 0.3 retained for migration: original source content remains untouched and traceable.
import {escapeHTML as esc} from './core.js';
export const DOMAINS=['Compreensão de instruções','Classificação e localização','Sequenciamento de tarefas','Priorização e atualização','Conferência e divergências','Comunicação funcional','Transferência de estratégias'];
export const DISCOVERY_DOMAINS=[DOMAINS[0],DOMAINS[2],DOMAINS[3],DOMAINS[4],DOMAINS[5]];
const discoveryDomain=old=>[0,2,3,4,5].indexOf(old);
export const RESERVE=['R1.2','R2.1','R3.1','R4.2','R5.3','R8.3'];
const merges={
 D01:{sources:['D01','D07','D08','D33'],text:'Que atividades de trabalho você gostaria de experimentar primeiro?'},
 D04:{sources:['D03','D04'],text:'Conte uma atividade que você já realizou. O que fazia do começo ao fim?',follow:'O que gostava nessa atividade? Por quais partes era responsável?'},
 D17:{sources:['D10','D17'],text:'Quando uma orientação não fica clara, como você procura esclarecê-la?',follow:'Se necessário, explore separadamente: uma explicação rápida e uma orientação com informações faltando.'},
 D25:{sources:['D25','D26'],text:'Quais condições do ambiente ajudam e quais atrapalham sua concentração?'},
 D28:{sources:['D28','D29'],text:'Que horários e organização da jornada funcionam melhor para você?',follow:'Explore períodos de melhor rendimento, duração da jornada e intervalos.'},
 D31:{sources:['D31','D32'],text:'Que recursos ou adaptações ajudam você a realizar atividades com autonomia?',follow:'Quais já utilizou? Quais gostaria de manter ou experimentar?'}
};
const skills={
 D04:[2,['Descreve uma atividade concreta pela qual foi responsável.','Apresenta etapas em uma sequência coerente do início ao fim.']],
 D09:[0,['Explicita o que precisa compreender antes de iniciar.','Descreve uma forma de verificar ou confirmar sua compreensão.']],
 D12:[2,['Identifica etapas necessárias da tarefa.','Descreve uma ordem ou recurso de organização coerente com essas etapas.']],
 D13:[3,['Considera os prazos das duas atividades.','Propõe uma ordem viável ou comunica a necessidade de negociar os prazos.']],
 D14:[4,['Identifica a divergência entre o resultado e o esperado.','Descreve uma correção pertinente ou a solicitação de ajuda necessária.']],
 D15:[3,['Identifica o que mudou na orientação.','Descreve como ajusta as próximas ações ou solicita as condições necessárias.']],
 D16:[4,['Indica o que confere em uma tarefa concreta.','Descreve como compara o resultado com o que era esperado.']],
 D17:[0,['Identifica uma informação ou parte da orientação que precisa esclarecer.','Formula um pedido de esclarecimento ou verifica uma hipótese pertinente.']],
 D18:[5,['Comunica o ponto de discordância de forma compreensível.','Solicita esclarecimento, propõe alternativa ou negocia uma condição pertinente.']],
 D20:[5,['Descreve como foram combinadas as responsabilidades.','Descreve uma comunicação necessária para coordenar a tarefa compartilhada.']],
 D21:[5,['Identifica a informação de que a outra pessoa precisa.','Descreve como transmite essa informação de modo útil à tarefa.']],
 D27:[5,['Comunica que necessita de uma pausa pelo seu modo de comunicação.','Indica ao interlocutor uma necessidade pertinente à pausa ou à continuidade da atividade.']]
};
const axisDomain=[0,4,3,3,1,2,1,5,4,6];
export function questions(content){
 const absorbed=new Set(Object.entries(merges).flatMap(([id,m])=>m.sources.filter(s=>s!==id)));
 const discovery=content.interview.filter(q=>!absorbed.has(q.id)).map(q=>({id:q.id,text:merges[q.id]?.text||q.text,sources:merges[q.id]?.sources||[q.id],follow:merges[q.id]?.follow||'',source:'Relato Discovery',domain:skills[q.id]?.[0]??null,criteria:skills[q.id]?.[1]||[],originalBlock:q.block}));
 const probes=content.probes.filter(p=>!RESERVE.includes(p.id)).map(p=>({id:p.id,text:p.prompt,sources:[p.id],source:'Sondagem RFT',domain:axisDomain[p.axis],criteria:[p.criterion],axis:p.axis,follow:''}));
 return [...discovery.filter(q=>q.domain===null),...[...discovery.filter(q=>q.domain!==null),...probes].sort((a,b)=>a.domain-b.domain)];
}
export function discoveryQuestions(content){return questions(content).filter(q=>q.source==='Relato Discovery').map(q=>({...q,domain:q.domain===null?null:discoveryDomain(q.domain)}));}
function legacyIds(){
 const content={interview:Array.from({length:36},(_,i)=>({id:'D'+String(i+1).padStart(2,'0'),text:'',block:0})),probes:Array.from({length:30},(_,i)=>({id:`R${Math.floor(i/3)+1}.${i%3+1}`,axis:Math.floor(i/3),prompt:'',criterion:''}))};
 return {old:questions(content).map(q=>q.id),current:discoveryQuestions(content).map(q=>q.id)};
}
export function migrateIntegrated(value){
 validateIntegrated(value);
 if(value.version==='discovery-rft-0.3'){
  const ids=legacyIds(),id=ids.old[value.lastQuestion],index=ids.current.indexOf(id);
  value.version='discovery-0.4';value.lastQuestion=Math.max(0,index);value.currentQuestionId=ids.current[value.lastQuestion];
 }
 return value;
}
export function blankIntegrated(){return {version:'discovery-0.4',lastQuestion:0,currentQuestionId:'D01',records:{}};}
export function blankRecord(){return {answer:'',score:null,independence:'unknown',help:'',access:'',notes:'',reason:'',evidenceIds:[]};}
export function validateIntegrated(value){
 if(!value||!['discovery-rft-0.3','discovery-0.4'].includes(value.version)||!Number.isInteger(value.lastQuestion)||value.lastQuestion<0||value.lastQuestion>(value.version==='discovery-0.4'?27:51)||!value.records||typeof value.records!=='object'||Array.isArray(value.records))throw Error('Entrevista Discovery inválida.');
 if(value.version==='discovery-0.4'&&legacyIds().current[value.lastQuestion]!==value.currentQuestionId)throw Error('Retomada Discovery inválida.');
 const absorbed=new Set(Object.entries(merges).flatMap(([id,m])=>m.sources.filter(s=>s!==id)));
 for(const [id,r] of Object.entries(value.records)){
  if(!/^(D(?:0[1-9]|[12]\d|3[0-6])|R(?:10|[1-9])\.[1-3])$/.test(id)||absorbed.has(id)||RESERVE.includes(id))throw Error('Pergunta Discovery RFT desconhecida.');
  if(!r||!['answer','help','access','notes','reason'].every(k=>typeof r[k]==='string')||![null,0,1,2].includes(r.score)||!Array.isArray(r.evidenceIds)||r.evidenceIds.some(x=>typeof x!=='string')||new Set(r.evidenceIds).size!==r.evidenceIds.length)throw Error('Registro Discovery RFT inválido.');
  if((id.startsWith('D')&&!skills[id]&&r.score!==null)||(id.startsWith('R')&&r.score===1))throw Error('Pontuação incompatível com o critério.');
  if(!['unknown','independent','assisted'].includes(r.independence))throw Error('Independência inválida.');
  if(r.first&&(!['answer','help','access','at'].every(k=>typeof r.first[k]==='string')))throw Error('Primeira evidência inválida.');
  if(r.score!==null&&!r.answer.trim())throw Error('Pontuação exige evidência registrada.');
 }
 return value;
}
export function integratedResults(a,qs){return DISCOVERY_DOMAINS.map((name,domain)=>{
 const items=qs.filter(q=>q.source==='Relato Discovery'&&skills[q.id]&&discoveryDomain(skills[q.id][0])===domain), valid=items.filter(q=>[0,1,2].includes(a.integrated?.records[q.id]?.score)&&a.integrated.records[q.id].answer.trim());
 return {name,domain,total:items.length,count:valid.length,reported:valid.length,probed:0,interview:valid.length>=2?Math.round(valid.reduce((sum,q)=>sum+a.integrated.records[q.id].score,0)/valid.length*50*100)/100:null,practical:null,integrated:null};
});}
export function integratedRadar(rows,visible=[true,true,true]){
 const cx=400,cy=290,R=170,n=rows.length, pos=(i,v)=>{const t=2*Math.PI*i/n-Math.PI/2;return [cx+Math.cos(t)*R*v/100,cy+Math.sin(t)*R*v/100];};
 const pts=values=>values.map((v,i)=>pos(i,v).join(',')).join(' ');
 let s='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" class="radar" role="img" aria-label="Radar Discovery — evidências relatadas. Cinco eixos; ausências sem valor."><rect width="800" height="600" fill="white"/>';
 for(const v of [25,50,75,100])s+=`<polygon points="${pts(rows.map(()=>v))}" fill="none" stroke="#dce5da"/><text x="405" y="${cy-R*v/100-5}" font-size="12">${v}</text>`;
 rows.forEach((r,i)=>{const p=pos(i,100),l=pos(i,132),words=r.name.split(' '),half=Math.ceil(words.length/2);s+=`<line x1="400" y1="290" x2="${p[0]}" y2="${p[1]}" stroke="#dce5da"/><text x="${l[0]}" y="${l[1]}" text-anchor="middle" font-family="Arial" font-size="16"><tspan x="${l[0]}">${esc(words.slice(0,half).join(' '))}</tspan><tspan x="${l[0]}" dy="17">${esc(words.slice(half).join(' '))}</tspan></text>`;});
 ['interview'].forEach((key,k)=>{if(!visible[k])return;const color='#1a237e',values=rows.map(r=>r[key]);values.forEach((v,i)=>{if(v===null)return;const p=pos(i,v),j=(i+1)%n;if(values[j]!==null){const q=pos(j,values[j]);s+=`<line x1="${p[0]}" y1="${p[1]}" x2="${q[0]}" y2="${q[1]}" stroke="${color}" stroke-width="3"/>`;}s+=`<circle cx="${p[0]}" cy="${p[1]}" r="5" fill="${color}"><title>${esc(rows[i].name)}: ${v}</title></circle>`;});});
 return s+'<text x="400" y="558" text-anchor="middle" font-family="Arial" font-size="13" fill="#1a237e">Radar Discovery — evidências relatadas</text><text x="400" y="580" text-anchor="middle" font-family="Arial" font-size="12">Baseado na entrevista Discovery · escala descritiva 0–100</text></svg>';
}
export function integratedTable(rows,interactive=false){return `<div class="tablewrap"><table><thead><tr><th>Habilidade relatada</th><th>Média (0–100)</th><th>Classificadas / total</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${interactive?`<button data-action="dr-domain" data-value="${r.domain}">${esc(r.name)}</button>`:esc(r.name)}</td><td>${r.interview===null?'Dados insuficientes':r.interview.toLocaleString('pt-BR')}</td><td>${r.count}/${r.total}</td></tr>`).join('')}</tbody></table></div>`;}
