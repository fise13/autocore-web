import { DocumentContext } from "@/lib/documents/document-context";
import { documentPrimaryMotorEntity } from "@/lib/documents/document-helpers";
import { DocumentPhoto } from "@/lib/documents/render-model/types";

function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value.trim());
}

function pushPhoto(
  items: DocumentPhoto[],
  seen: Set<string>,
  url: string,
  caption: string,
  category: DocumentPhoto["category"],
): void {
  const trimmed = url.trim();
  if (!trimmed || !isHttpUrl(trimmed) || seen.has(trimmed)) return;
  seen.add(trimmed);
  items.push({
    id: `${category}-${items.length + 1}`,
    url: trimmed,
    caption,
    category,
  });
}

/** Collects photo URLs from context — no static placeholders. */
export function buildDocumentPhotos(context: DocumentContext): DocumentPhoto[] {
  const items: DocumentPhoto[] = [];
  const seen = new Set<string>();

  for (const photo of context.photos ?? []) {
    pushPhoto(items, seen, photo.url, photo.caption, photo.category);
  }

  const motor = documentPrimaryMotorEntity(context);
  const motorUrls = (motor as { photoUrls?: string[] } | null)?.photoUrls;
  if (Array.isArray(motorUrls)) {
    motorUrls.forEach((url, index) => {
      pushPhoto(items, seen, url, `Двигатель · фото ${index + 1}`, "engine");
    });
  }

  const vehicleUrls = (context.vehicle as { photoUrls?: string[] } | null)?.photoUrls;
  if (Array.isArray(vehicleUrls)) {
    vehicleUrls.forEach((url, index) => {
      pushPhoto(items, seen, url, `Автомобиль · фото ${index + 1}`, "vehicle");
    });
  }

  const orderUrls = (context.order as { photoUrls?: string[] }).photoUrls;
  if (Array.isArray(orderUrls)) {
    orderUrls.forEach((url, index) => {
      pushPhoto(items, seen, url, `Фиксация · фото ${index + 1}`, "work");
    });
  }

  const damageUrls = (context.order as { damagePhotoUrls?: string[] }).damagePhotoUrls;
  if (Array.isArray(damageUrls)) {
    damageUrls.forEach((url, index) => {
      pushPhoto(items, seen, url, `Повреждение · фото ${index + 1}`, "damage");
    });
  }

  return items.slice(0, 9);
}
