// Per-tab UI position only. Assessment responses remain in the existing autosave.
const KEY='lado-a-view-v1';
export function reloadView(){
 if(performance.getEntriesByType('navigation')[0]?.type!=='reload')return null;
 try{const value=JSON.parse(sessionStorage.getItem(KEY));return value?.view&&Number.isFinite(value.y)?value:null;}catch{return null;}
}
export function manageView(root,getView,initial){
 history.scrollRestoration='manual';
 let previous=null,pending=null,restoring=false,frame=0;
 const key=()=>JSON.stringify(getView());
 function focusState(){const e=document.activeElement;if(!root.contains(e))return null;const field=e.dataset.field,ir=e.dataset.ir,k=e.dataset.key;if(!field&&!ir)return null;return {field,ir,k,start:e.selectionStart,end:e.selectionEnd};}
 function capture(){return {view:getView(),y:scrollY,focus:focusState(),open:[...root.querySelectorAll('details')].map((d,i)=>d.open?i:-1).filter(i=>i>=0)};}
 function remember(){if(restoring)return;try{sessionStorage.setItem(KEY,JSON.stringify(capture()));}catch{/* UI restoration is optional when storage is unavailable. */}}
 function autosize(){root.querySelectorAll('textarea').forEach(e=>{e.style.height='auto';e.style.height=Math.max(e.scrollHeight,parseFloat(getComputedStyle(e).minHeight)||0)+'px';});}
 function restore(s){
  if(s){root.querySelectorAll('details').forEach((d,i)=>d.open=s.open?.includes(i)||false);}
  autosize();
  if(s?.focus){const f=s.focus,e=[...root.querySelectorAll('input,select,textarea')].find(e=>f.field?e.dataset.field===f.field:e.dataset.ir===f.ir&&e.dataset.key===f.k);if(e&&!e.closest('[hidden]')){e.focus({preventScroll:true});if(Number.isInteger(f.start)&&typeof e.setSelectionRange==='function'){try{e.setSelectionRange(f.start,f.end);}catch{}}}}
  window.scrollTo({top:s?.y||0,left:0,behavior:'instant'});restoring=false;remember();
 }
 const api={
  before(){cancelAnimationFrame(frame);pending=previous===key()?capture():null;},
  after(){const current=key(),first=previous===null;restoring=true;const snapshot=first&&initial&&JSON.stringify(initial.view)===current?initial:pending;previous=current;autosize();frame=requestAnimationFrame(()=>restore(snapshot));},
 };
 addEventListener('scroll',remember,{passive:true});addEventListener('pagehide',remember);addEventListener('beforeunload',remember);
 root.addEventListener('input',()=>{autosize();remember();});root.addEventListener('focusin',remember);root.addEventListener('keyup',remember);root.addEventListener('toggle',remember,true);
 return api;
}
