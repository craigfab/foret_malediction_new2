import { gameState } from "./scripts_collines.js";
import { rollDice, tempt_chance } from "./chance.js";
import { updateCharacterStats, triggerGameOver, triggerVictory } from "./character.js";
import { updateAdventureSheet, takeItem, GOLD, FOOD } from "./inventory.js";
import { manageMonsters, updateMonsterList } from "./battle.js";

// ---------------------------------------------------------------------------
// Petits utilitaires
// ---------------------------------------------------------------------------
const inv = () => gameState.inventory;
const hero = () => gameState.character;

// L'objet était-il dans le Sac à Dos en arrivant dans le paragraphe ?
// (les conditions « Avez-vous tel objet ? » sont évaluées sur cet instantané,
// car l'objet est souvent consommé par le paragraphe lui-même)
export function hadItem(name) {
    return (gameState.entryItems[name] || 0) > 0;
}
const hasItem = name => hadItem(name) || inv().checkItem(name) > 0;

function say(html) {
    if (html) document.getElementById("effect_message").innerHTML += `<p>${html}</p>`;
}

function refresh() {
    updateCharacterStats();
    updateAdventureSheet();
    updateChoiceButtons();
}

// Ajoute un bouton dans la zone des actions
function actionButton(label, onClick) {
    const button = document.createElement("button");
    button.innerText = label;
    button.addEventListener("click", () => {
        if (!gameState.gameOver) onClick(button);
    });
    document.getElementById("tempt_chance_button").appendChild(button);
    return button;
}

function showDice(text) {
    document.getElementById("zone_result_dice").innerHTML = text;
}

function restoreAll() {
    const c = hero();
    c.skill = c.baseSkill - (inv().checkItem("malédiction d'Alianna") > 0 ? 2 : 0);
    c.health = c.baseHealth;
    c.chance = c.baseChance;
}

// ---------------------------------------------------------------------------
// Effets de chapitre
// ---------------------------------------------------------------------------
export function applyEffects(effects, returning = false) {
    (effects || []).forEach(effect => {
        if (gameState.gameOver) return;
        if (Boolean(effect.onReturn) !== returning) return;
        if (effect.ifItem && !hadItem(effect.ifItem)) return;
        if (effect.ifNoItem && hadItem(effect.ifNoItem)) return;
        applyEffect(effect);
    });
    refresh();
}

