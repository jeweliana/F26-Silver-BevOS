// Session helpers. Endpoints expected on the Django side:
//   GET  /api/auth/me/      -> { username, is_authenticated, ... }
//   POST /api/auth/login/   -> { username } (session cookie set)
//   POST /api/auth/logout/
async function currentUser() {
  try {
    return await API.get("/auth/me/");
  } catch {
    return { username: null, is_authenticated: false };
  }
}

function wireAuthLinks() {
  const loginLink = document.querySelector('[data-auth-link="login"]');
  const logoutLink = document.querySelector('[data-auth-link="logout"]');
  if (!loginLink || !logoutLink) return;

  logoutLink.addEventListener("click", async (event) => {
    event.preventDefault();
    try {
      await API.post("/auth/logout/");
    } finally {
      window.location.href = "./login.html";
    }
  });

  currentUser().then((user) => {
    const authed = Boolean(user && user.is_authenticated);
    loginLink.hidden = authed;
    logoutLink.hidden = !authed;

    const whoami = document.getElementById("whoami");
    if (whoami) {
      whoami.textContent = authed
        ? `Signed in as ${user.username}`
        : "Not signed in.";
    }
  });
}

function wireLoginForm() {
  const form = document.getElementById("login-form");
  if (!form) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const errorEl = document.getElementById("login-error");
    errorEl.hidden = true;

    const data = Object.fromEntries(new FormData(form).entries());

    try {
      await API.post("/auth/login/", data);
      window.location.href = "../index.html";
    } catch (error) {
      errorEl.textContent = error.message;
      errorEl.hidden = false;
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  wireAuthLinks();
  wireLoginForm();
});
