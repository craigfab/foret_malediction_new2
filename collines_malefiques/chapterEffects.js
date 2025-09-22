import { gameState } from "./scripts_collines.js";
import { rollDice, tempt_chance } from "./chance.js";
import { updateCharacterStats, triggerGameOver } from "./character.js";
import { updateAdventureSheet, useMeal } from "./inventory.js";

// Fonction pour appliquer les effets d'un chapitre sur le personnage ou l'inventaire
export function applyChapterEffects(chapter) {
    const effectMessageDiv = document.getElementById('effect_message');
    effectMessageDiv.innerHTML = '';

    if (chapter.effects && Array.isArray(chapter.effects)) {
        chapter.effects.forEach(effect => {
            if (effect.chanceCheckPassed !== undefined) {
                return;
            }

            let message = '';

            switch (effect.type) {
                case "gameOver":
                    message = '<strong>GAME OVER</strong>';
                    triggerGameOver();
                    break;
                case "reduceSkill":
                    gameState.character.skill -= effect.value;
                    message = `Habileté réduite de ${effect.value}.`;
                    break;
                case "reduceHealth":
                    gameState.character.health -= effect.value;
                    message = `Endurance réduite de ${effect.value}.`;
                    break;
                case "reduceChance":
                    gameState.character.chance -= effect.value;
                    message = `Chance réduite de ${effect.value}.`;
                    break;
                case "reduceGold":
                    gameState.inventory.removeItem('or', effect.value);
                    message = `${effect.value} pièces d'or retirées.`;
                    break;
                case "removeItem": {
                    const quantityToRemove = (typeof effect.quantity === 'number' && effect.quantity > 0) ? effect.quantity : 1;
                    gameState.inventory.removeItem(effect.itemName, quantityToRemove);
                    message = `${quantityToRemove} ${effect.itemName} retiré(s).`;
                    break;
                }
                case "useAndRemoveItem": {
                    const quantityToRemove = (typeof effect.quantity === 'number' && effect.quantity > 0) ? effect.quantity : 1;
                    gameState.inventory.removeItem(effect.itemName, quantityToRemove);
                    message = `Utilisation et retrait de ${quantityToRemove} ${effect.itemName}.`;
                    break;
                }
                case "gainSkill": {
                    const oldSkill = gameState.character.skill;
                    gameState.character.skill = Math.min(gameState.character.skill + effect.value, gameState.character.baseSkill);
                    const actualSkillGain = gameState.character.skill - oldSkill;
                    message = actualSkillGain > 0 ? `Habileté augmentée de ${actualSkillGain}.` : `Votre habileté est déjà à son niveau maximum.`;
                    break;
                }
                case "gainHealth": {
                    const oldHealth = gameState.character.health;
                    gameState.character.health = Math.min(gameState.character.health + effect.value, gameState.character.baseHealth);
                    const actualHealthGain = gameState.character.health - oldHealth;
                    message = actualHealthGain > 0 ? `Endurance augmentée de ${actualHealthGain}.` : `Votre endurance est déjà à son niveau maximum.`;
                    break;
                }
                case "gainGold":
                    gameState.inventory.addItem('or', effect.value, 'gold');
                    message = `${effect.value} pièces d'or ajoutées.`;
                    break;
                case "gainChance": {
                    const oldChance = gameState.character.chance;
                    gameState.character.chance = Math.min(gameState.character.chance + effect.value, gameState.character.baseChance);
                    const actualChanceGain = gameState.character.chance - oldChance;
                    message = actualChanceGain > 0 ? `Chance augmentée de ${actualChanceGain}.` : `Votre chance est déjà à son niveau maximum.`;
                    break;
                }
                case "skillCombatBoost":
                    gameState.character.applyTemporaryBoost('skillPotionBoost', effect.combatCount || 2);
                    message = `<strong>Potion d'Adresse au Combat bue !</strong><br>Vous gagnez +1 point de Force d'Attaque pour vos ${effect.combatCount || 2} prochains combats.`;
                    break;
                case "rollDiceSkill":
                    rollDiceSkill();
                    message = `Lancer de dés pour tester l'habileté.`;
                    break;
                case "rollDiceChance":
                    rollDiceChance();
                    break;
                case "rollDiceSkillChance":
                    rollDiceSkillChance();
                    break;
                case "doubleRollDiceChance":
                    doubleRollDiceChance();
                    break;
                case "rollDiceSkillAgain":
                    rollDiceSkillAgain();
                    message = `Test d'HABILETÉ avec relances possibles (-1 ENDURANCE par relance).`;
                    break;
                case "multipleRollDiceSkill":
                    multipleRollDiceSkill(effect.value);
                    message = `Multiples lancers de dés pour tester l'habileté.`;
                    break;
                case "reduceHealthRollDice":
                    reduceHealthRollDice();
                    break;
                case "reduceAllGoldOrRemoveTwoItems":
                    goldOrItem({ goldToRemove: gameState.inventory.checkItem('or'), itemsToRemove: 2 });
                    message = `Choisir entre perdre tout l'or ou retirer 2 équipements.`;
                    break;
                case "reduceFiveGoldOrRemoveOneItem":
                    goldOrItem({ goldToRemove: 5, itemsToRemove: 1});
                    break;
                case "reduceThreeGoldOrRemoveOneItem":
                    goldOrItem({ goldToRemove: 3, itemsToRemove: 1});
                    break;
                case "reduceFood":
                    message = reduceFood(effect.value);
                    break;
                case "takeItem":
                    takeItem(effect.itemName, effect.quantity, effect.category, effect.goldValue);
                    break;
                case "useMeal":
                    useMeal();
                    message = "Repas consommé (+4 endurance).";
                    break;
                case "giveFiveItems":
                    giveFiveItems();
                    message = "Vous devez donner 5 objets/unités.";
                    break;
                case "giveXItems":
                    giveXItems(effect.value);
                    message = `Vous devez donner ${effect.value} objet${effect.value > 1 ? 's' : ''}.`;
                    break;
                case "restoreStats":
                    restoreStats();
                    message = "Choisissez quelle statistique restaurer.";
                    break;
                case "swingSkillChance":
                    swingSkillChance();
                    message = "Vos valeurs de CHANCE et d'HABILETÉ ont été interverties !";
                    break;
                case "message":
                    message = effect.text || "Message personnalisé.";
                    break;
                default:
                    message = "Effet inconnu appliqué.";
            }

            updateCharacterStats();
            updateAdventureSheet();

            if (effect.message) {
                effectMessageDiv.innerHTML += `<p>${effect.message}</p>`;
            }
            if (message !== '') {
                effectMessageDiv.innerHTML += `<p>${message}</p>`;
            }
        });
    }
}

