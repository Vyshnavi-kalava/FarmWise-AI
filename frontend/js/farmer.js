const CONFIG = window.FARMWISE_CONFIG;

if (!CONFIG?.apiBaseUrl) {
    throw new Error("FarmWise configuration is missing.");
}

const FARMER_API_BASE = CONFIG.apiBaseUrl.replace(/\/+$/, "");
const $ = (selector) => document.querySelector(selector);

const productForm = $("#productSearchForm");
const productQuery = $("#productQuery");
const villageInput = $("#villageInput");
const districtInput = $("#districtInput");
const productResults = $("#productResults");
const storeResults = $("#storeResults");
const messageBox = $("#messageBox");
const resultsSummary = $("#resultsSummary");
const voiceStatus = $("#voiceStatus");
const languageSelect = $("#languageSelect");

let language = localStorage.getItem("farmwise_language") || "en";
let latestProducts = [];
let latestStores = [];
let activeRecognition = null;

const LANGUAGES = {
    en: {
        locale: "en-IN",
        title: "FarmWise AI | Farmer Dashboard",
        brandSubtitle: "Smart farming assistant",
        status: "Farming assistant",
        language: "Language",
        logout: "Log out",
        welcomeEyebrow: "YOUR FARMING COMPANION",
        welcomeTitle: "Find the right farm inputs.",
        welcomeDescription: "Check dealer-listed stock, compare prices, and find stores near your village.",
        searchEyebrow: "FARM INPUTS",
        searchHeading: "What do you need today?",
        productLabel: "Search for a product",
        productPlaceholder: "Try urea, DAP, seeds or pesticides",
        voice: "Voice",
        search: "Search",
        voiceHelp: "Type your search or use voice search.",
        village: "Village",
        villagePlaceholder: "Enter village",
        district: "District",
        districtPlaceholder: "Enter district",
        clear: "Clear filters",
        popular: "Popular:",
        resultsHeading: "Available farm inputs",
        resultsInitial: "Search to view available stock from registered stores.",
        initialMessage: "Enter a product and select Search to find available stock.",
        storesEyebrow: "LOCAL DEALERS",
        storesHeading: "Find a farm-input store",
        storesDescription: "Explore registered stores matching your village or district.",
        findStores: "Find stores",
        footerTagline: "FarmWise AI · Make informed farming decisions.",
        footerDisclaimer: "Stock and prices are based on dealer-provided records.",
        searching: "Searching registered dealer inventory…",
        loading: "Loading available stock…",
        found: n => `${n} available listing${n === 1 ? "" : "s"} found`,
        noProducts: "No matching products with available stock were found. Try another product or location.",
        stockNotice: "Stock and prices below come from dealer records. Confirm availability with the dealer before travelling.",
        loadError: "Unable to load products.",
        unexpectedProducts: "The server returned an unexpected response.",
        noToken: "Please log in with your farmer account to search products and stores.",
        expired: "Your session has expired. Please log in again.",
        forbidden: "This page requires a farmer account. Please log in with the correct account.",
        requestError: n => `Request failed (${n}). Please try again.`,
        // notVerified: "Not verified",
        dateUnavailable: "Date unavailable",
        priceMissing: "Price not listed",
        farmInput: "Farm input",
        storeMissing: "Store name unavailable",
        address: "Address",
        addressMissing: "Address not provided",
        store: "Store",
        businessName: "Shop name",
        // dealer: "Dealer verification",
        dealerName: "Dealer name",
        dealerNameMissing: "Dealer name unavailable",
        verifiedDealer: "Verified dealer",
        lastUpdated: "Last updated",
        // lastVerified: "Inventory last verified",
        unavailable: "Unavailable",
        contactDealer: "Contact dealer",
        phoneMissing: "Dealer phone number unavailable.",
        noStores: "No matching stores found for this location.",
        storeMissingName: "Farm-input store",
        notListed: "Not listed",
        listening: "Listening… Please say the product name.",
        voiceUnsupported: "Voice recognition is not supported in this browser. Please type your search.",
        voiceEnded: "Voice search ended. Try again or type your search.",
        voiceError: e => `Voice search error: ${e}. You can type your search instead.`,
        youSaid: text => `You said: "${text}"`,
        noStockSpoken: "No matching available stock was found.",
        rupeesPerKg: p => `${p} rupees per kilogram`,
        listingSpoken: (name, quantity, price, store, dealer, shop) =>
            `${name}. ${quantity} kilograms available. Price: ${price}. Store: ${store}. Dealer name: ${dealer}. Shop name: ${shop}.`,
        kg: "kg available",
        products: {
            urea: "Urea",
            dap: "DAP",
            seeds: "Seeds",
            pesticides: "Pesticides"
        }
    },

    te: {
        locale: "te-IN",
        title: "ఫార్మ్‌వైజ్ AI | రైతు డాష్‌బోర్డ్",
        brandSubtitle: "స్మార్ట్ వ్యవసాయ సహాయకుడు",
        status: "వ్యవసాయ సహాయకుడు",
        language: "భాష",
        logout: "లాగ్ అవుట్",
        welcomeEyebrow: "మీ వ్యవసాయ సహచరుడు",
        welcomeTitle: "మీకు అవసరమైన వ్యవసాయ ఉత్పత్తులను కనుగొనండి.",
        welcomeDescription: "డీలర్ వద్ద ఉన్న నిల్వను, ధరలను పరిశీలించి మీ గ్రామానికి సమీపంలోని దుకాణాలను కనుగొనండి.",
        searchEyebrow: "వ్యవసాయ ఉత్పత్తులు",
        searchHeading: "ఈ రోజు మీకు ఏమి కావాలి?",
        productLabel: "ఉత్పత్తి కోసం వెతకండి",
        productPlaceholder: "యూరియా, DAP, విత్తనాలు లేదా పురుగుమందులు",
        voice: "వాయిస్",
        search: "వెతకండి",
        voiceHelp: "టైప్ చేయండి లేదా వాయిస్ ద్వారా వెతకండి.",
        village: "గ్రామం",
        villagePlaceholder: "గ్రామం పేరు నమోదు చేయండి",
        district: "జిల్లా",
        districtPlaceholder: "జిల్లా పేరు నమోదు చేయండి",
        clear: "ఫిల్టర్లను తొలగించండి",
        popular: "ప్రసిద్ధమైనవి:",
        resultsHeading: "అందుబాటులో ఉన్న వ్యవసాయ ఉత్పత్తులు",
        resultsInitial: "నమోదైన దుకాణాల్లో నిల్వను చూడటానికి వెతకండి.",
        initialMessage: "ఉత్పత్తి పేరు నమోదు చేసి వెతకండి.",
        storesEyebrow: "స్థానిక డీలర్లు",
        storesHeading: "వ్యవసాయ ఉత్పత్తుల దుకాణాన్ని కనుగొనండి",
        storesDescription: "మీ గ్రామం లేదా జిల్లాకు సంబంధించిన నమోదైన దుకాణాలను చూడండి.",
        findStores: "దుకాణాలను కనుగొనండి",
        footerTagline: "FarmWise AI · సమాచారంతో కూడిన వ్యవసాయ నిర్ణయాలు తీసుకోండి.",
        footerDisclaimer: "నిల్వ మరియు ధరల వివరాలు డీలర్లు అందించిన రికార్డుల ఆధారంగా ఉంటాయి.",
        searching: "డీలర్ నిల్వ వివరాలను వెతుకుతున్నాం…",
        loading: "అందుబాటులో ఉన్న నిల్వను లోడ్ చేస్తున్నాం…",
        found: n => `${n} అందుబాటులో ఉన్న జాబితాలు కనుగొనబడ్డాయి`,
        noProducts: "నిల్వ ఉన్న సరిపోలే ఉత్పత్తులు కనుగొనబడలేదు. వేరే ఉత్పత్తి లేదా ప్రదేశంతో ప్రయత్నించండి.",
        stockNotice: "క్రింది నిల్వ, ధరలు డీలర్ రికార్డుల ఆధారంగా ఉన్నాయి. వెళ్లే ముందు డీలర్‌ను సంప్రదించి నిర్ధారించుకోండి.",
        loadError: "ఉత్పత్తులను లోడ్ చేయలేకపోయాం.",
        unexpectedProducts: "సర్వర్ నుండి ఊహించని వివరాలు వచ్చాయి.",
        noToken: "ఉత్పత్తులు, దుకాణాల కోసం వెతకడానికి రైతు ఖాతాతో లాగిన్ అవ్వండి.",
        expired: "మీ సెషన్ ముగిసింది. మళ్లీ లాగిన్ అవ్వండి.",
        forbidden: "ఈ పేజీకి రైతు ఖాతా అవసరం. సరైన ఖాతాతో లాగిన్ అవ్వండి.",
        requestError: n => `అభ్యర్థన విఫలమైంది (${n}). మళ్లీ ప్రయత్నించండి.`,
        notVerified: "ధృవీకరించలేదు",
        dateUnavailable: "తేదీ అందుబాటులో లేదు",
        priceMissing: "ధర నమోదు చేయలేదు",
        farmInput: "వ్యవసాయ ఉత్పత్తి",
        storeMissing: "దుకాణం పేరు అందుబాటులో లేదు",
        address: "చిరునామా",
        addressMissing: "చిరునామా నమోదు చేయలేదు",
        store: "దుకాణం",
        businessName: "దుకాణం పేరు",
        dealer: "డీలర్ ధృవీకరణ",
        dealerName: "డీలర్ పేరు",
        dealerNameMissing: "డీలర్ పేరు అందుబాటులో లేదు",
        verifiedDealer: "ధృవీకరించిన డీలర్",
        lastUpdated: "చివరిగా నవీకరించిన సమయం",
        lastVerified: "నిల్వ చివరిగా ధృవీకరించిన సమయం",
        unavailable: "అందుబాటులో లేదు",
        contactDealer: "డీలర్‌కు సంపర్కించండి",
        phoneMissing: "డీలర్ ఫోన్ నంబర్ అందుబాటులో లేదు.",
        noStores: "ఈ ప్రదేశానికి సరిపోలే దుకాణాలు కనుగొనబడలేదు.",
        storeMissingName: "వ్యవసాయ ఉత్పత్తుల దుకాణం",
        notListed: "నమోదు చేయలేదు",
        listening: "వింటున్నాం… ఉత్పత్తి పేరు చెప్పండి.",
        voiceUnsupported: "ఈ బ్రౌజర్‌లో వాయిస్ గుర్తింపు అందుబాటులో లేదు. దయచేసి టైప్ చేయండి.",
        voiceEnded: "వాయిస్ శోధన ముగిసింది. మళ్లీ ప్రయత్నించండి లేదా టైప్ చేయండి.",
        voiceError: e => `వాయిస్ శోధనలో సమస్య: ${e}. బదులుగా టైప్ చేయవచ్చు.`,
        youSaid: text => `మీరు చెప్పింది: "${text}"`,
        noStockSpoken: "సరిపోలే నిల్వ ఉన్న ఉత్పత్తులు కనుగొనబడలేదు.",
        rupeesPerKg: p => `కిలోకు ${p} రూపాయలు`,
        listingSpoken: (name, quantity, price, store, dealer, shop) =>
            `${name}. ${quantity} కిలోలు అందుబాటులో ఉన్నాయి. ధర: ${price}. దుకాణం: ${store}. డీలర్ పేరు: ${dealer}. షాప్ పేరు: ${shop}.`,
        kg: "కిలోలు అందుబాటులో ఉన్నాయి",
        products: {
            urea: "యూరియా",
            dap: "డీఏపీ",
            seeds: "విత్తనాలు",
            pesticides: "పురుగుమందులు"
        }
    },

    hi: {
        locale: "hi-IN",
        title: "फार्मवाइज़ AI | किसान डैशबोर्ड",
        brandSubtitle: "स्मार्ट खेती सहायक",
        status: "खेती सहायक",
        language: "भाषा",
        logout: "लॉग आउट",
        welcomeEyebrow: "आपका कृषि साथी",
        welcomeTitle: "सही कृषि सामग्री खोजें।",
        welcomeDescription: "डीलर के स्टॉक और कीमतें देखें तथा अपने गाँव के पास दुकानें खोजें।",
        searchEyebrow: "कृषि सामग्री",
        searchHeading: "आज आपको क्या चाहिए?",
        productLabel: "उत्पाद खोजें",
        productPlaceholder: "यूरिया, DAP, बीज या कीटनाशक",
        voice: "आवाज़",
        search: "खोजें",
        voiceHelp: "टाइप करें या आवाज़ से खोजें।",
        village: "गाँव",
        villagePlaceholder: "गाँव दर्ज करें",
        district: "ज़िला",
        districtPlaceholder: "ज़िला दर्ज करें",
        clear: "फ़िल्टर साफ़ करें",
        popular: "लोकप्रिय:",
        resultsHeading: "उपलब्ध कृषि सामग्री",
        resultsInitial: "पंजीकृत दुकानों का स्टॉक देखने के लिए खोजें।",
        initialMessage: "उत्पाद का नाम दर्ज करें और खोजें।",
        storesEyebrow: "स्थानीय डीलर",
        storesHeading: "कृषि सामग्री की दुकान खोजें",
        storesDescription: "अपने गाँव या ज़िले से मेल खाने वाली पंजीकृत दुकानें देखें।",
        findStores: "दुकानें खोजें",
        footerTagline: "FarmWise AI · सोच-समझकर खेती के निर्णय लें।",
        footerDisclaimer: "स्टॉक और कीमतें डीलर द्वारा दिए गए रिकॉर्ड पर आधारित हैं।",
        searching: "पंजीकृत डीलर का स्टॉक खोजा जा रहा है…",
        loading: "उपलब्ध स्टॉक लोड किया जा रहा है…",
        found: n => `${n} उपलब्ध सूची मिली`,
        noProducts: "उपलब्ध स्टॉक वाला उत्पाद नहीं मिला। दूसरा उत्पाद या स्थान आज़माएँ।",
        stockNotice: "स्टॉक और कीमतें डीलर रिकॉर्ड पर आधारित हैं। जाने से पहले डीलर से पुष्टि करें।",
        loadError: "उत्पाद लोड नहीं हो सके।",
        unexpectedProducts: "सर्वर से अप्रत्याशित जवाब मिला।",
        noToken: "उत्पाद और दुकानें खोजने के लिए किसान खाते से लॉग इन करें।",
        expired: "आपका सत्र समाप्त हो गया है। कृपया फिर से लॉग इन करें।",
        forbidden: "इस पेज के लिए किसान खाता आवश्यक है। सही खाते से लॉग इन करें।",
        requestError: n => `अनुरोध विफल हुआ (${n})। फिर से प्रयास करें।`,
        notVerified: "सत्यापित नहीं",
        dateUnavailable: "तारीख उपलब्ध नहीं",
        priceMissing: "कीमत दर्ज नहीं है",
        farmInput: "कृषि सामग्री",
        storeMissing: "दुकान का नाम उपलब्ध नहीं",
        address: "पता",
        addressMissing: "पता दर्ज नहीं है",
        store: "दुकान",
        businessName: "दुकान का नाम",
        dealer: "डीलर सत्यापन",
        dealerName: "डीलर का नाम",
        dealerNameMissing: "डीलर का नाम उपलब्ध नहीं",
        verifiedDealer: "सत्यापित डीलर",
        lastUpdated: "अंतिम अपडेट",
        lastVerified: "स्टॉक का अंतिम सत्यापन",
        unavailable: "उपलब्ध नहीं",
        contactDealer: "डीलर को संपर्क करें",
        phoneMissing: "डीलर का फोन नंबर उपलब्ध नहीं है।",
        noStores: "इस स्थान के लिए कोई मेल खाती दुकान नहीं मिली।",
        storeMissingName: "कृषि सामग्री की दुकान",
        notListed: "सूचीबद्ध नहीं",
        listening: "सुन रहे हैं… उत्पाद का नाम बोलें।",
        voiceUnsupported: "इस ब्राउज़र में आवाज़ पहचान उपलब्ध नहीं है। कृपया टाइप करें।",
        voiceEnded: "आवाज़ से खोज समाप्त हुई। फिर से प्रयास करें या टाइप करें।",
        voiceError: e => `आवाज़ खोज त्रुटि: ${e}. आप टाइप करके खोज सकते हैं।`,
        youSaid: text => `आपने कहा: "${text}"`,
        noStockSpoken: "मेल खाता उपलब्ध स्टॉक नहीं मिला।",
        rupeesPerKg: p => `प्रति किलोग्राम ${p} रुपये`,
        listingSpoken: (name, quantity, price, store, dealer, shop) =>
            `${name}। ${quantity} किलोग्राम उपलब्ध हैं। कीमत: ${price}। दुकान: ${store}। डीलर का नाम: ${dealer}। दुकान का नाम: ${shop}।`,
        kg: "किलोग्राम उपलब्ध",
        products: {
            urea: "यूरिया",
            dap: "डीएपी",
            seeds: "बीज",
            pesticides: "कीटनाशक"
        }
    }
};

