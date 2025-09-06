#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import PyPDF2
import re

def debug_text_confusion(pdf_path):
    """Debug la confusion entre texte de chapitre et descriptions de formules"""
    
    try:
        with open(pdf_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            text = ""
            for page in pdf_reader.pages:
                text += page.extract_text() + "\n"
    except Exception as e:
        print(f"Erreur lors de l'extraction du PDF: {e}")
        return
    
    print("=== RECHERCHE DE LA CONFUSION ===")
    
    # Chercher "LOI - vous donne le pouvoir"
    loi_pos = text.find("LOI")
    if loi_pos != -1:
        print(f"Trouvé 'LOI' à la position: {loi_pos}")
        print("Contexte autour de 'LOI':")
        print(text[loi_pos-100:loi_pos+200])
        print("-" * 50)
    
    # Chercher "la porte de la cage"
    cage_pos = text.find("La porte de la cage")
    if cage_pos != -1:
        print(f"Trouvé 'La porte de la cage' à la position: {cage_pos}")
        print("Contexte autour de 'la porte de la cage':")
        print(text[cage_pos-100:cage_pos+200])
        print("-" * 50)
    
    # Vérifier si ces deux textes sont proches ou mélangés
    if loi_pos != -1 and cage_pos != -1:
        distance = abs(loi_pos - cage_pos)
        print(f"Distance entre les deux textes: {distance} caractères")
        
        if distance < 1000:
            print("⚠️  Les textes sont très proches - possible confusion")
        else:
            print("✓ Les textes sont séparés - pas de confusion directe")
    
    # Chercher les numéros de chapitres autour de ces positions
    chapter_pattern = re.compile(r'\n\s*(\d{1,3})\s*\n')
    
    print("\n=== CHAPITRES AUTOUR DE 'LA PORTE DE LA CAGE' ===")
    if cage_pos != -1:
        # Texte autour de la cage
        cage_context = text[max(0, cage_pos-500):cage_pos+500]
        cage_chapters = chapter_pattern.findall(cage_context)
        print(f"Numéros de chapitres trouvés: {cage_chapters}")
    
    print("\n=== CHAPITRES AUTOUR DE 'LOI' ===")
    if loi_pos != -1:
        # Texte autour de LOI
        loi_context = text[max(0, loi_pos-500):loi_pos+500]
        loi_chapters = chapter_pattern.findall(loi_context)
        print(f"Numéros de chapitres trouvés: {loi_chapters}")

def main():
    pdf_path = "collines_malefiques/Sorcellerie 1 - Les Collines Malefiques.pdf"
    debug_text_confusion(pdf_path)

if __name__ == "__main__":
    main()
