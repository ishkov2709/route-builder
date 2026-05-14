// Init map
let map = L.map("map").setView([46.97, 32.0], 10);

L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
  attribution: "&copy; OpenStreetMap &copy; CARTO",
}).addTo(map);

let polyline;
let markers = [];

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

      // 1. Formatted Date & Time
      let rawDate = allWords[0] || "";
      let dateParts = rawDate.split("-");
      let formattedDate =
        dateParts.length === 3
          ? `${dateParts[2]}.${dateParts[1]}.${dateParts[0]}`
          : rawDate;
      let eventTime =
        allWords.find((w) => (w.match(/:/g) || []).length === 2) || "";

      // 2. Title
      let preCoordText = line.split(matches[0][0])[0].trim();
      let headerParts = preCoordText.split(/\s+/);
      let fullTitle = headerParts.slice(3).join(" ");

      // 3. Mileage (KM)
      let mileageValue = "0";
      const statusIdx = allWords.findIndex(
        (w) => w.includes("підтверджені") || w.includes("подтверждены"),
      );
      if (statusIdx !== -1 && allWords[statusIdx + 1]) {
        mileageValue = allWords[statusIdx + 1];
      }

      // 4. Time (Min)
      let durationValue = "0";
      const cleanNumbers = allWords.filter((w) => {
        let val = w.replace(",", ".");
        return (
          !isNaN(parseFloat(val)) &&
          !w.includes("-") &&
          !w.includes(":") &&
          !w.startsWith("46.") &&
          !w.startsWith("47.") &&
          !w.startsWith("31.") &&
          !w.startsWith("32.")
        );
      });
      if (cleanNumbers.length > 0) {
        durationValue = cleanNumbers[cleanNumbers.length - 1];
      }

      if (!isNaN(engLat) && !isNaN(engLng)) {
        const numberIcon = L.divIcon({
          className: "custom-number-icon",
          html: `<div class="marker-number">${index + 1}</div>`,
          iconSize: [24, 24],
          iconAnchor: [12, 12],
          popupAnchor: [0, -12],
        });

        const marker = L.marker([engLat, engLng], { icon: numberIcon }).addTo(
          map,
        );

        // POPUP
        const popupContent = `
                    <div class="map-popup">
                        <b style="font-size: 13px; display: block; margin-bottom: 2px;">${fullTitle}</b>
                        <div style="font-size: 11px; color: #7f8c8d; margin-bottom: 5px;">
                            ${formattedDate} <span style="color: #e67e22; font-weight: bold; margin-left: 5px;">${eventTime}</span>
                        </div>
                        <div style="font-size: 11px; color: #95a5a6;">
                            KM: <b>${mileageValue}</b> | Min: <b>${durationValue}</b>
                        </div>
                    </div>
                `;
        marker.bindPopup(popupContent, { closeButton: false });

        // Card in the list
        const item = document.createElement("div");
        item.className = "route-item";
        item.innerHTML = `
                    <b>${fullTitle}</b>
                    <div style="font-size: 0.85em; color: #7f8c8d; margin: 3px 0 7px 0;">
                        <span>📅 ${formattedDate}</span>
                        <span style="margin-left: 12px; color: #e67e22; font-weight: 500;">🕒 ${eventTime}</span>
                    </div>
                    <div class="route-data-row" style="display: flex; gap: 15px; font-size: 0.9em; color: #2c3e50;">
                        <span>KM: <b>${mileageValue}</b></span>
                        <span>Min: <b>${durationValue}</b></span>
                    </div>
                `;

        const setHighlight = (state) => {
          if (marker._icon) {
            const inner = marker._icon.querySelector(".marker-number");
            if (inner)
              inner.style.filter = state
                ? "hue-rotate(150deg) brightness(1.5)"
                : "";
          }
        };

        // Interactive: List item events
        item.onmouseenter = () => {
          setHighlight(true);
          marker.openPopup();
        };
        item.onmouseleave = () => {
          setHighlight(false);
          marker.closePopup();
        };
        item.onclick = () => {
          map.flyTo([engLat, engLng], 16);
          marker.openPopup();
        };

        // Interactive: Marker events
        marker.on("mouseover", function () {
          setHighlight(true);
          this.openPopup();
          item.classList.add("highlight-list");
          item.scrollIntoView({ behavior: "smooth", block: "nearest" });
        });
        marker.on("mouseout", function () {
          setHighlight(false);
          this.closePopup();
          item.classList.remove("highlight-list");
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