function t(key) {
    return LANGUAGES[language][key] ?? LANGUAGES.en[key] ?? key;
}

function getToken() {
    return sessionStorage.getItem("access_token");
}

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

function showMessage(message, type = "") {
    messageBox.textContent = message;
    messageBox.className = `message ${type}`.trim();
}

function formatDate(value) {
    if (!value) return t("dateUnavailable");

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return t("dateUnavailable");
    }

    return new Intl.DateTimeFormat(LANGUAGES[language].locale, {
        dateStyle: "medium",
        timeStyle: "short"
    }).format(date);
}

function formatPrice(price) {
    if (price === null || price === undefined || price === "") {
        return escapeHTML(t("priceMissing"));
    }

    const amount = Number(price);

    if (!Number.isFinite(amount) || amount < 0) {
        return escapeHTML(t("priceMissing"));
    }

    const formatted = new Intl.NumberFormat(LANGUAGES[language].locale, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount);

    const unit = language === "te"
        ? "కిలో"
        : language === "hi"
            ? "किलो"
            : "kg";

    return `₹${formatted} <small>/ ${unit}</small>`;
}

function normalise(value) {
    return String(value ?? "").trim().toLowerCase();
}

function canonicalProductQuery(raw) {
    const value = normalise(raw);

    const aliases = [
        {
            name: "urea",
            words: ["urea", "యూరియా", "యూరియ", "यूरिया"]
        },
        {
            name: "DAP",
            words: ["dap", "డీఏపీ", "డిఏపి", "డి ఎ పి", "डीएपी", "डी ए पी"]
        },
        {
            name: "seeds",
            words: ["seeds", "seed", "విత్తనాలు", "విత్తనం", "बीज", "बीजों"]
        },
        {
            name: "pesticides",
            words: [
                "pesticides",
                "pesticide",
                "పురుగుమందులు",
                "పురుగుమందు",
                "कीटनाशक",
                "कीटनाशकों"
            ]
        }
    ];

    for (const item of aliases) {
        if (item.words.some(word => value.includes(normalise(word)))) {
            return item.name;
        }
    }

    return String(raw ?? "").trim();
}

