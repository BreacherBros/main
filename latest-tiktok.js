async function loadLatestTikTok() {
  try {
    const res = await fetch("https://r6-api-backend.onrender.com/api/tiktok-latest");
    const data = await res.json();

    console.log("TIKTOK DATA:", data);

    if (!data || !data.video_url) {
      console.error("No TikTok video_url", data);
      return;
    }

    const video = document.getElementById("tiktokVideo");

    if (!video) {
      console.error("Video element not found");
      return;
    }

    video.src = data.video_url;
    video.load();

    video.play().catch(err => {
      console.warn("Autoplay blocked:", err);
    });

  } catch (e) {
    console.error("TikTok load error:", e);
  }
}

document.addEventListener("DOMContentLoaded", loadLatestTikTok);
