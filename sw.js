self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

// Placeholder fetch handler
self.addEventListener('fetch', () => {
  // Intentionally empty - can be expanded for offline caching
});

