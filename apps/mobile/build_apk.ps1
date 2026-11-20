# Compila el APK desde una ruta sin acentos (requerido en Windows/Flutter)
param(
  [Parameter(Mandatory = $true)]
  [string]$ApiBaseUrl
)

$ErrorActionPreference = "Stop"
$source = Split-Path -Parent $MyInvocation.MyCommand.Path
$buildRoot = "C:\src\accesovivo_mobile"

if (Test-Path $buildRoot) {
  Remove-Item -Recurse -Force $buildRoot
}

Copy-Item -Recurse -Force $source $buildRoot
Set-Location $buildRoot

flutter pub get
flutter build apk --release --dart-define="API_BASE_URL=$ApiBaseUrl"

$dist = Join-Path $source "dist"
New-Item -ItemType Directory -Force -Path $dist | Out-Null
Copy-Item -Force ".\build\app\outputs\flutter-apk\app-release.apk" (Join-Path $dist "accesovivo-release.apk")
Copy-Item -Force ".\build\app\outputs\flutter-apk\app-release.apk" "$env:USERPROFILE\Desktop\AccesoVivo.apk"

Write-Host "APK listo:"
Write-Host " - $dist\accesovivo-release.apk"
Write-Host " - $env:USERPROFILE\Desktop\AccesoVivo.apk"
