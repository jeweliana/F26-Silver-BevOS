// Shared page behaviour for the static frontend.
document.addEventListener("DOMContentLoaded", async () => {

    // Check authentication before displaying protected content.
    const authenticated = await requireAuth();

    if (!authenticated) return;

    // Reveal protected application content.
    const app = document.getElementById("app");

    if (app) {
        app.hidden = false;
    }

    // Configure login/logout links.
    wireAuthLinks();

    // Highlight the active navigation link.
    document.querySelectorAll(".nav a").forEach((link) => {
        if (link.pathname === window.location.pathname) {
            link.classList.add("active");
        }
    });
});