const header=document.querySelector('.site-header');
const menu=document.querySelector('.menu-button');
const mobile=document.querySelector('.mobile-nav');
if(header)window.addEventListener('scroll',()=>header.classList.toggle('scrolled',window.scrollY>20),{passive:true});
if(menu&&mobile){
  menu.addEventListener('click',()=>{const open=mobile.classList.toggle('open');menu.setAttribute('aria-expanded',String(open));menu.setAttribute('aria-label',open?'Fechar menu':'Abrir menu')});
  mobile.querySelectorAll('a').forEach(link=>link.addEventListener('click',()=>{mobile.classList.remove('open');menu.setAttribute('aria-expanded','false')}));
}
const year=document.getElementById('year');if(year)year.textContent=new Date().getFullYear();

const params=new URLSearchParams(location.search);
const acquisition={
  source:params.get('ref')||document.referrer||'direct',
  utmSource:params.get('utm_source')||'',
  utmMedium:params.get('utm_medium')||'',
  utmCampaign:params.get('utm_campaign')||''
};
let sessionId=sessionStorage.getItem('linear_smoke_session');
if(!sessionId){sessionId=crypto.randomUUID();sessionStorage.setItem('linear_smoke_session',sessionId)}
const sent=new Set();
async function track(name,metadata={}){
  const once=['landing_view','scroll_50','demo_view','how_it_works_view'];
  if(once.includes(name)&&sent.has(name))return;
  if(once.includes(name))sent.add(name);
  try{
    await fetch('/events',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({
      sessionId,name,path:location.pathname,metadata,...acquisition
    }),keepalive:true});
  }catch{}
}
track('landing_view');
let scroll50=false;
window.addEventListener('scroll',()=>{
  if(scroll50)return;
  const max=document.documentElement.scrollHeight-innerHeight;
  if(max>0&&scrollY/max>=.5){scroll50=true;track('scroll_50')}
},{passive:true});
document.querySelectorAll('[data-event]').forEach(el=>el.addEventListener('click',()=>track(el.dataset.event,{cta:el.dataset.cta||''})));
const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{
  if(entry.isIntersecting){track(entry.target.dataset.trackSection);observer.unobserve(entry.target)}
}),{threshold:.35});
document.querySelectorAll('[data-track-section]').forEach(section=>observer.observe(section));

const form=document.getElementById('interest-form');
const status=document.getElementById('interest-status');
const success=document.getElementById('interest-success');
let started=false;
if(form){
  form.addEventListener('focusin',()=>{if(!started){started=true;track('form_start')}},{once:true});
  form.addEventListener('submit',async event=>{
    event.preventDefault();
    const submit=form.querySelector('button[type="submit"]');
    const data=Object.fromEntries(new FormData(form).entries());
    if(!data.contact?.trim()||!data.company?.trim()||!data.phone?.trim()){
      status.textContent='Preencha nome, empresa e telefone para continuar.';
      track('form_error',{reason:'required'});
      return;
    }
    submit.disabled=true;submit.textContent='Enviando…';status.textContent='';
    try{
      const response=await fetch('/interest',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({...data,...acquisition})});
      if(!response.ok){const body=await response.json().catch(()=>({}));throw new Error(body.error||'Não foi possível enviar.')}
      await track('form_submit',{energyBill:data.energyBill||'',interest:data.interest||''});
      form.hidden=true;success.hidden=false;
    }catch(error){
      status.textContent=error instanceof Error?error.message:'Não foi possível enviar. Tente novamente.';
      track('form_error',{reason:'request'});
    }finally{
      submit.disabled=false;submit.textContent='Quero avaliar minha indústria';
    }
  });
}
