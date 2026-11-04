
import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { getSensorLatest, getStoredReadings } from "../services/api";
import "../styles/OceanMap.css";

function validGPS(item) {
  const lat = Number(item?.latitude);
  const lng = Number(item?.longitude);

  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 && lat <= 90 &&
    lng >= -180 && lng <= 180 &&
    !(lat === 0 && lng === 0)
  );
}

function sourceLabel(item, isLatest = false) {
  const source = String(
    item?.data_mode || item?.source || item?.source_type || ""
  ).toUpperCase();

  if (source.includes("REAL") || source.includes("HARDWARE")) {
    return "REAL SENSOR";
  }

  if (
    source.includes("SIMULAT") ||
    String(item?.device_id || "").startsWith("OE-SIM")
  ) {
    return "SIMULATED";
  }

  return isLatest ? "CURRENT SENSOR" : "STORED HISTORY · SOURCE UNVERIFIED";
}

function popupContent(item, label) {
  const container = document.createElement("div");
  container.className = "ocean-map-popup";

  const heading = document.createElement("strong");
  heading.textContent = label;
  container.appendChild(heading);

  const fields = [
    ["Device", item.device_id || "Unknown"],
    ["Latitude", Number(item.latitude).toFixed(6)],
    ["Longitude", Number(item.longitude).toFixed(6)],
    ["Temperature", `${item.temperature ?? "N/A"} °C`],
    ["Turbidity", item.turbidity ?? "N/A"],
    ["Timestamp", item.timestamp || "Unavailable"],
    ["Source", sourceLabel(item)]
  ];

  fields.forEach(([name, value]) => {
    const line = document.createElement("div");
    line.textContent = `${name}: ${value}`;
    container.appendChild(line);
  });

  return container;
}

export default function OceanMap() {
  const mapElement = useRef(null);
  const mapInstance = useRef(null);
  const markersLayer = useRef(null);
  const [status, setStatus] = useState("Connecting to GPS data...");
  const [counts, setCounts] = useState({
    simulated: 0,
    real: 0,
    history: 0
  });
  const [lastUpdated, setLastUpdated] = useState("");

  useEffect(() => {
    if (!mapElement.current || mapInstance.current) return;

    const map = L.map(mapElement.current, {
      center: [13.08389, 80.269912],
      zoom: 14,
      zoomControl: true
    });

    mapInstance.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19
    }).addTo(map);

    markersLayer.current = L.layerGroup().addTo(map);

    let active = true;

    async function loadGPS() {
      try {
        const [latestResult, historyResult] = await Promise.allSettled([
          getSensorLatest(),
          getStoredReadings(100)
        ]);

        if (!active) return;

        const latest =
          latestResult.status === "fulfilled"
            ? latestResult.value
            : null;

        const history =
          historyResult.status === "fulfilled"
            ? historyResult.value
            : [];

        const readings = Array.isArray(history)
          ? history
          : history?.items || history?.readings || [];

        markersLayer.current.clearLayers();

        const validHistory = readings.filter(validGPS);
        const validLatest = latest && validGPS(latest) ? latest : null;

        let simulated = 0;
        let real = 0;
        const plotted = [];

        validHistory.forEach((reading, index) => {
          const label = sourceLabel(reading);
          const isReal = label === "REAL SENSOR";

          if (isReal) real++;
          else simulated++;

          const marker = L.circleMarker(
            [Number(reading.latitude), Number(reading.longitude)],
            {
              radius: 6,
              color: isReal ? "#48e0a4" : "#55b9ff",
              fillColor: isReal ? "#48e0a4" : "#55b9ff",
              fillOpacity: 0.85,
              weight: 2
            }
          );

          marker.bindPopup(
            popupContent(reading, `Historical checkpoint ${index + 1}`)
          );

          marker.addTo(markersLayer.current);
          plotted.push([Number(reading.latitude), Number(reading.longitude)]);
        });

        if (validLatest) {
          const label = sourceLabel(latest, true);
          const isReal = label === "REAL SENSOR";

          if (isReal) real++;
          else simulated++;

          const marker = L.circleMarker(
            [Number(latest.latitude), Number(latest.longitude)],
            {
              radius: 11,
              color: "#ffffff",
              fillColor: isReal ? "#48e0a4" : "#ffb84d",
              fillOpacity: 1,
              weight: 3
            }
          );

          marker.bindPopup(popupContent(latest, "Latest sensor checkpoint"));
          marker.addTo(markersLayer.current);
          marker.openPopup();

          plotted.push([
            Number(latest.latitude),
            Number(latest.longitude)
          ]);
        }

        if (plotted.length > 0) {
          map.fitBounds(plotted, { padding: [35, 35], maxZoom: 16 });
          setStatus("GPS checkpoints loaded");
        } else {
          setStatus("No valid GPS coordinates received");
        }

        setCounts({
          simulated,
          real,
          history: validHistory.length
        });

        setLastUpdated(new Date().toLocaleTimeString());
      } catch (error) {
        if (active) setStatus(`GPS loading error: ${error.message}`);
      }
    }

    loadGPS();
    const timer = setInterval(loadGPS, 5000);

    setTimeout(() => {
      if (active) map.invalidateSize();
    }, 300);

    return () => {
      active = false;
      clearInterval(timer);
      map.remove();
      mapInstance.current = null;
      markersLayer.current = null;
    };
  }, []);

  return (
    <div className="ocean-map-page">
      <div className="ocean-map-toolbar">
        <div>
          <span className="map-eyebrow">GEOSPATIAL MONITORING</span>
          <h2>Ocean sensor locations</h2>
          <p>{status}</p>
        </div>
        <span className="map-refresh">AUTO REFRESH · 5 SEC</span>
      </div>

      <div className="map-legend">
        <span><i className="legend-dot latest-dot" /> Latest checkpoint</span>
        <span><i className="legend-dot simulated-dot" /> Simulated / stored</span>
        <span><i className="legend-dot real-dot" /> Verified real sensor</span>
      </div>

      <div ref={mapElement} className="ocean-leaflet-map" />

      <div className="map-stat-grid">
        <div className="map-stat">
          <span>SIMULATED / STORED</span>
          <strong>{counts.simulated}</strong>
        </div>
        <div className="map-stat">
          <span>VERIFIED REAL</span>
          <strong>{counts.real}</strong>
        </div>
        <div className="map-stat">
          <span>HISTORICAL GPS POINTS</span>
          <strong>{counts.history}</strong>
        </div>
      </div>

      <div className="map-footnote">
        Map tiles © OpenStreetMap contributors. Checkpoints are plotted from
        backend GPS coordinates. Stored readings without source metadata are
        not classified as verified real hardware data.
        {lastUpdated && ` Last updated: ${lastUpdated}.`}
      </div>
    </div>
  );
}
