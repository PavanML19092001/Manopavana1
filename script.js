// ==========================================================================
// MANOPAVANA - ARTISANAL WOOD-PRESSED OILS (BANGALORE)
// COMPLETE PRODUCTION CLIENT SCRIPT (script.js) - MASTER BUG-FREE BUILD
// ==========================================================================

(function () {
  "use strict";

  // ==========================================
  // 1. CONFIGURATION & CONSTANTS
  // ==========================================
  const R2_PUBLIC_BASE_URL = "https://pub-9e18bb265ecf4224ae1230cf913745ca.r2.dev";
  const WHATSAPP_BUSINESS_NUMBER = "919180301917";
  const FREE_SHIPPING_THRESHOLD = 500;
  const STANDARD_DELIVERY_FEE = 49;
  const REORDER_DISCOUNT_PERCENT = 10;
  const QR_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000; // 30 Days
  const ADMIN_PIN = "1234";

  // Default Bangalore Landmark Center (Vidhana Soudha corridor)
  const DEFAULT_BANGALORE_COORDS = [12.9716, 77.5946];

  // Google Apps Script Web App Deployment URL
  const GOOGLE_SCRIPT_API_URL = "https://script.google.com/macros/s/AKfycbwC-clS4UPY6I7NklbonBBLF_z2rPMzPlF0KwEPFqg37uQByZaI6Vk5vsoQxEfhmyp-/exec";

  // Active Firebase Configuration
  const firebaseConfig = {
    apiKey: "AIzaSyBZ2h7B82XvIR2ffT2E5g9MHp1M7QPO9K4",
    authDomain: "manopavana-d399e.firebaseapp.com",
    projectId: "manopavana-d399e",
    storageBucket: "manopavana-d399e.firebasestorage.app",
    messagingSenderId: "675866391632",
    appId: "1:675866391632:web:a5c160fb7315a5f8788d55",
    measurementId: "G-5G8JTQF8Q2"
  };

  // ==========================================
  // 2. STATE VARIABLES
  // ==========================================
  let authInstance = null;
  let googleAuthProvider = null;
  let firebaseInitialized = false;

  let currentUser = null;
  try {
    currentUser = JSON.parse(localStorage.getItem("manopavana_active_user")) || null;
  } catch (e) {
    currentUser = null;
  }

  let currentAuthMode = "login"; // "login" | "register" | "reset"
  let countdownTimerInterval = null;
  let currentCalculatedGrandTotal = 0;
  let currentOrderRef = "";
  let checkoutSource = "cart";
  let buyNowItem = null;
  let toastTimeoutTimer = null;
  let addressTypingTimer = null;

  // Leaflet Map & Marker Instances
  let leafletMap = null;
  let mapMarker = null;

  let userSelectedPincode = localStorage.getItem("manopavana_user_pincode") || "560058";
  let isBangalorePincode = userSelectedPincode.startsWith("560");

  let activeBottleCode = localStorage.getItem("manopavana_bottle_code") || null;
  let bottleScanTimestampMs = localStorage.getItem("manopavana_bottle_scan_time")
    ? parseInt(localStorage.getItem("manopavana_bottle_scan_time"), 10)
    : null;

  let cart = [];
  try {
    cart = JSON.parse(localStorage.getItem("manopavana_cart")) || [];
  } catch (e) {
    cart = [];
  }

  let localOrdersHistory = [];
  try {
    localOrdersHistory = JSON.parse(localStorage.getItem("manopavana_local_orders")) || [];
  } catch (e) {
    localOrdersHistory = [];
  }

  let reviewsList = [];
  try {
    reviewsList = JSON.parse(localStorage.getItem("manopavana_user_reviews")) || [];
  } catch (e) {
    reviewsList = [];
  }

  let currentSelectedComboKey = "combo-3l";
  let currentDetailProductKey = null;
  let currentDetailSelectedSize = "1L";

  // Upfront Onboarding State
  let onboardingQuizAttemptsLeft = 2;
  let selectedQuizBottleKey = "groundnut";
  let activeQuizData = null;
  let selectedQuizOptionText = null;

  const BOTTLE_QUIZ_POOLS = {
    groundnut: [
      {
        hint: "Look at the front label right below 'GROUNDNUT OIL':",
        question: "What tagline is printed right below 'GROUNDNUT OIL' on the front label?",
        correct: "Perfect for Everyday Indian Cooking"
      }
    ],
    coconut: [
      {
        hint: "Look at the front label right below 'COCONUT OIL':",
        question: "What tagline is printed right below 'COCONUT OIL' on the front label?",
        correct: "Made for Authentic Flavours"
      }
    ],
    sesame: [
      {
        hint: "Look at the front label right below 'SESAME OIL':",
        question: "What tagline is printed right below 'SESAME OIL' on the front label?",
        correct: "The Traditional Choice for Rich Flavour"
      }
    ]
  };

  // ==========================================
  // 3. MASTER CATALOG & SPECIFICATIONS
  // ==========================================
  const createGallery = (prefix, count = 11) =>
    Array.from({ length: count }, (_, i) => `${R2_PUBLIC_BASE_URL}/${prefix}-${i + 1}.png`);

  const PRODUCT_CATALOG = {
    groundnut: {
      id: "groundnut",
      name: "Wood-Pressed Groundnut Oil",
      badgeTheme: "theme-groundnut",
      bgClass: "oil-groundnut",
      img: `${R2_PUBLIC_BASE_URL}/groundnut-1.png`,
      gallery: createGallery("groundnut", 11),
      shortDesc: "Sourced directly from traditional wood-press artisans, settled naturally, and packed hygienically at our Bangalore packaging and distribution facility. Unrefined and unbleached, retaining authentic aroma and high smoke-point performance.",
      features: [
        { icon: "🌾", label: "Aroma", val: "Naturally Nutty" },
        { icon: "🫓", label: "Texture", val: "Light & Non-Sticky" },
        { icon: "🍳", label: "Cooking", val: "Absorbs Less" }
      ],
      specs: {
        "Extraction Method": "Traditional Wooden Marachekku (<45°C)",
        "Processing Type": "Unrefined, Unbleached & Non-Deodorized",
        "FSSAI License": "Reg. No. 21226008004689",
        "Packaging Facility": "Bangalore Packaging & Distribution Facility",
        "Container Type": "Food-Grade Shatterproof Bottle + Drip-Free Spout",
        "Best For": "Daily Curries, Crispy Dosas, Deep Frying, Sautéing",
        "Shelf Life": "9-12 Months (Store in cool, dark place)",
        "Authenticity Standards": "Zero Mineral Oil, No Argemone, No Added Preservatives"
      },
      nutrition: [
        { name: "Energy", val: "862.1 Kcal" },
        { name: "Carbohydrates", val: "0.0 gm" },
        { name: "Total Fat", val: "99.97 gm" },
        { name: "Saturated Fat", val: "86.95 gm" },
        { name: "Mono Unsaturated Fat", val: "6.48 gm" },
        { name: "Poly Unsaturated Fat", val: "1.83 gm" },
        { name: "Trans Fat", val: "0.0 gm" },
        { name: "Cholesterol", val: "0.0 mg" },
        { name: "Protein", val: "0.0 gm" },
        { name: "Total Sugar", val: "0.0 gm" },
        { name: "Dietary Fiber", val: "0.0 gm" },
        { name: "Moisture", val: "0.05 %" },
        { name: "Total Ash", val: "0.05 %" }
      ],
      sizes: {
        "1L": { id: "groundnut-1l", price: 399, badge: "1 Litre", title: "Wood-Pressed Groundnut Oil (1L)" },
        "500ml": { id: "groundnut-500ml", price: 189, badge: "500 ml", title: "Wood-Pressed Groundnut Oil (500ml)" }
      }
    },
    coconut: {
      id: "coconut",
      name: "Wood-Pressed Coconut Oil",
      badgeTheme: "theme-coconut",
      bgClass: "oil-coconut",
      img: `${R2_PUBLIC_BASE_URL}/coconut-1.png`,
      gallery: createGallery("coconut", 11),
      shortDesc: "Sourced directly from traditional wood-press artisans, settled naturally, and packed hygienically at our Bangalore packaging and distribution facility. Extracted from sulfur-free copra with wholesome MCTs.",
      features: [
        { icon: "🥥", label: "Aroma", val: "Fresh Copra Scent" },
        { icon: "✨", label: "Extraction", val: "Slow Wood Chekku" },
        { icon: "🌿", label: "Usage", val: "Edible & Multi-Use" }
      ],
      specs: {
        "Extraction Method": "Traditional Wood Chekku (<40°C)",
        "Processing Type": "Raw, Unrefined & Natural Settling",
        "FSSAI License": "Reg. No. 21226008004689",
        "Packaging Facility": "Bangalore Packaging & Distribution Facility",
        "Container Type": "Food-Grade Shatterproof Bottle + Drip-Free Spout",
        "Best For": "Coastal Curries, Kerala Avial, Vegetable Stew, Hair Care",
        "Shelf Life": "9-12 Months",
        "Authenticity Standards": "Zero Liquid Paraffin, No Added Aromas"
      },
      nutrition: [
        { name: "Energy", val: "862.1 Kcal" },
        { name: "Carbohydrates", val: "0.0 gm" },
        { name: "Total Fat", val: "99.97 gm" },
        { name: "Saturated Fat", val: "86.95 gm" },
        { name: "Mono Unsaturated Fat", val: "6.48 gm" },
        { name: "Poly Unsaturated Fat", val: "1.83 gm" },
        { name: "Trans Fat", val: "0.0 gm" },
        { name: "Cholesterol", val: "0.0 mg" },
        { name: "Protein", val: "0.0 gm" },
        { name: "Total Sugar", val: "0.0 gm" },
        { name: "Dietary Fiber", val: "0.0 gm" },
        { name: "Moisture", val: "0.05 %" },
        { name: "Total Ash", val: "0.05 %" }
      ],
      sizes: {
        "1L": { id: "coconut-1l", price: 499, badge: "1 Litre", title: "Wood-Pressed Coconut Oil (1L)" },
        "500ml": { id: "coconut-500ml", price: 269, badge: "500 ml", title: "Wood-Pressed Coconut Oil (500ml)" }
      }
    },
    sesame: {
      id: "sesame",
      name: "Wood-Pressed Sesame Oil",
      badgeTheme: "theme-sesame",
      bgClass: "oil-sesame",
      img: `${R2_PUBLIC_BASE_URL}/sesame-1.png`,
      gallery: createGallery("sesame", 11),
      shortDesc: "Sourced directly from traditional wood-press artisans, settled naturally, and packed hygienically at our Bangalore packaging and distribution facility. Ground with pure palm jaggery for traditional nutty warmth.",
      features: [
        { icon: "🍯", label: "Aroma", val: "Chekku Scent" },
        { icon: "🪵", label: "Process", val: "Slow Crushed" },
        { icon: "☀", label: "Quality", val: "Unrefined Extraction" }
      ],
      specs: {
        "Extraction Method": "Slow Wooden Press with Palm Jaggery",
        "Processing Type": "Unbleached, Natural Cloth Filtration",
        "FSSAI License": "Reg. No. 21226008004689",
        "Packaging Facility": "Bangalore Packaging & Distribution Facility",
        "Container Type": "Food-Grade Shatterproof Bottle + Drip-Free Spout",
        "Best For": "Authentic Idli Podi, Puliogare, Rasam Tadka, Oil Pulling",
        "Shelf Life": "9-12 Months",
        "Authenticity Standards": "100% Sesame Extract, Zero Synthetic Fragrances"
      },
      nutrition: [
        { name: "Energy", val: "884.3 Kcal" },
        { name: "Carbohydrates", val: "0.0 gm" },
        { name: "Total Fat", val: "99.96 gm" },
        { name: "Saturated Fat", val: "13.9 gm" },
        { name: "Poly Unsaturated Fat", val: "43.35 gm" },
        { name: "Mono Unsaturated Fat", val: "42.11 gm" },
        { name: "Trans Fat", val: "0.0 gm" },
        { name: "Cholesterol", val: "0.0 mg" },
        { name: "Protein", val: "0.0 gm" },
        { name: "Total Sugar", val: "0.0 gm" },
        { name: "Dietary Fiber", val: "0.0 gm" },
        { name: "Moisture", val: "0.07 %" },
        { name: "Total Ash", val: "0.03 %" }
      ],
      sizes: {
        "1L": { id: "sesame-1l", price: 499, badge: "1 Litre", title: "Wood-Pressed Sesame Oil (1L)" },
        "500ml": { id: "sesame-500ml", price: 269, badge: "500 ml", title: "Wood-Pressed Sesame Oil (500ml)" }
      }
    }
  };

  const COMBO_CATALOG = {
    "combo-3l": {
      id: "combo-3l",
      title: "Complete 3-Oil Essential Box (3L Trio)",
      volume: "3 Litres",
      badgeText: "3 x 1 Litre Kitchen Trio",
      headingText: "Complete Kitchen 3-Oil Essential Box (3 Litres)",
      descText: "Equip your kitchen with South India's 3 core traditional wood-pressed oils. Sourced directly from traditional wood-press artisans, settled naturally, and packed hygienically at our Bangalore packaging and distribution facility. Includes 1L Groundnut Oil, 1L Coconut Oil, and 1L Sesame Oil.",
      price: 1299,
      originalPrice: 1397,
      qrPrice: 1169,
      img: `${R2_PUBLIC_BASE_URL}/combo-all-labels.jpg`
    },
    "combo-15l": {
      id: "combo-15l",
      title: "Complete 3-Oil Starter Box (1.5L Trio)",
      volume: "1.5 Litres",
      badgeText: "3 x 500ml Kitchen Trio",
      headingText: "Complete Kitchen 3-Oil Starter Box (1.5 Litres)",
      descText: "Compact kitchen starter box containing 500ml Groundnut Oil, 500ml Coconut Oil, and 500ml Sesame Oil, packed fresh at our Bangalore packaging and distribution facility.",
      price: 699,
      originalPrice: 727,
      qrPrice: 629,
      img: `${R2_PUBLIC_BASE_URL}/combo-all-labels.jpg`
    }
  };

  // Indian States & Districts
  const INDIA_STATES_AND_DISTRICTS = {
    "Karnataka": [
      "Bagalkote", "Ballari", "Belagavi", "Bengaluru Rural", "Bengaluru Urban", "Bidar",
      "Chamarajanagara", "Chikkaballapura", "Chikkamagaluru", "Chitradurga", "Dakshina Kannada",
      "Davanagere", "Dharwad", "Gadag", "Hassan", "Haveri", "Kalaburagi", "Kodagu", "Kolar",
      "Koppal", "Mandya", "Mysuru", "Raichur", "Ramanagara", "Shivamogga", "Tumakuru",
      "Udupi", "Uttara Kannada", "Vijayanagara", "Vijayapura", "Yadgir"
    ],
    "Tamil Nadu": [
      "Ariyalur", "Chengalpattu", "Chennai", "Coimbatore", "Cuddalore", "Dharmapuri",
      "Dindigul", "Erode", "Kallakurichi", "Kanchipuram", "Kanyakumari", "Karur",
      "Krishnagiri", "Madurai", "Mayiladuthurai", "Nagapattinam", "Namakkal", "Nilgiris",
      "Perambalur", "Pudukkottai", "Ramanathapuram", "Ranipet", "Salem", "Sivaganga",
      "Tenkasi", "Thanjavur", "Theni", "Thoothukudi", "Tiruchirappalli", "Tirunelveli",
      "Tirupathur", "Tiruppur", "Tiruvallur", "Tiruvannamalai", "Tiruvarur", "Vellore",
      "Viluppuram", "Virudhunagar"
    ],
    "Kerala": [
      "Alappuzha", "Ernakulam", "Idukki", "Kannur", "Kasaragod", "Kollam",
      "Kottayam", "Kozhikode", "Malappuram", "Palakkad", "Pathanamthitta",
      "Thiruvananthapuram", "Thrissur", "Wayanad"
    ],
    "Andhra Pradesh": [
      "Alluri Sitharama Raju", "Anakapalli", "Ananthapuramu", "Annamayya", "Bapatla",
      "Chittoor", "Dr. B.R. Ambedkar Konaseema", "East Godavari", "Eluru", "Guntur",
      "Kakinada", "Krishna", "Kurnool", "Nandyal", "NTR", "Palnadu",
      "Parvathipuram Manyam", "Prakasam", "Sri Potti Sriramulu Nellore", "Sri Sathya Sai",
      "Srikakulam", "Tirupati", "Visakhapatnam", "Vizianagaram", "West Godavari", "YSR Kadapa"
    ],
    "Telangana": [
      "Adilabad", "Bhadradri Kothagudem", "Hanamkonda", "Hyderabad", "Jagtial",
      "Jangaon", "Jayashankar Bhupalpally", "Jogulamba Gadwal", "Kamareddy", "Karimnagar",
      "Khammam", "Kumuram Bheem Asifabad", "Mahabubabad", "Mahabubnagar", "Mancherial",
      "Medak", "Medchal-Malkajgiri", "Mulugu", "Nagarkurnool", "Nalgonda",
      "Narayanpet", "Nirmal", "Nizamabad", "Peddapalli", "Rajanna Sircilla",
      "Rangareddy", "Sangareddy", "Siddipet", "Suryapet", "Vikarabad",
      "Wanaparthy", "Warangal", "Yadadri Bhuvanagiri"
    ],
    "Maharashtra": [
      "Ahmednagar", "Akola", "Amravati", "Chhatrapati Sambhajinagar", "Beed", "Bhandara",
      "Buldhana", "Chandrapur", "Dhule", "Gadchiroli", "Gondia", "Hingoli",
      "Jalgaon", "Jalna", "Kolhapur", "Latur", "Mumbai City", "Mumbai Suburban",
      "Nagpur", "Nanded", "Nandurbar", "Nashik", "Dharashiv", "Palghar",
      "Parbhani", "Pune", "Raigad", "Ratnagiri", "Sangli", "Satara",
      "Sindhudurg", "Solapur", "Thane", "Wardha", "Washim", "Yavatmal"
    ],
    "Delhi": [
      "Central Delhi", "East Delhi", "New Delhi", "North Delhi", "North East Delhi",
      "North West Delhi", "Shahdara", "South Delhi", "South East Delhi", "South West Delhi", "West Delhi"
    ]
  };

  function populateStatesDropdown() {
    const stateSelect = document.getElementById("custState");
    const districtSelect = document.getElementById("custDistrict");
    if (!stateSelect || !districtSelect) return;

    stateSelect.innerHTML = `<option value="">-- Select State / UT --</option>`;
    Object.keys(INDIA_STATES_AND_DISTRICTS).sort().forEach((stateName) => {
      const opt = document.createElement("option");
      opt.value = stateName;
      opt.textContent = stateName;
      stateSelect.appendChild(opt);
    });

    stateSelect.value = "Karnataka";
    populateDistrictsForState("Karnataka");

    stateSelect.onchange = function (e) {
      populateDistrictsForState(e.target.value);
    };
  }

  function populateDistrictsForState(stateName) {
    const districtSelect = document.getElementById("custDistrict");
    if (!districtSelect) return;

    districtSelect.innerHTML = `<option value="">-- Select District --</option>`;
    if (!stateName || !INDIA_STATES_AND_DISTRICTS[stateName]) return;

    const districts = [...INDIA_STATES_AND_DISTRICTS[stateName]].sort();
    districts.forEach((dist) => {
      const opt = document.createElement("option");
      opt.value = dist;
      opt.textContent = dist;
      districtSelect.appendChild(opt);
    });

    if (stateName === "Karnataka" && districts.includes("Bengaluru Urban")) {
      districtSelect.value = "Bengaluru Urban";
    }
  }

  function escapeHtml(text) {
    if (!text) return "";
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // ==========================================
  // 4. ACTION TOAST ENGINE
  // ==========================================
  window.showActionToast = function (title, message, icon = "✨", type = "info") {
    const toast = document.getElementById("actionToast");
    const titleEl = document.getElementById("actionToastTitle");
    const msgEl = document.getElementById("actionToastMessage");
    const iconEl = document.getElementById("actionToastIcon");

    if (!toast) return;

    if (toastTimeoutTimer) clearTimeout(toastTimeoutTimer);

    toast.className = "action-toast";
    if (type === "success") toast.classList.add("toast-success");
    if (type === "error") toast.classList.add("toast-error");

    if (titleEl) titleEl.textContent = title;
    if (msgEl) msgEl.textContent = message;
    if (iconEl) iconEl.textContent = icon;

    toast.classList.add("show");

    toastTimeoutTimer = setTimeout(() => {
      toast.classList.remove("show");
    }, 4000);
  };

  // ==========================================
  // 5. JSONP BACKEND CALLER
  // ==========================================
  function callBackend(params) {
    return new Promise((resolve, reject) => {
      const callbackName = "jsonp_cb_" + Math.round(100000 * Math.random());
      let script = null;
      let timer = null;

      window[callbackName] = function (data) {
        clearTimeout(timer);
        delete window[callbackName];
        if (script && script.parentNode) script.parentNode.removeChild(script);
        resolve(data);
      };

      const queryString = Object.keys(params)
        .map((k) => encodeURIComponent(k) + "=" + encodeURIComponent(params[k]))
        .join("&");

      script = document.createElement("script");
      script.src = `${GOOGLE_SCRIPT_API_URL}?${queryString}&callback=${callbackName}`;

      script.onerror = function () {
        clearTimeout(timer);
        delete window[callbackName];
        if (script && script.parentNode) script.parentNode.removeChild(script);
        reject(new Error("Unable to connect to Google Sheets backend. Verify deployment URL."));
      };

      timer = setTimeout(function () {
        delete window[callbackName];
        if (script && script.parentNode) script.parentNode.removeChild(script);
        reject(new Error("Server response timed out. Action cached locally."));
      }, 15000);

      document.body.appendChild(script);
    });
  }

  // ==========================================
  // 6. FIREBASE AUTH
  // ==========================================
  function initFirebaseAuth() {
    try {
      if (window.firebase && window.firebase.auth) {
        if (!firebase.apps.length) {
          firebase.initializeApp(firebaseConfig);
        }
        authInstance = firebase.auth();
        googleAuthProvider = new firebase.auth.GoogleAuthProvider();
        firebaseInitialized = true;

        authInstance.onAuthStateChanged((user) => {
          if (user) {
            currentUser = {
              uid: user.uid,
              email: user.email,
              displayName: user.displayName || user.email.split("@")[0]
            };
            localStorage.setItem("manopavana_active_user", JSON.stringify(currentUser));
          } else {
            currentUser = null;
            localStorage.removeItem("manopavana_active_user");
          }
          updateAuthUI();
        });
      }
    } catch (err) {
      console.error("Firebase init error:", err);
    }
    updateAuthUI();
  }

  function updateAuthUI() {
    const authPillLabel = document.getElementById("authPillLabel");
    const authUserMeta = document.getElementById("authUserMeta");
    const custNameInput = document.getElementById("custName");

    if (currentUser) {
      const name = currentUser.displayName || currentUser.email.split("@")[0];
      if (authPillLabel) authPillLabel.textContent = "👤 " + name;
      if (authUserMeta) authUserMeta.textContent = currentUser.email;
      if (custNameInput && !custNameInput.value && currentUser.displayName) {
        custNameInput.value = currentUser.displayName;
      }
    } else {
      if (authPillLabel) authPillLabel.textContent = "👤 Login / Register";
      if (authUserMeta) authUserMeta.textContent = "Not Logged In";
    }
  }

  window.handleAuthPillClick = function () {
    const dropdown = document.getElementById("authDropdownMenu");
    if (currentUser) {
      if (dropdown) dropdown.classList.toggle("open");
    } else {
      window.openAuthModal("login");
    }
  };

  window.openAuthModal = function (mode = "login") {
    window.toggleAuthMode(mode);
    const modal = document.getElementById("authModalBackdrop");
    if (modal) {
      modal.classList.add("open");
      document.body.classList.add("modal-open");
    }
  };

  window.closeAuthModal = function () {
    const modal = document.getElementById("authModalBackdrop");
    if (modal) {
      modal.classList.remove("open");
      document.body.classList.remove("modal-open");
    }
  };

  window.toggleAuthMode = function (mode) {
    currentAuthMode = mode;
    const title = document.getElementById("authModalTitle");
    const submitBtn = document.getElementById("btnAuthSubmit");
    const toggleLabel = document.getElementById("authToggleLabel");
    const toggleLink = document.getElementById("authToggleLink");
    const passGroup = document.getElementById("authPasswordGroup");
    const errBox = document.getElementById("authErrorMsg");
    const successBox = document.getElementById("authSuccessMsg");

    if (errBox) errBox.style.display = "none";
    if (successBox) successBox.style.display = "none";
    if (submitBtn) submitBtn.disabled = false;

    if (mode === "login") {
      if (title) title.textContent = "Sign In to MANOPAVANA";
      if (submitBtn) submitBtn.textContent = "Sign In";
      if (toggleLabel) toggleLabel.textContent = "Don't have an account?";
      if (toggleLink) {
        toggleLink.textContent = "Create Account";
        toggleLink.setAttribute("onclick", "toggleAuthMode('register')");
      }
      if (passGroup) passGroup.style.display = "block";
    } else if (mode === "register") {
      if (title) title.textContent = "Create Your Account";
      if (submitBtn) submitBtn.textContent = "Register Account";
      if (toggleLabel) toggleLabel.textContent = "Already have an account?";
      if (toggleLink) {
        toggleLink.textContent = "Sign In";
        toggleLink.setAttribute("onclick", "toggleAuthMode('login')");
      }
      if (passGroup) passGroup.style.display = "block";
    } else if (mode === "reset") {
      if (title) title.textContent = "Reset Your Password";
      if (submitBtn) submitBtn.textContent = "Send Reset Link";
      if (toggleLabel) toggleLabel.textContent = "Remembered password?";
      if (toggleLink) {
        toggleLink.textContent = "Back to Sign In";
        toggleLink.setAttribute("onclick", "toggleAuthMode('login')");
      }
      if (passGroup) passGroup.style.display = "none";
    }
  };

  window.handleEmailAuthSubmit = async function (e) {
    if (e && e.preventDefault) e.preventDefault();

    const email = document.getElementById("authEmail")?.value.trim();
    const password = document.getElementById("authPassword")?.value;
    const errBox = document.getElementById("authErrorMsg");
    const successBox = document.getElementById("authSuccessMsg");
    const submitBtn = document.getElementById("btnAuthSubmit");

    if (errBox) errBox.style.display = "none";
    if (successBox) successBox.style.display = "none";

    if (!email) {
      if (errBox) {
        errBox.textContent = "Please enter a valid email address.";
        errBox.style.display = "block";
      }
      return;
    }

    if (currentAuthMode === "reset") {
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Sending...";
      }
      try {
        if (!firebaseInitialized) throw new Error("Authentication service connecting. Please try again.");
        await authInstance.sendPasswordResetEmail(email);
        if (successBox) {
          successBox.textContent = "Password reset instructions sent! Please check your Inbox and Spam.";
          successBox.style.display = "block";
        }
      } catch (err) {
        if (errBox) {
          errBox.textContent = err.message || "Failed to send reset email.";
          errBox.style.display = "block";
        }
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = "Send Reset Link";
        }
      }
      return;
    }

    if (!firebaseInitialized) {
      if (errBox) {
        errBox.textContent = "Authentication service connecting. Please try again in a moment.";
        errBox.style.display = "block";
      }
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Processing...";
    }

    try {
      if (currentAuthMode === "login") {
        if (!password) throw new Error("Password is required to sign in.");
        const userCred = await authInstance.signInWithEmailAndPassword(email, password);
        const name = userCred.user.displayName || userCred.user.email.split("@")[0];
        window.closeAuthModal();
        window.showActionToast("Sign In Successful", `🎉 Welcome back, ${name}!`, "🎉", "success");
      } else if (currentAuthMode === "register") {
        if (!password || password.length < 6) throw new Error("Password must be at least 6 characters.");
        const userCred = await authInstance.createUserWithEmailAndPassword(email, password);
        const name = userCred.user.displayName || userCred.user.email.split("@")[0];
        window.closeAuthModal();
        window.showActionToast("Account Created", `🎉 Welcome to MANOPAVANA, ${name}!`, "🎉", "success");
      }
    } catch (err) {
      if (errBox) {
        errBox.textContent = err.message || "Authentication error.";
        errBox.style.display = "block";
      }
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = currentAuthMode === "login" ? "Sign In" : "Register Account";
      }
    }
  };

  window.handleGoogleSignIn = async function () {
    const errBox = document.getElementById("authErrorMsg");
    if (!firebaseInitialized) {
      alert("Authentication service connecting. Please try again in a moment.");
      return;
    }
    try {
      const result = await authInstance.signInWithPopup(googleAuthProvider);
      const name = result.user.displayName || result.user.email.split("@")[0];
      window.closeAuthModal();
      window.showActionToast("Sign In Successful", `🎉 Welcome back, ${name}!`, "🎉", "success");
    } catch (err) {
      if (errBox) {
        errBox.textContent = err.message || "Google Sign-In failed.";
        errBox.style.display = "block";
      }
    }
  };

  window.handleSignOut = async function () {
    const dropdown = document.getElementById("authDropdownMenu");
    if (dropdown) dropdown.classList.remove("open");
    if (authInstance) {
      try { await authInstance.signOut(); } catch (e) {}
    }
    currentUser = null;
    localStorage.removeItem("manopavana_active_user");
    updateAuthUI();
    window.showActionToast("Signed Out", "👋 You have logged out successfully.", "👋", "info");
  };

  document.addEventListener("click", (e) => {
    const dropdown = document.getElementById("authDropdownMenu");
    const container = document.getElementById("authPillContainer");
    if (dropdown && container && !container.contains(e.target)) {
      dropdown.classList.remove("open");
    }
  });

  // ==========================================
  // 7. ORDER TRACKING & AUTO HISTORY
  // ==========================================
  window.openOrderTrackingModal = function (forceAccountTab = false) {
    const modal = document.getElementById("trackOrderModalBackdrop");
    if (!modal) return;
    modal.classList.add("open");
    document.body.classList.add("modal-open");
    if (currentUser || forceAccountTab) {
      window.switchTrackingTab("account");
    } else {
      window.switchTrackingTab("manual");
    }
  };

  window.closeOrderTrackingModal = function () {
    const modal = document.getElementById("trackOrderModalBackdrop");
    if (modal) {
      modal.classList.remove("open");
      document.body.classList.remove("modal-open");
    }
  };

  window.switchTrackingTab = function (tabType) {
    const accountView = document.getElementById("accountOrdersView");
    const manualView = document.getElementById("manualTrackingView");
    const tabAccount = document.getElementById("tabMyOrders");
    const tabManual = document.getElementById("tabManualTrack");

    if (tabType === "account") {
      if (!currentUser) {
        window.openAuthModal("login");
        window.showActionToast("Sign In Required", "Please sign in to view your account order history.", "👤", "info");
        return;
      }
      if (accountView) accountView.style.display = "block";
      if (manualView) manualView.style.display = "none";
      if (tabAccount) { tabAccount.style.background = "#eab308"; tabAccount.style.color = "#0c0a09"; }
      if (tabManual) { tabManual.style.background = "transparent"; tabManual.style.color = "#d6d3d1"; }
      fetchUserOrderHistory();
    } else {
      if (accountView) accountView.style.display = "none";
      if (manualView) manualView.style.display = "block";
      if (tabManual) { tabManual.style.background = "#eab308"; tabManual.style.color = "#0c0a09"; }
      if (tabAccount) { tabAccount.style.background = "transparent"; tabAccount.style.color = "#d6d3d1"; }
    }
  };

  function fetchUserOrderHistory() {
    const loading = document.getElementById("accountOrdersLoading");
    const list = document.getElementById("accountOrdersList");

    if (loading) {
      loading.style.display = "block";
      loading.textContent = "🔍 Fetching your orders from our Bangalore facility...";
    }
    if (list) list.style.display = "none";

    callBackend({
      action: "track_orders",
      firebaseUid: currentUser.uid,
      email: currentUser.email || ""
    }).then((res) => {
      if (loading) loading.style.display = "none";
      if (!list) return;

      let combinedOrders = [];
      if (res.status === "FOUND" && res.orders && res.orders.length > 0) {
        combinedOrders = res.orders;
      } else {
        combinedOrders = localOrdersHistory.filter(o => o.firebaseUid === currentUser.uid || (currentUser.email && o.email === currentUser.email));
      }

      if (combinedOrders.length > 0) {
        list.innerHTML = renderOrdersTimelineList(combinedOrders);
        list.style.display = "block";
      } else {
        list.innerHTML = `
          <div style="text-align:center; padding:2rem; color:#a8a29e;">
            <p>No past orders found under this account.</p>
          </div>
        `;
        list.style.display = "block";
      }
    }).catch(() => {
      if (loading) loading.style.display = "none";
      if (list) {
        const localMatches = localOrdersHistory.filter(o => o.firebaseUid === currentUser.uid || (currentUser.email && o.email === currentUser.email));
        if (localMatches.length > 0) {
          list.innerHTML = renderOrdersTimelineList(localMatches);
          list.style.display = "block";
        } else {
          list.innerHTML = `<div style="color:#ef4444; padding:1rem; text-align:center;">Unable to load order history from server.</div>`;
          list.style.display = "block";
        }
      }
    });
  }

  function renderOrdersTimelineList(orders) {
    return orders.map((order) => {
      const st = (order.orderStatus || "").toLowerCase();
      const isStep1 = true;
      const isStep2 = st.includes("pack") || st.includes("process") || st.includes("settl") || st.includes("dispatch") || st.includes("deliver");
      const isStep3 = st.includes("dispatch") || st.includes("transit") || st.includes("out") || st.includes("deliver");
      const isStep4 = st.includes("deliver");

      return `
        <div class="history-order-card">
          <div class="history-card-header">
            <div>
              <strong>Order #${escapeHtml(order.orderRef)}</strong>
              <small style="color:#a8a29e; display:block;">${escapeHtml(order.timestamp || "Recent")} • ₹${escapeHtml(order.grandTotal)}</small>
            </div>
            <span class="track-status-pill">${escapeHtml(order.orderStatus || "Placed")}</span>
          </div>

          <div class="history-card-items">
            <strong>Items:</strong> ${escapeHtml(order.items)}
          </div>

          <div class="track-timeline-progress">
            <div class="track-step-node node-step ${isStep1 ? 'active' : ''}">
              <span class="node-dot ${isStep1 ? 'active' : ''}">✓</span>
              <span class="node-lbl">Placed</span>
            </div>
            <div class="track-step-node node-step ${isStep2 ? 'active' : ''}">
              <span class="node-dot ${isStep2 ? 'active' : ''}">⚙</span>
              <span class="node-lbl">Packed &amp; Sealed</span>
            </div>
            <div class="track-step-node node-step ${isStep3 ? 'active' : ''}">
              <span class="node-dot ${isStep3 ? 'active' : ''}">🚚</span>
              <span class="node-lbl">Dispatched</span>
            </div>
            <div class="track-step-node node-step ${isStep4 ? 'active' : ''}">
              <span class="node-dot ${isStep4 ? 'active' : ''}">🏡</span>
              <span class="node-lbl">Delivered</span>
            </div>
          </div>

          <div class="history-card-footer">
            <span style="color:#eab308; font-weight:600;">Facility Status:</span>
            <span style="color:#d6d3d1;">${escapeHtml(order.trackingNotes || "Sourced directly from traditional wood-press artisans, settled naturally, and packed hygienically at our Bangalore packaging and distribution facility.")}</span>
          </div>
        </div>
      `;
    }).join("");
  }

  window.submitOrderTrackingQuery = function () {
    const refInput = document.getElementById("trackOrderRefInput");
    const phoneInput = document.getElementById("trackPhoneInput");
    const resultBox = document.getElementById("trackStatusResultBox");
    const btn = document.getElementById("btnSubmitTrack");

    const orderRef = refInput ? refInput.value.trim() : "";
    const phone = phoneInput ? phoneInput.value.trim() : "";

    if (!orderRef && !phone) {
      alert("Please enter either your Order Reference ID or 10-digit mobile number.");
      return;
    }

    if (btn) {
      btn.disabled = true;
      btn.textContent = "Checking Facility Records...";
    }
    if (resultBox) resultBox.style.display = "none";

    callBackend({
      action: "track_orders",
      orderRef: orderRef,
      phone: phone
    }).then((res) => {
      if (btn) {
        btn.disabled = false;
        btn.textContent = "Fetch Live Status 🔍";
      }
      if (!resultBox) return;

      if (res.status === "FOUND" && res.orders && res.orders.length > 0) {
        resultBox.innerHTML = renderOrdersTimelineList(res.orders);
        resultBox.style.display = "block";
      } else {
        const localMatches = localOrdersHistory.filter(o => (orderRef && o.orderRef === orderRef) || (phone && o.phone === phone));
        if (localMatches.length > 0) {
          resultBox.innerHTML = renderOrdersTimelineList(localMatches);
          resultBox.style.display = "block";
        } else {
          resultBox.innerHTML = `<span style="color:#ef4444;">❌ No matching orders found. Please verify your details.</span>`;
          resultBox.style.display = "block";
        }
      }
    }).catch((err) => {
      if (btn) {
        btn.disabled = false;
        btn.textContent = "Fetch Live Status 🔍";
      }
      if (resultBox) {
        const localMatches = localOrdersHistory.filter(o => (orderRef && o.orderRef === orderRef) || (phone && o.phone === phone));
        if (localMatches.length > 0) {
          resultBox.innerHTML = renderOrdersTimelineList(localMatches);
          resultBox.style.display = "block";
        } else {
          resultBox.innerHTML = `<span style="color:#ef4444;">Error checking orders: ${err.message}</span>`;
          resultBox.style.display = "block";
        }
      }
    });
  };

  // ==========================================
  // 8. UPFRONT 2-STEP ONBOARDING
  // ==========================================
  window.openOnboardingModal = function (step = 1) {
    const modal = document.getElementById("onboardingModalBackdrop");
    if (!modal) return;
    onboardingQuizAttemptsLeft = 2; // Always reset chances
    modal.classList.add("open");
    document.body.classList.add("modal-open");
    window.goToOnboardingStep(step);
  };

  window.closeOnboardingModal = function () {
    const modal = document.getElementById("onboardingModalBackdrop");
    if (modal) {
      modal.classList.remove("open");
      document.body.classList.remove("modal-open");
    }
    localStorage.setItem("manopavana_onboarding_completed", "true");
  };

  window.goToOnboardingStep = function (stepNumber) {
    const s1 = document.getElementById("onboardingStep1");
    const s2 = document.getElementById("onboardingStep2");
    const title = document.getElementById("onboardingModalTitle");

    if (stepNumber === 1) {
      if (s1) s1.style.display = "flex";
      if (s2) s2.style.display = "none";
      if (title) title.innerHTML = "🏷️ Scanned our Bottle?";
      window.selectOnboardingQuizBottle(selectedQuizBottleKey);
    } else {
      if (s1) s1.style.display = "none";
      if (s2) s2.style.display = "flex";
      if (title) title.innerHTML = "📍 Where should we deliver?";
      const pinInput = document.getElementById("onboardPincodeInput");
      if (pinInput) {
        pinInput.value = userSelectedPincode || "";
        pinInput.focus();
      }
    }
  };

  window.selectOnboardingQuizBottle = function (bottleKey) {
    selectedQuizBottleKey = bottleKey;
    selectedQuizOptionText = null;

    ["groundnut", "coconut", "sesame"].forEach((k) => {
      const pill = document.getElementById("onboardPill" + k.charAt(0).toUpperCase() + k.slice(1));
      if (pill) {
        pill.classList.toggle("active", k === bottleKey);
      }
    });

    const quizData = BOTTLE_QUIZ_POOLS[bottleKey][0];
    const hintText = document.getElementById("onboardQuizHintText");
    const qTitle = document.getElementById("onboardQuizQuestionText");
    const optionsContainer = document.getElementById("onboardQuizOptionsContainer");
    const feedbackBox = document.getElementById("onboardQuizFeedbackBox");

    if (hintText) hintText.textContent = quizData.hint;
    if (qTitle) qTitle.textContent = quizData.question;
    if (feedbackBox) feedbackBox.style.display = "none";

    const distractors = [
      "Extracted using industrial chemical solvents",
      "Refined, bleached, and chemically deodorized",
      "Blended with synthetic liquid paraffin wax",
      "Processed with artificial preservatives and dyes"
    ];

    const options = [
      { text: quizData.correct, correct: true },
      { text: distractors[0], correct: false },
      { text: distractors[1], correct: false },
      { text: distractors[2], correct: false },
      { text: distractors[3], correct: false }
    ].sort(() => Math.random() - 0.5);

    activeQuizData = {
      correct: quizData.correct,
      options: options
    };

    if (optionsContainer) {
      optionsContainer.innerHTML = options.map((opt, i) => `
        <label class="quiz-option-card" id="quizOptCard_${i}" onclick="window.chooseOnboardingQuizOption('${escapeHtml(opt.text)}', ${i})">
          <input type="radio" name="bottleQuizRadio" value="${escapeHtml(opt.text)}" />
          <span>${escapeHtml(opt.text)}</span>
        </label>
      `).join("");
    }
  };

  window.chooseOnboardingQuizOption = function (text, idx) {
    selectedQuizOptionText = text;
    document.querySelectorAll(".quiz-option-card").forEach((card, i) => {
      card.classList.toggle("selected", i === idx);
      const radio = card.querySelector("input[type='radio']");
      if (radio) radio.checked = i === idx;
    });
  };

  window.submitOnboardingBottleQuiz = function () {
    const feedbackBox = document.getElementById("onboardQuizFeedbackBox");
    const attemptBadge = document.getElementById("onboardAttemptBadge");

    if (!selectedQuizOptionText) {
      alert("Please select one option printed on your bottle label.");
      return;
    }

    if (selectedQuizOptionText === activeQuizData.correct) {
      activeBottleCode = `VERIFIED_${selectedQuizBottleKey.toUpperCase()}_BOTTLE`;
      bottleScanTimestampMs = Date.now();
      localStorage.setItem("manopavana_bottle_code", activeBottleCode);
      localStorage.setItem("manopavana_bottle_scan_time", bottleScanTimestampMs.toString());

      if (feedbackBox) {
        feedbackBox.className = "quiz-feedback-box success";
        feedbackBox.innerHTML = "✅ <strong>Label verified!</strong> 10% Loyalty Discount unlocked across all orders for 30 days!";
        feedbackBox.style.display = "block";
      }

      renderCart();
      startLiveCountdown();
      renderComboSection();
      window.showActionToast("Discount Activated", "🎉 10% Bottle Reorder Discount is active!", "✨", "success");

      setTimeout(() => {
        window.goToOnboardingStep(2);
      }, 1200);
    } else {
      onboardingQuizAttemptsLeft--;
      if (attemptBadge) {
        attemptBadge.textContent = `⚠️ ${onboardingQuizAttemptsLeft} chance${onboardingQuizAttemptsLeft === 1 ? '' : 's'} left to claim 10% OFF`;
        if (onboardingQuizAttemptsLeft === 1) attemptBadge.className = "attempt-badge danger";
      }

      if (feedbackBox) {
        feedbackBox.className = "quiz-feedback-box error";
        feedbackBox.innerHTML = `❌ Option does not match your bottle label.`;
        feedbackBox.style.display = "block";
      }

      if (onboardingQuizAttemptsLeft <= 0) {
        alert("Attempts exhausted. You can continue shopping directly!");
        window.goToOnboardingStep(2);
      }
    }
  };

  window.submitOnboardingPincodeCheck = function () {
    const pinInput = document.getElementById("onboardPincodeInput");
    const resBox = document.getElementById("onboardPincodeResultBox");
    if (!pinInput) return;

    const enteredPin = pinInput.value.trim();
    if (!/^\d{6}$/.test(enteredPin)) {
      if (resBox) {
        resBox.className = "pincode-result-box warning";
        resBox.innerHTML = "Please enter a valid 6-digit Indian delivery pincode.";
        resBox.style.display = "block";
      }
      return;
    }

    userSelectedPincode = enteredPin;
    isBangalorePincode = enteredPin.startsWith("560");
    localStorage.setItem("manopavana_user_pincode", enteredPin);
    updateLocationUI();

    if (isBangalorePincode) {
      if (resBox) {
        resBox.className = "pincode-result-box success";
        resBox.innerHTML = `<strong>✅ Delivering to Bangalore (${enteredPin})</strong>Direct doorstep delivery in 48–72 hours! Free delivery on ₹500+ orders.`;
        resBox.style.display = "block";
      }
      setTimeout(window.closeOnboardingModal, 1200);
    } else {
      if (resBox) {
        resBox.className = "pincode-result-box warning";
        resBox.innerHTML = `<strong>📍 Outside Bangalore (${enteredPin})</strong>Direct doorstep delivery from our facility is exclusive to Bangalore (560xxx). Orders for your location are fulfilled securely via our <strong>Official Flipkart Store</strong>.<br><br>
        <a href="https://www.flipkart.com" target="_blank" rel="noopener noreferrer" class="btn-continue-flipkart" style="display:inline-flex; width:auto; padding:0.6rem 1.2rem;">
          🛒 Shop on Flipkart &rarr;
        </a>`;
        resBox.style.display = "block";
      }
      setTimeout(window.closeOnboardingModal, 3000);
    }
  };

  function checkAndTriggerUpfrontOnboarding() {
    const completed = localStorage.getItem("manopavana_onboarding_completed");
    if (completed !== "true") {
      window.openOnboardingModal(1);
    }
  }

  // ==========================================
  // 9. LOCATION & PINCODE CHECKER MODAL
  // ==========================================
  window.openLocationCheckModal = function () {
    const modal = document.getElementById("locationModalBackdrop");
    const pinInput = document.getElementById("pincodeCheckInput");
    const resultBox = document.getElementById("pincodeCheckResultBox");
    if (!modal) return;

    if (pinInput) pinInput.value = userSelectedPincode;
    if (resultBox) resultBox.style.display = "none";
    modal.classList.add("open");
    document.body.classList.add("modal-open");
  };

  window.closeLocationCheckModal = function () {
    const modal = document.getElementById("locationModalBackdrop");
    if (modal) {
      modal.classList.remove("open");
      document.body.classList.remove("modal-open");
    }
  };

  window.submitPincodeCheck = function () {
    const pinInput = document.getElementById("pincodeCheckInput");
    const resultBox = document.getElementById("pincodeCheckResultBox");
    if (!pinInput || !resultBox) return;

    const enteredPin = pinInput.value.trim();
    if (!/^\d{6}$/.test(enteredPin)) {
      resultBox.className = "pincode-result-box warning";
      resultBox.innerHTML = `<strong>Invalid Pincode</strong>Please enter a valid 6-digit Indian pincode.`;
      resultBox.style.display = "block";
      return;
    }

    userSelectedPincode = enteredPin;
    isBangalorePincode = enteredPin.startsWith("560");
    localStorage.setItem("manopavana_user_pincode", enteredPin);
    updateLocationUI();

    if (isBangalorePincode) {
      resultBox.className = "pincode-result-box success";
      resultBox.innerHTML = `<strong>✅ Delivering to Bangalore (${enteredPin})</strong>Direct doorstep delivery in 48–72 hours from our packaging facility. Free on ₹500+ orders.`;
      resultBox.style.display = "block";
      setTimeout(window.closeLocationCheckModal, 1300);
    } else {
      resultBox.className = "pincode-result-box warning";
      resultBox.innerHTML = `<strong>📍 Outside Bangalore (${enteredPin})</strong>Direct doorstep delivery is exclusive to Bangalore (560xxx). Orders for your location are fulfilled securely via our <strong>Official Flipkart Store</strong>.<br><br>
      <a href="https://www.flipkart.com" target="_blank" rel="noopener noreferrer" class="btn-continue-flipkart" style="display:inline-flex; width:auto; padding:0.6rem 1.2rem; margin-top:0.5rem;">
        🛒 Shop on Flipkart &rarr;
      </a>`;
      resultBox.style.display = "block";
    }
  };

  function updateLocationUI() {
    const headerLoc = document.getElementById("headerLocationLabel");
    const cartLoc = document.getElementById("cartDrawerLocLabel");
    const custPin = document.getElementById("custPincode");

    if (custPin) custPin.value = userSelectedPincode;

    if (isBangalorePincode) {
      if (headerLoc) headerLoc.innerHTML = `Deliver to: <strong>Bangalore (${userSelectedPincode})</strong>`;
      if (cartLoc) cartLoc.textContent = `Bangalore (${userSelectedPincode})`;
    } else {
      if (headerLoc) headerLoc.innerHTML = `Deliver to: <strong>${userSelectedPincode} (Flipkart)</strong>`;
      if (cartLoc) cartLoc.textContent = `${userSelectedPincode} (Flipkart)`;
    }

    renderProductsGrid();
    renderComboSection();
  }

  window.openFlipkartModal = function () {
    const modal = document.getElementById("flipkartModalBackdrop");
    if (modal) {
      modal.classList.add("open");
      document.body.classList.add("modal-open");
    }
  };

  window.closeFlipkartModal = function () {
    const modal = document.getElementById("flipkartModalBackdrop");
    if (modal) {
      modal.classList.remove("open");
      document.body.classList.remove("modal-open");
    }
  };

  // ==========================================
  // 10. AUDIO ENGINE & AUTOPLAY (MOBILE SAFE)
  // ==========================================
  let isAudioPlaying = false;
  let hasInteracted = false;

  function tryImmediateAudioPlayback() {
    const audio = document.getElementById("heroBgAudio");
    const btn = document.getElementById("soundToggleBtn");
    const icon = document.getElementById("soundIcon");
    const text = document.getElementById("soundText");
    if (!audio) return;

    audio.volume = 1.0;
    const playPromise = audio.play();

    if (playPromise !== undefined) {
      playPromise.then(() => {
        isAudioPlaying = true;
        if (icon) icon.textContent = "🔊";
        if (text) text.textContent = "Sound On";
        btn?.classList.add("playing");
      }).catch(() => {
        isAudioPlaying = false;
        if (icon) icon.textContent = "🔇";
        if (text) text.textContent = "Tap for Sound";
        btn?.classList.remove("playing");
      });
    }
  }

  function toggleAudio() {
    const audio = document.getElementById("heroBgAudio");
    const btn = document.getElementById("soundToggleBtn");
    const icon = document.getElementById("soundIcon");
    const text = document.getElementById("soundText");
    if (!audio) return;

    if (isAudioPlaying) {
      audio.pause();
      isAudioPlaying = false;
      if (icon) icon.textContent = "🔇";
      if (text) text.textContent = "Sound Off";
      btn?.classList.remove("playing");
    } else {
      audio.play().then(() => {
        isAudioPlaying = true;
        if (icon) icon.textContent = "🔊";
        if (text) text.textContent = "Sound On";
        btn?.classList.add("playing");
      }).catch(() => {});
    }
  }

  function initVideoAutoplay() {
    const video = document.getElementById("heroVideo");
    const fallback = document.getElementById("heroFallbackImage");
    if (!video) return;

    video.muted = true;
    video.loop = true;
    video.playsInline = true;

    video.play().catch(() => {
      if (fallback) {
        video.style.display = "none";
        fallback.style.display = "block";
      }
    });
  }

  // ==========================================
  // 11. MAP INTEGRATION & ADDRESS PINNING
  // ==========================================
  function initOrUpdateDeliveryMap(lat = DEFAULT_BANGALORE_COORDS[0], lng = DEFAULT_BANGALORE_COORDS[1]) {
    const mapElement = document.getElementById("deliveryMap");
    if (!mapElement || typeof L === "undefined") return;

    if (!leafletMap) {
      leafletMap = L.map("deliveryMap", {
        center: [lat, lng],
        zoom: 14,
        zoomControl: true,
        scrollWheelZoom: false
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; OpenStreetMap',
        maxZoom: 19
      }).addTo(leafletMap);

      mapMarker = L.marker([lat, lng], { draggable: true }).addTo(leafletMap);

      mapMarker.on("dragend", function (e) {
        const position = e.target.getLatLng();
        setMapCoordinates(position.lat, position.lng);
      });

      leafletMap.on("click", function (e) {
        mapMarker.setLatLng(e.latlng);
        setMapCoordinates(e.latlng.lat, e.latlng.lng);
      });
    } else {
      leafletMap.setView([lat, lng], 14);
      if (mapMarker) mapMarker.setLatLng([lat, lng]);
    }

    setMapCoordinates(lat, lng);
    setTimeout(() => {
      if (leafletMap) leafletMap.invalidateSize();
    }, 250);
  }

  function setMapCoordinates(lat, lng) {
    const latInput = document.getElementById("custLatitude");
    const lngInput = document.getElementById("custLongitude");
    const coordsBadge = document.getElementById("mapCoordsBadge");

    const roundLat = parseFloat(lat).toFixed(5);
    const roundLng = parseFloat(lng).toFixed(5);

    if (latInput) latInput.value = roundLat;
    if (lngInput) lngInput.value = roundLng;
    if (coordsBadge) coordsBadge.textContent = `GPS: ${roundLat}, ${roundLng}`;
  }

  window.detectUserGeolocation = function () {
    const btn = document.querySelector(".btn-gps-locate");
    const origText = btn ? btn.innerHTML : "";

    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your current browser.");
      return;
    }

    if (btn) btn.innerHTML = "⏳ Locating...";

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        initOrUpdateDeliveryMap(lat, lng);
        reverseGeocodeOpenStreetMap(lat, lng);

        if (btn) btn.innerHTML = "✅ Located!";
        setTimeout(() => { if (btn) btn.innerHTML = origText; }, 2000);
      },
      () => {
        alert("Could not retrieve exact location. Please drag the marker pin manually to your gate or building.");
        if (btn) btn.innerHTML = origText;
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  };

  function reverseGeocodeOpenStreetMap(lat, lng) {
    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
      .then((res) => res.json())
      .then((data) => {
        if (!data || !data.address) return;
        const addr = data.address;
        const pin = addr.postcode || "";
        const city = addr.city || addr.town || addr.suburb || addr.neighbourhood || "Bengaluru";

        const custCity = document.getElementById("custCity");
        const custPin = document.getElementById("custPincode");
        const custAddress = document.getElementById("custAddress");

        if (custCity && !custCity.value) custCity.value = city;
        if (custPin && pin && /^\d{6}$/.test(pin)) {
          custPin.value = pin;
          userSelectedPincode = pin;
          isBangalorePincode = pin.startsWith("560");
          updateLocationUI();
        }

        if (custAddress && !custAddress.value && data.display_name) {
          custAddress.value = data.display_name.split(",").slice(0, 3).join(",").trim();
        }
      })
      .catch((e) => console.warn("Reverse geocode notice:", e));
  }

  window.handleAddressForwardGeocode = function (query) {
    if (addressTypingTimer) clearTimeout(addressTypingTimer);
    if (!query || query.trim().length < 5) return;

    addressTypingTimer = setTimeout(() => {
      const searchCity = document.getElementById("custCity")?.value || "Bengaluru";
      const fullQuery = `${query.trim()}, ${searchCity}, Karnataka, India`;

      fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fullQuery)}&limit=1`)
        .then(res => res.json())
        .then(results => {
          if (results && results.length > 0) {
            const lat = parseFloat(results[0].lat);
            const lon = parseFloat(results[0].lon);
            initOrUpdateDeliveryMap(lat, lon);
          }
        })
        .catch(err => console.warn("Forward geocode notice:", err));
    }, 800);
  };

  // ==========================================
  // 12. SAVED ADDRESS RESTORATION
  // ==========================================
  function loadSavedDeliveryDetails() {
    let saved = null;
    try {
      saved = JSON.parse(localStorage.getItem("manopavana_saved_delivery"));
    } catch (e) {
      saved = null;
    }

    const summaryCard = document.getElementById("savedAddressSummaryCard");
    const fieldsContainer = document.getElementById("deliveryFieldsContainer");

    if (saved && saved.name && saved.phone && saved.address) {
      const custName = document.getElementById("custName");
      const custPhone = document.getElementById("custPhone");
      const custAddress = document.getElementById("custAddress");
      const custState = document.getElementById("custState");
      const custDistrict = document.getElementById("custDistrict");
      const custCity = document.getElementById("custCity");
      const custPincode = document.getElementById("custPincode");

      if (custName) custName.value = saved.name;
      if (custPhone) custPhone.value = saved.phone;
      if (custAddress) custAddress.value = saved.address;
      if (custCity) custCity.value = saved.city || "Bengaluru";
      if (custPincode) custPincode.value = saved.pincode || "560058";

      if (custState && saved.state) {
        custState.value = saved.state;
        populateDistrictsForState(saved.state);
      }
      if (custDistrict && saved.district) {
        custDistrict.value = saved.district;
      }

      const addrName = document.getElementById("savedAddrName");
      const addrText = document.getElementById("savedAddrText");
      const addrPhone = document.getElementById("savedAddrPhone");
      const gpsNotice = document.getElementById("savedAddrGpsNotice");

      if (addrName) addrName.textContent = saved.name;
      if (addrText) addrText.textContent = `${saved.address}, ${saved.city || "Bengaluru"} - ${saved.pincode || "560058"}`;
      if (addrPhone) addrPhone.textContent = `📞 ${saved.phone}`;

      const savedLat = parseFloat(saved.latitude) || DEFAULT_BANGALORE_COORDS[0];
      const savedLng = parseFloat(saved.longitude) || DEFAULT_BANGALORE_COORDS[1];

      if (gpsNotice) {
        gpsNotice.style.display = (saved.latitude && saved.longitude) ? "inline-block" : "none";
      }

      if (summaryCard) summaryCard.style.display = "block";
      if (fieldsContainer) fieldsContainer.style.display = "none";

      initOrUpdateDeliveryMap(savedLat, savedLng);
    } else {
      if (summaryCard) summaryCard.style.display = "none";
      if (fieldsContainer) fieldsContainer.style.display = "block";

      const currentLat = parseFloat(document.getElementById("custLatitude")?.value) || DEFAULT_BANGALORE_COORDS[0];
      const currentLng = parseFloat(document.getElementById("custLongitude")?.value) || DEFAULT_BANGALORE_COORDS[1];
      initOrUpdateDeliveryMap(currentLat, currentLng);
    }
  }

  window.toggleEditAddress = function (showForm = true) {
    const summaryCard = document.getElementById("savedAddressSummaryCard");
    const fieldsContainer = document.getElementById("deliveryFieldsContainer");

    if (showForm) {
      if (summaryCard) summaryCard.style.display = "none";
      if (fieldsContainer) fieldsContainer.style.display = "block";
      setTimeout(() => {
        if (leafletMap) leafletMap.invalidateSize();
      }, 200);
    } else {
      if (summaryCard) summaryCard.style.display = "block";
      if (fieldsContainer) fieldsContainer.style.display = "none";
    }
  };

  // ==========================================
  // 13. CART & BAG OPERATIONS
  // ==========================================
  function isLoyaltyDiscountValid() {
    if (!bottleScanTimestampMs) return false;
    return (Date.now() - bottleScanTimestampMs) < QR_EXPIRY_MS;
  }

  function triggerBadgeAnimation() {
    const badge = document.getElementById("cartCountBadge");
    if (badge) {
      badge.classList.remove("badge-pop");
      void badge.offsetWidth;
      badge.classList.add("badge-pop");
      setTimeout(() => badge.classList.remove("badge-pop"), 250);
    }
  }

  function saveCart() {
    localStorage.setItem("manopavana_cart", JSON.stringify(cart));
    renderCart();
    renderProductsGrid();
    if (currentDetailProductKey) {
      renderProductDetailModalContent();
    }
    triggerBadgeAnimation();
  }

  window.openCart = function () {
    const drawer = document.getElementById("cartDrawer");
    const backdrop = document.getElementById("cartBackdrop");
    if (drawer) drawer.classList.add("open");
    if (backdrop) backdrop.classList.add("open");
  };

  window.closeCart = function () {
    const drawer = document.getElementById("cartDrawer");
    const backdrop = document.getElementById("cartBackdrop");
    if (drawer) drawer.classList.remove("open");
    if (backdrop) backdrop.classList.remove("open");
  };

  function getCartItemQuantity(itemId) {
    const item = cart.find((i) => i.id === itemId);
    return item ? item.quantity : 0;
  }

  window.handleDirectAdd = function (id, title, price, img) {
    if (!isBangalorePincode) {
      window.openFlipkartModal();
      return;
    }
    const existing = cart.find((item) => item.id === id);
    if (existing) {
      existing.quantity += 1;
    } else {
      cart.push({ id, title, price: parseInt(price, 10), img, quantity: 1 });
    }
    saveCart();
    window.showActionToast("Added to Bag", `🛒 Added ${title} to your bag.`, "🛒", "success");
  };

  window.updateQuantity = function (id, delta) {
    const item = cart.find((item) => item.id === id);
    if (!item) {
      if (delta > 0) {
        if (COMBO_CATALOG[id]) {
          const combo = COMBO_CATALOG[id];
          cart.push({ id: combo.id, title: combo.title, price: combo.price, img: combo.img, quantity: 1 });
          window.showActionToast("Added to Bag", `🛒 Added ${combo.title} to your bag.`, "🛒", "success");
        } else {
          const [prodKey, sizeKey] = id.split("-");
          const formattedSize = sizeKey === "1l" ? "1L" : "500ml";
          const catItem = PRODUCT_CATALOG[prodKey]?.sizes[formattedSize];
          if (catItem) {
            cart.push({ id: catItem.id, title: catItem.title, price: catItem.price, img: PRODUCT_CATALOG[prodKey].img, quantity: 1 });
            window.showActionToast("Added to Bag", `🛒 Added ${catItem.title} to your bag.`, "🛒", "success");
          }
        }
      }
    } else {
      item.quantity += delta;
      if (item.quantity <= 0) {
        cart = cart.filter((i) => i.id !== id);
      }
    }
    saveCart();
  };

  window.removeItem = function (id) {
    cart = cart.filter((item) => item.id !== id);
    saveCart();
  };

  function renderCart() {
    const totalCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

    let discountAmount = 0;
    const isLoyal = isLoyaltyDiscountValid();

    const discountRow = document.getElementById("discountRow");
    const cartDiscount = document.getElementById("cartDiscount");

    if (isLoyal && subtotal > 0) {
      discountAmount = Math.round((subtotal * REORDER_DISCOUNT_PERCENT) / 100);
      if (discountRow) discountRow.style.display = "flex";
      if (cartDiscount) cartDiscount.textContent = `-₹${discountAmount.toLocaleString("en-IN")}`;
    } else {
      if (discountRow) discountRow.style.display = "none";
    }

    const discountedSubtotal = subtotal - discountAmount;
    let deliveryFee = 0;
    if (totalCount > 0) {
      deliveryFee = discountedSubtotal >= FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_DELIVERY_FEE;
    }
    const grandTotal = discountedSubtotal + deliveryFee;

    const cartCountBadge = document.getElementById("cartCountBadge");
    const cartTotalItems = document.getElementById("cartTotalItems");
    const cartSubtotal = document.getElementById("cartSubtotal");
    const cartDeliveryCharge = document.getElementById("cartDeliveryCharge");
    const cartGrandTotal = document.getElementById("cartGrandTotal");
    const shippingNote = document.getElementById("shippingNote");

    if (cartCountBadge) cartCountBadge.textContent = totalCount;
    if (cartTotalItems) cartTotalItems.textContent = totalCount;
    if (cartSubtotal) cartSubtotal.textContent = `₹${subtotal.toLocaleString("en-IN")}`;

    if (cartDeliveryCharge) {
      cartDeliveryCharge.innerHTML = totalCount === 0 ? "₹0" : (deliveryFee === 0 ? `<span class="free-tag">FREE</span>` : `₹${STANDARD_DELIVERY_FEE}`);
    }

    if (cartGrandTotal) {
      cartGrandTotal.textContent = `₹${grandTotal.toLocaleString("en-IN")}`;
    }

    if (shippingNote) {
      if (totalCount === 0) {
        shippingNote.textContent = `Add ₹500+ for FREE Doorstep Delivery across Bangalore`;
      } else if (discountedSubtotal >= FREE_SHIPPING_THRESHOLD) {
        shippingNote.innerHTML = `🎉 You unlocked <strong>FREE Bangalore Delivery</strong> (48–72 hrs)!`;
      } else {
        const remaining = FREE_SHIPPING_THRESHOLD - discountedSubtotal;
        shippingNote.innerHTML = `Add <strong>₹${remaining}</strong> more for <strong>FREE Bangalore Delivery</strong>!`;
      }
    }

    const cartItemsList = document.getElementById("cartItemsList");
    if (!cartItemsList) return;

    if (cart.length === 0) {
      cartItemsList.innerHTML = `<div class="empty-cart-msg">Your artisanal bag is empty.<br>Select any bottle or combo above to begin.</div>`;
      return;
    }

    cartItemsList.innerHTML = cart.map((item) => `
      <div class="cart-item">
        <img src="${item.img}" class="cart-item-thumb" alt="${escapeHtml(item.title)}" onerror="this.src='https://placehold.co/100x120/171412/eab308?text=Bottle'" />
        <div class="cart-item-details">
          <div class="cart-item-title">${escapeHtml(item.title)}</div>
          <div class="cart-item-price">₹${item.price}</div>
          <div class="cart-item-qty">
            <button class="qty-btn" onclick="updateQuantity('${item.id}', -1)" type="button">-</button>
            <span class="qty-count">${item.quantity}</span>
            <button class="qty-btn" onclick="updateQuantity('${item.id}', 1)" type="button">+</button>
            <button class="btn-remove-item" onclick="removeItem('${item.id}')" type="button">Remove</button>
          </div>
        </div>
      </div>
    `).join("");
  }

  // ==========================================
  // 14. PRODUCT CATALOG DISPLAY & STEPPERS
  // ==========================================
  function renderStepperButtonHTML(id, title, price, img, quantity) {
    if (!isBangalorePincode) {
      return `
        <a href="https://www.flipkart.com" target="_blank" rel="noopener noreferrer" class="btn-buy-flipkart-inline" style="text-decoration:none;">
          🛒 Buy on Flipkart
        </a>
      `;
    }

    if (quantity > 0) {
      return `
        <div class="stepper-active-box">
          <button class="stepper-btn" onclick="updateQuantity('${id}', -1)" type="button" aria-label="Decrease">−</button>
          <span class="stepper-value">${quantity}</span>
          <button class="stepper-btn" onclick="updateQuantity('${id}', 1)" type="button" aria-label="Increase">+</button>
        </div>
      `;
    }

    return `
      <button class="btn-buy" onclick="handleDirectAdd('${id}', '${escapeHtml(title)}', ${price}, '${img}')" type="button">
        Add to Bag
      </button>
    `;
  }

  function renderProductsGrid() {
    const container = document.getElementById("productGridContainer");
    if (!container) return;
    container.innerHTML = "";

    Object.keys(PRODUCT_CATALOG).forEach((key) => {
      const product = PRODUCT_CATALOG[key];
      const defaultData = product.sizes["1L"];
      const currentQty = getCartItemQuantity(defaultData.id);

      const card = document.createElement("div");
      card.className = `product-card ${product.badgeTheme}`;

      const featuresHTML = product.features.map((f) => `<li>${f.icon} <strong>${f.label}:</strong> ${f.val}</li>`).join("");

      card.innerHTML = `
        <span class="card-badge">Wood Pressed</span>
        <div class="card-image-wrap ${product.bgClass}" onclick="openProductDetailModal('${key}')">
          <img src="${product.img}" alt="${escapeHtml(product.name)}" class="product-img" onerror="this.src='https://placehold.co/200x260/171412/eab308?text=Oil'" />
          <span class="card-quick-hint">Tap for Details</span>
        </div>
        <div class="card-content">
          <h3 class="card-title-clickable" onclick="openProductDetailModal('${key}')">${escapeHtml(product.name)}</h3>
          <ul class="product-feature-list">${featuresHTML}</ul>
          <div class="card-footer">
            <div class="price-block">
              <span class="price">₹${defaultData.price} <small>/ 1L</small></span>
            </div>
            <div class="stepper-wrap-inline" id="stepper-container-${defaultData.id}">
              ${renderStepperButtonHTML(defaultData.id, defaultData.title, defaultData.price, product.img, currentQty)}
            </div>
          </div>
        </div>
      `;

      container.appendChild(card);
    });

    renderComboSection();
  }

  function renderComboSection() {
    const currentCombo = COMBO_CATALOG[currentSelectedComboKey];
    if (!currentCombo) return;

    const comboBadgeText = document.getElementById("comboBadgeText");
    const comboTitleHeading = document.getElementById("comboTitleHeading");
    const comboDescText = document.getElementById("comboDescText");
    const comboCurrentPrice = document.getElementById("comboCurrentPrice");
    const comboOriginalPrice = document.getElementById("comboOriginalPrice");
    const comboQrDiscountHint = document.getElementById("comboQrDiscountHint");
    const stepperComboContainer = document.getElementById("stepper-combo-container");
    const btnComboBuyNowDirect = document.getElementById("btnComboBuyNowDirect");

    if (comboBadgeText) comboBadgeText.textContent = currentCombo.badgeText;
    if (comboTitleHeading) comboTitleHeading.textContent = currentCombo.headingText;
    if (comboDescText) comboDescText.textContent = currentCombo.descText;
    if (comboCurrentPrice) comboCurrentPrice.textContent = `₹${currentCombo.price}`;
    if (comboOriginalPrice) comboOriginalPrice.textContent = `₹${currentCombo.originalPrice}`;
    if (comboQrDiscountHint) comboQrDiscountHint.textContent = `(₹${currentCombo.qrPrice} with Bottle QR Scan)`;

    const btnCombo3L = document.getElementById("btnCombo3L");
    const btnCombo15L = document.getElementById("btnCombo15L");
    if (btnCombo3L && btnCombo15L) {
      btnCombo3L.classList.toggle("active", currentSelectedComboKey === "combo-3l");
      btnCombo15L.classList.toggle("active", currentSelectedComboKey === "combo-15l");
    }

    const currentQty = getCartItemQuantity(currentCombo.id);
    if (stepperComboContainer) {
      stepperComboContainer.innerHTML = renderStepperButtonHTML(
        currentCombo.id,
        currentCombo.title,
        currentCombo.price,
        currentCombo.img,
        currentQty
      );
    }

    if (btnComboBuyNowDirect) {
      if (!isBangalorePincode) {
        btnComboBuyNowDirect.innerHTML = `🛒 Buy Combo on Flipkart`;
        btnComboBuyNowDirect.onclick = function () { window.open("https://www.flipkart.com", "_blank"); };
      } else {
        btnComboBuyNowDirect.innerHTML = `⚡ Buy Now`;
        btnComboBuyNowDirect.onclick = window.handleDirectComboBuyNow;
      }
    }
  }

  window.selectComboVariant = function (comboKey) {
    currentSelectedComboKey = comboKey;
    renderComboSection();
  };

  window.handleDirectComboBuyNow = function () {
    if (!isBangalorePincode) {
      window.openFlipkartModal();
      return;
    }
    const currentCombo = COMBO_CATALOG[currentSelectedComboKey];
    window.handleDirectBuyNow(currentCombo.id, currentCombo.title, currentCombo.price, currentCombo.img);
  };

  // ==========================================
  // 15. PRODUCT DETAIL MODAL CONTROLLER
  // ==========================================
  window.openProductDetailModal = function (productKey) {
    const product = PRODUCT_CATALOG[productKey];
    if (!product) return;

    currentDetailProductKey = productKey;
    currentDetailSelectedSize = "1L";

    const titleEl = document.getElementById("modalProductHeaderTitle");
    if (titleEl) titleEl.textContent = `${product.name} Details`;

    renderProductDetailModalContent();

    const modal = document.getElementById("productDetailModalBackdrop");
    if (modal) {
      modal.classList.add("open");
      document.body.classList.add("modal-open");
    }
  };

  window.closeProductDetailModal = function () {
    const modal = document.getElementById("productDetailModalBackdrop");
    if (modal) {
      modal.classList.remove("open");
      document.body.classList.remove("modal-open");
    }
    currentDetailProductKey = null;
  };

  window.selectModalVariantSize = function (sizeKey) {
    currentDetailSelectedSize = sizeKey;
    renderProductDetailModalContent();
  };

  window.switchDetailMainImage = function (src, thumbEl) {
    const mainImg = document.getElementById("detailMainImg");
    if (mainImg) mainImg.src = src;

    document.querySelectorAll(".detail-thumb-img").forEach((el) => el.classList.remove("active"));
    if (thumbEl) thumbEl.classList.add("active");
  };

  function renderProductDetailModalContent() {
    const body = document.getElementById("modalProductDetailBody");
    if (!currentDetailProductKey || !body) return;

    const product = PRODUCT_CATALOG[currentDetailProductKey];
    const selectedSizeData = product.sizes[currentDetailSelectedSize];
    const currentQty = getCartItemQuantity(selectedSizeData.id);

    const specRows = Object.entries(product.specs)
      .map(([k, v]) => `<tr><td class="spec-lbl">${k}</td><td class="spec-val">${v}</td></tr>`)
      .join("");

    const nutritionBoxes = product.nutrition
      .map((n) => `<div class="nutri-cell"><span class="nutri-lbl">${n.name}</span><div class="nutri-num">${n.val}</div></div>`)
      .join("");

    const thumbnailsHTML = product.gallery
      .map((imgSrc, idx) => `<img src="${imgSrc}" class="detail-thumb-img ${idx === 0 ? "active" : ""}" onclick="switchDetailMainImage('${imgSrc}', this)" alt="Thumb" />`)
      .join("");

    body.innerHTML = `
      <div class="detail-top-grid">
        <div class="detail-gallery">
          <div class="detail-main-img-box"><img src="${product.gallery[0]}" class="detail-main-img" id="detailMainImg" alt="${escapeHtml(product.name)}" /></div>
          <div class="detail-thumb-strip">${thumbnailsHTML}</div>
        </div>
        <div class="detail-info-col">
          <span class="detail-badge-pill">🌿 Wood-Pressed • Lab Tested</span>
          <h2 class="detail-title">${escapeHtml(product.name)}</h2>
          <p class="detail-short-desc">${escapeHtml(product.shortDesc)}</p>
          <div class="modal-variant-wrap">
            <span class="modal-variant-label">Choose Volume:</span>
            <div class="modal-variant-pills">
              <button type="button" class="modal-size-pill ${currentDetailSelectedSize === "1L" ? "active" : ""}" onclick="selectModalVariantSize('1L')">1 Litre (₹${product.sizes["1L"].price})</button>
              <button type="button" class="modal-size-pill ${currentDetailSelectedSize === "500ml" ? "active" : ""}" onclick="selectModalVariantSize('500ml')">500 ml (₹${product.sizes["500ml"].price})</button>
            </div>
          </div>
          <div class="modal-action-row">
            <div><span class="price-sub">Payable Price:</span><div class="modal-price-val">₹${selectedSizeData.price}</div></div>
            <div class="stepper-wrap-inline" id="stepper-container-modal-${selectedSizeData.id}">
              ${renderStepperButtonHTML(selectedSizeData.id, selectedSizeData.title, selectedSizeData.price, product.img, currentQty)}
            </div>
          </div>
          <div class="modal-direct-buy-wrap">
            <button type="button" class="btn-direct-buy-now" onclick="handleDirectBuyNow('${selectedSizeData.id}', '${escapeHtml(selectedSizeData.title)}', ${selectedSizeData.price}, '${product.img}')">
              ⚡ Buy Now — Proceed to Delivery
            </button>
          </div>
        </div>
      </div>
      <div class="detail-spec-box">
        <h4>Extraction Specifications</h4>
        <table class="specs-table-grid"><tbody>${specRows}</tbody></table>
      </div>
      <div class="detail-spec-box">
        <h4>Nutritional Breakdown</h4>
        <div class="detail-nutrition-grid">${nutritionBoxes}</div>
      </div>
    `;
  }

  // ==========================================
  // 16. CHECKOUT, PAYMENT GATEWAY & MODAL
  // ==========================================
  window.handleDirectBuyNow = function (id, title, price, img) {
    if (!isBangalorePincode) {
      window.openFlipkartModal();
      return;
    }
    checkoutSource = "buynow";
    buyNowItem = { id, title, price: parseInt(price, 10), quantity: 1, img };
    window.closeProductDetailModal();
    promptLoginOrOpenCheckout();
  };

  function promptLoginOrOpenCheckout() {
    if (!currentUser) {
      window.openAuthModal("login");
      const errBox = document.getElementById("authErrorMsg");
      if (errBox) {
        errBox.textContent = "Please sign in or create an account to tie your order to your profile.";
        errBox.style.display = "block";
      }
    } else {
      openCheckoutModalUI();
    }
  }

  function openCheckoutModalUI() {
    currentOrderRef = "MP_" + Date.now() + "_" + Math.floor(100 + Math.random() * 900);

    const titleEl = document.getElementById("modalCheckoutTitle");
    if (titleEl) {
      titleEl.textContent = checkoutSource === "buynow" && buyNowItem
        ? `Delivery & Payment: ${buyNowItem.title}`
        : "Delivery & Payment Details";
    }

    updateCheckoutFinancials();
    updatePaymentModeUI();
    loadSavedDeliveryDetails();

    const modal = document.getElementById("checkoutModalBackdrop");
    if (modal) {
      modal.classList.add("open");
      document.body.classList.add("modal-open");
      setTimeout(() => {
        if (leafletMap) leafletMap.invalidateSize();
      }, 300);
    }
  }

  window.closeCheckoutModal = function () {
    const modal = document.getElementById("checkoutModalBackdrop");
    if (modal) {
      modal.classList.remove("open");
      document.body.classList.remove("modal-open");
    }
  };

  function updateCheckoutFinancials() {
    let subtotal = 0;
    let itemsCount = 0;
    let previewHTML = "";

    const items = checkoutSource === "buynow" && buyNowItem ? [buyNowItem] : cart;

    items.forEach((item) => {
      subtotal += item.price * item.quantity;
      itemsCount += item.quantity;
      previewHTML += `
        <div class="checkout-preview-item">
          <img src="${item.img}" class="checkout-preview-thumb" alt="${escapeHtml(item.title)}" onerror="this.src='https://placehold.co/50x60/171412/eab308?text=Bottle'" />
          <div class="checkout-preview-info">
            <strong>${escapeHtml(item.title)}</strong>
            <span>Qty: ${item.quantity} × ₹${item.price}</span>
          </div>
          <div class="checkout-preview-cost">₹${(item.price * item.quantity).toLocaleString("en-IN")}</div>
        </div>
      `;
    });

    const isLoyal = isLoyaltyDiscountValid();
    let discountAmount = 0;
    if (isLoyal && subtotal > 0) {
      discountAmount = Math.round((subtotal * REORDER_DISCOUNT_PERCENT) / 100);
    }

    const discountedSubtotal = subtotal - discountAmount;
    let deliveryFee = 0;
    if (itemsCount > 0) {
      deliveryFee = discountedSubtotal >= FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_DELIVERY_FEE;
    }
    const grandTotal = discountedSubtotal + (itemsCount > 0 ? deliveryFee : 0);
    currentCalculatedGrandTotal = grandTotal;

    const preview = document.getElementById("checkoutOrderPreview");
    if (preview) {
      preview.innerHTML = `
        <div class="checkout-preview-header">
          <span>Items (${itemsCount})</span>
          <span>Subtotal: ₹${subtotal.toLocaleString("en-IN")}</span>
        </div>
        <div class="checkout-preview-list">${previewHTML}</div>
        <div class="checkout-preview-footer">
          ${discountAmount > 0 ? `<div class="checkout-row discount-text"><span>Loyalty Discount (10%):</span><span>-₹${discountAmount.toLocaleString("en-IN")}</span></div>` : ""}
          <div class="checkout-row"><span>Delivery:</span><span>${deliveryFee === 0 ? '<strong class="free-tag">FREE</strong>' : `₹${deliveryFee}`}</span></div>
          <div class="checkout-row total-highlight"><span>Total Payable:</span><span>₹${grandTotal.toLocaleString("en-IN")}</span></div>
        </div>
      `;
    }
  }

  function updatePaymentModeUI() {
    const isPhonePe = document.getElementById("payPhonePe")?.checked;
    const isCOD = document.getElementById("payCOD")?.checked;
    const submitBtn = document.getElementById("submitOrderBtn");
    const infoBox = document.getElementById("phonepePaymentInfoBox");

    document.getElementById("labelPayPhonePe")?.classList.toggle("active", !!isPhonePe);
    document.getElementById("labelPayCOD")?.classList.toggle("active", !!isCOD);
    document.getElementById("labelPayWhatsApp")?.classList.toggle("active", !isPhonePe && !isCOD);

    if (infoBox) infoBox.style.display = isPhonePe ? "block" : "none";

    if (submitBtn) {
      if (isPhonePe) submitBtn.textContent = "Proceed to Pay via PhonePe ⚡";
      else if (isCOD) submitBtn.textContent = "Confirm Cash on Delivery Order 💵";
      else submitBtn.textContent = "Confirm Order on WhatsApp 💬";
    }
  }

  async function handleCheckoutSubmission() {
    if (!currentUser) {
      promptLoginOrOpenCheckout();
      return;
    }

    const name = document.getElementById("custName")?.value.trim();
    const phone = document.getElementById("custPhone")?.value.trim();
    const address = document.getElementById("custAddress")?.value.trim();
    const state = document.getElementById("custState")?.value.trim();
    const district = document.getElementById("custDistrict")?.value.trim();
    const city = document.getElementById("custCity")?.value.trim();
    const pincode = document.getElementById("custPincode")?.value.trim();
    const latitude = document.getElementById("custLatitude")?.value || DEFAULT_BANGALORE_COORDS[0];
    const longitude = document.getElementById("custLongitude")?.value || DEFAULT_BANGALORE_COORDS[1];
    const chkSave = document.getElementById("chkSaveAddress")?.checked;
    const errBox = document.getElementById("formError");

    if (!name || phone.length < 10 || !address || !state || !district || !city || pincode.length !== 6) {
      if (errBox) {
        errBox.textContent = "Please fill in all mandatory delivery address fields properly.";
        errBox.style.display = "block";
      }
      return;
    }

    if (!pincode.startsWith("560")) {
      window.openFlipkartModal();
      return;
    }

    if (errBox) errBox.style.display = "none";

    if (chkSave) {
      const deliveryPayload = {
        name, phone, address, state, district, city, pincode, latitude, longitude
      };
      localStorage.setItem("manopavana_saved_delivery", JSON.stringify(deliveryPayload));
    }

    const itemsToCheckout = checkoutSource === "buynow" && buyNowItem ? [buyNowItem] : cart;
    const itemsSummary = itemsToCheckout.map((i) => `${i.title} (x${i.quantity})`).join(", ");
    const paymentMode = document.getElementById("payPhonePe")?.checked
      ? "PHONEPE"
      : (document.getElementById("payCOD")?.checked ? "COD" : "WHATSAPP");

    const submitBtn = document.getElementById("submitOrderBtn");
    const origText = submitBtn ? submitBtn.textContent : "";
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Processing Order...";
    }

    const uid = currentUser.uid || ("GUEST_" + phone);
    const currentOrigin = window.location.origin + window.location.pathname;

    try {
      if (paymentMode === "PHONEPE") {
        sessionStorage.setItem("manopavana_pending_checkout_source", checkoutSource);
        sessionStorage.setItem("manopavana_pending_order_ref", currentOrderRef);

        const response = await callBackend({
          action: "create_phonepe_order",
          orderRef: currentOrderRef,
          firebaseUid: uid,
          amount: currentCalculatedGrandTotal,
          name: name,
          phone: phone,
          email: currentUser.email || "",
          address: `${address}, ${city}`,
          state: state,
          district: district,
          pincode: pincode,
          items: itemsSummary,
          bottleCode: activeBottleCode || "",
          latitude: latitude,
          longitude: longitude,
          redirectBaseUrl: currentOrigin
        });

        // Safe URL redirect that prevents navigating into Google Apps Script
        if (response && response.status === "SUCCESS" && response.redirectUrl) {
          var targetUrl = String(response.redirectUrl).trim();

          // Blocks browser from loading Google Apps Script and showing "Invalid action: "
          if (targetUrl.indexOf("script.google.com") !== -1 || targetUrl.indexOf("script.googleusercontent.com") !== -1) {
            console.error("PhonePe Gateway returned an internal Google endpoint:", response);
            alert("PhonePe Gateway session could not be established. Please select 'Cash on Delivery' or 'WhatsApp Order'.");
            return;
          }

          window.location.href = targetUrl;
          return;
        } else {
          var errDetail = (response && response.message) ? response.message : "Unable to initiate PhonePe session.";
          console.error("Payment initiation failure:", response);
          alert("Payment Error: " + errDetail + "\n\nPlease try Cash on Delivery or WhatsApp Order.");
          return;
        }
      } else {
        await callBackend({
          action: "create_order",
          orderRef: currentOrderRef,
          firebaseUid: uid,
          grandTotal: currentCalculatedGrandTotal,
          name: name,
          phone: phone,
          email: currentUser.email || "",
          address: `${address}, ${city}`,
          state: state,
          district: district,
          pincode: pincode,
          items: itemsSummary,
          paymentMode: paymentMode,
          bottleCode: activeBottleCode || "",
          latitude: latitude,
          longitude: longitude
        });

        const orderSnapshot = {
          timestamp: new Date().toLocaleDateString("en-IN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }),
          orderRef: currentOrderRef,
          firebaseUid: uid,
          customerName: name,
          phone: phone,
          email: currentUser.email || "",
          items: itemsSummary,
          grandTotal: currentCalculatedGrandTotal.toString(),
          paymentMode: paymentMode,
          orderStatus: "Placed",
          trackingNotes: "Sourced directly from traditional wood-press artisans, settled naturally, and packed hygienically at our Bangalore packaging and distribution facility.",
          latitude: latitude,
          longitude: longitude
        };
        localOrdersHistory.unshift(orderSnapshot);
        localStorage.setItem("manopavana_local_orders", JSON.stringify(localOrdersHistory));

        if (checkoutSource === "cart") {
          cart = [];
          localStorage.removeItem("manopavana_cart");
        }

        window.closeCheckoutModal();
        renderCart();

        showOrderConfirmationModal({
          orderRef: currentOrderRef,
          customerName: name,
          paymentMode: paymentMode === "COD" ? "Cash on Delivery (COD)" : "WhatsApp Manual Order"
        });

        if (paymentMode === "WHATSAPP") {
          let msg = `🌿 *New Order - MANOPAVANA Wood-Pressed Oils*\n`;
          msg += `*Ref:* #${currentOrderRef}\n*UID:* ${uid}\n`;
          msg += `*Name:* ${name}\n*Phone:* ${phone}\n*Address:* ${address}, ${city} - ${pincode}\n`;
          msg += `*Location:* https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}\n`;
          msg += `*Items:* ${itemsSummary}\n*Total:* ₹${currentCalculatedGrandTotal}\n*Payment:* WhatsApp Manual`;
          window.open(`https://wa.me/${WHATSAPP_BUSINESS_NUMBER}?text=${encodeURIComponent(msg)}`, "_blank");
        }
      }
    } catch (err) {
      console.warn("Backend checkout notice:", err);
      alert(err.message || "Failed to process checkout. Please choose Cash on Delivery or WhatsApp Order.");
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = origText;
      }
    }
  }

  function showOrderConfirmationModal(details) {
    const modal = document.getElementById("orderConfirmationModalBackdrop");
    const box = document.getElementById("confirmReceiptDetails");
    const waBtn = document.getElementById("btnWhatsAppTrackReceipt");

    if (box) {
      box.innerHTML = `
        <div class="confirm-receipt-row"><span>Order Reference:</span><strong>#${details.orderRef}</strong></div>
        <div class="confirm-receipt-row"><span>Payment Method:</span><strong>${details.paymentMode}</strong></div>
        <div class="confirm-receipt-row"><span>Estimated Delivery:</span><strong style="color:#4ade80;">48 – 72 Hours (Bangalore)</strong></div>
        <div class="confirm-receipt-row total-row"><span>Status:</span><strong style="color:#eab308;">Confirmed &amp; Queued for Packaging</strong></div>
      `;
    }

    if (waBtn) {
      waBtn.href = `https://wa.me/${WHATSAPP_BUSINESS_NUMBER}?text=${encodeURIComponent("Live tracking for Order #" + details.orderRef)}`;
    }

    if (modal) {
      modal.classList.add("open");
      document.body.classList.add("modal-open");
    }
  }

  window.closeOrderConfirmationModal = function () {
    const modal = document.getElementById("orderConfirmationModalBackdrop");
    if (modal) {
      modal.classList.remove("open");
      document.body.classList.remove("modal-open");
    }
  };

  window.openLiveTrackingFromConfirmation = function () {
    window.closeOrderConfirmationModal();
    window.openOrderTrackingModal(true);
  };

  // ==========================================
  // 17. CUSTOMER REVIEWS
  // ==========================================
  function renderReviews() {
    const grid = document.getElementById("reviewsDisplayGrid");
    if (!grid) return;

    if (reviewsList.length === 0) {
      grid.innerHTML = `
        <div class="empty-reviews-notice">
          <span>🌱</span>
          <p>No customer reviews posted yet.<br>Be the first to share your kitchen experience using the form below!</p>
        </div>
      `;
      return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const isAdmin = urlParams.get("admin") === "true";

    grid.innerHTML = reviewsList
      .map((rev) => {
        const starRatingNum = Math.max(1, Math.min(5, parseInt(rev.rating, 10) || 5));
        const starsDisplay = "★".repeat(starRatingNum) + "☆".repeat(5 - starRatingNum);

        return `
          <div class="review-card" id="card-${rev.id}">
            <div>
              <div class="review-card-top">
                <div class="review-stars">${starsDisplay}</div>
                ${isAdmin ? `<button class="btn-admin-delete" onclick="deleteReview('${rev.id}')" title="Admin Delete">🗑️ Delete</button>` : ""}
              </div>
              <p class="review-text">"${escapeHtml(rev.comment)}"</p>
            </div>
            <div class="reviewer-meta">
              <strong>${escapeHtml(rev.name)}</strong>
              <span>${escapeHtml(rev.location)} • ${escapeHtml(rev.product)}</span>
              <small class="review-date">${escapeHtml(rev.date)}</small>
            </div>
          </div>
        `;
      })
      .join("");
  }

  window.deleteReview = function (reviewId) {
    const enteredPin = prompt("Admin Verification: Enter Secret PIN to remove this review:");
    if (enteredPin === ADMIN_PIN) {
      reviewsList = reviewsList.filter((item) => item.id !== reviewId);
      localStorage.setItem("manopavana_user_reviews", JSON.stringify(reviewsList));
      renderReviews();
      alert("Review removed successfully.");
    } else if (enteredPin !== null) {
      alert("Incorrect PIN. Action denied.");
    }
  };

  // ==========================================
  // 18. LEGAL MODALS & FIXED COUNTDOWN TIMER
  // ==========================================
  window.openLegalModal = function (modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add("open");
      document.body.classList.add("modal-open");
    }
  };

  window.closeLegalModal = function (modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove("open");
      document.body.classList.remove("modal-open");
    }
  };

  function initLoyaltyFromStorage() {
    const storedTime = localStorage.getItem("manopavana_bottle_scan_time");
    if (storedTime) {
      const elapsed = Date.now() - parseInt(storedTime, 10);
      if (elapsed < QR_EXPIRY_MS) {
        bottleScanTimestampMs = parseInt(storedTime, 10);
        activeBottleCode = localStorage.getItem("manopavana_bottle_code") || "VERIFIED_BOTTLE";
        startLiveCountdown();
      } else {
        window.clearLoyaltyDiscount();
      }
    }
  }

  window.clearLoyaltyDiscount = function () {
    activeBottleCode = null;
    bottleScanTimestampMs = null;
    localStorage.removeItem("manopavana_bottle_code");
    localStorage.removeItem("manopavana_bottle_scan_time");
    renderCart();
    startLiveCountdown();
    renderComboSection();
  };

  // Fixed Countdown Timer Arithmetic Calculation (% 3600 / 60)
  function startLiveCountdown() {
    if (countdownTimerInterval) clearInterval(countdownTimerInterval);

    function updateTimer() {
      const announcementText = document.getElementById("announcementText");
      const topBar = document.getElementById("topAnnouncementBar");
      if (!announcementText || !topBar) return;

      if (isLoyaltyDiscountValid()) {
        const remainingMs = Math.max(0, QR_EXPIRY_MS - (Date.now() - bottleScanTimestampMs));
        if (remainingMs <= 0) {
          window.clearLoyaltyDiscount();
          return;
        }

        const totalSeconds = Math.floor(remainingMs / 1000);
        const days = Math.floor(totalSeconds / 86400);
        const hours = Math.floor((totalSeconds % 86400) / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        const formatted = `${days}d ${String(hours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}m ${String(seconds).padStart(2, "0")}s`;
        announcementText.innerHTML = `🏷 <strong>Bottle Scan Verified:</strong> 10% Loyalty Discount Active! <span class="countdown-pill">⏱ ${formatted}</span>`;
        topBar.classList.add("loyal-banner");
      } else {
        announcementText.innerHTML = `🚚 <strong>FREE Doorstep Delivery</strong> on all orders above ₹500 across Bangalore (Delivered in 48–72 hrs)`;
        topBar.classList.remove("loyal-banner");
        clearInterval(countdownTimerInterval);
      }
    }

    updateTimer();
    countdownTimerInterval = setInterval(updateTimer, 1000);
  }

  // ==========================================
  // 19. DOM INITIALIZATION
  // ==========================================
  document.addEventListener("DOMContentLoaded", () => {
    // Sound & Video Engine
    document.getElementById("soundToggleBtn")?.addEventListener("click", toggleAudio);
    initVideoAutoplay();

    tryImmediateAudioPlayback();

    // Lightweight one-time tap activation that prevents mobile screen freezing
    const enableAudioOnGesture = () => {
      if (!hasInteracted) {
        hasInteracted = true;
        tryImmediateAudioPlayback();
      }
      ["click", "touchend"].forEach((e) => window.removeEventListener(e, enableAudioOnGesture));
    };
    ["click", "touchend"].forEach((e) => window.addEventListener(e, enableAudioOnGesture, { passive: true }));

    // Cart Drawer Triggers
    document.getElementById("openCartBtn")?.addEventListener("click", window.openCart);
    document.getElementById("closeCartBtn")?.addEventListener("click", window.closeCart);
    document.getElementById("cartBackdrop")?.addEventListener("click", window.closeCart);

    // Checkout Modal Triggers
    document.getElementById("openCheckoutModalBtn")?.addEventListener("click", () => {
      if (cart.length === 0) {
        alert("Please add at least one bottle to your bag first!");
        return;
      }
      if (!isBangalorePincode) {
        window.openFlipkartModal();
        return;
      }
      checkoutSource = "cart";
      buyNowItem = null;
      window.closeCart();
      promptLoginOrOpenCheckout();
    });

    document.getElementById("closeModalBtn")?.addEventListener("click", window.closeCheckoutModal);
    document.getElementById("closeDetailModalBtn")?.addEventListener("click", window.closeProductDetailModal);

    // Payment Selection Radios
    document.getElementById("payPhonePe")?.addEventListener("change", updatePaymentModeUI);
    document.getElementById("payCOD")?.addEventListener("change", updatePaymentModeUI);
    document.getElementById("payWhatsApp")?.addEventListener("change", updatePaymentModeUI);

    // Submit Checkout
    document.getElementById("submitOrderBtn")?.addEventListener("click", handleCheckoutSubmission);

    // Number Sanitization
    ["custPhone", "custPincode", "onboardPincodeInput", "pincodeCheckInput"].forEach((id) => {
      document.getElementById(id)?.addEventListener("input", (e) => {
        e.target.value = e.target.value.replace(/\D/g, "");
      });
    });

    // Review Submission
    document.getElementById("productReviewForm")?.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = document.getElementById("revName")?.value.trim();
      const product = document.getElementById("revProduct")?.value;
      const rating = document.getElementById("revRating")?.value;
      const location = document.getElementById("revLocation")?.value.trim() || "Bangalore";
      const comment = document.getElementById("revComment")?.value.trim();

      if (!name || !comment) {
        alert("Please fill in your name and kitchen feedback.");
        return;
      }

      reviewsList.unshift({
        id: "REV-" + Date.now(),
        name,
        product,
        rating,
        location,
        comment,
        date: new Date().toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })
      });

      localStorage.setItem("manopavana_user_reviews", JSON.stringify(reviewsList));
      renderReviews();
      e.target.reset();
      window.showActionToast("Review Submitted", "✨ Thank you! Your review has been posted.", "✨", "success");
    });

    // FAQ Accordion
    document.querySelectorAll(".faq-question").forEach((button) => {
      button.addEventListener("click", () => {
        const item = button.parentElement;
        const isActive = item.classList.contains("active");
        document.querySelectorAll(".faq-item").forEach((el) => el.classList.remove("active"));
        if (!isActive) item.classList.add("active");
      });
    });

    // Verify PhonePe Return
    const urlParams = new URLSearchParams(window.location.search);
    const incomingOrderRef = urlParams.get("orderRef");
    const incomingStatus = (urlParams.get("status") || "").toLowerCase();

    if (incomingOrderRef) {
      const savedCheckoutSource = sessionStorage.getItem("manopavana_pending_checkout_source") || "cart";

      // If user cancelled, closed payment, or status has fail/cancel, do NOT empty cart or show success
      if (incomingStatus.includes("fail") || incomingStatus.includes("cancel") || incomingStatus.includes("error")) {
        window.showActionToast("Payment Incomplete", "Payment was not completed. Your bag is saved.", "⚠️", "error");
        sessionStorage.removeItem("manopavana_pending_checkout_source");
        sessionStorage.removeItem("manopavana_pending_order_ref");
        window.history.replaceState({}, document.title, window.location.pathname);
      } else {
        // Query backend to confirm payment state
        callBackend({ action: "verify_payment", orderRef: incomingOrderRef })
          .then((verification) => {
            if (verification && (verification.status === "SUCCESS" || verification.paymentStatus === "COMPLETED")) {
              if (savedCheckoutSource === "cart") {
                cart = [];
                localStorage.removeItem("manopavana_cart");
                renderCart();
              }
              showOrderConfirmationModal({
                orderRef: incomingOrderRef,
                paymentMode: "PhonePe Online"
              });
            } else {
              window.showActionToast("Payment Incomplete", "Transaction could not be confirmed by the bank.", "⚠️", "error");
            }
          })
          .catch(() => {
            window.showActionToast("Network Delay", "Verifying payment status...", "⏳", "info");
          })
          .finally(() => {
            sessionStorage.removeItem("manopavana_pending_checkout_source");
            sessionStorage.removeItem("manopavana_pending_order_ref");
            window.history.replaceState({}, document.title, window.location.pathname);
          });
      }
    }

    // Component Initialization
    populateStatesDropdown();
    updateLocationUI();
    initLoyaltyFromStorage();
    renderProductsGrid();
    renderCart();
    renderReviews();
    initFirebaseAuth();
    checkAndTriggerUpfrontOnboarding();
  });
})();
