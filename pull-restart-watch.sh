#!/bin/bash

git reset --hard HEAD~1
git pull
systemctl restart iot-monolith.service
messages | grep "iot-monolith"
