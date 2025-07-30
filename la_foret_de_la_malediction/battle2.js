import { gameState } from "./scripts_forest.js";
import { rollDice, tempt_chance } from "./chance.js";
import { updateCharacterStats } from "./character.js";
import { playAttackSound, playCriticalHitSound, playVictorySound, playDefeatSound } from "./music.js";
import { manageMonsters as normalManageMonsters } from "./battle.js";

// Fonction principale pour gérer le combat des pygmées
export function managePygmees(chapterMonsters) {
    const monsterContainer = document.getElementById('monsters');
    monsterContainer.innerHTML = '';

    // Réinitialisation et peuplement du tableau de monstres
    gameState.monsters = chapterMonsters.map(monsterData => ({
        ...monsterData,
        status: "vivant"
    }));

    // Initialiser l'état du combat pygmée
    gameState.pygmeeCombatState = {
        phase: "choix", // "choix", "prioritaire", "autre"
        priorityIndex: null,
        otherIndex: null
    };

    // Vérifier s'il y a exactement 2 pygmées
    const alivePygmees = gameState.monsters.filter(monster => monster.status === "vivant");
    
    if (alivePygmees.length === 2) {
        setupPygmeeCombat();
    } else if (alivePygmees.length === 1) {
        // S'il ne reste qu'un pygmée, basculer vers le combat normal
        normalManageMonsters(gameState.monsters.filter(monster => monster.status === "vivant"));
        return;
    }

    updatePygmeeList();
}

// Configuration de l'interface de combat spécial pygmées
function setupPygmeeCombat() {
    const monsterContainer = document.getElementById('monsters');
    
    // Vider complètement le conteneur avant de recréer l'interface
    monsterContainer.innerHTML = '';
    
    // Masquer le bouton d'attaque normal
    document.getElementById("attackButton").style.display = "none";
    
    // Trouver les indices des pygmées vivants
    const alivePygmees = [];
    gameState.monsters.forEach((monster, index) => {
        if (monster.status === "vivant") {
            alivePygmees.push({monster, index});
        }
    });
    
    if (alivePygmees.length === 2) {
        // Ajouter le titre explicatif
        if (gameState.pygmeeCombatState.phase === "choix") {
            const titleDiv = document.createElement('div');
            titleDiv.innerHTML = '<p><strong>Quel pygmée voulez-vous attaquer en priorité ?</strong></p>';
            titleDiv.style.marginBottom = '15px';
            monsterContainer.appendChild(titleDiv);
        } else {
            // Phase de combat
            const combatPhaseDiv = document.createElement('div');
            combatPhaseDiv.innerHTML = '<p><strong>Phase de combat</strong></p>';
            combatPhaseDiv.style.marginBottom = '15px';
            monsterContainer.appendChild(combatPhaseDiv);
        }
        
        // Afficher les 2 boutons dans l'ordre de priorité
        let priorityPygmee, otherPygmee;
        
        if (gameState.pygmeeCombatState.phase === "choix") {
            // Ordre normal pour le choix
            priorityPygmee = alivePygmees[0];
            otherPygmee = alivePygmees[1];
        } else {
            // Ordre selon la priorité choisie
            priorityPygmee = alivePygmees.find(p => p.index === gameState.pygmeeCombatState.priorityIndex);
            otherPygmee = alivePygmees.find(p => p.index === gameState.pygmeeCombatState.otherIndex);
        }
        
        // Bouton du pygmée prioritaire
        const priorityDiv = document.createElement('div');
        priorityDiv.style.margin = '10px 0';
        let priorityStyle = '';
        let priorityOnClick = '';
        let priorityDisabled = '';
        
        if (gameState.pygmeeCombatState.phase === "choix") {
            priorityStyle = '';
            priorityOnClick = `selectPriorityPygmee(${priorityPygmee.index})`;
        } else if (gameState.pygmeeCombatState.phase === "prioritaire") {
            priorityStyle = 'animation: pulse 1s infinite;';
            priorityOnClick = `attackPriorityPygmee()`;
        } else {
            priorityStyle = 'opacity: 0.5;';
            priorityDisabled = 'disabled';
        }
        
        priorityDiv.innerHTML = `
            <strong>${priorityPygmee.monster.name}</strong> - Habileté: ${priorityPygmee.monster.skill}, Endurance: ${priorityPygmee.monster.health}<br>
            <button style="${priorityStyle}" onclick="${priorityOnClick}" ${priorityDisabled}>
                Attaquer ${priorityPygmee.monster.name}
            </button>
        `;
        monsterContainer.appendChild(priorityDiv);
        
        // Bouton de l'autre pygmée
        const otherDiv = document.createElement('div');
        otherDiv.style.margin = '10px 0';
        let otherStyle = '';
        let otherOnClick = '';
        let otherDisabled = '';
        
        if (gameState.pygmeeCombatState.phase === "choix") {
            otherStyle = '';
            otherOnClick = `selectPriorityPygmee(${otherPygmee.index})`;
        } else if (gameState.pygmeeCombatState.phase === "autre") {
            otherStyle = 'animation: pulse 1s infinite;';
            otherOnClick = `attackOtherPygmee()`;
        } else {
            otherStyle = 'opacity: 0.5;';
            otherDisabled = 'disabled';
        }
        
        otherDiv.innerHTML = `
            <strong>${otherPygmee.monster.name}</strong> - Habileté: ${otherPygmee.monster.skill}, Endurance: ${otherPygmee.monster.health}<br>
            <button style="${otherStyle}" onclick="${otherOnClick}" ${otherDisabled}>
                Attaquer ${otherPygmee.monster.name}
            </button>
        `;
        monsterContainer.appendChild(otherDiv);
        
        // Ajouter le CSS d'animation si ce n'est pas déjà fait
        if (!document.getElementById('pulseAnimation')) {
            const style = document.createElement('style');
            style.id = 'pulseAnimation';
            style.textContent = `
                @keyframes pulse {
                    0% { transform: scale(1); }
                    50% { transform: scale(1.05); }
                    100% { transform: scale(1); }
                }
            `;
            document.head.appendChild(style);
        }
    }
}

