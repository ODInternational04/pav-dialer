$routes = @(
    "src\app\api\customer-feedback\[id]\route.ts",
    "src\app\api\notifications\[id]\route.ts", 
    "src\app\api\users\[id]\route.ts"
)

foreach ($route in $routes) {
    if (Test-Path $route) {
        Write-Host "Fixing $route..."
        
        # Read the file content
        $content = Get-Content $route -Raw
        
        # Fix the function signatures and param destructuring
        $content = $content -replace '\{ params \}: \{ params: \{ id: string \} \}', '{ params }: { params: Promise<{ id: string }> }'
        $content = $content -replace '\{ params \}: \{ params: \{ id: string; \} \}', '{ params }: { params: Promise<{ id: string }> }'
        $content = $content -replace 'const \{ id \} = params', 'const { id } = await params'
        $content = $content -replace 'const \{ id: (\w+) \} = params', 'const { id: $1 } = await params'
        $content = $content -replace 'params\.id', 'id'
        
        # Write the fixed content back
        Set-Content $route -Value $content -NoNewline
        
        Write-Host "Fixed $route"
    }
}

Write-Host "All dynamic routes have been updated for Next.js 16 compatibility!"