function applyEffect(effect) {
    const c = hero();
    switch (effect.type) {
        case "gameOver":
            triggerGameOver("Votre aventure se termine ici.");
            break;
        case "victory":
            triggerVictory();
            break;
        case "reduceHealth":
            gameState.spellCasting = Boolean(effect.spell);
            c.health -= effect.value;
            gameState.spellCasting = false;
            say(effect.spell ? `Formule Magique : vous perdez ${effect.value} point(s) d'endurance.` : `Vous perdez ${effect.value} point(s) d'endurance.`);
            break;
        case "gainHealth": {
            const before = c.health;
            c.health = Math.min(c.health + effect.value, Math.max(c.baseHealth, c.health));
            say(c.health > before ? `Vous gagnez ${c.health - before} point(s) d'endurance.` : "Votre endurance est déjà à son niveau initial.");
            break;
        }
        case "reduceSkill":
            c.skill -= effect.value;
            say(`Vous perdez ${effect.value} point(s) d'habileté.`);
            break;
        case "gainSkill":
            c.skill = Math.min(c.skill + effect.value, c.baseSkill);
            say(`Habileté : +${effect.value}.`);
            break;
        case "reduceChance":
            c.chance = Math.max(0, c.chance - effect.value);
            say(`Vous perdez ${effect.value} point(s) de chance.`);
            break;
        case "gainChance": {
            const before = c.chance;
            c.chance = Math.min(c.chance + effect.value, Math.max(c.baseChance, c.chance));
            say(c.chance > before ? `Vous gagnez ${c.chance - before} point(s) de chance.` : "Votre chance est déjà à son niveau initial.");
            break;
        }
        case "gainBaseChance":
            c.baseChance += effect.value;
            say(`Votre total initial de chance augmente de ${effect.value}.`);
            break;
        case "gainGold":
            inv().addItem(GOLD, effect.value, "gold");
            say(`Vous gagnez ${effect.value} pièce(s) d'or.`);
            break;
        case "reduceGold": {
            const removed = inv().removeItem(GOLD, effect.value);
            if (removed) say(`Vous perdez ${removed} pièce(s) d'or.`);
            break;
        }
        case "takeItem":
            if (effect.unique && inv().checkItem(effect.itemName) > 0) break;
            inv().addItem(effect.itemName, effect.quantity || 1, effect.category || "equipment");
            say(effect.category === "status"
                ? `Nouvel état : <strong>${effect.itemName}</strong>.`
                : `Vous obtenez : <strong>${effect.itemName}${effect.quantity > 1 ? " x " + effect.quantity : ""}</strong>.`);
            break;
        case "removeItem": {
            const removed = inv().removeItem(effect.itemName, effect.quantity || 1);
            if (removed) say(`Vous n'avez plus : ${effect.itemName}${removed > 1 ? " x " + removed : ""}.`);
            break;
        }
        case "loseItems":
            loseItems(effect.count);
            break;
        case "loseAllFood": {
            const removed = inv().removeItem(FOOD, 999) + inv().removeItem("Bomba", 999);
            say(removed ? "Vous avez perdu toutes vos Provisions." : "Vous n'aviez pas de Provisions à perdre.");
            break;
        }
        case "loseBackpack": {
            const weapon = c.getWeapon().name;
            inv().items = inv().items.filter(i => i.category === "status" || i.name === weapon);
            say("Vous avez perdu tout le contenu de votre Sac à Dos, y compris votre Or et vos Provisions. Il vous reste votre arme.");
            break;
        }
        case "loseWeapon": {
            const weapon = c.getWeapon().name;
            if (inv().removeItem(weapon, 1)) {
                const next = c.getWeapon();
                say(`Vous abandonnez votre arme (${weapon}). ` + (next.attack === -4
                    ? "Sans arme, votre Force d'Attaque est réduite de 4 points jusqu'à ce que vous en trouviez une autre."
                    : `Vous utiliserez désormais : ${next.name}.`));
            }
            break;
        }
        case "elvinTheft":
            elvinTheft();
            break;
        case "restoreAll":
            restoreAll();
            say("Vos points d'habileté, d'endurance et de chance retrouvent leur niveau initial.");
            break;
        case "ate":
            gameState.ateToday = true;
            break;
        case "newDay":
            newDay(effect.hunger);
            break;
        case "setFlag":
            gameState.flags[effect.flag] = effect.value;
            break;
        case "nextCombat": {
            const { type, ifItem, ifNoItem, ...mods } = effect;
            gameState.nextCombat = { ...(gameState.nextCombat || {}), ...mods };
            say("Votre Formule vous avantagera lors du prochain combat.");
            break;
        }
        case "rollDiceChance":
            luckRoll(effect.optional);
            break;
        case "luckStreak":
            luckStreak(effect.needed, effect.damage);
            break;
        case "rollDie":
            actionButton("Lancer le dé", button => {
                gameState.dieResult = rollDice();
                showDice(`Le dé donne : <strong>${gameState.dieResult}</strong>`);
                button.remove();
                updateChoiceButtons();
            });
            break;
        case "dieDamage":
            dieDamage(effect);
            break;
        case "skillTest":
            skillTest(effect);
            break;
        case "fallTest":
            fallTest();
            break;
        case "priceRoll":
            priceRoll(effect);
            break;
        case "randomEncounter":
            randomEncounter();
            break;
        case "nightRest": {
            const value = gameState.encounterFought ? effect.disturbed : effect.peaceful;
            applyEffect({ type: "gainHealth", value });
            gameState.encounterFought = false;
            break;
        }
        case "allyFight":
            allyFight(effect);
            break;
        case "monstersFlee":
            monstersFlee();
            break;
        case "scorpionBox":
            scorpionBox(effect);
            break;
        default:
            console.warn("Effet inconnu :", effect.type);
    }
}

