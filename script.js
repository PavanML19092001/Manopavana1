// ==========================================================================
// MANOPAVANA - ARTISANAL WOOD-PRESSED OILS (BANGALORE)
// COMPLETE PRODUCTION CLIENT SCRIPT (script.js) - MASTER FLIPKART ARCHITECTURE
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

  // Google Apps Script Proxy for PhonePe Online PG
  const GOOGLE_SCRIPT_API_URL = "https://script.google.com/macros/s/AKfycbyQ-8w0XmfJiBUm8fg_W3kBQ7XSXJTftmc6I7188L25N_dwWCKDtYwnpRJTcCii70U-/exec";

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
  let db = null;
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
  let checkoutSource = "cart"; // "cart" | "buynow" | "retry"
  let buyNowItem = null;
  let retryOrderData = null;
  let lastFailedOrderRef = "";
  let toastTimeoutTimer = null;
  let addressTypingTimer = null;

  // Audio Engine State
  let isAudioPlaying = false;
  let hasInteracted = false;

  // Leaflet Map & Marker Instances
  let leafletMap = null;
  let mapMarker = null;
  let onboardingLeafletMap = null;
  let onboardingMapMarker = null;

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

  // Upfront Quiz State
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
      rating: "4.8",
      ratingCount: "2,420 Ratings",
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
        "1L": { id: "groundnut-1l", price: 399, originalPrice: 480, badge: "1 Litre", title: "Wood-Pressed Groundnut Oil (1L)" },
        "500ml": { id: "groundnut-500ml", price: 189, originalPrice: 240, badge: "500 ml", title: "Wood-Pressed Groundnut Oil (500ml)" }
      }
    },
    coconut: {
      id: "coconut",
      name: "Wood-Pressed Coconut Oil",
      badgeTheme: "theme-coconut",
      bgClass: "oil-coconut",
      img: `${R2_PUBLIC_BASE_URL}/coconut-1.png`,
      gallery: createGallery("coconut", 11),
      rating: "4.9",
      ratingCount: "1,890 Ratings",
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
        "1L": { id: "coconut-1l", price: 499, originalPrice: 580, badge: "1 Litre", title: "Wood-Pressed Coconut Oil (1L)" },
        "500ml": { id: "coconut-500ml", price: 269, originalPrice: 320, badge: "500 ml", title: "Wood-Pressed Coconut Oil (500ml)" }
      }
    },
    sesame: {
      id: "sesame",
      name: "Wood-Pressed Sesame Oil",
      badgeTheme: "theme-sesame",
      bgClass: "oil-sesame",
      img: `${R2_PUBLIC_BASE_URL}/sesame-1.png`,
      gallery: createGallery("sesame", 11),
      rating: "4.7",
      ratingCount: "980 Ratings",
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
        "1L": { id: "sesame-1l", price: 499, originalPrice: 590, badge: "1 Litre", title: "Wood-Pressed Sesame Oil (1L)" },
        "500ml": { id: "sesame-500ml", price: 269, originalPrice: 320, badge: "500 ml", title: "Wood-Pressed Sesame Oil (500ml)" }
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

  function escapeHtml(text) {
    if (!text) return "";
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

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

  // ==========================================
  // 4. ACTION TOAST & AUTH TRANSLATION
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

  function getFriendlyAuthErrorMessage(err) {
    if (!err) return "An unexpected error occurred. Please try again.";
    const code = err.code || "";
    switch (code) {
      case "auth/invalid-credential":
      case "auth/wrong-password":
      case "auth/user-not-found":
        return "Invalid email or password. Please verify and try again.";
      case "auth/email-already-in-use":
        return "An account already exists with this email address. Please sign in instead.";
      case "auth/weak-password":
        return "Please choose a stronger password (at least 6 characters).";
      case "auth/invalid-email":
        return "Please enter a valid email address.";
      case "auth/popup-closed-by-user":
        return "Sign-in was cancelled before completion.";
      case "auth/network-request-failed":
        return "Network connection issue detected. Please check your internet connection.";
      default:
        return err.message || "Authentication failed. Please try again.";
    }
  }

  // ==========================================
  // 5. PHONEPE GATEWAY CALLER
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
        reject(new Error("Unable to connect to gateway controller."));
      };

      timer = setTimeout(function () {
        delete window[callbackName];
        if (script && script.parentNode) script.parentNode.removeChild(script);
        reject(new Error("Gateway connection timed out."));
      }, 15000);

      document.body.appendChild(script);
    });
  }

  // ==========================================
  // 6. AUDIO ENGINE & AUTOPLAY (MOBILE SAFE)
  // ==========================================
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
    const heroVid = document.getElementById("heroVideo");
    const bottleVid = document.getElementById("bottleAutoplayVideo");
    const fallback = document.getElementById("heroFallbackImage");

    [heroVid, bottleVid].forEach(v => {
      if (v) {
        v.muted = true;
        v.loop = true;
        v.playsInline = true;
        v.play().catch(() => {
          if (v === heroVid && fallback) {
            heroVid.style.display = "none";
            fallback.style.display = "block";
          }
        });
      }
    });
  }

  // ==========================================
  // 7. FIREBASE AUTH & USER PROFILE
  // ==========================================
  function initFirebaseAuth() {
    try {
      if (window.firebase && window.firebase.auth) {
        if (!firebase.apps.length) {
          firebase.initializeApp(firebaseConfig);
        }
        authInstance = firebase.auth();
        googleAuthProvider = new firebase.auth.GoogleAuthProvider();

        if (window.firebase.firestore) {
          db = firebase.firestore();
        }

        firebaseInitialized = true;

        authInstance.onAuthStateChanged((user) => {
          if (user) {
            currentUser = {
              uid: user.uid,
              email: user.email,
              displayName: user.displayName || (user.email ? user.email.split("@")[0] : "Customer")
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

  async function syncCustomerRecord(user, extraData, isNewUser) {
    if (!db || !user) return;
    try {
      const userRef = db.collection("customers").doc(user.uid);
      const doc = await userRef.get();

      if (!doc.exists) {
        await userRef.set({
          firebaseUid: user.uid,
          name: extraData.name || user.displayName || "Customer",
          email: user.email || "",
          phone: extraData.phone || "",
          totalOrders: 0,
          totalSpent: 0,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          lastLoginAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      } else {
        await userRef.update({
          lastLoginAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      }
    } catch (e) {
      console.warn("Customer Firestore sync notice:", e);
    }
  }

  function updateAuthUI() {
    const authPillLabel = document.getElementById("authPillLabel");
    const authUserMeta = document.getElementById("authUserMeta");
    const logoutItem = document.getElementById("authLogoutItem");
    const profDisplayName = document.getElementById("profDisplayName");
    const profEmail = document.getElementById("profEmail");
    const custName = document.getElementById("custName");

    if (currentUser) {
      const name = currentUser.displayName || (currentUser.email ? currentUser.email.split("@")[0] : "Customer");
      if (authPillLabel) authPillLabel.textContent = "👤 " + name;
      if (authUserMeta) authUserMeta.textContent = `Hello, ${name}`;
      if (logoutItem) logoutItem.style.display = "block";
      if (profDisplayName) profDisplayName.textContent = name;
      if (profEmail) profEmail.textContent = currentUser.email || "--";
      if (custName && !custName.value) custName.value = name;
    } else {
      if (authPillLabel) authPillLabel.textContent = "👤 Login";
      if (authUserMeta) authUserMeta.textContent = "Welcome to MANOPAVANA";
      if (logoutItem) logoutItem.style.display = "none";
      if (profDisplayName) profDisplayName.textContent = "--";
      if (profEmail) profEmail.textContent = "--";
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

  window.toggleAuthModeAlternate = function () {
    window.toggleAuthMode(currentAuthMode === "login" ? "register" : "login");
  };

  window.toggleAuthMode = function (mode) {
    currentAuthMode = mode;
    const sideTitle = document.getElementById("fkAuthSidebarTitle");
    const sideDesc = document.getElementById("fkAuthSidebarDesc");
    const submitBtn = document.getElementById("btnAuthSubmit");
    const switchBtn = document.getElementById("btnAuthSwitchMode");
    const passGroup = document.getElementById("authPasswordGroup");
    const errBox = document.getElementById("authErrorMsg");
    const successBox = document.getElementById("authSuccessMsg");

    if (errBox) errBox.style.display = "none";
    if (successBox) successBox.style.display = "none";

    if (mode === "login") {
      if (sideTitle) sideTitle.textContent = "Login";
      if (sideDesc) sideDesc.textContent = "Get access to your Orders, Wishlist, and Pure Wood-Pressed Oils.";
      if (submitBtn) submitBtn.textContent = "Login";
      if (switchBtn) switchBtn.textContent = "New to MANOPAVANA? Create an account";
      if (passGroup) passGroup.style.display = "block";
    } else if (mode === "register") {
      if (sideTitle) sideTitle.textContent = "Looks like you're new here!";
      if (sideDesc) sideDesc.textContent = "Sign up with your email to start shopping artisanal wood-pressed oils.";
      if (submitBtn) submitBtn.textContent = "CONTINUE";
      if (switchBtn) switchBtn.textContent = "Existing User? Log in";
      if (passGroup) passGroup.style.display = "block";
    } else if (mode === "reset") {
      if (sideTitle) sideTitle.textContent = "Reset Password";
      if (sideDesc) sideDesc.textContent = "Enter your email to receive password reset instructions.";
      if (submitBtn) submitBtn.textContent = "SEND RESET LINK";
      if (switchBtn) switchBtn.textContent = "Back to Login";
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
      if (errBox) { errBox.textContent = "Please enter an email address."; errBox.style.display = "block"; }
      return;
    }

    if (currentAuthMode === "reset") {
      try {
        await authInstance.sendPasswordResetEmail(email);
        if (successBox) {
          successBox.textContent = "Password reset instructions sent to your inbox.";
          successBox.style.display = "block";
        }
      } catch (err) {
        if (errBox) { errBox.textContent = getFriendlyAuthErrorMessage(err); errBox.style.display = "block"; }
      }
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "PLEASE WAIT...";
    }

    try {
      if (currentAuthMode === "login") {
        const userCred = await authInstance.signInWithEmailAndPassword(email, password);
        const name = userCred.user.displayName || userCred.user.email.split("@")[0];
        await syncCustomerRecord(userCred.user, { name, email }, false);
        window.closeAuthModal();
        window.showActionToast("Signed In", `Welcome back, ${name}!`, "👋", "success");
      } else if (currentAuthMode === "register") {
        const userCred = await authInstance.createUserWithEmailAndPassword(email, password);
        const name = userCred.user.email.split("@")[0];
        await syncCustomerRecord(userCred.user, { name, email }, true);
        window.closeAuthModal();
        window.showActionToast("Account Created", `Welcome to MANOPAVANA, ${name}!`, "🎉", "success");
      }
    } catch (err) {
      if (errBox) {
        errBox.textContent = getFriendlyAuthErrorMessage(err);
        errBox.style.display = "block";
      }
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = currentAuthMode === "login" ? "Login" : "CONTINUE";
      }
    }
  };

  window.handleGoogleSignIn = async function () {
    const errBox = document.getElementById("authErrorMsg");
    try {
      const result = await authInstance.signInWithPopup(googleAuthProvider);
      const user = result.user;
      const isNewUser = !!(result.additionalUserInfo && result.additionalUserInfo.isNewUser);
      const name = user.displayName || user.email.split("@")[0];

      await syncCustomerRecord(user, { name, email: user.email }, isNewUser);
      window.closeAuthModal();
      window.showActionToast(isNewUser ? "Account Created" : "Signed In", `Welcome, ${name}!`, "👋", "success");
    } catch (err) {
      if (errBox) {
        errBox.textContent = getFriendlyAuthErrorMessage(err);
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
    window.closeAccountDashboard();
    window.showActionToast("Logged Out", "You have successfully signed out.", "👋", "info");
  };

  document.addEventListener("click", (e) => {
    const dropdown = document.getElementById("authDropdownMenu");
    const container = document.getElementById("authPillContainer");
    if (dropdown && container && !container.contains(e.target)) {
      dropdown.classList.remove("open");
    }
  });

  // ==========================================
  // 8. USER DASHBOARD & ORDERS
  // ==========================================
  window.openAccountDashboard = function (initialTab = "orders") {
    if (!currentUser) {
      window.openAuthModal("login");
      return;
    }
    const modal = document.getElementById("accountDashboardBackdrop");
    if (modal) {
      modal.classList.add("open");
      document.body.classList.add("modal-open");
      window.switchDashboardView(initialTab);
    }
  };

  window.closeAccountDashboard = function () {
    const modal = document.getElementById("accountDashboardBackdrop");
    if (modal) {
      modal.classList.remove("open");
      document.body.classList.remove("modal-open");
    }
  };

  window.switchDashboardView = function (view) {
    const tabOrders = document.getElementById("tabDashOrders");
    const tabProfile = document.getElementById("tabDashProfile");
    const tabAddresses = document.getElementById("tabDashAddresses");

    const viewOrders = document.getElementById("dashOrdersView");
    const viewProfile = document.getElementById("dashProfileView");
    const viewAddresses = document.getElementById("dashAddressesView");

    tabOrders?.classList.toggle("active", view === "orders");
    tabProfile?.classList.toggle("active", view === "profile");
    tabAddresses?.classList.toggle("active", view === "addresses");

    if (viewOrders) viewOrders.style.display = view === "orders" ? "block" : "none";
    if (viewProfile) viewProfile.style.display = view === "profile" ? "block" : "none";
    if (viewAddresses) viewAddresses.style.display = view === "addresses" ? "block" : "none";

    if (view === "orders") {
      fetchUserOrdersHistory();
    } else if (view === "addresses") {
      loadSavedDeliveryDetails();
    }
  };

  async function fetchUserOrdersHistory() {
    const loading = document.getElementById("dashOrdersLoading");
    const list = document.getElementById("dashOrdersList");

    if (loading) loading.style.display = "block";
    if (list) list.style.display = "none";

    if (db && currentUser) {
      try {
        const snap = await db.collection("orders")
          .where("firebaseUid", "==", currentUser.uid)
          .get();

        if (loading) loading.style.display = "none";

        if (!snap.empty) {
          const orders = [];
          snap.forEach(d => orders.push(d.data()));
          orders.sort((a, b) => (b.timestampMs || 0) - (a.timestampMs || 0));
          list.innerHTML = renderOrdersTimelineList(orders);
          list.style.display = "block";
          return;
        }
      } catch (err) {
        console.warn("Orders fetch notice:", err);
      }
    }

    if (loading) loading.style.display = "none";
    if (list) {
      list.innerHTML = `<div style="text-align:center; padding:2rem; color:#a0aec0;">No orders found yet. Select pure wood-pressed oils to order!</div>`;
      list.style.display = "block";
    }
  }

  function renderOrdersTimelineList(orders) {
    return orders.map((order) => {
      return `
        <div class="history-order-card" style="background:#1a202c; border:1px solid #2d3748; padding:1.2rem; border-radius:4px; margin-bottom:1rem;">
          <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #2d3748; padding-bottom:0.5rem; margin-bottom:0.6rem;">
            <strong>Order #${escapeHtml(order.orderRef)}</strong>
            <span style="color:#48bb78; font-weight:800; font-size:0.85rem;">₹${escapeHtml(order.grandTotal)}</span>
          </div>
          <div style="font-size:0.85rem; color:#cbd5e0; margin-bottom:0.5rem;">
            <strong>Items:</strong> ${escapeHtml(order.items)}
          </div>
          <div style="display:flex; justify-content:space-between; font-size:0.78rem; color:#a0aec0;">
            <span>Status: <strong style="color:#63b3ed;">${escapeHtml(order.orderStatus || "Placed")}</strong></span>
            <span>${escapeHtml(order.timestamp || "Recent")}</span>
          </div>
        </div>
      `;
    }).join("");
  }

  // ==========================================
  // 9. PRODUCT GRID & FLIPKART SPLIT DETAIL MODAL
  // ==========================================
  function renderProductsGrid() {
    const container = document.getElementById("productGridContainer");
    if (!container) return;
    container.innerHTML = "";

    Object.keys(PRODUCT_CATALOG).forEach((key) => {
      const p = PRODUCT_CATALOG[key];
      const defaultData = p.sizes["1L"];

      const card = document.createElement("div");
      card.className = "product-card";

      card.innerHTML = `
        <span class="card-badge">PURE CHEKKU</span>
        <div class="card-image-wrap" onclick="openProductDetailModal('${key}')">
          <img src="${p.img}" alt="${escapeHtml(p.name)}" onerror="this.src='https://placehold.co/300x320/1a202c/fff?text=Oil+Bottle'" />
        </div>
        <h3 class="card-title-clickable" onclick="openProductDetailModal('${key}')">${escapeHtml(p.name)} (1L)</h3>
        
        <div class="fk-rating-row">
          <span class="fk-rating-pill">★ ${p.rating}</span>
          <span class="fk-rating-count">${p.ratingCount}</span>
        </div>

        <div class="fk-pricing-row">
          <span class="fk-current-price">₹${defaultData.price}</span>
          <span class="fk-original-price">₹${defaultData.originalPrice}</span>
          <span class="fk-discount-percent">17% off</span>
        </div>

        <div class="fk-card-actions">
          <button type="button" class="btn-fk-yellow" onclick="handleDirectAdd('${defaultData.id}', '${escapeHtml(defaultData.title)}', ${defaultData.price}, '${p.img}')">
            ADD TO CART
          </button>
          <button type="button" class="btn-fk-orange" onclick="handleDirectBuyNow('${defaultData.id}', '${escapeHtml(defaultData.title)}', ${defaultData.price}, '${p.img}')">
            BUY NOW
          </button>
        </div>
      `;
      container.appendChild(card);
    });
  }

  window.openProductDetailModal = function (productKey) {
    if (productKey === "combo-3l") {
      const combo = COMBO_CATALOG["combo-3l"];
      window.handleDirectBuyNow(combo.id, combo.title, combo.price, combo.img);
      return;
    }

    currentDetailProductKey = productKey;
    currentDetailSelectedSize = "1L";

    const modal = document.getElementById("productDetailModalBackdrop");
    const body = document.getElementById("modalProductDetailBody");
    const p = PRODUCT_CATALOG[productKey];
    const sizeData = p.sizes[currentDetailSelectedSize];

    if (!modal || !body || !p) return;

    const thumbHTML = p.gallery.map((src, i) => `
      <img src="${src}" class="fk-thumb ${i === 0 ? 'active' : ''}" onclick="switchDetailMainImage('${src}', this)" alt="Thumb" />
    `).join("");

    body.innerHTML = `
      <div class="fk-detail-split">
        <div class="fk-gallery-col">
          <div class="fk-main-image-viewer">
            <img src="${p.gallery[0]}" id="fkDetailMainImg" alt="${escapeHtml(p.name)}" />
          </div>
          <div class="fk-thumbnail-row">
            ${thumbHTML}
          </div>
          <div class="fk-gallery-actions">
            <button type="button" class="btn-fk-yellow" onclick="handleDirectAdd('${sizeData.id}', '${escapeHtml(sizeData.title)}', ${sizeData.price}, '${p.img}')">
              ADD TO CART
            </button>
            <button type="button" class="btn-fk-orange" onclick="handleDirectBuyNow('${sizeData.id}', '${escapeHtml(sizeData.title)}', ${sizeData.price}, '${p.img}')">
              BUY NOW
            </button>
          </div>
        </div>

        <div class="fk-info-col">
          <h2 class="fk-title">${escapeHtml(p.name)}</h2>
          <div class="fk-rating-row">
            <span class="fk-rating-pill">★ ${p.rating}</span>
            <span class="fk-rating-count">${p.ratingCount} • Verified Bangalore Delivery</span>
          </div>
          <span class="fk-badge-special">Special Price</span>
          <div class="fk-pricing-row">
            <span class="fk-current-price" id="detailPriceVal">₹${sizeData.price}</span>
            <span class="fk-original-price" id="detailOrigPriceVal">₹${sizeData.originalPrice}</span>
            <span class="fk-discount-percent">Save ₹${sizeData.originalPrice - sizeData.price}</span>
          </div>

          <div class="fk-variant-box">
            <label>Select Size / Quantity:</label>
            <div class="fk-size-pills">
              <button type="button" class="fk-size-btn ${currentDetailSelectedSize === '1L' ? 'active' : ''}" onclick="selectModalVariantSize('1L')">1 Litre</button>
              <button type="button" class="fk-size-btn ${currentDetailSelectedSize === '500ml' ? 'active' : ''}" onclick="selectModalVariantSize('500ml')">500 ml</button>
            </div>
          </div>

          <div class="fk-offers-box">
            <h4>Available Offers</h4>
            <ul>
              <li>🏷️ <strong>Partner Offer:</strong> Claim 10% OFF on all repeat orders by scanning our physical bottle badge.</li>
              <li>🚚 <strong>Fast Doorstep Delivery:</strong> Free shipping across Bangalore on orders above ₹500.</li>
            </ul>
          </div>

          <p style="color:#cbd5e0; font-size:0.9rem; line-height:1.6; margin-bottom:1rem;">
            ${escapeHtml(p.shortDesc)}
          </p>

          <table class="fk-spec-table">
            <tbody>
              ${Object.entries(p.specs).map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;

    modal.classList.add("open");
    document.body.classList.add("modal-open");
  };

  window.closeProductDetailModal = function () {
    const modal = document.getElementById("productDetailModalBackdrop");
    if (modal) {
      modal.classList.remove("open");
      document.body.classList.remove("modal-open");
    }
  };

  window.switchDetailMainImage = function (src, el) {
    const mainImg = document.getElementById("fkDetailMainImg");
    if (mainImg) mainImg.src = src;
    document.querySelectorAll(".fk-thumb").forEach(t => t.classList.remove("active"));
    if (el) el.classList.add("active");
  };

  window.selectModalVariantSize = function (size) {
    currentDetailSelectedSize = size;
    const p = PRODUCT_CATALOG[currentDetailProductKey];
    if (!p) return;
    const sizeData = p.sizes[size];

    document.getElementById("detailPriceVal").textContent = `₹${sizeData.price}`;
    document.getElementById("detailOrigPriceVal").textContent = `₹${sizeData.originalPrice}`;

    document.querySelectorAll(".fk-size-btn").forEach(btn => {
      btn.classList.toggle("active", btn.textContent.includes(size));
    });
  };

  window.handleCatalogSearch = function (query) {
    const cleanQ = (query || "").toLowerCase().trim();
    const cards = document.querySelectorAll("#productGridContainer .product-card");
    cards.forEach(card => {
      const text = card.textContent.toLowerCase();
      card.style.display = text.includes(cleanQ) ? "flex" : "none";
    });
  };

  // ==========================================
  // 10. CART & CHECKOUT MANAGEMENT
  // ==========================================
  function saveCart() {
    localStorage.setItem("manopavana_cart", JSON.stringify(cart));
    renderCart();
  }

  window.openCart = function () {
    document.getElementById("cartDrawer")?.classList.add("open");
    document.getElementById("cartBackdrop")?.classList.add("open");
  };

  window.closeCart = function () {
    document.getElementById("cartDrawer")?.classList.remove("open");
    document.getElementById("cartBackdrop")?.classList.remove("open");
  };

  window.handleDirectAdd = function (id, title, price, img) {
    if (!isBangalorePincode) {
      window.openFlipkartModal();
      return;
    }
    const match = cart.find(i => i.id === id);
    if (match) {
      match.quantity += 1;
    } else {
      cart.push({ id, title, price: parseInt(price, 10), img, quantity: 1 });
    }
    saveCart();
    window.showActionToast("Added to Cart", `${title} added.`, "🛒", "success");
    window.openCart();
  };

  window.handleDirectBuyNow = function (id, title, price, img) {
    if (!isBangalorePincode) {
      window.openFlipkartModal();
      return;
    }
    checkoutSource = "buynow";
    buyNowItem = { id, title, price: parseInt(price, 10), quantity: 1, img };
    window.closeProductDetailModal();
    window.closeCart();
    promptLoginOrOpenCheckout();
  };

  window.handleDirectComboAdd = function () {
    const combo = COMBO_CATALOG[currentSelectedComboKey];
    window.handleDirectAdd(combo.id, combo.title, combo.price, combo.img);
  };

  window.handleDirectComboBuyNow = function () {
    const combo = COMBO_CATALOG[currentSelectedComboKey];
    window.handleDirectBuyNow(combo.id, combo.title, combo.price, combo.img);
  };

  window.selectComboVariant = function (key) {
    currentSelectedComboKey = key;
    const combo = COMBO_CATALOG[key];
    document.getElementById("comboCurrentPrice").textContent = `₹${combo.price}`;
    document.getElementById("comboOriginalPrice").textContent = `₹${combo.originalPrice}`;
    document.getElementById("btnCombo3L")?.classList.toggle("active", key === "combo-3l");
    document.getElementById("btnCombo15L")?.classList.toggle("active", key === "combo-15l");
  };

  window.updateQuantity = function (id, delta) {
    const item = cart.find(i => i.id === id);
    if (item) {
      item.quantity += delta;
      if (item.quantity <= 0) {
        cart = cart.filter(i => i.id !== id);
      }
    }
    saveCart();
  };

  function renderCart() {
    const totalCount = cart.reduce((s, i) => s + i.quantity, 0);
    const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);

    let discountAmount = 0;
    const isLoyal = bottleScanTimestampMs && (Date.now() - bottleScanTimestampMs < QR_EXPIRY_MS);
    if (isLoyal && subtotal > 0) {
      discountAmount = Math.round((subtotal * REORDER_DISCOUNT_PERCENT) / 100);
      document.getElementById("discountRow").style.display = "flex";
      document.getElementById("cartDiscount").textContent = `-₹${discountAmount}`;
    } else {
      document.getElementById("discountRow").style.display = "none";
    }

    const discounted = subtotal - discountAmount;
    const deliveryFee = totalCount > 0 ? (discounted >= FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_DELIVERY_FEE) : 0;
    const grandTotal = discounted + deliveryFee;

    document.getElementById("cartCountBadge").textContent = totalCount;
    document.getElementById("cartTotalItems").textContent = totalCount;
    document.getElementById("cartSubtotal").textContent = `₹${subtotal}`;
    document.getElementById("cartDeliveryCharge").textContent = deliveryFee === 0 ? "FREE" : `₹${deliveryFee}`;
    document.getElementById("cartGrandTotal").textContent = `₹${grandTotal}`;

    const list = document.getElementById("cartItemsList");
    if (!list) return;

    if (cart.length === 0) {
      list.innerHTML = `<div style="text-align:center; margin-top:3rem; color:#718096;">Your cart is empty.</div>`;
      return;
    }

    list.innerHTML = cart.map(i => `
      <div class="cart-item">
        <img src="${i.img}" class="cart-item-thumb" alt="${escapeHtml(i.title)}" />
        <div style="flex:1;">
          <div style="font-weight:600; font-size:0.85rem;">${escapeHtml(i.title)}</div>
          <div style="color:#eab308; font-size:0.85rem; font-weight:700;">₹${i.price}</div>
          <div style="display:flex; gap:0.5rem; align-items:center; margin-top:0.3rem;">
            <button onclick="updateQuantity('${i.id}', -1)" style="padding:2px 8px; background:#292524; color:#fafaf9; border:none; border-radius:4px; cursor:pointer;">-</button>
            <span style="font-weight:600;">${i.quantity}</span>
            <button onclick="updateQuantity('${i.id}', 1)" style="padding:2px 8px; background:#292524; color:#fafaf9; border:none; border-radius:4px; cursor:pointer;">+</button>
          </div>
        </div>
      </div>
    `).join("");
  }

  function promptLoginOrOpenCheckout() {
    if (!currentUser) {
      window.openAuthModal("login");
    } else {
      openCheckoutModalUI();
    }
  }

  function openCheckoutModalUI() {
    currentOrderRef = "MP_" + Date.now() + "_" + Math.floor(100 + Math.random() * 900);
    loadSavedDeliveryDetails();
    updateCheckoutFinancials();

    const modal = document.getElementById("checkoutModalBackdrop");
    if (modal) {
      modal.classList.add("open");
      document.body.classList.add("modal-open");
      setTimeout(() => { if (leafletMap) leafletMap.invalidateSize(); }, 300);
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
    const preview = document.getElementById("checkoutOrderPreview");
    if (!preview) return;

    const items = checkoutSource === "buynow" && buyNowItem ? [buyNowItem] : cart;
    const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
    const deliveryFee = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_DELIVERY_FEE;
    currentCalculatedGrandTotal = subtotal + deliveryFee;

    preview.innerHTML = `
      <div style="font-weight:700; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:0.4rem; margin-bottom:0.6rem;">
        ORDER SUMMARY (${items.length} Items)
      </div>
      <div>
        ${items.map(i => `<div style="display:flex; justify-content:space-between; font-size:0.85rem; margin-bottom:0.3rem;"><span>${i.title} (x${i.quantity})</span><span>₹${i.price * i.quantity}</span></div>`).join("")}
      </div>
      <div style="border-top:1px dashed rgba(255,255,255,0.1); padding-top:0.4rem; display:flex; justify-content:space-between; font-weight:800; color:#eab308;">
        <span>Total Payable</span>
        <span>₹${currentCalculatedGrandTotal}</span>
      </div>
    `;
  }

  async function handleCheckoutSubmission() {
    if (!currentUser) {
      promptLoginOrOpenCheckout();
      return;
    }

    const name = document.getElementById("custName")?.value.trim();
    const phone = document.getElementById("custPhone")?.value.trim();
    const address = document.getElementById("custAddress")?.value.trim();
    const city = document.getElementById("custCity")?.value.trim() || "Bengaluru";
    const pincode = document.getElementById("custPincode")?.value.trim();
    const state = document.getElementById("custState")?.value.trim() || "Karnataka";
    const district = document.getElementById("custDistrict")?.value.trim() || "Bengaluru Urban";
    const lat = document.getElementById("custLatitude")?.value || DEFAULT_BANGALORE_COORDS[0];
    const lng = document.getElementById("custLongitude")?.value || DEFAULT_BANGALORE_COORDS[1];
    const chkSave = document.getElementById("chkSaveAddress")?.checked;
    const errBox = document.getElementById("formError");

    if (!name || phone.length < 10 || !address || pincode.length !== 6) {
      if (errBox) { errBox.textContent = "Please fill in all mandatory address fields."; errBox.style.display = "block"; }
      return;
    }

    if (!pincode.startsWith("560")) {
      window.openFlipkartModal();
      return;
    }

    if (chkSave) {
      localStorage.setItem("manopavana_saved_delivery", JSON.stringify({
        name, phone, address, city, pincode, state, district, latitude: lat, longitude: lng
      }));
    }

    const paymentMode = document.getElementById("payPhonePe")?.checked ? "PHONEPE" : (document.getElementById("payCOD")?.checked ? "COD" : "WHATSAPP");
    const sanitizedOrderRef = currentOrderRef.replace(/[^a-zA-Z0-9_-]/g, "").substring(0, 35);
    const itemsSummary = (checkoutSource === "buynow" && buyNowItem ? [buyNowItem] : cart).map(i => `${i.title} (x${i.quantity})`).join(", ");

    const orderPayload = {
      orderRef: sanitizedOrderRef,
      firebaseUid: currentUser.uid,
      customerName: name,
      phone: phone,
      email: currentUser.email || "",
      address: `${address}, ${city}`,
      pincode: pincode,
      items: itemsSummary,
      grandTotal: currentCalculatedGrandTotal.toString(),
      paymentMode: paymentMode,
      orderStatus: paymentMode === "PHONEPE" ? "Payment Pending" : "Placed",
      timestamp: new Date().toLocaleDateString("en-IN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }),
      timestampMs: Date.now()
    };

    if (db) {
      try {
        await db.collection("orders").doc(sanitizedOrderRef).set(orderPayload);
      } catch (e) {
        console.warn("Firestore order sync warning:", e);
      }
    }

    if (paymentMode === "PHONEPE") {
      const response = await callBackend({
        action: "create_phonepe_order",
        orderRef: sanitizedOrderRef,
        firebaseUid: currentUser.uid,
        amount: currentCalculatedGrandTotal,
        name: name,
        phone: phone,
        redirectBaseUrl: window.location.origin + window.location.pathname
      });

      if (response && response.status === "SUCCESS" && response.redirectUrl) {
        window.location.href = response.redirectUrl;
      } else {
        alert("Unable to reach PhonePe gateway. Please choose Cash on Delivery.");
      }
    } else {
      window.closeCheckoutModal();
      if (checkoutSource === "cart") {
        cart = [];
        saveCart();
      }
      showOrderConfirmationModal({ orderRef: sanitizedOrderRef, paymentMode });
    }
  }

  function showOrderConfirmationModal(details) {
    const modal = document.getElementById("orderConfirmationModalBackdrop");
    const box = document.getElementById("confirmReceiptDetails");
    if (box) {
      box.innerHTML = `
        <div><strong>Order Reference:</strong> #${details.orderRef}</div>
        <div><strong>Payment Mode:</strong> ${details.paymentMode}</div>
        <div style="color:#48bb78; font-weight:700;">Delivering to Bangalore in 48–72 Hours</div>
      `;
    }
    if (modal) {
      modal.classList.add("open");
      document.body.classList.add("modal-open");
    }
  }

  window.closeOrderConfirmationModal = function () {
    document.getElementById("orderConfirmationModalBackdrop")?.classList.remove("open");
    document.body.classList.remove("modal-open");
  };

  window.openLiveTrackingFromConfirmation = function () {
    window.closeOrderConfirmationModal();
    window.openAccountDashboard("orders");
  };

  // ==========================================
  // 11. LEAFLET MAP & LOCATION INTEGRATION
  // ==========================================
  function initOrUpdateDeliveryMap(lat = DEFAULT_BANGALORE_COORDS[0], lng = DEFAULT_BANGALORE_COORDS[1]) {
    const el = document.getElementById("deliveryMap");
    if (!el || typeof L === "undefined") return;

    if (!leafletMap) {
      leafletMap = L.map("deliveryMap", { center: [lat, lng], zoom: 14, scrollWheelZoom: false });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(leafletMap);
      mapMarker = L.marker([lat, lng], { draggable: true }).addTo(leafletMap);
      mapMarker.on("dragend", (e) => {
        const p = e.target.getLatLng();
        setMapCoords(p.lat, p.lng);
        reverseGeocode(p.lat, p.lng);
      });
      leafletMap.on("click", (e) => {
        mapMarker.setLatLng(e.latlng);
        setMapCoords(e.latlng.lat, e.latlng.lng);
        reverseGeocode(e.latlng.lat, e.latlng.lng);
      });
    } else {
      leafletMap.setView([lat, lng], 14);
      if (mapMarker) mapMarker.setLatLng([lat, lng]);
    }
    setMapCoords(lat, lng);
    setTimeout(() => { if (leafletMap) leafletMap.invalidateSize(); }, 250);
  }

  function initOrUpdateOnboardingMap(lat = DEFAULT_BANGALORE_COORDS[0], lng = DEFAULT_BANGALORE_COORDS[1]) {
    const el = document.getElementById("onboardingMap");
    if (!el || typeof L === "undefined") return;

    if (!onboardingLeafletMap) {
      onboardingLeafletMap = L.map("onboardingMap", { center: [lat, lng], zoom: 14, scrollWheelZoom: false });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(onboardingLeafletMap);
      onboardingMapMarker = L.marker([lat, lng], { draggable: true }).addTo(onboardingLeafletMap);
      onboardingMapMarker.on("dragend", (e) => {
        const p = e.target.getLatLng();
        reverseGeocode(p.lat, p.lng);
      });
      onboardingLeafletMap.on("click", (e) => {
        onboardingMapMarker.setLatLng(e.latlng);
        reverseGeocode(e.latlng.lat, e.latlng.lng);
      });
    } else {
      onboardingLeafletMap.setView([lat, lng], 14);
      if (onboardingMapMarker) onboardingMapMarker.setLatLng([lat, lng]);
    }
    setTimeout(() => { if (onboardingLeafletMap) onboardingLeafletMap.invalidateSize(); }, 250);
  }

  function setMapCoords(lat, lng) {
    const latIn = document.getElementById("custLatitude");
    const lngIn = document.getElementById("custLongitude");
    const badge = document.getElementById("mapCoordsBadge");
    if (latIn) latIn.value = lat;
    if (lngIn) lngIn.value = lng;
    if (badge) badge.textContent = `GPS: ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }

  window.detectUserGeolocation = function (isOnboarding = false) {
    if (!navigator.geolocation) {
      window.showActionToast("Location Notice", "Geolocation not supported by browser.", "📍", "info");
      return;
    }

    navigator.geolocation.getCurrentPosition((pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      if (isOnboarding) {
        initOrUpdateOnboardingMap(lat, lng);
      } else {
        initOrUpdateDeliveryMap(lat, lng);
      }
      reverseGeocode(lat, lng);
      window.showActionToast("Location Found", "GPS doorstep pinned successfully.", "✅", "success");
    }, () => {
      window.showActionToast("Notice", "Could not fetch GPS. Please tap or drag marker on map.", "📍", "info");
    }, { timeout: 12000, enableHighAccuracy: false });
  };

  function reverseGeocode(lat, lng) {
    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
      .then(r => r.json())
      .then(d => {
        if (d && d.address) {
          const pin = d.address.postcode || "";
          if (pin && /^\d{6}$/.test(pin)) {
            userSelectedPincode = pin;
            isBangalorePincode = pin.startsWith("560");
            localStorage.setItem("manopavana_user_pincode", pin);
            updateLocationUI();
          }
          const addr = document.getElementById("custAddress");
          if (addr && !addr.value && d.display_name) {
            addr.value = d.display_name.split(",").slice(0, 3).join(", ");
          }
        }
      }).catch(() => {});
  }

  function loadSavedDeliveryDetails() {
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem("manopavana_saved_delivery")); } catch (e) {}
    
    const summaryCard = document.getElementById("savedAddressSummaryCard");
    const fieldsContainer = document.getElementById("deliveryFieldsContainer");
    const dashName = document.getElementById("dashAddrName");
    const dashText = document.getElementById("dashAddrText");
    const dashPhone = document.getElementById("dashAddrPhone");

    if (saved && saved.name && saved.address) {
      const nameEl = document.getElementById("savedAddrName");
      const textEl = document.getElementById("savedAddrText");
      const phoneEl = document.getElementById("savedAddrPhone");

      if (nameEl) nameEl.textContent = saved.name;
      if (textEl) textEl.textContent = `${saved.address}, ${saved.pincode}`;
      if (phoneEl) phoneEl.textContent = saved.phone;

      if (dashName) dashName.textContent = saved.name;
      if (dashText) dashText.textContent = `${saved.address}, ${saved.pincode}`;
      if (dashPhone) dashPhone.textContent = saved.phone;

      if (summaryCard) summaryCard.style.display = "block";
      if (fieldsContainer) fieldsContainer.style.display = "none";
      initOrUpdateDeliveryMap(saved.latitude || DEFAULT_BANGALORE_COORDS[0], saved.longitude || DEFAULT_BANGALORE_COORDS[1]);
    } else {
      if (summaryCard) summaryCard.style.display = "none";
      if (fieldsContainer) fieldsContainer.style.display = "block";
      initOrUpdateDeliveryMap();
    }
  }

  window.toggleEditAddress = function (showForm = true) {
    const summaryCard = document.getElementById("savedAddressSummaryCard");
    const fieldsContainer = document.getElementById("deliveryFieldsContainer");
    if (summaryCard) summaryCard.style.display = showForm ? "none" : "block";
    if (fieldsContainer) fieldsContainer.style.display = showForm ? "block" : "none";
    if (showForm && leafletMap) {
      setTimeout(() => leafletMap.invalidateSize(), 200);
    }
  };

  function updateLocationUI() {
    const headerLbl = document.getElementById("headerLocationLabel");
    const cartLbl = document.getElementById("cartDrawerLocLabel");
    if (headerLbl) headerLbl.innerHTML = `Deliver to: <strong>Bangalore (${userSelectedPincode})</strong>`;
    if (cartLbl) cartLbl.textContent = `Bangalore (${userSelectedPincode})`;
  }

  window.openLocationCheckModal = function () {
    const modal = document.getElementById("locationModalBackdrop");
    modal?.classList.add("open");
    document.body.classList.add("modal-open");
    setTimeout(() => initOrUpdateOnboardingMap(), 250);
  };

  window.closeLocationCheckModal = function () {
    document.getElementById("locationModalBackdrop")?.classList.remove("open");
    document.body.classList.remove("modal-open");
  };

  window.submitPincodeCheck = function () {
    const pin = document.getElementById("pincodeCheckInput")?.value.trim();
    if (/^\d{6}$/.test(pin)) {
      userSelectedPincode = pin;
      isBangalorePincode = pin.startsWith("560");
      localStorage.setItem("manopavana_user_pincode", pin);
      updateLocationUI();
      window.closeLocationCheckModal();
      window.showActionToast("Location Updated", `Deliveries set to ${pin}`, "📍", "success");
    }
  };

  // ==========================================
  // 12. BOTTLE CLAIM 10% DISCOUNT
  // ==========================================
  window.openBottleClaimModal = function () {
    document.getElementById("bottleQuizModalBackdrop")?.classList.add("open");
    document.body.classList.add("modal-open");
    window.selectOnboardingQuizBottle("groundnut");
  };

  window.closeBottleQuizModal = function () {
    document.getElementById("bottleQuizModalBackdrop")?.classList.remove("open");
    document.body.classList.remove("modal-open");
  };

  window.selectOnboardingQuizBottle = function (key) {
    selectedQuizBottleKey = key;
    const q = BOTTLE_QUIZ_POOLS[key][0];
    document.getElementById("onboardQuizHintText").textContent = q.hint;
    document.getElementById("onboardQuizQuestionText").textContent = q.question;

    const options = [
      { text: q.correct, correct: true },
      { text: "Chemically refined with industrial hexane solvents", correct: false },
      { text: "Blended with mineral liquid paraffin", correct: false }
    ].sort(() => Math.random() - 0.5);

    activeQuizData = { correct: q.correct };

    document.getElementById("onboardQuizOptionsContainer").innerHTML = options.map((opt, i) => `
      <label class="quiz-option-card" onclick="window.chooseQuizOpt('${escapeHtml(opt.text)}')">
        <input type="radio" name="bottleRadio" />
        <span>${escapeHtml(opt.text)}</span>
      </label>
    `).join("");
  };

  window.chooseQuizOpt = function (text) {
    selectedQuizOptionText = text;
  };

  window.submitOnboardingBottleQuiz = function () {
    if (selectedQuizOptionText === activeQuizData.correct) {
      bottleScanTimestampMs = Date.now();
      localStorage.setItem("manopavana_bottle_scan_time", bottleScanTimestampMs.toString());
      renderCart();
      window.closeBottleQuizModal();
      window.showActionToast("Discount Unlocked", "10% Bottle Reorder Discount Active!", "🎉", "success");
    } else {
      alert("Option does not match your physical bottle label.");
    }
  };

  window.openLegalModal = function (id) {
    document.getElementById(id)?.classList.add("open");
    document.body.classList.add("modal-open");
  };

  window.closeLegalModal = function (id) {
    document.getElementById(id)?.classList.remove("open");
    document.body.classList.remove("modal-open");
  };

  // ==========================================
  // 13. DOM INITIALIZATION
  // ==========================================
  document.addEventListener("DOMContentLoaded", () => {
    initFirebaseAuth();
    populateStatesDropdown();
    renderProductsGrid();
    renderCart();
    updateLocationUI();
    initVideoAutoplay();

    // Mobile Audio Autoplay Gestures
    document.getElementById("soundToggleBtn")?.addEventListener("click", toggleAudio);

    tryImmediateAudioPlayback();

    const enableAudioOnGesture = () => {
      if (!hasInteracted) {
        hasInteracted = true;
        tryImmediateAudioPlayback();
      }
      ["click", "touchend", "scroll", "touchstart"].forEach((e) =>
        window.removeEventListener(e, enableAudioOnGesture)
      );
    };
    ["click", "touchend", "scroll", "touchstart"].forEach((e) =>
      window.addEventListener(e, enableAudioOnGesture, { passive: true })
    );

    document.getElementById("openCartBtn")?.addEventListener("click", window.openCart);
    document.getElementById("closeCartBtn")?.addEventListener("click", window.closeCart);
    document.getElementById("cartBackdrop")?.addEventListener("click", window.closeCart);
    document.getElementById("openCheckoutModalBtn")?.addEventListener("click", promptLoginOrOpenCheckout);
    document.getElementById("closeModalBtn")?.addEventListener("click", window.closeCheckoutModal);
    document.getElementById("submitOrderBtn")?.addEventListener("click", handleCheckoutSubmission);

    // Reviews Submission
    document.getElementById("productReviewForm")?.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = document.getElementById("revName")?.value.trim();
      const product = document.getElementById("revProduct")?.value;
      const rating = document.getElementById("revRating")?.value;
      const location = document.getElementById("revLocation")?.value.trim() || "Bangalore";
      const comment = document.getElementById("revComment")?.value.trim();

      if (!name || !comment) return;

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
      e.target.reset();
      window.showActionToast("Review Submitted", "Thank you! Your feedback has been posted.", "✨", "success");
    });
  });
})();
