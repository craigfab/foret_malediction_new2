# Les Collines Maléfiques (Sorcellerie ! / 1)

Adaptation web du livre-jeu, sur le même moteur que `foret_malediction`.
Ouvrir `index.html` via un petit serveur local (les fichiers JSON sont chargés avec `fetch`) :

```bash
python3 -m http.server 8000
```

puis <http://localhost:8000/collines_malefiques/>.

## Fichiers

| Fichier | Rôle |
| --- | --- |
| `collines_malefiques.json` | les 456 paragraphes (texte, choix, monstres, effets). **Généré**, ne pas modifier à la main |
| `formules_magiques.json` | le Livre des Formules (48 formules). Généré aussi |
| `tools/build_json.py` | génère les deux JSON à partir du PDF |
| `scripts_collines.js` | affichage d'un paragraphe, choix, repas, création du personnage |
| `chapterEffects.js` | effets des paragraphes et conditions des choix |
| `battle.js`, `character.js`, `inventory.js`, `chance.js`, `music.js` | combat, personnage, Sac à Dos, dés, musique |

## Corriger ou enrichir un paragraphe

Le texte, les choix « rendez-vous au N », les tableaux de Formules et les monstres sont
détectés automatiquement dans le PDF. Tout le reste (pertes et gains, objets, repas, tests
de dés, conditions) est décrit dans le dictionnaire `O` de `tools/build_json.py`.
Modifier ce dictionnaire puis relancer :

```bash
python3 collines_malefiques/tools/build_json.py
```

Le script signale les destinations inconnues et les paragraphes jamais atteints
(le 319 n'est référencé nulle part dans le livre lui-même).

## Illustrations

Un paragraphe utilise `images_collines/chapitre_N.png` (ou `.jpg`, ou `figure_N`) si le
fichier existe, sinon l'image par défaut. Il suffit donc de déposer les images puis de
relancer le script.

## Règles automatisées

Création Guerrier / Sorcier, combats (armes, Brassard, dard de la Manticore, effets des
Formules sur le combat), Tentez votre Chance, repas et faim d'un jour sur l'autre, peste
et malédictions, Libra, objets requis par les Formules, créatures invoquées, rencontres
nocturnes du paragraphe 123 avec retour au paragraphe d'origine, achats et marchandage.

Simplifications (signalées en jeu par une « Note d'adaptation » quand elles comptent) :
les pierres précieuses sont converties en Pièces d'Or, la limite de trois objets examinés
chez le marchand de Cantopani n'est pas vérifiée, le tabouret du paragraphe 221 n'est pas
proposé, et quelques bonus ponctuels (paragraphes 360 et 428) restent à appliquer avec
« Ajuster la feuille à la main ».
