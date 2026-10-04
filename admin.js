const c=window.PERVUS_CONFIG||{};
const AUTH=`${c.supabaseUrl}/auth/v1`;
const REST=`${c.supabaseUrl}/rest/v1`;
const STORAGE=`${c.supabaseUrl}/storage/v1`;
const loginView=document.getElementById("loginView"),adminView=document.getElementById("adminView"),queue=document.getElementById("queue");
let session=null,pendingAction=null;

function anonHeaders(){return {"apikey":c.supabaseKey,"Content-Type":"application/json"}}
function authHeaders(extra={}){return {...anonHeaders(),"Authorization":`Bearer ${session.access_token}`,...extra}}
function esc(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))}
function saveSession(s){session=s;if(s)localStorage.setItem("pervus_admin_session",JSON.stringify(s));else localStorage.removeItem("pervus_admin_session")}
function showLogin(msg=""){loginView.hidden=false;adminView.hidden=true;document.getElementById("loginStatus").textContent=msg}
function showAdmin(){loginView.hidden=true;adminView.hidden=false;document.getElementById("adminEmail").textContent=session?.user?.email||"";loadQueue()}

async function refreshSession(){
  if(!session?.refresh_token)return false;
  try{
    const r=await fetch(`${AUTH}/token?grant_type=refresh_token`,{method:"POST",headers:anonHeaders(),body:JSON.stringify({refresh_token:session.refresh_token})});
    if(!r.ok)throw 0;saveSession(await r.json());return true;
  }catch(e){saveSession(null);return false}
}
async function api(url,opts={},retry=true){
  let r=await fetch(url,{...opts,headers:authHeaders(opts.headers||{})});
  if(r.status===401&&retry&&await refreshSession())r=await fetch(url,{...opts,headers:authHeaders(opts.headers||{})});
  return r;
}

document.getElementById("loginForm").addEventListener("submit",async e=>{
  e.preventDefault();const st=document.getElementById("loginStatus"),btn=document.getElementById("loginBtn");btn.disabled=true;st.textContent="Verifying nervous credentials...";
  try{
    const r=await fetch(`${AUTH}/token?grant_type=password`,{method:"POST",headers:anonHeaders(),body:JSON.stringify({email:document.getElementById("email").value.trim(),password:document.getElementById("password").value})});
    const data=await r.json();if(!r.ok)throw new Error(data.error_description||data.msg||"Sign in failed");
    saveSession(data);showAdmin();
  }catch(err){st.textContent=err.message||"Sign in failed."}finally{btn.disabled=false}
});
document.getElementById("logoutBtn").onclick=async()=>{try{await api(`${AUTH}/logout`,{method:"POST"})}catch(e){}saveSession(null);showLogin("Signed out.")};
document.getElementById("refreshBtn").onclick=loadQueue;

async function privateImage(path){
  const r=await api(`${STORAGE}/object/pervus-pending/${encodeURIComponent(path)}`);
  if(!r.ok)throw new Error("Cannot read pending photo");
  return URL.createObjectURL(await r.blob());
}
async function loadQueue(){
  queue.innerHTML='<div class="empty-queue">Checking incoming transmissions...</div>';
  try{
    const r=await api(`${REST}/pervus_sightings?select=id,display_name,location,caption,image_path,created_at&approved=eq.false&order=created_at.asc`);
    if(r.status===403)throw new Error("This account is not authorized as the Pervus admin.");
    if(!r.ok)throw new Error(await r.text());const rows=await r.json();
    document.getElementById("queueCount").textContent=`${rows.length} PENDING SIGHTING${rows.length===1?"":"S"}`;
    if(!rows.length){queue.innerHTML='<div class="empty-queue"><b>👽</b>THE QUEUE IS CLEAR<br><small>Pervus can relax briefly.</small></div>';return}
    queue.innerHTML="";
    for(const x of rows){
      const card=document.createElement("article");card.className="review-card";card.dataset.id=x.id;
      let src="";try{src=await privateImage(x.image_path)}catch(e){}
      card.innerHTML=`${src?`<img class="review-image" src="${src}" alt="Pending Pervus sighting">`:`<div class="empty-queue">PHOTO UNAVAILABLE</div>`}<div class="review-body"><div class="review-top"><div><strong>${esc(x.display_name)}</strong><div class="review-location">${esc(x.location||"Location classified")}</div></div><time>${new Date(x.created_at).toLocaleString()}</time></div>${x.caption?`<p class="review-caption">${esc(x.caption)}</p>`:""}<div class="review-actions"><button class="reject">✕ REJECT</button><button class="approve">✓ APPROVE</button></div></div>`;
      card.querySelector(".approve").onclick=()=>ask("approve",x);card.querySelector(".reject").onclick=()=>ask("reject",x);queue.appendChild(card);
    }
  }catch(err){queue.innerHTML=`<div class="empty-queue">${esc(err.message||"Control room connection failed.")}</div>`}
}

