#!/bin/bash

git pull --rebase

/bin/systemctl restart iot-monolith.service
/bin/journalctl -u iot-monolith.service -fp notice
