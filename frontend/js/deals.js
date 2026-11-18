let allDeals = [];
let allClients = [];
let allStatuses = [];
let selectedDealId = null;
let selectedDeal = null;
let isEditingDeal = false;

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

        searchDeals();

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
            isEditingDeal = false;
        });

    // Enter edit mode
    document.getElementById("edit-deal-button")
        .addEventListener("click", () => {
            if (!selectedDeal) return;

            isEditingDeal = true;
            renderDealDetails(selectedDeal);
        });

    // Save changes
    document.getElementById("save-deal-button")
        .addEventListener("click", saveDealChanges);

    // Cancel editing
    document.getElementById("cancel-edit")
        .addEventListener("click", () => {
            isEditingDeal = false;
            renderDealDetails(selectedDeal);
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
}

async function loadStatuses() {
    const data = await API.get("/statuses/");

    allStatuses = Array.isArray(data)
        ? data
        : data.results ?? [];
}

async function loadDealDetails(dealId) {
    const panel = document.getElementById("deal-details-panel");
    const content = document.getElementById("deal-details-content");
    const editButton = document.getElementById("edit-deal-button");

    selectedDealId = dealId;
    isEditingDeal = false;

    panel.hidden = false;
    content.hidden = false;
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

    // Define tabs and their corresponding API fields
    const sections = [
        {
            id: "deal-info",
            title: "Deal Information",
            type: "details"
        },
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
        const button = createElement(
            "button",
            "deal-tab",
            section.title
        );

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

        if (section.type === "details") {
            addDealInformation(panel, deal);
        } else {
            addCollectionTable(
                panel,
                deal[section.key] ?? []
            );
        }

        tabContent.appendChild(panel);
    });

    content.appendChild(tabContent);

    // Update edit buttons
    document.getElementById("edit-deal-button").hidden = isEditingDeal;
    document.getElementById("save-deal-button").hidden = !isEditingDeal;
    document.getElementById("cancel-edit").hidden = !isEditingDeal;

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


function addDealInformation(container, deal) {
    const fields = [
        ["Deal Number", deal.deal_number, false],
        ["Deal Name", deal.deal_name, true],
        ["Customer", deal.client, true, "client"],
        ["Status", deal.status, true, "status"],
        ["Target Date", deal.target_date, true, "date"],
        ["Created By", deal.created_by, false],
        ["Created At", deal.created_at, false],
        ["Last Updated", deal.updated_at, false],
        ["Notes", deal.notes, true, "textarea"]
    ];

    const table = createElement("table", "deal-data-table");
    const tbody = document.createElement("tbody");

    fields.forEach(([label, value, editable, type]) => {
        const row = document.createElement("tr");

        row.appendChild(createElement("th", null, label));

        const cell = document.createElement("td");

        if (isEditingDeal && editable) {
            let input;

            if (type === "client" || type === "status") {
                input = document.createElement("select");
                const placeholder = document.createElement("option");
                placeholder.value = "";
                placeholder.textContent = "Select an option";
                placeholder.disabled = true;
                placeholder.selected = true;

                input.appendChild(placeholder);
                const options = type === "client"
                    ? allClients.map(item => ({
                        id: item.id,
                        name: item.client_name
                    }))
                    : allStatuses.map(item => ({
                        id: item.id,
                        name: item.status_name
                    }));

                options.forEach(optionData => {
                    const option = document.createElement("option");
                    option.value = optionData.id;
                    option.textContent = optionData.name;
                    input.appendChild(option);
                });

                input.value = String(
                    type === "client"
                        ? deal.client_id
                        : deal.status_id
                );

            } else if (type === "textarea") {
                input = document.createElement("textarea");
                input.value = value ?? "";

            } else {
                input = document.createElement("input");
                input.type = type === "date" ? "date" : "text";

                input.value = value == null
                    ? ""
                    : type === "date"
                        ? String(value).slice(0, 10)
                        : String(value);
            }

            input.dataset.field = type === "client"
                ? "client"
                : type === "status"
                    ? "status"
                    : label === "Deal Name"
                        ? "deal_name"
                        : label === "Target Date"
                            ? "target_date"
                            : "notes";

            input.classList.add("deal-edit-input");
            cell.appendChild(input);

        } else {
            cell.textContent = formatValue(value);
        }

        row.appendChild(cell);
        tbody.appendChild(row);
    });

    table.appendChild(tbody);
    container.appendChild(table);
}



async function saveDealChanges() {
    if (!selectedDeal) return;

    const saveButton = document.getElementById("save-deal-button");

    if (saveButton.disabled) return;

    saveButton.disabled = true;

    try {
        const inputs = document.querySelectorAll(".deal-edit-input");
        const updatedDeal = {};

        for (const input of inputs) {
            const field = input.dataset.field;
            const value = input.value.trim();

            if (["client", "status"].includes(field)) {
                if (!value || Number(value) <= 0) {
                    alert(`Please select a valid ${field}.`);
                    input.focus();
                    return;
                }

                updatedDeal[field] = Number(value);

            } else {
                updatedDeal[field] = value;
            }
        }

        if (!updatedDeal.deal_name) {
            alert("Deal name cannot be empty.");
            return;
        }

        await API.patch(`/deals/${selectedDeal.id}/`, updatedDeal);

        isEditingDeal = false;

        await loadDeals();
        await loadDealDetails(selectedDeal.id);

        alert("Deal updated successfully!");

    } catch (error) {
        console.error("Update failed:", error);
        alert("Unable to update deal: " + error.message);

    } finally {
        saveButton.disabled = false;
    }
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
