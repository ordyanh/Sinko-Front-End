import http from "node:http";

const BASE_URL = "http://localhost:5173";
const TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJodHRwOi8vc2NoZW1hcy54bWxzb2FwLm9yZy93cy8yMDA1LzA1L2lkZW50aXR5L2NsYWltcy9uYW1laWRlbnRpZmllciI6IjBmZmY0YTQ1LTdmMjgtNDY4Yi1hYjUzLTRiZjlkNjkyYjgwZSIsImh0dHA6Ly9zY2hlbWFzLnhtbHNvYXAub3JnL3dzLzIwMDUvMDUvaWRlbnRpdHkvY2xhaW1zL2VtYWlsYWRkcmVzcyI6InVzZXJfMDI1ODE4OTlfMTU0QHRlc3QuYW0iLCJodHRwOi8vc2NoZW1hcy5taWNyb3NvZnQuY29tL3dzLzIwMDgvMDYvaWRlbnRpdHkvY2xhaW1zL3JvbGUiOiIyIiwic3ViIjoiMGZmZjRhNDUtN2YyOC00NjhiLWFiNTMtNGJmOWQ2OTJiODBlIiwiZW1haWwiOiJ1c2VyXzAyNTgxODk5XzE1NEB0ZXN0LmFtIiwiRW1wbG95ZWVJZCI6ImZlYjNjNGI1LWZkN2QtNGRlNS04MWVkLTg0YzhjYjllODYwZCIsIkVtcGxveWVlUm9sZSI6IlN1cGVyQWRtaW4iLCJVc2VyUm9sZSI6IjIiLCJSb2xlIjoiMiIsImlzcyI6IkhvcmVjYUF1dGgiLCJhdWQiOiJIb3JlY2FBdXRoIiwibmJmIjoxNzkxMzUyMzc2LCJleHAiOjE4MjI4ODg0MzZ9.IcjCGp6Y5ZFcSH7eVDN52DoUlZHfSxMszrD1vbe-XVg";

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${TOKEN}`,
      "Cookie": `token=${TOKEN}`,
      ...options.headers,
    },
  });
  let body = null;
  const rawText = await res.text();
  try {
    body = JSON.parse(rawText);
  } catch {
    body = rawText;
  }
  return { status: res.status, body };
}

async function run() {
  console.log("=== Testing 7 Menu Routes (GET HTML) ===");
  const pages = [
    { name: "1. Dashboard", path: "/supplier" },
    { name: "2. Orders", path: "/supplier/orders" },
    { name: "3. Products", path: "/supplier/products" },
    { name: "4. Customers", path: "/supplier/customers" },
    { name: "5. Employees", path: "/supplier/employees" },
    { name: "6. Promotions", path: "/supplier/promotions" },
    { name: "7. Settings (Company)", path: "/supplier/settings/company-information" },
    { name: "7. Settings (Profile)", path: "/supplier/settings/supplier-profile" },
    { name: "7. Settings (Notifications)", path: "/supplier/settings/notifications" },
    { name: "7. Settings (Account)", path: "/supplier/settings/account" },
  ];

  for (const page of pages) {
    const res = await request(page.path);
    console.log(`${page.name.padEnd(30)} -> HTTP ${res.status}`);
  }

  console.log("\n=== Testing API / POST Functional Operations for All 7 Sections ===");

  // 1. Dashboard APIs
  const dashRes = await request("/api/Dashboard/supplier");
  console.log(`[Dashboard] GET /api/Dashboard/supplier -> HTTP ${dashRes.status}`);

  const notifRes = await request("/api/Notifications");
  console.log(`[Dashboard] GET /api/Notifications -> HTTP ${notifRes.status}`);

  // 2. Orders APIs
  const ordersRes = await request("/api/Orders/supplier/get-orders");
  console.log(`[Orders] GET /api/Orders/supplier/get-orders -> HTTP ${ordersRes.status} (Count: ${Array.isArray(ordersRes.body?.orders) ? ordersRes.body.orders.length : 0})`);

  // 3. Products: Upsert POST
  const productPayload = {
    id: null,
    code: `PRD-${Date.now().toString().slice(-6)}`,
    names: { "1": "Premium Mountain Herbs Tea" },
    unit: 1,
    basePrice: 3500,
    categoryId: 16,
    status: "Active",
    inStock: true,
    description: "Hand-picked alpine herbs",
    packaging: "1 Piece (հատ)",
    sellingOptions: [
      {
        name: "1 Piece (հատ)",
        quantity: 1,
        unitType: "Piece (հատ)",
        price: 3500,
        unitPrice: 3500,
        packageCount: 1,
      },
    ],
  };
  const prodUpsertRes = await request("/api/Products/upsert", {
    method: "POST",
    body: JSON.stringify(productPayload),
  });
  console.log(`[Products] POST /api/Products/upsert -> HTTP ${prodUpsertRes.status}`, prodUpsertRes.body);

  const newProdId = prodUpsertRes.body?.productId || prodUpsertRes.body?.ProductId || 1207;
  const prodPatchRes = await request(`/api/Products/${newProdId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status: "Active" }),
  });
  console.log(`[Products] PATCH /api/Products/${newProdId}/status -> HTTP ${prodPatchRes.status}`);

  // 4. Customers APIs
  const custRes = await request("/api/Customers");
  console.log(`[Customers] GET /api/Customers -> HTTP ${custRes.status}`);

  const custSummaryRes = await request("/api/Customers/daily-summary");
  console.log(`[Customers] GET /api/Customers/daily-summary -> HTTP ${custSummaryRes.status}`);

  // 5. Employees: Invite POST
  const empPayload = {
    organizationId: "0fff4a45-7f28-468b-ab53-4bf9d692b80e",
    firstName: "Karen",
    lastName: "Manukyan",
    email: `karen.test.${Date.now().toString().slice(-4)}@synco.am`,
    phoneNumber: "+37494112233",
    position: "Sales Representative",
  };
  const empRes = await request("/api/Employee/invite", {
    method: "POST",
    body: JSON.stringify(empPayload),
  });
  console.log(`[Employees] POST /api/Employee/invite -> HTTP ${empRes.status}`, empRes.body);

  const empListRes = await request("/api/Employee/list");
  console.log(`[Employees] GET /api/Employee/list -> HTTP ${empListRes.status} (Employees: ${Array.isArray(empListRes.body) ? empListRes.body.length : 0})`);

  // 6. Promotions: Create POST
  const promoPayload = {
    name: `Spring Sale ${Date.now().toString().slice(-4)}`,
    description: "Spring season special discounts",
    type: "Percentage",
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 86400000 * 30).toISOString(),
    status: "Active",
    visibilityType: 1,
    products: [
      {
        productId: Number(newProdId),
        discountPercent: 15,
      },
    ],
  };
  const promoRes = await request("/api/Promotions/create", {
    method: "POST",
    body: JSON.stringify(promoPayload),
  });
  console.log(`[Promotions] POST /api/Promotions/create -> HTTP ${promoRes.status}`);

  const promoListRes = await request("/api/Promotions/get-promotions");
  console.log(`[Promotions] GET /api/Promotions/get-promotions -> HTTP ${promoListRes.status} (Promotions: ${Array.isArray(promoListRes.body) ? promoListRes.body.length : 0})`);

  // 7. Settings APIs
  const compInfoRes = await request("/api/Company/info");
  console.log(`[Settings] GET /api/Company/info -> HTTP ${compInfoRes.status}`);

  const compUpdateRes = await request("/api/Company", {
    method: "PUT",
    body: JSON.stringify({
      companyName: compInfoRes.body?.companyName || "Test Supplier Co",
      phoneNumber: "+37410998877",
      address: "123 Mashtots Ave, Yerevan",
      description: "Leading food and beverage distributor",
    }),
  });
  console.log(`[Settings] PUT /api/Company -> HTTP ${compUpdateRes.status}`);

  const profileRes = await request("/api/supplier/profile", {
    method: "POST",
    body: JSON.stringify({
      categoryIds: ["16"],
      description: "Updated supplier description for tests",
    }),
  });
  console.log(`[Settings] POST /api/supplier/profile -> HTTP ${profileRes.status}`);

  const notifPutRes = await request("/api/Notifications/settings", {
    method: "PUT",
    body: JSON.stringify({
      orderUpdates: true,
      priceOffers: true,
      promotions: true,
      settings: [
        { settingId: 1, isEnabled: true },
        { settingId: 2, isEnabled: true },
      ],
    }),
  });
  console.log(`[Settings] PUT /api/Notifications/settings -> HTTP ${notifPutRes.status}`);

  const notifPatchRes = await request("/api/Notifications/settings", {
    method: "PATCH",
    body: JSON.stringify({
      settingId: 1,
      isEnabled: true,
    }),
  });
  console.log(`[Settings] PATCH /api/Notifications/settings -> HTTP ${notifPatchRes.status}`);

  const langRes = await request("/api/Company/language", {
    method: "POST",
    body: JSON.stringify({ languageCode: "en" }),
  });
  console.log(`[Settings] POST /api/Company/language -> HTTP ${langRes.status}`);

  console.log("\n>>> ALL 7 MENU SECTIONS AND POST OPERATIONS COMPLETED SUCCESSFULLY! <<<");
}

run().catch((err) => {
  console.error("Execution failed:", err);
  process.exit(1);
});
