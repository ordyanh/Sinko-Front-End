import { initialUsers } from "./seeds/users";
import {
  initialSupplierCategories,
  initialSupplierProfiles,
} from "./seeds/supplier-categories";
import { initialSupplierProducts } from "./seeds/supplier-products";
import { initialSupplierPromotions } from "./seeds/supplier-promotions";
import { initialDeliveryAddresses } from "./seeds/delivery-addresses";
import type {
  AccountRole,
  LoggedInUser,
  SeedUser,
  StoredEmployee,
  StoredSupplierCategory,
  StoredSupplierProduct,
  StoredSupplierProductSellingOption,
  StoredSupplierProfile,
  StoredSupplierPromotion,
  StoredOrder,
  StoredDeliveryAddress,
  StoredOrderDeliveryAddressSnapshot,
  StoredOrderEvent,
  StoredOrderLine,
  StoredOrderStatus,
  SupplierProductStatus,
} from "./model";

import {
  loginUser,
  logoutUser,
  getSupplierCatalog,
  getProductById,
  upsertProduct,
  updateProductStatus,
  deleteProduct,
  getHorecaOrders,
  getSupplierOrders,
  getSupplierOrderById,
  createOrder as createBackendOrder,
  updateOrderStatus as updateBackendOrderStatus,
  sendPriceOffer,
  acceptOffer as backendAcceptOffer,
  rejectOffer as backendRejectOffer,
  cancelOrder as backendCancelOrder,
  getSupplierPromotions as getBackendSupplierPromotions,
  createPromotion as createBackendPromotion,
  getMarketplacePromotions,
  getEmployeesList,
  createEmployee as createBackendEmployee,
  updateEmployee as updateBackendEmployee,
  deleteEmployee as deleteBackendEmployee,
  getSupplierProfile as getBackendSupplierProfile,
  saveSupplierProfile as saveBackendSupplierProfile,
  addDeliveryPoint,
  type BackendProductDto,
  type BackendOrderDto,
  type BackendPromotionDto,
  type EmployeeListItem,
  type LoginResponse,
} from "~/shared/api";
import {
  clearAuthTokenCookie,
  getClientAuthToken,
  serializeAuthTokenCookie,
} from "~/shared/lib/auth-token";

export type {
  AccountRole,
  LoggedInUser,
  SeedUser,
  StoredEmployee,
  StoredSupplierCategory,
  StoredSupplierProduct,
  StoredSupplierProductSellingOption,
  StoredSupplierProfile,
  StoredSupplierPromotion,
  StoredOrder,
  StoredDeliveryAddress,
  StoredOrderDeliveryAddressSnapshot,
  StoredOrderEvent,
  StoredOrderLine,
  StoredOrderStatus,
  SupplierProductStatus,
} from "./model";
export { initialUsers } from "./seeds/users";

const DATABASE_NAME = "synko-mvp";
const DATABASE_VERSION = 8;
const USERS_STORE = "users";
const EMPLOYEES_STORE = "employees";
const SESSION_STORE = "session";
const SUPPLIER_CATEGORIES_STORE = "supplier-categories";
const SUPPLIER_PROFILES_STORE = "supplier-profiles";
const SUPPLIER_PRODUCTS_STORE = "supplier-products";
const ORDERS_STORE = "orders";
const SUPPLIER_PROMOTIONS_STORE = "supplier-promotions";
const DELIVERY_ADDRESSES_STORE = "delivery-addresses";
const ACTIVE_USER_KEY = "active-user";

/** Emitted after the order state is updated in the current browser tab. */
export const ORDERS_UPDATED_EVENT = "synko:orders-updated";
/** Emitted when a supplier creates or edits a promotion. */
export const PROMOTIONS_UPDATED_EVENT = "synko:promotions-updated";

type SessionRecord = {
  id: typeof ACTIVE_USER_KEY;
  userId: string;
};

function isBrowser() {
  return typeof window !== "undefined" && "indexedDB" in window;
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("IndexedDB request failed."));
  });
}

function transactionComplete(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () =>
      reject(
        transaction.error ?? new Error("IndexedDB transaction was aborted."),
      );
    transaction.onerror = () =>
      reject(transaction.error ?? new Error("IndexedDB transaction failed."));
  });
}

async function openDatabase(): Promise<IDBDatabase> {
  if (!isBrowser()) {
    throw new Error("IndexedDB is only available in the browser.");
  }

  const request = window.indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

  request.onupgradeneeded = (event) => {
    const database = request.result;
    if (!database.objectStoreNames.contains(USERS_STORE)) {
      database.createObjectStore(USERS_STORE, { keyPath: "id" });
    }
    if (!database.objectStoreNames.contains(EMPLOYEES_STORE)) {
      const employees = database.createObjectStore(EMPLOYEES_STORE, {
        keyPath: "id",
      });
      employees.createIndex("accountId", "accountId", { unique: false });
    }
    if (!database.objectStoreNames.contains(SESSION_STORE)) {
      database.createObjectStore(SESSION_STORE, { keyPath: "id" });
    }
    if (!database.objectStoreNames.contains(SUPPLIER_CATEGORIES_STORE)) {
      const categories = database.createObjectStore(SUPPLIER_CATEGORIES_STORE, {
        keyPath: "id",
      });
      categories.createIndex("accountId", "accountId", { unique: false });
    }
    if (!database.objectStoreNames.contains(SUPPLIER_PROFILES_STORE)) {
      database.createObjectStore(SUPPLIER_PROFILES_STORE, {
        keyPath: "accountId",
      });
    }
    if (!database.objectStoreNames.contains(SUPPLIER_PRODUCTS_STORE)) {
      const products = database.createObjectStore(SUPPLIER_PRODUCTS_STORE, {
        keyPath: "id",
      });
      products.createIndex("accountId", "accountId", { unique: false });
    }
    if (!database.objectStoreNames.contains(ORDERS_STORE)) {
      const orders = database.createObjectStore(ORDERS_STORE, { keyPath: "id" });
      orders.createIndex("horecaAccountId", "horecaAccountId", { unique: false });
      orders.createIndex("supplierAccountId", "supplierAccountId", {
        unique: false,
      });
    }
    if (!database.objectStoreNames.contains(SUPPLIER_PROMOTIONS_STORE)) {
      const promotions = database.createObjectStore(SUPPLIER_PROMOTIONS_STORE, {
        keyPath: "id",
      });
      promotions.createIndex("accountId", "accountId", { unique: false });
    }
    if (!database.objectStoreNames.contains(DELIVERY_ADDRESSES_STORE)) {
      const deliveryAddresses = database.createObjectStore(
        DELIVERY_ADDRESSES_STORE,
        {
          keyPath: "id",
        },
      );
      deliveryAddresses.createIndex("accountId", "accountId", { unique: false });
    }
  };

  return requestResult(request);
}

