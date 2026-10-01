import { PromotionEditor } from "~/features/promotion-editor";
import { useParams } from "react-router";

export default function SupplierPromotionDetailPage() {
  const { promotionId } = useParams();

  return <PromotionEditor mode="edit" promotionId={promotionId} />;
}
