# -*- mode: python ; coding: utf-8 -*-
# PyInstaller spec for PhonePreview.exe (onefile, windowed app).
# Build:  python -m PyInstaller --clean --noconfirm PhonePreview.spec
# console=False -> real desktop app window (pywebview / WebView2), no black box.

from PyInstaller.utils.hooks import collect_all

webview_datas, webview_binaries, webview_hiddenimports = collect_all("pywebview")

a = Analysis(
    ["app.py"],
    pathex=[],
    binaries=webview_binaries,
    datas=[
        ("index.html", "."),
        ("style.css", "."),
        ("app.js", "."),
        ("qrcode.min.js", "."),
    ] + webview_datas,
    hiddenimports=webview_hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
)

pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name="PhonePreview",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
