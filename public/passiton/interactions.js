// Motion acknowledges a real state change; it never delays the underlying task.
const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
let busy=false,trigger=null,disabled=new Map();
const controls='button,select,textarea,input';
const readOnly=el=>el.matches('#appearance,#openSource,#closeSource,#closeShare,#cancelVoice,#viewCoverage,[data-action="source"],[data-action="share"],[data-action="downloadAnswer"],[data-action="export"]');
export function syncBusyControls(){
  if(!busy)return;
  document.querySelectorAll(controls).forEach(el=>{
    if(readOnly(el))return;
    if(!disabled.has(el))disabled.set(el,el.disabled);
    el.disabled=true;
    if(trigger&&(trigger.id?el.id===trigger.id:el.dataset.action===trigger.action))el.classList.add('is-working');
  });
}
export function setInteractionBusy(value){
  busy=value;
  if(value){const el=document.activeElement;trigger=el?.tagName==='BUTTON'?{id:el.id,action:el.dataset.action}:null;syncBusyControls();}
  else{for(const [el,wasDisabled] of disabled){el.disabled=wasDisabled;el.classList.remove('is-working');}disabled.clear();trigger=null;}
  document.getElementById('workspace').setAttribute('aria-busy',String(value));
  document.getElementById('stepNotice').classList.toggle('is-pending',value);
}
export function animateChange(node,kind='content',direction=1){
  if(!node?.animate||reduced())return;
  node.getAnimations().forEach(a=>a.cancel());
  const frames=kind==='view'?[{opacity:.65,transform:`translateX(${direction*12}px)`},{opacity:1,transform:'translateX(0)'}]:[{opacity:.55},{opacity:1}];
  node.animate(frames,{duration:kind==='view'?220:160,easing:'cubic-bezier(.16,1,.3,1)'});
}
export function updateNavigation(){
  const nav=document.querySelector('nav'),active=nav?.querySelector('[aria-current="page"]');
  if(!active)return;
  nav.style.setProperty('--nav-x',`${active.offsetLeft}px`);
  nav.style.setProperty('--nav-width',active.offsetWidth);
}
export function captureFocus(){
  const el=document.activeElement;
  if(!el?.closest('#workspace'))return null;
  return {id:el.id,action:el.dataset.action,question:el.dataset.question,start:el.selectionStart,end:el.selectionEnd};
}
export function restoreFocus(saved){
  if(!saved)return;
  const candidates=Array.from(document.querySelectorAll('#workspace button,#workspace textarea,#workspace input,#workspace select'));
  const next=candidates.find(el=>saved.id?el.id===saved.id:saved.action?el.dataset.action===saved.action:saved.question&&el.dataset.question===saved.question);
  if(!next){if(saved.action){const heading=document.querySelector('#interaction h3');if(heading){heading.tabIndex=-1;heading.focus({preventScroll:true});}}return;}
  if(next.disabled)return;
  next.focus({preventScroll:true});
  if(typeof saved.start==='number'&&next.setSelectionRange)next.setSelectionRange(saved.start,saved.end);
}
window.addEventListener('resize',updateNavigation);
document.addEventListener('toggle',e=>{
  if(e.target.matches('details[open]'))Array.from(e.target.children).filter(n=>n.tagName!=='SUMMARY').forEach(n=>animateChange(n));
},true);
document.addEventListener('visibilitychange',()=>document.body.classList.toggle('motion-paused',document.hidden));
