

/* =========================================================
   FARMWISE AI — SMART UREA MANAGEMENT SYSTEM
   Admin Dashboard JavaScript
   File: js/admin.js
   ========================================================= */

"use strict";

/* ---------- CONFIGURATION ---------- */

const API_BASE = (
    window.API_BASE_URL || "http://127.0.0.1:8000"
).replace(/\/+$/, "");

const getToken = () => sessionStorage.getItem("access_token");

let allFarmers = [];
let allDealers = [];
let dashboardLoaded = false;

const numberFormat = (value) =>
    new Intl.NumberFormat("en-IN", {
        maximumFractionDigits: 2
    }).format(Number(value ?? 0));

const escapeHTML = (value) =>
    String(value ?? "").replace(/[&<>"']/g, (char) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);

/* ---------- DOM HELPERS ---------- */

const getElement = (id) => document.getElementById(id);

function showNotice(message, type = "info") {
    const notice = getElement("notice");
    if (!notice) return;

    notice.textContent = message;
    notice.className = "notice";

    if (["success", "error", "warning"].includes(type)) {
        notice.classList.add(type);
    }

    notice.hidden = false;
}

function hideNotice() {
    const notice = getElement("notice");
    if (!notice) return;

    notice.hidden = true;
    notice.textContent = "";
    notice.className = "notice";
}

function setText(id, value) {
    const element = getElement(id);
    if (element) element.textContent = value ?? "—";
}

function setLoading(isLoading) {
    const button = getElement("refresh-btn");
    if (!button) return;

    button.disabled = isLoading;
    button.textContent = isLoading
        ? "Refreshing..."
        : "Refresh Data";
}

/* ---------- API HELPERS ---------- */

async function apiRequest(path, options = {}) {
    const headers = {
        Accept: "application/json",
        ...(options.headers || {})
    };

    const token = getToken();

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers
    });

    if (response.status === 401) {
        sessionStorage.removeItem("access_token");
        sessionStorage.removeItem("token_type");
        sessionStorage.removeItem("user_role");
        sessionStorage.removeItem("user_email");
        sessionStorage.removeItem("user");

        window.location.href = "login.html";

        throw new Error(
            "Your session has expired. Please log in again."
        );
    }

    if (response.status === 403) {
        throw new Error(
            "Access denied. Please log in with an Admin account."
        );
    }

    const contentType =
        response.headers.get("content-type") || "";

    let data;

    if (contentType.includes("application/json")) {
        data = await response.json();
    } else {
        const responseText = await response.text();
        data = responseText ? { detail: responseText } : {};
    }

    if (!response.ok) {
        throw new Error(
            data?.detail ||
            data?.message ||
            `Request failed with status ${response.status}.`
        );
    }

    return data;
}

/* ---------- SESSION / ADMIN PROFILE ---------- */

async function loadAdminProfile() {
    if (!getToken()) {
        window.location.href = "login.html";
        return null;
    }

    try {
        const user = await apiRequest("/auth/me");

        if (String(user?.role || "").toLowerCase() !== "admin") {
            sessionStorage.removeItem("access_token");
            sessionStorage.removeItem("user_role");
            sessionStorage.removeItem("user_email");
            sessionStorage.removeItem("user");

            window.location.href = "login.html";
            return null;
        }

        setText(
            "admin-name",
            user.full_name ||
            user.name ||
            user.email ||
            "Administrator"
        );

        sessionStorage.setItem("user_role", "admin");
        sessionStorage.setItem("user_email", user.email || "");
        sessionStorage.setItem("user", JSON.stringify(user));

        return user;
    } catch (error) {
        if (!error.message.includes("expired")) {
            showNotice(
                error.message || "Unable to load the Admin profile.",
                "error"
            );
        }

        return null;
    }
}

/* ---------- NAVIGATION ---------- */

function showSection(sectionId) {
    const target = getElement(sectionId);
    if (!target) return;

    document.querySelectorAll(".dashboard-section").forEach(section => {
        section.hidden = section.id !== sectionId;
    });

    document.querySelectorAll(".nav-link").forEach(button => {
        const isActive = button.dataset.section === sectionId;

        button.classList.toggle("active", isActive);

        if (isActive) {
            button.setAttribute("aria-current", "page");
        } else {
            button.removeAttribute("aria-current");
        }
    });
}

