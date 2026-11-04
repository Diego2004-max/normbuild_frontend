param(
    [string]$EnvironmentFile = (Join-Path $PSScriptRoot '..\.env.production'),
    [switch]$VerifyRunningStack,
    [switch]$RequireSevenCityCoverage
)

$ErrorActionPreference = 'Stop'
$errors = [System.Collections.Generic.List[string]]::new()
$environmentPath = [IO.Path]::GetFullPath($EnvironmentFile)
$composePath = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\docker-compose.production.yml'))
$settings = @{}

if (-not (Test-Path -LiteralPath $environmentPath -PathType Leaf)) {
    $errors.Add("Production environment file is missing: $environmentPath")
} else {
    foreach ($line in [IO.File]::ReadAllLines($environmentPath)) {
        $trimmed = $line.Trim()
        if ($trimmed -match '^(?<name>[A-Za-z_][A-Za-z0-9_]*)=(?<value>.*)$') {
            $settings[$Matches.name] = $Matches.value.Trim().Trim('"').Trim("'")
        }
    }
}

$domain = $settings['PUBLIC_DOMAIN']
if ([string]::IsNullOrWhiteSpace($domain) -or
    $domain -match 'example\.com$|\.example$|^localhost$' -or
    [Uri]::CheckHostName($domain) -ne [UriHostNameType]::Dns) {
    $errors.Add('PUBLIC_DOMAIN must be set to a real public DNS hostname.')
}
if ([string]::IsNullOrWhiteSpace($settings['NORMBUILD_BACKEND_URL'])) {
    $errors.Add('NORMBUILD_BACKEND_URL must point to the backend service on the shared Docker network.')
}

$docker = Get-Command docker -ErrorAction SilentlyContinue
if (-not $docker) {
    $errors.Add('Docker CLI is not installed or is not on PATH.')
} else {
    & docker info --format '{{.ServerVersion}}' *> $null
    if ($LASTEXITCODE -ne 0) {
        $errors.Add('Docker Engine is not reachable from the current Docker context.')
    } elseif (Test-Path -LiteralPath $environmentPath -PathType Leaf) {
        & docker compose --env-file $environmentPath -f $composePath config --quiet *> $null
        if ($LASTEXITCODE -ne 0) {
            $errors.Add('Production Docker Compose configuration is invalid. Check required variables and compose diagnostics.')
        }
    }
}

if ($VerifyRunningStack -and $docker -and $domain) {
    & docker network inspect normbuild-edge *> $null
    if ($LASTEXITCODE -ne 0) {
        $errors.Add('The shared Docker network normbuild-edge does not exist.')
    }

    try {
        Resolve-DnsName -Name $domain -Type A -ErrorAction Stop | Out-Null
    } catch {
        $errors.Add("PUBLIC_DOMAIN does not resolve to an IPv4 address: $domain.")
    }

    try {
        $site = Invoke-WebRequest -Uri "https://$domain/" -UseBasicParsing -TimeoutSec 20
        if ($site.StatusCode -lt 200 -or $site.StatusCode -ge 400) {
            $errors.Add("The HTTPS site returned status $($site.StatusCode).")
        }
    } catch {
        $errors.Add("The HTTPS site or its public certificate is unavailable at https://$domain/.")
    }

    if ($RequireSevenCityCoverage) {
        try {
            $coverage = Invoke-RestMethod -Uri "https://$domain/api/regulations/coverage" -TimeoutSec 20
            $requiredCities = @('Bogotá D.C.', 'Pasto', 'Medellín', 'Cali', 'Bucaramanga', 'Barranquilla', 'Cartagena')
            foreach ($city in $requiredCities) {
                $cityCoverage = $coverage | Where-Object { $_.jurisdiction -ceq $city } | Select-Object -First 1
                if (-not $cityCoverage -or $cityCoverage.officialSources -lt 1 -or $cityCoverage.indexedSections -lt 1) {
                    $errors.Add("No indexed official source is available for $city.")
                }
            }
        } catch {
            $errors.Add('Could not verify seven-city indexed coverage through the public HTTPS API.')
        }
    }
}

if ($errors.Count -gt 0) {
    Write-Output 'Production preflight failed:'
    foreach ($errorMessage in $errors) {
        Write-Output " - $errorMessage"
    }
    exit 1
}

Write-Output 'Production preflight passed.'
if (-not $VerifyRunningStack) {
    Write-Output 'DNS, HTTPS, public certificate and indexed corpus coverage were not checked. Use -VerifyRunningStack after deployment.'
}
if ($VerifyRunningStack -and -not $RequireSevenCityCoverage) {
    Write-Output 'Seven-city indexed source coverage was not required. Use -RequireSevenCityCoverage after legal review and ingestion.'
}