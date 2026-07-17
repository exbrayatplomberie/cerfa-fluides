
'use strict';
const VERSION='0.4.3.1-signatures-separees';
const STORE='exbrayat_pro_dossiers';
const SETTINGS='exbrayat_pro_settings';

const LOCAL_PIN=['0','3','6','9','1','2'].join('');

function lockApp(){
  sessionStorage.removeItem('exbrayat_unlocked');
  document.body.classList.add('locked');

  const screen=document.getElementById('lockScreen');
  const input=document.getElementById('pinInput');
  const message=document.getElementById('lockMessage');

  screen.classList.remove('hidden');
  input.value='';
  message.textContent='';

  setTimeout(()=>input.focus(),150);
}

function unlockApp(){
  sessionStorage.setItem('exbrayat_unlocked','1');
  document.body.classList.remove('locked');
  document.getElementById('lockScreen').classList.add('hidden');
}

function handleUnlock(){
  const input=document.getElementById('pinInput');
  const message=document.getElementById('lockMessage');

  const value=(input.value||'')
    .replace(/\D/g,'')
    .slice(0,6);

  input.value=value;

  if(value.length!==6){
    message.textContent='Saisissez exactement 6 chiffres.';
    return;
  }

  if(value===LOCAL_PIN){
    message.textContent='';
    unlockApp();
  }else{
    message.textContent='Code incorrect.';
    input.value='';
    setTimeout(()=>input.focus(),100);
  }
}

const form=document.getElementById('intervention-form');
const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];

function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2400)}
function today(){return new Date().toISOString().slice(0,10)}
function nextNo(){
  const now=new Date();

  const year=String(now.getFullYear());
  const month=String(now.getMonth()+1).padStart(2,'0');
  const day=String(now.getDate()).padStart(2,'0');
  const hour=String(now.getHours()).padStart(2,'0');
  const minute=String(now.getMinutes()).padStart(2,'0');
  const second=String(now.getSeconds()).padStart(2,'0');

  const base=`${year}${month}${day}-${hour}${minute}${second}`;
  const lastBase=localStorage.getItem('exbrayat_last_number_base')||'';
  let suffix=parseInt(localStorage.getItem('exbrayat_last_number_suffix')||'0',10);

  if(base===lastBase){
    suffix+=1;
  }else{
    suffix=0;
  }

  localStorage.setItem('exbrayat_last_number_base',base);
  localStorage.setItem('exbrayat_last_number_suffix',String(suffix));

  return suffix===0
    ? base
    : `${base}-${String(suffix).padStart(2,'0')}`;
}

