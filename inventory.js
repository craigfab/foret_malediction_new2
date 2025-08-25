import { updateCharacterStats } from "./character.js";
import { gameState } from "./scripts_forest.js";

//creation d'un objet inventaire
export class Inventory {
    constructor() {
        this.items = []; // Initialise un tableau pour les items
    }

    // Ajoute un item à l'inventaire avec une catégorie spécifiée
    addItem(itemName, quantity = 1, category, price = null) {
        // Recherche si l'item existe déjà et correspond à la catégorie donnée
        const index = this.items.findIndex(item => item.name === itemName && item.category === category);
        if (index !== -1) {
            // Si l'item existe déjà (avec la même catégorie), met à jour sa quantité
            this.items[index].quantity += quantity;
        } else {
            // Sinon, ajoute l'item comme un nouvel élément du tableau avec sa catégorie
            this.items.push({ name: itemName, quantity, category });
        }
    }

    // Supprime une quantité spécifiée d'un item (et sa catégorie) de l'inventaire
    removeItem(itemName, quantity = 1) {
        const index = this.items.findIndex(item => item.name === itemName);
        if (index !== -1 && this.items[index].quantity >= quantity) {
            // Si l'item existe (avec la catégorie spécifiée) et qu'il y a suffisamment de quantité
            this.items[index].quantity -= quantity;
            if (this.items[index].quantity === 0) {
                // Si la quantité de l'item tombe à 0, le retire du tableau
                this.items.splice(index, 1);
            }
            return true;
        }
        return false; // Retourne faux si l'item (ou la catégorie spécifiée) n'existe pas ou pas assez de quantité
    }

    // Vérifie la quantité d'un item (et sa catégorie) dans l'inventaire
    checkItem(itemName) {
        const item = this.items.find(item => item.name === itemName);
        return item ? item.quantity : 0;
    }
}


