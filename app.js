
'use strict';
const VERSION='0.1.0';
const STORE='exbrayat_pro_dossiers';
const SETTINGS='exbrayat_pro_settings';
const form=document.getElementById('intervention-form');
const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];

function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2400)}
function today(){return new Date().toISOString().slice(0,10)}
function nextNo(){
  const d=new Date(), y=d.getFullYear(), list=loadDossiers();
  return `${y}-${String(list.length+1).padStart(4,'0')}`;
}
function defaultSettings(){
 return {
   entrepriseNom:'SARL EXBRAYAT CEDRIC PLOMBERIE CHAUFFAGE',
   entrepriseSiret:'95391212800014',
   entrepriseAdresse:'26 avenue de Jumeaux, 63570 Brassac-les-Mines',
   attestationNo:'ACO / SQ024349 - 001',
   technicienNom:'EXBRAYAT Cédric',
   technicienQualite:'Gérant',
   defaultDetecteurId:'LT-100-PR02',
   defaultDetecteurDate:'2025-07-01'
 };
}
function loadSettings(){return {...defaultSettings(),...(JSON.parse(localStorage.getItem(SETTINGS)||'{}'))}}
function saveSettings(){
 const s={};['entrepriseNom','entrepriseSiret','entrepriseAdresse','attestationNo','technicienNom','technicienQualite','defaultDetecteurId','defaultDetecteurDate'].forEach(k=>s[k]=$('#'+k).value.trim());
 localStorage.setItem(SETTINGS,JSON.stringify(s));applyDefaults(false);toast('Paramètres enregistrés');
}
function renderSettings(){const s=loadSettings();Object.keys(s).forEach(k=>{const el=$('#'+k);if(el)el.value=s[k]})}
function applyDefaults(resetNo=true){
 const s=loadSettings();
 if(resetNo) $('#ficheNo').value=nextNo();
 $('#dateIntervention').value=today();
 $('#detecteurId').value=s.defaultDetecteurId||'';
 $('#detecteurDate').value=s.defaultDetecteurDate||'';
}
function checkedValues(name){return $$(`input[name="${name}"]:checked`).map(x=>x.value)}
function formDataObject(){
 const fd=new FormData(form), obj={};
 for(const [k,v] of fd.entries()){if(k!=='nature'&&k!=='controle')obj[k]=v}
 obj.nature=checkedValues('nature');obj.controle=checkedValues('controle');
 obj.surchauffe=$('#surchauffe').value;obj.sousRefroidissement=$('#sousRefroidissement').value;
 obj.deltaAir=$('#deltaAir').value;obj.deltaEau=$('#deltaEau').value;
 obj.signatureTechnicien=getSignature('signatureTechnicien');
 obj.signatureClient=getSignature('signatureClient');
 obj.savedAt=new Date().toISOString();obj.version=VERSION;
 return obj;
}
function loadDossiers(){try{return JSON.parse(localStorage.getItem(STORE)||'[]')}catch{return []}}
function saveDossier(){
 if(!form.reportValidity())return;
 const obj=formDataObject(), list=loadDossiers();
 const i=list.findIndex(x=>x.ficheNo===obj.ficheNo);
 if(i>=0)list[i]=obj;else list.unshift(obj);
 localStorage.setItem(STORE,JSON.stringify(list));renderHistory();toast('Dossier enregistré sur cet appareil');
}
function fillForm(d){
 form.reset();
 Object.entries(d).forEach(([k,v])=>{
   if(['nature','controle','signatureTechnicien','signatureClient','savedAt','version'].includes(k))return;
   const el=form.elements[k]; if(el && typeof v!=='object')el.value=v??'';
 });
 ['nature','controle'].forEach(n=>$$(`input[name="${n}"]`).forEach(x=>x.checked=(d[n]||[]).includes(x.value)));
 setSignature('signatureTechnicien',d.signatureTechnicien);setSignature('signatureClient',d.signatureClient);
 calculate();switchPage('intervention');toast(`Fiche ${d.ficheNo} chargée`);
}
function newForm(){
 if(!confirm('Effacer la fiche en cours ?'))return;
 form.reset();clearSignature('signatureTechnicien');clearSignature('signatureClient');applyDefaults(true);calculate();toast('Nouvelle fiche prête');
}
function renderHistory(filter=''){
 const list=loadDossiers(), q=filter.toLowerCase().trim(), box=$('#historyList');box.innerHTML='';
 list.filter(d=>`${d.ficheNo} ${d.clientNom} ${d.clientAdresse} ${d.dateIntervention}`.toLowerCase().includes(q)).forEach(d=>{
   const row=document.createElement('div');row.className='history-item';
   row.innerHTML=`<div><strong>${escapeHtml(d.clientNom||'Sans nom')}</strong><p>${escapeHtml(d.ficheNo||'')} - ${escapeHtml(d.dateIntervention||'')}</p></div><div><button type="button" class="load">Ouvrir</button> <button type="button" class="danger del">Supprimer</button></div>`;
   row.querySelector('.load').onclick=()=>fillForm(d);
   row.querySelector('.del').onclick=()=>{if(confirm('Supprimer ce dossier ?')){localStorage.setItem(STORE,JSON.stringify(loadDossiers().filter(x=>x.ficheNo!==d.ficheNo)));renderHistory($('#historySearch').value)}};
   box.appendChild(row);
 });
 if(!box.children.length)box.innerHTML='<p class="hint">Aucun dossier trouvé.</p>';
}
function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function num(name){const v=parseFloat(form.elements[name]?.value);return Number.isFinite(v)?v:null}
function showCalc(id,val){$(id).value=Number.isFinite(val)?val.toFixed(1):''}
function calculate(){
 const asp=num('tempAspiration'), satbp=num('tempSatBP'), liq=num('tempLiquide'), sathp=num('tempSatHP');
 const repris=num('airRepris'), souffle=num('airSouffle'), dep=num('departEau'), ret=num('retourEau');
 showCalc('#surchauffe',asp!==null&&satbp!==null?asp-satbp:NaN);
 showCalc('#sousRefroidissement',sathp!==null&&liq!==null?sathp-liq:NaN);
 showCalc('#deltaAir',repris!==null&&souffle!==null?Math.abs(repris-souffle):NaN);
 showCalc('#deltaEau',dep!==null&&ret!==null?Math.abs(dep-ret):NaN);
}
function setupCanvas(id){
 const canvas=document.getElementById(id),ctx=canvas.getContext('2d');ctx.lineWidth=4;ctx.lineCap='round';ctx.strokeStyle='#111';
 let drawing=false,last=null;
 const pos=e=>{const r=canvas.getBoundingClientRect(),p=e.touches?e.touches[0]:e;return{x:(p.clientX-r.left)*(canvas.width/r.width),y:(p.clientY-r.top)*(canvas.height/r.height)}};
 const start=e=>{e.preventDefault();drawing=true;last=pos(e)};
 const move=e=>{if(!drawing)return;e.preventDefault();const p=pos(e);ctx.beginPath();ctx.moveTo(last.x,last.y);ctx.lineTo(p.x,p.y);ctx.stroke();last=p;canvas.dataset.signed='1'};
 const end=e=>{if(drawing)e.preventDefault();drawing=false;last=null};
 canvas.addEventListener('pointerdown',start);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',end);canvas.addEventListener('pointercancel',end);canvas.addEventListener('pointerleave',end);
}
function clearSignature(id){const c=document.getElementById(id);c.getContext('2d').clearRect(0,0,c.width,c.height);c.dataset.signed='0'}
function getSignature(id){const c=document.getElementById(id);return c.dataset.signed==='1'?c.toDataURL('image/png'):''}
function setSignature(id,data){clearSignature(id);if(!data)return;const c=document.getElementById(id),img=new Image();img.onload=()=>{c.getContext('2d').drawImage(img,0,0,c.width,c.height);c.dataset.signed='1'};img.src=data}
function switchPage(name){$$('.page').forEach(x=>x.classList.toggle('active',x.id===`page-${name}`));$$('.tab').forEach(x=>x.classList.toggle('active',x.dataset.page===name));window.scrollTo({top:0,behavior:'smooth'})}

$$('.tab').forEach(b=>b.onclick=()=>switchPage(b.dataset.page));
$$('.clear-signature').forEach(b=>b.onclick=()=>clearSignature(b.dataset.target));
['signatureTechnicien','signatureClient'].forEach(setupCanvas);
form.addEventListener('input',calculate);
$('#saveBtn').onclick=saveDossier;
$('#printBtn').onclick=()=>{saveDossier();setTimeout(()=>window.print(),100)};
$('#newBtn').onclick=newForm;
$('#saveSettings').onclick=saveSettings;
$('#historySearch').oninput=e=>renderHistory(e.target.value);
renderSettings();applyDefaults(true);calculate();renderHistory();

if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('./service-worker.js?v=0.1.0').catch(console.error))}
