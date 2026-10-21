import {
  ArrowLeft,
  Boxes,
  CalendarDays,
  Check,
  Eye,
  Gift,
  House,
  ImagePlus,
  List,
  PackagePlus,
  Power,
  Plus,
  Search,
  Save,
  PanelsTopLeft,
  UsersRound,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { getMyClients } from "~/shared/api";
import {
  getPromotionTone,
  PromotionBanner,
  type MarketplacePromotion,
  type PromotionDisplay,
} from "~/entities/promotion";
import { DashboardHeaderActions, DashboardPageContent } from "~/shared/ui";
import { useToast } from "~/shared/ui/toast";
import { useTranslation } from "~/shared/lib/i18n";
import {
  createSupplierPromotionId,
  getLoggedInUser,
  getSupplierPromotion,
  getSupplierProduct,
  getSupplierProducts,
  saveSupplierProduct,
  saveSupplierPromotion,
  type StoredSupplierPromotion,
} from "~/shared/lib/indexed-db";
import Input from "~/shared/ui/form/input";
import Select from "~/shared/ui/form/select";
import SwitchField from "~/shared/ui/form/switch";
import Modal from "~/shared/ui/modal";

type PromotionEditorProps = {
  mode: "create" | "edit";
  promotionId?: string;
};

type DiscountType = "fixed-price" | "percentage";
type Eligibility = "all-customers" | "specific-customers";
type ProductSelectionTarget = "discount" | "trigger" | "target" | null;

type SupplierProduct = {
  id: string;
  name: string;
  category: string;
  price: number;
  imageUrl: string;
  sellingOptions: SellingOption[];
};

type SellingOption = {
  id: string;
  label: string;
  price: number;
  minimumOrderQuantity: number;
};

type PromotionCustomer = {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  activityType: string;
};

type DiscountScope = "all-options" | "specific-options";

function todayDateInputValue() {
  return new Date().toISOString().slice(0, 10);
}

const sellingOptionUnitTypes = [
  "Piece (հատ)",
  "Kilogram (կգ)",
  "Gram (գ)",
  "Liter (լ)",
  "Milliliter (մլ)",
  "Package",
  "Custom selling unit",
] as const;
type SellingOptionUnitType = (typeof sellingOptionUnitTypes)[number];

function getUnitTypeLabel(unitType: SellingOptionUnitType, t: (k: string, fallback?: string) => string): string {
  switch (unitType) {
    case "Piece (հատ)":
      return t("products.unitPiece");
    case "Kilogram (կգ)":
      return t("products.unitKilogram");
    case "Gram (գ)":
      return t("products.unitGram");
    case "Liter (լ)":
      return t("products.unitLiter");
    case "Milliliter (մլ)":
      return t("products.unitMilliliter");
    case "Package":
      return t("products.unitPackage");
    case "Custom selling unit":
      return t("products.unitCustom");
    default:
      return unitType;
  }
}

/** A selling option that belongs to this BXGY promotion only, not the catalog. */
type PromotionOnlySellingOption = {
  id: string;
  productId: string;
  quantity: string;
  unitType: SellingOptionUnitType;
  piecesPerPackage: string;
  customUnit: string;
  price: string;
  compareAtPrice: string;
  minimumOrderQuantity: string;
};

function optionKey(productId: string, sellingOptionId: string) {
  return `${productId}:${sellingOptionId}`;
}

function isPositiveWholeNumber(value: string) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0;
}

function getPromotionOnlyOptionLabel(option: PromotionOnlySellingOption) {
  const unit = option.unitType === "Custom selling unit"
    ? option.customUnit || "custom unit"
    : option.unitType;
  const pieces = option.unitType === "Package" && option.piecesPerPackage
    ? ` (${option.piecesPerPackage} pcs)`
    : "";
  return `${option.quantity || "—"} ${unit}${pieces}`;
}

const supplierProducts: SupplierProduct[] = [];

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("hy-AM", {
    style: "currency",
    currency: "AMD",
    maximumFractionDigits: 0,
  }).format(amount);
}

function SectionHeading({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-6 flex items-start gap-3">
      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        {icon}
      </span>
      <div>
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
      </div>
    </div>
  );
}

