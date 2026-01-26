import express from "express";
import fetch from "node-fetch";

const router = express.Router();

// 🔁 DEIN APIFY DATASET URL (JSON)
const DATASET_URL = "HIER_DEINE_DATASET_JSON_URL_EINTRAGEN";

router.get("/tiktok-latest", async (req, res) => {
  try {
    const r = await fetch(DATASET_URL);
    const data = await r.json();

    if (!Array.isArray(data) || data.length === 0) {
      return res.status(404).json({ error: "No TikTok videos found" });
    }

    const video = data[0]; // neuestes Video

    const id = video.id;
    const caption = video.text || "";
    const thumbnail = video.videoMeta?.coverUrl || null;

    const permalink = `https://www.tiktok.com/@breacherbros/video/${id}`;

    res.json({
      id,
      caption,
      thumbnail,
      permalink
    });

  } catch (err) {
    res.status(500).json({
      error: "TikTok API error",
      details: err.message
    });
  }
});

export default router;