// Nouveau jour : faim si l'on n'a pas mangé la veille, puis effets de la peste
function newDay(hunger) {
    const c = hero();
    if (hunger && !gameState.ateToday) {
        c.health -= hunger;
        say(`Vous n'avez rien mangé hier : vous perdez ${hunger} points d'endurance.`);
    } else if (hunger) {
        say("Vous avez mangé hier : pas de pénalité.");
    }
    if (inv().checkItem("peste") > 0) {
        c.health -= 3;
        say("La peste vous ronge : vous perdez 3 points d'endurance ce matin.");
    }
    gameState.ateToday = false;
}

// Le joueur doit choisir lui-même les objets qu'il perd
function loseItems(count) {
    const zone = document.getElementById("get_item");
    gameState.pendingLoss = Math.min(count, inv().losable().length);
    if (gameState.pendingLoss === 0) {
        say("Vous n'avez aucun objet à perdre.");
        return;
    }
    const box = document.createElement("div");
    zone.appendChild(box);
    const render = () => {
        box.innerHTML = `<p><strong>Choisissez ${gameState.pendingLoss} objet(s) à rayer de votre Feuille d'Aventure :</strong></p>`;
        const candidates = inv().losable();
        // L'Or et les Provisions ne peuvent être choisis que s'il n'y a rien d'autre
        const others = candidates.filter(i => i.name !== GOLD && i.name !== FOOD);
        (others.length ? others : candidates).forEach(item => {
            const button = document.createElement("button");
            button.innerText = `Perdre : ${item.name}${item.quantity > 1 ? " (x " + item.quantity + ")" : ""}`;
            button.addEventListener("click", () => {
                const all = item.name === GOLD;
                inv().removeItem(item.name, all ? item.quantity : 1);
                gameState.pendingLoss--;
                if (gameState.pendingLoss > 0 && inv().losable().length > 0) {
                    render();
                } else {
                    gameState.pendingLoss = 0;
                    box.innerHTML = "<p>Objet(s) perdu(s).</p>";
                }
                refresh();
            });
            box.appendChild(button);
        });
    };
    render();
}

// Paragraphe 218 : un test de chance (gratuit) par objet, l'objet est volé si l'on est Malchanceux
function elvinTheft() {
    const stolen = [];
    inv().losable().slice().forEach(item => {
        if (!tempt_chance(hero().chance, true)) {
            stolen.push(item.name);
            inv().removeItem(item.name, item.quantity);
        }
    });
    say(stolen.length ? `Les Elvins vous ont volé : <strong>${stolen.join(", ")}</strong>.` : "Par chance, aucun de vos objets n'a intéressé les Elvins.");
}

// Tentez votre Chance (obligatoire ou facultatif) : active ensuite les choix Chanceux / Malchanceux
function luckRoll(optional) {
    actionButton(optional ? "Tenter votre Chance (facultatif)" : "Tentez votre Chance", button => {
        gameState.isLucky = tempt_chance(hero().chance);
        showDice(`Dés : ${gameState.lastLuckRoll} — vous êtes <strong>${gameState.isLucky ? "Chanceux" : "Malchanceux"}</strong>.`);
        button.remove();
        refresh();
    });
}

// Paragraphe 165 : il faut être Chanceux `needed` fois de suite
function luckStreak(needed, damage) {
    let streak = 0;
    gameState.conditionMet = false;
    actionButton("Tentez votre Chance", button => {
        if (tempt_chance(hero().chance)) {
            streak++;
            showDice(`Chanceux ! (${streak} fois de suite sur ${needed})`);
        } else {
            streak = 0;
            hero().health -= damage;
            showDice(`Malchanceux : un serpent vous mord, vous perdez ${damage} points d'endurance.`);
        }
        if (streak >= needed) {
            gameState.conditionMet = true;
            button.remove();
        }
        refresh();
    });
}

