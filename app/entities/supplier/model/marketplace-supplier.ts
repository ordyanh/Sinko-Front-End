export type MarketplaceSupplier = {
  id: string;
  name: string;
  initials: string;
  logoClassName: string;
  accentClassName: string;
  categories: string[];
  serviceArea: string;
  description: string;
  contactName: string;
  phone: string;
  email: string;
  address: string;
  deliveryWindow: string;
  deliveryNote: string;
  orderSupplierId?: string;
};

export const marketplaceSuppliers: MarketplaceSupplier[] = [
  {
    id: "ararat-harvest",
    name: "Ararat Harvest",
    initials: "AH",
    logoClassName: "bg-[#dff0e3] text-[#25633e]",
    accentClassName: "bg-[#dceede]",
    categories: ["Fresh produce", "Herbs", "Seasonal"],
    serviceArea: "Yerevan & Kotayk",
    description:
      "Farm-picked vegetables, greens, and fruit delivered fresh each morning.",
    contactName: "Mariam Petrosyan",
    phone: "+374 77 245 818",
    email: "orders@aratatharvest.am",
    address: "24 Araratyan Street, Yerevan",
    deliveryWindow: "07:00–10:00",
    deliveryNote: "Order by 18:00 for morning delivery.",
    orderSupplierId: "SUP-3001",
  },
  {
    id: "mare-terra",
    name: "Mare & Terra",
    initials: "M&T",
    logoClassName: "bg-[#e8e4f8] text-[#55428c]",
    accentClassName: "bg-[#e8e3f8]",
    categories: ["Pantry", "Oils", "Specialty foods"],
    serviceArea: "Yerevan citywide",
    description:
      "Mediterranean pantry staples selected for professional kitchens.",
    contactName: "Arman Harutyunyan",
    phone: "+374 91 601 482",
    email: "kitchen@mareterra.am",
    address: "8 Komitas Avenue, Yerevan",
    deliveryWindow: "10:00–15:00",
    deliveryNote: "Free delivery on orders over 25,000 դրամ.",
    orderSupplierId: "SUP-3002",
  },
  {
    id: "lori-dairy",
    name: "Lori Dairy Co.",
    initials: "LD",
    logoClassName: "bg-[#fff0c9] text-[#9a5d05]",
    accentClassName: "bg-[#fff0c8]",
    categories: ["Dairy", "Cheese", "Eggs"],
    serviceArea: "Yerevan & Aragatsotn",
    description:
      "Regional dairy, aged cheeses, and reliable daily staples for service.",
    contactName: "Lilit Avetisyan",
    phone: "+374 55 304 719",
    email: "hello@loridairy.am",
    address: "15 Tumanyan Street, Vanadzor",
    deliveryWindow: "08:00–12:00",
    deliveryNote: "Next delivery slot available tomorrow.",
    orderSupplierId: "SUP-3003",
  },
  {
    id: "highland-poultry",
    name: "Highland Poultry",
    initials: "HP",
    logoClassName: "bg-[#fbe1dd] text-[#a54132]",
    accentClassName: "bg-[#fbe1dd]",
    categories: ["Meat & poultry", "Frozen"],
    serviceArea: "Yerevan & Armavir",
    description:
      "Traceable poultry cuts, prepared to your kitchen's preferred format.",
    contactName: "Tigran Grigoryan",
    phone: "+374 93 812 612",
    email: "service@highlandpoultry.am",
    address: "6 Baghramyan Street, Armavir",
    deliveryWindow: "09:00–13:00",
    deliveryNote: "Cut-to-order requests close at 16:00.",
  },
  {
    id: "masis-bakehouse",
    name: "Masis Bakehouse",
    initials: "MB",
    logoClassName: "bg-[#f5e4d3] text-[#8a4e25]",
    accentClassName: "bg-[#f5e4d3]",
    categories: ["Bakery", "Pastry", "Frozen dough"],
    serviceArea: "Central & Arabkir",
    description:
      "Early-morning bread, viennoiserie, and bake-off lines for busy teams.",
    contactName: "Sona Martirosyan",
    phone: "+374 94 440 298",
    email: "orders@masisbakehouse.am",
    address: "37 Arabkir Street, Yerevan",
    deliveryWindow: "06:00–09:00",
    deliveryNote: "Fresh bread arrives before breakfast service.",
  },
  {
    id: "roast-republic",
    name: "Roast Republic",
    initials: "RR",
    logoClassName: "bg-[#e5e6e8] text-[#3e4754]",
    accentClassName: "bg-[#e5e6e8]",
    categories: ["Beverages", "Coffee", "Tea"],
    serviceArea: "Yerevan citywide",
    description:
      "Fresh-roasted coffee and café essentials with barista-led support.",
    contactName: "Gor Mkrtchyan",
    phone: "+374 41 952 307",
    email: "wholesale@roastrepublic.am",
    address: "11 Saryan Street, Yerevan",
    deliveryWindow: "09:00–14:00",
    deliveryNote: "Roasted-to-order coffee ships within two business days.",
  },
];

export function getMarketplaceSupplierById(supplierId: string) {
  return marketplaceSuppliers.find((supplier) => supplier.id === supplierId);
}
