# Install Phone Preview Tool with a small GUI prompt (checkboxes).
# Launched by install.bat. Falls back to console prompts if GUI fails.

$ErrorActionPreference = "Stop"

$src = Join-Path $PSScriptRoot "PhonePreview.exe"
if (-not (Test-Path $src)) { $src = Join-Path $PSScriptRoot "dist\PhonePreview.exe" }

if (-not (Test-Path $src)) {
    $msg = "PhonePreview.exe not found.`n`nPut install.bat next to PhonePreview.exe (or in dist\) and run it again.`n`nDownload:`nhttps://github.com/Ehso9966/MT-pc-localshot-to-phone/releases"
    try {
        Add-Type -AssemblyName System.Windows.Forms
        [System.Windows.Forms.MessageBox]::Show($msg, "Phone Preview Tool", "OK", "Error") | Out-Null
    } catch { Write-Host $msg }
    exit 1
}

$dest = Join-Path $env:LOCALAPPDATA "PhonePreview"
$exeTarget = Join-Path $dest "PhonePreview.exe"

function New-Shortcut($lnkPath) {
    $w = New-Object -ComObject WScript.Shell
    $s = $w.CreateShortcut($lnkPath)
    $s.TargetPath = $exeTarget
    $s.WorkingDirectory = $dest
    $s.Description = "Phone Preview Tool"
    $s.Save()
}

function Install-Files($withDesktop, $withStartMenu) {
    if (-not (Test-Path $dest)) { New-Item -ItemType Directory -Path $dest | Out-Null }
    Copy-Item $src $exeTarget -Force

    $desktop = [Environment]::GetFolderPath("Desktop")
    $programs = [Environment]::GetFolderPath("Programs")

    if ($withDesktop) { New-Shortcut (Join-Path $desktop "Phone Preview.lnk") }
    else {
        $lnk = Join-Path $desktop "Phone Preview.lnk"
        if (Test-Path $lnk) { Remove-Item $lnk -Force }
    }

    if ($withStartMenu) { New-Shortcut (Join-Path $programs "Phone Preview.lnk") }
    else {
        $lnk = Join-Path $programs "Phone Preview.lnk"
        if (Test-Path $lnk) { Remove-Item $lnk -Force }
    }
}

function Install-GUI {
    Add-Type -AssemblyName System.Windows.Forms
    Add-Type -AssemblyName System.Drawing
    [System.Windows.Forms.Application]::EnableVisualStyles()

    $form = New-Object System.Windows.Forms.Form
    $form.Text = "Install Phone Preview Tool"
    $form.Size = New-Object System.Drawing.Size(440, 260)
    $form.StartPosition = "CenterScreen"
    $form.FormBorderStyle = "FixedDialog"
    $form.MaximizeBox = $false
    $form.MinimizeBox = $false
    $form.TopMost = $true

    $title = New-Object System.Windows.Forms.Label
    $title.Text = "Install Phone Preview Tool"
    $title.Font = New-Object System.Drawing.Font("Segoe UI", 12, [System.Drawing.FontStyle]::Bold)
    $title.AutoSize = $true
    $title.Location = New-Object System.Drawing.Point(18, 16)
    $form.Controls.Add($title)

    $info = New-Object System.Windows.Forms.Label
    $info.Text = "Installs to:`n$dest`n`nChoose where to add shortcuts:"
    $info.AutoSize = $true
    $info.Location = New-Object System.Drawing.Point(18, 52)
    $form.Controls.Add($info)

    $chkDesktop = New-Object System.Windows.Forms.CheckBox
    $chkDesktop.Text = "Create a desktop shortcut"
    $chkDesktop.Checked = $true
    $chkDesktop.AutoSize = $true
    $chkDesktop.Location = New-Object System.Drawing.Point(36, 124)
    $form.Controls.Add($chkDesktop)

    $chkStart = New-Object System.Windows.Forms.CheckBox
    $chkStart.Text = "Add to Start Menu"
    $chkStart.Checked = $true
    $chkStart.AutoSize = $true
    $chkStart.Location = New-Object System.Drawing.Point(36, 150)
    $form.Controls.Add($chkStart)

    $btnInstall = New-Object System.Windows.Forms.Button
    $btnInstall.Text = "Install"
    $btnInstall.Size = New-Object System.Drawing.Size(100, 34)
    $btnInstall.Location = New-Object System.Drawing.Point(196, 186)
    $btnInstall.Add_Click({
        try {
            Install-Files $chkDesktop.Checked $chkStart.Checked
            $created = @()
            if ($chkDesktop.Checked) { $created += "desktop" }
            if ($chkStart.Checked) { $created += "Start Menu" }
            $extra = if ($created.Count) { "`nShortcuts: " + ($created -join " + ") } else { "" }
            [System.Windows.Forms.MessageBox]::Show(
                "Installed!$extra`n`nDouble-click ""Phone Preview"" to start.",
                "Phone Preview Tool", "OK", "Information") | Out-Null
            $form.DialogResult = "OK"
            $form.Close()
        } catch {
            [System.Windows.Forms.MessageBox]::Show(
                "Install failed:`n$($_.Exception.Message)",
                "Phone Preview Tool", "OK", "Error") | Out-Null
        }
    })
    $form.Controls.Add($btnInstall)

    $btnCancel = New-Object System.Windows.Forms.Button
    $btnCancel.Text = "Cancel"
    $btnCancel.Size = New-Object System.Drawing.Size(100, 34)
    $btnCancel.Location = New-Object System.Drawing.Point(306, 186)
    $btnCancel.Add_Click({ $form.DialogResult = "Cancel"; $form.Close() })
    $form.Controls.Add($btnCancel)

    $form.AcceptButton = $btnInstall
    $form.CancelButton = $btnCancel
    [void]$form.ShowDialog()
}

function Install-Console {
    Write-Host ""
    Write-Host "Install Phone Preview Tool to: $dest"
    $d = Read-Host "Create a desktop shortcut? [Y/n]"
    $withDesktop = -not ($d -match '^[Nn]')
    $s = Read-Host "Add to Start Menu? [Y/n]"
    $withStart = -not ($s -match '^[Nn]')
    Install-Files $withDesktop $withStart
    Write-Host "Installed! Double-click ""Phone Preview"" to start."
}

try {
    Install-GUI
} catch {
    Write-Host "Could not show the install window, using console instead."
    Install-Console
}
