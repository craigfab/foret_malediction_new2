import { gameState } from "./scripts_forest_test.js";
import { rollDice, tempt_chance } from "./chance.js";
import { updateCharacterStats } from "./character_test.js";
import { updateAdventureSheet } from "./inventory.js";

// Fonction pour appliquer les effets d'un chapitre sur le personnage ou l'inventaire
export function applyChapterEffects(chapter) {
    const effectMessageDiv = document.getElementById('effect_message'); // Obtenez la référence une fois pour toutes
    effectMessageDiv.innerHTML = ''; // Réinitialiser le contenu pour de nouveaux effets

    if (chapter.effects) {
        chapter.effects.forEach(effect => {
            let message = ''; // Initialisez un message vide qui sera rempli selon l'effet

            switch (effect.type) {
                case "gameOver":
                    message = '<strong>GAME OVER</strong>';
                    break;
                case "reduceSkill":
                    gameState.character.skill -= effect.value;
                    message = `Habileté réduite de ${effect.value}.`;
                    break;
                case "reduceHealth":
                    gameState.character.health -= effect.value;
                    message = `Santé réduite de ${effect.value}.`;
                    break;
                case "reduceChance":
                    gameState.character.chance -= effect.value;
                    message = `Chance réduite de ${effect.value}.`;
                    break;
                case "reduceGold":
                    gameState.inventory.removeItem('or', effect.value);
                    message = `${effect.value} pièces d'or retirées.`;
                    break;
                case "removeItem":
                    gameState.inventory.removeItem(effect.itemName, effect.quantity);
                    message = `${effect.quantity} ${effect.itemName} retiré(s).`;
                    break;
                case "useAndRemoveItem":
                    gameState.inventory.removeItem(effect.itemName, effect.quantity);
                    message = `Utilisation et retrait de ${effect.quantity} ${effect.itemName}.`;
                    break;
                case "gainSkill":
                    gameState.character.skill += effect.value;
                    message = `Habileté augmentée de ${effect.value}.`;
                    break;
                case "gainHealth":
                    gameState.character.health += effect.value;
                    message = `Santé augmentée de ${effect.value}.`;
                    break;
                case "gainGold":
                    gameState.inventory.addItem('or', effect.value, 'gold');
                    message = `${effect.value} pièces d'or ajoutées.`;
                    break;
                case "gainChance":
                    gameState.character.chance += effect.value;
                    message = `Chance augmentée de ${effect.value}.`;
                    break;
                case "rollDiceSkill":
                    rollDiceSkill();
                    message = `Lancer de dés pour tester l'habileté.`;
                    break;
                case "rollDiceChance":
                    rollDiceChance();
                    break;
                case "doubleRollDiceChance":
                    doubleRollDiceChance();
                    break;
                case "tryLuckTrap":
                    const luckTestResult = tempt_chance(gameState.character.chance);
                    if (luckTestResult) {
                        gameState.character.health -= effect.luckyOutcome.reduceHealth;
                        message = effect.luckyOutcome.message;
                    } else {
                        gameState.character.health -= effect.unluckyOutcome.reduceHealth;
                        message = effect.unluckyOutcome.message;
                    }
                    break;
                case "multipleRollDiceSkill":
                    multipleRollDiceSkill();
                    message = `Multiples lancers de dés pour tester l'habileté.`;
                    break;
                case "reduceAllGoldOrRemoveTwoItems":
                    goldOrItem({
                        goldToRemove: gameState.inventory.checkItem('or'),
                        itemsToRemove: 2
                    });
                    message = `Choisir entre perdre tout l'or ou retirer 2 équipements.`;
                    break;
                case "reduceFiveGoldOrRemoveOneItem":
                    goldOrItem({ goldToRemove: 5, itemsToRemove: 1});
                    break;
                case "reduceFood":
                    message = reduceFood(effect.value);
                    break;
                case "takeItem":
                    takeItem(effect.itemName, effect.quantity, effect.category, effect.goldValue);
                    break;
                default:
                    message = "Effet inconnu appliqué.";
            }

            // Mise à jour des statistiques du personnage et de la feuille d'aventure après chaque effet
            updateCharacterStats();
            updateAdventureSheet();

            // Affiche le message pour cet effet
            if (message !== '') {
                effectMessageDiv.innerHTML += `<p>${message}</p>`;
            }
        });
    }
}

