// Les Collines Maléfiques (Sorcellerie ! / 1) — script principal
import { manageMonsters, updateMonsterList } from "./battle.js";
import { applyEffects, choiceState, updateChoiceButtons } from "./chapterEffects.js";
import { Character, updateCharacterStats, triggerGameOver } from "./character.js";
import { Inventory, updateAdventureSheet, takeItem, usePotion, revitalisationLibra, healLibra, GOLD, FOOD } from "./inventory.js";
import { tempt_chance } from "./chance.js";
import { loadRandomTrack, initializeSoundEffects } from "./music.js";

const DEFAULT_ILLUSTRATION = "images_collines/dark_and_gloomy_hills.png";

async function loadJson(file) {
    const response = await fetch(file);
    return response.json();
}

// État global de la partie
export let gameState = {
    chapters: [],
    monsters: [],
    character: null,
    inventory: null,
    currentChapterId: 0,
    currentChapter: null,
    visitedChapters: new Set(),
    choiceButtons: [],      // [{button, choice}] des choix affichés
    entryItems: {},         // contenu du Sac à Dos à l'arrivée dans le paragraphe
    flags: {},              // drapeaux divers posés par les effets "setFlag"
    isLucky: undefined,     // résultat du dernier « Tentez votre Chance » du paragraphe
    skillCheckPassed: undefined,
    conditionMet: undefined,
    dieResult: undefined,
    pendingLoss: 0,         // nombre d'objets que le joueur doit encore choisir de perdre
    ateToday: false,        // a-t-on pris un repas aujourd'hui ?
    libraUsed: false,       // Libra n'intervient qu'une fois par aventure
    returnChapter: null,    // paragraphe auquel revenir après une rencontre (paragraphe 123)
    returned: false,
    encounter: null,
    encounterBonus: 0,
    encounterFought: false,
    nextCombat: null,       // avantages accordés par une Formule pour le prochain combat
    combatMods: {},
    assaultCount: 0,
    gameOver: false,
};

function el(id) {
    return document.getElementById(id);
}

// ---------------------------------------------------------------------------
// Affichage d'un paragraphe
// ---------------------------------------------------------------------------
function showChapter(chapterId, options = {}) {
    if (gameState.gameOver) return;
    const chapter = gameState.chapters.find(chap => chap.id === chapterId);
    if (!chapter) return;

    // réinitialisation de l'état propre au paragraphe
    Object.assign(gameState, {
        monsters: [], pendingMonsters: [], combatMods: {}, assaultCount: 0,
        isLucky: undefined, skillCheckPassed: undefined, conditionMet: undefined, dieResult: undefined,
        pendingLoss: 0, choiceButtons: [], returned: Boolean(options.returning),
        currentChapterId: chapterId, currentChapter: chapter,
    });
    gameState.visitedChapters.add(chapterId);
    ["action_message", "attack_message", "effect_message", "get_item", "tempt_chance_button",
        "zone_result_dice", "meal_zone", "MealMessage", "PotionMessage"].forEach(id => { el(id).innerHTML = ""; });
    ["attackButton", "temptChanceButton", "no_temptChanceButton", "actual_monster"].forEach(id => { el(id).style.display = "none"; });

    if (chapterId === 0) {
        gameState.character = new Character();
        gameState.inventory = new Inventory();
    }
    gameState.entryItems = {};
    gameState.inventory.items.forEach(i => { gameState.entryItems[i.name] = i.quantity; });

    // texte et illustration
    el("chapter_title").innerText = chapter.title || "Chapitre " + chapterId;
    el("text").innerHTML = chapter.text + (chapter.note ? `<p class="note-adaptation">Note d'adaptation : ${chapter.note}</p>` : "");
    const illustration = el("illustration");
    illustration.onerror = () => { illustration.onerror = null; illustration.src = DEFAULT_ILLUSTRATION; };
    illustration.src = chapter.illustration || DEFAULT_ILLUSTRATION;
    el("characterCreation").style.display = chapterId === 0 ? "block" : "none";
    el("spellBookButton").style.display = chapterId === 0 ? "inline-block" : "none";

    // monstres du paragraphe (parfois seulement si l'on possède un objet)
    if (chapter.monsters && chapter.monsters.length && (!chapter.monstersIf || gameState.entryItems[chapter.monstersIf] > 0)) {
        gameState.pendingMonsters = chapter.monsters.map(m => ({ ...m, status: "vivant" }));
    }

    // effets : ceux du choix qui nous a menés ici, puis ceux du paragraphe
    applyEffects(options.choiceEffects, false);
    applyEffects(chapter.effects, Boolean(options.returning));
    if (gameState.gameOver) {
        renderChoices(chapter);
        return;
    }

    if (gameState.pendingMonsters.length) {
        manageMonsters(gameState.pendingMonsters);
    } else if (!gameState.monsters.length) {
        updateMonsterList();
    }

    // objets à prendre ou à acheter
    (options.returning ? [] : chapter.items || []).forEach(item => {
        const button = document.createElement("button");
        const quantity = item.quantity > 1 ? ` (x ${item.quantity})` : "";
        button.innerText = item.price
            ? `Acheter : ${item.name}${quantity} — ${item.price} pièce(s) d'or`
            : (item.name === GOLD ? `Prendre ${item.quantity} pièce(s) d'or` : `Prendre : ${item.name}${quantity}`);
        button.addEventListener("click", () => takeItem(item, button));
        el("get_item").appendChild(button);
    });

    if (chapter.meal && !options.returning) renderMeal(chapter.meal);
    renderChoices(chapter);
    updateCharacterStats();
    updateAdventureSheet();
    window.scrollTo({ top: 0, behavior: "smooth" });
}

