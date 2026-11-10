import { gameState } from "./scripts_collines.js";
import { rollDice, tempt_chance } from "./chance.js";
import { updateCharacterStats } from "./character.js";
import { playAttackSound, playCriticalHitSound, playVictorySound, playDefeatSound } from "./music.js";
import { updateChoiceButtons } from "./chapterEffects.js";

// Champs optionnels d'un monstre (voir collines_malefiques.json) :
//   attackModifier        : modificateur de VOTRE Force d'Attaque (Oursconse : -2)
//   monsterAttackBonus    : modificateur de la Force d'Attaque du monstre (Elvin : +2, bouclier : -2)
//   playerSkillMultiplier : multiplicateur de votre HABILETÉ (formule GRO : x2)
//   sting                 : dard de la Manticore (5 ou 6 au dé : 6 points de dégâts)
// gameState.combatMods contient les effets d'une Formule lancée au paragraphe précédent :
//   { monsterSkill, monsterAttackBonus, playerSkillMultiplier, damage, rounds }

export function manageMonsters(chapterMonsters) {
    gameState.monsters = chapterMonsters.map(m => ({ ...m, status: m.status || "vivant" }));
    gameState.combatMods = gameState.nextCombat || {};
    gameState.nextCombat = null;
    gameState.assaultCount = 0;
    updateMonsterList();
    const first = gameState.monsters.findIndex(m => m.status === "vivant");
    if (first !== -1) {
        selectCurrentMonster(first);
    } else {
        document.getElementById("attackButton").style.display = "none";
    }
    describeMods();
}

function modsActive() {
    const mods = gameState.combatMods || {};
    return !mods.rounds || gameState.assaultCount <= mods.rounds;
}

function describeMods() {
    const mods = gameState.combatMods || {};
    const notes = [];
    if (mods.monsterSkill) notes.push(`l'HABILETÉ de votre adversaire est réduite à ${mods.monsterSkill}`);
    if (mods.monsterAttackBonus) notes.push(`sa Force d'Attaque est modifiée de ${mods.monsterAttackBonus}`);
    if (mods.playerSkillMultiplier) notes.push(`votre HABILETÉ est multipliée par ${mods.playerSkillMultiplier}`);
    if (mods.damage) notes.push(`vos coups infligent ${mods.damage} points de dégâts`);
    if (notes.length) {
        document.getElementById("attack_message").innerHTML =
            `<em>Effet de votre Formule : ${notes.join(", ")}${mods.rounds ? ` pendant ${mods.rounds} Assauts` : ""}.</em>`;
    }
}

// met à jour la liste des monstres
export function updateMonsterList() {
    const monsterContainer = document.getElementById("monsters");
    monsterContainer.innerHTML = gameState.monsters.length ? "" : "Pas de monstre ici";
    gameState.monsters.forEach(monster => {
        const info = document.createElement("div");
        info.innerHTML = `<strong>${monster.name}</strong>, Habileté : ${monster.skill}, Endurance : ${Math.max(monster.health, 0)}, Statut : ${monster.fled ? "en fuite" : monster.status}<br>`;
        if (monster.status === "vaincu") info.classList.add("monster-defeated");
        monsterContainer.appendChild(info);
    });
}

function selectCurrentMonster(index) {
    const monster = gameState.monsters[index];
    document.getElementById("actual_monster").innerHTML = `Adversaire actuel : ${monster.name}`;
    document.getElementById("actual_monster").style.display = "block";
    const attackButton = document.getElementById("attackButton");
    attackButton.innerText = `Attaquer ${monster.name}`;
    attackButton.style.display = "block";
    attackButton.disabled = false;
    attackButton.onclick = () => performAttack(index);
}

