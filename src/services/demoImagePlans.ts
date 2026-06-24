import { ImagePlanResponse } from "../types/imagePlanView.js";
import { strategyActionStore } from "../runtime/strategyActionStore.js";
import { createActionImagePlanView, visibleActionArtifacts } from "./strategyArtifacts.js";

const now = new Date().toISOString();
const generatedDefaults = {
  generatedImageUrl: "",
  generatedImageFile: "",
  generatedImageProvider: "",
  generatedImageModel: "",
  generatedImagePrompt: "",
  generatedImageAt: "",
  imageApprovalStatus: ""
};

export function getDemoImagePlans(): ImagePlanResponse {
  const plans = [
    {
      id: "image-demo-1", theme: "Sonny Angel Animal Series Version 4 เข้าใหม่",
      contentType: "new_arrival", productSku: "SA-ANIMAL-V4",
      productName: "Sonny Angel Animal Series Version 4", platform: "Instagram",
      imageType: "product_photo" as const,
      imageConcept: "ภาพสินค้าจริงบนพื้นหลังสีม่วงอ่อน พร้อมกรอบ New Arrival",
      imageText: "NEW ARRIVAL", imagePrompt: "",
      imageNote: "ใช้ภาพสินค้าจริงและเทมเพลตร้าน ห้ามสร้างภาพตัวสินค้าใหม่ด้วย AI",
      imageStatus: "image_brief_ready", availableAssets: ["product_photo", "box_photo"],
      ...generatedDefaults,
      assetNote: "ยังไม่มีภาพแกะกล่อง", brandedProduct: true, canMakeUnboxing: false,
      status: "manager_final_check", riskLevel: "low" as const, updatedAt: now
    },
    {
      id: "image-demo-2", theme: "วิธีดูแลฟิกเกอร์ One Piece",
      contentType: "knowledge", productSku: "OP-CHOPPER-01",
      productName: "One Piece Figure - Tony Tony Chopper", platform: "Facebook",
      imageType: "template" as const,
      imageConcept: "ภาพสินค้าจริงด้านซ้ายและรายการวิธีดูแล 3 ข้อด้านขวา",
      imageText: "ดูแลฟิกเกอร์ให้สวยนาน", imagePrompt: "",
      imageNote: "ใช้ภาพสินค้า Chopper จริงร่วมกับเทมเพลตความรู้",
      imageStatus: "image_brief_ready", availableAssets: ["product_photo", "opened_photo", "video"],
      ...generatedDefaults,
      assetNote: "มีภาพและวิดีโอจริง", brandedProduct: true, canMakeUnboxing: true,
      status: "manager_final_check", riskLevel: "low" as const, updatedAt: now
    },
    {
      id: "image-demo-3", theme: "เริ่มสะสม Art Toy อย่างไร",
      contentType: "knowledge", productSku: "", productName: "คอนเทนต์ทั่วไป",
      platform: "Facebook, Instagram", imageType: "ai_image" as const,
      imageConcept: "ชั้นวางของสะสมสไตล์มินิมอลโดยไม่มีตัวละครหรือแบรนด์จริง",
      imageText: "เริ่มสะสมอย่างมีแผน",
      imagePrompt: "Minimal collectible shelf, generic toy silhouettes, no logos, no branded characters",
      imageNote: "ใช้ AI ได้เพราะเป็นภาพ lifestyle ทั่วไปและไม่อ้างว่าเป็นสินค้าจริง",
      imageStatus: "image_brief_ready", availableAssets: [],
      ...generatedDefaults,
      assetNote: "", brandedProduct: false, canMakeUnboxing: false,
      status: "ready_to_post", riskLevel: "low" as const, updatedAt: now
    },
    {
      id: "image-demo-4", theme: "One Piece Bundle Weekend",
      contentType: "promotion", productSku: "OP-CHOPPER-01",
      productName: "One Piece Figure - Tony Tony Chopper", platform: "Facebook",
      imageType: "" as const, imageConcept: "", imageText: "", imagePrompt: "",
      imageNote: "", imageStatus: "", availableAssets: ["product_photo"],
      ...generatedDefaults,
      assetNote: "รอโปรโมชั่นอนุมัติก่อนสร้าง brief", brandedProduct: true,
      canMakeUnboxing: false, status: "content_passed", riskLevel: "medium" as const,
      updatedAt: now
    }
  ];
  const actionPlans = visibleActionArtifacts(strategyActionStore.snapshot().recentArtifacts)
    .filter((artifact) => artifact.kind === "content_plan")
    .map((artifact) => createActionImagePlanView(artifact));
  const mergedPlans = [...actionPlans, ...plans].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return {
    mode: "demo",
    summary: {
      total: mergedPlans.length,
      waiting: mergedPlans.filter((plan) => !plan.imageStatus).length,
      ready: mergedPlans.filter((plan) => plan.imageStatus === "image_brief_ready").length,
      productPhoto: mergedPlans.filter((plan) => plan.imageType === "product_photo").length,
      template: mergedPlans.filter((plan) => plan.imageType === "template").length,
      aiImage: mergedPlans.filter((plan) => plan.imageType === "ai_image").length
    },
    plans: mergedPlans
  };
}