// Fonction pour sélectionner le pygmée prioritaire
window.selectPriorityPygmee = function(priorityIndex) {
    gameState.pygmeeCombatState.priorityIndex = priorityIndex;
    gameState.pygmeeCombatState.otherIndex = gameState.monsters.findIndex((monster, index) => 
        index !== priorityIndex && monster.status === "vivant"
    );
    gameState.pygmeeCombatState.phase = "prioritaire";
    
    const attackMessageDiv = document.getElementById("attack_message");
    const priorityPygmee = gameState.monsters[priorityIndex];
    const otherPygmee = gameState.monsters[gameState.pygmeeCombatState.otherIndex];
    attackMessageDiv.innerHTML = '';
    
    setupPygmeeCombat();
}

// Fonction pour attaquer le pygmée prioritaire
window.attackPriorityPygmee = function() {
    const character = gameState.character;
    const priorityPygmee = gameState.monsters[gameState.pygmeeCombatState.priorityIndex];
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
    
    // Combat avec le pygmée prioritaire (règles normales)
    const charAttackForcePriority = rollDice() + rollDice() + character.getCurrentSkill() + attackModifier;
    const priorityAttackForce = rollDice() + rollDice() + priorityPygmee.skill;
    
    // Calcul des dégâts potentiels
    let potentialDamageToMonster = charAttackForcePriority > priorityAttackForce ? 2 : 0;
    let potentialDamageToCharacter = charAttackForcePriority < priorityAttackForce ? 2 : 0;
    
    attackMessageDiv.innerHTML += `<br><strong>Combat prioritaire contre ${priorityPygmee.name}:</strong><br>`;
    
    // Affichage des forces d'attaque en gras (comme dans battle.js)
    let attackReport = `Votre force d'attaque est de <strong>${charAttackForcePriority}</strong>`;
    if (character.hasBoost('skillPotionBoost')) {
        attackReport += ` (Potion: +1, ${character.getBoostCombatsRemaining('skillPotionBoost')} combat(s) restant(s))`;
    }
    attackReport += `.<br>La force d'attaque de ${priorityPygmee.name} est de <strong>${priorityAttackForce}</strong>.<br>`;
    
    if (charAttackForcePriority > priorityAttackForce) {
        attackReport += `Vous pouvez infliger <strong>${potentialDamageToMonster}</strong> points de dégâts à ${priorityPygmee.name}.<br>`;
        playAttackSound(true);
    } else if (charAttackForcePriority < priorityAttackForce) {
        attackReport += `${priorityPygmee.name} peut vous infliger <strong>${potentialDamageToCharacter}</strong> points de dégâts.<br>`;
        playAttackSound(false);
    } else {
        attackReport += "<strong>Aucun de vous n'a infligé de dégâts.</strong><br>";
    }
    
    attackMessageDiv.innerHTML += attackReport;

    // Vérifier l'effet du bouclier d'empereur si le joueur subit des dégâts
    if (potentialDamageToCharacter > 0 && gameState.inventory.checkItem('bouclier d\'empereur')) {
        let shieldRoll = rollDice();
        attackReport += `<br><strong>Bouclier d'empereur activé!</strong> Lancer de dé : <strong>${shieldRoll}</strong><br>`;
        
        if (shieldRoll >= 4) {
            // Le bouclier protège : 1 seul point de dégât, pas de chance
            attackReport += "<strong>Le bouclier vous protège! Vous ne subissez qu'1 point de dégât et n'avez pas besoin de tenter votre chance.</strong>";
            attackMessageDiv.innerHTML = attackReport;
            
            // Appliquer directement 1 point de dégât
            character.health -= 1;
            attackMessageDiv.innerHTML += `<br><strong>Vous subissez 1 point de dégât grâce à votre bouclier.</strong><br>`;
            
            updateCharacterStats();
            finalizePriorityAttack();
            return; // Sortir de la fonction, pas besoin de gérer la chance
        } else {
            attackReport += "<strong>Le bouclier ne vous protège pas cette fois.</strong><br>";
            attackMessageDiv.innerHTML = attackReport;
        }
    }

    // Si les forces ne sont pas égales, proposer la tentative de chance
    if (charAttackForcePriority !== priorityAttackForce) {
        // Stocker les valeurs pour les utiliser dans les callbacks
        gameState.pygmeeCombatState.tempValues = {
            charAttackForcePriority,
            priorityAttackForce,
            potentialDamageToMonster,
            potentialDamageToCharacter
        };

        // Afficher les boutons de tentative de chance
        let temptChanceButton = document.getElementById("temptChanceButton");
        let noTemptChanceButton = document.getElementById("no_temptChanceButton");

        temptChanceButton.style.display = "block";
        noTemptChanceButton.style.display = "block";

        temptChanceButton.onclick = () => {
            temptChanceButton.style.display = "none";
            noTemptChanceButton.style.display = "none";
            let success = tempt_chance(gameState.character.chance);
            applyPriorityDamageWithChance(success, charAttackForcePriority > priorityAttackForce);
        };

        noTemptChanceButton.onclick = () => {
            temptChanceButton.style.display = "none";
            noTemptChanceButton.style.display = "none";
            applyPriorityDamageWithoutChance();
        };
    } else {
        // Égalité, pas de dégâts, passer directement à l'étape suivante
        continueToOtherPygmee();
    }
}

