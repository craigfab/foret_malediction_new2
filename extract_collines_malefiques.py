#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import PyPDF2
import json
import re
from typing import Dict, List, Any, Optional

class CollinesMalefiquesExtractor:
    
    def __init__(self, pdf_path: str):
        self.pdf_path = pdf_path
        self.chapters = []
        self.current_chapter = None
        
        # Liste des formules magiques (complète)
        self.magic_formulas = [
            "BOU", "PUE", "TEL", "HOU", "BOF", "AMI", "BIS", "FOR", "ROC", "HOP", 
            "VEN", "FIX", "SOM", "VOL", "INV", "LUX", "REV", "BLA", "WAF", "ZIP", 
            "VUE", "RES", "ZED", "BLE", "CLE", "BAM", "FIL", "SUD", "CHU", "RIS", 
            "DEV", "YAF", "ZAP", "GAK", "NIF", "DOP", "KIN", "JIG", "LAW", "MUD",
            "NAP", "GOB", "FOF", "YOB", "YOG", "YAP", "YAG", "YIP", "YUP", "YAZ"
        ]
        
        # Patterns pour identifier les éléments
        self.chapter_pattern = re.compile(r'^(\d+)$')  # Numéro de chapitre seul sur une ligne
        self.choice_pattern = re.compile(r'(?:Rendez\s*-\s*vous|rendez\s*-\s*vous|allez|Allez)\s+(?:au|à\s*la|pour\s+cela\s+au)\s+(\d+)', re.IGNORECASE)
        self.monster_pattern = re.compile(r'([A-Z][A-Za-z\s]+?)\s+HABILETÉ\s*:?\s*(\d+)\s+ENDURANCE\s*:?\s*(\d+)', re.IGNORECASE)
        self.item_pattern = re.compile(r'(épée|armure|bouclier|potion|anneau|amulette|pièces?)', re.IGNORECASE)
        self.magic_choice_pattern = re.compile(r'(?:si vous préférez recourir à la magie|choisissez l\'une des formules suivantes)', re.IGNORECASE)
        
        # Effets possibles basés sur chapterEffects.js
        self.effects_mapping = {
            'game over': {'type': 'gameOver'},
            'mort': {'type': 'gameOver'},
            'fin': {'type': 'gameOver'},
            'habileté': {'type': 'reduceSkill', 'value': 1},
            'endurance': {'type': 'reduceHealth', 'value': 1},
            'chance': {'type': 'reduceChance', 'value': 1},
            'test d\'habileté': {'type': 'rollDiceSkill'},
            'tentez votre chance': {'type': 'rollDiceChance'},
            'lancer les dés': {'type': 'rollDiceSkill'},
        }

    def extract_text_from_pdf(self) -> str:
        """Extrait le texte du PDF"""
        try:
            with open(self.pdf_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                text = ""
                for page in pdf_reader.pages:
                    text += page.extract_text() + "\n"
                return text
        except Exception as e:
            print(f"Erreur lors de l'extraction du PDF: {e}")
            return ""

    def detect_monsters(self, text: str) -> List[Dict[str, Any]]:
        """Détecte les monstres dans le texte"""
        monsters = []
        matches = self.monster_pattern.findall(text)
        for match in matches:
            name, skill, health = match
            monsters.append({
                "name": name.strip(),
                "skill": int(skill),
                "health": int(health),
                "status": "vivant"
            })
        return monsters

    def detect_items(self, text: str) -> List[Dict[str, Any]]:
        """Détecte les objets dans le texte"""
        items = []
        
        # Recherche de pièces d'or
        gold_matches = re.findall(r'(\d+)\s*pièces?\s*d[\'\']or', text, re.IGNORECASE)
        for gold_amount in gold_matches:
            items.append({
                "name": "or",
                "category": "gold",
                "quantity": int(gold_amount)
            })
        
        # Recherche d'objets génériques
        item_matches = self.item_pattern.findall(text)
        for item in item_matches:
            category = self.categorize_item(item.lower())
            items.append({
                "name": item.lower(),
                "category": category
            })
        
        return items

    def categorize_item(self, item_name: str) -> str:
        """Catégorise un objet"""
        if 'potion' in item_name:
            return 'potions'
        elif item_name in ['épée', 'armure', 'bouclier', 'lanterne']:
            return 'equipment'
        elif item_name in ['anneau', 'amulette']:
            return 'jewelry'
        elif 'or' in item_name or 'pièce' in item_name:
            return 'gold'
        else:
            return 'equipment'

    def detect_effects(self, text: str) -> List[Dict[str, Any]]:
        """Détecte les effets dans le texte"""
        effects = []
        text_lower = text.lower()
        
        for keyword, effect in self.effects_mapping.items():
            if keyword in text_lower:
                effects.append(effect.copy())
        
        # Détection spécifique de réduction de stats avec valeurs
        health_reduction = re.search(r'perdez\s+(\d+)\s+points?\s+d[\'\']endurance', text_lower)
        if health_reduction:
            effects.append({
                'type': 'reduceHealth',
                'value': int(health_reduction.group(1))
            })
        
        skill_reduction = re.search(r'perdez\s+(\d+)\s+points?\s+d[\'\']habileté', text_lower)
        if skill_reduction:
            effects.append({
                'type': 'reduceSkill',
                'value': int(skill_reduction.group(1))
            })
        
        chance_reduction = re.search(r'perdez\s+(\d+)\s+points?\s+de\s+chance', text_lower)
        if chance_reduction:
            effects.append({
                'type': 'reduceChance',
                'value': int(chance_reduction.group(1))
            })
        
        return effects

    def detect_choices(self, text: str) -> List[Dict[str, Any]]:
        """Détecte les choix dans le texte"""
        choices = []
        
        # D'abord détecter les choix magiques
        magic_choices = self.detect_magic_choices(text)
        choices.extend(magic_choices)
        
        # Créer un set des nextId déjà utilisés par les formules magiques
        magic_next_ids = {choice["nextId"] for choice in magic_choices}
        
        # Recherche des références à d'autres chapitres (en évitant les doublons avec les formules)
        choice_matches = self.choice_pattern.findall(text)
        
        # Diviser le texte en phrases pour identifier les choix
        sentences = re.split(r'[.!?]\s*', text)
        
        for sentence in sentences:
            for match in re.finditer(self.choice_pattern, sentence):
                next_id = int(match.group(1))
                
                # Éviter les doublons avec les formules magiques
                if next_id in magic_next_ids:
                    continue
                
                # Éviter les phrases qui contiennent des listes de formules magiques
                if self.contains_magic_formula_list(sentence):
                    continue
                
                # Nettoyer le texte du choix
                choice_text = sentence.strip()
                if len(choice_text) > 200:
                    choice_text = choice_text[:200] + "..."
                
                choice = {
                    "text": choice_text,
                    "nextId": next_id
                }
                
                # Détecter les conditions
                if "si vous possédez" in sentence.lower():
                    item_match = re.search(r'si vous possédez\s+(.+?)(?:\s|,|\.)', sentence.lower())
                    if item_match:
                        choice["requiresItem"] = item_match.group(1).strip()
                
                if "si vous êtes chanceux" in sentence.lower():
                    choice["chanceCheckPassed"] = True
                elif "si vous êtes malchanceux" in sentence.lower():
                    choice["chanceCheckPassed"] = False
                
                if "si vous réussissez" in sentence.lower():
                    choice["skillCheckPassed"] = True
                elif "si vous échouez" in sentence.lower():
                    choice["skillCheckPassed"] = False
                
                choices.append(choice)
        
        # Détecter les choix avec descriptions d'actions (toujours les inclure car ils sont différents)
        action_choices = self.detect_action_choices(text)
        choices.extend(action_choices)
        
        return choices

    def contains_magic_formula_list(self, sentence: str) -> bool:
        """Vérifie si la phrase contient une liste de formules magiques"""
        # Compter combien de formules magiques sont dans cette phrase
        formula_count = sum(1 for formula in self.magic_formulas if formula in sentence)
        return formula_count >= 2  # Si 2+ formules, c'est probablement une liste

    def detect_action_choices(self, text: str) -> List[Dict[str, Any]]:
        """Détecte les choix qui décrivent une action avant la référence au chapitre"""
        action_choices = []
        
        # Pattern pour les choix avec description d'action
        # Ex: "Vous avez la possibilité de... ; rendez-vous pour cela au 142"
        action_pattern = re.compile(
            r'((?:Vous\s+avez|vous\s+avez|Vous\s+pouvez|vous\s+pouvez).{1,100}?)\s*;\s*(?:rendez\s*-\s*vous|allez)\s+(?:pour\s+cela\s+)?(?:au|à\s*la)\s+(\d+)', 
            re.IGNORECASE | re.DOTALL
        )
        
        matches = action_pattern.findall(text)
        for action_text, chapter_id in matches:
            next_id = int(chapter_id)
            action_choices.append({
                "text": action_text.strip(),
                "nextId": next_id
            })
        
        return action_choices

    def detect_magic_choices(self, text: str) -> List[Dict[str, Any]]:
        """Détecte les choix magiques dans le texte"""
        magic_choices = []
        
        # Pattern pour détecter les listes de formules avec leurs numéros
        # Format: "BLE CLE BAM FOR FIL \n443 409 320 429 360"
        formula_list_pattern = re.compile(
            r'([A-Z]{3}(?:\s+[A-Z]{3})*)\s*\n\s*(\d+(?:\s+\d+)*)', 
            re.MULTILINE
        )
        
        matches = formula_list_pattern.findall(text)
        for formula_line, number_line in matches:
            formulas = formula_line.split()
            numbers = [int(x) for x in number_line.split()]
            
            # Associer chaque formule à son numéro de chapitre
            if len(formulas) == len(numbers):
                for formula, next_id in zip(formulas, numbers):
                    if formula in self.magic_formulas:
                        magic_choices.append({
                            "text": formula,
                            "nextId": next_id,
                            "magicFormula": formula
                        })
        
        # Ne pas chercher les formules individuelles pour éviter les fausses détections
        # La détection par liste est suffisante et plus précise
        
        return magic_choices

    def parse_chapters(self, text: str) -> List[Dict[str, Any]]:
        """Parse le texte pour extraire les chapitres"""
        chapters = []
        seen_ids = set()  # Pour éviter les doublons
        
        # Diviser le texte en sections potentielles de chapitres
        # Recherche des numéros de chapitres (1-400 typiquement)
        chapter_splits = re.split(r'\n\s*(\d{1,3})\s*\n', text)
        
        for i in range(1, len(chapter_splits), 2):
            if i + 1 < len(chapter_splits):
                chapter_id = int(chapter_splits[i])
                chapter_text = chapter_splits[i + 1].strip()
                
                # Éviter les doublons
                if chapter_id in seen_ids:
                    continue
                
                # Exclure les sections de formules magiques
                if self.is_formula_description_section(chapter_text):
                    continue
                
                # Limiter la longueur du texte du chapitre
                if len(chapter_text) > 2000:
                    # Prendre les premiers paragraphes
                    paragraphs = chapter_text.split('\n\n')
                    chapter_text = '\n\n'.join(paragraphs[:3])
                
                # Nettoyer le texte
                clean_text = self.clean_text(chapter_text)
                
                chapter = {
                    "id": chapter_id,
                    "text": clean_text,
                    "items": self.detect_items(chapter_text),
                    "monsters": self.detect_monsters(chapter_text),
                    "effects": self.detect_effects(chapter_text),
                    "choices": self.detect_choices(chapter_text)
                }
                
                # Ajouter une illustration par défaut
                chapter["illustration"] = f"images_collines/chapitre_{chapter_id}.png"
                
                chapters.append(chapter)
                seen_ids.add(chapter_id)
        
        return sorted(chapters, key=lambda x: x["id"])

    def clean_text(self, text: str) -> str:
        """Nettoie le texte en supprimant les retours à la ligne excessifs"""
        # Approche simple : remplacer tous les \n par des espaces
        # sauf ceux qui sont vraiment nécessaires pour la structure
        
        # Remplacer les \n par des espaces
        cleaned = text.replace('\n', ' ')
        
        # Nettoyer les espaces multiples
        cleaned = re.sub(r' +', ' ', cleaned)
        
        # Nettoyer les espaces avant la ponctuation
        cleaned = re.sub(r' +([.!?,:;])', r'\1', cleaned)
        
        # Nettoyer les espaces après les tirets
        cleaned = re.sub(r'-\s+', '-', cleaned)
        
        return cleaned.strip()

    def is_formula_description_section(self, text: str) -> bool:
        """Vérifie si le texte est une section de description de formules magiques"""
        # Indicateurs que c'est une section de formules
        formula_indicators = [
            "Vous donne le pouvoir",
            "Coût :",
            "points d'ENDURANCE",
            "ZAP",
            "FEU",
            "HOR",
            "MUR",
            "LOI",
            "MOU"
        ]
        
        # Si le texte contient plusieurs indicateurs de formules, c'est probablement une section de formules
        indicator_count = sum(1 for indicator in formula_indicators if indicator in text)
        return indicator_count >= 3

    def create_initial_chapter(self) -> Dict[str, Any]:
        """Crée le chapitre initial (id: 0)"""
        return {
            "id": 0,
            "text": "Vous êtes un aventurier courageux qui s'apprête à explorer les mystérieuses Collines Maléfiques. Armé de votre épée et de votre courage, vous vous lancez dans cette quête périlleuse. Prenez vos objets de départ et préparez-vous à l'aventure !",
            "illustration": "images_collines/page_garde_collines.jpg",
            "items": [
                {
                    "name": "épée",
                    "category": "equipment"
                },
                {
                    "name": "armure de cuir",
                    "category": "equipment"
                },
                {
                    "name": "lanterne",
                    "category": "equipment"
                },
                {
                    "name": "or",
                    "category": "gold",
                    "quantity": 20
                },
                {
                    "name": "potion d'adresse",
                    "category": "potions",
                    "description": "rend les points d'habileté"
                },
                {
                    "name": "potion de vigueur",
                    "category": "potions",
                    "description": "rend les points d'endurance"
                },
                {
                    "name": "potion de bonne fortune",
                    "category": "potions",
                    "description": "rend les points de chance + 1"
                }
            ],
            "choices": [
                {
                    "text": "Commencer l'aventure en vous dirigeant vers les Collines Maléfiques...",
                    "nextId": 1
                }
            ]
        }

    def generate_json(self) -> Dict[str, Any]:
        """Génère le JSON complet"""
        print("Extraction du texte du PDF...")
        text = self.extract_text_from_pdf()
        
        if not text:
            print("Impossible d'extraire le texte du PDF")
            return {"chapters": []}
        
        print("Analyse des chapitres...")
        chapters = self.parse_chapters(text)
        
        # Ajouter le chapitre initial
        initial_chapter = self.create_initial_chapter()
        chapters.insert(0, initial_chapter)
        
        print(f"Trouvé {len(chapters)} chapitres")
        
        return {"chapters": chapters}

    def save_json(self, output_path: str):
        """Sauvegarde le JSON dans un fichier"""
        data = self.generate_json()
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=4)
        
        print(f"Fichier JSON sauvegardé: {output_path}")

def main():
    """Fonction principale"""
    pdf_path = "collines_malefiques/Sorcellerie 1 - Les Collines Malefiques.pdf"
    output_path = "collines_malefiques/collines_malefiques.json"
    
    extractor = CollinesMalefiquesExtractor(pdf_path)
    extractor.save_json(output_path)

if __name__ == "__main__":
    main()

