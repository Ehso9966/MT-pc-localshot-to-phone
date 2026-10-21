#!/usr/bin/env python3
"""Phone Preview Tool - native windowed app (no browser window).

Runs the local server (serve.py) on a background thread and shows the
helper UI inside a WebView2 window via pywebview.

  python app.py                    helper mode window (port 8090)
  python app.py --site FOLDER      site mode window (port 8080)
  PhonePreview.exe [FOLDER]        built-in windowed mode
"""
import argparse
import os
import sys
import threading
import traceback

from serve import build_server, detect_lan_ipv4s, pick_site_folder

try:
    import webview
except ImportError:
    webview = None


class App:
    def __init__(self):
        self.server = None
        self.port = None
        self.mode = None
        self.window = None
        self.lock = threading.Lock()
        self.thread = None

    def start_server(self, site_folder=None, port=None):
        with self.lock:
            if self.server is not None:
                try:
                    self.server.shutdown()
                except Exception:
                    pass
                try:
                    self.server.server_close()
                except Exception:
                    pass
                self.server = None
            self.server, self.port, self.mode = build_server(site_folder, port)
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()

    def open_site(self, folder):
        """Switch to site mode serving `folder`, reload the window to /__helper/."""
        folder = pick_site_folder([folder])
        if not folder:
            return {"ok": False, "error": "Folder not found."}
        try:
            self.start_server(site_folder=folder, port=self.port)
        except FileNotFoundError as error:
            return {"ok": False, "error": "No index.html in that folder."}
        except OSError as error:
            return {"ok": False, "error": "Could not start server: %s" % error}
        url = "http://127.0.0.1:%d/__helper/" % self.port
        if self.window is not None:
            self.window.load_url(url)
        return {"ok": True, "url": url, "mode": self.mode}

    def shutdown(self):
        if self.server is not None:
            try:
                self.server.shutdown()
            except Exception:
                pass
            try:
                self.server.server_close()
            except Exception:
                pass


class Api:
    """Exposed to the page as window.pywebview.api."""

    def __init__(self, app):
        self.app = app

    def pick_folder(self):
        result = webview.create_file_dialog(webview.FOLDER_SELECT)
        if not result:
            return {"ok": False}
        folder = result[0] if isinstance(result, (list, tuple)) else result
        return self.app.open_site(folder)

    def get_info(self):
        return {
            "mode": self.app.mode,
            "port": self.app.port,
            "ipv4s": detect_lan_ipv4s(),
        }


def _fatal(message):
    if sys.platform == "win32":
        try:
            import ctypes
            ctypes.windll.user32.MessageBoxW(0, message, "Phone Preview Tool", 0x10)
            return
        except Exception:
            pass
    print(message)


def main():
    parser = argparse.ArgumentParser(description="Phone Preview Tool (windowed app)")
    parser.add_argument("paths", nargs="*",
                        help="website folder (or an .html file) to serve")
    parser.add_argument("--site", metavar="FOLDER", default=None,
                        help="folder with the website's index.html")
    parser.add_argument("--port", type=int, default=None)
    args = parser.parse_args()

    if webview is None:
        _fatal(
            "The UI library (pywebview) is missing.\n\n"
            "If you run from source:  pip install pywebview\n"
            "If you downloaded PhonePreview.exe, re-download the latest release."
        )
        return 1

    if args.site:
        site_folder = pick_site_folder([args.site])
        if not site_folder:
            _fatal("Folder not found: %s" % args.site)
            return 1
    else:
        site_folder = pick_site_folder(args.paths)

    app = App()
    try:
        app.start_server(site_folder=site_folder, port=args.port)
    except FileNotFoundError as error:
        _fatal("Phone Preview Tool\n\n%s" % error)
        return 1
    except OSError as error:
        _fatal("Phone Preview Tool\n\nPort %d is already in use.\n"
               "Close the other server window and try again." % (args.port or (8080 if site_folder else 8090)))
        return 1

    if app.mode == "site":
        url = "http://127.0.0.1:%d/__helper/" % app.port
    else:
        url = "http://127.0.0.1:%d/" % app.port

    api = Api(app)
    window = webview.create_window(
        "Phone Preview Tool",
        url,
        width=980,
        height=760,
        min_size=(720, 560),
        background_color="#102018",
        js_api=api,
    )
    app.window = window

    # Drag a website folder (or index.html) onto the window to serve it.
    if hasattr(window.events, "drag_dropped"):
        def on_drop(dropped_paths):
            if not dropped_paths:
                return
            first = dropped_paths[0] if isinstance(dropped_paths, (list, tuple)) else dropped_paths
            app.open_site(first)
        window.events.drag_dropped += on_drop

    def on_closing():
        app.shutdown()
        return True

    window.events.closing += on_closing

    try:
        webview.start(debug=False)
    finally:
        app.shutdown()
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception:
        _fatal("Phone Preview Tool crashed:\n\n%s" % traceback.format_exc())
        sys.exit(1)
