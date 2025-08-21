import { gameState } from "./scripts_forest.js";
import { rollDice, tempt_chance } from "./chance.js";
import { updateCharacterStats } from "./character.js";
import { playAttackSound, playCriticalHitSound, playVictorySound, playDefeatSound } from "./music.js";
import { manageMonsters as normalManageMonsters } from "./battle.js";

// Fonction principale pour gérer le combat spécial du chapitre 96
export function manageDogFight(chapterMonsters) {
    const monsterContainer = document.getElementById('monsters');
    monsterContainer.innerHTML = '';

    // Réinitialisation et peuplement du tableau de monstres
    gameState.monsters = chapterMonsters.map(monsterData => ({
        ...monsterData,
        status: "vivant"
    }));

    // Initialiser l'état du combat spécial
    gameState.dogFightState = {
        phase: "first_dog", // "first_dog", "pair_choice", "priority", "other"
        currentPairIndex: null, // 0 pour première paire, 1 pour deuxième paire
        priorityIndex: null,
        otherIndex: null,
        pairs: [
            // Première paire : indices 1 et 2 (deuxième et troisième chiens)
            { indices: [1, 2] },
            // Deuxième paire : indices 3 et 4 (quatrième chien et homme masqué)
            { indices: [3, 4] }
        ]
    };

    // Commencer par le combat contre le premier chien
    if (gameState.monsters[0].status === "vivant") {
        setupFirstDogFight();
    } else {
        setupPairFight();
    }

    updateDogFightList();
}

// Configuration de l'interface pour le combat contre le premier chien
function setupFirstDogFight() {
    const monsterContainer = document.getElementById('monsters');
    monsterContainer.innerHTML = '';

    // Masquer le bouton d'attaque normal
    document.getElementById("attackButton").style.display = "none";

    const firstDog = gameState.monsters[0];

    // Ajouter le titre explicatif
    const titleDiv = document.createElement('div');
    titleDiv.innerHTML = '<p><strong>Combat contre le premier Chien de Chasse</strong></p>';
    titleDiv.style.marginBottom = '15px';
    monsterContainer.appendChild(titleDiv);

    // Afficher le premier chien
    const dogDiv = document.createElement('div');
    dogDiv.style.margin = '10px 0';
    dogDiv.innerHTML = `
        <strong>${firstDog.name}</strong> - Habileté: ${firstDog.skill}, Endurance: ${firstDog.health}<br>
        <button id="attackFirstDogButton" onclick="attackFirstDog()">
            Attaquer ${firstDog.name}
        </button>
    `;
    monsterContainer.appendChild(dogDiv);
}

// Fonction pour attaquer le premier chien
window.attackFirstDog = function() {
    performFirstDogAttack(0);
};

function performFirstDogAttack(index) {
    let character = gameState.character;
    let monster = gameState.monsters[index];
    let attackMessageDiv = document.getElementById("attack_message");

    // Incrémenter le compteur d'assauts
    gameState.assaultCount++;

    // modificateurs attaque 
    let attackModifier = 0;
    if (gameState.inventory.checkItem('casque en bronze')) {
        attackModifier += 1;
    }
    if (gameState.inventory.checkItem('bracelet d\'habileté')) {
        attackModifier += 1;
    }
    if (gameState.inventory.checkItem('gantelet d\'adresse à combattre')) {
        attackModifier += 1;
    }
    
    // Malédiction de l'anneau de lenteur
    if (gameState.inventory.checkItem('anneau de lenteur')) {
        attackModifier -= 2;
    }
    
    // Malus temporaire chapitre 49 : -3 à la force d'attaque
    if (gameState.currentChapterId === 49) {
        attackModifier -= 3;
    }

    // Calcul des forces d'attaque
    let charAttackForce = rollDice() + rollDice() + character.getCurrentSkill() + attackModifier + (monster.attackModifier || 0);
    let monsterAttackForce = rollDice() + rollDice() + monster.skill;

    // Calcul initial des dégâts
    let potentialDamageToMonster = charAttackForce > monsterAttackForce ? 2 : 0;
    let potentialDamageToCharacter = charAttackForce < monsterAttackForce ? 2 : 0;

    // Affichage du bonus temporaire dans le message d'attaque
    let attackReport = `Votre force d'attaque est de <strong>${charAttackForce}</strong>`;
    if (character.hasBoost('skillPotionBoost')) {
        attackReport += ` (Potion: +1, ${character.getBoostCombatsRemaining('skillPotionBoost')} combat(s) restant(s))`;
    }
    attackReport += `.<br> La force d'attaque du ${monster.name} est de <strong>${monsterAttackForce}</strong>.<br> `;
    
    if (charAttackForce > monsterAttackForce) {
        attackReport += `Vous pouvez infligez <strong>${potentialDamageToMonster}</strong> points de dégâts à ${monster.name}.<br>`;
        playAttackSound(true);
    } else if (charAttackForce < monsterAttackForce) {
        attackReport += `Le ${monster.name} peut vous infliger <strong>${potentialDamageToCharacter}</strong> points de dégâts.<br>`;
        playAttackSound(false);
    } else {
        attackReport += "<strong>Aucun de vous n'a infligé de dégâts.</strong>";
    }
    attackMessageDiv.innerHTML = attackReport;

    // Vérifier l'effet du bouclier d'empereur si le joueur subit des dégâts
    if (potentialDamageToCharacter > 0 && gameState.inventory.checkItem('bouclier d\'empereur')) {
        let shieldRoll = rollDice();
        attackReport += `<br><strong>Bouclier d'empereur activé!</strong> Lancer de dé : <strong>${shieldRoll}</strong><br>`;
        
        if (shieldRoll >= 4) {
            attackReport += "<strong>Le bouclier vous protège! Vous ne subissez qu'1 point de dégât et n'avez pas besoin de tenter votre chance.</strong>";
            attackMessageDiv.innerHTML = attackReport;
            
            character.health -= 1;
            attackMessageDiv.innerHTML += `<br><strong>Vous subissez 1 point de dégât grâce à votre bouclier.</strong><br>`;
            
            updateCharacterStats();
            finalizeFirstDogAttack();
            return;
        } else {
            attackReport += "<strong>Le bouclier ne vous protège pas cette fois.</strong><br>";
            attackMessageDiv.innerHTML = attackReport;
        }
    }

    // Si les forces ne sont pas égales, proposer la tentative de chance
    if (charAttackForce !== monsterAttackForce) {
        // Créer les boutons de tentative de chance
        const noTemptChanceButton = document.createElement('button');
        noTemptChanceButton.innerText = "Ne pas tenter votre Chance";
        noTemptChanceButton.style.marginRight = "10px";
        noTemptChanceButton.style.marginTop = "10px";

        const temptChanceButton = document.createElement('button');
        temptChanceButton.innerText = "Tenter votre Chance";
        temptChanceButton.style.marginTop = "10px";

        attackMessageDiv.appendChild(document.createElement('br'));
        attackMessageDiv.appendChild(noTemptChanceButton);
        attackMessageDiv.appendChild(temptChanceButton);

        // Désactiver le bouton d'attaque pendant le test de chance
        const attackButton = document.getElementById('attackFirstDogButton');
        if (attackButton) {
            attackButton.disabled = true;
        }

        noTemptChanceButton.onclick = () => {
            temptChanceButton.style.display = "none";
            noTemptChanceButton.style.display = "none";
            if (attackButton) attackButton.disabled = false;
            applyFirstDogDirectDamage(character, monster, potentialDamageToMonster, potentialDamageToCharacter);
        };

        temptChanceButton.onclick = () => {
            temptChanceButton.style.display = "none";
            noTemptChanceButton.style.display = "none";
            if (attackButton) attackButton.disabled = false;
            let success = tempt_chance(gameState.character.chance);
            applyFirstDogDamage(success, charAttackForce > monsterAttackForce, character, monster, potentialDamageToMonster, potentialDamageToCharacter);
        };
    } else {
        finalizeFirstDogAttack();
    }
}

