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
    
    // Split by date pattern: 2026-05-01 08:15:30[cite: 4]
    const entries = rawText.split(/(?=\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2})/).filter(e => e.trim().length > 20);
    const listContainer = document.getElementById("route-list");
    let latlngs = [];

    entries.forEach((line) => {
        // Regex to find coordinate pairs (e.g., 47.827094, 31.168991)[cite: 4]
        const coordRegex = /(\d{2}\.\d+),\s+(\d{2}\.\d+)/g;
        const matches = [...line.matchAll(coordRegex)];

        if (matches.length >= 2) {
            const engLat = parseFloat(matches[1][1]);
            const engLng = parseFloat(matches[1][2]);

            // --- HEADER LOGIC ---[cite: 4]
            // 1. Get everything before the very first coordinate[cite: 4]
            let preCoordText = line.split(matches[0][0])[0].trim();
            
            // 2. Remove date and time from the start (YYYY-MM-DD HH:MM:SS ID)[cite: 4]
            // We split by space and skip the first 3 parts (Date, Time, Sheet ID)[cite: 4]
            let parts = preCoordText.split(/\s+/);
            let fullTitle = parts.slice(3).join(' '); 

            // --- DATA LOGIC ---[cite: 4]
            const endParts = line.trim().split(/\s+/);
            
            // Mileage: find first numeric value after the second set of coordinates[cite: 4]
            let mileageValue = "0";
            let secondCoordStr = matches[1][0]; 
            let foundSecondCoord = false;

            for (let i = 0; i < endParts.length; i++) {
                if (endParts[i].includes(matches[1][1])) foundSecondCoord = true;
                if (foundSecondCoord) {
                    // Look for the next element that is a pure number (or has a comma)[cite: 4]
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
            color: '#27ae60', weight: 4, opacity: 0.8, dashArray: '5, 10'
        }).addTo(map);
        map.fitBounds(polyline.getBounds(), { padding: [50, 50] });
    } else if (latlngs.length === 1) {
        map.setView(latlngs[0], 15);
    }
}