function ensureFicheNo(){
  const field=document.getElementById('ficheNo');

  if(!field.value.trim()){
    field.value=nextNo();
  }

  return field.value.trim();
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
 if(resetNo && !$('#ficheNo').value.trim()) $('#ficheNo').value=nextNo();
 $('#dateIntervention').value=today();
 $('#detecteurId').value=s.defaultDetecteurId||'';
 $('#detecteurDate').value=s.defaultDetecteurDate||'';
}
function checkedValues(name){return $$(`input[name="${name}"]:checked`).map(x=>x.value)}
function formDataObject(){
 const fd=new FormData(form), obj={};
 for(const [k,v] of fd.entries()){if(k!=='nature'&&k!=='controle')obj[k]=v}
 obj.nature=checkedValues('nature');obj.controle=checkedValues('controle');obj.adr=checkedValues('adr');
 obj.surchauffe=$('#surchauffe').value;obj.sousRefroidissement=$('#sousRefroidissement').value;
 obj.deltaAir=$('#deltaAir').value;obj.deltaEau=$('#deltaEau').value;
 obj.signatureTechnicien=getSignature('signatureTechnicien');
 obj.signatureClient=getSignature('signatureClient');
 obj.savedAt=new Date().toISOString();obj.version=VERSION;
 return obj;
}
function loadDossiers(){try{return JSON.parse(localStorage.getItem(STORE)||'[]')}catch{return []}}
function saveDossier(){
 const ficheNo=ensureFicheNo();

 if(!form.reportValidity())return;
 const obj=formDataObject(), list=loadDossiers();
 const i=list.findIndex(x=>x.ficheNo===obj.ficheNo);
 if(i>=0)list[i]=obj;else list.unshift(obj);
 localStorage.setItem(STORE,JSON.stringify(list));renderHistory();toast(`Dossier ${ficheNo} enregistré sur cet appareil`);
}
function fillForm(d){
 form.reset();
 Object.entries(d).forEach(([k,v])=>{
   if(['nature','controle','adr','signatureTechnicien','signatureClient','savedAt','version'].includes(k))return;
   const el=form.elements[k]; if(el && typeof v!=='object')el.value=v??'';
 });
 ['nature','controle','adr'].forEach(n=>$$(`input[name="${n}"]`).forEach(x=>x.checked=(d[n]||[]).includes(x.value)));
 setSignature('signatureTechnicien',d.signatureTechnicien);setSignature('signatureClient',d.signatureClient);
 calculate();switchPage('intervention');toast(`Fiche ${d.ficheNo} chargée`);
}
function newForm(){
 if(!confirm('Créer une nouvelle fiche et effacer la saisie en cours ?'))return;

 form.reset();
 document.getElementById('ficheNo').value='';

 clearSignature('signatureTechnicien');
 clearSignature('signatureClient');

 applyDefaults(true);
 calculate();

 toast(`Nouvelle fiche ${document.getElementById('ficheNo').value} prête`);
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

const GWP_VALUES={
  R32:675,
  R410A:2088,
  R407C:1774,
  R134a:1430,
  R454B:466,
  R290:3
};
function autoTeqCO2(){
 const fluid=$('#fluide').value;
 const charge=num('chargeTotale');
 const field=$('#teqCO2');
 if(charge!==null && GWP_VALUES[fluid]!==undefined && !field.dataset.manual){
   field.value=(charge*GWP_VALUES[fluid]/1000).toFixed(3);
 }
}
function periodicity(){
 const family=$('#familleFluide').value;
 const permanent=form.elements.systemePermanent?.value==='oui';
 const charge=num('chargeTotale')||0;
 const teq=parseFloat($('#teqCO2').value)||0;
 let threshold='',freq='';

 if(family==='HCFC'){
   if(charge>=300){threshold='HCFC ≥ 300 kg';freq=permanent?'6m':'3m'}
   else if(charge>=30){threshold='HCFC 30 à < 300 kg';freq=permanent?'12m':'6m'}
   else if(charge>=2){threshold='HCFC 2 à < 30 kg';freq=permanent?'24m':'12m'}
 }else if(family==='HFO'){
   if(charge>=100){threshold='HFO ≥ 100 kg';freq=permanent?'6m':'3m'}
   else if(charge>=10){threshold='HFO 10 à < 100 kg';freq=permanent?'12m':'6m'}
   else if(charge>=1){threshold='HFO 1 à < 10 kg';freq=permanent?'24m':'12m'}
 }else{
   if(teq>=500){threshold='HFC/PFC ≥ 500 t.éq.CO₂';freq=permanent?'6m':'3m'}
   else if(teq>=50){threshold='HFC/PFC 50 à < 500 t.éq.CO₂';freq=permanent?'12m':'6m'}
   else if(teq>=5){threshold='HFC/PFC 5 à < 50 t.éq.CO₂';freq=permanent?'24m':'12m'}
 }
 if(!$('#frequenceControle').value) $('#periodiciteInfo').textContent=threshold?`${threshold} - contrôle tous les ${freq.replace('m',' mois')}`:'Seuil réglementaire non atteint ou données incomplètes.';
 else $('#periodiciteInfo').textContent=`Fréquence sélectionnée manuellement : ${$('#frequenceControle').selectedOptions[0].textContent}`;
 return {family,permanent,charge,teq,threshold,freq:$('#frequenceControle').value||freq};
}

function calculate(){
 autoTeqCO2();
 const asp=num('tempAspiration'), satbp=num('tempSatBP'), liq=num('tempLiquide'), sathp=num('tempSatHP');
 const repris=num('airRepris'), souffle=num('airSouffle'), dep=num('departEau'), ret=num('retourEau');
 showCalc('#surchauffe',asp!==null&&satbp!==null?asp-satbp:NaN);
 showCalc('#sousRefroidissement',sathp!==null&&liq!==null?sathp-liq:NaN);
 showCalc('#deltaAir',repris!==null&&souffle!==null?Math.abs(repris-souffle):NaN);
 showCalc('#deltaEau',dep!==null&&ret!==null?Math.abs(dep-ret):NaN);
 const A=num('fluideVierge')||0,B=num('fluideRecycle')||0,C=num('fluideRegenere')||0;
 const D=num('fluideTraitement')||0,E=num('fluideReutilisation')||0;
 showCalc('#totalChargeManip',A+B+C);
 showCalc('#totalRecupereManip',D+E);
 periodicity();
}
function setupCanvas(id){
 const canvas=document.getElementById(id);
 const ctx=canvas.getContext('2d');
 ctx.lineWidth=5;
 ctx.lineCap='round';
 ctx.lineJoin='round';
 ctx.strokeStyle='#111';

 let drawing=false;
 let activePointerId=null;
 let last=null;

 function resizeForDisplay(){
   const rect=canvas.getBoundingClientRect();
   const ratio=Math.max(1,Math.min(window.devicePixelRatio||1,2));
   const old=canvas.dataset.signed==='1' ? canvas.toDataURL('image/png') : '';
   canvas.width=Math.max(1,Math.round(rect.width*ratio));
   canvas.height=Math.max(1,Math.round(rect.height*ratio));
   ctx.lineWidth=5*ratio;
   ctx.lineCap='round';
   ctx.lineJoin='round';
   ctx.strokeStyle='#111';
   if(old){
     const img=new Image();
     img.onload=()=>{ctx.drawImage(img,0,0,canvas.width,canvas.height);canvas.dataset.signed='1'};
     img.src=old;
   }
 }

 function pointFromEvent(e){
   const rect=canvas.getBoundingClientRect();
   const px=('clientX' in e)?e.clientX:(e.touches&&e.touches[0]?e.touches[0].clientX:0);
   const py=('clientY' in e)?e.clientY:(e.touches&&e.touches[0]?e.touches[0].clientY:0);
   return {
     x:(px-rect.left)*(canvas.width/rect.width),
     y:(py-rect.top)*(canvas.height/rect.height)
   };
 }

 function start(e){
   e.preventDefault();
   drawing=true;
   activePointerId=e.pointerId??null;
   if(canvas.setPointerCapture && activePointerId!==null){
     try{canvas.setPointerCapture(activePointerId)}catch(_){}
   }
   last=pointFromEvent(e);
 }

 function move(e){
   if(!drawing)return;
   if(activePointerId!==null && e.pointerId!==undefined && e.pointerId!==activePointerId)return;
   e.preventDefault();
   const p=pointFromEvent(e);
   ctx.beginPath();
   ctx.moveTo(last.x,last.y);
   ctx.lineTo(p.x,p.y);
   ctx.stroke();
   last=p;
   canvas.dataset.signed='1';
 }

 function end(e){
   if(!drawing)return;
   e.preventDefault();
   drawing=false;
   if(canvas.releasePointerCapture && activePointerId!==null){
     try{canvas.releasePointerCapture(activePointerId)}catch(_){}
   }
   activePointerId=null;
   last=null;
 }

 if(window.PointerEvent){
   canvas.addEventListener('pointerdown',start,{passive:false});
   canvas.addEventListener('pointermove',move,{passive:false});
   canvas.addEventListener('pointerup',end,{passive:false});
   canvas.addEventListener('pointercancel',end,{passive:false});
 }else{
   canvas.addEventListener('touchstart',start,{passive:false});
   canvas.addEventListener('touchmove',move,{passive:false});
   canvas.addEventListener('touchend',end,{passive:false});
   canvas.addEventListener('mousedown',start);
   canvas.addEventListener('mousemove',move);
   canvas.addEventListener('mouseup',end);
   canvas.addEventListener('mouseleave',end);
 }

 canvas.dataset.signed='0';
 requestAnimationFrame(resizeForDisplay);
 window.addEventListener('orientationchange',()=>setTimeout(resizeForDisplay,300));
}
function clearSignature(id){const c=document.getElementById(id);c.getContext('2d').clearRect(0,0,c.width,c.height);c.dataset.signed='0'}
function getSignature(id){const c=document.getElementById(id);return c.dataset.signed==='1'?c.toDataURL('image/png'):''}
function setSignature(id,data){clearSignature(id);if(!data)return;const c=document.getElementById(id),img=new Image();img.onload=()=>{c.getContext('2d').drawImage(img,0,0,c.width,c.height);c.dataset.signed='1'};img.src=data}
function switchPage(name){$$('.page').forEach(x=>x.classList.toggle('active',x.id===`page-${name}`));$$('.tab').forEach(x=>x.classList.toggle('active',x.dataset.page===name));window.scrollTo({top:0,behavior:'smooth'})}


const { PDFDocument, StandardFonts, rgb } = PDFLib;

function cleanText(v){return String(v??'').trim()}
function formatDateFr(v){
 if(!v)return '';
 const [y,m,d]=v.split('-');
 return (d&&m&&y)?`${d}/${m}/${y}`:v;
}
function numberText(v){return cleanText(v).replace('.',',')}
function safeName(v){return cleanText(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9_-]+/g,'_').replace(/^_+|_+$/g,'')||'client'}
function downloadBytes(bytes,filename){
 const blob=new Blob([bytes],{type:'application/pdf'});
 const url=URL.createObjectURL(blob);
 const a=document.createElement('a');
 a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),3000);
}
async function fetchBytes(path){
 const r=await fetch(path,{cache:'no-store'});
 if(!r.ok)throw new Error(`Fichier introuvable : ${path}`);
 return new Uint8Array(await r.arrayBuffer());
}
function wrapText(text,font,size,maxWidth){
 const words=cleanText(text).split(/\s+/).filter(Boolean), lines=[];
 let line='';
 for(const word of words){
   const test=line?line+' '+word:word;
   if(font.widthOfTextAtSize(test,size)<=maxWidth)line=test;
   else{if(line)lines.push(line);line=word}
 }
 if(line)lines.push(line);
 return lines.length?lines:[''];
}
function drawLabelValue(page,font,bold,label,value,x,y,width){
 page.drawText(label,{x,y,size:9,font:bold,color:rgb(.08,.25,.35)});
 const lines=wrapText(value,font,10,width);
 lines.slice(0,3).forEach((line,i)=>page.drawText(line,{x,y:y-13-(i*12),size:10,font,color:rgb(.08,.08,.08)}));
 return y-18-(Math.min(lines.length,3)*12);
}
function drawSection(page,bold,title,y){
 page.drawRectangle({x:32,y:y-5,width:531,height:24,color:rgb(.09,.29,.41)});
 page.drawText(title,{x:42,y:y+2,size:12,font:bold,color:rgb(1,1,1)});
 return y-35;
}
function drawRows(page,font,bold,rows,y){
 const colW=255;
 rows.forEach((row,i)=>{
   const x=32+(i%2)*270;
   if(i%2===0 && i>0)y-=48;
   drawLabelValue(page,font,bold,row[0],row[1],x,y,colW);
 });
 return y-55;
}
async function createReportPdf(){
 ensureFicheNo();
 if(!form.reportValidity())return;
 saveDossier();

 const d=formDataObject(),s=loadSettings();
 const pdf=await PDFDocument.create();
 const font=await pdf.embedFont(StandardFonts.Helvetica);
 const bold=await pdf.embedFont(StandardFonts.HelveticaBold);

 const PAGE_W=595.28;
 const PAGE_H=841.89;
 const BLUE=rgb(.09,.29,.41);
 const LIGHT=rgb(.94,.97,.98);
 const LINE=rgb(.73,.80,.84);
 const TEXT=rgb(.08,.08,.08);
 const valueOrDash=v=>cleanText(v)||'-';

 function pageNumber(page,n){
   page.drawText(`Page ${n} / 2`,{x:510,y:20,size:8,font,color:rgb(.4,.4,.4)});
 }

 function section(page,title,y){
   page.drawRectangle({x:32,y:y-2,width:531,height:23,color:BLUE});
   page.drawText(title,{x:42,y:y+4,size:11,font:bold,color:rgb(1,1,1)});
   return y-31;
 }

 function cell(page,x,y,w,label,value){
   page.drawRectangle({
     x,y:y-30,width:w,height:34,
     borderColor:LINE,borderWidth:.7,
     color:rgb(1,1,1)
   });
   page.drawText(label,{x:x+7,y:y-9,size:7.5,font:bold,color:BLUE});
   const lines=wrapText(valueOrDash(value),font,9,w-14).slice(0,2);
   lines.forEach((line,i)=>{
     page.drawText(line,{x:x+7,y:y-22-(i*10),size:9,font,color:TEXT});
   });
 }

 function grid(page,rows,y,rowHeight=38){
   rows.forEach((row,i)=>{
     const yy=y-i*rowHeight;
     cell(page,32,yy,258,row[0],row[1]);
     cell(page,305,yy,258,row[2],row[3]);
   });
   return y-rows.length*rowHeight-5;
 }

 function observationBox(page,y,h){
   page.drawRectangle({
     x:32,y:y-h,width:531,height:h,
     borderColor:LINE,borderWidth:.8,
     color:rgb(1,1,1)
   });
   const observation=cleanText(d.observations);
   if(!observation){
     page.drawText('Aucune observation.',{
       x:42,y:y-21,size:9,font,color:rgb(.35,.35,.35)
     });
     return;
   }
   const lines=wrapText(observation,font,9,515).slice(0,7);
   lines.forEach((line,i)=>{
     page.drawText(line,{x:42,y:y-20-(i*12),size:9,font,color:TEXT});
   });
 }

 function signatureFrame(page,x,title,name){
   const boxY=28;
   const boxW=250;
   const boxH=108;

   page.drawRectangle({
     x,y:boxY,width:boxW,height:boxH,
     borderColor:LINE,borderWidth:.9,
     color:rgb(1,1,1)
   });
   page.drawRectangle({
     x,y:boxY+84,width:boxW,height:24,
     color:LIGHT
   });
   page.drawText(title,{x:x+9,y:boxY+92,size:8.5,font:bold,color:BLUE});
   page.drawText(valueOrDash(name),{x:x+9,y:boxY+73,size:8.5,font});

   return {x:x+12,y:boxY+8,w:boxW-24,h:58};
 }

 let page=pdf.addPage([PAGE_W,PAGE_H]);

 page.drawRectangle({x:0,y:776,width:PAGE_W,height:66,color:BLUE});
 page.drawText("RAPPORT D'INTERVENTION",{
   x:170,y:807,size:19,font:bold,color:rgb(1,1,1)
 });
 page.drawText(`Fiche ${cleanText(d.ficheNo)} - ${formatDateFr(d.dateIntervention)}`,{
   x:170,y:786,size:10,font,color:rgb(1,1,1)
 });

 try{
   const logoBytes=await fetchBytes('logo-exbrayat.png');
   const logo=await pdf.embedPng(logoBytes);
   page.drawImage(logo,{x:30,y:648,width:118,height:108});
 }catch(_){}

 page.drawText(cleanText(s.entrepriseNom),{x:175,y:735,size:11,font:bold,color:BLUE});
 page.drawText(cleanText(s.entrepriseAdresse),{x:175,y:716,size:9,font});
 page.drawText('Tel. 06 17 16 15 38',{x:175,y:699,size:9,font});
 page.drawText('ent.exbrayat@gmail.com',{x:175,y:682,size:9,font});
 page.drawText(`SIRET : ${cleanText(s.entrepriseSiret)}`,{x:175,y:665,size:9,font});
 page.drawLine({start:{x:32,y:636},end:{x:563,y:636},thickness:1,color:LINE});

 let y=612;
 y=section(page,'CLIENT ET EQUIPEMENT',y);

 y=grid(page,[
   ['Client',d.clientNom,'Telephone',d.clientTel],
   ['Adresse',d.clientAdresse,'E-mail',d.clientEmail],
   ['Equipement',`${d.equipMarque||''} ${d.equipModele||''}`,'No de serie',d.equipSerie],
   ['Localisation',d.equipLocalisation,'Fluide',d.fluide],
   ['Charge totale',d.chargeTotale?`${numberText(d.chargeTotale)} kg`:'',
    'Tonnage CO2',d.teqCO2?`${numberText(d.teqCO2)} t eq. CO2`:'']
 ],y,38);

 y=section(page,'INTERVENTION ET CONTROLES',y);

 page.drawText("Nature de l'intervention",{x:32,y,size:8,font:bold,color:BLUE});
 const natureLines=wrapText((d.nature||[]).join(', ')||'-',font,9,531).slice(0,3);
 natureLines.forEach((line,i)=>page.drawText(line,{x:32,y:y-14-(i*11),size:9,font}));
 y-=50;

 page.drawText('Controles realises',{x:32,y,size:8,font:bold,color:BLUE});
 const controlLines=wrapText((d.controle||[]).join(', ')||'-',font,9,531).slice(0,3);
 controlLines.forEach((line,i)=>page.drawText(line,{x:32,y:y-14-(i*11),size:9,font}));
 y-=50;

 cell(page,32,y,258,'Detecteur',d.detecteurId);
 cell(page,305,y,258,'Controle le',formatDateFr(d.detecteurDate));

 pageNumber(page,1);

 page=pdf.addPage([PAGE_W,PAGE_H]);

 page.drawRectangle({x:0,y:792,width:PAGE_W,height:50,color:BLUE});
 page.drawText('MESURES, FLUIDES ET SIGNATURES',{
   x:135,y:809,size:15,font:bold,color:rgb(1,1,1)
 });

 y=765;
 y=section(page,'MESURES TECHNIQUES',y);

 y=grid(page,[
   ['Tension',d.tension?`${numberText(d.tension)} V`:'',
    'Intensite totale',d.intensiteTotale?`${numberText(d.intensiteTotale)} A`:''],
   ['Intensite compresseur',d.intensiteComp?`${numberText(d.intensiteComp)} A`:'',
    'Frequence',d.frequence?`${numberText(d.frequence)} Hz`:''],
   ['Pression BP',d.pressionBP?`${numberText(d.pressionBP)} bar`:'',
    'Pression HP',d.pressionHP?`${numberText(d.pressionHP)} bar`:''],
   ['Temp. aspiration',d.tempAspiration?`${numberText(d.tempAspiration)} C`:'',
    'Temp. refoulement',d.tempRefoulement?`${numberText(d.tempRefoulement)} C`:''],
   ['Temp. liquide',d.tempLiquide?`${numberText(d.tempLiquide)} C`:'',
    'Surchauffe',d.surchauffe?`${numberText(d.surchauffe)} K`:''],
   ['Sous-refroidissement',d.sousRefroidissement?`${numberText(d.sousRefroidissement)} K`:'',
    'Air exterieur',d.airExterieur?`${numberText(d.airExterieur)} C`:''],
   ['Air repris / souffle',`${numberText(d.airRepris)} / ${numberText(d.airSouffle)} C`,
    'Delta T air',d.deltaAir?`${numberText(d.deltaAir)} K`:''],
   ['Depart / retour eau',`${numberText(d.departEau)} / ${numberText(d.retourEau)} C`,
    'Delta T eau',d.deltaEau?`${numberText(d.deltaEau)} K`:'']
 ],y,35);

 y=section(page,'FLUIDES',y);

 y=grid(page,[
   ['Fluide vierge charge',d.fluideVierge?`${numberText(d.fluideVierge)} kg`:'',
    'Fluide recycle charge',d.fluideRecycle?`${numberText(d.fluideRecycle)} kg`:''],
   ['Fluide regenere charge',d.fluideRegenere?`${numberText(d.fluideRegenere)} kg`:'',
    'Destine au traitement',d.fluideTraitement?`${numberText(d.fluideTraitement)} kg`:''],
   ['Conserve pour reutilisation',d.fluideReutilisation?`${numberText(d.fluideReutilisation)} kg`:'',
    'No BSFF',d.numeroBSFF],
   ['Contenants',d.contenantsId,'Destination',d.installationDestination]
 ],y,35);

 y=section(page,'OBSERVATIONS',y);
 observationBox(page,y,58);

 page.drawText('SIGNATURES',{x:32,y:158,size:11,font:bold,color:BLUE});
 page.drawLine({start:{x:32,y:151},end:{x:563,y:151},thickness:1,color:LINE});

 const techFrame=signatureFrame(page,32,'TECHNICIEN',s.technicienNom);
 const clientFrame=signatureFrame(page,313,'CLIENT / DETENTEUR',d.clientNom);

 if(d.signatureTechnicien){
   const img=await pdf.embedPng(d.signatureTechnicien);
   page.drawImage(img,{
     x:techFrame.x,y:techFrame.y,width:techFrame.w,height:techFrame.h
   });
 }

 if(d.signatureClient){
   const img=await pdf.embedPng(d.signatureClient);
   page.drawImage(img,{
     x:clientFrame.x,y:clientFrame.y,width:clientFrame.w,height:clientFrame.h
   });
 }

 pageNumber(page,2);

 const bytes=await pdf.save();
 downloadBytes(bytes,`${d.ficheNo}_${safeName(d.clientNom)}_rapport.pdf`);
 toast('Rapport PDF cree sur 2 pages');
}
function setText(formPdf,name,value){
 try{formPdf.getTextField(name).setText(cleanText(value))}catch(_){}
}
function check(formPdf,name,on){
 try{const f=formPdf.getCheckBox(name);on?f.check():f.uncheck()}catch(_){}
}
function selectRadio(formPdf,name,value){
 try{formPdf.getRadioGroup(name).select(value)}catch(_){}
}

