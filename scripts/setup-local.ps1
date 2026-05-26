#!/usr/bin/env pwsh

$ErrorActionPreference = "Stop"

# Colors
$SUCCESS = @{ ForegroundColor = 'Green' }
$ERROR_COLOR = @{ ForegroundColor = 'Red' }
$WARNING = @{ ForegroundColor = 'Yellow' }
$INFO = @{ ForegroundColor = 'Cyan' }

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════════════╗" @INFO
Write-Host "║     Affiliate Platform - Local Development Setup                 ║" @INFO
Write-Host "╚══════════════════════════════════════════════════════════════════╝" @INFO
Write-Host ""

Write-Host "[1/7] Checking prerequisites..." @WARNING

$prerequisites = @(
  @{ command = "node"; name = "Node.js" },
  @{ command = "npm"; name = "npm" },
  @{ command = "docker"; name = "Docker" }
)

foreach ($prereq in $prerequisites) {
  try {
    $null = & $prereq.command --version 2>&1
    Write-Host "✓ $($prereq.name) found" @SUCCESS
  }
  catch {
    Write-Host "✗ $($prereq.name) not found. Please install it first." @ERROR_COLOR
    exit 1
  }
}

Write-Host ""
Write-Host "[2/7] Setting up environment files..." @WARNING

$files = @(
  @{ source = "backend/.env.example"; target = "backend/.env" },
  @{ source = "frontend/.env.example"; target = "frontend/.env.local" },
  @{ source = ".env.local.example"; target = ".env.local" }
)

foreach ($file in $files) {
  if (-Not (Test-Path $file.target)) {
    Copy-Item $file.source $file.target
    Write-Host "✓ Created $($file.target)" @SUCCESS
  }
  else {
    Write-Host "→ $($file.target) already exists" @WARNING
  }
}

Write-Host ""
Write-Host "[3/7] Starting Docker services..." @WARNING

docker-compose up -d
Write-Host "✓ Docker services starting" @SUCCESS

Write-Host "→ Waiting for MySQL to be ready..." @INFO
Start-Sleep -Seconds 30

Write-Host "[4/7] Installing npm dependencies..." @WARNING
npm install --legacy-peer-deps
npm dedupe
Write-Host "✓ Dependencies installed" @SUCCESS

Write-Host ""
Write-Host "[5/7] Setting up database..." @WARNING

cd backend
npm run prisma:generate
npm run prisma:push
npm run seed
cd ..

Write-Host "✓ Database setup complete" @SUCCESS
Write-Host ""

Write-Host "[6/7] Services information:" @WARNING
Write-Host ""
Write-Host "Database:" @INFO
Write-Host "  Host: localhost:3306"
Write-Host "  User: affiliate_user"
Write-Host "  Password: affiliate_pass123"
Write-Host ""
Write-Host "n8n:" @INFO
Write-Host "  URL: http://localhost:5678"
Write-Host "  User: admin / n8n_password_123"
Write-Host ""
Write-Host "Admin Account:" @INFO
Write-Host "  Email: admin@example.com"
Write-Host "  Password: Admin@123"
Write-Host ""

Write-Host "[7/7] Ready to start!" @WARNING
Write-Host ""
Write-Host "Run: npm run dev" @SUCCESS
Write-Host ""
Write-Host "Then access:"
Write-Host "  Frontend: http://localhost:3000"
Write-Host "  Admin: http://localhost:3000/admin"
Write-Host "  Backend: http://localhost:4000"
Write-Host "  n8n: http://localhost:5678"
Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════════════╗" @INFO
Write-Host "║              Setup complete! Ready for development               ║" @INFO
Write-Host "╚══════════════════════════════════════════════════════════════════╝" @INFO
