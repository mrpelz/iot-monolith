#!/bin/bash

git reset --hard HEAD~1
git pull --ff-only origin HEAD
echo "pull done"

npm install --no-save --no-audit --no-fund
npm run build
echo "install done"
