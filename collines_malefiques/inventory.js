import { updateCharacterStats, WEAPONS } from "./character.js";
import { gameState } from "./scripts_collines.js";
import { updateChoiceButtons } from "./chapterEffects.js";

export const GOLD = "or";
export const FOOD = "provisions";
export const POTION = "potion de Myrtibelle";
const CURABLE = ["peste", "malédiction de l'Esprit", "malédiction d'Alianna"];

//creation d'un objet inventaire
export class Inventory {
    constructor() {
        this.items = [];
    }

    addItem(itemName, quantity = 1, category = "equipment") {
        const found = this.items.find(item => item.name === itemName);
        if (found) {
            found.quantity += quantity;
        } else {
            this.items.push({ name: itemName, quantity, category });
        }
    }

    // Retire jusqu'à `quantity` exemplaires ; renvoie le nombre réellement retiré
    removeItem(itemName, quantity = 1) {
        const index = this.items.findIndex(item => item.name === itemName);
        if (index === -1) return 0;
        const removed = Math.min(quantity, this.items[index].quantity);
        this.items[index].quantity -= removed;
        if (this.items[index].quantity <= 0) {
            this.items.splice(index, 1);
        }
        return removed;
    }

    checkItem(itemName) {
        const item = this.items.find(item => item.name === itemName);
        return item ? item.quantity : 0;
    }

    // Objets que l'on peut perdre, donner ou se faire voler (tout sauf les états et l'arme en main)
    losable() {
        const weapon = gameState.character.getWeapon().name;
        return this.items.filter(i => i.category !== "status" && i.name !== weapon);
    }

    isWeapon(name) {
        return WEAPONS.some(w => w.name === name);
    }
}

// fonction update_adventure_sheet
export function updateAdventureSheet() {
    const groups = { equipment: [], gold: [], jewelry: [], potions: [], food: [], status: [] };
    gameState.inventory.items.forEach(i => {
        const label = i.quantity > 1 ? `${i.name} x ${i.quantity}` : i.name;
        (groups[i.category] || groups.equipment).push(label);
    });

    const set = (id, title, list, sep = ", ") => {
        const div = document.getElementById(id);
        if (div) div.innerHTML = list.length > 0 ? `${title}${list.join(sep)}` : title.replace(/\s*[:=]\s*(<br>)?$/, "");
    };
    set("equipment", "Équipement transporté :<br>", groups.equipment, "<br>");
    set("gold", "Or = ", [String(gameState.inventory.checkItem(GOLD))]);
    set("jewelry", "Bijoux = ", groups.jewelry);
    set("potions", "Potions = ", groups.potions);
    set("food", "Provisions = ", [String(gameState.inventory.checkItem(FOOD)) + " repas"].concat(groups.food.filter(f => !f.startsWith(FOOD))));
    set("status", "État / compagnons : ", groups.status);

    const potionButton = document.getElementById("usePotionButton");
    if (potionButton) {
        potionButton.style.display = gameState.inventory.checkItem(POTION) > 0 ? "block" : "none";
    }
    const libraButton = document.getElementById("invokeLibraButton");
    if (libraButton) {
        libraButton.style.display = gameState.character.isInitialized && !gameState.libraUsed ? "block" : "none";
    }
}

// Boire la potion de Myrtibelle : +3 ENDURANCE, interdit pendant un combat (paragraphe 274)
export function usePotion() {
    const messageDiv = document.getElementById("PotionMessage");
    if (gameState.monsters.some(m => m.status === "vivant")) {
        messageDiv.innerHTML = "Vous ne pouvez pas boire la potion pendant un combat.";
        return;
    }
    if (gameState.inventory.removeItem(POTION, 1)) {
        const c = gameState.character;
        const before = c.health;
        c.health = Math.min(c.health + 3, c.baseHealth);
        messageDiv.innerHTML = `Vous buvez le jus de Myrtibelle : +${c.health - before} point(s) d'endurance.`;
        updateCharacterStats();
        updateAdventureSheet();
    }
}

// Libra, déesse de la justice : une seule intervention par aventure.
function invokeLibra(message, action) {
    const messageDiv = document.getElementById("PotionMessage");
    if (gameState.libraUsed) {
        messageDiv.innerHTML = "Libra a déjà été invoquée, elle ne vous écoutera plus avant Kharé.";
        return;
    }
    gameState.libraUsed = true;
    action();
    messageDiv.innerHTML = message;
    updateCharacterStats();
    updateAdventureSheet();
    updateChoiceButtons();
}

// Revitalisation : HABILETÉ, ENDURANCE et CHANCE reviennent à leur niveau initial
export function revitalisationLibra() {
    invokeLibra("Libra vous revitalise : vos points d'Habileté, d'Endurance et de Chance retrouvent leur niveau initial.", () => {
        const c = gameState.character;
        const cursed = gameState.inventory.checkItem("malédiction d'Alianna") > 0;
        c.skill = c.baseSkill - (cursed ? 2 : 0);
        c.health = c.baseHealth;
        c.chance = c.baseChance;
    });
}

// Guérison : neutralise les mauvais sorts et guérit les maladies
export function healLibra() {
    invokeLibra("Libra neutralise les mauvais sorts qui pèsent sur vous et vous guérit de vos maladies.", () => {
        const c = gameState.character;
        if (gameState.inventory.checkItem("malédiction d'Alianna") > 0) {
            c.skill = Math.min(c.skill + 2, c.baseSkill);
        }
        CURABLE.forEach(name => gameState.inventory.removeItem(name, 99));
    });
}

// fonction take_item (boutons « Prendre » / « Acheter »)
export function takeItem(item, buttonElement) {
    const actionMessageDiv = document.getElementById("action_message");
    const quantity = item.quantity || 1;

    if (item.price) {
        if (gameState.inventory.checkItem(GOLD) < item.price) {
            actionMessageDiv.innerHTML = `Vous n'avez pas assez d'or pour acheter : ${item.name}.`;
            return;
        }
        gameState.inventory.removeItem(GOLD, item.price);
        actionMessageDiv.innerHTML = `Vous avez acheté : ${item.name}${quantity > 1 ? " x " + quantity : ""} pour ${item.price} pièce(s) d'or.`;
    } else if (item.name === GOLD) {
        actionMessageDiv.innerHTML = `Vous avez pris ${quantity} pièce${quantity > 1 ? "s" : ""} d'or.`;
    } else {
        actionMessageDiv.innerHTML = `Vous avez pris : ${item.name}${quantity > 1 ? " x " + quantity : ""}.`;
    }
    gameState.inventory.addItem(item.name, quantity, item.category);
    if (buttonElement) buttonElement.remove();

    updateAdventureSheet();
    updateCharacterStats();
    updateChoiceButtons();
}
