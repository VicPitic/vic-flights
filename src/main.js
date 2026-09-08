import Globe from 'globe.gl';
import * as THREE from 'three';
import './style.css';
import { AIRPORTS, FLIGHTS } from './data/flights';

/* ─────────────────────────────────────────────────────────
 * ANIMATION STORYBOARD
 *
 *    0ms   globe and star field establish the scene
 *   80ms   identity panel settles into place
 *  160ms   archive note finishes the entrance
 *  900ms   selected journey glides into view
 * continuous flight dashes and aircraft travel origin → destination
 * ───────────────────────────────────────────────────────── */

const TIMING = {
  routeFocus: 900,
  panelTransition: 210,
  arcTravel: 4600,
  planeTravel: 14500
};

const PLANE = {
  tangentLead: 0.004,
  scale: 1.35,
  selectedScale: 1.75
};

const YEAR_COLORS = {
  2023: '#ff9966',
  2024: '#ff6f61',
  2025: '#ffd966',
  2026: '#ffcc00'
};

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const dom = {
  globe: document.getElementById('globeViz'),
  segmentCount: document.getElementById('segmentCount'),
  segmentLabel: document.getElementById('segmentLabel'),
  journeyCount: document.getElementById('journeyCount'),
  journeyLabel: document.getElementById('journeyLabel'),
  airportCount: document.getElementById('airportCount'),
  airportLabel: document.getElementById('airportLabel'),
  countryCount: document.getElementById('countryCount'),
  countryLabel: document.getElementById('countryLabel'),
  distanceCount: document.getElementById('distanceCount'),
  airtimeCount: document.getElementById('airtimeCount'),
  yearButtons: [...document.querySelectorAll('.year-button')],
  journeySelect: document.getElementById('journeySelect'),
  motionToggle: document.getElementById('motionToggle'),
  motionToggleLabel: document.getElementById('motionToggleLabel'),
  routePanel: document.getElementById('routePanel'),
  panelEyebrow: document.getElementById('panelEyebrow'),
  panelContent: document.getElementById('panelContent'),
  closePanel: document.getElementById('closePanel')
};

const state = {
  year: 'all',
  selectedTripId: null,
  motionPaused: reduceMotion
};

const segmentData = FLIGHTS.flatMap((trip) =>
  trip.segments.map((segment, segmentIndex) => ({
    ...segment,
    segmentIndex,
    tripId: trip.id,
    tripName: trip.name,
    year: trip.year,
    start: AIRPORTS[segment.from],
    end: AIRPORTS[segment.to]
  }))
);

const airportData = Object.values(AIRPORTS).map((airport) => ({
  ...airport,
  visits: segmentData.filter((segment) => segment.from === airport.code || segment.to === airport.code).length
}));

const planeObjects = new Map();
const planeGeometries = createPlaneGeometries();
let planeProgress = 0;
let lastPlaneFrame = performance.now();

const globe = Globe()(dom.globe)
  .globeImageUrl('//unpkg.com/three-globe/example/img/earth-night.jpg')
  .bumpImageUrl('//unpkg.com/three-globe/example/img/earth-topology.png')
  .backgroundColor('rgba(0,0,0,0)')
  .showAtmosphere(true)
  .atmosphereColor('#ff9966')
  .atmosphereAltitude(0.16)
  .arcStartLat((segment) => segment.start.lat)
  .arcStartLng((segment) => segment.start.lng)
  .arcEndLat((segment) => segment.end.lat)
  .arcEndLng((segment) => segment.end.lng)
  .arcColor((segment) => getArcColor(segment))
  .arcAltitudeAutoScale(0.31)
  .arcStroke((segment) => (segment.tripId === state.selectedTripId ? 0.72 : 0.34))
  .arcDashLength(0.46)
  .arcDashGap(0.12)
  .arcDashInitialGap((segment) => segment.segmentIndex * 0.17)
  .arcDashAnimateTime(reduceMotion ? 0 : TIMING.arcTravel)
  .arcsTransitionDuration(0)
  .arcLabel((segment) => routeTooltip(segment))
  .onArcClick((segment) => selectTrip(segment.tripId, true))
  .pointLat('lat')
  .pointLng('lng')
  .pointColor((airport) => (airport.code === 'CLJ' ? '#ffcc00' : '#fff3dc'))
  .pointAltitude((airport) => (airport.code === 'CLJ' ? 0.028 : 0.018))
  .pointRadius((airport) => (airport.code === 'CLJ' ? 0.34 : Math.min(0.24, 0.1 + airport.visits * 0.018)))
  .pointResolution(18)
  .pointLabel((airport) => airportTooltip(airport))
  .onPointClick((airport) => selectLatestTripForAirport(airport.code))
  .ringsData([{ ...AIRPORTS.CLJ, color: '#ffcc00' }])
  .ringColor((ring) => (time) => `rgba(255, 204, 0, ${Math.max(0, 0.42 - time)})`)
  .ringMaxRadius(2.3)
  .ringPropagationSpeed(reduceMotion ? 0 : 0.8)
  .ringRepeatPeriod(reduceMotion ? 0 : 1600)
  .customLayerData([])
  .customThreeObject((segment) => createPlaneObject(segment));