async function farmerRequest(path) {
    const token = getToken();

    if (!token) {
        throw new Error(t("noToken"));
    }

    const response = await fetch(`${FARMER_API_BASE}${path}`, {
        method: "GET",
        headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json"
        }
    });

    if (response.status === 401) {
        throw new Error(t("expired"));
    }

    if (response.status === 403) {
        throw new Error(t("forbidden"));
    }

    if (!response.ok) {
        throw new Error(t("requestError")(response.status));
    }

    return response.json();
}

function buildQuery(parameters) {
    const query = new URLSearchParams();

    for (const [key, value] of Object.entries(parameters)) {
        if (value && String(value).trim()) {
            query.set(key, String(value).trim());
        }
    }

    return query.toString();
}

function translateStaticUI() {
    const textMap = {
        "#brandSubtitle": "brandSubtitle",
        "#assistantStatusText": "status",
        "#languageLabel": "language",
        "#logoutBtn": "logout",
        "#welcomeEyebrow": "welcomeEyebrow",
        "#welcomeTitle": "welcomeTitle",
        "#welcomeDescription": "welcomeDescription",
        "#searchEyebrow": "searchEyebrow",
        "#searchHeading": "searchHeading",
        "#productQueryLabel": "productLabel",
        "#voiceSearchText": "voice",
        "#searchBtn": "search",
        "#villageLabel": "village",
        "#districtLabel": "district",
        "#clearFiltersBtn": "clear",
        "#popularLabel": "popular",
        "#resultsHeading": "resultsHeading",
        "#storesEyebrow": "storesEyebrow",
        "#storesHeading": "storesHeading",
        "#storesDescription": "storesDescription",
        "#findStoresBtn": "findStores",
        "#footerTagline": "footerTagline",
        "#footerDisclaimer": "footerDisclaimer"
    };

    document.documentElement.lang = language;
    document.title = t("title");

    for (const [selector, key] of Object.entries(textMap)) {
        const element = $(selector);

        if (element) {
            element.textContent = t(key);
        }
    }

    const assistantStatus = $("#assistantStatus");

    if (assistantStatus) {
        assistantStatus.innerHTML =
            `<span class="status-dot"></span><span id="assistantStatusText">${escapeHTML(t("status"))}</span>`;
    }

    productQuery.placeholder = t("productPlaceholder");
    villageInput.placeholder = t("villagePlaceholder");
    districtInput.placeholder = t("districtPlaceholder");

    productQuery.setAttribute("aria-label", t("productLabel"));

    $("#voiceSearchBtn")?.setAttribute("aria-label", t("voice"));
    $("#quickSearches")?.setAttribute("aria-label", t("popular"));

    document.querySelectorAll("[data-product]").forEach(button => {
        const key = normalise(button.dataset.product);

        button.textContent =
            LANGUAGES[language].products[key] ?? button.dataset.product;
    });

    if (
        resultsSummary.textContent === "" ||
        resultsSummary.dataset.initial === "true"
    ) {
        resultsSummary.textContent = t("resultsInitial");
    }

    if (!getToken()) {
        showMessage(t("noToken"), "error");
    } else {
        showMessage(t("initialMessage"));
    }

    renderProducts(latestProducts);
    renderStores(latestStores);

    voiceStatus.textContent = t("voiceHelp");
}

