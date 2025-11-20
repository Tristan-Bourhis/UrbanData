document.addEventListener("DOMContentLoaded", () => {
  // ============================================================
  // 1. CONFIGURATION & SÉLECTEURS
  // ============================================================

  const API_URL = "/api";
  const API_KEY = "APIKEY-VIEWER-67890";

  const datasetSelector = document.getElementById("dataset-selector");

  // Selecteurs Slider
  const yearSliderGroup = document.getElementById("year-slider-group");
  const yearSlider = document.getElementById("year-slider");
  const yearDisplay = document.getElementById("year-display");

  const graphWindow = document.getElementById("graph-window");
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

  let transportPointsData = [];
  let treePointsData = [];

  let selectedTransportType = "total";
  let currentYear = 2025; // Année par défaut

  // Couleurs
  const comparisonColors = ["#007bff", "#d7191c"];
  const kpiColors = {
    bus: "#007bff",
    metro: "#8a2be2",
    tram: "#20c997",
    rail: "#fd7e14",
    tree: "#28a745",
    immo: "#d63384", // Rose pour l'immo
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
  // 4. CHARGEMENT DONNÉES
  // ============================================================

  map.on("load", async () => {
    try {
      // GeoJSON
      const response = await fetch("data/arrondissements.geojson");
      if (!response.ok) throw new Error("GeoJSON introuvable");
      geojsonData = await response.json();

      map.addSource("arrondissements-data", {
        type: "geojson",
        data: geojsonData,
        promoteId: "c_arinsee",
      });

      // Layers de base
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

      // Chargement API
      await cacheAllAPIData();

      createTransportPointsSourceAndLayers();
      createTreePointsSourceAndLayers();

      // Init
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
    const safeFetch = async (url) => {
      try {
        const r = await fetch(url, opts);
        return await r.json();
      } catch (e) {
        console.error(url, e);
        return { data: [] };
      }
    };

    console.log("Chargement données...");

    // A. Stations
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

    // B. Toilettes
    const resToil = await safeFetch(`${API_URL}/get-toilet-by-a`);
    dataCache.set(
      "toilettes_count",
      await normalizeData(resToil, "arrondissement", "nombre", "toilettes")
    );

    // C. Arbres
    const resTreeCount = await safeFetch(`${API_URL}/get-tree-number`);
    dataCache.set(
      "arbres_count",
      await normalizeData(
        resTreeCount,
        "arrondissement",
        "nombre_arbre",
        "arbres"
      )
    );
    const resTreePoints = await safeFetch(`${API_URL}/get-tree`);
    let rawTreePoints = Array.isArray(resTreePoints)
      ? resTreePoints
      : resTreePoints.data || [];
    treePointsData = rawTreePoints.map((t) => {
      const gp = t.geo_point_2d || "";
      const coords = gp.split(",").map((c) => parseFloat(c.trim()));
      return {
        ...t,
        short_arr: getShortId(t.arrondissement),
        _lon: coords.length === 2 && !isNaN(coords[1]) ? coords[1] : null,
        _lat: coords.length === 2 && !isNaN(coords[0]) ? coords[0] : null,
      };
    });

    // D. Logements
    const resLog = await safeFetch(`${API_URL}/get-social-housing`);
    const logData = Array.isArray(resLog) ? resLog : resLog.data || [];
    const logMap = new Map();
    logData.forEach((d) => {
      const id = getShortId(d.arrondissement);
      const soc = parseInt(d.nombre_logements_sociaux) || 0;
      const tot = parseInt(d.nombre_total_logements) || 0;
      let ratio = parseFloat(d.ratio_logements_sociaux_pourcent);
      if (isNaN(ratio)) ratio = tot > 0 ? (soc / tot) * 100 : 0;
      logMap.set(id, {
        value: ratio,
        display_name: `${ratio.toFixed(1)} %`,
        nombre_sociaux: soc,
        nombre_total: tot,
      });
    });
    dataCache.set("logements_map", logMap);

    // E. Transports Détail
    const resRatio = await safeFetch(`${API_URL}/get-type-ratio-station`);
    const ratioData = Array.isArray(resRatio) ? resRatio : resRatio.data || [];
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

    const resPoints = await safeFetch(`${API_URL}/get-stations-points`);
    transportPointsData = Array.isArray(resPoints)
      ? resPoints
      : resPoints.data || [];
    transportPointsData = transportPointsData.map((p) => {
      const gp = p.geo_point_2d || "";
      const coords = gp.split(",").map((c) => parseFloat(c.trim()));
      return {
        ...p,
        short_arr: getShortId(p.arrondissement),
        _lon: coords.length === 2 && !isNaN(coords[1]) ? coords[1] : null,
        _lat: coords.length === 2 && !isNaN(coords[0]) ? coords[0] : null,
        _label:
          typeof p.type === "string" && p.type.length > 0
            ? p.type.charAt(0).toUpperCase()
            : "?",
        _type: typeof p.type === "string" ? p.type.toLowerCase() : "unknown",
      };
    });

    // --- F. VALEUR FONCIERE ---
    const resLand = await safeFetch(`${API_URL}/get-land-value`);
    const landData = Array.isArray(resLand) ? resLand : resLand.data || [];

    dataCache.set("land_value_raw", landData);

    const landByYear = new Map();
    landData.forEach((d) => {
      const y = parseInt(d.annee);
      const id = getShortId(d.arrondissement);
      if (!landByYear.has(y)) landByYear.set(y, new Map());

      const cleanData = {
        value: parseFloat(d.prix_m2_moyen) || 0,
        display_name: `${parseFloat(d.prix_m2_moyen).toLocaleString(
          "fr-FR"
        )} €/m²`,
        prix_m2: parseFloat(d.prix_m2_moyen) || 0,
        prix_total: parseFloat(d.prix_moyen) || 0,
        surface: parseFloat(d.surface_totale_moyenne) || 0,
        pieces: parseFloat(d.nb_pieces_moyen) || 0,
      };
      landByYear.get(y).set(id, cleanData);
    });
    dataCache.set("land_value_map_by_year", landByYear);

    console.log("Toutes les données sont chargées.");
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
  // 5. GESTION POINTS (Layers)
  // ============================================================

  function createTransportPointsSourceAndLayers() {
    map.addSource("transport-points", {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    });
    map.addLayer({
      id: "transport-points-circle",
      type: "circle",
      source: "transport-points",
      paint: {
        "circle-radius": [
          "interpolate",
          ["linear"],
          ["zoom"],
          8,
          4,
          12,
          6,
          15,
          10,
        ],
        "circle-color": [
          "match",
          ["get", "type"],
          "bus",
          kpiColors.bus,
          "metro",
          kpiColors.metro,
          "tram",
          kpiColors.tram,
          "rail",
          kpiColors.rail,
          "#666",
        ],
        "circle-stroke-width": 1,
        "circle-stroke-color": "#ffffff",
        "circle-opacity": 0.95,
      },
      layout: { visibility: "none" },
    });
    map.addLayer({
      id: "transport-points-label",
      type: "symbol",
      source: "transport-points",
      layout: {
        "text-field": ["get", "label"],
        "text-size": [
          "interpolate",
          ["linear"],
          ["zoom"],
          8,
          8,
          12,
          10,
          15,
          14,
        ],
        "text-font": ["Open Sans Semibold", "Arial Unicode MS Bold"],
        "symbol-placement": "point",
        visibility: "none",
      },
      paint: {
        "text-color": "#ffffff",
        "text-halo-color": "rgba(0,0,0,0.25)",
        "text-halo-width": 0.5,
      },
    });
    setupPointInteraction(
      "transport-points-circle",
      (props) =>
        `<strong>${props.nom || ""}</strong><br>${props.type || ""}<br>Arr. ${
          props.arrondissement || ""
        }`
    );
  }

  function createTreePointsSourceAndLayers() {
    map.addSource("tree-points", {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    });
    map.addLayer({
      id: "tree-points-circle",
      type: "circle",
      source: "tree-points",
      paint: {
        "circle-radius": [
          "interpolate",
          ["linear"],
          ["zoom"],
          10,
          3,
          14,
          5,
          16,
          8,
        ],
        "circle-color": kpiColors.tree,
        "circle-stroke-width": 0.5,
        "circle-stroke-color": "#ffffff",
        "circle-opacity": 0.8,
      },
      layout: { visibility: "none" },
    });
    setupPointInteraction(
      "tree-points-circle",
      (props) =>
        `<strong>Arbre</strong><br>Espèce : ${
          props.espece || "Inconnue"
        }<br>Hauteur : ${props.hauteur || "?"} m`
    );
  }

  function setupPointInteraction(layerId, contentCallback) {
    map.on(
      "mouseenter",
      layerId,
      () => (map.getCanvas().style.cursor = "pointer")
    );
    map.on("mouseleave", layerId, () => (map.getCanvas().style.cursor = ""));
    map.on("click", layerId, (e) => {
      if (!e.features || !e.features[0]) return;
      const feat = e.features[0];
      document.querySelectorAll(".maplibregl-popup").forEach((p) => p.remove());
      new maplibregl.Popup({ closeButton: false, offset: 10 })
        .setLngLat(feat.geometry.coordinates.slice())
        .setHTML(contentCallback(feat.properties))
        .addTo(map);
    });
  }

  function updatePointsLayer() {
    const dataset = datasetSelector.value;
    const selectedIds = Array.from(zonesAComparer.keys());
    if (map.getLayer("transport-points-circle"))
      map.setLayoutProperty("transport-points-circle", "visibility", "none");
    if (map.getLayer("transport-points-label"))
      map.setLayoutProperty("transport-points-label", "visibility", "none");
    if (map.getLayer("tree-points-circle"))
      map.setLayoutProperty("tree-points-circle", "visibility", "none");

    if (zonesAComparer.size === 0) return;

    if (dataset === "arrets_count") {
      let filtered = transportPointsData.filter(
        (p) => p._lat && p._lon && selectedIds.includes(p.short_arr)
      );
      if (selectedTransportType !== "total")
        filtered = filtered.filter((p) => p._type === selectedTransportType);
      const features = filtered.map((p) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [p._lon, p._lat] },
        properties: {
          nom: p.nom,
          type: p.type,
          arrondissement: p.short_arr,
          label: p._label,
        },
      }));
      map
        .getSource("transport-points")
        .setData({ type: "FeatureCollection", features });
      map.setLayoutProperty("transport-points-circle", "visibility", "visible");
      map.setLayoutProperty("transport-points-label", "visibility", "visible");
    }
    if (dataset === "arbres_count") {
      let filtered = treePointsData.filter(
        (p) => p._lat && p._lon && selectedIds.includes(p.short_arr)
      );
      const features = filtered.map((p) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [p._lon, p._lat] },
        properties: {
          espece: p.espece,
          hauteur: p.hauteur,
          arrondissement: p.short_arr,
        },
      }));
      map
        .getSource("tree-points")
        .setData({ type: "FeatureCollection", features });
      map.setLayoutProperty("tree-points-circle", "visibility", "visible");
    }
  }

  // ============================================================
  // 6. AFFICHAGE & COULEURS
  // ============================================================

  function loadAndDisplayData(key, subType = "total") {
    let mapData = null;

    if (key === "arrets_count")
      mapData = dataCache.get(
        subType === "total" ? "arrets_count_total" : `arrets_${subType}`
      );
    else if (key === "logements_sociaux_ratio")
      mapData = dataCache.get("logements_map");
    else if (key === "arbres_count") mapData = dataCache.get("arbres_count");
    else if (key === "toilettes_count")
      mapData = dataCache.get("toilettes_count");
    else if (key === "valeur_fonciere") {
      const allYears = dataCache.get("land_value_map_by_year");
      if (allYears && allYears.has(currentYear)) {
        mapData = allYears.get(currentYear);
      }
    }

    geojsonData.features.forEach((f) => {
      const id = getShortId(f.properties.c_arinsee);
      const d = mapData ? mapData.get(id) : null;

      if (key !== "none" && d) {
        f.properties.value =
          typeof d.value === "number" && !isNaN(d.value) ? d.value : 0;
        f.properties.display_name = d.display_name;

        if (key === "logements_sociaux_ratio") {
          f.properties.nombre_sociaux = d.nombre_sociaux;
          f.properties.nombre_total = d.nombre_total;
        }

        if (key === "valeur_fonciere") {
          f.properties.prix_m2 = d.prix_m2;
          f.properties.surface = d.surface;
          f.properties.pieces = d.pieces;
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
      const prop = ["coalesce", ["get", "value"], 0];
      let scale;

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
      } else if (key === "arbres_count") {
        scale = [
          "step",
          prop,
          "#e5f5e0",
          5000,
          "#a1d99b",
          10000,
          "#31a354",
          15000,
          "#006d2c",
        ];
      } else if (key === "valeur_fonciere") {
        scale = [
          "interpolate",
          ["linear"],
          prop,
          8000,
          "#feebe2",
          10000,
          "#fbb4b9",
          12000,
          "#f768a1",
          14000,
          "#c51b8a",
          16000,
          "#7a0177",
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
        "linear-gradient(to right, #f7fbff, #3182bd, #08519c)";
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
    } else if (key === "arbres_count") {
      legendBar.style.background =
        "linear-gradient(to right, #e5f5e0, #31a354, #006d2c)";
      legendMin.textContent = "0";
      legendMax.textContent = "15k+";
    } else if (key === "valeur_fonciere") {
      legendBar.style.background =
        "linear-gradient(to right, #feebe2, #f768a1, #7a0177)";
      legendMin.textContent = "8k €";
      legendMax.textContent = "16k €";
    }
  }

  // ============================================================
  // 7. INTERACTIONS
  // ============================================================

  datasetSelector.addEventListener("change", (e) => {
    const val = e.target.value;

    transportFilterGroup.style.display =
      val === "arrets_count" ? "block" : "none";
    yearSliderGroup.style.display = val === "valeur_fonciere" ? "flex" : "none";

    transportTypeSelector.value = "total";
    selectedTransportType = "total";
    zonesAComparer.clear();

    updateSelectionVisuals();
    clearChart();
    loadAndDisplayData(val);

    document.querySelectorAll(".maplibregl-popup").forEach((p) => p.remove());
    updatePointsLayer();
  });

  yearSlider.addEventListener("input", (e) => {
    currentYear = parseInt(e.target.value);
    yearDisplay.textContent = currentYear;
    if (datasetSelector.value === "valeur_fonciere") {
      loadAndDisplayData("valeur_fonciere");
      if (zonesAComparer.size > 0) updateCharts();
    }
  });

  transportTypeSelector.addEventListener("change", (e) => {
    selectedTransportType = e.target.value;
    loadAndDisplayData("arrets_count", e.target.value);
    updatePointsLayer();
    if (zonesAComparer.size > 0) updateCharts();
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
    updatePointsLayer();
    updateCharts();
  });

  map.on("mousemove", "arrondissements-remplissage", (e) => {
    map.getCanvas().style.cursor = "pointer";
    if (e.features.length > 0) {
      const p = e.features[0].properties;
      let txt = `<div><strong>${p.l_ar}</strong></div>`;
      if (datasetSelector.value !== "none") {
        txt += `<div style='margin-top:4px; color:#555;'>${p.display_name}</div>`;
        if (datasetSelector.value === "valeur_fonciere") {
          txt += `<div style='font-size:0.8em; color:#888;'>${currentYear}</div>`;
        }
      }
      popup.setLngLat(e.lngLat).setHTML(txt).addTo(map);
    }
  });
  map.on("mouseleave", "arrondissements-remplissage", () => {
    map.getCanvas().style.cursor = "";
    popup.remove();
  });

  map.on("click", (e) => {
    const layersToCheck = [
      "transport-points-circle",
      "tree-points-circle",
      "arrondissements-remplissage",
    ];
    const features = map.queryRenderedFeatures(e.point, {
      layers: layersToCheck,
    });
    if (!features.length)
      document.querySelectorAll(".maplibregl-popup").forEach((p) => p.remove());
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
  // 8. GRAPHIQUES
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
    else if (key === "arbres_count") drawTreesChart();
    else if (key === "valeur_fonciere") drawLandValueChart();
  }

  // --- CHART LOGEMENTS SOCIAUX (CORRIGÉ : DONUT 100%) ---
  function drawHousingChart() {
    kpiContainer.innerHTML = "";

    // Si une seule zone : Donut Gauge (0 à 100%)
    if (zonesAComparer.size === 1) {
      const p = zonesAComparer.values().next().value;
      const rate = p.value || 0; // Ex: 20
      const remainder = Math.max(0, 100 - rate); // Ex: 80

      // KPI
      kpiContainer.innerHTML = `<div class="kpi-card"><div class="kpi-card-title">Social</div><div class="kpi-card-value" style="color:#88419d">${(
        p.nombre_sociaux || 0
      ).toLocaleString()}</div></div><div class="kpi-card"><div class="kpi-card-title">Total</div><div class="kpi-card-value">${(
        p.nombre_total || 0
      ).toLocaleString()}</div></div><div class="kpi-card"><div class="kpi-card-title">Taux</div><div class="kpi-card-value" style="color:#88419d">${rate.toFixed(
        1
      )}%</div></div>`;

      // Graphique Jauge
      Plotly.newPlot(
        chartDiv,
        [
          {
            values: [rate, remainder],
            labels: ["Social", "Autre"],
            type: "pie",
            hole: 0.7,
            marker: { colors: ["#88419d", "#e0e0e0"] }, // Violet pour le taux, gris pour le fond
            textinfo: "none",
            hoverinfo: "label+value",
            sort: false, // Important pour garder l'ordre
            direction: "clockwise",
          },
        ],
        {
          showlegend: false,
          paper_bgcolor: "#f8f9fa",
          plot_bgcolor: "#f8f9fa",
          margin: { t: 20, b: 20, l: 20, r: 20 },
          annotations: [
            {
              text: `${rate.toFixed(1)}%`,
              x: 0.5,
              y: 0.5,
              font: { size: 30, color: "#88419d", weight: "bold" },
              showarrow: false,
            },
          ],
        },
        { responsive: true, displayModeBar: false }
      );
    }
    // Si comparaison : Barres classiques
    else {
      const x = [],
        y = [],
        colors = [];
      let i = 0;
      zonesAComparer.forEach((p) => {
        x.push(p.l_ar.split(" ")[0]);
        y.push(p.value || 0);
        colors.push(comparisonColors[i]);
        kpiContainer.innerHTML += `<div class="kpi-card"><div class="kpi-card-title">${
          p.l_ar.split(" ")[0]
        }</div><div class="kpi-card-value" style="color:${
          comparisonColors[i]
        }">${(p.value || 0).toFixed(1)}%</div></div>`;
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

  function drawLandValueChart() {
    kpiContainer.innerHTML = "";
    const mapDataYear = dataCache
      .get("land_value_map_by_year")
      .get(currentYear);

    zonesAComparer.forEach((p, id) => {
      const freshData = mapDataYear ? mapDataYear.get(id) : null;
      if (!freshData) return;
      const color =
        zonesAComparer.size === 1
          ? kpiColors.immo
          : zonesAComparer.keys().next().value === id
          ? comparisonColors[0]
          : comparisonColors[1];
      let html = `<div class="kpi-card" style="border-top: 3px solid ${color}; grid-column: span 2;"><div class="kpi-card-title" style="color:${color}; font-weight:bold;">${
        p.l_ar.split(" ")[0]
      } (${currentYear})</div><div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; text-align:left; margin-top:5px;"><div><small>Prix m²</small><br><strong>${freshData.prix_m2.toLocaleString()} €</strong></div><div><small>Prix Moyen</small><br><strong>${(
        freshData.prix_total / 1000
      ).toFixed(
        0
      )} k€</strong></div><div><small>Surface</small><br><strong>${freshData.surface.toFixed(
        1
      )} m²</strong></div><div><small>Pièces</small><br><strong>${freshData.pieces.toFixed(
        1
      )}</strong></div></div></div>`;
      kpiContainer.innerHTML += html;
    });

    const rawData = dataCache.get("land_value_raw");
    const traces = [];
    let idx = 0;

    zonesAComparer.forEach((p, id) => {
      const shortId = getShortId(p.c_arinsee);
      const histData = rawData
        .filter((d) => getShortId(d.arrondissement) === shortId)
        .sort((a, b) => a.annee - b.annee);
      const xVal = histData.map((d) => d.annee);
      const yVal = histData.map((d) => parseFloat(d.prix_m2_moyen));
      traces.push({
        x: xVal,
        y: yVal,
        type: "scatter",
        mode: "lines+markers",
        name: p.l_ar.split(" ")[0],
        line: {
          color:
            zonesAComparer.size === 1 ? kpiColors.immo : comparisonColors[idx],
          width: 3,
        },
        marker: { size: 6 },
      });
      idx++;
    });

    Plotly.newPlot(
      chartDiv,
      traces,
      {
        title: "Évolution du Prix au m² (2020-2025)",
        font: { size: 10 },
        margin: { t: 40, l: 40, r: 20, b: 30 },
        paper_bgcolor: "#f8f9fa",
        plot_bgcolor: "#f8f9fa",
        xaxis: { title: "Année" },
        yaxis: { title: "€ / m²", showgrid: true, gridcolor: "#ddd" },
        showlegend: true,
        legend: { orientation: "h", y: -0.2 },
      },
      { responsive: true, displayModeBar: false }
    );
  }

  function drawTreesChart() {
    kpiContainer.innerHTML = "";
    const x = [],
      y = [],
      colors = [];
    let i = 0;
    zonesAComparer.forEach((p) => {
      x.push(p.l_ar.split(" ")[0]);
      y.push(p.value);
      colors.push(comparisonColors[i]);
      kpiContainer.innerHTML += `<div class="kpi-card" style="border-left: 4px solid ${
        comparisonColors[i]
      }"><div class="kpi-card-title">${
        p.l_ar.split(" ")[0]
      }</div><div class="kpi-card-value" style="color:#28a745">${p.value.toLocaleString()}</div><div style="font-size:0.8rem; color:#666">Arbres</div></div>`;
      i++;
    });
    if (zonesAComparer.size === 1) {
      chartDiv.innerHTML = `<div style="height:100%; display:flex; align-items:center; justify-content:center; flex-direction:column;"><h3 style="color:#555;">TOTAL ARBRES</h3><div style="font-size:4rem; font-weight:bold; color:#28a745">${y[0].toLocaleString()}</div></div>`;
    } else {
      Plotly.newPlot(
        chartDiv,
        [
          {
            x,
            y,
            type: "bar",
            marker: { color: colors },
            text: y.map((v) => v.toLocaleString()),
            textposition: "auto",
          },
        ],
        {
          paper_bgcolor: "#f8f9fa",
          plot_bgcolor: "#f8f9fa",
          margin: { t: 30, l: 40, r: 30, b: 30 },
          xaxis: { showgrid: false },
          yaxis: { showgrid: true, gridcolor: "#ddd" },
        },
        { responsive: true, displayModeBar: false }
      );
    }
  }

  function drawTransportChart() {
    const rawData = dataCache.get("transports_ratio_raw");
    const typeFilter = transportTypeSelector.value;
    kpiContainer.innerHTML = "";
    const kpiTotals = { bus: 0, metro: 0, tram: 0, rail: 0 };
    zonesAComparer.forEach((p) => {
      const zId = getShortId(p.c_arinsee);
      const zData = rawData.filter((d) => getShortId(d.arrondissement) === zId);
      ["bus", "metro", "tram", "rail"].forEach((t) => {
        const val =
          zData.find((d) => d.type.toLowerCase() === t)
            ?.nombre_arrets_par_type || 0;
        kpiTotals[t] += val;
      });
    });
    ["bus", "metro", "tram", "rail"].forEach((t) => {
      const val = kpiTotals[t];
      if (typeFilter === "total" || typeFilter === t) {
        kpiContainer.innerHTML += `<div class="kpi-card" data-type="${t}"><div class="kpi-card-title">${t.toUpperCase()}</div><div class="kpi-card-value" style="color:${
          kpiColors[t]
        }">${val}</div></div>`;
      }
    });
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
    zonesAComparer.forEach((p) => {
      const zId = getShortId(p.c_arinsee);
      const zData = rawData.filter((d) => getShortId(d.arrondissement) === zId);
      const yVals = types.map(
        (t) =>
          zData.find((d) => d.type.toLowerCase() === t)
            ?.nombre_arrets_par_type || 0
      );
      let barColors =
        zonesAComparer.size === 1 && typeFilter === "total"
          ? typeColorsArray
          : zonesAComparer.size === 1
          ? kpiColors[typeFilter]
          : comparisonColors[zIdx];
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
      y.push(p.value);
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
