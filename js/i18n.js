(function(){
"use strict";
var KEY="deep-thoughts-language";
var lang="en";
var dictionary={"Home":"Domů","Mind Map":"Mapa myšlenek","AI Assistant":"AI asistent","Quick nav":"Rychlá navigace","Technologies":"Technologie","network engineering knowledge base":"znalostní báze síťového inženýrství","General / RFCs":"Obecné / RFC","Routing Protocols":"Směrovací protokoly","Network Security":"Síťová bezpečnost","Key RFCs":"Klíčová RFC","Theory":"Teorie","Troubleshoot":"Řešení problémů","Logs & Debug":"Logy a diagnostika","CLI Reference":"Přehled CLI","Setup":"Nastavení","Management":"Správa","Security Policy":"Bezpečnostní politika","Policy":"Politika","Objects":"Objekty","Certificates":"Certifikáty","Routing":"Směrování","Commands":"Příkazy","Pages":"Stránky","Notes":"Poznámky","Sub-topics":"Podtémata","Map":"Mapa","Built-in content":"Vestavěný obsah","Your notes":"Tvoje poznámky","Tools":"Nástroje"};
var originalTree=JSON.parse(JSON.stringify(TREE));
function translate(value){if(lang==="cs"&&dictionary[value])return dictionary[value];return value;}
function updateTree(){
 for(var i=0;i<TREE.length;i++){
  TREE[i].label=translate(originalTree[i].label);
  for(var j=0;j<TREE[i].subs.length;j++){
   TREE[i].subs[j].label=translate(originalTree[i].subs[j].label);
   for(var k=0;k<TREE[i].subs[j].pages.length;k++){
    TREE[i].subs[j].pages[k].label=translate(originalTree[i].subs[j].pages[k].label);
   }
  }
 }
}
function updateStatic(){
 var portal=document.getElementById("gateway-home-text");if(portal)portal.textContent=lang==="cs"?"Rozcestník":"Portal";
 var home=document.getElementById("gateway-home");if(home)home.title=lang==="cs"?"Hlavní rozcestník":"Main portal";
 var dict={"qn-home":"Home","qn-mm":"Mind Map","qn-ai":"AI Assistant"};
 Object.keys(dict).forEach(function(id){
  var el=document.getElementById(id);
  if(el&&el.lastChild)el.lastChild.textContent=translate(dict[id]);
 });
 var nav=document.querySelectorAll(".ns-div");
 if(nav.length>0)nav[0].textContent=translate("Quick nav");
 if(nav.length>1)nav[1].textContent=translate("Technologies");
 var sub=document.querySelector(".logo-sub");if(sub)sub.textContent=translate("network engineering knowledge base");
 var search=document.getElementById("si");if(search)search.placeholder=lang==="cs"?"Hledat stránky, příkazy a poznámky…":"Search pages, commands, your notes...";
 document.querySelectorAll("#nh-language-switch [data-lang]").forEach(function(btn){btn.setAttribute("aria-pressed",String(btn.dataset.lang===lang));});
 document.documentElement.lang=lang;
}
function switchTo(next){
 lang=next==="cs"?"cs":"en";
 try{localStorage.setItem(KEY,lang);}catch(e){}
 updateTree();
 if(typeof render==="function")render(CUR||"home");
 updateStatic();
}
document.querySelectorAll("#nh-language-switch [data-lang]").forEach(function(btn){btn.addEventListener("click",function(){switchTo(btn.dataset.lang);});});
var preferred="en";try{preferred=localStorage.getItem(KEY)||"en";}catch(e){}
switchTo(preferred);
window.addEventListener("hashchange",function(){requestAnimationFrame(updateStatic);});
})();