function renderProducts(products) {
    productResults.replaceChildren();

    for (const item of products) {
        const store = item.store || {};
        const dealer = item.dealer || {};

        const quantity = Number(item.available_quantity_kg);

        const productName = escapeHTML(
            item.product_name || t("farmInput")
        );

        const storeName = escapeHTML(
            store.name || t("storeMissing")
        );

        const dealerName = escapeHTML(
            dealer.full_name || t("dealerNameMissing")
        );

        const businessName = escapeHTML(
            dealer.business_name || t("storeMissing")
        );

        const address = [
            store.address,
            store.village,
            store.district,
            store.state
        ].filter(Boolean).join(", ");

        const phone = String(dealer.phone || "").trim();
        const validPhone = /^[+0-9()\-\s]{7,20}$/.test(phone);
        const verified = dealer.is_verified === true;

        const safeQuantity = Number.isFinite(quantity) ? quantity : 0;

        const lowStock =
            Number.isFinite(quantity) &&
            quantity < (Number(CONFIG.lowStockThresholdKg) || 0);

        const card = document.createElement("article");
        card.className = "product-card";

        card.innerHTML = `
            <div class="card-top">
                <h3>${productName}</h3>

                <span class="stock-badge ${lowStock ? "low-stock" : ""}">
                    ${new Intl.NumberFormat(LANGUAGES[language].locale)
                        .format(safeQuantity)}
                    ${escapeHTML(t("kg"))}
                </span>
            </div>

            <p class="product-price">
                ${formatPrice(item.price_per_kg)}
            </p>

            <div class="card-details">
                <div class="detail-row">
                    <span>${escapeHTML(t("store"))}</span>
                    <span>${storeName}</span>
                </div>

                <div class="detail-row">
                    <span>${escapeHTML(t("address"))}</span>
                    <span>${escapeHTML(address || t("addressMissing"))}</span>
                </div>

                <div class="detail-row">
                    <span>${escapeHTML(t("dealerName"))}</span>
                    <span>${dealerName}</span>
                </div>

                <div class="detail-row">
                    <span>${escapeHTML(t("businessName"))}</span>
                    <span>${businessName}</span>
                </div>

                <div class="detail-row">
                    <span>${escapeHTML(t("lastUpdated"))}</span>
                    <span>${escapeHTML(formatDate(item.inventory_updated_at))}</span>
                </div>

               
            </div>

            ${validPhone
                ? `<a class="card-contact"
                      href="tel:${escapeHTML(phone.replace(/[^\d+]/g, ""))}">
                      ${escapeHTML(t("contactDealer"))} · ${escapeHTML(phone)}
                   </a>`
                : `<p class="helper">${escapeHTML(t("phoneMissing"))}</p>`
            }
        `;

        productResults.appendChild(card);
    }
}

