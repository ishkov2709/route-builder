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
    
    // Улучшенная разбивка по дате
    const entries = rawText.split(/(?=\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2})/).filter(e => e.trim().length > 20);
    const listContainer = document.getElementById("route-list");
    let latlngs = [];

    entries.forEach((line, index) => {
        const coordRegex = /(\d{2}\.\d+),\s+(\d{2}\.\d+)/g;
        const matches = [...line.matchAll(coordRegex)];

        if (matches.length >= 2) {
            const engLat = parseFloat(matches[1][1]);
            const engLng = parseFloat(matches[1][2]);

            // --- HEADER ---
            let preCoordText = line.split(matches[0][0])[0].trim();
            let parts = preCoordText.split(/\s+/);
            // Пропускаем дату (0), время (1) и ID (2)
            let fullTitle = parts.slice(3).join(' '); 

            // --- MILEAGE & TIME LOGIC ---[cite: 4]
            const allWords = line.replace(/\n/g, ' ').split(/\s+/);
            let mileageValue = "0";
            let timeValue = "0";

            // Ищем пробег: число, которое идет ПОСЛЕ фразы "підтверджені"[cite: 4]
            const statusIdx = allWords.findIndex(w => w.includes("підтверджені"));
            if (statusIdx !== -1 && allWords[statusIdx + 1]) {
                let val = allWords[statusIdx + 1].replace(',', '.');
                if (!isNaN(parseFloat(val))) {
                    mileageValue = allWords[statusIdx + 1];
                }
            }

            // Ищем время: обычно это предпоследнее или последнее число в блоке[cite: 4]
            // Отфильтруем все числа в конце строки[cite: 4]
            const numericValues = allWords.filter(w => !isNaN(parseFloat(w.replace(',', '.'))) && !w.includes('-') && !w.includes(':'));
            if (numericValues.length >= 2) {
                timeValue = numericValues[numericValues.length - 1]; // Последнее число — это время[cite: 4]
            }

            if (!isNaN(engLat) && !isNaN(engLng)) {
                const marker = L.marker([engLat, engLng]).addTo(map);
                marker.bindPopup(`<b>${fullTitle}</b>`);
                
                const item = document.createElement("div");
                item.className = "route-item";
                item.innerHTML = `
                    <b>${fullTitle}</b>
                    <div class="route-data-row">
                        <span>Mileage: <b>${mileageValue}</b></span>
                        <span>Time: <b>${timeValue} min</b></span>
                    </div>
                `;

                // Hover effects[cite: 4]
                item.onmouseenter = () => {
                    if (marker._icon) marker._icon.style.filter = "hue-rotate(150deg) brightness(1.5)";
                    marker.openPopup();
                };
                item.onmouseleave = () => {
                    if (marker._icon) marker._icon.style.filter = "";
                    marker.closePopup();
                };

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