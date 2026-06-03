$urls = @(
  "https://upload.wikimedia.org/wikipedia/commons/5/56/Rick_Astley.jpg",
  "https://upload.wikimedia.org/wikipedia/commons/e/e6/Rick_Astley2.jpg",
  "https://upload.wikimedia.org/wikipedia/commons/c/c2/Rick_Astley_3.jpg",
  "https://upload.wikimedia.org/wikipedia/commons/e/e2/Rick_Astley_Macy_Parade_cropped.jpg",
  "https://upload.wikimedia.org/wikipedia/commons/6/6d/Rick_Astley_-_Pepsifest_2009.jpg",
  "https://upload.wikimedia.org/wikipedia/commons/f/f9/Rick_Astley_Tivoli_Gardens.jpg",
  "https://upload.wikimedia.org/wikipedia/commons/4/41/Rick_Astley_Dallas.jpg",
  "https://upload.wikimedia.org/wikipedia/commons/6/66/CalJam17_071017-106_%2823791812018%29.jpg",
  "https://upload.wikimedia.org/wikipedia/commons/8/8c/CalJam17_071017-107_%2837386595750%29.jpg"
)

for ($i = 0; $i -lt $urls.Count; $i++) {
  $url = $urls[$i]
  $num = $i + 1
  $ext = if ($url -match "\.png$") { ".png" } else { ".jpg" }
  $out = "c:\Users\abhin\OneDrive\Documents\Project\me\assets\rick$num$ext"

  if (Test-Path $out) {
    Write-Host "rick$num already exists, skipping"
    continue
  }

  try {
    $client = New-Object System.Net.WebClient
    $client.Headers.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
    $client.Headers.Add("Referer", "https://commons.wikimedia.org/")
    $client.DownloadFile($url, $out)
    Write-Host "Downloaded rick$num$ext"
  } catch {
    Write-Host "Failed rick$num : $($_.Exception.Message)"
  }

  Start-Sleep -Milliseconds 1500
}

Write-Host "All done!"
