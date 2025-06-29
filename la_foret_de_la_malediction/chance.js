import { gameState } from "./scripts_forest.js";
import { updateCharacterStats } from "./character.js";
import { updateAdventureSheet } from "./inventory.js";

//function roll a dice
export function rollDice() {
    return Math.floor(Math.random() * 6) + 1;
}

//tempt your chance function
export function tempt_chance(chance) {
    let diceSum = rollDice() + rollDice();
    gameState.character.chance -= 1;
    gameState.character.chance = Math.max(0, gameState.character.chance);
    updateCharacterStats();
    updateAdventureSheet();
    if (diceSum <= chance) {
        console.log("Win - Rolled:", diceSum, "Chance:", chance);
        return true; // Win
    } else {
        console.log("Lose - Rolled:", diceSum, "Chance:", chance);
        return false; // Lose
    }
}

