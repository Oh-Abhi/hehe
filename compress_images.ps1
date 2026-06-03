Add-Type -AssemblyName System.Drawing

$assets = "c:\Users\abhin\OneDrive\Documents\Project\me\assets"
$files = Get-ChildItem "$assets\rick*.jpg"

foreach ($file in $files) {
  $img = [System.Drawing.Image]::FromFile($file.FullName)
  
  # Resize if wider than 600px
  $maxW = 600
  $ratio = [Math]::Min(1.0, $maxW / $img.Width)
  $newW = [int]($img.Width * $ratio)
  $newH = [int]($img.Height * $ratio)
  
  $bmp = New-Object System.Drawing.Bitmap($newW, $newH)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.DrawImage($img, 0, 0, $newW, $newH)
  $g.Dispose()
  $img.Dispose()
  
  # Save with JPEG quality 75
  $encoder = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
  $params = New-Object System.Drawing.Imaging.EncoderParameters(1)
  $params.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, 75L)
  
  $bmp.Save($file.FullName, $encoder, $params)
  $bmp.Dispose()
  
  $newSize = (Get-Item $file.FullName).Length
  Write-Host "$($file.Name) => $([Math]::Round($newSize/1024))KB"
}

Write-Host "Done compressing!"
