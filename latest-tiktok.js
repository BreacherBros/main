async function loadLatestTikTok() {
  try {
    console.log("Loading TikTok...");

    const res = await fetch("https://r6-api-backend.onrender.com/api/tiktok-latest");
    const data = await res.json();

    console.log("TIKTOK DATA:", data);

    if (!data || !data.video_url) {
      console.error("No TikTok video_url", data);
      return;
    }

    const video = document.getElementById("tiktokVideo");

    if (!video) {
      console.error("❌ Video element #tiktokVideo not found in DOM");
      return;
    }

    video.src = data.video_url;
    video.muted = true;        // Autoplay Policy Fix
    video.loop = true;
    video.playsInline = true;

    video.load();

    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise.catch(err => {
        console.warn("Autoplay blocked by browser:", err);
      });
    }

  } catch (e) {
    console.error("TikTok load error:", e);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM loaded -> TikTok init");
  loadLatestTikTok();
});
