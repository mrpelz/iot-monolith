#!/bin/bash

HOME=/root
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

PROD_ENV=1 LOG_LEVEL=3 LOG_TELEGRAM=1 node --use_strict index.js
