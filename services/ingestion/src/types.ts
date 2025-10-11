export type RawFeedItem = Record<string, unknown>;

export type NormalisedListing = {
  title: string;
  description?: string;
  price_aed: number;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  community: string;
  permit: string;
  lat: number;
  lon: number;
};

export type IngestionSummary = {
  total: number;
  normalised: number;
  inserted: number;
  updated: number;
  skipped: number;
};