const controls = globe.controls();
controls.enableDamping = true;
controls.dampingFactor = 0.065;
controls.rotateSpeed = 0.48;
controls.zoomSpeed = 0.68;
controls.noPan = true;
controls.autoRotate = !reduceMotion;
controls.autoRotateSpeed = 0.22;

const scene = globe.scene();
scene.background = new THREE.Color('#160807');
scene.add(new THREE.AmbientLight(0xffffff, 0.92));
addStarfield(scene);

setupJourneySelect();
bindEvents();
syncMotionToggle();
resizeGlobe();
applyFilter();
globe.pointOfView({ lat: 34, lng: 20, altitude: 2.25 });
requestAnimationFrame(animatePlanes);

requestAnimationFrame(() => {
  document.body.dataset.ready = 'true';
});

function bindEvents() {
  dom.yearButtons.forEach((button) => {
    button.addEventListener('click', () => {
      state.year = button.dataset.year;
      state.selectedTripId = null;
      applyFilter();
      renderEmptyPanel();
    });
  });

  dom.journeySelect.addEventListener('change', () => {
    if (dom.journeySelect.value) {
      selectTrip(dom.journeySelect.value, true);
    }
  });

  dom.closePanel.addEventListener('click', clearSelection);
  dom.motionToggle.addEventListener('click', toggleMotion);
  window.addEventListener('resize', resizeGlobe);
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && state.selectedTripId) {
      clearSelection();
    }
  });

  dom.globe.addEventListener('pointerdown', () => {
    controls.autoRotate = false;
  });

  document.addEventListener('visibilitychange', () => {
    lastPlaneFrame = performance.now();
  });
}

function toggleMotion() {
  state.motionPaused = !state.motionPaused;
  controls.autoRotate = !state.motionPaused && !state.selectedTripId;
  globe.arcDashAnimateTime(state.motionPaused ? 0 : TIMING.arcTravel);
  lastPlaneFrame = performance.now();
  syncMotionToggle();
}

function syncMotionToggle() {
  dom.motionToggle.setAttribute('aria-pressed', String(state.motionPaused));
  dom.motionToggleLabel.textContent = state.motionPaused ? 'play motion' : 'pause motion';
}

function setupJourneySelect() {
  [...FLIGHTS].reverse().forEach((trip) => {
    const option = document.createElement('option');
    option.value = trip.id;
    option.textContent = `${trip.year} · ${trip.name}`;
    dom.journeySelect.append(option);
  });
}

function applyFilter() {
  const visibleTrips = state.year === 'all'
    ? FLIGHTS
    : FLIGHTS.filter((trip) => (state.year === 'future' ? trip.future : String(trip.year) === state.year));
  const visibleIds = new Set(visibleTrips.map((trip) => trip.id));
  const visibleSegments = segmentData.filter((segment) => visibleIds.has(segment.tripId));
  const visibleAirportCodes = new Set(visibleSegments.flatMap((segment) => [segment.from, segment.to]));
  const visibleAirports = airportData.filter((airport) => visibleAirportCodes.has(airport.code));
  const visibleCountries = new Set(visibleAirports.map((airport) => airport.country));
  const distance = getSegmentsDistance(visibleSegments);
  const airtime = getSegmentsAirtime(visibleSegments);

  dom.yearButtons.forEach((button) => {
    const active = button.dataset.year === state.year;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  });

  [...dom.journeySelect.options].forEach((option) => {
    if (!option.value) return;
    option.hidden = !visibleIds.has(option.value);
  });
  dom.journeySelect.value = '';

  dom.segmentCount.textContent = visibleSegments.length;
  dom.journeyCount.textContent = visibleTrips.length;
  dom.airportCount.textContent = visibleAirports.length;
  dom.countryCount.textContent = visibleCountries.size;
  dom.distanceCount.textContent = formatDistance(distance);
  dom.airtimeCount.textContent = formatDuration(airtime);
  dom.segmentLabel.textContent = visibleSegments.length === 1 ? 'flight leg' : 'flight legs';
  dom.journeyLabel.textContent = visibleTrips.length === 1 ? 'journey' : 'journeys';
  dom.airportLabel.textContent = visibleAirports.length === 1 ? 'airport' : 'airports';
  dom.countryLabel.textContent = visibleCountries.size === 1 ? 'country' : 'countries';

  globe.arcsData(visibleSegments).pointsData(visibleAirports);
  refreshPlanes(visibleSegments);
}