function applyFirstDogDamage(success, playerWon, character, monster, potentialDamageToMonster, potentialDamageToCharacter) {
    let attackMessageDiv = document.getElementById("attack_message");
    if (playerWon) {
        let finalDamageToMonster = success ? potentialDamageToMonster + 1 : potentialDamageToMonster - 1;
        monster.health -= Math.max(finalDamageToMonster, 0);
        attackMessageDiv.innerHTML += `<strong>${monster.name} subit ${finalDamageToMonster} points de dégâts.</strong><br>`;
        
        if (success && finalDamageToMonster > potentialDamageToMonster) {
            playCriticalHitSound();
        }
    } else {
        let finalDamageToCharacter = success ? potentialDamageToCharacter - 1 : potentialDamageToCharacter + 1;
        character.health -= Math.max(finalDamageToCharacter, 0);
        attackMessageDiv.innerHTML += `<strong>Vous subissez ${finalDamageToCharacter} points de dégâts.</strong><br>`;
        
        if (!success && finalDamageToCharacter > potentialDamageToCharacter) {
            playCriticalHitSound();
        }
    }

    updateCharacterStats();
    finalizeFirstDogAttack();
}

function applyFirstDogDirectDamage(character, monster, potentialDamageToMonster, potentialDamageToCharacter) {
    let attackMessageDiv = document.getElementById("attack_message");

    if (potentialDamageToMonster > 0) {
        monster.health -= potentialDamageToMonster;
        attackMessageDiv.innerHTML += `<strong> Vous infligez ${potentialDamageToMonster} points de dégâts à ${monster.name}.</strong><br>`;
    } else if (potentialDamageToCharacter > 0) {
        character.health -= potentialDamageToCharacter;
        attackMessageDiv.innerHTML += `<strong>Le ${monster.name} vous inflige ${potentialDamageToCharacter} points de dégâts.</strong><br>`;
    }

    updateCharacterStats();
    finalizeFirstDogAttack();
}

window.attackFirstDogOld = function() {
    const character = gameState.character;
    const firstDog = gameState.monsters[0];
    const attackMessageDiv = document.getElementById("attack_message");

    // Calcul des modificateurs d'attaque
    let attackModifier = 0;
    if (gameState.inventory.checkItem('casque en bronze')) {
        attackModifier += 1;
    }
    if (gameState.inventory.checkItem('bracelet d\'habileté')) {
        attackModifier += 1;
    }
    if (gameState.inventory.checkItem('gantelet d\'adresse à combattre')) {
        attackModifier += 1;
    }
    
    // Malédiction de l'anneau de lenteur
    if (gameState.inventory.checkItem('anneau de lenteur')) {
        attackModifier -= 2;
    }
    
    // Combat avec le premier chien (règles normales)
    const charAttackForce = rollDice() + rollDice() + character.getCurrentSkill() + attackModifier;
    const dogAttackForce = rollDice() + rollDice() + firstDog.skill;
    
    // Calcul des dégâts potentiels
    let potentialDamageToMonster = charAttackForce > dogAttackForce ? 2 : 0;
    let potentialDamageToCharacter = charAttackForce < dogAttackForce ? 2 : 0;
    
    attackMessageDiv.innerHTML = `<strong>Combat contre ${firstDog.name}:</strong><br>`;
    
    // Affichage des forces d'attaque
    let attackReport = `Votre force d'attaque est de <strong>${charAttackForce}</strong>`;
    if (character.hasBoost('skillPotionBoost')) {
        attackReport += ` (Potion: +1, ${character.getBoostCombatsRemaining('skillPotionBoost')} combat(s) restant(s))`;
    }
    attackReport += `.<br>La force d'attaque de ${firstDog.name} est de <strong>${dogAttackForce}</strong>.<br>`;
    
    if (charAttackForce > dogAttackForce) {
        attackReport += `Vous pouvez infliger <strong>${potentialDamageToMonster}</strong> points de dégâts à ${firstDog.name}.<br>`;
        playAttackSound(true);
    } else if (charAttackForce < dogAttackForce) {
        attackReport += `${firstDog.name} peut vous infliger <strong>${potentialDamageToCharacter}</strong> points de dégâts.<br>`;
        playAttackSound(false);
    } else {
        attackReport += "<strong>Aucun de vous n'a infligé de dégâts.</strong><br>";
    }
    
    attackMessageDiv.innerHTML += attackReport;

    // Vérifier l'effet du bouclier d'empereur
    if (potentialDamageToCharacter > 0 && gameState.inventory.checkItem('bouclier d\'empereur')) {
        let shieldRoll = rollDice();
        attackReport = `<br><strong>Bouclier d'empereur activé!</strong> Lancer de dé : <strong>${shieldRoll}</strong><br>`;
        
        if (shieldRoll >= 4) {
            attackReport += "<strong>Le bouclier vous protège! Vous ne subissez qu'1 point de dégât et n'avez pas besoin de tenter votre chance.</strong>";
            attackMessageDiv.innerHTML += attackReport;
            
            character.health -= 1;
            attackMessageDiv.innerHTML += `<br><strong>Vous subissez 1 point de dégât grâce à votre bouclier.</strong><br>`;
            
            updateCharacterStats();
            finalizeFirstDogAttack();
            return;
        } else {
            attackReport += "<strong>Le bouclier ne vous protège pas cette fois.</strong><br>";
            attackMessageDiv.innerHTML += attackReport;
        }
    }

    // Si les forces ne sont pas égales, proposer la tentative de chance
    if (charAttackForce !== dogAttackForce) {
        // Stocker les valeurs pour les utiliser dans les callbacks
        gameState.dogFightState.tempValues = {
            charAttackForce,
            dogAttackForce,
            potentialDamageToMonster,
            potentialDamageToCharacter
        };

        // Désactiver le bouton d'attaque du premier chien
        const attackFirstDogButton = document.getElementById('attackFirstDogButton');
        if (attackFirstDogButton) {
            attackFirstDogButton.disabled = true;
        }

        // Afficher les boutons de tentative de chance
        let temptChanceButton = document.getElementById("temptChanceButton");
        let noTemptChanceButton = document.getElementById("no_temptChanceButton");

        temptChanceButton.style.display = "block";
        noTemptChanceButton.style.display = "block";

        temptChanceButton.onclick = () => {
            temptChanceButton.style.display = "none";
            noTemptChanceButton.style.display = "none";
            let success = tempt_chance(gameState.character.chance);
            applyFirstDogDamageWithChance(success, charAttackForce > dogAttackForce);
        };

        noTemptChanceButton.onclick = () => {
            temptChanceButton.style.display = "none";
            noTemptChanceButton.style.display = "none";
            applyFirstDogDamageWithoutChance();
        };
    } else {
        // Égalité, pas de dégâts, passer directement à l'étape suivante
        finalizeFirstDogAttack();
    }
}

