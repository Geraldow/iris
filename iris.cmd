@echo off
REM iris MCP Server Launcher
REM Ejecuta iris desde fuente compilada (Node.js 24+ con node:sqlite nativo)
REM Cuando Node 24.15+ esté disponible, reconstruir con: node --build-sea sea-config.json
node "%~dp0dist\index.js" %*
