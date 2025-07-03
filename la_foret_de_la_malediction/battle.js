import { gameState } from "./scripts_forest.js";
import { rollDice, tempt_chance } from "./chance.js";
import { updateCharacterStats } from "./character.js";
import { playAttackSound, playCriticalHitSound, playVictorySound, playDefeatSound } from "./music.js";


//fonction manageMonsters
export function manageMonsters(chapterMonsters) {
    const monsterContainer = document.getElementById('monsters');
    monsterContainer.innerHTML = ''; // Réinitialiser le contenu


    // Réinitialisation et peuplement du tableau de monstres
    gameState.monsters = chapterMonsters.map(monsterData => ({
        ...monsterData,
        status: "vivant"
    }));

    updateMonsterList();
    selectCurrentMonster(0);
}

// met à jour la liste des monstres    
function updateMonsterList() {
    const monsterContainer = document.getElementById('monsters');
    monsterContainer.innerHTML = ''; // Réinitialise le contenu pour la mise à jour

    gameState.monsters.forEach((monster, index) => {
        let monsterInfo = document.createElement('div');
        monsterInfo.innerHTML = `<strong>${monster.name}</strong>, Habileté : ${monster.skill}, Endurance : ${monster.health}, Statut : ${monster.status}<br>`;
        monsterContainer.appendChild(monsterInfo);
    });
}

// fonction de mise à jour boutons choix
function updateChoiceButtonsState() {
    const allMonstersDefeated = gameState.monsters.every(monster => monster.status === "vaincu");
    const choices = document.getElementById('choices').getElementsByTagName('button');

    for (let choice of choices) {
        // Si le bouton nécessite que tous les monstres soient vaincus pour être activé
        if (choice.getAttribute('data-requiresAllMonstersDefeated') === 'true') {
            choice.disabled = !allMonstersDefeated;
        }
    }
}

// selectionne le monstre actuel
function selectCurrentMonster(index) {
    if (index < gameState.monsters.length) {
        const currentMonster = gameState.monsters[index];
        const actualMonsterDiv = document.getElementById('actual_monster');
        actualMonsterDiv.innerHTML = `Monstre actuel : ${currentMonster.name}, Habileté : ${currentMonster.skill}, Endurance : ${currentMonster.health}, Statut : ${currentMonster.status}`;

        // Mise à jour des boutons
        const attackButton = document.getElementById('attackButton');
        attackButton.innerText = `Attaquer ${currentMonster.name}`;
        attackButton.style.display = 'block';
        attackButton.onclick = () => performAttack(index);
    }
}

// selectionne le monstre suivant
function selectNextMonster() {
    // Trouver l'index du monstre actuellement affiché
    let currentIndex = gameState.monsters.findIndex(monster => monster.status === "vivant");

    // Marquer le monstre actuel comme vaincu si son endurance est 0 ou moins
    if (gameState.monsters[currentIndex].health <= 0) {
        gameState.monsters[currentIndex].status = "vaincu";
        updateMonsterList(); // Mise à jour de la liste des monstres dans l'UI
    }

    // Trouver l'index du prochain monstre vivant
    let nextIndex = gameState.monsters.findIndex((monster, index) => index > currentIndex && monster.status === "vivant");

    // Vérifier s'il y a un prochain monstre à combattre
    if (nextIndex !== -1) {
        // Si oui, préparer l'UI pour le combat avec le prochain monstre
        selectCurrentMonster(nextIndex);
    } else {
        // Si non, gérer la fin de la rencontre
        document.getElementById("attack_message").innerHTML += " Tous les monstres ont été vaincus!";
        updateChoiceButtonsState();
        // cacher le bouton d'attaque 
        document.getElementById("attackButton").style.display = "none";
    }
}

//combats
function performAttack(index) {

    let character = gameState.character;
    let monster = gameState.monsters[index];

    let attackMessageDiv = document.getElementById("attack_message");

    // modificateurs attaque 
    let attackModifier = 0;
    if (gameState.inventory.checkItem('casque en bronze')) {
        attackModifier += 1;
    }
    if (gameState.inventory.checkItem('Bracelet d\'Habileté')) {
        attackModifier += 1;
    }

    // Jouer le son d'attaque au début du combat
    playAttackSound(true); // Son d'attaque du joueur

    // Calcul des forces d'attaque
    let charAttackForce = rollDice() + rollDice() + character.skill + attackModifier + (monster.attackModifier || 0);
    let monsterAttackForce = rollDice() + rollDice() + monster.skill;

    // Calcul initial des dégâts
    let potentialDamageToMonster = charAttackForce > monsterAttackForce ? 2 : 0;
    let potentialDamageToCharacter = charAttackForce < monsterAttackForce ? 2 : 0;

    // Mise à jour du rapport d'attaque
    let attackReport = `Votre force d'attaque est de ${charAttackForce}.<br> La force d'attaque du ${monster.name} est de ${monsterAttackForce}.<br> `;
    if (charAttackForce > monsterAttackForce) {
        attackReport += `Vous pouvez infligez ${potentialDamageToMonster} points de dégâts à ${monster.name}.<br>`;
    } else if (charAttackForce < monsterAttackForce) {
        attackReport += `Le ${monster.name} peut vous infliger ${potentialDamageToCharacter} points de dégâts.<br>`;
    } else {
        // Si les forces d'attaque sont égales, aucun de vous n'a infligé de dégâts
        attackReport += "<strong>Aucun de vous n'a infligé de dégâts.</strong>";
    }
    attackMessageDiv.innerHTML = attackReport;

    // Affichage des boutons selon le résultat de l'attaque
    let temptChanceButton = document.getElementById("temptChanceButton");
    let noTemptChanceButton = document.getElementById("no_temptChanceButton");
    let attackButton = document.getElementById("attackButton");

    // Désactiver le bouton d'attaque pendant la décision
    attackButton.disabled = true;

    if (charAttackForce !== monsterAttackForce) {
        temptChanceButton.style.display = "block";
        noTemptChanceButton.style.display = "block";

        temptChanceButton.onclick = () => {
            attackButton.disabled = false;
            temptChanceButton.style.display = "none";
            noTemptChanceButton.style.display = "none";
            let success = tempt_chance(gameState.character.chance);
            applyDamage(success, charAttackForce > monsterAttackForce, character, monster, potentialDamageToMonster, potentialDamageToCharacter);
        };

        noTemptChanceButton.onclick = () => {
            attackButton.disabled = false;
            temptChanceButton.style.display = "none";
            noTemptChanceButton.style.display = "none";
            applyDirectDamage(character, monster, potentialDamageToMonster, potentialDamageToCharacter);
        };

    } else {
        attackButton.disabled = false;
        checkEndOfBattle(character, monster);
    }
}

