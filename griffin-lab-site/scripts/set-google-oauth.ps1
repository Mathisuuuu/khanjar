# Installe les clés Google (connexion « Se connecter avec Google ») sur le serveur.
#
# Les clés sont tapées ici, puis envoyées au serveur par l'entrée de ssh : elles ne
# passent ni dans la ligne de commande, ni dans l'historique, ni dans un fichier local.
# Sur le serveur, elles sont écrites dans /etc/griffin-lab.env (lisible par root et le
# service seulement), à la place des anciennes valeurs s'il y en avait.
#
# Utilisation (PowerShell, depuis n'importe quel dossier) :
#   powershell -ExecutionPolicy Bypass -File E:\claude\blackrock\griffin-lab-site\scripts\set-google-oauth.ps1
#
# Le site est ensuite redémarré : le bouton Google s'active tout de suite.

$ErrorActionPreference = "Stop"

$clientId = (Read-Host "ID client Google (se termine par .apps.googleusercontent.com)").Trim()
if ($clientId -like 'GOCSPX-*') {
  Clear-Host  # le secret vient de s'afficher en clair : on l'efface de l'écran
  Write-Host "C'est le code secret, pas l'ID client. Rien n'a été envoyé. Ferme cet onglet, puis crée un nouveau code secret dans Google Cloud." -ForegroundColor Red
  exit 1
}
if ($clientId -notmatch '^[0-9]+-[a-z0-9]+\.apps\.googleusercontent\.com$') {
  Write-Host "Ce n'est pas un ID client Google valide. Rien n'a été envoyé." -ForegroundColor Red
  exit 1
}

$secure = Read-Host "Code secret du client (masqué)" -AsSecureString
$ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
try { $secret = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr).Trim() }
finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
if ($secret -notmatch '^[A-Za-z0-9_-]{20,}$') {
  Write-Host "Le code secret ne ressemble pas à un secret Google (GOCSPX-...). Rien n'a été envoyé." -ForegroundColor Red
  exit 1
}

# Sur le serveur : remplace ou ajoute les deux lignes, en gardant droits et propriétaire du fichier.
# (pas de guillemets doubles ici : Windows PowerShell 5.1 les abîme en passant l'argument à ssh)
$remote = @'
set -e
read -r ID; ID=$(printf %s $ID | LC_ALL=C tr -cd 'a-z0-9.-')
read -r SECRET; SECRET=$(printf %s $SECRET | LC_ALL=C tr -cd 'A-Za-z0-9_-')
F=/etc/griffin-lab.env
T=$(sudo mktemp)
sudo cp -p $F $F.bak-google
sudo grep -vE '^AUTH_GOOGLE_(ID|SECRET)=' $F | sudo tee $T >/dev/null
printf 'AUTH_GOOGLE_ID=%s\nAUTH_GOOGLE_SECRET=%s\n' $ID $SECRET | sudo tee -a $T >/dev/null
sudo chmod --reference=$F $T
sudo chown --reference=$F $T
sudo mv $T $F
sudo systemctl restart griffin-lab
sleep 6
systemctl is-active --quiet griffin-lab
echo 'Clés Google enregistrées et site redémarré (ancienne config : /etc/griffin-lab.env.bak-google).'
'@

# UTF-8 sans BOM : sinon PowerShell colle un caractère invisible devant l'ID client
$OutputEncoding = New-Object System.Text.UTF8Encoding $false
"$clientId`n$secret`n" | ssh griffin $remote
$secret = $null
if ($LASTEXITCODE -ne 0) { Write-Host "Échec de l'envoi au serveur." -ForegroundColor Red; exit 1 }
Write-Host "C'est fait : le bouton Google est actif sur https://fleija.live/sign-in" -ForegroundColor Green
