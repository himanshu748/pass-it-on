import {setInteractionBusy,animateChange} from './interactions.js';
import {state,current,recordKey,save,api,$,notice,storageNotice,esc,COLLECTION,API_PREFIX} from './state.js';
import {render,renderStatus,renderCoverage,renderIntegrations} from './views.js';
import {sectionTitle} from './labels.js';
import {questionLink,entryFromLink,answerHandout} from './sharing.js';
let recorder,stream,recordTimer,recordingKey;
const sample={
 provisional:{wrong:'Students must wait for their final results before applying. The final results deadline is 15 October 2026.',correct:'Students awaiting final results can apply with their latest available marksheet. They must upload their final results by 30 September 2026.'},
 documents:{wrong:'You only need a bank statement and your identity card. There is no study statement requirement.',correct:'The demo checklist requires a latest available marksheet, an admission offer, and a one-page statement of study plans. Do not upload identity documents, bank details, or personal records to this demonstration.'},
 submission:{wrong:'Email the application after 30 September and pay the application fee to reserve your place.',correct:'In this fictional example, submit the application and study statement together through the grant portal by 15 September 2026. There is no application fee, and no real grant portal exists for this demo.'}
};
function setBusy(value){state.busy=value;setInteractionBusy(value);}
async function task(fn,label){if(state.busy||state.recording)return;setBusy(true);notice(label||'Working…');let failed=false;try{await fn();}catch(err){failed=true;notice(err.message,true);}finally{setBusy(false);save();renderIntegrations();if(!failed){const n=$('stepNotice'),msg=label||'Working…';if(!n.hidden&&!n.classList.contains('error'))notice(n.textContent===msg?'':n.textContent,false,true);animateChange(n);const result=$('interaction').querySelector('.feedback');if(result)animateChange(result);}}}
function syncLocation(){const url=new URL(questionLink(location.origin,state.questionId,state.language,COLLECTION));url.searchParams.set('view',state.mode);history.replaceState(null,'',url);}
function setMode(mode){if(state.busy||state.recording)return;state.mode=mode;syncLocation();save();notice('');render();}
function edit(text){const r=current();if(text!==r.text){r.text=text;delete r.result;delete r.checkToken;delete r.review;delete r.reviewToken;delete r.payment;r.history||=[];save();}}
async function loadShared(){const key=recordKey();state.sharedLoading=true;state.sharedError=false;if(state.mode==='ask')render();try{const d=await api(`/knowledge/${state.questionId}/${state.language}`);if(recordKey()===key){state.shared=d.answers;renderStatus();}}catch{if(recordKey()===key){state.shared=[];state.sharedError=true;renderStatus();}}finally{if(recordKey()===key){state.sharedLoading=false;if(state.mode==='ask')render();}}}
async function selectQuestion(id,lang){if(state.busy||state.recording)return;const q=state.catalog.questions.find(q=>q.id===id);if(!q)return;state.questionId=id;state.language=lang||q.language;state.shared=[];syncLocation();save();notice('');render();loadShared();}
async function refreshCoverage(){state.coverage=await api('/coverage');if(state.coverage.source==='snowflake')state.providers.snowflake='live';renderCoverage();renderIntegrations();}
async function syncKnowledge(){
  const catalog=await api('/catalog');state.catalog=catalog;
  if(catalog.integrations.snowflake==='not configured')throw new Error('Snowflake is not connected yet. Your local activity is preserved.');
  const tasks=Object.entries(state.requests).filter(([,value])=>value).map(([key])=>{const [questionId,language]=key.split(':');return ['/question',{questionId,language}];});
  for(const r of Object.values(state.records))if(r.reviewToken)tasks.push(['/review/sync',{reviewToken:r.reviewToken}]);
  if(!tasks.length){await refreshCoverage();notice('There is no local request or approved answer to sync yet.');return;}
  let saved=0;for(const [path,body] of tasks){const d=await api(path,body);if(!d.storage?.saved)throw new Error(`${saved} records synced. ${storageNotice(d.storage)}`);saved++;}
  await refreshCoverage();await loadShared();notice(`${saved} records synced to Snowflake. Repeating sync will not add duplicate requests or approvals.`);
}
async function requestQuestion(){const d=await api('/question',{questionId:state.questionId,language:state.language});state.requests[recordKey()]=true;save();await refreshCoverage();notice('Request recorded. '+storageNotice(d.storage));}
async function checkContribution(){const r=current();r.text=$('contributionText')?.value||r.text;if(r.text.trim().length<8)throw new Error('Share a complete sentence before checking it.');save();notice('Gemini is comparing your contribution with the source…');
  const d=await api('/check',{questionId:state.questionId,language:state.language,text:r.text});r.result=d.result;r.checkToken=d.checkToken;r.id=d.id;r.history||=[];r.history.push({text:r.text,status:d.result.status,issues:d.result.issues});r.history=r.history.slice(-8);delete r.review;delete r.reviewToken;delete r.payment;state.providers.gemini='live';save();render();notice((d.result.status==='ready'?'Source check complete. A person must now review the answer. ':'A correction is needed before review. ')+storageNotice(d.storage));}