async function searchProducts() {
    const q = canonicalProductQuery(productQuery.value);
    const village = villageInput.value.trim();
    const district = districtInput.value.trim();

    productResults.replaceChildren();
    showMessage(t("searching"));
    resultsSummary.textContent = t("loading");

    try {
        const queryString = buildQuery({
            q,
            village,
            district
        });

        const path =
            `/farmer/products${queryString ? `?${queryString}` : ""}`;

        const products = await farmerRequest(path);

        if (!Array.isArray(products)) {
            throw new Error(t("unexpectedProducts"));
        }

        latestProducts = products.filter(item => {
            const quantity = Number(item.available_quantity_kg);

            return Number.isFinite(quantity) && quantity > 0;
        });

        renderProducts(latestProducts);

        resultsSummary.dataset.initial = "false";
        resultsSummary.textContent = t("found")(latestProducts.length);

        if (latestProducts.length === 0) {
            showMessage(t("noProducts"));
        } else {
            showMessage(t("stockNotice"), "success");
        }

        return true;
    } catch (error) {
        latestProducts = [];
        productResults.replaceChildren();

        resultsSummary.textContent = t("loadError");

        showMessage(error.message || t("loadError"), "error");

        return false;
    }
}

async function searchStores() {
    storeResults.replaceChildren();
    showMessage(t("searching"));

    try {
        const queryString = buildQuery({
            village: villageInput.value.trim(),
            district: districtInput.value.trim()
        });

        const path =
            `/farmer/stores${queryString ? `?${queryString}` : ""}`;

        const stores = await farmerRequest(path);

        if (!Array.isArray(stores)) {
            throw new Error(t("unexpectedProducts"));
        }

        latestStores = stores;

        renderStores(latestStores);

        if (latestStores.length === 0) {
            storeResults.innerHTML =
                `<p class="helper">${escapeHTML(t("noStores"))}</p>`;

            showMessage(t("noStores"));
        } else {
            showMessage(t("found")(latestStores.length), "success");
        }

        return true;
    } catch (error) {
        latestStores = [];
        storeResults.replaceChildren();

        showMessage(error.message || t("loadError"), "error");

        return false;
    }
}

