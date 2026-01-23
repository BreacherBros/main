async function loadLatestReel(){
  try {
    const res = await fetch("https://r6-api-backend.onrender.com/api/instagram-latest");
    const data = await res.json();

    const container = document.getElementById("latest-reel");

    if(!data.video_url){
      container.innerHTML = "<p style='color:#888;text-align:center;'>Kein Reel gefunden</p>";
      return;
    }

    container.innerHTML = `
      <video 
        src="${data.video_url}" 
        controls 
        autoplay 
        muted 
        loop
        playsinline
        style="width:100%;border-radius:14px;">
      </video>
    `;

  } catch(err){
    document.getElementById("latest-reel").innerHTML =
      "<p style='color:#888;text-align:center;'>Reel konnte nicht geladen werden</p>";
  }
}

loadLatestReel();
