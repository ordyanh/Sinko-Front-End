import { apiRequest } from "./http";

export type CartItemDto = {
  productId: number | string;
  name?: string;
  price: number;
  quantity: number;
  sellingOptionId?: string;
  sellingOptionName?: string;
  promotionId?: string;
  supplierId?: string;
  supplierName?: string;
  imageUrl?: string;
  totalPrice?: number;
};

export type CartDto = {
  items: CartItemDto[];
  totalAmount: number;
  totalItems: number;
};

export type AddToCartRequest = {
  productId: number;
  quantity: number;
  promotionId?: string | null;
};

export type CheckIndividualPricingRequest = {
  items?: Array<{
    productId: number;
    supplierId?: string;
    quantity: number;
  }>;
};

export async function getCart(): Promise<CartDto> {
  try {
    const res = await apiRequest<CartDto>("/api/Cart", {
      method: "GET",
    });
    return res ?? { items: [], totalAmount: 0, totalItems: 0 };
  } catch {
    return { items: [], totalAmount: 0, totalItems: 0 };
  }
}

export async function getCartItems(): Promise<CartItemDto[]> {
  try {
    const cart = await getCart();
    return Array.isArray(cart.items) ? cart.items : [];
  } catch {
    return [];
  }
}

export async function addToCart(
  productId: number | string,
  quantity: number,
  promotionId?: string | null,
): Promise<CartDto> {
  return apiRequest<CartDto>("/api/Cart/add", {
    method: "POST",
    body: JSON.stringify({
      productId: Number(productId),
      quantity,
      promotionId: promotionId ?? null,
    }),
  });
}

export async function updateCartQuantity(
  productId: number | string,
  quantity: number,
): Promise<CartDto> {
  try {
    return await apiRequest<CartDto>(
      `/api/Cart/items/${productId}?qty=${encodeURIComponent(quantity)}`,
      {
        method: "PATCH",
      },
    );
  } catch {
    return await apiRequest<CartDto>(
      `/api/Cart/quantity?productId=${productId}&qty=${encodeURIComponent(quantity)}`,
      {
        method: "PATCH",
      },
    );
  }
}

export async function removeFromCart(productId: number | string): Promise<void> {
  try {
    await apiRequest<void>(`/api/Cart/${productId}`, {
      method: "DELETE",
    });
  } catch {
    await apiRequest<void>(`/api/Cart/items/${productId}`, {
      method: "DELETE",
    });
  }
}

export async function clearCart(): Promise<void> {
  try {
    await apiRequest<void>("/api/Cart/clear", {
      method: "DELETE",
    });
  } catch {
    await apiRequest<void>("/api/Cart", {
      method: "DELETE",
    });
  }
}

export async function checkIndividualPricing(payload: CheckIndividualPricingRequest): Promise<unknown> {
  return apiRequest<unknown>("/api/Cart/check-individual-pricing", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
