param(
  [switch]$Install,
  [switch]$Release,
  [switch]$LocalApi,
  [switch]$ProductionApi,
  [switch]$PhysicalOnly,
  [switch]$NoMetro,
  [int]$MetroPort = 8081,
  [int]$ApiPort = 3000
)

$ErrorActionPreference = "Stop"

function Exit-WithMessage {
  param([string]$Message)
  Write-Error $Message
  exit 1
}

if (-not (Get-Command adb -ErrorAction SilentlyContinue)) {
  Exit-WithMessage "adb was not found. Install Android platform-tools and make sure adb is on PATH."
}

& adb start-server | Out-Null

$deviceLines = & adb devices
$unauthorized = @(
  $deviceLines |
    Where-Object { $_ -match "^\S+\s+unauthorized" } |
    ForEach-Object { ($_ -split "\s+")[0] }
)
$devices = @(
  $deviceLines |
    Where-Object { $_ -match "^\S+\s+device$" } |
    ForEach-Object { ($_ -split "\s+")[0] }
)
$physicalDevices = @(
  $devices |
    Where-Object { $_ -notmatch "^emulator-" }
)

$targetDevices = if ($PhysicalOnly) { $physicalDevices } elseif ($physicalDevices.Count -gt 0) { $physicalDevices } else { $devices }

if ($targetDevices.Count -eq 0) {
  if ($unauthorized.Count -gt 0) {
    Exit-WithMessage "Phone is connected but unauthorized. Unlock it and accept the USB debugging RSA prompt."
  }

  Exit-WithMessage "No authorized Android device or running emulator found. Start an emulator or connect a phone, then run this again."
}

$serial = @($targetDevices)[0]

& adb -s $serial reverse "tcp:$MetroPort" "tcp:$MetroPort" | Out-Null
& adb -s $serial reverse "tcp:$ApiPort" "tcp:$ApiPort" | Out-Null

Write-Host "Android device: $serial"
Write-Host "Metro reverse: device 127.0.0.1:$MetroPort -> computer 127.0.0.1:$MetroPort"
Write-Host "API reverse: device 127.0.0.1:$ApiPort -> computer 127.0.0.1:$ApiPort"

$env:EXPO_NO_DEPENDENCY_VALIDATION = "1"

if ($LocalApi -and $ProductionApi) {
  Exit-WithMessage "Choose either -LocalApi or -ProductionApi, not both."
}

$useLocalApi = $LocalApi -or (-not $ProductionApi -and -not $Release)

if ($useLocalApi) {
  $env:EXPO_PUBLIC_MECHI_API_URL = "http://127.0.0.1:$ApiPort"
  Write-Host "API target: http://127.0.0.1:$ApiPort"
  try {
    $healthResponse = Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:$ApiPort/api/auth/me" -Method GET -TimeoutSec 3 -ErrorAction Stop
    Write-Host "Local API reachable: HTTP $($healthResponse.StatusCode)"
  }
  catch {
    $statusCode = if ($_.Exception.Response) { $_.Exception.Response.StatusCode.value__ } else { $null }
    if ($statusCode -eq 401) {
      Write-Host "Local API reachable: HTTP 401 unauthenticated, which is expected before login."
    }
    else {
      Write-Warning "Local API did not answer on 127.0.0.1:$ApiPort. Start the backend from the repo root with: npm run dev"
    }
  }
}
else {
  $env:EXPO_PUBLIC_MECHI_API_URL = "https://mechi.club"
  Write-Host "API target: https://mechi.club"
}

if ($Install) {
  Push-Location "$PSScriptRoot\..\android"
  try {
    $env:ANDROID_SERIAL = $serial
    if ($Release) {
      Write-Host "Installing bundled local release build. Metro is not required after this install."
      & .\gradlew.bat installReleaseLocal
    }
    else {
      Write-Host "Installing debug build. Keep Metro running with npm start after this install."
      & .\gradlew.bat installDebug
    }
    exit $LASTEXITCODE
  }
  finally {
    Pop-Location
  }
}

if (-not $NoMetro) {
  & npx expo start --dev-client --host localhost --port $MetroPort
  exit $LASTEXITCODE
}