function selectTrip(tripId, moveGlobe = false) {
  const trip = FLIGHTS.find((entry) => entry.id === tripId);
  if (!trip) return;

  const tripMatchesFilter = state.year === 'all' || (state.year === 'future' ? trip.future : String(trip.year) === state.year);
  if (!tripMatchesFilter) {
    state.year = 'all';
    applyFilter();
  }

  state.selectedTripId = tripId;
  dom.journeySelect.value = tripId;
  controls.autoRotate = false;
  globe.arcsData([...globe.arcsData()]);
  refreshPlanes(globe.arcsData());
  renderTripPanel(trip);

  if (moveGlobe) {
    const focus = getTripFocus(trip);
    globe.pointOfView(focus, reduceMotion ? 0 : TIMING.routeFocus);
  }
}

function clearSelection() {
  state.selectedTripId = null;
  dom.journeySelect.value = '';
  controls.autoRotate = !state.motionPaused;
  globe.arcsData([...globe.arcsData()]);
  refreshPlanes(globe.arcsData());
  renderEmptyPanel();
}

function renderTripPanel(trip) {
  const tripSegments = trip.segments.map((segment) => ({
    ...segment,
    start: AIRPORTS[segment.from],
    end: AIRPORTS[segment.to]
  }));
  const tripDistance = getSegmentsDistance(tripSegments);
  const tripAirtime = getSegmentsAirtime(tripSegments);

  dom.routePanel.classList.remove('is-empty');
  dom.routePanel.setAttribute('aria-hidden', 'false');
  dom.panelEyebrow.textContent = `${trip.year} journey`;
  dom.closePanel.hidden = false;
  dom.panelContent.innerHTML = `
    <div class="trip-title-row">
      <div>
        <h2>${escapeHtml(trip.name)}</h2>
      </div>
    </div>
    <dl class="trip-stats" aria-label="Journey statistics">
      <div>
        <dt>distance</dt>
        <dd>${formatDistance(tripDistance)} km</dd>
      </div>
      <div>
        <dt>est. airtime</dt>
        <dd>${formatDuration(tripAirtime)}</dd>
      </div>
      <div>
        <dt>flight legs</dt>
        <dd>${trip.segments.length}</dd>
      </div>
    </dl>
    <ol class="segment-list" aria-label="Flight legs">
      ${trip.segments.map((segment, index) => segmentMarkup(segment, index, trip.segments.length)).join('')}
    </ol>
  `;
  animatePanel();
}

function renderEmptyPanel() {
  dom.routePanel.classList.add('is-empty');
  dom.routePanel.setAttribute('aria-hidden', 'true');
  dom.panelEyebrow.textContent = 'Route details';
  dom.closePanel.hidden = true;
  dom.panelContent.innerHTML = `
    <h2>Choose a route</h2>
    <p>Drag the globe, select an arc, or use the journey picker to open a complete itinerary.</p>
  `;
  animatePanel();
}

