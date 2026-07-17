const HOTEL = {
  name: "The Seminyak Beach Resort & Spa",
  location: { lat: -8.68588, lng: 115.1541 },
};

const MODE_LABELS = {
  DRIVING: "car",
  TRANSIT: "public transport",
  WALKING: "walking",
  BICYCLING: "bicycle",
};

let map;
let Route;
let AdvancedMarkerElement;
let selectedOrigin = null;
let selectedMode = "DRIVING";
let routePolylines = [];
let originMarker = null;

const elements = {
  map: document.querySelector("#map"),
  mapPlaceholder: document.querySelector("#map-placeholder"),
  mapSetup: document.querySelector("#map-setup"),
  autocompleteContainer: document.querySelector("#autocomplete-container"),
  calculateButton: document.querySelector("#calculate-button"),
  routeStatus: document.querySelector("#route-status"),
  routeResult: document.querySelector("#route-result"),
  routeDuration: document.querySelector("#route-duration"),
  routeDistance: document.querySelector("#route-distance"),
  googleMapsLink: document.querySelector("#google-maps-link"),
};

function getApiKey() {
  return window.SEMINYAK_CONFIG?.googleMapsApiKey?.trim() || "";
}

function hasUsableApiKey(apiKey) {
  return apiKey && !apiKey.includes("PASTE_YOUR") && apiKey.length > 20;
}

function loadGoogleMaps(apiKey) {
  return new Promise((resolve, reject) => {
    const callbackName = `initSeminyakMap_${Date.now()}`;
    const script = document.createElement("script");
    const params = new URLSearchParams({
      key: apiKey,
      v: "weekly",
      loading: "async",
      libraries: "maps,marker,places,routes",
      language: "en",
      region: "ID",
      auth_referrer_policy: "origin",
      callback: callbackName,
    });

    window[callbackName] = () => {
      delete window[callbackName];
      resolve(window.google.maps);
    };

    script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
    script.async = true;
    script.onerror = () => {
      delete window[callbackName];
      reject(new Error("Google Maps could not load."));
    };
    document.head.appendChild(script);
  });
}

function setStatus(message, isError = false) {
  elements.routeStatus.textContent = message;
  elements.routeStatus.classList.toggle("error", isError);
}

function clearRoute() {
  routePolylines.forEach((polyline) => polyline.setMap(null));
  routePolylines = [];
  elements.routeResult.hidden = true;
}

function createPin(className, title) {
  const pin = document.createElement("div");
  pin.className = className;
  pin.title = title;
  return pin;
}

function updateOriginMarker(location, title) {
  if (originMarker) originMarker.map = null;
  originMarker = new AdvancedMarkerElement({
    map,
    position: location,
    title,
    content: createPin("origin-pin", title),
  });
}

async function initializeMap() {
  const [{ Map }, markerLibrary, placesLibrary, routesLibrary] = await Promise.all([
    google.maps.importLibrary("maps"),
    google.maps.importLibrary("marker"),
    google.maps.importLibrary("places"),
    google.maps.importLibrary("routes"),
  ]);

  AdvancedMarkerElement = markerLibrary.AdvancedMarkerElement;
  Route = routesLibrary.Route;

  map = new Map(elements.map, {
    center: { lat: -8.44, lng: 115.08 },
    zoom: 9,
    mapId: "DEMO_MAP_ID",
    disableDefaultUI: true,
    gestureHandling: "cooperative",
  });

  new AdvancedMarkerElement({
    map,
    position: HOTEL.location,
    title: HOTEL.name,
    content: createPin("hotel-pin", HOTEL.name),
  });

  const placeAutocomplete = new placesLibrary.PlaceAutocompleteElement();
  placeAutocomplete.placeholder = "| Your address location";
  placeAutocomplete.includedRegionCodes = ["id"];
  placeAutocomplete.locationBias = { center: HOTEL.location, radius: 80000 };

  placeAutocomplete.addEventListener("gmp-select", async ({ placePrediction }) => {
    try {
      const place = placePrediction.toPlace();
      await place.fetchFields({
        fields: ["displayName", "formattedAddress", "location"],
      });

      if (!place.location) throw new Error("The selected place has no coordinates.");

      selectedOrigin = place;
      clearRoute();
      updateOriginMarker(place.location, place.displayName || "Starting point");
      elements.calculateButton.disabled = false;
      setStatus("");
    } catch (error) {
      console.error(error);
      setStatus("Please select another address from the suggestions.", true);
    }
  });

  elements.autocompleteContainer.replaceChildren(placeAutocomplete);
  elements.mapPlaceholder.hidden = true;
  elements.mapSetup.hidden = true;
}

