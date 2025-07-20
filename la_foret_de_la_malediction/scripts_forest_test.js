// Jeu d'aventure - Version Test
import { manageMonsters } from "./battle.js";
import { applyChapterEffects } from "./chapterEffects_test.js";
import { updateCharacterStats } from "./character_test.js";
import { Character } from "./character_test.js";
import { takeItem } from "./inventory.js";
import { updateAdventureSheet } from "./inventory.js";
import { useMeal } from "./inventory.js";
import { Inventory } from "./inventory.js";
import { loadRandomTrack } from "./music.js";

// Fonction pour vérifier si le personnage est créé
function isCharacterCreated() {
    return gameState.character && gameState.character.baseSkill > 0;
}

// Chargement des données JSON
async function loadChapters() {
    const response = await fetch('foret_malediction.json');
    const data = await response.json();
    return data.chapters;
}

// Structure globale monstres / caractéristiques perso / inventaire
export let gameState = {
    monsters: [],
    character: null, 
    inventory: null,
    currentChapterId: 0,
    woundedByLoupGarou: false, // Traçage des blessures du loup-garou
    isLucky: undefined, // Résultat du test de chance
    luckResults: [], // Pour les tests multiples de chance
    skillCheckPassed: undefined // Résultat du test d'habileté
};

// Initialisation du personnage et de l'inventaire
function initializeCharacter() {
    gameState.character = new Character(0, 0, 0, 0, 0, 0);
    gameState.inventory = new Inventory();
    gameState.inventory.addItem("repas", 10, "food");
    updateCharacterStats();
    updateAdventureSheet();
}

// Quand le DOM est chargé, choix aléatoire de piste musicale
document.addEventListener('DOMContentLoaded', function() {
    loadRandomTrack();
});

// Afficher un chapitre spécifique
function showChapter(chapters, chapterId) {
    // Réinitialisation de gameState pour les monstres
    gameState.monsters = [];
    
    // Réinitialisation des tests de chance et d'habileté
    gameState.isLucky = undefined;
    gameState.luckResults = [];
    gameState.skillCheckPassed = undefined;

    // Réinitialise les contenus des divs action_message et attack_message
    document.getElementById('action_message').innerHTML = '';
    document.getElementById('attack_message').innerHTML = '';

    // Cherche le chapitre
    const chapter = chapters.find(chap => chap.id === chapterId);
    if (!chapter) {
        alert('Chapitre non trouvé !');
        return;
    }
    gameState.currentChapterId = chapterId;

    // Création du personnage et de l'inventaire au chapitre 0
    if (chapterId === 0) {
        initializeCharacter();
    }
  
    // Affiche le texte
    const chapterTitle = chapterId === 0 ? 'Introduction' : 'Chapitre ' + chapterId;
    document.getElementById('chapter_title').innerText = chapterTitle;
    document.getElementById('text').innerText = chapter.text;
    document.getElementById('illustration').src = chapter.illustration;
  
    // Affiche le bouton de création de personnage uniquement pour le chapitre 0
    const createCharacterButton = document.getElementById("createCharacterButton");
    if (chapterId === 0) {
        createCharacterButton.style.display = 'block';
        // Attacher l'événement click pour initialiser le personnage
        createCharacterButton.onclick = function() {
            gameState.character.initialize();
            updateCharacterStats();
            // Réactiver les boutons de choix après la création du personnage
            const choicesContainer = document.getElementById('choices');
            const choiceButtons = choicesContainer.getElementsByTagName('Button');
            for (let button of choiceButtons) {
                button.disabled = false;
            }
        };
    } else {
        createCharacterButton.style.display = 'none';
    }

    // Appliquer les effets du chapitre
    applyChapterEffects(chapter);

    // Création de boutons pour prendre les objets
    const itemsContainer = document.getElementById('get_item');
    itemsContainer.innerHTML = '';

    if (chapter.items) {
        chapter.items.forEach(item => {
            const itemButton = document.createElement('Button');
            itemButton.innerText = `Prendre ${item.name}`;
            itemButton.addEventListener('click', function() {
                takeItem(item, this);
            });
            itemsContainer.appendChild(itemButton);
        });
    }

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
        useMealButton.style.display = 'none';
    }

    // Gestion des monstres
    if (chapter.monsters) {
        manageMonsters(chapter.monsters);
    } else {
        const monsterContainer = document.getElementById('monsters');
        monsterContainer.innerHTML = 'Pas de monstre ici';
    }

    // Choix
    const choicesContainer = document.getElementById('choices');
    choicesContainer.innerHTML = '';
    chapter.choices.forEach(choice => {
        const choiceButton = document.createElement('Button');
        choiceButton.innerText = choice.text;
        
        // Si on est au chapitre 0 et que le personnage n'est pas créé, désactiver les boutons
        if (chapterId === 0 && !isCharacterCreated()) {
            choiceButton.disabled = true;
            choiceButton.title = "Vous devez d'abord créer votre personnage";
        } else {
            // Vérifie si le choix requiert un item spécifique
            if (choice.requiresItem) {
                const hasItem = gameState.inventory.checkItem(choice.requiresItem.name);
                choiceButton.disabled = !hasItem;
                if (!hasItem) {
                    choiceButton.title = `Requis : ${choice.requiresItem.name}`;
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
                choiceButton.disabled = gameState.isLucky !== choice.chanceCheckPassed;
            }

            // Gestion de conditionMet
            if (choice.requiresConditionMet) {
                choiceButton.disabled = !gameState.conditionMet;
            }

            // Ajouter des attributs personnalisés basés sur le choix requis
            if (choice.skillCheckPassed !== undefined) {
                choiceButton.setAttribute('data-skillCheckPassed', choice.skillCheckPassed.toString());
                choiceButton.disabled = true;
            }

            // Mise à jour basée sur doubleLuckCheck
            if (choice.doubleLuckCheck !== undefined) {
                choiceButton.setAttribute('data-doubleLuckCheck', choice.doubleLuckCheck);
                choiceButton.disabled = true;
            }
        }

        // Vérifie si un coût est associé au choix et passe au chapitre suivant
        choiceButton.addEventListener('click', () => {
            if (choice.cost && choice.cost > 0) {
                gameState.inventory.removeItem('or', choice.cost);
                updateAdventureSheet();
            }
            showChapter(chapters, choice.nextId);      
        });

        choicesContainer.appendChild(choiceButton);
    });
}

// Initialisation
document.addEventListener('DOMContentLoaded', async () => {
    const chapters = await loadChapters();
    
    // Gestion du bouton "Go" pour aller à un chapitre spécifique
    document.getElementById('goToChapterButton').addEventListener('click', () => {
        const chapterNumber = parseInt(document.getElementById('chapterSelect').value);
        if (chapterNumber >= 1 && chapterNumber <= 400) {
            showChapter(chapters, chapterNumber);
        } else {
            alert('Veuillez entrer un numéro de chapitre entre 1 et 400');
        }
    });

    // Affiche le chapitre d'introduction (chapitre 0)
    showChapter(chapters, 0);
});

// Restart
document.getElementById('restartButton').addEventListener('click', function() {
    location.reload();
}); 