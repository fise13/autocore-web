import type { DonorVehicle } from "@/domain/donor";
import type { MarketplaceChannel, MarketplaceListing } from "@/domain/marketplace-listing";
import type { UsedPart } from "@/domain/used-part";

export type MarketplaceFeedAd = {
  id: string;
  title: string;
  price: number;
  currency: string;
  description: string;
  vin?: string;
  oem?: string;
  condition?: string;
  location?: string;
  photos: string[];
  status: "active" | "inactive";
};

export function adsForChannel(input: {
  channel: MarketplaceChannel;
  listings: MarketplaceListing[];
  parts: UsedPart[];
  donors: DonorVehicle[];
}): MarketplaceFeedAd[] {
  const partsById = new Map(input.parts.map((part) => [part.id, part]));
  const donorsById = new Map(input.donors.map((donor) => [donor.id, donor]));

  const ads: MarketplaceFeedAd[] = [];
  for (const listing of input.listings) {
    if (listing.channel !== input.channel) continue;
    const part = partsById.get(listing.usedPartId);
    if (!part) continue;
    const donor = part.donorId ? donorsById.get(part.donorId) : undefined;
    const active = listing.status === "listed" && part.status === "available";
    ads.push({
      id: listing.id,
      title: listing.title || part.name,
      price: listing.price || part.sellPrice,
      currency: listing.currency || part.currency || "KZT",
      description: [part.applicability, donor ? `${donor.make} ${donor.model}` : "", part.oemNumber]
        .filter(Boolean)
        .join(" · "),
      vin: donor?.vin,
      oem: part.oemNumber,
      condition: part.conditionPercent != null ? `${part.conditionPercent}%` : part.quality,
      location: part.locationCode,
      photos: part.photoUrls,
      status: active ? "active" : "inactive",
    });
  }
  return ads;
}

function xmlEscape(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export function buildAvitoXml(ads: MarketplaceFeedAd[]): string {
  const rows = ads
    .map((ad) => {
      const status = ad.status === "active" ? "Free" : "Inactive";
      const images = ad.photos
        .slice(0, 10)
        .map((url) => `      <Image url="${xmlEscape(url)}" />`)
        .join("\n");
      return `  <Ad>
    <Id>${xmlEscape(ad.id)}</Id>
    <AdStatus>${status}</AdStatus>
    <Title>${xmlEscape(ad.title)}</Title>
    <Price>${Math.round(ad.price)}</Price>
    <Description>${xmlEscape(ad.description)}</Description>
    ${ad.oem ? `<OEM>${xmlEscape(ad.oem)}</OEM>` : ""}
    ${ad.vin ? `<VIN>${xmlEscape(ad.vin)}</VIN>` : ""}
    ${ad.location ? `<Address>${xmlEscape(ad.location)}</Address>` : ""}
    <Images>
${images}
    </Images>
  </Ad>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<Ads formatVersion="3" target="Avito.ru">
${rows}
</Ads>
`;
}

export function buildDromXml(ads: MarketplaceFeedAd[]): string {
  const rows = ads
    .map((ad) => {
      const available = ad.status === "active" ? "1" : "0";
      return `  <part>
    <id>${xmlEscape(ad.id)}</id>
    <available>${available}</available>
    <name>${xmlEscape(ad.title)}</name>
    <price>${Math.round(ad.price)}</price>
    <currency>${xmlEscape(ad.currency)}</currency>
    <oem>${xmlEscape(ad.oem ?? "")}</oem>
    <mark>${xmlEscape(ad.description)}</mark>
  </part>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<parts>
${rows}
</parts>
`;
}
