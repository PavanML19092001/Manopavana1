// ==========================================
// CONFIGURATION & CONSTANTS
// ==========================================
const R2_PUBLIC_BASE_URL = "https://pub-9e18bb265ecf4224ae1230cf913745ca.r2.dev";
const WHATSAPP_BUSINESS_NUMBER = "919180301917"; 
const FREE_SHIPPING_THRESHOLD = 500;
const STANDARD_DELIVERY_FEE = 49;
const REORDER_DISCOUNT_PERCENT = 10;
const QR_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000; // 30 Days
const ADMIN_PIN = "1234";

// Google Apps Script Web App Endpoint
const GOOGLE_SCRIPT_API_URL = "https://script.google.com/macros/s/AKfycbywg6x0ljh31_FyAwpaey3oJofB1uyQZj-9yB6j_FgURYtyX-BXtH5YjowuPTJHIspB/exec";

let countdownTimerInterval = null;
let currentCalculatedGrandTotal = 0;
let currentOrderRef = "";

let checkoutSource = "cart"; 
let buyNowItem = null;

// User Selected Delivery Pincode State (Default Bangalore)
let userSelectedPincode = localStorage.getItem("manopavana_user_pincode") || "560058";
let isBangalorePincode = userSelectedPincode.startsWith("560");

let activeBottleCode = localStorage.getItem("manopavana_bottle_code") || null;
let bottleScanTimestampMs = localStorage.getItem("manopavana_bottle_scan_time") 
  ? parseInt(localStorage.getItem("manopavana_bottle_scan_time"), 10) 
  : null;
let isLoyaltyActive = false;