async function createCompleteDossierPdf(){
 ensureFicheNo();
 if(!form.reportValidity())return;
 saveDossier();
 const d=formDataObject(),s=loadSettings();

 try{
   const finalPdf=await PDFDocument.create();
   const font=await finalPdf.embedFont(StandardFonts.Helvetica);
   const bold=await finalPdf.embedFont(StandardFonts.HelveticaBold);

   let page=finalPdf.addPage([595.28,841.89]);

   // En-tête séparé : le titre ne peut plus chevaucher les coordonnées.
   page.drawRectangle({x:0,y:775,width:595.28,height:66,color:rgb(.09,.29,.41)});
   page.drawText('RAPPORT D’INTERVENTION',{x:180,y:805,size:18,font:bold,color:rgb(1,1,1)});
   page.drawText(`Fiche ${cleanText(d.ficheNo)} - ${formatDateFr(d.dateIntervention)}`,{x:180,y:785,size:10,font,color:rgb(1,1,1)});

   try{
     const logoBytes=await fetchBytes('logo-exbrayat.png');
     const logo=await finalPdf.embedPng(logoBytes);
     page.drawImage(logo,{x:28,y:650,width:120,height:110});
   }catch(_){}

   page.drawText(cleanText(s.entrepriseNom),{x:175,y:735,size:11,font:bold,color:rgb(.09,.29,.41)});
   page.drawText(cleanText(s.entrepriseAdresse),{x:175,y:716,size:9,font});
   page.drawText('Tél. 06 17 16 15 38',{x:175,y:699,size:9,font});
   page.drawText('ent.exbrayat@gmail.com',{x:175,y:683,size:9,font});
   page.drawText(`SIRET : ${cleanText(s.entrepriseSiret)}`,{x:175,y:667,size:9,font});
   page.drawLine({start:{x:32,y:638},end:{x:563,y:638},thickness:1,color:rgb(.75,.82,.86)});

   let y=615;
   y=drawSection(page,bold,'CLIENT ET EQUIPEMENT',y);
   y=drawRows(page,font,bold,[
     ['Client',d.clientNom],['Téléphone',d.clientTel],
     ['E-mail',d.clientEmail],['Adresse',d.clientAdresse],
     ['Équipement',`${d.equipMarque||''} ${d.equipModele||''}`],['N° de série',d.equipSerie],
     ['Localisation',d.equipLocalisation],['Fluide',d.fluide],
     ['Charge totale',d.chargeTotale?`${numberText(d.chargeTotale)} kg`:'' ],
     ['Tonnage équivalent CO₂',d.teqCO2?`${numberText(d.teqCO2)} t.éq.CO₂`:'' ]
   ],y);

   y=drawSection(page,bold,'INTERVENTION ET CONTROLES',y);
   y=drawLabelValue(page,font,bold,'Nature de l’intervention',(d.nature||[]).join(', '),32,y,531)-8;
   y=drawLabelValue(page,font,bold,'Contrôles réalisés',(d.controle||[]).join(', '),32,y,531)-8;
   y=drawRows(page,font,bold,[['Détecteur',d.detecteurId],['Contrôlé le',formatDateFr(d.detecteurDate)]],y);

   page=finalPdf.addPage([595.28,841.89]);
   page.drawRectangle({x:0,y:790,width:595.28,height:51,color:rgb(.09,.29,.41)});
   page.drawText('MESURES TECHNIQUES ET SIGNATURES',{x:115,y:808,size:16,font:bold,color:rgb(1,1,1)});
   y=760;

   y=drawRows(page,font,bold,[
     ['Tension',d.tension?`${numberText(d.tension)} V`:'' ],['Intensité totale',d.intensiteTotale?`${numberText(d.intensiteTotale)} A`:'' ],
     ['Intensité compresseur',d.intensiteComp?`${numberText(d.intensiteComp)} A`:'' ],['Fréquence',d.frequence?`${numberText(d.frequence)} Hz`:'' ],
     ['Pression BP',d.pressionBP?`${numberText(d.pressionBP)} bar`:'' ],['Pression HP',d.pressionHP?`${numberText(d.pressionHP)} bar`:'' ],
     ['T° aspiration',d.tempAspiration?`${numberText(d.tempAspiration)} °C`:'' ],['T° refoulement',d.tempRefoulement?`${numberText(d.tempRefoulement)} °C`:'' ],
     ['Surchauffe',d.surchauffe?`${numberText(d.surchauffe)} K`:'' ],['Sous-refroidissement',d.sousRefroidissement?`${numberText(d.sousRefroidissement)} K`:'' ],
     ['Air repris / soufflé',`${numberText(d.airRepris)} / ${numberText(d.airSouffle)} °C`],['Delta T air',d.deltaAir?`${numberText(d.deltaAir)} K`:'' ],
     ['Départ / retour eau',`${numberText(d.departEau)} / ${numberText(d.retourEau)} °C`],['Delta T eau',d.deltaEau?`${numberText(d.deltaEau)} K`:'' ]
   ],y);

   y=drawSection(page,bold,'FLUIDES ET OBSERVATIONS',y);
   y=drawRows(page,font,bold,[
     ['Fluide vierge chargé',d.fluideVierge?`${numberText(d.fluideVierge)} kg`:'' ],
     ['Fluide recyclé chargé',d.fluideRecycle?`${numberText(d.fluideRecycle)} kg`:'' ],
     ['Fluide régénéré chargé',d.fluideRegenere?`${numberText(d.fluideRegenere)} kg`:'' ],
     ['Destiné au traitement',d.fluideTraitement?`${numberText(d.fluideTraitement)} kg`:'' ],
     ['Conservé pour réutilisation',d.fluideReutilisation?`${numberText(d.fluideReutilisation)} kg`:'' ],
     ['N° BSFF',d.numeroBSFF],['Contenants',d.contenantsId],['Destination',d.installationDestination]
   ],y);
   y=drawLabelValue(page,font,bold,'Observations',d.observations,32,y,531)-12;

   page.drawText('Signatures',{x:32,y:190,size:12,font:bold,color:rgb(.09,.29,.41)});
   if(d.signatureTechnicien){
     const img=await finalPdf.embedPng(d.signatureTechnicien);
     page.drawText('Technicien',{x:32,y:168,size:9,font:bold});
     page.drawImage(img,{x:32,y:65,width:220,height:90});
   }
   if(d.signatureClient){
     const img=await finalPdf.embedPng(d.signatureClient);
     page.drawText('Client / détenteur',{x:320,y:168,size:9,font:bold});
     page.drawImage(img,{x:320,y:65,width:220,height:90});
   }

   // Ajout du CERFA officiel puis de l'attestation.
   const cerfaBytes=await fetchBytes('cerfa_15497-04.pdf');
   const cerfaPdf=await PDFDocument.load(cerfaBytes);
   const cerfaPages=await finalPdf.copyPages(cerfaPdf,cerfaPdf.getPageIndices());
   cerfaPages.forEach(pg=>finalPdf.addPage(pg));

   const attBytes=await fetchBytes('attestation-capacite.pdf');
   const attPdf=await PDFDocument.load(attBytes);
   const attPages=await finalPdf.copyPages(attPdf,attPdf.getPageIndices());
   attPages.forEach(pg=>finalPdf.addPage(pg));

   const bytes=await finalPdf.save();
   downloadBytes(bytes,`${d.dateIntervention}_${safeName(d.clientNom)}_${d.ficheNo}_DOSSIER_COMPLET.pdf`);
   toast('Dossier client complet créé');
 }catch(err){
   console.error(err);
   alert('Impossible de créer le dossier complet : '+err.message);
 }
}

