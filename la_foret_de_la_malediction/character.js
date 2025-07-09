import { rollDice } from "./chance.js";
import { gameState } from "./scripts_forest.js";


//create a character object
export class Character {
    constructor(baseSkill, baseHealth, baseChance, Skill, Health, Chance) {
        this.baseSkill = baseSkill;
        this.baseHealth = baseHealth;
        this.baseChance = baseChance;
        this.skill = baseSkill; // Initial skill is the same as base skill
        this.health = baseHealth; // Initial health is the same as base health
        this.chance = baseChance; // Initial chance is the same as base chance
        this.isInitialized = false; // Ajout de la propriété d'initialisation
        
        // Ajout du système de boost temporaires
        this.boost = {
            skillPotionBoost: 0, // Nombre de combats restants avec +1 force d'attaque
            // Ici on pourra ajouter d'autres boost temporaires comme :
            // strengthPotionBoost: 0,
            // defensePotionBoost: 0,
            // magicBoost: 0,
            // etc.
        };
    }
    
    initialize() {
        this.baseSkill = rollDice() + 6;
        this.baseHealth = rollDice() * 2 + 6;
        this.baseChance = rollDice() + 6;
        this.skill = this.baseSkill;
        this.health = this.baseHealth;
        this.chance = this.baseChance;
    }

    // Nouvelle méthode pour appliquer un boost temporaire
    applyTemporaryBoost(boostType, combatCount) {
        if (this.boost.hasOwnProperty(boostType)) {
            this.boost[boostType] = combatCount;
            return true;
        }
        return false;
    }

    // Nouvelle méthode pour décrémenter les boost après un combat
    decrementBoosts() {
        let expiredBoosts = [];
        
        for (let boostType in this.boost) {
            if (this.boost[boostType] > 0) {
                this.boost[boostType]--;
                if (this.boost[boostType] === 0) {
                    expiredBoosts.push(boostType);
                }
            }
        }
        
        return expiredBoosts; // Retourne les boost qui viennent d'expirer
    }

    // Méthode pour vérifier si un boost est actif
    hasBoost(boostType) {
        return this.boost[boostType] > 0;
    }

    // Méthode pour obtenir le nombre de combats restants pour un boost
    getBoostCombatsRemaining(boostType) {
        return this.boost[boostType] || 0;
    }
}

//fonction mise à jour des caractéristiques personnage
export function updateCharacterStats() {
    let baliseSkillBox = document.getElementById("skill");
    let skillDisplay = `Habileté: ${gameState.character.skill}`;
    
    // Affichage des boost actifs
    if (gameState.character.hasBoost('skillPotionBoost')) {
        skillDisplay += ` (Potion: +1 attaque, ${gameState.character.getBoostCombatsRemaining('skillPotionBoost')} combat(s))`;
    }
    
    baliseSkillBox.innerHTML = skillDisplay;

    let baliseHealthBox = document.getElementById("health");
    baliseHealthBox.innerHTML = `Endurance: ${gameState.character.health}`;

    let baliseChanceBox = document.getElementById("chance");
    baliseChanceBox.innerHTML = `Chance: ${gameState.character.chance}`;
}

