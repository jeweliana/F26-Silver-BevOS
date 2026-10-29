// Renders /api/analytics/summary/ as a definition list of key/value metrics.
const METRIC_INFO = {
  total_deals: { icon: "ti-businessplan"},
  deals_by_status: { icon: "ti-list-check"},
  deals_due_soon: { icon: "ti-clock"},
  open_quote_value: {icon: "ti-file-text"},
  receivables_outstanding: {icon: "ti-arrow-down-left", tone: "pos" },
  payables_outstanding: {icon: "ti-arrow-up-right", tone: "neg" },
};
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
        const info = METRIC_INFO[key] || { icon: "ti-chart-bar" };
        const icon = document.createElement("i");
        icon.className = "ti " + info.icon + " metric-icon";
        if (info.tone) icon.classList.add("tone-" + info.tone);
        const labelText = document.createElement("span");
        labelText.textContent = key.replace(/_/g, " ");
        dt.append(labelText, icon);
        if (typeof value === "number") {
          dd.textContent = value.toLocaleString();
        } else if (value && typeof value === "object") {
          dd.classList.add("breakdown");
          Object.entries(value).forEach(([k, v]) => {
            const row = document.createElement("div");
            const label = document.createElement("span");
            const count = document.createElement("span");
            label.textContent = k;
            count.textContent = v;
            row.append(label, count);
            dd.append(row);
          });
        } else {
          dd.textContent = String(value);
        }
        wrap.append(dt, dd);
        return wrap;
      })
    );
  } catch (error) {
    status.textContent = error.message;
  }
}

document.addEventListener("DOMContentLoaded", loadAnalytics);