function initializeNavigation() {
    document.querySelectorAll(".nav-link").forEach(button => {
        if (button.dataset.navigationInitialized) return;

        button.addEventListener("click", () => {
            const sectionId = button.dataset.section;

            showSection(sectionId);
            hideNotice();

            if (sectionId === "users-section") {
                loadFarmersData();
            } else if (sectionId === "dealers-section") {
                loadDealersData();
            } else if (sectionId === "inventory-section") {
                loadAdminInventory();
            } else if (sectionId === "overview-section") {
                if (!dashboardLoaded) {
                    loadDashboardData();
                }
            }
        });

        button.dataset.navigationInitialized = "true";
    });

    getElement("refresh-farmers-btn")
        ?.addEventListener("click", loadFarmersData);

    getElement("refresh-dealers-btn")
        ?.addEventListener("click", loadDealersData);

    getElement("refresh-inventory-btn")
        ?.addEventListener("click", loadAdminInventory);
}

/* ---------- DATA NORMALIZATION ---------- */

function getFirstDefined(object, keys, fallback = 0) {
    for (const key of keys) {
        if (
            object &&
            Object.prototype.hasOwnProperty.call(object, key) &&
            object[key] !== null &&
            object[key] !== undefined
        ) {
            return object[key];
        }
    }

    return fallback;
}

function getArray(data, keys) {
    for (const key of keys) {
        if (Array.isArray(data?.[key])) {
            return data[key];
        }
    }

    return [];
}

function getMetrics(data) {
    return data?.metrics || data?.summary || data || {};
}

function isTrue(value) {
    return value === true ||
        value === 1 ||
        value === "true";
}

/* ---------- OVERVIEW METRIC CARDS ---------- */

function updateMetrics(data) {
    const metrics = getMetrics(data);

    const farmers = getFirstDefined(metrics, [
        "farmers",
        "farmer_count",
        "total_farmers",
        "registered_farmers"
    ]);

    const dealers = getFirstDefined(metrics, [
        "dealers",
        "dealer_count",
        "total_dealers",
        "registered_dealers"
    ]);

    const pending = getFirstDefined(metrics, [
        "pending_verification",
        "pending_count",
        "pending_dealers",
        "unverified_dealers"
    ]);

    const stores = getFirstDefined(metrics, [
        "active_stores",
        "stores",
        "store_count",
        "total_stores"
    ]);

    const availableStock = getFirstDefined(metrics, [
        "available_stock",
        "total_available_stock",
        "available_quantity"
    ]);

    const totalStock = getFirstDefined(metrics, [
        "total_stock",
        "total_recorded_stock",
        "total_quantity"
    ]);

    const reservedStock = getFirstDefined(metrics, [
        "reserved_stock",
        "total_reserved_stock",
        "reserved_quantity"
    ]);

    const inventoryCount = getFirstDefined(metrics, [
        "inventory_records",
        "inventory_count",
        "total_inventory_records"
    ]);

    setText("farmers-count", numberFormat(farmers));
    setText("dealers-count", numberFormat(dealers));
    setText("pending-count", numberFormat(pending));
    setText("stores-count", numberFormat(stores));

    setText("available-stock", numberFormat(availableStock));
    setText("total-stock", numberFormat(totalStock));
    setText("reserved-stock", numberFormat(reservedStock));
    setText("inventory-count", numberFormat(inventoryCount));
}

/* ---------- DATE FORMATTING ---------- */

function formatDate(value) {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return String(value);
    }

    return date.toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        dateStyle: "medium",
        timeStyle: "short"
    });
}

/* =========================================================
   PRODUCT SUMMARY TABLE
   ========================================================= */