function renderStores(stores) {
    storeResults.replaceChildren();

    for (const store of stores) {
        const address = [
            store.address,
            store.village,
            store.district,
            store.state
        ].filter(Boolean).join(", ");

        const phone = String(store.dealer_phone || "").trim();

        const validPhone = /^[+0-9()\-\s]{7,20}$/.test(phone);

        const dealerName = escapeHTML(
            store.dealer_name || t("dealerNameMissing")
        );

        const businessName = escapeHTML(
            store.dealer_business_name || t("storeMissing")
        );

        const card = document.createElement("article");
        card.className = "store-card";

        card.innerHTML = `
            <div class="card-top">
                <h3>${escapeHTML(
                    store.store_name || t("storeMissingName")
                )}</h3>

            </div>

            <div class="card-details">
                <div class="detail-row">
                    <span>${escapeHTML(t("dealerName"))}</span>
                    <span>${dealerName}</span>
                </div>

                <div class="detail-row">
                    <span>${escapeHTML(t("businessName"))}</span>
                    <span>${businessName}</span>
                </div>

                <div class="detail-row">
                    <span>${escapeHTML(t("address"))}</span>
                    <span>${escapeHTML(address || t("addressMissing"))}</span>
                </div>

                <div class="detail-row">
                    <span>${escapeHTML(t("village"))}</span>
                    <span>${escapeHTML(store.village || t("notListed"))}</span>
                </div>

                <div class="detail-row">
                    <span>${escapeHTML(t("district"))}</span>
                    <span>${escapeHTML(store.district || t("notListed"))}</span>
                </div>
            </div>

            ${validPhone
                ? `<a class="card-contact"
                      href="tel:${escapeHTML(phone.replace(/[^\d+]/g, ""))}">
                      ${escapeHTML(t("contactDealer"))} · ${escapeHTML(phone)}
                   </a>`
                : `<p class="helper">${escapeHTML(t("phoneMissing"))}</p>`
            }
        `;

        storeResults.appendChild(card);
    }
}