function goldOrItem(options) {
    const { goldToRemove = 0, itemsToRemove = 0 } = options;
    const actionMessageDiv = document.getElementById('action_message');
    gameState.conditionMet = false;
    actionMessageDiv.innerHTML = 'Que voulez-vous faire ?<br>';

    function createGoldButton() {
        if (goldToRemove > 0) {
            const slashGold = document.createElement('button');
            slashGold.innerText = `Perdre ${goldToRemove} pièces d'or`;
            slashGold.addEventListener('click', () => {
                if (gameState.inventory.checkItem('or') >= goldToRemove) {
                    gameState.inventory.removeItem('or', goldToRemove);
                    actionMessageDiv.innerHTML = `<strong>Vous avez perdu ${goldToRemove} pièces d'or.</strong>`;
                    gameState.conditionMet = true;
                    updateAdventureSheet();
                    updateChoiceButtons();
                } else {
                    actionMessageDiv.innerHTML = `<strong>Vous n'avez pas assez de pièces d'or.</strong><br>Vous devez choisir une autre option :<br>`;
                    createEquipmentButton();
                }
            });
            actionMessageDiv.appendChild(slashGold);
        }
    }

    function createEquipmentButton() {
        if (itemsToRemove > 0) {
            const slashItems = document.createElement('button');
            slashItems.innerText = `Retirer ${itemsToRemove} équipement(s)`;
            slashItems.addEventListener('click', () => {
                const equipment = gameState.inventory.items.filter(item => item.category === 'equipment');
                if (equipment.length < itemsToRemove) {
                    actionMessageDiv.innerHTML = `<strong>Vous n'avez pas assez d'équipements à retirer.</strong><br>Vous devez choisir une autre option :<br>`;
                    createGoldButton();
                    return;
                }
                actionMessageDiv.innerHTML = `Veuillez choisir ${itemsToRemove} équipement(s) à retirer:<br>`;
                displayEquipmentChoices(actionMessageDiv, itemsToRemove, () => {
                    gameState.conditionMet = true;
                    updateChoiceButtons();
                });
            });
            actionMessageDiv.appendChild(slashItems);
        }
    }

    createGoldButton();
    createEquipmentButton();
}

