const https = require("https");
const fs = require("fs");
const path = require("path");

const PORT = 3443;

// Créer des certificats auto-signés s'ils n'existent pas
const certPath = path.join(__dirname, "cert.pem");
const keyPath = path.join(__dirname, "key.pem");

if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
  console.log("Génération des certificats auto-signés...");
  const { exec } = require("child_process");
  const command =
    process.platform === "win32"
      ? `openssl req -nodes -new -x509 -keyout "${keyPath}" -out "${certPath}" -days 365 -subj "/CN=localhost"`
      : `openssl req -nodes -new -x509 -keyout ${keyPath} -out ${certPath} -days 365 -subj "/CN=localhost"`;

  exec(command, (error) => {
    if (error) {
      console.warn(
        "OpenSSL non disponible. Utilisation de certificats auto-générés..."
      );
      const selfSignedCert = require("selfsigned");
      const attrs = [{ name: "commonName", value: "localhost" }];
      const pem = selfSignedCert.generate(attrs);
      fs.writeFileSync(keyPath, pem.private);
      fs.writeFileSync(certPath, pem.cert);
    }
    startServer();
  });
} else {
  startServer();
}

function startServer() {
  const options = {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath),
  };

  const server = https.createServer(options, (req, res) => {
    // Extraire le chemin sans les query parameters
    const urlPath = new URL(req.url, `https://localhost:${PORT}`).pathname;
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
      `🔒 Serveur HTTPS en cours d'exécution sur https://localhost:${PORT}`
    );
    console.log(
      "⚠️  Note: Acceptez le certificat auto-signé dans votre navigateur"
    );
  });
}
