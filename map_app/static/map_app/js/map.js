let map = L.map('map').setView([28.6139, 77.2090], 13);
// let map;
let currentRouteControl;
let currentPositionMarker;
let watchId;
let hospitalMarkers = [];

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
}).addTo(map);

// Search Button Click
document.querySelector('#search-bar button').addEventListener('click', () => {
  const location = document.getElementById('locationInput').value.trim();
  if (location) {
    geocodeLocation(location);
  }
});

// Geocode with Nominatim
function geocodeLocation(query) {
  fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}`)
    .then(res => res.json())
    .then(data => {
      if (data.length === 0) {
        alert('Location not found.');
        return;
      }

      const lat = parseFloat(data[0].lat);
      const lon = parseFloat(data[0].lon);
      map.setView([lat, lon], 14);
      findNearbyHospitals(lat, lon);
    })
    .catch(err => console.error('Geocode error:', err));
}

// Fetch Hospitals using Overpass API
function findNearbyHospitals(lat, lon) {
  const amenityType = document.getElementById('amenityType').value;
  const radius = document.getElementById('radius').value;

  const query = `
    [out:json];
    (
      node["amenity"="${amenityType}"](around:${radius},${lat},${lon});
      way["amenity"="${amenityType}"](around:${radius},${lat},${lon});
      relation["amenity"="${amenityType}"](around:${radius},${lat},${lon});
    );
    out center;
  `;

  const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;

  fetch(url)
    .then(res => res.json())
    .then(data => {
      const hospitals = data.elements.map(el => {
        const coords = el.type === 'node' ? el : el.center;
        return {
          name: el.tags.name || 'Unnamed Hospital',
          lat: coords.lat,
          lon: coords.lon,
          type: el.tags['hospital:type'] || 'Unknown'
        };
      });

      displayHospitalList(hospitals);
    })
    .catch(err => console.error('Overpass error:', err));
}

// Display Hospitals in Sidebar List and Map
function displayHospitalList(hospitals) {
  const hospitalList = document.getElementById('hospitalList');
  hospitalList.innerHTML = '';

  // Clear existing markers
  hospitalMarkers.forEach(marker => map.removeLayer(marker));
  hospitalMarkers = [];

  hospitals.forEach(hospital => {
    const li = document.createElement('li');
    li.className = 'hospital-tile';
    li.innerHTML = `
      <strong>${hospital.name}</strong><br/>
      Lat: ${hospital.lat.toFixed(4)}, Lon: ${hospital.lon.toFixed(4)}<br/>
      Type: ${hospital.type}<br/>
      <button class="navigate-btn">Navigate</button>
    `;
    hospitalList.appendChild(li);

    // Add marker on map
    const marker = L.marker([hospital.lat, hospital.lon])
      .addTo(map)
      .bindPopup(hospital.name);
    hospitalMarkers.push(marker);

    // Navigate button handler
    li.querySelector('.navigate-btn').addEventListener('click', () => {
      const destination = L.latLng(hospital.lat, hospital.lon);
      closeHospitalListPanel();
      startLiveNavigation(destination);
    });

    // Tile click centers on hospital
    li.addEventListener('click', () => {
      map.setView([hospital.lat, hospital.lon], 17);
      marker.openPopup();
    });
  });
}

// Close hospital panel (list/grid)
function closeHospitalListPanel() {
  document.getElementById('hospitalPanel').classList.remove('active');
}

// Start Real-Time Navigation
// Start Real-Time Navigation
function startLiveNavigation(destinationLatLng) {
  stopLiveNavigation(); // Clear previous navigation

  watchId = navigator.geolocation.watchPosition(
    position => {
      const userLatLng = L.latLng(position.coords.latitude, position.coords.longitude);

      // Update or Create Marker
      if (!currentPositionMarker) {
        currentPositionMarker = L.marker(userLatLng, {
          icon: L.icon({
            iconUrl: 'https://cdn-icons-png.flaticon.com/512/684/684908.png',
            iconSize: [25, 25]
          })
        }).addTo(map);
      } else {
        currentPositionMarker.setLatLng(userLatLng);
      }

      // Remove old route if exists
      if (currentRouteControl) {
        map.removeControl(currentRouteControl);
      }

      // Add new routing control
      currentRouteControl = L.Routing.control({
        waypoints: [userLatLng, destinationLatLng],
        routeWhileDragging: false,
        draggableWaypoints: false,
        addWaypoints: false,
        fitSelectedRoutes: true,
        createMarker: () => null // no extra markers
      }).addTo(map);

      // Custom bottom-center positioning via CSS
      const routingContainer = document.querySelector('.leaflet-routing-container');
      if (routingContainer) {
        routingContainer.style.position = 'absolute';
        routingContainer.style.bottom = '20px';
        routingContainer.style.left = '50%';
        routingContainer.style.transform = 'translateX(-50%)';
        routingContainer.style.zIndex = '1000';
        routingContainer.style.background = '#fff';
        routingContainer.style.borderRadius = '8px';
        routingContainer.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.2)';
        routingContainer.style.padding = '10px';
      }
    },
    error => {
      alert('Failed to get current location.');
      console.error('Geolocation error:', error);
    },
    {
      enableHighAccuracy: false,
      maximumAge: 1000,
      timeout: 5000
    }
  );

  showStopNavigationButton();
}


// Stop Navigation and Clear UI
function stopLiveNavigation() {
  if (watchId) navigator.geolocation.clearWatch(watchId);
  if (currentRouteControl) map.removeControl(currentRouteControl);
  if (currentPositionMarker) map.removeLayer(currentPositionMarker);

  watchId = null;
  currentRouteControl = null;
  currentPositionMarker = null;

  removeStopNavigationButton();
}

// Add Stop Navigation Button
function showStopNavigationButton() {
  if (document.getElementById('stopNavBtn')) return;

  const stopBtn = document.createElement('button');
  stopBtn.id = 'stopNavBtn';
  stopBtn.innerText = 'Stop Navigation';
  Object.assign(stopBtn.style, {
    position: 'absolute',
    bottom: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    padding: '10px 20px',
    backgroundColor: '#f44336',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    zIndex: 1001
  });

  stopBtn.addEventListener('click', stopLiveNavigation);
  document.body.appendChild(stopBtn);
}

// Remove Stop Navigation Button
function removeStopNavigationButton() {
  const btn = document.getElementById('stopNavBtn');
  if (btn) btn.remove();
}

// View Mode Toggle
document.getElementById('listViewBtn').addEventListener('click', () => {
  const panel = document.getElementById('hospitalPanel');
  panel.classList.remove('hidden');
  document.getElementById('hospitalList').className = 'list-view';
});

document.getElementById('gridViewBtn').addEventListener('click', () => {
  const panel = document.getElementById('hospitalPanel');
  panel.classList.remove('hidden');
  document.getElementById('hospitalList').className = 'grid-view';
});

// Apply Filter Button Event Listener
document.querySelector('.filter-item button').addEventListener('click', () => {
  const lat = map.getCenter().lat;
  const lon = map.getCenter().lng;
  findNearbyHospitals(lat, lon);
});

// Toggle between list and grid view
const hospitalPanel = document.getElementById('hospitalPanel');
const hospitalList = document.getElementById('hospitalList');

document.getElementById('listBtn').addEventListener('click', () => {
  hospitalPanel.classList.add('active');
});

document.getElementById('listViewBtn').addEventListener('click', () => {
  hospitalList.className = 'list-view';
});

document.getElementById('gridViewBtn').addEventListener('click', () => {
  hospitalList.className = 'grid-view';
});

function toggleFilterPanel() {
  const filterPanel = document.getElementById('filterPanel');
  filterPanel.classList.toggle('hidden');
}

/// Toggle function to show/hide the filter panel
function toggleFilterPanel() {
  const filterPanel = document.getElementById('filterPanel');
  
  // If the filter panel is hidden, show it; else, hide it
  if (filterPanel.style.display === 'none' || filterPanel.style.display === '') {
    filterPanel.style.display = 'block'; // Show the filter panel
  } else {
    filterPanel.style.display = 'none'; // Hide the filter panel
  }
}

// Close (minimize) the filter panel when the cross button is clicked
function closeFilterPanel() {
  const filterPanel = document.getElementById('filterPanel');
  filterPanel.style.display = 'none'; // Hide the filter panel
}

//  Extra code
// Handle destination search from nav panel
document.getElementById('goRouteBtn').addEventListener('click', () => {
  const destinationQuery = document.getElementById('destinationInput').value.trim();
  if (!destinationQuery) {
    alert("Please enter a destination.");
    return;
  }

  fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${destinationQuery}`)
    .then(res => res.json())
    .then(data => {
      if (data.length === 0) {
        alert('Destination not found.');
        return;
      }

      const lat = parseFloat(data[0].lat);
      const lon = parseFloat(data[0].lon);
      const destinationLatLng = L.latLng(lat, lon);

      startLiveNavigation(destinationLatLng);

      // Show info in the nav panel
      document.getElementById('routeInfo').innerHTML = `
        <strong>Heading to:</strong><br>
        ${destinationQuery}<br>
        Lat: ${lat.toFixed(4)}, Lon: ${lon.toFixed(4)}
      `;
    })
    .catch(err => {
      alert("Error while locating destination.");
      console.error(err);
    });
});
self.addEventListener('install', function(event) {
  console.log('Service worker installed');
});

self.addEventListener('fetch', function(event) {
  // You can add fetch caching here later
});