// fonction update_adventure_sheet
export function updateAdventureSheet() {

    const equipmentDiv = document.getElementById('equipment');
    const goldDiv = document.getElementById('gold');
    const jewelryDiv = document.getElementById('jewelry');
    const potionsDiv = document.getElementById('potions');
    const foodDiv = document.getElementById('food');

    // Réinitialiser le contenu des divs
    equipmentDiv.innerHTML = '';
    goldDiv.innerHTML = '';
    jewelryDiv.innerHTML = '';
    potionsDiv.innerHTML = '';
    foodDiv.innerHTML = '';

    // Initialiser les chaînes pour accumuler les descriptions
    let equipmentItems = [];
    let goldItems = [];
    let jewelryItems = [];
    let potionsItems = [];
    let foodItems = [];

    gameState.inventory.items.forEach(i => {
        // Préparation de la chaîne de description pour l'item
        let itemDescription = i.quantity && i.quantity > 1 ? `${i.name} x ${i.quantity}` : `${i.name}`;

        switch (i.category) {
            case 'equipment':
                equipmentItems.push(itemDescription);
                break;
            case 'gold':
                goldItems.push(itemDescription);
                break;
            case 'jewelry':
                jewelryItems.push(itemDescription);
                break;
            case 'potions':
                // Affichage plus court: enlever le préfixe "potion de" ou "potion d'"
                {
                    const potionName = i.name.replace(/^potion(?:\s+d[e']?)?\s*/i, '');
                    const potionDescription = i.quantity && i.quantity > 1 ? `${potionName} x ${i.quantity}` : `${potionName}`;
                    potionsItems.push(potionDescription);
                }
                break;
            case 'food':
                foodItems.push(itemDescription);
                break;
            default:
                console.log(`Catégorie non reconnue pour l'objet : ${i.name}`);
        }
    });

    equipmentDiv.innerHTML = equipmentItems.length > 0 ? `Équipement transporté :<br>${equipmentItems.join('<br>')}` : 'Equipement';
    goldDiv.innerHTML = goldItems.length > 0 ? `Or = ${goldItems.join(', ')}` : 'Or';
    jewelryDiv.innerHTML = jewelryItems.length > 0 ? `Bijoux = ${jewelryItems.join(', ')}` : 'Bijoux';
    potionsDiv.innerHTML = potionsItems.length > 0 ? `Potions = ${potionsItems.join(', ')}` : 'Potions';
    foodDiv.innerHTML = foodItems.length > 0 ? `Nourriture = ${foodItems.join(', ')}` : 'Nourriture';

    // Mettre à jour la disponibilité du bouton Carte en fonction de l'inventaire
    const mapButton = document.getElementById('mapButton');
    if (mapButton) {
        const hasMap = (gameState.inventory.checkItem('map') || 0) > 0;
        mapButton.disabled = !hasMap;
        mapButton.title = hasMap ? 'Afficher la carte' : "Vous n'avez pas encore la carte";
    }
}

// gérer les repas
export function useMeal() {
    const foodQuantity = gameState.inventory.checkItem('repas', 'food');
    const mealMessageDiv = document.getElementById('MealMessage');

    if (foodQuantity > 0) {
        // Vérifier si l'endurance est déjà au maximum
        if (gameState.character.health >= gameState.character.baseHealth) {
            mealMessageDiv.innerHTML = 'Endurance au maximum, repas inutile.';
            return;
        }
        
        gameState.inventory.removeItem('repas', 1, 'food');
        const oldHealth = gameState.character.health;
        gameState.character.health = Math.min(gameState.character.health + 4, gameState.character.baseHealth);
        const actualGain = gameState.character.health - oldHealth;
        updateCharacterStats();
        updateAdventureSheet();
        mealMessageDiv.innerHTML = `Un repas consommé, +${actualGain} points de santé.`;
    } else {
        mealMessageDiv.innerHTML = 'Aucun repas disponible.';
    }
}

// gérer la potion d'adresse
export function usePotionAdresse() {
    const potionQuantity = gameState.inventory.checkItem("potion d'adresse");
    const potionMessageDiv = document.getElementById('PotionMessage');

    if (potionQuantity > 0) {
        gameState.inventory.removeItem("potion d'adresse", 1);
        gameState.character.skill = gameState.character.baseSkill;
        updateCharacterStats();
        updateAdventureSheet();
        potionMessageDiv.innerHTML = "Potion d'adresse consommée, habileté rétablie à son niveau initial.";
    } else {
        potionMessageDiv.innerHTML = "Aucune potion d'adresse disponible.";
    }
}

// gérer la potion de vigueur
export function usePotionVigueur() {
    const potionQuantity = gameState.inventory.checkItem('potion de vigueur');
    const potionMessageDiv = document.getElementById('PotionMessage');

    if (potionQuantity > 0) {
        gameState.inventory.removeItem('potion de vigueur', 1);
        gameState.character.health = gameState.character.baseHealth;
        updateCharacterStats();
        updateAdventureSheet();
        potionMessageDiv.innerHTML = 'Potion de vigueur consommée, endurance rétablie à son niveau initial.';
    } else {
        potionMessageDiv.innerHTML = 'Aucune potion de vigueur disponible.';
    }
}

// gérer la potion de bonne fortune
export function usePotionBonneFortune() {
    const potionQuantity = gameState.inventory.checkItem('potion de bonne fortune');
    const potionMessageDiv = document.getElementById('PotionMessage');

    if (potionQuantity > 0) {
        gameState.inventory.removeItem('potion de bonne fortune', 1);
        gameState.character.chance = gameState.character.baseChance + 1;
        updateCharacterStats();
        updateAdventureSheet();
        potionMessageDiv.innerHTML = 'Potion de bonne fortune consommée, chance rétablie à son niveau initial + 1.';
    } else {
        potionMessageDiv.innerHTML = 'Aucune potion de bonne fortune disponible.';
    }
}

// gérer la potion de force
export function usePotionForce() {
    const potionMessageDiv = document.getElementById('PotionMessage');

    if (gameState.inventory.checkItem('Potion de Force') > 0) {
        // Vérifier si l'endurance est déjà au maximum
        if (gameState.character.health >= gameState.character.baseHealth) {
            potionMessageDiv.innerHTML = 'Endurance au maximum, potion inutile.';
            return;
        }
        
        const oldHealth = gameState.character.health;
        gameState.inventory.removeItem('Potion de Force');
        gameState.character.health = Math.min(gameState.character.health + 5, gameState.character.baseHealth);
        const actualGain = gameState.character.health - oldHealth;
        updateCharacterStats();
        updateAdventureSheet();
        potionMessageDiv.innerHTML = `Potion de Force consommée, +${actualGain} points d'endurance.`;
    } else {
        potionMessageDiv.innerHTML = 'Aucune Potion de Force disponible.';
    }
}


// fonction take_item
export function takeItem(item, buttonElement) {
    const actionMessageDiv = document.getElementById("action_message");

    // Vérifie si nous sommes au chapitre 0, l'objet est une potion, et si une potion est déjà dans l'inventaire
    if (gameState.currentChapterId === 0 && item.category === 'potions' && gameState.inventory.items.some(i => i.category === 'potions')) {
        actionMessageDiv.innerHTML = "Vous avez déjà une potion dans votre inventaire. Vous ne pouvez pas prendre une autre potion.";
        return; // Empêche l'ajout d'une autre potion
    }

    // Vérifie si l'objet a un coût et si le joueur a suffisamment d'or
    if (item.price) {
        const goldQuantity = gameState.inventory.checkItem('or', 'gold');
        if (goldQuantity >= item.price) {
            gameState.inventory.removeItem('or', item.price); // Enlève le coût en or
            gameState.inventory.addItem(item.name, item.quantity || 1, item.category); // Ajoute l'objet
            actionMessageDiv.innerHTML = `Vous avez acheté ${item.name} pour ${item.price} pièces d'or.`;
            buttonElement.remove(); // Supprime le bouton une fois l'achat réussi
        } else {
            actionMessageDiv.innerHTML = `Vous n'avez pas assez d'or pour acheter ${item.name}.`;
            return; // Sortie précoce si pas assez d'or
        }
    } else {
        gameState.inventory.addItem(item.name, item.quantity || 1, item.category);
        
        // Si l'item a une valeur, ajouter automatiquement l'or correspondant
        if (item.goldValue && item.goldValue > 0) {
            gameState.inventory.addItem('or', item.goldValue, 'gold');
            actionMessageDiv.innerHTML = `Vous avez pris ${item.name}, du type ${item.category}. Vous gagnez ${item.goldValue} pièces d'or.`;
        } else if (item.name === 'or' || item.category === 'gold') {
            // Cas spécifique pour l'or : toujours afficher la quantité
            const quantiteOr = item.quantity || 1;
            actionMessageDiv.innerHTML = `Vous avez pris ${quantiteOr} pièce${quantiteOr > 1 ? 's' : ''} d'or.`;
        } else {
            actionMessageDiv.innerHTML = `Vous avez pris ${item.name}, du type ${item.category}.`;
        }
        
        buttonElement.remove();
    }

    updateAdventureSheet();
    updateCharacterStats(); // Mise à jour pour afficher les modificateurs de combat
}

