Add-Type -AssemblyName System.Drawing

$srcPath = "C:\Users\iamis\.gemini\antigravity\brain\e5c54a6d-a541-4a2b-9d51-bfac4241b4a6\.user_uploaded\media_1792834384415_1cb87f3c.jpg"
if (-not (Test-Path $srcPath)) {
    Write-Error "Source image not found: $srcPath"
    exit 1
}

$srcBmp = [System.Drawing.Bitmap]::FromFile($srcPath)

function MakeTransparent($bmp, $isDarkText = $false) {
    $out = New-Object System.Drawing.Bitmap($bmp.Width, $bmp.Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    for ($y = 0; $y -lt $bmp.Height; $y++) {
        for ($x = 0; $x -lt $bmp.Width; $x++) {
            $p = $bmp.GetPixel($x, $y)
            $lum = [int](0.299 * $p.R + 0.587 * $p.G + 0.114 * $p.B)
            if ($lum -gt 250) {
                $out.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0, 0, 0, 0))
            } elseif ($lum -gt 225) {
                $alpha = [int](255 * (250 - $lum) / (250 - 225))
                if ($alpha -lt 0) { $alpha = 0 }
                if ($alpha -gt 255) { $alpha = 255 }
                $out.SetPixel($x, $y, [System.Drawing.Color]::FromArgb($alpha, $p.R, $p.G, $p.B))
            } else {
                $out.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(255, $p.R, $p.G, $p.B))
            }
        }
    }
    return $out
}

function ResizeBitmap($source, $targetWidth, $targetHeight) {
    $dest = New-Object System.Drawing.Bitmap($targetWidth, $targetHeight, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($dest)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)
    $g.DrawImage($source, 0, 0, $targetWidth, $targetHeight)
    $g.Dispose()
    return $dest
}

# 1. Emblem crop (with 10px margin on each side to avoid clipping)
# Emblem was X: 301-704 (403w), Y: 183-599 (416h)
$embCropX = 290
$embCropY = 175
$embCropW = 425
$embCropH = 435

$embRect = New-Object System.Drawing.Rectangle($embCropX, $embCropY, $embCropW, $embCropH)
$embBmp = $srcBmp.Clone($embRect, $srcBmp.PixelFormat)
$embTrans = MakeTransparent $embBmp

