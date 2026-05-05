param(
  [switch]$Install,
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
    ForEach-Object { ($_ -split "\s+")[0] } |
    Where-Object { $_ -notmatch "^emulator-" }
)

if ($devices.Count -eq 0) {
  if ($unauthorized.Count -gt 0) {
    Exit-WithMessage "Phone is connected but unauthorized. Unlock it and accept the USB debugging RSA prompt."
  }

  Exit-WithMessage "No authorized USB-debug Android phone found. Connect the phone, enable USB debugging, then run this again."
}

$serial = $devices[0]

& adb -s $serial reverse "tcp:$MetroPort" "tcp:$MetroPort" | Out-Null
& adb -s $serial reverse "tcp:$ApiPort" "tcp:$ApiPort" | Out-Null

Write-Host "USB device: $serial"
Write-Host "Metro reverse: device 127.0.0.1:$MetroPort -> computer 127.0.0.1:$MetroPort"
Write-Host "API reverse: device 127.0.0.1:$ApiPort -> computer 127.0.0.1:$ApiPort"

$env:EXPO_NO_DEPENDENCY_VALIDATION = "1"
$env:EXPO_PUBLIC_MECHI_API_URL = "http://127.0.0.1:$ApiPort"

if ($Install) {
  & npx expo run:android --device $serial
  exit $LASTEXITCODE
}

if (-not $NoMetro) {
  & npx expo start --dev-client --host localhost --port $MetroPort
  exit $LASTEXITCODE
}