function getSpeechRecognition() {
    return window.SpeechRecognition || window.webkitSpeechRecognition;
}

function getAvailableSpeechVoices() {
    const speechSynthesis = window.speechSynthesis;
    const voices = speechSynthesis.getVoices();

    if (voices.length || typeof speechSynthesis.addEventListener !== "function") {
        return Promise.resolve(voices);
    }

    return new Promise(resolve => {
        let timeoutId;

        const finish = () => {
            window.clearTimeout(timeoutId);
            speechSynthesis.removeEventListener("voiceschanged", finish);
            resolve(speechSynthesis.getVoices());
        };

        speechSynthesis.addEventListener("voiceschanged", finish, {
            once: true
        });
        timeoutId = window.setTimeout(finish, 1500);
    });
}

function startVoiceSearch() {
    const SpeechRecognition = getSpeechRecognition();

    if (!SpeechRecognition) {
        voiceStatus.textContent = t("voiceUnsupported");
        return;
    }

    if (activeRecognition) {
        activeRecognition.abort();
        activeRecognition = null;
    }

    const recognition = new SpeechRecognition();
    activeRecognition = recognition;

    recognition.lang = LANGUAGES[language].locale;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    voiceStatus.textContent = t("listening");

    recognition.onresult = async event => {
        const spokenText = event.results[0][0].transcript.trim();

        productQuery.value = spokenText;
        voiceStatus.textContent = t("youSaid")(spokenText);

        const succeeded = await searchProducts();

        if (succeeded) {
            speakResults();
        }
    };

    recognition.onerror = event => {
        voiceStatus.textContent = t("voiceError")(event.error);
    };

    recognition.onend = () => {
        if (activeRecognition === recognition) {
            activeRecognition = null;
        }

        if (voiceStatus.textContent === t("listening")) {
            voiceStatus.textContent = t("voiceEnded");
        }
    };

    try {
        recognition.start();
    } catch {
        activeRecognition = null;
        voiceStatus.textContent = t("voiceUnsupported");
    }
}

