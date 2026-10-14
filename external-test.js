import {escapeHTML as esc} from './core.js';
import {blankRecord} from './integrated.js';
import {createOffice,applyOffice} from './office.js';
import {officeView} from './office-view.js';
export function externalTestView(a,qs,docs,status=''){
  a.external ||= {version:1,phase:'welcome',questionIndex:0};const flow=a.external;
  if(flow.phase==='office')return officeView(a,docs,status);
  const header='<div class="external-brand"><img src="assets/lado-a-logo.svg" alt="LADO A"><span>LADO A | Employability<br><small>Primeiro teste externo</small></span></div>';
  let body;
  if(flow.phase==='welcome')body=`<h1>Conhecer suas experiências</h1><p>Você responderá à entrevista Discovery e realizará uma atividade de organização de documentos. Pode pedir ajuda e fazer pausas.</p><p>As respostas ficam neste dispositivo. Ao terminar, baixe o PDF com as respostas e o radar e envie manualmente pelo WhatsApp à pessoa que encaminhou este link. As notas dependem de revisão do avaliador.</p><label class="field">Nome ou código de identificação<input data-external-field="code" value="${esc(a.identity.code)}" autocomplete="off"></label><label class="field">Forma de comunicação preferida<input data-external-field="communication" value="${esc(a.identity.communication)}"></label><label class="check"><input type="checkbox" data-external-field="agreement" ${a.identity.agreement?'checked':''}>Entendi a atividade e concordo em participar e compartilhar o PDF manualmente.</label><button class="primary" data-external-action="start">Iniciar entrevista →</button>`;
  else if(flow.phase==='discovery'){
    const q=qs[flow.questionIndex],r=a.integrated.records[q.id]||blankRecord();
    body=`<span class="badge">Discovery · pergunta ${flow.questionIndex+1} de ${qs.length}</span><progress max="${qs.length}" value="${flow.questionIndex}"></progress><h1>${esc(q.text)}</h1>${q.follow?`<p>${esc(q.follow)}</p>`:''}<label class="field">Sua resposta<textarea data-external-answer rows="6">${esc(r.answer)}</textarea></label><p class="muted">Você pode deixar uma pergunta sem resposta. As respostas anteriores podem ser revisadas usando “Anterior”.</p><div class="actions"><button data-external-action="previous" ${flow.questionIndex===0?'disabled':''}>← Anterior</button><button class="primary" data-external-action="next">${flow.questionIndex===qs.length-1?'Continuar para o Office →':'Próxima →'}</button></div>`;
  }else if(flow.phase==='done')body=`<span class="badge">Atividade concluída</span><h1>Suas respostas foram registradas</h1><p>Baixe o PDF e confira o arquivo na pasta de downloads ou na visualização de arquivos do seu dispositivo. Depois, envie-o manualmente pelo WhatsApp.</p><p>O PDF inclui o radar. Se ainda não houve revisão do avaliador, os eixos estarão identificados como dados insuficientes.</p><button class="primary" data-external-action="pdf">Baixar PDF com respostas e radar</button><p id="external-pdf-status" role="status"></p>`;
  else body=`<h1>Escritório Digital</h1><p>A próxima atividade tem cinco etapas. Leia as instruções, organize os documentos e registre suas respostas. Você pode pausar e retomar.</p><button class="primary" data-external-action="office">${a.office?'Retomar':'Iniciar'} Escritório Digital →</button>`;
  return `<main class="external-test">${header}<section class="card">${body}</section><p id="save-status" class="status" role="status">${esc(status||'Salvamento neste dispositivo')}</p><p class="muted">LADO A · Teste de experiência de uso · ${esc(a.identity.code)}</p></main>`;
}
export function bindExternalTest(root,{getAssessment,getQuestions,isActive,save,render,onPDF,notify}){
  root.addEventListener('input',e=>{
    if(!isActive())return;const a=getAssessment(),el=e.target;
    if(el.dataset.externalField){a.identity[el.dataset.externalField]=el.type==='checkbox'?el.checked:el.value;save();}
    if(el.hasAttribute('data-external-answer')){const q=getQuestions()[a.external.questionIndex],r=a.integrated.records[q.id] ||= blankRecord();r.answer=el.value;r.score=null;save();}
  });
  root.addEventListener('click',e=>{
    if(!isActive())return;const el=e.target.closest('[data-external-action]');if(!el)return;const a=getAssessment(),flow=a.external,action=el.dataset.externalAction;
    if(action==='pdf'){onPDF();return;}
    if(action==='start'){if(!a.identity.code.trim()||!a.identity.agreement){notify('Preencha sua identificação e confirme sua participação para iniciar.');return;}flow.phase='discovery';}
    if(action==='previous')flow.questionIndex=Math.max(0,flow.questionIndex-1);
    if(action==='next'){if(flow.questionIndex===getQuestions().length-1)flow.phase='office-ready';else flow.questionIndex++;}
    if(action==='office'){a.office ||=createOffice(a.id);if(a.office.status==='paused')applyOffice(a.office,'resume');flow.phase=a.office.status==='completed'?'done':'office';}
    save();render();scrollTo(0,0);
  });
}
