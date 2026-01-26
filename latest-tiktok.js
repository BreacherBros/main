async function loadLatestTikTok() {
  try {
    console.log("Loading TikTok...");

    const res = await fetch("https://r6-api-backend.onrender.com/api/tiktok-latest");
    const data = await res.json();

    console.log("TIKTOK DATA:", data);

    if (!data || !data.video_url) {
      console.error("❌ No usable TikTok video URL in API", data);
      return;
    }

    const video = document.getElementById("tiktokVideo");
    const muteBtn = document.getElementById("tiktokMuteBtn");

    if (!video || !muteBtn) {
      console.error("❌ TikTok elements missing");
      return;
    }

    // Video setzen
    video.src = data.video_url;
    video.load();

    // Autoplay safe
    video.muted = true;
    video.play().catch(() => {});

    // Button State
    muteBtn.innerText = "🔇";

    // Toggle Mute
    muteBtn.addEventListener("click", () => {
      video.muted = !video.muted;

      if(video.muted){
        muteBtn.innerText = "🔇";
      } else {
        muteBtn.innerText = "🔊";
      }
    });

  } catch (e) {
    console.error("TikTok load error:", e);
  }
}

document.addEventListener("DOMContentLoaded", loadLatestTikTok);
