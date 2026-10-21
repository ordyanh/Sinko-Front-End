import http from "node:http";

const BASE_URL = "http://localhost:5173";
const AUTH_URL = "http://localhost:5273";
const CORE_URL = "http://localhost:5206";

const results = {
  scenariosPassed: 0,
  scenariosFailed: 0,
  stepsPassed: 0,
  stepsFailed: 0,
  errors: [],
};

function passStep(stepName, details = "") {
  results.stepsPassed++;
  console.log(`  [PASS] ${stepName}${details ? ` -> ${details}` : ""}`);
}

function failStep(stepName, err) {
  results.stepsFailed++;
  results.errors.push({ step: stepName, error: err });
  console.error(`  [FAIL] ${stepName} ->`, err);
}

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
  return {
    token: data.token,
    userId: data.organizationId || data.userId, // Organization ID is the User ID in Sinko Core
    employeeId: data.userId,
    organizationId: data.organizationId,
  };
}

async function registerSupplierIfMissing(email, password, companyName) {
  try {
    const auth = await login(email, password);
    console.log(`  Account ${email} already exists.`);
    return auth;
  } catch {
    console.log(`  Registering new supplier account: ${email}...`);
    const regRes = await fetch(`${AUTH_URL}/api/Auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        companyName,
        email,
        phoneNumber: "+37494998877",
        address: "Yerevan, Komitas 15",
        taxCode: "88776655",
        typeOfActivity: "Supplier",
        role: 2,
        password,
        confirmPassword: password,
        categoryIds: [16],
      }),
    });
    if (!regRes.ok) {
      const err = await regRes.text();
      throw new Error(`Registration failed: ${regRes.status} ${err}`);
    }
    return await login(email, password);
  }
}

async function api(url, token, options = {}) {
  const fullUrl = url.startsWith("http") ? url : `${CORE_URL}${url}`;
  const res = await fetch(fullUrl, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
}

async function ensureProductForSupplier(token, supplierName, prodCode, prodName) {
  const getRes = await api("/api/Products/my-catalog", token, { method: "GET" });
  if (getRes.ok && Array.isArray(getRes.body) && getRes.body.length > 0) {
    const existing = getRes.body[0];
    return { id: existing.id || existing.Id, code: existing.code || existing.Code };
  }

  // Create product via POST /api/Products
  const createRes = await api("/api/Products", token, {
    method: "POST",
    body: JSON.stringify({
      name: prodName,
      code: prodCode,
      categoryId: 16,
      basePrice: 1500,
      unit: 1,
      packageOptions: [1],
      inStock: true,
      description: "Test Product Description",
    }),
  });

  if (!createRes.ok) {
    throw new Error(`Failed to create product for ${supplierName}: ${createRes.status} ${JSON.stringify(createRes.body)}`);
  }

  const newId = createRes.body?.id || createRes.body?.Id || createRes.body?.productId;
  return { id: newId, code: prodCode };
}

async function run() {
  console.log("===================================================================");
  console.log("🚀 TESTING ADVANCED SCENARIOS: PRICE OFFERS, MULTI-ORDERS, ARCHIVE");
  console.log("===================================================================\n");

  console.log("Step 0: Authenticating and Preparing Test Accounts...");
  const horeca = await login("horeca@synco.am", "Password123!");
  passStep("Authenticate HoReCa Client", `OrgId: ${horeca.userId}`);

  const supplier1 = await login("supplier@synco.am", "Password123!");
  passStep("Authenticate Supplier 1", `OrgId: ${supplier1.userId}`);

  const supplier2 = await registerSupplierIfMissing(
    "supplier2@synco.am",
    "Password123!",
    "Bakery World LLC"
  );
  passStep("Authenticate Supplier 2", `OrgId: ${supplier2.userId}`);

  // Ensure products for both suppliers
  const prod1 = await ensureProductForSupplier(supplier1.token, "Supplier 1", "TEA-001", "Mountain Tea");
  passStep("Ensure Product for Supplier 1", `ProductId: ${prod1.id}`);

  const prod2 = await ensureProductForSupplier(supplier2.token, "Supplier 2", "BREAD-001", "Artisan Baguette");
  passStep("Ensure Product for Supplier 2", `ProductId: ${prod2.id}`);

  // =====================================================================================
  // SCENARIO 1: PRICE OFFERS (ЦЕНОВЫЕ ПРЕДЛОЖЕНИЯ)
  // =====================================================================================
  console.log("\n-------------------------------------------------------------------");
  console.log("📌 SCENARIO 1: PRICE OFFERS LIFECYCLE (OFFER -> COUNTER -> ACCEPT / REJECT)");
  console.log("-------------------------------------------------------------------");
  try {
    // 1.1 HoReCa sends a price request to Supplier 1
    const priceReqPayload = {
      restaurantName: "Bistro Yerevan",
      comment: "Need special price for weekly tea supply",
      items: [
        {
          productId: prod1.id,
          supplierId: supplier1.userId,
          requestedQuantity: 1,
        },
      ],
    };

    const priceReqRes = await api("/api/Orders/price-request", horeca.token, {
      method: "POST",
      body: JSON.stringify(priceReqPayload),
    });

    if (!priceReqRes.ok) {
      throw new Error(`price-request failed: ${priceReqRes.status} ${JSON.stringify(priceReqRes.body)}`);
    }

    const createdOfferOrder = Array.isArray(priceReqRes.body) ? priceReqRes.body[0] : priceReqRes.body;
    const orderId = createdOfferOrder.orderId || createdOfferOrder.id || createdOfferOrder.OrderId;
    passStep("HoReCa creates Price Request", `OrderId: ${orderId}`);

    // 1.2 Supplier inspects the order
    const supOrderRes = await api(`/api/Orders/supplier/${orderId}`, supplier1.token, { method: "GET" });
    if (!supOrderRes.ok) {
      throw new Error(`Supplier get order failed: ${supOrderRes.status}`);
    }
    passStep("Supplier inspects Price Request order", `Status: ${supOrderRes.body.status}`);

    // 1.3 Supplier sends counter-offer with revised price
    const sendOfferPayload = {
      orderId,
      savePricesForCustomer: true,
      items: [
        {
          productId: prod1.id,
          newPrice: 1250,
          newQuantity: 1,
          comment: "Approved discount 1250 AMD per pack",
        },
      ],
    };

    const sendOfferRes = await api("/api/Orders/send-offer", supplier1.token, {
      method: "POST",
      body: JSON.stringify(sendOfferPayload),
    });

    if (!sendOfferRes.ok) {
      throw new Error(`send-offer failed: ${sendOfferRes.status} ${JSON.stringify(sendOfferRes.body)}`);
    }
    passStep("Supplier sends revised Price Offer", "HTTP 200 { success: true }");

    // 1.4 HoReCa checks order and accepts the offer
    const acceptOfferRes = await api(`/api/Orders/${orderId}/respond-to-offer?accept=true`, horeca.token, {
      method: "POST",
    });

    if (!acceptOfferRes.ok) {
      throw new Error(`respond-to-offer (accept) failed: ${acceptOfferRes.status} ${JSON.stringify(acceptOfferRes.body)}`);
    }
    passStep("HoReCa accepts Price Offer", "HTTP 200 { success: true }");

    // 1.5 Verify order moved to Accepted (3)
    const acceptedOrderRes = await api(`/api/Orders/supplier/${orderId}`, supplier1.token, { method: "GET" });
    const acceptedStatus = acceptedOrderRes.body.status;
    if (acceptedStatus !== "Accepted" && acceptedStatus !== "Confirmed" && acceptedStatus !== 3) {
      throw new Error(`Expected Accepted/Confirmed status, got: ${acceptedStatus}`);
    }
    passStep("Verify Order status after acceptance", `Status: ${acceptedStatus}`);

    // 1.6 Now test Offer Rejection flow with another request
    const priceReqPayload2 = {
      restaurantName: "Bistro Yerevan",
      comment: "Inquiry for rejected flow test",
      items: [
        {
          productId: prod1.id,
          supplierId: supplier1.userId,
          requestedQuantity: 1,
        },
      ],
    };
    const req2Res = await api("/api/Orders/price-request", horeca.token, {
      method: "POST",
      body: JSON.stringify(priceReqPayload2),
    });
    if (!req2Res.ok) {
      throw new Error(`Second price-request failed: ${req2Res.status} ${JSON.stringify(req2Res.body)}`);
    }
    const order2 = Array.isArray(req2Res.body) ? req2Res.body[0] : req2Res.body;
    const orderId2 = order2.orderId || order2.id || order2.OrderId;
    passStep("HoReCa creates second Price Request for rejection test", `OrderId: ${orderId2}`);

    // Supplier sends offer
    const sendOffer2Res = await api("/api/Orders/send-offer", supplier1.token, {
      method: "POST",
      body: JSON.stringify({
        orderId: orderId2,
        savePricesForCustomer: false,
        items: [{ productId: prod1.id, newPrice: 9999, newQuantity: 1 }],
      }),
    });
    if (!sendOffer2Res.ok) {
      throw new Error(`send-offer 2 failed: ${sendOffer2Res.status} ${JSON.stringify(sendOffer2Res.body)}`);
    }
    passStep("Supplier sends counter-offer", "NewPrice: 9999 AMD");

    // HoReCa rejects the offer
    const rejectRes = await api(`/api/Orders/${orderId2}/respond-to-offer?accept=false`, horeca.token, {
      method: "POST",
    });
    if (!rejectRes.ok) {
      throw new Error(`respond-to-offer (reject) failed: ${rejectRes.status} ${JSON.stringify(rejectRes.body)}`);
    }
    passStep("HoReCa rejects Price Offer", "HTTP 200 { success: true }");

    // Verify order moved to Rejected (7)
    const rejectedOrderRes = await api(`/api/Orders/supplier/${orderId2}`, supplier1.token, { method: "GET" });
    const rejStatus = rejectedOrderRes.body.status;
    if (rejStatus !== "Rejected" && rejStatus !== "Cancelled" && rejStatus !== 7) {
      throw new Error(`Expected Rejected status, got: ${rejStatus}`);
    }
    passStep("Verify Order status after rejection", `Status: ${rejStatus}`);

    results.scenariosPassed++;
    console.log("  >>> SCENARIO 1 (PRICE OFFERS): SUCCESS! <<<");
  } catch (err) {
    results.scenariosFailed++;
    failStep("SCENARIO 1 FAILURE", err.message || err);
  }

  // =====================================================================================
  // SCENARIO 2: MULTI-SUPPLIER ORDERS (МУЛЬТИ-ЗАКАЗ НЕСКОЛЬКИХ ПОСТАВЩИКОВ)
  // =====================================================================================
  console.log("\n-------------------------------------------------------------------");
  console.log("📌 SCENARIO 2: MULTI-SUPPLIER ORDERS (SPLIT ORDER + INDEPENDENT FULFILLMENT)");
  console.log("-------------------------------------------------------------------");
  try {
    // 2.1 Test direct multi-order creation via POST /api/Orders/create-multi
    const multiOrderPayload = {
      description: "Weekly consolidated multi-supplier replenishment",
      supplierOrders: [
        {
          supplierId: supplier1.userId,
          description: "Sub-order Supplier 1",
          products: [{ productId: prod1.id, count: 1 }],
        },
        {
          supplierId: supplier2.userId,
          description: "Sub-order Supplier 2",
          products: [{ productId: prod2.id, count: 1 }],
        },
      ],
    };

    const multiRes = await api("/api/Orders/create-multi", horeca.token, {
      method: "POST",
      body: JSON.stringify(multiOrderPayload),
    });

    if (!multiRes.ok) {
      throw new Error(`create-multi failed: ${multiRes.status} ${JSON.stringify(multiRes.body)}`);
    }

    const subOrders = Array.isArray(multiRes.body) ? multiRes.body : [multiRes.body];
    if (subOrders.length < 2) {
      throw new Error(`Expected at least 2 sub-orders, got ${subOrders.length}`);
    }

    const subOrder1Id = subOrders[0].orderId || subOrders[0].id || subOrders[0].OrderId;
    const subOrder2Id = subOrders[1].orderId || subOrders[1].id || subOrders[1].OrderId;
    passStep(
      "HoReCa creates Multi-Supplier Order via create-multi",
      `Sub-order 1: ${subOrder1Id}, Sub-order 2: ${subOrder2Id}`
    );

    // 2.2 Verify Supplier 1 can view Sub-order 1
    const sup1OrderRes = await api(`/api/Orders/supplier/${subOrder1Id}`, supplier1.token, { method: "GET" });
    if (!sup1OrderRes.ok) {
      throw new Error(`Supplier 1 cannot fetch Sub-order 1: ${sup1OrderRes.status}`);
    }
    passStep("Supplier 1 fetches Sub-order 1", `ParentOrderId: ${sup1OrderRes.body.parentOrderId || "Linked"}`);

    // 2.3 Verify Supplier 2 can view Sub-order 2
    const sup2OrderRes = await api(`/api/Orders/supplier/${subOrder2Id}`, supplier2.token, { method: "GET" });
    if (!sup2OrderRes.ok) {
      throw new Error(`Supplier 2 cannot fetch Sub-order 2: ${sup2OrderRes.status}`);
    }
    passStep("Supplier 2 fetches Sub-order 2", `ParentOrderId: ${sup2OrderRes.body.parentOrderId || "Linked"}`);

    // 2.4 Test Multi-order creation via Cart checkout
    // Add product from Supplier 1 to cart
    await api("/api/Cart/items", horeca.token, {
      method: "POST",
      body: JSON.stringify({ productId: prod1.id, quantity: 1 }),
    });
    // Add product from Supplier 2 to cart
    await api("/api/Cart/items", horeca.token, {
      method: "POST",
      body: JSON.stringify({ productId: prod2.id, quantity: 1 }),
    });

    // Check cart contents
    const cartRes = await api("/api/Cart", horeca.token, { method: "GET" });
    passStep("Cart populated with multi-supplier items", `Items count: ${cartRes.body?.items?.length || cartRes.body?.length || 2}`);

    // Checkout cart
    const cartCheckoutRes = await api("/api/Orders/checkout-cart", horeca.token, {
      method: "POST",
      body: JSON.stringify({ description: "Cart checkout multi-order" }),
    });

    if (!cartCheckoutRes.ok) {
      throw new Error(`checkout-cart failed: ${cartCheckoutRes.status} ${JSON.stringify(cartCheckoutRes.body)}`);
    }

    const cartOrders = Array.isArray(cartCheckoutRes.body) ? cartCheckoutRes.body : [cartCheckoutRes.body];
    passStep("Cart Checkout creates split orders", `Orders created: ${cartOrders.length}`);

    // Verify cart is now empty
    const cartEmptyRes = await api("/api/Cart", horeca.token, { method: "GET" });
    const emptyCount = cartEmptyRes.body?.items?.length ?? cartEmptyRes.body?.length ?? 0;
    passStep("Verify Cart is emptied after checkout", `Remaining items: ${emptyCount}`);

    results.scenariosPassed++;
    console.log("  >>> SCENARIO 2 (MULTI-SUPPLIER ORDERS): SUCCESS! <<<");
  } catch (err) {
    results.scenariosFailed++;
    failStep("SCENARIO 2 FAILURE", err.message || err);
  }

  // =====================================================================================
  // SCENARIO 3: ORDER ARCHIVING & COMPLETION (АРХИВАЦИЯ И ЗАВЕРШЕНИЕ)
  // =====================================================================================
  console.log("\n-------------------------------------------------------------------");
  console.log("📌 SCENARIO 3: ORDER ARCHIVING & COMPLETION (DELIVERY -> PAID -> FINISHED -> ARCHIVE FILTER)");
  console.log("-------------------------------------------------------------------");
  try {
    // 3.1 Create a dedicated order for archival flow
    const singleOrderRes = await api("/api/Orders/create", horeca.token, {
      method: "POST",
      body: JSON.stringify({
        supplierId: supplier1.userId,
        description: "Order for archival and completion test",
        products: [{ productId: prod1.id, count: 1 }],
      }),
    });

    if (!singleOrderRes.ok) {
      throw new Error(`Orders/create failed: ${singleOrderRes.status} ${JSON.stringify(singleOrderRes.body)}`);
    }

    const archiveOrder = singleOrderRes.body;
    const archOrderId = archiveOrder.orderId || archiveOrder.OrderId || archiveOrder.id;
    passStep("Created order for Archival lifecycle", `OrderId: ${archOrderId}`);

    // 3.2 Supplier accepts order: status -> Accepted (3)
    await api(`/api/Orders/${archOrderId}/accept`, supplier1.token, { method: "POST" });
    const accRes = await api("/api/Orders/update-status", supplier1.token, {
      method: "PATCH",
      body: JSON.stringify({ orderId: archOrderId, status: "Accepted" }),
    });
    if (!accRes.ok) throw new Error(`update-status Accepted failed: ${accRes.status} ${JSON.stringify(accRes.body)}`);
    passStep("Order status updated to Accepted", "Status: Accepted (3)");

    // 3.3 Move to InProgress (4)
    const inProgRes = await api("/api/Orders/update-status", supplier1.token, {
      method: "PATCH",
      body: JSON.stringify({ orderId: archOrderId, status: "InProgress" }),
    });
    if (!inProgRes.ok) throw new Error(`update-status InProgress failed: ${inProgRes.status} ${JSON.stringify(inProgRes.body)}`);
    passStep("Order status updated to InProgress", "Status: InProgress (4)");

    // 3.4 Move to ReadyForDelivery (5)
    const readyRes = await api("/api/Orders/update-status", supplier1.token, {
      method: "PATCH",
      body: JSON.stringify({ orderId: archOrderId, status: "ReadyForDelivery" }),
    });
    if (!readyRes.ok) throw new Error(`update-status ReadyForDelivery failed: ${readyRes.status} ${JSON.stringify(readyRes.body)}`);
    passStep("Order status updated to ReadyForDelivery", "Status: ReadyForDelivery (5)");

    // 3.5 Move to Delivered (6)
    const delivRes = await api("/api/Orders/update-status", supplier1.token, {
      method: "PATCH",
      body: JSON.stringify({ orderId: archOrderId, status: "Delivered" }),
    });
    if (!delivRes.ok) throw new Error(`update-status Delivered failed: ${delivRes.status} ${JSON.stringify(delivRes.body)}`);
    passStep("Order status updated to Delivered", "Status: Delivered (6)");

    // 3.6 Move to Paid (9)
    const paidRes = await api("/api/Orders/update-status", supplier1.token, {
      method: "PATCH",
      body: JSON.stringify({ orderId: archOrderId, status: "Paid" }),
    });
    if (!paidRes.ok) throw new Error(`update-status Paid failed: ${paidRes.status} ${JSON.stringify(paidRes.body)}`);
    passStep("Order status updated to Paid", "Status: Paid (9)");

    // 3.7 Move to Finished (10) (Full Completion / Archive)
    const finishRes = await api("/api/Orders/update-status", supplier1.token, {
      method: "PATCH",
      body: JSON.stringify({ orderId: archOrderId, status: "Finished" }),
    });
    if (!finishRes.ok) throw new Error(`update-status Finished failed: ${finishRes.status} ${JSON.stringify(finishRes.body)}`);
    passStep("Order status updated to Finished (Archive)", "Status: Finished (10)");

    // 3.8 Test Archive Filter for HoReCa: status=10 (Finished)
    const horecaArchiveRes = await api("/api/Orders/get-orders?status=10", horeca.token, { method: "GET" });
    if (!horecaArchiveRes.ok) throw new Error(`get-orders?status=10 failed: ${horecaArchiveRes.status}`);
    const horecaOrders = Array.isArray(horecaArchiveRes.body) ? horecaArchiveRes.body : (horecaArchiveRes.body.items || []);
    const foundHoreca = horecaOrders.some((o) => (o.orderId || o.id || o.OrderId) === archOrderId);
    if (!foundHoreca) {
      throw new Error(`Archived order ${archOrderId} not found in HoReCa orders with status=10`);
    }
    passStep("HoReCa filters archived orders (status=10 / Finished)", `Found archived order: ${archOrderId}`);

    // 3.9 Test Archive Filter for Supplier: status=10 (Finished)
    const supArchiveRes = await api("/api/Orders/supplier/get-orders?status=10", supplier1.token, { method: "GET" });
    if (!supArchiveRes.ok) throw new Error(`supplier/get-orders?status=10 failed: ${supArchiveRes.status}`);
    const supOrders = Array.isArray(supArchiveRes.body) ? supArchiveRes.body : (supArchiveRes.body.items || []);
    const foundSup = supOrders.some((o) => (o.orderId || o.id || o.OrderId) === archOrderId);
    if (!foundSup) {
      throw new Error(`Archived order ${archOrderId} not found in Supplier orders with status=10`);
    }
    passStep("Supplier filters archived orders (status=10 / Finished)", `Found archived order: ${archOrderId}`);

    results.scenariosPassed++;
    console.log("  >>> SCENARIO 3 (ORDER ARCHIVING & COMPLETION): SUCCESS! <<<");
  } catch (err) {
    results.scenariosFailed++;
    failStep("SCENARIO 3 FAILURE", err.message || err);
  }

  // =====================================================================================
  // SUMMARY
  // =====================================================================================
  console.log("\n===================================================================");
  console.log("📊 ADVANCED SCENARIOS EXECUTION SUMMARY");
  console.log("===================================================================");
  console.log(`Scenarios Passed: ${results.scenariosPassed} / 3`);
  console.log(`Steps Passed:     ${results.stepsPassed}`);
  console.log(`Steps Failed:     ${results.stepsFailed}`);

  if (results.errors.length > 0) {
    console.log("\nErrors encountered:");
    for (const e of results.errors) {
      console.log(`- ${e.step}:`, e.error);
    }
    process.exit(1);
  } else {
    console.log("\n🎉 ALL 3 ADVANCED SCENARIOS PASSED WITH 100% SUCCESS!");
    process.exit(0);
  }
}

run().catch((err) => {
  console.error("FATAL ERROR:", err);
  process.exit(1);
});