function getOriginLocation() {
  if (!selectedOrigin) return null;
  return selectedOrigin.location || selectedOrigin;
}

function formatDuration(milliseconds) {
  const totalMinutes = Math.max(1, Math.round(milliseconds / 60000));
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

function buildGoogleMapsUrl() {
  const origin = getOriginLocation();
  const originLat = typeof origin.lat === "function" ? origin.lat() : origin.lat;
  const originLng = typeof origin.lng === "function" ? origin.lng() : origin.lng;
  const travelMode = {
    DRIVING: "driving",
    TRANSIT: "transit",
    WALKING: "walking",
    BICYCLING: "bicycling",
  }[selectedMode];

  const params = new URLSearchParams({
    api: "1",
    origin: `${originLat},${originLng}`,
    destination: `${HOTEL.location.lat},${HOTEL.location.lng}`,
    travelmode: travelMode,
  });
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

async function calculateRoute() {
  if (!selectedOrigin || !Route) {
    setStatus("Select your address from the suggestions first.", true);
    return;
  }

  clearRoute();
  elements.calculateButton.disabled = true;
  elements.calculateButton.textContent = "Calculating…";
  setStatus("");

  try {
    const { routes } = await Route.computeRoutes({
      origin: selectedOrigin,
      destination: HOTEL.location,
      travelMode: selectedMode,
      region: "id",
      units: "METRIC",
      fields: ["path", "distanceMeters", "durationMillis"],
    });

    if (!routes?.length) throw new Error("NO_ROUTES");

    const route = routes[0];
    routePolylines = route.createPolylines();
    routePolylines.forEach((polyline) => {
      polyline.setOptions({
        strokeColor: "#252525",
        strokeOpacity: 0.9,
        strokeWeight: 5,
      });
      polyline.setMap(map);
    });

    const bounds = new google.maps.LatLngBounds();
    route.path.forEach((point) => bounds.extend(point));
    map.fitBounds(bounds, window.innerWidth < 760 ? 42 : 70);

    elements.routeDuration.textContent = formatDuration(route.durationMillis);
    elements.routeDistance.textContent = formatDistance(route.distanceMeters);
    elements.googleMapsLink.href = buildGoogleMapsUrl();
    elements.routeResult.hidden = false;
  } catch (error) {
    console.error(error);
    setStatus(`No ${MODE_LABELS[selectedMode]} route was found. Please try another travel mode.`, true);
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
    if (selectedOrigin && !elements.routeResult.hidden) calculateRoute();
  });
});

elements.calculateButton.addEventListener("click", calculateRoute);

async function start() {
  const apiKey = getApiKey();
  if (!hasUsableApiKey(apiKey)) {
    elements.mapSetup.hidden = false;
    setStatus("Add the Google Maps API key to activate address search and route calculation.");
    return;
  }

  try {
    await loadGoogleMaps(apiKey);
    await initializeMap();
  } catch (error) {
    console.error(error);
    elements.mapSetup.hidden = false;
    elements.mapSetup.innerHTML =
      "Google Maps could not load. Check the API key, billing and website restrictions.";
    setStatus("Google Maps could not load. Please check the Google Cloud configuration.", true);
  }
}

start();
