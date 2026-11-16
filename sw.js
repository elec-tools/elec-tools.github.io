// Cache hors ligne de la version web (NAS, Cloudflare). Correction du 16/11/2026 : la page etait servie depuis le
// cache pour toujours (nom de cache fixe, cache d'abord), donc une nouvelle version deposee n'arrivait jamais chez
// ceux qui avaient deja ouvert le site. Maintenant :
// - pages (navigation) : reseau d'abord, cache seulement hors ligne;
// - fichiers /_next/static (noms changes a chaque version) : cache d'abord;
// - nouveau nom de cache : l'ancien cache (avec l'ancienne page) est supprime a l'activation.
const CACHE_NAME = "elec-tools-v2";
// Dossier du site deduit de l'adresse de ce fichier : /elec-tools/ (NAS, Cloudflare) ou / (GitHub Pages).
const BASE = new URL("./", self.location).pathname;
const STATIC_ASSETS = [BASE, `${BASE}icon.svg`];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

function store(request, response) {
  if (response.ok) {
    const copy = response.clone();
    caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
  }
  return response;
}

self.addEventListener("fetch", (event) => {
  // Fichiers de l'application seulement : les requetes vers un autre serveur (compte de test) ne passent pas par le cache.
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin) {
    return;
  }

  if (url.pathname.includes("/_next/static/")) {
    event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => store(event.request, response))));
    return;
  }

  // Pages et autres fichiers (tarif, icones) : toujours la version en ligne, le cache seulement sans reseau.
  event.respondWith(
    fetch(event.request)
      .then((response) => store(event.request, response))
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match(BASE)))
  );
});
