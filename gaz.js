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
 const d=collect();if(!d.gazClientNom){alert('Veuillez renseigner le nom du client.');return}
 try{
  const {PDFDocument,StandardFonts,rgb}=PDFLib,pdf=await PDFDocument.create(),font=await pdf.embedFont(StandardFonts.Helvetica),bold=await pdf.embedFont(StandardFonts.HelveticaBold);const W=595,H=842,M=38,blue=rgb(.09,.29,.41),line=rgb(.75,.8,.83);
  function page(title){const p=pdf.addPage([W,H]);const nativeDrawText=p.drawText.bind(p);p.drawText=(text,options)=>nativeDrawText(pdfSafe(text),options);p.drawText('EXBRAYAT PRO',{x:M,y:H-42,size:18,font:bold,color:blue});p.drawText(title,{x:M,y:H-67,size:14,font:bold,color:blue});p.drawText('EXBRAYAT CEDRIC PLOMBERIE CHAUFFAGE',{x:330,y:H-42,size:8,font:bold});p.drawText('26 avenue de Jumeaux - 63570 BRASSAC-LES-MINES',{x:330,y:H-55,size:7,font});p.drawText('Tél. 06 17 16 15 38',{x:330,y:H-67,size:7,font});p.drawLine({start:{x:M,y:H-78},end:{x:W-M,y:H-78},thickness:1,color:line});return p}
  function section(p,t,y){p.drawText(t,{x:M,y,size:11,font:bold,color:blue});p.drawLine({start:{x:M,y:y-4},end:{x:W-M,y:y-4},thickness:.7,color:line});return y-20}
  function field(p,label,val,x,y,w=240){p.drawText(label,{x,y,size:7,font:bold});const lines=wrap(val,font,8,w);lines.slice(0,2).forEach((l,i)=>p.drawText(l,{x,y:y-11-i*10,size:8,font}));return y-28}
  let p=page('ATTESTATION D’ENTRETIEN DE CHAUDIÈRE GAZ'),y=742;y=section(p,'CLIENT ET INSTALLATION',y);let yL=y,yR=y;yL=field(p,'N° du contrat / attestation',d.gazNumero,M,yL);yL=field(p,'Client',d.gazClientNom,M,yL);yL=field(p,'Téléphone',d.gazClientTel,M,yL);yL=field(p,'Adresse client',d.gazClientAdresse,M,yL);yR=field(p,'Date de visite',formatDate(d.gazDate),310,yR);yR=field(p,'Adresse installation',d.gazInstallationAdresse,310,yR);yR=field(p,'Local chaudière',d.gazLocal,310,yR);y=Math.min(yL,yR)-8;y=section(p,'CARACTÉRISTIQUES DE LA CHAUDIÈRE',y);yL=y;yR=y;yL=field(p,'Marque, modèle, type',d.gazChaudiere,M,yL);yL=field(p,'Puissance nominale Pn',d.gazPuissance,M,yL);yL=field(p,'Mode d’évacuation',d.gazEvacuation,M,yL);yL=field(p,'N° de série',d.gazSerie,M,yL);yR=field(p,'Mise en service',formatDate(d.gazMiseService),310,yR);yR=field(p,'Dernier entretien',formatDate(d.gazDernierEntretien),310,yR);yR=field(p,'Dernier ramonage',formatDate(d.gazDernierRamonage),310,yR);yR=field(p,'Brûleur / puissance / série',[d.gazBruleur,d.gazBruleurPuissance,d.gazBruleurSerie].filter(Boolean).join(' — '),310,yR);y=Math.min(yL,yR)-5;y=section(p,'PRESTATIONS ET POINTS DE CONTRÔLE',y);const all=[...checks.map((t,i)=>[t,d['gazCheck'+i]]),...extras.map((t,i)=>[t,d['gazExtra'+i]])];for(const [t,v] of all){if(y<55){p=page('ATTESTATION D’ENTRETIEN — CONTRÔLES (SUITE)');y=742}const ls=wrap(t,font,7,410);p.drawText(ls[0]||'',{x:M,y,size:7,font});if(ls[1])p.drawText(ls[1],{x:M,y:y-9,size:7,font});p.drawText(v||'Sans objet',{x:470,y,size:7,font:bold});y-=ls[1]?22:14}
  p=page('MESURES, CONCLUSIONS ET SIGNATURES');y=742;y=section(p,'MESURES APRÈS RÉGLAGE',y);const vals=[['Température fumées',d.gazTempFumees,'°C'],['Température ambiante',d.gazTempAmbiante,'°C'],['CO₂',d.gazCO2,'%'],['O₂',d.gazO2,'%'],['CO à proximité',d.gazCO,'ppm'],['Rendement évalué',d.gazRendement,'%'],['Rendement référence',d.gazRendementRef,'%'],['NOx évalués',d.gazNox,'mg/kWh']];vals.forEach((a,i)=>{const x=i%2?310:M,yy=y-Math.floor(i/2)*25;p.drawText(a[0],{x,y:yy,size:8,font:bold});p.drawText(`${a[1]||'—'} ${a[2]}`,{x:x+150,y:yy,size:8,font})});y-=115;y=field(p,'Appareil de mesure',d.gazAppareilMesure,M,y,500);const co=parseFloat(d.gazCO);let coTxt='CO non renseigné.';if(Number.isFinite(co))coTxt=co<10?'Situation normale.':co<50?'Anomalie : investigations complémentaires nécessaires.':'DANGER GRAVE ET IMMINENT : mise à l’arrêt nécessaire.';y=section(p,'ÉVALUATION DU CO',y);wrap(coTxt,bold,9,500).forEach((l,i)=>p.drawText(l,{x:M,y:y-i*12,size:9,font:bold,color:co>=50?rgb(.65,.05,.05):blue}));y-=42;y=section(p,'DÉFAUTS CORRIGÉS',y);wrap(d.gazDefauts||'Néant signalé.',font,8,500).slice(0,6).forEach((l,i)=>p.drawText(l,{x:M,y:y-i*11,size:8,font}));y-=82;y=section(p,'CONSEILS ET RECOMMANDATIONS',y);wrap(d.gazConseils||'Aucun conseil complémentaire.',font,8,500).slice(0,7).forEach((l,i)=>p.drawText(l,{x:M,y:y-i*11,size:8,font}));y-=95;p.drawText(`Fait le ${formatDate(d.gazDate)}`,{x:M,y,size:8,font:bold});p.drawText('Signature technicien',{x:M,y:y-25,size:8,font:bold});p.drawText('Signature client',{x:310,y:y-25,size:8,font:bold});p.drawRectangle({x:M,y:y-120,width:220,height:82,borderColor:line,borderWidth:1});p.drawRectangle({x:310,y:y-120,width:220,height:82,borderColor:line,borderWidth:1});if(d.signatureTechnicien){const im=await pdf.embedPng(d.signatureTechnicien);p.drawImage(im,{x:M+8,y:y-112,width:204,height:66})}if(d.signatureClient){const im=await pdf.embedPng(d.signatureClient);p.drawImage(im,{x:318,y:y-112,width:204,height:66})}p.drawText('Document à conserver au moins deux ans par le client et cinq ans par l’entreprise.',{x:M,y:22,size:7,font});
  const bytes=await pdf.save(),blob=new Blob([bytes],{type:'application/pdf'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`${d.gazNumero||'entretien_gaz'}_${(d.gazClientNom||'client').replace(/[^a-z0-9]+/gi,'_')}.pdf`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),2000);save();toast('Attestation gaz créée');
 }catch(e){console.error(e);alert('Impossible de créer le PDF : '+e.message)}
}
$g('#gazSaveBtn').onclick=save;$g('#gazPdfBtn').onclick=createPdf;$g('#gazNewBtn').onclick=newForm;$g('#gazHistorySearch').oninput=e=>renderHistory(e.target.value);newForm();renderHistory();
})();