async function getUserById(userId: string): Promise<SeedUser | null> {
  const database = await openDatabase();
  const transaction = database.transaction(USERS_STORE, "readonly");
  const user = await requestResult(
    transaction.objectStore(USERS_STORE).get(userId),
  );
  database.close();
  return (user as SeedUser | undefined) ?? null;
}

function withoutPassword(user: SeedUser): LoggedInUser {
  const { password: _password, ...safeUser } = user;
  return safeUser;
}

/** Seeds data once. Existing local data and session are preserved. */
export async function initializeDatabase(): Promise<void> {
  const database = await openDatabase();
  const transaction = database.transaction(
    [
      USERS_STORE,
      SUPPLIER_CATEGORIES_STORE,
      SUPPLIER_PROFILES_STORE,
      SUPPLIER_PRODUCTS_STORE,
      SUPPLIER_PROMOTIONS_STORE,
      DELIVERY_ADDRESSES_STORE,
    ],
    "readwrite",
  );
  const users = transaction.objectStore(USERS_STORE);
  const supplierCategories = transaction.objectStore(SUPPLIER_CATEGORIES_STORE);
  const supplierProfiles = transaction.objectStore(SUPPLIER_PROFILES_STORE);
  const supplierProducts = transaction.objectStore(SUPPLIER_PRODUCTS_STORE);
  const supplierPromotions = transaction.objectStore(SUPPLIER_PROMOTIONS_STORE);
  const deliveryAddresses = transaction.objectStore(DELIVERY_ADDRESSES_STORE);

  const storedUsers = (await requestResult(users.getAll())) as SeedUser[];
  for (const seedUser of initialUsers) {
    const storedUser = storedUsers.find((user) => user.id === seedUser.id);
    if (!storedUser) users.put(seedUser);
    else if (!storedUser.address)
      users.put({ ...storedUser, address: seedUser.address });
  }

  for (const category of initialSupplierCategories) {
    if (!(await requestResult(supplierCategories.get(category.id))))
      supplierCategories.put(category);
  }

  for (const profile of initialSupplierProfiles) {
    if (!(await requestResult(supplierProfiles.get(profile.accountId))))
      supplierProfiles.put(profile);
  }
  for (const product of initialSupplierProducts) {
    if (!(await requestResult(supplierProducts.get(product.id))))
      supplierProducts.put(product);
  }
  for (const promotion of initialSupplierPromotions) {
    if (!(await requestResult(supplierPromotions.get(promotion.id))))
      supplierPromotions.put(promotion);
  }
  for (const deliveryAddress of initialDeliveryAddresses) {
    if (!(await requestResult(deliveryAddresses.get(deliveryAddress.id)))) {
      deliveryAddresses.put(deliveryAddress);
    }
  }

  await transactionComplete(transaction);
  database.close();
}

/** Restores default state and clears active login. */
export async function resetDatabase(): Promise<void> {
  const database = await openDatabase();
  const transaction = database.transaction(
    [
      USERS_STORE,
      EMPLOYEES_STORE,
      SESSION_STORE,
      SUPPLIER_CATEGORIES_STORE,
      SUPPLIER_PROFILES_STORE,
      SUPPLIER_PRODUCTS_STORE,
      ORDERS_STORE,
      SUPPLIER_PROMOTIONS_STORE,
      DELIVERY_ADDRESSES_STORE,
    ],
    "readwrite",
  );
  const users = transaction.objectStore(USERS_STORE);
  const employees = transaction.objectStore(EMPLOYEES_STORE);
  const session = transaction.objectStore(SESSION_STORE);
  const supplierCategories = transaction.objectStore(SUPPLIER_CATEGORIES_STORE);
  const supplierProfiles = transaction.objectStore(SUPPLIER_PROFILES_STORE);
  const supplierProducts = transaction.objectStore(SUPPLIER_PRODUCTS_STORE);
  const orders = transaction.objectStore(ORDERS_STORE);
  const promotions = transaction.objectStore(SUPPLIER_PROMOTIONS_STORE);
  const deliveryAddresses = transaction.objectStore(DELIVERY_ADDRESSES_STORE);

  users.clear();
  employees.clear();
  session.clear();
  supplierCategories.clear();
  supplierProfiles.clear();
  supplierProducts.clear();
  orders.clear();
  promotions.clear();
  deliveryAddresses.clear();
  for (const user of initialUsers) {
    users.put(user);
  }
  for (const category of initialSupplierCategories) {
    supplierCategories.put(category);
  }
  for (const profile of initialSupplierProfiles) {
    supplierProfiles.put(profile);
  }
  for (const product of initialSupplierProducts) {
    supplierProducts.put(product);
  }
  for (const promotion of initialSupplierPromotions) {
    promotions.put(promotion);
  }
  for (const deliveryAddress of initialDeliveryAddresses) {
    deliveryAddresses.put(deliveryAddress);
  }

  await transactionComplete(transaction);
  database.close();
  if (typeof document !== "undefined") {
    document.cookie = clearAuthTokenCookie();
  }
}

// -----------------------------------------------------------------------------
// Employees
// -----------------------------------------------------------------------------

function mapBackendEmployeeToStored(
  be: EmployeeListItem,
  accountId: string,
  role: AccountRole,
): StoredEmployee {
  return {
    id: be.id,
    accountId,
    accountRole: role,
    name:
      be.employeeName ||
      `${be.firstName || ""} ${be.lastName || ""}`.trim() ||
      "Employee",
    email: be.email || "",
    role: be.role || "Admin",
    location: be.regionNames?.[0] || "Yerevan",
    phoneNumber: be.phoneNumber,
    status: be.status === "OnVacation" ? "On vacation" : "Active",
    vacationStartDate: be.statusStartDate,
    vacationEndDate: be.statusEndDate,
  };
}

export async function getEmployeesForAccount(
  accountId: string,
): Promise<StoredEmployee[]> {
  try {
    const backendEmployees = await getEmployeesList();
    if (Array.isArray(backendEmployees) && backendEmployees.length > 0) {
      const activeUser = await getLoggedInUser();
      const role = activeUser?.role ?? "supplier";
      const mapped = backendEmployees.map((be) =>
        mapBackendEmployeeToStored(be, accountId, role),
      );

      // Cache locally
      const database = await openDatabase();
      const transaction = database.transaction(EMPLOYEES_STORE, "readwrite");
      const store = transaction.objectStore(EMPLOYEES_STORE);
      for (const emp of mapped) {
        store.put(emp);
      }
      await transactionComplete(transaction);
      database.close();

      return mapped;
    }
  } catch {
    // fallback to local store
  }

  const database = await openDatabase();
  const transaction = database.transaction(EMPLOYEES_STORE, "readonly");
  const employees = transaction.objectStore(EMPLOYEES_STORE);
  const records = (await requestResult(
    employees.index("accountId").getAll(IDBKeyRange.only(accountId)),
  )) as StoredEmployee[];
  database.close();
  return records;
}

