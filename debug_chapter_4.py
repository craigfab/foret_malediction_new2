#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import PyPDF2
import re

def debug_chapter_4(pdf_path):
    """Debug l'extraction du chapitre 4"""
    
    try:
        with open(pdf_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            text = ""
            for page in pdf_reader.pages:
                text += page.extract_text() + "\n"
    except Exception as e:
        print(f"Erreur lors de l'extraction du PDF: {e}")
        return
    
    print("=== RECHERCHE DU CHAPITRE 4 ===")
    
    # Chercher toutes les occurrences de "4" en tant que numéro de chapitre
    chapter_pattern = re.compile(r'\n\s*(\d{1,3})\s*\n')
    matches = list(chapter_pattern.finditer(text))
    
    print(f"Trouvé {len(matches)} numéros de chapitres potentiels")
    
    # Chercher spécifiquement le chapitre 4
    for i, match in enumerate(matches):
        chapter_num = int(match.group(1))
        if chapter_num == 4:
            print(f"\n=== CHAPITRE 4 TROUVÉ (match {i+1}) ===")
            start_pos = match.end()
            
            # Trouver la fin du chapitre (prochain numéro)
            if i + 1 < len(matches):
                end_pos = matches[i + 1].start()
            else:
                end_pos = start_pos + 2000  # Limiter à 2000 caractères
            
            chapter_text = text[start_pos:end_pos].strip()
            print("Texte du chapitre 4:")
            print("-" * 50)
            print(chapter_text[:1000])  # Premiers 1000 caractères
            print("-" * 50)
            
            # Vérifier si c'est le bon chapitre 4 (celui avec la cage)
            if "cage" in chapter_text.lower():
                print("✓ Ce chapitre contient 'cage' - probablement le bon")
            else:
                print("✗ Ce chapitre ne contient pas 'cage' - peut-être pas le bon")
            
            break
    else:
        print("Chapitre 4 non trouvé avec le pattern normal")
        
        # Recherche alternative
        print("\n=== RECHERCHE ALTERNATIVE ===")
        cage_pos = text.find("cage est soigneusement verrouillée")
        if cage_pos != -1:
            print("Trouvé le texte de la cage à la position:", cage_pos)
            # Chercher le numéro de chapitre avant cette position
            before_text = text[max(0, cage_pos-500):cage_pos]
            numbers = re.findall(r'\n\s*(\d{1,3})\s*\n', before_text)
            if numbers:
                print("Numéros de chapitres avant:", numbers)
            print("Contexte:")
            print(text[cage_pos-100:cage_pos+500])

def main():
    pdf_path = "collines_malefiques/Sorcellerie 1 - Les Collines Malefiques.pdf"
    debug_chapter_4(pdf_path)

if __name__ == "__main__":
    main()