// Fonction pour appliquer les dégâts avec tentative de chance (premier chien)
function applyFirstDogDamageWithChance(success, playerWon) {
    const character = gameState.character;
    const firstDog = gameState.monsters[0];
    const attackMessageDiv = document.getElementById("attack_message");
    const tempValues = gameState.dogFightState.tempValues;

    if (playerWon) {
        let finalDamageToMonster = success ? tempValues.potentialDamageToMonster + 1 : tempValues.potentialDamageToMonster - 1;
        finalDamageToMonster = Math.max(finalDamageToMonster, 0);
        firstDog.health -= finalDamageToMonster;
        attackMessageDiv.innerHTML += `<strong>${firstDog.name} subit ${finalDamageToMonster} points de dégâts.</strong><br>`;
        
        if (success && finalDamageToMonster > tempValues.potentialDamageToMonster) {
            playCriticalHitSound();
        }
    } else {
        let finalDamageToCharacter = success ? tempValues.potentialDamageToCharacter - 1 : tempValues.potentialDamageToCharacter + 1;
        finalDamageToCharacter = Math.max(finalDamageToCharacter, 0);
        character.health -= finalDamageToCharacter;
        attackMessageDiv.innerHTML += `<strong>Vous subissez ${finalDamageToCharacter} points de dégâts.</strong><br>`;
        
        if (!success && finalDamageToCharacter > tempValues.potentialDamageToCharacter) {
            playCriticalHitSound();
        }
    }

    updateCharacterStats();
    
    // Réactiver le bouton d'attaque du premier chien
    const attackFirstDogButton = document.getElementById('attackFirstDogButton');
    if (attackFirstDogButton) {
        attackFirstDogButton.disabled = false;
    }

    finalizeFirstDogAttack();
}

// Fonction pour appliquer les dégâts sans tentative de chance (premier chien)
function applyFirstDogDamageWithoutChance() {
    const character = gameState.character;
    const firstDog = gameState.monsters[0];
    const attackMessageDiv = document.getElementById("attack_message");
    const tempValues = gameState.dogFightState.tempValues;

    if (tempValues.potentialDamageToMonster > 0) {
        firstDog.health -= tempValues.potentialDamageToMonster;
        attackMessageDiv.innerHTML += `<strong>Vous infligez ${tempValues.potentialDamageToMonster} points de dégâts à ${firstDog.name}.</strong><br>`;
    } else if (tempValues.potentialDamageToCharacter > 0) {
        character.health -= tempValues.potentialDamageToCharacter;
        attackMessageDiv.innerHTML += `<strong>${firstDog.name} vous inflige ${tempValues.potentialDamageToCharacter} points de dégâts.</strong><br>`;
    }

    updateCharacterStats();
    
    // Réactiver le bouton d'attaque du premier chien
    const attackFirstDogButton = document.getElementById('attackFirstDogButton');
    if (attackFirstDogButton) {
        attackFirstDogButton.disabled = false;
    }

    finalizeFirstDogAttack();
}

// Fonction pour finaliser l'attaque du premier chien et passer à l'étape suivante
function finalizeFirstDogAttack() {
    const character = gameState.character;
    const firstDog = gameState.monsters[0];
    const attackMessageDiv = document.getElementById("attack_message");

    // Marquer le chien vaincu si nécessaire
    if (firstDog.health <= 0) {
        firstDog.status = "vaincu";
        attackMessageDiv.innerHTML += `<br><strong>${firstDog.name} est vaincu !</strong><br>`;
        playVictorySound();
    }

    // Vérifier si le combat continue
    if (checkEndOfBattle(character)) {
        return; // Combat terminé
    } else if (firstDog.status === "vaincu") {
        // Afficher le message de victoire et le bouton de continuation
        attackMessageDiv.innerHTML += "<br><strong>Le premier chien est vaincu !</strong><br><br>";
        
        // Créer un bouton de continuation
        const continueButton = document.createElement('button');
        continueButton.innerText = "Continuer le combat";
        continueButton.style.marginTop = "10px";
        continueButton.onclick = function() {
            // Nettoyer les messages
            attackMessageDiv.innerHTML = "<strong>Vous devez maintenant affronter les autres chiens et leur maître par paires !</strong><br>";
            gameState.dogFightState.phase = "pair_choice";
            setupPairFight();
        };
        attackMessageDiv.appendChild(continueButton);
        
        // Désactiver le bouton d'attaque et mettre à jour l'affichage
        const attackFirstDogButton = document.getElementById('attackFirstDogButton');
        if (attackFirstDogButton) {
            attackFirstDogButton.disabled = true;
        }
        updateFirstDogDisplay();
    } else {
        setupFirstDogFight(); // Continuer le combat avec le premier chien
    }
}

// Fonction pour mettre à jour l'affichage du premier chien
function updateFirstDogDisplay() {
    const monsterContainer = document.getElementById('monsters');
    const firstDog = gameState.monsters[0];
    
    // Vider et recréer l'affichage du premier chien
    monsterContainer.innerHTML = '';
    
    if (firstDog && firstDog.status === "vivant") {
        const dogDiv = document.createElement('div');
        dogDiv.style.margin = '10px 0';
        dogDiv.innerHTML = `
            <strong>${firstDog.name}</strong> - Habileté: ${firstDog.skill}, Endurance: ${firstDog.health}<br>
            <button id="attackFirstDogButton" onclick="attackFirstDog()" disabled>
                Attaquer ${firstDog.name}
            </button>
        `;
        monsterContainer.appendChild(dogDiv);
    } else if (firstDog && firstDog.status === "vaincu") {
        const dogDiv = document.createElement('div');
        dogDiv.style.margin = '10px 0';
        dogDiv.innerHTML = `
            <strong>${firstDog.name}</strong> - Habileté: ${firstDog.skill}, Endurance: 0 (Vaincu)<br>
        `;
        monsterContainer.appendChild(dogDiv);
    }
}

