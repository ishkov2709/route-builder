// Init map
let map = L.map("map").setView([46.97, 32.0], 10);

L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
  attribution: "&copy; OpenStreetMap &copy; CARTO",
}).addTo(map);

let polyline;
let markers = [];
let routeToDeleteIndex = null;

// --- CUSTOM MODAL SYSTEM ---
function showAlert(message, title = "Notification") {
  document.getElementById("alert-title").innerText = title;
  document.getElementById("alert-message").innerText = message;
  document.getElementById("alert-modal").style.display = "flex";
}

function toggleMenu() {
  const menu = document.getElementById("menu-dropdown");
  menu.style.display = menu.style.display === "block" ? "none" : "block";
}

function openSaveModal() {
  const rawText = document.getElementById("input").value.trim();
  if (!rawText) {
    showAlert("Please paste data and build a route first!", "Warning");
    return;
  }
  document.getElementById("save-modal").style.display = "flex";
  toggleMenu();
}

function openViewModal() {
  renderSavedRoutes();
  document.getElementById("view-modal").style.display = "flex";
  toggleMenu();
}

function closeModal(id) {
  document.getElementById(id).style.display = "none";
}

window.onclick = function(event) {
  if (event.target.className.includes('modal')) {
    event.target.style.display = "none";
  }
}

// --- STORAGE LOGIC ---
function confirmSaveRoute() {
  const name = document.getElementById("route-name-input").value.trim();
  const rawData = document.getElementById("input").value.trim();
  
  if (!name) { 
    showAlert("Please enter a name!", "Error"); 
    return; 
  }

  const savedRoutes = JSON.parse(localStorage.getItem("my_routes") || "[]");
  savedRoutes.push({ name, data: rawData });
  localStorage.setItem("my_routes", JSON.stringify(savedRoutes));

  document.getElementById("route-name-input").value = "";
  closeModal("save-modal");
  showAlert("Route successfully saved!", "Success");
}

function renderSavedRoutes() {
  const container = document.getElementById("saved-routes-list");
  const savedRoutes = JSON.parse(localStorage.getItem("my_routes") || "[]");
  container.innerHTML = "";

  if (savedRoutes.length === 0) {
    container.innerHTML = "<div style='text-align:center; padding:20px; color:#95a5a6;'>No saved routes</div>";
    return;
  }

  savedRoutes.forEach((route, index) => {
    const item = document.createElement("div");
    item.className = "saved-route-item";
    item.innerHTML = `
      <div class="saved-route-info">
        <div>${route.name}</div>
      </div>
      <div class="saved-route-actions">
        <button class="btn-show" onclick="loadSavedRoute(${index})">Show</button>
        <button class="btn-del" onclick="askDeleteRoute(${index})">Delete</button>
      </div>
    `;
    container.appendChild(item);
  });
}

function loadSavedRoute(index) {
  const savedRoutes = JSON.parse(localStorage.getItem("my_routes") || "[]");
  document.getElementById("input").value = savedRoutes[index].data;
  buildRoute();
  closeModal("view-modal");
}

function askDeleteRoute(index) {
  routeToDeleteIndex = index;
  document.getElementById("confirm-modal").style.display = "flex";
}

document.getElementById("confirm-delete-btn").onclick = function() {
  if (routeToDeleteIndex !== null) {
    const savedRoutes = JSON.parse(localStorage.getItem("my_routes") || "[]");
    savedRoutes.splice(routeToDeleteIndex, 1);
    localStorage.setItem("my_routes", JSON.stringify(savedRoutes));
    renderSavedRoutes();
    closeModal("confirm-modal");
    routeToDeleteIndex = null;
  }
};

// --- CORE ROUTE LOGIC ---
function clearMap() {
  if (polyline) map.removeLayer(polyline);
  markers.forEach((m) => map.removeLayer(m));
  markers = [];
  document.getElementById("route-list").innerHTML = "";
}