function displayEquipmentChoices(actionMessageDiv, itemsToRemove, callback) {
    let itemsRemoved = 0;
    const equipment = gameState.inventory.items.filter(item => item.category === 'equipment');

    equipment.forEach(item => {
        const itemButton = document.createElement('button');
        itemButton.innerText = item.name;
        itemButton.addEventListener('click', function () {
            gameState.inventory.removeItem(item.name, 1, 'equipment');
            itemsRemoved++;
            this.remove();
            updateAdventureSheet();

            if (itemsRemoved >= itemsToRemove) {
                actionMessageDiv.innerHTML += `<br><strong>Vous avez retiré ${itemsRemoved} équipement(s).</strong>`;
                if (callback) callback();
            }
        });
        actionMessageDiv.appendChild(itemButton);
    });
}

function doubleRollDiceChance() {
    const actionMessageDiv = document.getElementById('action_message');
    actionMessageDiv.innerHTML = 'Vous devez tenter votre chance deux fois. Premier test :<br>';
    if (!gameState.luckResults) {
        gameState.luckResults = [];
    }
    gameState.luckResults = [];

    const chanceButton1 = document.createElement("button");
    chanceButton1.innerText = "Premier test de chance";
    chanceButton1.id = "chanceButton1";
    actionMessageDiv.appendChild(chanceButton1);

    chanceButton1.addEventListener("click", () => {
        const diceRoll1 = rollDice();
        const diceRoll2 = rollDice();
        const totalRoll1 = diceRoll1 + diceRoll2;
        const isLucky1 = totalRoll1 <= gameState.character.chance;
        const resultMessage1 = isLucky1
            ? `Premier test : ${diceRoll1} + ${diceRoll2} = ${totalRoll1}. <strong>Chanceux !</strong><br>`
            : `Premier test : ${diceRoll1} + ${diceRoll2} = ${totalRoll1}. <strong>Malchanceux...</strong><br>`;
        actionMessageDiv.innerHTML = resultMessage1 + 'Deuxième test :<br>';
        gameState.luckResults.push(isLucky1);

        const chanceButton2 = document.createElement("button");
        chanceButton2.innerText = "Deuxième test de chance";
        chanceButton2.id = "chanceButton2";
        actionMessageDiv.appendChild(chanceButton2);

        chanceButton2.addEventListener("click", () => {
            const diceRoll3 = rollDice();
            const diceRoll4 = rollDice();
            const totalRoll2 = diceRoll3 + diceRoll4;
            const isLucky2 = totalRoll2 <= gameState.character.chance;
            const resultMessage2 = isLucky2
                ? `Deuxième test : ${diceRoll3} + ${diceRoll4} = ${totalRoll2}. <strong>Chanceux !</strong>`
                : `Deuxième test : ${diceRoll3} + ${diceRoll4} = ${totalRoll2}. <strong>Malchanceux...</strong>`;
            actionMessageDiv.innerHTML = resultMessage1 + resultMessage2;
            gameState.luckResults.push(isLucky2);
            gameState.isLucky = isLucky2;
            updateChoiceButtons();
            chanceButton2.disabled = true;
        });

        chanceButton1.disabled = true;
    });
}

function rollDiceChance() {
    const actionMessageDiv = document.getElementById('action_message');
    actionMessageDiv.innerHTML = 'tentez votre chance en lançant deux dés<br>';
    const chanceButton = document.createElement("button");
    chanceButton.innerText = "Tenter votre chance";
    chanceButton.id = "chanceButton";
    actionMessageDiv.appendChild(chanceButton);

    chanceButton.addEventListener("click", () => {
        const diceRoll1 = rollDice();
        const diceRoll2 = rollDice();
        const totalRoll = diceRoll1 + diceRoll2;
        const isLucky = totalRoll <= gameState.character.chance;
        const resultMessage = isLucky
            ? `Vous avez lancé ${diceRoll1} et ${diceRoll2} (total: ${totalRoll}). <strong>Chanceux !</strong>`
            : `Vous avez lancé ${diceRoll1} et ${diceRoll2} (total: ${totalRoll}). <strong>Malchanceux...</strong>`;
        actionMessageDiv.innerHTML = resultMessage;
        gameState.isLucky = isLucky;
        if (!gameState.luckResults) {
            gameState.luckResults = [];
        }
        gameState.luckResults.push(isLucky);
        applyConditionalEffects(isLucky);
        updateChoiceButtons();
        chanceButton.disabled = true;
    });
}

