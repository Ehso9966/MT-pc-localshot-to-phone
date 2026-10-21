(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const ipInput = $("ipInput");
  const portInput = $("portInput");
  const pathInput = $("pathInput");
  const finalUrl = $("finalUrl");
  const qrCanvas = $("qrCanvas");
  const qrStatus = $("qrStatus");
  const ipError = $("ipError");
  const detectBtn = $("detectBtn");
  const detectStatus = $("detectStatus");

  function validIPv4(value) {
    const parts = value.trim().split(".");
    return parts.length === 4 && parts.every(part =>
      /^\d{1,3}$/.test(part) && Number(part) >= 0 && Number(part) <= 255
    );
  }
  function isMdnsHost(value) {
    return /^[a-z0-9][a-z0-9-]{0,62}(\.[a-z0-9][a-z0-9-]{0,62})*\.local$/i.test(value.trim());
  }
  function validHost(value) {
    return validIPv4(value) || isMdnsHost(value);
  }
  function isPrivateIPv4(value) {
    if (!validIPv4(value)) return false;
    const [a, b] = value.split(".").map(Number);
    if (a === 10) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    return false;
  }
  function isLoopbackHost(value) {
    return validIPv4(value) && value.startsWith("127.");
  }
  function validPort(value) {
    const p = Number(value);
    return Number.isInteger(p) && p >= 1 && p <= 65535;
  }
  function normalizedPath(value) {
    let p = (value || "/").trim();
    if (!p) p = "/";
    if (!p.startsWith("/")) p = "/" + p;
    // Avoid spaces and unsafe URL characters while preserving normal paths.
    return p.split("/").map((part, i) => i === 0 ? "" : encodeURIComponent(decodeSafe(part))).join("/");
  }
  function decodeSafe(part) {
    try { return decodeURIComponent(part); } catch { return part; }
  }
  function getUrl() {
    const ip = ipInput.value.trim();
    const port = portInput.value.trim();
    if (!validHost(ip) || !validPort(port)) return null;
    return `http://${ip}:${Number(port)}${normalizedPath(pathInput.value)}`;
  }
  function clearQR(message) {
    const ctx = qrCanvas.getContext("2d");
    ctx.clearRect(0, 0, qrCanvas.width, qrCanvas.height);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, qrCanvas.width, qrCanvas.height);
    ctx.fillStyle = "#24392b";
    ctx.font = "13px system-ui";
    ctx.textAlign = "center";
    ctx.fillText("QR code", qrCanvas.width / 2, qrCanvas.height / 2 - 7);
    ctx.fillText("not ready", qrCanvas.width / 2, qrCanvas.height / 2 + 13);
    qrStatus.textContent = message;
  }
  async function update() {
    const ip = ipInput.value.trim();
    const port = portInput.value.trim();
    ipError.textContent = ip && !validHost(ip) ? "Enter a valid IPv4 address, e.g. 192.168.1.5 (or a .local name)." : "";
    $("serverCommand").textContent = `python -m http.server ${validPort(port) ? Number(port) : 8080} --bind 0.0.0.0`;
    $("firewallCommand").textContent = `New-NetFirewallRule -DisplayName "Phone Preview TCP ${validPort(port) ? Number(port) : 8080}" -Direction Inbound -Protocol TCP -LocalPort ${validPort(port) ? Number(port) : 8080} -Action Allow -Profile Private`;
    $("removeFirewallCommand").textContent = `Remove-NetFirewallRule -DisplayName "Phone Preview TCP ${validPort(port) ? Number(port) : 8080}"`;

    const url = getUrl();
    finalUrl.textContent = url || "Enter a valid PC IPv4 address and port";
    if (!url) {
      clearQR("Enter a valid IP and port to create the QR code.");
      return;
    }
    if (window.QRCode && typeof window.QRCode.toCanvas === "function") {
      try {
        await new Promise((resolve, reject) => {
          window.QRCode.toCanvas(qrCanvas, url, {
            width: 220, margin: 1,
            color: { dark: "#102018", light: "#ffffff" },
            errorCorrectionLevel: "M"
          }, error => error ? reject(error) : resolve());
        });
        qrStatus.textContent = "QR code ready. Scan it with your phone camera.";
      } catch (error) {
        clearQR("Could not draw the QR code. Copy the URL and type it on your phone.");
      }
    } else {
      clearQR("QR library could not load. Check internet access, or copy the URL and type it manually.");
    }
  }
  async function copyText(text, button) {
    const original = button.textContent;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const area = document.createElement("textarea");
        area.value = text;
        area.style.position = "fixed";
        area.style.opacity = "0";
        document.body.appendChild(area);
        area.select();
        const ok = document.execCommand("copy");
        area.remove();
        if (!ok) throw new Error("Copy not available");
      }
      button.textContent = "Copied ✓";
    } catch {
      window.prompt("Copy this text:", text);
      button.textContent = "Select/copy";
    }
    window.setTimeout(() => { button.textContent = original; }, 1400);
  }

  const COMMON_PORTS = [8080, 8000, 3000, 5000, 5173, 8081, 8888, 80, 4173, 4200, 9000, 8082];
  const PORT_BATCH = 6;
  const PROBE_TIMEOUT = 800;
  const RTC_TIMEOUT = 1500;
  const CANARY_PORT = 65010;
  const VIRTUAL_GATEWAYS = new Set(["192.168.56.1", "192.168.122.1", "192.168.37.1", "172.17.0.1", "172.18.0.1", "10.0.2.2"]);

  function hostScore(host, pageHost) {
    if (!validIPv4(host)) return -50;
    if (host === pageHost) return 1000;
    if (VIRTUAL_GATEWAYS.has(host)) return -10;
    const [a, b] = host.split(".").map(Number);
    if (a === 192 && b === 168) return 50;
    if (a === 10) return 40;
    if (a === 172 && b >= 16 && b <= 31) return 30;
    return 10;
  }

  function setDetectStatus(kind, text) {
    detectStatus.className = "detect-status" + (kind ? " status-" + kind : "");
    detectStatus.textContent = text;
  }
  function fillField(field, value) {
    if (field.value === value) return;
    field.value = value;
    field.dispatchEvent(new Event("input", { bubbles: true }));
    field.dispatchEvent(new Event("change", { bubbles: true }));
  }
  function probeUrl(url, timeoutMs = PROBE_TIMEOUT) {
    if (typeof fetch !== "function" || typeof AbortController !== "function") return Promise.resolve(false);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    return fetch(url, { mode: "no-cors", cache: "no-store", signal: controller.signal })
      .then(() => true)
      .catch(() => false)
      .finally(() => clearTimeout(timer));
  }
  function isUsableIPv4(value) {
    return validIPv4(value) && !isLoopbackHost(value) && !value.startsWith("169.254.") && !VIRTUAL_GATEWAYS.has(value);
  }
  async function fetchNetworkInfo(base, timeoutMs = PROBE_TIMEOUT) {
    if (typeof fetch !== "function" || typeof AbortController !== "function") return [];
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(new URL("/__network", base).href, {
        cache: "no-store", mode: "cors", signal: controller.signal
      });
      if (!response.ok) return [];
      const data = await response.json();
      const list = Array.isArray(data && data.ipv4s) ? data.ipv4s : [];
      return list.filter(host => typeof host === "string" && isUsableIPv4(host.trim())).map(host => host.trim());
    } catch {
      return [];
    } finally {
      clearTimeout(timer);
    }
  }
  function webRtcHosts(timeoutMs = RTC_TIMEOUT) {
    return new Promise(resolve => {
      if (typeof RTCPeerConnection !== "function") { resolve([]); return; }
      let pc;
      try { pc = new RTCPeerConnection({ iceServers: [] }); } catch { resolve([]); return; }
      const found = new Set();
      let settled = false;
      let timer;
      const finish = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        try { pc.close(); } catch {}
        resolve(Array.from(found));
      };
      timer = setTimeout(finish, timeoutMs);
      pc.onicecandidate = event => {
        const candidate = event && event.candidate;
        if (!candidate) { finish(); return; }
        const parts = String(candidate.candidate || "").split(" ");
        const address = parts[4];
        const type = parts[7];
        if (type === "host" && address) found.add(address);
      };
      try { pc.createDataChannel("detect"); } catch {}
      Promise.resolve()
        .then(() => pc.createOffer())
        .then(offer => pc.setLocalDescription(offer))
        .catch(finish);
    });
  }
  async function gatherHosts() {
    const ipv4s = [];
    const mdns = [];
    const add = (list, host) => { if (host && !list.includes(host)) list.push(host); };
    const pageHost = (location && location.hostname) || "";
    if (pageHost && pageHost !== "localhost" && !isLoopbackHost(pageHost)) {
      if (isPrivateIPv4(pageHost)) add(ipv4s, pageHost);
      else if (isMdnsHost(pageHost)) add(mdns, pageHost);
    }
    const infoHosts = await fetchNetworkInfo(location.href);
    infoHosts.forEach(host => { if (isPrivateIPv4(host)) add(ipv4s, host); });
    const rtcHosts = await webRtcHosts();
    rtcHosts.forEach(host => { if (isPrivateIPv4(host)) add(ipv4s, host); });
    rtcHosts.forEach(host => { if (isMdnsHost(host)) add(mdns, host); });
    return [...ipv4s, ...mdns];
  }
  function buildPortList() {
    const ports = [];
    const saved = Number(portInput.value);
    if (Number.isInteger(saved) && saved >= 1 && saved <= 65535) ports.push(saved);
    COMMON_PORTS.forEach(port => { if (!ports.includes(port)) ports.push(port); });
    return ports;
  }
  async function scanForServer(targets, ports) {
    for (const target of targets) {
      for (let i = 0; i < ports.length; i += PORT_BATCH) {
        const batch = ports.slice(i, i + PORT_BATCH);
        const results = await Promise.all(batch.map(port => probeUrl(`http://${target}:${port}/`)));
        for (let j = 0; j < results.length; j++) {
          if (results[j]) return { target, port: batch[j] };
        }
      }
    }
    return null;
  }
  async function pickReachableHost(candidates, port) {
    const probes = await Promise.all(candidates.map(h => probeUrl(`http://${h}:${port}/`, 1200)));
    const responders = candidates.filter((h, i) => probes[i]);
    const pageHost = (location && location.hostname) || "";
    responders.sort((a, b) => hostScore(b, pageHost) - hostScore(a, pageHost));
    return responders;
  }
  let detecting = false;
  async function runDetection() {
    if (detecting) return;
    detecting = true;
    const label = detectBtn.textContent;
    detectBtn.disabled = true;
    detectBtn.textContent = "Scanning…";
    try {
      setDetectStatus("scan", "Looking for this PC's address and a running website…");
      let hosts = await gatherHosts();
      let host = hosts[0] || "";
      if (host) fillField(ipInput, host);
      setDetectStatus("scan", host
        ? `Found ${host} — checking common website ports…`
        : "No PC address detected yet — checking for a running website anyway…");
      const hit = await scanForServer(["127.0.0.1", ...hosts], buildPortList());
      if (!hit) {
        setDetectStatus("warn", host
          ? `PC address ${host} found, but no website answered on common ports. Start the server (step 3), then press Detect again.`
          : "No PC address and no running website found. Run PhonePreview.exe or start.bat (step 3) to auto-detect the IPv4, or run ipconfig below and enter the IP manually.");
        return;
      }
      fillField(portInput, String(hit.port));
      const serverInfo = await fetchNetworkInfo(`http://127.0.0.1:${hit.port}`);
      if (serverInfo.length) {
        hosts = [...serverInfo.filter(h => !hosts.includes(h)), ...hosts];
        host = hosts[0];
        fillField(ipInput, host);
        setDetectStatus("scan", `Website found on port ${hit.port}; PC IPv4 ${serverInfo.join(", ")} confirmed by the server — checking reachability…`);
      } else {
        setDetectStatus("scan", `Website found on port ${hit.port} — checking which address the phone can reach…`);
      }
      if (!host) {
        setDetectStatus("warn", `Website found on port ${hit.port}, but the PC address could not be detected (some browsers hide it). Run PhonePreview.exe or start.bat (step 3) to auto-detect the IPv4, or run ipconfig and enter it above.`);
        return;
      }
      const responders = await pickReachableHost(hosts, hit.port);
      if (!responders.length) {
        setDetectStatus("warn", `Website runs on port ${hit.port} but only answers on this PC — not at ${host}, so the phone cannot open it. Restart the server with --bind 0.0.0.0 (step 3), then press Detect again.`);
        return;
      }
      const primary = responders[0];
      fillField(ipInput, primary);
      const others = responders.slice(1);
      const othersNote = others.length
        ? ` Also answered: ${others.join(", ")} — if the phone fails, put that address in the IP box and rescan.`
        : "";
      if (isMdnsHost(primary)) {
        setDetectStatus("warn", `Website found on port ${hit.port} at http://${primary}:${hit.port}/, but that is an internal .local name the phone may not resolve. For a reliable QR, run PhonePreview.exe or start.bat (step 3) to auto-detect the IPv4, or run ipconfig and enter it instead.`);
        return;
      }
      const canary = await probeUrl(`http://${primary}:${CANARY_PORT}/`, 800);
      if (canary) {
        setDetectStatus("warn", `This PC's proxy or VPN answered even on a closed port, so local checks cannot confirm http://${primary}:${hit.port}. Scan the QR to test, and if the phone fails, disable the proxy or VPN and try again.${othersNote}`);
        return;
      }
      setDetectStatus("ok", `Ready — the website answered at http://${primary}:${hit.port}/. Scan the QR. If the phone still cannot open it, allow the port in Windows Firewall (step 4).${othersNote}`);
    } catch {
      setDetectStatus("error", "Detection failed. Enter the PC address and port manually below.");
    } finally {
      detecting = false;
      detectBtn.disabled = false;
      detectBtn.textContent = label;
    }
  }

  document.addEventListener("click", event => {
    const button = event.target.closest("[data-copy]");
    if (!button) return;
    const target = $(button.dataset.copy);
    if (target) copyText(target.textContent, button);
  });

  // Windowed app (PhonePreview.exe / app.py): show the native folder picker.
  const pickFolderBtn = $("pickFolderBtn");
  const pickFolderHint = $("pickFolderHint");
  function setupAppMode() {
    if (!window.pywebview || !window.pywebview.api || !window.pywebview.api.pick_folder) return;
    pickFolderBtn.hidden = false;
    pickFolderHint.hidden = false;
    pickFolderBtn.addEventListener("click", async () => {
      const original = pickFolderBtn.textContent;
      pickFolderBtn.disabled = true;
      pickFolderBtn.textContent = "Opening…";
      try {
        const result = await window.pywebview.api.pick_folder();
        if (result && result.ok && result.url) {
          window.location.href = result.url;
          return;
        }
        if (result && result.error) ipError.textContent = result.error;
      } catch {
        ipError.textContent = "Could not open the folder picker.";
      }
      pickFolderBtn.disabled = false;
      pickFolderBtn.textContent = original;
    });
  }
  if (window.pywebview) setupAppMode();
  else document.addEventListener("pywebviewready", setupAppMode, { once: true });
  ipInput.addEventListener("input", update);
  portInput.addEventListener("input", update);
  pathInput.addEventListener("input", update);
  detectBtn.addEventListener("click", runDetection);
  $("copyUrl").addEventListener("click", () => {
    const url = getUrl();
    if (url) copyText(url, $("copyUrl"));
    else { ipError.textContent = "Enter a valid PC IPv4 address and port first."; ipInput.focus(); }
  });
  $("openUrl").addEventListener("click", () => {
    const url = getUrl();
    if (!url) { ipError.textContent = "Enter a valid PC IPv4 address and port first."; ipInput.focus(); return; }
    window.open(url, "_blank", "noopener");
  });

  // Restore last values; the Detect button can refresh IP and port on demand.
  try {
    ipInput.value = localStorage.getItem("phonePreview.ip") || "";
    portInput.value = localStorage.getItem("phonePreview.port") || "8080";
    pathInput.value = localStorage.getItem("phonePreview.path") || "/";
    [ipInput, portInput, pathInput].forEach(el => el.addEventListener("change", () => {
      localStorage.setItem("phonePreview.ip", ipInput.value.trim());
      localStorage.setItem("phonePreview.port", portInput.value);
      localStorage.setItem("phonePreview.path", pathInput.value);
    }));
  } catch {}
  clearQR("Enter your PC's Wi-Fi IPv4 address to create the QR code.");
  update();
})();
