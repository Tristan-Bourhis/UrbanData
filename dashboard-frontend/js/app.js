// js/app.js (VERSION FINALE : Logique V1 "fonctionnelle" + Style V3 + Légende)

document.addEventListener("DOMContentLoaded", () => {
  // --- Sélecteurs DOM ---
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

  // --- NOUVEAU : Sélecteurs Légende ---
  const legendContainer = document.getElementById("map-legend");
  const legendBar = document.querySelector(".legend-bar");
  const legendMin = document.getElementById("legend-min");
  const legendMax = document.getElementById("legend-max");

  // --- Variables Globales ---
  const API_URL = "http://localhost:5000/api";
  const API_KEY = "APIKEY-VIEWER-67890";
  let geojsonData = null;
  const dataCache = new Map();
  let zonesAComparer = new Map();
  const comparisonColors = ["#007bff", "#d7191c"];
  let hoveredStateId = null;

  // --- Couleurs des KPI ---
  const kpiColors = {
    bus: "#007bff", // Bleu
    metro: "#8a2be2", // Violet
    tram: "#20c997", // Vert
    rail: "#fd7e14", // Orange
  };

  // --- Initialisation de la carte MapLibre ---
  const mapStyle =
    "https://api.maptiler.com/maps/positron/style.json?key=VG6aYxwCVxhTFizznhIL";
  const map = new maplibregl.Map({
    container: "map",
    style: mapStyle,
    center: [2.3522, 48.8566],
    zoom: 11.2,
  });
  map.addControl(new maplibregl.NavigationControl(), "top-right");
  const popup = new maplibregl.Popup({
    closeButton: false,
    closeOnClick: false,
    offset: 15,
  });

  // --- map.on('load') ---
  map.on("load", async () => {
    try {
      const response = await fetch("data/arrondissements.geojson");
      if (!response.ok)
        throw new Error("Fichier arrondissements.geojson non trouvé.");
      geojsonData = await response.json();

      map.addSource("arrondissements-data", {
        type: "geojson",
        data: geojsonData,
        promoteId: "c_arinsee",
      });

      // Ajouter les couches de la carte
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
            "#000000",
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
          "text-size": 13,
          "text-font": ["Open Sans Semibold", "Arial Unicode MS Bold"],
          "text-allow-overlap": false,
          "symbol-placement": "point",
        },
        paint: {
          "text-color": "#333333",
          "text-halo-color": "rgba(255, 255, 255, 0.8)",
          "text-halo-width": 1.5,
          "text-halo-blur": 0.5,
        },
      });

      await cacheAllAPIData();
      // Force l'affichage initial si une option est sélectionnée
      if (datasetSelector.value !== "none") {
        await loadAndDisplayData(datasetSelector.value);
      }
    } catch (error) {
      console.error("Erreur critique lors du chargement initial:", error);
      alert(`Erreur critique: ${error.message}.`);
    }
  });

  // --- Gestionnaire de Données (Data Handler) ---

  async function cacheAllAPIData() {
    console.log("Mise en cache des données de l'API...");
    const fetchOptions = { headers: { "X-API-KEY": API_KEY } };

    try {
      const [
        arretsResponse,
        toilettesResponse,
        logementsResponse,
        ratioTransportsResponse,
      ] = await Promise.all([
        fetch(`${API_URL}/get-number-station`, fetchOptions),
        fetch(`${API_URL}/get-toilet-by-a`, fetchOptions),
        fetch(`${API_URL}/get-social-housing`, fetchOptions),
        fetch(`${API_URL}/get-type-ratio-station`, fetchOptions),
      ]);

      dataCache.set(
        "arrets_count_total",
        await normalizeData(
          arretsResponse,
          "arrondissement",
          "nombre_total_arrets",
          "arrêts"
        )
      );
      dataCache.set(
        "toilettes_count",
        await normalizeData(
          toilettesResponse,
          "arrondissement",
          "nombre",
          "toilettes"
        )
      );

      // --- CORRECTION : Logements Sociaux (Calcul Manuel) ---
      const logementsResponseData = await logementsResponse.json();
      const logementsData = Array.isArray(logementsResponseData)
        ? logementsResponseData
        : logementsResponseData.data;

      // On crée un nouveau tableau propre avec le ratio calculé
      const cleanedHousingData = logementsData.map((item) => {
        const soc = parseInt(item.nombre_logements_sociaux) || 0;
        const tot = parseInt(item.nombre_total_logements) || 0;
        const ratioCalc = tot > 0 ? (soc / tot) * 100 : 0;
        return {
          ...item,
          arrondissement: item.arrondissement,
          nombre_logements_sociaux: soc,
          nombre_total_logements: tot,
          ratio_logements_sociaux_pourcent: ratioCalc, // On force notre valeur
        };
      });
      dataCache.set("logements_sociaux_raw", cleanedHousingData);
      // ------------------------------------------------------

      const ratioResponseData = await ratioTransportsResponse.json();
      const ratioData = Array.isArray(ratioResponseData)
        ? ratioResponseData
        : ratioResponseData.data;
      dataCache.set("transports_ratio_raw", ratioData);

      const transportTypes = ["bus", "metro", "tram", "rail"];

      transportTypes.forEach((type) => {
        const typeData = ratioData.filter(
          (item) => item.type.toLowerCase() === type
        );
        const typeMap = new Map();
        typeData.forEach((item) => {
          typeMap.set(String(item.arrondissement), {
            value: item.nombre_arrets_par_type,
            display_name: `${item.nombre_arrets_par_type} ${
              type === "metro" ? "métro" : type
            }`,
          });
        });
        dataCache.set(`arrets_count_${type}`, typeMap);
      });

      console.log("Données API mises en cache:", dataCache);
    } catch (error) {
      console.error("Échec du fetch API:", error);
      // Ne pas faire d'alert ici pour éviter le spam si 429
    }
  }

  async function normalizeData(response, idCol, valueCol, suffix) {
    const responseData = await response.json();
    const apiData = Array.isArray(responseData)
      ? responseData
      : responseData.data;
    const dataMap = new Map();
    apiData.forEach((item) => {
      const value = parseFloat(item[valueCol]);
      const validValue = isNaN(value) ? 0 : value;
      dataMap.set(String(item[idCol]), {
        value: validValue,
        display_name: `${validValue.toFixed(suffix === "%" ? 1 : 0)} ${suffix}`,
      });
    });
    return dataMap;
  }

  function loadAndDisplayData(datasetKey, subType = "total") {
    let dataMap;

    if (datasetKey === "arrets_count") {
      const key =
        subType === "total" ? "arrets_count_total" : `arrets_count_${subType}`;
      dataMap = dataCache.get(key);
    } else if (datasetKey === "logements_sociaux_ratio") {
      const rawData = dataCache.get("logements_sociaux_raw");
      if (!rawData) {
        console.error("Données brutes de logements sociaux non trouvées.");
        return;
      }
      dataMap = new Map();
      rawData.forEach((item) => {
        const ratio = parseFloat(item.ratio_logements_sociaux_pourcent) || 0;
        dataMap.set(String(item.arrondissement), {
          value: isNaN(ratio) ? 0 : ratio,
          display_name: `${ratio.toFixed(1)} %`,
          nombre_sociaux: item.nombre_logements_sociaux || 0,
          nombre_total: item.nombre_total_logements || 0,
        });
      });
    } else {
      dataMap = dataCache.get(datasetKey);
    }

    if (datasetKey === "none") {
      geojsonData.features.forEach((feature) => {
        feature.properties.value = null;
        delete feature.properties.display_name;
        delete feature.properties.nombre_sociaux;
        delete feature.properties.nombre_total;
      });
    } else if (dataMap) {
      geojsonData.features.forEach((feature) => {
        const c_arinsee = String(feature.properties.c_arinsee);
        let arrId = c_arinsee.startsWith("751")
          ? String(parseInt(c_arinsee.substring(3)))
          : c_arinsee;
        const data = dataMap.get(arrId);

        delete feature.properties.display_name;
        delete feature.properties.nombre_sociaux;
        delete feature.properties.nombre_total;

        if (data) {
          feature.properties.value = data.value || 0;
          feature.properties.display_name = data.display_name;
          if (datasetKey === "logements_sociaux_ratio") {
            feature.properties.nombre_sociaux = data.nombre_sociaux || 0;
            feature.properties.nombre_total = data.nombre_total || 0;
          }
        } else {
          feature.properties.value = 0;
          // Gestion des textes par défaut
          if (datasetKey === "arrets_count")
            feature.properties.display_name = "0 arrêts";
          else if (datasetKey === "toilettes_count")
            feature.properties.display_name = "0 toilettes";
          else if (datasetKey === "logements_sociaux_ratio")
            feature.properties.display_name = "N/A";
          else feature.properties.display_name = "N/A";
        }
      });
    } else {
      geojsonData.features.forEach((feature) => {
        feature.properties.value = 0;
        feature.properties.display_name = "N/A";
      });
    }

    map.getSource("arrondissements-data").setData(geojsonData);
    updateMapPaint(datasetKey, subType);
    updateLegend(datasetKey); // On appelle la légende ici
  }

  // --- Gestion des Contrôles et Couleurs ---

  function updateMapPaint(datasetKey, subType = "total") {
    if (!map.isStyleLoaded()) return;

    if (datasetKey === "none") {
      map.setPaintProperty(
        "arrondissements-remplissage",
        "fill-color",
        "#CCCCCC"
      );
      // ... reset opacité/contours
    } else {
      let colorScale;
      const dataProperty = ["coalesce", ["get", "value"], 0]; // Utilise 0 si la valeur est null

      if (datasetKey === "arrets_count") {
        // Échelle élargie
        colorScale = [
          "step",
          dataProperty,
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
      } else if (datasetKey === "toilettes_count") {
        colorScale = [
          "step",
          dataProperty,
          "#ffffcc",
          5,
          "#a1dab4",
          15,
          "#41b6c4",
          25,
          "#225ea8",
        ];
      } else if (datasetKey === "logements_sociaux_ratio") {
        colorScale = [
          "interpolate",
          ["linear"],
          dataProperty,
          0,
          "#f7fcfd",
          5,
          "#bfd3e6",
          12,
          "#8c96c6",
          18,
          "#88419d",
          25,
          "#4d004b",
        ];
      } else {
        colorScale = "#CCCCCC";
      }

      map.setPaintProperty(
        "arrondissements-remplissage",
        "fill-color",
        colorScale
      );
    }
  }

  // --- Fonction Légende ---
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
      legendMax.textContent = "25+";
    } else if (key === "logements_sociaux_ratio") {
      legendBar.style.background =
        "linear-gradient(to right, #f7fcfd, #8c96c6, #4d004b)";
      legendMin.textContent = "0%";
      legendMax.textContent = "25%+";
    }
  }

  // Écouteur pour le sélecteur de dataset
  datasetSelector.addEventListener("change", (event) => {
    const selectedDatasetKey = event.target.value;
    if (selectedDatasetKey === "arrets_count") {
      transportFilterGroup.style.display = "block";
      transportTypeSelector.value = "total";
    } else {
      transportFilterGroup.style.display = "none";
    }

    zonesAComparer.clear();
    updateFeatureStates();
    clearChart();
    loadAndDisplayData(selectedDatasetKey, "total");
  });

  // Écouteur pour le filtre de type de transport
  transportTypeSelector.addEventListener("change", (event) => {
    const subType = event.target.value;
    loadAndDisplayData("arrets_count", subType);
    if (zonesAComparer.size > 0) {
      updateTransportChart(zonesAComparer);
    }
  });

  // --- Graphique et Interactivité ---

  function clearChart() {
    chartDiv.innerHTML =
      '<p style="text-align:center;margin-top:50px;">Sélectionnez un indicateur et cliquez sur un arrondissement.</p>';
    chartTitle.textContent = "Analyse de la Zone";
    kpiContainer.innerHTML = "";
  }

  // --- FONCTION GRAPHIQUE 1 : TRANSPORTS ---
  function updateTransportChart(zonesMap) {
    const ratioData = dataCache.get("transports_ratio_raw");
    if (!ratioData) return;

    const currentTransportType = transportTypeSelector.value;
    kpiContainer.innerHTML = "";

    // KPIs (basés sur 1ère zone)
    const firstZoneId = zonesMap.keys().next().value;
    if (firstZoneId) {
      const firstZoneProps = zonesMap.get(firstZoneId);
      const arrId = getArrIdFromProps(firstZoneProps);
      const kpiData = ratioData.filter(
        (item) => String(item.arrondissement) === arrId
      );

      ["bus", "metro", "tram", "rail"].forEach((t) => {
        const val =
          kpiData.find((d) => d.type.toLowerCase() === t)
            ?.nombre_arrets_par_type || 0;
        if (currentTransportType === "total" || currentTransportType === t) {
          kpiContainer.innerHTML += `
                    <div class="kpi-card" data-type="${t}">
                        <div class="kpi-card-title">${t.toUpperCase()}</div>
                        <div class="kpi-card-value" style="color:${
                          kpiColors[t]
                        }">${val}</div>
                    </div>`;
        }
      });
    }

    // Bar Chart
    const traces = [];
    let i = 0;
    const allTypes =
      currentTransportType === "total"
        ? ["bus", "metro", "rail", "tram"]
        : [currentTransportType];

    zonesMap.forEach((properties, id) => {
      const arrId = getArrIdFromProps(properties);
      const arrData = ratioData.filter(
        (item) => String(item.arrondissement) === arrId
      );
      const values = allTypes.map(
        (type) =>
          arrData.find((d) => d.type.toLowerCase() === type)
            ?.nombre_arrets_par_type || 0
      );

      let barColors;
      if (zonesMap.size === 1 && currentTransportType === "total")
        barColors = allTypes.map((t) => kpiColors[t]);
      else if (zonesMap.size === 1) barColors = kpiColors[currentTransportType];
      else barColors = comparisonColors[i];

      traces.push({
        x: allTypes.map((t) => t.toUpperCase()),
        y: values,
        type: "bar",
        name: properties.l_ar.split(" ")[0],
        marker: { color: barColors },
        text: values.map(String),
        textposition: "auto",
      });
      i++;
    });

    const layout = {
      margin: { t: 30, l: 30, r: 20, b: 30 },
      showlegend: zonesMap.size > 1,
      paper_bgcolor: "#f8f9fa",
      plot_bgcolor: "#f8f9fa",
      xaxis: { showgrid: false },
      yaxis: { showgrid: true, gridcolor: "#ddd" },
    };
    Plotly.newPlot(chartDiv, traces, layout, {
      responsive: true,
      displayModeBar: false,
    });
  }

  // --- FONCTION GRAPHIQUE 2 : TOILETTES ---
  function updateToiletComparisonChart(zonesMap) {
    kpiContainer.innerHTML = "";

    const x = [],
      y = [],
      colors = [];
    let i = 0;
    zonesMap.forEach((properties, id) => {
      x.push(properties.l_ar.split(" ")[0]);
      y.push(properties.value || 0);
      colors.push(comparisonColors[i]);
      kpiContainer.innerHTML += `<div class="kpi-card"><div class="kpi-card-title">${
        properties.l_ar.split(" ")[0]
      }</div><div class="kpi-card-value" style="color:${comparisonColors[i]}">${
        properties.value
      }</div></div>`;
      i++;
    });

    // Si 1 seule zone, affichage spécial
    if (zonesMap.size === 1) {
      chartDiv.innerHTML = `<div style="height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;"><h3 style="color:#555">TOTAL</h3><div style="font-size:5rem;color:#225ea8;font-weight:bold;">${y[0]}</div></div>`;
    } else {
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
  }

  // --- FONCTION GRAPHIQUE 3 : LOGEMENTS SOCIAUX ---
  function updateSocialHousingChart(zonesMap) {
    kpiContainer.innerHTML = "";

    // Cas 1 Zone : Donut
    if (zonesMap.size === 1) {
      const props = zonesMap.values().next().value;
      const soc = props.nombre_sociaux || 0;
      const tot = props.nombre_total || 0;
      const rat = props.value || 0; // C'est notre ratio calculé

      kpiContainer.innerHTML = `
                <div class="kpi-card"><div class="kpi-card-title">Social</div><div class="kpi-card-value" style="color:#88419d">${soc.toLocaleString()}</div></div>
                <div class="kpi-card"><div class="kpi-card-title">Total</div><div class="kpi-card-value">${tot.toLocaleString()}</div></div>
                <div class="kpi-card"><div class="kpi-card-title">Taux</div><div class="kpi-card-value" style="color:#88419d">${rat.toFixed(
                  1
                )}%</div></div>
            `;

      const data = [
        {
          values: [soc, Math.max(0, tot - soc)],
          labels: ["Logements Sociaux", "Autres"],
          type: "pie",
          hole: 0.6,
          marker: { colors: ["#88419d", "#e0e0e0"] },
          textinfo: "none",
          hoverinfo: "label+percent+value",
          sort: false,
        },
      ];

      Plotly.newPlot(
        chartDiv,
        data,
        {
          showlegend: false,
          paper_bgcolor: "#f8f9fa",
          plot_bgcolor: "#f8f9fa",
          margin: { t: 20, l: 20, r: 20, b: 20 },
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
      // Cas 2 Zones : Barres Comparaison
      const x = [],
        y = [],
        colors = [];
      let i = 0;
      zonesMap.forEach((p) => {
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

  // Popups (Survol)
  map.on("mousemove", "arrondissements-remplissage", (e) => {
    map.getCanvas().style.cursor = "pointer";
    if (e.features.length > 0) {
      const properties = e.features[0].properties;
      let popupContent = `<div><strong>${properties.l_ar}</strong></div>`;

      if (properties.display_name && datasetSelector.value !== "none") {
        popupContent = `<div><strong>${properties.l_ar}</strong><br>${properties.display_name}</div>`;
      }

      const newHoveredId = e.features[0].id;
      if (hoveredStateId !== newHoveredId) {
        if (hoveredStateId) {
          map.setFeatureState(
            { source: "arrondissements-data", id: hoveredStateId },
            { hover: false }
          );
        }
        hoveredStateId = newHoveredId;
        map.setFeatureState(
          { source: "arrondissements-data", id: hoveredStateId },
          { hover: true }
        );
      }
      popup.setLngLat(e.lngLat).setHTML(popupContent).addTo(map);
    }
  });
  map.on("mouseleave", "arrondissements-remplissage", () => {
    map.getCanvas().style.cursor = "";
    popup.remove();
    if (hoveredStateId) {
      map.setFeatureState(
        { source: "arrondissements-data", id: hoveredStateId },
        { hover: false }
      );
    }
    hoveredStateId = null;
  });

  // Clic (pour le graphe)
  map.on("click", "arrondissements-remplissage", (e) => {
    const currentKey = datasetSelector.value;
    if (currentKey === "none") return;

    const properties = e.features[0].properties;
    const clickedId = properties.c_arinsee;

    // Logique de bascule (Toggle)
    if (zonesAComparer.has(clickedId)) {
      zonesAComparer.delete(clickedId);
    } else {
      if (zonesAComparer.size >= 2) {
        const firstId = zonesAComparer.keys().next().value;
        zonesAComparer.delete(firstId);
      }
      zonesAComparer.set(clickedId, properties);
    }

    updateFeatureStates();

    if (zonesAComparer.size === 0)
      chartTitle.textContent = "Analyse de la Zone";
    else if (zonesAComparer.size === 1)
      chartTitle.textContent = `Analyse : ${
        [...zonesAComparer.values()][0].l_ar
      }`;
    else
      chartTitle.textContent = `Comparaison : ${[...zonesAComparer.values()]
        .map((p) => p.l_ar.split(" ")[0])
        .join(" vs ")}`;

    if (currentKey === "arrets_count") updateTransportChart(zonesAComparer);
    else if (currentKey === "toilettes_count")
      updateToiletComparisonChart(zonesAComparer);
    else if (currentKey === "logements_sociaux_ratio")
      updateSocialHousingChart(zonesAComparer);
  });

  function getArrIdFromProps(properties) {
    const c_arinsee = String(properties.c_arinsee);
    return c_arinsee.startsWith("751")
      ? String(parseInt(c_arinsee.substring(3)))
      : c_arinsee;
  }

  function updateFeatureStates() {
    if (map.getSource("arrondissements-data")) {
      const features = map.querySourceFeatures("arrondissements-data");
      features.forEach((f) => {
        if (f.id !== undefined)
          map.setFeatureState(
            { source: "arrondissements-data", id: f.id },
            { selected_state: 0 }
          );
      });
    }
    let i = 1;
    for (const id of zonesAComparer.keys()) {
      map.setFeatureState(
        { source: "arrondissements-data", id: id },
        { selected_state: i }
      );
      i++;
    }
    updateMapPaint(datasetSelector.value, transportTypeSelector.value);
  }

  // --- Fenêtre Draggable ---
  function makeDraggable(element, header) {
    let pos1 = 0,
      pos2 = 0,
      pos3 = 0,
      pos4 = 0;
    header.onmousedown = dragMouseDown;
    function dragMouseDown(e) {
      e.preventDefault();
      pos3 = e.clientX;
      pos4 = e.clientY;
      document.onmouseup = closeDragElement;
      document.onmousemove = elementDrag;
    }
    function elementDrag(e) {
      e.preventDefault();
      pos1 = pos3 - e.clientX;
      pos2 = pos4 - e.clientY;
      pos3 = e.clientX;
      pos4 = e.clientY;
      element.style.top = element.offsetTop - pos2 + "px";
      element.style.left = element.offsetLeft - pos1 + "px";
    }
    function closeDragElement() {
      document.onmouseup = null;
      document.onmousemove = null;
    }
  }
  makeDraggable(graphWindow, chartHeader);
  const resizeObserver = new ResizeObserver(() => {
    if (chartDiv) Plotly.Plots.resize(chartDiv);
  });
  resizeObserver.observe(graphWindow);
});
