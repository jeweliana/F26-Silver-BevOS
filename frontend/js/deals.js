let allDeals = [];
let allClients = [];

// Display deals in HTML table
function displayDeals(deals) {
    const tableBody = document.getElementById("deals-table-body");

    tableBody.replaceChildren();

    if (deals.length === 0) {
        const row = document.createElement("tr");
        const cell = document.createElement("td");

        cell.colSpan = 5;
        cell.textContent = "No deals found.";

        row.appendChild(cell);
        tableBody.appendChild(row);
        return;
    }

    deals.forEach((deal) => {
        const row = document.createElement("tr");

        const values = [
            deal.deal_number ?? `#${deal.id}`,
            deal.deal_name ?? "Untitled Deal",
            deal.client ?? "—",
            deal.status ?? "Unknown"
        ];

        // Create data columns
        values.forEach((value) => {
            const cell = document.createElement("td");
            cell.textContent = value;
            row.appendChild(cell);
        });

        // Create action column
        const actionCell = document.createElement("td");

        const editButton = document.createElement("button");
        editButton.textContent = "Edit";
        editButton.classList.add("edit-deal-btn");
        editButton.dataset.id = deal.id;

        actionCell.appendChild(editButton);
        row.appendChild(actionCell);

        tableBody.appendChild(row);
    });
}


// Get deals from Django backend
async function loadDeals() {
    const status = document.getElementById("deals-status");

    try {
        const data = await API.get("/deals/");
        console.log("Deals returned from API:", data);

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


// Search deals
function searchDeals() {
    const search = document.getElementById("deal-search")
        .value.toLowerCase().trim();

    const filteredDeals = allDeals.filter((deal) => {
        const searchableText = [
            deal.deal_number,
            deal.deal_name,
            deal.client,
            deal.status
        ]
        .filter(value => value != null)
        .join(" ")
        .toLowerCase();

        return searchableText.includes(search);
    });

    displayDeals(filteredDeals);
}


// Initialize everything after HTML loads
document.addEventListener("DOMContentLoaded", () => {

    const editPanel = document.getElementById("edit-deal-panel");
    const editForm = document.getElementById("edit-deal-form");
    const tableBody = document.getElementById("deals-table-body");

    // Search listener
    document.getElementById("deal-search")
        .addEventListener("input", searchDeals);


    // Edit button listener
    tableBody.addEventListener("click", (event) => {

        const button = event.target.closest(".edit-deal-btn");

        if (!button) return;

        const dealId = button.dataset.id;

        const deal = allDeals.find(
            (d) => String(d.id) === String(dealId)
        );

        if (!deal) return;

        // Populate form
        document.getElementById("edit-deal-id").value = deal.id;
        document.getElementById("edit-deal-name").value = deal.deal_name ?? "";
        document.getElementById("edit-deal-client").value = deal.client_id;
        document.getElementById("edit-deal-status").value = deal.status_id ?? "";

        // Show edit panel
        editPanel.hidden = false;

        editPanel.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    });


    // Cancel editing
    document.getElementById("cancel-edit")
        .addEventListener("click", () => {
            editPanel.hidden = true;
            editForm.reset();
        });


    // Save edited deal
    editForm.addEventListener("submit", async (event) => {

        event.preventDefault();

        const dealId = document.getElementById("edit-deal-id").value;

        const updatedDeal = {
            deal_name: document.getElementById("edit-deal-name").value.trim(),
            client: Number(document.getElementById("edit-deal-client").value),
            status: Number(document.getElementById("edit-deal-status").value)
        };

        console.log("Sending deal update:", updatedDeal);

        try {
            // Send PATCH request
            await API.patch(`/deals/${dealId}/`, updatedDeal);

            // Close panel
            editPanel.hidden = true;
            editForm.reset();

            // Refresh table
            await loadDeals();

            alert("Deal updated successfully!");

        } catch (error) {
            console.error("Update failed:", error);
            alert("Unable to update deal: " + error.message);
        }
    });


    // Initial load
    Promise.all([loadClients(), loadStatuses()])
    .then(() => loadDeals())
    .catch(error => {
        console.error("Unable to load form data:", error);
        alert("Unable to load customers or statuses.");
    });

});

async function loadClients() {
    const data = await API.get("/clients/");

    allClients = Array.isArray(data)
        ? data
        : data.results ?? [];

    const select = document.getElementById("edit-deal-client");

    select.replaceChildren();

    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Select a customer";
    select.appendChild(placeholder);

    allClients.forEach((client) => {
        const option = document.createElement("option");

        option.value = client.id;
        option.textContent = client.client_name;

        select.appendChild(option);
    });
}

async function loadStatuses() {
    const data = await API.get("/statuses/");
    const statuses = Array.isArray(data) ? data : data.results ?? [];

    const select = document.getElementById("edit-deal-status");
    select.replaceChildren();

    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Select a status";
    select.appendChild(placeholder);

    statuses.forEach((status) => {
        const option = document.createElement("option");
        option.value = status.id;
        option.textContent = status.status_name;
        select.appendChild(option);
    });
}