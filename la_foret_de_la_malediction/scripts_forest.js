//jeu d'aventure
import { manageMonsters } from "./battle.js";
import { applyChapterEffects } from "./chapterEffects.js";
import { updateCharacterStats, triggerGameOver, triggerVictory } from "./character.js";
import { Character } from "./character.js";
import { takeItem } from "./inventory.js";
import { updateAdventureSheet } from "./inventory.js";
import { useMeal } from "./inventory.js";
import { usePotionAdresse, usePotionVigueur, usePotionBonneFortune } from "./inventory.js";
import { Inventory } from "./inventory.js";
import { loadRandomTrack, initializeSoundEffects } from "./music.js";

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
    currentChapter: null, // Objet chapitre actuel
    visitedChapters: new Set(), // Ensemble des chapitres visités
    woundedByLoupGarou: false, // Traçage des blessures du loup-garou
    isLucky: undefined, // Résultat du test de chance
    luckResults: [], // Pour les tests multiples de chance
    skillCheckPassed: undefined, // Résultat du test d'habileté
    skillChanceCheckPassed: undefined, // Résultat du test d'habileté + chance
    assaultCount: 0, // Compteur d'assauts pour le chapitre 84
    fleeMessage: false, // Marqueur pour indiquer qu'une fuite a eu lieu
    gameOver: false, // Marqueur pour indiquer si le jeu est terminé (Game Over)
    itemsGiven: 0 // Compteur pour les objets donnés (chapitre 279)
};

// quand le DOM est chargé, choix aléatoire de piste musicale et initialisation des effets sonores
document.addEventListener('DOMContentLoaded', function() {
    loadRandomTrack();
    initializeSoundEffects(); // Initialiser le système d'effets sonores
    // Initialiser le bouton de carte
    const mapButton = document.getElementById('mapButton');
    const mapModal = document.getElementById('mapModal');
    const closeModalBtn = mapModal ? mapModal.querySelector('.close-modal') : null;
    const mapImage = document.getElementById('mapImage');
    if (mapButton && mapModal && closeModalBtn && mapImage) {
        // Désactiver par défaut (sera activé via updateAdventureSheet si la carte est dans l'inventaire)
        mapButton.disabled = true;
        mapButton.title = "Vous n'avez pas encore la carte";
        mapButton.addEventListener('click', () => {
            // Charger l'image de la carte et afficher le modal
            mapImage.src = '../images/images_foret/map_foret.JPG';
            mapModal.style.display = 'flex';
        });
        closeModalBtn.addEventListener('click', () => {
            mapModal.style.display = 'none';
        });
        mapModal.addEventListener('click', (e) => {
            if (e.target === mapModal) {
                mapModal.style.display = 'none';
            }
        });
        // Fermer avec Echap
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && mapModal.style.display !== 'none') {
                mapModal.style.display = 'none';
            }
        });
    }
});


