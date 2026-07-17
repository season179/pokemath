// Pokemath Worker: Google sign-in (better-auth), gated static game assets,
// and the game JSON API.
//
//   /api/auth/*        better-auth (Google OAuth redirect flow, sessions)
//   /api/*             game API (session-cookie protected) — api.ts
//   / , /index.html    302 → /login without a valid session (run_worker_first)
//   /login             sign-in page, served inline (survives Cocos rebuilds)
//   everything else    Cocos web build via Static Assets
//
// `Env` comes from worker-configuration.d.ts (regenerate: `npm run cf-types`).

import { buildAuth } from "./auth.ts";
import { handleApi, json } from "./api.ts";
import { LOGIN_HTML } from "./login-page.ts";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const auth = buildAuth(env);

    if (url.pathname.startsWith("/api/auth/")) {
      return auth.handler(request);
    }

    if (url.pathname.startsWith("/api/")) {
      try {
        return await handleApi(request, url, auth, env);
      } catch (err) {
        console.error("api error", err);
        return json({ error: "internal error" }, 500);
      }
    }

    if (url.pathname === "/login") {
      const session = await getSession(auth, request);
      if (session) return redirect("/"); // already signed in
      return html(LOGIN_HTML);
    }

    if (url.pathname === "/" || url.pathname === "/index.html") {
      const session = await getSession(auth, request);
      if (!session) return redirect("/login");
      // no-store: never let an edge/browser cache serve the game shell to a
      // signed-out visitor (or a stale copy around the gate).
      const res = await env.ASSETS.fetch(request);
      return withNoStore(res);
    }

    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;

async function getSession(auth: ReturnType<typeof buildAuth>, request: Request) {
  try {
    return await auth.api.getSession({ headers: request.headers });
  } catch {
    return null;
  }
}

function redirect(to: string): Response {
  return new Response(null, {
    status: 302,
    headers: { location: to, "cache-control": "no-store" },
  });
}

function html(body: string): Response {
  return new Response(body, {
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
  });
}

function withNoStore(res: Response): Response {
  const out = new Response(res.body, res);
  out.headers.set("cache-control", "no-store");
  return out;
}
