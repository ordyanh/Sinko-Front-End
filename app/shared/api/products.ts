import { apiRequest } from "./http";

export type BackendProductStatus = "Active" | "Inactive";
export type ProductStatus =
  | BackendProductStatus
  | "Draft"
  | "Archived"
  | "PendingReview"
  | "Hidden"
  | "Unlisted";

export function toBackendProductStatus(
  status?: string | number | null,
): BackendProductStatus {
  if (status === 1 || status === "1") return "Active";
  if (status === 2 || status === "2") return "Inactive";
  const s = String(status ?? "").trim().toLowerCase();
  if (s === "active") return "Active";
  return "Inactive";
}

export type SellingOptionCompanyPriceDto = {
  clientId: string;
  companyName?: string;
  price: number;
};

export type ProductSellingOptionDto = {
  id?: number | string | null;
  name?: string;
  quantity?: number;
  unitType?: string;
  piecesPerPackage?: number | null;
  price?: number;
  unitPrice?: number;
  compareAtPrice?: number | null;
  minimumOrder?: number;
  packageCount?: number;
  customUnitName?: string | null;
  isDefault?: boolean;
  companyPrices?: SellingOptionCompanyPriceDto[];
};

export type CreateProductRequest = {
  name: string;
  categoryId: number;
  basePrice: number;
  code?: string | null;
  imageUrl?: string | null;
  description?: string | null;
  unit?: number;
  sellingUnit?: number | null;
  inStock?: boolean;
  packageOptions?: number[] | null;
  packaging?: string | null;
  sellingOptions?: ProductSellingOptionDto[] | null;
};

export type UpdateProductRequest = CreateProductRequest;

export type UpsertProductRequest = {
  id?: number | null;
  code: string;
  names?: Record<string, string> | null;
  unit?: number;
  sellingUnit?: number | null;
  basePrice: number;
  categoryId?: number | null;
  status: BackendProductStatus;
  inStock: boolean;
  description?: string | null;
  imageUrl?: string | null;
  packageOptions?: number[] | null;
  packaging?: string | null;
  sellingOptions?: ProductSellingOptionDto[] | null;
};

export type UpsertProductResponse = {
  message?: string;
  productId?: number | string;
  Message?: string;
  ProductId?: number | string;
  product?: BackendProductDto;
  Product?: BackendProductDto;
  id?: number | string;
};

export type SetIndividualPriceRequest = {
  productId: number | string;
  clientId: string;
  price: number;
};

export type ProductImportPreviewDto = {
  rowNumber: number;
  name: string;
  categoryName?: string | null;
  price: number;
  code?: string | null;
  unit: number;
  sellingUnit?: number;
  unitDisplay?: string | null;
  packaging?: string | null;
  packageOptions?: number[] | null;
  validationErrors?: string[];
  isValid?: boolean;
};

export type ProductSearchFilter = {
  query?: string;
  supplierId?: string;
  categoryId?: number;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  status?: BackendProductStatus;
};

export type BackendProductDto = {
  id: number | string;
  code?: string;
  name?: string;
  names?: Record<string, string>;
  unit?: number;
  sellingUnit?: number;
  basePrice?: number;
  standardPrice?: number;
  price?: number;
  categoryId?: number;
  categoryName?: string;
  status?: BackendProductStatus | string;
  inStock?: boolean;
  description?: string;
  imageUrl?: string;
  supplierId?: string;
  supplierName?: string;
  packaging?: string;
  packageOptions?: number[];
  sellingOptions?: ProductSellingOptionDto[];
  createdAt?: string;
  updatedAt?: string;
  StandardPrice?: number;
  Status?: BackendProductStatus | string;
  InStock?: boolean;
  Code?: string;
  Name?: string;
};

function normalizeNumericId(id: string | number): number | string {
  if (typeof id === "number") return id;
  const parsed = parseInt(String(id).replace(/\D/g, ""), 10);
  return !isNaN(parsed) && parsed > 0 ? parsed : id;
}

export async function getSupplierCatalog(): Promise<BackendProductDto[]> {
  const res = await apiRequest<BackendProductDto[]>("/api/Products/my-catalog", {
    method: "GET",
  });
  return Array.isArray(res) ? res : [];
}

export async function getProducts(): Promise<BackendProductDto[]> {
  const res = await apiRequest<BackendProductDto[]>("/api/Products", {
    method: "GET",
  });
  return Array.isArray(res) ? res : [];
}

export async function getProductById(id: string | number): Promise<BackendProductDto> {
  const targetId = normalizeNumericId(id);
  return apiRequest<BackendProductDto>(`/api/Products/${targetId}`, {
    method: "GET",
  });
}

