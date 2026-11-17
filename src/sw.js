/* global self, caches, Response */
import { cleanupOutdatedCaches, matchPrecache, precacheAndRoute } from "workbox-precaching";
import { NavigationRoute, registerRoute } from "workbox-routing";
import { NetworkFirst } from "workbox-strategies";

const navigationCacheName = "judokon-navigation-v1";
const networkFirst = new NetworkFirst({
  cacheName: navigationCacheName,
  networkTimeoutSeconds: 3
});

registerRoute(new NavigationRoute(async ({ request, event }) => {
  try {
    return await networkFirst.handle({ request, event });
  } catch {
    return await matchPrecache("/index.html") ?? Response.error();
  }
}, {
  denylist: [/^\/api(?:\/|$)/]
}));

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

self.addEventListener("activate", event => {
  const removeOldNavigationCaches = caches.keys().then(cacheNames => Promise.all(
    cacheNames
      .filter(name => name.startsWith("judokon-navigation-") && name !== navigationCacheName)
      .map(name => caches.delete(name))
  ));
  event.waitUntil(Promise.all([self.clients.claim(), removeOldNavigationCaches]));
});

self.addEventListener("message", event => {
  if (event.data?.type === "SKIP_WAITING") event.waitUntil(self.skipWaiting());
});
