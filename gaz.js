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
 if(isIOS){
  try{
   previewWindow=window.open('about:blank','_blank');
   if(previewWindow)previewWindow.document.write('<p style="font-family:Arial;padding:20px">Création de l’attestation en cours…</p>');
  }catch(_e){}
 }
 try{
  const response=await fetch('attestation-entretien-gaz-capeb.pdf?v=0.4.3.4',{cache:'no-store'});
  if(!response.ok)throw new Error('Le modèle CAPEB est introuvable.');
  const templateBytes=await response.arrayBuffer();
  const {PDFDocument,StandardFonts,rgb}=PDFLib;
  const pdf=await PDFDocument.load(templateBytes,{ignoreEncryption:true,updateMetadata:false});
  const pages=pdf.getPages();
  const font=await pdf.embedFont(StandardFonts.Helvetica);
  const bold=await pdf.embedFont(StandardFonts.HelveticaBold);
  const black=rgb(0,0,0);

  // Le formulaire PDF CAPEB d'origine est mal interprété par certains lecteurs,
  // notamment Safari/iPad. On l'aplatit puis on écrit directement sur les pages.
  try{pdf.getForm().flatten()}catch(e){console.warn('Aplatissement du modèle CAPEB :',e)}

  const clean=v=>pdfSafe(v||'');
  function fitSize(text,f,maxSize,maxWidth){
   let s=maxSize;
   while(s>5&&f.widthOfTextAtSize(clean(text),s)>maxWidth)s-=0.25;
   return s;
  }
  function drawLine(page,text,x,y,w,size=8,f=font){
   const value=clean(text); if(!value)return;
   page.drawText(value,{x,y,size:fitSize(value,f,size,w),font:f,color:black,maxWidth:w});
  }
  function drawBox(page,text,x,y,w,h,size=8,f=font,lineHeight=size+2){
   const value=clean(text); if(!value)return;
   const lines=wrap(value,f,size,w-2);
   let yy=y+h-size-1;
   const max=Math.max(1,Math.floor(h/lineHeight));
   lines.slice(0,max).forEach(line=>{page.drawText(line,{x:x+1,y:yy,size,font:f,color:black,maxWidth:w-2});yy-=lineHeight});
  }
  function mark(page,x,y){
   page.drawLine({start:{x:x-3.2,y:y-3.2},end:{x:x+3.2,y:y+3.2},thickness:1.6,color:black});
   page.drawLine({start:{x:x-3.2,y:y+3.2},end:{x:x+3.2,y:y-3.2},thickness:1.6,color:black});
  }
  function markChoice(page,value,y){
   const x=value==='Oui'?428.3:value==='Non'?461.3:508.2;
   mark(page,x,y);
  }

  const p1=pages[0],p2=pages[1],p3=pages[2];
  const company='EXBRAYAT CEDRIC PLOMBERIE CHAUFFAGE\n26 avenue de Jumeaux\n63570 BRASSAC LES MINES\nTel : 06 17 16 15 38\ne-mail : cedric.exbrayat@orange.fr';
  const client=[d.gazClientNom,d.gazClientTel,d.gazClientAdresse].filter(Boolean).join('\n');

  drawLine(p1,d.gazNumero,118,772,138,9,bold);
  drawBox(p1,company,75,516,215,97,7,font,10);
  drawBox(p1,client,324,584,214,33,8,font,10);
  drawLine(p1,d.gazInstallationAdresse,324,556,213,8);
  drawLine(p1,d.gazLocal,324,523,213,8);
  drawLine(p1,d.gazChaudiere,116,481,173,8);
  drawLine(p1,d.gazPuissance,183,468.5,106,8);
  drawLine(p1,d.gazEvacuation,150,455.5,139,8);
  drawLine(p1,formatDate(d.gazMiseService),146,443,143,8);
  drawLine(p1,d.gazSerie,123,430.5,166,8);
  drawLine(p1,d.gazBruleur,369,481,169,8);
  drawLine(p1,d.gazBruleurPuissance,433,468.5,105,8);
  drawLine(p1,formatDate(d.gazBruleurDate),394,455.5,144,8);
  drawLine(p1,d.gazBruleurSerie,370,443,168,8);
  drawLine(p1,formatDate(d.gazDernierEntretien),201,407,93,8);
  drawLine(p1,formatDate(d.gazDernierRamonage),444,407,94,8);

  const mainY=[358.3,339.0,326.0,313.0,300.1,287.3,274.4,261.5,248.7,236.0,223.0,210.1,192.0,169.6];
  mainY.forEach((y,i)=>markChoice(p1,d['gazCheck'+i]||'Sans objet',y));
  const extraY=[111.3,97.9,85.3];
  extraY.forEach((y,i)=>markChoice(p1,d['gazExtra'+i]||'Sans objet',y));

  drawLine(p2,d.gazTempFumees,158,714,53,9);
  drawLine(p2,d.gazTempAmbiante,151,693,59,9);
  drawLine(p2,d.gazCO2,66,662,53,9);
  drawLine(p2,d.gazO2,153,662,54,9);
  drawLine(p2,d.gazCO,431,741,54,9,bold);
  drawBox(p2,d.gazAppareilMesure,57,508,482,96,8,font,11);
  drawLine(p2,d.gazRendement,185,466,53,9);
  drawLine(p2,d.gazRendementRef,219,439.5,53,9);
  drawLine(p2,d.gazNox,464,476,74,9);

  const co=parseFloat(d.gazCO);
  if(Number.isFinite(co))mark(p2,309.5,co<10?731:co<50?717.5:684.8);
  if(d.gazClasseType==='Standard ou basse température')mark(p2,191.2,370.3);
  if(d.gazClasseType==='Condensation')mark(p2,161.8,339.0);
  const classKey=(d.gazClasseType||'')+'|'+(d.gazClasseDate||'');
  const classY={
   'Standard ou basse température|Avant 2005':378.4,
   'Standard ou basse température|Après 2005':362.8,
   'Condensation|Avant 2005':347.0,
   'Condensation|Après 2005':331.5
  }[classKey];
  if(classY)mark(p2,319.2,classY);

  drawBox(p3,d.gazDefauts||'Néant',57,643,482,108,8,font,11);
  drawBox(p3,d.gazConseils||'Aucun conseil complémentaire.',57,491,482,104,8,font,11);
  drawLine(p3,'Néant',57,457,480,8);
  drawLine(p3,'Néant',57,329,480,8);
  drawLine(p3,'Brassac-les-Mines',79,179,130,8);
  drawLine(p3,formatDate(d.gazDate),222,179,99,8);
  drawLine(p3,formatDate(d.gazDate),117,164,420,8);

  if(d.signatureTechnicien){
   const im=await pdf.embedPng(d.signatureTechnicien);
   const dims=im.scale(1);const maxW=205,maxH=72,scale=Math.min(maxW/dims.width,maxH/dims.height);
   const w=dims.width*scale,h=dims.height*scale;
   p3.drawImage(im,{x:62+(maxW-w)/2,y:54+(maxH-h)/2,width:w,height:h});
  }
  if(d.signatureClient){
   const im=await pdf.embedPng(d.signatureClient);
   const dims=im.scale(1);const maxW=205,maxH=72,scale=Math.min(maxW/dims.width,maxH/dims.height);
   const w=dims.width*scale,h=dims.height*scale;
   p3.drawImage(im,{x:320+(maxW-w)/2,y:54+(maxH-h)/2,width:w,height:h});
  }

  const bytes=await pdf.save({useObjectStreams:false,addDefaultPage:false});
  const filename=`${d.gazNumero||'entretien_gaz'}_${(d.gazClientNom||'client').replace(/[^a-z0-9]+/gi,'_')}.pdf`;
  const blob=new Blob([bytes],{type:'application/pdf'});

  save();
  if(isIOS){
   // Sur iPad, un onglet est ouvert dès le clic afin d'éviter le blocage Safari
   // provoqué par les traitements asynchrones. Le PDF est ensuite injecté dedans.
   let binary='';const chunk=0x8000;
   for(let i=0;i<bytes.length;i+=chunk)binary+=String.fromCharCode.apply(null,bytes.subarray(i,Math.min(i+chunk,bytes.length)));
   const dataUrl='data:application/pdf;base64,'+btoa(binary);
   if(previewWindow&&!previewWindow.closed){previewWindow.location.replace(dataUrl)}
   else{window.location.href=dataUrl}
  }else{
   const url=URL.createObjectURL(blob);
   const a=document.createElement('a');a.href=url;a.download=filename;a.target='_blank';a.rel='noopener';
   document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
  }
  toast('Attestation CAPEB créée');
 }catch(e){
  if(previewWindow&&!previewWindow.closed)previewWindow.close();
  console.error(e);alert('Impossible de créer le PDF : '+(e.message||e));
 }
}
$g('#gazSaveBtn').onclick=save;$g('#gazPdfBtn').onclick=createPdf;$g('#gazNewBtn').onclick=newForm;$g('#gazHistorySearch').oninput=e=>renderHistory(e.target.value);newForm();renderHistory();
})();
