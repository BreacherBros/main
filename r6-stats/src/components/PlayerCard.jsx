export default function PlayerCard({ player }) {
  return (
    <div
      style={{
        border: `2px solid ${player.accent}`,
        borderRadius: 12,
        padding: 16
      }}
    >
      <h3>{player.name}</h3>
      <p>Level: {player.level}</p>
      <p>K/D: {player.kd}</p>
      <p>Matches: {player.matches}</p>
      <p>Wins: {player.wins}</p>
    </div>
  );
}
