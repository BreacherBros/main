console.log("🔥 latest-tiktok.js wurde geladen");

let ttMuted = true;
let ttVideoId = null;

async function loadLatestTikTok() {
  try {
    console.log("Loading TikTok...");

    const res = await fetch("https://r6-api-backend.onrender.com/api/tiktok-latest");
    const data = await res.json();

    console.log("TIKTOK DATA:", data);

    if (!data.id) {
      console.error("❌ No TikTok ID in API", data);
      return;
    }

    ttVideoId = data.id;

    const frame = document.getElementById("tiktokFrame");
    if (!frame) return;

    // default muted
    frame.src = `https://www.tiktok.com/embed/v2/${ttVideoId}?muted=1`;

    console.log("✅ TikTok iframe geladen (muted)");

  } catch (e) {
    console.error("🔥 TikTok load error:", e);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  loadLatestTikTok();

  const btn = document.getElementById("ttMuteBtn");

  if(btn){
    btn.addEventListener("click", () => {
      if(!ttVideoId) return;

      const frame = document.getElementById("tiktokFrame");
      if(!frame) return;

      ttMuted = !ttMuted;

      if(ttMuted){
        frame.src = `https://www.tiktok.com/embed/v2/${ttVideoId}?muted=1`;
        btn.innerText = "🔇";
      }else{
        frame.src = `https://www.tiktok.com/embed/v2/${ttVideoId}?muted=0`;
        btn.innerText = "🔊";
      }
    });
  }
});
