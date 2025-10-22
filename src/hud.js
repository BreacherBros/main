export function updateHUD(player, hud, level) {
    hud.health.innerText = `Leben: ${Math.max(player.health,0)}`;
    hud.ability.innerText = `Fähigkeit: ${player.ability}`;
    hud.level.innerText = `Level: ${level}`;
}
