# Build script for testing item extraction and managing server
param(
    [switch]$StartServer
)

Write-Host "Testing item extraction..."

# Run the extraction script
node extract_items.js

# Check if the script ran successfully
if ($LASTEXITCODE -eq 0) {
    Write-Host "Extraction completed successfully"
    
    # Validate items.json exists and is not empty
    if (Test-Path items.json) {
        $itemsContent = Get-Content items.json -Raw
        if ($itemsContent) {
            try {
                $items = $itemsContent | ConvertFrom-Json
                Write-Host "Successfully parsed items.json"
                Write-Host "Found $($items.Count) items"
                
                # If -StartServer flag is provided, start the server
                if ($StartServer) {
                    Write-Host "`nStarting server..."
                    Write-Host "Access the application at http://localhost:3001"
                    Write-Host "Press Ctrl+C to stop the server`n"
                    node server.js
                }
            }
            catch {
                Write-Host "Error: items.json contains invalid JSON"
                exit 1
            }
        }
        else {
            Write-Host "Error: items.json is empty"
            exit 1
        }
    }
    else {
        Write-Host "Error: items.json not found"
        exit 1
    }
}
else {
    Write-Host "Error: Extraction script failed"
    exit 1
} 