// Kept independent of views and assessment creation to avoid circular imports.
export const discoveryFingerprint = r => JSON.stringify([r.answer,r.score,r.reason,r.help,r.access,r.independence,r.notes]);
export function discoveryDecided(a,id){
  const r=a.integrated?.records[id],review=a.assisted?.discoveryReviews[id];
  if(!r||!review||review.fingerprint!==discoveryFingerprint(r))return false;
  if(review.decision==='notObserved')return r.score===null&&!!r.reason.trim();
  return review.decision==='classified'&&[0,1,2].includes(r.score)&&!!r.answer.trim()&&(r.independence!=='assisted'||!!r.help.trim());
}