// Configuration de l'interface pour le combat par paires
function setupPairFight() {
    const monsterContainer = document.getElementById('monsters');
    monsterContainer.innerHTML = '';

    // Masquer le bouton d'attaque normal
    document.getElementById("attackButton").style.display = "none";

    // Trouver les paires disponibles
    const availablePairs = [];
    gameState.dogFightState.pairs.forEach((pair, index) => {
        const monsters = pair.indices.map(i => gameState.monsters[i]);
        if (monsters.some(m => m.status === "vivant")) {
            availablePairs.push({ pair, index });
        }
    });

    if (availablePairs.length === 0) {
        // Victoire totale
        const attackMessageDiv = document.getElementById("attack_message");
        attackMessageDiv.innerHTML += "<br><strong>Victoire ! Vous avez vaincu tous vos adversaires !</strong>";
        playVictorySound();
        updateChoiceButtonsState();
        return;
    }

    // Phase de choix de la paire
    if (gameState.dogFightState.phase === "pair_choice") {
        const titleDiv = document.createElement('div');
        titleDiv.innerHTML = '<p><strong>Quelle paire d\'adversaires voulez-vous affronter ?</strong></p>';
        titleDiv.style.marginBottom = '15px';
        monsterContainer.appendChild(titleDiv);

        // Afficher les paires disponibles
        availablePairs.forEach(({ pair, index }) => {
            const pairDiv = document.createElement('div');
            pairDiv.style.margin = '10px 0';
            const monsters = pair.indices.map(i => gameState.monsters[i]).filter(m => m.status === "vivant");
            
            if (monsters.length > 0) {
                let pairHtml = '<strong>Paire ' + (index + 1) + ':</strong><br>';
                monsters.forEach(monster => {
                    pairHtml += `${monster.name} - Habileté: ${monster.skill}, Endurance: ${monster.health}<br>`;
                });
                pairHtml += `<button onclick="selectPair(${index})" style="margin-top: 5px;">
                    Affronter cette paire
                </button>`;
                pairDiv.innerHTML = pairHtml;
                monsterContainer.appendChild(pairDiv);
            }
        });
    } else if (gameState.dogFightState.phase === "priority") {
        // Phase de choix de la cible prioritaire dans la paire sélectionnée
        const currentPair = gameState.dogFightState.pairs[gameState.dogFightState.currentPairIndex];
        const monsters = currentPair.indices
            .map(i => ({ monster: gameState.monsters[i], index: i }))
            .filter(m => m.monster.status === "vivant");

        const titleDiv = document.createElement('div');
        titleDiv.innerHTML = '<p><strong>Quel adversaire voulez-vous attaquer en priorité ?</strong></p>';
        titleDiv.style.marginBottom = '15px';
        monsterContainer.appendChild(titleDiv);

        monsters.forEach(({ monster, index }) => {
            const monsterDiv = document.createElement('div');
            monsterDiv.style.margin = '10px 0';
            monsterDiv.innerHTML = `
                <strong>${monster.name}</strong> - Habileté: ${monster.skill}, Endurance: ${monster.health}<br>
                <button onclick="selectPriorityTarget(${index})">
                    Attaquer ${monster.name} en priorité
                </button>
            `;
            monsterContainer.appendChild(monsterDiv);
        });
    } else {
        // Phase de combat
        const currentPair = gameState.dogFightState.pairs[gameState.dogFightState.currentPairIndex];
        const priorityMonster = gameState.monsters[gameState.dogFightState.priorityIndex];
        const otherMonster = gameState.monsters[gameState.dogFightState.otherIndex];

        const titleDiv = document.createElement('div');
        titleDiv.innerHTML = '<p><strong>Phase de combat</strong></p>';
        titleDiv.style.marginBottom = '15px';
        monsterContainer.appendChild(titleDiv);

        // Afficher le monstre prioritaire
        if (priorityMonster.status === "vivant") {
            const priorityDiv = document.createElement('div');
            priorityDiv.style.margin = '10px 0';
            priorityDiv.innerHTML = `
                <strong>${priorityMonster.name}</strong> - Habileté: ${priorityMonster.skill}, Endurance: ${priorityMonster.health}<br>
                <button id="attackPriorityButton" onclick="attackPriorityTarget()">
                    Attaquer ${priorityMonster.name}
                </button>
            `;
            monsterContainer.appendChild(priorityDiv);
        }

        // Afficher l'autre monstre
        if (otherMonster && otherMonster.status === "vivant") {
            const otherDiv = document.createElement('div');
            otherDiv.style.margin = '10px 0';
            otherDiv.innerHTML = `
                <strong>${otherMonster.name}</strong> - Habileté: ${otherMonster.skill}, Endurance: ${otherMonster.health}<br>
                <button onclick="attackOtherTarget()" style="opacity: 0.5;" disabled>
                    Attaquer ${otherMonster.name}
                </button>
            `;
            monsterContainer.appendChild(otherDiv);
        }
    }
}

// Fonction pour sélectionner une paire d'adversaires
window.selectPair = function(pairIndex) {
    gameState.dogFightState.currentPairIndex = pairIndex;
    gameState.dogFightState.phase = "priority";
    setupPairFight();
}

// Fonction pour sélectionner la cible prioritaire
window.selectPriorityTarget = function(monsterIndex) {
    const currentPair = gameState.dogFightState.pairs[gameState.dogFightState.currentPairIndex];
    const otherIndex = currentPair.indices.find(i => i !== monsterIndex && gameState.monsters[i].status === "vivant");
    
    gameState.dogFightState.priorityIndex = monsterIndex;
    gameState.dogFightState.otherIndex = otherIndex;
    gameState.dogFightState.phase = "combat";
    
    setupPairFight();
}

// Fonction pour attaquer la cible prioritaire
window.attackPriorityTarget = function() {
    const character = gameState.character;
    const priorityMonster = gameState.monsters[gameState.dogFightState.priorityIndex];
    const attackMessageDiv = document.getElementById("attack_message");

    // Calcul des modificateurs d'attaque
    let attackModifier = 0;
    if (gameState.inventory.checkItem('casque en bronze')) {
        attackModifier += 1;
    }
    if (gameState.inventory.checkItem('Bracelet d\'Habileté')) {
        attackModifier += 1;
    }
    if (gameState.inventory.checkItem('gantelet d\'adresse à combattre')) {
        attackModifier += 1;
    }
    
    // Malédiction de l'anneau de lenteur
    if (gameState.inventory.checkItem('anneau de lenteur')) {
        attackModifier -= 2;
    }
    
    // Combat avec le monstre prioritaire
    const charAttackForce = rollDice() + rollDice() + character.getCurrentSkill() + attackModifier;
    const monsterAttackForce = rollDice() + rollDice() + priorityMonster.skill;
    
    // Calcul des dégâts potentiels
    let potentialDamageToMonster = charAttackForce > monsterAttackForce ? 2 : 0;
    let potentialDamageToCharacter = charAttackForce < monsterAttackForce ? 2 : 0;
    
    attackMessageDiv.innerHTML = `<strong>Combat contre ${priorityMonster.name} (prioritaire):</strong><br>`;
    
    // Affichage des forces d'attaque
    let attackReport = `Votre force d'attaque est de <strong>${charAttackForce}</strong>`;
    if (character.hasBoost('skillPotionBoost')) {
        attackReport += ` (Potion: +1, ${character.getBoostCombatsRemaining('skillPotionBoost')} combat(s) restant(s))`;
    }
    attackReport += `.<br>La force d'attaque de ${priorityMonster.name} est de <strong>${monsterAttackForce}</strong>.<br>`;
    
    if (charAttackForce > monsterAttackForce) {
        attackReport += `Vous pouvez infliger <strong>${potentialDamageToMonster}</strong> points de dégâts à ${priorityMonster.name}.<br>`;
        playAttackSound(true);
    } else if (charAttackForce < monsterAttackForce) {
        attackReport += `${priorityMonster.name} peut vous infliger <strong>${potentialDamageToCharacter}</strong> points de dégâts.<br>`;
        playAttackSound(false);
    } else {
        attackReport += "<strong>Aucun de vous n'a infligé de dégâts.</strong><br>";
    }
    
    attackMessageDiv.innerHTML += attackReport;

    // Vérifier l'effet du bouclier d'empereur
    if (potentialDamageToCharacter > 0 && gameState.inventory.checkItem('bouclier d\'empereur')) {
        let shieldRoll = rollDice();
        attackReport = `<br><strong>Bouclier d'empereur activé!</strong> Lancer de dé : <strong>${shieldRoll}</strong><br>`;
        
        if (shieldRoll >= 4) {
            attackReport += "<strong>Le bouclier vous protège! Vous ne subissez qu'1 point de dégât et n'avez pas besoin de tenter votre chance.</strong>";
            attackMessageDiv.innerHTML += attackReport;
            
            character.health -= 1;
            attackMessageDiv.innerHTML += `<br><strong>Vous subissez 1 point de dégât grâce à votre bouclier.</strong><br>`;
            
            updateCharacterStats();
            finalizePriorityAttack();
            return;
        } else {
            attackReport += "<strong>Le bouclier ne vous protège pas cette fois.</strong><br>";
            attackMessageDiv.innerHTML += attackReport;
        }
    }

    // Si les forces ne sont pas égales, proposer la tentative de chance
    if (charAttackForce !== monsterAttackForce) {
        // Stocker les valeurs pour les utiliser dans les callbacks
        gameState.dogFightState.tempValues = {
            charAttackForce,
            monsterAttackForce,
            potentialDamageToMonster,
            potentialDamageToCharacter
        };

        // Désactiver le bouton d'attaque prioritaire
        const attackPriorityButton = document.getElementById('attackPriorityButton');
        if (attackPriorityButton) {
            attackPriorityButton.disabled = true;
        }

        // Afficher les boutons de tentative de chance
        let temptChanceButton = document.getElementById("temptChanceButton");
        let noTemptChanceButton = document.getElementById("no_temptChanceButton");

        temptChanceButton.style.display = "block";
        noTemptChanceButton.style.display = "block";

        temptChanceButton.onclick = () => {
            temptChanceButton.style.display = "none";
            noTemptChanceButton.style.display = "none";
            let success = tempt_chance(gameState.character.chance);
            applyPriorityDamageWithChance(success, charAttackForce > monsterAttackForce);
        };

        noTemptChanceButton.onclick = () => {
            temptChanceButton.style.display = "none";
            noTemptChanceButton.style.display = "none";
            applyPriorityDamageWithoutChance();
        };
    } else {
        // Égalité, pas de dégâts, passer à l'autre monstre
        attackOtherTarget();
    }
}

