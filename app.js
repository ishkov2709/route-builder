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
    
    // Разбивка по дате или по ID (начало новой записи)
    const entries = rawText.split(/(?=202\d-\d{2}-\d{2})|(?=\d{3}-\d{3}-\d{3})|(?=\d{7,})/).filter(e => e.trim().length > 15);
    const listContainer = document.getElementById("route-list");
    let latlngs = [];

    entries.forEach((line) => {
        const coordRegex = /(\d{2}\.\d+),\s+(\d{2}\.\d+)/g;
        const matches = [...line.matchAll(coordRegex)];

        if (matches.length >= 2) {
            const engLat = parseFloat(matches[1][1]);
            const engLng = parseFloat(matches[1][2]);

            // 1. Title Extraction: Name + Type
            // Берем текст перед первыми координатами и убираем дату/время, если они есть
            let headerText = line.split(matches[0][0])[0].trim();
            let headerParts = headerText.split(/\s+/);
            
            // Если строка начинается с даты, пропускаем первые 3 элемента (дата, время, доп. номер)
            let startIndex = headerParts[0].includes('-') ? 3 : 0;
            let fullTitle = headerParts.slice(startIndex).join(' ');

            // 2. Data Extraction: Mileage & Time
            const endParts = line.trim().split(/\s+/);
            
            // Ищем пробег: это первое число после координат (заменяем запятую на точку для парсинга)[cite: 4]
            let mileageValue = "0";
            for (let i = 0; i < endParts.length; i++) {
                if (endParts[i].includes(matches[1][1])) { // Нашли место координат
                    // Ищем следующее числовое значение[cite: 4]
                    for (let j = i + 2; j < endParts.length; j++) {
                        let val = endParts[j].replace(',', '.');
                        if (!isNaN(parseFloat(val)) && val !== "") {
                            mileageValue = endParts[j];
                            break;
                        }
                    }
                    break;
                }
            }
            
            const actualTime = endParts[endParts.length - 2]; 

            if (!isNaN(engLat) && !isNaN(engLng)) {
                const marker = L.marker([engLat, engLng]).addTo(map);
                marker.bindPopup(`<b>${fullTitle}</b>`);
                
                markers.push(marker);
                latlngs.push([engLat, engLng]);

                const item = document.createElement("div");
                item.className = "route-item";
                item.innerHTML = `
                    <b>${fullTitle}</b>
                    <div class="route-data-row">
                        <span>Mileage: <b>${mileageValue}</b></span>
                        <span>Time: <b>${actualTime} min</b></span>
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

    if (latlngs.length >= 2) {
        polyline = L.polyline(latlngs, {
            color: '#27ae60',
            weight: 4,
            opacity: 0.8,
            dashArray: '5, 10'
        }).addTo(map);
        map.fitBounds(polyline.getBounds(), { padding: [50, 50] });
    } else if (latlngs.length === 1) {
        map.setView(latlngs[0], 15);
    }
}