function reduceHealthRollDice() {
    const actionMessageDiv = document.getElementById('action_message');
    actionMessageDiv.innerHTML = "Lancez un dé pour déterminer la perte d'ENDURANCE :<br>";
    const rollButton = document.createElement('button');
    rollButton.innerText = 'Lancer un dé';
    rollButton.id = 'reduceHealthRollButton';
    actionMessageDiv.appendChild(rollButton);

    rollButton.addEventListener('click', () => {
        const diceResult = rollDice();
        gameState.character.health -= diceResult;
        gameState.effectApplied = true;
        actionMessageDiv.innerHTML = `Vous avez lancé ${diceResult}. Endurance réduite de ${diceResult}.`;
        updateCharacterStats();
        updateAdventureSheet();
        updateChoiceButtons();
        rollButton.disabled = true;
    });
}

function rollDiceSkillChance() {
    const actionMessageDiv = document.getElementById('action_message');
    actionMessageDiv.innerHTML = 'Testez votre HABILETÉ et votre CHANCE en lançant deux dés.<br>Réussite si le total est <= HABILETÉ ET <= CHANCE.<br>';
    const skillChanceButton = document.createElement("button");
    skillChanceButton.innerText = "Lancer les dés";
    skillChanceButton.id = "skillChanceButton";
    actionMessageDiv.appendChild(skillChanceButton);

    skillChanceButton.addEventListener("click", () => {
        const diceRoll1 = rollDice();
        const diceRoll2 = rollDice();
        const totalRoll = diceRoll1 + diceRoll2;
        const skill = gameState.character.skill;
        const chance = gameState.character.chance;
        const isSuccessful = totalRoll <= skill && totalRoll <= chance;
        const resultMessage = isSuccessful
            ? `Vous avez lancé ${diceRoll1} et ${diceRoll2} (total: ${totalRoll}). HABILETÉ = ${skill}, CHANCE = ${chance}. <strong>Réussite !</strong>`
            : `Vous avez lancé ${diceRoll1} et ${diceRoll2} (total: ${totalRoll}). HABILETÉ = ${skill}, CHANCE = ${chance}. <strong>Échec...</strong>`;
        actionMessageDiv.innerHTML = resultMessage;
        gameState.skillChanceCheckPassed = isSuccessful;
        updateChoiceButtons();
        skillChanceButton.disabled = true;
    });
}

function applyConditionalEffects(isLucky) {
    const currentChapter = gameState.currentChapter;
    const effectMessageDiv = document.getElementById('effect_message');
    if (currentChapter.effects && Array.isArray(currentChapter.effects)) {
        currentChapter.effects.forEach(effect => {
            if (effect.chanceCheckPassed !== undefined) {
                if (isLucky === effect.chanceCheckPassed) {
                    let message = '';
                    switch (effect.type) {
                        case "reduceHealth":
                            gameState.character.health -= effect.value;
                            message = `Endurance réduite de ${effect.value}.`;
                            break;
                        case "reduceSkill":
                            gameState.character.skill -= effect.value;
                            message = `Habileté réduite de ${effect.value}.`;
                            break;
                        case "reduceChance":
                            gameState.character.chance -= effect.value;
                            message = `Chance réduite de ${effect.value}.`;
                            break;
                        case "gainHealth": {
                            const oldHealth = gameState.character.health;
                            gameState.character.health = Math.min(gameState.character.health + effect.value, gameState.character.baseHealth);
                            const actualHealthGain = gameState.character.health - oldHealth;
                            message = actualHealthGain > 0 ? `Endurance augmentée de ${actualHealthGain}.` : `Votre endurance est déjà à son niveau maximum.`;
                            break;
                        }
                        case "gameOver":
                            message = '<strong>GAME OVER</strong>';
                            triggerGameOver();
                            break;
                    }
                    if (message) {
                        effectMessageDiv.innerHTML += `<br>${message}`;
                        updateCharacterStats();
                    }
                }
            }
        });
    }
}

function rollDiceSkill() {
    let rollDiceSkillButton = document.getElementById("rollDiceSkillButton");
    if (!rollDiceSkillButton) {
        const temptSkillDiv = document.getElementById("action_message");
        rollDiceSkillButton = document.createElement("button");
        rollDiceSkillButton.id = "rollDiceSkillButton";
        rollDiceSkillButton.innerText = "Lancer les dés d'Habileté";
        temptSkillDiv.appendChild(rollDiceSkillButton);
    }

    rollDiceSkillButton.addEventListener("click", () => {
        const diceRoll1 = rollDice();
        const diceRoll2 = rollDice();
        const totalRoll = diceRoll1 + diceRoll2;
        const skillCheckPassed = totalRoll <= gameState.character.skill;
        gameState.skillCheckPassed = skillCheckPassed;
        const actionMessageDiv = document.getElementById("action_message");
        actionMessageDiv.innerHTML = skillCheckPassed ?
            `Vous avez lancé ${diceRoll1} et ${diceRoll2} (total: ${totalRoll}). <strong>Réussite !</strong> Votre habileté est suffisante.` :
            `Vous avez lancé ${diceRoll1} et ${diceRoll2} (total: ${totalRoll}). <strong>Échec...</strong> Votre habileté n'est pas suffisante.`;
        updateChoiceButtons();
        rollDiceSkillButton.disabled = true;
    });
}

