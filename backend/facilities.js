const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function toLocationLabel(input = {}) {
  const fallbackText = normalizeText(input.locationText);
  if (fallbackText) return fallbackText;

  const parts = [input.city, input.district, input.state]
    .map((value) => normalizeText(value))
    .filter(Boolean);

  return parts.join(', ');
}

function toGoogleMapsLink(query) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function toOpenStreetMapLink(lat, lon) {
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=16/${lat}/${lon}`;
}

function toRadians(value) {
  return (value * Math.PI) / 180;
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

async function fetchNominatim(path) {
  const response = await fetch(`${NOMINATIM_BASE_URL}${path}`, {
    headers: {
      'User-Agent': 'Nirogya/1.0 (health-assistant)',
      'Accept-Language': 'en'
    }
  });

  if (!response.ok) {
    throw new Error(`Nominatim request failed (${response.status})`);
  }

  return response.json();
}

async function geocodeLocation(locationLabel) {
  const encoded = encodeURIComponent(locationLabel);
  const payload = await fetchNominatim(
    `/search?format=jsonv2&limit=1&q=${encoded}`
  );

  if (!Array.isArray(payload) || payload.length === 0) return null;
  const first = payload[0];
  const lat = Number(first.lat);
  const lon = Number(first.lon);

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  return {
    lat,
    lon,
    displayName: normalizeText(first.display_name) || locationLabel
  };
}

function getSearchTermsByRisk(riskLevel = 'medium') {
  if (riskLevel === 'high') {
    return [
      'emergency hospital',
      'multi specialty hospital',
      'government hospital'
    ];
  }

  if (riskLevel === 'low') {
    return ['clinic', 'general physician clinic', 'health center'];
  }

  return ['hospital', 'clinic', 'diagnostic center'];
}

function classifyFacilityType(name = '', riskLevel = 'medium') {
  const normalized = name.toLowerCase();
  if (normalized.includes('emergency')) return 'Emergency';
  if (normalized.includes('clinic')) return 'Clinic';
  if (normalized.includes('diagnostic')) return 'Diagnostic Center';
  if (riskLevel === 'high') return 'Hospital';
  if (riskLevel === 'low') return 'Clinic';
  return 'Hospital';
}

async function queryOpenStreetMapFacilities(locationLabel, riskLevel, limit) {
  const center = await geocodeLocation(locationLabel);
  if (!center) return [];

  const terms = getSearchTermsByRisk(riskLevel);
  const rows = [];

  for (const term of terms) {
    const encoded = encodeURIComponent(`${term} near ${locationLabel}`);
    const result = await fetchNominatim(
      `/search?format=jsonv2&limit=8&q=${encoded}`
    );

    if (!Array.isArray(result)) continue;

    for (const item of result) {
      const name = normalizeText(item.display_name).split(',')[0] || term;
      const address = normalizeText(item.display_name) || locationLabel;
      const lat = Number(item.lat);
      const lon = Number(item.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;

      rows.push({
        name,
        address,
        lat,
        lon,
        distanceKm: Number(haversineKm(center.lat, center.lon, lat, lon).toFixed(1))
      });

      if (rows.length >= Math.max(limit * 2, 8)) {
        break;
      }
    }

    if (rows.length >= Math.max(limit * 2, 8)) {
      break;
    }
  }

  const deduped = [];
  const seen = new Set();

  for (const row of rows) {
    const key = `${row.name.toLowerCase()}|${row.address.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(row);
  }

  return deduped.slice(0, limit).map((row, index) => ({
    id: `osm-${index + 1}-${Buffer.from(row.name).toString('hex').slice(0, 10)}`,
    name: row.name,
    facilityType: classifyFacilityType(row.name, riskLevel),
    distanceKm: row.distanceKm,
    address: row.address,
    contact: null,
    mapUrl: toOpenStreetMapLink(row.lat, row.lon),
    source: 'openstreetmap'
  }));
}

function buildFallbackFacilities(locationLabel, riskLevel = 'medium', limit = 3) {
  const presetsByRisk = {
    high: [
      { name: 'Emergency Hospital', facilityType: 'Emergency' },
      { name: 'Government General Hospital', facilityType: 'Hospital' },
      { name: '24x7 Trauma Center', facilityType: 'Emergency' }
    ],
    medium: [
      { name: 'General Hospital', facilityType: 'Hospital' },
      { name: 'Nearby Clinic', facilityType: 'Clinic' },
      { name: 'Diagnostic Center', facilityType: 'Diagnostic Center' }
    ],
    low: [
      { name: 'General Physician Clinic', facilityType: 'Clinic' },
      { name: 'Community Health Center', facilityType: 'Health Center' },
      { name: 'Teleconsult Support Center', facilityType: 'Teleconsultation' }
    ]
  };

  const selected = presetsByRisk[riskLevel] || presetsByRisk.medium;

  return selected.slice(0, limit).map((item, index) => {
    const query = `${item.name} near ${locationLabel}`;
    return {
      id: `fallback-${index + 1}`,
      name: item.name,
      facilityType: item.facilityType,
      distanceKm: null,
      address: `Near ${locationLabel}`,
      contact: null,
      mapUrl: toGoogleMapsLink(query),
      source: 'map-search-fallback'
    };
  });
}

async function getNearbyFacilities({
  city,
  district,
  state,
  locationText,
  riskLevel = 'medium',
  limit = 3
} = {}) {
  const safeLimit = Number.isFinite(Number(limit))
    ? Math.max(1, Math.min(Number(limit), 8))
    : 3;

  const locationLabel = toLocationLabel({ city, district, state, locationText });

  if (!locationLabel) {
    return [];
  }

  try {
    const osmFacilities = await queryOpenStreetMapFacilities(
      locationLabel,
      riskLevel,
      safeLimit
    );
    if (osmFacilities.length > 0) {
      return osmFacilities;
    }
  } catch (err) {
    console.warn('[Facilities] OpenStreetMap lookup fallback:', err?.message || err);
  }

  return buildFallbackFacilities(locationLabel, riskLevel, safeLimit);
}

module.exports = {
  getNearbyFacilities
};
