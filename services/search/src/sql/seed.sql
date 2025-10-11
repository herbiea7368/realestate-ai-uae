insert into listings (title, description, price_aed, bedrooms, bathrooms, sqft, community, location, permit, created_at)
values
  (
    'Burj Vista 2BR with fountain view',
    'High-floor apartment across from Dubai Mall with direct metro link and partial Burj Khalifa view.',
    2250000,
    2,
    2,
    1185,
    'Downtown Dubai',
    st_geogfromtext('SRID=4326;POINT(55.2744 25.1972)'),
    'BR-123456',
    now() - interval '2 days'
  ),
  (
    'Marina Gate 1BR waterfront living',
    'Upgraded unit in Dubai Marina with sea-facing balcony and included parking bay.',
    1675000,
    1,
    1,
    840,
    'Dubai Marina',
    st_geogfromtext('SRID=4326;POINT(55.1425 25.0866)'),
    'MR-654321',
    now() - interval '1 day'
  ),
  (
    'JVC Park View 3BR townhouse',
    'Family townhouse near community park with maid''s room and covered garage.',
    2100000,
    3,
    3,
    2450,
    'Jumeirah Village Circle',
    st_geogfromtext('SRID=4326;POINT(55.2117 25.0542)'),
    'JV-192837',
    now() - interval '6 hours'
  )
on conflict do nothing;
