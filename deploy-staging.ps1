# Deploy to staging (project-hidf9) with staging Supabase
Write-Host "Deploying to STAGING..." -ForegroundColor Yellow

# Backup prod .env et .vercel
Copy-Item .env .env.prod.bak
Copy-Item .vercel\project.json .vercel\project.json.bak

# Utiliser les configs staging
Copy-Item .env.staging .env
Copy-Item .vercel-staging\project.json .vercel\project.json

# Deploy
vercel --prod

# Restaurer la prod
Copy-Item .env.prod.bak .env
Copy-Item .vercel\project.json.bak .vercel\project.json
Remove-Item .env.prod.bak
Remove-Item .vercel\project.json.bak

Write-Host "Done! Staging deployed. Prod config restored." -ForegroundColor Green
