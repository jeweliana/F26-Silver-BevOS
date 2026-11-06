// Shared page behaviour for the static frontend.
document.addEventListener("DOMContentLoaded", async () => {

    // Get the currently authenticated user.
    const user = await currentUser();

    // Redirect if the user is not authenticated.
    if (!user || !user.is_authenticated) {
        window.location.replace("/pages/login.html");
        return;
    }

    // Reveal protected application content.
    const app = document.getElementById("app");

    if (app) {
        app.hidden = false;
    }

    // Show Administration link only to administrators.
    const adminLink = document.getElementById("admin-link");

    if (adminLink && user.is_admin) {
        adminLink.hidden = false;
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