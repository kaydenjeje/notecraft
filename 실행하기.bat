@echo off
chcp 65001 >nul
title NoteCraft 실행기
echo NoteCraft 메모 앱을 실행합니다...
start "" "%~dp0index.html"
exit
