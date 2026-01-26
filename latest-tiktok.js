console.log("🔥 latest-tiktok.js geladen");

let ttMuted = true;

async function loadLatestTikTok() {
  try {
    const res = await fetch("https://r6-api-backend.onrender.com/api/tiktok-latest");
    const data = await res.json();

    console.log("TIKTOK DATA:", data);

    if (!data.video_url) {
      console.error("❌ No video_url in API", data);
      return;
    }

    const video = document.getElementById("tiktokVideo");
    if (!video) return;

    video.src = data.video_url;
    video.muted = true;
    video.load();
    video.play().catch(()=>{});

  } catch (e) {
    console.error("TikTok error:", e);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  loadLatestTikTok();

  const btn = document.getElementById("ttMuteBtn");
  const video = document.getElementById("tiktokVideo");

  if(btn && video){
    btn.addEventListener("click", ()=>{
      ttMuted = !ttMuted;
      video.muted = ttMuted;
      btn.innerText = ttMuted ? "🔇" : "🔊";
    });
  }
});