# Fit emblem in a square canvas with subtle 5% breathing room
$embSquareSize = [Math]::Max($embCropW, $embCropH) + 20
$embSquare = New-Object System.Drawing.Bitmap($embSquareSize, $embSquareSize, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($embSquare)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.Clear([System.Drawing.Color]::Transparent)
$posX = [int](($embSquareSize - $embCropW) / 2)
$posY = [int](($embSquareSize - $embCropH) / 2)
$g.DrawImage($embTrans, $posX, $posY, $embCropW, $embCropH)
$g.Dispose()

# 2. Full Logo crop
# Full was X: 151-875 (724w), Y: 183-824 (641h)
$fullCropX = 140
$fullCropY = 170
$fullCropW = 744
$fullCropH = 665
$fullRect = New-Object System.Drawing.Rectangle($fullCropX, $fullCropY, $fullCropW, $fullCropH)
$fullBmp = $srcBmp.Clone($fullRect, $srcBmp.PixelFormat)
$fullTrans = MakeTransparent $fullBmp

# Target output directories
$dirs = @(
    "d:\Bizora\bizora-monorepo\frontend\public",
    "d:\Bizora\bizora-monorepo\frontend\public\assets",
    "d:\Bizora\bizora-monorepo\admin\public",
    "d:\Bizora\bizora-monorepo\admin\public\assets",
    "d:\Bizora\bizora-monorepo\shared\assets"
)

foreach ($d in $dirs) {
    if (-not (Test-Path $d)) {
        New-Item -ItemType Directory -Path $d -Force | Out-Null
    }
}

# Save full logos
$fullTrans.Save("d:\Bizora\bizora-monorepo\frontend\public\assets\bizora-logo.png", [System.Drawing.Imaging.ImageFormat]::Png)
$fullTrans.Save("d:\Bizora\bizora-monorepo\admin\public\assets\bizora-logo.png", [System.Drawing.Imaging.ImageFormat]::Png)
$fullTrans.Save("d:\Bizora\bizora-monorepo\shared\assets\bizora-logo.png", [System.Drawing.Imaging.ImageFormat]::Png)

# Save emblem images
$embSquare.Save("d:\Bizora\bizora-monorepo\frontend\public\assets\bizora-emblem.png", [System.Drawing.Imaging.ImageFormat]::Png)
$embSquare.Save("d:\Bizora\bizora-monorepo\admin\public\assets\bizora-emblem.png", [System.Drawing.Imaging.ImageFormat]::Png)
$embSquare.Save("d:\Bizora\bizora-monorepo\shared\assets\bizora-emblem.png", [System.Drawing.Imaging.ImageFormat]::Png)

# Generate favicons
$sizes = @{
    "android-chrome-512x512.png" = 512
    "android-chrome-192x192.png" = 192
    "apple-touch-icon.png"       = 180
    "favicon-32x32.png"          = 32
    "favicon-16x16.png"          = 16
}

$destRoots = @(
    "d:\Bizora\bizora-monorepo\frontend\public",
    "d:\Bizora\bizora-monorepo\admin\public"
)

foreach ($name in $sizes.Keys) {
    $dim = $sizes[$name]
    $resized = ResizeBitmap $embSquare $dim $dim
    foreach ($root in $destRoots) {
        $path = Join-Path $root $name
        $resized.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
    }
    $resized.Dispose()
}

# Multi-resolution ICO builder (16, 32, 48)
function CreateIco($sourceSquare, $outputPath) {
    $imgSizes = @(16, 32, 48)
    $msList = @()
    foreach ($s in $imgSizes) {
        $scaled = ResizeBitmap $sourceSquare $s $s
        $ms = New-Object System.IO.MemoryStream
        $scaled.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
        $scaled.Dispose()
        $msList += $ms
    }

    $fs = [System.IO.File]::Create($outputPath)
    $bw = New-Object System.IO.BinaryWriter($fs)

    # ICONDIR header: Reserved(2)=0, Type(2)=1 (ICO), Count(2)
    $bw.Write([uint16]0)
    $bw.Write([uint16]1)
    $bw.Write([uint16]$imgSizes.Count)

    $offset = 6 + (16 * $imgSizes.Count)
    for ($i = 0; $i -lt $imgSizes.Count; $i++) {
        $dim = $imgSizes[$i]
        $bytes = $msList[$i].ToArray()
        # ICONDIRENTRY: Width, Height, Colors, Reserved, Planes, BPP, Size, Offset
        $bw.Write([byte]($dim -band 0xFF))
        $bw.Write([byte]($dim -band 0xFF))
        $bw.Write([byte]0) # Color count
        $bw.Write([byte]0) # Reserved
        $bw.Write([uint16]1) # Color planes
        $bw.Write([uint16]32) # Bits per pixel
        $bw.Write([uint32]$bytes.Length)
        $bw.Write([uint32]$offset)
        $offset += $bytes.Length
    }

    for ($i = 0; $i -lt $imgSizes.Count; $i++) {
        $bytes = $msList[$i].ToArray()
        $bw.Write($bytes)
        $msList[$i].Dispose()
    }

    $bw.Flush()
    $fs.Close()
}

foreach ($root in $destRoots) {
    $icoPath = Join-Path $root "favicon.ico"
    CreateIco $embSquare $icoPath
}

$srcBmp.Dispose()
$embBmp.Dispose()
$embTrans.Dispose()
$embSquare.Dispose()
$fullBmp.Dispose()
$fullTrans.Dispose()

Write-Output "All PNG and ICO assets successfully generated!"

