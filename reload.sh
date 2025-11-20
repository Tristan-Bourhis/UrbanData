#!/bin/bash
set -e

git fetch origin prod
git reset --hard origin/prod

cd API
docker compose up -d --build --remove-orphans
cd ..
cd dashboard-frontend
npm install
pm2 reload dashboard-frontend || pm2 start npm --name "dashboard-frontend" -- start
pm2 save

echo "✅ Déploiement terminé avec succès !"