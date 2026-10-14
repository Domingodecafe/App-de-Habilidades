export const MATRIX_VERSION='office-matrix-1';
export const QUESTIONS={
  instructionOrder:{stage:2,when:'before',text:'Explique o que você vai fazer e qual regra vai usar.'},
  checkOrder:{stage:2,when:'after',text:'Como você conferiu a ordem? Mostre uma comparação entre documentos que usou nessa conferência.'},
  checkUrgency:{stage:3,when:'after',text:'Como você conferiu as marcações? Mostre um documento e explique como comparou o prazo com a regra.'},
  instructionRule:{stage:4,when:'before',text:'Explique o que a nova orientação pede e o que acontece quando um documento pendente também é urgente.'}
};
export const MODALITIES={written:'Escrita',oral:'Fala registrada pelo avaliador',alternative:'Comunicação alternativa registrada pelo avaliador'};
export function stageQuestions(stage){return Object.entries(QUESTIONS).filter(([,q])=>q.stage===stage);}
export const OPPORTUNITIES=[
  {id:'understand-order',domain:0,stage:2,question:'instructionOrder',name:'Compreensão da ordenação',components:['Identifica a ação de ordenar os documentos.','Explica a ordem do prazo mais próximo ao mais distante.']},
  {id:'understand-rule',domain:0,stage:4,question:'instructionRule',name:'Compreensão da nova regra',components:['Identifica o encaminhamento dos pendentes para VERIFICAR.','Explica que a regra prevalece sobre a urgência.']},
  {id:'sequence',domain:1,stage:2,type:'order',name:'Ordenação por prazo',criterion:'Posições cronológicas corretas dos 12 cartões; aceita qualquer ordem entre cartões com a mesma data.'},
  {id:'urgency',domain:2,stage:3,type:'urgent',name:'Identificação de urgências',criterion:'Seis urgentes marcados e seis não urgentes desmarcados. Prazo até 17/06/2027, inclusive. Entrega sem marcações recebe 0.'},
  {id:'update-rule',domain:2,stage:4,type:'rule',name:'Mudança de regra e classificação por setor',criterion:'D04 e D11 em VERIFICAR; demais documentos nos setores originais. Combina atualização da regra e classificação por setor. Recebidos conta como omissão.'},
  {id:'check-order',domain:3,stage:2,question:'checkOrder',name:'Conferência da ordenação',components:['Explica um critério pertinente de conferência.','Apresenta comparação concreta, verificável e compatível com o próprio resultado.']},
  {id:'check-urgency',domain:3,stage:3,question:'checkUrgency',name:'Conferência das urgências',components:['Explica o limite de urgência usado na conferência.','Apresenta comparação concreta e correta com um documento do próprio resultado.']},
  {id:'communication',domain:4,stage:5,type:'message',name:'Comunicação final',components:['Identifica fielmente os documentos encaminhados para VERIFICAR.','Explica a decisão de modo compreensível. A decisão administrativa pode estar incorreta.']}
];