// Fonction pour appliquer les dégâts avec tentative de chance (monstre prioritaire)
function applyPriorityDamageWithChance(success, playerWon) {
    const character = gameState.character;
    const priorityMonster = gameState.monsters[gameState.dogFightState.priorityIndex];
    const attackMessageDiv = document.getElementById("attack_message");
    const tempValues = gameState.dogFightState.tempValues;

    if (playerWon) {
        let finalDamageToMonster = success ? tempValues.potentialDamageToMonster + 1 : tempValues.potentialDamageToMonster - 1;
        finalDamageToMonster = Math.max(finalDamageToMonster, 0);
        priorityMonster.health -= finalDamageToMonster;
        attackMessageDiv.innerHTML += `<strong>${priorityMonster.name} subit ${finalDamageToMonster} points de dégâts.</strong><br>`;
        
        if (success && finalDamageToMonster > tempValues.potentialDamageToMonster) {
            playCriticalHitSound();
        }
    } else {
        let finalDamageToCharacter = success ? tempValues.potentialDamageToCharacter - 1 : tempValues.potentialDamageToCharacter + 1;
        finalDamageToCharacter = Math.max(finalDamageToCharacter, 0);
        character.health -= finalDamageToCharacter;
        attackMessageDiv.innerHTML += `<strong>Vous subissez ${finalDamageToCharacter} points de dégâts.</strong><br>`;
        
        if (!success && finalDamageToCharacter > tempValues.potentialDamageToCharacter) {
            playCriticalHitSound();
        }
    }

    updateCharacterStats();
    
    // Réactiver le bouton d'attaque prioritaire
    const attackPriorityButton = document.getElementById('attackPriorityButton');
    if (attackPriorityButton) {
        attackPriorityButton.disabled = false;
    }
    
    finalizePriorityAttack();
}

// Fonction pour appliquer les dégâts sans tentative de chance (monstre prioritaire)
function applyPriorityDamageWithoutChance() {
    const character = gameState.character;
    const priorityMonster = gameState.monsters[gameState.dogFightState.priorityIndex];
    const attackMessageDiv = document.getElementById("attack_message");
    const tempValues = gameState.dogFightState.tempValues;

    if (tempValues.potentialDamageToMonster > 0) {
        priorityMonster.health -= tempValues.potentialDamageToMonster;
        attackMessageDiv.innerHTML += `<strong>Vous infligez ${tempValues.potentialDamageToMonster} points de dégâts à ${priorityMonster.name}.</strong><br>`;
    } else if (tempValues.potentialDamageToCharacter > 0) {
        character.health -= tempValues.potentialDamageToCharacter;
        attackMessageDiv.innerHTML += `<strong>${priorityMonster.name} vous inflige ${tempValues.potentialDamageToCharacter} points de dégâts.</strong><br>`;
    }

    updateCharacterStats();
    
    // Réactiver le bouton d'attaque prioritaire
    const attackPriorityButton = document.getElementById('attackPriorityButton');
    if (attackPriorityButton) {
        attackPriorityButton.disabled = false;
    }
    
    finalizePriorityAttack();
}

// Fonction pour finaliser l'attaque prioritaire et passer à l'autre monstre
function finalizePriorityAttack() {
    const priorityMonster = gameState.monsters[gameState.dogFightState.priorityIndex];
    const attackMessageDiv = document.getElementById("attack_message");

    // Marquer le monstre vaincu si nécessaire
    if (priorityMonster.health <= 0) {
        priorityMonster.status = "vaincu";
        attackMessageDiv.innerHTML += `<br><strong>${priorityMonster.name} est vaincu !</strong><br>`;
        playVictorySound();
    }

    // Mettre à jour l'affichage des monstres pour refléter les nouveaux points d'endurance
    updateMonsterDisplay();
    
    // Passer à l'attaque de l'autre monstre
    attackOtherTarget();
}

