let allDeals = [];
let allClients = [];
let allStatuses = [];
let selectedDealId = null;
let selectedDeal = null;

function createElement(tag, className, text) {
    const element = document.createElement(tag);

    if (className) element.className = className;
    if (text !== undefined && text !== null) {
        element.textContent = String(text);
    }

    return element;
}

function formatLabel(key) {
    return key
        .replace(/_/g, " ")
        .replace(/\b\w/g, char => char.toUpperCase());
}

function formatValue(value) {
    if (value === null || value === undefined || value === "") {
        return "—";
    }

    if (typeof value === "boolean") {
        return value ? "Yes" : "No";
    }

    if (typeof value === "object") {
        return JSON.stringify(value);
    }

    return String(value);
}
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

        const viewButton = document.createElement("button");
        viewButton.textContent = "View";
        viewButton.classList.add("view-deal-btn");
        viewButton.dataset.id = deal.id;

        actionCell.appendChild(viewButton);

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



document.addEventListener("DOMContentLoaded", () => {
    const tableBody = document.getElementById("deals-table-body");
    const panel = document.getElementById("deal-details-panel");
    const editForm = document.getElementById("edit-deal-form");

    // Search
    document.getElementById("deal-search")
        .addEventListener("input", searchDeals);

    // View a deal
    tableBody.addEventListener("click", event => {
        const button = event.target.closest(".view-deal-btn");
        if (!button) return;

        loadDealDetails(button.dataset.id);
    });

    // Close details
    document.getElementById("close-deal-details")
        .addEventListener("click", () => {
            panel.hidden = true;
            selectedDealId = null;
            selectedDeal = null;
        });

    // Enter edit mode
    document.getElementById("edit-deal-button")
        .addEventListener("click", openEditMode);

    // Save changes
    editForm.addEventListener("submit", async event => {
        event.preventDefault();

        const dealId = document.getElementById("edit-deal-id").value;

        const updatedDeal = {
            deal_name: document.getElementById("edit-deal-name").value.trim(),
            client: Number(document.getElementById("edit-deal-client").value),
            status: Number(document.getElementById("edit-deal-status").value)
        };

        try {
            await API.patch(`/deals/${dealId}/`, updatedDeal);

            await loadDeals();
            await loadDealDetails(dealId);

            editForm.reset();

            alert("Deal updated successfully!");

        } catch (error) {
            console.error("Update failed:", error);
            alert("Unable to update deal: " + error.message);
        }
    });

    // Cancel editing
    document.getElementById("cancel-edit")
        .addEventListener("click", () => {
            const content = document.getElementById("deal-details-content");

            editForm.reset();
            editForm.hidden = true;
            content.hidden = false;

            document.getElementById("edit-deal-button").hidden = false;
        });

    // Initial load
    Promise.all([
        loadClients(),
        loadStatuses()
    ])
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

async function loadDealDetails(dealId) {
    const panel = document.getElementById("deal-details-panel");
    const content = document.getElementById("deal-details-content");
    const editForm = document.getElementById("edit-deal-form");
    const editButton = document.getElementById("edit-deal-button");

    selectedDealId = dealId;

    panel.hidden = false;
    content.hidden = false;
    editForm.hidden = true;
    editButton.hidden = false;

    content.replaceChildren(
        createElement("p", "muted", "Loading deal information...")
    );

    panel.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });

    try {
        const deal = await API.get(`/deals/${dealId}/detail/`);
        console.log("Full deal details:", deal);
        if (String(selectedDealId) !== String(dealId)) return;
        selectedDeal = deal;
        renderDealDetails(deal);

    } catch (error) {
        if (String(selectedDealId) !== String(dealId)) return;
        content.replaceChildren(
            createElement(
                "p",
                "muted",
                "Unable to load deal details: " + error.message
            )
        );
    }
}

