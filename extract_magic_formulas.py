#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import PyPDF2
import re
import json

def extract_magic_formulas(pdf_path):
    """Extrait les formules magiques de la fin du PDF"""
    
    try:
        with open(pdf_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            total_pages = len(pdf_reader.pages)
            
            # Lire les 10 dernières pages pour trouver les formules
            magic_text = ""
            for page_num in range(max(0, total_pages - 10), total_pages):
                page = pdf_reader.pages[page_num]
                magic_text += page.extract_text() + "\n"
                
    except Exception as e:
        print(f"Erreur lors de l'extraction du PDF: {e}")
        return []
    
    print("Texte des dernières pages extrait, recherche des formules...")
    print("=" * 50)
    print(magic_text[:2000])  # Afficher les premiers 2000 caractères pour debug
    print("=" * 50)
    
    # Patterns pour détecter les formules magiques
    formulas = []
    
    # Pattern pour formules (3 lettres majuscules en début de ligne ou seules)
    formula_pattern = re.compile(r'^([A-Z]{3})$', re.MULTILINE)
    
    # Diviser le texte en sections basées sur les formules
    lines = magic_text.split('\n')
    current_formula = None
    current_description = ""
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
            
        # Vérifier si la ligne contient une formule (3 lettres majuscules seules)
        if re.match(r'^[A-Z]{3}$', line):
            # Sauvegarder la formule précédente si elle existe
            if current_formula and current_description:
                formulas.append({
                    "code": current_formula,
                    "description": current_description.strip()
                })
            
            current_formula = line
            current_description = ""
        else:
            # Continuer la description de la formule courante
            if current_formula:
                current_description += " " + line
    
    # Ajouter la dernière formule
    if current_formula and current_description:
        formulas.append({
            "code": current_formula,
            "description": current_description.strip()
        })
    
    # Nettoyer et déduplicater
    unique_formulas = {}
    for formula in formulas:
        code = formula["code"]
        if code not in unique_formulas and len(code) == 3 and code.isalpha():
            unique_formulas[code] = formula
    
    return list(unique_formulas.values())

def save_formulas_to_json(formulas, output_path):
    """Sauvegarde les formules dans un fichier JSON"""
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump({"magic_formulas": formulas}, f, ensure_ascii=False, indent=4)
    
    print(f"Formules sauvegardées dans {output_path}")
    for formula in formulas:
        print(f"  {formula['code']}: {formula['description'][:100]}...")

def main():
    pdf_path = "collines_malefiques/Sorcellerie 1 - Les Collines Malefiques.pdf"
    output_path = "magic_formulas.json"
    
    formulas = extract_magic_formulas(pdf_path)
    
    if formulas:
        save_formulas_to_json(formulas, output_path)
        print(f"\nTrouvé {len(formulas)} formules magiques")
    else:
        print("Aucune formule magique trouvée")

if __name__ == "__main__":
    main()
