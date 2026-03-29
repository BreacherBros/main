import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import youtubeRoutes from "./youtube.js";
import tiktokRoutes from "./tiktok.js";

const app = express();

/* ============================= */
/* 🔥 CORS */
/* ============================= */
app.use(cors({
  origin: (origin, callback) => {
    const allowed = [
      "https://breacherbros.com",
      "https://www.breacherbros.com"
    ];

    if (!origin || allowed.includes(origin)) {
      callback(null, true);
    } else {
      console.log("❌ Blocked by CORS:", origin);
      callback(null, true);
    }
  }
}));

app.use(express.json());

app.use("/api", youtubeRoutes);
app.use("/api", tiktokRoutes);

app.get("/", (req, res) => {
  res.send("Backend running");
});

const API_KEY = process.env.API_KEY;

/* ============================= */
/* 🔥 PEAK FUNCTION */
/* ============================= */
function getHighestRank(history) {
  if (!Array.isArray(history)) return null;

  let best = null;

  for (const entry of history) {
    const d = entry?.[1];
    if (!d?.value) continue;

    if (!best || d.value > best.value) {
      best = d;
    }
  }

  if (!best) return null;

  return {
    mmr: best.value,
    rank: best.metadata?.rank || "UNKNOWN",
    image: best.metadata?.imageUrl || null,
    color: best.metadata?.color || "#fff"
  };
}

/* ============================= */
/* 🔥 HELPERS */
/* ============================= */
const calcKD = (k, d) => {
  if (!k || !d || d === 0) return null;
  return (k / d).toFixed(2);
};

const getRankName = (rank) => {
  if (rank == null) return "UNRANKED";
  if (rank >= 25) return "CHAMPION";
  if (rank >= 20) return "DIAMOND";
  if (rank >= 15) return "EMERALD";
  if (rank >= 10) return "PLATINUM";
  if (rank >= 5) return "GOLD";
  return "SILVER";
};

/* ============================= */
/* 🔥 API */
/* ============================= */
app.get("/api/stats", async (req, res) => {
  try {
    const { nameOnPlatform, platformType } = req.query;

    if (!nameOnPlatform || !platformType) {
      return res.status(400).json({ error: "Missing parameters" });
    }

    if (!API_KEY) {
      return res.status(500).json({ error: "API KEY missing" });
    }

    const platformMap = {
      psn: "psn",
      xbox: "xbl",
      xbl: "xbl",
      pc: "uplay",
      uplay: "uplay"
    };

    const apiPlatform = platformMap[platformType.toLowerCase()];
    if (!apiPlatform) {
      return res.status(400).json({ error: "Invalid platform" });
    }

    const isPC = apiPlatform === "uplay";

    const statsUrl = `https://r6data.eu/api/stats?type=stats&nameOnPlatform=${encodeURIComponent(nameOnPlatform)}&platformType=${apiPlatform}&platform_families=${isPC ? "pc" : "console"}`;

    const historyUrl = `https://r6data.eu/api/stats?type=history&nameOnPlatform=${encodeURIComponent(nameOnPlatform)}&platformType=${apiPlatform}`;

    /* ============================= */
    /* 🔥 PARALLEL FETCH (FASTER) */
    /* ============================= */
    const [statsRes, historyRes] = await Promise.all([
      fetch(statsUrl, { headers: { "api-key": API_KEY } }),
      fetch(historyUrl, { headers: { "api-key": API_KEY } }).catch(() => null)
    ]);

    const statsData = await statsRes.json();

    if (!statsRes.ok || !statsData?.platform_families_full_profiles) {
      return res.json({ ranked: null, casual: null });
    }

    /* ============================= */
    /* 🔥 PEAK */
/* ============================= */
    let bestRank = null;

    if (historyRes) {
      try {
        const historyJson = await historyRes.json();
        const historyArray = historyJson?.data?.history?.data || [];
        bestRank = getHighestRank(historyArray);
      } catch {}
    }

    /* ============================= */
    /* 🔥 PARSE DATA */
/* ============================= */
    const root = statsData.platform_families_full_profiles[0];
    const boards = root?.board_ids_full_profiles || [];

    const rankedBoard = boards.find(b =>
      ["pvp_ranked", "ranked"].includes(b.board_id)
    );

    const casualBoard = boards.find(b =>
      ["pvp_casual", "standard"].includes(b.board_id)
    );

    const rankedProfile = rankedBoard?.full_profiles?.[0]?.profile || {};
    const rankedStats = rankedBoard?.full_profiles?.[0]?.season_statistics || {};

    const casualProfile = casualBoard?.full_profiles?.[0]?.profile || {};
    const casualStats = casualBoard?.full_profiles?.[0]?.season_statistics || {};

    /* ============================= */
    /* 🔥 OUTPUT */
/* ============================= */
    const ranked = {
      username: nameOnPlatform,
      platform: apiPlatform.toUpperCase(),

      kills: rankedStats.kills ?? rankedProfile.kills ?? 0,
      deaths: rankedStats.deaths ?? rankedProfile.deaths ?? 0,
      kd: calcKD(
        rankedStats.kills ?? rankedProfile.kills,
        rankedStats.deaths ?? rankedProfile.deaths
      ),

      wins: rankedStats.match_outcomes?.wins ?? rankedProfile.wins ?? 0,
      losses: rankedStats.match_outcomes?.losses ?? rankedProfile.losses ?? 0,

      rank: getRankName(rankedProfile.rank),
      mmr: rankedProfile.rank_points ?? 0,

      bestRank: bestRank?.rank,
      bestMMR: bestRank?.mmr,
      bestRankImg: bestRank?.image,
      bestRankColor: bestRank?.color
    };

    const casual = {
      username: nameOnPlatform,
      platform: apiPlatform.toUpperCase(),

      kills: casualStats.kills ?? casualProfile.kills ?? 0,
      deaths: casualStats.deaths ?? casualProfile.deaths ?? 0,
      kd: calcKD(
        casualStats.kills ?? casualProfile.kills,
        casualStats.deaths ?? casualProfile.deaths
      ),

      wins: casualStats.match_outcomes?.wins ?? casualProfile.wins ?? 0,
      losses: casualStats.match_outcomes?.losses ?? casualProfile.losses ?? 0,

      rank: "UNRANKED",
      mmr: null
    };

    res.setHeader("Cache-Control", "no-store");
    res.json({ ranked, casual });

  } catch (err) {
    console.error("❌ BACKEND CRASH:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ============================= */
/* 🔥 START */
/* ============================= */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Backend running on port", PORT);
});
