/*!
 * Sublime Video (v1.1)
 * - SCSS theming + presets via CSS variables
 * - Netflix-ish layout: scrub on top, controls row beneath
 * - Remaining time far right
 * - Skip back/forward buttons configurable (10/30/60/90) via popover
 * - Inline SVG icon system (no external deps)
 */

(function (global, factory) {
  if (typeof module === "object" && typeof module.exports === "object") module.exports = factory();
  else global.SublimeVideo = factory();
})(typeof window !== "undefined" ? window : this, function () {
  "use strict";

  const DEFAULTS = {
    selector: "video.sblm-video, video.sv-video",
    accent: "#7c3aed",

    autohide: true,
    hotkeys: true,
    pip: true,
    rememberVolume: true,

    skipStep: 10,
    skipOptions: [10, 30, 60, 90],

    rate: 1.0,
    rateOptions: [0.75, 1, 1.25, 1.5, 2],

    volumeKey: "sv_volume_v1",
    mutedKey: "sv_muted_v1",
    skipKey: "sv_skip_v1",
    rateKey: "sv_rate_v1"
  };

  const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

  function parseBool(v, fallback) {
    if (v === undefined || v === null || v === "") return fallback;
    const s = String(v).toLowerCase().trim();
    if (["true", "1", "yes", "y"].includes(s)) return true;
    if (["false", "0", "no", "n"].includes(s)) return false;
    return fallback;
  }

  function parseNumber(v, fallback) {
    if (v === undefined || v === null || v === "") return fallback;
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  }

  function parseHexColor(v, fallback) {
    if (!v) return fallback;
    const s = String(v).trim();
    return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(s) ? s : fallback;
  }

  function formatTime(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
    const s = Math.floor(seconds);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
    return `${m}:${String(sec).padStart(2, "0")}`;
  }

  function canFullscreen(el) {
    return !!(el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen);
  }

  function isFullscreen() {
    return !!(document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement);
  }

  function requestFullscreen(el) {
    if (el.requestFullscreen) return el.requestFullscreen();
    if (el.webkitRequestFullscreen) return el.webkitRequestFullscreen();
    if (el.msRequestFullscreen) return el.msRequestFullscreen();
  }

  function exitFullscreen() {
    if (document.exitFullscreen) return document.exitFullscreen();
    if (document.webkitExitFullscreen) return document.webkitExitFullscreen();
    if (document.msExitFullscreen) return document.msExitFullscreen();
  }

  function canPiP(video) {
    return !!(document.pictureInPictureEnabled && video.requestPictureInPicture);
  }

  // ------------------------------
  // SVG icon set (Netflix-ish)
  // ------------------------------
  function svgIcon(name) {
    switch (name) {
      case "play":
        return `
          <svg class="sv-ico" viewBox="0 0 24 24" aria-hidden="true">
            <polygon points="8,5 20,12 8,19"></polygon>
          </svg>`;
      case "pause":
        return `
          <svg class="sv-ico" viewBox="0 0 24 24" aria-hidden="true">
            <rect x="7" y="5" width="3.5" height="14" rx="1"></rect>
            <rect x="13.5" y="5" width="3.5" height="14" rx="1"></rect>
          </svg>`;
      case "replay":
        return `
          <svg class="sv-ico" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M20 12a8 8 0 1 1-2.34-5.66"></path>
            <path d="M20 4v6h-6"></path>
          </svg>`;

      // Single-chevron + circular arrow (back/forward)
      case "skipBackCircular":
        return `
          <svg class="sv-ico" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M20 12a8 8 0 1 1-3.2-6.4"></path>
            <path d="M9.2 9.2L6.6 12l2.6 2.8"></path>
            <path d="M6.9 12h6.2"></path>
          </svg>`;
      case "skipForwardCircular":
        return `
          <svg class="sv-ico" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 12a8 8 0 1 0 3.2-6.4"></path>
            <path d="M14.8 9.2L17.4 12l-2.6 2.8"></path>
            <path d="M17.1 12h-6.2"></path>
          </svg>`;

      case "volume":
        return `
          <svg class="sv-ico" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M11 5L6.5 9H3v6h3.5L11 19z"></path>
            <path d="M15.5 8.5a5 5 0 0 1 0 7"></path>
            <path d="M17.8 6.2a8 8 0 0 1 0 11.6"></path>
          </svg>`;
      case "muted":
        return `
          <svg class="sv-ico" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M11 5L6.5 9H3v6h3.5L11 19z"></path>
            <line x1="16" y1="9" x2="21" y2="15"></line>
            <line x1="21" y1="9" x2="16" y2="15"></line>
          </svg>`;
      case "settings":
        return `
          <svg class="sv-ico" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"></path>
            <path d="M19.4 15a7.9 7.9 0 0 0 .1-1 7.9 7.9 0 0 0-.1-1l2-1.5-2-3.4-2.4 1a7.7 7.7 0 0 0-1.7-1l-.4-2.6H10l-.4 2.6a7.7 7.7 0 0 0-1.7 1l-2.4-1-2 3.4 2 1.5a7.9 7.9 0 0 0-.1 1 7.9 7.9 0 0 0 .1 1l-2 1.5 2 3.4 2.4-1a7.7 7.7 0 0 0 1.7 1l.4 2.6h4.2l.4-2.6a7.7 7.7 0 0 0 1.7-1l2.4 1 2-3.4z"></path>
          </svg>`;
      case "pip":
        return `
          <svg class="sv-ico" viewBox="0 0 24 24" aria-hidden="true">
            <rect x="4" y="6" width="16" height="12" rx="2"></rect>
            <rect x="12.5" y="11" width="6" height="4.5" rx="1"></rect>
          </svg>`;
      case "fullscreen":
        return `
          <svg class="sv-ico" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M9 4H4v5"></path>
            <path d="M15 4h5v5"></path>
            <path d="M9 20H4v-5"></path>
            <path d="M15 20h5v-5"></path>
          </svg>`;
      case "exitFullscreen":
        return `
          <svg class="sv-ico" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M9 9H4V4"></path>
            <path d="M15 9h5V4"></path>
            <path d="M9 15H4v5"></path>
            <path d="M15 15h5v5"></path>
          </svg>`;
      default:
        return "";
    }
  }

  function iconButton({ cls, label, solid = false, icon, iconAlt = null }) {
    const b = document.createElement("button");
    b.className = `sv-btn ${cls}${solid ? " sv-solid" : ""}`;
    b.type = "button";
    b.setAttribute("aria-label", label);

    if (iconAlt) {
      b.innerHTML = `
        <span class="sv-ico-wrap sv-ico-a">${svgIcon(icon)}</span>
        <span class="sv-ico-wrap sv-ico-b">${svgIcon(iconAlt)}</span>
      `;
    } else {
      b.innerHTML = svgIcon(icon);
    }
    return b;
  }

  class Player {
    constructor(videoEl, opts = {}) {
      this.video = videoEl;
      if (this.video.__svPlayer) return this.video.__svPlayer;
      this.video.__svPlayer = this;

      this.options = Object.assign({}, DEFAULTS, this._optsFromDataset(videoEl), opts);

      this._rafId = 0;
      this._idleTimer = 0;
      this._seeking = false;
      this._popoverOpen = false;

      this._build();
      this._bind();
      this._applyInitialState();
      this._updateAll();
    }

    _optsFromDataset(video) {
      const d = video.dataset || {};
      return {
        accent: parseHexColor(d.accent, DEFAULTS.accent),
        autohide: parseBool(d.autohide, DEFAULTS.autohide),
        hotkeys: parseBool(d.hotkeys, DEFAULTS.hotkeys),
        pip: parseBool(d.pip, DEFAULTS.pip),

        // per-video default skip step
        skipStep: parseNumber(d.skip, DEFAULTS.skipStep),

        // theme preset
        theme: (d.theme || "").trim().toLowerCase(),
        title: (d.title || "").trim()
      };
    }

    _build() {
      this.video.controls = false;
      if (!this.video.getAttribute("preload")) this.video.setAttribute("preload", "metadata");

      // wrapper
      const wrap = document.createElement("div");
      wrap.className = "sv-player";
      wrap.tabIndex = 0;
      wrap.style.setProperty("--sv-accent", this.options.accent);
      if (this.options.theme) wrap.classList.add(`sv-theme-${this.options.theme}`);

      // wrap video
      const parent = this.video.parentNode;
      parent.insertBefore(wrap, this.video);
      wrap.appendChild(this.video);

      // click layer
      const clickLayer = document.createElement("div");
      clickLayer.className = "sv-clicklayer";
      clickLayer.setAttribute("aria-hidden", "true");
      wrap.appendChild(clickLayer);

      // controls container
      const controls = document.createElement("div");
      controls.className = "sv-controls";
      controls.setAttribute("role", "group");
      controls.setAttribute("aria-label", "Video controls");

      // scrub
      const scrubWrap = document.createElement("div");
      scrubWrap.className = "sv-scrub";
      const scrub = document.createElement("input");
      scrub.className = "sv-scrub-bar sv-play-progress";
      scrub.type = "range";
      scrub.min = "0";
      scrub.max = "1000";
      scrub.value = "0";
      scrub.step = "1";
      scrub.setAttribute("aria-label", "Seek");
      scrubWrap.appendChild(scrub);

      // row
      const row = document.createElement("div");
      row.className = "sv-controls-row";

      const left = document.createElement("div");
      left.className = "sv-left";

      const right = document.createElement("div");
      right.className = "sv-right";

      const spacer = document.createElement("div");
      spacer.className = "sv-spacer";

      // play/pause (solid play triangle)
      const playBtn = iconButton({
        cls: "sv-play-button",
        label: "Play / Pause",
        solid: true,
        icon: "play",
        iconAlt: "pause"
      });

      // skip back/forward (single-chevron circular arrow) + step overlays
      const backBtn = iconButton({ cls: "sv-skip-back", label: "Skip back", icon: "skipBackCircular" });
      const fwdBtn  = iconButton({ cls: "sv-skip-forward", label: "Skip forward", icon: "skipForwardCircular" });

      const backStep = document.createElement("span");
      backStep.className = "sv-skip-step sv-skip-step-back";
      backStep.textContent = String(this.options.skipStep);

      const fwdStep = document.createElement("span");
      fwdStep.className = "sv-skip-step sv-skip-step-forward";
      fwdStep.textContent = String(this.options.skipStep);

      const backWrap = document.createElement("div");
      backWrap.className = "sv-skip-wrap";
      backWrap.appendChild(backBtn);
      backWrap.appendChild(backStep);

      const fwdWrap = document.createElement("div");
      fwdWrap.className = "sv-skip-wrap";
      fwdWrap.appendChild(fwdBtn);
      fwdWrap.appendChild(fwdStep);

      // volume group
      const volGroup = document.createElement("div");
      volGroup.className = "sv-volume";

      const muteBtn = iconButton({
        cls: "sv-mute-button",
        label: "Mute",
        icon: "volume",
        iconAlt: "muted"
      });

      const vol = document.createElement("input");
      vol.className = "sv-volume-slider";
      vol.type = "range";
      vol.min = "0";
      vol.max = "1";
      vol.step = "0.01";
      vol.value = "0.9";
      vol.setAttribute("aria-label", "Volume");

      volGroup.appendChild(muteBtn);
      volGroup.appendChild(vol);

      // remaining time far right
      const remaining = document.createElement("div");
      remaining.className = "sv-time-remaining";
      remaining.textContent = "-0:00";

      // settings popover
      const settingsBtn = iconButton({ cls: "sv-settings-button", label: "Settings", icon: "settings" });

      const popover = document.createElement("div");
      popover.className = "sv-popover";
      popover.setAttribute("role", "dialog");
      popover.setAttribute("aria-label", "Player settings");
      popover.setAttribute("aria-hidden", "true");

      popover.innerHTML = `
        <h4>Skip Buttons</h4>
        <div class="sv-option-row sv-skip-options"></div>

        <h4>Playback Speed</h4>
        <div class="sv-option-row sv-rate-options"></div>
      `;

      // pip + fullscreen
      const pipBtn = iconButton({ cls: "sv-pip-button", label: "Picture in Picture", icon: "pip" });

      const fsBtn = iconButton({
        cls: "sv-fullscreen-button",
        label: "Fullscreen",
        icon: "fullscreen",
        iconAlt: "exitFullscreen"
      });

      // assemble
      left.appendChild(playBtn);
      left.appendChild(backWrap);
      left.appendChild(fwdWrap);
      left.appendChild(volGroup);

      right.appendChild(settingsBtn);
      right.appendChild(remaining);
      if (this.options.pip) right.appendChild(pipBtn);
      right.appendChild(fsBtn);

      row.appendChild(left);
      row.appendChild(spacer);
      row.appendChild(right);

      controls.appendChild(scrubWrap);
      controls.appendChild(row);
      wrap.appendChild(controls);
      wrap.appendChild(popover);

      // feature availability
      if (!canFullscreen(wrap)) fsBtn.disabled = true;
      if (!canPiP(this.video)) pipBtn.style.display = "none";

      // store refs
      this.el = { wrap, controls, clickLayer, popover };
      this.btn = { playBtn, backBtn, fwdBtn, muteBtn, fsBtn, pipBtn, settingsBtn };
      this.ui = { scrub, vol, remaining, backStep, fwdStep };

      this._renderSettings();
    }

    _renderSettings() {
      const skipWrap = this.el.popover.querySelector(".sv-skip-options");
      const rateWrap = this.el.popover.querySelector(".sv-rate-options");

      skipWrap.innerHTML = "";
      rateWrap.innerHTML = "";

      for (const s of this.options.skipOptions) {
        const chip = document.createElement("button");
        chip.className = "sv-chip";
        chip.type = "button";
        chip.textContent = `${s}s`;
        chip.setAttribute("aria-pressed", String(s === this.options.skipStep));
        chip.addEventListener("click", () => this.setSkipStep(s));
        skipWrap.appendChild(chip);
      }

      for (const r of this.options.rateOptions) {
        const chip = document.createElement("button");
        chip.className = "sv-chip";
        chip.type = "button";
        chip.textContent = r === 1 ? "1x" : `${r}x`;
        chip.setAttribute("aria-pressed", String(r === this.video.playbackRate));
        chip.addEventListener("click", () => this.setPlaybackRate(r));
        rateWrap.appendChild(chip);
      }
    }

    _bind() {
      // click-to-toggle play/pause
      this.el.clickLayer.addEventListener("click", () => this.togglePlay());

      // buttons
      this.btn.playBtn.addEventListener("click", () => this.togglePlay());
      this.btn.backBtn.addEventListener("click", () => this.seekBy(-this.options.skipStep));
      this.btn.fwdBtn.addEventListener("click", () => this.seekBy(this.options.skipStep));
      this.btn.muteBtn.addEventListener("click", () => this.toggleMute());
      this.btn.fsBtn.addEventListener("click", () => this.toggleFullscreen());

      if (this.btn.pipBtn) this.btn.pipBtn.addEventListener("click", () => this.togglePiP());

      // scrubbing
      const scrub = this.ui.scrub;
      scrub.addEventListener("pointerdown", () => (this._seeking = true));
      scrub.addEventListener("pointerup", () => (this._seeking = false));
      scrub.addEventListener("input", () => {
        const dur = this.video.duration;
        if (!Number.isFinite(dur) || dur <= 0) return;
        const t = (Number(scrub.value) / 1000) * dur;
        this._setCurrentTimeSafely(t);
        this._updateRemaining();
      });

      // volume
      this.ui.vol.addEventListener("input", () => {
        const v = clamp(Number(this.ui.vol.value), 0, 1);
        this.video.volume = v;
        if (v > 0 && this.video.muted) this.video.muted = false;
        this._rememberVolume();
        this._syncVolumeUI();
      });

      // settings popover
      this.btn.settingsBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.toggleSettings();
      });

      document.addEventListener("click", (e) => {
        if (!this._popoverOpen) return;
        if (!this.el.wrap.contains(e.target)) this.closeSettings();
      });

      // video events
      this.video.addEventListener("play", () => {
        this.el.wrap.classList.add("sv-is-playing");
        this._startRAF();
        this._scheduleAutohide(true);
      });

      this.video.addEventListener("pause", () => {
        this.el.wrap.classList.remove("sv-is-playing");
        this._stopRAF();
        this._showUI();
      });

      this.video.addEventListener("timeupdate", () => {
        if (!this._seeking) this._syncScrub();
        this._updateRemaining();
      });

      this.video.addEventListener("durationchange", () => {
        this._syncScrub();
        this._updateRemaining();
      });

      this.video.addEventListener("volumechange", () => {
        this._rememberVolume();
        this._syncVolumeUI();
      });

      this.video.addEventListener("ended", () => {
        this.el.wrap.classList.remove("sv-is-playing");
        this._stopRAF();
        this._showUI();
      });

      // autohide wake
      const wake = () => this._scheduleAutohide(true);
      ["mousemove", "pointermove", "touchstart", "keydown", "focus"].forEach((evt) => {
        this.el.wrap.addEventListener(evt, wake, { passive: true });
      });

      // hotkeys
      this.el.wrap.addEventListener("keydown", (e) => {
        if (!this.options.hotkeys) return;
        const key = e.key.toLowerCase();

        if (key === " " || key === "k") { e.preventDefault(); this.togglePlay(); }
        if (key === "arrowleft") { e.preventDefault(); this.seekBy(-this.options.skipStep); }
        if (key === "arrowright") { e.preventDefault(); this.seekBy(this.options.skipStep); }
        if (key === "m") { e.preventDefault(); this.toggleMute(); }
        if (key === "f") { e.preventDefault(); this.toggleFullscreen(); }
        if (key === "escape" && this._popoverOpen) { e.preventDefault(); this.closeSettings(); }
      });

      document.addEventListener("fullscreenchange", () => this._syncFullscreenUI());
      document.addEventListener("webkitfullscreenchange", () => this._syncFullscreenUI());
      document.addEventListener("msfullscreenchange", () => this._syncFullscreenUI());
    }

    _applyInitialState() {
      // restore volume/mute
      if (this.options.rememberVolume) {
        try {
          const v = localStorage.getItem(this.options.volumeKey);
          const m = localStorage.getItem(this.options.mutedKey);
          if (v !== null) this.video.volume = clamp(Number(v), 0, 1);
          if (m !== null) this.video.muted = parseBool(m, false);
        } catch (_) {}
      }

      // restore skip + playback rate
      try {
        const s = localStorage.getItem(this.options.skipKey);
        const r = localStorage.getItem(this.options.rateKey);
        if (s !== null) this.options.skipStep = clamp(Number(s), 1, 90);
        if (r !== null) this.video.playbackRate = clamp(Number(r), 0.25, 4);
      } catch (_) {}

      this._syncSkipLabels();
      this._syncVolumeUI();
      this._syncFullscreenUI();
      this._renderSettings();
    }

    _rememberVolume() {
      if (!this.options.rememberVolume) return;
      try {
        localStorage.setItem(this.options.volumeKey, String(this.video.volume));
        localStorage.setItem(this.options.mutedKey, String(!!this.video.muted));
      } catch (_) {}
    }

    _setCurrentTimeSafely(t) {
      try { this.video.currentTime = t; } catch (_) {}
      this._syncScrub();
    }

    _syncScrub() {
      const dur = this.video.duration;
      const cur = this.video.currentTime;
      if (!Number.isFinite(dur) || dur <= 0 || !Number.isFinite(cur)) {
        this.ui.scrub.value = "0";
        this.el.wrap.style.setProperty("--sv-progress", "0%");
        return;
      }
      const p = clamp(cur / dur, 0, 1);
      this.ui.scrub.value = String(Math.round(p * 1000));
      this.el.wrap.style.setProperty("--sv-progress", `${(p * 100).toFixed(3)}%`);
    }

    _syncVolumeUI() {
      const v = clamp(this.video.volume, 0, 1);
      this.ui.vol.value = String(v);
      this.el.wrap.classList.toggle("sv-muted", !!this.video.muted || v === 0);
    }

    _syncFullscreenUI() {
      const fs = isFullscreen();
      this.el.wrap.classList.toggle("sv-fullscreen", fs);
    }

    _updateRemaining() {
      const dur = this.video.duration;
      const cur = this.video.currentTime;
      if (!Number.isFinite(dur) || dur <= 0 || !Number.isFinite(cur)) {
        this.ui.remaining.textContent = "-0:00";
        return;
      }
      const rem = clamp(dur - cur, 0, dur);
      this.ui.remaining.textContent = `-${formatTime(rem)}`;
    }

    _updateAll() {
      this._syncScrub();
      this._syncVolumeUI();
      this._syncFullscreenUI();
      this._updateRemaining();
    }

    _startRAF() {
      if (this._rafId) return;
      const tick = () => {
        this._rafId = requestAnimationFrame(tick);
        if (!this._seeking) this._syncScrub();
        this._updateRemaining();
      };
      this._rafId = requestAnimationFrame(tick);
    }

    _stopRAF() {
      if (!this._rafId) return;
      cancelAnimationFrame(this._rafId);
      this._rafId = 0;
    }

    _showUI() { this.el.wrap.classList.remove("sv-ui-hidden"); }
    _hideUI() { this.el.wrap.classList.add("sv-ui-hidden"); }

    _scheduleAutohide(forceShow = false) {
      if (!this.options.autohide) return this._showUI();
      if (this.video.paused) return this._showUI();

      if (forceShow) this._showUI();

      clearTimeout(this._idleTimer);
      this._idleTimer = setTimeout(() => {
        if (this._popoverOpen) return;
        const active = document.activeElement;
        const controlFocused = active && this.el.wrap.contains(active) && active !== this.el.wrap;
        if (!controlFocused && !this._seeking) this._hideUI();
      }, 1600);
    }

    // public API
    play() { return this.video.play(); }
    pause() { return this.video.pause(); }
    togglePlay() { this.video.paused ? this.play() : this.pause(); }

    seekBy(seconds) {
      const dur = this.video.duration;
      if (!Number.isFinite(dur) || dur <= 0) return;
      const t = clamp(this.video.currentTime + seconds, 0, Math.max(0, dur - 0.25));
      this._setCurrentTimeSafely(t);
      this._scheduleAutohide(true);
    }

    setAccent(hex) {
      const color = parseHexColor(hex, this.options.accent);
      this.options.accent = color;
      this.el.wrap.style.setProperty("--sv-accent", color);
    }

    toggleMute() {
      this.video.muted = !this.video.muted;
      if (!this.video.muted && this.video.volume === 0) this.video.volume = 0.5;
      this._rememberVolume();
      this._syncVolumeUI();
    }

    toggleFullscreen() {
      if (!canFullscreen(this.el.wrap)) return;
      isFullscreen() ? exitFullscreen() : requestFullscreen(this.el.wrap);
    }

    async togglePiP() {
      if (!canPiP(this.video)) return;
      try {
        if (document.pictureInPictureElement) await document.exitPictureInPicture();
        else await this.video.requestPictureInPicture();
      } catch (_) {}
    }

    setSkipStep(seconds) {
      const s = clamp(Number(seconds), 1, 90);
      this.options.skipStep = s;
      try { localStorage.setItem(this.options.skipKey, String(s)); } catch (_) {}
      this._syncSkipLabels();
      this._renderSettings();
    }

    _syncSkipLabels() {
      this.ui.backStep.textContent = String(this.options.skipStep);
      this.ui.fwdStep.textContent = String(this.options.skipStep);
      this.btn.backBtn.setAttribute("aria-label", `Skip back ${this.options.skipStep} seconds`);
      this.btn.fwdBtn.setAttribute("aria-label", `Skip forward ${this.options.skipStep} seconds`);
    }

    setPlaybackRate(rate) {
      const r = clamp(Number(rate), 0.25, 4);
      this.video.playbackRate = r;
      try { localStorage.setItem(this.options.rateKey, String(r)); } catch (_) {}
      this._renderSettings();
    }

    toggleSettings() { this._popoverOpen ? this.closeSettings() : this.openSettings(); }

    openSettings() {
      this._popoverOpen = true;
      this.el.popover.setAttribute("aria-hidden", "false");
      this._showUI();
    }

    closeSettings() {
      this._popoverOpen = false;
      this.el.popover.setAttribute("aria-hidden", "true");
    }

    destroy() {
      this._stopRAF();
      clearTimeout(this._idleTimer);
      this.closeSettings();

      this.video.controls = true;

      const wrap = this.el.wrap;
      const parent = wrap.parentNode;
      parent.insertBefore(this.video, wrap);
      parent.removeChild(wrap);

      delete this.video.__svPlayer;
    }
  }

  class SublimeVideoManager {
    constructor(opts = {}) {
      this.options = Object.assign({}, DEFAULTS, opts);
      this.players = new Map();
    }

    init(root = document) {
      Array.from(root.querySelectorAll(this.options.selector)).forEach((v) => this.add(v));
      return this;
    }

    add(videoEl, opts = {}) {
      if (!videoEl || videoEl.__svPlayer) return videoEl.__svPlayer;
      const p = new Player(videoEl, Object.assign({}, this.options, opts));
      this.players.set(videoEl, p);
      return p;
    }

    get(videoEl) {
      return videoEl ? (videoEl.__svPlayer || null) : null;
    }

    destroyAll() {
      for (const [el, p] of this.players.entries()) {
        p.destroy();
        this.players.delete(el);
      }
    }
  }

  const manager = new SublimeVideoManager();
  const domReady = (fn) =>
    (document.readyState === "loading")
      ? document.addEventListener("DOMContentLoaded", fn)
      : fn();

  domReady(() => manager.init(document));

  return {
    version: "1.1.0",
    manager,
    create: (opts) => new SublimeVideoManager(opts),
    Player
  };
});
