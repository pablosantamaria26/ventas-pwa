const API_BASE = 'https://script.google.com/macros/s/AKfycbww8ib2GwPrkra_nhyucrOrgrgjGsowVJ2hLrURFN104ffAS8n4SE0Qqe7rk1_JVR4pTg/exec';

const api = {
  async gsiLogin(idToken){
    const r = await fetch(`${API_BASE}?route=gsilogin`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ idToken })
    });
    return r.json();
  },
  async clients(token){ const r=await fetch(`${API_BASE}?route=clients&token=${encodeURIComponent(token)}`); return r.json(); },
  async products(){ const r=await fetch(`${API_BASE}?route=products`); return r.json(); },
  async stats(token){ const r=await fetch(`${API_BASE}?route=stats&token=${encodeURIComponent(token)}`); return r.json(); },
  async post(route, payload){
    const r = await fetch(`${API_BASE}?route=${route}`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify(payload)
    });
    return r.json();
  }
};

// Cola offline mínima
const queue = {
  push(item){ const q=JSON.parse(localStorage.getItem('queue')||'[]'); q.push(item); localStorage.setItem('queue', JSON.stringify(q)); },
  all(){ return JSON.parse(localStorage.getItem('queue')||'[]'); },
  clear(){ localStorage.removeItem('queue'); }
};
async function syncQueue(user){
  if(!user) return;
  const q = queue.all();
  for(const it of q){
    try{ await api.post(it.route, { ...it.payload, email: user.email }); }
    catch(e){ console.warn('sync fail', e); return; }
  }
  queue.clear();
}
