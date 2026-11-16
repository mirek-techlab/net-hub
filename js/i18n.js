// CZ/EN interface labels; technical reference content remains in its authored language.
(function(){
'use strict';
const KEY='deep-thoughts-language';
let locale='en';
const originals=TREE.map(t=>({label:t.label,subs:t.subs.map(s=>({label:s.label,pages:s.pages.map(p=>p.label)}))}));
const labels={
'Home':'Domů','Mind Map':'Mapa myšlenek','AI Assistant':'AI asistent','Quick nav':'Rychlá navigace','Technologies':'Technologie','Search...':'Hledat…',
'Network Engineering Knowledge Base':'Znalostní báze síťového inženýrství','network engineering knowledge base':'znalostní báze síťového inženýrství',
'General / RFCs':'Obecné / RFC','Routing Protocols':'Směrovací protokoly','Network Security':'Síťová bezpečnost','Key RFCs':'Klíčová RFC',
'Theory':'Teorie','Theory & Objects':'Teorie a objekty','Troubleshoot':'Řešení problémů','Logs & Debug':'Logy a diagnostika',
'CLI Reference':'Přehled CLI','Setup':'Nastavení','Management':'Správa','Security Policy':'Bezpečnostní politika',
'Policies':'Politiky','Policy':'Politika','Objects':'Objekty','Certificates':'Certifikáty','Provisioning':'Zprovoznění',
'Routing':'Směrování','Commands':'Příkazy','Pages':'Stránky','Sub-topics':'Podtémata','Notes':'Poznámky','Map':'Mapa',
'Your notes':'Tvoje poznámky','Built-in content':'Vestavěný obsah','Tools':'Nástroje',
'New page':'Nová stránka','Create':'Vytvořit','Page not found':'Stránka nenalezena'};
function cv(v){return locale==='cs'?(labels[v]||v):v}
function translateTree(){
 TREE.forEach((t,i)=>{t.label=cv(originals[i].label);t.subs.forEach((sub,j)=>{sub.label=cv(originals[i].subs[j].label);sub.pages.forEach((p,k)=>p.label=cv(originals[i].subs[j].pages[k])})})});
}
function localizeDom(){
 const gateway=document.getElementById('gateway-home-text');if(gateway)gateway.textContent=locale==='cs'?'Rozcestník':'Portal';
 const top=document.getElementById('gateway-home');if(top)top.title=locale==='cs'?'Hlavní rozcestník':'Main portal';
 const n=document.querySelectorAll('.n-static');n.forEach(el=>{
   if(el.id==='qn-home')el.lastChild.textContent=cv('Home');
   else if(el.id==='qn-mm')el.lastChild.textContent=cv('Mind Map');
   else if(el.id==='qn-ai')el.lastChild.textContent=cv('AI Assistant');
 });
 document.querySelectorAll('.ns-div').forEach((el,i)=>{if(i===0)el.textContent=cv('Quick nav');else if(i===1)el.textContent=cv('Technologies')});
 const subtitle=document.querySelector('.logo-sub');if(subtitle)subtitle.textContent=cv('network engineering knowledge base');
 const searchButton=document.querySelector('.srch-btn');if(searchButton){for(const node of searchButton.childNodes){if(node.nodeType===3&&node.textContent.includes('Search'))node.textContent=node.textContent.replace(/Search\.\.\.|Hledat…/g,locale==='cs'?'Hledat…':'Search...')}}
 const input=document.getElementById('si');if(input)input.placeholder=locale==='cs'?'Hledat stránky, příkazy a poznámky…':'Search pages, commands, your notes...';
 document.querySelectorAll('[data-lang]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.lang===locale)));
 document.documentElement.lang=locale;
}
function setLanguage(next){
 locale=next==='cs'?'cs':'en';
 try{localStorage.setItem(KEY,locale)}catch(e){}
 translateTree();
 if(typeof render==='function')render(CUR||'home');
 localizeDom();
}
document.querySelectorAll('#nh-language-switch [data-lang]').forEach(b=>b.addEventListener('click',()=>setLanguage(b.dataset.lang)));
let initial='en';try{initial=localStorage.getItem(KEY)||'en'}catch(e){}
setLanguage(initial);
// The app rerenders dynamic navigation. Reapply translated fixed labels on route changes.
window.addEventListener('hashchange',()=>requestAnimationFrame(localizeDom));
})();
