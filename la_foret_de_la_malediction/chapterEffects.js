import { gameState } from "./scripts_forest.js";
import { rollDice, tempt_chance } from "./chance.js";
import { updateCharacterStats } from "./character.js";
import { updateAdventureSheet, useMeal } from "./inventory.js";






// Fonction pour appliquer les effets d'un chapitre sur le personnage ou l'inventaire
export function applyChapterEffects(chapter) {
    const effectMessageDiv = document.getElementById('effect_message'); // Obtenez la référence une fois pour toutes
    effectMessageDiv.innerHTML = ''; // Réinitialiser le contenu pour de nouveaux effets

    if (chapter.effects && Array.isArray(chapter.effects)) {
        chapter.effects.forEach(effect => {
            // Ignorer les effets conditionnels qui seront traités après le test de chance
            if (effect.chanceCheckPassed !== undefined) {
                return; // Ces effets seront traités par applyConditionalEffects()
            }
            
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
                    message = `Endurance augmentée de ${effect.value}.`;
                    break;
                case "gainGold":
                    gameState.inventory.addItem('or', effect.value, 'gold');
                    message = `${effect.value} pièces d'or ajoutées.`;
                    break;
                case "gainChance":
                    gameState.character.chance += effect.value;
                    message = `Chance augmentée de ${effect.value}.`;
                    break;
                case "skillCombatBoost":
                    gameState.character.applyTemporaryBoost('skillPotionBoost', effect.combatCount || 2);
                    message = '<strong>Potion d\'Adresse au Combat bue !</strong><br>Vous gagnez +1 point de Force d\'Attaque pour vos ' + (effect.combatCount || 2) + ' prochains combats.';
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
                    goldOrItem({
                        goldToRemove: gameState.inventory.checkItem('or'),
                        itemsToRemove: 2
                    });
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
                case "message":
                    message = effect.text || "Message personnalisé.";
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

// fonction gold or items, // Retirer 5 pièces d'or et 2 équipements : goldOrItem({ goldToRemove: 5, itemsToRemove: 2 });
function goldOrItem(options) {
    const { goldToRemove = 0, itemsToRemove = 0 } = options;
    const actionMessageDiv = document.getElementById('action_message');
    
    // Réinitialiser la condition
    gameState.conditionMet = false;
    
    actionMessageDiv.innerHTML = 'Que voulez-vous faire ?<br>';

    // Fonction pour créer le bouton d'or (évite la duplication)
    function createGoldButton() {
        if (goldToRemove > 0) {
            const slashGold = document.createElement('button');
            slashGold.innerText = `Perdre ${goldToRemove} pièces d'or`;
            slashGold.addEventListener('click', () => {
                console.log(`Clic sur perdre ${goldToRemove} pièces d'or`);
                if (gameState.inventory.checkItem('or') >= goldToRemove) {
                    gameState.inventory.removeItem('or', goldToRemove);
                    actionMessageDiv.innerHTML = `<strong>Vous avez perdu ${goldToRemove} pièces d'or.</strong>`;
                    gameState.conditionMet = true; // Condition remplie directement
                    updateAdventureSheet();
                    updateChoiceButtons();
                } else {
                    actionMessageDiv.innerHTML = `<strong>Vous n'avez pas assez de pièces d'or.</strong><br>Vous devez choisir une autre option :<br>`;
                    // Utiliser la fonction pour recréer le bouton d'équipement
                    createEquipmentButton();
                }
            });
            actionMessageDiv.appendChild(slashGold);
        }
    }

    // Fonction pour créer le bouton d'équipement (évite la duplication)
    function createEquipmentButton() {
        if (itemsToRemove > 0) {
            const slashItems = document.createElement('button');
            slashItems.innerText = `Retirer ${itemsToRemove} équipement(s)`;
            slashItems.addEventListener('click', () => {
                console.log(`Clic sur retirer ${itemsToRemove} équipement(s)`);
                const equipment = gameState.inventory.items.filter(item => item.category === 'equipment');
                if (equipment.length < itemsToRemove) {
                    actionMessageDiv.innerHTML = `<strong>Vous n'avez pas assez d'équipements à retirer.</strong><br>Vous devez choisir une autre option :<br>`;
                    // Utiliser la fonction pour recréer le bouton d'or
                    createGoldButton();
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

    // Bouton pour retirer une quantité spécifique d'or
    createGoldButton();

    // Bouton pour retirer une quantité spécifique d'équipements
    createEquipmentButton();
}

function displayEquipmentChoices(actionMessageDiv, itemsToRemove, callback) {
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
                // Appeler le callback quand tous les équipements sont retirés
                if (callback) callback();
            }
        });
        actionMessageDiv.appendChild(itemButton);
    });
}

// fonction doubleRollDiceChance pour 2 tests de chance consécutifs
function doubleRollDiceChance() {
    const actionMessageDiv = document.getElementById('action_message');
    actionMessageDiv.innerHTML = 'Vous devez tenter votre chance deux fois. Premier test :<br>';
    
    // Initialiser luckResults pour les tests multiples
    if (!gameState.luckResults) {
        gameState.luckResults = [];
    }
    gameState.luckResults = []; // Réinitialiser pour ce nouveau test
    
    // Création du premier bouton pour tenter la chance
    const chanceButton1 = document.createElement("button");
    chanceButton1.innerText = "Premier test de chance";
    chanceButton1.id = "chanceButton1";

    // ajout bouton à la div
    actionMessageDiv.appendChild(chanceButton1);

    // Ajouter l'événement au clic du premier bouton
    chanceButton1.addEventListener("click", () => {
        // Lancer deux dés pour le premier test
        const diceRoll1 = rollDice();
        const diceRoll2 = rollDice();
        const totalRoll1 = diceRoll1 + diceRoll2;

        // Comparer la somme des dés avec la chance
        const isLucky1 = totalRoll1 <= gameState.character.chance;

        // Afficher le résultat du premier test
        const resultMessage1 = isLucky1
            ? `Premier test : ${diceRoll1} + ${diceRoll2} = ${totalRoll1}. <strong>Chanceux !</strong><br>`
            : `Premier test : ${diceRoll1} + ${diceRoll2} = ${totalRoll1}. <strong>Malchanceux...</strong><br>`;
        
        actionMessageDiv.innerHTML = resultMessage1 + 'Deuxième test :<br>';

        // Stocker le premier résultat
        gameState.luckResults.push(isLucky1);

        // Création du deuxième bouton pour tenter la chance
        const chanceButton2 = document.createElement("button");
        chanceButton2.innerText = "Deuxième test de chance";
        chanceButton2.id = "chanceButton2";

        // ajout bouton à la div
        actionMessageDiv.appendChild(chanceButton2);

        // Ajouter l'événement au clic du deuxième bouton
        chanceButton2.addEventListener("click", () => {
            // Lancer deux dés pour le deuxième test
            const diceRoll3 = rollDice();
            const diceRoll4 = rollDice();
            const totalRoll2 = diceRoll3 + diceRoll4;

            // Comparer la somme des dés avec la chance
            const isLucky2 = totalRoll2 <= gameState.character.chance;

            // Afficher le résultat du deuxième test
            const resultMessage2 = isLucky2
                ? `Deuxième test : ${diceRoll3} + ${diceRoll4} = ${totalRoll2}. <strong>Chanceux !</strong>`
                : `Deuxième test : ${diceRoll3} + ${diceRoll4} = ${totalRoll2}. <strong>Malchanceux...</strong>`;
            
            actionMessageDiv.innerHTML = resultMessage1 + resultMessage2;

            // Stocker le deuxième résultat
            gameState.luckResults.push(isLucky2);

            // Définir isLucky pour la compatibilité (résultat du dernier test)
            gameState.isLucky = isLucky2;

            // Met à jour les boutons de choix
            updateChoiceButtons();

            // Désactiver le bouton pour éviter un second test
            chanceButton2.disabled = true;
        });

        // Désactiver le premier bouton
        chanceButton1.disabled = true;
    });
}

// fonction rollDiceChance
function rollDiceChance() {
    const actionMessageDiv = document.getElementById('action_message');
    actionMessageDiv.innerHTML = 'tentez votre chance en lançant deux dés<br>';
    
    // Création du bouton pour tenter la chance
    const chanceButton = document.createElement("button");
    chanceButton.innerText = "Tenter votre chance";
    chanceButton.id = "chanceButton";

    // ajout bouton à la div
    actionMessageDiv.appendChild(chanceButton);

    // Ajouter l'événement au clic du bouton
    chanceButton.addEventListener("click", () => {
        // Lancer deux dés
        const diceRoll1 = rollDice();
        const diceRoll2 = rollDice();
        const totalRoll = diceRoll1 + diceRoll2;

        // Comparer la somme des dés avec la chance
        const isLucky = totalRoll <= gameState.character.chance;

        // Afficher le résultat
        const resultMessage = isLucky
            ? `Vous avez lancé ${diceRoll1} et ${diceRoll2} (total: ${totalRoll}). <strong>Chanceux !</strong>`
            : `Vous avez lancé ${diceRoll1} et ${diceRoll2} (total: ${totalRoll}). <strong>Malchanceux...</strong>`;
        actionMessageDiv.innerHTML = resultMessage;

        // Stocker le résultat dans gameState pour référence ultérieure
        gameState.isLucky = isLucky;
        
        // Pour les tests multiples, initialiser luckResults si nécessaire
        if (!gameState.luckResults) {
            gameState.luckResults = [];
        }
        gameState.luckResults.push(isLucky);

        // Appliquer les effets conditionnels basés sur le résultat de chance
        applyConditionalEffects(isLucky);

        // Met à jour les boutons de choix
        updateChoiceButtons();

        // Désactiver le bouton pour éviter un second test
        chanceButton.disabled = true;
    });
}

// fonction reduceHealthRollDice: un lancer de dé puis réduction de l'ENDURANCE du résultat
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
        gameState.effectApplied = true; // Marquer que l'effet a été appliqué
        actionMessageDiv.innerHTML = `Vous avez lancé ${diceResult}. Endurance réduite de ${diceResult}.`;
        updateCharacterStats();
        updateAdventureSheet();
        updateChoiceButtons(); // Mettre à jour les boutons après l'effet
        rollButton.disabled = true;
    });
}

// fonction rollDiceSkillChance pour tester habileté + chance
function rollDiceSkillChance() {
    const actionMessageDiv = document.getElementById('action_message');
    actionMessageDiv.innerHTML = 'Testez votre habileté et votre chance en lançant deux dés<br>';
    
    // Création du bouton pour tenter le test
    const skillChanceButton = document.createElement("button");
    skillChanceButton.innerText = "Lancer les dés (Habileté + Chance)";
    skillChanceButton.id = "skillChanceButton";

    // ajout bouton à la div
    actionMessageDiv.appendChild(skillChanceButton);

    // Ajouter l'événement au clic du bouton
    skillChanceButton.addEventListener("click", () => {
        // Lancer deux dés
        const diceRoll1 = rollDice();
        const diceRoll2 = rollDice();
        const totalRoll = diceRoll1 + diceRoll2;

        // Calculer la somme habileté + chance
        const skillPlusChance = gameState.character.skill + gameState.character.chance;

        // Comparer la somme des dés avec habileté + chance
        const isSuccessful = totalRoll <= skillPlusChance;

        // Afficher le résultat
        const resultMessage = isSuccessful
            ? `Vous avez lancé ${diceRoll1} et ${diceRoll2} (total: ${totalRoll}). Habileté + Chance = ${skillPlusChance}. <strong>Réussite !</strong>`
            : `Vous avez lancé ${diceRoll1} et ${diceRoll2} (total: ${totalRoll}). Habileté + Chance = ${skillPlusChance}. <strong>Échec...</strong>`;
        actionMessageDiv.innerHTML = resultMessage;

        // Stocker le résultat dans gameState pour référence ultérieure
        gameState.skillChanceCheckPassed = isSuccessful;

        // Met à jour les boutons de choix
        updateChoiceButtons();

        // Désactiver le bouton pour éviter un second test
        skillChanceButton.disabled = true;
    });
}

// Fonction pour appliquer les effets conditionnels après un test de chance
function applyConditionalEffects(isLucky) {
    const currentChapter = gameState.currentChapter;
    const effectMessageDiv = document.getElementById('effect_message');
    
    if (currentChapter.effects && Array.isArray(currentChapter.effects)) {
        currentChapter.effects.forEach(effect => {
            // Vérifier si l'effet a une condition chanceCheckPassed
            if (effect.chanceCheckPassed !== undefined) {
                // Appliquer l'effet si la condition correspond au résultat
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
                        case "gainHealth":
                            gameState.character.health += effect.value;
                            message = `Endurance augmentée de ${effect.value}.`;
                            break;
                        // Ajouter d'autres types d'effets au besoin
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

// fonction RollDiceSkill
function rollDiceSkill() {
    // Création et ajout du bouton rollDiceSkillButton, s'il n'existe pas déjà
    let rollDiceSkillButton = document.getElementById("rollDiceSkillButton");
    if (!rollDiceSkillButton) {
        const temptSkillDiv = document.getElementById("action_message");
        rollDiceSkillButton = document.createElement("button");
        rollDiceSkillButton.id = "rollDiceSkillButton";
        rollDiceSkillButton.innerText = "Lancer les dés d'Habileté";
        temptSkillDiv.appendChild(rollDiceSkillButton);
    }

    rollDiceSkillButton.addEventListener("click", () => {
        // Effectuer deux lancers de dés
        const diceRoll1 = rollDice();
        const diceRoll2 = rollDice();
        const totalRoll = diceRoll1 + diceRoll2;

        // Comparer le total des dés à l'HABILETÉ du personnage
        const skillCheckPassed = totalRoll <= gameState.character.skill;

        // Stocker le résultat dans gameState pour référence ultérieure
        gameState.skillCheckPassed = skillCheckPassed;

        // Afficher le résultat dans action_message
        const actionMessageDiv = document.getElementById("action_message");
        actionMessageDiv.innerHTML = skillCheckPassed ?
            `Vous avez lancé ${diceRoll1} et ${diceRoll2} (total: ${totalRoll}). <strong>Réussite !</strong> Votre habileté est suffisante.` :
            `Vous avez lancé ${diceRoll1} et ${diceRoll2} (total: ${totalRoll}). <strong>Échec...</strong> Votre habileté n'est pas suffisante.`;

        // Met à jour les boutons de choix
        updateChoiceButtons();
        
        // Désactiver le bouton pour éviter un second test
        rollDiceSkillButton.disabled = true;
    });
}



// Fonction rollDiceSkillAgain: permet de relancer en cas d'échec, chaque relance coûte 1 ENDURANCE
function rollDiceSkillAgain() {
    const actionMessageDiv = document.getElementById("action_message");

    // Préparer l'UI
    actionMessageDiv.innerHTML = `Test d'HABILETÉ. En cas d'échec, vous pouvez relancer en perdant 1 point d'ENDURANCE à chaque tentative.`;

    // Créer (ou récupérer) le bouton de lancer
    let rollButton = document.getElementById("rollDiceSkillAgainButton");
    if (!rollButton) {
        rollButton = document.createElement("button");
        rollButton.id = "rollDiceSkillAgainButton";
        rollButton.innerText = "Lancer les dés d'Habileté";
    }

    // Nettoyer et reposer le bouton
    actionMessageDiv.appendChild(rollButton);

    // Gestionnaire de clic
    rollButton.onclick = () => {
        const diceRoll1 = rollDice();
        const diceRoll2 = rollDice();
        const totalRoll = diceRoll1 + diceRoll2;

        const success = totalRoll <= gameState.character.skill;
        gameState.skillCheckPassed = success;

        if (success) {
            actionMessageDiv.innerHTML = `Vous avez lancé ${diceRoll1} et ${diceRoll2} (total: ${totalRoll}). <strong>Réussite !</strong> Votre habileté est suffisante.`;
            updateChoiceButtons();
            // Verrouiller le bouton après succès
            rollButton.disabled = true;
            return;
        }

        // Échec: proposer de relancer et appliquer le coût d'ENDURANCE si on relance
        actionMessageDiv.innerHTML = `Vous avez lancé ${diceRoll1} et ${diceRoll2} (total: ${totalRoll}). <strong>Échec...</strong> Votre habileté n'est pas suffisante.`;

        // Boutons d'action après échec
        const actionsContainer = document.createElement('div');

        const retryButton = document.createElement('button');
        retryButton.innerText = "Réessayer (-1 ENDURANCE)";
        const stopButton = document.createElement('button');
        stopButton.innerText = "Arrêter le test";

        actionsContainer.appendChild(retryButton);
        actionsContainer.appendChild(stopButton);
        actionMessageDiv.appendChild(actionsContainer);

        // Empêcher double-clics du bouton principal tant qu'une décision n'est pas prise
        rollButton.disabled = true;

        retryButton.onclick = () => {
            // Coût de relance
            gameState.character.health -= 1;
            updateCharacterStats();

            // Réactiver le bouton principal pour un nouveau lancer
            rollButton.disabled = false;
            actionMessageDiv.innerHTML = `Vous perdez 1 point d'ENDURANCE pour retenter. Lancez à nouveau les dés.`;
            actionMessageDiv.appendChild(rollButton);
            updateChoiceButtons();
        };

        stopButton.onclick = () => {
            // On conserve gameState.skillCheckPassed = false
            actionMessageDiv.innerHTML += `<p>Vous choisissez d'arrêter les tentatives.</p>`;
            updateChoiceButtons();
            // Laisser le bouton principal désactivé pour figer le résultat
        };
    };
}

// Fonction pour gérer l'effet multipleRollDiceSkill
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

            actionMessageDiv.innerHTML = `
                <p>Test ${currentRoll}/${times}</p>
                <p>Résultat des dés :<strong>${diceResult}</strong> / Votre HABILETÉ : <strong>${gameState.character.skill}</strong> --> ${isSuccess ? '<strong>Réussite !</strong>' : '<strong>Échec...</strong>'}</p> `;

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
// Vérifie si le bouton nécessite un test d'habileté et l'active/désactive en conséquence


// fonction générique de mise à jour des choix
export function updateChoiceButtons() {
    const choiceButtons = document.querySelectorAll("#choices button");

    choiceButtons.forEach(button => {
        // Mise à jour basée sur conditionMet
        if (button.hasAttribute("data-requiresConditionMet")) {
            button.disabled = !gameState.conditionMet;
        }

        // Mise à jour basée sur chanceCheckPassed
        if (button.hasAttribute("data-chanceCheckPassed")) {
            const chanceRequired = button.getAttribute("data-chanceCheckPassed") === "true";
            // Si aucun test de chance n'a été effectué, désactiver le bouton
            if (gameState.isLucky === undefined) {
                button.disabled = true;
            } else {
                button.disabled = gameState.isLucky !== chanceRequired;
            }
        }

        // Mise à jour basée sur skillCheckPassed
        if (button.hasAttribute("data-skillCheckPassed")) {
            const skillRequired = button.getAttribute("data-skillCheckPassed") === "true";
            // Si aucun test d'habileté n'a été effectué, désactiver le bouton
            if (gameState.skillCheckPassed === undefined) {
                button.disabled = true;
            } else {
                button.disabled = gameState.skillCheckPassed !== skillRequired;
            }
        }

        // Mise à jour basée sur skillChanceCheckPassed
        if (button.hasAttribute("data-skillChanceCheckPassed")) {
            const skillChanceRequired = button.getAttribute("data-skillChanceCheckPassed") === "true";
            // Si aucun test d'habileté+chance n'a été effectué, désactiver le bouton
            if (gameState.skillChanceCheckPassed === undefined) {
                button.disabled = true;
            } else {
                button.disabled = gameState.skillChanceCheckPassed !== skillChanceRequired;
            }
        }

        // Mise à jour basée sur requiresAllMonstersDefeated
        if (button.hasAttribute("data-requiresAllMonstersDefeated")) {
            const allMonstersDefeated = gameState.monsters.every(monster => monster.status === "vaincu");
            button.disabled = !allMonstersDefeated;
        }

        // Mise à jour basée sur requiresItem
        if (button.hasAttribute("data-requiresItem")) {
            const itemName = button.getAttribute("data-requiresItem");
            const hasItem = gameState.inventory.checkItem(itemName);
            button.disabled = !hasItem;
        }

        // Mise à jour basée sur doubleLuckCheck
        if (button.hasAttribute("data-doubleLuckCheck")) {
             const doubleLuckRequired = button.getAttribute("data-doubleLuckCheck") === "true";
             const bothLucky = gameState.luckResults && gameState.luckResults.length >= 2 && 
                     gameState.luckResults[0] === true && gameState.luckResults[1] === true;
             button.disabled = (doubleLuckRequired && !bothLucky) || (!doubleLuckRequired && bothLucky);
        }

        // Mise à jour basée sur woundedByLoupGarou
        if (button.hasAttribute("data-woundedByLoupGarou")) {
            const woundedRequired = button.getAttribute("data-woundedByLoupGarou") === "true";
            button.disabled = gameState.woundedByLoupGarou !== woundedRequired;
        }

        // Mise à jour basée sur isParalyzed
        if (button.hasAttribute("data-requiresParalysis")) {
            button.disabled = !gameState.isParalyzed;
        }

        // Mise à jour basée sur requiresMinAssaults
        if (button.hasAttribute("data-requiresMinAssaults")) {
            const minAssaults = parseInt(button.getAttribute("data-requiresMinAssaults"));
            button.disabled = gameState.assaultCount < minAssaults;
            if (button.disabled) {
                button.title = `Vous devez mener ${minAssaults} assauts avant de pouvoir fuir (${gameState.assaultCount}/${minAssaults})`;
            } else {
                button.title = ""; // Effacer le titre quand la condition est remplie
            }
        }

        // Mise à jour basée sur les conditions d'or
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

        // Mise à jour basée sur requiresEffectApplied
        if (button.hasAttribute("data-requiresEffectApplied")) {
            const effectRequired = button.getAttribute("data-requiresEffectApplied") === "true";
            button.disabled = gameState.effectApplied !== effectRequired;
        }

    });
}

// Fonction pour réduire la nourriture du joueur
function reduceFood(value) {
    const foodItems = gameState.inventory.items.filter(item => item.category === 'food');
    
    if (foodItems.length === 0) {
        return "Vous n'aviez aucune nourriture à perdre.";
    }

    if (value === "all" || value === "ALL") {
        // Supprimer toute la nourriture
        foodItems.forEach(item => {
            gameState.inventory.removeItem(item.name, item.quantity);
        });
        updateAdventureSheet();
        return "Vous avez perdu toute votre nourriture.";
    } else {
        // Supprimer une quantité spécifique
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

// Fonction pour donner 5 objets (chapitre 279)
function giveFiveItems() {
    const actionMessageDiv = document.getElementById('action_message');
    // Réinitialiser la condition
    gameState.conditionMet = false;
    gameState.itemsGiven = 0;

    // Compteur
    const countSpan = document.createElement('span');
    countSpan.id = 'itemCountDisplay';
    countSpan.innerHTML = `<strong>Objets donnés : ${gameState.itemsGiven}</strong>`;
    actionMessageDiv.appendChild(countSpan);
    actionMessageDiv.appendChild(document.createElement('br'));
    actionMessageDiv.appendChild(document.createElement('br'));

    const currentGold = gameState.inventory.checkItem('or') || 0;

    // Boutons pour donner 1 à 5 pièces d'or
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
                    // Supprimer tous les boutons d'or
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

    // Boutons pour équipements, bijoux, potions
    const allItems = gameState.inventory.items.filter(item => item.category === 'equipment' || item.category === 'jewelry' || item.category === 'potions');
    if (allItems.length > 0) {
        const categories = {
            'equipment': 'Équipements',
            'jewelry': 'Bijoux',
            'potions': 'Potions'
        };
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

// Fonction pour donner X objets (sans pièces d'or)
function giveXItems(numberOfItems) {
    const actionMessageDiv = document.getElementById('action_message');
    // Réinitialiser la condition
    gameState.conditionMet = false;
    gameState.itemsGiven = 0;

    // Compteur
    const countSpan = document.createElement('span');
    countSpan.id = 'itemCountDisplay';
    countSpan.innerHTML = `<strong>Objets donnés : ${gameState.itemsGiven}/${numberOfItems}</strong>`;
    actionMessageDiv.appendChild(countSpan);
    actionMessageDiv.appendChild(document.createElement('br'));
    actionMessageDiv.appendChild(document.createElement('br'));

    // Boutons pour équipements, bijoux, potions (pas de pièces d'or)
    const allItems = gameState.inventory.items.filter(item => item.category === 'equipment' || item.category === 'jewelry' || item.category === 'potions');
    if (allItems.length > 0) {
        const categories = {
            'equipment': 'Équipements',
            'jewelry': 'Bijoux',
            'potions': 'Potions'
        };
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

// Fonction pour récupérer un objet avec conversion automatique en or si nécessaire
function takeItem(itemName, quantity = 1, category = 'equipment', goldValue = 0) {
    const actionMessageDiv = document.getElementById('action_message');
    
    // Si c'est un bijou avec valeur marchande, le convertir directement en or
    if (category === 'jewelry' && goldValue > 0) {
        gameState.inventory.addItem('or', goldValue, 'gold');
        actionMessageDiv.innerHTML = `Vous avez récupéré ${quantity} ${itemName} (converti en ${goldValue} pièces d'or).`;
    } else {
        // Sinon, ajouter normalement
        gameState.inventory.addItem(itemName, quantity, category);
        actionMessageDiv.innerHTML = `Vous avez récupéré ${quantity} ${itemName}.`;
    }
    
    updateAdventureSheet();
}

// Fonction pour restaurer les statistiques (HABiLETÊ, ENDURANCE ou CHANCE)
function restoreStats() {
    const actionMessageDiv = document.getElementById('action_message');
    
    // Réinitialiser la condition
    gameState.conditionMet = false;
    
    actionMessageDiv.innerHTML = 'Le génie vous offre de restaurer une de vos statistiques à son niveau de départ :<br><br>';

    // Bouton pour restaurer l'HABiLETÊ
    if (gameState.character.skill < gameState.baseSkill) {
        const skillButton = document.createElement('button');
        skillButton.innerText = `Restaurer HABiLETÊ (${gameState.character.skill} → ${gameState.baseSkill})`;
        skillButton.addEventListener('click', () => {
            gameState.character.skill = gameState.baseSkill;
            actionMessageDiv.innerHTML = `<strong>Votre HABiLETÊ a été restaurée à ${gameState.baseSkill} !</strong>`;
            gameState.conditionMet = true;
            updateCharacterStats();
            updateAdventureSheet();
            updateChoiceButtons();
        });
        actionMessageDiv.appendChild(skillButton);
        actionMessageDiv.appendChild(document.createElement('br'));
    }

    // Bouton pour restaurer l'ENDURANCE
    if (gameState.character.health < gameState.baseHealth) {
        const healthButton = document.createElement('button');
        healthButton.innerText = `Restaurer ENDURANCE (${gameState.character.health} → ${gameState.baseHealth})`;
        healthButton.addEventListener('click', () => {
            gameState.character.health = gameState.baseHealth;
            actionMessageDiv.innerHTML = `<strong>Votre ENDURANCE a été restaurée à ${gameState.baseHealth} !</strong>`;
            gameState.conditionMet = true;
            updateCharacterStats();
            updateAdventureSheet();
            updateChoiceButtons();
        });
        actionMessageDiv.appendChild(healthButton);
        actionMessageDiv.appendChild(document.createElement('br'));
    }

    // Bouton pour restaurer la CHANCE
    if (gameState.character.chance < gameState.baseChance) {
        const chanceButton = document.createElement('button');
        chanceButton.innerText = `Restaurer CHANCE (${gameState.character.chance} → ${gameState.baseChance})`;
        chanceButton.addEventListener('click', () => {
            gameState.character.chance = gameState.baseChance;
            actionMessageDiv.innerHTML = `<strong>Votre CHANCE a été restaurée à ${gameState.baseChance} !</strong>`;
            gameState.conditionMet = true;
            updateCharacterStats();
            updateAdventureSheet();
            updateChoiceButtons();
        });
        actionMessageDiv.appendChild(chanceButton);
        actionMessageDiv.appendChild(document.createElement('br'));
    }

    // Si toutes les stats sont déjà au maximum
    if (gameState.character.skill >= gameState.baseSkill && 
        gameState.character.health >= gameState.baseHealth && 
        gameState.character.chance >= gameState.baseChance) {
        actionMessageDiv.innerHTML += '<strong>Toutes vos statistiques sont déjà à leur niveau maximum !</strong><br>';
        gameState.conditionMet = true;
        updateChoiceButtons();
    }
}


