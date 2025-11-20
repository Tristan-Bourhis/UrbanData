// js/app.js (VERSION CORRIGÉE : Fix du crash MapLibre "null value")

document.addEventListener("DOMContentLoaded", () => {
  // ============================================================
  // 1. CONFIGURATION & SÉLECTEURS
  // ============================================================

  // ATTENTION : Si tu es en local, garde http. Si tu déploies, passe en https.
  const API_URL = "http://localhost:5000/api";
  const API_KEY = "APIKEY-VIEWER-67890";

  const datasetSelector = document.getElementById("dataset-selector");
  const graphWindow = document.getElementById("graph-window");
  const chartHeader = graphWindow.querySelector(".window-header");
  const chartTitle = document.getElementById("chart-title");
  const chartDiv = document.getElementById("timeline-chart");
  const kpiContainer = document.getElementById("kpi-container");
  const transportFilterGroup = document.getElementById(
    "transport-filter-group"
  );
  const transportTypeSelector = document.getElementById(
    "transport-type-selector"
  );

  const legendContainer = document.getElementById("map-legend");
  const legendBar = document.querySelector(".legend-bar");
  const legendMin = document.getElementById("legend-min");
  const legendMax = document.getElementById("legend-max");

  // Variables d'état
  let geojsonData = null;
  const dataCache = new Map();
  let zonesAComparer = new Map();
  let hoveredStateId = null;

  // Couleurs
  const comparisonColors = ["#007bff", "#d7191c"];
  const kpiColors = {
    bus: "#007bff",
    metro: "#8a2be2",
    tram: "#20c997",
    rail: "#fd7e14",
  };

  // ============================================================
  // 2. UTILITAIRES
  // ============================================================

  function getShortId(rawId) {
    if (!rawId) return "0";
    let s = String(rawId);
    if (s.startsWith("75")) s = s.substring(3);
    return String(parseInt(s));
  }

  // ============================================================
  // 3. INITIALISATION CARTE
  // ============================================================

  const map = new maplibregl.Map({
    container: "map",
    style:
      "https://api.maptiler.com/maps/positron/style.json?key=VG6aYxwCVxhTFizznhIL",
    center: [2.3522, 48.8566],
    zoom: 11.2,
  });

  map.addControl(new maplibregl.NavigationControl(), "top-right");
  const popup = new maplibregl.Popup({
    closeButton: false,
    closeOnClick: false,
    offset: 15,
  });

  // ============================================================
  // 4. CHARGEMENT DONNÉES (Logique Cœur)
  // ============================================================

  map.on("load", async () => {
    try {
      // 1. GeoJSON
      const response = await fetch("data/arrondissements.geojson");
      if (!response.ok) throw new Error("GeoJSON introuvable");
      geojsonData = await response.json();

      map.addSource("arrondissements-data", {
        type: "geojson",
        data: geojsonData,
        promoteId: "c_arinsee",
      });

      // 2. Layers
      map.addLayer({
        id: "arrondissements-remplissage",
        type: "fill",
        source: "arrondissements-data",
        paint: {
          "fill-color": "#CCCCCC",
          "fill-opacity": [
            "case",
            ["boolean", ["feature-state", "hover"], false],
            0.6,
            [">", ["feature-state", "selected_state"], 0],
            0.7,
            0.5,
          ],
        },
      });
      map.addLayer({
        id: "arrondissements-contours",
        type: "line",
        source: "arrondissements-data",
        paint: {
          "line-color": [
            "case",
            ["==", ["feature-state", "selected_state"], 1],
            comparisonColors[0],
            ["==", ["feature-state", "selected_state"], 2],
            comparisonColors[1],
            "#444",
          ],
          "line-width": [
            "case",
            [">", ["feature-state", "selected_state"], 0],
            3.0,
            ["boolean", ["feature-state", "hover"], false],
            2.5,
            1.5,
          ],
        },
      });
      map.addLayer({
        id: "arrondissements-labels",
        type: "symbol",
        source: "arrondissements-data",
        layout: {
          "text-field": ["get", "l_ar"],
          "text-size": 12,
          "text-font": ["Open Sans Semibold", "Arial Unicode MS Bold"],
        },
        paint: {
          "text-color": "#333",
          "text-halo-color": "white",
          "text-halo-width": 2,
        },
      });

      // 3. API Data
      await cacheAllAPIData();

      // 4. Init Premier Affichage
      if (datasetSelector.value !== "none") {
        loadAndDisplayData(datasetSelector.value);
      }
    } catch (error) {
      console.error("Erreur:", error);
      alert(`Erreur chargement: ${error.message}`);
    }
  });

  async function cacheAllAPIData() {
    const opts = { headers: { "X-API-KEY": API_KEY } };

    // Helper pour fetch sécurisé
    const safeFetch = async (url) => {
      try {
        const r = await fetch(url, opts);
        return await r.json();
      } catch (e) {
        console.error(url, e);
        return { data: [] };
      }
    };

    console.log("Chargement des données API...");

    // --- A. ARRÊTS & TOILETTES ---
    const resArr = await safeFetch(`${API_URL}/get-number-station`);
    dataCache.set(
      "arrets_count_total",
      await normalizeData(
        resArr,
        "arrondissement",
        "nombre_total_arrets",
        "arrêts"
      )
    );

    const resToil = await safeFetch(`${API_URL}/get-toilet-by-a`);
    dataCache.set(
      "toilettes_count",
      await normalizeData(resToil, "arrondissement", "nombre", "toilettes")
    );

    // --- B. LOGEMENTS SOCIAUX ---
    const resLog = await safeFetch(`${API_URL}/get-social-housing`);
    const logData = Array.isArray(resLog) ? resLog : resLog.data || [];

    console.log("DEBUG DATA LOGEMENTS:", logData[0]); // Pour vérifier

    const logMap = new Map();
    logData.forEach((d) => {
      const id = getShortId(d.arrondissement);
      const soc = parseInt(d.nombre_logements_sociaux) || 0;
      const tot = parseInt(d.nombre_total_logements) || 0;

      // On priorise la valeur de l'API si elle existe (8.74), sinon on calcule
      let ratio = parseFloat(d.ratio_logements_sociaux_pourcent);
      if (isNaN(ratio)) {
        ratio = tot > 0 ? (soc / tot) * 100 : 0;
      }

      logMap.set(id, {
        value: ratio,
        display_name: `${ratio.toFixed(1)} %`,
        nombre_sociaux: soc,
        nombre_total: tot,
      });
    });
    dataCache.set("logements_map", logMap);

    // --- C. TRANSPORTS DÉTAIL ---
    const resRatio = await safeFetch(`${API_URL}/get-type-ratio-station`);
    const ratioData = Array.isArray(resRatio) ? resRatio : resRatio.data || [];

    // IMPORTANT : On stocke avec la clé EXACTE utilisée plus tard
    dataCache.set("transports_ratio_raw", ratioData);

    ["bus", "metro", "tram", "rail"].forEach((t) => {
      const tMap = new Map();
      ratioData
        .filter((r) => r.type.toLowerCase() === t)
        .forEach((r) => {
          tMap.set(getShortId(r.arrondissement), {
            value: r.nombre_arrets_par_type,
            display_name: `${r.nombre_arrets_par_type} ${t}`,
          });
        });
      dataCache.set(`arrets_${t}`, tMap);
    });

    console.log("Données chargées et mises en cache.");
  }

  async function normalizeData(json, idKey, valKey, suffix) {
    const arr = Array.isArray(json) ? json : json.data || [];
    const m = new Map();
    arr.forEach((d) => {
      const v = parseFloat(d[valKey]) || 0;
      m.set(getShortId(d[idKey]), {
        value: v,
        display_name: `${v.toFixed(0)} ${suffix}`,
      });
    });
    return m;
  }

  // ============================================================
  // 5. AFFICHAGE & COULEURS
  // ============================================================

  function loadAndDisplayData(key, subType = "total") {
    let mapData;
    if (key === "arrets_count")
      mapData = dataCache.get(
        subType === "total" ? "arrets_count_total" : `arrets_${subType}`
      );
    else if (key === "logements_sociaux_ratio")
      mapData = dataCache.get("logements_map");
    else mapData = dataCache.get(key);

    geojsonData.features.forEach((f) => {
      const id = getShortId(f.properties.c_arinsee);
      const d = mapData ? mapData.get(id) : null;

      if (key !== "none" && d) {
        // --- SÉCURITÉ MAXIMALE ---
        // On s'assure que 'value' est un nombre. Si non, 0.
        f.properties.value =
          typeof d.value === "number" && !isNaN(d.value) ? d.value : 0;

        f.properties.display_name = d.display_name;
        if (key === "logements_sociaux_ratio") {
          f.properties.nombre_sociaux = d.nombre_sociaux;
          f.properties.nombre_total = d.nombre_total;
        }
      } else {
        f.properties.value = 0;
        f.properties.display_name = "N/A";
      }
    });

    map.getSource("arrondissements-data").setData(geojsonData);
    updateMapColors(key);
    updateLegend(key);
  }

  function updateMapColors(key) {
    if (!map.getLayer("arrondissements-remplissage")) return;
    if (key === "none") {
      map.setPaintProperty(
        "arrondissements-remplissage",
        "fill-color",
        "#CCCCCC"
      );
    } else {
      let scale;

      // --- CORRECTION CRITIQUE : COALESCE ---
      // ['coalesce', ['get', 'value'], 0]
      // Cela dit à MapLibre : "Essaie de lire 'value'. Si c'est null/vide, utilise 0".
      // Cela empêche le crash "Expected number but found null".
      const prop = ["coalesce", ["get", "value"], 0];

      if (key === "arrets_count") {
        scale = [
          "step",
          prop,
          "#f7fbff",
          50,
          "#deebf7",
          150,
          "#9ecae1",
          300,
          "#3182bd",
          500,
          "#08519c",
        ];
      } else if (key === "toilettes_count") {
        scale = [
          "step",
          prop,
          "#ffffcc",
          5,
          "#a1dab4",
          15,
          "#41b6c4",
          30,
          "#225ea8",
        ];
      } else if (key === "logements_sociaux_ratio") {
        scale = [
          "interpolate",
          ["linear"],
          prop,
          0,
          "#f7fcfd",
          3,
          "#bfd3e6",
          8,
          "#8c96c6",
          12,
          "#88419d",
          15,
          "#4d004b",
        ];
      }
      map.setPaintProperty("arrondissements-remplissage", "fill-color", scale);
    }
  }

  function updateLegend(key) {
    if (!legendContainer) return;
    if (key === "none") {
      legendContainer.style.display = "none";
      return;
    }
    legendContainer.style.display = "block";

    if (key === "arrets_count") {
      legendBar.style.background =
        "linear-gradient(to right, #f7fbff, #9ecae1, #08519c)";
      legendMin.textContent = "0";
      legendMax.textContent = "500+";
    } else if (key === "toilettes_count") {
      legendBar.style.background =
        "linear-gradient(to right, #ffffcc, #41b6c4, #225ea8)";
      legendMin.textContent = "0";
      legendMax.textContent = "30+";
    } else if (key === "logements_sociaux_ratio") {
      legendBar.style.background =
        "linear-gradient(to right, #f7fcfd, #8c96c6, #4d004b)";
      legendMin.textContent = "0%";
      legendMax.textContent = "15%+";
    }
  }

  // ============================================================
  // 6. INTERACTIONS (Events)
  // ============================================================

  datasetSelector.addEventListener("change", (e) => {
    const val = e.target.value;
    transportFilterGroup.style.display =
      val === "arrets_count" ? "block" : "none";
    transportTypeSelector.value = "total";
    zonesAComparer.clear();
    updateSelectionVisuals();
    clearChart();
    loadAndDisplayData(val);
  });

  transportTypeSelector.addEventListener("change", (e) => {
    loadAndDisplayData("arrets_count", e.target.value);
    if (zonesAComparer.size > 0) updateCharts();
  });

  map.on("mousemove", "arrondissements-remplissage", (e) => {
    map.getCanvas().style.cursor = "pointer";
    if (e.features.length > 0) {
      const p = e.features[0].properties;
      const txt =
        datasetSelector.value !== "none"
          ? `<div><strong>${p.l_ar}</strong><br>${p.display_name}</div>`
          : `<div><strong>${p.l_ar}</strong></div>`;
      popup.setLngLat(e.lngLat).setHTML(txt).addTo(map);
    }
  });
  map.on("mouseleave", "arrondissements-remplissage", () => {
    map.getCanvas().style.cursor = "";
    popup.remove();
  });

  map.on("click", "arrondissements-remplissage", (e) => {
    if (datasetSelector.value === "none") return;
    const p = e.features[0].properties;
    const id = getShortId(p.c_arinsee);

    if (zonesAComparer.has(id)) zonesAComparer.delete(id);
    else {
      if (zonesAComparer.size >= 2)
        zonesAComparer.delete(zonesAComparer.keys().next().value);
      zonesAComparer.set(id, p);
    }
    updateSelectionVisuals();
    updateCharts();
  });

  function updateSelectionVisuals() {
    const features = map.querySourceFeatures("arrondissements-data");
    features.forEach((f) =>
      map.setFeatureState(
        { source: "arrondissements-data", id: f.id },
        { selected_state: 0 }
      )
    );
    let i = 1;
    for (const id_raw of zonesAComparer.keys()) {
      const match = features.find(
        (f) => getShortId(f.properties.c_arinsee) === id_raw
      );
      if (match)
        map.setFeatureState(
          { source: "arrondissements-data", id: match.id },
          { selected_state: i }
        );
      i++;
    }
  }

  // ============================================================
  // 7. GRAPHIQUES
  // ============================================================

  function clearChart() {
    chartDiv.innerHTML =
      '<p style="text-align:center; margin-top:50px; color:#777;">Sélectionnez une zone sur la carte.</p>';
    kpiContainer.innerHTML = "";
    chartTitle.textContent = "Analyse";
  }

  function updateCharts() {
    const key = datasetSelector.value;
    if (zonesAComparer.size === 0) {
      clearChart();
      return;
    }

    const names = [...zonesAComparer.values()]
      .map((p) => p.l_ar.split(" ")[0])
      .join(" vs ");
    chartTitle.textContent =
      zonesAComparer.size === 1
        ? `Analyse : ${names}`
        : `Comparaison : ${names}`;

    if (key === "arrets_count") drawTransportChart();
    else if (key === "toilettes_count") drawToiletsChart();
    else if (key === "logements_sociaux_ratio") drawHousingChart();
  }

  function drawTransportChart() {
    const rawData = dataCache.get("transports_ratio_raw");
    if (!rawData) {
      console.error("Pas de données transports brutes");
      return;
    }

    const typeFilter = transportTypeSelector.value;
    kpiContainer.innerHTML = "";

    // KPI (basés sur la 1ère zone)
    const p1 = zonesAComparer.values().next().value;
    const id1 = getShortId(p1.c_arinsee);
    const zoneData = rawData.filter(
      (d) => getShortId(d.arrondissement) === id1
    );

    ["bus", "metro", "tram", "rail"].forEach((t) => {
      const val =
        zoneData.find((d) => d.type.toLowerCase() === t)
          ?.nombre_arrets_par_type || 0;
      if (typeFilter === "total" || typeFilter === t) {
        kpiContainer.innerHTML += `<div class="kpi-card" data-type="${t}"><div class="kpi-card-title">${t.toUpperCase()}</div><div class="kpi-card-value" style="color:${
          kpiColors[t]
        }">${val}</div></div>`;
      }
    });

    // PLOTLY
    const traces = [];
    const types =
      typeFilter === "total" ? ["bus", "metro", "tram", "rail"] : [typeFilter];
    const typeColorsArray = [
      kpiColors.bus,
      kpiColors.metro,
      kpiColors.tram,
      kpiColors.rail,
    ];

    let zIdx = 0;
    zonesAComparer.forEach((p, id) => {
      const zId = getShortId(p.c_arinsee);
      const zData = rawData.filter((d) => getShortId(d.arrondissement) === zId);
      const yVals = types.map(
        (t) =>
          zData.find((d) => d.type.toLowerCase() === t)
            ?.nombre_arrets_par_type || 0
      );

      let barColors;
      if (zonesAComparer.size === 1 && typeFilter === "total")
        barColors = typeColorsArray;
      else if (zonesAComparer.size === 1) barColors = kpiColors[typeFilter];
      else barColors = comparisonColors[zIdx];

      traces.push({
        x: types.map((t) => t.toUpperCase()),
        y: yVals,
        name: p.l_ar.split(" ")[0],
        type: "bar",
        marker: { color: barColors },
        text: yVals,
        textposition: "auto",
      });
      zIdx++;
    });

    Plotly.newPlot(
      chartDiv,
      traces,
      {
        margin: { t: 30, l: 30, r: 30, b: 30 },
        showlegend: zonesAComparer.size > 1,
        paper_bgcolor: "#f8f9fa",
        plot_bgcolor: "#f8f9fa",
        xaxis: { showgrid: false },
        yaxis: { showgrid: true, gridcolor: "#ddd" },
      },
      { responsive: true, displayModeBar: false }
    );
  }

  function drawToiletsChart() {
    kpiContainer.innerHTML = "";
    const x = [],
      y = [],
      colors = [];
    let i = 0;
    zonesAComparer.forEach((p) => {
      x.push(p.l_ar.split(" ")[0]);
      y.push(p.value); // 'value' a été injecté par loadAndDisplayData
      colors.push(comparisonColors[i]);
      kpiContainer.innerHTML += `<div class="kpi-card"><div class="kpi-card-title">${
        p.l_ar.split(" ")[0]
      }</div><div class="kpi-card-value" style="color:${comparisonColors[i]}">${
        p.value
      }</div></div>`;
      i++;
    });

    if (zonesAComparer.size === 1)
      chartDiv.innerHTML = `<div style="height:100%; display:flex; align-items:center; justify-content:center; flex-direction:column;"><h3 style="color:#555;">TOTAL</h3><div style="font-size:5rem; font-weight:bold; color:#225ea8">${y[0]}</div></div>`;
    else
      Plotly.newPlot(
        chartDiv,
        [
          {
            x,
            y,
            type: "bar",
            marker: { color: colors },
            text: y,
            textposition: "auto",
          },
        ],
        {
          paper_bgcolor: "#f8f9fa",
          plot_bgcolor: "#f8f9fa",
          margin: { t: 30, l: 30, r: 30, b: 30 },
          xaxis: { showgrid: false },
          yaxis: { showgrid: true, gridcolor: "#ddd" },
        },
        { responsive: true, displayModeBar: false }
      );
  }

  function drawHousingChart() {
    kpiContainer.innerHTML = "";

    if (zonesAComparer.size === 1) {
      const p = zonesAComparer.values().next().value;
      const soc = p.nombre_sociaux || 0;
      const tot = p.nombre_total || 0;
      const rat = p.value || 0; // C'est notre % calculé

      kpiContainer.innerHTML = `<div class="kpi-card"><div class="kpi-card-title">Social</div><div class="kpi-card-value" style="color:#88419d">${soc.toLocaleString()}</div></div><div class="kpi-card"><div class="kpi-card-title">Total</div><div class="kpi-card-value">${tot.toLocaleString()}</div></div><div class="kpi-card"><div class="kpi-card-title">Taux</div><div class="kpi-card-value" style="color:#88419d">${rat.toFixed(
        1
      )}%</div></div>`;
      Plotly.newPlot(
        chartDiv,
        [
          {
            values: [soc, Math.max(0, tot - soc)],
            labels: ["Social", "Privé"],
            type: "pie",
            hole: 0.7,
            marker: { colors: ["#88419d", "#e0e0e0"] },
            textinfo: "none",
            hoverinfo: "label+value+percent",
            sort: false,
          },
        ],
        {
          showlegend: false,
          paper_bgcolor: "#f8f9fa",
          plot_bgcolor: "#f8f9fa",
          margin: { t: 20, b: 20, l: 20, r: 20 },
          annotations: [
            {
              text: `${rat.toFixed(1)}%`,
              x: 0.5,
              y: 0.5,
              font: { size: 30, color: "#88419d", weight: "bold" },
              showarrow: false,
            },
          ],
        },
        { responsive: true, displayModeBar: false }
      );
    } else {
      const x = [],
        y = [],
        colors = [];
      let i = 0;
      zonesAComparer.forEach((p) => {
        const rat = p.value || 0;
        x.push(p.l_ar.split(" ")[0]);
        y.push(rat);
        colors.push(comparisonColors[i]);
        kpiContainer.innerHTML += `<div class="kpi-card"><div class="kpi-card-title">${
          p.l_ar.split(" ")[0]
        }</div><div class="kpi-card-value" style="color:${
          comparisonColors[i]
        }">${rat.toFixed(1)}%</div></div>`;
        i++;
      });
      Plotly.newPlot(
        chartDiv,
        [
          {
            x,
            y,
            type: "bar",
            marker: { color: colors },
            text: y.map((v) => v.toFixed(1) + "%"),
            textposition: "auto",
          },
        ],
        {
          title: "Taux de Logements Sociaux",
          paper_bgcolor: "#f8f9fa",
          plot_bgcolor: "#f8f9fa",
          margin: { t: 40, l: 40, r: 30, b: 30 },
          xaxis: { showgrid: false },
          yaxis: { showgrid: true, gridcolor: "#ddd", title: "%" },
        },
        { responsive: true, displayModeBar: false }
      );
    }
  }

  // ============================================================
  // 8. DRAGGABLE WINDOW
  // ============================================================
  const d = document.getElementById("graph-window");
  const h = document.querySelector(".window-header");
  let x = 0,
    y = 0,
    mx = 0,
    my = 0;
  h.onmousedown = (e) => {
    e.preventDefault();
    mx = e.clientX;
    my = e.clientY;
    document.onmouseup = () => {
      document.onmouseup = null;
      document.onmousemove = null;
    };
    document.onmousemove = (e) => {
      e.preventDefault();
      x = mx - e.clientX;
      y = my - e.clientY;
      mx = e.clientX;
      my = e.clientY;
      d.style.top = d.offsetTop - y + "px";
      d.style.left = d.offsetLeft - x + "px";
    };
  };
  new ResizeObserver(() => {
    if (chartDiv) Plotly.Plots.resize(chartDiv);
  }).observe(d);
});
