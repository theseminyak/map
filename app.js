const HOTEL = {
  name: "The Seminyak Beach Resort & Spa",
  location: { lat: -8.68588, lng: 115.1541 },
};

const INITIAL_MAP_VIEW = {
  center: { lat: -8.6833, lng: 115.1591 },
  zoom: 50,
};

const ROUTING_SERVERS = {
  DRIVING: "https://routing.openstreetmap.de/routed-car",
  WALKING: "https://routing.openstreetmap.de/routed-foot",
  BICYCLING: "https://routing.openstreetmap.de/routed-bike",
};

const OSM_ENGINES = {
  DRIVING: "fossgis_osrm_car",
  WALKING: "fossgis_osrm_foot",
  BICYCLING: "fossgis_osrm_bike",
};

const MODE_LABELS = {
  DRIVING: "car",
  TRANSIT: "public transport",
  WALKING: "walking",
  BICYCLING: "bicycle",
};

const GEOCODE_CACHE_KEY = "seminyak-geocode-cache-v1";
const CACHE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

let map;
let routeLayer = null;
let originMarker = null;
let selectedMode = "DRIVING";

const elements = {
  addressInput: document.querySelector("#address-input"),
  calculateButton: document.querySelector("#calculate-button"),
  routeStatus: document.querySelector("#route-status"),
  routeResult: document.querySelector("#route-result"),
  routeDuration: document.querySelector("#route-duration"),
  routeDistance: document.querySelector("#route-distance"),
  openStreetMapLink: document.querySelector("#openstreetmap-link"),
};

function setStatus(message, isError = false) {
  elements.routeStatus.textContent = message;
  elements.routeStatus.classList.toggle("error", isError);
}

function makeHotelIcon() {
  return L.divIcon({
    className: "custom-map-icon",
    html: '<div class="hotel-pin"></div>',
    iconSize: [35, 44],
    iconAnchor: [17, 42],
    tooltipAnchor: [0, -38],
  });
}

