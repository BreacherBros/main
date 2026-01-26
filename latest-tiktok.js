document.addEventListener("DOMContentLoaded", () => {

  const video = document.getElementById("tiktokVideo");
  const muteBtn = document.getElementById("ttMute");
  const playBtn = document.getElementById("ttPlay");
  const wrapper = document.querySelector(".tiktok-video-wrapper");

  if (!video || !muteBtn || !playBtn || !wrapper) {
    console.error("TikTok elements not found in DOM");
    return;
  }

  let isLoaded = false;
  let isPlaying = true;
  let isMuted = true;

  // ==============================
  // Load latest TikTok from backend
  // ==============================
  async function loadTikTok() {
    if (isLoaded) return;

    try {
      const res = await fetch("https://r6-api-backend.onrender.com/api/tiktok-latest");
      const data = await res.json();

      if (!data || !data.video_url) {
        console.warn("No TikTok video found", data);
        return;
      }

      video.src = data.video_url;
      video.load();

      // autoplay safe
      video.muted = true;
      video.play().catch(()=>{});

      isLoaded = true;
      console.log("TikTok loaded");

    } catch (err) {
      console.error("TikTok load error:", err);
    }
  }

  // ==============================
  // Intersection Observer (Lazy Load + Pause)
  // ==============================
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        // sichtbar
        loadTikTok();
        if (isLoaded && isPlaying) {
          video.play().catch(()=>{});
        }
      } else {
        // nicht sichtbar
        if (isLoaded) {
          video.pause();
        }
      }
    });
  }, {
    threshold: 0.4
  });

  observer.observe(wrapper);

  // ==============================
  // Controls
  // ==============================

  // Mute Toggle
  muteBtn.addEventListener("click", () => {
    isMuted = !isMuted;
    video.muted = isMuted;
    muteBtn.textContent = isMuted ? "🔇" : "🔊";
  });

  // Play / Pause Toggle
  playBtn.addEventListener("click", () => {
    if (!isPlaying) {
      video.play().catch(()=>{});
      playBtn.textContent = "⏸";
      isPlaying = true;
    } else {
      video.pause();
      playBtn.textContent = "▶";
      isPlaying = false;
    }
  });

  // ==============================
  // Mobile tap to play
  // ==============================
  wrapper.addEventListener("click", () => {
    if (!isPlaying) {
      video.play().catch(()=>{});
      playBtn.textContent = "⏸";
      isPlaying = true;
    }
  });

});
