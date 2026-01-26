let ttMuted = true;
let ttId = null;

async function loadLatestTikTok() {
  try {
    console.log("Loading TikTok...");

    const res = await fetch("https://r6-api-backend.onrender.com/api/tiktok-latest");
    const data = await res.json();

    console.log("TIKTOK DATA:", data);

    if (!data || !data.id) {
      console.error("❌ No TikTok ID", data);
      return;
    }

    ttId = data.id;

    const frame = document.getElementById("tiktokFrame");
    const btn = document.getElementById("tiktokMuteBtn");

    // load muted autoplay
    frame.src = `https://www.tiktok.com/embed/v2/${ttId}?autoplay=1&muted=1`;

    btn.innerText = "🔇";

    btn.onclick = () => {
      ttMuted = !ttMuted;

      if(ttMuted){
        frame.src = `https://www.tiktok.com/embed/v2/${ttId}?autoplay=1&muted=1`;
        btn.innerText = "🔇";
      }else{
        frame.src = `https://www.tiktok.com/embed/v2/${ttId}?autoplay=1&muted=0`;
        btn.innerText = "🔊";
      }
    };

  } catch (e) {
    console.error("TikTok load error:", e);
  }
}

document.addEventListener("DOMContentLoaded", loadLatestTikTok);
