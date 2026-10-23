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
  StoredPromotionStatus,
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
  getHorecaOrderById,
  repeatOrder as backendRepeatOrder,
  approveOrder as backendApproveOrder,
  acceptOrder as backendAcceptOrder,
  assignOrder as backendAssignOrder,
  createOrder as createBackendOrder,
  generateOrderNum,
  updateOrderStatus as updateBackendOrderStatus,
  sendPriceOffer,
  acceptOffer as backendAcceptOffer,
  rejectOffer as backendRejectOffer,
  cancelOrder as backendCancelOrder,
  getSupplierPromotions as getBackendSupplierPromotions,
  createPromotion as createBackendPromotion,
  getMarketplacePromotions,
  getActivePromotions,
  ApiError,
  getMarketplaceSuppliers,
  getMarketplaceSupplierById,
  getMyClients,
  getClientProfile,
  getCompanyInfo,
  getDeliveryPoints,
  getDictionaryCategories,
  createCustomCategory,
  getEmployeesList,
  createEmployee as createBackendEmployee,
  updateEmployee as updateBackendEmployee,
  updateEmployeeStatus as updateBackendEmployeeStatus,
  deleteEmployee as deleteBackendEmployee,
  getSupplierProfile as getBackendSupplierProfile,
  saveSupplierProfile as saveBackendSupplierProfile,
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
  setClientAuthToken,
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
const DATABASE_VERSION = 9;
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
export const ORDERS_UPDATED_EVENT = "synco:orders-updated";
/** Emitted when a supplier creates or edits a promotion. */
export const PROMOTIONS_UPDATED_EVENT = "synco:promotions-updated";
export const BROADCAST_CHANNEL_NAME = "synco_order_notifications";

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
    if ((transaction as any).readyState === "complete" || (transaction as any).finished) {
      resolve();
      return;
    }
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

    const tx = request.transaction;
    if (tx) {
      for (const storeName of [
        SUPPLIER_PRODUCTS_STORE,
        ORDERS_STORE,
        SUPPLIER_PROMOTIONS_STORE,
        SUPPLIER_CATEGORIES_STORE,
        SUPPLIER_PROFILES_STORE,
        EMPLOYEES_STORE,
        DELIVERY_ADDRESSES_STORE,
        USERS_STORE,
      ]) {
        try {
          if (database.objectStoreNames.contains(storeName)) {
            tx.objectStore(storeName).clear();
          }
        } catch {
          // ignore
        }
      }
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
      ORDERS_STORE,
      SUPPLIER_PROMOTIONS_STORE,
      DELIVERY_ADDRESSES_STORE,
    ],
    "readwrite",
  );
  const users = transaction.objectStore(USERS_STORE);
  const supplierCategories = transaction.objectStore(SUPPLIER_CATEGORIES_STORE);
  const supplierProfiles = transaction.objectStore(SUPPLIER_PROFILES_STORE);
  const supplierProducts = transaction.objectStore(SUPPLIER_PRODUCTS_STORE);
  const orders = transaction.objectStore(ORDERS_STORE);
  const supplierPromotions = transaction.objectStore(SUPPLIER_PROMOTIONS_STORE);
  const deliveryAddresses = transaction.objectStore(DELIVERY_ADDRESSES_STORE);

  const storedUsers = (await requestResult(users.getAll())) as SeedUser[];
  for (const seedUser of initialUsers) {
    const storedUser = storedUsers.find((user) => user.id === seedUser.id);
    if (!storedUser) users.put(seedUser);
    else if (!storedUser.address)
      users.put({ ...storedUser, address: seedUser.address });
  }

  // Purge any legacy mock users
  for (const u of storedUsers) {
    if (u.id === "horeca-blue-lagoon" || u.id === "supplier-ararat-harvest" || u.id === "supplier-mare-terra") {
      users.delete(u.id);
    }
  }

  // Purge any legacy mock products containing unsplash or mock IDs
  const storedProducts = (await requestResult(supplierProducts.getAll())) as StoredSupplierProduct[];
  for (const p of storedProducts) {
    if (p.imageUrl?.includes("unsplash.com") || p.id.startsWith("PROD-") || p.id === "olive-oil" || p.id === "balsamic-vinegar" || p.id === "castelvetrano-olives") {
      supplierProducts.delete(p.id);
    }
  }

  // Purge any legacy mock orders
  const storedOrders = (await requestResult(orders.getAll())) as StoredOrder[];
  for (const o of storedOrders) {
    if (o.lines?.some((l) => l.image?.includes("unsplash.com")) || o.id.startsWith("ORD-91")) {
      orders.delete(o.id);
    }
  }

  // Purge any legacy mock promotions
  const storedPromos = (await requestResult(supplierPromotions.getAll())) as StoredSupplierPromotion[];
  for (const pr of storedPromos) {
    if (pr.id.startsWith("PROMO-MOCK") || pr.accountId?.startsWith("supplier-")) {
      supplierPromotions.delete(pr.id);
    }
  }

  // Purge any legacy mock delivery addresses
  const storedAddresses = (await requestResult(deliveryAddresses.getAll())) as StoredDeliveryAddress[];
  for (const da of storedAddresses) {
    if (da.id?.startsWith("delivery-blue-lagoon") || da.accountId === "horeca-blue-lagoon") {
      deliveryAddresses.delete(da.id);
    }
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
  let localEmployees: StoredEmployee[] = [];
  try {
    const database = await openDatabase();
    const transaction = database.transaction(EMPLOYEES_STORE, "readonly");
    const store = transaction.objectStore(EMPLOYEES_STORE);
    const records = (await requestResult(
      store.index("accountId").getAll(IDBKeyRange.only(accountId)),
    )) as StoredEmployee[];
    database.close();
    localEmployees = records || [];
  } catch {
    // ignore
  }

  try {
    const backendEmployees = await getEmployeesList();
    if (Array.isArray(backendEmployees)) {
      const activeUser = await getLoggedInUser();
      const role = activeUser?.role ?? "supplier";
      const localMap = new Map(localEmployees.map((e) => [e.id, e]));
      const localEmailMap = new Map(localEmployees.map((e) => [e.email.toLowerCase(), e]));

      const mapped = backendEmployees.map((be) => {
        const item = mapBackendEmployeeToStored(be, accountId, role);
        const existing = localMap.get(item.id) || localEmailMap.get(item.email.toLowerCase());
        if (existing) {
          if (!item.phoneNumber && existing.phoneNumber) {
            item.phoneNumber = existing.phoneNumber;
          }
          if (existing.location && (!item.location || item.location === "Yerevan")) {
            item.location = existing.location;
          }
        }
        return item;
      });

      // Save mapped into IndexedDB
      try {
        const database = await openDatabase();
        const transaction = database.transaction(EMPLOYEES_STORE, "readwrite");
        const store = transaction.objectStore(EMPLOYEES_STORE);
        for (const emp of mapped) {
          store.put(emp);
        }
        await transactionComplete(transaction);
        database.close();
      } catch {
        // ignore
      }

      return mapped;
    }
  } catch {
    // fallback
  }

  return localEmployees;
}

export function createEmployeeId(): string {
  const randomId =
    globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
  return `employee-${randomId}`;
}

