import http from "node:http";

const BASE_URL = "http://localhost:5173";
const AUTH_URL = "http://localhost:5273";
const CORE_URL = "http://localhost:5206";

const results = {
  pagesPassed: 0,
  pagesFailed: 0,
  apisPassed: 0,
  apisFailed: 0,
  errors: [],
};

async function login(email, password) {
  const res = await fetch(`${AUTH_URL}/api/Auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Login failed for ${email}: ${res.status} ${txt}`);
  }
  const data = await res.json();
  return { token: data.token, userId: data.userId || data.organizationId };
}

async function request(url, token, options = {}) {
  const fullUrl = url.startsWith("http") ? url : `${BASE_URL}${url}`;
  try {
    const res = await fetch(fullUrl, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}`, Cookie: `token=${token}` } : {}),
        ...options.headers,
      },
    });
    const text = await res.text();
    let body = null;
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
    return { status: res.status, ok: res.ok, body };
  } catch (err) {
    return { status: 0, ok: false, body: err.message };
  }
}

async function testPage(name, path, token = null) {
  const res = await request(path, token);
  const pass = res.status === 200 || res.status === 302 || res.status === 307;
  if (pass) {
    results.pagesPassed++;
    console.log(`  [PAGE OK] ${name.padEnd(38)} -> HTTP ${res.status}`);
  } else {
    results.pagesFailed++;
    results.errors.push({ type: "PAGE", name, path, status: res.status, body: res.body });
    console.error(`  [PAGE FAIL] ${name.padEnd(38)} -> HTTP ${res.status}`);
  }
  return res;
}

async function testApi(name, url, method, token, bodyPayload = null) {
  const options = { method };
  if (bodyPayload) options.body = JSON.stringify(bodyPayload);
  const res = await request(url, token, options);
  const pass = res.status >= 200 && res.status < 300;
  if (pass) {
    results.apisPassed++;
    console.log(`  [API OK] ${method.padEnd(6)} ${name.padEnd(38)} -> HTTP ${res.status}`);
  } else {
    results.apisFailed++;
    results.errors.push({ type: "API", name, url, method, status: res.status, body: res.body });
    console.error(`  [API FAIL] ${method.padEnd(6)} ${name.padEnd(38)} -> HTTP ${res.status}`, res.body);
  }
  return res;
}

async function run() {
  console.log("===================================================================");
  console.log("🚀 FULL END-TO-END VERIFICATION OF ALL APP PAGES AND API ENDPOINTS");
  console.log("===================================================================\n");

  console.log("1. Authenticating test users...");
  const supplierAuth = await login("supplier@synco.am", "Password123!");
  const supplierToken = supplierAuth.token;
  console.log("   Supplier Token acquired:", supplierToken.slice(0, 25) + "...");

  const horecaAuth = await login("horeca@synco.am", "Password123!");
  const horecaToken = horecaAuth.token;
  console.log("   Horeca Token acquired:  ", horecaToken.slice(0, 25) + "...\n");

  console.log("2. Testing Public & Auth Pages (GET HTML)");
  await testPage("Home Page", "/");
  await testPage("Login Page", "/login");
  await testPage("Register Horeca", "/register-horeca");
  await testPage("Register Supplier", "/register-supplier");
  await testPage("Resource: Categories", "/api/categories");
  await testPage("Resource: Regions", "/api/regions");

  console.log("\n3. Testing Supplier Pages (GET HTML)");
  await testPage("Supplier Dashboard", "/supplier", supplierToken);
  await testPage("Supplier Orders", "/supplier/orders", supplierToken);
  await testPage("Supplier Products", "/supplier/products", supplierToken);
  await testPage("Supplier Customers", "/supplier/customers", supplierToken);
  await testPage("Supplier Employees", "/supplier/employees", supplierToken);
  await testPage("Supplier Promotions", "/supplier/promotions", supplierToken);
  await testPage("Supplier New Promo", "/supplier/promotions/new", supplierToken);
  await testPage("Supplier Settings Co", "/supplier/settings/company-information", supplierToken);
  await testPage("Supplier Settings Profile", "/supplier/settings/supplier-profile", supplierToken);
  await testPage("Supplier Settings Notif", "/supplier/settings/notifications", supplierToken);
  await testPage("Supplier Settings Acc", "/supplier/settings/account", supplierToken);

  console.log("\n4. Testing Horeca Pages (GET HTML)");
  await testPage("Horeca Dashboard", "/horeca", horecaToken);
  await testPage("Horeca Products", "/horeca/products", horecaToken);
  await testPage("Horeca Cart", "/horeca/cart", horecaToken);
  await testPage("Horeca Orders", "/horeca/orders", horecaToken);
  await testPage("Horeca Suppliers", "/horeca/suppliers", horecaToken);
  await testPage("Horeca Promotions", "/horeca/promotions", horecaToken);
  await testPage("Horeca Employees", "/horeca/employees", horecaToken);
  await testPage("Horeca Settings Co", "/horeca/settings/company-information", horecaToken);
  await testPage("Horeca Settings Notif", "/horeca/settings/notifications", horecaToken);
  await testPage("Horeca Settings Acc", "/horeca/settings/account", horecaToken);

  console.log("\n5. Testing Supplier Functional APIs (GET, POST, PUT, PATCH)");
  // Dashboard
  await testApi("Supplier Dashboard", "/api/Dashboard/supplier", "GET", supplierToken);
  await testApi("Notifications List", "/api/Notifications", "GET", supplierToken);

  // Orders
  await testApi("Supplier Get Orders", "/api/Orders/supplier/get-orders", "GET", supplierToken);

  // Products
  const prodUpsertRes = await testApi("Product Upsert", "/api/Products/upsert", "POST", supplierToken, {
    id: null,
    code: `PRD-${Date.now().toString().slice(-6)}`,
    names: { "1": "Organic Mountain Tea", "2": "Органический горный чай" },
    unit: 1,
    basePrice: 2800,
    categoryId: 16,
    status: "Active",
    inStock: true,
    description: "Pure alpine herbs tea",
    packaging: "1 Box",
    sellingOptions: [
      {
        name: "1 Box (հատ)",
        quantity: 1,
        unitType: "Box (հատ)",
        price: 2800,
        unitPrice: 2800,
        packageCount: 1,
      },
    ],
  });

  const createdProdId = prodUpsertRes.body?.productId || prodUpsertRes.body?.ProductId || prodUpsertRes.body?.id || 1217;
  console.log("   Active Product ID:", createdProdId);

  await testApi("Supplier Catalog (My Catalog)", "/api/Products/my-catalog", "GET", supplierToken);

  if (createdProdId) {
    await testApi("Product Get By ID", `/api/Products/${createdProdId}`, "GET", supplierToken);
    await testApi("Product Status Update", `/api/Products/${createdProdId}/status`, "PATCH", supplierToken, {
      status: "Active",
    });
  }

  // Customers
  await testApi("Customers List", "/api/Customers", "GET", supplierToken);
  await testApi("Customers Daily Summary", "/api/Customers/daily-summary", "GET", supplierToken);

  // Employees
  await testApi("Employee Invite", "/api/Employee/invite", "POST", supplierToken, {
    organizationId: "cc6683c2-5539-4a68-b1d6-e179cfec2b44",
    firstName: "Artur",
    lastName: "Sargsyan",
    email: `artur.${Date.now().toString().slice(-4)}@synco.am`,
    phoneNumber: "+37494556677",
    position: "Sales Manager",
    role: "SalesManager",
  });
  await testApi("Employee List", "/api/Employee/list", "GET", supplierToken);

  // Promotions
  const promoRes = await testApi("Promotion Create", "/api/Promotions/create", "POST", supplierToken, {
    name: `Winter Warmup ${Date.now().toString().slice(-4)}`,
    description: "Special winter season discount",
    type: "Percentage",
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 86400000 * 30).toISOString(),
    status: "Active",
    visibilityType: 1,
    products: createdProdId ? [{ productId: Number(createdProdId), discountPercent: 20 }] : [],
  });
  const createdPromoId = promoRes.body?.id || promoRes.body?.promotionId || "d6747c49-4dea-49e9-bd7c-ce76989c9849";
  await testApi("Promotions List", "/api/Promotions/get-promotions", "GET", supplierToken);

  // Settings
  await testApi("Company Info", "/api/Company/info", "GET", supplierToken);
  await testApi("Company Update", "/api/Company", "PUT", supplierToken, {
    companyName: "Supplier Test LLC Updated",
    phoneNumber: "+37494112233",
    address: "Yerevan, Tumanyan 1, Suite 10",
    description: "Quality goods distributor",
  });
  await testApi("Supplier Profile Save", "/api/supplier/profile", "POST", supplierToken, {
    categoryIds: ["16"],
    description: "Updated profile description",
  });
  await testApi("Notification Settings Update", "/api/Notifications/settings", "PUT", supplierToken, {
    orderUpdates: true,
    priceOffers: true,
    promotions: true,
    settings: [
      { settingId: 1, isEnabled: true },
      { settingId: 2, isEnabled: true },
    ],
  });

  console.log("\n6. Testing Horeca Functional APIs (GET, POST)");
  await testApi("Marketplace Suppliers", "/api/Marketplace/suppliers", "GET", horecaToken);
  await testApi("Marketplace Products", "/api/Marketplace/products", "GET", horecaToken);
  await testApi("Marketplace Static Info", "/api/Marketplace/static-info", "GET", horecaToken);
  await testApi("Marketplace Promotions", "/api/Promotions/marketplace", "GET", horecaToken);
  await testApi("Horeca Orders List", "/api/Orders/get-orders", "GET", horecaToken);

  // Clear Cart, Add item, Verify Cart, Checkout Cart
  await testApi("Cart Clear", "/api/Cart/clear", "DELETE", horecaToken);
  if (createdProdId) {
    await testApi("Marketplace Product Detail", `/api/Marketplace/products/${createdProdId}?langId=1`, "GET", horecaToken);
    await testApi("Cart Add Item", "/api/Cart/items", "POST", horecaToken, {
      productId: Number(createdProdId),
      quantity: 1,
    });
  }
  await testApi("Cart Get", "/api/Cart", "GET", horecaToken);

  const checkoutRes = await testApi("Checkout Cart (Place Order)", "/api/Orders/checkout-cart", "POST", horecaToken, {
    description: "Automated test order from Horeca Cart",
  });
  const createdOrderId = checkoutRes.body?.orderId || "b4f710bf-9a74-45bc-9666-285d5a33681e";
  console.log("   Active Order ID:", createdOrderId);

  // Dictionary / Categories
  await testApi("Dictionary Categories", "/api/Dictionary/categories", "GET", horecaToken);
  await testApi("Dictionary Regions", "/api/Dictionary/regions", "GET", horecaToken);

  console.log("\n7. Testing Detail Pages for Existing Entities (GET HTML)");
  if (createdProdId) {
    await testPage("Supplier Product Detail", `/supplier/products/${createdProdId}`, supplierToken);
    await testPage("Horeca Product Detail", `/horeca/products/${createdProdId}`, horecaToken);
  }
  if (createdOrderId) {
    await testPage("Supplier Order Detail", `/supplier/orders/${createdOrderId}`, supplierToken);
    await testPage("Horeca Order Detail", `/horeca/orders/${createdOrderId}`, horecaToken);
  }
  await testPage("Horeca Supplier Detail", `/horeca/suppliers/cc6683c2-5539-4a68-b1d6-e179cfec2b44`, horecaToken);
  await testPage("Supplier Customer Detail", `/supplier/customers/04d8e41e-8a16-427f-95b1-79925d05f18b`, supplierToken);
  if (createdPromoId) {
    await testPage("Supplier Promotion Detail", `/supplier/promotions/${createdPromoId}`, supplierToken);
    await testPage("Horeca Promotion Detail", `/horeca/promotions/${createdPromoId}`, horecaToken);
  }

  console.log("\n===================================================================");
  console.log("📊 FINAL TEST EXECUTION SUMMARY");
  console.log("===================================================================");
  console.log(`Pages Tested : ${results.pagesPassed + results.pagesFailed} (Passed: ${results.pagesPassed}, Failed: ${results.pagesFailed})`);
  console.log(`APIs Tested  : ${results.apisPassed + results.apisFailed} (Passed: ${results.apisPassed}, Failed: ${results.apisFailed})`);

  if (results.errors.length > 0) {
    console.log("\n🚨 FAILURES DETECTED:");
    for (const err of results.errors) {
      console.log(`- [${err.type}] ${err.name} (${err.method || "GET"} ${err.path || err.url}) -> Status ${err.status}`);
      console.log("  Details:", typeof err.body === "object" ? JSON.stringify(err.body) : err.body);
    }
  } else {
    console.log("\n🎉 ALL PAGES AND APIS PASSED WITH ZERO ERRORS!");
  }
}

run().catch((err) => {
  console.error("Test runner crashed:", err);
  process.exit(1);
});
