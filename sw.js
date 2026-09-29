// isHere · service worker mínimo.
// Siempre pide primero a internet (así nunca se queda una versión vieja)
// y solo usa la copia guardada si no hay conexión.
// v2: corrige el nombre del manifest (manifest.json) y evita la caché del navegador.
const CACHE = "ishere-v2";
const BASICOS = ["./", "./index.html", "./manifest.json", "./icon-192.png", "./icon-512.png", "./logo-mark.png"];

self.addEventListener("install", (e) => {
  // Si algún archivo falla, el resto se guarda igual (antes un solo fallo impedía instalar).
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => Promise.all(BASICOS.map((u) => c.add(new Request(u, { cache: "reload" })).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);
  // Solo archivos propios y peticiones GET; Supabase, Stripe, mapas, etc. van directos a internet.
  if (req.method !== "GET" || url.origin !== self.location.origin) return;
  // Las páginas (html) se piden siempre frescas al servidor, sin usar la caché del navegador.
  const esPagina = req.mode === "navigate" || url.pathname.endsWith(".html") || url.pathname.endsWith("/");
  // (Las navegaciones no se pueden copiar con opciones: se pide la misma dirección como texto.)
  const pedir = esPagina ? fetch(req.url, { cache: "no-cache", credentials: "same-origin" }) : fetch(req);
  e.respondWith(
    pedir.then((res) => {
      if (res && res.ok) {
        const copia = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copia));
      }
      return res;
    }).catch(() => caches.match(req).then((r) => r || caches.match("./index.html")))
  );
});