// Repas : le gain dépend du fait d'avoir déjà mangé ou non dans la journée
function renderMeal(meal) {
    const zone = el("meal_zone");
    const eat = (button, withBomba) => {
        const inv = gameState.inventory;
        if (meal.cost && inv.checkItem(GOLD) < meal.cost) {
            el("MealMessage").innerHTML = `Ce repas coûte ${meal.cost} pièce(s) d'or : vous n'en avez pas assez.`;
            return;
        }
        if (!meal.free && inv.checkItem(FOOD) < 1) {
            el("MealMessage").innerHTML = "Vous n'avez plus de Provisions.";
            return;
        }
        if (meal.cost) inv.removeItem(GOLD, meal.cost);
        if (!meal.free) inv.removeItem(FOOD, 1);
        if (withBomba) inv.removeItem("Bomba", 1);
        const c = gameState.character;
        const before = c.health;
        const value = (gameState.ateToday ? meal.other : meal.first) * (withBomba ? 2 : 1);
        c.health = Math.min(c.health + value, Math.max(c.baseHealth, c.health));
        gameState.ateToday = true;
        el("MealMessage").innerHTML = `Vous prenez un repas${withBomba ? " accompagné de la Bomba" : ""} : +${c.health - before} point(s) d'endurance.`;
        zone.innerHTML = "";
        updateCharacterStats();
        updateAdventureSheet();
        updateChoiceButtons();
    };
    const label = meal.cost ? `Prendre un repas (${meal.cost} pièce(s) d'or)` : (meal.free ? "Prendre le repas offert" : "Prendre un repas (1 Provision)");
    const button = document.createElement("button");
    button.innerText = label;
    button.addEventListener("click", () => eat(button, false));
    zone.appendChild(button);
    if (gameState.inventory.checkItem("Bomba") > 0) {
        const bomba = document.createElement("button");
        bomba.innerText = label + " avec la Bomba (gain doublé)";
        bomba.addEventListener("click", () => eat(bomba, true));
        zone.appendChild(bomba);
    }
}

function renderChoices(chapter) {
    const container = el("choices");
    container.innerHTML = "";
    gameState.choiceButtons = [];
    (chapter.choices || []).forEach(choice => {
        if (choice.hideOnReturn && gameState.returned) return;
        const button = document.createElement("button");
        button.innerText = choice.text;
        if (choice.magicFormula) button.classList.add("formule");
        button.addEventListener("click", () => followChoice(choice));
        container.appendChild(button);
        gameState.choiceButtons.push({ button, choice });
    });
    updateChoiceButtons();
}