async function play(kind,token,target,extra={}){const d=await api('/speak',{kind,token,...extra});state.providers.elevenlabs=d.source==='elevenlabs'?'live':'unavailable';const node=$(target);if(d.source!=='elevenlabs'||!d.url){if(node)node.textContent=d.reason||'Audio is unavailable. The text remains readable.';notice('Audio is unavailable. Your text remains readable.',true);return;}
  if(!/^data:audio\/mpeg;base64,[A-Za-z0-9+/=]+$/.test(d.url))throw new Error('The audio response was invalid.');
  if(node){const audio=document.createElement('audio');audio.controls=true;audio.src=d.url;audio.setAttribute('aria-label','ElevenLabs spoken guidance');node.replaceChildren(audio);notice('Spoken guidance is ready.');try{await audio.play();}catch{notice('Audio is ready. Press play to listen.');}}return d;
}
async function ask(){const r=current();r.studentQuestion=$('studentQuestion').value;const d=await api('/ask',{questionId:state.questionId,language:state.language,question:r.studentQuestion});r.draft=d.result;r.answerToken=d.answerToken;state.providers.gemini='live';state.requests[recordKey()]=true;save();render();await refreshCoverage();notice('Source-linked draft generated. This answer has not been reviewed by a person. '+storageNotice(d.storage));}
async function approve(){const r=current();const d=await api('/review',{checkToken:r.checkToken,confirmedSource:$('confirmedSource')?.checked===true,confirmedDemo:$('confirmedDemo')?.checked===true});r.review=d.review;r.reviewToken=d.reviewToken;save();render();await refreshCoverage();notice('Contribution approved in the demo reviewer role. '+storageNotice(d.storage));}
function sharedAnswer(){return state.shared[0]?.answer||state.catalog.starters?.[state.questionId]?.[state.language];}
async function copyQuestionLink(){
  const url=questionLink(location.origin,state.questionId,state.language,COLLECTION);
  try{await navigator.clipboard.writeText(url);notice('Link copied. It opens this question and language, with the latest shared answer.');}
  catch{$('shareURL').value=url;$('shareDialog').showModal();$('shareURL').select();}
}
function downloadAnswer(){
  const answer=sharedAnswer();if(!answer)throw new Error('Load an answer before downloading it.');
  const content=answerHandout({question:state.catalog.questions.find(q=>q.id===state.questionId),language:state.language,languageName:state.catalog.languages[state.language],answer,source:state.catalog.source,sourceVersion:state.catalog.sourceVersion,url:questionLink(location.origin,state.questionId,state.language,COLLECTION)});
  const url=URL.createObjectURL(new Blob(['\uFEFF',content],{type:'text/plain;charset=utf-8'}));
  const a=document.createElement('a');a.href=url;a.download=`pass-it-on-${state.questionId}-${state.language}.txt`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);notice('Answer saved with its source, review status and a link back. The downloaded copy does not update.');
}
function exportRecord(){const r=current();const data={product:'Pass It On',fictional:state.catalog.source.fictional,network:'devnet',question:state.catalog.questions.find(q=>q.id===state.questionId),language:state.language,source:state.catalog.source,sourceVersion:state.catalog.sourceVersion,contribution:r.text,checks:r.history,assessment:r.result,review:r.review,payment:r.payment||null,limits:'Demo reviewer role, not independently authenticated. Exact source excerpts are checked by code; semantic correctness requires human review. Test SOL has no monetary value.'};const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=`passiton-${state.questionId}-${state.language}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);notice('Evidence exported with source, review, and payment state.');}
const rpc=async(method,params)=>{const r=await fetch('/api/rpc',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({method,params})});const d=await r.json();if(d.error)throw new Error(d.error.message||d.error);return d.result;};
async function verifyPending(){const r=current();if(!r.pending)throw new Error('No pending payment to verify.');const d=await api('/payment/verify',{signature:r.pending.signature,intentToken:r.pending.intentToken});r.payment=d.payment;delete r.pending;state.providers.solana='live · finalized';save();render();notice('Finalized devnet payment verified against this contribution’s memo. '+storageNotice(d.storage));}
async function pay(){const r=current();if(r.pending)throw new Error('Verify the pending payment first.');if(!$('fundConsent')?.checked)throw new Error('Confirm that you will use devnet test SOL.');const wallet=window.phantom?.solana||window.solana;if(!wallet?.isPhantom)throw new Error('Open this app in a browser with Phantom to sign the devnet bounty. You can review and export the contribution without a wallet.');
  await wallet.connect();const d=await api('/payment/prepare',{reviewToken:r.reviewToken,payer:wallet.publicKey.toBase58()});if(d.alreadyPaid){r.payment=d.payment;save();render();notice('A finalized payment already exists for this contribution. No new payment was sent.');return;}
  const {Transaction,SystemProgram,PublicKey,TransactionInstruction}=window.solanaWeb3,i=d.intent;
  const tx=new Transaction({feePayer:wallet.publicKey,recentBlockhash:i.blockhash}).add(SystemProgram.transfer({fromPubkey:wallet.publicKey,toPubkey:new PublicKey(i.recipient),lamports:i.lamports}),new TransactionInstruction({keys:[{pubkey:wallet.publicKey,isSigner:true,isWritable:false}],programId:new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'),data:new TextEncoder().encode(i.memo)}));
  const signed=await wallet.signTransaction(tx);const encoded=btoa(String.fromCharCode(...signed.serialize()));
  // Persist the signature before submission so an uncertain HTTP response cannot invite a second payment.
  const signature=encode58(signed.signature);r.pending={signature,intentToken:d.intentToken};save();
  await rpc('sendTransaction',[encoded,{encoding:'base64',preflightCommitment:'confirmed',maxRetries:3}]);render();notice('Submitted to devnet. Waiting for finalization; no further payment will be sent.');
  for(let j=0;j<12;j++){await new Promise(resolve=>setTimeout(resolve,2000));const s=(await rpc('getSignatureStatuses',[[signature],{searchTransactionHistory:true}])).value[0];if(s?.err)throw new Error('The transaction failed. The submission remains recorded for inspection; do not retry blindly.');if(s?.confirmationStatus==='finalized'){await verifyPending();return;}}
  notice('Still pending. Use Verify finalization after a short wait; do not send another payment.');
}
function encode58(bytes){const alphabet='123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';let n=0n;for(const b of bytes)n=n*256n+BigInt(b);let out='';while(n){out=alphabet[Number(n%58n)]+out;n/=58n;}for(const b of bytes){if(b)break;out='1'+out;}return out;}
async function beginInterview(){if(!$('voiceConsent').checked)return;$('voiceDialog').close();await task(async()=>{await play('opening',null,'interviewAudio',{questionId:state.questionId,language:state.language});const r=current();r.voiceConsent=true;save();const area=$('interviewAudio');if(area){const b=document.createElement('button');b.className='button secondary-button';b.textContent='Record my response';b.dataset.action='record';area.appendChild(b);}notice('Listen to the question, then choose Record my response.');},'Preparing the spoken interview…');}
async function startRecording(){if(!current().voiceConsent){$('voiceDialog').showModal();return;}if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder)throw new Error('This browser cannot record audio. Type your contribution instead.');
  try{stream=await navigator.mediaDevices.getUserMedia({audio:true});}catch{throw new Error('Microphone access was not granted. You can type your contribution.');}
  document.querySelectorAll('audio').forEach(a=>a.pause());const type=['audio/webm;codecs=opus','audio/mp4','audio/webm'].find(t=>MediaRecorder.isTypeSupported(t));
  try{recorder=new MediaRecorder(stream,type?{mimeType:type}:undefined);}catch(err){stream.getTracks().forEach(t=>t.stop());throw err;}
  const chunks=[];recordingKey=recordKey();state.recording=true;setBusy(true);state.busy=false;const area=$('interviewAudio');area.innerHTML='<p class="recording-note">Recording · Maximum 45 seconds. Stop when you’re ready.</p><button class="button recording" data-action="stopRecord">Stop & check response</button>';notice('Microphone recording. Stop & check response sends it to ElevenLabs and Gemini.');
  recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
  recorder.onerror=()=>{clearTimeout(recordTimer);stream?.getTracks().forEach(t=>t.stop());state.recording=false;setBusy(false);notice('Recording failed. You can type your contribution.',true);};
  recorder.onstop=async()=>{clearTimeout(recordTimer);stream?.getTracks().forEach(t=>t.stop());state.recording=false;setBusy(false);const blob=new Blob(chunks,{type:recorder.mimeType||type||'audio/webm'});await task(async()=>{if(recordKey()!==recordingKey)throw new Error('The selected question changed. Please record again.');if(blob.size>2_000_000)throw new Error('The recording is too large. Try a shorter response.');notice('ElevenLabs is transcribing your response…');const d=await api('/transcribe',blob,blob.type);state.providers.transcription='live';edit(d.text);render();await checkContribution();await play('check',current().checkToken,'feedbackAudio');},'Checking your spoken contribution…');};
  recorder.start();recordTimer=setTimeout(()=>{if(recorder?.state==='recording')recorder.stop();},45000);
}
const handlers={
 share:copyQuestionLink,downloadAnswer:()=>{try{downloadAnswer();}catch(e){notice(e.message,true);}},
 check:()=>task(checkContribution,'Checking contribution…'),ask:()=>task(ask,'Reading the source…'),request:()=>task(requestQuestion,'Recording the knowledge gap…'),approve:()=>task(approve,'Recording your review…'),pay:()=>task(pay,'Preparing a devnet bounty…'),verifyPayment:()=>task(verifyPending,'Checking finalized payment…'),
 listenStarter:()=>task(()=>play('guide',null,'answerAudio',{questionId:state.questionId,language:state.language}),'Preparing spoken guidance...'),
 listenFollowup:()=>task(()=>play('check',current().checkToken,'feedbackAudio'),'Creating spoken follow-up…'),listenDraft:()=>task(()=>play('draft',current().answerToken,'draftAudio'),'Creating spoken draft…'),listenReviewed:()=>task(async()=>{await loadShared();const shared=state.shared[0];await play(shared?'reading':'review',shared?.readingToken||current().reviewToken,'answerAudio');},'Creating spoken answer…'),
 goAsk:()=>{setMode('ask');loadShared();},goContribute:()=>setMode('contribute'),goReview:()=>setMode('review'),goFund:()=>setMode('fund'),source:()=>$('sourceDialog').showModal(),export:exportRecord,
 sampleWrong:()=>{edit((state.catalog.questions.find(q=>q.id===state.questionId)?.examples||sample[state.questionId]).wrong);render();notice('Loaded an intentionally incorrect example. Check it to see the correction loop.');},sampleCorrect:()=>{edit((state.catalog.questions.find(q=>q.id===state.questionId)?.examples||sample[state.questionId]).correct);render();notice('Loaded a corrected example. Run the source check before review.');},
 voice:()=>{if(!state.catalog.integrations.transcription.startsWith('configured')){notice('Transcription is not configured yet. You can type your contribution.',true);return;}$('voiceConsent').checked=!!current().voiceConsent;$('beginVoice').disabled=!$('voiceConsent').checked;$('voiceDialog').showModal();},record:()=>startRecording().catch(e=>notice(e.message,true)),stopRecord:()=>{if(recorder?.state==='recording')recorder.stop();}
};
document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.action==='stopRecord'){handlers.stopRecord();return;}if((state.busy||state.recording)&&!['source','share','downloadAnswer','export'].includes(b.dataset.action))return;if(b.dataset.mode){setMode(b.dataset.mode);if(b.dataset.mode==='ask')loadShared();}else if(b.dataset.question){selectQuestion(b.dataset.question,b.dataset.language);if(b.closest('table'))$('workspace').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}else if(b.dataset.action)handlers[b.dataset.action]?.();});
document.addEventListener('input',e=>{if(e.target.id==='studentQuestion'){current().studentQuestion=e.target.value;save();}if(e.target.id==='contributionText'){edit(e.target.value);$('answerStatus').textContent='Draft edited · Check again';const feedback=$('interaction').querySelector('.feedback');if(feedback)feedback.remove();}if(['confirmedSource','confirmedDemo'].includes(e.target.id)){const b=document.querySelector('[data-action="approve"]');if(b)b.disabled=!$('confirmedSource')?.checked||!$('confirmedDemo')?.checked;}if(e.target.id==='fundConsent'){const b=document.querySelector('[data-action="pay"]');if(b)b.disabled=!e.target.checked;}if(e.target.id==='voiceConsent')$('beginVoice').disabled=!e.target.checked;});
$('collection').value=COLLECTION;
$('collection').onchange=()=>{if(state.busy||state.recording){$('collection').value=COLLECTION;return;}location.href=`/app?collection=${$('collection').value}`;};
$('closeShare').onclick=()=>$('shareDialog').close();
$('mobileQuestion').addEventListener('change',()=>selectQuestion($('mobileQuestion').value));
$('syncKnowledge').onclick=()=>task(syncKnowledge,'Syncing local requests and approved answers…');
$('language').addEventListener('change',()=>selectQuestion(state.questionId,$('language').value));$('openSource').onclick=()=>$('sourceDialog').showModal();$('closeSource').onclick=()=>$('sourceDialog').close();$('cancelVoice').onclick=()=>$('voiceDialog').close();$('beginVoice').onclick=beginInterview;$('viewCoverage').onclick=()=>$('coverageSection').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});$('refreshCoverage').onclick=()=>task(async()=>{await refreshCoverage();notice('Coverage refreshed.');},'Refreshing coverage…');$('exportRecord').onclick=exportRecord;
window.addEventListener('pagehide',()=>{clearTimeout(recordTimer);stream?.getTracks().forEach(t=>t.stop());});
async function init(){const initialSearch=location.search;setBusy(true);notice('Opening the guide…');try{
  state.catalog=await api('/catalog');
  if(state.sourceVersion&&state.sourceVersion!==state.catalog.sourceVersion){state.records={};state.requests={};notice('The source changed. Previous approvals in this collection were cleared for a new check.');}
  state.sourceVersion=state.catalog.sourceVersion;
  if(!state.catalog.questions.some(q=>q.id===state.questionId))state.questionId=state.catalog.questions[0].id;
  if(!state.catalog.languages[state.language])state.language='en';
  const entry=entryFromLink(initialSearch,state.catalog);if(entry)Object.assign(state,entry);
  if(!state.sessionToken)state.sessionToken=(await api('/session',{})).token;
  if(new URLSearchParams(initialSearch).get('example')==='correction'){
    state.mode='contribute';
    if(!current().text){edit((state.catalog.questions.find(q=>q.id===state.questionId)?.examples||sample[state.questionId]).wrong);notice('This example contains deliberate mistakes. Run the source check to find them.');}
  }
  syncLocation();save();render();setBusy(false);if($('stepNotice').textContent==='Opening the guide…')notice('');
  const source=state.catalog.source;
  $('allSources').innerHTML=source.sections.map(s=>`<section class="source-section" id="${s.id}"><h3>${esc(sectionTitle(s.title))}</h3><p>${esc(s.text)}</p></section>`).join('')+`<p class="muted">Source version ${esc(state.sourceVersion.slice(0,16))}</p>`;
  await Promise.allSettled([refreshCoverage(),loadShared(),api('/coverage/sql').then(d=>{$('coverageSQL').textContent=d.sql;})]);
}catch(e){setBusy(false);notice(e.message,true);}}
init();
