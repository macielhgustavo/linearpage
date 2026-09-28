const header=document.querySelector('.site-header');
const menu=document.querySelector('.menu-button');
const mobile=document.querySelector('.mobile-nav');
window.addEventListener('scroll',()=>header.classList.toggle('scrolled',window.scrollY>20),{passive:true});
menu.addEventListener('click',()=>{const open=mobile.classList.toggle('open');menu.setAttribute('aria-expanded',String(open));menu.setAttribute('aria-label',open?'Fechar menu':'Abrir menu')});
mobile.querySelectorAll('a').forEach(link=>link.addEventListener('click',()=>{mobile.classList.remove('open');menu.setAttribute('aria-expanded','false')}));
const tabs=[...document.querySelectorAll('.demo-tabs [role="tab"]')];
const titles={overview:'Da planta ao setor',machine:'Comportamento por máquina',alerts:'Desvios com contexto'};
function activateTab(tab){tabs.forEach(item=>{const active=item===tab;item.setAttribute('aria-selected',String(active));item.tabIndex=active?0:-1;const panel=document.getElementById('view-'+item.dataset.view);panel.hidden=!active;panel.classList.toggle('active',active)});document.getElementById('screen-title').textContent=titles[tab.dataset.view]}
tabs.forEach((tab,index)=>{tab.addEventListener('click',()=>activateTab(tab));tab.addEventListener('keydown',event=>{if(!['ArrowRight','ArrowLeft','Home','End'].includes(event.key))return;event.preventDefault();let next=event.key==='Home'?0:event.key==='End'?tabs.length-1:(index+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;activateTab(tabs[next]);tabs[next].focus()})});
const machines={
'04':{code:'INJETORA 04 / PRODUÇÃO A',energy:'8,6 MWh',context:'Consumo no período · maior participação no setor',line:'M0 97 L25 98 L50 90 L75 73 L100 71 L125 78 L150 65 L175 69 L200 64 L225 42 L250 46 L275 54 L300 34 L325 46 L350 58 L375 51 L400 69 L425 56 L450 61 L475 52 L500 50'},
'02':{code:'INJETORA 02 / PRODUÇÃO A',energy:'4,9 MWh',context:'Consumo no período · comportamento estável',line:'M0 100 L25 94 L50 99 L75 91 L100 88 L125 95 L150 89 L175 91 L200 88 L225 90 L250 83 L275 87 L300 82 L325 86 L350 90 L375 85 L400 87 L425 83 L450 88 L475 81 L500 84'},
'e01':{code:'EXTRUSORA 01 / PRODUÇÃO B',energy:'5,7 MWh',context:'Consumo no período · perfil contínuo',line:'M0 75 L25 73 L50 76 L75 72 L100 69 L125 71 L150 68 L175 72 L200 69 L225 68 L250 65 L275 68 L300 65 L325 64 L350 67 L375 63 L400 65 L425 62 L450 64 L475 60 L500 62'}
};
document.querySelectorAll('.machine').forEach(button=>button.addEventListener('click',()=>{document.querySelectorAll('.machine').forEach(b=>b.classList.toggle('active',b===button));const selected=machines[button.dataset.machine];document.getElementById('machine-code').textContent=selected.code;document.getElementById('machine-energy').textContent=selected.energy;document.getElementById('machine-context').textContent=selected.context;document.getElementById('machine-line').setAttribute('d',selected.line)}));
document.getElementById('year').textContent=new Date().getFullYear();