// Fonction pour attaquer l'autre monstre
window.attackOtherTarget = function() {
    const character = gameState.character;
    const otherMonster = gameState.monsters[gameState.dogFightState.otherIndex];
    const attackMessageDiv = document.getElementById("attack_message");



    // Vérifier si l'autre monstre existe et est encore vivant
    if (!otherMonster || otherMonster.status !== "vivant") {
        updateMonsterDisplay(); // Mettre à jour l'affichage avant de vérifier la fin
        checkDogFightEnd();
        return;
    }

    // Calcul des modificateurs d'attaque
    let attackModifier = 0;
    if (gameState.inventory.checkItem('casque en bronze')) {
        attackModifier += 1;
    }
    if (gameState.inventory.checkItem('Bracelet d\'Habileté')) {
        attackModifier += 1;
    }
    if (gameState.inventory.checkItem('gantelet d\'adresse à combattre')) {
        attackModifier += 1;
    }
    
    // Malédiction de l'anneau de lenteur
    if (gameState.inventory.checkItem('anneau de lenteur')) {
        attackModifier -= 2;
    }
    
    // Combat avec l'autre monstre (règles spéciales)
    const charAttackForce = rollDice() + rollDice() + character.getCurrentSkill() + attackModifier;
    const monsterAttackForce = rollDice() + rollDice() + otherMonster.skill;
    
    attackMessageDiv.innerHTML += `<br><strong>Combat simultané contre ${otherMonster.name} (règles spéciales):</strong><br>`;
    
    // Affichage des forces d'attaque
    let attackReport = `Votre force d'attaque est de <strong>${charAttackForce}</strong>`;
    if (character.hasBoost('skillPotionBoost')) {
        attackReport += ` (Potion: +1, ${character.getBoostCombatsRemaining('skillPotionBoost')} combat(s) restant(s))`;
    }
    attackReport += `.<br>Force d'attaque de ${otherMonster.name} est de <strong>${monsterAttackForce}</strong>.<br>`;
    
    let damageToCharacter = 0;
    
    if (charAttackForce > monsterAttackForce) {
        attackReport += `<strong>Vous esquivez l'attaque de ${otherMonster.name} !</strong><br>`;
        playAttackSound(true);
    } else if (charAttackForce < monsterAttackForce) {
        damageToCharacter = 2;
        attackReport += `<strong>${otherMonster.name} vous touche pour 2 points de dégâts !</strong><br>`;
        playAttackSound(false);
    } else {
        attackReport += `<strong>Égalité avec ${otherMonster.name} - aucun dégât.</strong><br>`;
    }
    
    attackMessageDiv.innerHTML += attackReport;

    // Vérifier l'effet du bouclier d'empereur
    if (damageToCharacter > 0 && gameState.inventory.checkItem('bouclier d\'empereur')) {
        let shieldRoll = rollDice();
        attackReport = `<br><strong>Bouclier d'empereur activé!</strong> Lancer de dé : <strong>${shieldRoll}</strong><br>`;
        
        if (shieldRoll >= 4) {
            attackReport += "<strong>Le bouclier vous protège! Vous ne subissez qu'1 point de dégât.</strong><br>";
            attackMessageDiv.innerHTML += attackReport;
            character.health -= 1;
            attackMessageDiv.innerHTML += `<br><strong>Vous subissez 1 point de dégât grâce à votre bouclier.</strong><br>`;
        } else {
            attackReport += "<strong>Le bouclier ne vous protège pas cette fois.</strong><br>";
            attackMessageDiv.innerHTML += attackReport;
            character.health -= damageToCharacter;
            attackMessageDiv.innerHTML += `<br><strong>Vous subissez ${damageToCharacter} points de dégâts.</strong><br>`;
        }
    } else if (damageToCharacter > 0) {
        character.health -= damageToCharacter;
    }

    updateCharacterStats();
    checkDogFightEnd();
}

// Fonction pour vérifier la fin du combat
function checkDogFightEnd() {
    const character = gameState.character;
    const attackMessageDiv = document.getElementById("attack_message");

    // Vérifier d'abord la défaite du joueur
    if (character.health <= 0) {
        attackMessageDiv.innerHTML += "<br><strong>Vous avez été vaincu. Game Over.</strong>";
        playDefeatSound();
        updateChoiceButtonsState();
        return;
    }

    // Vérifier si tous les monstres de la paire actuelle sont vaincus
    const currentPair = gameState.dogFightState.pairs[gameState.dogFightState.currentPairIndex];
    const currentPairMonsters = currentPair.indices.map(i => gameState.monsters[i]);
    const allCurrentPairDefeated = currentPairMonsters.every(m => m.status === "vaincu");
    


    if (allCurrentPairDefeated) {
        // Vérifier s'il reste d'autres paires à combattre
        const remainingPairs = gameState.dogFightState.pairs.some((pair, index) => {
            if (index === gameState.dogFightState.currentPairIndex) return false;
            return pair.indices.some(i => gameState.monsters[i].status === "vivant");
        });

        if (remainingPairs) {
            // Trouver l'autre paire disponible
            const nextPairIndex = gameState.dogFightState.pairs.findIndex((pair, index) => {
                if (index === gameState.dogFightState.currentPairIndex) return false;
                return pair.indices.some(i => gameState.monsters[i].status === "vivant");
            });
            
            attackMessageDiv.innerHTML += "<br><strong>Cette paire est vaincue ! Vous devez maintenant affronter l'autre paire.</strong><br><br>";
            
            // Créer un bouton pour passer à l'autre paire
            const nextPairButton = document.createElement('button');
            nextPairButton.innerText = "Affronter l'autre paire";
            nextPairButton.style.marginTop = "10px";
            nextPairButton.onclick = function() {
                // Nettoyer les messages et passer à l'autre paire
                attackMessageDiv.innerHTML = "<strong>Nouvelle paire d'adversaires ! Choisissez votre cible prioritaire :</strong><br>";
                gameState.dogFightState.currentPairIndex = nextPairIndex;
                gameState.dogFightState.phase = "priority";
                gameState.dogFightState.priorityIndex = null;
                gameState.dogFightState.otherIndex = null;
                setupPairFight();
            };
            attackMessageDiv.appendChild(nextPairButton);
            return; // Arrêter ici pour attendre le clic
        } else {
            // Toutes les paires sont vaincues - victoire totale
            attackMessageDiv.innerHTML += "<br><strong>Victoire ! Vous avez vaincu tous vos adversaires !</strong>";
            
            // Décrémenter les boost temporaires après le combat
            const expiredBoosts = character.decrementBoosts();
            expiredBoosts.forEach(boostType => {
                if (boostType === 'skillPotionBoost') {
                    attackMessageDiv.innerHTML += "<br><em>L'effet de la Potion d'Adresse au Combat a expiré.</em>";
                }
            });
            
            if (character.hasBoost('skillPotionBoost')) {
                attackMessageDiv.innerHTML += `<br><em>Potion d'Adresse : ${character.getBoostCombatsRemaining('skillPotionBoost')} combat(s) restant(s).</em>`;
            }
            
            updateCharacterStats();
            updateChoiceButtonsState();
            playVictorySound();
            return;
        }
    } else {
        // Vérifier combien de monstres sont encore vivants dans la paire actuelle
        const aliveInCurrentPair = currentPairMonsters.filter(m => m.status === "vivant").length;
        
        if (aliveInCurrentPair <= 1) {
            // S'il ne reste qu'un seul monstre, proposer de continuer en combat normal
            attackMessageDiv.innerHTML += "<br><br><strong>Il ne reste qu'un adversaire ! Le combat continue en mode normal.</strong><br>";
            
            const continueNormalButton = document.createElement('button');
            continueNormalButton.innerText = "Continuer le combat";
            continueNormalButton.style.marginTop = "10px";
            continueNormalButton.onclick = function() {
                attackMessageDiv.innerHTML = "";
                setupSingleMonsterFight();
            };
            attackMessageDiv.appendChild(continueNormalButton);
            return;
        } else {
            // Il reste plusieurs monstres - demander de choisir la cible prioritaire
            attackMessageDiv.innerHTML += "<br><br>";
            
            // Créer un bouton de continuation pour le prochain assaut
            const continueAssaultButton = document.createElement('button');
            continueAssaultButton.innerText = "Continuer le combat et choisir autre cible prioritaire";
            continueAssaultButton.style.marginTop = "10px";
            continueAssaultButton.onclick = function() {
                // Nettoyer les messages et passer au choix de priorité
                attackMessageDiv.innerHTML = "";
                gameState.dogFightState.phase = "priority";
                setupPairFight();
            };
            attackMessageDiv.appendChild(continueAssaultButton);
            
            // Désactiver les boutons d'attaque pendant qu'on attend la confirmation
            const attackPriorityButton = document.getElementById('attackPriorityButton');
            if (attackPriorityButton) {
                attackPriorityButton.disabled = true;
            }
            return; // Arrêter ici pour attendre le clic
        }
    }
}

