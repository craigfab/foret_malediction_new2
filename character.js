import { rollDice } from "./chance.js";
import { gameState } from "./scripts_forest.js";
import { playGameOverMusic, playVictoryMusic } from "./music.js";


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

    // Retourne l'habileté courante, en tenant compte des boosts et de l'épée enchantée
    getCurrentSkill() {
        let skill = this.skill; // ou this.baseSkill selon la logique souhaitée
        // Bonus temporaire (ex: potion d'adresse)
        if (this.hasBoost && this.hasBoost('skillPotionBoost')) {
            skill += 1;
        }
        // Bonus épée enchantée si présente dans l'équipement
        if (gameState.inventory && typeof gameState.inventory.checkItem === 'function') {
            if (gameState.inventory.checkItem("épée enchantée") > 0) {
                skill += 2;
            }
        }
        return skill;
    }

    // Retourne l'affichage détaillé de l'habileté avec tous les bonus
    getSkillDisplay() {
        let skill = this.skill;
        let skillDisplay = `Habileté:&nbsp;<strong>${this.getCurrentSkill()}</strong>`;
        
        // 2. Affichage du bonus épée enchantée (bonus permanent d'habileté)
        if (gameState.inventory && typeof gameState.inventory.checkItem === 'function') {
            if (gameState.inventory.checkItem("épée enchantée") > 0) {
                skillDisplay += ` <small>(+2 épée enchantée)</small>`;
            }
        }
        
        // 3. Affichage des boost actifs 
        if (this.hasBoost('skillPotionBoost')) {
            skillDisplay += ` <small>(Potion: +1, ${this.getBoostCombatsRemaining('skillPotionBoost')} combat(s))</small>`;
        }
        
        return skillDisplay;
    }
}

// Fonction pour déclencher le Game Over
export function triggerGameOver() {
    // Jouer la musique de Game Over
    playGameOverMusic();
    
    // Afficher GAME OVER dans la section Actions avec des emojis de mort
    const actionMessageDiv = document.getElementById('action_message');
    if (actionMessageDiv) {
        actionMessageDiv.innerHTML = '<h1 style="color: black; font-size: 3em; text-align: center; margin: 20px 0;">💀 GAME OVER ☠️</h1><p style="text-align: center; font-size: 1.2em;">💀 Votre endurance est tombée à 0. Votre aventure se termine ici. ☠️</p>';
    }
    
    // Changer l'image d'illustration
    const illustrationImg = document.getElementById('illustration');
    if (illustrationImg) {
        illustrationImg.src = 'images_foret/game_over_image_2.png';
        illustrationImg.alt = 'Game Over - Vous êtes mort';
    }
    
    // Bloquer tous les boutons de choix
    const choicesContainer = document.getElementById('choices');
    if (choicesContainer) {
        const choiceButtons = choicesContainer.getElementsByTagName('Button');
        for (let button of choiceButtons) {
            button.disabled = true;
            button.style.opacity = '0.5';
        }
    }
    
    // Bloquer tous les boutons de combat
    const attackButton = document.getElementById('attackButton');
    if (attackButton) attackButton.disabled = true;
    
    const temptChanceButton = document.getElementById('temptChanceButton');
    if (temptChanceButton) temptChanceButton.disabled = true;
    
    const noTemptChanceButton = document.getElementById('no_temptChanceButton');
    if (noTemptChanceButton) noTemptChanceButton.disabled = true;
    
    const escapeButton = document.getElementById('escapeButton');
    if (escapeButton) escapeButton.disabled = true;
    
    // Bloquer les boutons d'utilisation d'objets
    const useMealButton = document.getElementById('useMealButton');
    if (useMealButton) useMealButton.disabled = true;
    
    const usePotionAdresseButton = document.getElementById('usePotionAdresseButton');
    if (usePotionAdresseButton) usePotionAdresseButton.disabled = true;
    
    const usePotionVigueurButton = document.getElementById('usePotionVigueurButton');
    if (usePotionVigueurButton) usePotionVigueurButton.disabled = true;
    
    const usePotionBonneFortuneButton = document.getElementById('usePotionBonneFortuneButton');
    if (usePotionBonneFortuneButton) usePotionBonneFortuneButton.disabled = true;
    
    // Bloquer les boutons de prise d'objets
    const getItemContainer = document.getElementById('get_item');
    if (getItemContainer) {
        const itemButtons = getItemContainer.getElementsByTagName('Button');
        for (let button of itemButtons) {
            button.disabled = true;
            button.style.opacity = '0.5';
        }
    }
    
    // Marquer le state du jeu comme terminé
    gameState.gameOver = true;
}

