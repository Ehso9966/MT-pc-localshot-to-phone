#!/usr/bin/env python3
"""Phone Preview Tool - local server with automatic IPv4 detection.

Modes:
  python serve.py                     Serve the helper page (port 8090)
  python serve.py --site FOLDER       Serve a website + helper (port 8080)
  python serve.py FOLDER              Same as --site FOLDER (drag-and-drop)
  PhonePreview.exe FOLDER             Built-in mode, same as --site

Endpoints:
  GET /__network   -> {"ipv4s": ["192.168.1.5", ...]}  (CORS enabled)
"""
import argparse
import json
import os
import socket
import sys
import threading
import webbrowser
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import unquote, urlsplit

VIRTUAL_GATEWAYS = {
    "192.168.56.1", "192.168.122.1", "192.168.37.1",
    "172.17.0.1", "172.18.0.1", "10.0.2.2",
}


def detect_lan_ipv4s():
    """Return LAN IPv4 addresses for this PC (RFC1918 first)."""
    found = []

    def add(ip):
        if not ip or ip in found:
            return
        if ip.startswith("127.") or ip.startswith("169.254."):
            return
        if ip in VIRTUAL_GATEWAYS:
            return
        found.append(ip)

    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        try:
            sock.connect(("8.8.8.8", 80))  # no packets actually sent
            add(sock.getsockname()[0])
        finally:
            sock.close()
    except OSError:
        pass

    try:
        for info in socket.getaddrinfo(socket.gethostname(), None, socket.AF_INET):
            add(info[4][0])
    except OSError:
        pass

    def rank(ip):
        a, b = (int(x) for x in ip.split(".")[:2])
        if a == 192 and b == 168:
            return 0
        if a == 10:
            return 1
        if a == 172 and 16 <= b <= 31:
            return 2
        return 3

    found.sort(key=rank)
    return found


def resource_path(rel=""):
    """Path to a bundled file (PyInstaller onefile or script folder)."""
    base = getattr(sys, "_MEIPASS", os.path.dirname(os.path.abspath(__file__)))
    if rel:
        return os.path.join(base, rel)
    return base


def pick_site_folder(paths):
    """Accept a dragged folder or an .html file (use its parent folder)."""
    for raw in paths:
        if not raw or raw.startswith("-"):
            continue
        path = os.path.abspath(raw)
        if os.path.isdir(path):
            return path
        if os.path.isfile(path) and path.lower().endswith(".html"):
            return os.path.dirname(path)
    return None


class BaseHandler(SimpleHTTPRequestHandler):
    helper_dir = None

    def __init__(self, *args, root_dir=None, helper_dir=None, **kwargs):
        self.helper_dir = helper_dir
        super().__init__(*args, directory=root_dir, **kwargs)

    def do_GET(self):
        path = urlsplit(self.path).path
        if path == "/__network":
            self._serve_network()
            return
        if self.helper_dir and path == "/__helper":
            self.send_response(301)
            self.send_header("Location", "/__helper/")
            self.end_headers()
            return
        super().do_GET()

    def _serve_network(self):
        payload = json.dumps({"ipv4s": detect_lan_ipv4s()}).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(payload)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(payload)

    def translate_path(self, path):
        path = unquote(urlsplit(path).path)
        if self.helper_dir and (path == "/__helper/" or path.startswith("/__helper/")):
            rest = path[len("/__helper/"):].lstrip("/") or "index.html"
            clean = os.path.normpath(rest)
            blocked = os.path.join(self.helper_dir, ".__blocked__")
            if clean.startswith("..") or os.path.isabs(clean):
                return blocked
            candidate = os.path.abspath(os.path.join(self.helper_dir, clean))
            helper_root = os.path.abspath(self.helper_dir)
            if candidate != helper_root and not candidate.startswith(helper_root + os.sep):
                return blocked
            return candidate
        return super().translate_path(path)

    def log_message(self, fmt, *args):
        sys.stderr.write("  %s - %s\n" % (self.address_string(), fmt % args))


def make_handler(root_dir, helper_dir):
    root_dir = os.path.abspath(root_dir)
    helper_dir = os.path.abspath(helper_dir) if helper_dir else None

    class LocalHandler(BaseHandler):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, root_dir=root_dir, helper_dir=helper_dir, **kwargs)

    return LocalHandler


def main():
    parser = argparse.ArgumentParser(
        description="Phone Preview Tool local server",
        add_help=True,
    )
    parser.add_argument("paths", nargs="*",
                        help="website folder (or an .html file) - enables site mode")
    parser.add_argument("--site", metavar="FOLDER", default=None,
                        help="folder with the website's index.html (same as passing it as a path)")
    parser.add_argument("--port", type=int, default=None,
                        help="TCP port (default: 8090 helper mode, 8080 site mode)")
    parser.add_argument("--no-browser", action="store_true",
                        help="do not open the browser automatically")
    args = parser.parse_args()

    if args.site:
        site_folder = pick_site_folder([args.site])
        if not site_folder:
            print("ERROR: --site folder not found: %s" % args.site)
            return 1
    else:
        site_folder = pick_site_folder(args.paths)
    helper_dir = resource_path()

    if site_folder:
        mode = "site"
        port = args.port or 8080
        root_dir = site_folder
        helper_mount = helper_dir
    else:
        mode = "helper"
        port = args.port or 8090
        root_dir = helper_dir
        helper_mount = None

    if not os.path.isfile(os.path.join(root_dir, "index.html")):
        print("ERROR: no index.html found in: %s" % root_dir)
        print("Pass the folder that contains your website's index.html.")
        return 1

    handler = make_handler(root_dir, helper_mount)
    try:
        server = ThreadingHTTPServer(("0.0.0.0", port), handler)
    except OSError as error:
        print("ERROR: port %d is already in use (%s)." % (port, error))
        print("Stop the other server (Ctrl+C in its window) or pick another port:")
        print("  python serve.py --port %d" % (port + 1 if port < 65535 else 80))
        return 1

    ipv4s = detect_lan_ipv4s()
    bar = "=" * 58
    print(bar)
    print(" Phone Preview Tool server is running")
    print(" Keep this window open. Close it to stop the server.")
    print("")
    if ipv4s:
        print(" PC IPv4 address: %s" % ", ".join(ipv4s))
    else:
        print(" WARNING: no LAN IPv4 found (offline?).")
        print(" You can still open http://127.0.0.1:%d/ and type the IP." % port)
    print("")
    if mode == "site":
        print(" Website:  http://%s:%d/" % (ipv4s[0] if ipv4s else "127.0.0.1", port))
        print(" Helper:   http://%s:%d/__helper/" % (ipv4s[0] if ipv4s else "127.0.0.1", port))
    else:
        print(" Helper:   http://%s:%d/" % (ipv4s[0] if ipv4s else "127.0.0.1", port))
        print(" Point your website server at its own port, then press Detect.")
    print("")
    print(" First run? If Windows asks for network access, click")
    print(" \"Allow access\" and keep Private networks checked.")
    print(bar)

    if not args.no_browser:
        target_ip = ipv4s[0] if ipv4s else "127.0.0.1"
        target = "http://%s:%d" % (target_ip, port)
        if mode == "site":
            target += "/__helper/"
        threading.Timer(0.8, lambda: webbrowser.open(target)).start()

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")
    finally:
        server.server_close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
