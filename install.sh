#!/bin/bash
set -e

git fetch origin prod
git reset --hard origin/prod

cd API
docker compose up -d --build --remove-orphans
cd ../transform/filter
if [ -f requirements.txt ]; then
    pip3 install -r requirements.txt --break-system-packages
fi
python3 pipeline_filter.py

echo "➕ Exécution du Pipeline Agregation..."
cd ../agregation # On suppose que agregation est frère de filter
if [ -f requirements.txt ]; then
    pip3 install -r requirements.txt --break-system-packages
fi
python3 pipeline_agregation.py

cd ../../dashboard-frontend
npm install
pm2 reload dashboard-frontend || pm2 start npm --name "dashboard-frontend" -- start
pm2 save
echo "✅ Tout est lancé et synchronisé !"