# scripts/setup-https.ps1
# VestiAR - HTTPS Development Certificate Generator for Windows 11 & iPhone Safari
[CmdletBinding()]
param(
    [string]$CustomIp = ""
)

$ErrorActionPreference = "Stop"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  VestiAR - HTTPS Development Environment Setup" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Resolve LAN IP Address
$lanIp = $CustomIp
if (-not $lanIp) {
    try {
        $activeRoute = Get-NetRoute -DestinationPrefix '0.0.0.0/0' -ErrorAction SilentlyContinue | 
                       Sort-Object RouteMetric | 
                       Select-Object -First 1

        if ($activeRoute) {
            $ipObj = Get-NetIPAddress -InterfaceIndex $activeRoute.InterfaceIndex -AddressFamily IPv4 -ErrorAction SilentlyContinue |
                     Where-Object { $_.IPAddress -notmatch '^169\.254\.' -and $_.IPAddress -notmatch '^127\.' } |
                     Select-Object -First 1
            if ($ipObj) {
                $lanIp = $ipObj.IPAddress
            }
        }
    } catch {
        # ignore error and try next detection
    }

    if (-not $lanIp) {
        $ipObj = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue | 
                 Where-Object { $_.InterfaceAlias -notmatch 'Loopback|Virtual|vEthernet' -and $_.IPAddress -notmatch '^169\.254\.' -and $_.IPAddress -notmatch '^127\.' } | 
                 Select-Object -First 1
        if ($ipObj) {
            $lanIp = $ipObj.IPAddress
        }
    }
}

if (-not $lanIp) {
    $lanIp = "192.168.1.100"
    Write-Warning "Could not automatically determine LAN IP address. Defaulting to $lanIp. You can pass -CustomIp <your-ip>."
} else {
    Write-Host "[OK] Detected Active LAN IP: $lanIp" -ForegroundColor Green
}

# 2. Locate mkcert binary
$mkcertExe = ""
$mkcertCmd = Get-Command mkcert -ErrorAction SilentlyContinue
if ($mkcertCmd) {
    $mkcertExe = $mkcertCmd.Source
} else {
    $wingetPaths = Get-ChildItem -Path "$env:LOCALAPPDATA\Microsoft\WinGet\Packages" -Recurse -Filter "mkcert.exe" -ErrorAction SilentlyContinue
    if ($wingetPaths -and $wingetPaths.Count -gt 0) {
        $mkcertExe = $wingetPaths[0].FullName
    } elseif (Test-Path "C:\ProgramData\chocolatey\bin\mkcert.exe") {
        $mkcertExe = "C:\ProgramData\chocolatey\bin\mkcert.exe"
    }
}

if (-not $mkcertExe) {
    Write-Error "mkcert was not found on your system. Please install it using: winget install FiloSottile.mkcert"
    exit 1
}

Write-Host "[OK] Located mkcert: $mkcertExe" -ForegroundColor Green

# 3. Target Certificate Directory
$projectRoot = Split-Path -Parent $PSScriptRoot
$certDir = Join-Path $projectRoot "apps\web\.certs"
if (-not (Test-Path $certDir)) {
    New-Item -ItemType Directory -Path $certDir -Force | Out-Null
}

$certFile = Join-Path $certDir "cert.pem"
$keyFile = Join-Path $certDir "key.pem"

Write-Host "[i] Generating TLS certificates for localhost, 127.0.0.1, and $lanIp..." -ForegroundColor Yellow

& $mkcertExe -cert-file $certFile -key-file $keyFile "localhost" "127.0.0.1" "::1" $lanIp

if (-not (Test-Path $certFile) -or -not (Test-Path $keyFile)) {
    Write-Error "Failed to generate certificates."
    exit 1
}

Write-Host "[OK] Certificate created at: $certFile" -ForegroundColor Green
Write-Host "[OK] Private key created at:  $keyFile" -ForegroundColor Green

# 4. Copy Root CA for easy iPhone access
$caRootOutput = & $mkcertExe -CAROOT
$caRootDir = $caRootOutput.Trim()
$sourceCa = Join-Path $caRootDir "rootCA.pem"
$destCa = Join-Path $certDir "rootCA.pem"

if (Test-Path $sourceCa) {
    Copy-Item -Path $sourceCa -Destination $destCa -Force
    Write-Host "[OK] Root CA copied to:       $destCa" -ForegroundColor Green
}

# 5. Output Summary & Instructions
Write-Host ""
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  HTTPS SETUP COMPLETE!" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "To start the development server with HTTPS:" -ForegroundColor White
Write-Host "  pnpm dev" -ForegroundColor Yellow
Write-Host ""
Write-Host "URLs to access VestiAR:" -ForegroundColor White
Write-Host "  Desktop PC:    https://localhost:5173" -ForegroundColor Cyan
Write-Host "  iPhone Safari: https://${lanIp}:5173" -ForegroundColor Cyan
Write-Host ""
Write-Host "Important for iPhone Safari:" -ForegroundColor White
Write-Host "  1. Connect your iPhone to the same Wi-Fi network as this PC."
Write-Host "  2. Open https://${lanIp}:5173 in Safari."
Write-Host "  3. To avoid the 'Untrusted Certificate' warning on iPhone:"
Write-Host "     - AirDrop or email '$destCa' to your iPhone (or host/download it)."
Write-Host "     - In iOS: Settings -> Profile Downloaded -> Install."
Write-Host "     - In iOS: Settings -> General -> About -> Certificate Trust Settings."
Write-Host "     - Toggle ON 'mkcert development CA'."
Write-Host "  4. Tap 'Start Camera' to grant camera access and begin live preview."
Write-Host "==========================================================" -ForegroundColor Cyan