// Fonction pour appliquer les dégâts avec tentative de chance (combat prioritaire)
function applyPriorityDamageWithChance(success, playerWon) {
    const character = gameState.character;
    const priorityPygmee = gameState.monsters[gameState.pygmeeCombatState.priorityIndex];
    const attackMessageDiv = document.getElementById("attack_message");
    const tempValues = gameState.pygmeeCombatState.tempValues;

    if (playerWon) {
        let finalDamageToMonster = success ? tempValues.potentialDamageToMonster + 1 : tempValues.potentialDamageToMonster - 1;
        finalDamageToMonster = Math.max(finalDamageToMonster, 0);
        priorityPygmee.health -= finalDamageToMonster;
        attackMessageDiv.innerHTML += `<strong>${priorityPygmee.name} subit ${finalDamageToMonster} points de dégâts.</strong><br>`;
        
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
    finalizePriorityAttack();
}

// Fonction pour appliquer les dégâts sans tentative de chance (combat prioritaire)
function applyPriorityDamageWithoutChance() {
    const character = gameState.character;
    const priorityPygmee = gameState.monsters[gameState.pygmeeCombatState.priorityIndex];
    const attackMessageDiv = document.getElementById("attack_message");
    const tempValues = gameState.pygmeeCombatState.tempValues;

    if (tempValues.potentialDamageToMonster > 0) {
        priorityPygmee.health -= tempValues.potentialDamageToMonster;
        attackMessageDiv.innerHTML += `<strong>Vous infligez ${tempValues.potentialDamageToMonster} points de dégâts à ${priorityPygmee.name}.</strong><br>`;
    } else if (tempValues.potentialDamageToCharacter > 0) {
        character.health -= tempValues.potentialDamageToCharacter;
        attackMessageDiv.innerHTML += `<strong>${priorityPygmee.name} vous inflige ${tempValues.potentialDamageToCharacter} points de dégâts.</strong><br>`;
    }

    updateCharacterStats();
    finalizePriorityAttack();
}

// Fonction pour finaliser l'attaque prioritaire et passer à l'étape suivante
function finalizePriorityAttack() {
    const character = gameState.character;
    const priorityPygmee = gameState.monsters[gameState.pygmeeCombatState.priorityIndex];
    const attackMessageDiv = document.getElementById("attack_message");

    // Marquer le pygmée vaincu si nécessaire
    if (priorityPygmee.health <= 0) {
        priorityPygmee.status = "vaincu";
        attackMessageDiv.innerHTML += `<br><strong>${priorityPygmee.name} est vaincu !</strong><br>`;
        playVictorySound();
    }

    // Vérifier si le combat continue
    const alivePygmees = gameState.monsters.filter(monster => monster.status === "vivant");
    if (character.health <= 0 || alivePygmees.length <= 1) {
        checkPygmeeBattleEnd();
    } else {
        continueToOtherPygmee();
    }
}

// Fonction pour continuer vers l'attaque de l'autre pygmée
function continueToOtherPygmee() {
    gameState.pygmeeCombatState.phase = "autre";
    setupPygmeeCombat();
}

// Fonction pour attaquer l'autre pygmée
window.attackOtherPygmee = function() {
    const character = gameState.character;
    const otherPygmee = gameState.monsters[gameState.pygmeeCombatState.otherIndex];
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
    
    // Combat avec l'autre pygmée (règles spéciales)
    const charAttackForceOther = rollDice() + rollDice() + character.getCurrentSkill() + attackModifier;
    const otherAttackForce = rollDice() + rollDice() + otherPygmee.skill;
    
    attackMessageDiv.innerHTML += `<br><strong>Combat simultané contre ${otherPygmee.name} (règles spéciales):</strong><br>`;
    
    // Affichage des forces d'attaque en gras
    let attackReport = `Votre force d'attaque est de <strong>${charAttackForceOther}</strong>`;
    if (character.hasBoost('skillPotionBoost')) {
        attackReport += ` (Potion: +1, ${character.getBoostCombatsRemaining('skillPotionBoost')} combat(s) restant(s))`;
    }
    attackReport += `.<br>Force d'attaque de ${otherPygmee.name} est de <strong>${otherAttackForce}</strong>.<br>`;
    
    let otherDamageToCharacter = 0;
    
    if (charAttackForceOther > otherAttackForce) {
        attackReport += `<strong>Vous esquivez l'attaque de ${otherPygmee.name} !</strong><br>`;
        playAttackSound(true); // Son de succès pour l'esquive
    } else if (charAttackForceOther < otherAttackForce) {
        otherDamageToCharacter = 2;
        attackReport += `<strong>${otherPygmee.name} vous touche pour 2 points de dégâts !</strong><br>`;
        playAttackSound(false); // Son d'attaque du monstre
    } else {
        attackReport += `<strong>Égalité avec ${otherPygmee.name} - aucun dégât.</strong><br>`;
        // Pas de son pour l'égalité
    }
    
    attackMessageDiv.innerHTML += attackReport;

    // Vérifier l'effet du bouclier d'empereur si le joueur subit des dégâts
    if (otherDamageToCharacter > 0 && gameState.inventory.checkItem('bouclier d\'empereur')) {
        let shieldRoll = rollDice();
        attackReport += `<br><strong>Bouclier d'empereur activé!</strong> Lancer de dé : <strong>${shieldRoll}</strong><br>`;
        
        if (shieldRoll >= 4) {
            // Le bouclier protège : 1 seul point de dégât
            attackReport += "<strong>Le bouclier vous protège! Vous ne subissez qu'1 point de dégât.</strong><br>";
            attackMessageDiv.innerHTML = attackReport;
            character.health -= 1;
            attackMessageDiv.innerHTML += `<br><strong>Vous subissez 1 point de dégât grâce à votre bouclier.</strong><br>`;
        } else {
            attackReport += "<strong>Le bouclier ne vous protège pas cette fois.</strong><br>";
            attackMessageDiv.innerHTML = attackReport;
            character.health -= otherDamageToCharacter;
            attackMessageDiv.innerHTML += `<br><strong>Vous subissez ${otherDamageToCharacter} points de dégâts.</strong><br>`;
        }
    } else if (otherDamageToCharacter > 0) {
        // Application des dégâts normaux si pas de bouclier
        character.health -= otherDamageToCharacter;
    }

    updateCharacterStats();
    
    // Fin de l'assaut, vérifier l'état du combat
    checkPygmeeBattleEnd();
}

// Vérifier la fin du combat des pygmées
function checkPygmeeBattleEnd() {
    const character = gameState.character;
    const alivePygmees = gameState.monsters.filter(monster => monster.status === "vivant");
    const attackMessageDiv = document.getElementById("attack_message");

    if (character.health <= 0) {
        attackMessageDiv.innerHTML += "<br><strong>Vous avez été vaincu. Game Over.</strong>";
        playDefeatSound();
        updateChoiceButtonsState();
        return;
    }

    if (alivePygmees.length === 0) {
        // Tous les pygmées sont vaincus
        attackMessageDiv.innerHTML += "<br><strong>Victoire ! Vous avez vaincu les deux Pygmées !</strong>";
        
        // Décrémenter les boost temporaires
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
        
    } else if (alivePygmees.length === 1) {
        // Il ne reste qu'un pygmée, basculer vers le combat normal
        attackMessageDiv.innerHTML += `<br><strong>Il ne reste plus que ${alivePygmees[0].name}. Le combat continue selon les règles normales.</strong><br>`;
        
        // Réinitialiser l'interface pour le combat normal
        normalManageMonsters(alivePygmees);
        
    } else {
        // Les deux pygmées sont toujours vivants, retourner au choix de priorité
        attackMessageDiv.innerHTML += "<br><strong>Les deux Pygmées sont encore debout. Nouvel assaut !</strong><br>";
        gameState.pygmeeCombatState.phase = "choix";
        gameState.pygmeeCombatState.priorityIndex = null;
        gameState.pygmeeCombatState.otherIndex = null;
        setupPygmeeCombat();
    }
}

// Mise à jour de la liste des pygmées
function updatePygmeeList() {
    updateCharacterStats();
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