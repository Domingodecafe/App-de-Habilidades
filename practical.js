export function autoSuggestion(op,s,d){
  if(s.id==='A1')return s.items.filter(x=>x.sector===op.id.slice(3)).every(x=>d[x.id]===x.sector);
  if(s.type==='order'&&op.id.startsWith('A2-')){const g=s.groups.find(g=>g.name===op.id.slice(3));return JSON.stringify(d[g.name])===JSON.stringify(g.expected);}
  if(s.id==='A3')return d[op.id.slice(3)]===true;
  if(s.id==='A4')return d[op.id.slice(3)]==='VERIFICAR';
  if(s.id==='B2'){const id=op.id.slice(3),row=d[id],expected=s.expected[id];if(!row)return false;if(id==='P101')return row.product===id&&Number(row.quantity)===3&&row.decision==='SEPARAR';return row.product===id&&Number(row.quantity)===0&&row.decision===expected.decision&&row.reason===expected.reason;}
  if(s.rows){const row=s.rows.find(x=>x.id===op.id);return row?d[row.id]===row.expected:null;}
  if(s.id==='E2')return s.groups.every(g=>JSON.stringify(d[g.name])===JSON.stringify(g.expected));
  return null;
}
export function validatePractical(assessment,games,matrix){
  const stages=games.flatMap(g=>g.stages),keys=new Set([...stages.map(s=>s.id),...matrix.map(m=>m.id)]);
  for(const record of Object.values(assessment.integrated?.records||{}))for(const id of record.evidenceIds||[])if(!matrix.some(m=>m.id===id))throw Error('Evidência Discovery RFT desconhecida.');
  for(const record of Object.values(assessment.interview))for(const id of record.evidenceIds||[])if(!matrix.some(m=>m.id===id))throw Error('Evidência vinculada desconhecida.');
  for(const [id,record] of Object.entries(assessment.practical))if(!keys.has(id))throw Error('Oportunidade prática desconhecida.');
  for(const s of stages){const r=assessment.practical[s.id];if(!r)continue;if(!r.draft||typeof r.draft!=='object'||!Array.isArray(r.actions)||!r.conditions||['help','access','notes'].some(k=>typeof r.conditions[k]!=='string'))throw Error('Dados da etapa inválidos.');for(const d of [r.draft,r.first?.draft].filter(Boolean)){if(s.type==='order')for(const g of s.groups)if(!Array.isArray(d[g.name])||d[g.name].length!==g.ids.length||new Set(d[g.name]).size!==g.ids.length||d[g.name].some(id=>!g.ids.includes(id)))throw Error('Ordenação inválida.');if(s.type==='stock')for(const item of s.order)if(!d[item.id]||typeof d[item.id]!=='object'||!['string','number'].includes(typeof d[item.id].quantity)||['product','decision','reason'].some(k=>typeof d[item.id][k]!=='string'))throw Error('Pedido inválido.');}if(r.first&&(!r.first.draft||!Array.isArray(r.first.actions)||!r.first.conditions||typeof r.first.at!=='string'))throw Error('Primeira tentativa inválida.');}
  return assessment;
}
