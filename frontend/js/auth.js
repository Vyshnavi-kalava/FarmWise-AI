
document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById("login-form");
    const registerForm = document.getElementById("register-form");

    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    const passwordToggle = document.getElementById("toggle-password");
    const authMessage = document.getElementById("auth-message");

    let redirectPending = false;

    // Display messages
    function showMessage(message, type = "error") {
        if (!authMessage) {
            console.log(message);
            return;
        }

        authMessage.textContent = message;
        authMessage.hidden = false;
        authMessage.classList.toggle("success", type === "success");
        authMessage.classList.toggle("error", type === "error");
        authMessage.setAttribute("role", "alert");
    }

    function hideMessage() {
        if (!authMessage) return;

        authMessage.hidden = true;
        authMessage.textContent = "";
        authMessage.classList.remove("success", "error");
    }

    function clearAuthFields() {
        if (emailInput) emailInput.value = "";
        if (passwordInput) passwordInput.value = "";

        const confirmPasswordInput =
            document.getElementById("confirm-password");

        if (confirmPasswordInput) {
            confirmPasswordInput.value = "";
        }

        hideMessage();
    }

    function isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    function redirectAfterMessage(message, destination) {
        redirectPending = true;
        showMessage(message, "success");

        window.setTimeout(() => {
            window.location.href = destination;
        }, 1200);
    }

    function getErrorMessage(error, fallback) {
        if (error?.detail) {
            if (Array.isArray(error.detail)) {
                return error.detail
                    .map(item => item.msg || "Invalid input")
                    .join(", ");
            }

            return String(error.detail);
        }

        if (error?.message) return String(error.message);

        return fallback;
    }

    function isDuplicateEmailError(error) {
        const message = String(
            `${error?.message || ""} ${error?.detail || ""}`
        ).toLowerCase();

        return (
            error?.status === 409 ||
            message.includes("already exists") ||
            message.includes("already registered") ||
            message.includes("email already") ||
            message.includes("duplicate email") ||
            message.includes("user already exists")
        );
    }

    function getRole(form) {
        return String(
            form?.querySelector('input[name="role"]:checked')?.value || ""
        ).trim().toLowerCase();
    }

    // Highlight selected role cards
    function setupRoleCards(form) {
        if (!form) return;

        const roleInputs = form.querySelectorAll('input[name="role"]');
        const roleCards = form.querySelectorAll(".role-card");

        function updateRoleSelection() {
            roleCards.forEach(card => {
                const radio = card.querySelector('input[name="role"]');

                card.classList.toggle("active", Boolean(radio?.checked));
            });
        }

        roleInputs.forEach(radio => {
            radio.addEventListener("change", updateRoleSelection);
        });

        updateRoleSelection();
    }

    setupRoleCards(loginForm);
    setupRoleCards(registerForm);

    // Registration fields
    const farmerProfileFields = document.getElementById(
        "farmer-profile-fields"
    );

    const dealerProfileFields = document.getElementById(
        "dealer-profile-fields"
    );

    const locationProfileFields = document.getElementById(
        "location-profile-fields"
    );

    const fullNameInput = document.getElementById("full-name");
    const phoneInput = document.getElementById("phone");

    const villageInput = document.getElementById("village");
    const districtInput = document.getElementById("district");
    const stateInput = document.getElementById("state");

    const preferredLanguageInput = document.getElementById(
        "preferred-language"
    );

    const businessNameInput = document.getElementById("business-name");

    const confirmPasswordInput = document.getElementById(
        "confirm-password"
    );

    // Show fields appropriate to the selected registration role
    function updateRegistrationFields() {
        if (!registerForm) return;

        const selectedRole = getRole(registerForm);
        const isFarmer = selectedRole === "farmer";
        const isDealer = selectedRole === "dealer";

        if (farmerProfileFields) {
            farmerProfileFields.hidden = !isFarmer;
        }

        if (dealerProfileFields) {
            dealerProfileFields.hidden = !isDealer;
        }

        if (locationProfileFields) {
            locationProfileFields.hidden = !(isFarmer || isDealer);
        }

        // Location is required for both roles
        [villageInput, districtInput, stateInput].forEach(input => {
            if (input) {
                input.required = isFarmer || isDealer;
            }
        });

        // Language is required only for farmers
        if (preferredLanguageInput) {
            preferredLanguageInput.required = isFarmer;
        }

        // Business name is required only for dealers
        if (businessNameInput) {
            businessNameInput.required = isDealer;
        }
    }

    registerForm?.querySelectorAll('input[name="role"]').forEach(radio => {
        radio.addEventListener("change", updateRegistrationFields);
    });

    updateRegistrationFields();

    // Clear credentials when switching login roles
    loginForm?.querySelectorAll('input[name="role"]').forEach(radio => {
        radio.addEventListener("change", clearAuthFields);
    });

    // Show or hide password
    passwordToggle?.addEventListener("click", () => {
        if (!passwordInput) return;

        const showing = passwordInput.type === "text";

        passwordInput.type = showing ? "password" : "text";
        passwordToggle.textContent = showing ? "Show" : "Hide";
        passwordToggle.setAttribute(
            "aria-label",
            showing ? "Show password" : "Hide password"
        );
    });

    // LOGIN: Farmer, Dealer, or Admin
    if (loginForm) {
        const loginButton = document.getElementById("login-button");
        const loginButtonText = document.getElementById(
            "login-button-text"
        );

        loginForm.addEventListener("submit", async event => {
            event.preventDefault();

            if (redirectPending) return;

            hideMessage();

            const email = emailInput?.value.trim().toLowerCase();
            const password = passwordInput?.value;
            const selectedRole = getRole(loginForm);

            if (!email || !password || !selectedRole) {
                showMessage(
                    "Please enter your email and password, and select your role."
                );
                return;
            }

            if (!isValidEmail(email)) {
                showMessage("Please enter a valid email address.");
                emailInput?.focus();
                return;
            }

            if (loginButton) loginButton.disabled = true;

            if (loginButtonText) {
                loginButtonText.textContent = "Signing in...";
            }

            try {
                sessionStorage.removeItem("access_token");
                sessionStorage.removeItem("user_role");
                sessionStorage.removeItem("user_email");
                sessionStorage.removeItem("user");

                const data = await apiPost("/auth/login", {
                    email,
                    password
                });

                const token = data?.access_token;

                if (!token) {
                    throw new Error(
                        "Login response did not contain an access token."
                    );
                }

                sessionStorage.setItem("access_token", token);

                let user = data?.user;

                let actualRole = String(
                    user?.role || user?.user?.role || ""
                ).trim().toLowerCase();

                // Retrieve user details if the role is missing
                if (!actualRole) {
                    user = await apiGet("/auth/me");

                    actualRole = String(
                        user?.role || user?.user?.role || ""
                    ).trim().toLowerCase();
                }

                if (!actualRole) {
                    throw new Error(
                        "The account role was not returned by the server."
                    );
                }

                if (actualRole !== selectedRole) {
                    throw new Error(
                        `This account belongs to the ${actualRole} role. ` +
                        "Please select the correct role."
                    );
                }

                const dashboards = {
                    farmer: "farmer.html",
                    dealer: "dealer.html",
                    admin: "admin.html"
                };

                const destination = dashboards[actualRole];

                if (!destination) {
                    throw new Error(
                        "No dashboard is configured for this role."
                    );
                }

                sessionStorage.setItem("user_role", actualRole);
                sessionStorage.setItem("user_email", email);
                sessionStorage.setItem("user", JSON.stringify(user || {}));

                redirectAfterMessage(
                    "Login successful! Redirecting to your dashboard...",
                    destination
                );

            } catch (error) {
                console.error("Login error:", error);

                sessionStorage.removeItem("access_token");
                sessionStorage.removeItem("user_role");
                sessionStorage.removeItem("user_email");
                sessionStorage.removeItem("user");

                showMessage(
                    getErrorMessage(
                        error,
                        "Unable to log in. Please check your credentials."
                    )
                );

            } finally {
                if (loginButton) {
                    loginButton.disabled = redirectPending;
                }

                if (loginButtonText) {
                    loginButtonText.textContent = redirectPending
                        ? "Login successful!"
                        : "Login";
                }
            }
        });
    }

    // REGISTRATION: Farmer and Dealer
    if (registerForm) {
        const registerButton = document.getElementById("register-button");
        const registerButtonText = document.getElementById(
            "register-button-text"
        );

        registerForm.addEventListener("submit", async event => {
            event.preventDefault();

            if (redirectPending) return;

            hideMessage();

            const fullName = fullNameInput?.value.trim() || "";
            const email = emailInput?.value.trim().toLowerCase() || "";
            const password = passwordInput?.value || "";
            const confirmPassword =
                confirmPasswordInput?.value || "";

            const phone = phoneInput?.value.trim() || null;
            const selectedRole = getRole(registerForm);

            const village = villageInput?.value.trim() || "";
            const district = districtInput?.value.trim() || "";
            const state = stateInput?.value.trim() || "";

            const preferredLanguage =
                preferredLanguageInput?.value || "";

            const businessName =
                businessNameInput?.value.trim() || "";

            // Basic validation
            if (
                !fullName ||
                !email ||
                !password ||
                !confirmPassword ||
                !selectedRole
            ) {
                showMessage(
                    "Please complete all required fields and select a role."
                );
                return;
            }

            if (!["farmer", "dealer"].includes(selectedRole)) {
                showMessage("Please select a valid account role.");
                return;
            }

            if (fullName.length < 2) {
                showMessage("Please enter your full name.");
                fullNameInput?.focus();
                return;
            }

            if (!isValidEmail(email)) {
                showMessage("Please enter a valid email address.");
                emailInput?.focus();
                return;
            }

            if (password.length < 8) {
                showMessage(
                    "Your password must contain at least 8 characters."
                );
                passwordInput?.focus();
                return;
            }

            if (password !== confirmPassword) {
                showMessage("The passwords do not match.");
                confirmPasswordInput?.focus();
                return;
            }

            // Validate shared location fields
            if (!village || !district || !state) {
                showMessage(
                    "Please enter your village, district, and state."
                );

                if (!village) villageInput?.focus();
                else if (!district) districtInput?.focus();
                else stateInput?.focus();

                return;
            }

            // Validate farmer-specific field
            if (selectedRole === "farmer" && !preferredLanguage) {
                showMessage("Please select your preferred language.");
                preferredLanguageInput?.focus();
                return;
            }

            // Validate dealer-specific field
            if (selectedRole === "dealer" && !businessName) {
                showMessage("Please enter your business name.");
                businessNameInput?.focus();
                return;
            }

            if (registerButton) registerButton.disabled = true;

            if (registerButtonText) {
                registerButtonText.textContent = "Creating account...";
            }

            try {
                // Common account information
                const registrationData = {
                    full_name: fullName,
                    email,
                    password,
                    role: selectedRole,
                    phone,
                    village,
                    district,
                    state
                };

                // Add role-specific information
                if (selectedRole === "farmer") {
                    registrationData.preferred_language =
                        preferredLanguage;
                }

                if (selectedRole === "dealer") {
                    registrationData.business_name = businessName;
                }

                await apiPost("/auth/register", registrationData);

                registerForm.reset();

                // Restore the default farmer selection and fields
                const farmerRadio =
                    document.getElementById("role-farmer");

                if (farmerRadio) {
                    farmerRadio.checked = true;
                }

                updateRegistrationFields();
                setupRoleCards(registerForm);

                redirectAfterMessage(
                    "Registration successful! Redirecting to login...",
                    "login.html"
                );

            } catch (error) {
                console.error("Registration error:", error);

                if (isDuplicateEmailError(error)) {
                    showMessage(
                        "An account with this email already exists. " +
                        "Please sign in instead."
                    );

                    if (emailInput) emailInput.value = email;

                } else {
                    showMessage(
                        getErrorMessage(
                            error,
                            "Unable to create your account. Please try again."
                        )
                    );
                }

            } finally {
                if (registerButton) {
                    registerButton.disabled = redirectPending;
                }

                if (registerButtonText) {
                    registerButtonText.textContent = redirectPending
                        ? "Registration successful!"
                        : "Create account";
                }
            }
        });
    }

    // Google login
    document.getElementById("google-login")
        ?.addEventListener("click", () => {
            showMessage(
                "Google sign-in is not configured yet. " +
                "Please use your email and password."
            );
        });
});