// Fonction pour déclencher l'écran de victoire (fin réussie)
export function triggerVictory() {
    // Jouer la musique de victoire
    playVictoryMusic();
    // Afficher un message de VICTOIRE dans la section Actions avec des emojis positifs
    const actionMessageDiv = document.getElementById('action_message');
    if (actionMessageDiv) {
        actionMessageDiv.innerHTML = '<h1 style="color: black; font-size: 3em; text-align: center; margin: 20px 0;">🏆🌟 Vous avez réussi, votre quête est désormais terminée ! 🌟🏆</h1>';
    }

    // Ne pas marquer le jeu comme terminé et ne pas désactiver les boutons.
}


// Fonction pour calculer et formater les modificateurs de combat
function getCombatModifiersDisplay() {
    let modifiers = [];
    let totalModifier = 0;
    
    // Équipements bonus
    if (gameState.inventory.checkItem('casque en bronze')) {
        modifiers.push('+1 casque');
        totalModifier += 1;
    }
    if (gameState.inventory.checkItem('Bracelet d\'Habileté')) {
        modifiers.push('+1 bracelet');
        totalModifier += 1;
    }
    if (gameState.inventory.checkItem('gantelet d\'adresse à combattre')) {
        modifiers.push('+1 gantelet');
        totalModifier += 1;
    }
    
    // Malédictions
    if (gameState.inventory.checkItem('anneau de lenteur')) {
        modifiers.push('-2 anneau');
        totalModifier -= 2;
    }
    
    // Malus temporaires selon le chapitre
    if (gameState.currentChapterId === 49) {
        modifiers.push('-3 chapitre');
        totalModifier -= 3;
    }
    if (gameState.currentChapterId === 193) {
        modifiers.push('-3 tunnel');
        totalModifier -= 3;
    }
    
    if (modifiers.length > 0) {
        return `\n<small>(Combat: ${modifiers.join(', ')})</small>`;
    }
    return '';
}


//fonction mise à jour des caractéristiques personnage
export function updateCharacterStats() {
    let baliseSkillBox = document.getElementById("skill");
    let skillDisplay = gameState.character.getSkillDisplay();
    
    // Ajouter les modificateurs de combat séparément
    let combatModifiers = getCombatModifiersDisplay();
    if (combatModifiers) {
        skillDisplay += combatModifiers;
    }
    
    // Forcer l'affichage multiligne avec centrage relatif
    baliseSkillBox.style.alignItems = 'center';
    baliseSkillBox.style.whiteSpace = 'pre-line';
    baliseSkillBox.style.textAlign = 'center';
    baliseSkillBox.style.lineHeight = '1.2';
    baliseSkillBox.innerHTML = skillDisplay;

    let baliseHealthBox = document.getElementById("health");
    baliseHealthBox.innerHTML = `Endurance:&nbsp;<strong>${gameState.character.health}</strong>`;

    let baliseChanceBox = document.getElementById("chance");
    baliseChanceBox.innerHTML = `Chance:&nbsp;<strong>${gameState.character.chance}</strong>`;
    
    // Vérifier si l'endurance est à 0 ou inférieur pour déclencher le Game Over
    // Exception : ne pas déclencher Game Over au chapitre 0 ou si le personnage n'est pas initialisé
    if (gameState.character.health <= 0 && 
        gameState.currentChapterId !== 0 && 
        gameState.character.isInitialized) {
        triggerGameOver();
    }
}

