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

  if (logoutLink) {
    logoutLink.addEventListener("click", async (event) => {
      event.preventDefault();
      try {
        await API.post("/auth/logout/");
      } finally {
        window.location.href = "/pages/login.html";
      }
    });
  }

  currentUser().then((user) => {
    const authed = Boolean(user && user.is_authenticated);

    if (loginLink) loginLink.hidden = authed;
    if (logoutLink) logoutLink.hidden = !authed;

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

document.addEventListener("DOMContentLoaded", async () => {
  await currentUser(); // Ensure session is loaded before wiring links
  wireAuthLinks();
  wireLoginForm();
  displayAuthMessage();
});

async function protectPage() {
    const user = await currentUser();

    if (!user || !user.is_authenticated) {
        const currentPage = window.location.pathname;

        const loginURL = new URL("/pages/login.html", window.location.origin);

        loginURL.searchParams.set("message", "unauthorized");
        loginURL.searchParams.set("next", currentPage);

        window.location.replace(loginURL.toString());
        return false;
    }

    // Reveal the page only after authentication succeeds
    const app = document.getElementById("app");

    if (app) {
        app.hidden = false;
    }

    return true;
}

function displayAuthMessage() {
    const params = new URLSearchParams(window.location.search);
    const message = params.get("message");
    const messageEl = document.getElementById("auth-message");

    // Keep the message hidden by default
    if (!messageEl) return;

    messageEl.hidden = true;

    if (message === "unauthorized") {
        messageEl.textContent =
            "Please log in to access this page.";

        messageEl.className = "auth-warning";
        messageEl.hidden = false;
    }
}