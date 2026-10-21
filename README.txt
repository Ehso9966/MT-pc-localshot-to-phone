PHONE PREVIEW TOOL — WINDOWS 10/11

DOWNLOAD THE EXE (easiest)
- Direct link (always the newest build):
  https://github.com/Ehso9966/MT-pc-localshot-to-phone/releases/latest/download/PhonePreview.exe
- Or open the Releases page and click PhonePreview.exe under Assets:
  https://github.com/Ehso9966/MT-pc-localshot-to-phone/releases
- No Python needed. Just download, then follow QUICK START below.

QUICK START (desktop app, no browser window)
1. Get PhonePreview.exe (Releases page, or build_exe.bat on a PC with Python).
2. Double-click it — a "Phone Preview Tool" window opens (not a browser tab).
3. Click "Open website folder..." and pick the folder that contains your
   website's index.html (or drag that folder anywhere onto the window).
4. Press "Detect server (one click)" — IP and port fill in automatically.
5. Scan the QR code with your phone. Phone and PC must be on the same Wi-Fi.
6. Close the window when you are done.

INSTALL AS SHORTCUTS (desktop icon + Start menu)
1. Put install.bat + install.ps1 next to PhonePreview.exe and double-click
   install.bat.
2. A small install window opens with checkboxes:
   [x] Create a desktop shortcut
   [x] Add to Start Menu
   Tick or untick what you want, then click Install.
3. The exe is copied to %LOCALAPPDATA%\PhonePreview.
4. To remove: double-click uninstall.bat (or delete the shortcuts).

FILES
- PhonePreview.exe   one-file server + helper (no Python needed)
- start.bat          same thing for PCs that have Python
- serve.py           the server (Python 3.8+, stdlib only, no pip installs)
- build_exe.bat      builds dist\PhonePreview.exe (needs Python once)
- PhonePreview.spec  PyInstaller recipe used by build_exe.bat / GitHub Actions
- index.html         page structure (helper UI)
- style.css          design and responsive layout
- app.js             one-click server detection, URL validation, QR generation
- qrcode.min.js      offline QR library (bundled from node-qrcode v1.5.3, MIT)
- README.txt / userGuide.txt  this file / short message glossary

HOW THE ONE-CLICK IPv4 DETECTION WORKS
- serve.py / PhonePreview.exe detects this PC's LAN IPv4 address and exposes
  it at GET /__network (JSON, CORS enabled).
- The helper page asks that endpoint (same origin, or http://127.0.0.1:<port>)
  and fills the IP automatically — no ipconfig needed.
- It still scans common ports (8080, 8000, 3000, 5000, 5173, ...), verifies
  the site answers, rebuilds the QR code, and warns about proxies/VPNs.
- If the website runs on a plain "python -m http.server" (no /__network),
  the tool falls back to browser-only detection (WebRTC). Some browsers hide
  the IP behind a .local name then — use PhonePreview.exe/start.bat or type
  the IPv4 from ipconfig.

RUN WITH PYTHON INSTEAD OF THE EXE
- Double-click start.bat (helper only), or drag the website folder onto it.
- Or from a terminal in this folder:
    python serve.py                      helper on port 8090
    python serve.py --site C:\my-site    website on port 8080 + helper at /__helper/
    python serve.py --site C:\my-site --port 5173
- First run: if Windows asks for network access, click "Allow access"
  and keep Private networks checked.

OLD MANUAL FLOW (still supported)
1. Keep this folder together. Double-click index.html (no internet needed).
2. Start the website in its own terminal, e.g.:
     python -m http.server 8080 --bind 0.0.0.0
3. Press "Detect server (one click)".
4. If the message mentions a .local name, run ipconfig and type the IPv4,
   or switch to PhonePreview.exe / start.bat for automatic detection.

BUILD THE EXE YOURSELF
- On a Windows PC with Python installed:
    build_exe.bat
  Output: dist\PhonePreview.exe
- Or push a version tag (e.g. git tag v1.0.0 && git push --tags) and let
  GitHub Actions (windows-latest) build it; the exe is attached to the Release.

DETECTION HONESTY NOTES
- The browser cannot read Windows network settings. That is why serve.py /
  PhonePreview.exe asks the OS directly and answers /__network.
- If the PC runs a proxy or VPN, it can answer every local test and fake an
  OK result. The tool probes a closed port to catch this and warns you.
- PCs with several adapters (VMware, VirtualBox, Docker, WSL) may answer on
  more than one address. The tool ranks them and lists the others; try another
  address if the phone cannot open the URL.
- The reachability check runs on the PC itself. It cannot fully guarantee the
  phone can connect (firewall and router rules still apply).

IMPORTANT PORT RULE
Do not run two servers on the same port at once. If the site already runs on
port 8080, stop it first, then either:
- drag the website folder onto PhonePreview.exe / start.bat (it becomes the
  only server), or
- restart it manually with: python -m http.server 8080 --bind 0.0.0.0
The helper UI is served at /__helper/ by serve.py in site mode, so you never
need a second port.

MANUAL PC IP (last-resort fallback)
1. On the PC open Command Prompt.
2. Run: ipconfig
3. Under the active Wi-Fi adapter, find IPv4 Address (example 192.168.1.5).
4. Enter that address into the helper. Keep target port set to 8080.
5. Scan the QR or type the generated URL into the phone browser.
6. Phone and PC must be on the same Wi-Fi network.

FIREWALL
First run: Windows usually shows "Allow access" for python.exe or
PhonePreview.exe — click it once (Private networks only).
Only if the phone still cannot connect, run PowerShell as Administrator and
use the generated New-NetFirewallRule command. Only do this on a trusted
network. To undo it, run the generated Remove-NetFirewallRule command.

IF IT STILL FAILS
- Confirm the PC and phone are on the same non-guest Wi-Fi.
- Confirm the server window/terminal is still running.
- Confirm the URL uses the PC's LAN IPv4, not localhost/127.0.0.1.
- If the one-click message says the site "only answers on this PC", restart
  the server with --bind 0.0.0.0 (or use serve.py/PhonePreview.exe, which
  always binds 0.0.0.0).
- If Windows Network Profile is Public, switch it to Private only if this is
  a trusted network.
- Router client isolation may prevent devices from communicating.
- A VPN can also interfere.

The QR code library is bundled, so QR generation works fully offline.
