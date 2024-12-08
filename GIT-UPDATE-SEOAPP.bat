@echo off
git init
git remote remove origin
git remote add origin https://github.com/MCERQUA/SEOBROKE.git
git branch -M main
git add .
git commit -m "Initial commit: SEOAPP fixinshit"
git push -u origin main --force
pause