export function createEmployeeId(): string {
  const randomId =
    globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
  return `employee-${randomId}`;
}

export async function saveEmployee(employee: StoredEmployee): Promise<void> {
  try {
    const names = employee.name.split(" ");
    const firstName = names[0] || "";
    const lastName = names.slice(1).join(" ") || "";

    if (employee.id.startsWith("employee-")) {
      await createBackendEmployee({
        employeeName: employee.name,
        firstName,
        lastName,
        email: employee.email,
        phoneNumber: employee.phoneNumber,
        role: employee.role as any,
      });
    } else {
      await updateBackendEmployee(employee.id, {
        employeeId: employee.id,
        firstName,
        lastName,
        role: employee.role as any,
        status: employee.status === "On vacation" ? "OnVacation" : "Active",
        statusStartDate: employee.vacationStartDate,
        statusEndDate: employee.vacationEndDate,
      });
    }
  } catch {
    // Keep local persistence working
  }

  const database = await openDatabase();
  const transaction = database.transaction(EMPLOYEES_STORE, "readwrite");
  transaction.objectStore(EMPLOYEES_STORE).put(employee);
  await transactionComplete(transaction);
  database.close();
}

export async function deleteEmployee(
  accountId: string,
  employeeId: string,
): Promise<void> {
  try {
    await deleteBackendEmployee(employeeId);
  } catch {
    // local fallback
  }

  const database = await openDatabase();
  const transaction = database.transaction(EMPLOYEES_STORE, "readwrite");
  const employees = transaction.objectStore(EMPLOYEES_STORE);
  const employee = (await requestResult(
    employees.get(employeeId),
  )) as StoredEmployee | undefined;

  if (employee?.accountId === accountId) {
    employees.delete(employeeId);
  }

  await transactionComplete(transaction);
  database.close();
}

// -----------------------------------------------------------------------------
// Supplier Categories & Profile
// -----------------------------------------------------------------------------

export async function getSupplierCategories(
  accountId: string,
): Promise<StoredSupplierCategory[]> {
  await initializeDatabase();
  const database = await openDatabase();
  const transaction = database.transaction(
    SUPPLIER_CATEGORIES_STORE,
    "readonly",
  );
  const categories = transaction.objectStore(SUPPLIER_CATEGORIES_STORE);
  const records = (await requestResult(
    categories.index("accountId").getAll(IDBKeyRange.only(accountId)),
  )) as StoredSupplierCategory[];
  database.close();

  return records.sort((first, second) => first.name.localeCompare(second.name));
}