function ask(kind,x){
  pendingAction={kind,x};const approve=kind==="approve";
  document.getElementById("confirmTitle").textContent=approve?"Approve this sighting?":"Reject this sighting?";
  document.getElementById("confirmText").textContent=approve?"The photo will be promoted to the public gallery.":"The pending photo and its submission record will be permanently deleted.";
  const b=document.getElementById("confirmAction");b.textContent=approve?"✓ APPROVE":"✕ DELETE";b.className=approve?"good":"danger";document.getElementById("confirmSheet").hidden=false;
}
document.getElementById("cancelAction").onclick=()=>{pendingAction=null;document.getElementById("confirmSheet").hidden=true};
document.getElementById("confirmAction").onclick=async()=>{
  if(!pendingAction)return;const {kind,x}=pendingAction;document.getElementById("confirmSheet").hidden=true;
  const card=document.querySelector(`[data-id="${x.id}"]`);if(card)card.classList.add("busy");
  try{if(kind==="approve")await approve(x);else await reject(x);await loadQueue()}catch(err){alert(err.message||"Pervus control operation failed.");if(card)card.classList.remove("busy")}finally{pendingAction=null}
};

async function approve(x){
  // Download private pending object as authenticated admin.
  let r=await api(`${STORAGE}/object/pervus-pending/${encodeURIComponent(x.image_path)}`);if(!r.ok)throw new Error("Could not retrieve pending photo.");const blob=await r.blob();
  // Upload same object name to public approved bucket.
  r=await api(`${STORAGE}/object/pervus-approved/${encodeURIComponent(x.image_path)}`,{method:"POST",headers:{"Content-Type":"image/jpeg","x-upsert":"false"},body:blob});if(!r.ok)throw new Error("Could not promote photo.");
  // Mark DB row approved.
  r=await api(`${REST}/pervus_sightings?id=eq.${encodeURIComponent(x.id)}`,{method:"PATCH",headers:{"Prefer":"return=minimal"},body:JSON.stringify({approved:true})});
  if(!r.ok){await api(`${STORAGE}/object/pervus-approved/${encodeURIComponent(x.image_path)}`,{method:"DELETE"}).catch(()=>{});throw new Error("Could not approve database record.");}
  // Remove private pending copy.
  await api(`${STORAGE}/object/pervus-pending/${encodeURIComponent(x.image_path)}`,{method:"DELETE"});
}
async function reject(x){
  let r=await api(`${STORAGE}/object/pervus-pending/${encodeURIComponent(x.image_path)}`,{method:"DELETE"});
  if(!r.ok&&r.status!==404)throw new Error("Could not delete pending photo.");
  r=await api(`${REST}/pervus_sightings?id=eq.${encodeURIComponent(x.id)}`,{method:"DELETE",headers:{"Prefer":"return=minimal"}});
  if(!r.ok)throw new Error("Could not delete sighting record.");
}

(async()=>{
  try{const raw=localStorage.getItem("pervus_admin_session");if(raw)session=JSON.parse(raw)}catch(e){}
  if(session?.access_token){const r=await api(`${AUTH}/user`);if(r.ok){const u=await r.json();session.user=u;showAdmin();return}}
  showLogin();
})();