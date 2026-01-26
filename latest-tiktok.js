async function loadLatestTikTok() {
  try {
    console.log("Loading TikTok...");

    const res = await fetch("https://r6-api-backend.onrender.com/api/tiktok-latest");
    const data = await res.json();

    console.log("TIKTOK DATA:", data);

    // flexible Feldnamen
    const url =
      data.video_url ||
      data.videoUrl ||
      data.play ||
      data.downloadUrl ||
      data.url;

    if (!url) {
      console.error("❌ No usable TikTok video URL in API", data);
      return;
    }

    const video = document.getElementById("tiktokVideo");

    if (!video) {
      console.error("❌ Video element #tiktokVideo not found");
      return;
    }

    video.src = url;
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.autoplay = true;

    video.load();

    video.play().catch(err => {
      console.warn("⚠️ Autoplay blocked:", err);
    });

    console.log("✅ TikTok video loaded");

  } catch (e) {
    console.error("🔥 TikTok load error:", e);
  }
}

document.addEventListener("DOMContentLoaded", loadLatestTikTok);
