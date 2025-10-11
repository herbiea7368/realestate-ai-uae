'use client';

import type { CSSProperties } from 'react';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';

type FacetBucket = {
  value: string | number;
  count: number;
};

type SearchItem = {
  id: string;
  title: string;
  price_aed: number;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  community: string;
  distance_km?: number;
};

type SearchResponse = {
  total: number;
  page: number;
  pageSize: number;
  items: SearchItem[];
};

type FacetResponse = {
  community: FacetBucket[];
  bedrooms: FacetBucket[];
};

const SEARCH_API =
  process.env.NEXT_PUBLIC_SEARCH_URL?.replace(/\/$/, '') ?? 'http://localhost:4010';
const USER_HEADER = { 'x-user-id': 'web-client' };

const containerStyles: CSSProperties = {
  margin: '0 auto',
  maxWidth: '960px',
  display: 'flex',
  flexDirection: 'column',
  gap: '24px'
};

const formStyles: CSSProperties = {
  display: 'grid',
  gap: '16px',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  backgroundColor: '#ffffff',
  border: '1px solid #d9e2ec',
  borderRadius: '10px',
  padding: '20px',
  boxShadow: '0 8px 24px rgba(15, 23, 42, 0.08)'
};

const buttonRowStyles: CSSProperties = {
  gridColumn: '1 / -1',
  display: 'flex',
  justifyContent: 'flex-end',
  gap: '12px'
};

const resultsHeaderStyles: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '16px',
  flexWrap: 'wrap'
};

const resultsGridStyles: CSSProperties = {
  display: 'grid',
  gap: '16px',
  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))'
};

const cardStyles: CSSProperties = {
  backgroundColor: '#ffffff',
  border: '1px solid #d9e2ec',
  borderRadius: '12px',
  padding: '20px',
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
  boxShadow: '0 6px 20px rgba(15, 23, 42, 0.06)'
};

const secondaryButtonStyles: CSSProperties = {
  background: '#ffffff',
  color: '#1f2933',
  border: '1px solid #cbd2d9'
};

const primaryButtonStyles: CSSProperties = {
  background: '#1f2933',
  color: '#ffffff'
};

