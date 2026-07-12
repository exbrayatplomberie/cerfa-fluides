
'use strict';
const VERSION='0.2.0-pdf-ipad';
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
 if(!form.reportValidity())return;
 saveDossier();
 const d=formDataObject(), s=loadSettings();
 const pdf=await PDFDocument.create();
 const font=await pdf.embedFont(StandardFonts.Helvetica);
 const bold=await pdf.embedFont(StandardFonts.HelveticaBold);
 let page=pdf.addPage([595.28,841.89]), y=805;

 page.drawText('EXBRAYAT PRO - RAPPORT D’INTERVENTION',{x:32,y,size:17,font:bold,color:rgb(.09,.29,.41)});
 page.drawText(`Fiche ${cleanText(d.ficheNo)} - ${formatDateFr(d.dateIntervention)}`,{x:32,y:y-23,size:11,font});
 page.drawText(cleanText(s.entrepriseNom),{x:330,y,size:9,font:bold});
 page.drawText(cleanText(s.entrepriseAdresse),{x:330,y:y-13,size:8,font});
 page.drawText(`SIRET : ${cleanText(s.entrepriseSiret)}`,{x:330,y:y-26,size:8,font});
 y-=58;

 y=drawSection(page,bold,'CLIENT ET EQUIPEMENT',y);
 y=drawRows(page,font,bold,[
  ['Client',d.clientNom],['Téléphone',d.clientTel],
  ['Adresse',d.clientAdresse],['Équipement',`${d.equipMarque||''} ${d.equipModele||''}`],
  ['N° de série',d.equipSerie],['Localisation',d.equipLocalisation],
  ['Fluide',d.fluide],['Charge totale',d.chargeTotale?`${numberText(d.chargeTotale)} kg`:'']
 ],y);

 y=drawSection(page,bold,'INTERVENTION ET CONTROLES',y);
 const nature=(d.nature||[]).join(', ');
 const controls=(d.controle||[]).join(', ');
 y=drawLabelValue(page,font,bold,'Nature de l’intervention',nature,32,y,531)-8;
 y=drawLabelValue(page,font,bold,'Contrôles réalisés',controls,32,y,531)-8;
 y=drawRows(page,font,bold,[
  ['Détecteur',d.detecteurId],['Contrôlé le',formatDateFr(d.detecteurDate)]
 ],y);

 if(y<290){page=pdf.addPage([595.28,841.89]);y=805}
 y=drawSection(page,bold,'MESURES TECHNIQUES',y);
 const measures=[
  ['Tension',d.tension?`${numberText(d.tension)} V`:'' ],
  ['Intensité totale',d.intensiteTotale?`${numberText(d.intensiteTotale)} A`:'' ],
  ['Intensité compresseur',d.intensiteComp?`${numberText(d.intensiteComp)} A`:'' ],
  ['Fréquence',d.frequence?`${numberText(d.frequence)} Hz`:'' ],
  ['Pression BP',d.pressionBP?`${numberText(d.pressionBP)} bar`:'' ],
  ['Pression HP',d.pressionHP?`${numberText(d.pressionHP)} bar`:'' ],
  ['T° aspiration',d.tempAspiration?`${numberText(d.tempAspiration)} °C`:'' ],
  ['T° refoulement',d.tempRefoulement?`${numberText(d.tempRefoulement)} °C`:'' ],
  ['T° liquide',d.tempLiquide?`${numberText(d.tempLiquide)} °C`:'' ],
  ['Surchauffe',d.surchauffe?`${numberText(d.surchauffe)} K`:'' ],
  ['Sous-refroidissement',d.sousRefroidissement?`${numberText(d.sousRefroidissement)} K`:'' ],
  ['Air repris / soufflé',`${numberText(d.airRepris)} / ${numberText(d.airSouffle)} °C`],
  ['Delta T air',d.deltaAir?`${numberText(d.deltaAir)} K`:'' ],
  ['Air extérieur',d.airExterieur?`${numberText(d.airExterieur)} °C`:'' ],
  ['Départ / retour eau',`${numberText(d.departEau)} / ${numberText(d.retourEau)} °C`],
  ['Delta T eau',d.deltaEau?`${numberText(d.deltaEau)} K`:'' ]
 ];
 y=drawRows(page,font,bold,measures,y);

 if(y<250){page=pdf.addPage([595.28,841.89]);y=805}
 y=drawSection(page,bold,'FLUIDES ET OBSERVATIONS',y);
 y=drawRows(page,font,bold,[
  ['Fluide vierge chargé',d.fluideVierge?`${numberText(d.fluideVierge)} kg`:'' ],
  ['Fluide recyclé chargé',d.fluideRecycle?`${numberText(d.fluideRecycle)} kg`:'' ],
  ['Fluide régénéré chargé',d.fluideRegenere?`${numberText(d.fluideRegenere)} kg`:'' ],
  ['Fluide récupéré',d.fluideRecupere?`${numberText(d.fluideRecupere)} kg`:'' ]
 ],y);
 y=drawLabelValue(page,font,bold,'Observations',d.observations,32,y,531)-10;

 if(y<190){page=pdf.addPage([595.28,841.89]);y=805}
 page.drawText('Signatures',{x:32,y,size:12,font:bold,color:rgb(.09,.29,.41)});
 if(d.signatureTechnicien){
   const img=await pdf.embedPng(d.signatureTechnicien);
   page.drawText(`Technicien : ${cleanText(s.technicienNom)}`,{x:32,y:y-23,size:9,font:bold});
   page.drawImage(img,{x:32,y:y-125,width:220,height:85});
 }
 if(d.signatureClient){
   const img=await pdf.embedPng(d.signatureClient);
   page.drawText(`Client : ${cleanText(d.clientNom)}`,{x:320,y:y-23,size:9,font:bold});
   page.drawImage(img,{x:320,y:y-125,width:220,height:85});
 }

 const bytes=await pdf.save();
 downloadBytes(bytes,`${d.ficheNo}_${safeName(d.clientNom)}_rapport.pdf`);
 toast('Rapport PDF créé');
}
function setText(formPdf,name,value){
 try{formPdf.getTextField(name).setText(cleanText(value))}catch(_){}
}
function check(formPdf,name,on){
 try{const f=formPdf.getCheckBox(name);on?f.check():f.uncheck()}catch(_){}
}
async function createCerfaPdf(){
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

   const A=parseFloat(d.fluideVierge||0),B=parseFloat(d.fluideRecycle||0),C=parseFloat(d.fluideRegenere||0),E=parseFloat(d.fluideRecupere||0);
   setText(formPdf,'11_Quantite',(A+B+C)?numberText((A+B+C).toFixed(3)):'');
   setText(formPdf,'11_QA',A?numberText(A):'');
   setText(formPdf,'11_QB',B?numberText(B):'');
   setText(formPdf,'11_QC',C?numberText(C):'');
   setText(formPdf,'11_QDE',E?numberText(E):'');
   setText(formPdf,'11_QE',E?numberText(E):'');
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
$('#reportPdfBtn').onclick=createReportPdf;
$('#cerfaPdfBtn').onclick=createCerfaPdf;
$('#printBtn').onclick=()=>{saveDossier();setTimeout(()=>window.print(),350)};
$('#newBtn').onclick=newForm;
$('#saveSettings').onclick=saveSettings;
$('#historySearch').oninput=e=>renderHistory(e.target.value);
renderSettings();applyDefaults(true);calculate();renderHistory();

if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('./service-worker.js?v=0.2.0').catch(console.error))}


function showPlatformNote(){
 const isIOS=/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform==='MacIntel' && navigator.maxTouchPoints>1);
 if(isIOS && !window.matchMedia('(display-mode: standalone)').matches){
   toast('iPad : ouvrez avec Safari puis Partager → Ajouter à l’écran d’accueil');
 }
}
window.addEventListener('load',()=>setTimeout(showPlatformNote,800));
