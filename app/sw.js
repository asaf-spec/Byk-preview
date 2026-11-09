// BYK web app: network-first for the page, cache-first for static assets → opens offline.
const CACHE = 'byk-v4';
self.addEventListener('install', (e) => { self.skipWaiting(); e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['./', './manifest.json', './icon-192.png', './sql-wasm-1.11.0.wasm']).catch(() => {}))); });
// a new version took over → just take control. (It used to also force-reload every open window; on Android that
// reload could land in the middle of the app starting and leave it stuck on a white screen. The app itself
// reloads into a new version when it comes back to the front.)
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const req = e.request; const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return; // Supabase calls go straight to the network
  // page: network first, but on weak signal don't wait — after 4s open the saved copy (otherwise a white screen for minutes)
  if (req.mode === 'navigate') {
    const net = fetch(req, { cache: 'no-store' }).then((r) => { if (r.ok) { const cp = r.clone(); caches.open(CACHE).then((c) => c.put('./', cp)); } return r; });
    const slow = new Promise((res) => setTimeout(res, 4000)).then(() => caches.match('./')).then((hit) => hit || net);
    e.respondWith(Promise.race([net.catch(() => caches.match('./')), slow]).then((r) => r || net));
    return;
  }
  e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((r) => { if (r.ok) { const cp = r.clone(); caches.open(CACHE).then((c) => c.put(req, cp)); } return r; })));
});
