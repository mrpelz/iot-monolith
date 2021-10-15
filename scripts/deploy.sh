#!/bin/bash

ssh root@iot.mgmt.wurstsalat.cloud << EOF
  cd /opt/iot-monolith/
  scripts/pull-restart-watch.sh
EOF
