@echo off
rem dsh-usage-meter-harness one-line installer (no pnpm required)
setlocal
if "%DSH_PROFILE_DIR%"=="" set "DSH_PROFILE_DIR=%USERPROFILE%\.dsh\profiles\web"
if not exist "%DSH_PROFILE_DIR%" mkdir "%DSH_PROFILE_DIR%"
pushd "%DSH_PROFILE_DIR%"
if not exist package.json node -e "fs.writeFileSync('package.json',JSON.stringify({name:'dsh-web-profile',private:true}))"
echo [1/3] Installing package into DSH profile: %DSH_PROFILE_DIR%
npm i --verbose @faith1688/dsh-usage-meter-harness || (echo Install failed & popd & exit /b 1)
echo [2/3] Registering bundle...
node -e "const fs=require('fs');const p='package.json';const j=JSON.parse(fs.readFileSync(p,'utf8'));j.dsh=j.dsh||{};j.dsh.profile=j.dsh.profile||{};j.dsh.profile.bundles=j.dsh.profile.bundles||[];const n='@faith1688/dsh-usage-meter-harness';if(!j.dsh.profile.bundles.includes(n))j.dsh.profile.bundles.push(n);fs.writeFileSync(p,JSON.stringify(j,null,2));"
echo [3/3] Done. Restart "dsh web" to load the plugin.
popd
endlocal
