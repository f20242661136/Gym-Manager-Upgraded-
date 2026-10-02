Set-Location "D:\GymManagementApp\GymManagementApp"

Write-Host "`n=== TYPESCRIPT ===" -ForegroundColor Cyan
npx tsc --noEmit

Write-Host "`n=== EXPO DOCTOR ===" -ForegroundColor Cyan
npx expo-doctor

Write-Host "`n=== RESOLVED EXPO CONFIG ===" -ForegroundColor Cyan
npx expo config --type public

Write-Host "`n=== EAS CONFIG ===" -ForegroundColor Cyan
Get-Content ".\eas.json"

Write-Host "`n=== NATIVE ANDROID MANIFEST PERMISSIONS ===" -ForegroundColor Cyan
$manifest = ".\android\app\src\main\AndroidManifest.xml"

if (Test-Path $manifest) {
    Select-String `
      -Path $manifest `
      -Pattern "CAMERA|RECORD_AUDIO|READ_MEDIA_IMAGES|READ_MEDIA_VIDEO|READ_EXTERNAL_STORAGE|POST_NOTIFICATIONS" `
      -Context 0,0
}
else {
    Write-Host "No native AndroidManifest.xml found." -ForegroundColor Yellow
}

Write-Host "`n=== APP LABEL ===" -ForegroundColor Cyan
$strings = ".\android\app\src\main\res\values\strings.xml"
if (Test-Path $strings) {
    Select-String -Path $strings -Pattern "app_name"
}

Write-Host "`n=== EAS PRODUCTION ENVIRONMENT ===" -ForegroundColor Cyan
eas env:list --environment production

Write-Host "`nExpected:" -ForegroundColor Green
Write-Host "- userInterfaceStyle: automatic"
Write-Host "- camera permission only for camera/photo/QR use"
Write-Host "- no RECORD_AUDIO / broad media permission"
Write-Host "- production AAB + remote auto-increment"
Write-Host "- EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY configured"
Write-Host "- privacy/deletion/support public vars configured before public release"
