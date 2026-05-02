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
    
    // Split by date to handle multiple entries
    const entries = rawText.split(/(?=202\d-\d{2}-\d{2})/).filter(e => e.trim().length > 20);
    const listContainer = document.getElementById("route-list");
    let latlngs = [];

    entries.forEach((line) => {
        const coordRegex = /(\d{2}\.\d+),\s+(\d{2}\.\d+)/g;
        const matches = [...line.matchAll(coordRegex)];

        if (matches.length >= 2) {
            // Engineer coordinates (2nd pair)
            const engLat = parseFloat(matches[1][1]);
            const engLng = parseFloat(matches[1][2]);

            // 1. Extract and Clean Title
            const textBeforeCoords = line.split(matches[0][0])[0].trim();
            const parts = textBeforeCoords.split(/\s+/);
            // Ignore Date(0), Time(1), ID(2). Filter out noise words.
            let deviceName = parts.slice(3)
                .filter(word => !["Поездка", "на", "склад", "POS", "терминал", "терміналы"].includes(word))
                .join(' ');

            // 2. Extract Numeric Data (Mileage & Time)
            const endParts = line.trim().split(/\s+/);
            // Mileage: find the first number appearing after coordinates/status
            const mileage = endParts.find((p, i) => i > 10 && !isNaN(p.replace(',', '.'))) || "0";
            // Time: usually the second to last element
            const actualTime = endParts[endParts.length - 2]; 

            if (!isNaN(engLat) && !isNaN(engLng)) {
                const marker = L.marker([engLat, engLng]).addTo(map);
                marker.bindPopup(`<b>${deviceName}</b>`);
                
                markers.push(marker);
                latlngs.push([engLat, engLng]);

                const item = document.createElement("div");
                item.className = "route-item";
                item.innerHTML = `
                    <b>${deviceName}</b>
                    <div class="route-data-row">
                        <span>Mileage: <b>${mileage}</b></span>
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