function rollDiceSkillAgain() {
    const actionMessageDiv = document.getElementById("action_message");
    actionMessageDiv.innerHTML = `Test d'HABILETÉ. En cas d'échec, vous pouvez relancer en perdant 1 point d'ENDURANCE à chaque tentative.`;
    let rollButton = document.getElementById("rollDiceSkillAgainButton");
    if (!rollButton) {
        rollButton = document.createElement("button");
        rollButton.id = "rollDiceSkillAgainButton";
        rollButton.innerText = "Lancer les dés d'Habileté";
    }
    actionMessageDiv.appendChild(rollButton);
    rollButton.onclick = () => {
        const diceRoll1 = rollDice();
        const diceRoll2 = rollDice();
        const totalRoll = diceRoll1 + diceRoll2;
        const success = totalRoll <= gameState.character.skill;
        gameState.skillCheckPassed = success;
        if (success) {
            actionMessageDiv.innerHTML = `Vous avez lancé ${diceRoll1} et ${diceRoll2} (total: ${totalRoll}). <strong>Réussite !</strong> Votre habileté est suffisante.`;
            updateChoiceButtons();
            rollButton.disabled = true;
            return;
        }
        actionMessageDiv.innerHTML = `Vous avez lancé ${diceRoll1} et ${diceRoll2} (total: ${totalRoll}). <strong>Échec...</strong> Votre habileté n'est pas suffisante.`;
        const actionsContainer = document.createElement('div');
        const retryButton = document.createElement('button');
        retryButton.innerText = "Réessayer (-1 ENDURANCE)";
        const stopButton = document.createElement('button');
        stopButton.innerText = "Arrêter le test";
        actionsContainer.appendChild(retryButton);
        actionsContainer.appendChild(stopButton);
        actionMessageDiv.appendChild(actionsContainer);
        rollButton.disabled = true;
        retryButton.onclick = () => {
            gameState.character.health -= 1;
            updateCharacterStats();
            rollButton.disabled = false;
            actionMessageDiv.innerHTML = `Vous perdez 1 point d'ENDURANCE pour retenter. Lancez à nouveau les dés.`;
            actionMessageDiv.appendChild(rollButton);
            updateChoiceButtons();
        };
        stopButton.onclick = () => {
            actionMessageDiv.innerHTML += `<p>Vous choisissez d'arrêter les tentatives.</p>`;
            updateChoiceButtons();
        };
    };
}

async function multipleRollDiceSkill(times) {
    const actionMessageDiv = document.getElementById('action_message');
    let success = true;
    let currentRoll = 0;
    const rollButton = document.createElement('button');
    rollButton.textContent = 'Lancer les dés';
    actionMessageDiv.innerHTML = `<p>Vous devez réussir ${times} test(s) d'HABILETÉ.</p>`;
    actionMessageDiv.appendChild(rollButton);
    return new Promise((resolve) => {
        rollButton.onclick = async () => {
            currentRoll++;
            const diceResult = rollDice() + rollDice();
            const isSuccess = diceResult <= gameState.character.skill;
            actionMessageDiv.innerHTML = `\n                <p>Test ${currentRoll}/${times}</p>\n                <p>Résultat des dés :<strong>${diceResult}</strong> / Votre HABILETÉ : <strong>${gameState.character.skill}</strong> --> ${isSuccess ? '<strong>Réussite !</strong>' : '<strong>Échec...</strong>'}</p> `;
            if (!isSuccess) {
                success = false;
                gameState.skillCheckPassed = false;
                updateChoiceButtons();
                actionMessageDiv.innerHTML += `<p><strong>Vous avez échoué après ${currentRoll} test(s).</strong></p>`;
                resolve();
                return;
            }
            if (currentRoll < times) {
                actionMessageDiv.appendChild(rollButton);
            } else {
                gameState.skillCheckPassed = true;
                updateChoiceButtons();
                actionMessageDiv.innerHTML += `<p><strong>Félicitations ! Vous avez réussi tous les tests !</strong></p>`;
                resolve();
            }
        };
    });
}