export async function saveEmployee(employee: StoredEmployee): Promise<StoredEmployee> {
  const originalId = employee.id;
  const isEditingExisting = !employee.id.startsWith("employee-");

  const names = employee.name.trim().split(/\s+/);
  const firstName = names[0] || "";
  const lastName = names.slice(1).join(" ") || "";

  if (isEditingExisting) {
    let targetId = employee.id;

    if (targetId.startsWith("employee-")) {
      try {
        const backendEmployees = await getEmployeesList();
        const matched = backendEmployees.find(
          (be) => be.email && be.email.toLowerCase() === employee.email.toLowerCase(),
        );
        if (matched && matched.id) {
          targetId = matched.id;
          employee.id = matched.id;
        }
      } catch {
        // ignore lookup error
      }
    }

    if (!targetId.startsWith("employee-")) {
      try {
        // Update core employee info including phone number
        await updateBackendEmployee(targetId, {
          employeeId: targetId,
          firstName,
          lastName,
          role: employee.role as any,
          position: employee.role,
          phoneNumber: employee.phoneNumber || undefined,
          status: employee.status === "On vacation" ? "OnVacation" : "Active",
          statusStartDate: employee.vacationStartDate
            ? new Date(employee.vacationStartDate).toISOString()
            : null,
          statusEndDate: employee.vacationEndDate
            ? new Date(employee.vacationEndDate).toISOString()
            : null,
        });

        if (employee.status === "On vacation" || Boolean(employee.vacationStartDate)) {
          await updateBackendEmployeeStatus(targetId, {
            employeeId: targetId,
            status: "OnVacation",
            statusStartDate: employee.vacationStartDate
              ? new Date(employee.vacationStartDate).toISOString()
              : null,
            statusEndDate: employee.vacationEndDate
              ? new Date(employee.vacationEndDate).toISOString()
              : null,
          });
        }
      } catch (backendError) {
        console.warn("Backend employee update error:", backendError);
      }
    }
  } else {
    // Genuinely new employee creation
    try {
      const res = (await createBackendEmployee({
        employeeName: employee.name,
        firstName,
        lastName,
        email: employee.email,
        phoneNumber: employee.phoneNumber || undefined,
        role: employee.role as any,
        position: employee.role,
        organizationId: employee.accountId,
      })) as any;

      const newId = res?.employeeId ?? res?.id;
      if (newId) {
        employee.id = newId;
      }
    } catch (err: any) {
      console.error("Backend create employee error:", err);
      const msg = err?.message || String(err);
      if (msg.includes("ALREADY_EXISTS") || msg.toLowerCase().includes("already exists")) {
        throw new Error("An employee with this email address already exists.");
      }
      throw err;
    }
  }

  try {
    const database = await openDatabase();
    const transaction = database.transaction(EMPLOYEES_STORE, "readwrite");
    const store = transaction.objectStore(EMPLOYEES_STORE);
    if (originalId !== employee.id) {
      store.delete(originalId);
    }
    store.put(employee);
    await transactionComplete(transaction);
    database.close();
  } catch {
    // ignore
  }

  return employee;
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
  let records: StoredSupplierCategory[] = [];
  try {
    const database = await openDatabase();
    const transaction = database.transaction(
      SUPPLIER_CATEGORIES_STORE,
      "readonly",
    );
    const store = transaction.objectStore(SUPPLIER_CATEGORIES_STORE);
    const allRecords = (await requestResult(
      store.index("accountId").getAll(IDBKeyRange.only(accountId)),
    )) as StoredSupplierCategory[];
    database.close();
    records = allRecords || [];
  } catch (err) {
    console.warn("Failed to read local supplier categories:", err);
  }

  // Also fetch dictionary categories from backend (OUTSIDE of IDB transaction!)
  try {
    const dictCats = await getDictionaryCategories();
    const toAdd: StoredSupplierCategory[] = [];
    for (const dictCat of dictCats) {
      const existing = records.find(
        (r) =>
          r.id === String(dictCat.id) ||
          r.name.toLowerCase() === dictCat.name.toLowerCase(),
      );
      if (!existing) {
        const newCat: StoredSupplierCategory = {
          id: String(dictCat.id),
          accountId,
          name: dictCat.name,
        };
        records.push(newCat);
        toAdd.push(newCat);
      }
    }

    if (toAdd.length > 0) {
      const database = await openDatabase();
      const transaction = database.transaction(
        SUPPLIER_CATEGORIES_STORE,
        "readwrite",
      );
      const store = transaction.objectStore(SUPPLIER_CATEGORIES_STORE);
      for (const cat of toAdd) {
        store.put(cat);
      }
      await transactionComplete(transaction);
      database.close();
    }
  } catch {
    // fallback to local records
  }

  // Ensure default categories are always available if empty
  if (records.length === 0) {
    const defaultCategories: StoredSupplierCategory[] = [
      { id: "1", accountId, name: "Dairy Products (Կաթնամթերք)" },
      { id: "2", accountId, name: "Meat & Poultry (Միս և թռչնամիս)" },
      { id: "3", accountId, name: "Produce & Vegetables (Բանջարեղեն և մրգեր)" },
      { id: "4", accountId, name: "Beverages & Drinks (Խմիչքներ)" },
      { id: "5", accountId, name: "Bakery & Pastry (Հացաբուլկեղեն)" },
      { id: "6", accountId, name: "Groceries & Spices (Նպարեղեն և համեմունքներ)" },
      { id: "7", accountId, name: "Frozen Foods (Սառեցված սնունդ)" },
      { id: "8", accountId, name: "Packaging & Supplies (Փաթեթավորում)" },
      { id: "9", accountId, name: "General" },
    ];
    records = defaultCategories;
    try {
      const database = await openDatabase();
      const transaction = database.transaction(
        SUPPLIER_CATEGORIES_STORE,
        "readwrite",
      );
      const store = transaction.objectStore(SUPPLIER_CATEGORIES_STORE);
      for (const cat of records) {
        store.put(cat);
      }
      await transactionComplete(transaction);
      database.close();
    } catch {
      // ignore
    }
  }

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

  let assignedId: string = `supplier-category-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`}`;

  try {
    const res = await createCustomCategory(normalizedName, accountId);
    if (res && res.id) {
      assignedId = String(res.id);
    }
  } catch (err) {
    console.warn("Could not register category on backend, using local id:", err);
  }

  const category: StoredSupplierCategory = {
    id: assignedId,
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

  const resolvedName =
    bp.name ||
    (bp as any).Name ||
    (bp.names ? Object.values(bp.names)[0] : "") ||
    bp.code ||
    "Product";

  return {
    id: String(bp.id),
    accountId: bp.supplierId || accountId,
    name: resolvedName,
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
  let localProducts: StoredSupplierProduct[] = [];
  try {
    const database = await openDatabase();
    const transaction = database.transaction(
      SUPPLIER_PRODUCTS_STORE,
      "readonly",
    );
    const store = transaction.objectStore(SUPPLIER_PRODUCTS_STORE);
    const records = (await requestResult(store.getAll())) as StoredSupplierProduct[];
    database.close();
    localProducts = (records || []).filter((p) => p.accountId === accountId);
    if (localProducts.length === 0 && records && records.length > 0) {
      localProducts = records;
    }
  } catch {
    // ignore
  }

  const localMapById = new Map(localProducts.map((p) => [p.id, p]));
  const localMapByCode = new Map(
    localProducts.filter((p) => p.code).map((p) => [p.code!.toLowerCase(), p]),
  );

  try {
    const backendProducts = await getSupplierCatalog();
    if (Array.isArray(backendProducts) && backendProducts.length > 0) {
      const mapped = backendProducts.map((p) => {
        const stored = mapBackendProductToStored(p, accountId);
        const existing =
          localMapById.get(stored.id) ||
          (stored.code ? localMapByCode.get(stored.code.toLowerCase()) : undefined);

        if (existing) {
          if (
            (!stored.name || stored.name === "Product" || stored.name === stored.code) &&
            existing.name &&
            existing.name !== existing.code
          ) {
            stored.name = existing.name;
          }
          if (
            (!stored.categoryIds || stored.categoryIds.length === 0) &&
            existing.categoryIds?.length
          ) {
            stored.categoryIds = existing.categoryIds;
          }
          if (existing.description && !stored.description) {
            stored.description = existing.description;
          }
          // Preserve local rich options like piecesPerPackage or compareAtPrice
          if (existing.sellingOptions?.length && stored.sellingOptions?.length) {
            stored.sellingOptions = stored.sellingOptions.map((sOpt, idx) => {
              const matchedLocal = existing.sellingOptions[idx] || existing.sellingOptions.find((e) => e.id === sOpt.id);
              if (matchedLocal) {
                return {
                  ...sOpt,
                  piecesPerPackage: matchedLocal.piecesPerPackage ?? sOpt.piecesPerPackage,
                  customUnit: matchedLocal.customUnit ?? sOpt.customUnit,
                  compareAtPrice: matchedLocal.compareAtPrice ?? sOpt.compareAtPrice,
                };
              }
              return sOpt;
            });
          }
        }
        return stored;
      });

      // Retain local products not yet synced to backend
      const mappedIds = new Set(mapped.map((p) => p.id));
      for (const local of localProducts) {
        if (!mappedIds.has(local.id)) {
          mapped.push(local);
        }
      }

      // Cache in IndexedDB
      try {
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
      } catch {
        // ignore cache write error
      }

      return mapped.sort((first, second) =>
        String(second.createdAt || "").localeCompare(String(first.createdAt || "")),
      );
    }
  } catch {
    // fallback
  }

  return localProducts.sort((first, second) =>
    String(second.createdAt || "").localeCompare(String(first.createdAt || "")),
  );
}

export async function getAllActiveSupplierProducts(): Promise<StoredSupplierProduct[]> {
  try {
    await initializeDatabase();
    const database = await openDatabase();
    const transaction = database.transaction(
      SUPPLIER_PRODUCTS_STORE,
      "readonly",
    );
    const store = transaction.objectStore(SUPPLIER_PRODUCTS_STORE);
    const records = (await requestResult(store.getAll())) as StoredSupplierProduct[];
    database.close();
    return (records || []).filter((p) => p.status === "Active");
  } catch {
    return [];
  }
}

export async function getSupplierProduct(
  accountId: string,
  productId: string,
): Promise<StoredSupplierProduct | null> {
  let localProduct: StoredSupplierProduct | null = null;
  try {
    const database = await openDatabase();
    const transaction = database.transaction(
      SUPPLIER_PRODUCTS_STORE,
      "readonly",
    );
    const found = await requestResult(
      transaction.objectStore(SUPPLIER_PRODUCTS_STORE).get(productId),
    );
    database.close();
    if (found) {
      localProduct = found as StoredSupplierProduct;
    }
  } catch {
    // ignore
  }

  try {
    const backendProduct = await getProductById(productId);
    if (backendProduct) {
      const mapped = mapBackendProductToStored(backendProduct, accountId);
      if (localProduct) {
        if (
          (!mapped.name || mapped.name === "Product" || mapped.name === mapped.code) &&
          localProduct.name &&
          localProduct.name !== localProduct.code
        ) {
          mapped.name = localProduct.name;
        }
        if (
          (!mapped.categoryIds || mapped.categoryIds.length === 0) &&
          localProduct.categoryIds?.length
        ) {
          mapped.categoryIds = localProduct.categoryIds;
        }
        if (localProduct.description && !mapped.description) {
          mapped.description = localProduct.description;
        }
        if (localProduct.sellingOptions?.length && mapped.sellingOptions?.length) {
          mapped.sellingOptions = mapped.sellingOptions.map((mOpt, idx) => {
            const matchedLocal = localProduct!.sellingOptions[idx] || localProduct!.sellingOptions.find((e) => e.id === mOpt.id);
            if (matchedLocal) {
              return {
                ...mOpt,
                piecesPerPackage: matchedLocal.piecesPerPackage ?? mOpt.piecesPerPackage,
                customUnit: matchedLocal.customUnit ?? mOpt.customUnit,
                compareAtPrice: matchedLocal.compareAtPrice ?? mOpt.compareAtPrice,
              };
            }
            return mOpt;
          });
        }
      }
      return mapped;
    }
  } catch {
    // fallback
  }

  return localProduct;
}

export async function saveSupplierProduct(
  product: StoredSupplierProduct,
): Promise<void> {
  const primaryOption = product.sellingOptions[0];
  const rawId = parseInt(String(product.id).replace(/\D/g, ""), 10);
  const isLocalId =
    String(product.id).startsWith("product-") || isNaN(rawId) || rawId <= 0;
  const numericId = isLocalId ? null : rawId;

  let categoryId = 16;
  if (product.categoryIds && product.categoryIds.length > 0) {
    const rawCat = product.categoryIds[0];
    const parsedNum = parseInt(String(rawCat).replace(/\D/g, ""), 10);
    if (!isNaN(parsedNum) && parsedNum > 0 && parsedNum <= 2147483647) {
      categoryId = parsedNum;
    } else {
      try {
        const cats = await getSupplierCategories(product.accountId);
        const match = cats.find(
          (c) => c.id === rawCat || c.name.toLowerCase() === String(rawCat).toLowerCase(),
        );
        if (match) {
          const matchNum = parseInt(String(match.id).replace(/\D/g, ""), 10);
          if (!isNaN(matchNum) && matchNum > 0) {
            categoryId = matchNum;
          }
        }
      } catch {
        // ignore
      }
    }
  }

  const rawPrice = Number(primaryOption?.price ?? 0);
  const basePrice = !isNaN(rawPrice) && rawPrice > 0 ? rawPrice : 1;

  const code =
    product.code?.trim() ||
    `PRD-${Math.abs(product.name.split("").reduce((acc, c) => ((acc << 5) - acc) + c.charCodeAt(0), 0)).toString().slice(0, 6)}`;

  // Backend Sinko.DAL.Enums.ProductStatus: Active = 1, Inactive = 2
  const status = product.status === "Active" ? "Active" : "Inactive";
  const unit = mapUnitTypeToBackend(primaryOption?.unitType);
  const oldId = product.id;

  try {
    const upsertRes = await upsertProduct({
      id: numericId,
      code,
      name: product.name.trim(),
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
        id: typeof opt.id === "number" ? opt.id : (opt.id && !String(opt.id).startsWith("option-") && !isNaN(Number(opt.id)) ? Number(opt.id) : undefined),
        name: `${opt.quantity} ${opt.customUnit?.trim() || opt.unitType}`,
        quantity: opt.quantity,
        unitType: opt.unitType,
        price: opt.price,
        unitPrice: opt.price,
        packageCount: opt.piecesPerPackage ? Number(opt.piecesPerPackage) : opt.quantity,
        individualPrices: Array.isArray(opt.companyPrices)
          ? opt.companyPrices.map((cp) => ({
              companyId: cp.resourceId,
              price: cp.individualPrice,
            }))
          : [],
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
  const store = transaction.objectStore(SUPPLIER_PRODUCTS_STORE);
  if (oldId !== product.id) {
    store.delete(oldId);
  }
  store.put(product);
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
  bp: any,
  accountId: string,
): StoredSupplierPromotion {
  const rawType = bp.type ?? bp.Type ?? bp.typeName ?? bp.TypeName;
  const type: "FixedPrice" | "Percentage" | "BuyXGetY" =
    rawType === "BuyXGetY" || rawType === 3 || rawType === "3"
      ? "BuyXGetY"
      : rawType === "FixedPrice" || rawType === 1 || rawType === "1" || rawType === "SpecialPrice"
        ? "FixedPrice"
        : "Percentage";

  const rawStatus = bp.status ?? bp.Status ?? bp.statusName ?? bp.StatusName;
  const status: StoredPromotionStatus =
    rawStatus === "Active" ||
    rawStatus === 3 ||
    rawStatus === "3" ||
    rawStatus === 2 ||
    rawStatus === "2" ||
    String(rawStatus).toLowerCase() === "active"
      ? "Active"
      : "Draft";

  const supplierId = bp.supplierId ?? bp.SupplierId ?? accountId;
  const supplierName = bp.supplierName ?? bp.SupplierName ?? "";
  const promoName = bp.name ?? bp.Name ?? bp.promotionName ?? bp.PromotionName ?? "";
  const promoDesc = bp.description ?? bp.Description ?? bp.promotionDescription ?? bp.PromotionDescription ?? "";
  const startDate = bp.startDate ?? bp.StartDate ?? bp.promotionStartDate ?? bp.PromotionStartDate ?? new Date().toISOString();
  const endDate = bp.endDate ?? bp.EndDate ?? bp.promotionEndDate ?? bp.PromotionEndDate ?? "2099-12-31T23:59:59Z";

  const rawProducts = bp.products ?? bp.Products ?? bp.includedProducts ?? bp.IncludedProducts ?? [];
  const productIds: string[] = Array.isArray(rawProducts)
    ? rawProducts.map((p: any) => String(p.productId ?? p.ProductId ?? p.id ?? p))
    : [];

  const rawDiscount =
    bp.discountPercent ??
    bp.discountPercentage ??
    bp.DiscountPercent ??
    bp.DiscountPercentage ??
    rawProducts?.[0]?.discountPercent ??
    rawProducts?.[0]?.discountPercentage ??
    rawProducts?.[0]?.DiscountPercentage ??
    "15";

  const rawFixedPrice =
    bp.fixedPrice ??
    bp.specialPrice ??
    bp.FixedPrice ??
    bp.SpecialPrice ??
    rawProducts?.[0]?.fixedPrice ??
    rawProducts?.[0]?.specialPrice ??
    rawProducts?.[0]?.FixedPrice ??
    rawProducts?.[0]?.SpecialPrice ??
    "1000";

  const fixedPrices: Record<string, string> = {};
  if (productIds.length > 0) {
    productIds.forEach((pid) => {
      fixedPrices[pid] = String(rawFixedPrice);
    });
  } else {
    fixedPrices["default"] = String(rawFixedPrice);
  }

  const bannerImgUrl = bp.bannerImageUrl ?? bp.BannerImageUrl ?? bp.visualUrl ?? "";

  return {
    id: bp.id ?? bp.Id ?? bp.promotionId ?? bp.PromotionId ?? createSupplierPromotionId(),
    accountId: supplierId,
    supplierName,
    name: promoName,
    description: promoDesc,
    type,
    status,
    startDate,
    endDate,
    productIds,
    discountOptionKeys: [],
    fixedPrices,
    discountPercent: String(rawDiscount),
    eligibility:
      (bp.targetCustomerIds && bp.targetCustomerIds.length > 0) ||
      (bp.TargetCustomerIds && bp.TargetCustomerIds.length > 0) ||
      bp.visibilityType === 2 ||
      bp.VisibilityType === 2
        ? "specific-customers"
        : "all-customers",
    eligibleCustomerIds: bp.targetCustomerIds || bp.TargetCustomerIds || [],
    applyOnIndividualPricing: Boolean(bp.applyOnIndividualPricing ?? bp.ApplyOnIndividualPricing),
    isBannerEnabled: true,
    display: "both",
    bannerImage: bannerImgUrl
      ? {
          dataUrl: bannerImgUrl,
          fileName: "banner.jpg",
          mimeType: "image/jpeg",
        }
      : undefined,
    brandColorFallback: bp.brandColorFallback || bp.BrandColorFallback || "#2563EB",
    createdAt: bp.createdAt || bp.CreatedAt || new Date().toISOString(),
    updatedAt: bp.updatedAt || bp.UpdatedAt || new Date().toISOString(),
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
  let localPromotions: StoredSupplierPromotion[] = [];
  try {
    const database = await openDatabase();
    const transaction = database.transaction(SUPPLIER_PROMOTIONS_STORE, "readonly");
    const store = transaction.objectStore(SUPPLIER_PROMOTIONS_STORE);
    const all = (await requestResult(store.getAll())) as StoredSupplierPromotion[];
    database.close();
    localPromotions = (all || []).filter((p) => p.accountId === accountId);
  } catch {
    // ignore
  }

  const localMap = new Map(localPromotions.map((p) => [p.id, p]));

  try {
    const backendPromos = await getBackendSupplierPromotions();
    if (Array.isArray(backendPromos)) {
      const mapped = backendPromos.map((p) => {
        const base = mapBackendPromotionToStored(p, accountId);
        const existing = localMap.get(base.id);
        if (existing) {
          return {
            ...base,
            discountOptionKeys:
              existing.discountOptionKeys?.length
                ? existing.discountOptionKeys
                : base.discountOptionKeys,
            fixedPrices:
              existing.fixedPrices && Object.keys(existing.fixedPrices).length > 0
                ? existing.fixedPrices
                : base.fixedPrices,
            discountScope: existing.discountScope ?? base.discountScope,
            triggerOptionId: existing.triggerOptionId ?? base.triggerOptionId,
            targetOptionId: existing.targetOptionId ?? base.targetOptionId,
            giftChoices:
              existing.giftChoices?.length ? existing.giftChoices : base.giftChoices,
            bannerImage: existing.bannerImage ?? base.bannerImage,
          };
        }
        return base;
      });

      // Retain local promotions that are not yet on backend, deduplicating by ID and name
      const mappedIds = new Set(mapped.map((p) => p.id));
      const mappedNames = new Set(
        mapped.map((p) => p.name?.trim().toLowerCase()).filter(Boolean),
      );
      const staleLocalIdsToDelete: string[] = [];

      for (const local of localPromotions) {
        const normName = local.name?.trim().toLowerCase();
        if (mappedIds.has(local.id) || (normName && mappedNames.has(normName))) {
          if (local.id && !mappedIds.has(local.id)) {
            staleLocalIdsToDelete.push(local.id);
          }
          continue;
        }
        mapped.push(local);
        if (normName) mappedNames.add(normName);
      }

      const database = await openDatabase();
      const transaction = database.transaction(
        SUPPLIER_PROMOTIONS_STORE,
        "readwrite",
      );
      const store = transaction.objectStore(SUPPLIER_PROMOTIONS_STORE);
      for (const staleId of staleLocalIdsToDelete) {
        store.delete(staleId);
      }
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

  return localPromotions;
}

export async function getSupplierPromotion(
  accountId: string,
  promotionId: string,
): Promise<StoredSupplierPromotion | null> {
  // First look in local IndexedDB to preserve rich form fields
  try {
    const database = await openDatabase();
    const transaction = database.transaction(
      SUPPLIER_PROMOTIONS_STORE,
      "readonly",
    );
    const store = transaction.objectStore(SUPPLIER_PROMOTIONS_STORE);
    const existing = (await requestResult(
      store.get(promotionId),
    )) as StoredSupplierPromotion | undefined;
    database.close();
    if (existing && existing.accountId === accountId) {
      return existing;
    }
  } catch {
    // fallback
  }

  const promotions = await getSupplierPromotions(accountId);
  return (
    promotions.find(
      (promo) => promo.id === promotionId && promo.accountId === accountId,
    ) ?? null
  );
}

export async function saveSupplierPromotion(
  promotion: StoredSupplierPromotion,
): Promise<void> {
  try {
    const isBuyXGetY = promotion.type === "BuyXGetY";
    const isPercentage = promotion.type === "Percentage";

    // Lookup real catalog products to get real product IDs
    let validProductIds: number[] = [];
    try {
      const storedProds = await getSupplierProducts(promotion.accountId);
      validProductIds = storedProds
        .map((p) => parseInt(p.id.replace(/\D/g, ""), 10))
        .filter((id) => !isNaN(id) && id > 0);
    } catch {
      // ignore
    }

    const defaultFirstId = validProductIds.length > 0 ? validProductIds[0] : 6;
    const defaultSecondId = validProductIds.length > 1 ? validProductIds[1] : defaultFirstId;

    let triggerPId = parseInt(promotion.triggerProductId?.replace(/\D/g, "") || "", 10);
    if (isNaN(triggerPId) || triggerPId <= 0 || (validProductIds.length > 0 && !validProductIds.includes(triggerPId))) {
      triggerPId = defaultFirstId;
    }

    let targetPId = parseInt(promotion.targetProductId?.replace(/\D/g, "") || "", 10);
    if (isNaN(targetPId) || targetPId <= 0 || (validProductIds.length > 0 && !validProductIds.includes(targetPId))) {
      targetPId = defaultSecondId;
    }

    const startDate = promotion.startDate || new Date().toISOString();
    let endDate = promotion.endDate;
    if (!endDate || new Date(endDate) <= new Date(startDate)) {
      endDate = new Date(new Date(startDate).getTime() + 86400000 * 30).toISOString();
    }

    const resolvedProducts = !isBuyXGetY && promotion.productIds && promotion.productIds.length > 0
      ? promotion.productIds.map((pId, idx) => {
          let numId = parseInt(pId.replace(/\D/g, ""), 10);
          if (isNaN(numId) || numId <= 0 || (validProductIds.length > 0 && !validProductIds.includes(numId))) {
            numId = validProductIds.length > 0 ? validProductIds[idx % validProductIds.length] : defaultFirstId;
          }
          return {
            productId: numId,
            discountPercent: promotion.discountPercent
              ? Number(promotion.discountPercent)
              : 10,
            fixedPrice: promotion.fixedPrices?.[pId]
              ? Number(promotion.fixedPrices[pId])
              : undefined,
          };
        })
      : undefined;

    const createdBackend = await createBackendPromotion({
      name: promotion.name,
      description: promotion.description,
      type: isBuyXGetY ? "BuyXGetY" : isPercentage ? "Percentage" : "FixedPrice",
      startDate,
      endDate,
      status: promotion.status === "Active" ? "Active" : "Draft",
      bannerEnabled: promotion.isBannerEnabled,
      brandColorFallback: promotion.brandColorFallback,
      visibilityType: promotion.eligibility === "specific-customers" ? 2 : 1,
      targetCustomerIds:
        promotion.eligibility === "specific-customers"
          ? promotion.eligibleCustomerIds
          : null,
      products: resolvedProducts,
      buyXGetY: isBuyXGetY
        ? {
            buyProductId: triggerPId,
            buyQuantity: Number(promotion.triggerQuantity) || 1,
            getProductId: targetPId,
            getQuantity: Number(promotion.targetQuantity) || 1,
            getDiscountPercent: 100,
          }
        : null,
    });

    const realId = createdBackend?.id || (createdBackend as any)?.Id;
    if (realId && String(realId) !== promotion.id) {
      const oldTempId = promotion.id;
      promotion.id = String(realId);
      try {
        const db = await openDatabase();
        const tx = db.transaction(SUPPLIER_PROMOTIONS_STORE, "readwrite");
        tx.objectStore(SUPPLIER_PROMOTIONS_STORE).delete(oldTempId);
        await transactionComplete(tx);
        db.close();
      } catch {
        // ignore
      }
    }
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

  // Notify clients about this promotion via BroadcastChannel
  try {
    const isLive = promotion.status === "Active";
    if (isLive) {
      const activeLang = typeof window !== "undefined" ? (localStorage.getItem("synco_language") || "hy") : "hy";
      let notifTitle = `Նոր ակցիա: ${promotion.name}`;
      let notifMsg = `${promotion.supplierName || "Մատակարար"}-ը գործարկել է «${promotion.name}» ակցիան:`;
      if (activeLang === "ru") {
        notifTitle = `Новая промо-акция: ${promotion.name}`;
        notifMsg = `${promotion.supplierName ? `Поставщик ${promotion.supplierName}` : "Поставщик"} запустил акцию «${promotion.name}».`;
      } else if (activeLang === "en") {
        notifTitle = `New promotion: ${promotion.name}`;
        notifMsg = `${promotion.supplierName ? `Supplier ${promotion.supplierName}` : "Supplier"} launched "${promotion.name}" promotion.`;
      }
      const deepLink = `/horeca/promotions/${promotion.id}`;

      if (typeof window !== "undefined" && "BroadcastChannel" in window) {
        const channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
        channel.postMessage({
          type: "NEW_NOTIFICATION",
          targetRole: "client",
          targetUserIds:
            promotion.eligibility === "specific-customers" && promotion.eligibleCustomerIds?.length
              ? promotion.eligibleCustomerIds
              : undefined,
          notification: {
            id: `notif-promo-${promotion.id}-${Date.now()}`,
            title: notifTitle,
            message: notifMsg,
            notificationType: 50,
            notificationTypeName: "Promotion",
            deepLink,
            relatedId: promotion.id,
            isRead: false,
            createdAt: new Date().toISOString(),
          },
        });
        channel.close();
      }
    }
  } catch {
    // ignore
  }

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
      ).sort((first, second) =>
        second.updatedAt.localeCompare(first.updatedAt),
      );
    }
  } catch (err) {
    console.warn("getMarketplacePromotions error, trying active promotions fallback:", err);
  }

  try {
    const activePromos = await getActivePromotions();
    if (Array.isArray(activePromos) && activePromos.length > 0) {
      return activePromos.map((p) =>
        mapBackendPromotionToStored(p, p.supplierId || "supplier"),
      ).sort((first, second) =>
        second.updatedAt.localeCompare(first.updatedAt),
      );
    }
  } catch {
    // fallback
  }

  try {
    const database = await openDatabase();
    const transaction = database.transaction(SUPPLIER_PROMOTIONS_STORE, "readonly");
    const store = transaction.objectStore(SUPPLIER_PROMOTIONS_STORE);
    const all = (await requestResult(store.getAll())) as StoredSupplierPromotion[];
    database.close();
    if (Array.isArray(all) && all.length > 0) {
      return all;
    }
  } catch {
    // ignore
  }

  return [];
}

// -----------------------------------------------------------------------------
// Delivery Addresses
// -----------------------------------------------------------------------------

export async function getApprovedActiveDeliveryAddresses(
  supplierId?: string,
): Promise<StoredDeliveryAddress[]> {
  const addresses = await getDeliveryAddressesForCurrentHoreca(supplierId);
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
  lat?: number | null;
  lon?: number | null;
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

export async function getDeliveryAddressesForCurrentHoreca(
  supplierId?: string,
): Promise<StoredDeliveryAddress[]> {
  const user = await getLoggedInUser();
  const addressList: StoredDeliveryAddress[] = [];
  const seenAddresses = new Set<string>();

  const addUnique = (addr: StoredDeliveryAddress) => {
    const key = (addr.fullAddress || "").trim().toLowerCase();
    if (!key || seenAddresses.has(key)) return;
    seenAddresses.add(key);
    addressList.push(addr);
  };

  // 1. Fetch from backend delivery points (/api/Customers/delivery-points)
  try {
    const backendPoints = await getDeliveryPoints();
    if (Array.isArray(backendPoints) && backendPoints.length > 0) {
      for (const p of backendPoints) {
        if (!p.deliveryAddress) continue;
        addUnique({
          id: p.id,
          accountId: user?.id ?? p.userId ?? "current-company",
          label: p.pointName || p.customRegion || p.deliveryAddress,
          fullAddress: p.deliveryAddress,
          contactPerson: p.pointName || user?.displayName || "Contact person",
          contactPhone: p.phoneNumber || (user as any)?.phoneNumber || "",
          active: p.isActive !== false,
          approved: true,
          lat: p.lat ?? null,
          lon: p.lon ?? null,
        });
      }
    }
  } catch {
    // backend might be unreachable
  }

  // 2. Fetch from Company Info (/api/Company/info)
  try {
    const info = await getCompanyInfo();
    if (info) {
      if (Array.isArray(info.deliveryAddresses)) {
        for (const da of info.deliveryAddresses) {
          if (!da.fullAddress) continue;
          addUnique({
            id: da.id,
            accountId: user?.id ?? info.id ?? "current-company",
            label: da.label ?? "Delivery address",
            fullAddress: da.fullAddress,
            contactPerson: da.contactPerson || user?.displayName || "",
            contactPhone: da.contactPhone || (user as any)?.phoneNumber || "",
            active: da.active !== false,
            approved: da.approved !== false,
            lat: da.lat ?? null,
            lon: da.lon ?? null,
          });
        }
      }

      if (Array.isArray(info.serviceAreas)) {
        for (const sa of info.serviceAreas) {
          if (!sa.name) continue;
          addUnique({
            id: `service-area-${sa.id}`,
            accountId: user?.id ?? info.id ?? "current-company",
            label: sa.name,
            fullAddress: sa.name,
            contactPerson: user?.displayName || "Contact person",
            contactPhone: (user as any)?.phoneNumber || info.phoneNumber || "",
            active: true,
            approved: true,
            lat: null,
            lon: null,
          });
        }
      }

      if (Array.isArray(info.customServiceAreas)) {
        for (let i = 0; i < info.customServiceAreas.length; i++) {
          const areaName = info.customServiceAreas[i];
          if (!areaName) continue;
          addUnique({
            id: `custom-area-${i}-${areaName.slice(0, 10)}`,
            accountId: user?.id ?? info.id ?? "current-company",
            label: areaName,
            fullAddress: areaName,
            contactPerson: user?.displayName || "Contact person",
            contactPhone: (user as any)?.phoneNumber || info.phoneNumber || "",
            active: true,
            approved: true,
            lat: null,
            lon: null,
          });
        }
      }

      if (info.address) {
        addUnique({
          id: `company-address-${info.id || "main"}`,
          accountId: user?.id ?? info.id ?? "current-company",
          label: info.companyName || "Main office",
          fullAddress: info.address,
          contactPerson: user?.displayName || "Contact person",
          contactPhone: info.phoneNumber || (user as any)?.phoneNumber || "",
          active: true,
          approved: true,
          lat: null,
          lon: null,
        });
      }
    }
  } catch {
    // ignore
  }

  // 3. If supplierId is provided, also load supplier's active addresses / service areas
  if (supplierId) {
    try {
      const supplier = await getMarketplaceSupplierById(supplierId);
      if (supplier) {
        if (supplier.address) {
          addUnique({
            id: `supplier-addr-${supplier.id}`,
            accountId: user?.id ?? "current-company",
            label: `${supplier.companyName || "Supplier"} (${supplier.address})`,
            fullAddress: supplier.address,
            contactPerson: supplier.contactName || supplier.companyName || "",
            contactPhone: supplier.phoneNumber || supplier.phone || "",
            active: true,
            approved: true,
            lat: null,
            lon: null,
          });
        }
        if (supplier.serviceArea && supplier.serviceArea !== supplier.address) {
          addUnique({
            id: `supplier-area-${supplier.id}`,
            accountId: user?.id ?? "current-company",
            label: `${supplier.companyName || "Supplier"} - ${supplier.serviceArea}`,
            fullAddress: supplier.serviceArea,
            contactPerson: supplier.contactName || supplier.companyName || "",
            contactPhone: supplier.phoneNumber || supplier.phone || "",
            active: true,
            approved: true,
            lat: null,
            lon: null,
          });
        }
      }
    } catch {
      // ignore
    }
  }

  // 4. Check local IndexedDB store
  try {
    const database = await openDatabase();
    const transaction = database.transaction(DELIVERY_ADDRESSES_STORE, "readonly");
    const idbAddresses = (await requestResult(
      transaction.objectStore(DELIVERY_ADDRESSES_STORE).getAll(),
    )) as StoredDeliveryAddress[];
    database.close();

    if (Array.isArray(idbAddresses)) {
      for (const a of idbAddresses) {
        if (!user || !a.accountId || a.accountId === user.id || a.accountId === "current-company") {
          addUnique(a);
        }
      }
    }
  } catch {
    // ignore
  }

  // 5. Cache all active addresses in IndexedDB for offline resilience
  if (addressList.length > 0 && user) {
    try {
      const database = await openDatabase();
      const transaction = database.transaction(DELIVERY_ADDRESSES_STORE, "readwrite");
      const store = transaction.objectStore(DELIVERY_ADDRESSES_STORE);
      for (const addr of addressList) {
        store.put({
          ...addr,
          accountId: user.id,
        });
      }
      await transactionComplete(transaction);
      database.close();
    } catch {
      // ignore
    }
  }

  return addressList.sort((first, second) =>
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
    lat: input.lat !== undefined ? input.lat : (existing?.lat ?? null),
    lon: input.lon !== undefined ? input.lon : (existing?.lon ?? null),
  };
  store.put(address);
  await transactionComplete(transaction);
  database.close();
  return address;
}

export async function syncDeliveryAddressesForCurrentHoreca(
  incomingAddresses: StoredDeliveryAddress[],
): Promise<void> {
  const user = await getCurrentHorecaAccount();
  const database = await openDatabase();
  const transaction = database.transaction(
    DELIVERY_ADDRESSES_STORE,
    "readwrite",
  );
  const store = transaction.objectStore(DELIVERY_ADDRESSES_STORE);

  const allInStore = (await requestResult(store.getAll())) as StoredDeliveryAddress[];
  for (const item of allInStore) {
    if (
      !item.accountId ||
      item.accountId === user.id ||
      item.accountId === "current-company" ||
      item.accountId === "horeca-blue-lagoon" ||
      item.id.startsWith("delivery-address-") ||
      item.id.startsWith("delivery-blue-lagoon")
    ) {
      store.delete(item.id);
    }
  }

  for (const addr of incomingAddresses) {
    store.put({
      ...addr,
      accountId: user.id,
    });
  }

  await transactionComplete(transaction);
  database.close();
}

export async function getApprovedActiveDeliveryAddressForOrder(
  addressId?: string,
  supplierId?: string,
): Promise<StoredOrderDeliveryAddressSnapshot> {
  const allAddresses = await getApprovedActiveDeliveryAddresses(supplierId);
  const selectedAddress =
    allAddresses.find((address) => address.id === addressId) ||
    allAddresses[0];

  if (!selectedAddress) {
    // Ultimate fallback if no delivery addresses exist anywhere in the system
    return {
      addressId: addressId || "default-delivery-point",
      fullAddress: "Երևան, Հայաստան",
      label: "Default delivery point",
      contactPerson: "Manager",
      contactPhone: "+37400000000",
      lat: 40.1792,
      lon: 44.4991,
    };
  }

  return {
    addressId: selectedAddress.id,
    fullAddress: selectedAddress.fullAddress,
    label: selectedAddress.label,
    contactPerson: selectedAddress.contactPerson,
    contactPhone: selectedAddress.contactPhone,
    lat: selectedAddress.lat ?? null,
    lon: selectedAddress.lon ?? null,
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
    orderNum: bo.orderNum || bo.orderNumber || (bo.id && bo.id.length <= 16 && !bo.id.includes("-") ? bo.id : generateOrderNum(bo.placedAt || bo.creationDate)),
    orderNumber: bo.orderNum || bo.orderNumber || (bo.id && bo.id.length <= 16 && !bo.id.includes("-") ? bo.id : generateOrderNum(bo.placedAt || bo.creationDate)),
    horecaAccountId: bo.horecaId || defaultAccountId,
    horecaName: bo.horecaName || bo.clientName || bo.restaurantName || "HoReCa Customer",
    horecaContactName: bo.contactPerson || bo.createdByEmployeeName || "Manager",
    horecaEmail: bo.clientEmail || "",
    horecaPhone: bo.contactPhone || bo.clientPhoneNumber || "",
    horecaAddress: bo.deliveryAddress || "",
    supplierAccountId: bo.supplierId || bo.suplierId || "supplier-default",
    supplierId: bo.supplierId || bo.suplierId || "supplier-default",
    supplierName: bo.supplierName || bo.suplierName || "Supplier",
    supplierContactName: bo.supplierContactName || bo.assignedEmployeeName || "",
    supplierEmail: bo.supplierEmail || "",
    supplierPhone: bo.supplierPhone || "",
    supplierAddress: bo.supplierAddress || "",
    placedAt: bo.placedAt || bo.creationDate || new Date().toISOString(),
    offerReceivedAt: null,
    deliveryDate: bo.placedAt || bo.creationDate || new Date().toISOString(),
    deliveryAddress: bo.deliveryAddress || "",
    deliveryAddressSnapshot: {
      addressId: bo.deliveryAddressId || "addr-default",
      fullAddress: bo.deliveryAddress || "",
      contactPerson: bo.contactPerson || bo.createdByEmployeeName || "",
      contactPhone: bo.contactPhone || bo.clientPhoneNumber || "",
      lat: bo.lat ?? null,
      lon: bo.lon ?? null,
    },
    status: storedStatus,
    lines: rawLines.map((l: any) => {
      const qty = Number(l.quantity ?? l.count ?? 1);
      const rawFinalPrice = l.finalPrice ?? l.FinalPrice;
      const rawBasePrice = l.basePrice ?? l.BasePrice;
      const rawUnitPrice = l.unitPrice ?? l.UnitPrice ?? l.price ?? l.Price;

      let unitPrice = 0;
      if (rawUnitPrice !== undefined && rawUnitPrice !== null) {
        unitPrice = Number(rawUnitPrice);
      } else if (rawFinalPrice !== undefined && rawFinalPrice !== null && qty > 0) {
        unitPrice = Number(rawFinalPrice) / qty;
      } else if (rawBasePrice !== undefined && rawBasePrice !== null) {
        unitPrice = Number(rawBasePrice);
      }

      const basePrice = Number(rawBasePrice ?? rawUnitPrice ?? unitPrice);

      return {
        id: String(l.sellingOptionId ? `${l.productId}-${l.sellingOptionId}` : `line-${l.productId}`),
        productId: String(l.productId),
        sellingOptionId: l.sellingOptionId,
        name: l.productName || l.name || "Product",
        image: l.imageUrl || l.image || "",
        unit: l.unitDisplay || l.unitName || (typeof l.unit === "string" ? l.unit : "Piece"),
        minimumOrderQuantity: 1,
        requestedQuantity: qty,
        requestedPrice: basePrice > 0 ? basePrice : unitPrice,
        offeredQuantity: qty,
        offeredPrice: unitPrice > 0 ? unitPrice : basePrice,
        comment: l.comment || "",
      };
    }),
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
    totalAmount: Number(bo.finalPrice ?? bo.totalPrice ?? bo.totalAmount ?? 0),
    totalPrice: Number(bo.totalPrice ?? bo.finalPrice ?? bo.totalAmount ?? 0),
    finalPrice: Number(bo.finalPrice ?? bo.totalPrice ?? bo.totalAmount ?? 0),
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

    const orderNum = order.orderNum || order.orderNumber || generateOrderNum(order.placedAt);
    const orderWithNum: StoredOrder = {
      ...order,
      orderNum,
      orderNumber: orderNum,
    };

    const storedOrder = existingOrder?.deliveryAddressSnapshot
      ? {
          ...orderWithNum,
          deliveryAddress: existingOrder.deliveryAddress,
          deliveryAddressSnapshot: existingOrder.deliveryAddressSnapshot,
        }
      : orderWithNum;
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
    if (Array.isArray(backendOrders)) {
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

  return [];
}

export async function getOrdersForSupplier(
  accountId: string,
): Promise<StoredOrder[]> {
  try {
    const backendOrders = await getSupplierOrders();
    if (Array.isArray(backendOrders)) {
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

  return [];
}

export async function getOrderForHoreca(
  accountId: string,
  orderId: string,
): Promise<StoredOrder | null> {
  try {
    const bo = await getHorecaOrderById(orderId);
    if (bo) {
      const stored = mapBackendOrderToStored(bo, accountId);
      try {
        const database = await openDatabase();
        const transaction = database.transaction(ORDERS_STORE, "readwrite");
        const store = transaction.objectStore(ORDERS_STORE);
        store.put(stored);
        await transactionComplete(transaction);
        database.close();
      } catch {
        // ignore
      }
      return stored;
    }
  } catch {
    // fallback
  }

  try {
    const database = await openDatabase();
    const transaction = database.transaction(ORDERS_STORE, "readonly");
    const store = transaction.objectStore(ORDERS_STORE);
    const existing = (await requestResult(store.get(orderId))) as StoredOrder | undefined;
    database.close();
    if (existing) return existing;
  } catch {
    // ignore
  }

  return null;
}

export async function getOrderForSupplier(
  accountId: string,
  orderId: string,
): Promise<StoredOrder | null> {
  try {
    const bo = await getSupplierOrderById(orderId);
    if (bo) {
      const stored = mapBackendOrderToStored(bo, accountId);

      // Check if we have richer delivery address in local IndexedDB
      try {
        const database = await openDatabase();
        const transaction = database.transaction(ORDERS_STORE, "readonly");
        const existing = (await requestResult(
          transaction.objectStore(ORDERS_STORE).get(orderId),
        )) as StoredOrder | undefined;
        database.close();

        if (existing?.deliveryAddressSnapshot?.fullAddress) {
          if (!stored.deliveryAddress || stored.deliveryAddress === "[No Address]") {
            stored.deliveryAddress = existing.deliveryAddressSnapshot.fullAddress;
            stored.horecaAddress = existing.deliveryAddressSnapshot.fullAddress;
            stored.deliveryAddressSnapshot = existing.deliveryAddressSnapshot;
          } else {
            if (!stored.deliveryAddressSnapshot.lat && existing.deliveryAddressSnapshot.lat) {
              stored.deliveryAddressSnapshot.lat = existing.deliveryAddressSnapshot.lat;
              stored.deliveryAddressSnapshot.lon = existing.deliveryAddressSnapshot.lon;
            }
            if (!stored.deliveryAddressSnapshot.label && existing.deliveryAddressSnapshot.label) {
              stored.deliveryAddressSnapshot.label = existing.deliveryAddressSnapshot.label;
            }
          }
        }
      } catch {
        // ignore
      }

      // If delivery address is missing or coordinates are missing, resolve from client profile
      try {
        const clientId = bo.horecaId || (bo as any).clientId || stored.horecaAccountId;
        if (clientId) {
          const clientProfile = await getClientProfile(clientId);
          if (clientProfile) {
            const clientAddress =
              clientProfile.address ||
              (clientProfile.serviceAreas && clientProfile.serviceAreas.length > 0
                ? clientProfile.serviceAreas[0].name
                : "");

            if ((!stored.deliveryAddress || stored.deliveryAddress === "[No Address]") && clientAddress) {
              stored.deliveryAddress = clientAddress;
              stored.horecaAddress = clientAddress;
              stored.deliveryAddressSnapshot.fullAddress = clientAddress;
            }

            if (!stored.deliveryAddressSnapshot.contactPerson) {
              stored.deliveryAddressSnapshot.contactPerson =
                clientProfile.contactPerson || stored.horecaContactName;
            }
            if (!stored.deliveryAddressSnapshot.contactPhone) {
              stored.deliveryAddressSnapshot.contactPhone =
                clientProfile.phoneNumber || stored.horecaPhone;
            }

            const clientLat =
              clientProfile.lat ??
              (clientProfile.serviceAreas && clientProfile.serviceAreas[0]?.lat) ??
              null;
            const clientLon =
              clientProfile.lon ??
              (clientProfile.serviceAreas && clientProfile.serviceAreas[0]?.lon) ??
              null;

            if (stored.deliveryAddressSnapshot.lat == null && clientLat != null) {
              stored.deliveryAddressSnapshot.lat = clientLat;
            }
            if (stored.deliveryAddressSnapshot.lon == null && clientLon != null) {
              stored.deliveryAddressSnapshot.lon = clientLon;
            }
          }
        }
      } catch {
        // ignore
      }

      return stored;
    }
  } catch {
    // fallback
  }

  // Fallback to local IndexedDB
  try {
    const database = await openDatabase();
    const transaction = database.transaction(ORDERS_STORE, "readonly");
    const existing = (await requestResult(
      transaction.objectStore(ORDERS_STORE).get(orderId),
    )) as StoredOrder | undefined;
    database.close();
    if (existing) return existing;
  } catch {
    // ignore
  }

  return null;
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
  try {
    await initializeDatabase();
  } catch (initErr) {
    console.warn("IndexedDB initialization warning:", initErr);
  }
  const normalizedIdentifier = identifier.trim().toLowerCase();

  let authRes: LoginResponse | null = null;
  let backendError: Error | null = null;

  // Try real backend authentication first with automatic transient retry
  const maxLoginAttempts = 2;
  for (let attempt = 1; attempt <= maxLoginAttempts; attempt++) {
    try {
      authRes = await loginUser({ email: identifier, password });
      const token =
        authRes?.token ||
        authRes?.Token ||
        authRes?.accessToken ||
        authRes?.AccessToken ||
        "";
      if (token) {
        setClientAuthToken(token);
      }
      backendError = null;
      break;
    } catch (error) {
      backendError = error instanceof Error ? error : new Error(String(error));
      const msg = backendError.message.toLowerCase();
      const isTransient =
        (backendError instanceof ApiError && backendError.status >= 500) ||
        msg.includes("500") ||
        msg.includes("502") ||
        msg.includes("timeout") ||
        msg.includes("network error") ||
        msg.includes("unexpected error");

      if (attempt < maxLoginAttempts && isTransient) {
        await new Promise((resolve) => setTimeout(resolve, 800));
        continue;
      }
      break;
    }
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

  // Local seed fallback removed - authentication is exclusively against backend

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
  try {
    const clients = await getMyClients();
    if (Array.isArray(clients) && clients.length > 0) {
      return clients.map((c) => ({
        id: c.id || c.clientId || "client",
        role: "horeca",
        email: c.email || "",
        username: c.companyName,
        companyName: c.companyName,
        address: c.address || "",
        displayName: c.contactPerson || c.companyName,
      }));
    }
  } catch {
    // ignore
  }

  return [];
}

export async function getSupplierUsers(): Promise<LoggedInUser[]> {
  try {
    const suppliers = await getMarketplaceSuppliers();
    if (Array.isArray(suppliers) && suppliers.length > 0) {
      return suppliers.map((s) => ({
        id: s.id,
        role: "supplier",
        email: s.email || "",
        username: s.companyName,
        companyName: s.companyName,
        address: s.address || "",
        displayName: s.companyName,
      }));
    }
  } catch {
    // ignore
  }

  return [];
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
