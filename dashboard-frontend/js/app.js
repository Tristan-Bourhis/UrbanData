// js/app.js (Complet avec Fenêtre Draggable/Resizable)

document.addEventListener('DOMContentLoaded', () => {
    
    // --- NOUVEAUX Sélecteurs DOM (Post-Refactor) ---
    const yearSlider = document.getElementById('year-slider');
    const yearValueSpan = document.getElementById('year-value');
    const datasetSelector = document.getElementById('dataset-selector');
    
    const graphWindow = document.getElementById('graph-window');
    const chartHeader = graphWindow.querySelector('.window-header');
    const chartTitle = document.getElementById('chart-title');
    const chartDiv = document.getElementById('timeline-chart');

    let currentSelectedYear = yearSlider.value;
    let zonesAComparer = new Map();
    const comparisonColors = ['#007bff', '#d7191c'];

    // --- Étape 6.2 : Initialisation de la carte MapLibre ---
    const mapStyle = 'https://api.maptiler.com/maps/positron/style.json?key=VG6aYxwCVxhTFizznhIL';
    const map = new maplibregl.Map({
        container: 'map',
        style: mapStyle,
        center: [2.3522, 48.8566], 
        zoom: 11.2
    });
    map.addControl(new maplibregl.NavigationControl(), 'top-right');

    // --- Étape 6.3 & 6.4 : Chargement, Fusion et Affichage ---
    map.on('load', async () => {
        // ... (Cette section est IDENTIQUE à l'étape 6.7) ...
        // (fetch, parse CSV, fusion, addSource, addLayer 'fill', addLayer 'line')
        try {
            const [geojsonResponse, csvResponse] = await Promise.all([
                fetch('./data/arrondissements.geojson'),
                fetch('./data/prix_arrondissements.csv')
            ]);
            const geojsonData = await geojsonResponse.json();
            const csvText = await csvResponse.text();
            const prixData = new Map();
            const lignes = csvText.split('\n').slice(1);
            lignes.forEach(ligne => {
                if (ligne.trim() === '') return;
                const [c_arinsee, nom, prix_2024, prix_2023, prix_2022] = ligne.split(',');
                prixData.set(c_arinsee, {
                    nom: nom,
                    prix_m2_2024: parseFloat(prix_2024),
                    prix_m2_2023: parseFloat(prix_2023),
                    prix_m2_2022: parseFloat(prix_2022)
                });
            });
            geojsonData.features.forEach(feature => {
                const codeInsee = String(feature.properties.c_arinsee);
                const data = prixData.get(codeInsee);
                if (data) {
                    feature.properties.prix_m2_2024 = data.prix_m2_2024;
                    feature.properties.prix_m2_2023 = data.prix_m2_2023;
                    feature.properties.prix_m2_2022 = data.prix_m2_2022;
                    feature.properties.nom_arrondissement = data.nom;
                }
            });

            map.addSource('arrondissements-data', {
                'type': 'geojson',
                'data': geojsonData,
                'promoteId': 'c_arinsee' 
            });

            map.addLayer({
                'id': 'arrondissements-remplissage',
                'type': 'fill',
                'source': 'arrondissements-data',
                'paint': {
                    'fill-color': [ 'interpolate', ['linear'], ['coalesce', ['get', 'prix_m2_' + currentSelectedYear], 9000], 9000, '#2c7bb6', 11000, '#abd9e9', 13000, '#ffffbf', 15000, '#fdae61', 17000, '#d7191c' ],
                    'fill-opacity': [ 'case', ['boolean', ['feature-state', 'hover'], false], 1.0, ['boolean', ['feature-state', 'selected'], false], 0.9, 0.8 ]
                }
            });

            map.addLayer({
                'id': 'arrondissements-contours',
                'type': 'line',
                'source': 'arrondissements-data',
                'paint': {
                    'line-color': [ 'case', ['boolean', ['feature-state', 'selected'], false], comparisonColors[0], '#ffffff' ],
                    'line-width': [ 'case', ['boolean', ['feature-state', 'selected'], false], 3.0, ['boolean', ['feature-state', 'hover'], false], 2.5, 1.5 ]
                }
            });
            
// --- NOUVEAU : AJOUTER LES LABELS ---
            map.addLayer({
                'id': 'arrondissements-labels',
                'type': 'symbol', // Le type 'symbol' est utilisé pour le texte
                'source': 'arrondissements-data', // On utilise la même source
                'layout': {
                    // On va chercher la propriété 'l_ar' du GeoJSON (ex: "1ER ARR.")
                    'text-field': ['get', 'l_ar'],
                    'text-size': 15, // Taille de la police
                    'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'], // Fonts du style Maptiler
                    'text-allow-overlap': false, // N'affiche pas les labels s'ils se chevauchent
                    'symbol-placement': 'point' // Place le label au centre du polygone
                },
                'paint': {
                    'text-color': '#333333', // Couleur du texte (gris foncé)
                    
                    // Le "halo" est une bordure autour du texte
                    // C'est ESSENTIEL pour la lisibilité sur une carte colorée
                    'text-halo-color': 'rgba(255, 255, 255, 0.8)', // Blanc semi-transparent
                    'text-halo-width': 1.5,
                    'text-halo-blur': 0.5
                }
            });
            
        } catch (error) {
            console.error("Erreur lors du chargement des données :", error);
        }
    }); // Fin du map.on('load')

    
    // --- Étape 6.6 : Connexion du Sélecteur d'Année ---
    function updateMapColors(year) {
        if (!map.isStyleLoaded()) return;
        const dataProperty = 'prix_m2_' + year;
        map.setPaintProperty('arrondissements-remplissage', 'fill-color', [
            'interpolate', ['linear'], ['coalesce', ['get', dataProperty], 9000], 9000, '#2c7bb6', 11000, '#abd9e9', 13000, '#ffffbf', 15000, '#fdae61', 17000, '#d7191c'
        ]);
    }
    yearSlider.addEventListener('input', (event) => {
        currentSelectedYear = event.target.value;
        yearValueSpan.textContent = currentSelectedYear;
        updateMapColors(currentSelectedYear);
    });
    // (Logique future pour datasetSelector)

    // --- Étape 6.7 : Graphique de Comparaison (Plotly) ---
    function updateComparisonChart() {
        // ... (La logique interne de cette fonction est IDENTIQUE à 6.7) ...
        // (Elle utilise les sélecteurs 'chartTitle' et 'chartDiv' qui sont déjà corrects)
        const traces = [];
        const years = ['2022', '2023', '2024'];
        let i = 0;
        for (const [id, properties] of zonesAComparer.entries()) {
            const prices = [ properties.prix_m2_2022, properties.prix_m2_2023, properties.prix_m2_2024 ];
            const trace = {
                x: years, y: prices, type: 'scatter', mode: 'lines+markers',
                name: properties.nom_arrondissement,
                marker: { color: comparisonColors[i], size: 8 },
                line: { color: comparisonColors[i], width: 3 }
            };
            traces.push(trace);
            i++;
        }

        const layout = {
            title: `Évolution du prix/m²`,
            xaxis: { title: 'Année', gridcolor: '#e9ecef' },
            yaxis: { title: 'Prix/m² (€)', gridcolor: '#e9ecef', automargin: true },
            plot_bgcolor: '#ffffff', // Fond blanc pour le graphique
            paper_bgcolor: '#ffffff',
            margin: { t: 40, l: 60, r: 30, b: 40 },
            showlegend: (traces.length > 1)
        };

        if (traces.length === 0) {
            chartDiv.innerHTML = '<p>Cliquez sur un arrondissement pour voir son évolution. Cliquez sur un deuxième pour comparer.</p>';
            chartTitle.textContent = 'Analyse de la Zone';
        } else {
            if (zonesAComparer.size === 1) {
                chartTitle.textContent = `Analyse : ${zonesAComparer.values().next().value.nom_arrondissement}`;
            } else {
                const names = Array.from(zonesAComparer.values()).map(p => p.nom_arrondissement.split(' ')[0]);
                chartTitle.textContent = `Comparaison : ${names.join(' vs ')}`;
            }
            Plotly.newPlot(chartDiv, traces, layout, {
                responsive: true, // Plotly va essayer de s'adapter
                displayModeBar: false
            });
        }
    }

    // --- Étape 6.5 & 6.7 : Logique d'interactivité (Clic et Survol) ---
    // ... (La logique de 'mousemove', 'mouseleave', et 'click' est IDENTIQUE à 6.7) ...
    // (Elle appelle 'updateComparisonChart' qui fonctionne)
    const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false });
    let hoveredStateId = null;

    map.on('mousemove', 'arrondissements-remplissage', (e) => {
        map.getCanvas().style.cursor = 'pointer';
        if (e.features.length > 0) {
            const newHoveredId = e.features[0].id;
            if (hoveredStateId !== newHoveredId) {
                if (hoveredStateId) { map.setFeatureState({ source: 'arrondissements-data', id: hoveredStateId }, { hover: false }); }
                hoveredStateId = newHoveredId;
                map.setFeatureState({ source: 'arrondissements-data', id: hoveredStateId }, { hover: true });
            }
            const properties = e.features[0].properties;
            const prix = properties['prix_m2_' + currentSelectedYear].toLocaleString('fr-FR');
            popup.setLngLat(e.lngLat).setHTML(`<div><strong>${properties.nom_arrondissement}</strong><br>Prix/m² (${currentSelectedYear}) : <strong>${prix} €</strong></div>`).addTo(map);
        }
    });

    map.on('mouseleave', 'arrondissements-remplissage', () => {
        map.getCanvas().style.cursor = '';
        popup.remove();
        if (hoveredStateId) { map.setFeatureState({ source: 'arrondissements-data', id: hoveredStateId }, { hover: false }); }
        hoveredStateId = null;
    });

    map.on('click', 'arrondissements-remplissage', (e) => {
        const clickedId = e.features[0].id;
        const properties = e.features[0].properties;
        if (zonesAComparer.has(clickedId)) {
            zonesAComparer.delete(clickedId);
            map.setFeatureState({ source: 'arrondissements-data', id: clickedId }, { selected: false });
        } else {
            if (zonesAComparer.size >= 2) {
                const firstId = zonesAComparer.keys().next().value;
                zonesAComparer.delete(firstId);
                map.setFeatureState({ source: 'arrondissements-data', id: firstId }, { selected: false });
            }
            zonesAComparer.set(clickedId, properties);
            map.setFeatureState({ source: 'arrondissements-data', id: clickedId }, { selected: true });
            
            if (zonesAComparer.size === 2) {
                const secondId = Array.from(zonesAComparer.keys())[1];
                map.setPaintProperty('arrondissements-contours', 'line-color', [ 'case', ['==', ['id'], secondId], comparisonColors[1], ['boolean', ['feature-state', 'selected'], false], comparisonColors[0], '#ffffff' ]);
            } else {
                map.setPaintProperty('arrondissements-contours', 'line-color', [ 'case', ['boolean', ['feature-state', 'selected'], false], comparisonColors[0], '#ffffff' ]);
            }
        }
        updateComparisonChart();
    });


    // --- NOUVEAU : Logique pour Fenêtre Draggable & Resizable ---

    /**
     * Rend un élément déplaçable par son header
     * @param {HTMLElement} element - L'élément fenêtre à déplacer
     * @param {HTMLElement} header - L'élément header sur lequel cliquer
     */
    function makeDraggable(element, header) {
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;

        header.onmousedown = dragMouseDown;

        function dragMouseDown(e) {
            e.preventDefault();
            // Positions initiales de la souris
            pos3 = e.clientX;
            pos4 = e.clientY;
            document.onmouseup = closeDragElement;
            document.onmousemove = elementDrag;
        }

        function elementDrag(e) {
            e.preventDefault();
            // Calculer le décalage
            pos1 = pos3 - e.clientX;
            pos2 = pos4 - e.clientY;
            pos3 = e.clientX;
            pos4 = e.clientY;
            // Définir la nouvelle position de l'élément
            element.style.top = (element.offsetTop - pos2) + "px";
            element.style.left = (element.offsetLeft - pos1) + "px";
        }

        function closeDragElement() {
            // Arrêter le mouvement
            document.onmouseup = null;
            document.onmousemove = null;
        }
    }

    // Activer le drag
    makeDraggable(graphWindow, chartHeader);

    // Activer le redimensionnement de Plotly
    // On observe la fenêtre. Si elle est redimensionnée (via le CSS 'resize'),
    // on dit à Plotly de se redessiner.
    const resizeObserver = new ResizeObserver(() => {
        if (chartDiv) {
            Plotly.Plots.resize(chartDiv);
        }
    });

    // Commencer à observer la fenêtre
    resizeObserver.observe(graphWindow);
});