function performAttack(index) {
    if (gameState.gameOver) return;
    const character = gameState.character;
    const monster = gameState.monsters[index];
    const attackMessageDiv = document.getElementById("attack_message");
    const weapon = character.getWeapon();

    gameState.assaultCount++;
    gameState.encounterFought = true;
    const mods = modsActive() ? (gameState.combatMods || {}) : {};

    const multiplier = (monster.playerSkillMultiplier || 1) * (mods.playerSkillMultiplier || 1);
    const charAttackForce = rollDice() + rollDice() + character.skill * multiplier + weapon.attack + (monster.attackModifier || 0);
    const monsterSkill = mods.monsterSkill ? Math.min(mods.monsterSkill, monster.skill) : monster.skill;
    const monsterAttackForce = rollDice() + rollDice() + monsterSkill + (monster.monsterAttackBonus || 0) + (mods.monsterAttackBonus || 0);

    let damageToMonster = 0;
    let damageToCharacter = 0;
    let stung = false;
    let report = `Assaut ${gameState.assaultCount} — votre Force d'Attaque est de <strong>${charAttackForce}</strong>.<br>Celle de ${monster.name} est de <strong>${monsterAttackForce}</strong>.<br>`;

    if (charAttackForce > monsterAttackForce) {
        damageToMonster = mods.damage || weapon.damage;
        report += `Vous pouvez infliger <strong>${damageToMonster}</strong> points de dégâts à ${monster.name}.<br>`;
        playAttackSound(true);
    } else if (charAttackForce < monsterAttackForce) {
        damageToCharacter = 2;
        if (monster.sting) {
            const die = rollDice();
            if (die >= 5) {
                stung = true;
                damageToCharacter = 6;
                report += `Dé du dard : ${die}. <strong>La Manticore vous pique avec sa queue de scorpion : 6 points de dégâts</strong>, à moins de Tenter votre Chance avec succès (2 points seulement).<br>`;
            } else {
                report += `Dé du dard : ${die}. Le dard vous manque.<br>`;
            }
        }
        report += `${monster.name} peut vous infliger <strong>${damageToCharacter}</strong> points de dégâts.<br>`;
        playAttackSound(false);
    } else {
        report += "<strong>Vous esquivez chacun le coup de l'autre.</strong>";
    }
    attackMessageDiv.innerHTML = report;

    const temptChanceButton = document.getElementById("temptChanceButton");
    const noTemptChanceButton = document.getElementById("no_temptChanceButton");
    const attackButton = document.getElementById("attackButton");

    if (charAttackForce === monsterAttackForce) {
        return;
    }
    attackButton.disabled = true;
    temptChanceButton.style.display = "block";
    noTemptChanceButton.style.display = "block";
    temptChanceButton.disabled = character.chance <= 0;

    const resolve = (useLuck) => {
        attackButton.disabled = false;
        temptChanceButton.style.display = "none";
        noTemptChanceButton.style.display = "none";
        if (useLuck) {
            const lucky = tempt_chance(character.chance);
            attackMessageDiv.innerHTML += lucky ? "Vous êtes <strong>Chanceux</strong> ! " : "Vous êtes <strong>Malchanceux</strong>… ";
            if (damageToMonster > 0) {
                // Chanceux : blessure grave (+2) ; Malchanceux : simple écorchure (-1)
                damageToMonster = lucky ? damageToMonster + 2 : Math.max(damageToMonster - 1, 0);
                if (lucky) playCriticalHitSound();
            } else if (stung) {
                damageToCharacter = lucky ? 2 : 6;
            } else {
                // Chanceux : coup atténué (-1) ; Malchanceux : coup plus grave (+1)
                damageToCharacter = lucky ? damageToCharacter - 1 : damageToCharacter + 1;
                if (!lucky) playCriticalHitSound();
            }
        }
        if (damageToMonster > 0) {
            monster.health -= damageToMonster;
            attackMessageDiv.innerHTML += `<strong>${monster.name} perd ${damageToMonster} point(s) d'endurance.</strong><br>`;
        } else if (damageToCharacter > 0) {
            character.health -= damageToCharacter;
            attackMessageDiv.innerHTML += `<strong>Vous perdez ${damageToCharacter} point(s) d'endurance.</strong><br>`;
        }
        updateCharacterStats();
        checkEndOfBattle(character, monster);
    };
    temptChanceButton.onclick = () => resolve(true);
    noTemptChanceButton.onclick = () => resolve(false);
}

function checkEndOfBattle(character, monster) {
    const attackMessageDiv = document.getElementById("attack_message");
    if (character.health <= 0) {
        attackMessageDiv.innerHTML += "<strong> Vous avez été vaincu.</strong>";
        document.getElementById("attackButton").disabled = true;
        playDefeatSound();
    } else if (monster.health <= 0) {
        monster.status = "vaincu";
        attackMessageDiv.innerHTML += `<strong> Vous avez vaincu ${monster.name} !</strong>`;
        const next = gameState.monsters.findIndex(m => m.status === "vivant");
        if (next !== -1) {
            selectCurrentMonster(next);
        } else {
            attackMessageDiv.innerHTML += " Tous vos adversaires sont vaincus !";
            playVictorySound();
            document.getElementById("attackButton").style.display = "none";
            document.getElementById("actual_monster").style.display = "none";
        }
    }
    updateMonsterList();
    updateChoiceButtons();
}
