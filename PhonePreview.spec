# -*- mode: python ; coding: utf-8 -*-
# PyInstaller spec for PhonePreview.exe (onefile, stdlib only).
# Build:  python -m PyInstaller --clean --noconfirm PhonePreview.spec
# Console stays ON so users can see errors and stop the server by closing the window.

a = Analysis(
    ["serve.py"],
    pathex=[],
    binaries=[],
    datas=[
        ("index.html", "."),
        ("style.css", "."),
        ("app.js", "."),
        ("qrcode.min.js", "."),
    ],
    hiddenimports=[],
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
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
