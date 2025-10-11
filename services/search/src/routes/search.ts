import { Router } from 'express';
import { runQuery } from '../db.js';
import { ensureUserConsent } from '../services/consent.js';

type ListingRow = {
  id: string;
  title: string;
  price_aed: number | string;
  bedrooms: number | string;
  bathrooms: number | string;
  sqft: number | string;
  community: string;
  distance_km?: number | string | null;
};

const router = Router();

const SEARCH_VECTOR = "to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, ''))";

router.get('/health', (_, res) => {
  res.json({ ok: true });
});

router.get('/search', async (req, res) => {
  try {
    const userId = String(req.headers['x-user-id'] ?? '').trim();
    await ensureUserConsent(userId);
  } catch (error) {
    return res.status(403).json({
      error: 'consent_required',
      message: error instanceof Error ? error.message : 'Consent verification failed'
    });
  }

  try {
    const rawQ = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const minPrice = Number(req.query.minPrice ?? 0) || undefined;
    const maxPrice = Number(req.query.maxPrice ?? 0) || undefined;
    const beds = Number(req.query.beds ?? 0) || undefined;
    const baths = Number(req.query.baths ?? 0) || undefined;
    const community = typeof req.query.community === 'string' ? req.query.community.trim() : '';
    const near = typeof req.query.near === 'string' ? req.query.near.trim() : '';
    const radiusKm = Number(req.query.radius_km ?? 0) || undefined;
    const page = Math.max(1, Number(req.query.page ?? 1) || 1);
    const pageSize = Math.min(50, Math.max(1, Number(req.query.pageSize ?? 20) || 20));
    const sort = typeof req.query.sort === 'string' ? req.query.sort : 'newest';

    const params: unknown[] = [];
    const where: string[] = [];
    const selectFields = ['id', 'title', 'price_aed', 'bedrooms', 'bathrooms', 'sqft', 'community'];
    const computedFields: string[] = [];
    const orderClauses: string[] = [];

    const addParam = (value: unknown): number => {
      params.push(value);
      return params.length;
    };

    let hasSearchTerm = false;
    if (rawQ) {
      hasSearchTerm = true;
      const termIndex = addParam(rawQ);
      where.push(`${SEARCH_VECTOR} @@ websearch_to_tsquery('english', $${termIndex})`);
      computedFields.push(
        `ts_rank_cd(${SEARCH_VECTOR}, websearch_to_tsquery('english', $${termIndex})) as text_rank`
      );
    }

    if (minPrice) {
      const index = addParam(minPrice);
      where.push(`price_aed >= $${index}`);
    }

    if (maxPrice) {
      const index = addParam(maxPrice);
      where.push(`price_aed <= $${index}`);
    }

    if (beds) {
      const index = addParam(beds);
      where.push(`bedrooms >= $${index}`);
    }

    if (baths) {
      const index = addParam(baths);
      where.push(`bathrooms >= $${index}`);
    }

    if (community) {
      const index = addParam(community);
      where.push(`community = $${index}`);
    }

    const nearParts = near.split(',');
    let hasNear = false;
    if (nearParts.length === 2) {
      const lat = Number(nearParts[0]);
      const lon = Number(nearParts[1]);
      if (Number.isFinite(lat) && Number.isFinite(lon)) {
        hasNear = true;
        const lonIndex = addParam(lon);
        const latIndex = addParam(lat);
        const pointExpr = `ST_SetSRID(ST_MakePoint($${lonIndex}, $${latIndex}), 4326)::geography`;
        computedFields.push(`ST_Distance(location, ${pointExpr}) / 1000.0 as distance_km`);
        computedFields.push(
          `1.0 / (1.0 + (ST_Distance(location, ${pointExpr}) / 1000.0)) as distance_score`
        );

        if (radiusKm) {
          const radiusIndex = addParam(radiusKm * 1000);
          where.push(`ST_DWithin(location, ${pointExpr}, $${radiusIndex})`);
        }
      }
    }

    let order = 'created_at desc';
    if (sort === 'price') {
      order = 'price_aed asc';
    } else if (sort === 'newest') {
      order = 'created_at desc';
    } else if (sort === 'relevance' || hasSearchTerm || hasNear) {
      if (hasSearchTerm) {
        orderClauses.push('text_rank desc');
      }
      if (hasNear) {
        orderClauses.push('distance_score desc');
      }
      if (orderClauses.length) {
        orderClauses.push('created_at desc');
        order = orderClauses.join(', ');
      }
    }

    const offset = (page - 1) * pageSize;
    const whereSql = where.length ? `where ${where.join(' and ')}` : '';
    const selectSql = [...selectFields, ...computedFields].join(', ');

    const totalResult = await runQuery<{ count: string }>(
      `select count(*) from listings ${whereSql}`,
      params
    );
    const total = Number(totalResult.rows[0]?.count ?? 0);

    const dataResult = await runQuery<ListingRow>(
      `select ${selectSql} from listings ${whereSql} order by ${order} limit ${pageSize} offset ${offset}`,
      params
    );

    const items = dataResult.rows.map((row) => {
      const base = {
        id: row.id,
        title: row.title,
        price_aed: Number(row.price_aed),
        bedrooms: Number(row.bedrooms),
        bathrooms: Number(row.bathrooms),
        sqft: Number(row.sqft),
        community: row.community
      };

      if (hasNear && row.distance_km !== undefined && row.distance_km !== null) {
        const numericDistance = Number(row.distance_km);
        if (!Number.isNaN(numericDistance)) {
          return {
            ...base,
            distance_km: Number(numericDistance.toFixed(2))
          };
        }
      }

      return base;
    });

    return res.json({
      total,
      page,
      pageSize,
      items
    });
  } catch (error) {
    return res.status(500).json({
      error: 'search_failed',
      message: error instanceof Error ? error.message : 'Unexpected search failure'
    });
  }
});

router.get('/facets', async (req, res) => {
  try {
    const userId = String(req.headers['x-user-id'] ?? '').trim();
    await ensureUserConsent(userId);
  } catch (error) {
    return res.status(403).json({
      error: 'consent_required',
      message: error instanceof Error ? error.message : 'Consent verification failed'
    });
  }

  try {
    const communityResult = await runQuery<{ community: string; count: string }>(
      `select community, count(*) from listings group by community order by count desc`
    );
    const bedroomsResult = await runQuery<{ bedrooms: number; count: string }>(
      `select bedrooms, count(*) from listings group by bedrooms order by bedrooms`
    );

    return res.json({
      community: communityResult.rows.map((row) => ({
        value: row.community,
        count: Number(row.count)
      })),
      bedrooms: bedroomsResult.rows.map((row) => ({
        value: Number(row.bedrooms),
        count: Number(row.count)
      }))
    });
  } catch (error) {
    return res.status(500).json({
      error: 'facet_failed',
      message: error instanceof Error ? error.message : 'Unexpected facet failure'
    });
  }
});

export default router;