export default function SearchPage(): JSX.Element {
  const [q, setQ] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [beds, setBeds] = useState('');
  const [baths, setBaths] = useState('');
  const [community, setCommunity] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(12);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<SearchResponse>({
    total: 0,
    page: 1,
    pageSize,
    items: []
  });
  const [facets, setFacets] = useState<FacetResponse>({ community: [], bedrooms: [] });

  const totalPages = useMemo(() => {
    if (!results.total) {
      return 1;
    }
    return Math.max(1, Math.ceil(results.total / results.pageSize));
  }, [results.total, results.pageSize]);

  const buildQuery = useCallback(
    (nextPage = 1) => {
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      if (minPrice) params.set('minPrice', minPrice);
      if (maxPrice) params.set('maxPrice', maxPrice);
      if (beds) params.set('beds', beds);
      if (baths) params.set('baths', baths);
      if (community) params.set('community', community);
      params.set('page', String(nextPage));
      params.set('pageSize', String(pageSize));
      return params;
    },
    [baths, beds, community, maxPrice, minPrice, pageSize, q]
  );

  const fetchFacets = useCallback(async () => {
    try {
      const response = await fetch(`${SEARCH_API}/facets`, {
        headers: USER_HEADER
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }
      const payload = (await response.json()) as FacetResponse;
      setFacets(payload);
    } catch (err) {
      console.error('Failed to load facets', err);
    }
  }, []);

  const fetchResults = useCallback(
    async (nextPage = 1) => {
      setLoading(true);
      setError(null);
      try {
        const params = buildQuery(nextPage);
        const response = await fetch(`${SEARCH_API}/search?${params.toString()}`, {
          headers: USER_HEADER
        });
        if (!response.ok) {
          throw new Error(await response.text());
        }
        const payload = (await response.json()) as SearchResponse;
        setResults(payload);
        setPage(payload.page);
      } catch (err) {
        console.error('Search failed', err);
        setError('Unable to load listings. Please try again.');
      } finally {
        setLoading(false);
      }
    },
    [buildQuery]
  );

  const onSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      await fetchResults(1);
    },
    [fetchResults]
  );

  useEffect(() => {
    void fetchFacets();
    void fetchResults(1);
  }, [fetchFacets, fetchResults]);

  return (
    <main>
      <div style={containerStyles}>
        <section>
          <h1 style={{ fontSize: '2.25rem', marginBottom: '0.5rem', color: '#102a43' }}>
            Dubai Property Search
          </h1>
          <p style={{ fontSize: '0.95rem', color: '#486581', maxWidth: '720px' }}>
            Explore curated listings across Dubai communities with bedroom, pricing, and keyword
            filters. Listings are consent-aware and display compliant messaging windows per TDRA.
          </p>
        </section>

        <form onSubmit={onSubmit} style={formStyles}>
          <label>
            Keywords
            <input
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder="e.g. waterfront, Burj view"
            />
          </label>

          <label>
            Community
            <select value={community} onChange={(event) => setCommunity(event.target.value)}>
              <option value="">Any community</option>
              {facets.community.map((bucket) => (
                <option key={bucket.value} value={bucket.value as string}>
                  {bucket.value} ({bucket.count})
                </option>
              ))}
            </select>
          </label>

          <label>
            Bedrooms
            <select value={beds} onChange={(event) => setBeds(event.target.value)}>
              <option value="">Any</option>
              {facets.bedrooms.map((bucket) => (
                <option key={bucket.value} value={String(bucket.value)}>
                  {bucket.value}+ ({bucket.count})
                </option>
              ))}
            </select>
          </label>

          <label>
            Bathrooms
            <input
              type="number"
              min={0}
              value={baths}
              onChange={(event) => setBaths(event.target.value)}
              placeholder="Any"
            />
          </label>

          <label>
            Min Price (AED)
            <input
              type="number"
              min={0}
              step={50000}
              value={minPrice}
              onChange={(event) => setMinPrice(event.target.value)}
              placeholder="0"
            />
          </label>

          <label>
            Max Price (AED)
            <input
              type="number"
              min={0}
              step={50000}
              value={maxPrice}
              onChange={(event) => setMaxPrice(event.target.value)}
              placeholder="5,000,000"
            />
          </label>

          <div style={buttonRowStyles}>
            <button
              type="button"
              style={secondaryButtonStyles}
              onClick={() => {
                setQ('');
                setCommunity('');
                setBeds('');
                setBaths('');
                setMinPrice('');
                setMaxPrice('');
                void fetchResults(1);
              }}
            >
              Reset
            </button>
            <button type="submit" style={primaryButtonStyles} disabled={loading}>
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>
        </form>

        {error ? (
          <p
            style={{
              backgroundColor: '#fee2e2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              padding: '12px 16px',
              color: '#b91c1c'
            }}
          >
            {error}
          </p>
        ) : null}

        <div style={resultsHeaderStyles}>
          <span style={{ color: '#486581', fontSize: '0.95rem' }}>
            {results.total} result{results.total === 1 ? '' : 's'} - Page {page} of {totalPages}
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              style={secondaryButtonStyles}
              disabled={page <= 1 || loading}
              onClick={() => void fetchResults(page - 1)}
            >
              Previous
            </button>
            <button
              type="button"
              style={secondaryButtonStyles}
              disabled={page >= totalPages || loading}
              onClick={() => void fetchResults(page + 1)}
            >
              Next
            </button>
          </div>
        </div>

        <div style={resultsGridStyles}>
          {results.items.map((item) => (
            <article key={item.id} style={cardStyles}>
              <header style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                <h2 style={{ margin: 0, fontSize: '1.1rem', color: '#102a43' }}>{item.title}</h2>
                <span style={{ fontWeight: 700, color: '#047857' }}>
                  {new Intl.NumberFormat('en-AE', {
                    style: 'currency',
                    currency: 'AED',
                    maximumFractionDigits: 0
                  }).format(item.price_aed)}
                </span>
              </header>
              <ul
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '8px',
                  listStyle: 'none',
                  margin: 0,
                  padding: 0,
                  color: '#486581',
                  fontSize: '0.95rem'
                }}
              >
                <li>{item.community}</li>
                <li>{item.bedrooms} bed</li>
                <li>{item.bathrooms} bath</li>
                <li>{item.sqft.toLocaleString()} sqft</li>
                {typeof item.distance_km === 'number' ? (
                  <li>{item.distance_km.toFixed(1)} km away</li>
                ) : null}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