export default function PromotionEditor({
  mode,
  promotionId,
}: PromotionEditorProps) {
  const isEditing = mode === "edit";
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { t } = useTranslation();

  const bannerPlacementOptions: Array<{
    value: PromotionDisplay;
    title: string;
    description: string;
    icon: typeof House;
  }> = [
    { value: "both", title: t("promotions.placementBothTitle"), description: t("promotions.placementBothDesc"), icon: PanelsTopLeft },
    { value: "home-banner", title: t("promotions.placementHomeTitle"), description: t("promotions.placementHomeDesc"), icon: House },
    { value: "promotion-list", title: t("promotions.placementPromotionsTitle"), description: t("promotions.placementPromotionsDesc"), icon: List },
  ];

  const [accountId, setAccountId] = useState("");
  const [isLoadingPromotion, setIsLoadingPromotion] = useState(isEditing);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingStatus, setIsSavingStatus] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [supplierName, setSupplierName] = useState(t("promotions.yourCompany"));
  const visualUploadInputRef = useRef<HTMLInputElement>(null);
  const [isBuyXGetY, setIsBuyXGetY] = useState(isEditing
    ? promotionId === "PROMO-1003"
    : searchParams.get("type") === "buy-x-get-y");
  const [name, setName] = useState(
    isEditing ? "Spring pantry savings" : "",
  );
  const [description, setDescription] = useState(
    isEditing
      ? "Save on staple pantry items for seasonal menu refreshes."
      : "",
  );
  const [discountType, setDiscountType] = useState<DiscountType>(
    isEditing ? "percentage" : "fixed-price",
  );
  const [discountValue, setDiscountValue] = useState(isEditing ? "15" : "");
  const [discountScope, setDiscountScope] = useState<DiscountScope>(
    isEditing ? "all-options" : "specific-options",
  );
  const [triggerQuantity, setTriggerQuantity] = useState(
    isBuyXGetY ? "6" : "",
  );
  const [targetQuantity, setTargetQuantity] = useState(
    isBuyXGetY ? "1" : "",
  );
  const [eligibility, setEligibility] = useState<Eligibility>("all-customers");
  // New offers are live by default. The supplier can still turn the switch
  // off before saving if they want to keep an unpublished draft.
  const [isActive, setIsActive] = useState(true);
  const [hasEndDate, setHasEndDate] = useState(isEditing);
  const [startDate, setStartDate] = useState(todayDateInputValue);
  const [endDate, setEndDate] = useState("2026-04-30");
  const [productSelectionTarget, setProductSelectionTarget] =
    useState<ProductSelectionTarget>(null);
  const [productSearch, setProductSearch] = useState("");
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [discountProductIds, setDiscountProductIds] = useState<string[]>([]);
  const [discountOptionKeys, setDiscountOptionKeys] = useState<string[]>([]);
  const [fixedPrices, setFixedPrices] = useState<Record<string, string>>({});
  const [triggerProductId, setTriggerProductId] = useState("");
  const [triggerOptionId, setTriggerOptionId] = useState("");
  const [targetProductId, setTargetProductId] = useState("");
  const [targetOptionId, setTargetOptionId] = useState("");
  const [giftChoices, setGiftChoices] = useState<Array<{ productId: string; optionId: string }>>([]);
  const [isCreatingTargetSellingOption, setIsCreatingTargetSellingOption] = useState(false);
  const [newTargetOption, setNewTargetOption] = useState<PromotionOnlySellingOption>({
    id: "promotion-only-y-option",
    productId: "",
    quantity: "",
    unitType: "Piece (հատ)",
    piecesPerPackage: "",
    customUnit: "",
    price: "",
    compareAtPrice: "",
    minimumOrderQuantity: "1",
  });
  const [promotionOnlyTargetOption, setPromotionOnlyTargetOption] = useState<PromotionOnlySellingOption | null>(null);
  const [newTargetOptionError, setNewTargetOptionError] = useState("");
  const [applyOnIndividualPricing, setApplyOnIndividualPricing] = useState(false);
  const [display, setDisplay] = useState<PromotionDisplay>("both");
  const [isBannerEnabled, setIsBannerEnabled] = useState(true);
  const [visualUrl, setVisualUrl] = useState("");
  const [visualError, setVisualError] = useState("");
  const [bannerImage, setBannerImage] = useState<StoredSupplierPromotion["bannerImage"]>();
  const [brandColorFallback, setBrandColorFallback] = useState("#0284c7");
  const [isCustomerSelectorOpen, setIsCustomerSelectorOpen] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);
  const [eligibleCustomerIds, setEligibleCustomerIds] = useState<string[]>([]);
  const [catalogProducts, setCatalogProducts] = useState<SupplierProduct[]>([]);
  const [availableCustomers, setAvailableCustomers] = useState<PromotionCustomer[]>([]);

  const isSingleProductSelection = productSelectionTarget === "trigger";
  const normalizedProductSearch = productSearch.trim().toLowerCase();
  const filteredProducts = catalogProducts.filter((product) =>
    [product.name, product.category]
      .join(" ")
      .toLowerCase()
      .includes(normalizedProductSearch),
  );
  const triggerProduct = catalogProducts.find(
    (product) => product.id === triggerProductId,
  );
  const targetProduct = catalogProducts.find(
    (product) => product.id === targetProductId,
  );
  const selectedDiscountProducts = catalogProducts.filter((product) =>
    discountProductIds.includes(product.id),
  );
  const selectedDiscountOptions = selectedDiscountProducts.flatMap((product) =>
    product.sellingOptions
      .filter(
        (option) =>
          discountScope === "all-options" ||
          discountOptionKeys.includes(optionKey(product.id, option.id)),
      )
      .map((option) => ({ product, option })),
  );
  const triggerOption = triggerProduct?.sellingOptions.find(
    (option) => option.id === triggerOptionId,
  );
  const targetOption = promotionOnlyTargetOption?.productId === targetProductId
    ? {
        id: promotionOnlyTargetOption.id,
        label: getPromotionOnlyOptionLabel(promotionOnlyTargetOption),
        price: Number(promotionOnlyTargetOption.price),
        minimumOrderQuantity: Number(promotionOnlyTargetOption.minimumOrderQuantity),
      }
    : targetProduct?.sellingOptions.find((option) => option.id === targetOptionId);
  // This panel opens only while a supplier is creating a new catalog option
  // for one of the selected Y products.
  const showLegacyTargetOptionEditor = isCreatingTargetSellingOption;
  const eligibleCustomers = availableCustomers.filter((customer) =>
    eligibleCustomerIds.includes(customer.id),
  );
  const promotionTypeLabel = isBuyXGetY
    ? t("promotions.buyXGetY")
    : discountType === "fixed-price"
      ? t("promotions.fixedPrice")
      : t("promotions.percentageDiscount");
  const previewPromotionType: MarketplacePromotion["type"] = isBuyXGetY
    ? "BuyXGetY"
    : discountType === "fixed-price"
      ? "FixedPrice"
      : "Percentage";
  const previewFixedPrice = selectedDiscountOptions.length > 0
    ? Number(fixedPrices[optionKey(selectedDiscountOptions[0].product.id, selectedDiscountOptions[0].option.id)])
    : Number.NaN;
  const previewBenefitLabel = isBuyXGetY
    ? t("promotions.previewBuyXGetY", { x: triggerQuantity || "X", y: targetQuantity || "Y" })
    : discountType === "fixed-price"
      ? Number.isFinite(previewFixedPrice)
        ? t("promotions.previewFixedPrice", { price: formatCurrency(previewFixedPrice) })
        : t("promotions.setFixedPrice")
      : discountValue
        ? t("promotions.previewPercentOff", { percent: discountValue })
        : t("promotions.setDiscount");
  // This object is derived at render time from the live form state. It has no
  // saved ID and is never passed to the IndexedDB-backed mock.
  const previewPromotion: MarketplacePromotion = {
    id: "promotion-preview",
    supplierName,
    title: name.trim() || t("promotions.untitledPromotion"),
    description: description.trim(),
    type: previewPromotionType,
    startDate: startDate || todayDateInputValue(),
    endDate: hasEndDate && endDate ? endDate : "2099-12-31",
    productIds: isBuyXGetY
      ? [triggerProductId, ...giftChoices.map((choice) => choice.productId)].filter(Boolean)
      : discountProductIds,
    benefitLabel: previewBenefitLabel,
    conditions: t("promotions.previewOnlyNotice"),
    display,
    isBannerEnabled,
    visualUrl: visualUrl || undefined,
    fixedPrice: previewPromotionType === "FixedPrice" && Number.isFinite(previewFixedPrice)
      ? previewFixedPrice
      : undefined,
    discountPercent: previewPromotionType === "Percentage" ? Number(discountValue) || undefined : undefined,
    buyQuantity: previewPromotionType === "BuyXGetY" ? Number(triggerQuantity) || undefined : undefined,
    giftQuantity: previewPromotionType === "BuyXGetY" ? Number(targetQuantity) || undefined : undefined,
    giftChoices: previewPromotionType === "BuyXGetY" ? giftChoices : undefined,
    tone: getPromotionTone(brandColorFallback),
  };
  const normalizedCustomerSearch = customerSearch.trim().toLowerCase();
  const filteredCustomers = availableCustomers.filter((customer) =>
    [
      customer.companyName,
      customer.contactName,
      customer.email,
      customer.activityType,
    ]
      .join(" ")
      .toLowerCase()
      .includes(normalizedCustomerSearch),
  );

  useEffect(() => {
    let isCurrent = true;

    void (async () => {
      const user = await getLoggedInUser();
      if (!isCurrent || !user || user.role !== "supplier") return;

      setAccountId(user.id);
      setSupplierName(user.companyName);
      const [storedProducts, clients] = await Promise.all([
        getSupplierProducts(user.id),
        getMyClients(),
      ]);
      if (!isCurrent) return;
      setAvailableCustomers(
        clients.map((c) => ({
          id: c.clientId || c.id,
          companyName: c.companyName || "Unknown Customer",
          contactName: c.contactPerson || "",
          email: c.email || "",
          activityType: c.status || "Customer",
        })),
      );
      setCatalogProducts(storedProducts.map((product) => ({
        id: product.id,
        name: product.name,
        category: "Supplier catalog",
        price: product.sellingOptions[0]?.price ?? 0,
        imageUrl: product.imageUrl ?? "",
        sellingOptions: product.sellingOptions.map((option) => ({
          id: option.id,
          label: `${option.quantity} ${option.customUnit?.trim() || option.unitType}${option.unitType === "Package" && option.piecesPerPackage ? ` (${option.piecesPerPackage} pcs)` : ""}`,
          price: option.price,
          minimumOrderQuantity: option.minimumOrderQuantity,
        })),
      })));
      if (!isEditing || !promotionId) {
        if (storedProducts.length > 0) {
          setTriggerProductId((prev) => prev || storedProducts[0].id);
          setTriggerOptionId((prev) => prev || storedProducts[0].sellingOptions[0]?.id || "");
          setTargetProductId((prev) => prev || (storedProducts.length > 1 ? storedProducts[1].id : storedProducts[0].id));
          setTargetOptionId((prev) => prev || (storedProducts.length > 1 ? storedProducts[1].sellingOptions[0]?.id : storedProducts[0].sellingOptions[0]?.id) || "");
          setDiscountProductIds((prev) => prev.length > 0 ? prev : [storedProducts[0].id]);
        }
        setIsLoadingPromotion(false);
        return;
      }

      const promotion = await getSupplierPromotion(user.id, promotionId);
      if (!isCurrent || !promotion) {
        setIsLoadingPromotion(false);
        return;
      }

      setName(promotion.name);
      setDescription(promotion.description);
      setIsBuyXGetY(promotion.type === "BuyXGetY");
      setDiscountType(promotion.type === "FixedPrice" ? "fixed-price" : "percentage");
      setDiscountValue(promotion.discountPercent ?? "");
      setDiscountProductIds(promotion.productIds);
      setDiscountScope(promotion.discountScope ?? "specific-options");
      setDiscountOptionKeys(promotion.discountOptionKeys);
      setFixedPrices(promotion.fixedPrices);
      setTriggerProductId(promotion.triggerProductId ?? "");
      setTriggerOptionId(promotion.triggerOptionId ?? "");
      setTriggerQuantity(promotion.triggerQuantity ?? "");
      setTargetProductId(promotion.targetProductId ?? "");
      setTargetOptionId(promotion.targetOptionId ?? "");
      setGiftChoices(
        promotion.giftChoices?.length
          ? promotion.giftChoices
          : promotion.targetProductId && promotion.targetOptionId
            ? [{ productId: promotion.targetProductId, optionId: promotion.targetOptionId }]
            : [],
      );
      setTargetQuantity(promotion.targetQuantity ?? "");
      setEligibility(promotion.eligibility);
      setEligibleCustomerIds(promotion.eligibleCustomerIds);
      setApplyOnIndividualPricing(promotion.applyOnIndividualPricing);
      setIsBannerEnabled(promotion.isBannerEnabled);
      setDisplay(promotion.display);
      setBannerImage(promotion.bannerImage);
      setVisualUrl(promotion.bannerImage?.dataUrl ?? "");
      setBrandColorFallback(promotion.brandColorFallback);
      setIsActive(promotion.status === "Active");
      setStartDate(promotion.startDate);
      setHasEndDate(Boolean(promotion.endDate));
      setEndDate(promotion.endDate ?? "");
      setIsLoadingPromotion(false);
    })().catch(() => {
      if (!isCurrent) return;
      setIsLoadingPromotion(false);
      showToast({
        title: t("promotions.detailsUnavailableTitle"),
        description: t("promotions.detailsUnavailableDesc"),
        variant: "error",
      });
    });

    return () => {
      isCurrent = false;
    };
  }, [isEditing, promotionId, showToast, t]);

  async function handleStatusChange(nextIsActive: boolean) {
    if (nextIsActive && (!startDate || !startDate.trim())) {
      showToast({
        title: t("promotions.activationDateRequiredTitle"),
        description: t("promotions.activationDateRequiredDesc"),
        variant: "error",
      });
      setIsActive(false);
      return;
    }

    setIsActive(nextIsActive);

    // Existing promotions save this control immediately. Status is an
    // operational switch, not a draft field that should be lost if the user
    // leaves the editor without submitting unrelated changes.
    if (!isEditing || !promotionId || !accountId) return;

    try {
      setIsSavingStatus(true);
      const existingPromotion = await getSupplierPromotion(accountId, promotionId);
      if (!existingPromotion) throw new Error("Promotion not found.");
      await saveSupplierPromotion({
        ...existingPromotion,
        status: nextIsActive ? "Active" : "Draft",
        startDate: startDate || existingPromotion.startDate || todayDateInputValue(),
        endDate: hasEndDate && endDate ? endDate : existingPromotion.endDate,
        updatedAt: new Date().toISOString(),
      });
      showToast({
        title: nextIsActive ? t("promotions.activatedTitle") : t("promotions.deactivatedTitle"),
        description: nextIsActive
          ? t("promotions.activatedDesc")
          : t("promotions.deactivatedDesc"),
        variant: "success",
      });
    } catch {
      setIsActive(!nextIsActive);
      showToast({
        title: t("promotions.statusNotSavedTitle"),
        description: t("promotions.statusNotSavedDesc"),
        variant: "error",
      });
    } finally {
      setIsSavingStatus(false);
    }
  }

  function openProductSelector(target: Exclude<ProductSelectionTarget, null>) {
    const currentSelection =
      target === "discount"
        ? discountProductIds
        : target === "trigger"
          ? triggerProductId ? [triggerProductId] : []
          : giftChoices.map((choice) => choice.productId);

    setSelectedProductIds(currentSelection);
    setProductSearch("");
    setProductSelectionTarget(target);
  }

  function toggleProduct(productId: string) {
    setSelectedProductIds((currentIds) => {
      if (isSingleProductSelection) return [productId];

      return currentIds.includes(productId)
        ? currentIds.filter((id) => id !== productId)
        : [...currentIds, productId];
    });
  }

  function applyProductSelection() {
    if (productSelectionTarget === "discount") {
      setDiscountProductIds(selectedProductIds);
      setDiscountOptionKeys((currentOptionKeys) =>
        currentOptionKeys.filter((key) =>
          selectedProductIds.some((productId) => key.startsWith(`${productId}:`)),
        ),
      );
    }
    if (productSelectionTarget === "trigger") {
      setTriggerProductId(selectedProductIds[0] ?? "");
      const product = catalogProducts.find(
        ({ id }) => id === selectedProductIds[0],
      );
      setTriggerOptionId(product?.sellingOptions[0]?.id ?? "");
    }
    if (productSelectionTarget === "target") {
      const nextGiftChoices = selectedProductIds.map((productId) => ({
        productId,
        optionId: giftChoices.find((choice) => choice.productId === productId)?.optionId
          ?? catalogProducts.find((product) => product.id === productId)?.sellingOptions[0]?.id
          ?? "",
      }));
      setGiftChoices(nextGiftChoices);
      setTargetProductId(nextGiftChoices[0]?.productId ?? "");
      setTargetOptionId(nextGiftChoices[0]?.optionId ?? "");
      setIsCreatingTargetSellingOption(false);
      setNewTargetOption((currentOption) => ({ ...currentOption, productId: "" }));
      setPromotionOnlyTargetOption(null);
      setNewTargetOptionError("");
    }

    setProductSelectionTarget(null);
  }

  function toggleDiscountOption(productId: string, sellingOptionId: string) {
    const key = optionKey(productId, sellingOptionId);
    setDiscountOptionKeys((currentOptionKeys) =>
      currentOptionKeys.includes(key)
        ? currentOptionKeys.filter((currentKey) => currentKey !== key)
        : [...currentOptionKeys, key],
    );
  }

  function setGiftChoiceOption(productId: string, optionId: string) {
    setGiftChoices((currentChoices) => currentChoices.map((choice) =>
      choice.productId === productId ? { ...choice, optionId } : choice,
    ));
    if (productId === targetProductId) setTargetOptionId(optionId);
  }

  function handleDiscountTypeChange(value: string | string[]) {
    if (Array.isArray(value)) return;

    const nextDiscountType = value as DiscountType;
    setDiscountType(nextDiscountType);
    if (nextDiscountType === "fixed-price") setDiscountScope("specific-options");
  }

  function openCustomerSelector() {
    setSelectedCustomerIds(eligibleCustomerIds);
    setCustomerSearch("");
    setIsCustomerSelectorOpen(true);
  }

  function toggleCustomer(customerId: string) {
    setSelectedCustomerIds((currentIds) =>
      currentIds.includes(customerId)
        ? currentIds.filter((id) => id !== customerId)
        : [...currentIds, customerId],
    );
  }

  function applyCustomerSelection() {
    setEligibleCustomerIds(selectedCustomerIds);
    setIsCustomerSelectorOpen(false);
  }

  function handleEligibilityChange(value: string | string[]) {
    if (Array.isArray(value)) return;

    const nextEligibility = value as Eligibility;

    setEligibility(nextEligibility);
    if (nextEligibility === "specific-customers") openCustomerSelector();
  }

  async function createTargetSellingOption() {
    if (
      !targetProduct ||
      !isPositiveWholeNumber(newTargetOption.quantity) ||
      !Number.isFinite(Number(newTargetOption.price)) ||
      Number(newTargetOption.price) < 0 ||
      (Boolean(newTargetOption.compareAtPrice) && Number(newTargetOption.compareAtPrice) <= Number(newTargetOption.price)) ||
      !isPositiveWholeNumber(newTargetOption.minimumOrderQuantity) ||
      (newTargetOption.unitType === "Package" && !isPositiveWholeNumber(newTargetOption.piecesPerPackage)) ||
      (newTargetOption.unitType === "Custom selling unit" && !newTargetOption.customUnit.trim())
    ) {
      setNewTargetOptionError(
        t("promotions.sellingOptionErrorFields"),
      );
      return;
    }

    if (!accountId) return;
    const optionId = `promotion-option-${globalThis.crypto?.randomUUID?.() ?? Date.now()}`;
    try {
      const storedProduct = await getSupplierProduct(accountId, targetProduct.id);
      if (!storedProduct) throw new Error("Product not found.");
      await saveSupplierProduct({
        ...storedProduct,
        sellingOptions: [...storedProduct.sellingOptions, {
          id: optionId,
          quantity: Number(newTargetOption.quantity),
          unitType: newTargetOption.unitType,
          piecesPerPackage: newTargetOption.unitType === "Package" ? Number(newTargetOption.piecesPerPackage) : undefined,
          customUnit: newTargetOption.unitType === "Custom selling unit" ? newTargetOption.customUnit.trim() : undefined,
          price: Number(newTargetOption.price),
          compareAtPrice: newTargetOption.compareAtPrice ? Number(newTargetOption.compareAtPrice) : undefined,
          minimumOrderQuantity: Number(newTargetOption.minimumOrderQuantity),
          companyPrices: [],
        }],
      });
      const label = getPromotionOnlyOptionLabel({ ...newTargetOption, id: optionId, productId: targetProduct.id });
      setCatalogProducts((currentProducts) => currentProducts.map((product) => product.id === targetProduct.id ? {
        ...product,
        sellingOptions: [...product.sellingOptions, { id: optionId, label, price: Number(newTargetOption.price), minimumOrderQuantity: Number(newTargetOption.minimumOrderQuantity) }],
      } : product));
      setGiftChoiceOption(targetProduct.id, optionId);
      setTargetOptionId(optionId);
      setIsCreatingTargetSellingOption(false);
      setNewTargetOptionError("");
      showToast({ title: t("promotions.sellingOptionCreatedTitle"), description: t("promotions.sellingOptionCreatedDesc", { product: targetProduct.name }), variant: "success" });
    } catch {
      setNewTargetOptionError(t("promotions.sellingOptionCreateError"));
    }
  }

  function clearBannerVisual() {
    setVisualUrl("");
    setBannerImage(undefined);
    setVisualError("");
    if (visualUploadInputRef.current) visualUploadInputRef.current.value = "";
  }

  function handleVisualUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();
    const isJpeg = file.type === "image/jpeg" || file.type === "image/jpg" || /\.jpe?g$/.test(fileName);
    const isPng = file.type === "image/png" || /\.png$/.test(fileName);
    if (!isJpeg && !isPng) {
      setVisualError(t("promotions.errorJpgPng"));
      input.value = "";
      return;
    }
    const mimeType = isPng ? "image/png" : "image/jpeg";
    if (file.size > 10 * 1024 * 1024) {
      setVisualError(t("promotions.errorImageSize"));
      input.value = "";
      return;
    }
    setVisualError("");

    const reader = new FileReader();
    reader.onload = () => {
      const rawDataUrl = typeof reader.result === "string" ? reader.result : "";
      if (!rawDataUrl) {
        setVisualError(t("promotions.errorImageUnreadable"));
        input.value = "";
        return;
      }

      // Resize and compress via canvas to avoid browser memory bloat and tab crashes
      const img = new Image();
      img.onload = () => {
        try {
          const maxWidth = 1200;
          const maxHeight = 600;
          let width = img.width;
          let height = img.height;

          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const compressed = canvas.toDataURL(mimeType, 0.85);
            setVisualUrl(compressed);
            setBannerImage({
              dataUrl: compressed,
              fileName: file.name,
              mimeType,
            });
          } else {
            setVisualUrl(rawDataUrl);
            setBannerImage({
              dataUrl: rawDataUrl,
              fileName: file.name,
              mimeType,
            });
          }
        } catch {
          setVisualUrl(rawDataUrl);
          setBannerImage({
            dataUrl: rawDataUrl,
            fileName: file.name,
            mimeType,
          });
        } finally {
          input.value = "";
        }
      };
      img.onerror = () => {
        setVisualError(t("promotions.errorImageRender"));
        input.value = "";
      };
      img.src = rawDataUrl;
    };
    reader.onerror = () => {
      setVisualError(t("promotions.errorImageUnreadable"));
      input.value = "";
    };
    reader.readAsDataURL(file);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isCreatingTargetSellingOption) {
      showToast({ title: t("promotions.finishNewOptionTitle"), description: t("promotions.finishNewOptionDesc"), variant: "error" });
      return;
    }

    if (!name.trim()) {
      showToast({ title: t("promotions.nameRequiredTitle"), description: t("promotions.nameRequiredDesc"), variant: "error" });
      return;
    }

    if (isActive && (!startDate || !startDate.trim())) {
      showToast({
        title: t("promotions.activationDateRequiredTitle"),
        description: t("promotions.activationDateRequiredDesc"),
        variant: "error",
      });
      return;
    }

    if (hasEndDate && (!endDate || !endDate.trim())) {
      showToast({
        title: t("promotions.endDateRequiredTitle"),
        description: t("promotions.endDateRequiredDesc"),
        variant: "error",
      });
      return;
    }

    if (hasEndDate && endDate && startDate && endDate < startDate) {
      showToast({
        title: t("promotions.invalidDateRangeTitle"),
        description: t("promotions.invalidDateRangeDesc"),
        variant: "error",
      });
      return;
    }

    if (isBuyXGetY && (!triggerOption || giftChoices.length === 0 || giftChoices.some((choice) => !choice.optionId))) {
      window.alert(t("promotions.bxgySelectOptionsAlert"));
      return;
    }

    if (!isBuyXGetY && selectedDiscountOptions.length === 0) {
      window.alert(t("promotions.selectAtLeastOneOptionAlert"));
      return;
    }

    if (
      discountType === "fixed-price" &&
      selectedDiscountOptions.some(({ product, option }) => {
        const price = Number(fixedPrices[optionKey(product.id, option.id)]);
        return !Number.isFinite(price) || price < 0 || price >= option.price;
      })
    ) {
      window.alert(t("promotions.priceMustBeLowerAlert"));
      return;
    }

    if (!accountId) {
      showToast({ title: t("promotions.couldNotSaveTitle"), description: t("promotions.accountLoadingDesc"), variant: "error" });
      return;
    }

    const now = new Date().toISOString();
    const promotion: StoredSupplierPromotion = {
      id: isEditing && promotionId ? promotionId : createSupplierPromotionId(),
      accountId,
      name: name.trim() || t("promotions.untitledPromotion"),
      description: description.trim(),
      type: isBuyXGetY ? "BuyXGetY" : discountType === "fixed-price" ? "FixedPrice" : "Percentage",
      status: isActive ? "Active" : "Draft",
      startDate,
      endDate: hasEndDate ? endDate : undefined,
      productIds: isBuyXGetY ? [triggerProductId, ...giftChoices.map((choice) => choice.productId)].filter(Boolean) : discountProductIds,
      discountScope: isBuyXGetY ? undefined : discountScope,
      discountOptionKeys,
      fixedPrices,
      discountPercent: discountType === "percentage" ? discountValue : undefined,
      triggerProductId: isBuyXGetY ? triggerProductId : undefined,
      triggerOptionId: isBuyXGetY ? triggerOptionId : undefined,
      triggerQuantity: isBuyXGetY ? triggerQuantity : undefined,
      targetProductId: isBuyXGetY ? targetProductId : undefined,
      targetOptionId: isBuyXGetY ? targetOptionId : undefined,
      targetQuantity: isBuyXGetY ? targetQuantity : undefined,
      giftChoices: isBuyXGetY ? giftChoices : undefined,
      eligibility,
      eligibleCustomerIds,
      applyOnIndividualPricing,
      isBannerEnabled,
      display,
      bannerImage,
      brandColorFallback,
      createdAt: now,
      updatedAt: now,
    };

    try {
      setIsSaving(true);
      const previous = isEditing && promotionId
        ? await getSupplierPromotion(accountId, promotionId)
        : null;
      await saveSupplierPromotion({ ...promotion, createdAt: previous?.createdAt ?? now });
      showToast({
        title: isEditing ? t("promotions.updatedTitle") : t("promotions.createdTitle"),
        description: isBannerEnabled
          ? t("promotions.savedWithBannerDesc")
          : t("promotions.savedWithoutBannerDesc"),
        variant: "success",
      });
      navigate("/supplier/promotions");
    } catch (error) {
      const isStorageLimit = error instanceof DOMException && error.name === "QuotaExceededError";
      showToast({
        title: t("promotions.saveErrorTitle"),
        description: isStorageLimit
          ? t("promotions.storageLimitDesc")
          : error instanceof Error ? error.message : t("promotions.tryAgainDesc"),
        variant: "error",
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <DashboardPageContent>
      <DashboardHeaderActions
        refreshKey={[
          accountId,
          isSaving,
          isLoadingPromotion,
          isActive,
          name,
          description,
          discountType,
          discountValue,
          discountScope,
          startDate,
          endDate,
          hasEndDate,
          triggerProductId,
          triggerOptionId,
          triggerQuantity,
          targetQuantity,
          JSON.stringify(discountProductIds),
          JSON.stringify(discountOptionKeys),
          JSON.stringify(fixedPrices),
          JSON.stringify(giftChoices),
          JSON.stringify(eligibleCustomerIds),
          isBannerEnabled,
          display,
        ].join("|")}
        back={
          <Link
            to="/supplier/promotions"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {t("promotions.backToPromotions")}
          </Link>
        }
        actions={
          <>
            <Link
              to="/supplier/promotions"
              className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              {t("common.cancel")}
            </Link>
            <button
              type="submit"
              form="promotion-editor"
              disabled={isSaving || isLoadingPromotion}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-content transition hover:brightness-95"
            >
              <Save className="h-4 w-4" aria-hidden="true" />
              {isSaving ? t("promotions.savingPromotion") : isEditing ? t("common.saveChanges") : t("promotions.createPromotion")}
            </button>
          </>
        }
      />
      <form id="promotion-editor" noValidate onSubmit={handleSubmit} className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(18rem,0.8fr)]">
          <div className="space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
              <SectionHeading
                icon={<PackagePlus className="h-5 w-5" aria-hidden="true" />}
                title={t("promotions.mainInformation")}
                description={t("promotions.mainInformationDesc")}
              />
              <div className="space-y-5">
                <Input
                  id="promotion-name"
                  label={t("promotions.promotionName")}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder={t("promotions.promotionNamePlaceholder")}
                  required
                />
                <div>
                  <label htmlFor="promotion-description" className="mb-2 block text-sm font-medium text-slate-900">
                    {t("promotions.promotionDescription")}
                  </label>
                  <textarea
                    id="promotion-description"
                    rows={5}
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder={t("promotions.promotionDescriptionPlaceholder")}
                    className="block w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 transition hover:border-slate-300 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
                  />
                </div>
              </div>
            </section>

            {isBuyXGetY ? (
              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
                <SectionHeading
                  icon={<Gift className="h-5 w-5" aria-hidden="true" />}
                  title={t("promotions.bxgyRuleTitle")}
                  description={t("promotions.bxgyRuleDesc")}
                />
                <div className="space-y-6">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      {t("promotions.buyX")}
                    </p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_9rem]">
                      <button
                        type="button"
                        onClick={() => openProductSelector("trigger")}
                        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
                      >
                        <PackagePlus className="h-4 w-4" aria-hidden="true" />
                        {triggerProduct ? triggerProduct.name : t("promotions.selectTriggerProduct")}
                      </button>
                      <Input
                        id="trigger-quantity"
                        label={t("promotions.quantityX")}
                        type="number"
                        min="1"
                        step="1"
                        value={triggerQuantity}
                        onChange={(event) => setTriggerQuantity(event.target.value)}
                        required
                      />
                    </div>
                    {triggerProduct ? (
                      <div className="mt-3">
                        <label htmlFor="trigger-selling-option" className="mb-2 block text-sm font-medium text-slate-700">
                          {t("promotions.sellingOption")}
                        </label>
                        <Select
                          id="trigger-selling-option"
                          value={triggerOptionId}
                          onValueChange={(value) => !Array.isArray(value) && setTriggerOptionId(value)}
                        >
                          {triggerProduct.sellingOptions.map((option) => (
                            <option key={option.id} value={option.id}>
                              {option.label} · {formatCurrency(option.price)}
                            </option>
                          ))}
                        </Select>
                      </div>
                    ) : null}
                  </div>

                  <div className="rounded-2xl border border-violet-100 bg-violet-50/60 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-700">
                      {t("promotions.getY")}
                    </p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_9rem]">
                      <button
                        type="button"
                        onClick={() => openProductSelector("target")}
                        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-violet-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-violet-300 hover:bg-violet-100/50 hover:text-violet-800"
                      >
                        <Gift className="h-4 w-4" aria-hidden="true" />
                        {giftChoices.length ? t("promotions.eligibleGiftsSelected", { count: giftChoices.length }) : t("promotions.selectEligibleGifts")}
                      </button>
                      <Input
                        id="target-quantity"
                        label={t("promotions.quantityY")}
                        type="number"
                        min="1"
                        step="1"
                        value={targetQuantity}
                        onChange={(event) => setTargetQuantity(event.target.value)}
                        required
                      />
                    </div>
                    {giftChoices.length > 0 ? (
                      <div className="mt-3 space-y-2">
                        <p className="text-xs font-semibold text-violet-800">{t("promotions.horecaBuyersGiftNotice")}</p>
                        {giftChoices.map((choice) => {
                          const giftProduct = catalogProducts.find((product) => product.id === choice.productId);
                          if (!giftProduct) return null;
                          return (
                            <div key={choice.productId} className="flex flex-wrap items-center gap-3 rounded-xl border border-violet-200 bg-white p-3">
                              {giftProduct.imageUrl ? (
                                <img src={giftProduct.imageUrl} alt="" className="h-9 w-9 rounded-lg object-cover" />
                              ) : (
                                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
                                  <Boxes className="h-4 w-4" />
                                </div>
                              )}
                              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-900">{giftProduct.name}</span>
                              <Select value={choice.optionId} onValueChange={(value) => !Array.isArray(value) && setGiftChoiceOption(choice.productId, value)} className="w-40 shrink-0">{giftProduct.sellingOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</Select>
                              <button type="button" onClick={() => { setTargetProductId(choice.productId); setTargetOptionId(choice.optionId); setNewTargetOption({ id: "promotion-new-option", productId: choice.productId, quantity: "", unitType: "Piece (հատ)", piecesPerPackage: "", customUnit: "", price: "", compareAtPrice: "", minimumOrderQuantity: "1" }); setPromotionOnlyTargetOption(null); setIsCreatingTargetSellingOption(true); setNewTargetOptionError(""); }} className="text-xs font-semibold text-violet-700 transition hover:text-violet-950">{t("promotions.newOption")}</button>
                              <button type="button" onClick={() => { const nextChoices = giftChoices.filter((item) => item.productId !== choice.productId); setGiftChoices(nextChoices); setTargetProductId(nextChoices[0]?.productId ?? ""); setTargetOptionId(nextChoices[0]?.optionId ?? ""); }} className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-700" aria-label={`${t("promotions.removeGiftAria")} ${giftProduct.name}`}><X className="h-4 w-4" aria-hidden="true" /></button>
                            </div>
                          );
                        })}
                      </div>
                    ) : null}
                    {targetProduct && showLegacyTargetOptionEditor ? (
                      <div className="mt-3">
                        {isCreatingTargetSellingOption ? (
                          <div className="rounded-xl border border-violet-200 bg-white p-4">
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <p className="text-sm font-semibold text-violet-950">{t("promotions.createYSellingOption")}</p>
                                <p className="mt-1 text-xs leading-5 text-violet-700">{t("promotions.createYSellingOptionDesc")}</p>
                              </div>
                              <button type="button" onClick={() => { setIsCreatingTargetSellingOption(false); setNewTargetOptionError(""); setPromotionOnlyTargetOption(null); setTargetOptionId(targetProduct.sellingOptions[0]?.id ?? ""); }} className="shrink-0 text-xs font-semibold text-violet-700 transition hover:text-violet-950">{t("promotions.useExisting")}</button>
                            </div>
                            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                              <Input id="promotion-y-option-quantity" label={t("products.quantity")} type="number" min="1" step="1" value={newTargetOption.quantity} onChange={(event) => setNewTargetOption((currentOption) => ({ ...currentOption, quantity: event.target.value }))} placeholder="1" required />
                              <div>
                                <label className="mb-2 block text-sm font-medium text-slate-900" htmlFor="promotion-y-option-unit">{t("products.unitType")}</label>
                                <Select id="promotion-y-option-unit" value={newTargetOption.unitType} onValueChange={(value) => !Array.isArray(value) && setNewTargetOption((currentOption) => ({ ...currentOption, unitType: value as SellingOptionUnitType }))}>
                                  {sellingOptionUnitTypes.map((unitType) => <option key={unitType} value={unitType}>{getUnitTypeLabel(unitType, t)}</option>)}
                                </Select>
                              </div>
                              <Input id="promotion-y-option-price" label={t("promotions.priceAmd")} type="number" min="0" step="1" value={newTargetOption.price} onChange={(event) => setNewTargetOption((currentOption) => ({ ...currentOption, price: event.target.value }))} placeholder="0" required />
                              <Input id="promotion-y-option-compare-at-price" label={t("promotions.compareAtAmd")} type="number" min="0" step="1" value={newTargetOption.compareAtPrice} onChange={(event) => setNewTargetOption((currentOption) => ({ ...currentOption, compareAtPrice: event.target.value }))} placeholder={t("common.optional")} />
                              <Input id="promotion-y-option-minimum-order" label={t("products.minOrderQuantity")} type="number" min="1" step="1" value={newTargetOption.minimumOrderQuantity} onChange={(event) => setNewTargetOption((currentOption) => ({ ...currentOption, minimumOrderQuantity: event.target.value }))} placeholder="1" required />
                            </div>
                            {newTargetOption.unitType === "Package" ? <Input id="promotion-y-option-pieces-per-package" label={t("products.piecesPerPackage")} type="number" min="1" step="1" inputMode="numeric" value={newTargetOption.piecesPerPackage} onChange={(event) => setNewTargetOption((currentOption) => ({ ...currentOption, piecesPerPackage: event.target.value }))} placeholder="e.g. 12" required error={Boolean(newTargetOption.piecesPerPackage) && !isPositiveWholeNumber(newTargetOption.piecesPerPackage)} errorMessage={Boolean(newTargetOption.piecesPerPackage) && !isPositiveWholeNumber(newTargetOption.piecesPerPackage) ? t("products.positiveWholeNumberError") : undefined} containerClassName="mt-3" /> : null}
                            {newTargetOption.unitType === "Custom selling unit" ? <Input id="promotion-y-option-custom-unit" label={t("products.customUnitName")} value={newTargetOption.customUnit} onChange={(event) => setNewTargetOption((currentOption) => ({ ...currentOption, customUnit: event.target.value }))} placeholder="e.g. 20 L keg or service tray" containerClassName="mt-3" required /> : null}
                            <p className="mt-3 text-xs text-slate-500">{t("promotions.promotionUses")}: <span className="font-semibold text-slate-700">{getPromotionOnlyOptionLabel(newTargetOption)}</span>{newTargetOption.price ? ` — ${formatCurrency(Number(newTargetOption.price))}` : ""}{newTargetOption.compareAtPrice ? <><span className="mx-1.5 text-slate-400">{t("promotions.wasPrice")}</span><span className="text-slate-400 line-through">{formatCurrency(Number(newTargetOption.compareAtPrice))}</span></> : null}<span className="ml-2">{t("promotions.minOrderUnits")}: {newTargetOption.minimumOrderQuantity || "—"}</span></p>
                            {newTargetOptionError ? <p role="alert" className="mt-3 text-sm font-medium text-rose-700">{newTargetOptionError}</p> : null}
                            <button type="button" onClick={createTargetSellingOption} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-violet-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-violet-700"><Plus className="h-4 w-4" aria-hidden="true" />{t("promotions.createSellingOptionBtn")}</button>
                          </div>
                        ) : promotionOnlyTargetOption?.productId === targetProduct.id ? (
                          <div className="rounded-xl border border-violet-200 bg-white p-4">
                            <p className="text-sm font-semibold text-violet-950">{t("promotions.promotionOnlyYOption")}</p>
                            <p className="mt-1 text-sm text-slate-700">{getPromotionOnlyOptionLabel(promotionOnlyTargetOption)} · {formatCurrency(Number(promotionOnlyTargetOption.price))}</p>
                            <p className="mt-1 text-xs leading-5 text-violet-700">{t("promotions.promotionOnlyYOptionDesc")}</p>
                            <div className="mt-3 flex flex-wrap gap-3"><button type="button" onClick={() => { setNewTargetOption(promotionOnlyTargetOption); setIsCreatingTargetSellingOption(true); }} className="text-sm font-semibold text-violet-700 transition hover:text-violet-950">{t("promotions.editOption")}</button><button type="button" onClick={() => { setNewTargetOption({ id: "promotion-only-y-option", productId: targetProduct.id, quantity: "", unitType: "Piece (հատ)", piecesPerPackage: "", customUnit: "", price: "", compareAtPrice: "", minimumOrderQuantity: "1" }); setPromotionOnlyTargetOption(null); setIsCreatingTargetSellingOption(true); }} className="text-sm font-semibold text-violet-700 transition hover:text-violet-950">{t("promotions.createAnotherOption")}</button><button type="button" onClick={() => { setPromotionOnlyTargetOption(null); setTargetOptionId(targetProduct.sellingOptions[0]?.id ?? ""); }} className="text-sm font-semibold text-violet-700 transition hover:text-violet-950">{t("promotions.useExistingOption")}</button></div>
                          </div>
                        ) : (
                          <>
                            <label htmlFor="target-selling-option" className="mb-2 block text-sm font-medium text-violet-900">
                              {t("promotions.sellingOption")}
                            </label>
                            <Select
                              id="target-selling-option"
                              value={targetOptionId}
                              onValueChange={(value) => {
                                if (Array.isArray(value)) return;
                                setGiftChoiceOption(targetProduct.id, value);
                              }}
                            >
                              {targetProduct.sellingOptions.map((option) => (
                                <option key={option.id} value={option.id}>
                                  {option.label} · {formatCurrency(option.price)}
                                </option>
                              ))}
                            </Select>
                            <button type="button" onClick={() => { setNewTargetOption({ id: "promotion-only-y-option", productId: targetProduct.id, quantity: "", unitType: "Piece (հատ)", piecesPerPackage: "", customUnit: "", price: "", compareAtPrice: "", minimumOrderQuantity: "1" }); setPromotionOnlyTargetOption(null); setIsCreatingTargetSellingOption(true); setTargetOptionId(""); setNewTargetOptionError(""); }} className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-violet-700 transition hover:text-violet-950"><Plus className="h-4 w-4" aria-hidden="true" />{t("promotions.createPromotionOnlyOptionBtn")}</button>
                          </>
                        )}
                      </div>
                    ) : null}
                  </div>
                </div>
              </section>
            ) : (
              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
                <SectionHeading
                  icon={<PackagePlus className="h-5 w-5" aria-hidden="true" />}
                  title={t("promotions.discountValue")}
                  description={t("promotions.discountValueDesc")}
                />
                <div className="space-y-5">
                  <div className={`grid gap-3 ${discountType === "percentage" ? "sm:grid-cols-[minmax(0,1fr)_9rem]" : ""}`}>
                    <div>
                      <label htmlFor="discount-type" className="mb-2 block text-sm font-medium text-slate-900">
                        {t("promotions.promotionType")}
                      </label>
                      <Select
                        id="discount-type"
                        value={discountType}
                        onValueChange={handleDiscountTypeChange}
                      >
                        <option value="fixed-price">{t("promotions.fixedPrice")}</option>
                        <option value="percentage">{t("promotions.percentageDiscount")}</option>
                      </Select>
                    </div>
                    {discountType === "percentage" ? (
                      <Input
                        id="discount-value"
                        label={t("promotions.percent")}
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={discountValue}
                        onChange={(event) => setDiscountValue(event.target.value)}
                        placeholder="0"
                        required
                      />
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => openProductSelector("discount")}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
                  >
                    <PackagePlus className="h-4 w-4" aria-hidden="true" />
                    {discountProductIds.length > 0
                      ? t("promotions.productsSelected", { count: discountProductIds.length })
                      : t("promotions.chooseProducts")}
                  </button>
                  {selectedDiscountProducts.length > 0 ? (
                    <>
                      {discountType === "percentage" ? (
                        <div>
                          <label htmlFor="discount-scope" className="mb-2 block text-sm font-medium text-slate-900">
                            {t("promotions.sellingOptionsToDiscount")}
                          </label>
                          <Select
                            id="discount-scope"
                            value={discountScope}
                            onValueChange={(value) => !Array.isArray(value) && setDiscountScope(value as DiscountScope)}
                          >
                            <option value="all-options">{t("promotions.allCurrentSellingOptions")}</option>
                            <option value="specific-options">{t("promotions.specificSellingOptions")}</option>
                          </Select>
                          <p className="mt-2 text-xs leading-5 text-slate-500">
                            {discountScope === "all-options"
                              ? t("promotions.allOptionsHint")
                              : t("promotions.specificOptionsHint")}
                          </p>
                        </div>
                      ) : (
                        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-5 text-amber-900">
                          {t("promotions.fixedPriceNotice")}
                        </div>
                      )}

                      <div className="overflow-hidden rounded-2xl border border-slate-200">
                        <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                          <Boxes className="h-4 w-4 text-primary" aria-hidden="true" />
                          {t("promotions.sellingOptions")}
                        </div>
                        <div className="divide-y divide-slate-100">
                          {selectedDiscountProducts.flatMap((product) =>
                            product.sellingOptions.map((option) => {
                              const key = optionKey(product.id, option.id);
                              const isSelected = discountScope === "all-options" || discountOptionKeys.includes(key);

                              return (
                                <div key={key} className={`grid gap-3 px-4 py-3.5 sm:grid-cols-[minmax(0,1fr)_10rem] sm:items-center ${isSelected ? "bg-white" : "bg-slate-50/70"}`}>
                                  <label className="flex cursor-pointer items-start gap-3">
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      disabled={discountScope === "all-options"}
                                      onChange={() => toggleDiscountOption(product.id, option.id)}
                                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/15 disabled:cursor-not-allowed"
                                      aria-label={`${t("promotions.applyToProductOption")} ${product.name}, ${option.label}`}
                                    />
                                    <span className="min-w-0">
                                      <span className="block text-sm font-semibold text-slate-900">{product.name}</span>
                                      <span className="mt-0.5 block text-xs text-slate-500">{option.label} · {formatCurrency(option.price)} · {t("promotions.minQuantityShort")} {option.minimumOrderQuantity}</span>
                                    </span>
                                  </label>
                                  {discountType === "fixed-price" && isSelected ? (
                                    <Input
                                      id={`fixed-price-${key}`}
                                      label={t("promotions.promotionalPrice")}
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      value={fixedPrices[key] ?? ""}
                                      onChange={(event) => setFixedPrices((currentPrices) => ({ ...currentPrices, [key]: event.target.value }))}
                                      placeholder={String(option.price)}
                                      required
                                    />
                                  ) : null}
                                </div>
                              );
                            }),
                          )}
                        </div>
                      </div>
                      <div className="border-y border-slate-100">
                        <SwitchField
                          title={t("promotions.applyIndividualPricing")}
                          description={
                            applyOnIndividualPricing
                              ? t("promotions.applyIndividualPricingDescTrue")
                              : t("promotions.applyIndividualPricingDescFalse")
                          }
                          checked={applyOnIndividualPricing}
                          onSave={setApplyOnIndividualPricing}
                        />
                      </div>
                    </>
                  ) : null}
                </div>
              </section>
            )}

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
              <SectionHeading
                icon={<UsersRound className="h-5 w-5" aria-hidden="true" />}
                title={t("promotions.eligibility")}
                description={t("promotions.eligibilityDesc")}
              />
              <div className="space-y-5">
                <div>
                  <label htmlFor="promotion-eligibility" className="mb-2 block text-sm font-medium text-slate-900">
                    {t("promotions.eligibleCustomers")}
                  </label>
                  <Select
                    id="promotion-eligibility"
                    value={eligibility}
                    onValueChange={handleEligibilityChange}
                  >
                    <option value="all-customers">{t("promotions.allCustomers")}</option>
                    <option value="specific-customers">{t("promotions.specificCustomers")}</option>
                  </Select>
                </div>
                {eligibility === "specific-customers" ? (
                  <button
                    type="button"
                    onClick={openCustomerSelector}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary transition hover:bg-primary/10"
                  >
                    <UsersRound className="h-4 w-4" aria-hidden="true" />
                    {eligibleCustomerIds.length > 0
                      ? t("promotions.customersSelected", { count: eligibleCustomerIds.length })
                      : t("common.selectCustomers")}
                  </button>
                ) : null}
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
              <SectionHeading
                icon={<Gift className="h-5 w-5" aria-hidden="true" />}
                title={t("promotions.promoteOffer")}
                description={t("promotions.promoteOfferDesc")}
              />
              <div className={`rounded-2xl border px-4 ${isBannerEnabled ? "border-primary/20 bg-primary/[0.035]" : "border-slate-200 bg-slate-50"}`}>
                <SwitchField
                  title={isBannerEnabled ? t("promotions.bannerOn") : t("promotions.bannerOff")}
                  description={isBannerEnabled ? t("promotions.bannerOnDesc") : t("promotions.bannerOffDesc")}
                  checked={isBannerEnabled}
                  onSave={setIsBannerEnabled}
                  size="lg"
                />
              </div>
              {isBannerEnabled ? (
                <div className="mt-6 space-y-6">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{t("promotions.whereShouldItAppear")}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      {t("promotions.whereShouldItAppearDesc")}
                    </p>
                    <div className="mt-3 grid gap-2 sm:grid-cols-3">
                      {bannerPlacementOptions.map(({ value, title, description, icon: Icon }) => {
                        const isSelected = display === value;
                        return (
                          <button key={value} type="button" onClick={() => setDisplay(value)} aria-pressed={isSelected} className={`relative min-h-32 rounded-2xl border p-3.5 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${isSelected ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-slate-200 bg-white hover:border-primary/40 hover:bg-slate-50"}`}>
                            <span className={`grid h-8 w-8 place-items-center rounded-lg ${isSelected ? "bg-primary text-primary-content" : "bg-slate-100 text-slate-500"}`}><Icon className="h-4 w-4" aria-hidden="true" /></span>
                            <span className="mt-3 block text-sm font-bold text-slate-900">{title}</span>
                            <span className="mt-1 block text-xs leading-4 text-slate-500">{description}</span>
                            {isSelected ? <Check className="absolute right-3 top-3 h-4 w-4 text-primary" aria-label="Selected" /> : null}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-5">
                    <p className="text-sm font-medium text-slate-900">{t("promotions.bannerVisual")} <span className="font-normal text-slate-500">({t("common.optional")})</span></p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">{t("promotions.bannerVisualDesc")}</p>
                    {visualUrl ? (
                      <div className="group relative mt-3 aspect-[16/7] overflow-hidden rounded-2xl bg-slate-100">
                        <img src={visualUrl} alt={t("promotions.bannerPreview")} className="h-full w-full object-cover" />
                        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 bg-gradient-to-t from-slate-950/80 to-transparent px-3 pb-3 pt-10">
                          <span className="text-xs font-semibold text-white">{bannerImage?.fileName ?? t("promotions.bannerPreview")}</span>
                          <button type="button" onClick={clearBannerVisual} className="inline-flex items-center gap-1 rounded-lg bg-white/90 px-2 py-1 text-xs font-bold text-slate-700 transition hover:bg-white"><X className="h-3.5 w-3.5" aria-hidden="true" />{t("common.remove")}</button>
                        </div>
                      </div>
                    ) : (
                      <label htmlFor="promotion-visual" className="mt-3 flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-7 text-center transition hover:border-primary/50 hover:bg-primary/5">
                        <span className="grid h-10 w-10 place-items-center rounded-xl bg-white text-primary shadow-sm"><ImagePlus className="h-5 w-5" aria-hidden="true" /></span>
                        <span className="mt-2 text-sm font-semibold text-slate-800">{t("promotions.uploadBannerImage")}</span>
                        <span className="mt-1 text-xs text-slate-500">{t("promotions.uploadBannerImageSpecs")}</span>
                      </label>
                    )}
                    <input ref={visualUploadInputRef} id="promotion-visual" type="file" accept=".jpg,.jpeg,.png,image/jpeg,image/png" onChange={handleVisualUpload} className="sr-only" />
                    {visualUrl ? <label htmlFor="promotion-visual" className="mt-3 inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-primary hover:text-primary/75"><ImagePlus className="h-4 w-4" aria-hidden="true" />{t("promotions.replaceImage")}</label> : null}
                    {visualError ? <p className="mt-2 text-xs font-medium text-rose-600">{visualError}</p> : null}
                  </div>

                  <div className="border-t border-slate-100 pt-5">
                    <label htmlFor="brand-colour-fallback" className="text-sm font-medium text-slate-900">{t("promotions.brandColorFallback")}</label>
                    <p className="mt-1 text-xs leading-5 text-slate-500">{t("promotions.brandColorFallbackDesc")}</p>
                    <div className="mt-3 flex items-center gap-3">
                      <input id="brand-colour-fallback" type="color" value={brandColorFallback} onChange={(event) => setBrandColorFallback(event.target.value)} className="h-11 w-12 cursor-pointer rounded-lg border border-slate-200 bg-white p-1" aria-label={t("promotions.brandColorFallback")} />
                      <span className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold uppercase text-slate-700">{brandColorFallback}</span>
                      {!visualUrl ? <span className="h-11 flex-1 rounded-lg" style={{ backgroundColor: brandColorFallback }} aria-label={t("promotions.brandColorFallback")} /> : null}
                    </div>
                  </div>
                </div>
              ) : null}
            </section>
          </div>

          <aside className="space-y-6 lg:sticky lg:top-6 lg:self-start">
            <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="border-l-4 border-primary bg-primary/5 px-6 py-5 sm:px-7">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                      {t("promotions.briefEyebrow")}
                    </p>
                    <h2 className="mt-1 text-lg font-semibold text-slate-900">
                      {t("promotions.summaryTitle")}
                    </h2>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold shadow-sm ring-1 ${isActive ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-slate-100 text-slate-600 ring-slate-200"}`}>
                    <Check className={`h-3.5 w-3.5 ${isActive ? "text-emerald-600" : "text-slate-500"}`} aria-hidden="true" />
                    {isActive ? t("promotions.statusLive") : t("promotions.statusDraft")}
                  </span>
                </div>
              </div>

              <div className="border-b border-slate-200 bg-white px-6 py-4 sm:px-7">
                <button
                  type="button"
                  onClick={() => setIsPreviewOpen(true)}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus-visible:ring-4 focus-visible:ring-slate-900/15"
                >
                  <Eye className="h-4 w-4" aria-hidden="true" />
                  {t("promotions.previewBanner")}
                </button>
              </div>

              <dl className="divide-y divide-slate-100 px-6 sm:px-7">
                <div className="py-4">
                  <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    {t("promotions.promotionStatus")}
                  </dt>
                  <dd className="mt-1.5 text-sm font-semibold text-slate-900">{isActive ? t("promotions.statusLive") : t("promotions.statusDraft")}</dd>
                </div>
                <div className="py-4">
                  <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    {t("promotions.promotionType")}
                  </dt>
                  <dd className="mt-1.5 text-sm font-semibold text-slate-900">
                    {promotionTypeLabel}
                  </dd>
                </div>

                <div className="py-4">
                  <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{t("promotions.bannerVisual")}</dt>
                  <dd className="mt-1.5 flex items-center gap-2 text-sm font-semibold text-slate-900">
                    {visualUrl ? <img src={visualUrl} alt="" className="h-7 w-12 rounded-md object-cover ring-1 ring-slate-200" /> : null}
                    {visualUrl ? t("promotions.customImageUploaded") : t("promotions.noImageUploaded")}
                  </dd>
                </div>

                <div className="py-4">
                  <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{t("promotions.brandColorFallback")}</dt>
                  <dd className="mt-1.5 flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <span className="h-5 w-5 rounded-full ring-1 ring-slate-200" style={{ backgroundColor: brandColorFallback }} aria-hidden="true" />
                    {brandColorFallback.toUpperCase()}
                  </dd>
                </div>

                <div className="py-4">
                  <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{t("promotions.customerDiscovery")}</dt>
                  <dd className="mt-1.5 text-sm font-semibold text-slate-900">
                    {isBannerEnabled ? (display === "both" ? t("promotions.discoveryBoth") : display === "home-banner" ? t("promotions.discoveryHome") : t("promotions.discoveryPromotions")) : t("promotions.discoveryDisabled")}
                  </dd>
                </div>

                <div className="py-4">
                  <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    {t("promotions.sellingOptions")}
                  </dt>
                  <dd className="mt-2">
                    {isBuyXGetY ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-3 text-sm">
                          <span className="text-slate-500">{t("promotions.buyX")}</span>
                          <span className="truncate text-right font-semibold text-slate-900">
                            {triggerProduct?.name ?? t("promotions.notSelected")}
                            {triggerOption ? ` · ${triggerOption.label}` : ""}
                            {triggerQuantity ? ` · ${triggerQuantity}` : ""}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-3 text-sm">
                          <span className="text-slate-500">{t("promotions.getY")}</span>
                          <span className="truncate text-right font-semibold text-slate-900">
                            {targetProduct?.name ?? t("promotions.notSelected")}
                            {targetOption ? ` · ${targetOption.label}` : ""}
                            {targetQuantity ? ` · ${targetQuantity}` : ""}
                          </span>
                        </div>
                      </div>
                    ) : selectedDiscountOptions.length > 0 ? (
                      <ul className="space-y-1.5">
                        {selectedDiscountOptions.map(({ product, option }) => (
                          <li key={optionKey(product.id, option.id)} className="flex items-center gap-2 text-sm text-slate-700">
                            <Check className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
                            <span className="truncate">{product.name} · {option.label}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-slate-500">{t("promotions.noSellingOptionsSelected")}</p>
                    )}
                  </dd>
                </div>

                <div className="py-4">
                  <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    {t("promotions.eligibleCustomers")}
                  </dt>
                  <dd className="mt-2">
                    {eligibility === "all-customers" ? (
                      <p className="text-sm font-semibold text-slate-900">{t("promotions.allCustomers")}</p>
                    ) : eligibleCustomers.length > 0 ? (
                      <ul className="max-h-32 space-y-1.5 overflow-y-auto pr-1">
                        {eligibleCustomers.map((customer) => (
                          <li key={customer.id} className="flex items-center gap-2 text-sm text-slate-700">
                            <Check className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
                            <span className="truncate">{customer.companyName}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-amber-700">{t("promotions.noCustomersSelected")}</p>
                    )}
                  </dd>
                </div>
                <div className="py-4">
                  <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    {t("promotions.companySpecificPrices")}
                  </dt>
                  <dd className="mt-1.5 text-sm font-semibold text-slate-900">
                    {isBuyXGetY || !applyOnIndividualPricing ? t("promotions.keptSeparate") : t("promotions.promotionAlsoApplies")}
                  </dd>
                </div>
              </dl>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
              <SectionHeading
                icon={<Power className="h-5 w-5" aria-hidden="true" />}
                title={t("common.status")}
                description={t("promotions.statusSectionDesc")}
              />
              <div className="border-y border-slate-100">
                <SwitchField
                  title={isActive ? t("promotions.statusActive") : t("promotions.statusDeactivated")}
                  description={
                    isActive
                      ? t("promotions.statusActiveDesc")
                      : t("promotions.statusDeactivatedDesc")
                  }
                  checked={isActive}
                  onSave={handleStatusChange}
                  isSubmitting={isSavingStatus}
                />
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
              <SectionHeading
                icon={<CalendarDays className="h-5 w-5" aria-hidden="true" />}
                title={t("promotions.activeDates")}
                description={t("promotions.activeDatesDesc")}
              />
              <div className="space-y-5">
                <Input
                  id="promotion-start-date"
                  label={t("promotions.startDate")}
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                  required
                />
                <div className="border-y border-slate-100">
                  <SwitchField
                    title={t("promotions.setEndDate")}
                    description={t("promotions.setEndDateDesc")}
                    checked={hasEndDate}
                    onSave={setHasEndDate}
                  />
                </div>
                {hasEndDate ? (
                  <Input
                    id="promotion-end-date"
                    label={t("promotions.endDate")}
                    type="date"
                    min={startDate}
                    value={endDate}
                    onChange={(event) => setEndDate(event.target.value)}
                    required
                  />
                ) : null}
              </div>
            </section>
          </aside>
        </div>

        {isEditing && promotionId ? (
          <p className="text-center text-xs text-slate-400">{t("promotions.promotionIdLabel")} {promotionId}</p>
        ) : null}
      </form>

      <Modal
        isOpen={isPreviewOpen}
        title={t("promotions.previewModalTitle")}
        description={t("promotions.previewModalDesc")}
        onClose={() => setIsPreviewOpen(false)}
        size="lg"
      >
        <div className="mx-auto max-w-sm">
          {!isBannerEnabled ? (
            <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-5 text-amber-900">
              {t("promotions.previewBannersOffNotice")}
            </p>
          ) : null}
          <PromotionBanner promotion={previewPromotion} />
          <p className="mt-4 text-center text-xs leading-5 text-slate-500">
            {t("promotions.previewFooterText")}
          </p>
        </div>
      </Modal>

      <Modal
        isOpen={productSelectionTarget !== null}
        title={isSingleProductSelection ? t("promotions.selectProductModalTitle") : t("promotions.selectProductsModalTitle")}
        description={
          isSingleProductSelection
            ? t("promotions.selectProductModalDescSingle")
            : t("promotions.selectProductsModalDescMultiple")
        }
        onClose={() => setProductSelectionTarget(null)}
        size="md"
      >
        <div className="space-y-5">
          <div>
            <div className="mb-3 flex items-center justify-between gap-3">
              <label
                htmlFor="promotion-product-search"
                className="text-sm font-medium text-slate-900"
              >
                {t("products.title")}
              </label>
              <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                {t("promotions.countSelected", { count: selectedProductIds.length })}
              </span>
            </div>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                id="promotion-product-search"
                type="search"
                value={productSearch}
                onChange={(event) => setProductSearch(event.target.value)}
                placeholder={t("products.searchPlaceholder")}
                className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 transition hover:border-slate-300 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15"
              />
            </div>
          </div>

          {filteredProducts.length > 0 ? (
            <ul className="max-h-80 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200 bg-white">
              {filteredProducts.map((product) => {
                const isSelected = selectedProductIds.includes(product.id);

                return (
                  <li key={product.id}>
                    <label
                      className={`flex cursor-pointer items-center gap-3 px-4 py-3.5 transition ${
                        isSelected ? "bg-primary/5" : "hover:bg-slate-50"
                      }`}
                    >
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt=""
                          className="h-11 w-11 shrink-0 rounded-xl object-cover ring-1 ring-slate-200"
                        />
                      ) : (
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-400 ring-1 ring-slate-200">
                          <Boxes className="h-5 w-5" />
                        </div>
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-slate-900">
                          {product.name}
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-slate-500">
                          {product.category}
                        </span>
                      </span>
                      <span className="hidden text-sm font-medium text-slate-500 sm:block">
                        {formatCurrency(product.price)}
                      </span>
                      <input
                        type={isSingleProductSelection ? "radio" : "checkbox"}
                        name={isSingleProductSelection ? "promotion-product" : undefined}
                        checked={isSelected}
                        onChange={() => toggleProduct(product.id)}
                        className="h-5 w-5 shrink-0 border-slate-300 text-primary focus:ring-4 focus:ring-primary/15"
                        aria-label={`${t("common.select")} ${product.name}`}
                      />
                    </label>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
              {t("products.noProductsFound")}
            </p>
          )}

          <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setProductSelectionTarget(null)}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              {t("common.cancel")}
            </button>
            <button
              type="button"
              onClick={applyProductSelection}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-content transition hover:brightness-95"
            >
              <Check className="h-4 w-4" aria-hidden="true" />
              {t("promotions.applySelection")}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isCustomerSelectorOpen}
        title={t("common.selectCustomers")}
        description={t("promotions.selectCustomersModalDesc")}
        onClose={() => setIsCustomerSelectorOpen(false)}
        size="md"
      >
        <div className="space-y-5">
          <div>
            <div className="mb-3 flex items-center justify-between gap-3">
              <label
                htmlFor="promotion-customer-search"
                className="text-sm font-medium text-slate-900"
              >
                {t("customers.title")}
              </label>
              <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                {t("promotions.countSelected", { count: selectedCustomerIds.length })}
              </span>
            </div>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                id="promotion-customer-search"
                type="search"
                value={customerSearch}
                onChange={(event) => setCustomerSearch(event.target.value)}
                placeholder={t("customers.searchPlaceholder")}
                className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 transition hover:border-slate-300 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15"
              />
            </div>
          </div>

          {filteredCustomers.length > 0 ? (
            <ul className="max-h-80 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200 bg-white">
              {filteredCustomers.map((customer) => {
                const isSelected = selectedCustomerIds.includes(customer.id);

                return (
                  <li key={customer.id}>
                    <label
                      className={`flex cursor-pointer items-center gap-3 px-4 py-3.5 transition ${
                        isSelected ? "bg-primary/5" : "hover:bg-slate-50"
                      }`}
                    >
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-xs font-semibold text-primary ring-1 ring-primary/20">
                        {customer.companyName.trim().slice(0, 2).toUpperCase() || "CU"}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-slate-900">
                          {customer.companyName}
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-slate-500">
                          {customer.contactName} · {customer.activityType}
                        </span>
                      </span>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleCustomer(customer.id)}
                        className="h-5 w-5 shrink-0 rounded border-slate-300 text-primary focus:ring-4 focus:ring-primary/15"
                        aria-label={`${t("common.select")} ${customer.companyName}`}
                      />
                    </label>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
              {t("promotions.noCustomersMatchSearch")}
            </p>
          )}

          <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setIsCustomerSelectorOpen(false)}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              {t("common.cancel")}
            </button>
            <button
              type="button"
              onClick={applyCustomerSelection}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-content transition hover:brightness-95"
            >
              <Check className="h-4 w-4" aria-hidden="true" />
              {t("promotions.applySelection")}
            </button>
          </div>
        </div>
      </Modal>
    </DashboardPageContent>
  );
}
