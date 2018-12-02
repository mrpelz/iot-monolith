#!/bin/bash

git reset --hard HEAD~1
git pull

/bin/systemctl restart iot-monolith.service
tailf /var/log/syslog | grep "iot-monolith"
