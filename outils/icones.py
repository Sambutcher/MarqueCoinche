#!/usr/bin/env python3
"""Génère les icônes de l'application (carte, valet de cœur, tapis vert).

Usage : python3 outils/icones.py [dossier de sortie, par défaut le dépôt]
Nécessite Pillow (pip install pillow) et la police DejaVu Serif Bold.
Produit : icon-512.png, icon-192.png, icon-maskable-512.png, apple-touch-icon.png,
favicon-32x32.png, favicon-16x16.png et favicon.ico.
"""
import math
import os
import sys
from PIL import Image, ImageDraw, ImageFilter, ImageFont

N = 2048  # dessin en grand puis réduction (anti-crénelage)
ROUGE = (204, 36, 44, 255)
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf"

def coeur(cx, cy, taille, n=400):
    pts = []
    for i in range(n):
        t = 2 * math.pi * i / n
        x = 16 * math.sin(t) ** 3
        y = 13 * math.cos(t) - 5 * math.cos(2*t) - 2 * math.cos(3*t) - math.cos(4*t)
        pts.append((cx + x * taille / 34, cy - y * taille / 34))
    return pts

def dessiner(plein=False, detail=True, echelle=1.0):
    """plein : carré sans coins arrondis (apple-touch, maskable) ; detail : coin « V » (inutile en très petit) ;
    echelle : taille de la carte (0,8 pour la zone sûre d'une icône maskable)."""
    img = Image.new("RGBA", (N, N), (0, 0, 0, 0))
    # tapis vert en dégradé
    fond = Image.new("RGBA", (N, N))
    d = ImageDraw.Draw(fond)
    for y in range(N):
        k = y / N
        d.line([(0, y), (N, y)], fill=(int(30 - 14*k), int(130 - 55*k), int(84 - 36*k), 255))
    masque = Image.new("L", (N, N), 0)
    ImageDraw.Draw(masque).rounded_rectangle([0, 0, N-1, N-1], radius=0 if plein else int(N*0.225), fill=255)
    img.paste(fond, (0, 0), masque)

    # carte inclinée avec ombre
    cw, ch = int(N*0.50*echelle), int(N*0.68*echelle)
    carte = Image.new("RGBA", (cw + 80, ch + 80), (0, 0, 0, 0))
    cd = ImageDraw.Draw(carte)
    rayon = int(cw*0.09)
    cd.rounded_rectangle([40, 40, 40+cw, 40+ch], radius=rayon, fill=(252, 250, 244, 255))
    cd.rounded_rectangle([40+14, 40+14, 40+cw-14, 40+ch-14], radius=rayon-8, outline=(222, 216, 204, 255), width=6)
    # grand cœur
    cd.polygon(coeur(40 + cw/2 + (cw*0.04 if detail else 0), 40 + ch*0.58, cw*0.74), fill=ROUGE)
    if detail:
        police = ImageFont.truetype(FONT, int(cw*0.30))
        cd.text((40 + cw*0.075, 40 + ch*0.025), "V", font=police, fill=ROUGE)
        cd.polygon(coeur(40 + cw*0.16, 40 + ch*0.335, cw*0.12), fill=ROUGE)
    carte = carte.rotate(8, resample=Image.BICUBIC, expand=True)
    ombre = Image.new("RGBA", carte.size, (0, 0, 0, 0))
    ombre.putalpha(carte.getchannel("A").point(lambda a: int(a * 0.38)))
    ombre = ombre.filter(ImageFilter.GaussianBlur(26))
    ox, oy = (N - carte.width)//2, (N - carte.height)//2 + int(N*0.005)
    tmp = Image.new("RGBA", (N, N), (0, 0, 0, 0))
    tmp.alpha_composite(ombre, (ox + 10, oy + 34))
    tmp.alpha_composite(carte, (ox, oy))
    tmp.putalpha(Image.composite(tmp.getchannel("A"), Image.new("L", (N, N), 0), masque))
    img.alpha_composite(tmp)
    return img

def sortie(img, taille, chemin):
    img.resize((taille, taille), Image.LANCZOS).save(chemin, optimize=True)

if __name__ == "__main__":
    dossier = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
    grand, plein, petit = dessiner(), dessiner(plein=True), dessiner(detail=False)
    sortie(dessiner(plein=True, echelle=0.88).convert("RGB"), 512, f"{dossier}/icon-maskable-512.png")
    sortie(grand, 512, f"{dossier}/icon-512.png")
    sortie(grand, 192, f"{dossier}/icon-192.png")
    sortie(plein.convert("RGB"), 180, f"{dossier}/apple-touch-icon.png")
    sortie(petit, 32, f"{dossier}/favicon-32x32.png")
    sortie(petit, 16, f"{dossier}/favicon-16x16.png")
    ico = [petit.resize((s, s), Image.LANCZOS) for s in (48, 32, 16)]
    ico[0].save(f"{dossier}/favicon.ico", sizes=[(48, 48), (32, 32), (16, 16)], append_images=ico[1:])