async function createCerfaPdf(){
 ensureFicheNo();
 if(!form.reportValidity())return;
 saveDossier();
 const d=formDataObject(), s=loadSettings();
 try{
   const [cerfaBytes,attBytes]=await Promise.all([fetchBytes('cerfa_15497-04.pdf'),fetchBytes('attestation-capacite.pdf')]);
   const pdf=await PDFDocument.load(cerfaBytes);
   const formPdf=pdf.getForm();

   setText(formPdf,'Fiche_no',d.ficheNo);
   setText(formPdf,'Operateur',`${s.entrepriseNom}\n${s.entrepriseAdresse}\nSIRET ${s.entrepriseSiret}`);
   setText(formPdf,'Attestation_no',s.attestationNo);
   setText(formPdf,'Detenteur',`${d.clientNom}\n${d.clientAdresse}${d.clientTel?`\nTél. ${d.clientTel}`:''}`);
   setText(formPdf,'Equipement_ID',`${d.equipMarque||''} ${d.equipModele||''} - N° série ${d.equipSerie||''} - ${d.equipLocalisation||''}`);
   setText(formPdf,'Equipement_Fluide',d.fluide);
   setText(formPdf,'Equipement_Charge',numberText(d.chargeTotale));
   setText(formPdf,'Equipement_teqCO2',numberText(d.teqCO2));

   const n=d.nature||[];
   check(formPdf,'Case_Assemblage',n.includes('Assemblage'));
   check(formPdf,'Case_MiseService',n.includes('Mise en service'));
   check(formPdf,'Case_Modif',n.includes('Modification'));
   check(formPdf,'Case_Maintenance',n.includes('Maintenance'));
   check(formPdf,'Case_CtrlPerio',n.includes('Contrôle périodique'));
   check(formPdf,'Case_CtrlNonPerio',n.includes('Contrôle non périodique'));
   check(formPdf,'Case_Demantel',n.includes('Démantèlement'));

   setText(formPdf,'Detecteur_ID',d.detecteurId);
   const dt=(d.detecteurDate||'').split('-');
   setText(formPdf,'Controle_Jour',dt[2]||'');
   setText(formPdf,'Controle_Mois',dt[1]||'');
   setText(formPdf,'Controle_Annee',dt[0]||'');

   // 6 - système permanent
   selectRadio(formPdf,'Bouton_Oui',d.systemePermanent==='oui' ? '1' : '2');

   // 7, 8 et 9 - seuil et périodicité
   const per=periodicity();
   check(formPdf,'Case_HCFC_2',per.family==='HCFC' && per.charge>=2 && per.charge<30);
   check(formPdf,'Case_HCFC_30',per.family==='HCFC' && per.charge>=30 && per.charge<300);
   check(formPdf,'Case_HCFC_300',per.family==='HCFC' && per.charge>=300);
   check(formPdf,'Case_HFC_5',per.family==='HFC' && per.teq>=5 && per.teq<50);
   check(formPdf,'Case_HFC_50',per.family==='HFC' && per.teq>=50 && per.teq<500);
   check(formPdf,'Case_HFC_500',per.family==='HFC' && per.teq>=500);
   check(formPdf,'Case_HFO_1',per.family==='HFO' && per.charge>=1 && per.charge<10);
   check(formPdf,'Case_HFO_10',per.family==='HFO' && per.charge>=10 && per.charge<100);
   check(formPdf,'Case_HFO_100',per.family==='HFO' && per.charge>=100);

   check(formPdf,'Case_Sans_12m',!per.permanent && per.freq==='12m');
   check(formPdf,'Case_Sans_6m',!per.permanent && per.freq==='6m');
   check(formPdf,'Case_Sans_3m',!per.permanent && per.freq==='3m');
   check(formPdf,'Case_Avec_24m',per.permanent && per.freq==='24m');
   check(formPdf,'Case_Avec_12m',per.permanent && per.freq==='12m');
   check(formPdf,'Case_Avec_6m',per.permanent && per.freq==='6m');

   // 10 - fuites
   check(formPdf,'Case_Fuite_Oui',d.fuiteConstatee==='oui');
   check(formPdf,'Case_Fuite_Non',d.fuiteConstatee!=='oui');
   for(let i=1;i<=3;i++){
     setText(formPdf,`Fuite_Loca_${i}`,d[`fuiteLoca${i}`]);
     check(formPdf,`Case_Rep_Fuite${i}_realisee`,d[`fuiteRep${i}`]==='realisee');
     check(formPdf,`Case_Rep_Fuite${i}_AFaire`,d[`fuiteRep${i}`]==='afaire');
   }

   const A=parseFloat(d.fluideVierge||0),B=parseFloat(d.fluideRecycle||0),C=parseFloat(d.fluideRegenere||0),D=parseFloat(d.fluideTraitement||0),E=parseFloat(d.fluideReutilisation||0);
   setText(formPdf,'11_Quantite',(A+B+C)?numberText((A+B+C).toFixed(3)):'');
   setText(formPdf,'11_QA',A?numberText(A):'');
   setText(formPdf,'11_QB',B?numberText(B):'');
   setText(formPdf,'11_QC',C?numberText(C):'');
   setText(formPdf,'11_Denom',d.fluideChargeChangement);
   setText(formPdf,'11_QDE',(D+E)?numberText((D+E).toFixed(3)):'');
   setText(formPdf,'11_QD',D?numberText(D):'');
   setText(formPdf,'11_BSFF',d.numeroBSFF);
   setText(formPdf,'11_QE',E?numberText(E):'');
   setText(formPdf,'11_Contenant_ID',d.contenantsId);

   // 12 - ADR / déchets
   const adr=d.adr||[];
   check(formPdf,'Case_12_UN1078',adr.includes('UN1078'));
   check(formPdf,'Case_12_Autre140601',adr.includes('AUTRE_NON_INFLAMMABLE'));
   setText(formPdf,'Autre-FF-NON-inflammable',d.autreNonInflammable);
   check(formPdf,'Case_12_UN3161',adr.includes('UN3161'));
   check(formPdf,'Case_12_Autre160504',adr.includes('AUTRE_INFLAMMABLE'));
   setText(formPdf,'Autre-FF-inflammable',d.autreInflammable);

   // 13 - destination
   setText(formPdf,'13_Instal',d.installationDestination);
   setText(formPdf,'14_Observations',d.observations);

   setText(formPdf,'Sign_Operateur_Nom',s.technicienNom);
   setText(formPdf,'Sign_Operateur_Qualite',s.technicienQualite);
   setText(formPdf,'Sign_Operateur_Date',formatDateFr(d.dateIntervention));
   setText(formPdf,'Sign_Detenteur_Nom',d.clientNom);
   setText(formPdf,'Sign_Detenteur_Qualite','Détenteur');
   setText(formPdf,'Sign_Detenteur_Date',formatDateFr(d.dateIntervention));

   const page=pdf.getPages()[0];
   if(d.signatureTechnicien){
     const img=await pdf.embedPng(d.signatureTechnicien);
     page.drawImage(img,{x:85,y:19,width:150,height:34});
   }
   if(d.signatureClient){
     const img=await pdf.embedPng(d.signatureClient);
     page.drawImage(img,{x:365,y:19,width:150,height:34});
   }

   try{formPdf.updateFieldAppearances(await pdf.embedFont(StandardFonts.Helvetica))}catch(_){}
   formPdf.flatten();

   const att=await PDFDocument.load(attBytes);
   const copied=await pdf.copyPages(att,att.getPageIndices());
   copied.forEach(pg=>pdf.addPage(pg));

   const bytes=await pdf.save();
   downloadBytes(bytes,`${d.ficheNo}_${safeName(d.clientNom)}_CERFA_et_attestation.pdf`);
   toast('CERFA officiel et attestation créés');
 }catch(err){
   console.error(err);
   alert('Impossible de créer le CERFA : '+err.message);
 }
}

