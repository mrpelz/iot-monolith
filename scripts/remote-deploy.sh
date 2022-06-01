#!/bin/bash

ssh root@iot.lan.wurstsalat.cloud << EOF
  cd /opt/iot-monolith/

  scripts/pull-install.sh
  scripts/restart.sh
EOF
