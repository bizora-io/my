Add-Type -AssemblyName System.Drawing
$imgPath = 'C:\Users\iamis\.gemini\antigravity\brain\e5c54a6d-a541-4a2b-9d51-bfac4241b4a6\.user_uploaded\media_1792834384415_1cb87f3c.jpg'
$img = [System.Drawing.Image]::FromFile($imgPath)
Write-Output "Dimensions: $($img.Width) x $($img.Height)"
$img.Dispose()

