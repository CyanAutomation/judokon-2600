# Tactical insight deployment

Tactical insight is an optional post-match feature served by the Vercel Function at `/api/tactical-assessment`. The game and its deterministic match summary continue to work when the function or OpenRouter is unavailable. Plain `npm run dev` starts Vite without this function, so tactical insight works in a Vercel deployment.

## Configure the provider

In the Vercel project's **Settings → Environment Variables**, configure:

| Variable | Value | Environments |
| --- | --- | --- |
| `OPENROUTER_API_KEY` | An OpenRouter API key | Production; add to Preview only when testing tactical insight there |
| `JEV_MODEL` | Optional model name; defaults to `~typesafe/jev-latest` | Only if overriding the default |

Mark `OPENROUTER_API_KEY` as a sensitive value where Vercel offers that option. Do not commit the key to the repository or expose it in client-side configuration. Create a new deployment after changing an environment variable so the function receives the updated value.

Configure provider-side spend limits or alerts for this key where the OpenRouter account supports them. Identical tactical features and model reuse a successful result for five minutes in Vercel's regional Runtime Cache, but cache misses, cold starts, and different feature sets can still incur provider calls. The assessment endpoint is public, so also configure a Vercel Firewall rate limit scoped to `POST /api/tactical-assessment`. Start at 10 requests per minute per IP in log mode, review matching production traffic, then enable throttling and adjust the threshold to match real use. Vercel firewall rate-limit counters are regional, so treat them as abuse protection rather than a strict global spending ceiling.

Successful cached results are keyed by normalized features and model, and remain internal to the function. Responses still use `Cache-Control: no-store`. Runtime Cache is scoped to a region and deployment environment and is not a global spending limit. See the [caching guide](caching.md) for implementation details.

## Verify a deployment

1. Open a Vercel Preview deployment and play one normal match to completion.
2. In browser developer tools, inspect the `POST /api/tactical-assessment` request. The request body contains compact tactical features; it does not contain judoka IDs, stat values, replay seeds, local storage, or hidden opponent values.
3. A successful response is HTTP `200`. The `assessment` may be `null` when the confidence policy omits low-confidence results. The deterministic match summary remains available either way.
4. Check the Vercel Function logs for the matching request if the assessment is unavailable.

Common responses from the handler:

| Response | Meaning |
| --- | --- |
| `200` with an assessment or `assessment: null` | The request was handled; low-confidence results are omitted. |
| `200` with `issue: "not_configured"` | `OPENROUTER_API_KEY` is missing. |
| `400` | The request body is invalid. |
| `502` | The provider returned an invalid decision response. |
| `503` with `issue: "invalid_api_key"` or `"unavailable"` | OpenRouter rejected the key or could not provide an assessment. |
| `429` | The Vercel Firewall rate limit rejected the request. |

The client treats tactical insight as optional and preserves the match result on each failure path. For local development, use `npm run dev` for gameplay and the deterministic summary; Vite does not serve the Vercel function.
