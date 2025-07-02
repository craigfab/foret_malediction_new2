import { rollDice } from "./chance.js";
import { gameState } from "./scripts_forest_test.js";


//create a character object
export class Character {
    constructor(baseSkill, baseHealth, baseChance, Skill, Health, Chance) {
        this.baseSkill = baseSkill;
        this.baseHealth = baseHealth;
        this.baseChance = baseChance;
        this.skill = baseSkill; // Initial skill is the same as base skill
        this.health = baseHealth; // Initial health is the same as base health
        this.chance = baseChance; // Initial chance is the same as base chance
    }
    initialize() {
        this.baseSkill = rollDice() + 6;
        this.baseHealth = rollDice() * 2 + 6;
        this.baseChance = rollDice() + 6;
        this.skill = this.baseSkill;
        this.health = this.baseHealth;
        this.chance = this.baseChance;
    }
}

//fonction mise à jour des caractéristiques personnage
export function updateCharacterStats() {
    let baliseSkillBox = document.getElementById("skill");
    baliseSkillBox.innerHTML = `Habileté: ${gameState.character.skill}`;

    let baliseHealthBox = document.getElementById("health");
    baliseHealthBox.innerHTML = `Endurance: ${gameState.character.health}`;

    let baliseChanceBox = document.getElementById("chance");
    baliseChanceBox.innerHTML = `Chance: ${+gameState.character.chance}`;
} 