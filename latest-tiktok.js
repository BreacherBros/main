console.log("🔥 latest-video.js wurde geladen");

async function loadLatestVideo() {
  try {
    console.log("🚀 loadLatestVideo gestartet");

    const res = await fetch("https://r6-api-backend.onrender.com/api/youtube-latest");
    const data = await res.json();

    console.log("📡 API DATA:", data);

    if (!data.videoId) {
      console.warn("❌ Kein Video gefunden");
      return;
    }

    const frame = document.getElementById("latestVideoFrame");

    if (!frame) {
      console.error("❌ latestVideoFrame nicht gefunden");
      return;
    }

    frame.src = `https://www.youtube.com/embed/${data.videoId}?autoplay=1&mute=1`;

  } catch (err) {
    console.error("🔥 YouTube load error:", err);
  }
}

document.addEventListener("DOMContentLoaded", loadLatestVideo);
