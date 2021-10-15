#!/bin/bash

git pull --rebase

npm install
npm run build

systemctl restart iot-monolith.service
echo "restart done"

journalctl -u iot-monolith.service -fp notice
