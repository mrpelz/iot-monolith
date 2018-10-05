#!/bin/bash

HOME=/root
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

PROD_ENV=1 LOG_LEVEL=6 LOG_TELEGRAM=0 node --use_strict index.js
