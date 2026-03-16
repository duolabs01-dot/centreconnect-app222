@echo off
echo ========================================
echo Email Test Script
echo ========================================
echo.

echo Testing: Parent Registration Confirmation Email
echo Sending test email to themba@centreconnect.co.za...
echo.

curl -X POST http://localhost:3010/api/auth/register-parent ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"themba@centreconnect.co.za\",\"password\":\"TestPass123!\",\"firstName\":\"Test\",\"surname\":\"User\",\"phone\":\"+27123456789\",\"termsVersion\":\"2026-02-19\"}"

echo.
echo ========================================
echo Check themba@centreconnect.co.za inbox for email
echo ========================================
