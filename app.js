let map = L.map('map').setView([46.4825, 30.7233], 13);

L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap &copy; CARTO',
    subdomains: 'abcd',
    maxZoom: 19
}).addTo(map);

let polyline;
let markers = [];

function clearMap() {
    if (polyline) map.removeLayer(polyline);
    markers.forEach(m => map.removeLayer(m));
    markers = [];
}

function buildRoute() {
    clearMap();

    let text = document.getElementById("input").value;
    let lines = text.split("\n");

    let points = [];

    lines.forEach(line => {
        let parts = line.split(",");
        if (parts.length === 3) {
            let dateStr = parts[0].trim();
            let lat = parseFloat(parts[1]);
            let lng = parseFloat(parts[2]);

            let date = new Date(dateStr);

            if (!isNaN(lat) && !isNaN(lng) && !isNaN(date.getTime())) {
                points.push({ date, lat, lng, raw: dateStr });
            }
        }
    });

    points.sort((a, b) => a.date - b.date);

    let latlngs = [];

    points.forEach(p => {
        let marker = L.marker([p.lat, p.lng])
            .addTo(map)
            .bindPopup("Time: " + p.raw);

        markers.push(marker);
        latlngs.push([p.lat, p.lng]);
    });

    if (latlngs.length > 0) {
        polyline = L.polyline(latlngs, { color: '#27ae60', weight: 4 }).addTo(map);
        map.fitBounds(latlngs);
    }
}