create extension if not exists postgis;
create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

create table if not exists listings (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  price_aed numeric not null,
  bedrooms int not null,
  bathrooms int not null,
  sqft numeric not null,
  community text not null,
  location geography(point, 4326) not null,
  created_at timestamptz not null default now(),
  permit varchar(16)
);

create index if not exists idx_listings_price on listings(price_aed);
create index if not exists idx_listings_bedrooms on listings(bedrooms);
create index if not exists idx_listings_bathrooms on listings(bathrooms);
create index if not exists idx_listings_community on listings(community);
create index if not exists idx_listings_created_at on listings(created_at desc);
create index if not exists idx_listings_location on listings using gist (location);
create index if not exists idx_listings_search on listings using gin (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, '')));
