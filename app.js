const c=window.PERVUS_CONFIG||{};
function link(id,url){const el=document.getElementById(id);if(!el)return;if(url){el.href=url;el.target="_blank";el.rel="noopener noreferrer";}}
link("pervusInstagram",c.pervusInstagram);link("creatorInstagram",c.creatorInstagram);link("creatorTikTok",c.creatorTikTok);
async function count(){const el=document.getElementById("encounters");if(!el||!c.supabaseUrl)return;try{const r=await fetch(c.supabaseUrl+"/rest/v1/rpc/get_pervus_encounter_count",{method:"POST",headers:{"apikey":c.supabaseKey,"Content-Type":"application/json"}});if(!r.ok)throw 0;const n=await r.json();el.textContent=Number(n)===1?"1 APPROVED ENCOUNTER":`${Number(n).toLocaleString()} APPROVED ENCOUNTERS`;}catch(e){el.textContent="THE EXACT NUMBER IS CLASSIFIED";}}
count();