export async function createSupplierCategory(
  accountId: string,
  name: string,
): Promise<StoredSupplierCategory> {
  const normalizedName = name.trim();
  if (!normalizedName) {
    throw new Error("Category name is required.");
  }

  const categories = await getSupplierCategories(accountId);
  const existingCategory = categories.find(
    (category) =>
      category.name.toLocaleLowerCase() === normalizedName.toLocaleLowerCase(),
  );
  if (existingCategory) return existingCategory;

  const category: StoredSupplierCategory = {
    id: `supplier-category-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`}`,
    accountId,
    name: normalizedName,
  };
  const database = await openDatabase();
  const transaction = database.transaction(
    SUPPLIER_CATEGORIES_STORE,
    "readwrite",
  );
  transaction.objectStore(SUPPLIER_CATEGORIES_STORE).put(category);
  await transactionComplete(transaction);
  database.close();

  return category;
}

export async function getSupplierProfile(
  accountId: string,
): Promise<StoredSupplierProfile> {
  try {
    const backendProfile = await getBackendSupplierProfile();
    if (backendProfile) {
      return {
        accountId,
        categoryIds: (backendProfile.categoryIds ?? []).map(String),
        description: backendProfile.description ?? "",
      };
    }
  } catch {
    // fallback
  }

  await initializeDatabase();
  const database = await openDatabase();
  const transaction = database.transaction(SUPPLIER_PROFILES_STORE, "readonly");
  const profile = (await requestResult(
    transaction.objectStore(SUPPLIER_PROFILES_STORE).get(accountId),
  )) as StoredSupplierProfile | undefined;
  database.close();

  return profile ?? { accountId, categoryIds: [], description: "" };
}

export async function saveSupplierProfile(
  profile: StoredSupplierProfile,
): Promise<void> {
  try {
    await saveBackendSupplierProfile({
      description: profile.description,
      categoryIds: profile.categoryIds.map(Number).filter((n) => !isNaN(n)),
    });
  } catch {
    // fallback
  }

  const database = await openDatabase();
  const transaction = database.transaction(SUPPLIER_PROFILES_STORE, "readwrite");
  transaction.objectStore(SUPPLIER_PROFILES_STORE).put(profile);
  await transactionComplete(transaction);
  database.close();
}

// -----------------------------------------------------------------------------
// Products
// -----------------------------------------------------------------------------

function mapUnitTypeToBackend(unitType?: string): number {
  const lower = (unitType ?? "").toLowerCase();
  if (lower.includes("kg") || lower.includes("килограмм") || lower.includes("կգ")) return 2; // Kg
  if (lower.includes("gram") || lower.includes("грамм") || lower.includes("գր")) return 3; // Gram
  if (lower.includes("liter") || lower.includes("литр") || lower.includes("լ")) return 4; // Liter
  if (lower.includes("ml") || lower.includes("миллилитр") || lower.includes("մլ")) return 5; // Ml
  if (lower.includes("box") || lower.includes("ящик") || lower.includes("տուփ")) return 6; // Box
  return 1; // Piece
}

function mapBackendProductToStored(
  bp: BackendProductDto,
  accountId: string,
): StoredSupplierProduct {
  const unitName =
    bp.unit === 2
      ? "Kilogram"
      : bp.unit === 3
        ? "Gram"
        : bp.unit === 4
          ? "Liter"
          : "Piece";

  const resolvedPrice =
    bp.standardPrice ??
    bp.StandardPrice ??
    bp.basePrice ??
    bp.price ??
    0;

  const isProductActive =
    bp.status === "Active" ||
    String(bp.status) === "1" ||
    String(bp.status).toLowerCase() === "active";

  return {
    id: String(bp.id),
    accountId: bp.supplierId || accountId,
    name: bp.name || (bp.names ? Object.values(bp.names)[0] : "Product"),
    description: bp.description || "",
    categoryIds: bp.categoryId ? [String(bp.categoryId)] : [],
    code: bp.code || undefined,
    imageUrl: bp.imageUrl || undefined,
    status: isProductActive ? "Active" : "Inactive",
    createdAt: bp.createdAt || new Date().toISOString(),
    sellingOptions:
      Array.isArray(bp.sellingOptions) && bp.sellingOptions.length > 0
        ? bp.sellingOptions.map((opt) => ({
            id: String(opt.id || `opt-${opt.name}`),
            quantity: Number(opt.quantity ?? opt.packageCount ?? 1),
            unitType: opt.unitType || unitName,
            price: Number(opt.price ?? opt.unitPrice ?? resolvedPrice),
            minimumOrderQuantity: Number(opt.minimumOrder ?? 1),
            companyPrices: Array.isArray(opt.companyPrices)
              ? opt.companyPrices.map((cp) => ({
                  resourceId: cp.clientId,
                  individualPrice: cp.price,
                }))
              : [],
          }))
        : [
            {
              id: `opt-${bp.id}-default`,
              quantity: 1,
              unitType: unitName,
              price: resolvedPrice,
              minimumOrderQuantity: 1,
              companyPrices: [],
            },
          ],
  };
}

export function createSupplierProductId(): string {
  const randomId =
    globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
  return `product-${randomId}`;
}

export async function getSupplierProducts(
  accountId: string,
): Promise<StoredSupplierProduct[]> {
  try {
    const backendProducts = await getSupplierCatalog();
    if (Array.isArray(backendProducts) && backendProducts.length > 0) {
      const mapped = backendProducts.map((p) =>
        mapBackendProductToStored(p, accountId),
      );

      // Cache in IndexedDB
      const database = await openDatabase();
      const transaction = database.transaction(
        SUPPLIER_PRODUCTS_STORE,
        "readwrite",
      );
      const store = transaction.objectStore(SUPPLIER_PRODUCTS_STORE);
      for (const prod of mapped) {
        store.put(prod);
      }
      await transactionComplete(transaction);
      database.close();

      return mapped.sort((first, second) =>
        second.createdAt.localeCompare(first.createdAt),
      );
    }
  } catch {
    // fallback to local store
  }

  await initializeDatabase();
  const database = await openDatabase();
  const transaction = database.transaction(SUPPLIER_PRODUCTS_STORE, "readonly");
  const products = transaction.objectStore(SUPPLIER_PRODUCTS_STORE);
  const records = (await requestResult(
    products.index("accountId").getAll(IDBKeyRange.only(accountId)),
  )) as StoredSupplierProduct[];
  database.close();

  return records.sort((first, second) =>
    second.createdAt.localeCompare(first.createdAt),
  );
}

export async function getSupplierProduct(
  accountId: string,
  productId: string,
): Promise<StoredSupplierProduct | null> {
  try {
    const backendProduct = await getProductById(productId);
    if (backendProduct) {
      return mapBackendProductToStored(backendProduct, accountId);
    }
  } catch {
    // fallback
  }

  await initializeDatabase();
  const database = await openDatabase();
  const transaction = database.transaction(SUPPLIER_PRODUCTS_STORE, "readonly");
  const product = (await requestResult(
    transaction.objectStore(SUPPLIER_PRODUCTS_STORE).get(productId),
  )) as StoredSupplierProduct | undefined;
  database.close();

  return product?.accountId === accountId ? product : null;
}

export async function saveSupplierProduct(
  product: StoredSupplierProduct,
): Promise<void> {
  const primaryOption = product.sellingOptions[0];
  const rawId = parseInt(String(product.id).replace(/\D/g, ""), 10);
  const isLocalId =
    String(product.id).startsWith("product-") || isNaN(rawId) || rawId <= 0;
  const numericId = isLocalId ? null : rawId;

  const rawCat = product.categoryIds[0]
    ? parseInt(String(product.categoryIds[0]).replace(/\D/g, ""), 10)
    : null;
  const categoryId = rawCat && !isNaN(rawCat) && rawCat > 0 ? rawCat : 1;

  const rawPrice = Number(primaryOption?.price ?? 0);
  const basePrice = !isNaN(rawPrice) && rawPrice > 0 ? rawPrice : 1;

  const code =
    product.code?.trim() ||
    `PRD-${Math.abs(product.name.split("").reduce((acc, c) => ((acc << 5) - acc) + c.charCodeAt(0), 0)).toString().slice(0, 6)}`;

  // Backend Sinko.DAL.Enums.ProductStatus: Active = 1, Inactive = 2
  const status = product.status === "Active" ? "Active" : "Inactive";
  const unit = mapUnitTypeToBackend(primaryOption?.unitType);

  try {
    const upsertRes = await upsertProduct({
      id: numericId,
      code,
      names: { "1": product.name.trim() || "Product" },
      unit,
      basePrice,
      categoryId,
      status,
      inStock: product.status !== "Inactive",
      description: product.description || "",
      imageUrl: product.imageUrl || null,
      packageOptions: product.sellingOptions
        .map((opt) => Number(opt.quantity))
        .filter((q) => q > 0),
      packaging: primaryOption
        ? `${primaryOption.quantity} ${primaryOption.unitType}`
        : null,
      sellingOptions: product.sellingOptions.map((opt) => ({
        id: typeof opt.id === "number" ? opt.id : undefined,
        name: `${opt.quantity} ${opt.unitType}`,
        quantity: opt.quantity,
        unitType: opt.unitType,
        price: opt.price,
        unitPrice: opt.price,
        packageCount: opt.quantity,
      })),
    });

    const serverId = upsertRes?.productId ?? upsertRes?.ProductId ?? upsertRes?.id;
    if (serverId) {
      product.id = String(serverId);
    }
  } catch (backendError) {
    console.warn("Backend product upsert error (continuing with local save):", backendError);
  }

  const database = await openDatabase();
  const transaction = database.transaction(
    SUPPLIER_PRODUCTS_STORE,
    "readwrite",
  );
  transaction.objectStore(SUPPLIER_PRODUCTS_STORE).put(product);
  await transactionComplete(transaction);
  database.close();
}

export async function deleteSupplierProduct(
  accountId: string,
  productId: string,
): Promise<void> {
  const numericId = parseInt(String(productId).replace(/\D/g, ""), 10);
  if (!isNaN(numericId) && numericId > 0) {
    try {
      await deleteProduct(numericId);
    } catch {
      try {
        await updateProductStatus(numericId, "Inactive");
      } catch {
        // fallback
      }
    }
  }

  const database = await openDatabase();
  const transaction = database.transaction(
    SUPPLIER_PRODUCTS_STORE,
    "readwrite",
  );
  const products = transaction.objectStore(SUPPLIER_PRODUCTS_STORE);
  const product = (await requestResult(
    products.get(productId),
  )) as StoredSupplierProduct | undefined;

  if (product?.accountId === accountId) {
    products.delete(productId);
  }

  await transactionComplete(transaction);
  database.close();
}

// -----------------------------------------------------------------------------
// Promotions
// -----------------------------------------------------------------------------

function mapBackendPromotionToStored(
  bp: BackendPromotionDto,
  accountId: string,
): StoredSupplierPromotion {
  return {
    id: bp.id,
    accountId: bp.supplierId || accountId,
    name: bp.name,
    description: bp.description || "",
    type:
      bp.type === "BuyXGetY"
        ? "BuyXGetY"
        : bp.type === "Discount"
          ? "Percentage"
          : "FixedPrice",
    status: bp.status === "Active" ? "Active" : "Draft",
    startDate: bp.startDate || new Date().toISOString(),
    endDate: bp.endDate,
    productIds: Array.isArray(bp.products)
      ? bp.products.map((p) => String(p.productId))
      : [],
    discountOptionKeys: [],
    fixedPrices: {},
    discountPercent: bp.products?.[0]?.discountPercentage
      ? String(bp.products[0].discountPercentage)
      : "10",
    eligibility:
      bp.targetCustomerIds && bp.targetCustomerIds.length > 0
        ? "specific-customers"
        : "all-customers",
    eligibleCustomerIds: bp.targetCustomerIds || [],
    applyOnIndividualPricing: false,
    isBannerEnabled: Boolean(bp.bannerImageUrl),
    display: "both",
    brandColorFallback: bp.brandColorFallback || "#2563EB",
    createdAt: bp.createdAt || new Date().toISOString(),
    updatedAt: bp.updatedAt || new Date().toISOString(),
  };
}

export function createSupplierPromotionId(): string {
  const randomId =
    globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
  return `PROMO-${randomId.slice(0, 8).toUpperCase()}`;
}

export async function getSupplierPromotions(
  accountId: string,
): Promise<StoredSupplierPromotion[]> {
  try {
    const backendPromos = await getBackendSupplierPromotions();
    if (Array.isArray(backendPromos) && backendPromos.length > 0) {
      const mapped = backendPromos.map((p) =>
        mapBackendPromotionToStored(p, accountId),
      );

      const database = await openDatabase();
      const transaction = database.transaction(
        SUPPLIER_PROMOTIONS_STORE,
        "readwrite",
      );
      const store = transaction.objectStore(SUPPLIER_PROMOTIONS_STORE);
      for (const pr of mapped) {
        store.put(pr);
      }
      await transactionComplete(transaction);
      database.close();

      return mapped.sort((first, second) =>
        second.updatedAt.localeCompare(first.updatedAt),
      );
    }
  } catch {
    // fallback
  }

  await initializeDatabase();
  const database = await openDatabase();
  const transaction = database.transaction(
    SUPPLIER_PROMOTIONS_STORE,
    "readonly",
  );
  const records = (await requestResult(
    transaction
      .objectStore(SUPPLIER_PROMOTIONS_STORE)
      .index("accountId")
      .getAll(IDBKeyRange.only(accountId)),
  )) as StoredSupplierPromotion[];
  database.close();
  return records.sort((first, second) =>
    second.updatedAt.localeCompare(first.updatedAt),
  );
}

export async function getSupplierPromotion(
  accountId: string,
  promotionId: string,
): Promise<StoredSupplierPromotion | null> {
  const promotions = await getSupplierPromotions(accountId);
  return (
    promotions.find((promo) => promo.id === promotionId && promo.accountId === accountId) ??
    null
  );
}

export async function saveSupplierPromotion(
  promotion: StoredSupplierPromotion,
): Promise<void> {
  try {
    await createBackendPromotion({
      name: promotion.name,
      description: promotion.description,
      type:
        promotion.type === "BuyXGetY"
          ? "BuyXGetY"
          : promotion.type === "Percentage"
            ? "Discount"
            : "SpecialPrice",
      startDate: promotion.startDate,
      endDate: promotion.endDate || new Date(Date.now() + 86400000 * 30).toISOString(),
      status: promotion.status === "Active" ? "Active" : "Draft",
      bannerEnabled: promotion.isBannerEnabled,
      brandColorFallback: promotion.brandColorFallback,
      targetCustomerIds:
        promotion.eligibility === "specific-customers"
          ? promotion.eligibleCustomerIds
          : null,
      products: promotion.productIds.map((pId) => ({
        productId: parseInt(pId.replace(/\D/g, ""), 10) || 1,
        discountPercentage: promotion.discountPercent
          ? Number(promotion.discountPercent)
          : 10,
      })),
    });
  } catch {
    // continue with local store
  }

  const database = await openDatabase();
  const transaction = database.transaction(
    SUPPLIER_PROMOTIONS_STORE,
    "readwrite",
  );
  transaction.objectStore(SUPPLIER_PROMOTIONS_STORE).put(promotion);
  await transactionComplete(transaction);
  database.close();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(PROMOTIONS_UPDATED_EVENT));
  }
}

/** Returns promotions for the marketplace projection. */
export async function getAllSupplierPromotions(): Promise<StoredSupplierPromotion[]> {
  try {
    const backendPromos = await getMarketplacePromotions();
    if (Array.isArray(backendPromos) && backendPromos.length > 0) {
      return backendPromos.map((p) =>
        mapBackendPromotionToStored(p, p.supplierId || "supplier"),
      );
    }
  } catch {
    // fallback
  }

  await initializeDatabase();
  const database = await openDatabase();
  const transaction = database.transaction(
    SUPPLIER_PROMOTIONS_STORE,
    "readonly",
  );
  const records = (await requestResult(
    transaction.objectStore(SUPPLIER_PROMOTIONS_STORE).getAll(),
  )) as StoredSupplierPromotion[];
  database.close();
  return records.sort((first, second) =>
    second.updatedAt.localeCompare(first.updatedAt),
  );
}

// -----------------------------------------------------------------------------
// Delivery Addresses
// -----------------------------------------------------------------------------

export async function getApprovedActiveDeliveryAddresses(): Promise<
  StoredDeliveryAddress[]
> {
  const addresses = await getDeliveryAddressesForCurrentHoreca();
  return addresses
    .filter((address) => address.approved && address.active)
    .sort((first, second) =>
      (first.label ?? first.fullAddress).localeCompare(
        second.label ?? second.fullAddress,
      ),
    );
}

type DeliveryAddressInput = {
  id?: string;
  label?: string;
  fullAddress: string;
  contactPerson: string;
  contactPhone: string;
  active?: boolean;
};

async function getCurrentHorecaAccount() {
  const user = await getLoggedInUser();
  if (!user || user.role !== "horeca") {
    throw new Error(
      "You need to be signed in as a HoReCa account to manage delivery addresses.",
    );
  }
  return user;
}

export async function getDeliveryAddressesForCurrentHoreca(): Promise<
  StoredDeliveryAddress[]
> {
  const user = await getCurrentHorecaAccount();
  const database = await openDatabase();
  const transaction = database.transaction(DELIVERY_ADDRESSES_STORE, "readonly");
  const addresses = (await requestResult(
    transaction
      .objectStore(DELIVERY_ADDRESSES_STORE)
      .index("accountId")
      .getAll(IDBKeyRange.only(user.id)),
  )) as StoredDeliveryAddress[];
  database.close();

  return addresses.sort((first, second) =>
    (first.label ?? first.fullAddress).localeCompare(
      second.label ?? second.fullAddress,
    ),
  );
}

export async function saveDeliveryAddressForCurrentHoreca(
  input: DeliveryAddressInput,
): Promise<StoredDeliveryAddress> {
  const user = await getCurrentHorecaAccount();
  const fullAddress = input.fullAddress.trim();
  const contactPerson = input.contactPerson.trim();
  const contactPhone = input.contactPhone.trim();
  const label = input.label?.trim() || undefined;
  if (!fullAddress || !contactPerson || !contactPhone) {
    throw new Error("Address, contact person, and contact phone are required.");
  }

  try {
    await addDeliveryPoint({
      deliveryAddress: fullAddress,
      phoneNumber: contactPhone,
      pointName: label || fullAddress,
    });
  } catch {
    // continue saving locally
  }

  const database = await openDatabase();
  const transaction = database.transaction(
    DELIVERY_ADDRESSES_STORE,
    "readwrite",
  );
  const store = transaction.objectStore(DELIVERY_ADDRESSES_STORE);
  const existing = input.id
    ? ((await requestResult(store.get(input.id))) as
        | StoredDeliveryAddress
        | undefined)
    : undefined;
  if (existing && existing.accountId !== user.id) {
    transaction.abort();
    database.close();
    throw new Error("This delivery address does not belong to your company.");
  }

  const address: StoredDeliveryAddress = {
    id:
      existing?.id ??
      `delivery-address-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`}`,
    accountId: user.id,
    label,
    fullAddress,
    contactPerson,
    contactPhone,
    approved: existing?.approved ?? true,
    active: input.active ?? existing?.active ?? true,
  };
  store.put(address);
  await transactionComplete(transaction);
  database.close();
  return address;
}

