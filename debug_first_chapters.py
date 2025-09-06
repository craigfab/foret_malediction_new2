#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import PyPDF2
import re

def debug_first_chapters(pdf_path):
    """Debug les premiers chapitres pour voir s'il y a un décalage"""
    
    try:
        with open(pdf_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            text = ""
            for page in pdf_reader.pages:
                text += page.extract_text() + "\n"
    except Exception as e:
        print(f"Erreur lors de l'extraction du PDF: {e}")
        return
    
    print("=== ANALYSE DES PREMIERS CHAPITRES ===")
    
    # Chercher toutes les occurrences de numéros de chapitres
    chapter_pattern = re.compile(r'\n\s*(\d{1,3})\s*\n')
    matches = list(chapter_pattern.finditer(text))
    
    print(f"Trouvé {len(matches)} numéros de chapitres potentiels")
    
    # Analyser les 10 premiers chapitres
    for i in range(min(10, len(matches))):
        match = matches[i]
        chapter_num = int(match.group(1))
        start_pos = match.end()
        
        # Trouver la fin du chapitre (prochain numéro)
        if i + 1 < len(matches):
            end_pos = matches[i + 1].start()
        else:
            end_pos = start_pos + 500
        
        chapter_text = text[start_pos:end_pos].strip()
        
        print(f"\n=== CHAPITRE {chapter_num} ===")
        print(f"Position: {start_pos}-{end_pos}")
        print("Début du texte:")
        print(chapter_text[:200] + "..." if len(chapter_text) > 200 else chapter_text)
        
        # Vérifications spéciales
        if chapter_num == 1:
            if "éveillez" in chapter_text or "aube" in chapter_text:
                print("✓ Chapitre 1 semble correct (réveil à l'aube)")
            else:
                print("✗ Chapitre 1 ne semble pas correct")
        elif chapter_num == 4:
            if "cage" in chapter_text:
                print("✓ Chapitre 4 contient 'cage'")
            else:
                print("✗ Chapitre 4 ne contient pas 'cage'")

def main():
    pdf_path = "collines_malefiques/Sorcellerie 1 - Les Collines Malefiques.pdf"
    debug_first_chapters(pdf_path)

if __name__ == "__main__":
    main()
