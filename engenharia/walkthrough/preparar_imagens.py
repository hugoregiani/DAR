#!/usr/bin/env python3
"""Tira do PDF de referência (EARL_Demo_walkthrough.pdf) a foto da capa, a do fim e os logos EARL e HALLIBURTON.
Uso: python3 preparar_imagens.py <EARL_Demo_walkthrough.pdf>   (precisa do pdfimages, do poppler-utils, e do Pillow)"""
import os, shutil, subprocess, sys, tempfile
from PIL import Image
REF = sys.argv[1]
IMG = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'img')
os.makedirs(IMG, exist_ok=True)
t = tempfile.mkdtemp()
subprocess.run(['pdfimages', '-png', '-f', '1', '-l', '1', REF, os.path.join(t, 'p1')], check=True)
subprocess.run(['pdfimages', '-j', '-f', '1', '-l', '1', REF, os.path.join(t, 'j1')], check=True)
subprocess.run(['pdfimages', '-j', '-f', '63', '-l', '63', REF, os.path.join(t, 'j63')], check=True)
rgb = Image.open(os.path.join(t, 'p1-000.png')).convert('RGB'); a = Image.open(os.path.join(t, 'p1-001.png')).convert('L')
rgb.putalpha(a); rgb.save(os.path.join(IMG, 'halliburton.png'))
Image.open(os.path.join(t, 'p1-003.png')).save(os.path.join(IMG, 'earl.png'))
shutil.copy(os.path.join(t, 'j1-002.jpg'), os.path.join(IMG, 'capa.jpg'))
shutil.copy(os.path.join(t, 'j63-002.jpg'), os.path.join(IMG, 'fim.jpg'))
print('ok →', IMG)