export async function getApprovedActiveDeliveryAddressForOrder(
  addressId: string,
): Promise<StoredOrderDeliveryAddressSnapshot> {
  const selectedAddress = (await getApprovedActiveDeliveryAddresses()).find(
    (address) => address.id === addressId,
  );
  if (!selectedAddress) {
    throw new Error(
      "Select an approved, active delivery address before placing your order.",
    );
  }

  return {
    addressId: selectedAddress.id,
    fullAddress: selectedAddress.fullAddress,
    label: selectedAddress.label,
    contactPerson: selectedAddress.contactPerson,
    contactPhone: selectedAddress.contactPhone,
  };
}

// -----------------------------------------------------------------------------
// Orders
// -----------------------------------------------------------------------------

function mapBackendOrderToStored(
  bo: BackendOrderDto,
  defaultAccountId: string,
): StoredOrder {
  const statusMap: Record<string, StoredOrderStatus> = {
    Draft: "New",
    New: "New",
    Seen: "New",
    Accepted: "Confirmed",
    Confirmed: "Confirmed",
    Preparing: "Preparing",
    Processing: "Preparing",
    InProgress: "Preparing",
    InPreparation: "Preparing",
    Shipped: "Shipped",
    Shipping: "Shipped",
    ReadyForDelivery: "Shipped",
    OnTheWay: "Shipped",
    Delivered: "Delivered",
    Cancelled: "Cancelled",
    Rejected: "Rejected",
    Pending: "Waiting for restaurant confirmation",
    "Waiting for restaurant confirmation": "Waiting for restaurant confirmation",
    WaitingConfirmation: "Waiting for restaurant confirmation",
    OfferReceived: "Waiting for restaurant confirmation",
    OfferSent: "Waiting for restaurant confirmation",
    Paid: "Delivered",
    Finished: "Delivered",
  };

  const statusKey = String(bo.status ?? "New");
  const storedStatus: StoredOrderStatus = statusMap[statusKey] || "New";

  const rawLines = Array.isArray(bo.lines) && bo.lines.length > 0
    ? bo.lines
    : Array.isArray((bo as any).items)
      ? (bo as any).items
      : [];

  return {
    id: String(bo.id || bo.orderId || ""),
    horecaAccountId: bo.horecaId || defaultAccountId,
    horecaName: bo.horecaName || bo.clientName || bo.restaurantName || "HoReCa Customer",
    horecaContactName: bo.contactPerson || bo.createdByEmployeeName || "Manager",
    horecaEmail: bo.clientEmail || "",
    horecaPhone: bo.contactPhone || bo.clientPhoneNumber || "",
    horecaAddress: bo.deliveryAddress || "",
    supplierAccountId: bo.supplierId || bo.suplierId || "supplier-default",
    supplierId: bo.supplierId || bo.suplierId || "supplier-default",
    supplierName: bo.supplierName || bo.suplierName || "Supplier",
    supplierContactName: bo.assignedEmployeeName || "",
    supplierEmail: "",
    supplierPhone: "",
    supplierAddress: "",
    placedAt: bo.placedAt || bo.creationDate || new Date().toISOString(),
    offerReceivedAt: null,
    deliveryDate: bo.placedAt || bo.creationDate || new Date().toISOString(),
    deliveryAddress: bo.deliveryAddress || "",
    deliveryAddressSnapshot: {
      addressId: bo.deliveryAddressId || "addr-default",
      fullAddress: bo.deliveryAddress || "",
      contactPerson: bo.contactPerson || bo.createdByEmployeeName || "",
      contactPhone: bo.contactPhone || bo.clientPhoneNumber || "",
    },
    status: storedStatus,
    lines: rawLines.map((l: any) => ({
      id: String(l.sellingOptionId ? `${l.productId}-${l.sellingOptionId}` : `line-${l.productId}`),
      productId: String(l.productId),
      sellingOptionId: l.sellingOptionId,
      name: l.productName || l.name || "Product",
      image: l.imageUrl || l.image || "",
      unit: l.unitDisplay || l.unitName || (typeof l.unit === "string" ? l.unit : "Piece"),
      minimumOrderQuantity: 1,
      requestedQuantity: Number(l.quantity ?? l.count ?? 1),
      requestedPrice: Number(l.unitPrice ?? l.finalPrice ?? l.basePrice ?? 0),
      offeredQuantity: Number(l.quantity ?? l.count ?? 1),
      offeredPrice: Number(l.unitPrice ?? l.finalPrice ?? l.basePrice ?? 0),
      comment: l.comment || "",
    })),
    history: Array.isArray(bo.events)
      ? bo.events.map((e) => ({
          id: e.id || String(Date.now()),
          actor: e.type.includes("Supplier") ? ("supplier" as const) : ("restaurant" as const),
          label: e.description,
          date: e.createdAt,
        }))
      : [
          {
            id: "event-1",
            actor: "restaurant",
            label: "Order placed",
            date: bo.placedAt || bo.creationDate || new Date().toISOString(),
          },
        ],
  };
}

