export type ImageRatio = "1:1" | "4:5" | "3:2" | "4:3" | "16:10" | "16:9" | "21:9";

export type ImageSlotStrategy = {
  id: string;
  name: string;
  heroRatio: ImageRatio;
  itemRatio: ImageRatio;
  teamRatio: ImageRatio;
  galleryRatio: ImageRatio;
  crop: "cover" | "contain";
  focalPoint: "center" | "top" | "face-safe";
};

export const IMAGE_SLOT_STRATEGIES: ImageSlotStrategy[] = [
  { id: "balanced", name: "Balanced Media", heroRatio: "4:3", itemRatio: "4:3", teamRatio: "4:5", galleryRatio: "3:2", crop: "cover", focalPoint: "center" },
  { id: "cinematic", name: "Cinematic", heroRatio: "21:9", itemRatio: "16:10", teamRatio: "4:5", galleryRatio: "16:9", crop: "cover", focalPoint: "center" },
  { id: "editorial", name: "Editorial", heroRatio: "3:2", itemRatio: "3:2", teamRatio: "4:5", galleryRatio: "4:3", crop: "cover", focalPoint: "center" },
  { id: "portrait-led", name: "Portrait Led", heroRatio: "4:5", itemRatio: "4:5", teamRatio: "4:5", galleryRatio: "4:5", crop: "cover", focalPoint: "face-safe" },
  { id: "product", name: "Product / Interface", heroRatio: "16:10", itemRatio: "16:10", teamRatio: "1:1", galleryRatio: "16:10", crop: "contain", focalPoint: "center" },
  { id: "mosaic", name: "Mosaic", heroRatio: "16:9", itemRatio: "1:1", teamRatio: "4:5", galleryRatio: "1:1", crop: "cover", focalPoint: "center" },
];

export function imageStrategyAt(index: number): ImageSlotStrategy {
  return IMAGE_SLOT_STRATEGIES[((index % IMAGE_SLOT_STRATEGIES.length) + IMAGE_SLOT_STRATEGIES.length) % IMAGE_SLOT_STRATEGIES.length]!;
}

export function ratioCss(ratio: ImageRatio): string {
  return ratio.replace(":", " / ");
}
