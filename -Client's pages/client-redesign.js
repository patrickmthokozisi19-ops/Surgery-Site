/* Shared Client presentation and theme support. No patient data is persisted. */
(() => {
  "use strict";
  const root=document.querySelector(".client-dashboard");
  if(!root)return;
  const key="pweb_theme";
  const media=window.matchMedia("(prefers-color-scheme: dark)");
  const apply=()=>{
    let value=null;
    try{value=localStorage.getItem(key)}catch{}
    document.documentElement.dataset.theme=
      value==="dark"||value==="light"?value:(media.matches?"dark":"light");
  };
  const themePreference=()=>{
    try {const saved=localStorage.getItem(key);return saved==="light"||saved==="dark"?saved:"system";}
    catch{return "system";}
  };
  const updateControls=()=>{
    const selected=themePreference();
    root.querySelectorAll("[data-theme-choice]").forEach(btn=>{
      btn.setAttribute("aria-pressed",String(btn.dataset.themeChoice===selected));
    });
    const status=root.querySelector("#client-theme-status");
    if(status)status.textContent=selected==="system"
      ?"Following your device appearance"
      :selected==="dark"?"Dark appearance selected":"Light appearance selected";
  };
  root.addEventListener("click",event=>{
    const button=event.target.closest("[data-theme-choice]");
    if(!button)return;
    const value=button.dataset.themeChoice;
    if(!["light","dark","system"].includes(value))return;
    try{if(value==="system")localStorage.removeItem(key);else localStorage.setItem(key,value);}catch{}
    apply();updateControls();
  });
  apply();updateControls();
  if(media.addEventListener)media.addEventListener("change",apply);
  window.addEventListener("storage",e=>{if(e.key===key){apply();updateControls()}});
  const bar=root.querySelector(".client-double-nav");
  const burger=bar?.querySelector(".burger");
  const setMenu=(open)=>{
    bar?.classList.toggle("open",open);
    burger?.setAttribute("aria-expanded",String(open));
    burger?.setAttribute("aria-label",open?"Close navigation":"Open navigation");
  };
  burger?.addEventListener("click",()=>setMenu(!bar.classList.contains("open")));
  bar?.querySelectorAll(".bnavLinks a").forEach(a=>a.addEventListener("click",()=>setMenu(false)));
  document.addEventListener("keydown",e=>{if(e.key==="Escape")setMenu(false)});
  const searchInput=bar?.querySelector(".searchPlaceHolder");
  searchInput?.addEventListener("input",()=>{
    const q=searchInput.value.trim().toLowerCase();
    bar.querySelectorAll(".bnavLinks a").forEach(link=>{
      link.hidden=!!q && !link.textContent.toLowerCase().includes(q);
    });
    if(q)setMenu(true);
  });
  const signout=document.getElementById("clientSignout");
  if(signout)signout.addEventListener("click",()=>{
    // Authentication must be invalidated by the backend.
    // Do not fake a sign-out by deleting localStorage.
    root.dispatchEvent(new CustomEvent("pweb:patient-signout",{bubbles:true}));
    const handler=window.PwebPatientSignOut;
    if(typeof handler==="function"){handler();return;}
    alert("Sign out will be available when account authentication is connected.");
  });
})();
