let map = L.map("map").setView([46.97, 32.0], 10);

L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
  attribution: "&copy; OpenStreetMap &copy; CARTO",
}).addTo(map);

let polyline;
let markers = [];
let routeToDeleteIndex = null;

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

window.onclick = function (event) {
  if (event.target.classList.contains("modal")) {
    event.target.style.display = "none";
  }
};

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
    container.innerHTML =
      "<div style='text-align:center; padding:20px; color:#95a5a6;'>No saved routes</div>";
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

document.getElementById("confirm-delete-btn").onclick = function () {
  if (routeToDeleteIndex !== null) {
    const savedRoutes = JSON.parse(localStorage.getItem("my_routes") || "[]");
    savedRoutes.splice(routeToDeleteIndex, 1);
    localStorage.setItem("my_routes", JSON.stringify(savedRoutes));
    renderSavedRoutes();
    closeModal("confirm-modal");
    routeToDeleteIndex = null;
  }
};

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

  // 1. Получаем данные из внешнего парсера
  const routeData = parseRawData(rawText);

  const listContainer = document.getElementById("route-list");
  let latlngs = [];

  routeData.forEach((data) => {
    if (data.lat && data.lng) {
      const isRed = data.isError;
      const markerColor = isRed ? "#e74c3c" : "#27ae60";

      // 2. Создаем иконку маркера
      const numberIcon = L.divIcon({
        className: "custom-number-icon",
        html: `<div class="marker-number" style="background-color: ${markerColor}; transition: all 0.3s ease;">${data.id}</div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      const marker = L.marker([data.lat, data.lng], { icon: numberIcon }).addTo(
        map,
      );

      // 3. Создаем попап и элемент списка через внешние функции
      marker.bindPopup(createMapPopup(data), { closeButton: false });
      const item = createListItem(data);

      // --- Логика интерактивности (Ховер) ---
      const setHighlight = (active) => {
        if (marker._icon) {
          const inner = marker._icon.querySelector(".marker-number");
          if (inner) {
            if (active) {
              // Яркая подсветка
              inner.style.filter = isRed
                ? "brightness(1.2) saturate(2) drop-shadow(0 0 5px #ff0000)"
                : "brightness(1.2) saturate(2) drop-shadow(0 0 5px #00ff00)";
              inner.style.transform = "scale(1.2)";
            } else {
              inner.style.filter = "";
              inner.style.transform = "scale(1)";
            }
          }
        }

        if (active) {
          item.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
          marker.openPopup();
        } else {
          item.style.boxShadow = "";
          marker.closePopup();
        }
      };

      // События для списка
      item.onmouseenter = () => setHighlight(true);
      item.onmouseleave = () => setHighlight(false);
      item.onclick = () => {
        map.flyTo([data.lat, data.lng], 16);
        marker.openPopup();
      };

      // --- События для МАРКЕРА (Поинта) ---
      marker.on("click", () => {
        // Приближаем карту при нажатии на поинт
        map.flyTo([data.lat, data.lng], 16);
        marker.openPopup();
      });

      marker.on("mouseover", () => {
        setHighlight(true);
        item.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
      marker.on("mouseout", () => setHighlight(false));

      markers.push(marker);
      latlngs.push([data.lat, data.lng]);
      listContainer.appendChild(item);
    }
  });

  // 5. Линия маршрута
  if (latlngs.length >= 2) {
    polyline = L.polyline(latlngs, {
      color: "#27ae60",
      weight: 3,
      dashArray: "5, 10",
      opacity: 0.7,
    }).addTo(map);
    map.fitBounds(polyline.getBounds(), { padding: [40, 40] });
  }
}
