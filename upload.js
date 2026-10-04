const c=window.PERVUS_CONFIG||{};
const fileInput=document.getElementById("photo"), picker=document.getElementById("photoPicker"), preview=document.getElementById("preview");
const form=document.getElementById("sightingForm"), statusEl=document.getElementById("status"), submitBtn=document.getElementById("submitBtn");
const caption=document.getElementById("caption"), charCount=document.getElementById("charCount");
const progressWrap=document.getElementById("progressWrap"), progress=document.getElementById("progress");
let selectedFile=null, previewUrl=null;

picker.addEventListener("click",()=>fileInput.click());
caption.addEventListener("input",()=>charCount.textContent=caption.value.length);
fileInput.addEventListener("change",()=>{
  const f=fileInput.files?.[0]; if(!f)return;
  if(!["image/jpeg","image/png","image/webp"].includes(f.type)){statusEl.textContent="Pervus only accepts JPEG, PNG, or WebP evidence.";return;}
  selectedFile=f;
  if(previewUrl)URL.revokeObjectURL(previewUrl);
  previewUrl=URL.createObjectURL(f); preview.src=previewUrl; picker.classList.add("has-photo"); statusEl.textContent="";
});

function setProgress(n){progressWrap.style.display="block";progress.style.width=n+"%";}
function loadImage(file){return new Promise((resolve,reject)=>{const img=new Image();const u=URL.createObjectURL(file);img.onload=()=>{URL.revokeObjectURL(u);resolve(img)};img.onerror=()=>{URL.revokeObjectURL(u);reject(new Error("image"))};img.src=u;});}
async function processImage(file){
  const img=await loadImage(file), max=1800, scale=Math.min(1,max/Math.max(img.naturalWidth,img.naturalHeight));
  const w=Math.max(1,Math.round(img.naturalWidth*scale)),h=Math.max(1,Math.round(img.naturalHeight*scale));
  const canvas=document.createElement("canvas");canvas.width=w;canvas.height=h;
  const ctx=canvas.getContext("2d");ctx.fillStyle="#000";ctx.fillRect(0,0,w,h);ctx.drawImage(img,0,0,w,h);
  return await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error("encode")),"image/jpeg",0.84));
}
function uuid(){return crypto.randomUUID?crypto.randomUUID():"xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g,a=>{const r=Math.random()*16|0,v=a==="x"?r:(r&3|8);return v.toString(16)});}

form.addEventListener("submit",async e=>{
  e.preventDefault();
  if(!selectedFile){statusEl.textContent="Pervus requires photographic evidence.";return;}
  submitBtn.disabled=true;statusEl.textContent="Preparing evidence...";setProgress(12);
  let uploadedPath=null;
  try{
    const blob=await processImage(selectedFile);setProgress(38);
    const sightingId=uuid(), path=`${sightingId}.jpg`; uploadedPath=path;
    statusEl.textContent="Transmitting photo...";
    const up=await fetch(`${c.supabaseUrl}/storage/v1/object/pervus-pending/${encodeURIComponent(path)}`,{
      method:"POST",headers:{"apikey":c.supabaseKey,"Content-Type":"image/jpeg","x-upsert":"false"},body:blob
    });
    if(!up.ok)throw new Error("upload "+await up.text());setProgress(72);
    statusEl.textContent="Logging encounter...";
    const row={
      id:sightingId,
      display_name:document.getElementById("name").value.trim(),
      location:document.getElementById("location").value.trim()||null,
      caption:caption.value.trim()||null,
      image_path:path,
      approved:false
    };
    const db=await fetch(`${c.supabaseUrl}/rest/v1/pervus_sightings`,{
      method:"POST",headers:{"apikey":c.supabaseKey,"Content-Type":"application/json","Prefer":"return=minimal"},body:JSON.stringify(row)
    });
    if(!db.ok)throw new Error("db "+await db.text());
    setProgress(100);statusEl.textContent="✓ Sighting received. Pervus will inspect the evidence before it appears publicly.";
    form.reset();selectedFile=null;picker.classList.remove("has-photo");preview.removeAttribute("src");charCount.textContent="0";
    setTimeout(()=>{progressWrap.style.display="none";progress.style.width="0"},1200);
  }catch(err){
    console.error(err);statusEl.textContent="Transmission failed. Pervus requests another attempt.";progressWrap.style.display="none";progress.style.width="0";
  }finally{submitBtn.disabled=false;}
});

const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
async function loadGallery(){
  const box=document.getElementById("gallery"), count=document.getElementById("galleryCount");
  try{
    const r=await fetch(`${c.supabaseUrl}/rest/v1/pervus_sightings?select=display_name,location,caption,image_path,created_at&approved=eq.true&order=created_at.desc&limit=60`,{headers:{"apikey":c.supabaseKey}});
    if(!r.ok)throw new Error(await r.text());const rows=await r.json();
    count.textContent=rows.length?`${rows.length} CONFIRMED SIGHTING${rows.length===1?"":"S"}`:"NO CONFIRMED SIGHTINGS YET";
    if(!rows.length){box.innerHTML='<div class="gallery-empty">No approved photographic evidence yet.<br>Pervus remains difficult to document.</div>';return;}
    box.innerHTML=rows.map((x,i)=>{const src=`${c.supabaseUrl}/storage/v1/object/public/pervus-approved/${encodeURIComponent(x.image_path)}`;return `<article class="sighting" data-i="${i}"><img loading="lazy" src="${src}" alt="Pervus sighting by ${esc(x.display_name)}"><div class="sighting-meta"><strong>${esc(x.display_name)}</strong><small>${esc(x.location||"Location classified")}</small></div></article>`}).join("");
    box.querySelectorAll(".sighting").forEach(el=>el.onclick=()=>openLightbox(rows[Number(el.dataset.i)]));
  }catch(err){console.error(err);count.textContent="ARCHIVE CONNECTION LOST";box.innerHTML='<div class="gallery-empty">Pervus cannot access the sighting archive right now.</div>';}
}
const lightbox=document.getElementById("lightbox");
function openLightbox(x){document.getElementById("lightboxImage").src=`${c.supabaseUrl}/storage/v1/object/public/pervus-approved/${encodeURIComponent(x.image_path)}`;document.getElementById("lightboxInfo").innerHTML=`<strong>${esc(x.display_name)}</strong><small>${esc(x.location||"Location classified")} • ${new Date(x.created_at).toLocaleDateString()}</small>${x.caption?`<p>${esc(x.caption)}</p>`:""}`;lightbox.classList.add("open");lightbox.setAttribute("aria-hidden","false");}
function closeLightbox(){lightbox.classList.remove("open");lightbox.setAttribute("aria-hidden","true");}
document.getElementById("lightboxClose").onclick=closeLightbox;lightbox.addEventListener("click",e=>{if(e.target===lightbox)closeLightbox()});
loadGallery();