export function createOrderId(): string {
  const randomId =
    globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
  return `ORD-${randomId.slice(0, 8).toUpperCase()}`;
}

export async function saveOrders(orders: StoredOrder[]): Promise<void> {
  if (orders.length === 0) return;

  const database = await openDatabase();
  const transaction = database.transaction(ORDERS_STORE, "readwrite");
  const store = transaction.objectStore(ORDERS_STORE);
  for (const order of orders) {
    const existingOrder = (await requestResult(
      store.get(order.id),
    )) as StoredOrder | undefined;

    const storedOrder = existingOrder?.deliveryAddressSnapshot
      ? {
          ...order,
          deliveryAddress: existingOrder.deliveryAddress,
          deliveryAddressSnapshot: existingOrder.deliveryAddressSnapshot,
        }
      : order;
    store.put(storedOrder);
  }
  await transactionComplete(transaction);
  database.close();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(ORDERS_UPDATED_EVENT));
  }
}

export async function saveOrder(order: StoredOrder): Promise<void> {
  try {
    const user = await getLoggedInUser();
    const role = user?.role;

    if (role === "supplier") {
      if (order.status === "Waiting for restaurant confirmation") {
        await sendPriceOffer({
          orderId: order.id,
          savePricesForCustomer: true,
          items: order.lines.map((l) => ({
            productId: parseInt(String(l.productId).replace(/\D/g, ""), 10) || 1,
            newPrice: l.offeredPrice,
            newQuantity: l.offeredQuantity,
            comment: l.comment || null,
          })),
        });
      } else {
        const statusMapToBackend: Record<StoredOrderStatus, string> = {
          New: "New",
          Confirmed: "Confirmed",
          Preparing: "InProgress",
          Shipped: "ReadyForDelivery",
          Delivered: "Delivered",
          Cancelled: "Cancelled",
          Rejected: "Rejected",
          "Waiting for restaurant confirmation": "WaitingConfirmation",
        };
        await updateBackendOrderStatus(
          order.id,
          statusMapToBackend[order.status] ?? "New",
        );
      }
    } else if (role === "horeca") {
      if (order.status === "Confirmed") {
        await backendAcceptOffer(order.id);
      } else if (order.status === "Rejected") {
        await backendRejectOffer(order.id);
      } else if (order.status === "Cancelled") {
        await backendCancelOrder(order.id);
      }
    }
  } catch {
    // Keep local persistence safe if backend call fails
  }

  await saveOrders([order]);
}

