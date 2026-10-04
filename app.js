const c=window.PERVUS_CONFIG||{};
function link(id,url){
  const el=document.getElementById(id);
  if(!el)return;
  if(url){el.href=url;el.target="_blank";el.rel="noopener noreferrer";}
  else{el.addEventListener("click",e=>{e.preventDefault();alert("This portal isn't open yet. Pervus is working up the courage.");});}
}
link("pervusInstagram",c.pervusInstagram);
link("creatorInstagram",c.creatorInstagram);
link("creatorTikTok",c.creatorTikTok);
