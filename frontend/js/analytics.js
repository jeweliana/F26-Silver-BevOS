// Renders /api/analytics/summary/ as a definition list of key/value metrics.
async function loadAnalytics() {
  const status = document.getElementById("analytics-status");
  const metrics = document.getElementById("metrics");
  if (!metrics) return;

  try {
    const data = await API.get("/analytics/summary/");
    status.textContent = "Last refresh just now.";

    metrics.replaceChildren(
      ...Object.entries(data).map(([key, value]) => {
        const wrap = document.createElement("div");
        const dt = document.createElement("dt");
        const dd = document.createElement("dd");
        dt.textContent = key.replace(/_/g, " ");
        dd.textContent = typeof value === "number" ? value.toLocaleString() : String(value);
        wrap.append(dt, dd);
        return wrap;
      })
    );
  } catch (error) {
    status.textContent = error.message;
  }
}

document.addEventListener("DOMContentLoaded", loadAnalytics);