// fonction gold or items
function goldOrItem(options) {
    const { goldToRemove = 0, itemsToRemove = 0 } = options;
    const actionMessageDiv = document.getElementById('action_message');
    
    // Réinitialiser la condition
    gameState.conditionMet = false;
    
    actionMessageDiv.innerHTML = 'Que voulez-vous faire ?<br>';

    // Bouton pour retirer une quantité spécifique d'or
    if (goldToRemove > 0) {
        const slashGold = document.createElement('button');
        slashGold.innerText = `Perdre ${goldToRemove} pièces d'or`;
        slashGold.addEventListener('click', () => {
            console.log(`Clic sur perdre ${goldToRemove} pièces d'or`);
            if (gameState.inventory.checkItem('or') >= goldToRemove) {
                gameState.inventory.removeItem('or', goldToRemove);
                actionMessageDiv.innerHTML = `<strong>Vous avez perdu ${goldToRemove} pièces d'or.</strong>`;
                gameState.conditionMet = true; // Condition remplie directement
            } else {
                actionMessageDiv.innerHTML = `<strong>Vous n'avez pas assez de pièces d'or.</strong>`;
            }
            updateAdventureSheet();
            updateChoiceButtons();
        });
        actionMessageDiv.appendChild(slashGold);
    }

    // Bouton pour retirer une quantité spécifique d'équipements
    if (itemsToRemove > 0) {
        const slashItems = document.createElement('button');
        slashItems.innerText = `Retirer ${itemsToRemove} équipement(s)`;
        slashItems.addEventListener('click', () => {
            console.log(`Clic sur retirer ${itemsToRemove} équipement(s)`);
            const equipment = gameState.inventory.items.filter(item => item.category === 'equipment');
            if (equipment.length < itemsToRemove) {
                actionMessageDiv.innerHTML = `<strong>Vous n'avez pas assez d'équipements à retirer.</strong>`;
                return;
            }
            actionMessageDiv.innerHTML = `Veuillez choisir ${itemsToRemove} équipement(s) à retirer:<br>`;
            displayEquipmentChoices(actionMessageDiv, itemsToRemove, () => {
                gameState.conditionMet = true; // Condition remplie directement
                updateChoiceButtons();
            });
        });
        actionMessageDiv.appendChild(slashItems);
    }
}

function displayEquipmentChoices(actionMessageDiv, itemsToRemove) {
    let itemsRemoved = 0; // Compteur local pour suivre les retraits
    const equipment = gameState.inventory.items.filter(item => item.category === 'equipment');

    equipment.forEach(item => {
        const itemButton = document.createElement('button');
        itemButton.innerText = item.name;
        itemButton.addEventListener('click', function () {
            console.log(`Clic sur retirer ${item.name}`);
            gameState.inventory.removeItem(item.name, 1, 'equipment');
            itemsRemoved++;
            this.remove(); // Supprime le bouton de l'équipement sélectionné
            updateAdventureSheet();

            if (itemsRemoved >= itemsToRemove) {
                actionMessageDiv.innerHTML += `<br><strong>Vous avez retiré ${itemsRemoved} équipement(s).</strong>`;
            }
        });
        actionMessageDiv.appendChild(itemButton);
    });
}

