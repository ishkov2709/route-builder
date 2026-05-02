let map = L.map('map').setView([46.4825, 30.7233], 13);

L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap &copy; CARTO'
}).addTo(map);

let polyline;
let markers = [];

function clearMap() {
    if (polyline) map.removeLayer(polyline);
    markers.forEach(m => map.removeLayer(m));
    markers = [];
    document.getElementById("route-list").innerHTML = "";
}

function buildRoute() {
    clearMap();

    const rawText = document.getElementById("input").value.trim();
    if (!rawText) return;
    
    const entries = rawText.split(/(?=\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2})/).filter(e => e.trim().length > 20);
    const listContainer = document.getElementById("route-list");
    let latlngs = [];

    entries.forEach((line, index) => {
        const coordRegex = /(\d{2}\.\d+),\s+(\d{2}\.\d+)/g;
        const matches = [...line.matchAll(coordRegex)];

        if (matches.length >= 2) {
            const engLat = parseFloat(matches[1][1]);
            const engLng = parseFloat(matches[1][2]);

            let preCoordText = line.split(matches[0][0])[0].trim();
            let parts = preCoordText.split(/\s+/);
            let fullTitle = parts.slice(3).join(' '); 

            const allWords = line.replace(/\n/g, ' ').split(/\s+/);
            let mileageValue = "0";
            let timeValue = "0";

            const statusIdx = allWords.findIndex(w => w.includes("підтверджені"));
            if (statusIdx !== -1 && allWords[statusIdx + 1]) {
                mileageValue = allWords[statusIdx + 1]; 
            }

            const cleanNumbers = allWords.filter(w => {
                let val = w.replace(',', '.');
                return !isNaN(parseFloat(val)) && !w.includes('-') && !w.includes(':') && !w.startsWith('46.') && !w.startsWith('32.');
            });
            
            if (cleanNumbers.length > 0) {
                timeValue = cleanNumbers[cleanNumbers.length - 1]; 
            }

            if (!isNaN(engLat) && !isNaN(engLng)) {
                const marker = L.marker([engLat, engLng]).addTo(map);
                
                // --- НАСТРОЙКА POPUP (ОКНА НА КАРТЕ) ---
                const popupContent = `
                    <div class="map-popup">
                        <b style="font-size: 13px; display: block; margin-bottom: 4px;">${fullTitle}</b>
                        <div style="font-size: 11px; color: #7f8c8d; font-weight: normal;">
                            Mileage: ${mileageValue}<br>
                            Time: ${timeValue} min
                        </div>
                    </div>
                `;
                marker.bindPopup(popupContent, { closeButton: false });

                const item = document.createElement("div");
                item.className = "route-item";
                item.innerHTML = `
                    <b>${fullTitle}</b>
                    <div class="route-data-row">
                        <span>Mileage: <b>${mileageValue}</b></span>
                        <span>Time: <b>${timeValue} min</b></span>
                    </div>
                `;

                // События для связи списка и карты
                item.onmouseenter = () => {
                    if (marker._icon) marker._icon.style.filter = "hue-rotate(150deg) brightness(1.5)";
                    marker.openPopup();
                };
                item.onmouseleave = () => {
                    if (marker._icon) marker._icon.style.filter = "";
                    marker.closePopup();
                };

                // События наведения на саму точку на карте
                marker.on('mouseover', function (e) {
                    this.openPopup();
                    item.classList.add('highlight-list');
                    item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                });
                marker.on('mouseout', function (e) {
                    this.closePopup();
                    item.classList.remove('highlight-list');
                });

                item.onclick = () => {
                    map.flyTo([engLat, engLng], 16);
                    marker.openPopup();
                };

                markers.push(marker);
                latlngs.push([engLat, engLng]);
                listContainer.appendChild(item);
            }
        }
    });

    if (latlngs.length >= 2) {
        polyline = L.polyline(latlngs, {
            color: '#27ae60', weight: 4, opacity: 0.8, dashArray: '5, 10'
        }).addTo(map);
        map.fitBounds(polyline.getBounds(), { padding: [50, 50] });
    }
}