// Un dé de dégâts lancé en arrivant (abeilles, serpents...)
function dieDamage(effect) {
    const die = rollDice();
    gameState.conditionMet = true;
    if (effect.safeFrom && die >= effect.safeFrom) {
        say(`Dé : ${die}. Vous ne perdez aucun point d'endurance.`);
        return;
    }
    if (effect.deadlyOn && die >= effect.deadlyOn) {
        if (effect.luckSaves) {
            hero().health -= die;
            say(`Dé : ${die}. Vous perdez ${die} points d'endurance et l'un des serpents est venimeux : Tentez votre Chance !`);
            gameState.conditionMet = false;
            actionButton("Tentez votre Chance", button => {
                button.remove();
                if (tempt_chance(hero().chance)) {
                    showDice("Chanceux : vous survivez à la morsure.");
                    gameState.conditionMet = true;
                    refresh();
                } else {
                    triggerGameOver("Malchanceux : le venin vous tue.");
                }
            });
        } else {
            triggerGameOver(`Dé : ${die}. Les morsures sont venimeuses, vous n'avez plus que quelques minutes à vivre.`);
        }
        return;
    }
    hero().health -= die;
    say(`Dé : ${die}. Vous perdez ${die} point(s) d'endurance.`);
}

// Test d'HABILETÉ : réussite si le total des dés est strictement inférieur à l'HABILETÉ
function skillTest(effect) {
    const dice = effect.dice || 2;
    actionButton(effect.repeat ? "Tenter de forcer le passage (lancer les dés)" : "Lancer les dés", button => {
        const c = hero();
        let total = 0;
        for (let i = 0; i < dice; i++) total += rollDice();
        if (effect.costHealth) c.health -= effect.costHealth;
        const success = total < c.skill;
        if (effect.costSkill) c.skill -= effect.costSkill;
        gameState.skillCheckPassed = success;
        showDice(`Dés : ${total} contre une habileté de ${c.skill + (effect.costSkill || 0)} — <strong>${success ? "réussite" : "échec"}</strong>.`
            + (effect.costHealth ? ` Cet essai vous coûte ${effect.costHealth} point d'endurance.` : "")
            + (effect.costSkill ? ` Votre arme est abîmée : -${effect.costSkill} point d'habileté.` : ""));
        if (success || !effect.repeat) button.remove();
        refresh();
    });
}

// Paragraphe 277 : chute dans la fosse, 2 dés comparés à la CHANCE
function fallTest() {
    const d1 = rollDice(), d2 = rollDice();
    const modifier = gameState.flags.fallModifier || 0;
    const total = d1 + d2 + modifier;
    const c = hero();
    let text = `Dés : ${d1} + ${d2}${modifier ? (modifier > 0 ? " + " : " - ") + Math.abs(modifier) + " (effet de votre Formule)" : ""} = ${total}, contre une chance de ${c.chance}. `;
    gameState.conditionMet = true;
    if (d1 === 6 && d2 === 6 && !gameState.flags.fallNoDeath) {
        gameState.conditionMet = false;
        say(text);
        triggerGameOver("Double six : vous atterrissez sur la tête et vous vous rompez le cou.");
    } else if (total < c.chance) {
        say(text + "Vous êtes indemne.");
    } else if (total === c.chance) {
        c.health -= 1;
        say(text + "Quelques contusions : vous perdez 1 point d'endurance.");
    } else {
        c.health -= 3;
        say(text + "Vous vous êtes tordu le bras : vous perdez 3 points d'endurance.");
    }
    gameState.flags.fallModifier = 0;
    gameState.flags.fallNoDeath = false;
}

// Prix fixé par les dés (marchand de Cantopani)
function priceRoll(effect) {
    const zone = document.getElementById("get_item");
    const addBuyButton = price => {
        const button = document.createElement("button");
        button.innerText = `Acheter ${effect.item.name} (${price} pièces d'or)`;
        button.addEventListener("click", () => takeItem({ ...effect.item, price }, button));
        zone.appendChild(button);
        return button;
    };
    const roll = () => {
        let total = 0;
        for (let i = 0; i < effect.dice; i++) total += rollDice();
        return total;
    };
    if (effect.optional) {
        const baseButton = addBuyButton(effect.basePrice);
        actionButton("Marchander (lancer 2 dés)", button => {
            const price = roll();
            button.remove();
            baseButton.remove();
            showDice(`Dés : ${price}. ${price < effect.basePrice ? "Vous êtes dur en affaires" : "Le marchand s'irrite"} : le prix est maintenant de ${price} pièces d'or.`);
            addBuyButton(price);
        });
    } else {
        const price = roll();
        showDice(`Les dés donnent : <strong>${price}</strong>. C'est le prix demandé par le marchand.`);
        addBuyButton(price);
    }
}

