//jeu d'aventure
import { manageMonsters } from "./battle.js";
import { applyChapterEffects } from "./chapterEffects.js";
import { updateCharacterStats } from "./character.js";
import { Character } from "./character.js";
import { takeItem } from "./inventory.js";
import { updateAdventureSheet } from "./inventory.js";
import { useMeal } from "./inventory.js";
import { Inventory } from "./inventory.js";
import { loadRandomTrack } from "./music.js";

// Chargement des données JSON
async function loadChapters() {
    const response = await fetch('foret_malediction.json');
    const data = await response.json();
    return data.chapters;
}

//structure globale monstres / caractéristiques perso / inventaire
export let gameState = {
    monsters: [],
    character: null, 
    inventory: null,
    currentChapterId: 0,
};

// quand le DOM est chargé, choix aléatoire de piste musicale
document.addEventListener('DOMContentLoaded', function() {
    loadRandomTrack();
});


// Afficher un chapitre spécifique
function showChapter(chapters, chapterId) {

    // réinitialisation de gameState pour les monstres
    gameState.monsters = [];

    // Réinitialise les contenus des divs action_message et attack_message
    document.getElementById('action_message').innerHTML = '';
    document.getElementById('attack_message').innerHTML = '';

    // cherche le chapitre
    const chapter = chapters.find(chap => chap.id === chapterId);
    if (!chapter) return;
    gameState.currentChapterId = chapterId;

    // Création du personnage et de l'inventaire au chapitre 0
    if (chapterId === 0) {
        gameState.character = new Character(0,0,0,0,0,0);
        gameState.inventory = new Inventory();
        gameState.inventory.addItem("repas", 10,"food")
        updateCharacterStats()
        updateAdventureSheet()
    }
  
    // affiche le texte
    const chapterTitle = chapterId === 0 ? 'Introduction' : 'Chapitre ' + chapterId;
    document.getElementById('chapter_title').innerText = chapterTitle;
    document.getElementById('text').innerText = chapter.text;
    document.getElementById('illustration').src = chapter.illustration;
  
    // Affiche le bouton de création de personnage uniquement pour le chapitre 0
    const createCharacterButton = document.getElementById("createCharacterButton");
    if (chapterId === 0) {
        createCharacterButton.style.display = 'block';
        // Attacher l'événement click pour initialiser le personnage
        createCharacterButton.onclick = function(){
            gameState.character.initialize();
            updateCharacterStats();
        };
    } else {
        createCharacterButton.style.display = 'none';
    };

    // Appliquer les effets du chapitre
    applyChapterEffects(chapter);

    // Création de boutons pour prendre les objets
    const itemsContainer = document.getElementById('get_item');
    itemsContainer.innerHTML = ''; // Efface les boutons précédents

    if (chapter.items) {
        chapter.items.forEach(item => {
            const itemButton = document.createElement('Button');
            itemButton.innerText = `Prendre ${item.name}`;
            itemButton.addEventListener('click', function() {
                takeItem(item, this); // "this" fait référence à l'élément bouton actuel
            });
            itemsContainer.appendChild(itemButton); // Ajoute le bouton dans la div get_item
        })
    };

    // Création bouton pour repas
    const useMealButton = document.getElementById('useMealButton');
    if (gameState.inventory.checkItem('repas', 'food') > 0) {
        useMealButton.style.display = 'block'; 
        if (!useMealButton.onclick) {
            useMealButton.onclick = function() {
                useMeal();
            };
        }
    } else {
        useMealButton.style.display = 'none'; // Masque le bouton s'il n'y a pas de repas
    }

    // gestion des monstres
    if (chapter.monsters) {
        manageMonsters(chapter.monsters);
        
    } else {
        // Si pas de monstres, afficher "Pas de monstre ici"
        const monsterContainer = document.getElementById('monsters');
        monsterContainer.innerHTML = 'Pas de monstre ici';
    };

    //choix
    const choicesContainer = document.getElementById('choices');
    choicesContainer.innerHTML = '';
    chapter.choices.forEach(choice => {

        const choiceButton = document.createElement('Button');
        choiceButton.innerText = choice.text;
        
        // Vérifie si le choix requiert un item spécifique
        if (choice.requiresItem) {
            // Note : On extrait maintenant `name` et `category` de l'objet `requiresItem`
            const hasItem = gameState.inventory.checkItem(choice.requiresItem.name);
            choiceButton.disabled = !hasItem; // Désactive le bouton si l'item requis n'est pas dans l'inventaire
            if (!hasItem) {
                choiceButton.title = `Requis : ${choice.requiresItem.name}`; // Ajoute un titre au bouton pour indiquer l'item requis et sa catégorie
            }
        }

        // Désactiver le bouton si la condition est présente et non remplie
        if (choice.requiresAllMonstersDefeated) {
            choiceButton.setAttribute('data-requiresAllMonstersDefeated', 'true');    
            const allMonstersDefeated = gameState.monsters.every(monster => monster.status === "vaincu");
            choiceButton.disabled = !allMonstersDefeated;
        }

        // Gestion de chanceCheckPassed
        if (choice.chanceCheckPassed !== undefined) {
            choiceButton.setAttribute('data-chanceCheckPassed', choice.chanceCheckPassed);
            choiceButton.disabled = gameState.isLucky !== choice.chanceCheckPassed; // Active ou désactive en fonction de la chance
        }

        // Gestion de conditionMet
        if (choice.requiresConditionMet) {
            choiceButton.disabled = !gameState.conditionMet;
        }

        // Ajouter des attributs personnalisés basés sur le choix requis
        if (choice.skillCheckPassed !== undefined) {
            choiceButton.setAttribute('data-skillCheckRequired', 'true');
            // Désactiver les boutons par défaut, ils seront activés après le test d'habileté
            choiceButton.disabled = true; 
        }

        // Mise à jour basée sur doubleLuckCheck
        if (choice.doubleLuckCheck !== undefined) {
            choiceButton.setAttribute('data-doubleLuckCheck', choice.doubleLuckCheck);
            choiceButton.disabled = true; // Désactivé par défaut jusqu'aux jets de chance
        }

        // Vérifie si un coût est associé au choix et passe au chapitre suivant
        choiceButton.addEventListener('click', () => {
            if (choice.cost && choice.cost > 0) {
                // Soustrait le coût de l'or de l'inventaire
                gameState.inventory.removeItem('or', choice.cost);
                updateAdventureSheet(); // Mise à jour pour refléter le changement
            }
            // Passe au chapitre suivant indiqué par le choix
            showChapter(chapters, choice.nextId);      
        });

        choicesContainer.appendChild(choiceButton);
    });
    }


// Initialisation
document.addEventListener('DOMContentLoaded', async () => {
    const chapters = await loadChapters();
    showChapter(chapters, 0);
  });


//restart
document.getElementById('restartButton').addEventListener('click', function() {
    location.reload(); 
});



