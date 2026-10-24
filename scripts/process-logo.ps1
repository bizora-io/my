Add-Type -AssemblyName System.Drawing

$srcPath = "C:\Users\iamis\.gemini\antigravity\brain\e5c54a6d-a541-4a2b-9d51-bfac4241b4a6\.user_uploaded\media_1792834384415_1cb87f3c.jpg"
if (-not (Test-Path $srcPath)) {
    Write-Error "Source image not found at $srcPath"
    exit 1
}

$srcBmp = [System.Drawing.Bitmap]::FromFile($srcPath)
Write-Output "Image size: $($srcBmp.Width) x $($srcBmp.Height)"

# Find bounds of emblem and full logo
$w = $srcBmp.Width
$h = $srcBmp.Height

# Emblem search (y between 100 and 600)
$embMinX = $w; $embMaxX = 0; $embMinY = $h; $embMaxY = 0
for ($y = 100; $y -lt 600; $y++) {
    for ($x = 100; $x -lt ($w - 100); $x++) {
        $pixel = $srcBmp.GetPixel($x, $y)
        # Check if pixel is not near-white
        if ($pixel.R -lt 240 -or $pixel.G -lt 240 -or $pixel.B -lt 240) {
            if ($x -lt $embMinX) { $embMinX = $x }
            if ($x -gt $embMaxX) { $embMaxX = $x }
            if ($y -lt $embMinY) { $embMinY = $y }
            if ($y -gt $embMaxY) { $embMaxY = $y }
        }
    }
}

Write-Output "Emblem bounds: X: $embMinX - $embMaxX (W: $($embMaxX - $embMinX)), Y: $embMinY - $embMaxY (H: $($embMaxY - $embMinY))"

# Full content bounds
$fullMinX = $w; $fullMaxX = 0; $fullMinY = $h; $fullMaxY = 0
for ($y = 50; $y -lt ($h - 50); $y++) {
    for ($x = 50; $x -lt ($w - 50); $x++) {
        $pixel = $srcBmp.GetPixel($x, $y)
        if ($pixel.R -lt 240 -or $pixel.G -lt 240 -or $pixel.B -lt 240) {
            if ($x -lt $fullMinX) { $fullMinX = $x }
            if ($x -gt $fullMaxX) { $fullMaxX = $x }
            if ($y -lt $fullMinY) { $fullMinY = $y }
            if ($y -gt $fullMaxY) { $fullMaxY = $y }
        }
    }
}
Write-Output "Full bounds: X: $fullMinX - $fullMaxX (W: $($fullMaxX - $fullMinX)), Y: $fullMinY - $fullMaxY (H: $($fullMaxY - $fullMinY))"

$srcBmp.Dispose()

