# Tactical insight deployment

Tactical insight is an optional post-match feature served by the Vercel Function at `/api/tactical-assessment`. The game and its deterministic match summary continue to work when the function or OpenRouter is unavailable. Plain `npm run dev` starts Vite without this function, so tactical insight works in a Vercel deployment.

## Configure the provider

In the Vercel project's **Settings → Environment Variables**, configure:

| Variable | Value | Environments |
| --- | --- | --- |
| `OPENROUTER_API_KEY` | An OpenRouter API key | Production; add to Preview only when testing tactical insight there |
| `JEV_MODEL` | Optional model name; defaults to `~typesafe/jev-latest` | Only if overriding the default |

Mark `OPENROUTER_API_KEY` as a sensitive value where Vercel offers that option. Do not commit the key to the repository or expose it in client-side configuration. Create a new deployment after changing an environment variable so the function receives the updated value.

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

The client treats tactical insight as optional and preserves the match result on each failure path. For local development, use `npm run dev` for gameplay and the deterministic summary; Vite does not serve the Vercel function.
