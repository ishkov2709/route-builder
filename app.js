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

    // Очищаем текст от лишних переносов строк внутри одной записи
    const rawText = document.getElementById("input").value.trim();
    if (!rawText) return;
    
    // Разбиваем по дате, так как каждая запись начинается с "2026-"
    const entries = rawText.split(/(?=202\d-\d{2}-\d{2})/).filter(e => e.trim().length > 10);
    const listContainer = document.getElementById("route-list");
    let latlngs = [];

    entries.forEach((line) => {
        // Поиск координат
        const coordRegex = /(\d{2}\.\d+),\s+(\d{2}\.\d+)/g;
        const matches = [...line.matchAll(coordRegex)];

        if (matches.length >= 2) {
            // Координаты инженера (вторая пара)
            const engLat = parseFloat(matches[1][1]);
            const engLng = parseFloat(matches[1][2]);

            const dateStr = line.substring(0, 10);
            
            // ИЗВЛЕЧЕНИЕ ИМЕНИ (убираем лишнее)
            const textBeforeCoords = line.split(matches[0][0])[0].trim();
            const parts = textBeforeCoords.split(/\s+/);
            
            // Находим индекс после номера листа (обычно это 4-й элемент: Дата, Время, №)[cite: 4]
            // И убираем слова "Поездка", "на", "склад"[cite: 4]
            let deviceName = parts.slice(3)
                .filter(word => !["Поездка", "на", "склад", "Поїздка"].includes(word))
                .join(' ');

            // Пробег и время (с конца строки)[cite: 4]
            const endParts = line.trim().split(/\s+/);
            const mileage = endParts[endParts.length - 5]; 
            const actualTime = endParts[endParts.length - 2]; 

            if (!isNaN(engLat) && !isNaN(engLng)) {
                const marker = L.marker([engLat, engLng]).addTo(map);
                marker.bindPopup(`<b>${deviceName}</b><br>${dateStr}`);
                
                markers.push(marker);
                latlngs.push([engLat, engLng]);

                const item = document.createElement("div");
                item.className = "route-item";
                item.innerHTML = `
                    <b>${deviceName}</b>
                    <span style="color: #b2bec3; font-size: 11px;">${dateStr}</span>
                    <div class="route-data-row">
                        <span>Пробег: <b>${mileage}</b></span>
                        <span>Время: <b>${actualTime} мин</b></span>
                    </div>
                `;

                item.onclick = () => {
                    map.flyTo([engLat, engLng], 16);
                    marker.openPopup();
                };
                listContainer.appendChild(item);
            }
        }
    });

    // Рисуем линию, если есть хотя бы 2 точки[cite: 4]
    if (latlngs.length >= 2) {
        polyline = L.polyline(latlngs, {
            color: '#27ae60',
            weight: 5,
            opacity: 0.7,
            dashArray: '10, 10' // Пунктирная линия для красоты
        }).addTo(map);
        map.fitBounds(polyline.getBounds(), { padding: [50, 50] });
    } else if (latlngs.length === 1) {
        map.setView(latlngs[0], 15);
    }
}