// Paragraphe 123 : rencontre nocturne. La créature tirée est conservée tant que l'on
// n'est pas retourné au paragraphe d'origine (on peut revenir ici après une Formule).
function randomEncounter() {
    if (!gameState.encounter) {
        const die = rollDice();
        const bonus = gameState.encounterBonus || 0;
        const total = die + bonus;
        const table = {
            1: { name: "CHAUVE-SOURIS GÉANTE", skill: 5, health: 5 },
            2: { name: "CHAUVE-SOURIS GÉANTE", skill: 5, health: 5 },
            3: { name: "CHIEN-LOUP", skill: 5, health: 7 },
            4: { name: "LOUP-GAROU", skill: 8, health: 9 },
        };
        const monster = table[total] ? [{ ...table[total], status: "vivant" }] : [];
        gameState.encounter = { monsters: monster };
        say(`Dé : ${die}${bonus ? " + " + bonus + " (campement)" : ""} = ${total}. ` + (monster.length
            ? `Vous vous trouvez nez à nez avec : <strong>${monster[0].name}</strong> !`
            : "Vous ne rencontrez aucune créature."));
    } else if (gameState.encounter.monsters.some(m => m.status === "vivant")) {
        say("La créature est toujours là !");
    }
    manageMonsters(gameState.encounter.monsters);
    gameState.encounter.monsters = gameState.monsters; // conserve les blessures infligées
}

