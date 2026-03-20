/* -------------------------------------------------------
   Valentine Website — Pure JavaScript
   Features:
   - "No" button avoids clicks + changes text + shake
   - "Yes" button triggers confetti + heart burst + modal
   - Reveals love letter with handwriting typing animation
   - Floating hearts background + cursor hearts + click hearts + sparkles
   - Countdown to Valentine's Day OR custom date
   - Music toggle (Web Audio soft “music box”)
   - Theme toggle (light pink / deep pink)
   - Save “Yes” state in localStorage
   - Share button (copy link with optional name)
-------------------------------------------------------- */

(() => {
  const $ = (sel, root = document) => root.querySelector(sel);

  const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;

  // Elements
  const html = document.documentElement;
  const body = document.body;

  const questionEl = $("#question");
  const nameInput = $("#nameInput");
  const customDateInput = $("#customDate");
  const countdownNote = $("#countdownNote");

  const playArea = $("#playArea");
  const yesBtn = $("#yesBtn");
  const noBtn = $("#noBtn");

  const daysEl = $("#days");
  const hoursEl = $("#hours");
  const minsEl = $("#mins");
  const secsEl = $("#secs");
  const countdownMini = $("#countdownMini");

  const letterSection = $("#letterSection");
  const typedLetterEl = $("#typedLetter");
  const messageInput = $("#messageInput");
  const replayTypeBtn = $("#replayTypeBtn");
  const acceptedPill = $("#acceptedPill");
  const savedBadge = $("#savedBadge");
  const clearSaveBtn = $("#clearSaveBtn");

  const themeToggle = $("#themeToggle");
  const musicToggle = $("#musicToggle");
  const musicLabel = $("#musicLabel");
  const shareBtn = $("#shareBtn");

  const effectsLayer = $("#effectsLayer");
  const heartLayer = $("#heartLayer");

  const modal = $("#loveModal");
  const modalClose = $("#modalClose");
  const modalOk = $("#modalOk");
  const modalText = $("#modalText");

  const toast = $("#toast");

  // State
  let accepted = false;
  let targetDate = null;
  let countdownTimerId = null;
  let floatHeartsId = null;
  let cursorHeartThrottle = 0;

  // Many phrases so she can NEVER say no 😈
  const noPhrases = [
    "Are you sure? 🥺",
    "Don’t break my heart 💔",
    "Try again 😏",
    "Nope nope nope 😈",
    "I’m too cute to refuse 🥹",
    "Wait—come back! 🏃‍♀️💨",
    "But I have chocolate 🍫",
    "That button is shy 🙈",
    "Nice try 😌",
    "You can’t catch me 😜",
    "Think again 💗",
    "Error: ‘No’ not found 🤭",
    "But… please? 🥺👉👈",
    "Plot twist: it’s YES 💘",
    "I already told my mom 😭",
    "You’re blushing, admit it 😳",
    "Not allowed 🚫💔",
    "I’ll be extra sweet 🍓",
    "This is a love trap 💝",
    "Say yes and I’ll do a happy dance 💃",
    "I’m literally a heart button 🩷",
    "The universe ships us 🌙✨",
    "Your finger slipped… try YES 😇",
    "I’m fast AND adorable 😈",
    "You wouldn’t dare 😤💞",
    "I’ll haunt you with cuteness 👻🩷",
    "No is on vacation 🏖️",
    "I replaced ‘No’ with ‘Yes’ 🪄",
    "Okay but… pretty please? 🥹",
    "That was a practice click 😏",
    "You’re one hover away from YES 💘",
    "Denied by Cupid 🏹",
    "You can do it! Click YES 😚",
    "I prepared a love letter… 🥺💌",
    "Oops, my heart moved it 💓"
  ];
  let noIndex = 0;

  // Confetti palette (romantic pinks + soft gold)
  const confettiColors = [
    "#ff3e9a", "#ff76bf", "#ff1f87",
    "#ffd1ea", "#ffe6f2", "#fff3f8",
    "#ffd86b"
  ];

  // -----------------------------
  // Helpers
  // -----------------------------
  function showToast(text) {
    toast.textContent = text;
    toast.classList.add("show");
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => toast.classList.remove("show"), 2200);
  }

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  function rand(min, max) {
    return Math.random() * (max - min) + min;
  }

  function escapeHTMLChar(ch) {
    // Enough for our typed letter; keeps emojis safe too.
    if (ch === "&") return "&amp;";
    if (ch === "<") return "&lt;";
    if (ch === ">") return "&gt;";
    if (ch === '"') return "&quot;";
    if (ch === "'") return "&#039;";
    return ch;
  }

  // -----------------------------
  // Love letter text
  // -----------------------------
  function buildDefaultLetter(name) {
    const who = name?.trim() ? name.trim() : "my love";
    return (
`Dear ${who},

I just want you to know… you make my days softer, my smiles bigger, and my heart ridiculously happy. 💗

If I could, I’d bottle up every little moment with you—your laugh, your vibe, your warmth—and keep it forever. ✨

So… will you be my Valentine today (and all the days after)? 💘

Forever yours,
— Me 🩷`
    );
  }

  // Handwriting/typing animation
  let typingAbort = { stop: false };

  function typeLetter(text) {
    typingAbort.stop = true;      // stop any previous typing
    typingAbort = { stop: false };

    typedLetterEl.innerHTML = "";
    const speed = prefersReducedMotion ? 0 : 22;

    let i = 0;
    let out = "";

    function tick() {
      if (typingAbort.stop) return;

      if (i >= text.length) {
        // End: hide cursor by removing ::after if we want, but we keep it cute.
        return;
      }

      const ch = text[i++];
      if (ch === "\n") out += "<br>";
      else out += escapeHTMLChar(ch);

      typedLetterEl.innerHTML = out;

      if (speed === 0) {
        // Reduced motion: render instantly
        i = text.length;
        typedLetterEl.innerHTML = text.split("").map(c => c === "\n" ? "<br>" : escapeHTMLChar(c)).join("");
        return;
      }

      window.setTimeout(tick, speed);
    }

    tick();
  }

  // -----------------------------
  // "No" button mischievous logic
  // -----------------------------
  function placeNoButtonInitial() {
    const area = playArea.getBoundingClientRect();
    const btn = noBtn.getBoundingClientRect();

    // place near the right side of the play area
    const x = clamp(area.width * 0.62, 10, area.width - btn.width - 10);
    const y = clamp(12, 10, area.height - btn.height - 10);

    noBtn.style.left = `${x}px`;
    noBtn.style.top = `${y}px`;
  }

  function shakeNo() {
    noBtn.classList.remove("shake");
    // force reflow so animation can replay
    void noBtn.offsetWidth;
    noBtn.classList.add("shake");
  }

  function moveNoButton() {
    if (accepted) return;

    // Change the text (never-ending)
    noBtn.textContent = noPhrases[noIndex++ % noPhrases.length];
    shakeNo();

    const area = playArea.getBoundingClientRect();
    const btn = noBtn.getBoundingClientRect();
    const yes = yesBtn.getBoundingClientRect();

    // pick random positions inside play area, avoid overlap with YES button
    let x = 0, y = 0;
    let tries = 0;

    while (tries < 40) {
      tries++;

      x = rand(10, Math.max(10, area.width - btn.width - 10));
      y = rand(8, Math.max(8, area.height - btn.height - 8));

      // Compute distance to yes button center to avoid covering it
      const bx = area.left + x + btn.width / 2;
      const by = area.top + y + btn.height / 2;

      const yx = yes.left + yes.width / 2;
      const yy = yes.top + yes.height / 2;

      const dist = Math.hypot(bx - yx, by - yy);
      if (dist > 110) break;
    }

    noBtn.style.left = `${x}px`;
    noBtn.style.top = `${y}px`;
  }

  // Make “No” basically unclickable 😈
  noBtn.addEventListener("pointerenter", moveNoButton);
  noBtn.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    moveNoButton();
    sparkleBurst(e.clientX, e.clientY, 10);
  });
  noBtn.addEventListener("click", (e) => {
    e.preventDefault();
    moveNoButton();
  });
  noBtn.addEventListener("focus", moveNoButton);

  // -----------------------------
  // Confetti + Hearts
  // -----------------------------
  function popConfetti(count = 140) {
    if (prefersReducedMotion) count = 40;

    for (let i = 0; i < count; i++) {
      const piece = document.createElement("span");
      piece.className = "confetti";
      piece.style.left = `${rand(0, 100)}vw`;

      const dx = rand(-80, 80);
      const rot = rand(120, 520);
      const delay = rand(0, 220);
      const dur = rand(900, 1600);

      piece.style.setProperty("--dx", `${dx}px`);
      piece.style.setProperty("--rot", `${rot}deg`);
      piece.style.setProperty("--delay", `${delay}ms`);
      piece.style.setProperty("--dur", `${dur}ms`);

      piece.style.background = confettiColors[Math.floor(rand(0, confettiColors.length))];

      effectsLayer.appendChild(piece);

      window.setTimeout(() => piece.remove(), dur + delay + 120);
    }
  }

  function heartBurst(x, y, count = 18) {
    if (prefersReducedMotion) count = 8;

    for (let i = 0; i < count; i++) {
      const h = document.createElement("span");
      h.className = "heart burst-heart";

      const size = rand(10, 18);
      h.style.width = `${size}px`;
      h.style.height = `${size}px`;

      // center at x/y
      h.style.left = `${x - size / 2}px`;
      h.style.top = `${y - size / 2}px`;

      // random direction
      const angle = rand(0, Math.PI * 2);
      const radius = rand(40, 140);
      const tx = Math.cos(angle) * radius;
      const ty = Math.sin(angle) * radius;

      h.style.setProperty("--tx", `${tx}px`);
      h.style.setProperty("--ty", `${ty}px`);

      effectsLayer.appendChild(h);
      window.setTimeout(() => h.remove(), 980);
    }
  }

  function sparkleBurst(x, y, count = 12) {
    if (prefersReducedMotion) count = 6;

    for (let i = 0; i < count; i++) {
      const s = document.createElement("span");
      s.className = "sparkle";
      s.style.left = `${x}px`;
      s.style.top = `${y}px`;

      const angle = rand(0, Math.PI * 2);
      const radius = rand(10, 40);
      const tx = Math.cos(angle) * radius;
      const ty = Math.sin(angle) * radius;

      s.style.setProperty("--tx", `${tx}px`);
      s.style.setProperty("--ty", `${ty}px`);

      effectsLayer.appendChild(s);
      window.setTimeout(() => s.remove(), 760);
    }
  }

  // Cursor hearts following mouse
  window.addEventListener("pointermove", (e) => {
    if (prefersReducedMotion) return;

    const now = performance.now();
    if (now - cursorHeartThrottle < 40) return;
    cursorHeartThrottle = now;

    const h = document.createElement("span");
    h.className = "heart cursor-heart";

    const size = rand(8, 14);
    h.style.width = `${size}px`;
    h.style.height = `${size}px`;
    h.style.left = `${e.clientX - size / 2}px`;
    h.style.top = `${e.clientY - size / 2}px`;

    effectsLayer.appendChild(h);
    window.setTimeout(() => h.remove(), 950);
  });

  // Click-to-create hearts + sparkles
  window.addEventListener("pointerdown", (e) => {
    if (e.target.closest(".btn-no")) return; // no-btn already sparkles itself
    if (e.target.closest(".chip")) return;

    const size = rand(14, 22);
    const h = document.createElement("span");
    h.className = "heart burst-heart";
    h.style.width = `${size}px`;
    h.style.height = `${size}px`;
    h.style.left = `${e.clientX - size / 2}px`;
    h.style.top = `${e.clientY - size / 2}px`;

    h.style.setProperty("--tx", `${rand(-35, 35)}px`);
    h.style.setProperty("--ty", `${rand(-55, -25)}px`);

    effectsLayer.appendChild(h);
    window.setTimeout(() => h.remove(), 980);

    sparkleBurst(e.clientX, e.clientY, 8);
  });

  // Floating hearts in background
  function spawnFloatingHeart() {
    const h = document.createElement("span");
    h.className = "heart float-heart";

    const size = rand(10, 22);
    h.style.width = `${size}px`;
    h.style.height = `${size}px`;

    h.style.left = `${rand(0, 100)}vw`;
    h.style.setProperty("--op", `${rand(0.18, 0.55)}`);

    const dur = prefersReducedMotion ? rand(4200, 6200) : rand(5200, 9200);
    h.style.animationDuration = `${dur}ms`;

    heartLayer.appendChild(h);
    window.setTimeout(() => h.remove(), dur + 200);
  }

  function startFloatingHearts() {
    stopFloatingHearts();
    if (prefersReducedMotion) return;

    floatHeartsId = window.setInterval(spawnFloatingHeart, 620);
    // spawn a few immediately
    for (let i = 0; i < 6; i++) spawnFloatingHeart();
  }

  function stopFloatingHearts() {
    if (floatHeartsId) window.clearInterval(floatHeartsId);
    floatHeartsId = null;
  }

  // -----------------------------
  // Countdown
  // -----------------------------
  function nextValentinesDay() {
    const now = new Date();
    const year = now.getFullYear();
    const vd = new Date(year, 1, 14, 0, 0, 0); // Feb = 1
    if (now > vd) return new Date(year + 1, 1, 14, 0, 0, 0);
    return vd;
  }

  function setTargetDateFromInput() {
    const val = customDateInput.value;
    if (val) {
      // Local timezone date
      targetDate = new Date(`${val}T00:00:00`);
      const pretty = targetDate.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
      countdownNote.textContent = `Counting down to ${pretty} 💘`;
    } else {
      targetDate = nextValentinesDay();
      const pretty = targetDate.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
      countdownNote.textContent = `Counting down to Valentine’s Day (${pretty}) 💘`;
    }
  }

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  function tickCountdown() {
    if (!targetDate) return;

    const now = new Date();
    let diff = targetDate.getTime() - now.getTime();

    if (diff <= 0) {
      daysEl.textContent = "00";
      hoursEl.textContent = "00";
      minsEl.textContent = "00";
      secsEl.textContent = "00";
      countdownMini.textContent = "💘 It’s timeeee! Happy Valentine’s Day!";
      return;
    }

    const s = Math.floor(diff / 1000);
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;

    daysEl.textContent = pad2(d);
    hoursEl.textContent = pad2(h);
    minsEl.textContent = pad2(m);
    secsEl.textContent = pad2(sec);

    if (accepted) {
      countdownMini.textContent = "💗 Every second with you is my favorite.";
    } else {
      countdownMini.textContent = "💗 Every second gets me closer to you.";
    }
  }

  function startCountdown() {
    if (countdownTimerId) window.clearInterval(countdownTimerId);
    tickCountdown();
    countdownTimerId = window.setInterval(tickCountdown, 1000);
  }

  customDateInput.addEventListener("change", () => {
    setTargetDateFromInput();
    startCountdown();
    saveState();
    showToast("Countdown updated ⏳💗");
  });

  // -----------------------------
  // Theme toggle
  // -----------------------------
  function setTheme(theme) {
    html.setAttribute("data-theme", theme);
    themeToggle.setAttribute("aria-pressed", theme === "deep" ? "true" : "false");
  }

  themeToggle.addEventListener("click", () => {
    const current = html.getAttribute("data-theme") || "light";
    const next = current === "light" ? "deep" : "light";
    setTheme(next);
    saveState();
    showToast(next === "deep" ? "Deep pink mode 💗" : "Soft pink mode 🩷");
  });

  // -----------------------------
  // Soft music toggle (Web Audio “music box”)
  // -----------------------------
  const MusicBox = (() => {
    let ctx = null;
    let master = null;
    let timer = null;
    let playing = false;
    let step = 0;

    // Gentle chord progression: C -> Am -> F -> G
    const chords = [
      [261.63, 329.63, 392.00],   // C major
      [220.00, 261.63, 329.63],   // A minor
      [174.61, 220.00, 261.63],   // F major (inversion-ish)
      [196.00, 246.94, 293.66]    // G major
    ];

    function ensureContext() {
      if (ctx) return;
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();

      master = ctx.createGain();
      master.gain.value = 0.0; // fade in
      master.connect(ctx.destination);
    }

    function playChord(freqs, duration = 1.9) {
      if (!ctx || !master) return;

      const now = ctx.currentTime;
      const chordGain = ctx.createGain();
      chordGain.connect(master);

      // Envelope (soft)
      chordGain.gain.setValueAtTime(0.0, now);
      chordGain.gain.linearRampToValueAtTime(0.10, now + 0.08);
      chordGain.gain.linearRampToValueAtTime(0.05, now + duration * 0.65);
      chordGain.gain.linearRampToValueAtTime(0.0, now + duration);

      freqs.forEach((f, idx) => {
        const osc = ctx.createOscillator();
        osc.type = idx === 0 ? "sine" : "triangle";
        osc.frequency.value = f;

        // Slight detune for warmth
        osc.detune.value = (idx - 1) * 6;

        osc.connect(chordGain);
        osc.start(now);
        osc.stop(now + duration);
      });
    }

    function start() {
      ensureContext();
      if (!ctx) return;

      // iOS/Safari: resume on user gesture
      if (ctx.state === "suspended") ctx.resume();

      if (playing) return;
      playing = true;

      // Fade in master
      const now = ctx.currentTime;
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(master.gain.value, now);
      master.gain.linearRampToValueAtTime(0.25, now + 0.22);

      // Loop chords
      step = 0;
      playChord(chords[step % chords.length]);
      timer = window.setInterval(() => {
        step++;
        playChord(chords[step % chords.length]);
      }, 2000);
    }

    function stop() {
      if (!ctx || !master) return;
      if (!playing) return;

      playing = false;

      // Fade out quickly
      const now = ctx.currentTime;
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(master.gain.value, now);
      master.gain.linearRampToValueAtTime(0.0, now + 0.18);

      if (timer) window.clearInterval(timer);
      timer = null;
    }

    function toggle() {
      if (playing) stop();
      else start();
      return playing;
    }

    function isPlaying() {
      return playing;
    }

    return { toggle, isPlaying, start, stop };
  })();

  musicToggle.addEventListener("click", () => {
    const isOn = MusicBox.toggle();
    musicToggle.setAttribute("aria-pressed", isOn ? "true" : "false");
    musicLabel.textContent = isOn ? "Music: On" : "Music: Off";
    showToast(isOn ? "Music on 🎵💗" : "Music off 🎵");
  });

  // -----------------------------
  // Share button (copy link)
  // Adds ?name=... so it feels personalized when shared
  // -----------------------------
  function buildShareUrl() {
    const url = new URL(window.location.href);
    const nm = nameInput.value.trim();
    if (nm) url.searchParams.set("name", nm);
    return url.toString();
  }

  shareBtn.addEventListener("click", async () => {
    const url = buildShareUrl();
    try {
      await navigator.clipboard.writeText(url);
      showToast("Link copied! 🔗💗");
    } catch {
      // Fallback
      const ta = document.createElement("textarea");
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
      showToast("Link copied! 🔗💗");
    }
  });

  // -----------------------------
  // Yes flow
  // -----------------------------
  function openModal(text) {
    modalText.textContent = text;
    modal.classList.remove("hidden");
  }

  function closeModal() {
    modal.classList.add("hidden");
  }

  modalClose.addEventListener("click", closeModal);
  modalOk.addEventListener("click", closeModal);

  // Close modal by clicking outside card
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });

  function acceptFlow(withEffects = true) {
    accepted = true;
    body.classList.add("accepted");

    // Reveal love letter section
    letterSection.classList.remove("hidden");
    acceptedPill.hidden = false;

    // Remove/disable buttons
    yesBtn.textContent = "YES!!! 💞";
    yesBtn.disabled = true;

    noBtn.style.visibility = "hidden";
    noBtn.style.pointerEvents = "none";

    savedBadge.style.opacity = "1";

    // Type the letter
    typeLetter(messageInput.value);

    // Big effects
    if (withEffects) {
      const rect = yesBtn.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;

      popConfetti(160);
      heartBurst(cx, cy, 22);
      sparkleBurst(cx, cy, 14);
    }

    // Cute message
    const nm = nameInput.value.trim();
    const msg = nm
      ? `Yay, ${nm}!! You just made me the happiest person 💕`
      : "Yay!! You just made me the happiest person 💕";

    openModal(msg);

    saveState();
    showToast("Saved forever 💖");
  }

  yesBtn.addEventListener("click", () => {
    if (accepted) return;
    acceptFlow(true);
  });

  // -----------------------------
  // Personalization: name + letter editor
  // -----------------------------
  function updateQuestionWithName() {
    const nm = nameInput.value.trim();
    questionEl.textContent = nm
      ? `Will you be my Valentine, ${nm}? 💖`
      : "Will you be my Valentine? 💖";
  }

  // If user hasn't customized the letter manually, we keep it auto-personalized.
  function refreshLetterTemplateIfNotCustom() {
    const isCustom = messageInput.dataset.custom === "true";
    if (isCustom) return;
    const nm = nameInput.value.trim();
    messageInput.value = buildDefaultLetter(nm);
  }

  nameInput.addEventListener("input", () => {
    updateQuestionWithName();
    refreshLetterTemplateIfNotCustom();
    saveState();
  });

  // Mark as custom if they type in the textarea
  messageInput.addEventListener("input", () => {
    messageInput.dataset.custom = "true";
    saveState();
  });

  replayTypeBtn.addEventListener("click", () => {
    typeLetter(messageInput.value);
    showToast("Handwriting replayed ✨");
  });

  clearSaveBtn.addEventListener("click", () => {
    localStorage.removeItem("valentineState");
    showToast("Local save cleared 🔁");
    // Soft reset UI
    window.location.reload();
  });

  // -----------------------------
  // localStorage save/load
  // -----------------------------
  function saveState() {
    const state = {
      accepted,
      theme: html.getAttribute("data-theme") || "light",
      name: nameInput.value.trim(),
      date: customDateInput.value || "",
      message: messageInput.value,
      customMessage: messageInput.dataset.custom === "true"
    };
    localStorage.setItem("valentineState", JSON.stringify(state));
  }

  function loadState() {
    // URL param personalization
    const params = new URLSearchParams(window.location.search);
    const paramName = params.get("name");
    if (paramName && !nameInput.value) nameInput.value = paramName;

    // Load localStorage
    const raw = localStorage.getItem("valentineState");
    if (!raw) return;

    try {
      const state = JSON.parse(raw);

      if (state.theme) setTheme(state.theme);
      if (typeof state.name === "string" && !paramName) nameInput.value = state.name;
      if (typeof state.date === "string") customDateInput.value = state.date;

      // If saved message exists, load it
      if (typeof state.message === "string" && state.message.trim()) {
        messageInput.value = state.message;
        if (state.customMessage) messageInput.dataset.custom = "true";
      }

      updateQuestionWithName();

      // If accepted, restore accepted state (without huge effects)
      if (state.accepted) {
        acceptFlow(false);
        showToast("Welcome back, my Valentine 💖");
      }
    } catch {
      // ignore invalid storage
    }
  }

  // -----------------------------
  // Init
  // -----------------------------
  function init() {
    // Initial template
    messageInput.value = buildDefaultLetter(nameInput.value.trim());
    messageInput.dataset.custom = "false";

    loadState();

    // If no saved message loaded & not custom, re-personalize
    refreshLetterTemplateIfNotCustom();
    updateQuestionWithName();

    // Set target date for countdown
    setTargetDateFromInput();
    startCountdown();

    // Place "No" button & keep inside on resize
    placeNoButtonInitial();
    window.addEventListener("resize", placeNoButtonInitial);

    // Start background hearts
    startFloatingHearts();

    // A little welcome sparkle (subtle)
    if (!prefersReducedMotion) {
      window.setTimeout(() => {
        sparkleBurst(window.innerWidth * 0.5, 140, 10);
      }, 600);
    }
  }

  init();
})();
