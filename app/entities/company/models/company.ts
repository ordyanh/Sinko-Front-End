export const CompanyType = {
  Horeca: "Horeca",
  Supplier: "Supplier",
} as const;

export type CompanyType = (typeof CompanyType)[keyof typeof CompanyType];

export namespace CompanyType {
  export type Horeca = typeof CompanyType.Horeca;
  export type Supplier = typeof CompanyType.Supplier;
}
