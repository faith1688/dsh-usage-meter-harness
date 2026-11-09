#!/bin/sh
# dsh-usage-meter-harness one-line installer (no pnpm required)
set -e
PROFILE_DIR="${DSH_PROFILE_DIR:-$HOME/.dsh/profiles/web}"
mkdir -p "$PROFILE_DIR"
cd "$PROFILE_DIR"
if [ ! -f package.json ]; then node -e "fs.writeFileSync('package.json',JSON.stringify({name:'dsh-web-profile',private:true}))"; fi
echo "[1/3] Installing package into DSH profile: $PROFILE_DIR"
npm i --verbose @faith1688/dsh-usage-meter-harness@latest
echo "[2/3] Registering bundle..."
node -e "const fs=require('fs');const p='package.json';const j=JSON.parse(fs.readFileSync(p,'utf8'));j.dsh=j.dsh||{};j.dsh.profile=j.dsh.profile||{};j.dsh.profile.bundles=j.dsh.profile.bundles||[];const n='@faith1688/dsh-usage-meter-harness';if(!j.dsh.profile.bundles.includes(n))j.dsh.profile.bundles.push(n);fs.writeFileSync(p,JSON.stringify(j,null,2));"
echo "[3/3] Done. Restart \"dsh web\" to load the plugin."
