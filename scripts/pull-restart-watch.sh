#!/bin/bash

git reset --hard HEAD~1
git pull --ff-only origin HEAD

npm install
npm run build

systemctl restart iot-monolith.service
echo "restart done"

journalctl -u iot-monolith.service -fp notice
