// sw.js - Service Worker for Tetromino Game

const CACHE_NAME = 'tetromino-game-cache-v3'; // Incremented cache version
// Updated list of files to cache
const urlsToCache = [
  './', // Alias for index.html
  './index.html',
  './manifest.json', // Cache the manifest file
  // Icon paths based on your latest manifest and PWA builder output
  // Assuming these are placed in an 'icons' folder in your project root
  './icons/web-app-manifest-192x192.png',
  './icons/web-app-manifest-512x512.png',
  './icons/apple-touch-icon.png', // Typically 180x180, but name as per your file
  './icons/favicon-96x96.png',
  './icons/favicon.svg',
  './icons/favicon.ico'
  // Note: Tone.js and Google Fonts are loaded from CDNs and are not cached here by default.
];

// Install event: Cache the application shell
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing v3...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching app shell v3');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('Service Worker: App shell v3 cached successfully');
        return self.skipWaiting(); // Activate the new service worker immediately
      })
      .catch((error) => {
        console.error('Service Worker: Caching v3 failed', error);
      })
  );
});

// Activate event: Clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating v3...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Deleting old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker: Activated v3 successfully');
      return self.clients.claim(); // Take control of all open clients
    })
  );
});

// Fetch event: Serve cached content when offline, or fetch from network
self.addEventListener('fetch', (event) => {
  // Check if the request URL is for one of our cached assets
  const isCachableRequest = urlsToCache.some(cachedUrl => {
    // Normalize URLs for comparison (remove leading './')
    const requestPath = new URL(event.request.url, self.location.origin).pathname;
    const cachedPath = new URL(cachedUrl, self.location.origin).pathname;
    return requestPath === cachedPath;
  });

  if (event.request.method === 'GET' && isCachableRequest) {
    event.respondWith(
      caches.match(event.request)
        .then((response) => {
          if (response) {
            // console.log('Service Worker: Serving from cache', event.request.url);
            return response;
          }
          // console.log('Service Worker: Fetching from network', event.request.url);
          return fetch(event.request).then(
            (networkResponse) => {
              // Check if we received a valid response (status 200)
              // We don't check networkResponse.type === 'basic' here to allow caching opaque responses
              // from CDNs if you were to add them to urlsToCache, though it's generally not recommended
              // for third-party resources without careful consideration.
              if (!networkResponse || networkResponse.status !== 200) {
                return networkResponse;
              }
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(event.request, responseToCache);
                });
              return networkResponse;
            }
          ).catch(error => {
            console.error('Service Worker: Fetching failed for', event.request.url, error);
            // Optionally, return a fallback page or resource here if you had one.
            // For example: return caches.match('./offline.html');
          });
        })
    );
  } else {
    // For non-cached requests (e.g., CDNs or other external resources), fetch normally.
    // This ensures Tone.js and Google Fonts continue to load from their CDNs.
    event.respondWith(fetch(event.request));
  }
});