// ==========================================
// 1. ALL-INDIA STATES & DISTRICTS
// ==========================================
const INDIA_STATES_AND_DISTRICTS = {
  "Karnataka": [
    "Bengaluru Urban", "Bengaluru Rural", "Bagalkote", "Ballari", "Belagavi", "Bidar", 
    "Chamarajanagara", "Chikkaballapura", "Chikkamagaluru", "Chitradurga", "Dakshina Kannada", 
    "Davanagere", "Dharwad", "Gadag", "Hassan", "Haveri", "Kalaburagi", "Kodagu", "Kolar", 
    "Koppal", "Mandya", "Mysuru", "Raichur", "Ramanagara", "Shivamogga", "Tumakuru", "Udupi", 
    "Uttara Kannada", "Vijayanagara", "Vijayapura", "Yadgir"
  ],
  "Tamil Nadu": [
    "Chennai", "Coimbatore", "Madurai", "Tiruchirappalli", "Salem", "Tiruppur", "Erode", 
    "Vellore", "Kanchipuram", "Chengalpattu", "Dindigul", "Tirunelveli", "Thanjavur", "Cuddalore"
  ],
  "Kerala": [
    "Thiruvananthapuram", "Ernakulam", "Kozhikode", "Thrissur", "Malappuram", "Palakkad", 
    "Kollam", "Alappuzha", "Kannur", "Kottayam", "Idukki", "Kasaragod", "Pathanamthitta", "Wayanad"
  ],
  "Andhra Pradesh": [
    "Visakhapatnam", "Vijayawada", "Guntur", "Nellore", "Kurnool", "Tirupati", "Kakinada", 
    "Rajahmundry", "Kadapa", "Anantapur", "Eluru", "Ongole"
  ],
  "Telangana": [
    "Hyderabad", "Warangal", "Nizamabad", "Karimnagar", "Khammam", "Ranga Reddy", 
    "Medchal-Malkajgiri", "Sangareddy", "Siddipet", "Mahabubnagar"
  ],
  "Maharashtra": [
    "Mumbai City", "Mumbai Suburban", "Pune", "Nagpur", "Thane", "Nashik", "Aurangabad", 
    "Solapur", "Kolhapur", "Amravati", "Navi Mumbai"
  ],
  "Delhi": [
    "Central Delhi", "New Delhi", "North Delhi", "South Delhi", "East Delhi", "West Delhi", 
    "North West Delhi", "South West Delhi"
  ],
  "Gujarat": [
    "Ahmedabad", "Surat", "Vadodara", "Rajkot", "Bhavnagar", "Jamnagar", "Gandhinagar", "Junagadh"
  ],
  "Rajasthan": [
    "Jaipur", "Jodhpur", "Udaipur", "Kota", "Bikaner", "Ajmer", "Alwar", "Bhilwara"
  ],
  "Uttar Pradesh": [
    "Lucknow", "Kanpur", "Varanasi", "Agra", "Noida", "Ghaziabad", "Prayagraj", "Meerut", "Bareilly"
  ],
  "West Bengal": [
    "Kolkata", "Howrah", "North 24 Parganas", "South 24 Parganas", "Darjeeling", "Hooghly"
  ],
  "Goa": ["North Goa", "South Goa"],
  "Punjab": ["Amritsar", "Ludhiana", "Jalandhar", "Patiala", "Bathinda", "Mohali"],
  "Haryana": ["Gurugram", "Faridabad", "Panipat", "Ambala", "Karnal", "Hisar"],
  "Bihar": ["Patna", "Gaya", "Bhagalpur", "Muzaffarpur", "Darbhanga"],
  "Madhya Pradesh": ["Bhopal", "Indore", "Gwalior", "Jabalpur", "Ujjain"],
  "Odisha": ["Bhubaneswar", "Cuttack", "Rourkela", "Puri", "Sambalpur"],
  "Assam": ["Guwahati", "Dibrugarh", "Silchar", "Jorhat", "Nagaon"],
  "Chhattisgarh": ["Raipur", "Bhilai", "Bilaspur", "Korba"],
  "Jharkhand": ["Ranchi", "Jamshedpur", "Dhanbad", "Bokaro"],
  "Uttarakhand": ["Dehradun", "Haridwar", "Nainital", "Rishikesh"],
  "Himachal Pradesh": ["Shimla", "Dharamshala", "Mandi", "Solan"],
  "Jammu and Kashmir": ["Srinagar", "Jammu", "Anantnag", "Baramulla"],
  "Chandigarh": ["Chandigarh"],
  "Puducherry": ["Puducherry", "Karaikal"]
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

  stateSelect.addEventListener("change", (e) => {
    populateDistrictsForState(e.target.value);
  });
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
// 2. UPFRONT LOCATION CONTROLLER
// ==========================================
window.openLocationCheckModal = function() {
  const modal = document.getElementById("locationModalBackdrop");
  const pinInput = document.getElementById("pincodeCheckInput");
  const resultBox = document.getElementById("pincodeCheckResultBox");
  if (!modal) return;

  if (pinInput) pinInput.value = userSelectedPincode;
  if (resultBox) resultBox.style.display = "none";
  modal.classList.add("open");
};

window.closeLocationCheckModal = function() {
  const modal = document.getElementById("locationModalBackdrop");
  if (modal) modal.classList.remove("open");
};

window.submitPincodeCheck = function() {
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
    resultBox.innerHTML = `<strong>✅ Delivering to Bangalore (${enteredPin})</strong>Fresh wood-pressed batch will be delivered to your doorstep in 48–72 hours from our Peenya mill. Free delivery on ₹500+ orders.`;
    resultBox.style.display = "block";
    setTimeout(() => {
      window.closeLocationCheckModal();
    }, 1400);
  } else {
    resultBox.className = "pincode-result-box warning";
    resultBox.innerHTML = `<strong>📍 Outside Bangalore (${enteredPin})</strong>Direct doorstep delivery from our Bangalore mill is currently exclusive to Bangalore (560xxx). Orders for your location are fulfilled quickly via our <strong>Official Flipkart Store (10% Off)</strong>.<br><br>
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

  if (custPin && !custPin.value) {
    custPin.value = userSelectedPincode;
  }

  if (isBangalorePincode) {
    if (headerLoc) headerLoc.innerHTML = `Deliver to: <strong>Bangalore (${userSelectedPincode})</strong>`;
    if (cartLoc) cartLoc.textContent = `Bangalore (${userSelectedPincode})`;
  } else {
    if (headerLoc) headerLoc.innerHTML = `Deliver to: <strong>${userSelectedPincode} (Flipkart Delivery)</strong>`;
    if (cartLoc) cartLoc.textContent = `${userSelectedPincode} (Flipkart)`;
  }

  renderProductsGrid();
  renderComboSection();
}

// ==========================================
// 3. AUDIO & VIDEO AUTOPLAY
// ==========================================
const heroVideo = document.getElementById("heroVideo");
const heroFallbackImage = document.getElementById("heroFallbackImage");
const heroBgAudio = document.getElementById("heroBgAudio");
const soundToggleBtn = document.getElementById("soundToggleBtn");
const soundIcon = document.getElementById("soundIcon");
const soundText = document.getElementById("soundText");

let isAudioPlaying = false;

function initVideoAutoplay() {
  if (!heroVideo) return;
  heroVideo.muted = true;
  heroVideo.loop = true;
  heroVideo.playsInline = true;

  const playPromise = heroVideo.play();
  if (playPromise !== undefined) {
    playPromise.catch(() => {
      if (heroFallbackImage) {
        heroVideo.style.display = "none";
        heroFallbackImage.style.display = "block";
      }
    });
  }
}

function startAudioPlayback() {
  if (!heroBgAudio || isAudioPlaying) return;
  heroBgAudio.volume = 1.0;
  
  const audioPromise = heroBgAudio.play();
  if (audioPromise !== undefined) {
    audioPromise.then(() => {
      isAudioPlaying = true;
      if (soundIcon) soundIcon.textContent = "🔊";
      if (soundText) soundText.textContent = "Sound On";
      if (soundToggleBtn) soundToggleBtn.classList.add("playing");
      detachAudioUnlockListeners();
    }).catch(() => {
      isAudioPlaying = false;
      if (soundIcon) soundIcon.textContent = "🔇";
      if (soundText) soundText.textContent = "Tap for Sound";
      if (soundToggleBtn) soundToggleBtn.classList.remove("playing");
    });
  }
}

function pauseAudioPlayback() {
  if (!heroBgAudio) return;
  heroBgAudio.pause();
  isAudioPlaying = false;
  if (soundIcon) soundIcon.textContent = "🔇";
  if (soundText) soundText.textContent = "Sound Off";
  if (soundToggleBtn) soundToggleBtn.classList.remove("playing");
}

const unlockEvents = ["scroll", "wheel", "touchstart", "touchmove", "pointerdown", "click", "keydown"];

function handleUserUnlock() {
  if (!isAudioPlaying) {
    startAudioPlayback();
  }
}

function attachAudioUnlockListeners() {
  unlockEvents.forEach((evt) => {
    window.addEventListener(evt, handleUserUnlock, { once: true, passive: true });
    document.addEventListener(evt, handleUserUnlock, { once: true, passive: true });
  });
}

function detachAudioUnlockListeners() {
  unlockEvents.forEach((evt) => {
    window.removeEventListener(evt, handleUserUnlock);
    document.removeEventListener(evt, handleUserUnlock);
  });
}

["DOMContentLoaded", "load", "pageshow"].forEach((loadEvent) => {
  window.addEventListener(loadEvent, () => {
    initVideoAutoplay();
    startAudioPlayback();
  });
});

attachAudioUnlockListeners();

if (soundToggleBtn) {
  soundToggleBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (isAudioPlaying) {
      pauseAudioPlayback();
    } else {
      startAudioPlayback();
    }
  });
}

const createGallery = (prefix, count = 11) =>
  Array.from({ length: count }, (_, i) => `${R2_PUBLIC_BASE_URL}/${prefix}-${i + 1}.png`);

// ==========================================
// 4. MASTER CATALOG & EXACT NUTRITION
// ==========================================
const PRODUCT_CATALOG = {
  groundnut: {
    id: "groundnut",
    name: "Wood-Pressed Groundnut Oil",
    badgeTheme: "theme-groundnut",
    bgClass: "oil-groundnut",
    img: `${R2_PUBLIC_BASE_URL}/groundnut-1.png`,
    gallery: createGallery("groundnut", 11),
    shortDesc: "Traditional single slow-press extraction using heavy wooden pestles (<45°C). Triple cotton cloth filtered with zero chemical bleaches, giving unadulterated nutty aroma and high smoke-point performance.",
    features: [
      { icon: "🌾", label: "Aroma", val: "Naturally Nutty" },
      { icon: "🫓", label: "Texture", val: "Light & Non-Sticky" },
      { icon: "🍳", label: "Cooking", val: "Absorbs Less" }
    ],
    specs: {
      "Extraction Method": "Traditional Wooden Marachekku (<45°C)",
      "Processing Type": "Unrefined, Unbleached & Non-Deodorized",
      "FSSAI License": "Reg. No. 21226008004689",
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
      { name: "Cholestral", val: "0.0 mg" },
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
    shortDesc: "Extracted from 100% sulfur-free, sun-dried copra. Packed with natural medium-chain fatty acids (MCTs). 100% edible-grade with unrefined natural coconut fragrance.",
    features: [
      { icon: "🥥", label: "Aroma", val: "Fresh Copra Scent" },
      { icon: "✨", label: "Extraction", val: "Slow Wood Chekku" },
      { icon: "🌿", label: "Usage", val: "Edible & Multi-Use" }
    ],
    specs: {
      "Extraction Method": "Traditional Wood Chekku (<40°C)",
      "Processing Type": "Raw, Unrefined & Natural Settling",
      "FSSAI License": "Reg. No. 21226008004689",
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
      { name: "Cholestral", val: "0.0 mg" },
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
    shortDesc: "Authentic wood-pressed Gingelly oil extracted with natural palm jaggery to harmonize the deep nutty bite. Rich in Sesamol antioxidants, zinc, and heart-healthy unsaturated lipids.",
    features: [
      { icon: "🍯", label: "Aroma", val: "Chekku Scent" },
      { icon: "🪵", label: "Process", val: "Slow Crushed" },
      { icon: "☀", label: "Quality", val: "Unrefined Extraction" }
    ],
    specs: {
      "Extraction Method": "Slow Wooden Press with Palm Jaggery",
      "Processing Type": "Unbleached, Natural Cloth Filtration",
      "FSSAI License": "Reg. No. 21226008004689",
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
      { name: "Cholestral", val: "0.0 mg" },
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
    descText: "Equip your kitchen with South India's 3 core traditional wood-pressed oils. Includes brand-new sealed 1L Groundnut Oil (₹399), 1L Coconut Oil (₹499), and 1L Sesame Oil (₹499).",
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
    descText: "Compact starter box containing 500ml Groundnut Oil (₹189), 500ml Coconut Oil (₹269), and 500ml Sesame Oil (₹269).",
    price: 699,
    originalPrice: 727,
    qrPrice: 629,
    img: `${R2_PUBLIC_BASE_URL}/combo-all-labels.jpg`
  }
};

let currentSelectedComboKey = "combo-3l";
let cart = JSON.parse(localStorage.getItem("manopavana_cart")) || [];

let currentDetailProductKey = null;
let currentDetailSelectedSize = "1L";

// DOM Elements
const productGridContainer = document.getElementById("productGridContainer");
const productDetailModalBackdrop = document.getElementById("productDetailModalBackdrop");
const closeDetailModalBtn = document.getElementById("closeDetailModalBtn");
const modalProductHeaderTitle = document.getElementById("modalProductHeaderTitle");
const modalProductDetailBody = document.getElementById("modalProductDetailBody");

const cartDrawer = document.getElementById("cartDrawer");
const cartBackdrop = document.getElementById("cartBackdrop");
const openCartBtn = document.getElementById("openCartBtn");
const closeCartBtn = document.getElementById("closeCartBtn");
const cartItemsList = document.getElementById("cartItemsList");
const cartCountBadge = document.getElementById("cartCountBadge");
const cartTotalItems = document.getElementById("cartTotalItems");
const cartSubtotal = document.getElementById("cartSubtotal");
const discountRow = document.getElementById("discountRow");
const cartDiscount = document.getElementById("cartDiscount");
const cartDeliveryCharge = document.getElementById("cartDeliveryCharge");
const cartGrandTotal = document.getElementById("cartGrandTotal");
const shippingNote = document.getElementById("shippingNote");
const openCheckoutModalBtn = document.getElementById("openCheckoutModalBtn");

const checkoutModalBackdrop = document.getElementById("checkoutModalBackdrop");
const closeModalBtn = document.getElementById("closeModalBtn");
const submitOrderBtn = document.getElementById("submitOrderBtn");
const formError = document.getElementById("formError");
const modalCheckoutTitle = document.getElementById("modalCheckoutTitle");
const checkoutOrderPreview = document.getElementById("checkoutOrderPreview");

const payPhonePeRadio = document.getElementById("payPhonePe");
const payCODRadio = document.getElementById("payCOD");
const payWhatsAppRadio = document.getElementById("payWhatsApp");
const labelPayPhonePe = document.getElementById("labelPayPhonePe");
const labelPayCOD = document.getElementById("labelPayCOD");
const labelPayWhatsApp = document.getElementById("labelPayWhatsApp");
const phonepePaymentInfoBox = document.getElementById("phonepePaymentInfoBox");

// ==========================================
// 5. BACKEND API JSONP WRAPPER
// ==========================================
function callBackend(params) {
  return new Promise((resolve, reject) => {
    const callbackName = "jsonp_cb_" + Math.round(100000 * Math.random());
    let script = null;

    window[callbackName] = function (data) {
      delete window[callbackName];
      if (script && script.parentNode) script.parentNode.removeChild(script);
      resolve(data);
    };

    const queryString = Object.keys(params)
      .map((key) => encodeURIComponent(key) + "=" + encodeURIComponent(params[key]))
      .join("&");

    script = document.createElement("script");
    script.src = `${GOOGLE_SCRIPT_API_URL}?${queryString}&callback=${callbackName}`;
    script.onerror = function () {
      delete window[callbackName];
      if (script && script.parentNode) script.parentNode.removeChild(script);
      reject(new Error("Unable to connect to Google Sheets backend. Verify deployment URL."));
    };

    document.body.appendChild(script);
  });
}

// ==========================================
// 6. RANDOMIZED BOTTLE LABEL QUIZ POOL
// ==========================================
const BOTTLE_QUIZ_POOLS = {
  groundnut: [
    {
      hint: "Look at the front label right below 'GROUNDNUT OIL':",
      question: "What tagline is printed right below 'GROUNDNUT OIL' on the front label?",
      options: [
        { text: "Perfect for Everyday Indian Cooking", correct: true },
        { text: "The Traditional Choice for Rich Flavour", correct: false },
        { text: "Made for Authentic Flavours", correct: false }
      ]
    },
    {
      hint: "Look at the nutrition table on the back label:",
      question: "What is the Energy value (per 100g) printed on the back label?",
      options: [
        { text: "862.1 Kcal", correct: true },
        { text: "884.3 Kcal", correct: false },
        { text: "910.0 Kcal", correct: false }
      ]
    },
    {
      hint: "Look at the bottom-right of the back label under 'PACKED & MARKETED BY':",
      question: "What is the FSSAI registration number printed on the back label?",
      options: [
        { text: "21226008004689", correct: true },
        { text: "11221004001234", correct: false },
        { text: "21224005009876", correct: false }
      ]
    }
  ],
  coconut: [
    {
      hint: "Look at the front label right below 'COCONUT OIL':",
      question: "What tagline is printed right below 'COCONUT OIL' on the front label?",
      options: [
        { text: "Made for Authentic Flavours", correct: true },
        { text: "Perfect for Everyday Indian Cooking", correct: false },
        { text: "The Traditional Choice for Rich Flavour", correct: false }
      ]
    },
    {
      hint: "Look at the top panel on the back label titled 'THE MANOPAVANA STANDARD':",
      question: "What does Pillar 2 ('CRAFT') specify on the back label?",
      options: [
        { text: "Slow Wood Pressed (Milled gently without heat)", correct: true },
        { text: "High-Heat Expeller Pressed", correct: false },
        { text: "Solvent Chemical Refined", correct: false }
      ]
    },
    {
      hint: "Look at the vertical strip on the left edge of the front label:",
      question: "What extraction method is printed on the vertical black side banner?",
      options: [
        { text: "Traditional Marachekku Extraction", correct: true },
        { text: "Centrifugal Machine Separation", correct: false },
        { text: "Double Filtered Solvent Extraction", correct: false }
      ]
    }
  ],
  sesame: [
    {
      hint: "Look at the front label right below 'SESAME OIL':",
      question: "What tagline is printed right below 'SESAME OIL' on the front label?",
      options: [
        { text: "The Traditional Choice for Rich Flavour", correct: true },
        { text: "Made for Authentic Flavours", correct: false },
        { text: "Perfect for Everyday Indian Cooking", correct: false }
      ]
    },
    {
      hint: "Look at the nutrition table on the back label:",
      question: "According to the back nutrition panel, what is the Energy per 100g?",
      options: [
        { text: "884.3 Kcal", correct: true },
        { text: "862.1 Kcal", correct: false },
        { text: "790.5 Kcal", correct: false }
      ]
    },
    {
      hint: "Look at the vertical strip on the right edge of the front label:",
      question: "What purity guarantee is printed on the right vertical banner?",
      options: [
        { text: "No Chemicals and Preservatives", correct: true },
        { text: "Added Artificial Aromas", correct: false },
        { text: "Contains Added Liquid Paraffin", correct: false }
      ]
    }
  ]
};

let selectedQuizBottleKey = "groundnut";
let currentActiveQuizQuestion = null;
let selectedQuizOptionIndex = null;

function initLoyaltyFromStorage() {
  const storedTime = localStorage.getItem("manopavana_bottle_scan_time");
  if (storedTime) {
    const elapsed = Date.now() - parseInt(storedTime, 10);
    if (elapsed < QR_EXPIRY_MS) {
      isLoyaltyActive = true;
      bottleScanTimestampMs = parseInt(storedTime, 10);
      activeBottleCode = localStorage.getItem("manopavana_bottle_code") || "VERIFIED_BOTTLE";
      startLiveCountdown();
    } else {
      window.clearLoyaltyDiscount();
    }
  }
}

function isLoyaltyDiscountValid() {
  if (!bottleScanTimestampMs) return false;
  return (Date.now() - bottleScanTimestampMs) < QR_EXPIRY_MS;
}

window.clearLoyaltyDiscount = function() {
  activeBottleCode = null;
  bottleScanTimestampMs = null;
  isLoyaltyActive = false;
  localStorage.removeItem("manopavana_bottle_code");
  localStorage.removeItem("manopavana_bottle_scan_time");
  renderCart();
  startLiveCountdown();
  renderComboSection();
};

function showLoyaltyToast() {
  const rewardToast = document.getElementById("rewardToast");
  if (rewardToast) {
    rewardToast.classList.add("show");
    setTimeout(() => rewardToast.classList.remove("show"), 6500);
  }
}

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
      const days = Math.floor(totalSeconds / (24 * 3600));
      const hours = Math.floor((totalSeconds % (24 * 3600)) / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      const formattedTime = `${days}d ${String(hours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}m ${String(seconds).padStart(2, "0")}s`;

      announcementText.innerHTML = `🏷️ <strong>Bottle Scan Verified:</strong> 10% Loyalty Discount Active! <span class="countdown-pill">⏱ ${formattedTime}</span>`;
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

window.openBottleClaimModal = function () {
  const modal = document.getElementById("bottleClaimModalBackdrop");
  const alreadyBox = document.getElementById("alreadyClaimedBox");
  const quizBox = document.getElementById("quizVerificationBox");

  if (!modal) return;

  if (isLoyaltyDiscountValid()) {
    if (alreadyBox) alreadyBox.style.display = "block";
    if (quizBox) quizBox.style.display = "none";
    updateClaimedRemainingText();
  } else {
    if (alreadyBox) alreadyBox.style.display = "none";
    if (quizBox) quizBox.style.display = "block";
    window.selectQuizBottle(selectedQuizBottleKey);
  }

  modal.classList.add("open");
};

window.closeBottleClaimModal = function () {
  const modal = document.getElementById("bottleClaimModalBackdrop");
  if (modal) modal.classList.remove("open");
  const feedback = document.getElementById("quizFeedbackBox");
  if (feedback) feedback.style.display = "none";
};

function updateClaimedRemainingText() {
  const textEl = document.getElementById("claimedRemainingText");
  if (!textEl || !bottleScanTimestampMs) return;

  const remainingMs = Math.max(0, QR_EXPIRY_MS - (Date.now() - bottleScanTimestampMs));
  const totalSeconds = Math.floor(remainingMs / 1000);
  const days = Math.floor(totalSeconds / (24 * 3600));
  const hours = Math.floor((totalSeconds % (24 * 3600)) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  textEl.textContent = `${days} days, ${hours} hours and ${minutes} mins remaining`;
}

window.selectQuizBottle = function (bottleKey) {
  selectedQuizBottleKey = bottleKey;
  selectedQuizOptionIndex = null;

  document.querySelectorAll(".quiz-bottle-pill").forEach((pill) => pill.classList.remove("active"));
  const activePill = document.getElementById("pill" + bottleKey.charAt(0).toUpperCase() + bottleKey.slice(1));
  if (activePill) activePill.classList.add("active");

  const pool = BOTTLE_QUIZ_POOLS[bottleKey];
  const randomIndex = Math.floor(Math.random() * pool.length);
  currentActiveQuizQuestion = pool[randomIndex];

  const hintEl = document.getElementById("quizHintText");
  const questionEl = document.getElementById("quizQuestionText");
  const optionsContainer = document.getElementById("quizOptionsContainer");
  const feedback = document.getElementById("quizFeedbackBox");

  if (feedback) feedback.style.display = "none";
  if (hintEl) hintEl.textContent = currentActiveQuizQuestion.hint;
  if (questionEl) questionEl.textContent = currentActiveQuizQuestion.question;

  if (optionsContainer) {
    optionsContainer.innerHTML = currentActiveQuizQuestion.options
      .map((opt, idx) => `
        <label class="quiz-option-card" id="quizOptionLabel_${idx}" onclick="selectQuizOption(${idx})">
          <input type="radio" name="bottleQuizChoice" value="${idx}" />
          <span>${opt.text}</span>
        </label>
      `)
      .join("");
  }
};

window.selectQuizOption = function (idx) {
  selectedQuizOptionIndex = idx;
  document.querySelectorAll(".quiz-option-card").forEach((card, i) => {
    card.classList.toggle("selected", i === idx);
  });
};

window.submitBottleLabelQuiz = function () {
  if (isLoyaltyDiscountValid()) {
    window.openBottleClaimModal();
    return;
  }

  const feedback = document.getElementById("quizFeedbackBox");
  if (selectedQuizOptionIndex === null) {
    if (feedback) {
      feedback.className = "quiz-feedback-box error";
      feedback.textContent = "Please select one of the options from your bottle label.";
      feedback.style.display = "block";
    }
    return;
  }

  const isCorrect = currentActiveQuizQuestion.options[selectedQuizOptionIndex].correct;

  if (isCorrect) {
    const selCard = document.getElementById("quizOptionLabel_" + selectedQuizOptionIndex);
    if (selCard) selCard.classList.add("is-correct");

    if (feedback) {
      feedback.className = "quiz-feedback-box success";
      feedback.innerHTML = "✅ <strong>Label Verified!</strong> 10% Loyalty discount is now active for 30 days.";
      feedback.style.display = "block";
    }

    activeBottleCode = `VERIFIED_${selectedQuizBottleKey.toUpperCase()}_BOTTLE`;
    bottleScanTimestampMs = Date.now();
    isLoyaltyActive = true;

    localStorage.setItem("manopavana_bottle_code", activeBottleCode);
    localStorage.setItem("manopavana_bottle_scan_time", bottleScanTimestampMs.toString());

    showLoyaltyToast();
    renderCart();
    startLiveCountdown();
    renderComboSection();

    const submitBtn = document.getElementById("btnSubmitQuiz");
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Discount Activated ✨";
    }

    setTimeout(() => {
      window.closeBottleClaimModal();
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Verify & Unlock 10% Discount ⚡";
      }
    }, 1800);

  } else {
    const selCard = document.getElementById("quizOptionLabel_" + selectedQuizOptionIndex);
    if (selCard) selCard.classList.add("is-wrong");

    if (feedback) {
      feedback.className = "quiz-feedback-box error";
      feedback.textContent = "❌ That doesn't match the bottle label. Please inspect your MANOPAVANA bottle and try again!";
      feedback.style.display = "block";
    }
  }
};

// ==========================================
// 7. PRODUCTS & DUAL COMBO RENDERING
// ==========================================
function getCartItemQuantity(itemId) {
  const item = cart.find((i) => i.id === itemId);
  return item ? item.quantity : 0;
}

function renderStepperButtonHTML(id, title, price, img, quantity) {
  // If user selected non-Bangalore location upfront, route immediately to Flipkart
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
        <button class="stepper-btn" onclick="updateQuantity('${id}', -1)" type="button" aria-label="Decrease quantity">−</button>
        <span class="stepper-value">${quantity}</span>
        <button class="stepper-btn" onclick="updateQuantity('${id}', 1)" type="button" aria-label="Increase quantity">+</button>
      </div>
    `;
  }

  return `
    <button class="btn-buy" 
      onclick="handleDirectAdd('${id}', '${escapeHtml(title)}', ${price}, '${img}')" 
      type="button">
      Add to Bag
    </button>
  `;
}

function renderProductsGrid() {
  if (!productGridContainer) return;
  productGridContainer.innerHTML = "";

  Object.keys(PRODUCT_CATALOG).forEach((key) => {
    const product = PRODUCT_CATALOG[key];
    const defaultData = product.sizes["1L"];
    const currentQty = getCartItemQuantity(defaultData.id);

    const card = document.createElement("div");
    card.className = `product-card ${product.badgeTheme}`;
    card.id = `card-${product.id}`;

    const featuresHTML = product.features
      .map((f) => `<li>${f.icon} <strong>${f.label}:</strong> ${f.val}</li>`)
      .join("");

    card.innerHTML = `
      <span class="card-badge">Wood Pressed</span>
      <div class="card-image-wrap ${product.bgClass}" onclick="openProductDetailModal('${key}')">
        <img src="${product.img}" alt="${product.name}" class="product-img" onerror="this.src='https://placehold.co/200x260/171412/eab308?text=Oil'" />
        <span class="card-quick-hint">Tap for More Details</span>
      </div>
      <div class="card-content">
        <h3 class="card-title-clickable" onclick="openProductDetailModal('${key}')">${product.name}</h3>
        <ul class="product-feature-list">
          ${featuresHTML}
        </ul>
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

    productGridContainer.appendChild(card);
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
    if (currentSelectedComboKey === "combo-3l") {
      btnCombo3L.classList.add("active");
      btnCombo15L.classList.remove("active");
    } else {
      btnCombo15L.classList.add("active");
      btnCombo3L.classList.remove("active");
    }
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
      btnComboBuyNowDirect.onclick = function() { window.open("https://www.flipkart.com", "_blank"); };
    } else {
      btnComboBuyNowDirect.innerHTML = `⚡ Buy Now`;
      btnComboBuyNowDirect.onclick = window.handleDirectComboBuyNow;
    }
  }
}

window.selectComboVariant = function(comboKey) {
  currentSelectedComboKey = comboKey;
  renderComboSection();
};

window.handleDirectComboBuyNow = function() {
  if (!isBangalorePincode) {
    window.open("https://www.flipkart.com", "_blank");
    return;
  }
  const currentCombo = COMBO_CATALOG[currentSelectedComboKey];
  window.handleDirectBuyNow(currentCombo.id, currentCombo.title, currentCombo.price, currentCombo.img);
};

// ==========================================
// 8. PRODUCT DETAIL MODAL
// ==========================================
window.openProductDetailModal = function(productKey) {
  const product = PRODUCT_CATALOG[productKey];
  if (!product) return;

  currentDetailProductKey = productKey;
  currentDetailSelectedSize = "1L";

  if (modalProductHeaderTitle) {
    modalProductHeaderTitle.textContent = `${product.name} Details`;
  }

  renderProductDetailModalContent();

  if (productDetailModalBackdrop) {
    productDetailModalBackdrop.classList.add("open");
    document.body.style.overflow = "hidden";
  }
};

window.closeProductDetailModal = function() {
  if (productDetailModalBackdrop) {
    productDetailModalBackdrop.classList.remove("open");
    document.body.style.overflow = "";
  }
  currentDetailProductKey = null;
};

if (closeDetailModalBtn) {
  closeDetailModalBtn.addEventListener("click", window.closeProductDetailModal);
}

if (productDetailModalBackdrop) {
  productDetailModalBackdrop.addEventListener("click", (e) => {
    if (e.target === productDetailModalBackdrop) {
      window.closeProductDetailModal();
    }
  });
}

window.selectModalVariantSize = function(sizeKey) {
  currentDetailSelectedSize = sizeKey;
  renderProductDetailModalContent();
};

function renderProductDetailModalContent() {
  if (!currentDetailProductKey || !modalProductDetailBody) return;
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
    .map(
      (imgSrc, idx) => `
      <img src="${imgSrc}" class="detail-thumb-img ${idx === 0 ? "active" : ""}" 
        onclick="switchDetailMainImage('${imgSrc}', this)" alt="Thumbnail" />
    `
    )
    .join("");

  modalProductDetailBody.innerHTML = `
    <div class="detail-top-grid">
      <div class="detail-gallery">
        <div class="detail-main-img-box">
          <img src="${product.gallery[0]}" class="detail-main-img" id="detailMainImg" alt="${product.name}" />
        </div>
        <div class="detail-thumb-strip">
          ${thumbnailsHTML}
        </div>
      </div>

      <div class="detail-info-col">
        <span class="detail-badge-pill">🌿 Wood-Pressed • Lab Tested</span>
        <h2 class="detail-title">${product.name}</h2>
        <p class="detail-short-desc">${product.shortDesc}</p>

        <div class="modal-variant-wrap">
          <span class="modal-variant-label">Choose Volume / Bottle Size:</span>
          <div class="modal-variant-pills">
            <button type="button" class="modal-size-pill ${currentDetailSelectedSize === "1L" ? "active" : ""}" 
              onclick="selectModalVariantSize('1L')">
              1 Litre (₹${product.sizes["1L"].price})
            </button>
            <button type="button" class="modal-size-pill ${currentDetailSelectedSize === "500ml" ? "active" : ""}" 
              onclick="selectModalVariantSize('500ml')">
              500 ml (₹${product.sizes["500ml"].price})
            </button>
          </div>
        </div>

        <div class="modal-action-row">
          <div>
            <span class="price-sub">Payable Price:</span>
            <div class="modal-price-val">₹${selectedSizeData.price}</div>
          </div>
          <div class="stepper-wrap-inline" id="stepper-container-modal-${selectedSizeData.id}">
            ${renderStepperButtonHTML(selectedSizeData.id, selectedSizeData.title, selectedSizeData.price, product.img, currentQty)}
          </div>
        </div>

        <div class="modal-direct-buy-wrap">
          ${isBangalorePincode ? `
            <button type="button" class="btn-direct-buy-now" onclick="handleDirectBuyNow('${selectedSizeData.id}', '${escapeHtml(selectedSizeData.title)}', ${selectedSizeData.price}, '${product.img}')">
              ⚡ Buy Now — Proceed to Delivery
            </button>
          ` : `
            <a href="https://www.flipkart.com" target="_blank" rel="noopener noreferrer" class="btn-continue-flipkart">
              🛒 Order this on Flipkart (10% Off) &rarr;
            </a>
          `}
        </div>

        <div class="modal-trust-strip">
          <div class="trust-badge-pill">
            <span class="trust-icon">🪵</span>
            <div>
              <strong>Chekku Cold Press</strong>
              <small>Crushed &lt; 45°C</small>
            </div>
          </div>
          <div class="trust-badge-pill">
            <span class="trust-icon">🧪</span>
            <div>
              <strong>0% Chemicals</strong>
              <small>No Hexane / Solvents</small>
            </div>
          </div>
          <div class="trust-badge-pill">
            <span class="trust-icon">🚚</span>
            <div>
              <strong>Free Delivery</strong>
              <small>Orders ₹500+ / 48–72h</small>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="detail-spec-box">
      <h4>Authenticity &amp; Extraction Specifications</h4>
      <table class="specs-table-grid">
        <tbody>
          ${specRows}
        </tbody>
      </table>
    </div>

    <div class="detail-spec-box">
      <h4>Nutritional Breakdown (Approx. per 100g)</h4>
      <div class="detail-nutrition-grid">
        ${nutritionBoxes}
      </div>
    </div>
  `;
}

window.switchDetailMainImage = function (src, thumbEl) {
  const mainImg = document.getElementById("detailMainImg");
  if (mainImg) mainImg.src = src;

  document.querySelectorAll(".detail-thumb-img").forEach((el) => el.classList.remove("active"));
  if (thumbEl) thumbEl.classList.add("active");
};

// ==========================================
// 9. UNIFIED CHECKOUT MODAL LOGIC
// ==========================================
window.handleDirectBuyNow = function(id, title, price, img) {
  if (!isBangalorePincode) {
    window.open("https://www.flipkart.com", "_blank");
    return;
  }
  checkoutSource = "buynow";
  buyNowItem = {
    id: id,
    title: title,
    price: parseInt(price, 10),
    quantity: 1,
    img: img
  };

  window.closeProductDetailModal();
  openCheckoutModalUI();
};

function openCartCheckout() {
  if (!cart || cart.length === 0) {
    alert("Please add at least one bottle to your bag first!");
    return;
  }
  if (!isBangalorePincode) {
    window.openFlipkartModal();
    return;
  }
  checkoutSource = "cart";
  buyNowItem = null;
  closeCart();
  openCheckoutModalUI();
}

function openCheckoutModalUI() {
  currentOrderRef = "MP" + Math.floor(1000 + Math.random() * 9000);

  if (modalCheckoutTitle) {
    modalCheckoutTitle.textContent = checkoutSource === "buynow" 
      ? `Delivery & Payment: ${buyNowItem.title}` 
      : "Delivery & Payment Details";
  }

  updateCheckoutFinancials();
  updatePaymentModeUI();

  if (checkoutModalBackdrop) {
    checkoutModalBackdrop.classList.add("open");
  }
}

window.closeCheckoutModal = function() {
  if (checkoutModalBackdrop) {
    checkoutModalBackdrop.classList.remove("open");
  }
};

if (openCheckoutModalBtn) {
  openCheckoutModalBtn.addEventListener("click", openCartCheckout);
}

if (closeModalBtn) {
  closeModalBtn.addEventListener("click", window.closeCheckoutModal);
}

if (checkoutModalBackdrop) {
  checkoutModalBackdrop.addEventListener("click", (e) => {
    if (e.target === checkoutModalBackdrop) {
      window.closeCheckoutModal();
    }
  });
}

function updateCheckoutFinancials() {
  let subtotal = 0;
  let itemsCount = 0;
  let previewHTML = "";

  if (checkoutSource === "buynow" && buyNowItem) {
    subtotal = buyNowItem.price * buyNowItem.quantity;
    itemsCount = buyNowItem.quantity;
    previewHTML = `
      <div class="checkout-preview-item">
        <img src="${buyNowItem.img}" class="checkout-preview-thumb" alt="${buyNowItem.title}" onerror="this.src='https://placehold.co/50x60/171412/eab308?text=Bottle'" />
        <div class="checkout-preview-info">
          <strong>${buyNowItem.title}</strong>
          <span>Qty: 1 × ₹${buyNowItem.price}</span>
        </div>
        <div class="checkout-preview-cost">₹${buyNowItem.price}</div>
      </div>
    `;
  } else {
    subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    itemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    previewHTML = cart.map(item => `
      <div class="checkout-preview-item">
        <img src="${item.img}" class="checkout-preview-thumb" alt="${item.title}" onerror="this.src='https://placehold.co/50x60/171412/eab308?text=Bottle'" />
        <div class="checkout-preview-info">
          <strong>${item.title}</strong>
          <span>Qty: ${item.quantity} × ₹${item.price}</span>
        </div>
        <div class="checkout-preview-cost">₹${(item.price * item.quantity).toLocaleString("en-IN")}</div>
      </div>
    `).join("");
  }

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
  const grandTotal = discountedSubtotal + deliveryFee;
  currentCalculatedGrandTotal = grandTotal;

  if (checkoutOrderPreview) {
    checkoutOrderPreview.innerHTML = `
      <div class="checkout-preview-header">
        <span>Order Item(s) (${itemsCount})</span>
        <span>Subtotal: ₹${subtotal.toLocaleString("en-IN")}</span>
      </div>
      <div class="checkout-preview-list">${previewHTML}</div>
      <div class="checkout-preview-footer">
        ${discountAmount > 0 ? `<div class="checkout-row discount-text"><span>Bottle QR Loyalty (10%):</span><span>-₹${discountAmount.toLocaleString("en-IN")}</span></div>` : ""}
        <div class="checkout-row"><span>Delivery:</span><span>${deliveryFee === 0 ? '<strong class="free-tag">FREE</strong>' : `₹${deliveryFee}`}</span></div>
        <div class="checkout-row total-highlight"><span>Total Payable:</span><span>₹${grandTotal.toLocaleString("en-IN")}</span></div>
      </div>
    `;
  }
}

// ==========================================
// 10. CART DRAWER OPERATIONS
// ==========================================
function saveCart() {
  localStorage.setItem("manopavana_cart", JSON.stringify(cart));
  renderCart();
  renderProductsGrid();
  if (currentDetailProductKey) {
    renderProductDetailModalContent();
  }
}

function openCart() {
  if (cartDrawer) cartDrawer.classList.add("open");
  if (cartBackdrop) cartBackdrop.classList.add("open");
}

function closeCart() {
  if (cartDrawer) cartDrawer.classList.remove("open");
  if (cartBackdrop) cartBackdrop.classList.remove("open");
}

if (openCartBtn) openCartBtn.addEventListener("click", openCart);
if (closeCartBtn) closeCartBtn.addEventListener("click", closeCart);
if (cartBackdrop) cartBackdrop.addEventListener("click", closeCart);

window.handleDirectAdd = function(id, title, price, img) {
  if (!isBangalorePincode) {
    window.open("https://www.flipkart.com", "_blank");
    return;
  }
  addToCart({ id, title, price: parseInt(price, 10), img });
};

function addToCart(product) {
  const existing = cart.find((item) => item.id === product.id);
  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({ ...product, quantity: 1 });
  }
  saveCart();
}

window.updateQuantity = function (id, delta) {
  const item = cart.find((item) => item.id === id);
  if (!item) {
    if (delta > 0) {
      if (COMBO_CATALOG[id]) {
        const combo = COMBO_CATALOG[id];
        cart.push({ id: combo.id, title: combo.title, price: combo.price, img: combo.img, quantity: 1 });
      } else {
        const [prodKey, sizeKey] = id.split("-");
        const formattedSize = sizeKey === "1l" ? "1L" : "500ml";
        const catItem = PRODUCT_CATALOG[prodKey]?.sizes[formattedSize];
        if (catItem) {
          cart.push({ id: catItem.id, title: catItem.title, price: catItem.price, img: PRODUCT_CATALOG[prodKey].img, quantity: 1 });
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

  if (cartCountBadge) cartCountBadge.textContent = totalCount;
  if (cartTotalItems) cartTotalItems.textContent = totalCount;
  if (cartSubtotal) cartSubtotal.textContent = `₹${subtotal.toLocaleString("en-IN")}`;

  if (cartDeliveryCharge) {
    if (totalCount === 0) {
      cartDeliveryCharge.innerHTML = `₹0`;
    } else if (deliveryFee === 0) {
      cartDeliveryCharge.innerHTML = `<span class="free-tag">FREE</span>`;
    } else {
      cartDeliveryCharge.innerHTML = `₹${STANDARD_DELIVERY_FEE}`;
    }
  }

  if (cartGrandTotal) {
    cartGrandTotal.textContent = `₹${grandTotal.toLocaleString("en-IN")}`;
  }

  if (shippingNote) {
    if (totalCount === 0) {
      shippingNote.textContent = `Add ₹500+ for FREE Doorstep Delivery across Bangalore (Delivered in 48–72 hrs)`;
    } else if (discountedSubtotal >= FREE_SHIPPING_THRESHOLD) {
      shippingNote.innerHTML = `🎉 You unlocked <strong>FREE Bangalore Delivery</strong> (48–72 hrs)!`;
    } else {
      const remaining = FREE_SHIPPING_THRESHOLD - discountedSubtotal;
      shippingNote.innerHTML = `Add <strong>₹${remaining}</strong> more to get <strong>FREE Bangalore Delivery</strong>!`;
    }
  }

  if (checkoutModalBackdrop && checkoutModalBackdrop.classList.contains("open")) {
    updateCheckoutFinancials();
  }

  if (!cartItemsList) return;

  if (cart.length === 0) {
    cartItemsList.innerHTML = `<div class="empty-cart-msg">Your artisanal bag is empty.<br>Select any bottle or combo above to begin.</div>`;
    return;
  }

  cartItemsList.innerHTML = cart
    .map(
      (item) => `
      <div class="cart-item">
        <img src="${item.img}" class="cart-item-thumb" alt="${item.title}" onerror="this.src='https://placehold.co/100x120/171412/eab308?text=Bottle'" />
        <div class="cart-item-details">
          <div class="cart-item-title">${item.title}</div>
          <div class="cart-item-price">₹${item.price}</div>
          <div class="cart-item-qty">
            <button class="qty-btn" onclick="updateQuantity('${item.id}', -1)" type="button">-</button>
            <span class="qty-count">${item.quantity}</span>
            <button class="qty-btn" onclick="updateQuantity('${item.id}', 1)" type="button">+</button>
            <button class="btn-remove-item" onclick="removeItem('${item.id}')" type="button">Remove</button>
          </div>
        </div>
      </div>
    `
    )
    .join("");
}

// ==========================================
// 11. PAYMENT METHOD CONTROLS
// ==========================================
function updatePaymentModeUI() {
  const isPhonePe = payPhonePeRadio && payPhonePeRadio.checked;
  const isCOD = payCODRadio && payCODRadio.checked;
  const isWhatsApp = payWhatsAppRadio && payWhatsAppRadio.checked;

  if (labelPayPhonePe) labelPayPhonePe.classList.toggle("active", isPhonePe);
  if (labelPayCOD) labelPayCOD.classList.toggle("active", isCOD);
  if (labelPayWhatsApp) labelPayWhatsApp.classList.toggle("active", isWhatsApp);

  if (isPhonePe) {
    if (phonepePaymentInfoBox) phonepePaymentInfoBox.style.display = "block";
    if (submitOrderBtn) submitOrderBtn.textContent = "Proceed to Pay via PhonePe ⚡";
  } else if (isCOD) {
    if (phonepePaymentInfoBox) phonepePaymentInfoBox.style.display = "none";
    if (submitOrderBtn) submitOrderBtn.textContent = "Confirm Cash on Delivery Order 💵";
  } else {
    if (phonepePaymentInfoBox) phonepePaymentInfoBox.style.display = "none";
    if (submitOrderBtn) submitOrderBtn.textContent = "Confirm Order on WhatsApp 💬";
  }
}

if (payPhonePeRadio) payPhonePeRadio.addEventListener("change", updatePaymentModeUI);
if (payCODRadio) payCODRadio.addEventListener("change", updatePaymentModeUI);
if (payWhatsAppRadio) payWhatsAppRadio.addEventListener("change", updatePaymentModeUI);

// ==========================================
// 12. LOCATION ROUTING & VALIDATION
// ==========================================
const nameEl = document.getElementById("custName");
const phoneEl = document.getElementById("custPhone");
const addressEl = document.getElementById("custAddress");
const stateEl = document.getElementById("custState");
const districtEl = document.getElementById("custDistrict");
const cityEl = document.getElementById("custCity");
const pincodeEl = document.getElementById("custPincode");

const nameErr = document.getElementById("custNameErr");
const phoneErr = document.getElementById("custPhoneErr");
const addressErr = document.getElementById("custAddressErr");
const stateErr = document.getElementById("custStateErr");
const districtErr = document.getElementById("custDistrictErr");
const cityErr = document.getElementById("custCityErr");
const pincodeErr = document.getElementById("custPincodeErr");

function validateField(field, errorEl, ruleFn, errorMsg) {
  if (!field) return true;
  const isValid = ruleFn(field.value.trim());
  if (!isValid) {
    field.classList.add("input-error");
    if (errorEl) {
      errorEl.textContent = errorMsg;
      errorEl.style.display = "block";
    }
  } else {
    field.classList.remove("input-error");
    if (errorEl) {
      errorEl.textContent = "";
      errorEl.style.display = "none";
    }
  }
  return isValid;
}

const isNameValid = (v) => v.length >= 3;
const isPhoneValid = (v) => /^[6-9]\d{9}$/.test(v);
const isAddressValid = (v) => v.length >= 8;
const isSelected = (v) => v.length > 0;
const isCityValid = (v) => v.length >= 2;
const isPincodeNumeric = (v) => /^\d{6}$/.test(v);

function validateAllFields() {
  const v1 = validateField(nameEl, nameErr, isNameValid, "Please enter your name (minimum 3 characters).");
  const v2 = validateField(phoneEl, phoneErr, isPhoneValid, "Enter a valid 10-digit mobile number.");
  const v3 = validateField(addressEl, addressErr, isAddressValid, "Please enter your street address (minimum 8 characters).");
  const v4 = validateField(stateEl, stateErr, isSelected, "Please select a State.");
  const v5 = validateField(districtEl, districtErr, isSelected, "Please select a District.");
  const v6 = validateField(cityEl, cityErr, isCityValid, "Please enter your city/town.");
  const v7 = validateField(pincodeEl, pincodeErr, isPincodeNumeric, "Enter a valid 6-digit Pincode.");

  return v1 && v2 && v3 && v4 && v5 && v6 && v7;
}

phoneEl?.addEventListener("input", (e) => {
  e.target.value = e.target.value.replace(/\D/g, "");
});

pincodeEl?.addEventListener("input", (e) => {
  e.target.value = e.target.value.replace(/\D/g, "");
});

window.openFlipkartModal = function() {
  const modal = document.getElementById("flipkartModalBackdrop");
  if (modal) modal.classList.add("open");
};

window.closeFlipkartModal = function() {
  const modal = document.getElementById("flipkartModalBackdrop");
  if (modal) modal.classList.remove("open");
};

// ==========================================
// 13. CHECKOUT SUBMISSION & PAYMENT DISPATCH
// ==========================================
async function handleCheckoutSubmission() {
  if (!validateAllFields()) {
    if (formError) {
      formError.textContent = "Please fill in all the required delivery details above.";
      formError.style.display = "block";
    }
    return;
  }

  const pincode = pincodeEl.value.trim();

  // Bangalore (560xxx) vs Non-Bangalore Flipkart Interception
  if (!pincode.startsWith("560")) {
    window.openFlipkartModal();
    return;
  }

  if (formError) formError.style.display = "none";

  const itemsToCheckout = checkoutSource === "buynow" && buyNowItem ? [buyNowItem] : cart;
  if (!itemsToCheckout || itemsToCheckout.length === 0) {
    alert("No products selected for checkout.");
    return;
  }

  const name = nameEl.value.trim();
  const phone = phoneEl.value.trim();
  const address = addressEl.value.trim();
  const state = stateEl.value.trim();
  const district = districtEl.value.trim();
  const city = cityEl.value.trim();

  let subtotal = 0;
  let itemsSummaryArray = [];

  itemsToCheckout.forEach((item) => {
    subtotal += item.price * item.quantity;
    itemsSummaryArray.push(`${item.title} (x${item.quantity})`);
  });

  const isLoyal = isLoyaltyDiscountValid();
  let discountAmount = 0;
  if (isLoyal && subtotal > 0) {
    discountAmount = Math.round((subtotal * REORDER_DISCOUNT_PERCENT) / 100);
  }

  const discountedSubtotal = subtotal - discountAmount;
  const deliveryFee = discountedSubtotal >= FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_DELIVERY_FEE;
  const grandTotal = discountedSubtotal + deliveryFee;

  const paymentMode = payPhonePeRadio.checked ? "PHONEPE" : (payCODRadio.checked ? "COD" : "WHATSAPP");

  const originalBtnText = submitOrderBtn.textContent;
  submitOrderBtn.disabled = true;
  submitOrderBtn.textContent = "Processing Order...";

  try {
    if (paymentMode === "PHONEPE") {
      const response = await callBackend({
        action: "create_phonepe_order",
        orderRef: currentOrderRef,
        amount: grandTotal,
        name: name,
        phone: phone,
        address: `${address}, ${city}`,
        state: state,
        district: district,
        pincode: pincode,
        items: itemsSummaryArray.join(", "),
        bottleCode: activeBottleCode || ""
      });

      if (response && response.redirectUrl) {
        if (checkoutSource === "cart") {
          cart = [];
          localStorage.removeItem("manopavana_cart");
        }
        window.location.href = response.redirectUrl;
        return;
      } else {
        throw new Error(response.message || "Failed to initialize PhonePe payment gateway.");
      }
    } else {
      await callBackend({
        action: "create_order",
        orderRef: currentOrderRef,
        grandTotal: grandTotal,
        name: name,
        phone: phone,
        address: `${address}, ${city}`,
        state: state,
        district: district,
        pincode: pincode,
        items: itemsSummaryArray.join(", "),
        paymentMode: paymentMode,
        bottleCode: activeBottleCode || ""
      });

      let message = `🌿 *New Order - MANOPAVANA Wood-Pressed Oils*\n`;
      message += `*Ref ID:* #${currentOrderRef}\n`;
      message += `─────────────────────────\n`;

      itemsToCheckout.forEach((item, index) => {
        message += `${index + 1}. *${item.title}*\n    Qty: ${item.quantity} × ₹${item.price} = ₹${(item.price * item.quantity).toLocaleString("en-IN")}\n`;
      });

      message += `─────────────────────────\n`;
      message += `*Subtotal:* ₹${subtotal.toLocaleString("en-IN")}\n`;
      if (discountAmount > 0) message += `*Bottle QR Loyalty (10% OFF):* -₹${discountAmount.toLocaleString("en-IN")}\n`;
      message += `*Delivery Fee:* ${deliveryFee === 0 ? "FREE" : `₹${deliveryFee}`}\n`;
      message += `*Grand Total Payable:* ₹${grandTotal.toLocaleString("en-IN")}\n`;
      message += `*Payment Method:* ${paymentMode === "COD" ? "Cash on Delivery (COD)" : "WhatsApp Manual Confirmation"}\n\n`;

      message += `📍 *Delivery Address:*\n`;
      message += `• *Name:* ${name}\n`;
      message += `• *Phone:* ${phone}\n`;
      message += `• *Address:* ${address}\n`;
      message += `• *City:* ${city}\n`;
      message += `• *District:* ${district}\n`;
      message += `• *State:* ${state} - ${pincode}\n`;

      if (checkoutSource === "cart") {
        cart = [];
        localStorage.removeItem("manopavana_cart");
      }

      window.closeCheckoutModal();
      renderCart();

      const encodedMessage = encodeURIComponent(message);
      window.open(`https://wa.me/${WHATSAPP_BUSINESS_NUMBER}?text=${encodedMessage}`, "_blank");
    }
  } catch (err) {
    console.error("Order processing error:", err);
    alert(err.message || "An error occurred while connecting with the server. Please try again or choose WhatsApp Order.");
  } finally {
    submitOrderBtn.disabled = false;
    submitOrderBtn.textContent = originalBtnText;
  }
}

if (submitOrderBtn) {
  submitOrderBtn.addEventListener("click", handleCheckoutSubmission);
}

// ==========================================
// 14. REVIEWS & ADMIN DELETION ENGINE
// ==========================================
let reviewsList = JSON.parse(localStorage.getItem("manopavana_user_reviews")) || [];
const reviewsDisplayGrid = document.getElementById("reviewsDisplayGrid");
const productReviewForm = document.getElementById("productReviewForm");

function isAdminActive() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get("admin") === "true";
}

