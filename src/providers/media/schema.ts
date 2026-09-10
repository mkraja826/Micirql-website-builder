export type MediaOrientation = "landscape" | "portrait" | "square" | "panoramic";

export type MediaSearchIntent = {
  query: string;
  sectionFamily?: string;
  industry?: string;
  desiredAspect?: string;
  preferredTags?: string[];
  excludedProviderIds?: string[];
};

export type MediaCandidate = {
  provider: "pexels";
  providerId: string;
  imageUrl: string;
  sourcePageUrl: string;
  photographer: string;
  photographerUrl: string;
  alt: string;
  width: number;
  height: number;
  orientation: MediaOrientation;
  aspectRatio: number;
  focalPoint: { x: number; y: number };
  query: string;
};

export interface MediaProvider {
  id: string;
  search(intent: MediaSearchIntent): Promise<MediaCandidate[]>;
}
