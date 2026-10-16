// Renders /api/deals/. Expects a JSON array (or { results: [...] }).
async function loadDeals() {
  const status = document.getElementById("deals-status");
  const list = document.getElementById("deals-list");
  if (!list) return;

  try {
    const data = await API.get("/deals/");
    const deals = Array.isArray(data) ? data : data.results || [];

    if (!deals.length) {
      status.textContent = "No deals yet.";
      return;
    }

    status.textContent = `${deals.length} deal${deals.length === 1 ? "" : "s"}`;
    list.replaceChildren(
      ...deals.map((deal) => {
        const li = document.createElement("li");
        li.textContent = deal.title ?? deal.name ?? `Deal #${deal.id}`;
        if (deal.status) {
          const tag = document.createElement("span");
          tag.className = "muted";
          tag.textContent = ` — ${deal.status}`;
          li.append(tag);
        }
        return li;
      })
    );
  } catch (error) {
    status.textContent = error.message;
  }
}

document.addEventListener("DOMContentLoaded", loadDeals);
