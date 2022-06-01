#!/bin/bash

ssh root@iot.lan.wurstsalat.cloud << EOF
  cd /opt/iot-monolith/

  scripts/watch.sh
EOF
