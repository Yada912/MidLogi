import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { Coordinate } from '../../lib/mockData';
import L from 'leaflet';

interface MapPlaceholderProps {
  points?: Coordinate[];
  labels?: string[];
  pickupPoint?: Coordinate;
  dropoffPoint?: Coordinate;
  height?: string;
  interactive?: boolean;
  pickMode?: 'pickup' | 'dropoff' | null;
  onLocationSelect?: (coord: Coordinate, address: string, type: 'pickup' | 'dropoff') => void;
  onExitPickMode?: () => void;
}

const makeNumberedIcon = (n: number) => L.divIcon({
  className: '',
  html: `<div style="width:26px;height:26px;border-radius:50%;background:linear-gradient(135deg,#8eadf0,#2091e7);border:2.5px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.25);display:flex;align-items:center;justify-content:center;color:#fff;font-size:11px;font-weight:700;">${n}</div>`,
  iconSize: [26, 26],
  iconAnchor: [13, 13],
});

const makePinIcon = (color: string, label: string) => L.divIcon({
  className: '',
  html: `<div style="display:flex;flex-direction:column;align-items:center;"><div style="width:30px;height:30px;border-radius:50%;background:${color};border:2.5px solid #fff;box-shadow:0 3px 10px rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;font-weight:800;">${label}</div><div style="width:2px;height:8px;background:${color};margin-top:-1px;border-radius:0 0 2px 2px;"></div></div>`,
  iconSize: [30, 38],
  iconAnchor: [15, 38],
});

