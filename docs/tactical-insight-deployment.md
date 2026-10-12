# Tactical insight deployment

Tactical insight is an optional post-match feature served by the Vercel Function at `/api/tactical-assessment`. The game and its deterministic match summary continue to work when the function or OpenRouter is unavailable. Plain `npm run dev` starts Vite without this function, so tactical insight only works in a Vercel deployment.

This guide covers the Vercel Firewall rule and environment variables required by the function in `api/tactical-assessment.ts`. For the platform's current dashboard fields and Preview requirements, see Vercel's [Rate Limiting SDK guide](https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting-sdk) and [WAF rate limiting guide](https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting).

## 1. Create the Firewall rate-limit rule

In the Vercel dashboard:

1. Select the `judokon-2600` project, open **Firewall**, then choose **Configure** and **+ New Rule**.
2. Give the rule a descriptive name, such as `judokon-tactical-assessment`.
3. Add the `@vercel/firewall` condition and set its **Rate limit ID** to `judokon-tactical-assessment`. The ID is a value you choose; it is not the rule's display name or an automatically generated rule ID.
4. Scope the rule to **Request Method equals `POST`** and **Request Path equals `/api/tactical-assessment`**. All conditions must match for this route to use the rule.
5. Configure a starting limit of **20 requests per 10 minutes**, counted by client IP, with the rate-limit action when the limit is reached. Adjust this after reviewing expected traffic and Vercel usage.
6. Save the rule, review the pending Firewall changes, and publish them. For Preview testing, follow Vercel's Preview requirements below.

The application calls `checkRateLimit(rateLimitId, { request })`; it does not supply a custom counting key, so Vercel uses the request's client IP. Keep the method and path conditions narrow so unrelated requests do not consume this feature's allowance. Vercel's dashboard labels and available rate-limit options can change; use its current [SDK setup instructions](https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting-sdk) if the controls differ.

## 2. Set environment variables

In the Vercel project's **Settings → Environment Variables**, configure:

| Variable | Value | Environments |
| --- | --- | --- |
| `JEV_ASSESSMENT_RATE_LIMIT_ID` | The exact Rate limit ID from step 3, for example `judokon-tactical-assessment` | Every environment where the function will run |
| `OPENROUTER_API_KEY` | An OpenRouter API key | Production; add to Preview only when testing tactical insight there |
| `JEV_MODEL` | Optional model name; defaults to `~typesafe/jev-latest` | Only if overriding the default |

Mark `OPENROUTER_API_KEY` as a sensitive value where Vercel offers that option. Do not commit provider keys to the repository or expose them in client-side configuration. `JEV_ASSESSMENT_RATE_LIMIT_ID` must match the Firewall **Rate limit ID** exactly, including case. If you change an environment variable, create a new deployment so the function receives the updated value.

For a protected Preview deployment, follow Vercel's Preview instructions for the SDK: enable **Protection Bypass for Automation** when needed and make sure the required system environment variables are exposed. Keep Preview access controlled; do not add the provider key there unless the Preview integration needs it.

## 3. Verify a deployment

1. Open a new Preview deployment (or Production if Preview is not configured) and play one normal match to completion.
2. In browser developer tools, inspect the `POST /api/tactical-assessment` request. The request body contains compact tactical features; it does not contain judoka IDs, stat values, replay seeds, local storage, or hidden opponent values.
3. A successful response is HTTP `200`. The `assessment` may be `null` when the confidence policy omits low-confidence results. The deterministic match summary remains available either way.
4. Check the Vercel Function and Firewall activity for the matching request. A request beyond the configured limit should return HTTP `429`; do not generate bursts against Production to test this behavior. If limit behavior must be exercised, use a controlled Preview test and restore the intended limit afterward.

Common responses from the handler:

| Response | Meaning |
| --- | --- |
| `200` with `issue: "not_configured"` | `OPENROUTER_API_KEY` is missing; the game summary still works. |
| `429` with `issue: "rate_limited"` | The caller exceeded the Firewall limit. |
| `503` with `issue: "invalid_api_key"` or `"unavailable"` | OpenRouter rejected the key or could not provide an assessment. |
| `503` without an issue | The rate-limit ID is missing or the Firewall rate-limit check failed. The route fails closed and does not call OpenRouter. |

The client treats tactical insight as optional and preserves the match result on each failure path. For local development, use `npm run dev` for gameplay and the deterministic summary; the Vercel function is not served by that command.
