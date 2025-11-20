#!/bin/bash
set -e

git fetch origin prod
git reset --hard origin/prod

if [ -f API/requirements.txt ]; then
    pip3 install -r API/requirements.txt --break-system-packages
else
    echo "❌ ERREUR : Fichier API/requirements.txt introuvable !"
    exit 1
fi

cd API
docker compose up -d --build --remove-orphans
cd ..
cd transform/filter
python3 pipeline_filter.py

cd ../agregation 
python3 pipeline_agregation.py

cd ../../dashboard-frontend
npm install
pm2 reload dashboard-frontend || pm2 start npm --name "dashboard-frontend" -- start
pm2 save
echo "✅ Tout est lancé et synchronisé !"