function segmentMarkup(segment, index, total) {
  const from = AIRPORTS[segment.from];
  const to = AIRPORTS[segment.to];
  const distance = haversine(from, to);
  const airtime = estimateAirtime(distance);
  return `
    <li class="segment-item" style="--segment-index: ${index}">
      <div class="segment-rail" aria-hidden="true">
        <span class="segment-node"></span>
        ${index < total - 1 ? '<span class="segment-connector"></span>' : ''}
      </div>
      <div class="segment-copy">
        <div class="segment-route">
          <strong>${escapeHtml(segment.from)}</strong>
          <span aria-hidden="true">→</span>
          <strong>${escapeHtml(segment.to)}</strong>
        </div>
        <p>${escapeHtml(from.city)} to ${escapeHtml(to.city)} · ${formatDistance(distance)} km · ${formatDuration(airtime)}</p>
      </div>
    </li>
  `;
}

function animatePanel() {
  if (reduceMotion) return;
  dom.panelContent.animate(
    [
      { opacity: 0, transform: 'translateY(8px)' },
      { opacity: 1, transform: 'translateY(0)' }
    ],
    { duration: TIMING.panelTransition, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' }
  );
}

function selectLatestTripForAirport(code) {
  const trip = [...FLIGHTS].reverse().find((entry) => entry.segments.some((segment) => segment.from === code || segment.to === code));
  if (trip) selectTrip(trip.id, true);
}

function getTripFocus(trip) {
  const airports = trip.segments.flatMap((segment) => [AIRPORTS[segment.from], AIRPORTS[segment.to]]);
  const lat = airports.reduce((sum, airport) => sum + airport.lat, 0) / airports.length;
  const lng = airports.reduce((sum, airport) => sum + airport.lng, 0) / airports.length;
  const distance = trip.segments.reduce((sum, segment) => sum + haversine(AIRPORTS[segment.from], AIRPORTS[segment.to]), 0);
  return { lat, lng, altitude: distance > 9000 ? 2.25 : distance > 3500 ? 1.9 : 1.52 };
}

function getArcColor(segment) {
  const color = YEAR_COLORS[segment.year];
  if (segment.tripId === state.selectedTripId) return color;
  if (state.selectedTripId) return hexToRgba(color, 0.34);
  return hexToRgba(color, 0.85);
}

function hexToRgba(hex, alpha) {
  const value = Number.parseInt(hex.slice(1), 16);
  const red = (value >> 16) & 255;
  const green = (value >> 8) & 255;
  const blue = value & 255;
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function routeTooltip(segment) {
  return `<div class="map-tooltip"><span>${segment.year} · ${escapeHtml(segment.tripName)}</span><strong>${escapeHtml(segment.from)} → ${escapeHtml(segment.to)}</strong></div>`;
}

function airportTooltip(airport) {
  return `<div class="map-tooltip"><span>${escapeHtml(airport.country)}</span><strong>${escapeHtml(airport.code)} · ${escapeHtml(airport.city)}</strong><small>${airport.visits} mapped flight ${airport.visits === 1 ? 'leg' : 'legs'}</small></div>`;
}

function resizeGlobe() {
  globe.width(window.innerWidth).height(window.innerHeight);
}

function refreshPlanes(segments) {
  planeObjects.clear();
  globe.customLayerData(segments);
}

function createPlaneObject(segment) {
  const color = YEAR_COLORS[segment.year];
  const selected = segment.tripId === state.selectedTripId;
  const bodyMaterial = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: selected ? 0.5 : 0.24,
    metalness: 0.34,
    roughness: 0.5,
    side: THREE.DoubleSide
  });
  const cockpitMaterial = new THREE.MeshStandardMaterial({
    color: '#2a1511',
    metalness: 0.15,
    roughness: 0.3
  });
  const plane = new THREE.Group();

  const fuselage = new THREE.Mesh(planeGeometries.fuselage, bodyMaterial);
  const nose = new THREE.Mesh(planeGeometries.nose, bodyMaterial);
  nose.position.z = 0.78;
  const wings = new THREE.Mesh(planeGeometries.wings, bodyMaterial);
  const tailWings = new THREE.Mesh(planeGeometries.tailWings, bodyMaterial);
  const tailFin = new THREE.Mesh(planeGeometries.tailFin, bodyMaterial);
  const cockpit = new THREE.Mesh(planeGeometries.cockpit, cockpitMaterial);
  cockpit.position.set(0, 0.1, 0.48);

  plane.add(fuselage, nose, wings, tailWings, tailFin, cockpit);
  plane.scale.setScalar(selected ? PLANE.selectedScale : PLANE.scale);
  plane.userData.segment = segment;
  plane.userData.phase = flightPhase(segment);
  planeObjects.set(planeId(segment), plane);
  updatePlanePosition(plane, plane.userData.phase);
  return plane;
}

