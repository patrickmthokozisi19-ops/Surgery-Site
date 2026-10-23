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
  /* Same responsive navigation interaction as the Admin header. */
  const header=root.querySelector(".client-adm-header");
  const menu=header?.querySelector(".adm-menu");
  const nav=header?.querySelector(".adm-nav");
  const setMenu=open=>{
    nav?.classList.toggle("open",open);
    menu?.setAttribute("aria-expanded",String(open));
    menu?.setAttribute("aria-label",open?"Close patient navigation":"Open patient navigation");
    if(menu)menu.textContent=open?"Close":"Menu";
  };
  menu?.addEventListener("click",()=>setMenu(!nav.classList.contains("open")));
  nav?.querySelectorAll("a").forEach(a=>a.addEventListener("click",()=>setMenu(false)));
  document.addEventListener("keydown",e=>{if(e.key==="Escape")setMenu(false)});
  window.addEventListener("resize",()=>{if(window.innerWidth>850)setMenu(false)});
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
