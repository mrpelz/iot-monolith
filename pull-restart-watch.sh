#!/bin/bash

git reset --hard HEAD~1
git pull

/bin/systemctl restart iot-monolith.service
/bin/journalctl -u iot-monolith.service -f
