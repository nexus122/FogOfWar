document.addEventListener("DOMContentLoaded", () => {
    // -------- Mapa --------
    const map = L.map("map").setView([40.4168, -3.7038], 13); // Madrid
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors"
    }).addTo(map);

    // -------- Canvas de niebla --------
    const fogCanvas = document.getElementById("fog");
    const fogCtx = fogCanvas.getContext("2d");

    function resizeCanvas() {
        const size = map.getSize();
        fogCanvas.width = size.x;
        fogCanvas.height = size.y;
        drawFog();
    }

    window.addEventListener("resize", resizeCanvas);

    // Dibujar niebla simple
    function drawFog() {
        fogCtx.clearRect(0, 0, fogCanvas.width, fogCanvas.height);
        fogCtx.fillStyle = "rgba(0,0,0,0.7)";
        fogCtx.fillRect(0, 0, fogCanvas.width, fogCanvas.height);
    }

    // -------- Agujeros --------
    let holes = JSON.parse(localStorage.getItem("fogHoles") || "[]");

    function saveHoles() {
        localStorage.setItem("fogHoles", JSON.stringify(holes));
    }

    function mapToScreen(lat, lng) {
        const p = map.latLngToContainerPoint([lat, lng]);
        return { x: p.x, y: p.y };
    }

    function calculateRadius(lat, lng, meters = 50) {
        const point1 = L.latLng(lat, lng);
        const point2 = L.latLng(lat, lng + meters / 111320);
        const px1 = map.latLngToContainerPoint(point1);
        const px2 = map.latLngToContainerPoint(point2);
        return Math.abs(px2.x - px1.x);
    }

    function drawHoles() {
        fogCtx.save();
        fogCtx.globalCompositeOperation = "destination-out";
        holes.forEach(h => {
            const { x, y } = mapToScreen(h.lat, h.lng);
            const radius = calculateRadius(h.lat, h.lng, 50);
            const gradient = fogCtx.createRadialGradient(x, y, 0, x, y, radius);
            gradient.addColorStop(0, "rgba(0,0,0,1)");
            gradient.addColorStop(0.5, "rgba(0,0,0,0.5)");
            gradient.addColorStop(1, "rgba(0,0,0,0)");
            fogCtx.fillStyle = gradient;
            fogCtx.beginPath();
            fogCtx.arc(x, y, radius, 0, Math.PI * 2);
            fogCtx.fill();
        });
        fogCtx.restore();
    }

    function createHole(lat, lng) {
        holes.push({ lat, lng });
        saveHoles();
        drawFog();
        drawHoles();
    }

    // Redibujar con suavidad usando requestAnimationFrame
    let redrawPending = false;
    function requestRedraw() {
        if (!redrawPending) {
            redrawPending = true;
            requestAnimationFrame(() => {
                drawFog();
                drawHoles();
                redrawPending = false;
            });
        }
    }

    map.on("move", requestRedraw);
    map.on("zoom", requestRedraw);

    map.on("click", e => createHole(e.latlng.lat, e.latlng.lng));

    // -------- Geolocalización --------
    if ("geolocation" in navigator) {
        navigator.geolocation.watchPosition(
            pos => {
                const { latitude, longitude } = pos.coords;
                createHole(latitude, longitude);
                map.setView([latitude, longitude], map.getZoom());
            },
            err => console.error(err),
            { enableHighAccuracy: true }
        );
    }

    resizeCanvas();
    drawFog();
    drawHoles();
});