export const MapPlaceholder: React.FC<MapPlaceholderProps> = ({
  points = [],
  labels = [],
  pickupPoint,
  dropoffPoint,
  height = '200px',
  interactive = true,
  pickMode = null,
  onLocationSelect,
  onExitPickMode,
}) => {
  const containerRef  = useRef<HTMLDivElement>(null);
  const mapRef        = useRef<L.Map | null>(null);
  const layersRef     = useRef<L.Layer[]>([]);
  const tempMarkerRef = useRef<L.Marker | null>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [pendingCoord, setPendingCoord] = useState<Coordinate | null>(null);
  const [ready, setReady] = useState(false);

  // Initialize Leaflet map on mount
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let mounted = true;

    const map = L.map(containerRef.current, {
      center: [-6.2297, 106.8294],
      zoom: 12,
      zoomControl: false,
      attributionControl: false,
    });

    if (interactive) {
      L.control.zoom({ position: 'bottomright' }).addTo(map);
    }

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);

    L.control.attribution({ position: 'bottomright', prefix: '' })
      .addAttribution('© <a href="https://osm.org/copyright" target="_blank">OSM</a>')
      .addTo(map);

    mapRef.current = map;

    const timer = setTimeout(() => {
      if (mounted && mapRef.current) {
        try { map.invalidateSize(); } catch { /* ignore */ }
        setReady(true);
      }
    }, 150);

    return () => {
      mounted = false;
      clearTimeout(timer);
      map.remove();
      mapRef.current = null;
      setReady(false);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update markers & route when data changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    layersRef.current.forEach(l => l.remove());
    layersRef.current = [];

    const allPts: [number, number][] = [];

    points.forEach((p, i) => {
      const m = L.marker([p.lat, p.lng], { icon: makeNumberedIcon(i + 1) });
      if (labels[i]) m.bindTooltip(labels[i], { direction: 'top' });
      m.addTo(map);
      layersRef.current.push(m);
      allPts.push([p.lat, p.lng]);
    });

    if (points.length >= 2) {
      const poly = L.polyline(
        points.map(p => [p.lat, p.lng] as [number, number]),
        { color: '#2091e7', weight: 3.5, dashArray: '8 5', opacity: 0.85 }
      ).addTo(map);
      layersRef.current.push(poly);
    }

    if (pickupPoint) {
      const m = L.marker([pickupPoint.lat, pickupPoint.lng], { icon: makePinIcon('#10b981', 'P') })
        .bindTooltip('Titik Jemput', { direction: 'top' }).addTo(map);
      layersRef.current.push(m);
      allPts.push([pickupPoint.lat, pickupPoint.lng]);
    }

    if (dropoffPoint) {
      const m = L.marker([dropoffPoint.lat, dropoffPoint.lng], { icon: makePinIcon('#ef4444', 'D') })
        .bindTooltip('Titik Antar', { direction: 'top' }).addTo(map);
      layersRef.current.push(m);
      allPts.push([dropoffPoint.lat, dropoffPoint.lng]);
    }

    if (pickupPoint && dropoffPoint) {
      const line = L.polyline(
        [[pickupPoint.lat, pickupPoint.lng], [dropoffPoint.lat, dropoffPoint.lng]],
        { color: '#f97316', weight: 2.5, dashArray: '6 4', opacity: 0.7 }
      ).addTo(map);
      layersRef.current.push(line);
    }

    if (allPts.length >= 2) {
      map.fitBounds(allPts, { padding: [35, 35], maxZoom: 15 });
    } else if (allPts.length === 1) {
      map.setView(allPts[0], 14);
    }
  }, [points, labels, pickupPoint, dropoffPoint, ready]);

  // Confirm a pending pick
  const confirmPick = useCallback(async () => {
    if (!pendingCoord || !onLocationSelect || !pickMode) return;
    const capturedMode = pickMode as 'pickup' | 'dropoff';
    const capturedCoord = pendingCoord;
    setIsGeocoding(true);
    try {
      const resp = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${capturedCoord.lat}&lon=${capturedCoord.lng}`,
        { headers: { 'Accept-Language': 'id' } }
      );
      const data = await resp.json() as { display_name?: string };
      onLocationSelect(capturedCoord, data.display_name ?? `${capturedCoord.lat.toFixed(5)}, ${capturedCoord.lng.toFixed(5)}`, capturedMode);
    } catch {
      onLocationSelect(capturedCoord, `${capturedCoord.lat.toFixed(5)}, ${capturedCoord.lng.toFixed(5)}`, capturedMode);
    } finally {
      setIsGeocoding(false);
      setPendingCoord(null);
      if (tempMarkerRef.current) {
        tempMarkerRef.current.remove();
        tempMarkerRef.current = null;
      }
    }
  }, [pendingCoord, onLocationSelect, pickMode]);

  // Click handler: stage a pending coordinate (show temp pin)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    if (!pickMode) {
      map.getContainer().style.cursor = '';
      // Clear temp state when pick mode exits
      if (tempMarkerRef.current) { tempMarkerRef.current.remove(); tempMarkerRef.current = null; }
      setPendingCoord(null);
      return;
    }

    map.getContainer().style.cursor = 'crosshair';

    const handler = (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      setPendingCoord({ lat, lng });

      // Place / move temp marker
      if (tempMarkerRef.current) {
        tempMarkerRef.current.setLatLng([lat, lng]);
      } else {
        const color = pickMode === 'pickup' ? '#10b981' : '#ef4444';
        const label = pickMode === 'pickup' ? 'P' : 'D';
        tempMarkerRef.current = L.marker([lat, lng], { icon: makePinIcon(color, label), opacity: 0.7 }).addTo(map);
      }
    };

    map.on('click', handler);
    return () => {
      map.off('click', handler);
      if (mapRef.current?.getContainer()) mapRef.current.getContainer().style.cursor = '';
    };
  }, [pickMode, ready]);

  const accentColor = pickMode === 'pickup' ? '#10b981' : '#ef4444';

  return (
    <div style={{ position: 'relative', height, borderRadius: '20px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.12)' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      {/* Pick mode: instruction banner */}
      {pickMode && !pendingCoord && (
        <div style={{
          position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)',
          background: `${accentColor}ee`,
          color: '#fff', padding: '7px 16px', borderRadius: '20px',
          fontSize: '12px', fontWeight: 700, zIndex: 1000, pointerEvents: 'none',
          boxShadow: '0 2px 10px rgba(0,0,0,0.2)', whiteSpace: 'nowrap',
        }}>
          {pickMode === 'pickup' ? '📍' : '🏁'} Ketuk titik di peta
        </div>
      )}

      {/* Pick mode: confirm / cancel bar */}
      {pickMode && (
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          background: '#fff', borderTop: '1px solid #e2e8f0',
          display: 'flex', gap: '10px', padding: '10px 14px',
          zIndex: 1000,
        }}>
          {/* Cancel */}
          <button
            onClick={() => {
              setPendingCoord(null);
              if (tempMarkerRef.current) { tempMarkerRef.current.remove(); tempMarkerRef.current = null; }
              onExitPickMode?.();
            }}
            style={{
              flex: '0 0 auto', padding: '9px 14px', borderRadius: '12px',
              border: '1.5px solid #e2e8f0', background: '#f8fafc',
              color: '#64748b', fontWeight: 700, fontSize: '12px',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
            }}
          >
            <span className="material-icons" style={{ fontSize: '16px' }}>arrow_back</span>
            Batal
          </button>

          {/* Confirm */}
          <button
            onClick={confirmPick}
            disabled={!pendingCoord || isGeocoding}
            style={{
              flex: 1, padding: '9px 14px', borderRadius: '12px', border: 'none',
              background: pendingCoord ? accentColor : '#e2e8f0',
              color: '#fff', fontWeight: 700, fontSize: '12px', cursor: pendingCoord ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              transition: 'background 0.2s',
            }}
          >
            <span className="material-icons" style={{ fontSize: '16px' }}>
              {isGeocoding ? 'hourglass_top' : 'check'}
            </span>
            {isGeocoding ? 'Memuat...' : pendingCoord ? 'Konfirmasi Lokasi' : 'Pilih titik di peta'}
          </button>
        </div>
      )}
    </div>
  );
};
export default MapPlaceholder;
