(()=>{
'use strict';
const form=document.getElementById('gaz-form');
if(!form)return;
const $g=s=>document.querySelector(s), $$g=s=>[...document.querySelectorAll(s)];
const STORE='exbrayat_gaz_dossiers_v1';
const checks=[
'Nettoyage du corps de chauffe, du brûleur, de la veilleuse et de l’extracteur',
'Verification du circulateur du chauffage',
'Verification et réglage des organes de régulation',
'Verification des dispositifs de sécurité de l’appareil',
'Verification de l’état, de la nature et de la géométrie du conduit de raccordement',
'VMC gaz : sécurité individuelle et nettoyage du conduit de raccordement',
'Verification des débits de gaz et réglage éventuel',
'Contrôle de l’embouement du circuit hydraulique',
'Purge des bulles d’air du circuit hydraulique',
'Contrôle de la pression du circuit hydraulique',
'Verification du fonctionnement du circulateur du circuit hydraulique',
'Contrôle de la pression de gonflage des vases d’expansion',
'Évaluation du dimensionnement de la chaudière',
'Chaudière avec ballon : vérification des anodes et accessoires'
];
const extras=['Contrôle de la vacuité des conduits de fumée et pots de purge','Entretien et dépannage des dispositifs extérieurs à la chaudière','Détartrage'];
function renderChecklist(id,items,prefix){
 const box=document.getElementById(id); box.innerHTML='';
 items.forEach((txt,i)=>{
  const row=document.createElement('div'); row.className='gaz-check-row';
  row.innerHTML=`<div>${txt}</div><label><input type="radio" name="${prefix}${i}" value="Oui"> Oui</label><label><input type="radio" name="${prefix}${i}" value="Non"> Non</label><label><input type="radio" name="${prefix}${i}" value="Sans objet" checked> S/O</label>`;
  box.appendChild(row);
 });
}
renderChecklist('gazChecklist',checks,'gazCheck'); renderChecklist('gazChecklistExtra',extras,'gazExtra');
function setupCanvas(id){
 const c=document.getElementById(id),ctx=c.getContext('2d'); let drawing=false,last=null;
 function pos(e){const r=c.getBoundingClientRect(),t=e.touches?e.touches[0]:e;return{x:(t.clientX-r.left)*c.width/r.width,y:(t.clientY-r.top)*c.height/r.height}}
 function start(e){e.preventDefault();drawing=true;last=pos(e)}
 function move(e){if(!drawing)return;e.preventDefault();const p=pos(e);ctx.strokeStyle='#111';ctx.lineWidth=5;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(last.x,last.y);ctx.lineTo(p.x,p.y);ctx.stroke();last=p;c.dataset.signed='1'}
 function end(){drawing=false;last=null}
 c.addEventListener('pointerdown',start);c.addEventListener('pointermove',move);window.addEventListener('pointerup',end);
 c.addEventListener('touchstart',start,{passive:false});c.addEventListener('touchmove',move,{passive:false});c.addEventListener('touchend',end);
}
['gazSignatureTechnicien','gazSignatureClient'].forEach(setupCanvas);
function clearSig(id){const c=document.getElementById(id);c.getContext('2d').clearRect(0,0,c.width,c.height);c.dataset.signed='0'}
$$g('.gaz-clear-signature').forEach(b=>b.onclick=()=>clearSig(b.dataset.target));
function sig(id){const c=document.getElementById(id);return c.dataset.signed==='1'?c.toDataURL('image/png'):''}
function collect(){
 const fd=new FormData(form),o={}; for(const [k,v] of fd.entries())o[k]=v;
 o.signatureTechnicien=sig('gazSignatureTechnicien');o.signatureClient=sig('gazSignatureClient');o.savedAt=new Date().toISOString();return o;
}
function load(){try{return JSON.parse(localStorage.getItem(STORE)||'[]')}catch{return[]}}
function persist(list){localStorage.setItem(STORE,JSON.stringify(list))}
function formatDate(v){if(!v)return'';const [y,m,d]=v.split('-');return d&&m&&y?`${d}/${m}/${y}`:v}
function esc(s){return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function fill(d){form.reset();for(const [k,v] of Object.entries(d)){const els=form.elements[k];if(!els)continue;if(els.length&&els[0]?.type==='radio'){[...els].forEach(e=>e.checked=e.value===v)}else if(els.type==='radio')els.checked=els.value===v;else els.value=v||''} clearSig('gazSignatureTechnicien');clearSig('gazSignatureClient');setImage('gazSignatureTechnicien',d.signatureTechnicien);setImage('gazSignatureClient',d.signatureClient);updateCO();window.scrollTo({top:0,behavior:'smooth'})}
function setImage(id,data){if(!data)return;const c=document.getElementById(id),im=new Image();im.onload=()=>{c.getContext('2d').drawImage(im,0,0,c.width,c.height);c.dataset.signed='1'};im.src=data}
function renderHistory(q=''){const list=load().filter(d=>JSON.stringify(d).toLowerCase().includes(q.toLowerCase()));const box=$g('#gazHistoryList');box.innerHTML=list.length?'':'<p class="hint">Aucun entretien enregistré.</p>';list.forEach(d=>{const div=document.createElement('div');div.className='history-item';div.innerHTML=`<div><strong>${esc(d.gazClientNom||'Client')}</strong><p>${esc(formatDate(d.gazDate))} — ${esc(d.gazNumero||'Sans numéro')}</p></div><button type="button" class="secondary">Ouvrir</button>`;div.querySelector('button').onclick=()=>fill(d);box.appendChild(div)})}
function save(){const d=collect();if(!d.gazClientNom){alert('Veuillez renseigner le nom du client.');return}const list=load();const key=d.gazNumero||`${d.gazClientNom}-${d.gazDate}`;const i=list.findIndex(x=>(x.gazNumero||`${x.gazClientNom}-${x.gazDate}`)===key);if(i>=0)list[i]=d;else list.unshift(d);persist(list);renderHistory();toast('Entretien gaz enregistré')}
function newForm(){form.reset();clearSig('gazSignatureTechnicien');clearSig('gazSignatureClient');form.elements.gazDate.value=new Date().toISOString().slice(0,10);form.elements.gazNumero.value='GAZ-'+new Date().toISOString().slice(0,10).replaceAll('-','')+'-'+String(Date.now()).slice(-4);renderChecklist('gazChecklist',checks,'gazCheck');renderChecklist('gazChecklistExtra',extras,'gazExtra');updateCO();window.scrollTo({top:0,behavior:'smooth'})}
function updateCO(){const v=parseFloat(form.elements.gazCO.value),el=$g('#gazCoStatus');if(!Number.isFinite(v)){el.textContent='Saisissez la teneur en CO pour afficher l’évaluation.';el.className='status-info';return}if(v<10){el.textContent='CO inférieur à 10 ppm : situation normale.';el.className='status-info gaz-ok'}else if(v<50){el.textContent='CO entre 10 et 49 ppm : anomalie, investigations complémentaires nécessaires.';el.className='status-info gaz-warn'}else{el.textContent='CO supérieur ou égal à 50 ppm : danger grave et imminent, mise à l’arrêt nécessaire.';el.className='status-info gaz-danger'}}
form.elements.gazCO.addEventListener('input',updateCO);
function pdfSafe(text){return String(text??'').normalize('NFKC').replace(/₂/g,'2').replace(/₁/g,'1').replace(/₃/g,'3').replace(/⁰/g,'0').replace(/¹/g,'1').replace(/²/g,'2').replace(/³/g,'3').replace(/→/g,'->').replace(/≥/g,'>=').replace(/≤/g,'<=').replace(/−/g,'-').replace(/[^\u0009\u000A\u000D\u0020-\u00FF]/g,'?')}
function wrap(text,font,size,max){const words=pdfSafe(text).split(/\s+/),lines=[];let line='';for(const w of words){const t=line?line+' '+w:w;if(font.widthOfTextAtSize(t,size)<=max)line=t;else{if(line)lines.push(line);line=w}}if(line)lines.push(line);return lines}
async function createPdf(){
 const d=collect();
 if(!d.gazClientNom){alert('Veuillez renseigner le nom du client.');return}
 const isIOS=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
 let previewWindow=null;
 if(isIOS && !(navigator.canShare&&typeof File!=='undefined')){
  try{previewWindow=window.open('about:blank','_blank')}catch(_e){}
 }
 try{
  const templateResponse=await fetch('attestation-entretien-gaz-capeb.pdf?v=0.4.3.3',{cache:'no-store'});
  if(!templateResponse.ok)throw new Error('Le modèle CAPEB est introuvable.');
  const templateBytes=await templateResponse.arrayBuffer();
  const {PDFDocument,StandardFonts}=PDFLib;
  const pdf=await PDFDocument.load(templateBytes,{ignoreEncryption:true,updateMetadata:false});
  const formPdf=pdf.getForm();
  const font=await pdf.embedFont(StandardFonts.Helvetica);
  const safe=v=>pdfSafe(v||'');
  const setText=(name,value,size=8)=>{
   try{
    const f=formPdf.getTextField(name);
    f.setText(safe(value));
    if(typeof f.setFontSize==='function')f.setFontSize(size);
   }catch(e){console.warn('Champ PDF absent :',name,e)}
  };
  const selectRadio=(name,value)=>{
   try{formPdf.getRadioGroup(name).select(value)}catch(e){console.warn('Choix PDF absent :',name,value,e)}
  };
  const company='EXBRAYAT CEDRIC PLOMBERIE CHAUFFAGE\n26 avenue de Jumeaux\n63570 BRASSAC LES MINES\nTel : 06 17 16 15 38\ne-mail : cedric.exbrayat@orange.fr';
  const client=[d.gazClientNom,d.gazClientTel,d.gazClientAdresse].filter(Boolean).join('\n');
  setText('A2-Coordonnees prestataire',company,7);
  setText('A2-Coordonnees client',client,8);
  setText('A2-Adresse installation',d.gazInstallationAdresse,8);
  setText('A2-Local chaudiere',d.gazLocal,8);
  setText('A2-marque1',d.gazChaudiere,8);
  setText('A2-puissance1',d.gazPuissance,8);
  setText('A2-type1',d.gazEvacuation,8);
  setText('A2-mes1',formatDate(d.gazMiseService),8);
  setText('A2-ns1',d.gazSerie,8);
  setText('A2-marque2',d.gazBruleur,8);
  setText('A2-puissance2',d.gazBruleurPuissance,8);
  setText('A2-mes2',formatDate(d.gazBruleurDate),8);
  setText('A2-ns2',d.gazBruleurSerie,8);
  setText('A2-Date entretien',formatDate(d.gazDernierEntretien),8);
  setText('A2-Date ramonage',formatDate(d.gazDernierRamonage),8);
  setText('No contrat',d.gazNumero,8);

  const mainGroups=['A2-Groupe1','A2-Groupe2','A2-Groupe3','A2-Groupe4','A2-Groupe5','A2-Groupe6','A2-Groupe7','A2-Groupe8','A2-Groupe81','A2-Groupe82','A2-Groupe83','A2-Groupe84','A2-Groupe85','A2-Groupe86'];
  mainGroups.forEach((name,i)=>selectRadio(name,d['gazCheck'+i]==='Oui'?'Oui':d['gazCheck'+i]==='Non'?'Non':'SO'));
  ['A2-Groupe9','A2-Groupe10','A2-Groupe11'].forEach((name,i)=>selectRadio(name,d['gazExtra'+i]==='Oui'?'Oui':d['gazExtra'+i]==='Non'?'Non':'SO'));

  setText('A2-Temp fumees',d.gazTempFumees,9);
  setText('A2-Temp ambiante',d.gazTempAmbiante,9);
  setText('A2-Teneur co2',d.gazCO2,9);
  setText('A2-Teneur o2',d.gazO2,9);
  setText('A2-Teneur co',d.gazCO,9);
  setText('A2-Appareil mesure',d.gazAppareilMesure,8);
  setText('A2-Rendement1',d.gazRendement,9);
  setText('A2-Rendement2',d.gazRendementRef,9);
  setText('A2-nox',d.gazNox,9);
  const co=parseFloat(d.gazCO);
  if(Number.isFinite(co))selectRadio('A2-Groupe18',co<10?'Choix1':co<50?'Choix2':'Choix3');

  if(d.gazClasseType==='Standard ou basse température')selectRadio('A2-GClasse','Choix1');
  if(d.gazClasseType==='Condensation')selectRadio('A2-GClasse','Choix2');
  const classMap={
   'Standard ou basse température|Avant 2005':'Choix1',
   'Standard ou basse température|Après 2005':'Choix2',
   'Condensation|Avant 2005':'Choix3',
   'Condensation|Après 2005':'Choix4'
  };
  const fabChoice=classMap[(d.gazClasseType||'')+'|'+(d.gazClasseDate||'')];
  if(fabChoice)selectRadio('A2-GFab',fabChoice);

  setText('A2-Defauts corriges',d.gazDefauts||'Néant',8);
  setText('A2-Usage',d.gazConseils||'Aucun conseil complémentaire.',8);
  setText('A2-Ameliorations','',8);
  setText('A2-Remplacement','',8);
  setText('A2-Fait a','Brassac-les-Mines',8);
  setText('A2-Fait le',formatDate(d.gazDate),8);
  setText('A2-Date visite',formatDate(d.gazDate),8);

  try{formPdf.updateFieldAppearances(font)}catch(e){console.warn('Mise à jour des champs PDF :',e)}
  try{formPdf.flatten()}catch(e){console.warn('Aplatissement PDF :',e)}

  const page3=pdf.getPages()[2];
  if(d.signatureTechnicien){
   const im=await pdf.embedPng(d.signatureTechnicien);
   page3.drawImage(im,{x:62,y:58,width:205,height:92});
  }
  if(d.signatureClient){
   const im=await pdf.embedPng(d.signatureClient);
   page3.drawImage(im,{x:316,y:58,width:205,height:92});
  }

  const bytes=await pdf.save({useObjectStreams:false});
  const filename=`${d.gazNumero||'entretien_gaz'}_${(d.gazClientNom||'client').replace(/[^a-z0-9]+/gi,'_')}.pdf`;
  const blob=new Blob([bytes],{type:'application/pdf'});
  const file=typeof File!=='undefined'?new File([blob],filename,{type:'application/pdf'}):null;

  if(isIOS && file && navigator.canShare && navigator.canShare({files:[file]})){
   await navigator.share({files:[file],title:'Attestation entretien chaudière gaz',text:'Attestation à remettre au client et à archiver.'});
  }else{
   const url=URL.createObjectURL(blob);
   if(previewWindow&&!previewWindow.closed){previewWindow.location.href=url}
   else{
    const a=document.createElement('a');
    a.href=url;a.download=filename;a.target='_blank';a.rel='noopener';
    document.body.appendChild(a);a.click();a.remove();
   }
   setTimeout(()=>URL.revokeObjectURL(url),60000);
  }
  save();toast('Attestation CAPEB créée');
 }catch(e){
  if(previewWindow&&!previewWindow.closed)previewWindow.close();
  if(e&&e.name==='AbortError')return;
  console.error(e);alert('Impossible de créer le PDF : '+(e.message||e));
 }
}
$g('#gazSaveBtn').onclick=save;$g('#gazPdfBtn').onclick=createPdf;$g('#gazNewBtn').onclick=newForm;$g('#gazHistorySearch').oninput=e=>renderHistory(e.target.value);newForm();renderHistory();
})();
