@echo off
chcp 65001 >nul
title NoteCraft 모바일 서버 실행기
cd /d "%~dp0"
echo NoteCraft 모바일 서버를 시작하는 중입니다...
python serve.py
pause
