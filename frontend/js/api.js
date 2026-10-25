
const API_BASE_URL = "http://127.0.0.1:8000";

// Read the current access token.
function getAuthToken() {
    return sessionStorage.getItem("access_token");
}

// Shared API request handler.
async function apiRequest(endpoint, options = {}) {
    const token = getAuthToken();

    const headers = {
        Accept: "application/json",
        ...(options.body !== undefined
            ? { "Content-Type": "application/json" }
            : {}),
        ...(options.headers || {})
    };

    // Attach the token only when one exists.
    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    let response;

    try {
        response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers
        });
    } catch (error) {
        console.error("Network error:", error);

        const networkError = new Error(
            "Cannot connect to the backend. Make sure FastAPI is running at " +
            API_BASE_URL
        );

        networkError.endpoint = endpoint;
        networkError.cause = error;

        throw networkError;
    }

    const responseText = await response.text();
    let data = null;

    if (responseText) {
        try {
            data = JSON.parse(responseText);
        } catch {
            data = responseText;
        }
    }

    if (!response.ok) {
        const detail =
            data && typeof data === "object"
                ? data.detail
                : null;

        let message;

        if (Array.isArray(detail)) {
            message = detail
                .map(item => item.msg || JSON.stringify(item))
                .join(", ");
        } else if (typeof detail === "string") {
            message = detail;
        } else if (detail && typeof detail === "object") {
            message = detail.message || JSON.stringify(detail);
        } else if (
            data &&
            typeof data === "object" &&
            typeof data.message === "string"
        ) {
            message = data.message;
        } else if (typeof data === "string" && data.trim()) {
            message = data;
        } else {
            message = `Request failed with status ${response.status}`;
        }

        console.error("API request failed:", {
            endpoint,
            status: response.status,
            response: data
        });

        const error = new Error(message);

        // Preserve information for authentication handling.
        error.status = response.status;
        error.endpoint = endpoint;
        error.detail = detail;

        throw error;
    }

    return data;
}

// GET request.
async function apiGet(endpoint) {
    return apiRequest(endpoint, {
        method: "GET"
    });
}

// POST request.
async function apiPost(endpoint, body) {
    return apiRequest(endpoint, {
        method: "POST",
        body: JSON.stringify(body)
    });
}

// PUT request.
async function apiPut(endpoint, body) {
    return apiRequest(endpoint, {
        method: "PUT",
        body: JSON.stringify(body)
    });
}

/* =========================================
   SHARED DASHBOARD HELPERS
========================================= */

// Set text by element ID or by passing an element directly.
function setText(target, value) {
    const element =
        typeof target === "string"
            ? document.getElementById(target)
            : target;

    if (element) {
        element.textContent = value ?? "";
    }
}

// Check whether an API request failed because of authentication.
function isAuthenticationError(error) {
    return error?.status === 401 || error?.status === 403;
}

// Display an authentication message on the dashboard.
function showAuthenticationMessage() {
    const message = document.getElementById("dashboard-message");

    if (!message) return;

    message.textContent =
        "Your session may have expired or you may not have permission. Please sign in again.";

    message.classList.remove("hidden");
    message.setAttribute("role", "alert");
}

// Get a readable error message.
function getErrorMessage(
    error,
    fallback = "Something went wrong."
) {
    return error?.message || fallback;
}

// Show or hide an element's message.
function hideMessage(target) {
    const element =
        typeof target === "string"
            ? document.getElementById(target)
            : target;

    if (element) {
        element.classList.add("hidden");
    }
}

// Display a message in an element.
function showMessage(target, message, type = "error") {
    const element =
        typeof target === "string"
            ? document.getElementById(target)
            : target;

    if (!element) return;

    element.textContent = message;
    element.classList.remove("hidden");

    // Use a class that CSS can style.
    element.classList.remove(
        "error",
        "success",
        "warning",
        "info"
    );
    element.classList.add(type);

    element.setAttribute("role", "alert");
}

// Manage a button's loading state.
function setButtonLoading(
    button,
    isLoading,
    normalText,
    loadingText = "Loading..."
) {
    if (!button) return;

    if (isLoading) {
        if (button.dataset.originalText === undefined) {
            button.dataset.originalText =
                button.textContent.trim() || normalText || "";
        }

        button.disabled = true;
        button.textContent = loadingText;
        return;
    }

    button.disabled = false;

    if (button.dataset.originalText !== undefined) {
        button.textContent = button.dataset.originalText;
        delete button.dataset.originalText;
    } else if (normalText !== undefined) {
        button.textContent = normalText;
    }
}

// Render an empty-state row inside a table body.
function renderEmptyTable(
    tbody,
    columnCount,
    message
) {
    if (!tbody) return;

    const row = document.createElement("tr");
    const cell = document.createElement("td");

    cell.colSpan = columnCount;
    cell.className = "table-message";
    cell.textContent = message;

    row.appendChild(cell);
    tbody.replaceChildren(row);
}

// Create a safe table cell.
function createCell(value) {
    const cell = document.createElement("td");
    cell.textContent = value ?? "—";
    return cell;
}
