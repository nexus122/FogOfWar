document.addEventListener("DOMContentLoaded", () => {
    console.log("DOM cargado");

    // ----------------- Mapa -----------------
    const map = L.map("map").setView([40.4168, -3.7038], 13);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors"
    }).addTo(map);
    console.log("Mapa inicializado");

    // ----------------- Canvas -----------------
    const canvas = document.getElementById("fog");
    const ctx = canvas.getContext("2d");
    let fogAlpha = 0.85;
    let holes = [];

    function resizeCanvas() {
        const size = map.getSize();
        canvas.width = size.x;
        canvas.height = size.y;
        console.log("Canvas redimensionado:", canvas.width, canvas.height);
        redrawFogAndHoles();
    }
    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();

    // ----------------- Conversiones -----------------
    function mapToScreen(lat, lng) {
        const p = map.latLngToContainerPoint([lat, lng]);
        return { x: p.x, y: p.y };
    }

    function calculateRadius(lat, lng, meters = 100) {
        const point1 = L.latLng(lat, lng);
        const point2 = L.latLng(lat, lng + meters / 111320);
        const px1 = map.latLngToContainerPoint(point1);
        const px2 = map.latLngToContainerPoint(point2);
        return Math.abs(px2.x - px1.x);
    }

    // ----------------- Dibujo -----------------
    function drawFog() {
        ctx.fillStyle = `rgba(0,0,0,${fogAlpha})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        console.log("Dibujando niebla...");
    }

    function drawHoles() {
        console.log("Dibujando agujeros:", holes.length);
        holes.forEach(h => {
            const { x, y } = mapToScreen(h.lat, h.lng);
            const radius = calculateRadius(h.lat, h.lng);
            const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
            gradient.addColorStop(0, "rgba(0,0,0,1)");
            gradient.addColorStop(0.5, "rgba(0,0,0,0.5)");
            gradient.addColorStop(1, "rgba(0,0,0,0)");
            ctx.globalCompositeOperation = "destination-out";
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalCompositeOperation = "source-over";
        });
    }

    function redrawFogAndHoles() {
        console.log("Redibujando niebla y agujeros");
        drawFog();
        drawHoles();
    }

    // ----------------- LocalStorage -----------------
    function saveHoles() {
        localStorage.setItem("fogHoles", JSON.stringify(holes));
        console.log("Holes guardados:", holes.length);
    }

    function loadHoles() {
        const saved = localStorage.getItem("fogHoles");
        if (saved) {
            holes = JSON.parse(saved);
            console.log("Holes cargados desde localStorage:", holes.length);
        }
    }
    loadHoles();

    function createHole(lat, lng) {
        holes.push({ lat, lng });
        console.log("Creando agujero en:", lat, lng);
        saveHoles();
        redrawFogAndHoles();
    }

    // ----------------- Eventos -----------------
    //map.on("click", e => createHole(e.latlng.lat, e.latlng.lng));
    map.on("move", redrawFogAndHoles);
    map.on("zoom", redrawFogAndHoles);

    // ----------------- Geolocalización -----------------
    if ("geolocation" in navigator) {
        navigator.geolocation.watchPosition(
            pos => {
                const { latitude, longitude } = pos.coords;
                console.log("Geolocalización:", latitude, longitude);
                createHole(latitude, longitude);
                map.setView([latitude, longitude], map.getZoom());
            },
            err => console.error("Error geolocalización:", err),
            { enableHighAccuracy: true }
        );
    }

    // Primera carga
    redrawFogAndHoles();
});
