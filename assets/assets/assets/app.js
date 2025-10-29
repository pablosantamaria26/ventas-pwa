const el = s=>document.querySelector(s);
let state = { user:null, clients:[], products:[], stats:null, view:'login', step:0 };

let deferredPrompt; const btnInstall = document.getElementById('btnInstall');
window.addEventListener('beforeinstallprompt', (e)=>{ e.preventDefault(); deferredPrompt=e; btnInstall.hidden=false; });
btnInstall?.addEventListener('click', async()=>{ if(!deferredPrompt) return; deferredPrompt.prompt(); await deferredPrompt.userChoice; deferredPrompt=null; btnInstall.hidden=true; });

window.addEventListener('online', ()=> { if(state.user) syncQueue(state.user); });

function renderGoogleBtn(){
  if(state.user) { el('#googleBtn').innerHTML=''; return; }
  google.accounts.id.initialize({
    client_id: 'TU_CLIENT_ID.apps.googleusercontent.com',
    callback: async (resp)=>{
      const { ok, user, error } = await api.gsiLogin(resp.credential);
      if(!ok){ alert('Login falló: '+error); return; }
      state.user=user; localStorage.setItem('user', JSON.stringify(user));
      const [cl, pr, st] = await Promise.all([
        api.clients(user.token), api.products(), api.stats(user.token)
      ]);
      state.clients = cl.data || [];
      state.products = pr.data || [];
      state.stats = st || null;
      state.view='home'; render();
    }
  });
  google.accounts.id.renderButton(document.getElementById('googleBtn'),
    { theme:'outline', size:'large', shape:'pill', logo_alignment:'left' });
}

function km(a,b){ const R=6371, toRad=x=>x*Math.PI/180;
  const dLat=toRad(b.lat-a.lat), dLng=toRad(b.lng-a.lng);
  const s1=Math.sin(dLat/2), s2=Math.sin(dLng/2);
  const aa=s1*s1+Math.cos(toRad(a.lat))*Math.cos(toRad(b.lat))*s2*s2;
  return R*2*Math.atan2(Math.sqrt(aa),Math.sqrt(1-aa));
}

function render(){
  const app = el('#app');
  if(!state.user){
    app.innerHTML = `<div class="card"><h2>Ingresá con Google</h2></div>`;
    renderGoogleBtn(); return;
  }

  const me = state.stats?.me || { visits:0, leads:0, orders:0, revenue:0 };
  app.innerHTML = `
    <div class="kpi">
      <div class="card"><div class="badge">Visitas</div><h2>${me.visits}</h2></div>
      <div class="card"><div class="badge">Leads</div><h2>${me.leads}</h2></div>
      <div class="card"><div class="badge">Pedidos</div><h2>${me.orders}</h2></div>
      <div class="card"><div class="badge">$ Ingresos</div><h2>${Number(me.revenue||0).toFixed(0)}</h2></div>
    </div>

    <div class="tabs">
      <button class="tab ${state.tab==='siguiente'?'active':''}" data-t="siguiente">Siguiente</button>
      <button class="tab ${state.tab==='clientes'?'active':''}" data-t="clientes">Clientes</button>
      <button class="tab ${state.tab==='catalogo'?'active':''}" data-t="catalogo">Catálogo</button>
    </div>
    <div id="view"></div>`;
  document.querySelectorAll('.tab').forEach(b=> b.onclick = (e)=>{ state.tab = e.target.dataset.t; render(); });
  state.tab = state.tab || 'siguiente';

  if(state.tab==='siguiente') renderRuta();
  if(state.tab==='clientes') renderClientes();
  if(state.tab==='catalogo') renderCatalogo();
}

function renderClientes(){
  const view = el('#view');
  view.innerHTML = `
    <div class="card">
      <div class="row grid-2">
        <input id="fCli" class="input" placeholder="Buscar cliente..." />
        <button id="btnRecalc">Cercanía</button>
      </div>
    </div>
    <div id="cliList" class="list"></div>`;
  
  const list = el('#cliList');
  const paint = (arr)=> list.innerHTML = arr.map(c=>`
    <div class="card">
      <strong>${c.name||'-'}</strong>
      <div class="badge">${c.city||''}</div>
      <div class="row grid-2">
        <button class="btnVisita" data-id="${c.id}">Visita</button>
        <button onclick="window.open('https://wa.me/${c.phone||''}','_blank')">WhatsApp</button>
      </div>
    </div>`).join('');

  paint(state.clients);

  el('#fCli').oninput = e=>{
    const t = e.target.value.toLowerCase();
    paint(state.clients.filter(c => (c.name||'').toLowerCase().includes(t)));
  };

  el('#btnRecalc').onclick = ()=>{
    if(!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(pos=>{
      const me = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      const arr = [...state.clients]
        .map(c=>({ ...c, _d: km(me, {lat:Number(c.geoLat), lng:Number(c.geoLng)}) }))
        .sort((a,b)=>a._d-b._d);
      paint(arr);
    });
  };

  list.addEventListener('click', ev=>{
    if(!ev.target.classList.contains('btnVisita')) return;
    const id = ev.target.dataset.id;
    const c = state.clients.find(x=>x.id===id);
    openTarjeta(c);
  });
}