// Afficher un chapitre spécifique
function showChapter(chapters, chapterId) {

    // Empêcher la navigation si le jeu est terminé (Game Over)
    if (gameState.gameOver) {
        return;
    }

    // réinitialisation de gameState pour les monstres
    gameState.monsters = [];
    
    // Réinitialisation des tests de chance et d'habileté
    gameState.isLucky = undefined;
    gameState.luckResults = [];
    gameState.skillCheckPassed = undefined;
    gameState.skillChanceCheckPassed = undefined;
    gameState.assaultCount = 0; // Réinitialiser le compteur d'assauts

    // Réinitialise les contenus des divs action_message et attack_message
    document.getElementById('action_message').innerHTML = '';
    document.getElementById('attack_message').innerHTML = '';
    
    // Réinitialise les boutons d'attaque et de chance
    document.getElementById('attackButton').style.display = 'none';
    document.getElementById('temptChanceButton').style.display = 'none';
    document.getElementById('no_temptChanceButton').style.display = 'none';
    document.getElementById('actual_monster').innerHTML = '';

    // cherche le chapitre
    const chapter = chapters.find(chap => chap.id === chapterId);
    if (!chapter) return;
    gameState.currentChapterId = chapterId;
    gameState.currentChapter = chapter;
    
    // Enregistrer le chapitre comme visité
    gameState.visitedChapters.add(chapterId);

    // Création du personnage et de l'inventaire au chapitre 0
    if (chapterId === 0) {
        gameState.character = new Character(0,0,0,0,0,0);
        gameState.character.isInitialized = false;
        gameState.inventory = new Inventory();
        gameState.inventory.addItem("repas", 10,"food")
        updateCharacterStats()
        updateAdventureSheet()
    }
  
    // affiche le texte
    const chapterTitle = chapterId === 0 ? 'Introduction' : 'Chapitre ' + chapterId;
    document.getElementById('chapter_title').innerText = chapterTitle;
    document.getElementById('text').innerText = chapter.text;
    // --- Ajout pour image aléatoire au chapitre 381 ---
    if (chapterId === 381) {
        const images = [
            '../images/images_foret/return_381.png',
            '../images/images_foret/return_381_2.png',
            '../images/images_foret/return_381_3.png'
        ];
        const randomIndex = Math.floor(Math.random() * images.length);
        document.getElementById('illustration').src = images[randomIndex];
    } else {
        document.getElementById('illustration').src = chapter.illustration;
    }
  
    // Affiche le bouton de création de personnage uniquement pour le chapitre 0
    const createCharacterButton = document.getElementById("createCharacterButton");
    if (chapterId === 0) {
        createCharacterButton.style.display = 'block';
        // Attacher l'événement click pour initialiser le personnage
        createCharacterButton.onclick = function(){
            gameState.character.initialize();
            gameState.character.isInitialized = true;
            updateCharacterStats();
            // Réactiver les boutons de choix une fois le personnage créé
            const buttons = document.getElementById('choices').getElementsByTagName('Button');
            for (let button of buttons) {
                button.disabled = false;
            }
        };
    } else {
        createCharacterButton.style.display = 'none';
    };

    // Appliquer les effets du chapitre
    applyChapterEffects(chapter);

    // Affichage du message de fuite du chapitre précédent (après applyChapterEffects)
    if (gameState.fleeMessage) {
        const effectMessageDiv = document.getElementById('effect_message');
        if (effectMessageDiv) {
            // Ajouter le message de fuite après les autres effets
            effectMessageDiv.innerHTML += '<p><strong>Fuite :</strong> Vous avez perdu 2 points d\'endurance en prenant la fuite.</p>';
        }
        gameState.fleeMessage = false; // Réinitialiser après affichage
    }

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

    // Création bouton pour potion d'adresse
    const usePotionAdresseButton = document.getElementById('usePotionAdresseButton');
    if (gameState.inventory.checkItem("potion d'adresse") > 0) {
        usePotionAdresseButton.style.display = 'block'; 
        if (!usePotionAdresseButton.onclick) {
            usePotionAdresseButton.onclick = function() {
                usePotionAdresse();
            };
        }
    } else {
        usePotionAdresseButton.style.display = 'none'; // Masque le bouton s'il n'y a pas de potion d'adresse
    }

    // Création bouton pour potion de vigueur
    const usePotionVigueurButton = document.getElementById('usePotionVigueurButton');
    if (gameState.inventory.checkItem('potion de vigueur') > 0) {
        usePotionVigueurButton.style.display = 'block'; 
        if (!usePotionVigueurButton.onclick) {
            usePotionVigueurButton.onclick = function() {
                usePotionVigueur();
            };
        }
    } else {
        usePotionVigueurButton.style.display = 'none'; // Masque le bouton s'il n'y a pas de potion de vigueur
    }

    // Création bouton pour potion de bonne fortune
    const usePotionBonneFortuneButton = document.getElementById('usePotionBonneFortuneButton');
    if (gameState.inventory.checkItem('potion de bonne fortune') > 0) {
        usePotionBonneFortuneButton.style.display = 'block'; 
        if (!usePotionBonneFortuneButton.onclick) {
            usePotionBonneFortuneButton.onclick = function() {
                usePotionBonneFortune();
            };
        }
    } else {
        usePotionBonneFortuneButton.style.display = 'none'; // Masque le bouton s'il n'y a pas de potion de bonne fortune
    }

    // gestion des monstres
    if (chapter.monsters) {
        // Vérifier si c'est le combat spécial des pygmées (chapitre 377)
        if (chapter.id === 377) {
            import("./battle2.js").then(battle2 => {
                battle2.managePygmees(chapter.monsters);
            });
        }
        // Vérifier si c'est le combat spécial des chiens (chapitre 96)
        else if (chapter.id === 96) {
            import("./battle3.js").then(battle3 => {
                battle3.manageDogFight(chapter.monsters);
            });
        } else {
            manageMonsters(chapter.monsters);
        }
        
    } else {
        // Si pas de monstres, afficher "Pas de monstre ici"
        const monsterContainer = document.getElementById('monsters');
        monsterContainer.innerHTML = 'Pas de monstre ici';
        
        // Cacher les boutons d'attaque et de chance
        document.getElementById('attackButton').style.display = 'none';
        document.getElementById('temptChanceButton').style.display = 'none';
        document.getElementById('no_temptChanceButton').style.display = 'none';
        document.getElementById('actual_monster').innerHTML = '';
    };

    //choix
    const choicesContainer = document.getElementById('choices');
    choicesContainer.innerHTML = '';
    
    // Vérifier si le chapitre a des choix avant de les traiter
    if (chapter.choices && chapter.choices.length > 0) {
        chapter.choices.forEach(choice => {

        const choiceButton = document.createElement('Button');
        choiceButton.innerText = choice.text;
        
        // Désactiver les boutons au chapitre 0 si le personnage n'est pas créé
        if (chapterId === 0 && (!gameState.character || !gameState.character.isInitialized)) {
            choiceButton.disabled = true;
            choiceButton.title = "Créez votre personnage d'abord";
        }

        // Vérifie si le choix requiert un item spécifique
        if (choice.requiresItem) {
            // Note : On extrait maintenant `name` et `category` de l'objet `requiresItem`
            const hasItem = gameState.inventory.checkItem(choice.requiresItem.name);
            choiceButton.disabled = !hasItem; // Désactive le bouton si l'item requis n'est pas dans l'inventaire
            if (!hasItem) {
                choiceButton.title = `Requis : ${choice.requiresItem.name}`; // Ajoute un titre au bouton pour indiquer l'item requis et sa catégorie
            }
        }

        // Vérifie si le choix requiert plusieurs items spécifiques
        if (choice.requiresMultipleItems) {
            const missingItems = [];
            let hasAllItems = true;
            
            choice.requiresMultipleItems.forEach(item => {
                const hasItem = gameState.inventory.checkItem(item.name);
                if (!hasItem) {
                    hasAllItems = false;
                    missingItems.push(item.name);
                }
            });
            
            choiceButton.disabled = !hasAllItems;
            if (!hasAllItems) {
                choiceButton.title = `Requis : ${missingItems.join(' et ')}`;
            }
        }

        // Vérifie si le choix requiert qu'un chapitre spécifique n'ait pas été visité
        if (choice.requiresNotVisitedChapter) {
            const hasVisited = gameState.visitedChapters.has(choice.requiresNotVisitedChapter);
            choiceButton.disabled = hasVisited;
            if (hasVisited) {
                choiceButton.title = `Cette action n'est plus disponible`;
            }
        }

        // Désactiver le bouton si les monstres ne sont pas tous vaincus
        if (choice.requiresAllMonstersDefeated) {
            choiceButton.setAttribute('data-requiresAllMonstersDefeated', 'true');    
            const allMonstersDefeated = gameState.monsters.every(monster => monster.status === "vaincu");
            choiceButton.disabled = !allMonstersDefeated;
        }

        // Désactiver le bouton si la paralysie n'est pas active
        if (choice.requiresParalysis) {
            choiceButton.setAttribute('data-requiresParalysis', 'true');
            choiceButton.disabled = !gameState.isParalyzed;
        }

        // Gestion de chanceCheckPassed
        if (choice.chanceCheckPassed !== undefined) {
            choiceButton.setAttribute('data-chanceCheckPassed', choice.chanceCheckPassed);
            choiceButton.disabled = gameState.isLucky !== choice.chanceCheckPassed; // Active ou désactive en fonction de la chance
        }

        // Gestion de conditionMet
        if (choice.requiresConditionMet) {
            choiceButton.setAttribute('data-requiresConditionMet', 'true');
            choiceButton.disabled = !gameState.conditionMet;
        }

        // Gestion de requiresMinAssaults
        if (choice.requiresMinAssaults) {
            choiceButton.setAttribute('data-requiresMinAssaults', choice.requiresMinAssaults.toString());
            choiceButton.disabled = gameState.assaultCount <= choice.requiresMinAssaults;
            if (choiceButton.disabled) {
                choiceButton.title = `Vous devez mener ${choice.requiresMinAssaults} assauts avant de pouvoir fuir (${gameState.assaultCount}/${choice.requiresMinAssaults})`;
            }
        }

        // Ajouter des attributs personnalisés basés sur le choix requis
        if (choice.skillCheckPassed !== undefined) {
            choiceButton.setAttribute('data-skillCheckPassed', choice.skillCheckPassed.toString());
            // Désactiver les boutons par défaut, ils seront activés après le test d'habileté
            choiceButton.disabled = true; 
        }

        // Gestion de skillChanceCheckPassed
        if (choice.skillChanceCheckPassed !== undefined) {
            choiceButton.setAttribute('data-skillChanceCheckPassed', choice.skillChanceCheckPassed.toString());
            // Désactiver les boutons par défaut, ils seront activés après le test d'habileté+chance
            choiceButton.disabled = true; 
        }

        // Mise à jour basée sur doubleLuckCheck
        if (choice.doubleLuckCheck !== undefined) {
            choiceButton.setAttribute('data-doubleLuckCheck', choice.doubleLuckCheck);
            choiceButton.disabled = true; // Désactivé par défaut jusqu'aux jets de chance
        }

        // Gestion des conditions du loup-garou
        if (choice.condition === "woundedByLoupGarou") {
            choiceButton.setAttribute('data-woundedByLoupGarou', 'true');
            choiceButton.disabled = !gameState.woundedByLoupGarou;
        } else if (choice.condition === "notWoundedByLoupGarou") {
            choiceButton.setAttribute('data-woundedByLoupGarou', 'false');
            choiceButton.disabled = gameState.woundedByLoupGarou;
        }

        // Gestion des conditions d'or 
        if (Array.isArray(choice.condition)) {
            // Gestion des conditions sous forme de tableau [resource, operator, value]
            const [resource, operator, value] = choice.condition;
            let conditionMet = false;
            
            if (resource === "gold") {
                choiceButton.setAttribute('data-goldCondition', JSON.stringify(choice.condition));
                const currentGold = gameState.inventory.checkItem('or') || 0;
                switch (operator) {
                    case ">=":
                        conditionMet = currentGold >= value;
                        break;
                    case ">":
                        conditionMet = currentGold > value;
                        break;
                    case "<=":
                        conditionMet = currentGold <= value;
                        break;
                    case "<":
                        conditionMet = currentGold < value;
                        break;
                    case "==":
                    case "===":
                        conditionMet = currentGold == value;
                        break;
                }
            }
            choiceButton.disabled = !conditionMet;
            if (!conditionMet) {
                choiceButton.title = `Requis : ${value} pièce(s) d'or`;
            }
        }

        // Ajouter un tooltip pour les choix de fuite
        if (choice.text && choice.text.toLowerCase().includes('fuite')) {
            choiceButton.title = "Attention : la fuite vous fait perdre 2 points d'endurance";
        }

        choiceButton.addEventListener('click', () => {
            // Empêcher toute action si le jeu est terminé
            if (gameState.gameOver) {
                return;
            }
            
            // Gestion du coût en or
            if (choice.cost && choice.cost > 0) {
                gameState.inventory.removeItem('or', choice.cost);
                updateAdventureSheet();
            }
            
            // Gestion de la fuite
            if (choice.text && choice.text.toLowerCase().includes('fuite')) {
                gameState.character.health -= 2;
                updateCharacterStats();
                
                // Si le Game Over s'est déclenché lors de la fuite, arrêter ici
                if (gameState.gameOver) {
                    return;
                }
                
                // Marquer qu'une fuite a eu lieu pour afficher le message au prochain chapitre
                gameState.fleeMessage = true;
            }
            
            // Navigation vers le chapitre suivant
            showChapter(chapters, choice.nextId);      
        });

        choicesContainer.appendChild(choiceButton);
    });
    } // Fermeture du bloc if (chapter.choices && chapter.choices.length > 0)

    // Déclencher Game Over automatiquement au chapitre 399 après avoir affiché le contenu
    if (chapterId === 399) {
        triggerGameOver();
    }

    // Déclencher l'écran de victoire automatiquement au chapitre 400
    if (chapterId === 400) {
        triggerVictory();
    }
    }


// Initialisation
document.addEventListener('DOMContentLoaded', async () => {
    const chapters = await loadChapters();
    showChapter(chapters, 0);
  });


//restart
document.getElementById('restartButton').addEventListener('click', function() {
    // Réinitialiser le state du jeu avant de recharger
    gameState.gameOver = false;
    location.reload(); 
});



