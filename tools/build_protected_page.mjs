import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const inputPath = path.join(root, "index.html");
const dataDir = path.join(root, "guarded-data");
const summaryPath = path.join(dataDir, "boot.js");
const chunkSize = 100;

const source = await fs.readFile(inputPath, "utf8");
const dataMatch = source.match(
  /<script id="property-data" type="application\/json">([\s\S]*?)<\/script>/
);

if (!dataMatch) {
  throw new Error("property-data script block was not found in index.html");
}

const properties = JSON.parse(dataMatch[1]);

const summary = properties.map((item) => ({
  i: item.id,
  n: item.name,
  x: item.lat,
  y: item.lng,
}));

const detailEntries = properties.map((item) => [
  item.id,
  {
    a: item.address,
    r: item.reit,
    p: item.appraisal,
    c: item.capRate,
    d: item.discountRate,
    t: item.terminalCapRate,
    u: item.use,
    s: item.structure,
    b: item.built,
    m: item.rentableArea,
    v: item.valuationDate,
  },
]);

const chunkKeys = [];
const chunks = [];
for (let index = 0; index < detailEntries.length; index += chunkSize) {
  const chunkKey = `p${String(index / chunkSize).padStart(2, "0")}`;
  chunkKeys.push(chunkKey);
  chunks.push({
    key: chunkKey,
    entries: detailEntries.slice(index, index + chunkSize),
  });
}

const encodePayload = (value) =>
  Buffer.from(JSON.stringify(value), "utf8").toString("base64");

await fs.rm(dataDir, { recursive: true, force: true });
await fs.mkdir(dataDir, { recursive: true });

await fs.writeFile(
  summaryPath,
  `window.__PG_PAYLOADS=window.__PG_PAYLOADS||{};window.__PG_PAYLOADS.b="${encodePayload(summary)}";`,
  "utf8"
);

for (const chunk of chunks) {
  const chunkPath = path.join(dataDir, `${chunk.key}.js`);
  const record = Object.fromEntries(chunk.entries);
  await fs.writeFile(
    chunkPath,
    `window.__PG_PAYLOADS=window.__PG_PAYLOADS||{};window.__PG_PAYLOADS["${chunk.key}"]="${encodePayload(record)}";`,
    "utf8"
  );
}