$$('.tab').forEach(b=>b.onclick=()=>switchPage(b.dataset.page));
$$('.clear-signature').forEach(b=>b.onclick=()=>clearSignature(b.dataset.target));
['signatureTechnicien','signatureClient'].forEach(setupCanvas);
form.addEventListener('input',calculate);
$('#saveBtn').onclick=saveDossier;
$('#completePdfBtn').onclick=createCompleteDossierPdf;
$('#reportPdfBtn').onclick=createReportPdf;
$('#cerfaPdfBtn').onclick=createCerfaPdf;
$('#printBtn').onclick=()=>{saveDossier();setTimeout(()=>window.print(),350)};
$('#newBtn').onclick=newForm;
$('#saveSettings').onclick=saveSettings;
$('#historySearch').oninput=e=>renderHistory(e.target.value);

const unlockButton=document.getElementById('unlockBtn');
const pinField=document.getElementById('pinInput');
const lockButton=document.getElementById('lockNowBtn');

function unlockFromTap(event){
  if(event){
    event.preventDefault();
    event.stopPropagation();
  }
  handleUnlock();
}

unlockButton.addEventListener('click',unlockFromTap,false);
unlockButton.addEventListener('pointerup',unlockFromTap,false);
unlockButton.addEventListener('touchend',unlockFromTap,{passive:false});

