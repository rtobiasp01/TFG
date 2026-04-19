@echo off
REM Script para probar el endpoint de checkout

setlocal enabledelayedexpansion

REM 1. Obtener token (login)
echo Paso 1: Obteniendo token de autenticacion...

for /f "delims=" %%A in ('curl -s -X POST http://localhost:3000/users/login ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"test@test.com\",\"password\":\"test123\"}" ^
  ^| findstr /i "token"') do (
  set "response=%%A"
  echo Response: !response!
)

echo.
echo Paso 2: Probando endpoint de checkout...
echo.

REM 2. Intentar checkout (si no hay token, esto debería dar error 401)
curl -X POST http://localhost:3000/orders/checkout ^
  -H "Content-Type: application/json" ^
  -H "Authorization: Bearer test-token" ^
  -d "{\"shippingAddress\":{}}" ^
  -v

echo.
echo Prueba completada.
