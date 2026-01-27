console.log("🔥 latest-tiktok.js geladen");

const muteBtn = document.getElementById("ttMuteBtn");

muteBtn.addEventListener("click", () => {
  const iframe = document.getElementById("tiktokFrame");

  if(!hasInteracted){
    // erster Klick = echtes Unmute (Browser erlaubt Sound)
    iframe.src = tiktokURL.replace("mute=1","mute=0");
    muteBtn.textContent = "🔊";
    isMuted = false;
    hasInteracted = true;
    return;
  }

  // danach nur UX-State (kein Reload mehr!)
  if(isMuted){
    muteBtn.textContent = "🔊";
    isMuted = false;
  }else{
    muteBtn.textContent = "🔇";
    isMuted = true;
  }
});

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
    if (!frame) {
      console.error("❌ iframe not found");
      return;
    }

    // Embed Player
    frame.src = `https://www.tiktok.com/embed/v2/${ttVideoId}?autoplay=1&muted=0&loop=1`;

    console.log("✅ TikTok iframe loaded");

  } catch (e) {
    console.error("🔥 TikTok load error:", e);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  loadLatestTikTok();

const iframe = document.getElementById("tiktokFrame");
const muteBtn = document.getElementById("ttMuteBtn");

let isMuted = true;
let isPlaying = true;

muteBtn.addEventListener("click", () => {
  if (!iframe) return;

  const src = iframe.src.split("?")[0];
  const params = new URLSearchParams(iframe.src.split("?")[1]);

  if (isMuted) {
    params.set("muted", "0");
    muteBtn.innerText = "🔊";
  } else {
    params.set("muted", "1");
    muteBtn.innerText = "🔇";
  }

  iframe.src = `${src}?${params.toString()}`;
  isMuted = !isMuted;
});
  }
});
