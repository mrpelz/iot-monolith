#!/bin/bash

git pull --rebase

/bin/systemctl restart iot-monolith.service
echo "restart done"

/bin/journalctl -u iot-monolith.service -fp notice
