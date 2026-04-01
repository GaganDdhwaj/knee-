$ErrorActionPreference = "Stop"

$python = "$env:LocalAppData\Programs\Python\Python312\python.exe"
if (-not (Test-Path $python)) {
  throw "Python not found at $python"
}

& $python -m pip install -r (Join-Path $PSScriptRoot "requirements.txt")
& $python (Join-Path $PSScriptRoot "app.py")
