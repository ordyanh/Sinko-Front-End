import type { SeedUser } from "../model";

export const initialUsers: readonly SeedUser[] = [
  {
    id: "horeca-blue-lagoon",
    role: "horeca",
    email: "horeca@synko.am",
    username: "blue-lagoon",
    password: "horeca123",
    companyName: "Blue Lagoon Hotel",
    address: "Tumanyan St 18, Kentron, Yerevan",
    displayName: "Ani Petrosyan",
  },
  {
    id: "supplier-ararat-harvest",
    role: "supplier",
    email: "supplier@synko.am",
    username: "ararat-harvest",
    password: "supplier123",
    companyName: "Ararat Harvest",
    address: "Komitas Ave 12, Arabkir, Yerevan",
    displayName: "Arman Sargsyan",
  },
  {
    id: "supplier-mare-terra",
    role: "supplier",
    email: "orders@mareterra.am",
    username: "mare-terra",
    password: "supplier123",
    companyName: "Mare & Terra",
    address: "8 Komitas Avenue, Yerevan",
    displayName: "Arman Harutyunyan",
  },
] as const;
