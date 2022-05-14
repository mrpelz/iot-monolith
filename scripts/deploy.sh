#!/bin/bash

ssh root@iot.lan.wurstsalat.cloud << EOF
  cd /opt/iot-monolith/
  scripts/pull-restart-watch.sh
EOF