export function updateChoiceButtons() {
    const choiceButtons = document.querySelectorAll("#choices button");
    choiceButtons.forEach(button => {
        if (button.hasAttribute("data-requiresConditionMet")) {
            button.disabled = !gameState.conditionMet;
        }
        if (button.hasAttribute("data-chanceCheckPassed")) {
            const chanceRequired = button.getAttribute("data-chanceCheckPassed") === "true";
            if (gameState.isLucky === undefined) {
                button.disabled = true;
            } else {
                button.disabled = gameState.isLucky !== chanceRequired;
            }
        }
        if (button.hasAttribute("data-skillCheckPassed")) {
            const skillRequired = button.getAttribute("data-skillCheckPassed") === "true";
            if (gameState.skillCheckPassed === undefined) {
                button.disabled = true;
            } else {
                button.disabled = gameState.skillCheckPassed !== skillRequired;
            }
        }
        if (button.hasAttribute("data-skillChanceCheckPassed")) {
            const skillChanceRequired = button.getAttribute("data-skillChanceCheckPassed") === "true";
            if (gameState.skillChanceCheckPassed === undefined) {
                button.disabled = true;
            } else {
                button.disabled = gameState.skillChanceCheckPassed !== skillChanceRequired;
            }
        }
        if (button.hasAttribute("data-requiresAllMonstersDefeated")) {
            const allMonstersDefeated = gameState.monsters.every(monster => monster.status === "vaincu");
            button.disabled = !allMonstersDefeated;
        }
        if (button.hasAttribute("data-requiresItem")) {
            const itemName = button.getAttribute("data-requiresItem");
            const hasItem = gameState.inventory.checkItem(itemName);
            button.disabled = !hasItem;
        }
        if (button.hasAttribute("data-doubleLuckCheck")) {
            const doubleLuckRequired = button.getAttribute("data-doubleLuckCheck") === "true";
            const bothLucky = gameState.luckResults && gameState.luckResults.length >= 2 && 
                    gameState.luckResults[0] === true && gameState.luckResults[1] === true;
            button.disabled = (doubleLuckRequired && !bothLucky) || (!doubleLuckRequired && bothLucky);
        }
        if (button.hasAttribute("data-woundedByLoupGarou")) {
            const woundedRequired = button.getAttribute("data-woundedByLoupGarou") === "true";
            button.disabled = gameState.woundedByLoupGarou !== woundedRequired;
        }
        if (button.hasAttribute("data-requiresParalysis")) {
            button.disabled = !gameState.isParalyzed;
        }
        if (button.hasAttribute("data-requiresMinAssaults")) {
            const minAssaults = parseInt(button.getAttribute("data-requiresMinAssaults"));
            button.disabled = gameState.assaultCount < minAssaults;
            if (button.disabled) {
                button.title = `Vous devez mener ${minAssaults} assauts avant de pouvoir fuir (${gameState.assaultCount}/${minAssaults})`;
            } else {
                button.title = "";
            }
        }
        if (button.hasAttribute("data-goldCondition")) {
            const condition = JSON.parse(button.getAttribute("data-goldCondition"));
            const [resource, operator, value] = condition;
            let conditionMet = false;
            if (resource === "gold") {
                const currentGold = gameState.inventory.checkItem('or') || 0;
                switch (operator) {
                    case ">=":
                        conditionMet = currentGold >= value;
                        break;
                    case ">":
                        conditionMet = currentGold > value;
                        break;
                    case "<=":
                        conditionMet = currentGold <= value;
                        break;
                    case "<":
                        conditionMet = currentGold < value;
                        break;
                    case "==":
                    case "===":
                        conditionMet = currentGold == value;
                        break;
                }
            }
            button.disabled = !conditionMet;
        }
        if (button.hasAttribute("data-requiresEffectApplied")) {
            const effectRequired = button.getAttribute("data-requiresEffectApplied") === "true";
            button.disabled = gameState.effectApplied !== effectRequired;
        }
    });
}

function reduceFood(value) {
    const foodItems = gameState.inventory.items.filter(item => item.category === 'food');
    if (foodItems.length === 0) {
        return "Vous n'aviez aucune nourriture à perdre.";
    }
    if (value === "all" || value === "ALL") {
        foodItems.forEach(item => {
            gameState.inventory.removeItem(item.name, item.quantity);
        });
        updateAdventureSheet();
        return "Vous avez perdu toute votre nourriture.";
    } else {
        const quantity = parseInt(value);
        let remaining = quantity;
        for (let item of foodItems) {
            if (remaining <= 0) break;
            const toRemove = Math.min(remaining, item.quantity);
            gameState.inventory.removeItem(item.name, toRemove);
            remaining -= toRemove;
        }
        updateAdventureSheet();
        return `Vous avez perdu ${quantity} nourriture(s).`;
    }
}