function renderProducts(products) {
    const tbody = getElement("products-body");
    if (!tbody) return;

    if (!products.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="3" class="empty-state">
                    No product summary data is available.
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = products.map(product => {
        const name = getFirstDefined(product, [
            "product_name",
            "name",
            "product",
            "fertilizer_name"
        ], "Unknown product");

        const available = getFirstDefined(product, [
            "available_quantity",
            "available_stock",
            "available",
            "total_available"
        ]);

        const records = getFirstDefined(product, [
            "inventory_records",
            "record_count",
            "inventory_count",
            "records"
        ]);

        return `
            <tr>
                <td>${escapeHTML(name)}</td>
                <td>${numberFormat(available)}</td>
                <td>${numberFormat(records)}</td>
            </tr>
        `;
    }).join("");
}

/* =========================================================
   INVENTORY TABLE
   ========================================================= */

function renderInventory(inventory) {
    const tbody = getElement("inventory-body");
    if (!tbody) return;

    if (!Array.isArray(inventory) || inventory.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="empty-state">
                    No inventory records are available.
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = inventory.map(item => {
        const product = getFirstDefined(item, [
            "product_name",
            "name",
            "product",
            "fertilizer_name"
        ], "—");

        const store = getFirstDefined(item, [
            "store_name",
            "dealer_name",
            "store",
            "dealer"
        ], "—");

        const district = getFirstDefined(item, [
            "district",
            "store_district",
            "location"
        ], "—");

        const available = getFirstDefined(item, [
            "available_quantity_kg",
            "available_quantity",
            "available_stock",
            "available",
            "quantity_available"
        ]);

        const reserved = getFirstDefined(item, [
            "reserved_quantity_kg",
            "reserved_quantity",
            "reserved_stock",
            "reserved",
            "quantity_reserved"
        ]);

        const price = getFirstDefined(item, [
            "price_per_kg",
            "price",
            "unit_price"
        ], null);

        const updated = getFirstDefined(item, [
            "last_updated_at",
            "last_updated",
            "updated_at",
            "modified_at",
            "created_at"
        ], null);

        return `
            <tr>
                <td>${escapeHTML(product)}</td>
                <td>${escapeHTML(store)}</td>
                <td>${escapeHTML(district)}</td>
                <td>${numberFormat(available)}</td>
                <td>${numberFormat(reserved)}</td>
                <td>
                    ${price === null ? "—" : "₹" + numberFormat(price)}
                </td>
                <td>${escapeHTML(formatDate(updated))}</td>
            </tr>
        `;
    }).join("");
}

/* =========================================================
   ADMIN INVENTORY — LIVE DATA FROM ALL STORES
   Endpoint: GET /inventory/admin-summary
   ========================================================= */

async function loadAdminInventory() {
    const tbody = getElement("inventory-body");
    const refreshButton = getElement("refresh-inventory-btn");

    if (!tbody) return;

    tbody.innerHTML = `
        <tr>
            <td colspan="7" class="empty-state">
                Loading inventory across stores...
            </td>
        </tr>
    `;

    if (refreshButton) {
        refreshButton.disabled = true;
        refreshButton.textContent = "Loading...";
    }

    try {
        const response = await apiRequest(
            "/inventory/admin-summary"
        );

        const inventory = Array.isArray(response)
            ? response
            : getArray(response, [
                "inventory",
                "inventory_items",
                "inventory_records",
                "items",
                "results"
            ]);

        renderInventory(inventory);

        const totalStock = inventory.reduce(
            (sum, item) =>
                sum + Number(
                    getFirstDefined(item, [
                        "quantity_kg",
                        "total_quantity",
                        "total_stock"
                    ])
                ),
            0
        );

        const availableStock = inventory.reduce(
            (sum, item) =>
                sum + Number(
                    getFirstDefined(item, [
                        "available_quantity_kg",
                        "available_quantity",
                        "available_stock",
                        "available"
                    ])
                ),
            0
        );

        const reservedStock = inventory.reduce(
            (sum, item) =>
                sum + Number(
                    getFirstDefined(item, [
                        "reserved_quantity_kg",
                        "reserved_quantity",
                        "reserved_stock",
                        "reserved"
                    ])
                ),
            0
        );

        setText("total-stock", numberFormat(totalStock));
        setText("available-stock", numberFormat(availableStock));
        setText("reserved-stock", numberFormat(reservedStock));
        setText("inventory-count", numberFormat(inventory.length));

        showNotice(
            `Inventory refreshed successfully. ${inventory.length} records found.`,
            "success"
        );

    } catch (error) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="empty-state">
                    Unable to load inventory. Please refresh and try again.
                </td>
            </tr>
        `;

        if (!error.message.includes("expired")) {
            showNotice(
                error.message || "Failed to load inventory data.",
                "error"
            );
        }

        console.error(
            "Admin inventory loading error:",
            error
        );

    } finally {
        if (refreshButton) {
            refreshButton.disabled = false;
            refreshButton.textContent = "Refresh Inventory";
        }
    }
}

/* =========================================================
   SHARED FILTER OPTION HELPER
   ========================================================= */

function populateFilterOptions(selectId, values, label) {
    const select = getElement(selectId);
    if (!select) return;

    const currentValue = select.value;
    const firstOption = select.options[0]?.cloneNode(true);

    select.replaceChildren();

    if (firstOption) {
        select.appendChild(firstOption);
    } else {
        const option = document.createElement("option");
        option.value = "";
        option.textContent = `All ${label}`;
        select.appendChild(option);
    }

    const uniqueValues = [...new Set(
        values
            .filter(value =>
                value !== null &&
                value !== undefined &&
                String(value).trim() !== ""
            )
            .map(value => String(value).trim())
    )].sort((a, b) => a.localeCompare(b));

    uniqueValues.forEach(value => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = value;
        select.appendChild(option);
    });

    if ([...select.options].some(
        option => option.value === currentValue
    )) {
        select.value = currentValue;
    }
}

/* =========================================================
   FARMERS OVERVIEW
   ========================================================= */

function updateFarmerFilterOptions(farmers) {
    populateFilterOptions(
        "district-filter",
        farmers.map(farmer => farmer.district),
        "districts"
    );

    populateFilterOptions(
        "language-filter",
        farmers.map(farmer => farmer.preferred_language),
        "languages"
    );
}

function initializeFarmerFilters() {
    const filterIds = [
        "farmer-search",
        "district-filter",
        "language-filter",
        "status-filter",
        "profile-filter",
        "registration-sort"
    ];

    filterIds.forEach(id => {
        const element = getElement(id);
        if (!element || element.dataset.filterInitialized) return;

        element.addEventListener(
            element.tagName === "INPUT" ? "input" : "change",
            applyFarmerFilters
        );

        element.dataset.filterInitialized = "true";
    });

    const resetButton = getElement("reset-farmer-filters");

    if (resetButton && !resetButton.dataset.resetInitialized) {
        resetButton.addEventListener("click", resetFarmerFilters);
        resetButton.dataset.resetInitialized = "true";
    }
}

function resetFarmerFilters() {
    const defaults = {
        "farmer-search": "",
        "district-filter": "",
        "language-filter": "",
        "status-filter": "",
        "profile-filter": "",
        "registration-sort": "newest"
    };

    Object.entries(defaults).forEach(([id, value]) => {
        const element = getElement(id);
        if (element) element.value = value;
    });

    applyFarmerFilters();
}

function applyFarmerFilters() {
    const searchTerm = (
        getElement("farmer-search")?.value || ""
    ).trim().toLowerCase();

    const selectedDistrict =
        getElement("district-filter")?.value || "";

    const selectedLanguage =
        getElement("language-filter")?.value || "";

    const selectedStatus =
        getElement("status-filter")?.value || "";

    const selectedProfile =
        getElement("profile-filter")?.value || "";

    const sortOrder =
        getElement("registration-sort")?.value || "newest";

    const filteredFarmers = allFarmers.filter(farmer => {
        const name = String(farmer.full_name || "").toLowerCase();
        const email = String(farmer.email || "").toLowerCase();
        const phone = String(farmer.phone || "").toLowerCase();

        const matchesSearch =
            !searchTerm ||
            name.includes(searchTerm) ||
            email.includes(searchTerm) ||
            phone.includes(searchTerm);

        const matchesDistrict =
            !selectedDistrict ||
            String(farmer.district || "").trim() === selectedDistrict;

        const matchesLanguage =
            !selectedLanguage ||
            String(farmer.preferred_language || "").trim()
            === selectedLanguage;

        const active = isTrue(farmer.is_active);

        const matchesStatus =
            !selectedStatus ||
            (selectedStatus === "active" && active) ||
            (selectedStatus === "inactive" && !active);

        const profileCompleted =
            typeof farmer.profile_completed === "boolean"
                ? farmer.profile_completed
                : Boolean(
                    farmer.village &&
                    farmer.district &&
                    farmer.state &&
                    farmer.preferred_language
                );

        const matchesProfile =
            !selectedProfile ||
            (selectedProfile === "completed" && profileCompleted) ||
            (selectedProfile === "incomplete" && !profileCompleted);

        return (
            matchesSearch &&
            matchesDistrict &&
            matchesLanguage &&
            matchesStatus &&
            matchesProfile
        );
    });

    filteredFarmers.sort((a, b) => {
        const rawA = a.registration_date
            ? new Date(a.registration_date).getTime()
            : 0;

        const rawB = b.registration_date
            ? new Date(b.registration_date).getTime()
            : 0;

        const dateA = Number.isNaN(rawA) ? 0 : rawA;
        const dateB = Number.isNaN(rawB) ? 0 : rawB;

        return sortOrder === "oldest"
            ? dateA - dateB
            : dateB - dateA;
    });

    renderFarmers(filteredFarmers);

    setText(
        "farmers-results-count",
        `${filteredFarmers.length} of ${allFarmers.length} farmers`
    );
}

async function loadFarmersData() {
    const tbody = getElement("farmers-body");
    const refreshButton = getElement("refresh-farmers-btn");

    if (!tbody) return;

    tbody.innerHTML = `
        <tr>
            <td colspan="8" class="empty-state">Loading farmers...</td>
        </tr>
    `;

    if (refreshButton) {
        refreshButton.disabled = true;
        refreshButton.textContent = "Loading...";
    }

    try {
        const response = await apiRequest("/admin/farmers");

        const farmers = Array.isArray(response)
            ? response
            : getArray(response, ["farmers", "users", "results"]);

        allFarmers = farmers;

        updateFarmerFilterOptions(allFarmers);
        initializeFarmerFilters();

        setText("users-farmers-count", numberFormat(allFarmers.length));

        setText(
            "active-farmers-count",
            numberFormat(
                allFarmers.filter(farmer => isTrue(farmer.is_active)).length
            )
        );

        applyFarmerFilters();

    } catch (error) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="empty-state">
                    Unable to load farmer details.
                </td>
            </tr>
        `;

        setText(
            "farmers-results-count",
            "Unable to load farmer records."
        );

        if (!error.message.includes("expired")) {
            showNotice(
                error.message || "Failed to load farmers.",
                "error"
            );
        }

        console.error("Farmers loading error:", error);

    } finally {
        if (refreshButton) {
            refreshButton.disabled = false;
            refreshButton.textContent = "Refresh Farmers";
        }
    }
}

function renderFarmers(farmers) {
    const tbody = getElement("farmers-body");
    if (!tbody) return;

    if (!Array.isArray(farmers) || farmers.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="empty-state">
                    No farmers match your search or filters.
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = farmers.map(farmer => {
        const active = isTrue(farmer.is_active);

        return `
            <tr>
                <td>${escapeHTML(farmer.full_name || "—")}</td>
                <td>${escapeHTML(farmer.email || "—")}</td>
                <td>${escapeHTML(farmer.phone || "—")}</td>
                <td>${escapeHTML(farmer.village || "—")}</td>
                <td>${escapeHTML(farmer.district || "—")}</td>
                <td>${escapeHTML(farmer.preferred_language || "—")}</td>
                <td>${escapeHTML(formatDate(farmer.registration_date))}</td>
                <td>
                    <span class="status-badge ${active ? "active" : "inactive"}">
                        ${active ? "Active" : "Inactive"}
                    </span>
                </td>
            </tr>
        `;
    }).join("");
}

/* =========================================================
   DEALERS OVERVIEW — REAL BACKEND DATA
   Endpoint: GET /admin/dealers
   ========================================================= */

function dealerIsActive(dealer) {
    // Backend field: User.is_active
    const userActive = isTrue(dealer.is_active);

    // Backend field: Dealer.is_active
    // If the profile is missing, its status is not available.
    const profileActive =
        dealer.dealer_is_active === null ||
            dealer.dealer_is_active === undefined
            ? true
            : isTrue(dealer.dealer_is_active);

    return userActive && profileActive;
}

function updateDealerMetrics(dealers, response = {}) {
    const total = Array.isArray(response)
        ? dealers.length
        : Number(response.total ?? dealers.length);

    const active = dealers.filter(dealerIsActive).length;

    const verified = dealers.filter(
        dealer => isTrue(dealer.is_verified)
    ).length;

    const pending = dealers.filter(
        dealer => !isTrue(dealer.is_verified)
    ).length;

    setText("dealers-total-count", numberFormat(total));
    setText("active-dealers-count", numberFormat(active));
    setText("verified-dealers-count", numberFormat(verified));
    setText("pending-dealers-count", numberFormat(pending));

    // Keep the existing overview cards synchronized.
    setText("dealers-count", numberFormat(total));
    setText("pending-count", numberFormat(pending));
}

function updateDealerFilterOptions(dealers) {
    populateFilterOptions(
        "dealer-district-filter",
        dealers.map(dealer => dealer.district),
        "districts"
    );
}

function initializeDealerFilters() {
    const filterIds = [
        "dealer-search",
        "dealer-district-filter",
        "dealer-verification-filter",
        "dealer-status-filter"
    ];

    filterIds.forEach(id => {
        const element = getElement(id);

        if (!element || element.dataset.dealerFilterInitialized) {
            return;
        }

        element.addEventListener(
            element.tagName === "INPUT" ? "input" : "change",
            applyDealerFilters
        );

        element.dataset.dealerFilterInitialized = "true";
    });

    const resetButton = getElement("reset-dealer-filters");

    if (resetButton && !resetButton.dataset.dealerResetInitialized) {
        resetButton.addEventListener("click", resetDealerFilters);
        resetButton.dataset.dealerResetInitialized = "true";
    }
}

function resetDealerFilters() {
    const defaults = {
        "dealer-search": "",
        "dealer-district-filter": "",
        "dealer-verification-filter": "",
        "dealer-status-filter": ""
    };

    Object.entries(defaults).forEach(([id, value]) => {
        const element = getElement(id);
        if (element) element.value = value;
    });

    applyDealerFilters();
}

function applyDealerFilters() {
    const searchTerm = (
        getElement("dealer-search")?.value || ""
    ).trim().toLowerCase();

    const selectedDistrict =
        getElement("dealer-district-filter")?.value || "";

    const selectedVerification =
        getElement("dealer-verification-filter")?.value || "";

    const selectedStatus =
        getElement("dealer-status-filter")?.value || "";

    const filteredDealers = allDealers.filter(dealer => {
        /*
         * IMPORTANT:
         * The backend returns the personal name as "full_name".
         * "dealer_name" is included only for backward compatibility.
         */
        const searchableValues = [
            dealer.business_name,
            dealer.full_name,
            dealer.dealer_name,
            dealer.email,
            dealer.phone,
            dealer.license_number,
            dealer.village,
            dealer.district
        ].map(value => String(value ?? "").toLowerCase());

        const matchesSearch =
            !searchTerm ||
            searchableValues.some(value => value.includes(searchTerm));

        const matchesDistrict =
            !selectedDistrict ||
            String(dealer.district ?? "").trim() === selectedDistrict;

        const verified = isTrue(dealer.is_verified);
        const active = dealerIsActive(dealer);

        const matchesVerification =
            !selectedVerification ||
            (selectedVerification === "verified" && verified) ||
            (selectedVerification === "pending" && !verified);

        const matchesStatus =
            !selectedStatus ||
            (selectedStatus === "active" && active) ||
            (selectedStatus === "inactive" && !active);

        return (
            matchesSearch &&
            matchesDistrict &&
            matchesVerification &&
            matchesStatus
        );
    });

    renderDealers(filteredDealers);

    setText(
        "dealers-results-count",
        `${filteredDealers.length} of ${allDealers.length} dealers`
    );
}

function renderDealers(dealers) {
    const tbody = getElement("dealers-body");
    if (!tbody) return;

    if (!Array.isArray(dealers) || dealers.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="empty-state">
                    No dealers match your search or filters.
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = dealers.map(dealer => {
        const active = dealerIsActive(dealer);

        // Use the actual backend field for the dealer's personal name.
        const dealerName =
            dealer.full_name ||
            dealer.dealer_name ||
            "—";

        return `
            <tr>
                <td>${escapeHTML(dealer.business_name || "—")}</td>
                <td>${escapeHTML(dealerName)}</td>
                <td>${escapeHTML(dealer.email || "—")}</td>
                <td>${escapeHTML(dealer.phone || "—")}</td>
                <td>${escapeHTML(dealer.village || "—")}</td>
                <td>${escapeHTML(dealer.district || "—")}</td>
                <td>
                    <span class="status-badge ${active ? "active" : "inactive"}">
                        ${active ? "Active" : "Inactive"}
                    </span>
                </td>
            </tr>
        `;
    }).join("");
}

async function loadDealersData() {
    const tbody = getElement("dealers-body");
    const refreshButton = getElement("refresh-dealers-btn");

    if (!tbody) return;

    tbody.innerHTML = `
        <tr>
            <td colspan="7" class="empty-state">
                Loading dealers...
            </td>
        </tr>
    `;

    if (refreshButton) {
        refreshButton.disabled = true;
        refreshButton.textContent = "Loading...";
    }

    try {
        const response = await apiRequest("/admin/dealers");

        const dealers = Array.isArray(response)
            ? response
            : getArray(response, ["dealers", "results", "items"]);

        allDealers = dealers;

        updateDealerMetrics(allDealers, response);
        updateDealerFilterOptions(allDealers);
        initializeDealerFilters();
        applyDealerFilters();

    } catch (error) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="empty-state">
                    Unable to load dealer details. Check the API and try again.
                </td>
            </tr>
        `;

        setText(
            "dealers-results-count",
            "Unable to load dealer records."
        );

        if (!error.message.includes("expired")) {
            showNotice(
                error.message || "Failed to load dealers.",
                "error"
            );
        }

        console.error("Dealers loading error:", error);

    } finally {
        if (refreshButton) {
            refreshButton.disabled = false;
            refreshButton.textContent = "Refresh Dealers";
        }
    }
}

/* =========================================================
   LOAD MAIN DASHBOARD
   ========================================================= */

async function loadDashboardData() {
    hideNotice();
    setLoading(true);

    try {
        const data = await apiRequest("/admin/overview");

        updateMetrics(data);

        const products = getArray(data, [
            "products",
            "product_summary",
            "product_availability"
        ]);

        const inventory = getArray(data, [
            "inventory",
            "inventory_records",
            "inventory_items",
            "stock_records"
        ]);

        renderProducts(products);
        renderInventory(inventory);

        dashboardLoaded = true;

        showNotice(
            "Dashboard data refreshed successfully.",
            "success"
        );

    } catch (error) {
        if (!error.message.includes("expired")) {
            showNotice(
                error.message || "Unable to load dashboard data.",
                "error"
            );
        }

        console.error("Admin dashboard error:", error);

    } finally {
        setLoading(false);
    }
}

/* ---------- LOGOUT ---------- */

function logout() {
    sessionStorage.removeItem("access_token");
    sessionStorage.removeItem("token_type");
    sessionStorage.removeItem("user_role");
    sessionStorage.removeItem("user_email");
    sessionStorage.removeItem("user");

    window.location.href = "login.html";
}

/* ---------- INITIALIZATION ---------- */

document.addEventListener("DOMContentLoaded", async () => {
    initializeNavigation();
    initializeFarmerFilters();
    initializeDealerFilters();

    showSection("overview-section");

    getElement("refresh-btn")
        ?.addEventListener("click", loadDashboardData);

    getElement("logout-btn")
        ?.addEventListener("click", logout);

    const user = await loadAdminProfile();
    if (!user) return;

    await loadDashboardData();
});
