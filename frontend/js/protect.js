document.addEventListener("DOMContentLoaded", async () => {
    const authenticated = await protectPage();

    if (!authenticated) return;

    wireAuthLinks();
});