export async function getOrdersForHoreca(
  accountId: string,
): Promise<StoredOrder[]> {
  try {
    const backendOrders = await getHorecaOrders();
    if (Array.isArray(backendOrders) && backendOrders.length > 0) {
      const mapped = backendOrders.map((bo) =>
        mapBackendOrderToStored(bo, accountId),
      );

      const database = await openDatabase();
      const transaction = database.transaction(ORDERS_STORE, "readwrite");
      const store = transaction.objectStore(ORDERS_STORE);
      for (const ord of mapped) {
        store.put(ord);
      }
      await transactionComplete(transaction);
      database.close();

      return mapped.sort((first, second) =>
        second.placedAt.localeCompare(first.placedAt),
      );
    }
  } catch {
    // fallback
  }

  await initializeDatabase();
  const database = await openDatabase();
  const transaction = database.transaction(ORDERS_STORE, "readonly");
  const orders = (await requestResult(
    transaction
      .objectStore(ORDERS_STORE)
      .index("horecaAccountId")
      .getAll(IDBKeyRange.only(accountId)),
  )) as StoredOrder[];
  database.close();
  return orders.sort((first, second) =>
    second.placedAt.localeCompare(first.placedAt),
  );
}

export async function getOrdersForSupplier(
  accountId: string,
): Promise<StoredOrder[]> {
  try {
    const backendOrders = await getSupplierOrders();
    if (Array.isArray(backendOrders) && backendOrders.length > 0) {
      const mapped = backendOrders.map((bo) =>
        mapBackendOrderToStored(bo, accountId),
      );

      const database = await openDatabase();
      const transaction = database.transaction(ORDERS_STORE, "readwrite");
      const store = transaction.objectStore(ORDERS_STORE);
      for (const ord of mapped) {
        store.put(ord);
      }
      await transactionComplete(transaction);
      database.close();

      return mapped.sort((first, second) =>
        second.placedAt.localeCompare(first.placedAt),
      );
    }
  } catch {
    // fallback
  }

  await initializeDatabase();
  const database = await openDatabase();
  const transaction = database.transaction(ORDERS_STORE, "readonly");
  const orders = (await requestResult(
    transaction
      .objectStore(ORDERS_STORE)
      .index("supplierAccountId")
      .getAll(IDBKeyRange.only(accountId)),
  )) as StoredOrder[];
  database.close();
  return orders.sort((first, second) =>
    second.placedAt.localeCompare(first.placedAt),
  );
}

export async function getOrderForHoreca(
  accountId: string,
  orderId: string,
): Promise<StoredOrder | null> {
  try {
    const bo = await getSupplierOrderById(orderId);
    if (bo) return mapBackendOrderToStored(bo, accountId);
  } catch {
    // fallback
  }

  const database = await openDatabase();
  const transaction = database.transaction(ORDERS_STORE, "readonly");
  const order = (await requestResult(
    transaction.objectStore(ORDERS_STORE).get(orderId),
  )) as StoredOrder | undefined;
  database.close();
  return order?.horecaAccountId === accountId ? order : null;
}

export async function getOrderForSupplier(
  accountId: string,
  orderId: string,
): Promise<StoredOrder | null> {
  try {
    const bo = await getSupplierOrderById(orderId);
    if (bo) return mapBackendOrderToStored(bo, accountId);
  } catch {
    // fallback
  }

  const database = await openDatabase();
  const transaction = database.transaction(ORDERS_STORE, "readonly");
  const order = (await requestResult(
    transaction.objectStore(ORDERS_STORE).get(orderId),
  )) as StoredOrder | undefined;
  database.close();
  return order?.supplierAccountId === accountId ? order : null;
}

// -----------------------------------------------------------------------------
// Auth & Session
// -----------------------------------------------------------------------------

