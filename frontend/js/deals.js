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

    
    // Initialize the new customer and deal forms
    try {
        setupCreationForms();
    } catch (error) {
        console.error("Unable to initialize creation forms:", error);
    }
    // Load the existing deals and form data
    Promise.all([
        loadClients(),
        loadStatuses()
    ])
    .then(() => loadDeals())
    .catch(error => {
        console.error("Unable to load form data:", error);
        document.getElementById("deals-status").textContent =
            "Unable to load deals: " + error.message;
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
        } else if (section.id === "packaging") {
            addPackagingRequirements(panel, deal);
        } else if (section.id === "customer-pos") {
            addCustomerOrders(panel, deal);
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


function addPackagingRequirements(panel, deal) {
    const heading = createElement("div", "order-heading");
    heading.appendChild(createElement("h3", null, "Packaging Requirements"));
    const addButton = createElement("button", null, "+ Add Packaging Requirement");
    addButton.type = "button";
    heading.appendChild(addButton);
    panel.appendChild(heading);

    const form = document.createElement("form");
    form.className = "order-form";
    form.hidden = true;
    form.innerHTML = `
        <label>Item Type *
            <select name="item_type" required>
                <option value="">Select packaging type</option>
                <option value="can">Can</option>
                <option value="end">End</option>
                <option value="carton">Carton</option>
                <option value="tray">Tray</option>
            </select>
        </label>
        <label>Quantity
            <input name="quantity" type="number" min="0" step="0.001">
        </label>
        <label>Unit<input name="unit" maxlength="50" placeholder="e.g. each"></label>
        <label>Unit of Measure<input name="uom" maxlength="50" placeholder="e.g. cases"></label>
        <label class="order-wide">Specification
            <textarea name="specification" rows="2"></textarea>
        </label>
        <label class="order-wide">Notes<textarea name="notes" rows="2"></textarea></label>
        <div class="order-actions">
            <button type="submit">Save Packaging Requirement</button>
            <button type="button" class="packaging-cancel">Cancel</button>
        </div>
        <p class="order-feedback" role="status" aria-live="polite"></p>
    `;
    panel.appendChild(form);
    const feedback = form.querySelector(".order-feedback");
    addButton.addEventListener("click", () => {
        form.hidden = false;
        form.elements.item_type.focus();
    });
    form.querySelector(".packaging-cancel").addEventListener("click", () => {
        form.reset();
        feedback.textContent = "";
        form.hidden = true;
    });
    form.addEventListener("submit", async event => {
        event.preventDefault();
        const submit = form.querySelector('[type="submit"]');
        if (submit.disabled) return;
        submit.disabled = true;
        feedback.textContent = "Saving packaging requirement...";
        try {
            const values = Object.fromEntries(new FormData(form).entries());
            await API.post(`/deals/${deal.id}/packaging-requirements/`, values);
            await refreshDealKeepingTab(deal.id, "packaging");
        } catch (error) {
            feedback.textContent = "Could not save packaging requirement: " + error.message;
        } finally {
            submit.disabled = false;
        }
    });
    addCollectionTable(panel, deal.packaging_requirements ?? []);
}

const orderStatuses = [
    "Draft",
    "Open",
    "In Progress",
    "Completed",
    "Cancelled"
];

function addCustomerOrders(panel, deal) {
    // Heading and Add Order button
    const heading = createElement("div", "order-heading");
    heading.appendChild(
        createElement("h3", null, "Customer Purchase Orders")
    );

    const addButton = createElement("button", null, "+ Add Order");
    addButton.type = "button";
    heading.appendChild(addButton);
    panel.appendChild(heading);

    // Create the order form
    const form = document.createElement("form");
    form.className = "order-form";
    form.hidden = true;

    form.innerHTML = `
        <label>
            PO Number *
            <input name="po_number" maxlength="100"
                   required placeholder="e.g. PO-2026-004">
        </label>

        <label>
            PO Date
            <input name="po_date" type="date">
        </label>

        <label>
            Expected Ship Date
            <input name="expected_ship_date" type="date">
        </label>

        <label>
            Total Amount (USD)
            <input name="total_amount" type="number"
                   step="0.01" min="0" placeholder="0.00">
        </label>

        <label>
            Status
            <select name="status">
                ${orderStatuses.map(status =>
                    `<option value="${status}">${status}</option>`
                ).join("")}
            </select>
        </label>

        <label class="order-wide">
            Notes
            <textarea name="notes" rows="2"></textarea>
        </label>

        <div class="order-actions">
            <button type="submit">Save Order</button>
            <button type="button" class="order-cancel">Cancel</button>
        </div>

        <p class="order-feedback" role="status"
           aria-live="polite"></p>
    `;

    panel.appendChild(form);

    // Show or hide the form
    addButton.addEventListener("click", () => {
        form.hidden = !form.hidden;

        if (!form.hidden) {
            form.elements.po_number.focus();
        }
    });

    // Cancel creating an order
    form.querySelector(".order-cancel").addEventListener("click", () => {
        form.reset();
        form.hidden = true;
    });

    // Save a new order
    form.addEventListener("submit", async event => {
        event.preventDefault();

        const submit = form.querySelector('[type="submit"]');
        const feedback = form.querySelector(".order-feedback");
        const values = Object.fromEntries(new FormData(form).entries());

        submit.disabled = true;
        feedback.textContent = "Saving order...";

        try {
            await API.post(`/deals/${deal.id}/customer-pos/`, values);
            await refreshDealKeepingTab(deal.id, "customer-pos");
        } catch (error) {
            feedback.textContent = "Could not save order: " + error.message;
        } finally {
            submit.disabled = false;
        }
    });

    // Display existing orders
    const orders = deal.customer_pos ?? [];

    if (!orders.length) {
        panel.appendChild(
            createElement("p", "muted", "No customer purchase orders yet.")
        );
        return;
    }

    const wrapper = createElement("div", "deals-table-wrapper");
    const table = createElement("table", "deal-data-table");

    // Table headers
    const header = document.createElement("tr");

    [
        "PO Number",
        "PO Date",
        "Expected Ship Date",
        "Amount",
        "Status",
        "Actions"
    ].forEach(label => {
        header.appendChild(createElement("th", null, label));
    });

    const thead = document.createElement("thead");
    thead.appendChild(header);
    table.appendChild(thead);

    const body = document.createElement("tbody");

    // Create a row for each order
    orders.forEach(order => {
        const row = document.createElement("tr");

        [
            order.po_number,
            order.po_date,
            order.expected_ship_date,
            order.total_amount == null
                ? "—"
                : `${order.currency || "USD"} ${order.total_amount}`
        ].forEach(value => {
            row.appendChild(
                createElement("td", null, formatValue(value))
            );
        });

        // Status dropdown
        const statusCell = document.createElement("td");
        const statusSelect = document.createElement("select");

        statusSelect.setAttribute(
            "aria-label",
            `Status for ${order.po_number}`
        );

        orderStatuses.forEach(status => {
            const option = document.createElement("option");
            option.value = status;
            option.textContent = status;
            statusSelect.appendChild(option);
        });

        // Preserve existing statuses from the database
        if (order.status && !orderStatuses.includes(order.status)) {
            const original = document.createElement("option");
            original.value = order.status;
            original.textContent = order.status;
            statusSelect.appendChild(original);
        }

        statusSelect.value = order.status || "Draft";
        statusCell.appendChild(statusSelect);
        row.appendChild(statusCell);

        // Save Status button
        const actionCell = document.createElement("td");
        const save = createElement("button", null, "Save Status");
        save.type = "button";

        const message = createElement("span", "order-row-message", "");
        message.setAttribute("role", "status");

        save.addEventListener("click", async () => {
            save.disabled = true;
            message.textContent = "Saving...";

            try {
                await API.patch(
                    `/deals/${deal.id}/customer-pos/${order.id}/`,
                    { status: statusSelect.value }
                );

                message.textContent = "Saved";
                await refreshDealKeepingTab(deal.id, "customer-pos");
            } catch (error) {
                message.textContent = error.message;
            } finally {
                save.disabled = false;
            }
        });

        actionCell.append(save, message);
        row.appendChild(actionCell);
        body.appendChild(row);
    });

    table.appendChild(body);
    wrapper.appendChild(table);
    panel.appendChild(wrapper);
}

// Reload updated order data without leaving the Customer POs tab
async function refreshDealKeepingTab(dealId, tab) {
    const updated = await API.get(`/deals/${dealId}/detail/`);

    if (String(selectedDealId) !== String(dealId)) {
        return;
    }

    selectedDeal = updated;
    renderDealDetails(updated);

    document.querySelector(
        `#deal-details-content .deal-tab[data-tab="${tab}"]`
    )?.click();
}

function setupCreationForms() {
    const customerPanel = document.getElementById("new-customer-panel");
    const dealPanel = document.getElementById("new-deal-panel");

    const customerForm = document.getElementById("new-customer-form");
    const dealForm = document.getElementById("new-deal-form");

    // Show the customer creation form
    document.getElementById("new-customer-btn").addEventListener("click", () => {
        dealPanel.hidden = true;
        customerPanel.hidden = false;
        customerPanel.scrollIntoView({ behavior: "smooth" });
    });

    // Show the deal creation form
    document.getElementById("new-deal-btn").addEventListener("click", () => {
        customerPanel.hidden = true;
        dealPanel.hidden = false;
        populateDealDropdowns();
        dealPanel.scrollIntoView({ behavior: "smooth" });
    });

    // Cancel buttons
    document.getElementById("cancel-new-customer").addEventListener("click", () => {
        customerForm.reset();
        customerPanel.hidden = true;
        document.getElementById("customer-form-message").textContent = "";
    });

    document.getElementById("cancel-new-deal").addEventListener("click", () => {
        dealForm.reset();
        dealPanel.hidden = true;
        document.getElementById("deal-form-message").textContent = "";
    });

    // Save a new customer
    customerForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const message = document.getElementById("customer-form-message");
        const saveButton = customerForm.querySelector('[type="submit"]');
        const values = Object.fromEntries(new FormData(customerForm).entries());

        saveButton.disabled = true;
        message.textContent = "Saving customer...";

        try {
            const result = await API.post("/clients/create/", values);

            await loadClients();

            customerForm.reset();
            customerPanel.hidden = true;
            message.textContent = "";

            // Open new deal form with new customer selected
            populateDealDropdowns();
            document.getElementById("new-deal-client").value = String(result.id);
            dealPanel.hidden = false;
            dealPanel.scrollIntoView({ behavior: "smooth" });

        } catch (error) {
            message.textContent = "Unable to save customer: " + error.message;
        } finally {
            saveButton.disabled = false;
        }
    });

    // Save a new deal
    dealForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const message = document.getElementById("deal-form-message");
        const saveButton = dealForm.querySelector('[type="submit"]');
        const values = Object.fromEntries(new FormData(dealForm).entries());

        saveButton.disabled = true;
        message.textContent = "Saving deal...";

        try {
            const result = await API.post("/deals/create/", values);

            await loadDeals();

            dealForm.reset();
            dealPanel.hidden = true;
            message.textContent = "";

            // Automatically open the new deal
            await loadDealDetails(result.id);

        } catch (error) {
            message.textContent = "Unable to save deal: " + error.message;
        } finally {
            saveButton.disabled = false;
        }
    });
}


// Fill the dropdowns with data from the backend
function populateDealDropdowns() {
    const customerSelect = document.getElementById("new-deal-client");
    const statusSelect = document.getElementById("new-deal-status");

    customerSelect.replaceChildren(new Option("Select customer", ""));
    statusSelect.replaceChildren(new Option("Select status", ""));

    allClients.forEach(customer => {
        customerSelect.add(
            new Option(customer.client_name, customer.id)
        );
    });

    allStatuses.forEach(status => {
        statusSelect.add(
            new Option(status.status_name, status.id)
        );
    });
}


