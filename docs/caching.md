# Caching

## Static files

Vite emits content-hashed JavaScript and CSS under `/assets/`; Vercel serves these with a one-year immutable cache lifetime. The app document is revalidated on each navigation so it can point clients at the current asset hashes. The root favicon and web manifest use a one-hour cache lifetime with stale-while-revalidate for up to one day.

## Budokon draws

`BudokonClient` keeps deterministic draw results in memory for five minutes, with a 100-entry limit. Identical in-flight requests share one upstream fetch. Keys include the endpoint and normalized seed, count, weight class, and exclusions, so fresh match seeds do not reuse prior results. The cache exists only for the current page lifetime; session storage separately preserves the active match and remaining draw buffer across a reload in that tab.

Inspect the per-page counters in the browser console with:

```js
window.judokonCacheStats()
```

The result includes `requests`, `hits`, `coalesced`, `misses`, `evictions`, and `expirations`. `hits / requests` gives the page-local hit rate; `misses` counts upstream fetch attempts initiated by this cache. These counters reset on reload and are not sent to a telemetry service. Aggregate production hit rates or compare against Budokon request volume before adjusting TTL or capacity.

The client calls the public Budokon draw endpoint directly with POST requests. The repository cannot configure that service's cache policy. Its public documentation endpoint currently returns `Cache-Control: no-store`; this does not establish the policy of `/v1/draw`. Check with the API owner before adding shared response caching: draw results depend on request parameters and dataset version, and broad caching could compromise replay expectations or return stale data.

## Tactical assessments

Successful results, including a low-confidence `assessment: null`, are cached for five minutes using a SHA-256 key derived from the normalized tactical features and selected model. The Vercel Runtime Cache shares them within a region and deployment environment. A small in-process cache is used as a fallback and to reduce repeated work within one function instance. Concurrent identical requests in one instance share the provider call. Provider errors and other non-success responses are not cached, so a retry can recover immediately.

HTTP responses remain `Cache-Control: no-store`; the runtime cache is internal to the function and does not expose feature-bearing responses to browsers or intermediary HTTP caches. Vercel Runtime Cache is regional and ephemeral, so misses remain possible across regions, cold starts, and evictions. It reduces repeated provider calls but is not a global spending limit; retain provider spend limits and endpoint rate limiting.