function doubleRollDiceChance() {
    const temptChanceButton = document.getElementById('tempt_chance_button');
    const rollDiceButton = document.getElementById('roll_dice');
    const zoneResultDice = document.getElementById('zone_result_dice');
    const actionMessageDiv = document.getElementById('action_message');

    // Réinitialiser les messages
    zoneResultDice.innerHTML = '';
    actionMessageDiv.innerHTML = '';

    // Afficher le bouton de lancer de dés
    rollDiceButton.style.display = 'block';

    // Compteur pour suivre le nombre de lancers
    let rollCount = 0;
    let firstRollSuccessful = false;

    rollDiceButton.onclick = function() {
        rollCount++;
        const diceRoll = rollDice() + rollDice();

        if (rollCount === 1) {
            // Premier lancer
            if (diceRoll <= gameState.character.chance) {
                firstRollSuccessful = true;
                zoneResultDice.innerHTML = `Premier test : ${diceRoll} ≤ ${gameState.character.chance} (Réussi)<br>`;
            } else {
                firstRollSuccessful = false;
                zoneResultDice.innerHTML = `Premier test : ${diceRoll} > ${gameState.character.chance} (Échoué)<br>`;
            }
        } else if (rollCount === 2) {
            // Deuxième lancer
            if (diceRoll <= gameState.character.chance) {
                zoneResultDice.innerHTML += `Deuxième test : ${diceRoll} ≤ ${gameState.character.chance} (Réussi)`;
                gameState.isLucky = firstRollSuccessful;
            } else {
                zoneResultDice.innerHTML += `Deuxième test : ${diceRoll} > ${gameState.character.chance} (Échoué)`;
                gameState.isLucky = false;
            }

            // Cacher le bouton après le deuxième lancer
            rollDiceButton.style.display = 'none';
            
            // Mettre à jour les boutons de choix
            updateChoiceButtons();

            // Réduire la chance
            gameState.character.chance--;
            updateCharacterStats();
        }
    };
}

function rollDiceChance() {
    const temptChanceButton = document.getElementById('tempt_chance_button');
    const rollDiceButton = document.getElementById('roll_dice');
    const zoneResultDice = document.getElementById('zone_result_dice');
    const actionMessageDiv = document.getElementById('action_message');

    // Réinitialiser les messages
    zoneResultDice.innerHTML = '';
    actionMessageDiv.innerHTML = '';

    // Afficher le bouton de lancer de dés
    rollDiceButton.style.display = 'block';

    rollDiceButton.onclick = function() {
        const diceRoll = rollDice() + rollDice();
        
        if (diceRoll <= gameState.character.chance) {
            zoneResultDice.innerHTML = `Test : ${diceRoll} ≤ ${gameState.character.chance} (Réussi)`;
            gameState.isLucky = true;
        } else {
            zoneResultDice.innerHTML = `Test : ${diceRoll} > ${gameState.character.chance} (Échoué)`;
            gameState.isLucky = false;
        }

        // Cacher le bouton après le lancer
        rollDiceButton.style.display = 'none';
        
        // Mettre à jour les boutons de choix
        updateChoiceButtons();

        // Réduire la chance
        gameState.character.chance--;
        updateCharacterStats();
    };
}

function rollDiceSkill() {
    const rollDiceButton = document.getElementById('roll_dice');
    const zoneResultDice = document.getElementById('zone_result_dice');
    const actionMessageDiv = document.getElementById('action_message');

    // Réinitialiser les messages
    zoneResultDice.innerHTML = '';
    actionMessageDiv.innerHTML = '';

    // Afficher le bouton de lancer de dés
    rollDiceButton.style.display = 'block';

    rollDiceButton.onclick = function() {
        const diceRoll = rollDice() + rollDice();
        
        if (diceRoll <= gameState.character.skill) {
            zoneResultDice.innerHTML = `Test : ${diceRoll} ≤ ${gameState.character.skill} (Réussi)`;
            gameState.skillCheckPassed = true;
        } else {
            zoneResultDice.innerHTML = `Test : ${diceRoll} > ${gameState.character.skill} (Échoué)`;
            gameState.skillCheckPassed = false;
        }

        // Cacher le bouton après le lancer
        rollDiceButton.style.display = 'none';
        
        // Mettre à jour les boutons de choix
        updateChoiceButtons();
    };
}