async function speakResults() {
    if (!("speechSynthesis" in window)) {
        voiceStatus.textContent = t("voiceUnsupported");
        return;
    }

    const selectedLanguage = language;
    const dictionary = LANGUAGES[selectedLanguage];

    const listings = latestProducts.slice(
        0,
        Number(CONFIG.maxVoiceResults) || 3
    );

    const spokenListings = listings.map(item => {
        const store = item.store || {};
        const dealer = item.dealer || {};

        const rawName = normalise(item.product_name);

        const knownProduct = [
            "urea",
            "dap",
            "seeds",
            "pesticides"
        ].find(name =>
            rawName === name || rawName.startsWith(`${name} `)
        );

        const name = knownProduct
            ? dictionary.products[knownProduct]
            : item.product_name || dictionary.farmInput;

        const quantity = new Intl.NumberFormat(dictionary.locale)
            .format(Number(item.available_quantity_kg));

        const price = item.price_per_kg == null
            ? dictionary.priceMissing
            : dictionary.rupeesPerKg(
                new Intl.NumberFormat(dictionary.locale, {
                    maximumFractionDigits: 2
                }).format(Number(item.price_per_kg))
            );

        const storeName = store.name || dictionary.storeMissing;

        const dealerName =
            dealer.full_name || dictionary.dealerNameMissing;

        const businessName =
            dealer.business_name || dictionary.storeMissing;

        return dictionary.listingSpoken(
            name,
            quantity,
            price,
            storeName,
            dealerName,
            businessName
        );
    });

    const message = spokenListings.length
        ? spokenListings.join(" ")
        : dictionary.noStockSpoken;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(message);
    utterance.lang = dictionary.locale;

    const voices = await getAvailableSpeechVoices();

    if (language !== selectedLanguage) return;

    const locale = dictionary.locale.toLowerCase();
    const matchingVoice =
        voices.find(voice => voice.lang.toLowerCase() === locale) ||
        voices.find(voice =>
            voice.lang.toLowerCase().split(/[-_]/)[0] === selectedLanguage
        );

    if (matchingVoice) {
        utterance.voice = matchingVoice;
    }

    window.speechSynthesis.speak(utterance);
}

productForm.addEventListener("submit", async event => {
    event.preventDefault();

    await searchProducts();
});

document.querySelectorAll("[data-product]").forEach(button => {
    button.addEventListener("click", async () => {
        productQuery.value = button.dataset.product;

        await searchProducts();
    });
});

$("#clearFiltersBtn").addEventListener("click", async () => {
    villageInput.value = "";
    districtInput.value = "";

    await Promise.all([
        searchProducts(),
        searchStores()
    ]);
});

$("#findStoresBtn").addEventListener("click", searchStores);

$("#voiceSearchBtn").addEventListener("click", startVoiceSearch);

languageSelect.addEventListener("change", () => {
    const selectedLanguage = languageSelect.value;

    if (!LANGUAGES[selectedLanguage]) return;

    language = selectedLanguage;

    localStorage.setItem("farmwise_language", language);

    if (activeRecognition) {
        activeRecognition.abort();
        activeRecognition = null;
    }

    if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
    }

    translateStaticUI();
    voiceStatus.textContent = t("voiceHelp");
});

if (LANGUAGES[language]) {
    languageSelect.value = language;
} else {
    language = "en";
    languageSelect.value = "en";
}

translateStaticUI();

resultsSummary.dataset.initial = "true";
resultsSummary.textContent = t("resultsInitial");

showMessage(
    getToken() ? t("initialMessage") : t("noToken"),
    getToken() ? "" : "error"
);

$("#logoutBtn").addEventListener("click", () => {
    sessionStorage.removeItem("access_token");
    window.location.href = "login.html";
});
