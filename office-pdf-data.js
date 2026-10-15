import {MODALITIES,QUESTIONS} from './office-protocol.js';
export const folderName=value=>({RECEBIDOS:'Lista inicial',FINANCEIRO:'Financeiro','OPERAÇÕES':'Operações',RH:'RH',VERIFICAR:'Verificar',LISTA:'Lista'}[value]||value||'—');
export const conditionName=value=>({pending:'Pendente',observed:'Observada',refused:'Recusa',interrupted:'Interrupção',barrier:'Barreira impeditiva'}[value]||value);
export const autonomyName=value=>({unknown:'Não informada',independent:'Independente',assisted:'Com ajuda'}[value]||value);
export function snapshotDecision(stage,snapshot,id){
 if(!snapshot)return 'Não registrada';const r=snapshot.response;
 if([1,4].includes(stage))return folderName(r.placements[id]);
 if(stage===2)return `Posição ${r.order.indexOf(id)+1}`;
 if(stage===3)return r.urgent.includes(id)?'Urgente':'Não marcado';
 return '—';
}
export function eventRow(e){
 const action={'stage-start':'Início da etapa',move:'Movimentação',reorder:'Reordenação',urgent:'Marcação de urgência',text:'Edição da mensagem',answer:'Resposta à pergunta','release-instruction':'Início da tarefa',first:'Primeira entrega',complete:'Conclusão da etapa','activity-complete':'Conclusão do Office',help:'Solicitação de ajuda',pause:'Pausa',resume:'Retomada'}[e.action]||e.action;
 let details='';
 if(e.action==='move')details=`${folderName(e.origin)} (posição ${e.fromPosition+1}) → ${folderName(e.destination)} (posição ${e.toPosition+1})`;
 else if(e.action==='reorder')details=`Posição ${e.fromPosition+1} → ${e.toPosition+1}\nAntes: ${e.before.join(', ')}\nDepois: ${e.after.join(', ')}`;
 else if(e.action==='urgent')details=`${e.before?'Marcado':'Desmarcado'} → ${e.after?'Marcado':'Desmarcado'}`;
 else if(e.action==='text')details=`Antes: ${e.before||'(em branco)'}\nDepois: ${e.after||'(em branco)'}`;
 else if(e.action==='answer')details=`${QUESTIONS[e.question]?.text||e.question}\nAntes (${MODALITIES[e.before.mode]}): ${e.before.text||'(em branco)'}\nDepois (${MODALITIES[e.after.mode]}): ${e.after.text||'(em branco)'}`;
 else if(e.action==='stage-start')details=`Ordem inicial: ${e.after.order.join(', ')||'Mensagem escrita'}. ${Object.keys(e.after.placements).length?'Todos na lista inicial.':''}`;
 else if(['first','complete'].includes(e.action))details=`Entrega preservada na tabela da etapa ${e.stage}.`;
 else if(e.reason)details={participant:'Solicitada durante a aplicação',exit:'Saída da atividade',reload:'Recarregamento da página',pagehide:'Saída da página',import:'Importação do arquivo'}[e.reason]||e.reason;
 return [String(e.sequence),e.at.replace('T','\n'),`${e.stage}${e.document?' · '+e.document:''}`,action+(details?'\n'+details:'')];
}
