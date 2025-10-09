'use client';

import { useEffect, useRef } from 'react';

interface MapPlaceholderProps {
  latitude?: number;
  longitude?: number;
}

export function MapPlaceholder({ latitude = 25.2048, longitude = 55.2708 }: MapPlaceholderProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    async function loadMap() {
      try {
        const module = await import('mapbox-gl');
        const mapboxgl = module.default as typeof module.default & {
          accessToken: string;
        };
        mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? '';
        if (!mapboxgl.accessToken || !containerRef.current) {
          return;
        }
        const map = new mapboxgl.Map({
          container: containerRef.current,
          style: 'mapbox://styles/mapbox/streets-v12',
          center: [longitude, latitude],
          zoom: 12
        });
        map.addControl(new mapboxgl.NavigationControl());
      } catch (error) {
        console.warn('Mapbox initialization skipped:', error);
      }
    }

    void loadMap();
  }, [latitude, longitude]);

  return (
    <div className="h-64 w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
      <div ref={containerRef} className="h-full w-full" aria-label="Map placeholder">
        {!process.env.NEXT_PUBLIC_MAPBOX_TOKEN && (
          <div className="flex h-full w-full items-center justify-center text-sm text-slate-500">
            Map view coming soon (requires Mapbox token)
          </div>
        )}
      </div>
    </div>
  );
}
