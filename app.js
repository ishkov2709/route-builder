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

            const endParts = line.trim().split(/\s+/);
            let mileageValue = "0";
            let foundSecondCoord = false;

            for (let i = 0; i < endParts.length; i++) {
                if (endParts[i].includes(matches[1][1])) foundSecondCoord = true;
                if (foundSecondCoord) {
                    let val = endParts[i].replace(',', '.');
                    if (!isNaN(parseFloat(val)) && !val.includes(':') && val.length < 10 && i > (endParts.indexOf(matches[1][1]) + 1)) {
                        mileageValue = endParts[i];
                        break;
                    }
                }
            }
            
            const actualTime = endParts[endParts.length - 2]; 

            if (!isNaN(engLat) && !isNaN(engLng)) {
                const marker = L.marker([engLat, engLng]).addTo(map);
                marker.bindPopup(`<b>${fullTitle}</b>`);
                
                const item = document.createElement("div");
                item.className = "route-item";
                item.id = `item-${index}`; // ID для поиска из карты[cite: 4]
                item.innerHTML = `
                    <b>${fullTitle}</b>
                    <div class="route-data-row">
                        <span>Mileage: <b>${mileageValue}</b></span>
                        <span>Time: <b>${actualTime} min</b></span>
                    </div>
                `;

                // --- СВЯЗЬ: СПИСОК -> КАРТА ---[cite: 4]
                item.onmouseenter = () => {
                    if (marker._icon) marker._icon.style.filter = "hue-rotate(150deg) brightness(1.5)";
                    marker.openPopup();
                };
                item.onmouseleave = () => {
                    if (marker._icon) marker._icon.style.filter = "";
                    marker.closePopup();
                };

                // --- СВЯЗЬ: КАРТА -> СПИСОК ---[cite: 4]
                marker.on('mouseover', () => {
                    item.classList.add('highlight-list');
                    item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                });
                marker.on('mouseout', () => {
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