function giveFiveItems() {
    const actionMessageDiv = document.getElementById('action_message');
    gameState.conditionMet = false;
    gameState.itemsGiven = 0;
    const countSpan = document.createElement('span');
    countSpan.id = 'itemCountDisplay';
    countSpan.innerHTML = `<strong>Objets donnés : ${gameState.itemsGiven}</strong>`;
    actionMessageDiv.appendChild(countSpan);
    actionMessageDiv.appendChild(document.createElement('br'));
    actionMessageDiv.appendChild(document.createElement('br'));
    const currentGold = gameState.inventory.checkItem('or') || 0;
    if (currentGold > 0) {
        const goldTitle = document.createElement('strong');
        goldTitle.textContent = "Pièces d'or :";
        actionMessageDiv.appendChild(goldTitle);
        actionMessageDiv.appendChild(document.createElement('br'));
        for (let i = 1; i <= Math.min(5, currentGold); i++) {
            const goldButton = document.createElement('button');
            goldButton.innerText = `Donner ${i} pièce${i > 1 ? 's' : ''} d'or`;
            goldButton.classList.add('gold-button');
            goldButton.addEventListener('click', function() {
                if (gameState.inventory.checkItem('or') >= i) {
                    gameState.inventory.removeItem('or', i);
                    gameState.itemsGiven += i;
                    const allGoldButtons = document.querySelectorAll('.gold-button');
                    allGoldButtons.forEach(btn => btn.remove());
                    updateAdventureSheet();
                    checkCondition();
                    updateItemCountDisplay();
                }
            });
            actionMessageDiv.appendChild(goldButton);
        }
        actionMessageDiv.appendChild(document.createElement('br'));
        actionMessageDiv.appendChild(document.createElement('br'));
    }
    const allItems = gameState.inventory.items.filter(item => item.category === 'equipment' || item.category === 'jewelry' || item.category === 'potions');
    if (allItems.length > 0) {
        const categories = { 'equipment': 'Équipements', 'jewelry': 'Bijoux', 'potions': 'Potions' };
        Object.keys(categories).forEach(category => {
            const categoryItems = allItems.filter(item => item.category === category);
            if (categoryItems.length > 0) {
                const categoryTitle = document.createElement('strong');
                categoryTitle.textContent = categories[category] + ' :';
                actionMessageDiv.appendChild(categoryTitle);
                actionMessageDiv.appendChild(document.createElement('br'));
                categoryItems.forEach(item => {
                    for (let j = 0; j < item.quantity; j++) {
                        const itemButton = document.createElement('button');
                        itemButton.innerText = item.name;
                        itemButton.addEventListener('click', function() {
                            gameState.inventory.removeItem(item.name, 1);
                            gameState.itemsGiven += 1;
                            this.remove();
                            updateAdventureSheet();
                            checkCondition();
                            updateItemCountDisplay();
                        });
                        actionMessageDiv.appendChild(itemButton);
                    }
                });
                actionMessageDiv.appendChild(document.createElement('br'));
            }
        });
    }
    function checkCondition() {
        if (gameState.itemsGiven >= 5) {
            gameState.conditionMet = true;
            updateChoiceButtons();
        }
    }
    function updateItemCountDisplay() {
        const countDisplay = document.getElementById('itemCountDisplay');
        if (countDisplay) {
            countDisplay.innerHTML = `<strong>Objets donnés : ${gameState.itemsGiven}</strong>`;
        }
    }
}

function giveXItems(numberOfItems) {
    const actionMessageDiv = document.getElementById('action_message');
    gameState.conditionMet = false;
    gameState.itemsGiven = 0;
    const countSpan = document.createElement('span');
    countSpan.id = 'itemCountDisplay';
    countSpan.innerHTML = `<strong>Objets donnés : ${gameState.itemsGiven}/${numberOfItems}</strong>`;
    actionMessageDiv.appendChild(countSpan);
    actionMessageDiv.appendChild(document.createElement('br'));
    actionMessageDiv.appendChild(document.createElement('br'));
    const allItems = gameState.inventory.items.filter(item => item.category === 'equipment' || item.category === 'jewelry' || item.category === 'potions');
    if (allItems.length > 0) {
        const categories = { 'equipment': 'Équipements', 'jewelry': 'Bijoux', 'potions': 'Potions' };
        Object.keys(categories).forEach(category => {
            const categoryItems = allItems.filter(item => item.category === category);
            if (categoryItems.length > 0) {
                const categoryTitle = document.createElement('strong');
                categoryTitle.textContent = categories[category] + ' :';
                actionMessageDiv.appendChild(categoryTitle);
                actionMessageDiv.appendChild(document.createElement('br'));
                categoryItems.forEach(item => {
                    for (let j = 0; j < item.quantity; j++) {
                        const itemButton = document.createElement('button');
                        itemButton.innerText = item.name;
                        itemButton.addEventListener('click', function() {
                            gameState.inventory.removeItem(item.name, 1);
                            gameState.itemsGiven += 1;
                            this.remove();
                            updateAdventureSheet();
                            checkCondition();
                            updateItemCountDisplay();
                        });
                        actionMessageDiv.appendChild(itemButton);
                    }
                });
                actionMessageDiv.appendChild(document.createElement('br'));
            }
        });
    }
    function checkCondition() {
        if (gameState.itemsGiven >= numberOfItems) {
            gameState.conditionMet = true;
            updateChoiceButtons();
        }
    }
    function updateItemCountDisplay() {
        const countDisplay = document.getElementById('itemCountDisplay');
        if (countDisplay) {
            countDisplay.innerHTML = `<strong>Objets donnés : ${gameState.itemsGiven}/${numberOfItems}</strong>`;
        }
    }
}