// fonction pour appliquer des dommages en tentant sa chance
function applyDamage(success, playerWon, character, monster, potentialDamageToMonster, potentialDamageToCharacter) {
    let attackMessageDiv = document.getElementById("attack_message");
    if (playerWon) {
        let finalDamageToMonster = success ? potentialDamageToMonster + 1 : potentialDamageToMonster - 1; // Modifier les dégâts basés sur la chance
        monster.health -= Math.max(finalDamageToMonster, 0); // Assurer que les dégâts ne soient pas négatifs
        attackMessageDiv.innerHTML += `<strong>${monster.name} subit ${finalDamageToMonster} points de dégâts.</strong><br>`;
        
        // Jouer le son approprié selon le succès de la chance
        if (success && finalDamageToMonster > potentialDamageToMonster) {
            playCriticalHitSound(); // Coup critique avec bonus de chance
        }
    } else {
        let finalDamageToCharacter = success ? potentialDamageToCharacter - 1 : potentialDamageToCharacter + 1;
        character.health -= Math.max(finalDamageToCharacter, 0);
        attackMessageDiv.innerHTML += `<strong>Vous subissez ${finalDamageToCharacter} points de dégâts.</strong><br>`;
        
        // Jouer le son d'attaque du monstre
        playAttackSound(false);
        
        // Si l'échec de la chance aggrave les dégâts, jouer un son critique
        if (!success && finalDamageToCharacter > potentialDamageToCharacter) {
            playCriticalHitSound(); // Coup critique du monstre
        }
    }

    // Mettre à jour l'affichage des caractéristiques du personnage et du monstre
    updateCharacterStats();
    updateMonsterList();

    // Vérifier la fin du combat
    checkEndOfBattle(character, monster);
}

// fonction pour appliquer des dommages si on décide de ne pas tenter sa chance
function applyDirectDamage(character, monster, potentialDamageToMonster, potentialDamageToCharacter) {
    let attackMessageDiv = document.getElementById("attack_message");

    if (potentialDamageToMonster > 0) {
        // Appliquer les dégâts au monstre
        monster.health -= potentialDamageToMonster;
        attackMessageDiv.innerHTML += `<strong> Vous infligez ${potentialDamageToMonster} points de dégâts à ${monster.name}.</strong><br>`;
    } else if (potentialDamageToCharacter > 0) {
        // Appliquer les dégâts au personnage
        character.health -= potentialDamageToCharacter;
        attackMessageDiv.innerHTML += `<strong>Le ${monster.name} vous inflige ${potentialDamageToCharacter} points de dégâts.</strong><br>`;
        
        // Jouer le son d'attaque du monstre
        playAttackSound(false);
    }

    // Mettre à jour l'affichage des caractéristiques du personnage et du monstre
    updateCharacterStats();
    updateMonsterList();

    // Vérifier la fin du combat
    checkEndOfBattle(character, monster);
}

// fin du combat?
function checkEndOfBattle(character, monster) {
    let attackMessageDiv = document.getElementById("attack_message");
    if (character.health <= 0) {
        attackMessageDiv.innerHTML += "<strong> Vous avez été vaincu. Game Over.</strong>";
        playDefeatSound(); // Son de défaite
    } else if (monster.health <= 0) {
        attackMessageDiv.innerHTML += `<strong> Vous avez vaincu ${monster.name}!</strong>`;
        playVictorySound(); // Son de victoire
        updateMonsterList();
        updateChoiceButtonsState();
        selectNextMonster(); // Cette fonction doit gérer la sélection du prochain monstre à attaquer

    } else {
        // Si tous les deux sont toujours vivants, afficher le bouton d'attaque pour permettre de relancer une attaque
        document.getElementById("attackButton").style.display = "block";
        updateMonsterList();
    }
}
