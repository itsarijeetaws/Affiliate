# Affiliate Platform Automation Test Script (PowerShell)

Write-Host "🚀 Testing Affiliate Platform Automation..." -ForegroundColor Green
Write-Host ""

# 1. Login and get JWT token
Write-Host "1. Logging in..." -ForegroundColor Blue

$loginBody = @{
    email = "admin@example.com"
    password = "Admin@123"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-WebRequest -Uri "http://localhost:4000/auth/login" `
        -Method POST `
        -Headers @{"Content-Type"="application/json"} `
        -Body $loginBody `
        -UseBasicParsing

    $loginData = $loginResponse.Content | ConvertFrom-Json
    $token = $loginData.token

    Write-Host "✅ Logged in successfully" -ForegroundColor Green
    Write-Host "Token: $($token.Substring(0, 50))..." -ForegroundColor Gray
    Write-Host ""
} catch {
    Write-Host "❌ Login failed: $_" -ForegroundColor Red
    exit 1
}

# 2. Test with JWT token (admin operations)
Write-Host "2. Testing with JWT token (admin operations)..." -ForegroundColor Blue

try {
    $productsResponse = Invoke-WebRequest -Uri "http://localhost:4000/products?limit=5" `
        -Headers @{"Authorization"="Bearer $token"} `
        -UseBasicParsing

    $productsData = $productsResponse.Content | ConvertFrom-Json

    Write-Host "✅ Can fetch products as admin" -ForegroundColor Green
    Write-Host "Found $($productsData.items.Count) products" -ForegroundColor Gray
    Write-Host ""
} catch {
    Write-Host "❌ Product fetch failed: $_" -ForegroundColor Red
}

# 3. Check automation API key requirement
Write-Host "3. Automation API key requirement..." -ForegroundColor Blue
Write-Host "The /automation/* endpoints require AUTOMATION_API_KEY instead of JWT" -ForegroundColor Yellow
Write-Host "This is for programmatic/n8n access, not admin web access" -ForegroundColor Gray
Write-Host ""
Write-Host "Current AUTOMATION_API_KEY in .env:" -ForegroundColor Gray

# Read from .env
$envFile = Get-Content D:\Affiliate\backend\.env | Select-String "AUTOMATION_API_KEY"
if ($envFile) {
    Write-Host "  $envFile" -ForegroundColor Gray
}

Write-Host ""
Write-Host "To use /automation endpoints, provide the API key:" -ForegroundColor Gray
Write-Host '  Invoke-WebRequest -Uri "http://localhost:4000/automation/status" `' -ForegroundColor DarkGray
Write-Host '    -Headers @{"Authorization"="Bearer AUTOMATION_API_KEY_VALUE"}' -ForegroundColor DarkGray

Write-Host ""

# 4. Summary
Write-Host "✅ Testing complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Visit http://localhost:3002/admin to use the admin dashboard"
Write-Host "2. Login with: admin@example.com / Admin@123"
Write-Host "3. Get Amazon API credentials from AMAZON_API_SETUP.md"
Write-Host "4. Add to .env:"
Write-Host "   AMAZON_ACCESS_KEY=your-key"
Write-Host "   AMAZON_SECRET_KEY=your-secret"
Write-Host "   AMAZON_PARTNER_TAG=your-tag"
Write-Host "5. Test product fetching from Amazon"
Write-Host ""
