#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Génère collines_malefiques.json et formules_magiques.json à partir du PDF du livre.

    python3 collines_malefiques/tools/build_json.py

Dépendance : `pdftotext` (paquet poppler-utils).

Principe :
  1. le texte, les choix ("rendez-vous au N"), les tableaux de Formules et les
     monstres ("NOM HABILETÉ : x ENDURANCE : y") sont extraits automatiquement ;
  2. tout ce qui relève des règles (gains/pertes, objets, repas, tests de dés,
     conditions...) est décrit à la main dans le dictionnaire OVERRIDES ci-dessous.
Pour corriger un chapitre, modifiez OVERRIDES puis relancez le script :
ne modifiez pas le JSON à la main, il serait écrasé.
"""
import json
import os
import re
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
BOOK_DIR = os.path.dirname(HERE)
PDF = os.path.join(BOOK_DIR, "Sorcellerie 1 - Les Collines Malefiques.pdf")
OUT_CHAPTERS = os.path.join(BOOK_DIR, "collines_malefiques.json")
OUT_SPELLS = os.path.join(BOOK_DIR, "formules_magiques.json")
IMG_DIR = "images_collines"
DEFAULT_IMG = IMG_DIR + "/dark_and_gloomy_hills.png"
LAST = 456

# ---------------------------------------------------------------------------
# Noms d'objets (une seule orthographe partout)
# ---------------------------------------------------------------------------
OR, PROV = "or", "provisions"
EPEE, EPEE_FINE, GLAIVE, HACHE = "épée", "épée finement ciselée", "glaive", "hache de Glandragor"
FLUTE, POTION, DENTS_SAC, BIJOU = "flûte de bambou", "potion de Myrtibelle", "sac de dents", "bijou étincelant"
DENT_GOB, DENT_GEANT = "dent de Gobelin", "dent de Géant"
PAGE, CLE54, CLE111, CLE206 = "page du Livre de Magie (n° 102)", "clé rouillée (n° 54)", "clé d'argent (n° 111)", "clé de cuivre (n° 206)"
CIRE, COLLE, CAILLOUX, TAMPONS = "cire d'abeille", "pot de colle", "cailloux", "tampons pour le nez"
JANN, PESTE, MAL_ESPRIT, MAL_ALIANNA = "Jann le Marmouscule", "peste", "malédiction de l'Esprit", "malédiction d'Alianna"


def it(name, cat="equipment", **kw):
    d = {"name": name, "category": cat}
    d.update(kw)
    return d


def gold(n):
    return {"name": OR, "category": "gold", "quantity": n}


def take(name, cat="equipment", q=1):
    return {"type": "takeItem", "itemName": name, "category": cat, "quantity": q}


def status(name):
    return {"type": "takeItem", "itemName": name, "category": "status", "quantity": 1, "unique": True}


def lose(n):
    return {"type": "reduceHealth", "value": n}


def gain(n):
    return {"type": "gainHealth", "value": n}


def luck(n):
    return {"type": "gainChance", "value": n} if n > 0 else {"type": "reduceChance", "value": -n}


def meal(first, other, cost=0, free=False):
    """Repas possible dans ce chapitre. free=True : repas offert (pas de Provisions consommées)."""
    m = {"first": first, "other": other}
    if cost:
        m["cost"] = cost
    if free or cost:
        m["free"] = True
    return m


def mon(name, skill, health, **kw):
    d = {"name": name, "skill": skill, "health": health}
    d.update(kw)
    return d


def ch(text, to, **kw):
    d = {"text": text, "nextId": to}
    d.update(kw)
    return d


NEW_DAY = {"type": "newDay", "hunger": 3}
GAME_OVER = {"text": "Votre aventure se termine ici…", "gameOver": True}
ROLL_LUCK = {"type": "rollDiceChance"}

# Choix qui consistent à invoquer Libra (chapitre, destination)
LIBRA_CHOICES = {(26, 53), (63, 273), (112, 25), (130, 260), (206, 273), (228, 160), (303, 273), (433, 273)}

# ---------------------------------------------------------------------------
# Règles décrites à la main, chapitre par chapitre.
#   effects      : effets appliqués à l'arrivée dans le chapitre
#   items        : objets que l'on peut prendre / acheter (boutons)
#   meal         : repas possible
#   monsters     : remplace la détection automatique
#   choices      : remplace entièrement les choix détectés
#   patch        : {nextId: {...}} complète un choix détecté automatiquement
#   add          : choix ajoutés à la suite des choix détectés
#   drop         : nextId à retirer des choix détectés
#   sub          : [(regex, remplacement)] appliqués au texte HTML
# ---------------------------------------------------------------------------
O = {
    2: {"effects": [lose(1)], "patch": {105: {"requiresAllMonstersDefeated": True}}},
    4: {"add": [ch("Utiliser la clé rouillée (n° 54)", 44, requiresItem=CLE54),
                ch("Utiliser la clé d'argent (n° 111)", 101, requiresItem=CLE111)]},
    5: {"items": [it(DENTS_SAC, price=3)]},
    11: {"effects": [gain(3), luck(1)]},
    15: {"effects": [{"type": "gainGold", "value": 20}],
         "note": "Les deux pierres précieuses (10 Pièces d'Or chacune) sont comptées directement comme 20 Pièces d'Or."},
    18: {"meal": meal(2, 1)},
    20: {"monsters": [mon("OURSCONSE", 7, 5, attackModifier=-2)]},
    21: {"meal": meal(2, 1), "effects": [gain(3)]},
    22: {"effects": [{"type": "priceRoll", "dice": 1, "item": it(FLUTE)}]},
    23: {"effects": [{"type": "rollDie"}],
         "choices": [ch("1 ou 2 : rendez-vous au 245", 245, dieIn=[1, 2]),
                     ch("3 ou 4 : rendez-vous au 69", 69, dieIn=[3, 4]),
                     ch("5 ou 6 : rendez-vous au 99", 99, dieIn=[5, 6])]},
    29: {"choices": [ch("Lui faire cadeau d'un des objets de votre Sac à Dos (rendez-vous au 191)", 191,
                        requiresAnyItem=True, effects=[{"type": "loseItems", "count": 1}]),
                     ch("Vous n'avez rien à lui donner : vous rendre à l'auberge (rendez-vous au 92)", 92),
                     ch("Sortir du village (rendez-vous au 21)", 21)]},
    31: {"effects": [NEW_DAY]},
    32: {"effects": [{"type": "loseItems", "count": 2}]},
    33: {"patch": {225: {"cost": 2}}},
    35: {"meal": meal(2, 1)},
    36: {"effects": [NEW_DAY]},
    37: {"effects": [status(JANN)]},
    38: {"effects": [lose(2)],
         "choices": [ch("Lancer un dé (rendez-vous au 23)", 23),
                     ch("Tenter votre Chance avant de vous rendre au 23", 23, luckTest={"lucky": 167, "unlucky": 23})]},
    41: {"choices": [ch("Allina ? Rendez-vous au 238", 238), ch("Allanna ? Rendez-vous au 253", 253),
                     ch("Alianna ? Rendez-vous au 143", 143),
                     ch("Vous ignorez son nom (ou vous êtes Malchanceux) : rendez-vous au 59", 59)]},
    45: {"effects": [NEW_DAY]},
    48: {"choices": [ch("Votre Sac à Dos contient une page arrachée à un Livre de Magie : rendez-vous au 77", 77, requiresItem=PAGE),
                     ch("Sinon, la sorcière vous prend deux objets et vous transporte dans la forêt : rendez-vous au 232", 232,
                        requiresNoItem=PAGE, effects=[{"type": "loseItems", "count": 2}])]},
    49: {"meal": meal(2, 1), "effects": [lose(2)]},
    50: {"items": [it("collier de pierres vertes", "jewelry")]},
    51: {"meal": meal(2, 2)},
    57: {"items": [gold(12)], "effects": [{"type": "loseItems", "count": 1}]},
    59: {"effects": [lose(2), luck(-1)]},
    60: {"items": [it(BIJOU, "jewelry", price=10)]},
    62: {"meal": meal(2, 1), "effects": [gain(1)]},
    71: {"meal": meal(2, 1)},
    79: {"effects": [status(PESTE)]},
    84: {"effects": [dict(lose(2), notOnReturn=True)],
         "choices": [ch("Rendez-vous au 123 pour voir si vous allez faire de mauvaises rencontres", 123,
                        encounter=0, hideOnReturn=True),
                     ch("Lorsque vous en aurez fini avec d'éventuels adversaires, rendez-vous au 31", 31, requiresReturned=True)]},
    85: {"effects": [lose(3)]},
    87: {"effects": [{"type": "gainGold", "value": 7}], "monsters": [mon("GOLEM DE BOIS", 8, 6)],
         "sub": [(r"GOLEM</p><p class=\"monstre\">DE BOIS", "GOLEM DE BOIS")]},
    88: {"patch": {11: {"requiresItem": FLUTE}}},
    92: {"meal": meal(2, 1, cost=4), "patch": {55: {"cost": 5}}},
    93: {"effects": [{"type": "skillTest", "repeat": True, "costHealth": 1}],
         "patch": {39: {"skillCheckPassed": True}}},
    94: {"effects": [luck(1)]},
    97: {"effects": [take(PROV, "food", 3)]},
    100: {"patch": {286: {"requiresItem": JANN}, 197: {"requiresNoItem": JANN}}},
    102: {"patch": {204: {"cost": 3}}},
    104: {"monsters": [mon("Premier BANDIT", 7, 6), mon("Deuxième BANDIT", 7, 8)],
          "sub": [(r"HABILETÉ ENDURANCE Premier BANDIT 7 6 Deuxième BANDIT 7 8 ",
                   "<br>Premier BANDIT — HABILETÉ : 7, ENDURANCE : 6<br>Deuxième BANDIT — HABILETÉ : 7, ENDURANCE : 8<br><br>")]},
    106: {"choices": [ch("Acheter une épée admirablement façonnée (6 Pièces d'Or) : rendez-vous au 194", 194, cost=6),
                      ch("Acheter une calotte (4 Pièces d'Or) : rendez-vous au 247", 247, cost=4),
                      ch("Acheter des vivres représentant l'équivalent de 3 repas (6 Pièces d'Or) : rendez-vous au 97", 97, cost=6),
                      ch("Demander aux marchands s'ils connaissent quelqu'un qui pourrait vous donner du travail (rendez-vous au 229)", 229),
                      ch("Aller à l'auberge du village (rendez-vous au 134)", 134)],
          "sub": [(r"OBJETS PIECES RENDEZ-D'OR VOUS AU Une épée admirablement façonnée 6 194 Une calotte 4 247 Des vivres représentant l'équivalent de 3 repas 6 97 ",
                   "<br>Une épée admirablement façonnée : 6 Pièces d'Or (rendez-vous au 194)<br>Une calotte : 4 Pièces d'Or (rendez-vous au 247)<br>Des vivres représentant l'équivalent de 3 repas : 6 Pièces d'Or (rendez-vous au 97)<br><br>")]},
    107: {"items": [it(POTION, "potions", price=4)]},
    108: {"meal": meal(2, 1),
          "effects": [{"type": "nightRest", "peaceful": 2, "disturbed": 1, "onReturn": True}],
          "choices": [ch("Rendez-vous au 123 pour voir si quelque animal de la forêt va venir troubler votre repos", 123,
                         encounter=2, hideOnReturn=True),
                      ch("Au matin, rendez-vous au 36", 36, requiresReturned=True)]},
    109: {"effects": [gain(2), NEW_DAY]},
    110: {"effects": [take("bottes en fourrure de Gascal")]},
    111: {"effects": [status(JANN)]},
    114: {"choices": [ch("Vous avez la page n° 102 : 102 + 103 = 205. Laisser la vieille femme vous débarrasser du Marmouscule (rendez-vous au 205)", 205, requiresItem=PAGE),
                      ch("Partir et poursuivre votre chemin (rendez-vous au 232)", 232)]},
    115: {"effects": [gain(2)]},
    116: {"effects": [gain(2), {"type": "ate"}]},
    117: {"add": [ch("Lui laisser la vie sauve (son ENDURANCE à 3 ou moins, la vôtre à 6 ou plus) : rendez-vous au 187", 187,
                     requiresMonsterHealthAtMost=3, requiresHealthAtLeast=6)], "drop": [187]},
    122: {"effects": [take("Brassard d'Escrime de Ragnar")]},
    123: {"effects": [{"type": "randomEncounter"}],
          "add": [ch("Retourner au paragraphe d'où vous êtes venu", "return", requiresAllMonstersDefeated=True)],
          "sub": [(r"CHIFFRE CREATURE HABILETÉ ENDURANCE OBTENU 1 Chauve-Souris 5 5 Géante 2 Chauve-Souris 5 5 Géante 3 Chien-Loup 5 7 4 Loup-Garou 8 9 5 ou 6 Vous ne rencontrez aucune créature ",
                   "<br>1 ou 2 : Chauve-Souris Géante — HABILETÉ 5, ENDURANCE 5<br>3 : Chien-Loup — HABILETÉ 5, ENDURANCE 7<br>4 : Loup-Garou — HABILETÉ 8, ENDURANCE 9<br>5 ou 6 : vous ne rencontrez aucune créature<br><br>")]},
    124: {"effects": [status(MAL_ESPRIT)]},
    126: {"choices": [ch("Examiner la potion (rendez-vous au 274)", 274, requiresItem=POTION),
                      ch("Examiner le glaive (rendez-vous au 43)", 43, requiresItem=GLAIVE),
                      ch("Examiner la flûte (rendez-vous au 249)", 249, requiresItem=FLUTE),
                      ch("Examiner la hache (rendez-vous au 72)", 72, requiresItem=HACHE),
                      ch("Examiner le sac de dents (rendez-vous au 190)", 190, requiresItem=DENTS_SAC),
                      ch("Examiner le bijou (rendez-vous au 152)", 152, requiresItem=BIJOU),
                      ch("Poursuivre votre chemin (rendez-vous au 95)", 95)]},
    127: {"meal": meal(2, 2)},
    129: {"effects": [luck(1)]},
    133: {"effects": [dict(ROLL_LUCK, optional=True)],
          "choices": [ch("Si vous êtes Chanceux, rendez-vous au 89", 89, chanceCheckPassed=True),
                      ch("Si vous êtes Malchanceux, rendez-vous au 70", 70, chanceCheckPassed=False),
                      ch("Si vous préférez ne pas Tenter votre Chance, rendez-vous au 70", 70, requiresNoLuckRoll=True)]},
    134: {"meal": meal(3, 2, cost=3), "patch": {115: {"cost": 3}}},
    136: {"meal": meal(2, 1)},
    140: {"effects": [lose(2), NEW_DAY]},
    141: {"effects": [{"type": "priceRoll", "dice": 2, "item": it(HACHE), "basePrice": 7, "optional": True}]},
    142: {"effects": [{"type": "skillTest", "repeat": True, "costSkill": 1}],
          "patch": {90: {"skillCheckPassed": True}, 278: {"skillCheckPassed": False}}},
    146: {"effects": [gain(1), luck(1)], "patch": {184: {"requiresItem": PAGE}, 219: {"requiresNoItem": PAGE}}},
    148: {"effects": [NEW_DAY]},
    152: {"effects": [{"type": "removeItem", "itemName": BIJOU}]},
    153: {"effects": [{"type": "gainGold", "value": 3}]},
    155: {"effects": [{"type": "gainGold", "value": 2}]},
    159: {"items": [it("médaillon au portrait de femme", "jewelry")]},
    161: {"meal": meal(3, 3, cost=2), "patch": {45: {"cost": 3, "effects": [gain(5)]}}},
    165: {"effects": [{"type": "luckStreak", "needed": 3, "damage": 3}], "choices": [ch("Chanceux trois fois de suite : vous tuez tous les serpents, rendez-vous au 206", 206, requiresConditionMet=True)]},
    168: {"effects": [{"type": "loseAllFood"}]},
    173: {"effects": [take(PROV, "food", 1)]},
    177: {"effects": [{"type": "gainGold", "value": 3}, take("amulette Porte-Bonheur", "jewelry")]},
    182: {"choices": [ch("Vous possédez la hache : rendez-vous au numéro gravé dessus (233)", 233, requiresItem=HACHE),
                      ch("Vous n'avez pas de hache : il faut lui donner autre chose (rendez-vous au 29)", 29)]},
    183: {"effects": [take(PAGE)]},
    185: {"effects": [luck(2), gain(1), {"type": "ate"}, {"type": "loseWeapon"}]},
    186: {"items": [it(CLE111)]},
    187: {"effects": [luck(2)]},
    190: {"effects": [{"type": "removeItem", "itemName": DENTS_SAC}, take(DENT_GOB, q=4), take(DENT_GEANT),
                      take("dents de Chien de Mort", q=3), take("dents de Singe", q=3), take("dents de Chagaye", q=2)]},
    191: {"effects": [gain(2), luck(1)]},
    192: {"effects": [take("Bomba", "food"), luck(2)]},
    194: {"effects": [{"type": "removeItem", "itemName": EPEE}, take(EPEE_FINE)],
          "note": "L'ancienne épée est automatiquement remplacée par la nouvelle (le remboursement par le marchand n'est pas géré)."},
    201: {"effects": [gain(2), {"type": "ate"}, lose(3)]},
    203: {"effects": [lose(1)], "monsters": [mon("ELVIN", 6, 4, monsterAttackBonus=2)]},
    204: {"effects": [{"type": "restoreAll"}, {"type": "removeItem", "itemName": PESTE}]},
    205: {"effects": [{"type": "removeItem", "itemName": JANN}]},
    206: {"patch": {273: {"requiresLibra": True}}, "add": [dict(GAME_OVER, requiresNoLibra=True)]},
    208: {"effects": [{"type": "newDay", "hunger": 0}]},
    213: {"effects": [{"type": "reduceSkill", "value": 2}, status(MAL_ALIANNA)], "items": [it("sable"), gold(2)]},
    214: {"effects": [{"type": "priceRoll", "dice": 2, "item": it(GLAIVE)}]},
    215: {"effects": [lose(2)]},
    217: {"patch": {155: {"requiresAllMonstersDefeated": True}},
          "monsters": [mon("Premier GOBELIN", 5, 4), mon("Deuxième GOBELIN", 6, 4), mon("Troisième GOBELIN", 5, 5)],
          "sub": [(r"HABILETÉ ENDURANCE Premier GOBELIN 5 4 Deuxième GOBELIN 6 4 Troisième GOBELIN 5 5 ",
                   "<br>Premier GOBELIN — HABILETÉ : 5, ENDURANCE : 4<br>Deuxième GOBELIN — HABILETÉ : 6, ENDURANCE : 4<br>Troisième GOBELIN — HABILETÉ : 5, ENDURANCE : 5<br><br>")]},
    218: {"effects": [{"type": "elvinTheft"}]},
    221: {"items": [it(CAILLOUX, quantity=4), it("filet à larges mailles"), it("crâne de Géant")]},
    222: {"meal": meal(2, 2, free=True)},
    224: {"effects": [lose(2)]},
    227: {"monsters": [mon("MANTICORE", 12, 18, sting=True)]},
    228: {"effects": [{"type": "skillTest", "dice": 3}],
          "patch": {120: {"skillCheckPassed": True, "effects": [{"type": "reduceSkill", "value": 1}]},
                    160: {"skillCheckPassed": False, "requiresLibra": True}},
          "add": [dict(GAME_OVER, skillCheckPassed=False, requiresNoLibra=True)]},
    230: {"patch": {191: {"cost": 2}}},
    233: {"effects": [{"type": "removeItem", "itemName": HACHE}, gain(2), luck(3)]},
    238: {"effects": [lose(2), luck(-1)]},
    244: {"effects": [take(CLE206)]},
    226: {"patch": {244: {"cost": 1}}},
    247: {"effects": [take("calotte")]},
    248: {"effects": [take(COLLE), take(TAMPONS), take(CAILLOUX, q=4)]},
    253: {"effects": [lose(2), luck(-1)]},
    254: {"effects": [{"type": "rollDie"}],
          "patch": {68: {"dieIn": [1, 2]}, 13: {"dieIn": [3, 4]}, 98: {"dieIn": [5, 6]}}},
    257: {"items": [it(PROV, "food", quantity=2, price=2)], "patch": {116: {"cost": 1}}},
    258: {"effects": [{"type": "scorpionBox", "gold": 5, "key": CLE54}], "patch": {199: {"requiresItem": CLE54}}},
    261: {"effects": [lose(2), {"type": "loseBackpack"}]},
    262: {"effects": [luck(2)]},
    263: {"effects": [{"type": "gainGold", "value": 3}]},
    265: {"effects": [{"type": "gainGold", "value": 8}]},
    266: {"patch": {192: {"cost": 1}, 96: {"cost": 1}}},
    267: {"meal": meal(2, 1, cost=3), "patch": {8: {"cost": 5}}},
    269: {"effects": [ROLL_LUCK], "patch": {276: {"chanceCheckPassed": True}},
          "add": [dict(GAME_OVER, text="Malchanceux : le tronc s'abat sur vous…", chanceCheckPassed=False)]},
    270: {"effects": [{"type": "dieDamage", "safeFrom": 5}, take(PROV, "food", 1), take(CIRE, q=2)]},
    276: {"add": [dict(GAME_OVER, text="Vous ne connaissez aucune de ces Formules (ou vous êtes un simple Guerrier) : l'éclair vous frappe de plein fouet…")]},
    277: {"effects": [{"type": "fallTest"}], "patch": {110: {"requiresConditionMet": True}}},
    283: {"meal": meal(2, 1),
          "effects": [{"type": "nightRest", "peaceful": 2, "disturbed": 1, "onReturn": True}],
          "choices": [ch("Rendez-vous au 123 pour voir si une créature vient troubler votre nuit", 123,
                         encounter=2, hideOnReturn=True),
                      ch("Au matin, rendez-vous au 31", 31, requiresReturned=True)]},
    284: {"meal": meal(2, 2, free=True)},
    295: {"effects": [{"type": "rollDie"}],
          "choices": [ch("Le dé donne 1 (votre chiffre) : la créature vous attaque, rendez-vous au 20", 20, dieIn=[1]),
                      ch("Le dé donne un autre chiffre : vous vous enfuyez, rendez-vous au 193", 193, dieIn=[2, 3, 4, 5, 6])]},
    296: {"effects": [{"type": "reduceGold", "value": 1}],
          "patch": {85: {"requiresNoItem": OR}, 7: {"requiresItem": OR}}},
    298: {"effects": [gain(2)]},
    299: {"effects": [{"type": "removeItem", "itemName": POTION}],
          "patch": {158: {"requiresNoItem": POTION}, 220: {"requiresItem": POTION}}},
    302: {"effects": [lose(6)]},
    303: {"patch": {63: {"requiresNoItem": CAILLOUX}, 273: {"requiresItem": CAILLOUX, "requiresLibra": True}},
          "add": [dict(GAME_OVER, requiresItem=CAILLOUX, requiresNoLibra=True)]},
    308: {"effects": [dict(lose(3), ifNoItem=FLUTE)],
          "patch": {104: {"requiresNoItem": FLUTE}, 131: {"requiresItem": FLUTE}}},
    309: {"effects": [lose(3)]},
    312: {"effects": [lose(2)]},
    317: {"monsters": [mon("SENTINELLE TROLL", 4, 7)],
          "note": "Simplification : le Troll garde 4 points d'HABILETÉ pendant tout le combat."},
    318: {"effects": [gain(3)]},
    325: {"effects": [{"type": "nextCombat", "monsterSkill": 6, "rounds": 4}]},
    328: {"effects": [dict(lose(3), ifNoItem=CIRE), {"type": "nextCombat", "damage": 4, "ifItem": CIRE},
                      {"type": "removeItem", "itemName": CIRE}]},
    330: {"effects": [{"type": "setFlag", "flag": "fallModifier", "value": 3}]},
    339: {"effects": [dict(lose(2), ifNoItem=FLUTE)],
          "patch": {87: {"requiresNoItem": FLUTE}, 169: {"requiresItem": FLUTE}}},
    348: {"effects": [lose(2)]},
    349: {"effects": [lose(2)]},
    353: {"effects": [lose(1)]},
    356: {"effects": [dict(ROLL_LUCK, optional=True)],
          "choices": [ch("Chanceux : l'Elvin s'enfuit, vous vous rendormez et vous vous rendez au 148", 148, chanceCheckPassed=True),
                      ch("L'affronter en doublant votre HABILETÉ (rendez-vous au 203)", 203,
                         effects=[{"type": "nextCombat", "playerSkillMultiplier": 2}])]},
    358: {"effects": [lose(2)]},
    360: {"patch": {4: {"requiresNoItem": CIRE}, 142: {"requiresItem": CIRE}},
          "note": "Le bonus de 2 points au test du paragraphe 142 n'est pas automatisé."},
    361: {"monsters": [mon("GEANT DES COLLINES", 9, 11)], "monstersIf": DENT_GEANT,
          "effects": [{"type": "allyFight", "ifItem": DENT_GEANT, "consume": DENT_GEANT,
                       "ally": {"name": "GEANT MAGIQUE", "skill": 8, "health": 9}}],
          "patch": {256: {"requiresNoItem": DENT_GEANT}, 265: {"requiresItem": DENT_GEANT, "requiresAllMonstersDefeated": True}},
          "sub": [(r"HABILETÉ ENDURANCE GEANT DES COLLINES 9 11 GEANT MAGIQUE 8 9 ",
                   "<br>GEANT DES COLLINES — HABILETÉ : 9, ENDURANCE : 11<br>GEANT MAGIQUE — HABILETÉ : 8, ENDURANCE : 9<br><br>")]},
    363: {"effects": [lose(2)]},
    366: {"effects": [{"type": "dieDamage", "deadlyOn": 6, "luckSaves": True}], "patch": {63: {"requiresConditionMet": True}}},
    367: {"effects": [{"type": "removeItem", "itemName": COLLE}],
          "patch": {83: {"requiresNoItem": COLLE}, 63: {"requiresItem": COLLE}, 16: {"requiresItem": COLLE}}},
    369: {"monsters": [mon("MANTICORE", 12, 18, sting=True)], "monstersIf": DENT_GOB,
          "effects": [{"type": "allyFight", "ifItem": DENT_GOB, "consume": DENT_GOB, "consumeAll": True, "costPerAlly": 1,
                       "ally": {"name": "GOBELIN", "skill": 5, "health": 5}, "stingKills": True}],
          "patch": {456: {"requiresAllMonstersDefeated": True, "requiresConditionMet": True}},
          "sub": [(r"HABILETÉ ENDURANCE MANTICORE 12 18 GOBELINS 5 5 ",
                   "<br>MANTICORE — HABILETÉ : 12, ENDURANCE : 18<br>GOBELINS — HABILETÉ : 5, ENDURANCE : 5<br><br>")]},
    371: {"effects": [lose(3)]},
    375: {"monsters": [mon("OGRE", 4, 7)], "patch": {15: {"requiresAllMonstersDefeated": True}}},
    378: {"effects": [lose(3)]},
    383: {"effects": [{"type": "nextCombat", "monsterSkill": 4, "rounds": 4}]},
    384: {"effects": [lose(2)]},
    386: {"monsters": [mon("SENTINELLE TROLL", 8, 7, monsterAttackBonus=-2)], "monstersIf": OR,
          "effects": [{"type": "reduceGold", "value": 1}],
          "patch": {99: {"requiresNoItem": OR}}},
    388: {"monsters": [mon("MANTICORE", 12, 18, sting=True)], "monstersIf": DENT_GEANT,
          "effects": [{"type": "allyFight", "ifItem": DENT_GEANT, "consume": DENT_GEANT,
                       "ally": {"name": "GEANT", "skill": 8, "health": 9}, "stingDamage": 6}],
          "patch": {456: {"requiresAllMonstersDefeated": True, "requiresConditionMet": True}},
          "sub": [(r"HABILETÉ ENDURANCE MANTICORE 12 18 GEANT 8 9 ",
                   "<br>MANTICORE — HABILETÉ : 12, ENDURANCE : 18<br>GEANT — HABILETÉ : 8, ENDURANCE : 9<br><br>")]},
    390: {"effects": [ROLL_LUCK],
          "patch": {64: {"chanceCheckPassed": False},
                    151: {"chanceCheckPassed": True, "effects": [{"type": "loseAllFood"}]},
                    3: {"chanceCheckPassed": True, "effects": [{"type": "loseAllFood"}]}}},
    400: {"effects": [dict(lose(2), ifNoItem=OR), {"type": "nextCombat", "monsterAttackBonus": -2, "ifItem": OR},
                      {"type": "reduceGold", "value": 1}]},
    401: {"effects": [dict(lose(2), ifNoItem=DENT_GOB), dict(lose(1), ifItem=DENT_GOB),
                      {"type": "removeItem", "itemName": DENT_GOB}],
          "patch": {218: {"requiresNoItem": DENT_GOB}, 196: {"requiresItem": DENT_GOB}}},
    402: {"effects": [lose(3)]},
    404: {"effects": [lose(2)]},
    407: {"monsters": [mon("Deuxième GOBELIN", 6, 4), mon("Troisième GOBELIN", 5, 5)],
          "effects": [{"type": "monstersFlee"}],
          "patch": {155: {"requiresAllMonstersDefeated": True, "requiresConditionMet": False},
                    202: {"requiresConditionMet": True}},
          "sub": [(r"HABILETÉ ENDURANCE Deuxième GOBELIN 6 4 Troisième GOBELIN 5 5 ",
                   "<br>Deuxième GOBELIN — HABILETÉ : 6, ENDURANCE : 4<br>Troisième GOBELIN — HABILETÉ : 5, ENDURANCE : 5<br><br>")]},
    410: {"effects": [lose(2)]},
    411: {"monsters": [mon("GEANT DES COLLINES", 9, 11, playerSkillMultiplier=2)]},
    417: {"effects": [{"type": "dieDamage", "deadlyOn": 6}], "patch": {63: {"requiresConditionMet": True}}},
    421: {"effects": [lose(2)]},
    422: {"effects": [lose(2)]},
    424: {"effects": [{"type": "setFlag", "flag": "fallModifier", "value": -3},
                      {"type": "setFlag", "flag": "fallNoDeath", "value": True}]},
    425: {"patch": {50: {"requiresAllMonstersDefeated": True}},
          "effects": [dict(lose(5), ifNoItem=DENT_GOB),
                      {"type": "allyFight", "ifItem": DENT_GOB, "consume": DENT_GOB, "consumeAll": True, "costPerAlly": 1,
                       "ally": {"name": "GOBELIN", "skill": 5, "health": 5}}]},
    428: {"effects": [lose(2)],
          "note": "La possibilité de Tenter votre Chance pour éviter le coup n'est pas automatisée."},
    431: {"choices": [ch("Protégé par votre bouclier invisible, vous quittez le village (rendez-vous au 220)", 220)]},
    433: {"patch": {273: {"requiresLibra": True}}, "add": [dict(GAME_OVER, requiresNoLibra=True)]},
    441: {"effects": [dict(lose(2), ifNoItem=OR), {"type": "nextCombat", "monsterAttackBonus": -2, "ifItem": OR},
                      {"type": "reduceGold", "value": 1}]},
    442: {"effects": [{"type": "nextCombat", "damage": 4, "ifItem": CIRE}, {"type": "removeItem", "itemName": CIRE}]},
    448: {"choices": [ch("Retourner au paragraphe d'où vous êtes venu", "return")]},
    453: {"effects": [dict(ROLL_LUCK, optional=True)],
          "choices": [ch("Chanceux : le monstre s'enfuit, retournez au paragraphe d'où vous êtes venu", "return", chanceCheckPassed=True),
                      ch("Combattre la créature en doublant votre HABILETÉ (retournez au 123)", 123,
                         effects=[{"type": "nextCombat", "playerSkillMultiplier": 2}])]},
    456: {"choices": [],
          "effects": [{"type": "removeItem", "itemName": JANN}, {"type": "removeItem", "itemName": PESTE},
                      {"type": "removeItem", "itemName": MAL_ESPRIT}, {"type": "removeItem", "itemName": MAL_ALIANNA},
                      {"type": "gainBaseChance", "value": 1}, {"type": "restoreAll"},
                      {"type": "gainGold", "value": 10}, take("grande clé de la Porte Sud de Kharé"), {"type": "victory"}]},
}

# ---------------------------------------------------------------------------
# Lecture du PDF
# ---------------------------------------------------------------------------
END_PUNCT = (".", "!", "?", "»", ":", "…")
RE_CODES = re.compile(r"[A-Z]{3}( [A-Z]{3})+")
RE_NUMS = re.compile(r"\d+( \d+)+")
RE_MONSTER = re.compile(r"^(.*?)\s*HABILETÉ ?: ?(\d+) ENDURANCE ?: ?(\d+)\s*$")


def read_pdf():
    try:
        raw = subprocess.run(["pdftotext", "-raw", PDF, "-"], check=True, capture_output=True).stdout.decode("utf-8")
    except FileNotFoundError:
        sys.exit("pdftotext introuvable : installez poppler-utils.")
    return [l.rstrip() for l in raw.replace("\x0c", "\n").split("\n")]


def paragraphs(lines):
    """Recolle les lignes coupées par la mise en page en vrais paragraphes."""
    paras, cur, brk = [], "", False
    for l in lines:
        l = l.strip()
        if not l:
            brk = True
            continue
        if RE_CODES.fullmatch(l) or RE_NUMS.fullmatch(l) or (RE_MONSTER.match(l) and len(l) < 70):
            if cur:
                paras.append(cur)
                cur = ""
            paras.append(l)
            brk = False
            continue
        if cur and brk and cur.endswith(END_PUNCT) and (l[0].isupper() or l[0] in "«-—"):
            paras.append(cur)
            cur = ""
        brk = False
        if not cur:
            cur = l
        elif cur.endswith("-") and not cur.endswith(" -"):
            cur += l
        else:
            cur += " " + l
    if cur:
        paras.append(cur)
    return paras


def clean(s):
    s = re.sub(r"\s+([,.])", r"\1", s)
    s = re.sub(r"(?<=[a-zé]) Vous perdez", " vous perdez", s)
    s = s.replace("HABlLETE", "HABILETÉ").replace("{sauf", "(sauf").replace("oeil", "œil").replace("c 'est", "c'est")
    s = s.replace("d 'Os", "d'Os").replace("n 'aurez", "n'aurez").replace("ne Ta jamais", "ne l'a jamais")
    return s.strip()


# ---------------------------------------------------------------------------
# Détection automatique
# ---------------------------------------------------------------------------
RE_REF = re.compile(r"\bau (\d{1,3})\b")
RE_SENT = re.compile(r"(?<=[.!?…]) +(?=[A-ZÉÀÊ«])")
RE_WIN = re.compile(r"vainqueur|victoire|si vous gagnez|parvenez à vaincre", re.I)


def tidy_choice(t):
    t = t.strip(" ,;:")
    t = re.sub(r"^[)\]]\s*[,;]?\s*", "", t)
    t = re.sub(r"^(ou|et|puis|mais|enfin,?) ", "", t)
    if t.count("(") > t.count(")"):
        t += ")"
    t = t.strip(" ,;:")
    return t[:1].upper() + t[1:]


def auto_choices(paras, has_monsters, tests_luck):
    choices, seen = [], set()
    for i, p in enumerate(paras):
        if RE_CODES.fullmatch(p) and i + 1 < len(paras) and RE_NUMS.fullmatch(paras[i + 1]):
            for code, num in zip(p.split(), paras[i + 1].split()):
                choices.append({"text": "Formule " + code, "nextId": int(num), "magicFormula": code})
            continue
        if RE_NUMS.fullmatch(p):
            continue
        sents = RE_SENT.split(p)
        for si, sent in enumerate(sents):
            for seg in re.split(r" ; ", sent):
                prev = 0
                for m in RE_REF.finditer(seg):
                    n = int(m.group(1))
                    if not 1 <= n <= LAST or "deuxième volume" in seg[m.end():m.end() + 30]:
                        continue
                    text = tidy_choice(seg[prev:m.end()])
                    prev = m.end()
                    if re.match(r"Rendez-vous (pour cela|dans ce cas|alors)", text) and si > 0:
                        text = tidy_choice(sents[si - 1]) + " " + text
                    elif re.fullmatch(r"Rendez-vous au \d+", text) and si > 0 and sents[si - 1].endswith("?"):
                        question = re.sub(r"^Rendez-vous au \d+ ", "", sents[si - 1])
                        text = question + " " + text
                    if len(text) > 120 and " : " in text and RE_REF.search(text.rsplit(" : ", 1)[1]):
                        text = tidy_choice(text.rsplit(" : ", 1)[1])
                    if n in seen:
                        continue
                    seen.add(n)
                    c = {"text": text, "nextId": n}
                    if tests_luck and "Malchanceux" in text:
                        c["chanceCheckPassed"] = False
                    elif tests_luck and "Chanceux" in text:
                        c["chanceCheckPassed"] = True
                    if has_monsters and RE_WIN.search(text):
                        c["requiresAllMonstersDefeated"] = True
                    choices.append(c)
    return choices


def auto_monsters(paras):
    out = []
    for p in paras:
        m = RE_MONSTER.match(p)
        if m and len(p) < 70 and m.group(1).strip():
            out.append({"name": m.group(1).strip(" :"), "skill": int(m.group(2)), "health": int(m.group(3))})
    return out


def html(paras):
    parts = []
    skip = False
    for i, p in enumerate(paras):
        if skip:
            skip = False
            continue
        if RE_CODES.fullmatch(p) and i + 1 < len(paras) and RE_NUMS.fullmatch(paras[i + 1]):
            parts.append('<p class="formules">' + " · ".join(p.split()) + "</p>")
            skip = True
        elif RE_MONSTER.match(p) and len(p) < 70:
            parts.append('<p class="monstre">' + clean(p) + "</p>")
        else:
            p = re.sub(r"([Rr]endez-vous au \d+) (?=[A-ZÉ])", r"\1<br>", clean(p))
            p = re.sub(r"(\? )(?=[^.?!<]{3,80} \? Rendez-vous au \d+<br>)", r"\1<br>", p, count=1)
            parts.append("<p>" + p + "</p>")
    return "".join(parts)


def illustration(n):
    for ext in ("png", "jpg"):
        for stem in ("chapitre_%d" % n, "figure_%d" % n):
            rel = "%s/%s.%s" % (IMG_DIR, stem, ext)
            if os.path.exists(os.path.join(BOOK_DIR, rel)):
                return rel
    return DEFAULT_IMG


# ---------------------------------------------------------------------------
# Construction
# ---------------------------------------------------------------------------
def build():
    L = read_pdf()
    start = next(i for i, l in enumerate(L) if l.strip() == "Lire le Livre des Formules Magiques")
    end = next(i for i, l in enumerate(L) if l.strip() == "Le Livre" and i > start)
    pos, exp = {}, 1
    for i in range(start, end):
        if L[i].strip() == str(exp):
            pos[exp] = i
            exp += 1
    if exp != LAST + 1:
        sys.exit("Découpage des chapitres impossible (arrêt au %d)" % exp)

    intro_a = next(i for i, l in enumerate(L) if l.strip() == "La légende de la Couronne des Rois")
    intro_b = next(i for i, l in enumerate(L) if l.strip().startswith("Maintenant, Tournez la page"))
    chapters = [{
        "id": 0,
        "title": "La légende de la Couronne des Rois",
        "text": html(paragraphs(L[intro_a + 1:intro_b])),
        "items": [], "monsters": [], "effects": [],
        "choices": [{"text": "Commencer l'aventure", "nextId": 1}],
        "illustration": IMG_DIR + "/page_garde_collines.jpg",
    }]

    report = []
    for n in range(1, LAST + 1):
        lines = L[pos[n] + 1:(pos[n + 1] if n < LAST else end)]
        paras = paragraphs(lines)
        o = O.get(n, {})
        text = html(paras)
        for pat, rep in o.get("sub", []):
            text, k = re.subn(pat, rep, text)
            if not k:
                report.append("chapitre %d : substitution de texte non appliquée (%s…)" % (n, pat[:30]))
        monsters = o["monsters"] if "monsters" in o else auto_monsters(paras)
        plain = " ".join(paras)
        effects = list(o.get("effects", []))
        tests_luck = "Tentez votre Chance" in plain
        if "choices" in o:
            choices = [dict(c) for c in o["choices"]]
        else:
            choices = auto_choices(paras, bool(monsters), tests_luck)
            choices = [c for c in choices if c["nextId"] not in o.get("drop", [])]
            for to, extra in o.get("patch", {}).items():
                hit = [c for c in choices if c["nextId"] == to]
                if not hit:
                    report.append("chapitre %d : patch sur un choix introuvable (-> %s)" % (n, to))
                for c in hit:
                    c.update(extra)
            choices += [dict(c) for c in o.get("add", [])]
        for c in choices:
            if (n, c.get("nextId")) in LIBRA_CHOICES:
                c["requiresLibra"] = True
        # test de chance obligatoire détecté automatiquement
        if any("chanceCheckPassed" in c for c in choices) and not any(e.get("type") in ("rollDiceChance", "luckStreak") for e in effects):
            effects.append(dict(ROLL_LUCK))
        # coût de la Formule Magique : première phrase des paragraphes de sortilège
        m = re.match(r"Vous perdez (\d+) points? d'ENDURANCE", plain)
        if n >= 287 and m:
            effects.insert(0, {"type": "reduceHealth", "value": int(m.group(1)), "spell": True})
        # paragraphe sans issue = fin de l'aventure
        if not choices and n != LAST:
            effects.append({"type": "gameOver"})
        if monsters and not any(c.get("requiresAllMonstersDefeated") for c in choices) and "monstersIf" not in o:
            report.append("chapitre %d : monstre sans choix « si vous êtes vainqueur »" % n)
        chap = {"id": n, "text": text, "items": o.get("items", []), "monsters": monsters, "effects": effects,
                "choices": choices, "illustration": illustration(n)}
        for k in ("meal", "monstersIf", "note"):
            if k in o:
                chap[k] = o[k]
        chapters.append(chap)

    # ---- validation ----
    ids = {c["id"] for c in chapters}
    reached = {1}
    for c in chapters:
        for x in c["choices"]:
            targets = [x.get("nextId")] + list((x.get("luckTest") or {}).values())
            for t in targets:
                if t in (None, "return"):
                    continue
                if t not in ids:
                    report.append("chapitre %d : destination inconnue %s" % (c["id"], t))
                reached.add(t)
    orphans = sorted(ids - reached - {0})
    if orphans:
        report.append("chapitres jamais atteints : %s" % orphans)

    with open(OUT_CHAPTERS, "w", encoding="utf-8") as f:
        json.dump({"chapters": chapters}, f, ensure_ascii=False, indent=1)

    # ---- Livre des Formules ----
    spells = []
    i = end
    while i < len(L):
        if re.fullmatch(r"[A-Z]{3}", L[i].strip()):
            code, desc, j = L[i].strip(), [], i + 1
            while j < len(L) and not L[j].strip().startswith("Coût"):
                desc.append(L[j])
                j += 1
            if j < len(L):
                cost = re.search(r"(\d+)", L[j])
                spells.append({"code": code, "description": clean(" ".join(paragraphs(desc))),
                               "cost": int(cost.group(1)) if cost else None})
                i = j
        i += 1
    with open(OUT_SPELLS, "w", encoding="utf-8") as f:
        json.dump({"magic_formulas": spells}, f, ensure_ascii=False, indent=1)

    print("%d chapitres, %d formules" % (len(chapters), len(spells)))
    print("choix : %d, monstres : %d, fins : %d" % (
        sum(len(c["choices"]) for c in chapters), sum(len(c["monsters"]) for c in chapters),
        sum(1 for c in chapters if any(e["type"] == "gameOver" for e in c["effects"]))))
    for r in report:
        print("  !", r)


if __name__ == "__main__":
    build()
