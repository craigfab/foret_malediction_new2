import { gameState } from "./scripts_collines.js";
import { updateCharacterStats } from "./character.js";

//function roll a dice
export function rollDice() {
    return Math.floor(Math.random() * 6) + 1;
}

// Tentez votre Chance : 2 dés <= CHANCE, puis la CHANCE baisse d'un point.
// L'amulette Porte-Bonheur (paragraphe 177) retire 1 point au résultat des dés.
// free = true : le test ne coûte pas de point de CHANCE (paragraphe 218).
export function tempt_chance(chance, free = false) {
    let diceSum = rollDice() + rollDice();
    if (gameState.inventory && gameState.inventory.checkItem("amulette Porte-Bonheur") > 0) {
        diceSum -= 1;
    }
    if (!free) {
        gameState.character.chance = Math.max(0, gameState.character.chance - 1);
        updateCharacterStats();
    }
    gameState.lastLuckRoll = diceSum;
    return diceSum <= chance;
}
