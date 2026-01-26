console.log("🔥 latest-tiktok.js wurde geladen");

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

    const frame = document.getElementById("tiktokFrame");

    if (!frame) {
      console.error("❌ tiktokFrame not found");
      return;
    }

    // offizieller TikTok Embed
    frame.src = `https://www.tiktok.com/embed/v2/${data.id}`;

    console.log("✅ TikTok iframe geladen");

  } catch (e) {
    console.error("🔥 TikTok load error:", e);
  }
}

document.addEventListener("DOMContentLoaded", loadLatestTikTok);