// Créatures invoquées par une Formule (dent de Géant, dents de Gobelin) : elles combattent
// à votre place. Le combat est résolu automatiquement, assaut par assaut.
function allyFight(effect) {
    const monster = gameState.pendingMonsters && gameState.pendingMonsters[0];
    if (!monster) return;
    const count = effect.consumeAll ? inv().checkItem(effect.consume) : 1;
    inv().removeItem(effect.consume, count);
    if (effect.costPerAlly) hero().health -= count * effect.costPerAlly;
    const log = [`Vous invoquez ${count} ${effect.ally.name}${count > 1 ? "S" : ""}${effect.costPerAlly ? ` (${count * effect.costPerAlly} point(s) d'endurance)` : ""}.`];
    let enemy = monster.health;
    let alliesLeft = count;
    while (alliesLeft > 0 && enemy > 0) {
        let ally = effect.ally.health;
        while (ally > 0 && enemy > 0) {
            const a = rollDice() + rollDice() + effect.ally.skill;
            const m = rollDice() + rollDice() + monster.skill;
            if (a > m) {
                enemy -= 2;
            } else if (m > a) {
                const stung = monster.sting && rollDice() >= 5;
                if (stung && effect.stingKills) ally = 0;
                else ally -= stung && effect.stingDamage ? effect.stingDamage : 2;
            }
        }
        if (ally <= 0) {
            alliesLeft--;
            log.push(`${effect.ally.name} succombe (il reste ${Math.max(enemy, 0)} point(s) d'endurance à ${monster.name}).`);
        }
    }
    monster.health = Math.max(enemy, 0);
    if (enemy <= 0) {
        monster.status = "vaincu";
        gameState.conditionMet = true;
        log.push(`<strong>${monster.name} est vaincu par vos créatures !</strong>`);
    } else {
        gameState.conditionMet = false;
        log.push(`<strong>Vos créatures sont vaincues.</strong> ${monster.name} conserve ${enemy} point(s) d'endurance.`);
        if (effect.stingKills || effect.stingDamage) gameState.pendingMonsters = []; // la suite se joue au paragraphe choisi
    }
    say(log.join("<br>"));
}

// Paragraphe 407 : chaque Gobelin s'enfuit si 2 dés >= son HABILETÉ
function monstersFlee() {
    const log = [];
    (gameState.pendingMonsters || []).forEach(monster => {
        const roll = rollDice() + rollDice();
        if (roll >= monster.skill) {
            monster.status = "vaincu";
            monster.fled = true;
            log.push(`${monster.name} : dés ${roll} — il s'enfuit dans les bois.`);
        } else {
            log.push(`${monster.name} : dés ${roll} — il reste pour se battre.`);
        }
    });
    gameState.conditionMet = (gameState.pendingMonsters || []).every(m => m.fled);
    say(log.join("<br>"));
}

// Paragraphe 258 : chaque objet pris dans la boîte du Scorpion demande un test de chance
function scorpionBox(effect) {
    let goldLeft = effect.gold;
    const attempt = (onSuccess) => {
        if (tempt_chance(hero().chance)) {
            onSuccess();
        } else {
            const loss = Math.ceil(hero().health / 2);
            hero().health -= loss;
            showDice(`Malchanceux : le Scorpion vous pique, vous perdez ${loss} points d'endurance.`);
        }
        refresh();
    };
    actionButton("Tenter de prendre la clé (Tentez votre Chance)", button => attempt(() => {
        inv().addItem(effect.key, 1, "equipment");
        showDice("Chanceux : vous vous emparez de la clé.");
        button.remove();
    }));
    actionButton("Tenter de prendre une Pièce d'Or (Tentez votre Chance)", button => attempt(() => {
        inv().addItem(GOLD, 1, "gold");
        goldLeft--;
        showDice(`Chanceux : vous prenez une Pièce d'Or (il en reste ${goldLeft}).`);
        if (goldLeft === 0) button.remove();
    }));
}

// ---------------------------------------------------------------------------
// Choix : un bouton est-il cliquable ?
// ---------------------------------------------------------------------------
export function choiceState(choice) {
    const c = hero();
    const no = reason => ({ enabled: false, reason });
    if (gameState.gameOver) return no("");
    if (!c.isInitialized) return no("Créez votre personnage d'abord");
    if (gameState.pendingLoss > 0) return no("Choisissez d'abord les objets que vous perdez");
    if (choice.magicFormula && !c.isSorcerer()) return no("Réservé aux Sorciers");
    if (choice.requiresItem && !hasItem(choice.requiresItem)) return no(`Requis : ${choice.requiresItem}`);
    if (choice.requiresNoItem && hadItem(choice.requiresNoItem)) return no(`Vous possédez : ${choice.requiresNoItem}`);
    if (choice.requiresAnyItem && inv().losable().length === 0) return no("Vous n'avez rien à donner");
    if (choice.cost && inv().checkItem(GOLD) < choice.cost) return no(`Requis : ${choice.cost} pièce(s) d'or`);
    if (choice.requiresLibra && gameState.libraUsed) return no("Libra ne vous écoute plus");
    if (choice.requiresNoLibra && !gameState.libraUsed) return no("");
    if (choice.requiresReturned && !gameState.returned) return no("Voyez d'abord si vous faites une rencontre");
    if (choice.requiresAllMonstersDefeated && gameState.monsters.some(m => m.status !== "vaincu")) return no("Il faut d'abord vaincre votre adversaire");
    if (choice.chanceCheckPassed !== undefined && gameState.isLucky !== choice.chanceCheckPassed) return no(gameState.isLucky === undefined ? "Tentez d'abord votre Chance" : "");
    if (choice.requiresNoLuckRoll && gameState.isLucky !== undefined) return no("");
    if (choice.skillCheckPassed !== undefined && gameState.skillCheckPassed !== choice.skillCheckPassed) return no(gameState.skillCheckPassed === undefined ? "Lancez d'abord les dés" : "");
    if (choice.requiresConditionMet !== undefined && gameState.conditionMet !== choice.requiresConditionMet) return no("");
    if (choice.dieIn && !choice.dieIn.includes(gameState.dieResult)) return no(gameState.dieResult ? "" : "Lancez d'abord le dé");
    if (choice.requiresMonsterHealthAtMost !== undefined) {
        const monster = gameState.monsters.find(m => m.status === "vivant");
        if (!monster || monster.health > choice.requiresMonsterHealthAtMost) return no("Votre adversaire n'est pas assez affaibli");
    }
    if (choice.requiresHealthAtLeast !== undefined && c.health < choice.requiresHealthAtLeast) return no("Vous êtes trop affaibli");
    return { enabled: true, reason: "" };
}

// Réévalue tous les boutons de choix affichés
export function updateChoiceButtons() {
    (gameState.choiceButtons || []).forEach(({ button, choice }) => {
        const state = choiceState(choice);
        button.disabled = !state.enabled;
        button.title = state.reason;
    });
}
