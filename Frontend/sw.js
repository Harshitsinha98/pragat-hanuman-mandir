/* Service Worker — श्री प्रगट हनुमान जी देवस्थानम्
   Offline-first for the app shell; network-first for everything else. */

const CACHE = "phm-cache-v2";
const APP_SHELL = [
    "index.html",
    "about.html",
    "gallery.html",
    "contact.html",
    "style.css",
    "main.js",
    "manifest.json",
    "images/logo.png",
];

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
    );
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
        ).then(() => self.clients.claim())
    );
});

self.addEventListener("fetch", (event) => {
    const req = event.request;

    // Only handle same-origin GET requests; let the network handle the rest
    // (Razorpay, backend API, fonts, analytics, media streaming, etc.)
    if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;

    // Never cache the audio file (large, streamed)
    if (req.url.includes("hanuman-chalisa.mp3")) return;

    event.respondWith(
        fetch(req)
            .then((res) => {
                const copy = res.clone();
                caches.open(CACHE).then((cache) => cache.put(req, copy)).catch(() => {});
                return res;
            })
            .catch(() => caches.match(req).then((cached) => cached || caches.match("index.html")))
    );
});
