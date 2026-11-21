//Fetches recent activity and renders it as a feed on the dashboard.

//Icon per event type
const ACTIVITY_ICONS = {
    status: "ti-refresh",
    note: "ti-note",
    "Client Contact": "ti-user",
    "Quote Sent": "ti-file-text",
    "PO Received": "ti-shopping-cart",
};
const ACTIVITY_TONES = {
    status: "blue",
    note: "amber",
    "Client Contact": "green",
    "Quote Sent": "blue",
    "PO Received": "green",

};

//Turn an ISO timestamp into a short relative label
function timeAgo(iso) {
    const then = new Date(iso);
    const seconds = Math.floor((Date.now() - then.getTime()) / 1000);

    const units = [
        ["day", 86400],
        ["hour", 3600],
        ["minute", 60],
    ];

    for (const [name, size] of units) {
        const value = Math.floor(seconds / size);
        if (value >= 1) {
            return value === 1 ? `1 ${name} ago` : `${value} ${name}s ago`;
        }
    }
    return "just now";
}

async function loadActivity() {
    const feed = document.getElementById("activity-feed");
    if (!feed) return;

    try {
        const data = await API.get("/deals/recent-activity/");
        const events = data.results;

        if (!events || events.length === 0) {
            feed.replaceChildren(
                Object.assign(document.createElement("p"), {
                    className: "muted",
                    textContent: "No recent activity.",
                })
            );
            return;
        }

        feed.replaceChildren(
            ...events.map((event) => {
                const row = document.createElement("div");
                row.className = "activity-row";

                // Icon
                const iconWrap = document.createElement("div");
                iconWrap.className = "activity-icon tone-" + (ACTIVITY_TONES[event.type] || "default");
                const icon = document.createElement("i");
                icon.className = "ti " + (ACTIVITY_ICONS[event.type] || "ti-point");
                iconWrap.append(icon);

                //Text (description + meta line)
                const body = document.createElement("div");
                body.className = "activity-body";

                const desc = document.createElement("div")
                desc.className = "activity-desc";
                desc.textContent = event.description;

                const meta = document.createElement("div");
                meta.className = "activity-meta";
                const who = event.user || "system";
                meta.textContent = `${who} · ${timeAgo(event.timestamp)}`;

                body.append(desc,meta);
                row.append(iconWrap, body);
                return row;
            })
        );
    } catch (error) {
        feed.replaceChildren(
            Object.assign(document.createElement("p"), {
                className: "muted",
                textContent: "Could not load activity.",
            })
        );
    }
}
document.addEventListener("DOMContentLoaded", loadActivity);