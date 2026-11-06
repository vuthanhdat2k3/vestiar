# scripts/download-models.ps1
# Ensures local MediaPipe model and WASM binaries are present in apps/web/public
[CmdletBinding()]
param()

$projectRoot = Split-Path -Parent $PSScriptRoot
$publicDir = Join-Path $projectRoot "apps\web\public"
$modelsDir = Join-Path $publicDir "models"
$wasmDir = Join-Path $publicDir "wasm"

if (-not (Test-Path $modelsDir)) {
    New-Item -ItemType Directory -Path $modelsDir -Force | Out-Null
}
if (-not (Test-Path $wasmDir)) {
    New-Item -ItemType Directory -Path $wasmDir -Force | Out-Null
}

# 1. Download Pose Landmarker Lite model if missing
$modelPath = Join-Path $modelsDir "pose_landmarker_lite.task"
if (-not (Test-Path $modelPath) -or (Get-Item $modelPath).Length -lt 1000000) {
    Write-Host "[i] Downloading MediaPipe Pose Landmarker Lite model..." -ForegroundColor Yellow
    $modelUrl = "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task"
    curl.exe -L -o $modelPath $modelUrl
    if (Test-Path $modelPath) {
        Write-Host "[OK] Pose Landmarker model saved to: $modelPath" -ForegroundColor Green
    } else {
        Write-Warning "Could not download model. It will fall back to Google Cloud Storage CDN at runtime."
    }
} else {
    Write-Host "[OK] Pose Landmarker model already present at: $modelPath" -ForegroundColor Green
}

# 2. Copy WASM binaries from node_modules if not present
$wasmModuleDir = Get-ChildItem -Path "$projectRoot\node_modules\.pnpm\@mediapipe+tasks-vision*\node_modules\@mediapipe\tasks-vision\wasm" -ErrorAction SilentlyContinue | Select-Object -First 1
if ($wasmModuleDir) {
    Copy-Item -Path "$($wasmModuleDir.FullName)\*" -Destination $wasmDir -Recurse -Force
    Write-Host "[OK] MediaPipe WASM binaries copied to: $wasmDir" -ForegroundColor Green
} else {
    Write-Host "[i] Node modules WASM directory not found, will load from unpkg/jsdelivr at runtime." -ForegroundColor Yellow
}
