
let allDeals = [];

// Display deals in HTML table
function displayDeals(deals) {
    const tableBody = document.getElementById("deals-table-body");

    tableBody.replaceChildren();

    if (deals.length === 0) {
        const row = document.createElement("tr");
        const cell = document.createElement("td");

        cell.colSpan = 4;
        cell.textContent = "No deals found.";

        row.appendChild(cell);
        tableBody.appendChild(row);
        return;
    }

    deals.forEach((deal) => {
        const row = document.createElement("tr");

        const values = [
            deal.id ?? "—",
            deal.title ?? deal.name ?? "Untitled Deal",
            deal.customer_name ?? deal.client_name ?? "—",
            deal.status ?? "Unknown"
        ];

        values.forEach((value) => {
            const cell = document.createElement("td");
            cell.textContent = value;
            row.appendChild(cell);
        });

        tableBody.appendChild(row);
    });
}

// Get deals from the Django backend
async function loadDeals() {
    const status = document.getElementById("deals-status");

    try {
        const data = await API.get("/deals/");

        allDeals = Array.isArray(data)
            ? data
            : data.results ?? [];

        displayDeals(allDeals);

        status.textContent = `${allDeals.length} deals found`;

    } catch (error) {
        status.textContent = "Unable to load deals: " + error.message;
        displayDeals([]);
    }
}

// Search for deals as the user types
function searchDeals() {
    const search = document.getElementById("deal-search")
        .value.toLowerCase().trim();

    const filteredDeals = allDeals.filter((deal) => {
        const searchableText = [
            deal.id,
            deal.title,
            deal.name,
            deal.customer_name,
            deal.client_name,
            deal.status
        ].filter(value => value != null)
         .join(" ")
         .toLowerCase();

        return searchableText.includes(search);
    });

    displayDeals(filteredDeals);
}

// Wait for HTML to finish loading
document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("deal-search")
        .addEventListener("input", searchDeals);

    loadDeals();
});