function takeItem(itemName, quantity = 1, category = 'equipment', goldValue = 0) {
    const actionMessageDiv = document.getElementById('action_message');
    if (category === 'jewelry' && goldValue > 0) {
        gameState.inventory.addItem('or', goldValue, 'gold');
        actionMessageDiv.innerHTML = `Vous avez récupéré ${quantity} ${itemName} (converti en ${goldValue} pièces d'or).`;
    } else {
        gameState.inventory.addItem(itemName, quantity, category);
        actionMessageDiv.innerHTML = `Vous avez récupéré ${quantity} ${itemName}.`;
    }
    updateAdventureSheet();
}

function restoreStats() {
    const actionMessageDiv = document.getElementById('action_message');
    gameState.conditionMet = false;
    actionMessageDiv.innerHTML = 'Le génie vous offre de restaurer une de vos statistiques à son niveau de départ :<br><br>';
    if (gameState.character.skill < gameState.character.baseSkill) {
        const skillButton = document.createElement('button');
        skillButton.innerText = `Restaurer HABiLETÊ (${gameState.character.skill} → ${gameState.character.baseSkill})`;
        skillButton.addEventListener('click', () => {
            gameState.character.skill = gameState.character.baseSkill;
            actionMessageDiv.innerHTML = `<strong>Votre HABiLETÊ a été restaurée à ${gameState.character.baseSkill} !</strong>`;
            gameState.conditionMet = true;
            updateCharacterStats();
            updateAdventureSheet();
            updateChoiceButtons();
        });
        actionMessageDiv.appendChild(skillButton);
        actionMessageDiv.appendChild(document.createElement('br'));
    }
    if (gameState.character.health < gameState.character.baseHealth) {
        const healthButton = document.createElement('button');
        healthButton.innerText = `Restaurer ENDURANCE (${gameState.character.health} → ${gameState.character.baseHealth})`;
        healthButton.addEventListener('click', () => {
            gameState.character.health = gameState.character.baseHealth;
            actionMessageDiv.innerHTML = `<strong>Votre ENDURANCE a été restaurée à ${gameState.character.baseHealth} !</strong>`;
            gameState.conditionMet = true;
            updateCharacterStats();
            updateAdventureSheet();
            updateChoiceButtons();
        });
        actionMessageDiv.appendChild(healthButton);
        actionMessageDiv.appendChild(document.createElement('br'));
    }
    if (gameState.character.chance < gameState.character.baseChance) {
        const chanceButton = document.createElement('button');
        chanceButton.innerText = `Restaurer CHANCE (${gameState.character.chance} → ${gameState.character.baseChance})`;
        chanceButton.addEventListener('click', () => {
            gameState.character.chance = gameState.character.baseChance;
            actionMessageDiv.innerHTML = `<strong>Votre CHANCE a été restaurée à ${gameState.character.baseChance} !</strong>`;
            gameState.conditionMet = true;
            updateCharacterStats();
            updateAdventureSheet();
            updateChoiceButtons();
        });
        actionMessageDiv.appendChild(chanceButton);
        actionMessageDiv.appendChild(document.createElement('br'));
    }
    if (gameState.character.skill >= gameState.character.baseSkill && 
        gameState.character.health >= gameState.character.baseHealth && 
        gameState.character.chance >= gameState.character.baseChance) {
        actionMessageDiv.innerHTML += '<strong>Toutes vos statistiques sont déjà à leur niveau maximum !</strong><br>';
        gameState.conditionMet = true;
        updateChoiceButtons();
    }
}


