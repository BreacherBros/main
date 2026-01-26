async function loadLatestTikTok() {
  try {
    const res = await fetch("https://r6-api-backend.onrender.com/api/tiktok-latest");
    const data = await res.json();

    console.log("TikTok API:", data);

    if (!data.video_url) {
      console.log("Kein TikTok gefunden");
      return;
    }

    const video = document.getElementById("tiktokVideo");
    video.src = data.video_url;
    video.load();

    // autoplay trigger
    video.play().catch(()=>{});

  } catch (err) {
    console.error("TikTok Load Error:", err);
  }
}

document.addEventListener("DOMContentLoaded", loadLatestTikTok);