function makeOriginIcon() {
  return L.divIcon({
    className: "custom-map-icon",
    html: '<div class="origin-pin"></div>',
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

function initializeMap() {
  if (!window.L) {
    setStatus("The map library could not load. Please refresh the page.", true);
    return;
  }

  map = L.map("map", {
    center: [INITIAL_MAP_VIEW.center.lat, INITIAL_MAP_VIEW.center.lng],
    zoom: INITIAL_MAP_VIEW.zoom,
    zoomControl: false,
    attributionControl: true,
    scrollWheelZoom: false,
  });

  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
  }).addTo(map);

  L.marker([HOTEL.location.lat, HOTEL.location.lng], {
    icon: makeHotelIcon(),
    title: HOTEL.name,
  })
    .addTo(map)
    .bindTooltip(HOTEL.name, { direction: "top", offset: [0, -33] });
}

function normalizeQuery(query) {
  return query.trim().toLocaleLowerCase("en").replace(/\s+/g, " ");
}

function getCachedLocation(query) {
  try {
    const cache = JSON.parse(localStorage.getItem(GEOCODE_CACHE_KEY) || "{}");
    const cached = cache[normalizeQuery(query)];
    if (!cached || Date.now() - cached.savedAt > CACHE_MAX_AGE) return null;
    return cached;
  } catch {
    return null;
  }
}

function cacheLocation(query, location) {
  try {
    const cache = JSON.parse(localStorage.getItem(GEOCODE_CACHE_KEY) || "{}");
    const entries = Object.entries(cache)
      .filter(([, item]) => Date.now() - item.savedAt <= CACHE_MAX_AGE)
      .slice(-19);
    const nextCache = Object.fromEntries(entries);
    nextCache[normalizeQuery(query)] = { ...location, savedAt: Date.now() };
    localStorage.setItem(GEOCODE_CACHE_KEY, JSON.stringify(nextCache));
  } catch {
    // The route still works when browser storage is unavailable.
  }
}

async function geocodeAddress(query) {
  const cached = getCachedLocation(query);
  if (cached) return cached;

  const params = new URLSearchParams({
    format: "jsonv2",
    q: query,
    limit: "1",
    countrycodes: "id",
    addressdetails: "0",
  });

  const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error("GEOCODING_UNAVAILABLE");

  const results = await response.json();
  if (!results.length) throw new Error("ADDRESS_NOT_FOUND");

  const location = {
    lat: Number(results[0].lat),
    lng: Number(results[0].lon),
    label: results[0].display_name,
  };
  cacheLocation(query, location);
  return location;
}

async function fetchRoute(origin) {
  const server = ROUTING_SERVERS[selectedMode];
  if (!server) throw new Error("TRANSIT_UNAVAILABLE");

  const coordinates = `${origin.lng},${origin.lat};${HOTEL.location.lng},${HOTEL.location.lat}`;
  const params = new URLSearchParams({
    overview: "full",
    geometries: "geojson",
    steps: "false",
  });
  const response = await fetch(`${server}/route/v1/driving/${coordinates}?${params}`);
  if (!response.ok) throw new Error("ROUTING_UNAVAILABLE");

  const result = await response.json();
  if (result.code !== "Ok" || !result.routes?.length) throw new Error("NO_ROUTE");
  return result.routes[0];
}

function clearRoute() {
  if (routeLayer) map.removeLayer(routeLayer);
  if (originMarker) map.removeLayer(originMarker);
  routeLayer = null;
  originMarker = null;
  elements.routeResult.hidden = true;
}

function drawRoute(origin, route) {
  clearRoute();

  routeLayer = L.geoJSON(route.geometry, {
    style: {
      color: "#252525",
      opacity: 0.9,
      weight: 5,
      lineCap: "round",
      lineJoin: "round",
    },
  }).addTo(map);

  originMarker = L.marker([origin.lat, origin.lng], {
    icon: makeOriginIcon(),
    title: origin.label || "Starting point",
  }).addTo(map);

  map.fitBounds(routeLayer.getBounds(), {
    padding: window.innerWidth < 760 ? [42, 42] : [70, 70],
  });
}

function formatDuration(seconds) {
  const totalMinutes = Math.max(1, Math.round(seconds / 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (!hours) return `${minutes} min`;
  if (!minutes) return `${hours} hr`;
  return `${hours} hr ${minutes} min`;
}

function formatDistance(meters) {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toLocaleString("en", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })} km`;
}

function buildOpenStreetMapUrl(origin) {
  const engine = OSM_ENGINES[selectedMode];
  const params = new URLSearchParams({
    engine,
    route: `${origin.lat},${origin.lng};${HOTEL.location.lat},${HOTEL.location.lng}`,
  });
  return `https://www.openstreetmap.org/directions?${params.toString()}#map=12/${HOTEL.location.lat}/${HOTEL.location.lng}`;
}

async function calculateRoute() {
  const query = elements.addressInput.value.trim();
  if (!query) {
    elements.addressInput.focus();
    setStatus("Enter your address location first.", true);
    return;
  }

  if (selectedMode === "TRANSIT") {
    setStatus(
      "Public transport is not available on the free OSM routing server. Choose car, walking or bicycle.",
      true,
    );
    return;
  }

  elements.calculateButton.disabled = true;
  elements.calculateButton.textContent = "Calculating…";
  setStatus("Finding your location and route…");

  try {
    const origin = await geocodeAddress(query);
    const route = await fetchRoute(origin);
    drawRoute(origin, route);

    elements.routeDuration.textContent = formatDuration(route.duration);
    elements.routeDistance.textContent = formatDistance(route.distance);
    elements.openStreetMapLink.href = buildOpenStreetMapUrl(origin);
    elements.routeResult.hidden = false;
    setStatus("");
  } catch (error) {
    console.error(error);
    const messages = {
      ADDRESS_NOT_FOUND: "Address not found. Add the city or area name and try again.",
      GEOCODING_UNAVAILABLE: "Address search is temporarily unavailable. Please try again shortly.",
      ROUTING_UNAVAILABLE: "The free routing service is temporarily unavailable. Please try again shortly.",
      NO_ROUTE: `No ${MODE_LABELS[selectedMode]} route was found. Try another travel mode.`,
    };
    setStatus(messages[error.message] || "The route could not be calculated. Please try again.", true);
  } finally {
    elements.calculateButton.disabled = false;
    elements.calculateButton.textContent = "Calculate route";
  }
}

document.querySelectorAll(".mode-button").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".mode-button").forEach((item) => {
      const active = item === button;
      item.classList.toggle("active", active);
      item.setAttribute("aria-pressed", String(active));
    });
    selectedMode = button.dataset.mode;
    clearRoute();
    setStatus("");
  });
});

elements.calculateButton.addEventListener("click", calculateRoute);
elements.addressInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    calculateRoute();
  }
});

initializeMap();
