const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = 3443;

function startServer() {
  const server = http.createServer((req, res) => {
    // Extraire le chemin sans les query parameters
    const urlPath = new URL(req.url, `http://localhost:${PORT}`).pathname;
    let filePath = path.join(__dirname, urlPath);

    // Si c'est une requête de répertoire, servir index.html
    if (urlPath === "/" || urlPath === "") {
      filePath = path.join(__dirname, "index.html");
    }

    console.log(`Requête: ${req.url} (path: ${urlPath}) -> ${filePath}`);

    // Sécurité : empêcher l'accès en dehors du répertoire
    if (!path.resolve(filePath).startsWith(path.resolve(__dirname))) {
      res.writeHead(403);
      res.end("Accès refusé");
      return;
    }

    // Vérifier si le fichier existe
    fs.readFile(filePath, (err, data) => {
      if (err) {
        console.error(`Erreur 404: ${filePath} - ${err.message}`);
        res.writeHead(404);
        res.end("Fichier non trouvé");
        return;
      }

      // Déterminer le type de contenu
      const ext = path.extname(filePath).toLowerCase();
      const mimeTypes = {
        ".html": "text/html",
        ".js": "application/javascript",
        ".css": "text/css",
        ".json": "application/json",
        ".geojson": "application/geo+json",
        ".csv": "text/csv",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".gif": "image/gif",
        ".svg": "image/svg+xml",
      };

      const contentType = mimeTypes[ext] || "application/octet-stream";
      res.writeHead(200, { "Content-Type": contentType });
      res.end(data);
    });
  });

  server.listen(PORT, () => {
    console.log(
      `🌐 Serveur HTTP en cours d'exécution sur http://localhost:${PORT}`
    );
  });
}

startServer();
