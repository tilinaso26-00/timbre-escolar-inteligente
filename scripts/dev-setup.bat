@echo off
echo ========================================
echo Timbre Escolar Inteligente - Setup
echo ========================================
echo.

echo [1/3] Instalando dependencias de la app web...
cd app
npm install
if %errorlevel% neq 0 (
    echo ERROR: Fallo npm install
    exit /b 1
)
cd ..

echo.
echo [2/3] Verificando PlatformIO...
pio --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ADVERTENCIA: PlatformIO no instalado
    echo Instalar con: pip install platformio
) else (
    echo PlatformIO OK
    echo [3/3] Instalando dependencias firmware...
    cd firmware
    pio lib install
    cd ..
)

echo.
echo ========================================
echo Setup completado!
echo ========================================
echo.
echo Para desarrollo:
echo   App web:    cd app && npm run dev
echo   Firmware:   cd firmware && pio run -t upload
echo   Monitor:    cd firmware && pio device monitor
echo.
pause