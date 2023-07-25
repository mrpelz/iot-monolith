#!/bin/bash

ssh root@iot.lan.wurstsalat.cloud << EOF
  cat /var/opt/iot-monolith/persistence.json | jq
EOF
