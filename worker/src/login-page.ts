// The /login page, served straight from the Worker so it never depends on
// (or gets clobbered by) the Cocos build output. Plain HTML + a few lines of
// JS: POST better-auth's social sign-in endpoint, follow the Google redirect.

export const LOGIN_HTML = /* html */ `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Pokemath — Sign in</title>
<style>
  body {
    margin: 0; min-height: 100vh; display: flex; align-items: center;
    justify-content: center; flex-direction: column; gap: 24px;
    background: #2b2b40; color: #f4f4f8;
    font-family: system-ui, -apple-system, sans-serif; text-align: center;
  }
  h1 { font-size: 2.2rem; margin: 0; }
  p { margin: 0; opacity: .8; }
  button {
    display: flex; align-items: center; gap: 10px;
    font-size: 1.1rem; padding: 12px 22px; border: 0; border-radius: 8px;
    background: #fff; color: #333; cursor: pointer;
  }
  button:disabled { opacity: .6; cursor: wait; }
  #err { color: #ff8f8f; min-height: 1.2em; }
</style>
</head>
<body>
  <h1>Pokemath</h1>
  <p>Solve math, catch creatures!</p>
  <button id="google">
    <svg width="20" height="20" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.5l6.7-6.7C35.6 2.5 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.8 6.1C12.3 13.4 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.9c4.4-4.1 7.1-10.1 7.1-17.6z"/><path fill="#FBBC05" d="M10.4 28.7a14.5 14.5 0 0 1 0-9.4l-7.8-6.1a24 24 0 0 0 0 21.6l7.8-6.1z"/><path fill="#34A853" d="M24 48c6.2 0 11.4-2 15.4-5.6l-7.5-5.9c-2.1 1.4-4.8 2.3-7.9 2.3-6.3 0-11.7-3.9-13.6-9.4l-7.8 6.1C6.5 42.6 14.6 48 24 48z"/></svg>
    Sign in with Google
  </button>
  <p id="err"></p>
<script>
  const btn = document.getElementById("google");
  const err = document.getElementById("err");
  btn.addEventListener("click", async () => {
    btn.disabled = true;
    err.textContent = "";
    try {
      const res = await fetch("/api/auth/sign-in/social", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ provider: "google", callbackURL: "/" }),
      });
      const body = await res.json();
      if (!res.ok || !body.url) throw new Error();
      location.href = body.url;
    } catch {
      err.textContent = "Sign-in failed. Please try again.";
      btn.disabled = false;
    }
  });
</script>
</body>
</html>`;