function followChoice(choice) {
    if (gameState.gameOver || !choiceState(choice).enabled) return;
    if (choice.gameOver) {
        triggerGameOver(choice.text);
        return;
    }
    if (choice.cost) gameState.inventory.removeItem(GOLD, choice.cost);
    if (choice.requiresLibra) gameState.libraUsed = true;

    let nextId = choice.nextId;
    if (choice.luckTest) {
        const lucky = tempt_chance(gameState.character.chance);
        nextId = lucky ? choice.luckTest.lucky : choice.luckTest.unlucky;
    }
    if (choice.encounter !== undefined) {
        gameState.returnChapter = gameState.currentChapterId;
        gameState.encounterBonus = choice.encounter;
        gameState.encounter = null;
        gameState.encounterFought = false;
    }
    const options = { choiceEffects: choice.effects };
    if (nextId === "return") {
        nextId = gameState.returnChapter;
        gameState.returnChapter = null;
        gameState.encounter = null;
        options.returning = true;
    }
    showChapter(nextId, options);
}

// ---------------------------------------------------------------------------
// Initialisation de la page
// ---------------------------------------------------------------------------
function createCharacter(role) {
    const c = gameState.character;
    c.initialize(role);
    gameState.inventory = new Inventory();
    gameState.inventory.addItem("épée", 1, "equipment");
    gameState.inventory.addItem(GOLD, 20, "gold");
    gameState.inventory.addItem(FOOD, 2, "food");
    el("characterMessage").innerHTML = role === "sorcier"
        ? "Vous êtes un <strong>Sorcier</strong> : vous pourrez utiliser les Formules Magiques. Étudiez le Livre des Formules avant de partir : vous n'y aurez plus accès ensuite !"
        : "Vous êtes un <strong>Guerrier</strong> : vous ne pourrez compter que sur votre arme, les Formules Magiques vous sont interdites.";
    updateCharacterStats();
    updateAdventureSheet();
    updateChoiceButtons();
}

function setupModal(modalId, openButtonId, onOpen) {
    const modal = el(modalId);
    const close = () => { modal.style.display = "none"; };
    if (openButtonId) {
        el(openButtonId).addEventListener("click", () => {
            if (onOpen) onOpen();
            modal.style.display = "flex";
        });
    }
    modal.querySelectorAll(".close-modal").forEach(b => b.addEventListener("click", close));
    modal.addEventListener("click", e => { if (e.target === modal) close(); });
    document.addEventListener("keydown", e => { if (e.key === "Escape") close(); });
    return close;
}

// Ajustements manuels de la Feuille d'Aventure, pour les rares règles non automatisées
function manualAdjust(target, delta) {
    const c = gameState.character;
    const inv = gameState.inventory;
    if (!c.isInitialized || gameState.gameOver) return;
    if (target === "gold" || target === "food") {
        const name = target === "gold" ? GOLD : FOOD;
        if (delta > 0) inv.addItem(name, delta, target);
        else inv.removeItem(name, -delta);
    } else if (target === "health") {
        c._health = Math.max(0, c._health + delta);
    } else {
        c[target] = Math.max(0, c[target] + delta);
    }
    updateCharacterStats();
    updateAdventureSheet();
    updateChoiceButtons();
}

document.addEventListener("DOMContentLoaded", async () => {
    loadRandomTrack();
    initializeSoundEffects();

    setupModal("mapModal", "mapButton", () => { el("mapImage").src = "images_collines/land_of_kakhabad.jpg"; });
    setupModal("rulesModal", "rulesButton");
    const closeLibra = setupModal("libraModal", "invokeLibraButton");
    el("libraRevitalisation").addEventListener("click", () => { revitalisationLibra(); closeLibra(); });
    el("libraHeal").addEventListener("click", () => { healLibra(); closeLibra(); });
    el("usePotionButton").addEventListener("click", usePotion);
    el("createWarriorButton").addEventListener("click", () => createCharacter("guerrier"));
    el("createSorcererButton").addEventListener("click", () => createCharacter("sorcier"));
    el("restartButton").addEventListener("click", () => location.reload());
    document.querySelectorAll("#manualAdjust button").forEach(button => {
        button.addEventListener("click", () => manualAdjust(button.dataset.target, Number(button.dataset.delta)));
    });

    // Livre des Formules : consultable uniquement avant le départ
    const spells = (await loadJson("formules_magiques.json")).magic_formulas;
    el("spellList").innerHTML = spells.map(s =>
        `<div class="spell"><h3>${s.code} <span>coût : ${s.cost} point(s) d'endurance</span></h3><p>${s.description}</p></div>`).join("");
    setupModal("spellBookModal", "spellBookButton");

    gameState.chapters = (await loadJson("collines_malefiques.json")).chapters;
    showChapter(0);
});

// Accès pour le débogage dans la console : collines.go(123)
window.collines = { gameState, go: id => showChapter(id) };
