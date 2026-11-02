param(
  [string]$ApiBaseUrl = "http://10.0.2.2:4000"
)

$ErrorActionPreference = "Stop"

if (-not (Get-Command flutter -ErrorAction SilentlyContinue)) {
  throw "Flutter SDK not found. Install Flutter 3.24+ and add it to PATH."
}

$here = Split-Path -Parent $PSScriptRoot
$temp = Join-Path $env:TEMP "talaltechno_pos_platform"

if (Test-Path $temp) {
  Remove-Item -Recurse -Force $temp
}
New-Item -ItemType Directory -Path $temp | Out-Null

Push-Location $temp
try {
  flutter create --platforms=android,ios --project-name talaltechno_pos .
} finally {
  Pop-Location
}

foreach ($folder in @("android", "ios")) {
  $source = Join-Path $temp $folder
  $target = Join-Path $here $folder
  if (Test-Path $source) {
    if (Test-Path $target) { Remove-Item -Recurse -Force $target }
    Copy-Item $source $target -Recurse -Force
  }
}

Remove-Item -Recurse -Force $temp

Push-Location $here
try {
  flutter pub get
  Write-Host ""
  Write-Host "Platform folders created. Run:" -ForegroundColor Green
  Write-Host "  flutter run --dart-define=API_BASE_URL=$ApiBaseUrl" -ForegroundColor Cyan
} finally {
  Pop-Location
}
