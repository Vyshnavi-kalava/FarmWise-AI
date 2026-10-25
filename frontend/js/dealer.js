
document.addEventListener("DOMContentLoaded", () => {
    // =========================================
    // INVENTORY DASHBOARD ELEMENTS
    // =========================================

    const totalStockElement = document.getElementById("total-stock");
    const reservedStockElement = document.getElementById("reserved-stock");
    const availableStockElement = document.getElementById("available-stock");
    const inventoryCountElement = document.getElementById("inventory-count");
    const lowStockCountElement = document.getElementById("low-stock-count");
    const outOfStockCountElement = document.getElementById("out-of-stock-count");

    const inventoryTableBody = document.getElementById("inventory-table-body");
    const refreshInventoryButton = document.getElementById("refresh-inventory");
    const dashboardMessage = document.getElementById("dashboard-message");

    // =========================================
    // DEALER PROFILE ELEMENTS
    // =========================================

    const dealerNameElement = document.getElementById("dealer-name");
    const dealerRoleElement = document.getElementById("dealer-role");

    const dealerProfileSection = document.getElementById("dealer-profile-section");
    const dealerDashboardContent = document.getElementById("dealer-dashboard-content");
    const dealerProfileForm = document.getElementById("dealer-profile-form");
    const dealerProfileMessage = document.getElementById("dealer-profile-message");
    const saveDealerProfileButton = document.getElementById("save-dealer-profile");

    const dealerBusinessNameInput = document.getElementById("dealer-business-name");
    const dealerPhoneInput = document.getElementById("dealer-phone");
    const dealerVillageInput = document.getElementById("dealer-village");
    const dealerDistrictInput = document.getElementById("dealer-district");
    const dealerStateInput = document.getElementById("dealer-state");
    const dealerLicenseInput = document.getElementById("dealer-license");
    const dealerAddressInput = document.getElementById("dealer-address");

    // =========================================
    // STORE ELEMENTS
    // =========================================

    const storesTableBody = document.getElementById("stores-table-body");
    const storesMessage = document.getElementById("stores-message");
    const refreshStoresButton = document.getElementById("refresh-stores");
    const storeCreateForm = document.getElementById("store-create-form");
    const saveStoreButton = document.getElementById("save-store-button");

    const storeNameInput = document.getElementById("store-name");
    const storeVillageInput = document.getElementById("store-village");
    const storeDistrictInput = document.getElementById("store-district");
    const storeStateInput = document.getElementById("store-state");
    const storeAddressInput = document.getElementById("store-address");

    // =========================================
    // ADD INVENTORY ELEMENTS
    // =========================================

    const addInventoryForm = document.getElementById("add-inventory-form");
    const addInventoryMessage = document.getElementById("add-inventory-message");
    const addInventoryStoreSelect = document.getElementById("add-inventory-store");
    const addInventoryProductInput = document.getElementById("add-inventory-product");
    const addInventoryQuantityInput = document.getElementById("add-inventory-quantity");
    const addInventoryReservedInput = document.getElementById("add-inventory-reserved");
    const addInventoryPriceInput = document.getElementById("add-inventory-price");
    const saveNewInventoryButton = document.getElementById("save-new-inventory-button");

    // =========================================
    // FORECAST ELEMENTS
    // =========================================

    const refreshForecastButton = document.getElementById("refresh-forecast");
    const forecastMessage = document.getElementById("forecast-message");
    const forecastDemandElement = document.getElementById("forecast-demand");
    const forecastStockElement = document.getElementById("forecast-stock");
    const forecastShortageElement = document.getElementById("forecast-shortage");
    const forecastStatusElement = document.getElementById("forecast-status");
    const forecastStatusMessage = document.getElementById("forecast-status-message");

    // =========================================
    // INVENTORY UPDATE MODAL ELEMENTS
    // =========================================

    const inventoryModal = document.getElementById("inventory-modal");
    const inventoryUpdateForm = document.getElementById("inventory-update-form");
    const closeInventoryModalButton = document.getElementById("close-inventory-modal");
    const cancelInventoryUpdateButton = document.getElementById("cancel-inventory-update");
    const saveInventoryUpdateButton = document.getElementById("save-inventory-update");

    const modalProductName = document.getElementById("modal-product-name");
    const modalQuantityInput = document.getElementById("modal-quantity");
    const modalReservedInput = document.getElementById("modal-reserved");
    const modalPriceInput = document.getElementById("modal-price");
    const modalAvailablePreview = document.getElementById("modal-available-preview");
    const modalFormMessage = document.getElementById("modal-form-message");

    // =========================================
    // CONFIGURATION AND STATE
    // =========================================

    const LOW_STOCK_THRESHOLD_KG = 200;

    let selectedInventoryItem = null;
    let isSavingInventory = false;
    let isCreatingStore = false;
    let isAddingInventory = false;
    let isCreatingDealerProfile = false;
    let storesCache = [];
    let dealerDistrict = "";

    // =========================================
    // GENERAL HELPERS
    // =========================================

    function formatNumber(value) {
        const number = Number(value);

        if (!Number.isFinite(number)) return "0";

        return number.toLocaleString("en-IN", {
            maximumFractionDigits: 2
        });
    }

    function formatPrice(value) {
        if (value === null || value === undefined || value === "") {
            return "Not set";
        }

        const price = Number(value);

        if (!Number.isFinite(price)) return "Not set";

        return `₹${price.toFixed(2)}`;
    }

    function showMessage(element, message, type = "info") {
        if (!element) return;

        element.textContent = message;
        element.classList.remove("hidden");
        element.setAttribute("role", type === "error" ? "alert" : "status");

        const colors = {
            error: "#b42318",
            success: "#16803c",
            info: "#344054"
        };

        element.style.color = colors[type] || colors.info;
    }

    function hideMessage(element) {
        if (!element) return;

        element.textContent = "";
        element.classList.add("hidden");
        element.removeAttribute("role");
    }

    function setText(element, value) {
        if (element) {
            element.textContent = value ?? "";
        }
    }

    function createCell(value) {
        const cell = document.createElement("td");
        cell.textContent = value ?? "";
        return cell;
    }

    function renderEmptyTable(tbody, columnCount, message) {
        if (!tbody) return;

        tbody.replaceChildren();

        const row = document.createElement("tr");
        const cell = document.createElement("td");

        cell.colSpan = columnCount;
        cell.textContent = message;

        row.appendChild(cell);
        tbody.appendChild(row);
    }

    function setButtonLoading(button, loading, normalText, loadingText) {
        if (!button) return;

        if (loading) {
            if (!button.dataset.originalText) {
                button.dataset.originalText = button.textContent.trim() || normalText;
            }

            button.disabled = true;
            button.textContent = loadingText;
        } else {
            button.disabled = false;
            button.textContent = button.dataset.originalText || normalText;
            delete button.dataset.originalText;
        }
    }

    function getHttpStatus(error) {
        const candidates = [
            error?.status,
            error?.statusCode,
            error?.response?.status,
            error?.detail?.status
        ];

        for (const candidate of candidates) {
            const status = Number(candidate);

            if (Number.isInteger(status) && status >= 100 && status <= 599) {
                return status;
            }
        }

        return null;
    }

    function isNotFoundError(error) {
        return getHttpStatus(error) === 404;
    }

    function isDuplicateProfileError(error) {
        return getHttpStatus(error) === 409;
    }

    function getErrorMessage(error, fallback) {
        if (typeof error?.detail === "string" && error.detail.trim()) {
            return error.detail;
        }

        if (typeof error?.message === "string" && error.message.trim()) {
            return error.message;
        }

        if (typeof error?.response?.data?.detail === "string") {
            return error.response.data.detail;
        }

        return fallback;
    }

    // Uses the project's existing authentication helper when available.
    function authenticationError(error) {
        if (typeof isAuthenticationError === "function") {
            return isAuthenticationError(error);
        }

        const status = getHttpStatus(error);
        return status === 401 || status === 403;
    }

    function showAuthenticationMessage() {
        showMessage(
            dashboardMessage,
            "Your session is missing or has expired. Please sign in again.",
            "error"
        );
    }

    // =========================================
    // DEALER PROFILE DISPLAY
    // =========================================

    function showDealerProfileForm() {
        dealerProfileSection?.classList.remove("hidden");
        dealerDashboardContent?.classList.add("hidden");

        hideMessage(dashboardMessage);
        hideMessage(dealerProfileMessage);

        dealerBusinessNameInput?.focus();
    }

    function showDealerDashboard() {
        dealerProfileSection?.classList.add("hidden");
        dealerDashboardContent?.classList.remove("hidden");
    }

    async function loadDealerProfile() {
        hideMessage(dealerProfileMessage);

        try {
            const dealer = await apiGet("/dealers/me");

            if (!dealer || typeof dealer !== "object") {
                throw new Error("Invalid dealer profile response.");
            }

            const businessName =
                dealer.business_name ||
                dealer.name ||
                dealer.full_name ||
                "Dealer";

            setText(dealerNameElement, businessName);

            const district =
                typeof dealer.district === "string"
                    ? dealer.district.trim()
                    : "";

            dealerDistrict =
                district && district.toLowerCase() !== "example district"
                    ? district
                    : "";

            if (dealerRoleElement) {
                dealerRoleElement.textContent =
                    [dealer.district, dealer.state].filter(Boolean).join(", ") ||
                    "Dealer Account";
            }

            const avatar = document.querySelector(".profile-avatar");

            if (avatar) {
                avatar.textContent = businessName.charAt(0).toUpperCase();
            }

            if (storeDistrictInput && !storeDistrictInput.value) {
                storeDistrictInput.value = dealer.district || "";
            }

            if (storeStateInput && !storeStateInput.value) {
                storeStateInput.value = dealer.state || "";
            }

            showDealerDashboard();
            return true;
        } catch (error) {
            console.error("Unable to load dealer profile:", error);

            if (authenticationError(error)) {
                showAuthenticationMessage();
                return false;
            }

            if (isNotFoundError(error)) {
                showDealerProfileForm();
                return false;
            }

            showMessage(
                dashboardMessage,
                getErrorMessage(error, "Unable to load dealer profile."),
                "error"
            );

            return false;
        }
    }

    // =========================================
    // CREATE DEALER PROFILE
    // =========================================

    if (dealerProfileForm) {
        dealerProfileForm.addEventListener("submit", async event => {
            event.preventDefault();

            if (isCreatingDealerProfile) return;

            hideMessage(dealerProfileMessage);

            const businessName = dealerBusinessNameInput?.value.trim() || "";
            const phone = dealerPhoneInput?.value.trim() || "";
            const village = dealerVillageInput?.value.trim() || "";
            const district = dealerDistrictInput?.value.trim() || "";
            const state = dealerStateInput?.value.trim() || "";
            const licenseNumber = dealerLicenseInput?.value.trim() || "";
            const address = dealerAddressInput?.value.trim() || "";

            if (!businessName || !village || !district || !state) {
                showMessage(
                    dealerProfileMessage,
                    "Please fill in the business name, village, district, and state.",
                    "error"
                );
                return;
            }

            const payload = {
                business_name: businessName,
                phone: phone || null,
                village,
                district,
                state,
                license_number: licenseNumber || null,
                address: address || null
            };

            isCreatingDealerProfile = true;

            setButtonLoading(
                saveDealerProfileButton,
                true,
                "Create Dealer Profile",
                "Creating..."
            );

            try {
                await apiPost("/dealers/me", payload);

                dealerDistrict = district;

                setText(dealerNameElement, businessName);

                if (dealerRoleElement) {
                    dealerRoleElement.textContent = `${district}, ${state}`;
                }

                const avatar = document.querySelector(".profile-avatar");

                if (avatar) {
                    avatar.textContent = businessName.charAt(0).toUpperCase();
                }

                if (storeDistrictInput) storeDistrictInput.value = district;
                if (storeStateInput) storeStateInput.value = state;

                showDealerDashboard();

                showMessage(
                    dashboardMessage,
                    "Dealer profile created successfully.",
                    "success"
                );

                await Promise.all([
                    loadInventory(),
                    loadStores(),
                    loadForecast()
                ]);
            } catch (error) {
                console.error("Unable to create dealer profile:", error);

                if (authenticationError(error)) {
                    showMessage(
                        dealerProfileMessage,
                        "Your session has expired. Please sign in again.",
                        "error"
                    );
                } else if (isDuplicateProfileError(error)) {
                    showMessage(
                        dealerProfileMessage,
                        "A dealer profile may already exist. Reload the page and try again.",
                        "error"
                    );
                } else {
                    showMessage(
                        dealerProfileMessage,
                        getErrorMessage(
                            error,
                            "Unable to create dealer profile. Please check your details."
                        ),
                        "error"
                    );
                }
            } finally {
                isCreatingDealerProfile = false;

                setButtonLoading(
                    saveDealerProfileButton,
                    false,
                    "Create Dealer Profile",
                    "Creating..."
                );
            }
        });
    }

    // =========================================
    // STOCK CALCULATIONS AND STATUS
    // =========================================

    function getAvailableQuantity(item) {
        const quantity = Number(item.quantity_kg) || 0;
        const reserved = Number(item.reserved_quantity_kg) || 0;

        if (
            item.available_quantity_kg !== null &&
            item.available_quantity_kg !== undefined
        ) {
            const available = Number(item.available_quantity_kg);

            if (Number.isFinite(available)) return available;
        }

        return quantity - reserved;
    }

    function getStockStatus(availableStock) {
        if (availableStock <= 0) {
            return { label: "Out of Stock", className: "stock-status-out" };
        }

        if (availableStock <= LOW_STOCK_THRESHOLD_KG) {
            return { label: "Low Stock", className: "stock-status-low" };
        }

        return { label: "In Stock", className: "stock-status-in" };
    }

    function createStockStatusCell(availableStock) {
        const status = getStockStatus(availableStock);
        const cell = document.createElement("td");
        const badge = document.createElement("span");

        badge.className = `stock-status-badge ${status.className}`;
        badge.textContent = status.label;

        cell.appendChild(badge);
        return cell;
    }

    // =========================================
    // RENDER INVENTORY
    // =========================================

    function renderInventory(inventory) {
        if (!Array.isArray(inventory)) {
            throw new Error("Unexpected inventory response from server.");
        }

        let totalStock = 0;
        let reservedStock = 0;
        let availableStock = 0;
        let lowStockCount = 0;
        let outOfStockCount = 0;

        inventory.forEach(item => {
            const quantity = Number(item.quantity_kg) || 0;
            const reserved = Number(item.reserved_quantity_kg) || 0;
            const available = getAvailableQuantity(item);

            totalStock += quantity;
            reservedStock += reserved;
            availableStock += available;

            if (available <= 0) {
                outOfStockCount++;
            } else if (available <= LOW_STOCK_THRESHOLD_KG) {
                lowStockCount++;
            }
        });

        setText(totalStockElement, `${formatNumber(totalStock)} kg`);
        setText(reservedStockElement, `${formatNumber(reservedStock)} kg`);
        setText(availableStockElement, `${formatNumber(availableStock)} kg`);
        setText(inventoryCountElement, formatNumber(inventory.length));
        setText(lowStockCountElement, formatNumber(lowStockCount));
        setText(outOfStockCountElement, formatNumber(outOfStockCount));

        if (!inventoryTableBody) return;

        inventoryTableBody.replaceChildren();

        if (inventory.length === 0) {
            renderEmptyTable(
                inventoryTableBody,
                7,
                "No inventory records found. Add inventory below."
            );
            return;
        }

        inventory.forEach(item => {
            const row = document.createElement("tr");
            const quantity = Number(item.quantity_kg) || 0;
            const reserved = Number(item.reserved_quantity_kg) || 0;
            const available = getAvailableQuantity(item);

            row.appendChild(createCell(item.product_name || "Unnamed Product"));
            row.appendChild(createCell(`${formatNumber(quantity)} kg`));
            row.appendChild(createCell(`${formatNumber(reserved)} kg`));
            row.appendChild(createCell(`${formatNumber(available)} kg`));
            row.appendChild(createCell(formatPrice(item.price_per_kg)));
            row.appendChild(createStockStatusCell(available));

            const actionCell = document.createElement("td");
            const updateButton = document.createElement("button");

            updateButton.type = "button";
            updateButton.className = "btn btn-secondary";
            updateButton.textContent = "Update";
            updateButton.addEventListener("click", () => openUpdateForm(item));

            actionCell.appendChild(updateButton);
            row.appendChild(actionCell);
            inventoryTableBody.appendChild(row);
        });
    }

    // =========================================
    // LOAD INVENTORY
    // =========================================

    async function loadInventory() {
        setButtonLoading(
            refreshInventoryButton,
            true,
            "Refresh Stock",
            "Loading..."
        );

        hideMessage(dashboardMessage);

        try {
            const inventory = await apiGet("/inventory/");

            if (!Array.isArray(inventory)) {
                throw new Error("Unexpected inventory response from server.");
            }

            renderInventory(inventory);
        } catch (error) {
            console.error("Unable to load inventory:", error);

            showMessage(
                dashboardMessage,
                authenticationError(error)
                    ? "Your session is missing or has expired. Please sign in again."
                    : getErrorMessage(error, "Unable to load inventory."),
                "error"
            );

            [
                totalStockElement,
                reservedStockElement,
                availableStockElement,
                inventoryCountElement,
                lowStockCountElement,
                outOfStockCountElement
            ].forEach(element => setText(element, "—"));

            renderEmptyTable(
                inventoryTableBody,
                7,
                "Unable to load inventory. Please refresh and try again."
            );
        } finally {
            setButtonLoading(
                refreshInventoryButton,
                false,
                "Refresh Stock",
                "Loading..."
            );
        }
    }

    // =========================================
    // STORES: RENDER AND LOAD
    // =========================================

    function populateStoreSelect(stores) {
        if (!addInventoryStoreSelect) return;

        const previousValue = addInventoryStoreSelect.value;

        addInventoryStoreSelect.replaceChildren();

        const defaultOption = document.createElement("option");
        defaultOption.value = "";
        defaultOption.textContent = "Select a store";
        addInventoryStoreSelect.appendChild(defaultOption);

        stores
            .filter(store => store.is_active !== false)
            .forEach(store => {
                const option = document.createElement("option");
                option.value = String(store.id);
                option.textContent =
                    `${store.store_name || "Unnamed Store"} — ` +
                    `${store.village || store.district || ""}`;

                addInventoryStoreSelect.appendChild(option);
            });

        if (
            previousValue &&
            [...addInventoryStoreSelect.options].some(
                option => option.value === previousValue
            )
        ) {
            addInventoryStoreSelect.value = previousValue;
        }
    }

    function renderStores(stores) {
        if (!Array.isArray(stores)) {
            throw new Error("Unexpected stores response from server.");
        }

        storesCache = stores;

        if (stores.length === 0) {
            renderEmptyTable(storesTableBody, 5, "No stores registered yet.");
        } else if (storesTableBody) {
            storesTableBody.replaceChildren();

            stores.forEach(store => {
                const row = document.createElement("tr");

                row.appendChild(createCell(store.store_name || "Unnamed Store"));
                row.appendChild(createCell(store.village || "—"));
                row.appendChild(createCell(store.district || "—"));
                row.appendChild(createCell(store.address || "—"));

                const statusCell = document.createElement("td");
                const badge = document.createElement("span");
                const active = store.is_active !== false;

                badge.className = active
                    ? "stock-status-badge stock-status-in"
                    : "stock-status-badge stock-status-out";

                badge.textContent = active ? "Active" : "Inactive";
                statusCell.appendChild(badge);
                row.appendChild(statusCell);

                storesTableBody.appendChild(row);
            });
        }

        populateStoreSelect(stores);
    }

    async function loadStores() {
        setButtonLoading(
            refreshStoresButton,
            true,
            "Refresh Stores",
            "Loading..."
        );

        hideMessage(storesMessage);

        try {
            const stores = await apiGet("/stores/");
            renderStores(stores);
        } catch (error) {
            console.error("Unable to load stores:", error);

            showMessage(
                storesMessage,
                authenticationError(error)
                    ? "Your session is missing or has expired. Please sign in again."
                    : getErrorMessage(error, "Unable to load stores."),
                "error"
            );

            renderEmptyTable(
                storesTableBody,
                5,
                "Unable to load stores. Please try again."
            );

            storesCache = [];
            populateStoreSelect([]);
        } finally {
            setButtonLoading(
                refreshStoresButton,
                false,
                "Refresh Stores",
                "Loading..."
            );
        }
    }

    // =========================================
    // CREATE A STORE
    // =========================================

    if (storeCreateForm) {
        storeCreateForm.addEventListener("submit", async event => {
            event.preventDefault();

            if (isCreatingStore) return;

            hideMessage(storesMessage);

            const storeName = storeNameInput?.value.trim() || "";
            const village = storeVillageInput?.value.trim() || "";
            const district = storeDistrictInput?.value.trim() || "";
            const state = storeStateInput?.value.trim() || "";
            const address = storeAddressInput?.value.trim() || "";

            if (!storeName || !village || !district || !state || !address) {
                showMessage(
                    storesMessage,
                    "Please fill in all required store details.",
                    "error"
                );
                return;
            }

            const payload = {
                store_name: storeName,
                village,
                district,
                state,
                address
            };

            isCreatingStore = true;

            setButtonLoading(saveStoreButton, true, "Register Store", "Registering...");

            try {
                await apiPost("/stores/", payload);

                storeCreateForm.reset();

                showMessage(
                    storesMessage,
                    "Store registered successfully.",
                    "success"
                );

                await loadStores();
            } catch (error) {
                console.error("Unable to register store:", error);

                showMessage(
                    storesMessage,
                    authenticationError(error)
                        ? "Your session is missing or has expired. Please sign in again."
                        : getErrorMessage(error, "Unable to register store."),
                    "error"
                );
            } finally {
                isCreatingStore = false;
                setButtonLoading(saveStoreButton, false, "Register Store", "Registering...");
            }
        });
    }

    // =========================================
    // ADD INVENTORY
    // =========================================

    if (addInventoryForm) {
        addInventoryForm.addEventListener("submit", async event => {
            event.preventDefault();

            if (isAddingInventory) return;

            hideMessage(addInventoryMessage);

            const storeId = addInventoryStoreSelect?.value || "";
            const productName = addInventoryProductInput?.value.trim() || "";
            const quantityText = addInventoryQuantityInput?.value.trim() || "";
            const reservedText = addInventoryReservedInput?.value.trim() || "";
            const priceText = addInventoryPriceInput?.value.trim() || "";

            if (
                !storeId ||
                !productName ||
                quantityText === "" ||
                reservedText === "" ||
                priceText === ""
            ) {
                showMessage(
                    addInventoryMessage,
                    "Please complete all inventory fields and select a store.",
                    "error"
                );
                return;
            }

            const quantity = Number(quantityText);
            const reserved = Number(reservedText);
            const price = Number(priceText);

            if (!Number.isSafeInteger(quantity) || quantity < 0) {
                showMessage(
                    addInventoryMessage,
                    "Total stock must be a non-negative whole number.",
                    "error"
                );
                addInventoryQuantityInput?.focus();
                return;
            }

            if (!Number.isSafeInteger(reserved) || reserved < 0) {
                showMessage(
                    addInventoryMessage,
                    "Reserved stock must be a non-negative whole number.",
                    "error"
                );
                addInventoryReservedInput?.focus();
                return;
            }

            if (reserved > quantity) {
                showMessage(
                    addInventoryMessage,
                    "Reserved stock cannot exceed total stock.",
                    "error"
                );
                addInventoryReservedInput?.focus();
                return;
            }

            if (!Number.isFinite(price) || price < 0) {
                showMessage(
                    addInventoryMessage,
                    "Enter a valid, non-negative price per kg.",
                    "error"
                );
                addInventoryPriceInput?.focus();
                return;
            }

            const selectedStore = storesCache.find(
                store =>
                    String(store.id) === String(storeId) &&
                    store.is_active !== false
            );

            if (!selectedStore) {
                showMessage(
                    addInventoryMessage,
                    "Please select an active registered store.",
                    "error"
                );
                return;
            }

            const numericStoreId = Number(storeId);

            const payload = {
                store_id: Number.isFinite(numericStoreId) ? numericStoreId : storeId,
                product_name: productName,
                quantity_kg: quantity,
                reserved_quantity_kg: reserved,
                price_per_kg: price
            };

            isAddingInventory = true;

            setButtonLoading(
                saveNewInventoryButton,
                true,
                "Add to Inventory",
                "Adding..."
            );

            try {
                await apiPost("/inventory/", payload);

                addInventoryForm.reset();

                if (addInventoryProductInput) {
                    addInventoryProductInput.value = "";
                }

                if (addInventoryReservedInput) {
                    addInventoryReservedInput.value = "0";
                }

                showMessage(
                    addInventoryMessage,
                    "Inventory added successfully.",
                    "success"
                );

                await loadInventory();
                await loadForecast();
            } catch (error) {
                console.error("Unable to add inventory:", error);

                showMessage(
                    addInventoryMessage,
                    authenticationError(error)
                        ? "Your session is missing or has expired. Please sign in again."
                        : getErrorMessage(
                            error,
                            "Unable to add inventory. Check the submitted details."
                        ),
                    "error"
                );
            } finally {
                isAddingInventory = false;

                setButtonLoading(
                    saveNewInventoryButton,
                    false,
                    "Add to Inventory",
                    "Adding..."
                );
            }
        });
    }

    // =========================================
    // INVENTORY UPDATE MODAL
    // =========================================

    function updateAvailablePreview() {
        if (!modalQuantityInput || !modalReservedInput || !modalAvailablePreview) {
            return;
        }

        const quantityText = modalQuantityInput.value.trim();
        const reservedText = modalReservedInput.value.trim();

        if (quantityText === "" || reservedText === "") {
            modalAvailablePreview.textContent = "— kg";
            return;
        }

        const quantity = Number(quantityText);
        const reserved = Number(reservedText);

        if (
            !Number.isFinite(quantity) ||
            !Number.isFinite(reserved) ||
            quantity < 0 ||
            reserved < 0 ||
            reserved > quantity
        ) {
            modalAvailablePreview.textContent = "Check quantities";
            return;
        }

        modalAvailablePreview.textContent = `${formatNumber(quantity - reserved)} kg`;
    }

    function openUpdateForm(item) {
        if (!inventoryModal || !inventoryUpdateForm) return;

        selectedInventoryItem = item;
        hideMessage(modalFormMessage);

        setText(modalProductName, item.product_name || "Unnamed Product");

        if (modalQuantityInput) modalQuantityInput.value = item.quantity_kg ?? 0;
        if (modalReservedInput) {
            modalReservedInput.value = item.reserved_quantity_kg ?? 0;
        }
        if (modalPriceInput) modalPriceInput.value = item.price_per_kg ?? "";

        updateAvailablePreview();

        inventoryModal.classList.remove("hidden");
        inventoryModal.setAttribute("aria-hidden", "false");
        document.body.classList.add("modal-open");

        modalQuantityInput?.focus();
    }

    function closeUpdateForm() {
        if (isSavingInventory || !inventoryModal || !inventoryUpdateForm) return;

        inventoryModal.classList.add("hidden");
        inventoryModal.setAttribute("aria-hidden", "true");
        document.body.classList.remove("modal-open");

        inventoryUpdateForm.reset();
        hideMessage(modalFormMessage);

        selectedInventoryItem = null;
    }

    function closeModalAfterSave() {
        if (!inventoryModal || !inventoryUpdateForm) return;

        inventoryModal.classList.add("hidden");
        inventoryModal.setAttribute("aria-hidden", "true");
        document.body.classList.remove("modal-open");

        inventoryUpdateForm.reset();
        hideMessage(modalFormMessage);

        selectedInventoryItem = null;
    }

    modalQuantityInput?.addEventListener("input", updateAvailablePreview);
    modalReservedInput?.addEventListener("input", updateAvailablePreview);

    if (inventoryUpdateForm) {
        inventoryUpdateForm.addEventListener("submit", async event => {
            event.preventDefault();

            if (!selectedInventoryItem || isSavingInventory) return;

            hideMessage(modalFormMessage);

            const quantityText = modalQuantityInput?.value.trim() || "";
            const reservedText = modalReservedInput?.value.trim() || "";
            const priceText = modalPriceInput?.value.trim() || "";

            if (quantityText === "" || reservedText === "" || priceText === "") {
                showMessage(modalFormMessage, "Please fill in all three fields.", "error");
                return;
            }

            const quantity = Number(quantityText);
            const reserved = Number(reservedText);
            const price = Number(priceText);

            if (!Number.isSafeInteger(quantity) || quantity < 0) {
                showMessage(
                    modalFormMessage,
                    "Total stock must be a non-negative whole number.",
                    "error"
                );
                modalQuantityInput?.focus();
                return;
            }

            if (!Number.isSafeInteger(reserved) || reserved < 0) {
                showMessage(
                    modalFormMessage,
                    "Reserved stock must be a non-negative whole number.",
                    "error"
                );
                modalReservedInput?.focus();
                return;
            }

            if (reserved > quantity) {
                showMessage(
                    modalFormMessage,
                    "Reserved stock cannot exceed total stock.",
                    "error"
                );
                modalReservedInput?.focus();
                return;
            }

            if (!Number.isFinite(price) || price < 0) {
                showMessage(
                    modalFormMessage,
                    "Enter a valid, non-negative price per kg.",
                    "error"
                );
                modalPriceInput?.focus();
                return;
            }

            isSavingInventory = true;

            setButtonLoading(
                saveInventoryUpdateButton,
                true,
                "Save Changes",
                "Saving..."
            );

            try {
                await apiPut(`/inventory/${selectedInventoryItem.id}`, {
                    quantity_kg: quantity,
                    reserved_quantity_kg: reserved,
                    price_per_kg: price
                });

                closeModalAfterSave();

                showMessage(
                    dashboardMessage,
                    "Inventory updated successfully.",
                    "success"
                );

                await loadInventory();
                await loadForecast();
            } catch (error) {
                console.error("Unable to update inventory:", error);

                showMessage(
                    modalFormMessage,
                    authenticationError(error)
                        ? "Your session is missing or has expired. Please sign in again."
                        : getErrorMessage(error, "Could not update inventory."),
                    "error"
                );
            } finally {
                isSavingInventory = false;

                setButtonLoading(
                    saveInventoryUpdateButton,
                    false,
                    "Save Changes",
                    "Saving..."
                );
            }
        });
    }

    closeInventoryModalButton?.addEventListener("click", closeUpdateForm);
    cancelInventoryUpdateButton?.addEventListener("click", closeUpdateForm);

    inventoryModal?.addEventListener("click", event => {
        if (event.target.dataset.closeModal === "true") {
            closeUpdateForm();
        }
    });

    document.addEventListener("keydown", event => {
        if (
            event.key === "Escape" &&
            inventoryModal &&
            !inventoryModal.classList.contains("hidden")
        ) {
            closeUpdateForm();
        }
    });

    // =========================================
    // FORECAST AND SHORTAGE ALERTS
    // =========================================

    function renderForecast(data) {
        const assessment = data?.shortage_assessment;

        if (!assessment) {
            throw new Error("Shortage assessment is missing from the response.");
        }

        setText(
            forecastDemandElement,
            `${formatNumber(assessment.predicted_demand_kg)} kg`
        );

        setText(
            forecastStockElement,
            `${formatNumber(assessment.available_stock_kg)} kg`
        );

        setText(
            forecastShortageElement,
            `${formatNumber(assessment.shortage_kg)} kg`
        );

        setText(forecastStatusElement, assessment.status || "Unknown");
        setText(forecastStatusMessage, assessment.message || "");

        if (forecastStatusElement) {
            forecastStatusElement.style.color =
                assessment.status === "SHORTAGE" ? "#b42318" : "#16803c";
        }
    }

    async function loadForecast() {
        setButtonLoading(
            refreshForecastButton,
            true,
            "Refresh Forecast",
            "Loading..."
        );

        hideMessage(forecastMessage);

        try {
            if (!dealerDistrict) {
                throw new Error(
                    "Your dealer profile does not contain a district. Update your profile and try again."
                );
            }

            const params = new URLSearchParams({
                district: dealerDistrict,
                crop: "Paddy",
                weeks_ahead: "4",
                demand_period: "next_week"
            });

            const data = await apiGet(
                `/forecasting/forecast-and-shortage?${params.toString()}`
            );

            renderForecast(data);
        } catch (error) {
            console.error("Unable to load forecast:", error);

            showMessage(
                forecastMessage,
                authenticationError(error)
                    ? "Your session is missing or has expired. Please sign in again."
                    : getErrorMessage(error, "Unable to load forecast data."),
                "error"
            );

            setText(forecastDemandElement, "—");
            setText(forecastStockElement, "—");
            setText(forecastShortageElement, "—");
            setText(forecastStatusElement, "Unavailable");
            setText(forecastStatusMessage, "Could not load forecast data.");
        } finally {
            setButtonLoading(
                refreshForecastButton,
                false,
                "Refresh Forecast",
                "Loading..."
            );
        }
    }

    // =========================================
    // BUTTON EVENTS
    // =========================================

    refreshInventoryButton?.addEventListener("click", loadInventory);
    refreshForecastButton?.addEventListener("click", loadForecast);
    refreshStoresButton?.addEventListener("click", loadStores);

    // =========================================
    // INITIAL DASHBOARD LOAD
    // =========================================

    async function initializeDashboard() {
        const token = sessionStorage.getItem("access_token")?.trim();

        if (!token) {
            showAuthenticationMessage();

            console.error(
                "Dealer dashboard initialization stopped: access token is missing."
            );

            return;
        }

        const profileLoaded = await loadDealerProfile();

        if (!profileLoaded) {
            return;
        }

        await Promise.all([
            loadInventory(),
            loadStores(),
            loadForecast()
        ]);
    }

    initializeDashboard();
});
