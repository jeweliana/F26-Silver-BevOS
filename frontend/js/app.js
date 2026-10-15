// Shared page behaviour for the static frontend.
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".nav a").forEach((link) => {
    if (link.pathname === window.location.pathname) link.classList.add("active");
  });
});
