/*
 * Service Worker für den Offline-Start des Arbeitscockpits.
 * Zwischengespeichert werden nur eigene App-Dateien (gleiche Herkunft): Seite, Skripte, Stile, Icons, Schriften.
 * Daten, Anmeldungen und Anfragen an andere Dienste (Supabase, Google, KI) laufen nie über diesen Speicher.
 */
const CACHE = 'arbeitscockpit-v1'
const START = ['/', '/manifest.webmanifest', '/icons/icon-192.png']

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(START)))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((namen) => Promise.all(namen.filter((n) => n !== CACHE).map((n) => caches.delete(n)))))
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const anfrage = event.request
  const url = new URL(anfrage.url)
  if (anfrage.method !== 'GET' || url.origin !== self.location.origin) return

  // Seitenaufrufe: zuerst aus dem Netz (immer aktuell), offline die zuletzt geladene App
  if (anfrage.mode === 'navigate') {
    event.respondWith(
      fetch(anfrage)
        .then((antwort) => {
          const kopie = antwort.clone()
          if (antwort.ok) caches.open(CACHE).then((cache) => cache.put('/', kopie))
          return antwort
        })
        .catch(() => caches.match('/')),
    )
    return
  }

  // Dateien mit Versionsnamen: aus dem Speicher, sonst laden und ablegen
  if (/^\/(assets|icons|fonts|brand)\//.test(url.pathname)) {
    event.respondWith(
      caches.match(anfrage).then(
        (gefunden) =>
          gefunden ||
          fetch(anfrage).then((antwort) => {
            if (antwort.ok) {
              const kopie = antwort.clone()
              caches.open(CACHE).then((cache) => cache.put(anfrage, kopie))
            }
            return antwort
          }),
      ),
    )
  }
})