function renderDealDetails(deal) {
    const content = document.getElementById("deal-details-content");

    content.replaceChildren();

    // Main deal summary
    const summary = createElement("div", "deal-summary");

    summary.appendChild(
        createElement("h2", null, deal.deal_name)
    );

    const summaryTable = createElement("table", "deal-data-table");
    const summaryBody = document.createElement("tbody");

    const summaryFields = {
        "Deal Number": deal.deal_number,
        "Customer": deal.client,
        "Status": deal.status,
        "Target Date": deal.target_date,
        "Created By": deal.created_by,
        "Created At": deal.created_at,
        "Last Updated": deal.updated_at,
        "Notes": deal.notes
    };

    Object.entries(summaryFields).forEach(([label, value]) => {
        const row = document.createElement("tr");

        row.append(
            createElement("th", null, label),
            createElement("td", null, formatValue(value))
        );

        summaryBody.appendChild(row);
    });

    summaryTable.appendChild(summaryBody);
    summary.appendChild(summaryTable);
    content.appendChild(summary);

    // Define tabs and their corresponding API fields
    const sections = [
        {
            id: "packaging",
            title: "Packaging Requirements",
            key: "packaging_requirements"
        },
        {
            id: "specifications",
            title: "Specifications",
            key: "specifications"
        },
        {
            id: "customer-quotes",
            title: "Customer Quotes",
            key: "customer_quotes"
        },
        {
            id: "customer-pos",
            title: "Customer POs",
            key: "customer_pos"
        },
        {
            id: "customer-invoices",
            title: "Customer Invoices",
            key: "customer_invoices"
        },
        {
            id: "supplier-quotes",
            title: "Supplier Quotes",
            key: "supplier_quotes"
        },
        {
            id: "supplier-pos",
            title: "Supplier POs",
            key: "supplier_pos"
        },
        {
            id: "supplier-invoices",
            title: "Supplier Invoices",
            key: "supplier_invoices"
        },
        {
            id: "documents",
            title: "Documents",
            key: "documents"
        },
        {
            id: "status-history",
            title: "Status History",
            key: "status_history"
        },
        {
            id: "notes",
            title: "Notes",
            key: "deal_notes"
        },
        {
            id: "activities",
            title: "Activities",
            key: "activities"
        }
    ];

    // Tab navigation
    const tabBar = createElement("div", "deal-tabs");

    sections.forEach((section, index) => {
        const button = createElement("button", "deal-tab", section.title);

        button.type = "button";
        button.dataset.tab = section.id;

        if (index === 0) {
            button.classList.add("active");
        }

        tabBar.appendChild(button);
    });

    content.appendChild(tabBar);

    // Tab content container
    const tabContent = createElement("div", "deal-tab-content");

    sections.forEach((section, index) => {
        const panel = createElement("div", "deal-tab-panel");

        panel.dataset.panel = section.id;
        panel.hidden = index !== 0;

        addCollectionTable(
            panel,
            deal[section.key] ?? []
        );

        tabContent.appendChild(panel);
    });

    content.appendChild(tabContent);

    // Tab switching
    tabBar.addEventListener("click", event => {
        const button = event.target.closest(".deal-tab");

        if (!button) return;

        const selectedTab = button.dataset.tab;

        tabBar.querySelectorAll(".deal-tab").forEach(tab => {
            tab.classList.toggle(
                "active",
                tab.dataset.tab === selectedTab
            );
        });

        tabContent.querySelectorAll(".deal-tab-panel").forEach(panel => {
            panel.hidden = panel.dataset.panel !== selectedTab;
        });
    });
}


// Deal information table
function addDealInformation(container, deal) {
    const fields = {
        "Deal Number": deal.deal_number,
        "Deal Name": deal.deal_name,
        "Customer": deal.client,
        "Status": deal.status,
        "Target Date": deal.target_date,
        "Created By": deal.created_by,
        "Created At": deal.created_at,
        "Last Updated": deal.updated_at,
        "Notes": deal.notes
    };

    const table = createElement("table", "deal-data-table");
    const tbody = document.createElement("tbody");

    Object.entries(fields).forEach(([label, value]) => {
        const row = document.createElement("tr");

        const heading = createElement("th", null, label);
        const cell = createElement("td", null, formatValue(value));

        row.append(heading, cell);
        tbody.appendChild(row);
    });

    table.appendChild(tbody);
    container.appendChild(table);
}


// Related records table
function addCollectionTable(container, records) {
    if (!Array.isArray(records) || records.length === 0) {
        container.appendChild(
            createElement("p", "muted", "No records available.")
        );
        return;
    }

    const hiddenFields = [
        "id",
        "deal",
        "deal_id"
    ];

    // Build columns from all returned records
    const columns = [
        ...new Set(
            records.flatMap(record =>
                Object.keys(record).filter(key => !hiddenFields.includes(key))
            )
        )
    ];

    const wrapper = createElement("div", "deals-table-wrapper");
    const table = createElement("table", "deal-data-table");

    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");

    columns.forEach(column => {
        headerRow.appendChild(
            createElement("th", null, formatLabel(column))
        );
    });

    thead.appendChild(headerRow);

    const tbody = document.createElement("tbody");

    records.forEach(record => {
        const row = document.createElement("tr");

        columns.forEach(column => {
            row.appendChild(
                createElement("td", null, formatValue(record[column]))
            );
        });

        tbody.appendChild(row);
    });

    table.append(thead, tbody);
    wrapper.appendChild(table);
    container.appendChild(wrapper);
}

function openEditMode() {
    if (!selectedDeal) return;

    const content = document.getElementById("deal-details-content");
    const editForm = document.getElementById("edit-deal-form");
    const editButton = document.getElementById("edit-deal-button");

    document.getElementById("edit-deal-id").value = selectedDeal.id;
    document.getElementById("edit-deal-name").value =
        selectedDeal.deal_name ?? "";

    document.getElementById("edit-deal-client").value =
        selectedDeal.client_id ?? "";

    document.getElementById("edit-deal-status").value =
        selectedDeal.status_id ?? "";

    content.hidden = true;
    editButton.hidden = true;
    editForm.hidden = false;
}
