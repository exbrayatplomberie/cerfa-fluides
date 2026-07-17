'use strict';

/*
  EXBRAYAT PRO — correctif rapport PDF sur 2 pages
  Ce fichier remplace uniquement la fonction createReportPdf().
  Il ne modifie ni le CERFA, ni l'historique, ni le pense-bête,
  ni la numérotation, ni les données enregistrées.
*/

async function createReportPdf(){
  ensureFicheNo();
  if(!form.reportValidity()) return;

  saveDossier();

  const d = formDataObject();
  const s = loadSettings();
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  // ---------------- PAGE 1 ----------------
  let page = pdf.addPage([595.28, 841.89]);

  page.drawRectangle({
    x: 0, y: 776, width: 595.28, height: 66,
    color: rgb(.09, .29, .41)
  });

  page.drawText("RAPPORT D'INTERVENTION", {
    x: 170, y: 808, size: 19, font: bold, color: rgb(1,1,1)
  });

  page.drawText(
    `Fiche ${cleanText(d.ficheNo)} - ${formatDateFr(d.dateIntervention)}`,
    {x:170, y:786, size:10, font, color:rgb(1,1,1)}
  );

  try{
    const logoBytes = await fetchBytes('logo-exbrayat.png');
    const logo = await pdf.embedPng(logoBytes);
    page.drawImage(logo, {x:30, y:646, width:118, height:110});
  }catch(_){}

  page.drawText(cleanText(s.entrepriseNom), {
    x:175, y:735, size:11, font:bold, color:rgb(.09,.29,.41)
  });
  page.drawText(cleanText(s.entrepriseAdresse), {x:175,y:715,size:9,font});
  page.drawText('Tel. 06 17 16 15 38', {x:175,y:697,size:9,font});
  page.drawText('ent.exbrayat@gmail.com', {x:175,y:679,size:9,font});
  page.drawText(`SIRET : ${cleanText(s.entrepriseSiret)}`, {x:175,y:661,size:9,font});

  page.drawLine({
    start:{x:32,y:632}, end:{x:563,y:632},
    thickness:1, color:rgb(.75,.82,.86)
  });

  let y = 608;

  y = drawSection(page, bold, 'CLIENT ET EQUIPEMENT', y);
  y = drawRows(page, font, bold, [
    ['Client', d.clientNom],
    ['Telephone', d.clientTel],
    ['Adresse', d.clientAdresse],
    ['Equipement', `${d.equipMarque||''} ${d.equipModele||''}`],
    ['No de serie', d.equipSerie],
    ['Localisation', d.equipLocalisation],
    ['Fluide', d.fluide],
    ['Charge totale', d.chargeTotale ? `${numberText(d.chargeTotale)} kg` : '']
  ], y);

  y = drawSection(page, bold, 'INTERVENTION ET CONTROLES', y);

  y = drawLabelValue(
    page, font, bold, "Nature de l'intervention",
    (d.nature||[]).join(', '), 32, y, 531
  ) - 6;

  y = drawLabelValue(
    page, font, bold, 'Controles realises',
    (d.controle||[]).join(', '), 32, y, 531
  ) - 6;

  drawRows(page, font, bold, [
    ['Detecteur', d.detecteurId],
    ['Controle le', formatDateFr(d.detecteurDate)]
  ], y);

  // ---------------- PAGE 2 ----------------
  page = pdf.addPage([595.28, 841.89]);

  page.drawRectangle({
    x:0, y:790, width:595.28, height:51,
    color:rgb(.09,.29,.41)
  });

  page.drawText('MESURES, FLUIDES ET SIGNATURES', {
    x:132, y:808, size:16, font:bold, color:rgb(1,1,1)
  });

  y = 760;

  y = drawSection(page, bold, 'MESURES TECHNIQUES', y);

  const measures = [
    ['Tension', d.tension ? `${numberText(d.tension)} V` : ''],
    ['Intensite totale', d.intensiteTotale ? `${numberText(d.intensiteTotale)} A` : ''],
    ['Intensite compresseur', d.intensiteComp ? `${numberText(d.intensiteComp)} A` : ''],
    ['Frequence', d.frequence ? `${numberText(d.frequence)} Hz` : ''],
    ['Pression BP', d.pressionBP ? `${numberText(d.pressionBP)} bar` : ''],
    ['Pression HP', d.pressionHP ? `${numberText(d.pressionHP)} bar` : ''],
    ['Temp. aspiration', d.tempAspiration ? `${numberText(d.tempAspiration)} C` : ''],
    ['Temp. refoulement', d.tempRefoulement ? `${numberText(d.tempRefoulement)} C` : ''],
    ['Temp. liquide', d.tempLiquide ? `${numberText(d.tempLiquide)} C` : ''],
    ['Surchauffe', d.surchauffe ? `${numberText(d.surchauffe)} K` : ''],
    ['Sous-refroidissement', d.sousRefroidissement ? `${numberText(d.sousRefroidissement)} K` : ''],
    ['Air repris / souffle', `${numberText(d.airRepris)} / ${numberText(d.airSouffle)} C`],
    ['Delta T air', d.deltaAir ? `${numberText(d.deltaAir)} K` : ''],
    ['Air exterieur', d.airExterieur ? `${numberText(d.airExterieur)} C` : ''],
    ['Depart / retour eau', `${numberText(d.departEau)} / ${numberText(d.retourEau)} C`],
    ['Delta T eau', d.deltaEau ? `${numberText(d.deltaEau)} K` : '']
  ];

  y = drawRows(page, font, bold, measures, y);

  y = drawSection(page, bold, 'FLUIDES ET OBSERVATIONS', y);

  y = drawRows(page, font, bold, [
    ['Fluide vierge charge', d.fluideVierge ? `${numberText(d.fluideVierge)} kg` : ''],
    ['Fluide recycle charge', d.fluideRecycle ? `${numberText(d.fluideRecycle)} kg` : ''],
    ['Fluide regenere charge', d.fluideRegenere ? `${numberText(d.fluideRegenere)} kg` : ''],
    ['Destine au traitement', d.fluideTraitement ? `${numberText(d.fluideTraitement)} kg` : ''],
    ['Conserve pour reutilisation', d.fluideReutilisation ? `${numberText(d.fluideReutilisation)} kg` : ''],
    ['No BSFF', d.numeroBSFF],
    ['Contenants', d.contenantsId],
    ['Destination', d.installationDestination]
  ], y);

  // Observations volontairement limitées à 3 lignes par la fonction existante.
  drawLabelValue(page, font, bold, 'Observations', d.observations, 32, y, 531);

  // Signatures fixées en bas de la page 2 : aucune 3e page n'est créée.
  const sigTitleY = 174;
  page.drawText('SIGNATURES', {
    x:32, y:sigTitleY, size:12, font:bold, color:rgb(.09,.29,.41)
  });

  page.drawLine({
    start:{x:32,y:166}, end:{x:563,y:166},
    thickness:1, color:rgb(.75,.82,.86)
  });

  page.drawText(`Technicien : ${cleanText(s.technicienNom)}`, {
    x:32, y:146, size:9, font:bold
  });

  page.drawText(`Client : ${cleanText(d.clientNom)}`, {
    x:320, y:146, size:9, font:bold
  });

  if(d.signatureTechnicien){
    const img = await pdf.embedPng(d.signatureTechnicien);
    page.drawImage(img, {x:32, y:48, width:220, height:85});
  }

  if(d.signatureClient){
    const img = await pdf.embedPng(d.signatureClient);
    page.drawImage(img, {x:320, y:48, width:220, height:85});
  }

  const bytes = await pdf.save();
  downloadBytes(
    bytes,
    `${d.ficheNo}_${safeName(d.clientNom)}_rapport.pdf`
  );

  toast('Rapport PDF cree sur 2 pages');
}
document.getElementById('reportPdfBtn').onclick = createReportPdf;
