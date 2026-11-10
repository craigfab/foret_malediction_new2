import { rollDice } from "./chance.js";
import { gameState } from "./scripts_collines.js";
import { playGameOverMusic, playVictoryMusic } from "./music.js";

// Armes connues : bonus de Force d'Attaque, dégâts infligés, et si c'est une épée
// (le Brassard d'Escrime de Ragnar ne fonctionne qu'avec une épée).
// L'arme utilisée est la première de cette liste présente dans l'inventaire.
export const WEAPONS = [
    { name: "glaive", attack: 1, damage: 2, sword: true },
    { name: "épée finement ciselée", attack: 0, damage: 3, sword: true },
    { name: "épée", attack: 0, damage: 2, sword: true },
    { name: "hache de Glandragor", attack: -1, damage: 2, sword: false },
];
const NO_WEAPON = { name: "aucune arme", attack: -4, damage: 2, sword: false };
const BRASSARD = "Brassard d'Escrime de Ragnar";
export const CURSE_SPIRIT = "malédiction de l'Esprit";

//create a character object
export class Character {
    constructor() {
        this.baseSkill = 0;
        this.baseHealth = 0;
        this.baseChance = 0;
        this.skill = 0;
        this._health = 0;
        this.chance = 0;
        this.role = null; // "guerrier" ou "sorcier"
        this.isInitialized = false;
    }

    // L'endurance passe par un accesseur : la malédiction de l'Esprit (paragraphe 124)
    // coûte 1 point de plus à chaque perte, sauf pour le coût d'une Formule Magique.
    get health() {
        return this._health;
    }

    set health(value) {
        if (value < this._health && !gameState.spellCasting && gameState.inventory
            && gameState.inventory.checkItem(CURSE_SPIRIT) > 0) {
            value -= 1;
        }
        this._health = value;
    }

    // Règles de Sorcellerie ! : HABILETÉ = 1 dé + 6 (Guerrier) ou + 4 (Sorcier),
    // ENDURANCE = 2 dés + 12, CHANCE = 1 dé + 6.
    initialize(role) {
        this.role = role;
        this.baseSkill = rollDice() + (role === "sorcier" ? 4 : 6);
        this.baseHealth = rollDice() + rollDice() + 12;
        this.baseChance = rollDice() + 6;
        this.skill = this.baseSkill;
        this._health = this.baseHealth;
        this.chance = this.baseChance;
        this.isInitialized = true;
    }

    isSorcerer() {
        return this.role === "sorcier";
    }

    // Arme utilisée au combat, avec le bonus éventuel du Brassard
    getWeapon() {
        const inv = gameState.inventory;
        const found = WEAPONS.find(w => inv && inv.checkItem(w.name) > 0) || NO_WEAPON;
        const weapon = { ...found };
        if (weapon.sword && inv && inv.checkItem(BRASSARD) > 0) {
            weapon.attack += 2;
            weapon.brassard = true;
        }
        return weapon;
    }

    getCurrentSkill() {
        return this.skill;
    }

    getSkillDisplay() {
        const weapon = this.getWeapon();
        let html = `<div class="skill-main">Habileté:&nbsp;<strong>${this.skill}</strong></div>`;
        const sign = weapon.attack > 0 ? "+" + weapon.attack : (weapon.attack < 0 ? String(weapon.attack) : "");
        const notes = [];
        if (sign) notes.push(`${sign} en Force d'Attaque`);
        if (weapon.damage !== 2) notes.push(`${weapon.damage} points de dégâts`);
        html += `<div class="combat-modifiers"><span class="skill-note">Arme : ${weapon.name}${notes.length ? " (" + notes.join(", ") + ")" : ""}</span></div>`;
        return html;
    }
}

function disableAll(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    for (const button of container.getElementsByTagName("button")) {
        button.disabled = true;
        button.style.opacity = "0.5";
    }
}

// Fonction pour déclencher le Game Over
export function triggerGameOver(reason) {
    if (gameState.gameOver) return;
    gameState.gameOver = true;
    playGameOverMusic();

    const actionMessageDiv = document.getElementById("action_message");
    if (actionMessageDiv) {
        const why = reason || (gameState.character.health <= 0
            ? "Votre endurance est tombée à 0. Votre aventure se termine ici."
            : "Votre aventure se termine ici.");
        actionMessageDiv.innerHTML = `<h1 style="color: black; font-size: 3em; text-align: center; margin: 20px 0;">💀 GAME OVER ☠️</h1><p style="text-align: center; font-size: 1.2em;">💀 ${why} ☠️</p>`;
    }

    const illustrationImg = document.getElementById("illustration");
    if (illustrationImg) {
        illustrationImg.src = "images_collines/game_over_image_2.png";
        illustrationImg.alt = "Game Over - Vous êtes mort";
    }

    ["choices", "get_item", "tempt_chance_button", "meal_zone", "manualAdjust"].forEach(disableAll);
    ["attackButton", "temptChanceButton", "no_temptChanceButton", "roll_dice", "invokeLibraButton", "usePotionButton"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.disabled = true;
    });
}

// Fonction pour déclencher l'écran de victoire (fin réussie)
export function triggerVictory() {
    playVictoryMusic();
    const actionMessageDiv = document.getElementById("action_message");
    if (actionMessageDiv) {
        actionMessageDiv.innerHTML = '<h1 style="color: black; font-size: 2.2em; text-align: center; margin: 20px 0;">🏆🌟 Vous avez traversé les collines de Shamutanti ! 🌟🏆</h1><p style="text-align: center; font-size: 1.2em;">Notez vos points, votre Or et vos objets : ils vous serviront dans la suite de votre quête, à Kharé.</p>';
    }
}

//fonction mise à jour des caractéristiques personnage
export function updateCharacterStats() {
    const c = gameState.character;
    document.getElementById("skill").innerHTML = c.getSkillDisplay();
    document.getElementById("health").innerHTML = `Endurance:&nbsp;<strong>${c.health}</strong>${c.isInitialized ? `&nbsp;/&nbsp;${c.baseHealth}` : ""}`;
    document.getElementById("chance").innerHTML = `Chance:&nbsp;<strong>${c.chance}</strong>${c.isInitialized ? `&nbsp;/&nbsp;${c.baseChance}` : ""}`;

    // Game Over si l'endurance tombe à 0 (sauf avant la création du personnage)
    if (c.health <= 0 && gameState.currentChapterId !== 0 && c.isInitialized) {
        triggerGameOver();
    }
}