const protectedScript = String.raw`<script src="./guarded-data/boot.js"></script>
<script>
const DETAIL_CHUNK_SIZE=${chunkSize};
const DETAIL_CHUNK_KEYS=${JSON.stringify(chunkKeys)};
const decodePayload=(key)=>{const bag=window.__PG_PAYLOADS||{};const b64=bag[key];if(!b64)return null;const bin=atob(b64);const bytes=Uint8Array.from(bin,ch=>ch.charCodeAt(0));return JSON.parse(new TextDecoder().decode(bytes))};
const prime=decodePayload('b')||[];
const PROPERTIES=prime.map(item=>({id:item.i,name:item.n,lat:item.x,lng:item.y}));
const DETAIL_CACHE=new Map();
const LOADED_CHUNKS=new Set();
const CLUSTER_THRESHOLD=20;
const GRID_SIZE=52;
const esc=(s)=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ui={title:'\u4E0D\u52D5\u7523\u9274\u5B9A\u8A55\u4FA1\u30DE\u30C3\u30D7',move:'\u3053\u306E\u7269\u4EF6\u3078\u79FB\u52D5',detailLoading:'\u8A73\u7D30\u30C7\u30FC\u30BF\u3092\u8AAD\u307F\u8FBC\u307F\u4E2D\u3067\u3059',detailError:'\u8A73\u7D30\u306E\u8AAD\u307F\u8FBC\u307F\u306B\u5931\u6557\u3057\u307E\u3057\u305F',searchFallback:'\u5019\u88DC\u3092\u30AF\u30EA\u30C3\u30AF\u3059\u308B\u3068\u8A73\u7D30\u3092\u8AAD\u307F\u8FBC\u307F\u307E\u3059',addressError:'\u4F4F\u6240\u691C\u7D22\u306B\u5931\u6557\u3057\u307E\u3057\u305F',addressMiss:'\u4F4F\u6240\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093\u3067\u3057\u305F',clusterSuffix:'\u4EF6\u306E\u7269\u4EF6',attr:'\u5730\u56F3: <a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank" rel="noreferrer">\u56FD\u571F\u5730\u7406\u9662</a>'};
const map=L.map('map',{preferCanvas:true,zoomControl:true}).setView([36.3,138.2],5);
L.tileLayer('https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png',{maxZoom:18,attribution:ui.attr}).addTo(map);
const layer=L.layerGroup().addTo(map);
const detailsEl=document.getElementById('details');
const resultsEl=document.getElementById('searchResults');
let selectedId=null;
function fmt(v){return v&&String(v).trim()?esc(v):'<span style="color:#8a969c">-</span>'}
function fmtRate(v){const s=String(v??'').trim();if(!s)return'<span style="color:#8a969c">-</span>';const n=Number(s);return Number.isFinite(n)?n.toFixed(1):esc(s)}
function detailChunkKeyForId(id){const idx=Math.floor((Number(id)-1)/DETAIL_CHUNK_SIZE);return DETAIL_CHUNK_KEYS[idx]||null}
async function loadDetailChunk(chunkKey){
  if(!chunkKey)return;
  if(LOADED_CHUNKS.has(chunkKey))return;
  await new Promise((resolve,reject)=>{
    const script=document.createElement('script');
    script.src='./guarded-data/'+chunkKey+'.js';
    script.onload=()=>{LOADED_CHUNKS.add(chunkKey);resolve()};
    script.onerror=()=>reject(new Error(ui.detailError));
    document.head.appendChild(script);
  });
}
async function getDetail(id){
  if(DETAIL_CACHE.has(id))return DETAIL_CACHE.get(id);
  const chunkKey=detailChunkKeyForId(id);
  await loadDetailChunk(chunkKey);
  const payload=decodePayload(chunkKey);
  if(payload){
    Object.entries(payload).forEach(([k,v])=>DETAIL_CACHE.set(Number(k),v));
    delete window.__PG_PAYLOADS[chunkKey];
  }
  return DETAIL_CACHE.get(id)||null;
}
function renderDetailBody(property,detail){
  return '<h2 class="property-title">'+esc(property.name)+'</h2><dl class="kv"><dt>\u9451\u5B9A\u8A55\u4FA1\u984D</dt><dd>'+fmt(detail?.p)+'</dd><dt>\u9084\u5143\u5229\u56DE\u308A</dt><dd>'+fmtRate(detail?.c)+'</dd><dt>\u5272\u5F15\u7387</dt><dd>'+fmtRate(detail?.d)+'</dd><dt>\u6700\u7D42\u9084\u5143\u5229\u56DE\u308A</dt><dd>'+fmtRate(detail?.t)+'</dd><dt>\u7528\u9014</dt><dd>'+fmt(detail?.u)+'</dd><dt>\u69CB\u9020\u968E\u6570</dt><dd>'+fmt(detail?.s)+'</dd><dt>\u5EFA\u7BC9\u6642\u671F</dt><dd>'+fmt(detail?.b)+'</dd><dt>\u8CC3\u8CB8\u53EF\u80FD\u9762\u7A4D</dt><dd>'+fmt(detail?.m)+'</dd><dt>\u8A55\u4FA1\u6642\u70B9</dt><dd>'+fmt(detail?.v)+'</dd><dt>\u6295\u8CC7\u6CD5\u4EBA\u540D</dt><dd>'+fmt(detail?.r)+'</dd><dt>\u6240\u5728\u5730</dt><dd>'+fmt(detail?.a)+'</dd></dl><div class="actions"><button id="zoomToProperty">'+ui.move+'</button></div>';
}
async function renderDetails(property){
  selectedId=property.id;
  detailsEl.innerHTML='<h2 class="property-title">'+esc(property.name)+'</h2><div class="empty">'+ui.detailLoading+'</div>';
  renderMarkers();
  try{
    const detail=await getDetail(property.id);
    if(selectedId!==property.id)return;
    detailsEl.innerHTML=renderDetailBody(property,detail);
    document.getElementById('zoomToProperty').addEventListener('click',()=>map.setView([property.lat,property.lng],17));
  }catch(error){
    if(selectedId!==property.id)return;
    detailsEl.innerHTML='<h2 class="property-title">'+esc(property.name)+'</h2><div class="empty">'+esc(error.message||ui.detailError)+'</div>';
  }
}
function makePoint(property){
  const selected=property.id===selectedId;
  const size=selected?28:24;
  const icon=L.divIcon({className:'',html:'<div class="point-marker '+(selected?'is-selected':'')+'"></div>',iconSize:[size,size],iconAnchor:[size/2,size],popupAnchor:[0,-size]});
  const marker=L.marker([property.lat,property.lng],{icon,riseOnHover:true});
  marker.bindTooltip(esc(property.name),{className:'property-tip',direction:'top',offset:[0,-24]});
  marker.on('click',()=>renderDetails(property));
  return marker;
}
function makeCluster(items){
  const lat=items.reduce((acc,item)=>acc+item.lat,0)/items.length;
  const lng=items.reduce((acc,item)=>acc+item.lng,0)/items.length;
  const icon=L.divIcon({className:'',html:'<div class="cluster-marker">'+items.length+'</div>',iconSize:[42,42],iconAnchor:[21,21]});
  const marker=L.marker([lat,lng],{icon});
  marker.on('click',()=>{const bounds=L.latLngBounds(items.map(item=>[item.lat,item.lng]));if(map.getZoom()<17){map.fitBounds(bounds,{padding:[42,42],maxZoom:map.getZoom()+3})}else{map.fitBounds(bounds,{padding:[42,42]})}});
  marker.bindTooltip(items.length+ui.clusterSuffix,{className:'property-tip',direction:'top',offset:[0,-18]});
  return marker;
}
function visibleProperties(){const bounds=map.getBounds().pad(.08);return PROPERTIES.filter(item=>bounds.contains([item.lat,item.lng]))}
function renderMarkers(){
  layer.clearLayers();
  const zoom=map.getZoom();
  const groups=new Map();
  for(const property of visibleProperties()){
    const point=map.project([property.lat,property.lng],zoom);
    const key=Math.floor(point.x/GRID_SIZE)+','+Math.floor(point.y/GRID_SIZE);
    if(!groups.has(key))groups.set(key,[]);
    groups.get(key).push(property);
  }
  for(const items of groups.values()){
    if(items.length>=CLUSTER_THRESHOLD){layer.addLayer(makeCluster(items))}else{for(const property of items)layer.addLayer(makePoint(property))}
  }
}
map.on('moveend zoomend',renderMarkers);
function fitAll(){const bounds=L.latLngBounds(PROPERTIES.map(item=>[item.lat,item.lng]));map.fitBounds(bounds,{padding:[28,28]})}
fitAll();
renderMarkers();
function localMatches(query){
  const needle=query.trim().toLowerCase();
  if(!needle)return[];
  return PROPERTIES.filter(item=>item.name.toLowerCase().includes(needle)).slice(0,8);
}
function showResults(items){
  if(!items.length){resultsEl.style.display='none';resultsEl.innerHTML='';return}
  resultsEl.innerHTML=items.map((item,index)=>'<button type="button" data-index="'+index+'"><strong>'+esc(item.name)+'</strong><div class="muted">'+ui.searchFallback+'</div></button>').join('');
  [...resultsEl.querySelectorAll('button')].forEach((button,index)=>button.addEventListener('click',()=>{resultsEl.style.display='none';renderDetails(items[index]);map.setView([items[index].lat,items[index].lng],17)}));
  resultsEl.style.display='block';
}
async function gsiSearch(query){
  const url='https://msearch.gsi.go.jp/address-search/AddressSearch?q='+encodeURIComponent(query);
  const res=await fetch(url);
  if(!res.ok)throw new Error(ui.addressError);
  return await res.json();
}
document.getElementById('addressInput').addEventListener('input',event=>showResults(localMatches(event.target.value)));
document.getElementById('searchForm').addEventListener('submit',async event=>{
  event.preventDefault();
  const query=document.getElementById('addressInput').value.trim();
  if(!query)return;
  const local=localMatches(query);
  if(local.length){renderDetails(local[0]);map.setView([local[0].lat,local[0].lng],17);resultsEl.style.display='none';return}
  const btn=document.getElementById('searchButton');
  btn.disabled=true;
  try{
    const hits=await gsiSearch(query);
    if(hits&&hits[0]&&hits[0].geometry&&hits[0].geometry.coordinates){
      const [lng,lat]=hits[0].geometry.coordinates;
      map.setView([lat,lng],16);
      L.popup().setLatLng([lat,lng]).setContent(esc(hits[0].properties?.title||query)).openOn(map);
    }else{
      L.popup().setLatLng(map.getCenter()).setContent(ui.addressMiss).openOn(map);
    }
  }catch(error){
    L.popup().setLatLng(map.getCenter()).setContent(esc(error.message||ui.addressError)).openOn(map);
  }finally{
    btn.disabled=false;
    setTimeout(renderMarkers,250);
  }
});
document.addEventListener('click',event=>{if(!resultsEl.contains(event.target)&&!document.getElementById('searchForm').contains(event.target))resultsEl.style.display='none'});
</script>`;

const protectedHtml = source.replace(
  /<script id="property-data" type="application\/json">[\s\S]*?<\/script>\s*<script>[\s\S]*?<\/script>\s*<\/body>/,
  `${protectedScript}\n</body>`
);

await fs.writeFile(inputPath, protectedHtml, "utf8");

console.log(
  `Updated ${path.basename(inputPath)} and rebuilt ${path.basename(dataDir)}/`
);