pinField.addEventListener('input',()=>{
  pinField.value=pinField.value.replace(/\D/g,'').slice(0,6);

  // Sur iPad, validation automatique dès que les 6 chiffres sont saisis.
  if(pinField.value.length===6){
    setTimeout(handleUnlock,80);
  }
});

pinField.addEventListener('keydown',event=>{
  if(event.key==='Enter'){
    event.preventDefault();
    handleUnlock();
  }
});

if(lockButton){
  lockButton.addEventListener('click',lockApp);
}

if(sessionStorage.getItem('exbrayat_unlocked')==='1'){
  unlockApp();
}else{
  lockApp();
}

renderSettings();
applyDefaults(true);
calculate();
renderHistory();


if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('./service-worker.js?v=0.4.2.8').catch(console.error))}


function showPlatformNote(){
 const isIOS=/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform==='MacIntel' && navigator.maxTouchPoints>1);
 if(isIOS && !window.matchMedia('(display-mode: standalone)').matches){
   toast('iPad : ouvrez avec Safari puis Partager → Ajouter à l’écran d’accueil');
 }
}
window.addEventListener('load',()=>setTimeout(showPlatformNote,800));

$('#teqCO2').addEventListener('input',()=>{$('#teqCO2').dataset.manual='1';periodicity()});
$('#fluide').addEventListener('change',()=>{$('#teqCO2').dataset.manual='';autoTeqCO2();periodicity()});
$('#chargeTotale').addEventListener('input',()=>{if(!$('#teqCO2').dataset.manual)autoTeqCO2();periodicity()});
$$('input[name="systemePermanent"]').forEach(x=>x.addEventListener('change',periodicity));
$('#familleFluide').addEventListener('change',periodicity);
$('#frequenceControle').addEventListener('change',periodicity);
