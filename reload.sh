#!/bin/bash
set -e 

cd API
docker compose up -d
echo "API lauched"

# echo "Lauching the dashboard"
# cd ../dashboard-frontend

# if command -v xdg-open &> /dev/null; then
#     xdg-open index.html
# elif command -v open &> /dev/null; then
#     open index.html
# elif command -v start &> /dev/null; then
#     start index.html
# else
#     echo "Can't open the browser"
# fi

echo "Everything is lauched"