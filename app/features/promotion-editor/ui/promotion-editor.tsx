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
import { mockCustomers } from "~/entities/horeca";
import {
  getPromotionTone,
  PromotionBanner,
  type MarketplacePromotion,
  type PromotionDisplay,
} from "~/entities/promotion";
import { DashboardHeaderActions, DashboardPageContent } from "~/shared/ui";
import { useToast } from "~/shared/ui/toast";
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

const bannerPlacementOptions: Array<{
  value: PromotionDisplay;
  title: string;
  description: string;
  icon: typeof House;
}> = [
  { value: "both", title: "Home + Promotions", description: "Reach buyers browsing the dashboard or comparing offers.", icon: PanelsTopLeft },
  { value: "home-banner", title: "Home Only", description: "Feature the offer on the HORECA dashboard.", icon: House },
  { value: "promotion-list", title: "Promotions Only", description: "Keep it available to buyers actively looking for offers.", icon: List },
];

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

const supplierProducts: SupplierProduct[] = [
  {
    id: "PROD-1001",
    name: "Organic Citrus Mix",
    category: "Fresh Produce",
    price: 18_500,
    sellingOptions: [
      { id: "option-1", label: "5 kg box", price: 18_500, minimumOrderQuantity: 1 },
      { id: "option-2", label: "15 kg case", price: 51_000, minimumOrderQuantity: 1 },
    ],
    imageUrl:
      "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&w=160&q=80",
  },
  {
    id: "PROD-1002",
    name: "Premium Extra Virgin Olive Oil",
    category: "Pantry",
    price: 24_000,
    sellingOptions: [
      { id: "option-1", label: "1 L bottle", price: 24_000, minimumOrderQuantity: 3 },
      { id: "option-2", label: "6 × 1 L case", price: 136_800, minimumOrderQuantity: 1 },
    ],
    imageUrl:
      "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=160&q=80",
  },
  {
    id: "PROD-1003",
    name: "Artisan Basil Bundle",
    category: "Herbs",
    price: 9_750,
    sellingOptions: [
      { id: "option-1", label: "1 bunch", price: 9_750, minimumOrderQuantity: 3 },
      { id: "option-2", label: "12 bunch crate", price: 105_000, minimumOrderQuantity: 1 },
    ],
    imageUrl:
      "https://images.unsplash.com/photo-1461354464878-ad92f492a5a0?auto=format&fit=crop&w=160&q=80",
  },
  {
    id: "PROD-1004",
    name: "Farmhouse Cheese Selection",
    category: "Dairy",
    price: 31_250,
    sellingOptions: [
      { id: "option-1", label: "3 kg wheel", price: 31_250, minimumOrderQuantity: 1 },
      { id: "option-2", label: "12 kg case", price: 118_000, minimumOrderQuantity: 1 },
    ],
    imageUrl:
      "https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?auto=format&fit=crop&w=160&q=80",
  },
  {
    id: "PROD-1005",
    name: "Sunrise Berry Box",
    category: "Fruit",
    price: 16_000,
    sellingOptions: [
      { id: "option-1", label: "4 kg tray", price: 16_000, minimumOrderQuantity: 2 },
      { id: "option-2", label: "12 kg case", price: 45_600, minimumOrderQuantity: 1 },
    ],
    imageUrl:
      "https://images.unsplash.com/photo-1464965911861-746a04b4bca6?auto=format&fit=crop&w=160&q=80",
  },
];

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
  const [accountId, setAccountId] = useState("");
  const [isLoadingPromotion, setIsLoadingPromotion] = useState(isEditing);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingStatus, setIsSavingStatus] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [supplierName, setSupplierName] = useState("Your company");
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
  const [discountProductIds, setDiscountProductIds] = useState<string[]>(
    isEditing && !isBuyXGetY ? ["PROD-1001", "PROD-1002"] : [],
  );
  const [discountOptionKeys, setDiscountOptionKeys] = useState<string[]>(
    isEditing && !isBuyXGetY
      ? [optionKey("PROD-1001", "option-1"), optionKey("PROD-1002", "option-1")]
      : [],
  );
  const [fixedPrices, setFixedPrices] = useState<Record<string, string>>({});
  const [triggerProductId, setTriggerProductId] = useState(
    isBuyXGetY ? "PROD-1001" : "",
  );
  const [triggerOptionId, setTriggerOptionId] = useState(
    isBuyXGetY ? "option-2" : "",
  );
  const [targetProductId, setTargetProductId] = useState(
    isBuyXGetY ? "PROD-1004" : "",
  );
  const [targetOptionId, setTargetOptionId] = useState(
    isBuyXGetY ? "option-1" : "",
  );
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
  const [visualUrl, setVisualUrl] = useState(
    isEditing
      ? "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&w=1200&q=85"
      : "",
  );
  const [visualError, setVisualError] = useState("");
  const [bannerImage, setBannerImage] = useState<StoredSupplierPromotion["bannerImage"]>();
  const [brandColorFallback, setBrandColorFallback] = useState("#0284c7");
  const [isCustomerSelectorOpen, setIsCustomerSelectorOpen] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);
  const [eligibleCustomerIds, setEligibleCustomerIds] = useState<string[]>([]);
  const [catalogProducts, setCatalogProducts] = useState<SupplierProduct[]>(supplierProducts);

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
  const eligibleCustomers = mockCustomers.filter((customer) =>
    eligibleCustomerIds.includes(customer.id),
  );
  const promotionTypeLabel = isBuyXGetY
    ? "Buy X, get Y"
    : discountType === "fixed-price"
      ? "Fixed price"
      : "Percentage discount";
  const previewPromotionType: MarketplacePromotion["type"] = isBuyXGetY
    ? "BuyXGetY"
    : discountType === "fixed-price"
      ? "FixedPrice"
      : "Percentage";
  const previewFixedPrice = selectedDiscountOptions.length > 0
    ? Number(fixedPrices[optionKey(selectedDiscountOptions[0].product.id, selectedDiscountOptions[0].option.id)])
    : Number.NaN;
  const previewBenefitLabel = isBuyXGetY
    ? `Buy ${triggerQuantity || "X"}, choose ${targetQuantity || "Y"} free`
    : discountType === "fixed-price"
      ? Number.isFinite(previewFixedPrice)
        ? `${new Intl.NumberFormat("en-US").format(previewFixedPrice)} դրամ fixed price`
        : "Set a fixed price"
      : discountValue
        ? `${discountValue}% off`
        : "Set a discount";
  // This object is derived at render time from the live form state. It has no
  // saved ID and is never passed to the IndexedDB-backed mock.
  const previewPromotion: MarketplacePromotion = {
    id: "promotion-preview",
    supplierName,
    title: name.trim() || "Untitled promotion",
    description: description.trim(),
    type: previewPromotionType,
    startDate: startDate || todayDateInputValue(),
    endDate: hasEndDate && endDate ? endDate : "2099-12-31",
    productIds: isBuyXGetY
      ? [triggerProductId, ...giftChoices.map((choice) => choice.productId)].filter(Boolean)
      : discountProductIds,
    benefitLabel: previewBenefitLabel,
    conditions: "Preview only — changes have not been saved.",
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
  const filteredCustomers = mockCustomers.filter((customer) =>
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
      const storedProducts = await getSupplierProducts(user.id);
      if (!isCurrent) return;
      setCatalogProducts(storedProducts.map((product) => ({
        id: product.id,
        name: product.name,
        category: "Supplier catalog",
        price: product.sellingOptions[0]?.price ?? 0,
        imageUrl: product.imageUrl ?? "/favicon.ico",
        sellingOptions: product.sellingOptions.map((option) => ({
          id: option.id,
          label: `${option.quantity} ${option.customUnit?.trim() || option.unitType}${option.unitType === "Package" && option.piecesPerPackage ? ` (${option.piecesPerPackage} pcs)` : ""}`,
          price: option.price,
          minimumOrderQuantity: option.minimumOrderQuantity,
        })),
      })));
      if (!isEditing || !promotionId) {
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
        title: "Promotion details unavailable",
        description: "The saved promotion could not be loaded. You can still update its configuration.",
        variant: "error",
      });
    });

    return () => {
      isCurrent = false;
    };
  }, [isEditing, promotionId, showToast]);

  async function handleStatusChange(nextIsActive: boolean) {
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
        updatedAt: new Date().toISOString(),
      });
      showToast({
        title: nextIsActive ? "Promotion activated" : "Promotion deactivated",
        description: nextIsActive
          ? "Customers can use it during its validity period."
          : "Customers can no longer use this promotion.",
        variant: "success",
      });
    } catch {
      setIsActive(!nextIsActive);
      showToast({
        title: "Status wasn't saved",
        description: "Try changing the promotion status again.",
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
        "Complete every selling-option field. Package units need a positive whole number of pieces, and a compare-at price must be higher than the price.",
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
      showToast({ title: "Selling option created", description: `Added to ${targetProduct.name} and selected for this gift.`, variant: "success" });
    } catch {
      setNewTargetOptionError("This selling option could not be created. Try again.");
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
    // Clearing the native input lets the supplier choose the same file again
    // after removing it or after a failed read.
    input.value = "";
    if (!file) return;
    const fileName = file.name.toLowerCase();
    const isJpeg = file.type === "image/jpeg" || file.type === "image/jpg" || /\.jpe?g$/.test(fileName);
    const isPng = file.type === "image/png" || /\.png$/.test(fileName);
    if (!isJpeg && !isPng) {
      setVisualError("Choose a JPG or PNG image.");
      return;
    }
    const mimeType = isPng ? "image/png" : "image/jpeg";
    if (file.size > 5 * 1024 * 1024) {
      setVisualError("Use an image smaller than 5 MB.");
      return;
    }
    setVisualError("");
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === "string" ? reader.result : "";
      if (!dataUrl) {
        setVisualError("This image could not be read. Choose another JPG or PNG file.");
        return;
      }
      setVisualUrl(dataUrl);
      setBannerImage({
        dataUrl,
        fileName: file.name,
        mimeType,
      });
    };
    reader.onerror = () => {
      setVisualError("This image could not be read. Choose another JPG or PNG file.");
    };
    reader.readAsDataURL(file);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isCreatingTargetSellingOption) {
      showToast({ title: "Finish the new selling option", description: "Create the option or switch back to an existing option before saving the promotion.", variant: "error" });
      return;
    }

    if (!name.trim()) {
      showToast({ title: "Promotion name is required", description: "Enter a name before saving.", variant: "error" });
      return;
    }

    if (isBuyXGetY && (!triggerOption || giftChoices.length === 0 || giftChoices.some((choice) => !choice.optionId))) {
      window.alert("Select a selling option for Buy X and for every eligible Get Y product.");
      return;
    }

    if (!isBuyXGetY && selectedDiscountOptions.length === 0) {
      window.alert("Select at least one selling option for this promotion.");
      return;
    }

    if (
      discountType === "fixed-price" &&
      selectedDiscountOptions.some(({ product, option }) => {
        const price = Number(fixedPrices[optionKey(product.id, option.id)]);
        return !Number.isFinite(price) || price < 0 || price >= option.price;
      })
    ) {
      window.alert("Each promotional price must be lower than its selling option's current price.");
      return;
    }

    if (!accountId) {
      showToast({ title: "Promotion could not be saved", description: "Your supplier account is still loading.", variant: "error" });
      return;
    }

    const now = new Date().toISOString();
    const promotion: StoredSupplierPromotion = {
      id: isEditing && promotionId ? promotionId : createSupplierPromotionId(),
      accountId,
      name: name.trim() || "Untitled promotion",
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
        title: isEditing ? "Promotion updated" : "Promotion created",
        description: isBannerEnabled
          ? "Your discovery settings and banner visual have been saved."
          : "The promotion was saved without discovery banners.",
        variant: "success",
      });
      navigate("/supplier/promotions");
    } catch (error) {
      const isStorageLimit = error instanceof DOMException && error.name === "QuotaExceededError";
      showToast({
        title: "Promotion wasn't saved",
        description: isStorageLimit
          ? "There isn't enough local storage for this banner image. Use a smaller image and try again."
          : error instanceof Error ? error.message : "Please try saving the promotion again.",
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
            Back to promotions
          </Link>
        }
        actions={
          <>
            <Link
              to="/supplier/promotions"
              className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </Link>
            <button
              type="submit"
              form="promotion-editor"
              disabled={isSaving || isLoadingPromotion}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-content transition hover:brightness-95"
            >
              <Save className="h-4 w-4" aria-hidden="true" />
              {isSaving ? "Saving…" : isEditing ? "Save changes" : "Create promotion"}
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
                title="Main information"
                description="Give this promotion a clear name and a short explanation for your team."
              />
              <div className="space-y-5">
                <Input
                  id="promotion-name"
                  label="Promotion name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="e.g. Spring pantry savings"
                  required
                />
                <div>
                  <label htmlFor="promotion-description" className="mb-2 block text-sm font-medium text-slate-900">
                    Promotion description
                  </label>
                  <textarea
                    id="promotion-description"
                    rows={5}
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder="Describe the offer and when your customers should use it."
                    className="block w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 transition hover:border-slate-300 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
                  />
                </div>
              </div>
            </section>

            {isBuyXGetY ? (
              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
                <SectionHeading
                  icon={<Gift className="h-5 w-5" aria-hidden="true" />}
                  title="Buy X, get Y rule"
                  description="Set the exact selling options customers buy and receive. Quantities are measured in those selling units."
                />
                <div className="space-y-6">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Buy X
                    </p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_9rem]">
                      <button
                        type="button"
                        onClick={() => openProductSelector("trigger")}
                        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
                      >
                        <PackagePlus className="h-4 w-4" aria-hidden="true" />
                        {triggerProduct ? triggerProduct.name : "Select trigger product"}
                      </button>
                      <Input
                        id="trigger-quantity"
                        label="Quantity (X)"
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
                          Selling option
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
                      Get Y
                    </p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_9rem]">
                      <button
                        type="button"
                        onClick={() => openProductSelector("target")}
                        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-violet-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-violet-300 hover:bg-violet-100/50 hover:text-violet-800"
                      >
                        <Gift className="h-4 w-4" aria-hidden="true" />
                        {giftChoices.length ? `${giftChoices.length} eligible gift ${giftChoices.length === 1 ? "product" : "products"}` : "Select eligible gift products"}
                      </button>
                      <Input
                        id="target-quantity"
                        label="Quantity (Y)"
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
                        <p className="text-xs font-semibold text-violet-800">HoReCa buyers choose one of these gifts.</p>
                        {giftChoices.map((choice) => {
                          const giftProduct = catalogProducts.find((product) => product.id === choice.productId);
                          if (!giftProduct) return null;
                          return <div key={choice.productId} className="flex flex-wrap items-center gap-3 rounded-xl border border-violet-200 bg-white p-3"><img src={giftProduct.imageUrl} alt="" className="h-9 w-9 rounded-lg object-cover" /><span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-900">{giftProduct.name}</span><Select value={choice.optionId} onValueChange={(value) => !Array.isArray(value) && setGiftChoiceOption(choice.productId, value)} className="w-40 shrink-0">{giftProduct.sellingOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</Select><button type="button" onClick={() => { setTargetProductId(choice.productId); setTargetOptionId(choice.optionId); setNewTargetOption({ id: "promotion-new-option", productId: choice.productId, quantity: "", unitType: "Piece (հատ)", piecesPerPackage: "", customUnit: "", price: "", compareAtPrice: "", minimumOrderQuantity: "1" }); setPromotionOnlyTargetOption(null); setIsCreatingTargetSellingOption(true); setNewTargetOptionError(""); }} className="text-xs font-semibold text-violet-700 transition hover:text-violet-950">New option</button><button type="button" onClick={() => { const nextChoices = giftChoices.filter((item) => item.productId !== choice.productId); setGiftChoices(nextChoices); setTargetProductId(nextChoices[0]?.productId ?? ""); setTargetOptionId(nextChoices[0]?.optionId ?? ""); }} className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-700" aria-label={`Remove ${giftProduct.name} from eligible gifts`}><X className="h-4 w-4" aria-hidden="true" /></button></div>;
                        })}
                      </div>
                    ) : null}
                    {targetProduct && showLegacyTargetOptionEditor ? (
                      <div className="mt-3">
                        {isCreatingTargetSellingOption ? (
                          <div className="rounded-xl border border-violet-200 bg-white p-4">
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <p className="text-sm font-semibold text-violet-950">Create Y selling option</p>
                                <p className="mt-1 text-xs leading-5 text-violet-700">This option applies only to this promotion. Create it again for another promotion.</p>
                              </div>
                              <button type="button" onClick={() => { setIsCreatingTargetSellingOption(false); setNewTargetOptionError(""); setPromotionOnlyTargetOption(null); setTargetOptionId(targetProduct.sellingOptions[0]?.id ?? ""); }} className="shrink-0 text-xs font-semibold text-violet-700 transition hover:text-violet-950">Use existing</button>
                            </div>
                            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                              <Input id="promotion-y-option-quantity" label="Quantity" type="number" min="1" step="1" value={newTargetOption.quantity} onChange={(event) => setNewTargetOption((currentOption) => ({ ...currentOption, quantity: event.target.value }))} placeholder="1" required />
                              <div>
                                <label className="mb-2 block text-sm font-medium text-slate-900" htmlFor="promotion-y-option-unit">Unit type</label>
                                <Select id="promotion-y-option-unit" value={newTargetOption.unitType} onValueChange={(value) => !Array.isArray(value) && setNewTargetOption((currentOption) => ({ ...currentOption, unitType: value as SellingOptionUnitType }))}>
                                  {sellingOptionUnitTypes.map((unitType) => <option key={unitType} value={unitType}>{unitType}</option>)}
                                </Select>
                              </div>
                              <Input id="promotion-y-option-price" label="Price (AMD)" type="number" min="0" step="1" value={newTargetOption.price} onChange={(event) => setNewTargetOption((currentOption) => ({ ...currentOption, price: event.target.value }))} placeholder="0" required />
                              <Input id="promotion-y-option-compare-at-price" label="Compare-at (AMD)" type="number" min="0" step="1" value={newTargetOption.compareAtPrice} onChange={(event) => setNewTargetOption((currentOption) => ({ ...currentOption, compareAtPrice: event.target.value }))} placeholder="Optional" />
                              <Input id="promotion-y-option-minimum-order" label="Minimum order" type="number" min="1" step="1" value={newTargetOption.minimumOrderQuantity} onChange={(event) => setNewTargetOption((currentOption) => ({ ...currentOption, minimumOrderQuantity: event.target.value }))} placeholder="1" required />
                            </div>
                            {newTargetOption.unitType === "Package" ? <Input id="promotion-y-option-pieces-per-package" label="Pieces per Package" type="number" min="1" step="1" inputMode="numeric" value={newTargetOption.piecesPerPackage} onChange={(event) => setNewTargetOption((currentOption) => ({ ...currentOption, piecesPerPackage: event.target.value }))} placeholder="e.g. 12" required error={Boolean(newTargetOption.piecesPerPackage) && !isPositiveWholeNumber(newTargetOption.piecesPerPackage)} errorMessage={Boolean(newTargetOption.piecesPerPackage) && !isPositiveWholeNumber(newTargetOption.piecesPerPackage) ? "Enter a positive whole number." : undefined} containerClassName="mt-3" /> : null}
                            {newTargetOption.unitType === "Custom selling unit" ? <Input id="promotion-y-option-custom-unit" label="Custom unit name" value={newTargetOption.customUnit} onChange={(event) => setNewTargetOption((currentOption) => ({ ...currentOption, customUnit: event.target.value }))} placeholder="e.g. 20 L keg or service tray" containerClassName="mt-3" required /> : null}
                            <p className="mt-3 text-xs text-slate-500">Promotion uses: <span className="font-semibold text-slate-700">{getPromotionOnlyOptionLabel(newTargetOption)}</span>{newTargetOption.price ? ` — ${formatCurrency(Number(newTargetOption.price))}` : ""}{newTargetOption.compareAtPrice ? <><span className="mx-1.5 text-slate-400">was</span><span className="text-slate-400 line-through">{formatCurrency(Number(newTargetOption.compareAtPrice))}</span></> : null}<span className="ml-2">Minimum order: {newTargetOption.minimumOrderQuantity || "—"} selling units</span></p>
                            {newTargetOptionError ? <p role="alert" className="mt-3 text-sm font-medium text-rose-700">{newTargetOptionError}</p> : null}
                            <button type="button" onClick={createTargetSellingOption} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-violet-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-violet-700"><Plus className="h-4 w-4" aria-hidden="true" />Create selling option</button>
                          </div>
                        ) : promotionOnlyTargetOption?.productId === targetProduct.id ? (
                          <div className="rounded-xl border border-violet-200 bg-white p-4">
                            <p className="text-sm font-semibold text-violet-950">Promotion-only Y option</p>
                            <p className="mt-1 text-sm text-slate-700">{getPromotionOnlyOptionLabel(promotionOnlyTargetOption)} · {formatCurrency(Number(promotionOnlyTargetOption.price))}</p>
                            <p className="mt-1 text-xs leading-5 text-violet-700">This option is valid only for this promotion and is not added to the product catalog.</p>
                            <div className="mt-3 flex flex-wrap gap-3"><button type="button" onClick={() => { setNewTargetOption(promotionOnlyTargetOption); setIsCreatingTargetSellingOption(true); }} className="text-sm font-semibold text-violet-700 transition hover:text-violet-950">Edit option</button><button type="button" onClick={() => { setNewTargetOption({ id: "promotion-only-y-option", productId: targetProduct.id, quantity: "", unitType: "Piece (հատ)", piecesPerPackage: "", customUnit: "", price: "", compareAtPrice: "", minimumOrderQuantity: "1" }); setPromotionOnlyTargetOption(null); setIsCreatingTargetSellingOption(true); }} className="text-sm font-semibold text-violet-700 transition hover:text-violet-950">Create another option</button><button type="button" onClick={() => { setPromotionOnlyTargetOption(null); setTargetOptionId(targetProduct.sellingOptions[0]?.id ?? ""); }} className="text-sm font-semibold text-violet-700 transition hover:text-violet-950">Use existing option</button></div>
                          </div>
                        ) : (
                          <>
                            <label htmlFor="target-selling-option" className="mb-2 block text-sm font-medium text-violet-900">
                              Selling option
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
                            <button type="button" onClick={() => { setNewTargetOption({ id: "promotion-only-y-option", productId: targetProduct.id, quantity: "", unitType: "Piece (հատ)", piecesPerPackage: "", customUnit: "", price: "", compareAtPrice: "", minimumOrderQuantity: "1" }); setPromotionOnlyTargetOption(null); setIsCreatingTargetSellingOption(true); setTargetOptionId(""); setNewTargetOptionError(""); }} className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-violet-700 transition hover:text-violet-950"><Plus className="h-4 w-4" aria-hidden="true" />Create a promotion-only selling option</button>
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
                  title="Discount value"
                  description="Choose how the promotion changes the product price."
                />
                <div className="space-y-5">
                  <div className={`grid gap-3 ${discountType === "percentage" ? "sm:grid-cols-[minmax(0,1fr)_9rem]" : ""}`}>
                    <div>
                      <label htmlFor="discount-type" className="mb-2 block text-sm font-medium text-slate-900">
                        Discount type
                      </label>
                      <Select
                        id="discount-type"
                        value={discountType}
                        onValueChange={handleDiscountTypeChange}
                      >
                        <option value="fixed-price">Fixed price</option>
                        <option value="percentage">Percentage discount</option>
                      </Select>
                    </div>
                    {discountType === "percentage" ? (
                      <Input
                        id="discount-value"
                        label="Percent"
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
                      ? `${discountProductIds.length} ${discountProductIds.length === 1 ? "product" : "products"} selected`
                      : "Choose products"}
                  </button>
                  {selectedDiscountProducts.length > 0 ? (
                    <>
                      {discountType === "percentage" ? (
                        <div>
                          <label htmlFor="discount-scope" className="mb-2 block text-sm font-medium text-slate-900">
                            Selling options to discount
                          </label>
                          <Select
                            id="discount-scope"
                            value={discountScope}
                            onValueChange={(value) => !Array.isArray(value) && setDiscountScope(value as DiscountScope)}
                          >
                            <option value="all-options">All current selling options</option>
                            <option value="specific-options">Specific selling options</option>
                          </Select>
                          <p className="mt-2 text-xs leading-5 text-slate-500">
                            {discountScope === "all-options"
                              ? "This promotion covers every selling option currently offered by these products. New options will need to be added deliberately."
                              : "Choose exactly which pack sizes and units receive the discount."}
                          </p>
                        </div>
                      ) : (
                        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-5 text-amber-900">
                          Fixed prices apply to specific selling options so unlike pack sizes never share a price.
                        </div>
                      )}

                      <div className="overflow-hidden rounded-2xl border border-slate-200">
                        <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                          <Boxes className="h-4 w-4 text-primary" aria-hidden="true" />
                          Selling options
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
                                      aria-label={`Apply promotion to ${product.name}, ${option.label}`}
                                    />
                                    <span className="min-w-0">
                                      <span className="block text-sm font-semibold text-slate-900">{product.name}</span>
                                      <span className="mt-0.5 block text-xs text-slate-500">{option.label} · {formatCurrency(option.price)} · Min. {option.minimumOrderQuantity}</span>
                                    </span>
                                  </label>
                                  {discountType === "fixed-price" && isSelected ? (
                                    <Input
                                      id={`fixed-price-${key}`}
                                      label="Promotional price"
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
                          title="Apply to company-specific prices"
                          description={
                            applyOnIndividualPricing
                              ? "This promotion also changes eligible customers' company-specific prices."
                              : "Company-specific prices stay separate and do not stack with this promotion."
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
                title="Eligibility"
                description="Choose which customers can see and use this promotion."
              />
              <div className="space-y-5">
                <div>
                  <label htmlFor="promotion-eligibility" className="mb-2 block text-sm font-medium text-slate-900">
                    Eligible customers
                  </label>
                  <Select
                    id="promotion-eligibility"
                    value={eligibility}
                    onValueChange={handleEligibilityChange}
                  >
                    <option value="all-customers">All customers</option>
                    <option value="specific-customers">Specific customers</option>
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
                      ? `${eligibleCustomerIds.length} ${eligibleCustomerIds.length === 1 ? "customer" : "customers"} selected`
                      : "Select customers"}
                  </button>
                ) : null}
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
              <SectionHeading
                icon={<Gift className="h-5 w-5" aria-hidden="true" />}
                title="Promote this offer"
                description="Decide whether this offer should be discovered before buyers reach the product."
              />
              <div className={`rounded-2xl border px-4 ${isBannerEnabled ? "border-primary/20 bg-primary/[0.035]" : "border-slate-200 bg-slate-50"}`}>
                <SwitchField
                  title={isBannerEnabled ? "Promotion banner is on" : "Promotion banner is off"}
                  description={isBannerEnabled ? "Choose where buyers can discover this offer." : "Product prices, promotion labels, and cart benefits still appear whenever this offer applies."}
                  checked={isBannerEnabled}
                  onSave={setIsBannerEnabled}
                  size="lg"
                />
              </div>
              {isBannerEnabled ? (
                <div className="mt-6 space-y-6">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Where should it appear?</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      This changes discovery only. Product and cart promotion details are always shown when relevant.
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
                    <p className="text-sm font-medium text-slate-900">Banner visual <span className="font-normal text-slate-500">(optional)</span></p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">Upload a JPG or PNG image up to 5 MB for the HORECA Home and Promotions banners.</p>
                    {visualUrl ? (
                      <div className="group relative mt-3 aspect-[16/7] overflow-hidden rounded-2xl bg-slate-100">
                        <img src={visualUrl} alt="Promotion banner preview" className="h-full w-full object-cover" />
                        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 bg-gradient-to-t from-slate-950/80 to-transparent px-3 pb-3 pt-10">
                          <span className="text-xs font-semibold text-white">{bannerImage?.fileName ?? "Banner preview"}</span>
                          <button type="button" onClick={clearBannerVisual} className="inline-flex items-center gap-1 rounded-lg bg-white/90 px-2 py-1 text-xs font-bold text-slate-700 transition hover:bg-white"><X className="h-3.5 w-3.5" aria-hidden="true" />Remove</button>
                        </div>
                      </div>
                    ) : (
                      <label htmlFor="promotion-visual" className="mt-3 flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-7 text-center transition hover:border-primary/50 hover:bg-primary/5">
                        <span className="grid h-10 w-10 place-items-center rounded-xl bg-white text-primary shadow-sm"><ImagePlus className="h-5 w-5" aria-hidden="true" /></span>
                        <span className="mt-2 text-sm font-semibold text-slate-800">Upload banner image</span>
                        <span className="mt-1 text-xs text-slate-500">JPG or PNG · up to 5 MB</span>
                      </label>
                    )}
                    <input ref={visualUploadInputRef} id="promotion-visual" type="file" accept=".jpg,.jpeg,.png,image/jpeg,image/png" onChange={handleVisualUpload} className="sr-only" />
                    {visualUrl ? <label htmlFor="promotion-visual" className="mt-3 inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-primary hover:text-primary/75"><ImagePlus className="h-4 w-4" aria-hidden="true" />Replace image</label> : null}
                    {visualError ? <p className="mt-2 text-xs font-medium text-rose-600">{visualError}</p> : null}
                  </div>

                  <div className="border-t border-slate-100 pt-5">
                    <label htmlFor="brand-colour-fallback" className="text-sm font-medium text-slate-900">Brand colour fallback</label>
                    <p className="mt-1 text-xs leading-5 text-slate-500">Used to render the promotion banner when no image is uploaded.</p>
                    <div className="mt-3 flex items-center gap-3">
                      <input id="brand-colour-fallback" type="color" value={brandColorFallback} onChange={(event) => setBrandColorFallback(event.target.value)} className="h-11 w-12 cursor-pointer rounded-lg border border-slate-200 bg-white p-1" aria-label="Brand colour fallback" />
                      <span className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold uppercase text-slate-700">{brandColorFallback}</span>
                      {!visualUrl ? <span className="h-11 flex-1 rounded-lg" style={{ backgroundColor: brandColorFallback }} aria-label="Brand colour banner preview" /> : null}
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
                      Promotion brief
                    </p>
                    <h2 className="mt-1 text-lg font-semibold text-slate-900">
                      Promotion summary
                    </h2>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold shadow-sm ring-1 ${isActive ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-slate-100 text-slate-600 ring-slate-200"}`}>
                    <Check className={`h-3.5 w-3.5 ${isActive ? "text-emerald-600" : "text-slate-500"}`} aria-hidden="true" />
                    {isActive ? "Live" : "Draft"}
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
                  Preview banner
                </button>
              </div>

              <dl className="divide-y divide-slate-100 px-6 sm:px-7">
                <div className="py-4">
                  <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Promotion status
                  </dt>
                  <dd className="mt-1.5 text-sm font-semibold text-slate-900">{isActive ? "Live" : "Draft"}</dd>
                </div>
                <div className="py-4">
                  <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Promotion type
                  </dt>
                  <dd className="mt-1.5 text-sm font-semibold text-slate-900">
                    {promotionTypeLabel}
                  </dd>
                </div>

                <div className="py-4">
                  <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Banner visual</dt>
                  <dd className="mt-1.5 flex items-center gap-2 text-sm font-semibold text-slate-900">
                    {visualUrl ? <img src={visualUrl} alt="" className="h-7 w-12 rounded-md object-cover ring-1 ring-slate-200" /> : null}
                    {visualUrl ? "Custom image uploaded" : "No image uploaded"}
                  </dd>
                </div>

                <div className="py-4">
                  <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Brand colour fallback</dt>
                  <dd className="mt-1.5 flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <span className="h-5 w-5 rounded-full ring-1 ring-slate-200" style={{ backgroundColor: brandColorFallback }} aria-hidden="true" />
                    {brandColorFallback.toUpperCase()}
                  </dd>
                </div>

                <div className="py-4">
                  <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Customer discovery</dt>
                  <dd className="mt-1.5 text-sm font-semibold text-slate-900">
                    {isBannerEnabled ? display === "both" ? "Home banner and promotion list" : display === "home-banner" ? "Home banner only" : "Promotion list only" : "Banners disabled"}
                  </dd>
                </div>

                <div className="py-4">
                  <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Selling options
                  </dt>
                  <dd className="mt-2">
                    {isBuyXGetY ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-3 text-sm">
                          <span className="text-slate-500">Buy X</span>
                          <span className="truncate text-right font-semibold text-slate-900">
                            {triggerProduct?.name ?? "Not selected"}
                            {triggerOption ? ` · ${triggerOption.label}` : ""}
                            {triggerQuantity ? ` · ${triggerQuantity}` : ""}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-3 text-sm">
                          <span className="text-slate-500">Get Y</span>
                          <span className="truncate text-right font-semibold text-slate-900">
                            {targetProduct?.name ?? "Not selected"}
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
                      <p className="text-sm text-slate-500">No selling options selected</p>
                    )}
                  </dd>
                </div>

                <div className="py-4">
                  <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Eligible customers
                  </dt>
                  <dd className="mt-2">
                    {eligibility === "all-customers" ? (
                      <p className="text-sm font-semibold text-slate-900">All customers</p>
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
                      <p className="text-sm text-amber-700">No customers selected</p>
                    )}
                  </dd>
                </div>
                <div className="py-4">
                  <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Company-specific prices
                  </dt>
                  <dd className="mt-1.5 text-sm font-semibold text-slate-900">
                    {isBuyXGetY || !applyOnIndividualPricing ? "Kept separate" : "Promotion also applies"}
                  </dd>
                </div>
              </dl>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
              <SectionHeading
                icon={<Power className="h-5 w-5" aria-hidden="true" />}
                title="Status"
                description="Control whether this promotion is available to customers."
              />
              <div className="border-y border-slate-100">
                <SwitchField
                  title={isActive ? "Active" : "Deactivated"}
                  description={
                    isActive
                      ? "Customers can use this promotion during its active dates."
                      : "Customers cannot use this promotion until you activate it."
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
                title="Active dates"
                description="Set when customers can use this promotion."
              />
              <div className="space-y-5">
                <Input
                  id="promotion-start-date"
                  label="Start date"
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                  required
                />
                <div className="border-y border-slate-100">
                  <SwitchField
                    title="Set an end date"
                    description="Turn this on to automatically end the offer."
                    checked={hasEndDate}
                    onSave={setHasEndDate}
                  />
                </div>
                {hasEndDate ? (
                  <Input
                    id="promotion-end-date"
                    label="End date"
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
          <p className="text-center text-xs text-slate-400">Promotion ID: {promotionId}</p>
        ) : null}
      </form>

      <Modal
        isOpen={isPreviewOpen}
        title="Promotion banner preview"
        description="This is a read-only view of the banner buyers will see. Closing it keeps every unsaved form change in place."
        onClose={() => setIsPreviewOpen(false)}
        size="lg"
      >
        <div className="mx-auto max-w-sm">
          {!isBannerEnabled ? (
            <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-5 text-amber-900">
              Discovery banners are currently turned off. This shows the design if you enable them before saving.
            </p>
          ) : null}
          <PromotionBanner promotion={previewPromotion} />
          <p className="mt-4 text-center text-xs leading-5 text-slate-500">
            Preview only — no promotion was created, updated, or published.
          </p>
        </div>
      </Modal>

      <Modal
        isOpen={productSelectionTarget !== null}
        title={`Select product${isSingleProductSelection ? "" : "s"}`}
        description={
          isSingleProductSelection
            ? "Choose the product for this promotion rule."
            : "Choose the products this promotion applies to."
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
                Products
              </label>
              <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                {selectedProductIds.length} selected
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
                placeholder="Search products"
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
                      <img
                        src={product.imageUrl}
                        alt=""
                        className="h-11 w-11 shrink-0 rounded-xl object-cover ring-1 ring-slate-200"
                      />
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
                        aria-label={`Select ${product.name}`}
                      />
                    </label>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
              No products match your search.
            </p>
          )}

          <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setProductSelectionTarget(null)}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={applyProductSelection}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-content transition hover:brightness-95"
            >
              <Check className="h-4 w-4" aria-hidden="true" />
              Apply selection
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isCustomerSelectorOpen}
        title="Select customers"
        description="Choose the customers who can see and use this promotion."
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
                Customers
              </label>
              <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                {selectedCustomerIds.length} selected
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
                placeholder="Search customers"
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
                      <img
                        src={`https://ui-avatars.com/api/?name=${encodeURIComponent(customer.companyName)}&background=0f766e&color=ffffff&bold=true&size=96`}
                        alt=""
                        className="h-11 w-11 shrink-0 rounded-xl object-cover ring-1 ring-slate-200"
                      />
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
                        aria-label={`Select ${customer.companyName}`}
                      />
                    </label>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
              No customers match your search.
            </p>
          )}

          <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setIsCustomerSelectorOpen(false)}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={applyCustomerSelection}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-content transition hover:brightness-95"
            >
              <Check className="h-4 w-4" aria-hidden="true" />
              Apply selection
            </button>
          </div>
        </div>
      </Modal>
    </DashboardPageContent>
  );
}
