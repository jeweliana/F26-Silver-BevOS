let users = [];
let currentAdmin = null;

// Check that the logged-in user is an administrator.
async function requireAdmin() {
    const user = await currentUser();

    if (!user || !user.is_authenticated) {
        window.location.replace("/pages/login.html?message=unauthorized");
        return false;
    }

    if (!user.is_admin) {
        window.location.replace("/index.html");
        return false;
    }

    currentAdmin = user;

    const app = document.getElementById("app");
    if (app) app.hidden = false;

    return true;
}


// Load all accounts from Django.
async function loadUsers() {
    const status = document.getElementById("users-status");
    const tableBody = document.getElementById("users-table-body");

    try {
        users = await API.get("/auth/admin/users/");

        renderUsers(users);

        status.textContent = `${users.length} account(s) found.`;
    } catch (error) {
        status.textContent = "Unable to load accounts.";
        tableBody.innerHTML = `
            <tr>
                <td colspan="4">Error loading accounts.</td>
            </tr>
        `;
    }
}


// Render accounts in the table.
function renderUsers(accountList) {
    const tableBody = document.getElementById("users-table-body");

    tableBody.replaceChildren();

    if (!accountList.length) {
        const row = document.createElement("tr");
        const cell = document.createElement("td");

        cell.colSpan = 4;
        cell.textContent = "No accounts found.";

        row.appendChild(cell);
        tableBody.appendChild(row);
        return;
    }

    accountList.forEach((user) => {
        const row = document.createElement("tr");

        const username = document.createElement("td");
        username.textContent = user.username;

        const email = document.createElement("td");
        email.textContent = user.email;

        const role = document.createElement("td");
        const roleLabels = {
            admin: "Administrator",
            manager: "Manager",
            staff: "Staff"
        };

        role.textContent = roleLabels[user.role] || user.role;

        const action = document.createElement("td");

        // Prevent deleting the currently logged-in administrator.
        if (user.id === currentAdmin.id) {
            action.textContent = "Current account";
        } else {
            const deleteButton = document.createElement("button");

            deleteButton.type = "button";
            deleteButton.textContent = "Delete";
            deleteButton.addEventListener("click", () => {
                deleteUser(user.id, user.username);
            });

            action.appendChild(deleteButton);
        }

        row.append(username, email, role, action);
        tableBody.appendChild(row);
    });
}


// Create a new account.
function wireCreateUserForm() {
    const form = document.getElementById("create-user-form");
    const status = document.getElementById("create-user-status");

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const formData = Object.fromEntries(
            new FormData(form).entries()
        );

        status.hidden = false;
        status.textContent = "Creating account...";

        try {
            await API.post("/auth/admin/users/", formData);

            status.textContent = "Account created successfully.";
            form.reset();

            await loadUsers();
        } catch (error) {
            status.textContent =
                error.message || "Unable to create account.";
        }
    });
}


// Delete an account.
async function deleteUser(userId, username) {
    const confirmed = confirm(
        `Are you sure you want to delete the account "${username}"?`
    );

    if (!confirmed) return;

    try {
        await API.del(`/auth/admin/users/${userId}/`);

        await loadUsers();
    } catch (error) {
        alert(error.message || "Unable to delete account.");
    }
}


// Search accounts.
function wireUserSearch() {
    const search = document.getElementById("user-search");

    search.addEventListener("input", () => {
        const query = search.value.toLowerCase();

        const filteredUsers = users.filter((user) =>
            (user.username || "").toLowerCase().includes(query) ||
            (user.email || "").toLowerCase().includes(query) ||
            (user.role || "").toLowerCase().includes(query)
        );

        renderUsers(filteredUsers);
    });
}


// Initialize the administration page.
document.addEventListener("DOMContentLoaded", async () => {
    const authorized = await requireAdmin();

    if (!authorized) return;

    wireAuthLinks();
    wireCreateUserForm();
    wireUserSearch();

    await loadUsers();
});