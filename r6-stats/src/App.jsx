import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { RefreshCw, AlertCircle } from "lucide-react";
import { fetchPlayers } from "./api/r6data";
import PlayerCard from "./components/PlayerCard";

export default function App() {
  const {
    data = [],
    isLoading,
    error,
    refetch,
    isFetching
  } = useQuery({
    queryKey: ["playerStats"],
    queryFn: fetchPlayers,
    refetchInterval: 30000
  });

  return (
    <div style={{ minHeight: "100vh", background: "#020617", color: "white" }}>
      <header style={{ padding: 16, display: "flex", justifyContent: "space-between" }}>
        <div>
          <h2>Spieler Stats</h2>
          <small>Rainbow Six Siege • PSN</small>
        </div>

        <motion.button
          onClick={refetch}
          disabled={isFetching}
          whileTap={{ scale: 0.9 }}
        >
          <RefreshCw
            size={18}
            className={isFetching ? "spin" : ""}
          />
        </motion.button>
      </header>

      <main style={{ padding: 16, display: "grid", gap: 16 }}>
        {error && (
          <div>
            <AlertCircle /> Fehler beim Laden
          </div>
        )}

        {isLoading && <p>Lade Stats…</p>}

        {!isLoading &&
          data.map(player => (
            <PlayerCard key={player.id} player={player} />
          ))}
      </main>
    </div>
  );
}
