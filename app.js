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

  // Разделяем записи по дате (ГГГГ-ММ-ДД)
  const entries = rawText
    .split(/(?=\b202\d-\d{2}-\d{2}\b)/)
    .filter((e) => e.trim().length > 20);

  const listContainer = document.getElementById("route-list");
  let latlngs = [];

  entries.forEach((line, index) => {
    const coordRegex = /(\d{2}\.\d+),\s+(\d{2}\.\d+)/g;
    const matches = [...line.matchAll(coordRegex)];

    // Проверка статуса координат
    const isNotInCoords = line.includes("Завдання не у координатах");

    if (matches.length >= 2) {
      const engLat = parseFloat(matches[1][1]);
      const engLng = parseFloat(matches[1][2]);

      // Обработка строк: убираем табуляцию, чтобы она не ломала логику
      const cleanLine = line.replace(/\t/g, " ");
      const lines = cleanLine
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

      // 1. Парсинг Даты и Времени (через RegExp, чтобы не зависеть от табов)
      const dateTimeMatch = cleanLine.match(
        /(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2})/,
      );
      let formattedDate = "00.00.0000";
      let eventTime = "00:00:00";
      if (dateTimeMatch) {
        const d = dateTimeMatch[1].split("-");
        formattedDate = `${d[2]}.${d[1]}.${d[0]}`;
        eventTime = dateTimeMatch[2];
      }

      // 2. Парсинг KM и Min (ищем числа в нужных строках)
      let kmValue = "0";
      let minValue = "0";
      const confirmLineIndex = lines.findIndex((l) =>
        l.includes("підтверджені"),
      );

      if (confirmLineIndex !== -1) {
        const kmMatch = lines[confirmLineIndex].match(/(\d+[.,]\d+|\d+)/);
        if (kmMatch) kmValue = kmMatch[0];

        if (lines[confirmLineIndex + 1]) {
          const minMatch =
            lines[confirmLineIndex + 1].match(/(\d+[.,]\d+|\d+)/);
          if (minMatch) minValue = minMatch[0];
        }
      }

      // 3. Формируем Заголовок (fullTitle)
      let fullTitle = "Без назви";
      if (lines[0]) {
        fullTitle = lines[0]
          .replace(/\d{4}-\d{2}-\d{2}/, "")
          .replace(/\d{2}:\d{2}:\d{2}/, "")
          .replace(/\b\d{7,10}\b/g, "") // Удаляем ID
          .replace(/\s+/g, " ")
          .trim();
      }
      // Если первая строка пустая, пробуем взять начало второй
      if (!fullTitle && lines[1]) {
        fullTitle = lines[1].split(/[0-9]{2}\.[0-9]+/)[0].trim();
      }

      if (!isNaN(engLat) && !isNaN(engLng)) {
        const warningColor = "#e74c3c";
        const defaultColor = "#27ae60";
        const markerColor = isNotInCoords ? warningColor : defaultColor;

        // Создание маркера
        const numberIcon = L.divIcon({
          className: "custom-number-icon",
          html: `<div class="marker-number" style="background-color: ${markerColor};">${index + 1}</div>`,
          iconSize: [24, 24],
          iconAnchor: [12, 12],
          popupAnchor: [0, -12],
        });

        const marker = L.marker([engLat, engLng], { icon: numberIcon }).addTo(
          map,
        );

        // Попап на карте
        const statusNote = isNotInCoords
          ? `<div style="color: ${warningColor}; font-weight: bold; font-size: 10px; margin-top: 5px;">⚠️ Завдання не у координатах</div>`
          : "";
        marker.bindPopup(
          `
                    <div class="map-popup">
                        <b>${fullTitle}</b>
                        <div style="font-size: 11px; color: #7f8c8d;">${formattedDate} <span style="color: #e67e22;">${eventTime}</span></div>
                        <div class="map-data-row" style="display: flex; justify-content: space-between; color: ${defaultColor}; font-weight: bold; margin-top:5px; font-size: 11px;">
                            <span>KM: ${kmValue}</span><span>Min: ${minValue}</span>
                        </div>
                        ${statusNote}
                    </div>`,
          { closeButton: false },
        );

        // Элемент бокового списка
        const item = document.createElement("div");
        item.className = "route-item";
        if (isNotInCoords) {
          item.style.borderLeftColor = warningColor;
          item.style.backgroundColor = "#fff5f5";
        }

        item.innerHTML = `
                    <b>${fullTitle}</b>
                    <div style="font-size: 0.85em; color: #7f8c8d; margin: 3px 0 7px 0;">
                        <span>📅 ${formattedDate}</span>
                        <span style="margin-left: 12px; color: #e67e22; font-weight: 500;">🕒 ${eventTime}</span>
                    </div>
                    <div class="route-data-row" style="display: flex; justify-content: space-between; align-items: center;">
                        <span><b style="${isNotInCoords ? "color:" + warningColor : ""}">KM:</b> ${kmValue}</span>
                        <span><b style="${isNotInCoords ? "color:" + warningColor : ""}">Min:</b> ${minValue}</span>
                    </div>`;

        // Функции клика
        const focusPoint = () => {
          map.flyTo([engLat, engLng], 16);
          marker.openPopup();
        };
        item.onclick = focusPoint;
        marker.on("click", focusPoint);

        // Логика Ховера
        const setHighlight = (state) => {
          if (marker._icon) {
            const inner = marker._icon.querySelector(".marker-number");
            if (inner) {
              if (state) {
                inner.style.filter = isNotInCoords
                  ? "brightness(0.8) saturate(1.4)"
                  : "hue-rotate(150deg) brightness(1.5)";
              } else {
                inner.style.filter = "";
              }
            }
          }
          if (state) {
            item.classList.add(
              isNotInCoords ? "highlight-error-active" : "highlight-list",
            );
          } else {
            item.classList.remove("highlight-list", "highlight-error-active");
          }
        };

        item.onmouseenter = () => {
          setHighlight(true);
          marker.openPopup();
        };
        item.onmouseleave = () => {
          setHighlight(false);
          marker.closePopup();
        };

        marker.on("mouseover", function () {
          setHighlight(true);
          this.openPopup();
          item.scrollIntoView({ behavior: "smooth", block: "nearest" });
        });
        marker.on("mouseout", function () {
          setHighlight(false);
          this.closePopup();
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
