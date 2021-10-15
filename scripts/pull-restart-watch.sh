#!/bin/bash

git pull origin HEAD --rebase

npm install
npm run build

systemctl restart iot-monolith.service
echo "restart done"

journalctl -u iot-monolith.service -fp notice
