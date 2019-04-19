#!/bin/bash

ssh root@hermes.net.wurstsalat.cloud << EOF
  cd /usr/local/scripts/iot-monolith/
  ./pull-restart-watch.sh
EOF
