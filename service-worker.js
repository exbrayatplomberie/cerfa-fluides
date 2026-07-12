
const CACHE='exbrayat-pro-v0.2.0-pdf-ipad';
const ASSETS=['./','./index.html','./style.css?v=0.2.0','./app.js?v=0.2.0','./pdf-lib.min.js?v=0.2.0','./manifest.webmanifest','./icon.svg','./cerfa_15497-04.pdf','./attestation-capacite.pdf'];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
 if(e.request.method!=='GET')return;
 if(e.request.mode==='navigate'){
   e.respondWith(fetch(e.request).then(r=>{const cp=r.clone();caches.open(CACHE).then(c=>c.put('./index.html',cp));return r}).catch(()=>caches.match('./index.html')));
 }else{
   e.respondWith(caches.match(e.request).then(cached=>cached||fetch(e.request).then(r=>{const cp=r.clone();caches.open(CACHE).then(c=>c.put(e.request,cp));return r})));
 }
});
