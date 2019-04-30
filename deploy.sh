#!/bin/bash

ssh root@hermes.net.wurstsalat.cloud << EOF
  cd /opt/iot-monolith/
  ./pull-restart-watch.sh
EOF