function createPlaneGeometries() {
  const fuselage = new THREE.CylinderGeometry(0.09, 0.13, 1.25, 8);
  fuselage.rotateX(Math.PI / 2);

  const nose = new THREE.ConeGeometry(0.13, 0.32, 8);
  nose.rotateX(Math.PI / 2);

  const wings = flatGeometry([
    0, 0.02, 0.34, -0.92, 0.02, -0.14, 0, 0.02, -0.03,
    0, 0.02, 0.34, 0, 0.02, -0.03, 0.92, 0.02, -0.14
  ]);
  const tailWings = flatGeometry([
    0, 0.02, -0.4, -0.43, 0.02, -0.62, 0, 0.02, -0.57,
    0, 0.02, -0.4, 0, 0.02, -0.57, 0.43, 0.02, -0.62
  ]);
  const tailFin = flatGeometry([
    0, 0, -0.42, 0, 0.34, -0.65, 0, 0, -0.64
  ]);
  const cockpit = new THREE.SphereGeometry(0.095, 8, 5);
  cockpit.scale(0.72, 0.7, 1.5);

  return { fuselage, nose, wings, tailWings, tailFin, cockpit };
}

function flatGeometry(vertices) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.computeVertexNormals();
  return geometry;
}

function animatePlanes(now) {
  const elapsed = Math.min(100, now - lastPlaneFrame);
  lastPlaneFrame = now;

  if (!state.motionPaused && !document.hidden) {
    planeProgress = (planeProgress + elapsed / TIMING.planeTravel) % 1;
    planeObjects.forEach((plane) => {
      updatePlanePosition(plane, (planeProgress + plane.userData.phase) % 1);
    });
  }

  requestAnimationFrame(animatePlanes);
}

function updatePlanePosition(plane, progress) {
  const curve = getRenderedArcCurve(plane.userData.segment);
  if (!curve) {
    plane.visible = false;
    return;
  }

  const point = curve.getPoint(progress);
  const nextPoint = curve.getPoint(Math.min(1, progress + PLANE.tangentLead));
  const radialUp = point.clone().normalize();

  plane.visible = true;
  plane.userData.progress = progress;
  plane.position.copy(point);
  plane.up.copy(radialUp);
  plane.lookAt(nextPoint);
}

function getRenderedArcCurve(segment) {
  return segment.__threeObjArc?.children[0]?.geometry?.parameters?.path || null;
}

function planeId(segment) {
  return `${segment.tripId}-${segment.segmentIndex}`;
}

function flightPhase(segment) {
  const seed = [...planeId(segment)].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return (seed % 97) / 97;
}

function addStarfield(targetScene) {
  const starCount = 2400;
  const positions = new Float32Array(starCount * 3);
  for (let index = 0; index < starCount; index += 1) {
    const offset = index * 3;
    const radius = 780 + Math.random() * 560;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[offset] = radius * Math.sin(phi) * Math.cos(theta);
    positions[offset + 1] = radius * Math.sin(phi) * Math.sin(theta);
    positions[offset + 2] = radius * Math.cos(phi);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({ color: '#ffe6c7', size: 1.25, transparent: true, opacity: 0.68, depthWrite: false });
  targetScene.add(new THREE.Points(geometry, material));
}

function haversine(start, end) {
  const radius = 6371;
  const lat1 = toRadians(start.lat);
  const lat2 = toRadians(end.lat);
  const deltaLat = toRadians(end.lat - start.lat);
  const deltaLng = toRadians(end.lng - start.lng);
  const value = Math.sin(deltaLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;
  return 2 * radius * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

function getSegmentsDistance(segments) {
  return segments.reduce((sum, segment) => sum + haversine(segment.start, segment.end), 0);
}

function getSegmentsAirtime(segments) {
  return segments.reduce((sum, segment) => {
    const distance = haversine(segment.start, segment.end);
    return sum + estimateAirtime(distance);
  }, 0);
}

function estimateAirtime(distance) {
  const minutes = Math.max(45, (distance / 800) * 60 + 20);
  return Math.round(minutes / 5) * 5;
}

function formatDistance(distance) {
  return Math.round(distance).toLocaleString('en-US');
}

function formatDuration(minutes) {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

function toRadians(value) {
  return (value * Math.PI) / 180;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
