import type { StoredDeliveryAddress } from "../model";

/** Seed destinations make the address-selection flow available in the MVP. */
export const initialDeliveryAddresses: readonly StoredDeliveryAddress[] = [
  {
    id: "delivery-blue-lagoon-main",
    accountId: "horeca-blue-lagoon",
    label: "Main receiving dock",
    fullAddress: "Tumanyan St 18, Kentron, Yerevan",
    contactPerson: "Ani Petrosyan",
    contactPhone: "+374 91 123 456",
    approved: true,
    active: true,
  },
  {
    id: "delivery-blue-lagoon-banquet",
    accountId: "horeca-blue-lagoon",
    label: "Banquet kitchen",
    fullAddress: "Tumanyan St 18, service entrance, Yerevan",
    contactPerson: "Mariam Hovsepyan",
    contactPhone: "+374 95 987 654",
    approved: true,
    active: true,
  },
  {
    id: "delivery-blue-lagoon-archive",
    accountId: "horeca-blue-lagoon",
    label: "Former storage",
    fullAddress: "15 Abovyan St, Yerevan",
    contactPerson: "Ani Petrosyan",
    contactPhone: "+374 91 123 456",
    approved: true,
    active: false,
  },
] as const;