function multipleRollDiceSkill() {
    const rollDiceButton = document.getElementById('roll_dice');
    const zoneResultDice = document.getElementById('zone_result_dice');
    const actionMessageDiv = document.getElementById('action_message');

    // Réinitialiser les messages
    zoneResultDice.innerHTML = '';
    actionMessageDiv.innerHTML = '';

    // Afficher le bouton de lancer de dés
    rollDiceButton.style.display = 'block';

    // Compteur pour suivre le nombre de lancers
    let rollCount = 0;
    let successCount = 0;

    rollDiceButton.onclick = function() {
        rollCount++;
        const diceRoll = rollDice() + rollDice();

        if (diceRoll <= gameState.character.skill) {
            successCount++;
            zoneResultDice.innerHTML += `Test ${rollCount} : ${diceRoll} ≤ ${gameState.character.skill} (Réussi)<br>`;
        } else {
            zoneResultDice.innerHTML += `Test ${rollCount} : ${diceRoll} > ${gameState.character.skill} (Échoué)<br>`;
        }

        if (rollCount === 3) {
            // Cacher le bouton après le troisième lancer
            rollDiceButton.style.display = 'none';
            
            // Déterminer le résultat final
            gameState.skillCheckPassed = (successCount >= 2);
            zoneResultDice.innerHTML += `<br>Résultat final : ${successCount} succès sur 3 tests (${gameState.skillCheckPassed ? 'Réussi' : 'Échoué'})`;
            
            // Mettre à jour les boutons de choix
            updateChoiceButtons();
        }
    };
}

function updateChoiceButtons() {
    const choices = document.querySelectorAll('#choices button');
    
    choices.forEach(button => {
        // Gestion des choix basés sur le test d'habileté
        if (button.hasAttribute('data-skillCheckRequired')) {
            button.disabled = !gameState.skillCheckPassed;
        }
        
        // Gestion des choix basés sur le test de chance
        if (button.hasAttribute('data-chanceCheckPassed')) {
            const requiresLucky = button.getAttribute('data-chanceCheckPassed') === 'true';
            button.disabled = (gameState.isLucky !== requiresLucky);
        }

        // Gestion des choix basés sur le double test de chance
        if (button.hasAttribute('data-doubleLuckCheck')) {
            const requiresLucky = button.getAttribute('data-doubleLuckCheck') === 'true';
            button.disabled = (gameState.isLucky !== requiresLucky);
        }

        // Gestion des choix basés sur la défaite de tous les monstres
        if (button.hasAttribute('data-requiresAllMonstersDefeated')) {
            const allMonstersDefeated = gameState.monsters.every(monster => monster.status === "vaincu");
            button.disabled = !allMonstersDefeated;
        }

        // Gestion des choix basés sur une condition remplie
        if (button.hasAttribute('data-requiresConditionMet')) {
            button.disabled = !gameState.conditionMet;
        }
    });
}

function reduceFood(value) {
    const currentFood = gameState.inventory.checkItem('repas');
    let message = '';

    if (currentFood >= value) {
        gameState.inventory.removeItem('repas', value);
        message = `${value} repas retiré(s).`;
    } else if (currentFood > 0) {
        gameState.inventory.removeItem('repas', currentFood);
        const healthLoss = 3 * (value - currentFood);
        gameState.character.health -= healthLoss;
        message = `Tous vos repas ont été retirés. Vous perdez ${healthLoss} points d'ENDURANCE.`;
    } else {
        const healthLoss = 3 * value;
        gameState.character.health -= healthLoss;
        message = `Vous n'avez pas de repas. Vous perdez ${healthLoss} points d'ENDURANCE.`;
    }

    return message;
}

function takeItem(itemName, quantity = 1, category = 'equipment', goldValue = 0) {
    const actionMessageDiv = document.getElementById('action_message');
    actionMessageDiv.innerHTML = '';

    if (category === 'gold') {
        gameState.inventory.addItem('or', quantity, 'gold');
        actionMessageDiv.innerHTML = `Vous avez gagné ${quantity} pièces d'or.`;
    } else {
        gameState.inventory.addItem(itemName, quantity, category, goldValue);
        actionMessageDiv.innerHTML = `Vous avez obtenu : ${itemName}`;
    }

    updateAdventureSheet();
} 