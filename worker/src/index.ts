// Pokemath Worker: serves the Cocos web build via Static Assets and a small
// JSON API under /api/*. run_worker_first guarantees /api/* reaches us; any
// other request that slips through falls back to asset serving.
// `Env` comes from worker-configuration.d.ts (regenerate: `npm run cf-types`).

import { handleApi, json } from "./api.ts";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/")) {
      try {
        return await handleApi(request, url, env);
      } catch (err) {
        console.error("api error", err);
        return json({ error: "internal error" }, 500);
      }
    }

    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