// Fonction pour configurer le combat normal contre le dernier monstre d'une paire
function setupSingleMonsterFight() {
    const monsterContainer = document.getElementById('monsters');
    monsterContainer.innerHTML = '';
    
    // Trouver le dernier monstre vivant dans la paire actuelle
    const currentPair = gameState.dogFightState.pairs[gameState.dogFightState.currentPairIndex];
    const aliveMonster = currentPair.indices
        .map(i => gameState.monsters[i])
        .find(m => m.status === "vivant");
    
    if (aliveMonster) {
        // Afficher le monstre avec un bouton d'attaque normal
        const monsterDiv = document.createElement('div');
        monsterDiv.style.margin = '10px 0';
        monsterDiv.innerHTML = `
            <strong>${aliveMonster.name}</strong> - Habileté: ${aliveMonster.skill}, Endurance: ${aliveMonster.health}<br>
            <button onclick="window.attackSingleMonster()">
                Attaquer ${aliveMonster.name}
            </button>
        `;
        monsterContainer.appendChild(monsterDiv);
        
        // Stocker l'index du monstre pour les attaques
        gameState.dogFightState.singleMonsterIndex = gameState.monsters.indexOf(aliveMonster);
        gameState.dogFightState.phase = "single_combat";
    }
}

// Fonction pour attaquer le dernier monstre d'une paire (copié de battle.js)
window.attackSingleMonster = function() {
    performSingleMonsterAttack(gameState.dogFightState.singleMonsterIndex);
};

function performSingleMonsterAttack(index) {
    let character = gameState.character;
    let monster = gameState.monsters[index];
    let attackMessageDiv = document.getElementById("attack_message");

    // Incrémenter le compteur d'assauts
    gameState.assaultCount++;

    // modificateurs attaque 
    let attackModifier = 0;
    if (gameState.inventory.checkItem('casque en bronze')) {
        attackModifier += 1;
    }
    if (gameState.inventory.checkItem('Bracelet d\'Habileté')) {
        attackModifier += 1;
    }
    if (gameState.inventory.checkItem('gantelet d\'adresse à combattre')) {
        attackModifier += 1;
    }
    
    // Malédiction de l'anneau de lenteur
    if (gameState.inventory.checkItem('anneau de lenteur')) {
        attackModifier -= 2;
    }
    
    // Malus temporaire chapitre 49 : -3 à la force d'attaque
    if (gameState.currentChapterId === 49) {
        attackModifier -= 3;
    }

    // Calcul des forces d'attaque
    let charAttackForce = rollDice() + rollDice() + character.getCurrentSkill() + attackModifier + (monster.attackModifier || 0);
    let monsterAttackForce = rollDice() + rollDice() + monster.skill;

    // Calcul initial des dégâts
    let potentialDamageToMonster = charAttackForce > monsterAttackForce ? 2 : 0;
    let potentialDamageToCharacter = charAttackForce < monsterAttackForce ? 2 : 0;

    // Affichage du bonus temporaire dans le message d'attaque
    let attackReport = `Votre force d'attaque est de <strong>${charAttackForce}</strong>`;
    if (character.hasBoost('skillPotionBoost')) {
        attackReport += ` (Potion: +1, ${character.getBoostCombatsRemaining('skillPotionBoost')} combat(s) restant(s))`;
    }
    attackReport += `.<br> La force d'attaque du ${monster.name} est de <strong>${monsterAttackForce}</strong>.<br> `;
    
    if (charAttackForce > monsterAttackForce) {
        attackReport += `Vous pouvez infligez <strong>${potentialDamageToMonster}</strong> points de dégâts à ${monster.name}.<br>`;
        playAttackSound(true);
    } else if (charAttackForce < monsterAttackForce) {
        attackReport += `Le ${monster.name} peut vous infliger <strong>${potentialDamageToCharacter}</strong> points de dégâts.<br>`;
        playAttackSound(false);
    } else {
        attackReport += "<strong>Aucun de vous n'a infligé de dégâts.</strong>";
    }
    attackMessageDiv.innerHTML = attackReport;

    // Vérifier l'effet du bouclier d'empereur si le joueur subit des dégâts
    if (potentialDamageToCharacter > 0 && gameState.inventory.checkItem('bouclier d\'empereur')) {
        let shieldRoll = rollDice();
        attackReport += `<br><strong>Bouclier d'empereur activé!</strong> Lancer de dé : <strong>${shieldRoll}</strong><br>`;
        
        if (shieldRoll >= 4) {
            attackReport += "<strong>Le bouclier vous protège! Vous ne subissez qu'1 point de dégât et n'avez pas besoin de tenter votre chance.</strong>";
            attackMessageDiv.innerHTML = attackReport;
            
            character.health -= 1;
            attackMessageDiv.innerHTML += `<br><strong>Vous subissez 1 point de dégât grâce à votre bouclier.</strong><br>`;
            
            updateCharacterStats();
            checkSingleMonsterEndOfBattle(character, monster);
            return;
        } else {
            attackReport += "<strong>Le bouclier ne vous protège pas cette fois.</strong><br>";
            attackMessageDiv.innerHTML = attackReport;
        }
    }

    // Si les forces ne sont pas égales, proposer la tentative de chance
    if (charAttackForce !== monsterAttackForce) {
        // Créer les boutons de tentative de chance
        const noTemptChanceButton = document.createElement('button');
        noTemptChanceButton.innerText = "Ne pas tenter votre Chance";
        noTemptChanceButton.style.marginRight = "10px";
        noTemptChanceButton.style.marginTop = "10px";

        const temptChanceButton = document.createElement('button');
        temptChanceButton.innerText = "Tenter votre Chance";
        temptChanceButton.style.marginTop = "10px";

        attackMessageDiv.appendChild(document.createElement('br'));
        attackMessageDiv.appendChild(noTemptChanceButton);
        attackMessageDiv.appendChild(temptChanceButton);

        // Désactiver le bouton d'attaque pendant le test de chance
        const attackButton = document.querySelector('button[onclick*="attackSingleMonster"]');
        if (attackButton) {
            attackButton.disabled = true;
        }

        noTemptChanceButton.onclick = () => {
            temptChanceButton.style.display = "none";
            noTemptChanceButton.style.display = "none";
            if (attackButton) attackButton.disabled = false;
            applySingleMonsterDirectDamage(character, monster, potentialDamageToMonster, potentialDamageToCharacter);
        };

        temptChanceButton.onclick = () => {
            temptChanceButton.style.display = "none";
            noTemptChanceButton.style.display = "none";
            if (attackButton) attackButton.disabled = false;
            let success = tempt_chance(gameState.character.chance);
            applySingleMonsterDamage(success, charAttackForce > monsterAttackForce, character, monster, potentialDamageToMonster, potentialDamageToCharacter);
        };
    } else {
        checkSingleMonsterEndOfBattle(character, monster);
    }
}

