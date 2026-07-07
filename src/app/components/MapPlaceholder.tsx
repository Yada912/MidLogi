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
  html: `<div style="width:26px;height:26px;border-radius:50%;background:linear-gradient(135deg,#6a9cf4,#2091e7);border:2.5px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.2);display:flex;align-items:center;justify-content:center;color:#fff;font-size:11px;font-weight:700;">${n}</div>`,
  iconSize: [26, 26],
  iconAnchor: [13, 13],
});

const makePinIcon = (color: string, label: string) => L.divIcon({
  className: '',
  html: `<div style="display:flex;flex-direction:column;align-items:center;"><div style="width:30px;height:30px;border-radius:50%;background:${color};border:2.5px solid #fff;box-shadow:0 3px 10px rgba(0,0,0,.25);display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;font-weight:800;">${label}</div><div style="width:2px;height:8px;background:${color};margin-top:-1px;border-radius:0 0 2px 2px;"></div></div>`,
  iconSize: [30, 38],
  iconAnchor: [15, 38],
});

const getManeuverIcon = (type: string, modifier: string) => {
  const t = type ? type.toLowerCase() : '';
  const m = modifier ? modifier.toLowerCase() : '';
  if (t === 'arrive') return 'sports_score';
  if (t === 'depart') return 'navigation';
  if (m.includes('left')) return 'turn_left';
  if (m.includes('right')) return 'turn_right';
  if (m.includes('u-turn') || m.includes('uturn')) return 'u_turn';
  return 'arrow_upward';
};

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
  const containerRef       = useRef<HTMLDivElement>(null);
  const mapRef             = useRef<L.Map | null>(null);
  const layersRef          = useRef<L.Layer[]>([]);
  const tempMarkerRef      = useRef<L.Marker | null>(null);
  const gpsMarkerRef       = useRef<L.Marker | null>(null);
  // Tracks whether the user has manually panned/zoomed — if so, skip auto-fit
  const userHasInteracted  = useRef(false);
  // Key to detect when the actual pin locations change (not just routedCoords updates)
  const prevPinKeyRef      = useRef<string>('');

  const [isGeocoding, setIsGeocoding] = useState(false);
  const [pendingCoord, setPendingCoord] = useState<Coordinate | null>(null);
  const [ready, setReady] = useState(false);

  // GPS Tracking state
  const [currentLoc, setCurrentLoc] = useState<Coordinate | null>(null);

  // OSRM Routing states
  const [routedCoords, setRoutedCoords] = useState<Coordinate[]>([]);
  const [routeSteps, setRouteSteps] = useState<any[]>([]);
  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);

  // Watch current position
  useEffect(() => {
    if (!navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setCurrentLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      (err) => console.warn('GPS watch error:', err),
      { enableHighAccuracy: true }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // Initialize Leaflet map on mount
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let mounted = true;

    // Default center at Kuningan, Jakarta
    const map = L.map(containerRef.current, {
      center: [-6.2297, 106.8294],
      zoom: 13,
      zoomControl: false,
      attributionControl: false,
    });

    if (interactive) {
      L.control.zoom({ position: 'bottomright' }).addTo(map);
    }

    // Beautiful POSITRON Grayscale tile layer (minimalist/uncluttered)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 20,
      attribution: '© OpenStreetMap, © CartoDB'
    }).addTo(map);

    L.control.attribution({ position: 'bottomright', prefix: '' })
      .addAttribution('© <a href="https://osm.org/copyright" target="_blank">OSM</a> © <a href="https://carto.com/" target="_blank">CartoDB</a>')
      .addTo(map);

    mapRef.current = map;

    // Detect user-initiated pan/zoom so we can skip auto-fit later
    const onMoveStart = () => { userHasInteracted.current = true; };
    map.on('dragstart', onMoveStart);
    map.on('zoomstart', onMoveStart);

    const timer = setTimeout(() => {
      if (mounted && mapRef.current) {
        try { map.invalidateSize(); } catch { /* ignore */ }
        setReady(true);
      }
    }, 150);

    return () => {
      mounted = false;
      clearTimeout(timer);
      map.off('dragstart', onMoveStart);
      map.off('zoomstart', onMoveStart);
      map.remove();
      mapRef.current = null;
      setReady(false);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  // ResizeObserver to handle dynamic height transitions cleanly
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !containerRef.current || !ready) return;

    const observer = new ResizeObserver(() => {
      try {
        map.invalidateSize();
      } catch (err) {
        // ignore
      }
    });

    observer.observe(containerRef.current);
    return () => {
      observer.disconnect();
    };
  }, [ready]);

  // Fetch OSRM Route whenever path coordinates change
  useEffect(() => {
    let activeCoords: Coordinate[] = [];
    if (points.length >= 2) {
      activeCoords = points;
    } else if (pickupPoint && dropoffPoint) {
      activeCoords = [pickupPoint, dropoffPoint];
    } else if (pickupPoint) {
      activeCoords = [pickupPoint];
    } else if (dropoffPoint) {
      activeCoords = [dropoffPoint];
    }

    if (activeCoords.length < 2) {
      setRoutedCoords([]);
      setRouteSteps([]);
      setActiveStepIndex(0);
      return;
    }

    let isSubscribed = true;

    const coordsStr = activeCoords.map(w => `${w.lng},${w.lat}`).join(';');
    const url = `https://router.project-osrm.org/route/v1/driving/${coordsStr}?overview=full&geometries=geojson&steps=true`;

    fetch(url)
      .then(r => r.json())
      .then(data => {
        if (!isSubscribed) return;
        if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
          const route = data.routes[0];
          const geometry = route.geometry.coordinates;
          const mappedCoords = geometry.map((c: number[]) => ({ lat: c[1], lng: c[0] }));
          setRoutedCoords(mappedCoords);

          // Extract steps
          const steps: any[] = [];
          route.legs.forEach((leg: any) => {
            leg.steps.forEach((step: any) => {
              if (step.maneuver && step.maneuver.instruction) {
                steps.push({
                  instruction: step.maneuver.instruction,
                  type: step.maneuver.type,
                  modifier: step.maneuver.modifier,
                  distance: step.distance,
                });
              }
            });
          });
          setRouteSteps(steps);
          setActiveStepIndex(0);
        } else {
          // Fallback to straight line
          setRoutedCoords(activeCoords);
          setRouteSteps([]);
        }
      })
      .catch(() => {
        if (!isSubscribed) return;
        setRoutedCoords(activeCoords);
        setRouteSteps([]);
      })
      .finally(() => {
        // done
      });

    return () => {
      isSubscribed = false;
    };
  }, [points, pickupPoint, dropoffPoint]);

  // Render map layers
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    // Clear old layers
    layersRef.current.forEach(l => l.remove());
    layersRef.current = [];

    const allPts: [number, number][] = [];

    // Add waypoints
    points.forEach((p, i) => {
      const m = L.marker([p.lat, p.lng], { icon: makeNumberedIcon(i + 1) });
      if (labels[i]) m.bindTooltip(labels[i], { direction: 'top' });
      m.addTo(map);
      layersRef.current.push(m);
      allPts.push([p.lat, p.lng]);
    });

    // Add Pickup pin
    if (pickupPoint) {
      const m = L.marker([pickupPoint.lat, pickupPoint.lng], { icon: makePinIcon('#10b981', 'P') })
        .bindTooltip('Titik Jemput', { direction: 'top' }).addTo(map);
      layersRef.current.push(m);
      allPts.push([pickupPoint.lat, pickupPoint.lng]);
    }

    // Add Dropoff pin
    if (dropoffPoint) {
      const m = L.marker([dropoffPoint.lat, dropoffPoint.lng], { icon: makePinIcon('#ef4444', 'D') })
        .bindTooltip('Titik Antar', { direction: 'top' }).addTo(map);
      layersRef.current.push(m);
      allPts.push([dropoffPoint.lat, dropoffPoint.lng]);
    }

    // Draw route line (use OSRM routed coords if available, else straight line)
    const drawCoords = routedCoords.length > 0 ? routedCoords : (points.length >= 2 ? points : []);
    if (drawCoords.length >= 2) {
      const isDetour = pickupPoint || dropoffPoint;
      const poly = L.polyline(
        drawCoords.map(p => [p.lat, p.lng] as [number, number]),
        {
          color: isDetour ? '#f97316' : '#2091e7',
          weight: 4,
          opacity: 0.85,
        }
      ).addTo(map);
      layersRef.current.push(poly);
    } else if (pickupPoint && dropoffPoint && routedCoords.length === 0) {
      const line = L.polyline(
        [[pickupPoint.lat, pickupPoint.lng], [dropoffPoint.lat, dropoffPoint.lng]],
        { color: '#f97316', weight: 3, dashArray: '6 4', opacity: 0.7 }
      ).addTo(map);
      layersRef.current.push(line);
    }

    // Fit map bounds only when the pin locations themselves change,
    // NOT when routedCoords is updated (that would reset user pan/zoom).
    const pinKey = JSON.stringify(allPts.filter((_, i) => i < 10));
    const pinsChanged = pinKey !== prevPinKeyRef.current;
    if (pinsChanged) {
      prevPinKeyRef.current = pinKey;
      userHasInteracted.current = false; // reset interaction flag on new route
    }

    if (!userHasInteracted.current) {
      if (allPts.length >= 2) {
        map.fitBounds(allPts, { padding: [35, 35], maxZoom: 15 });
      } else if (allPts.length === 1) {
        map.setView(allPts[0], 14);
      }
    }
  }, [points, labels, pickupPoint, dropoffPoint, routedCoords, ready]);

  // Update GPS dot layer separately to prevent map zoom reset on GPS updates
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    if (gpsMarkerRef.current) {
      gpsMarkerRef.current.remove();
      gpsMarkerRef.current = null;
    }

    if (currentLoc) {
      const gpsIcon = L.divIcon({
        className: '',
        html: `
          <div style="position:relative;width:18px;height:18px;">
            <div style="position:absolute;width:18px;height:18px;border-radius:50%;background:#3b82f6;border:3px solid #fff;box-shadow:0 0 8px rgba(59,130,246,0.8);z-index:2;"></div>
            <div style="position:absolute;width:30px;height:30px;border-radius:50%;background:rgba(59,130,246,0.3);top:-6px;left:-6px;animation:pulsate 2s infinite ease-out;z-index:1;"></div>
          </div>
          <style>
            @keyframes pulsate {
              0% { transform: scale(0.5); opacity: 1; }
              100% { transform: scale(1.5); opacity: 0; }
            }
          </style>
        `,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
      });

      gpsMarkerRef.current = L.marker([currentLoc.lat, currentLoc.lng], { icon: gpsIcon, zIndexOffset: 1000 })
        .bindTooltip('Lokasi Anda', { direction: 'top' })
        .addTo(map);

      // Initial center if map is empty
      if (points.length === 0 && !pickupPoint && !dropoffPoint) {
        map.setView([currentLoc.lat, currentLoc.lng], 14);
      }
    }

    return () => {
      if (gpsMarkerRef.current) {
        gpsMarkerRef.current.remove();
        gpsMarkerRef.current = null;
      }
    };
  }, [currentLoc, points, pickupPoint, dropoffPoint, ready]);

  // Confirm a pending pick on map click
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
      if (tempMarkerRef.current) { tempMarkerRef.current.remove(); tempMarkerRef.current = null; }
      setPendingCoord(null);
      return;
    }

    map.getContainer().style.cursor = 'crosshair';

    const handler = (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      setPendingCoord({ lat, lng });

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
  const currentStep = routeSteps[activeStepIndex];

  return (
    <div style={{ position: 'relative', height, borderRadius: '20px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      {/* Google Maps style Floating Turn-by-Turn HUD */}
      {routeSteps.length > 0 && !pickMode && (
        <div style={{
          position: 'absolute', top: 12, left: 12, right: currentLoc ? 60 : 12,
          background: 'rgba(30, 41, 59, 0.94)', backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.08)',
          color: '#f8fafc', padding: '10px 14px', borderRadius: '16px',
          boxShadow: '0 8px 30px rgba(0,0,0,0.2)', zIndex: 1000,
          display: 'flex', alignItems: 'center', gap: '10px',
          transition: 'all 0.3s ease',
        }}>
          {/* Action Icon */}
          <div style={{
            width: '36px', height: '36px', borderRadius: '10px',
            background: 'rgba(59,130,246,0.2)', border: '1px solid rgba(59,130,246,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#60a5fa', flexShrink: 0,
          }}>
            <span className="material-icons" style={{ fontSize: '20px' }}>
              {getManeuverIcon(currentStep.type, currentStep.modifier)}
            </span>
          </div>

          {/* Direction Text */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', margin: 0, letterSpacing: '0.5px' }}>
              Petunjuk Navigasi ({activeStepIndex + 1}/{routeSteps.length})
            </p>
            <p style={{ fontSize: '12.5px', fontWeight: 600, margin: '2px 0 0', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {currentStep.instruction}
            </p>
          </div>

          {/* Step Distance + Prev/Next Cycle Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
            <span style={{ fontSize: '12px', fontWeight: 800, background: '#334155', padding: '4px 8px', borderRadius: '8px', color: '#38bdf8' }}>
              {currentStep.distance > 1000 ? `${(currentStep.distance / 1000).toFixed(1)} km` : `${Math.round(currentStep.distance)} m`}
            </span>
            <div style={{ display: 'flex', gap: '2px' }}>
              <button
                type="button"
                onClick={() => setActiveStepIndex(prev => Math.max(0, prev - 1))}
                disabled={activeStepIndex === 0}
                style={{
                  background: 'none', border: 'none', color: activeStepIndex === 0 ? '#475569' : '#38bdf8',
                  padding: '4px', cursor: activeStepIndex === 0 ? 'default' : 'pointer', display: 'flex', alignItems: 'center',
                }}
              >
                <span className="material-icons" style={{ fontSize: '18px' }}>chevron_left</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveStepIndex(prev => Math.min(routeSteps.length - 1, prev + 1))}
                disabled={activeStepIndex === routeSteps.length - 1}
                style={{
                  background: 'none', border: 'none', color: activeStepIndex === routeSteps.length - 1 ? '#475569' : '#38bdf8',
                  padding: '4px', cursor: activeStepIndex === routeSteps.length - 1 ? 'default' : 'pointer', display: 'flex', alignItems: 'center',
                }}
              >
                <span className="material-icons" style={{ fontSize: '18px' }}>chevron_right</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Center on GPS button */}
      {currentLoc && !pickMode && (
        <button
          onClick={() => {
            if (mapRef.current && currentLoc) {
              mapRef.current.setView([currentLoc.lat, currentLoc.lng], 15);
            }
          }}
          type="button"
          style={{
            position: 'absolute', top: 12, right: 12,
            width: '40px', height: '40px', borderRadius: '50%',
            background: '#ffffff', border: '1px solid #cbd5e1',
            boxShadow: '0 4px 14px rgba(0,0,0,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', zIndex: 1000, color: '#2091e7',
            transition: 'background 0.2s',
          }}
        >
          <span className="material-icons" style={{ fontSize: '20px' }}>my_location</span>
        </button>
      )}

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