export async function createProduct(payload: CreateProductRequest): Promise<BackendProductDto> {
  return apiRequest<BackendProductDto>("/api/Products", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateProduct(
  id: string | number,
  payload: UpdateProductRequest,
): Promise<BackendProductDto> {
  const targetId = normalizeNumericId(id);
  return apiRequest<BackendProductDto>(`/api/Products/${targetId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function upsertProduct(payload: UpsertProductRequest): Promise<UpsertProductResponse> {
  // Ensure status is valid backend enum ("Active" | "Inactive")
  const sanitizedPayload: UpsertProductRequest = {
    ...payload,
    status: toBackendProductStatus(payload.status),
    basePrice: Math.max(Number(payload.basePrice) || 0, 1),
    code: payload.code || `PRD-${Date.now().toString().slice(-6)}`,
  };

  return apiRequest<UpsertProductResponse>("/api/Products/upsert", {
    method: "POST",
    body: JSON.stringify(sanitizedPayload),
  });
}

export async function updateProductStatus(
  id: string | number,
  status: BackendProductStatus | string | number,
): Promise<{ message?: string; status?: BackendProductStatus }> {
  const targetId = normalizeNumericId(id);
  const backendStatus = toBackendProductStatus(status);

  return apiRequest<{ message?: string; status?: BackendProductStatus }>(
    `/api/Products/${targetId}/status`,
    {
      method: "PATCH",
      body: JSON.stringify({ status: backendStatus }),
    },
  );
}

export async function deleteProduct(id: string | number): Promise<{ message?: string }> {
  const targetId = normalizeNumericId(id);
  return apiRequest<{ message?: string }>(`/api/Products/${targetId}`, {
    method: "DELETE",
  });
}

export async function uploadProductImage(
  id: string | number,
  fileOrFormData: File | FormData,
): Promise<{ message?: string; imageUrl: string }> {
  const targetId = normalizeNumericId(id);
  const formData =
    fileOrFormData instanceof FormData
      ? fileOrFormData
      : (() => {
          const fd = new FormData();
          fd.append("file", fileOrFormData);
          return fd;
        })();

  return apiRequest<{ message?: string; imageUrl: string }>(`/api/Products/${targetId}/image`, {
    method: "POST",
    body: formData,
  });
}

export async function searchProducts(
  filterOrQuery: string | ProductSearchFilter,
): Promise<BackendProductDto[]> {
  const filter: ProductSearchFilter =
    typeof filterOrQuery === "string" ? { query: filterOrQuery } : filterOrQuery;

  const params = new URLSearchParams();
  if (filter.query) params.set("Query", filter.query);
  if (filter.supplierId) params.set("SupplierId", filter.supplierId);
  if (filter.categoryId != null) params.set("CategoryId", String(filter.categoryId));
  if (filter.minPrice != null) params.set("MinPrice", String(filter.minPrice));
  if (filter.maxPrice != null) params.set("MaxPrice", String(filter.maxPrice));
  if (filter.inStock != null) params.set("InStock", String(filter.inStock));
  if (filter.status) params.set("Status", filter.status);

  const qs = params.toString();
  const url = qs ? `/api/Products/search?${qs}` : "/api/Products/search";
  const res = await apiRequest<BackendProductDto[]>(url, {
    method: "GET",
  });
  return Array.isArray(res) ? res : [];
}

export async function setIndividualPrice(
  payload: SetIndividualPriceRequest,
): Promise<void> {
  const targetId = normalizeNumericId(payload.productId);
  return apiRequest<void>("/api/Products/set-individual-price", {
    method: "POST",
    body: JSON.stringify({
      productId: typeof targetId === "number" ? targetId : payload.productId,
      clientId: payload.clientId,
      price: payload.price,
    }),
  });
}

export async function importProductsExcel(
  fileOrFormData: File | FormData,
): Promise<ProductImportPreviewDto[]> {
  const formData =
    fileOrFormData instanceof FormData
      ? fileOrFormData
      : (() => {
          const fd = new FormData();
          fd.append("file", fileOrFormData);
          return fd;
        })();

  const res = await apiRequest<ProductImportPreviewDto[]>("/api/Products/import-excel", {
    method: "POST",
    body: formData,
  });
  return Array.isArray(res) ? res : [];
}

export async function confirmProductsImport(
  items: ProductImportPreviewDto[],
): Promise<{ success: boolean; message?: string }> {
  return apiRequest<{ success: boolean; message?: string }>("/api/Products/confirm-import", {
    method: "POST",
    body: JSON.stringify(items),
  });
}

export async function getAssignedOrderProducts(orderId: string): Promise<unknown[]> {
  return apiRequest<unknown[]>(`/api/Products/assigned-order/${encodeURIComponent(orderId)}`, {
    method: "GET",
  });
}
