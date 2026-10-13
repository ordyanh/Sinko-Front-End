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
  productIds?: number[];
  hvhh?: string;
};

export async function getCart(): Promise<CartDto> {
  try {
    const res = await apiRequest<any>("/api/Cart", {
      method: "GET",
    });
    if (!res) return { items: [], totalAmount: 0, totalItems: 0 };

    const items: CartItemDto[] = [];
    if (Array.isArray(res.groups)) {
      for (const group of res.groups) {
        if (Array.isArray(group.items)) {
          for (const item of group.items) {
            const qty = Number(item.quantity ?? item.count ?? 1);
            const unitPrice = Number(
              item.price ??
                item.unitPrice ??
                (qty > 0 && item.finalPrice ? item.finalPrice / qty : item.finalPrice) ??
                0,
            );
            const totalPrice = Number(item.finalPrice ?? unitPrice * qty);

            items.push({
              productId: item.productId,
              name: item.productName ?? item.name,
              price: unitPrice,
              quantity: qty,
              sellingOptionId: item.sellingOptionId,
              sellingOptionName: item.sellingOptionName,
              promotionId: item.appliedPromotionId,
              supplierId: group.supplierId,
              supplierName: group.supplierName,
              imageUrl: item.imageUrl,
              totalPrice,
            });
          }
        }
      }
    } else if (Array.isArray(res.items)) {
      items.push(...res.items);
    }

    return {
      items,
      totalAmount: res.grandTotal ?? res.totalAmount ?? 0,
      totalItems: res.totalQuantity ?? res.totalProducts ?? items.length,
    };
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
  const numId = Number(productId);
  const qty = Math.max(1, Number(quantity) || 1);

  try {
    return await apiRequest<CartDto>("/api/Cart/add", {
      method: "POST",
      body: JSON.stringify({
        productId: numId,
        quantity: qty,
        promotionId: promotionId ?? null,
      }),
    });
  } catch (err) {
    // If backend returns 400 (e.g. item already exists in cart and increment failed package rules),
    // attempt updating quantity via updateCartQuantity as fallback
    try {
      return await updateCartQuantity(numId, qty);
    } catch {
      throw err;
    }
  }
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
  const productIds =
    payload.productIds ??
    payload.items?.map((item) => Number(item.productId)).filter(Boolean);

  const body = {
    ...payload,
    productIds,
  };

  return apiRequest<unknown>("/api/Cart/check-individual-pricing", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