export function resolveAccountRole(
  authRes?: LoginResponse | null,
  fallbackRole: AccountRole = "horeca",
): AccountRole {
  if (!authRes) return fallbackRole;

  const rawAccountType = String(
    authRes.accountType ?? authRes.AccountType ?? "",
  ).toLowerCase();
  const rawBusinessType = String(
    authRes.businessType ?? authRes.BusinessType ?? "",
  ).toLowerCase();
  const rawRole = String(
    authRes.role ?? authRes.Role ?? authRes.userRole ?? authRes.UserRole ?? "",
  ).toLowerCase();

  if (
    rawAccountType === "client" ||
    rawAccountType === "horeca" ||
    rawBusinessType === "horeca" ||
    rawRole === "client" ||
    rawRole === "horeca"
  ) {
    return "horeca";
  }

  if (
    rawAccountType === "supplier" ||
    rawBusinessType === "supplier" ||
    rawRole === "supplier"
  ) {
    return "supplier";
  }

  const token =
    authRes.token ??
    authRes.Token ??
    authRes.accessToken ??
    authRes.AccessToken;

  if (typeof token === "string" && token.includes(".")) {
    try {
      const parts = token.split(".");
      if (parts.length >= 2) {
        const payloadJson = atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"));
        const payload = JSON.parse(payloadJson);
        const tokenRole = String(
          payload["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] ??
            payload.role ??
            payload.Role ??
            "",
        ).toLowerCase();

        if (tokenRole === "0" || tokenRole === "client" || tokenRole === "horeca") {
          return "horeca";
        }
        if (tokenRole === "1" || tokenRole === "supplier") {
          return "supplier";
        }
      }
    } catch {
      // ignore
    }
  }

  return fallbackRole;
}

export async function signInWithSeedUser(
  identifier: string,
  password: string,
  preferredRole: AccountRole = "horeca",
): Promise<LoggedInUser | null> {
  await initializeDatabase();
  const normalizedIdentifier = identifier.trim().toLowerCase();

  let authRes: LoginResponse | null = null;
  let backendError: Error | null = null;

  // Try real backend authentication first
  try {
    authRes = await loginUser({ email: identifier, password });
    const token =
      authRes?.token ||
      authRes?.Token ||
      authRes?.accessToken ||
      authRes?.AccessToken ||
      "";
    if (token && typeof document !== "undefined") {
      document.cookie = serializeAuthTokenCookie(token);
    }
  } catch (error) {
    backendError = error instanceof Error ? error : new Error(String(error));
  }

  const database = await openDatabase();
  const transaction = database.transaction(
    [USERS_STORE, SESSION_STORE],
    "readwrite",
  );
  const users = transaction.objectStore(USERS_STORE);
  const session = transaction.objectStore(SESSION_STORE);
  const allUsers = (await requestResult(users.getAll())) as SeedUser[];

  // 1. If backend authentication succeeded (200 OK)
  if (authRes) {
    const role = resolveAccountRole(authRes, preferredRole);
    const existingUser = allUsers.find(
      (candidate) =>
        candidate.email.toLowerCase() === normalizedIdentifier ||
        candidate.username.toLowerCase() === normalizedIdentifier,
    );

    const userId =
      authRes.organizationId ||
      authRes.OrganizationId ||
      authRes.userId ||
      authRes.UserId ||
      existingUser?.id ||
      `user-${normalizedIdentifier}`;

    const firstName = authRes.firstName || authRes.FirstName || "";
    const lastName = authRes.lastName || authRes.LastName || "";
    const fullName = [firstName, lastName].filter(Boolean).join(" ");
    const companyName =
      authRes.companyName ||
      authRes.CompanyName ||
      existingUser?.companyName ||
      (role === "horeca" ? "HoReCa Company" : "Supplier Company");
    const displayName =
      fullName ||
      existingUser?.displayName ||
      companyName ||
      identifier;
    const email = authRes.email || authRes.Email || existingUser?.email || identifier;
    const username = authRes.username || authRes.Username || existingUser?.username || identifier;

    const authenticatedUser: SeedUser = {
      id: userId,
      role,
      email,
      username,
      password,
      companyName,
      address: existingUser?.address || "",
      displayName,
    };

    users.put(authenticatedUser);
    session.put({
      id: ACTIVE_USER_KEY,
      userId: authenticatedUser.id,
    } satisfies SessionRecord);

    await transactionComplete(transaction);
    database.close();
    return withoutPassword(authenticatedUser);
  }

  // 2. Fallback to local seeds (if offline or seed user with matching password)
  const localUser = allUsers.find(
    (candidate) =>
      (candidate.email.toLowerCase() === normalizedIdentifier ||
        candidate.username.toLowerCase() === normalizedIdentifier) &&
      candidate.password === password,
  );

  if (localUser) {
    session.put({
      id: ACTIVE_USER_KEY,
      userId: localUser.id,
    } satisfies SessionRecord);
    await transactionComplete(transaction);
    database.close();
    return withoutPassword(localUser);
  }

  await transactionComplete(transaction);
  database.close();

  // If backend returned an error and no matching local seed found, throw backend error
  if (backendError) {
    throw backendError;
  }

  return null;
}

export async function signInAsDefaultUser(
  role: AccountRole,
): Promise<LoggedInUser> {
  await initializeDatabase();
  const user = initialUsers.find((candidate) => candidate.role === role);

  if (!user) {
    throw new Error(`No default ${role} account is available.`);
  }

  const database = await openDatabase();
  const transaction = database.transaction(SESSION_STORE, "readwrite");
  transaction.objectStore(SESSION_STORE).put({
    id: ACTIVE_USER_KEY,
    userId: user.id,
  } satisfies SessionRecord);
  await transactionComplete(transaction);
  database.close();

  return withoutPassword(user);
}

export async function getLoggedInUser(): Promise<LoggedInUser | null> {
  await initializeDatabase();
  const database = await openDatabase();
  const transaction = database.transaction(SESSION_STORE, "readonly");
  const activeSession = (await requestResult(
    transaction.objectStore(SESSION_STORE).get(ACTIVE_USER_KEY),
  )) as SessionRecord | undefined;
  database.close();

  if (!activeSession) return null;

  const user = await getUserById(activeSession.userId);
  return user ? withoutPassword(user) : null;
}

export async function getHorecaUsers(): Promise<LoggedInUser[]> {
  await initializeDatabase();
  const database = await openDatabase();
  const transaction = database.transaction(USERS_STORE, "readonly");
  const users = (await requestResult(
    transaction.objectStore(USERS_STORE).getAll(),
  )) as SeedUser[];
  database.close();

  return users
    .filter((user) => user.role === "horeca")
    .map(withoutPassword)
    .sort((first, second) => first.companyName.localeCompare(second.companyName));
}

export async function getSupplierUsers(): Promise<LoggedInUser[]> {
  await initializeDatabase();
  const database = await openDatabase();
  const transaction = database.transaction(USERS_STORE, "readonly");
  const users = (await requestResult(
    transaction.objectStore(USERS_STORE).getAll(),
  )) as SeedUser[];
  database.close();

  return users
    .filter((user) => user.role === "supplier")
    .map(withoutPassword)
    .sort((first, second) => first.companyName.localeCompare(second.companyName));
}

export async function signOut(): Promise<void> {
  try {
    await logoutUser();
  } catch {
    // ignore
  }

  if (typeof document !== "undefined") {
    document.cookie = clearAuthTokenCookie();
  }

  const database = await openDatabase();
  const transaction = database.transaction(SESSION_STORE, "readwrite");
  transaction.objectStore(SESSION_STORE).delete(ACTIVE_USER_KEY);
  await transactionComplete(transaction);
  database.close();
}

export function dashboardPathFor(role: AccountRole): "/horeca" | "/supplier" {
  return role === "supplier" ? "/supplier" : "/horeca";
}