function buildRoute() {
  clearMap();
  const rawText = document.getElementById("input").value.trim();
  if (!rawText) return;

  const entries = rawText
    .split(/(?=202\d-\d{2}-\d{2})/)
    .filter((e) => e.trim().length > 20);
  const listContainer = document.getElementById("route-list");
  let latlngs = [];

  entries.forEach((line, index) => {
    const coordRegex = /(\d{2}\.\d+),\s+(\d{2}\.\d+)/g;
    const matches = [...line.matchAll(coordRegex)];

    if (matches.length >= 2) {
      const engLat = parseFloat(matches[1][1]);
      const engLng = parseFloat(matches[1][2]);
      const allWords = line.replace(/\n/g, " ").split(/\s+/);

      let rawDate = allWords[0] || "";
      let dateParts = rawDate.split("-");
      let formattedDate = dateParts.length === 3 ? `${dateParts[2]}.${dateParts[1]}.${dateParts[0]}` : rawDate;
      let eventTime = allWords.find((w) => (w.match(/:/g) || []).length === 2) || "";
      let preCoordText = line.split(matches[0][0])[0].trim();
      let headerParts = preCoordText.split(/\s+/);
      let fullTitle = headerParts.slice(3).join(" ");

      if (!isNaN(engLat) && !isNaN(engLng)) {
        const numberIcon = L.divIcon({
          className: "custom-number-icon",
          html: `<div class="marker-number">${index + 1}</div>`,
          iconSize: [24, 24], 
          iconAnchor: [12, 12], 
          popupAnchor: [0, -12],
        });

        const marker = L.marker([engLat, engLng], { icon: numberIcon }).addTo(map);

        const popupContent = `<div class="map-popup">
          <b style="font-size: 13px; display: block; margin-bottom: 2px;">${fullTitle}</b>
          <div style="font-size: 11px; color: #7f8c8d; margin-bottom: 5px;">
            ${formattedDate} <span style="color: #e67e22; font-weight: bold; margin-left: 5px;">${eventTime}</span>
          </div>
        </div>`;
        marker.bindPopup(popupContent, { closeButton: false });

        const item = document.createElement("div");
        item.className = "route-item";
        item.innerHTML = `
          <b>${fullTitle}</b>
          <div style="font-size: 0.85em; color: #7f8c8d; margin: 3px 0 7px 0;">
            <span>📅 ${formattedDate}</span>
            <span style="margin-left: 12px; color: #e67e22; font-weight: 500;">🕒 ${eventTime}</span>
          </div>`;

        const setHighlight = (state) => {
          if (marker._icon) {
            const inner = marker._icon.querySelector(".marker-number");
            if (inner) inner.style.filter = state ? "hue-rotate(150deg) brightness(1.5)" : "";
          }
          if (state) item.classList.add("highlight-list");
          else item.classList.remove("highlight-list");
        };

        item.onmouseenter = () => { setHighlight(true); marker.openPopup(); };
        item.onmouseleave = () => { setHighlight(false); marker.closePopup(); };
        item.onclick = () => { map.flyTo([engLat, engLng], 16); marker.openPopup(); };

        marker.on("mouseover", function () {
          setHighlight(true);
          this.openPopup();
          item.scrollIntoView({ behavior: "smooth", block: "nearest" });
        });
        marker.on("mouseout", function () {
          setHighlight(false);
          this.closePopup();
        });
        marker.on("click", function () {
          map.flyTo([engLat, engLng], 16);
          this.openPopup();
        });

        markers.push(marker);
        latlngs.push([engLat, engLng]);
        listContainer.appendChild(item);
      }
    }
  });

  if (latlngs.length >= 2) {
    polyline = L.polyline(latlngs, {
      color: "#27ae60",
      weight: 4,
      opacity: 0.8,
      dashArray: "5, 10",
    }).addTo(map);
    map.fitBounds(polyline.getBounds(), { padding: [50, 50] });
  }
}