function applySingleMonsterDamage(success, playerWon, character, monster, potentialDamageToMonster, potentialDamageToCharacter) {
    let attackMessageDiv = document.getElementById("attack_message");
    if (playerWon) {
        let finalDamageToMonster = success ? potentialDamageToMonster + 1 : potentialDamageToMonster - 1;
        monster.health -= Math.max(finalDamageToMonster, 0);
        attackMessageDiv.innerHTML += `<strong>${monster.name} subit ${finalDamageToMonster} points de dégâts.</strong><br>`;
        
        if (success && finalDamageToMonster > potentialDamageToMonster) {
            playCriticalHitSound();
        }
    } else {
        let finalDamageToCharacter = success ? potentialDamageToCharacter - 1 : potentialDamageToCharacter + 1;
        character.health -= Math.max(finalDamageToCharacter, 0);
        attackMessageDiv.innerHTML += `<strong>Vous subissez ${finalDamageToCharacter} points de dégâts.</strong><br>`;
        
        if (!success && finalDamageToCharacter > potentialDamageToCharacter) {
            playCriticalHitSound();
        }
    }

    updateCharacterStats();
    checkSingleMonsterEndOfBattle(character, monster);
}

function applySingleMonsterDirectDamage(character, monster, potentialDamageToMonster, potentialDamageToCharacter) {
    let attackMessageDiv = document.getElementById("attack_message");

    if (potentialDamageToMonster > 0) {
        monster.health -= potentialDamageToMonster;
        attackMessageDiv.innerHTML += `<strong> Vous infligez ${potentialDamageToMonster} points de dégâts à ${monster.name}.</strong><br>`;
    } else if (potentialDamageToCharacter > 0) {
        character.health -= potentialDamageToCharacter;
        attackMessageDiv.innerHTML += `<strong>Le ${monster.name} vous inflige ${potentialDamageToCharacter} points de dégâts.</strong><br>`;
    }

    updateCharacterStats();
    checkSingleMonsterEndOfBattle(character, monster);
}

function checkSingleMonsterEndOfBattle(character, monster) {
    let attackMessageDiv = document.getElementById("attack_message");
    if (character.health <= 0) {
        attackMessageDiv.innerHTML += "<strong> Vous avez été vaincu. Game Over.</strong>";
        playDefeatSound();
        updateChoiceButtonsState();
    } else if (monster.health <= 0) {
        monster.status = "vaincu";
        attackMessageDiv.innerHTML += `<strong> Vous avez vaincu ${monster.name}!</strong>`;
        
        // Décrémenter les boost temporaires après chaque combat gagné
        const expiredBoosts = character.decrementBoosts();
        
        expiredBoosts.forEach(boostType => {
            if (boostType === 'skillPotionBoost') {
                attackMessageDiv.innerHTML += "<br><em>L'effet de la Potion d'Adresse au Combat a expiré.</em>";
            }
        });
        
        if (character.hasBoost('skillPotionBoost')) {
            attackMessageDiv.innerHTML += `<br><em>Potion d'Adresse : ${character.getBoostCombatsRemaining('skillPotionBoost')} combat(s) restant(s).</em>`;
        }
        
        updateCharacterStats();
        playVictorySound();
        setupSingleMonsterFight();
        checkDogFightEnd();
    } else {
        setupSingleMonsterFight();
    }
}

// Fonction pour mettre à jour l'affichage des monstres dans l'interface
function updateMonsterDisplay() {
    if (gameState.dogFightState.phase === "combat") {
        const monsterContainer = document.getElementById('monsters');
        const priorityMonster = gameState.monsters[gameState.dogFightState.priorityIndex];
        const otherMonster = gameState.monsters[gameState.dogFightState.otherIndex];
        
        // Vider et recréer l'affichage
        monsterContainer.innerHTML = '';
        
        const titleDiv = document.createElement('div');
        titleDiv.innerHTML = '<p><strong>Phase de combat</strong></p>';
        titleDiv.style.marginBottom = '15px';
        monsterContainer.appendChild(titleDiv);

        // Afficher le monstre prioritaire avec l'endurance mise à jour
        if (priorityMonster.status === "vivant") {
            const priorityDiv = document.createElement('div');
            priorityDiv.style.margin = '10px 0';
            priorityDiv.innerHTML = `
                <strong>${priorityMonster.name}</strong> - Habileté: ${priorityMonster.skill}, Endurance: ${priorityMonster.health}<br>
                <button id="attackPriorityButton" onclick="attackPriorityTarget()">
                    Attaquer ${priorityMonster.name}
                </button>
            `;
            monsterContainer.appendChild(priorityDiv);
        }

        // Afficher l'autre monstre avec l'endurance mise à jour
        if (otherMonster && otherMonster.status === "vivant") {
            const otherDiv = document.createElement('div');
            otherDiv.style.margin = '10px 0';
            otherDiv.innerHTML = `
                <strong>${otherMonster.name}</strong> - Habileté: ${otherMonster.skill}, Endurance: ${otherMonster.health}<br>
                <button onclick="attackOtherTarget()" style="opacity: 0.5;" disabled>
                    Attaquer ${otherMonster.name}
                </button>
            `;
            monsterContainer.appendChild(otherDiv);
        }
    }
}

// Fonction pour mettre à jour la liste des monstres
function updateDogFightList() {
    updateCharacterStats();
}

// Fonction pour vérifier la fin de bataille
function checkEndOfBattle(character) {
    const attackMessageDiv = document.getElementById("attack_message");
    
    if (character.health <= 0) {
        attackMessageDiv.innerHTML += "<br><strong>Vous avez été vaincu. Game Over.</strong>";
        playDefeatSound();
        updateChoiceButtonsState();
        return true; // Bataille terminée
    }
    
    const allMonstersDefeated = gameState.monsters.every(monster => monster.status === "vaincu");
    if (allMonstersDefeated) {
        attackMessageDiv.innerHTML += "<br><strong>Victoire ! Vous avez vaincu tous vos adversaires !</strong>";
        
        // Décrémenter les boost temporaires après le combat
        const expiredBoosts = character.decrementBoosts();
        expiredBoosts.forEach(boostType => {
            if (boostType === 'skillPotionBoost') {
                attackMessageDiv.innerHTML += "<br><em>L'effet de la Potion d'Adresse au Combat a expiré.</em>";
            }
        });
        
        if (character.hasBoost('skillPotionBoost')) {
            attackMessageDiv.innerHTML += `<br><em>Potion d'Adresse : ${character.getBoostCombatsRemaining('skillPotionBoost')} combat(s) restant(s).</em>`;
        }
        
        updateCharacterStats();
        updateChoiceButtonsState();
        playVictorySound();
        return true; // Bataille terminée
    }
    
    return false; // Bataille continue
}

// Fonction pour mettre à jour l'état des boutons de choix
function updateChoiceButtonsState() {
    const allMonstersDefeated = gameState.monsters.every(monster => monster.status === "vaincu");
    const choices = document.getElementById('choices').getElementsByTagName('button');

    for (let choice of choices) {
        if (choice.getAttribute('data-requiresAllMonstersDefeated') === 'true') {
            choice.disabled = !allMonstersDefeated;
        }
    }
}