function renderReviews() {
  if (!reviewsDisplayGrid) return;

  if (reviewsList.length === 0) {
    reviewsDisplayGrid.innerHTML = `
      <div class="empty-reviews-notice">
        <span>🌱</span>
        <p>No customer reviews posted yet.<br>Be the first to share your kitchen experience using the form below!</p>
      </div>
    `;
    return;
  }

  const isAdmin = isAdminActive();

  reviewsDisplayGrid.innerHTML = reviewsList
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

function escapeHtml(text) {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

if (productReviewForm) {
  productReviewForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const name = document.getElementById("revName").value.trim();
    const product = document.getElementById("revProduct").value;
    const rating = document.getElementById("revRating").value;
    const location = document.getElementById("revLocation").value.trim() || "India";
    const comment = document.getElementById("revComment").value.trim();

    if (!name || !comment) {
      alert("Please enter your name and feedback.");
      return;
    }

    const newReview = {
      id: "REV-" + Date.now(),
      name: name,
      product: product,
      rating: rating,
      location: location,
      comment: comment,
      date: new Date().toLocaleDateString("en-IN", {
        month: "short",
        day: "numeric",
        year: "numeric"
      })
    };

    reviewsList.unshift(newReview);
    localStorage.setItem("manopavana_user_reviews", JSON.stringify(reviewsList));

    renderReviews();
    productReviewForm.reset();
    alert("✨ Thank you! Your review has been successfully posted.");
  });
}

// ==========================================
// 15. LEGAL MODALS & INITIALIZATION
// ==========================================
window.openLegalModal = function(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.add("open");
};

window.closeLegalModal = function(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove("open");
};

document.querySelectorAll(".legal-backdrop").forEach((backdrop) => {
  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) {
      backdrop.classList.remove("open");
    }
  });
});

document.querySelectorAll(".faq-question").forEach((button) => {
  button.addEventListener("click", () => {
    const faqItem = button.parentElement;
    const isActive = faqItem.classList.contains("active");

    document.querySelectorAll(".faq-item").forEach((item) => {
      item.classList.remove("active");
    });

    if (!isActive) {
      faqItem.classList.add("active");
    }
  });
});

document.addEventListener("DOMContentLoaded", () => {
  populateStatesDropdown();
  updateLocationUI();
  initLoyaltyFromStorage();
  renderProductsGrid();
  renderCart();
  renderReviews();
});
