#!/usr/bin/env python3
"""Trilha de fundo do vídeo (sintetizada aqui, sem direitos de terceiros): acordes suaves (Dó, Lá menor, Fá, Sol),
baixo leve, arpejo discreto e um "whoosh" suave em cada troca de cena. Uso: python3 trilha.py saida.wav [duração]"""
import sys, wave
import numpy as np

SAIDA = sys.argv[1]
DUR = float(sys.argv[2]) if len(sys.argv) > 2 else 104.5
SR = 48000
N = int(DUR * SR)
t = np.arange(N) / SR
rng = np.random.default_rng(7)
f = lambda m: 440.0 * 2 ** ((m - 69) / 12)

BPM = 92.0
BEAT = 60.0 / BPM
COMP = 8 * BEAT  # 2 compassos por acorde
ACORDES = [[48, 52, 55, 59], [45, 48, 52, 55], [41, 45, 48, 52], [43, 47, 50, 57]]  # Cmaj7, Am7, Fmaj7, Gadd9

L = np.zeros(N); R = np.zeros(N)

# ---- pad: notas com leve desafinação entre os canais, envelope que cruza entre os acordes
n_ac = int(np.ceil(DUR / COMP)) + 1
for k in range(n_ac):
    ini = k * COMP - 1.2
    fim = ini + COMP + 2.4
    a, b = max(0, int(ini * SR)), min(N, int(fim * SR))
    if a >= b: continue
    tt = t[a:b] - ini
    env = np.minimum(1, tt / 1.4) * np.minimum(1, (fim - ini - tt) / 1.4)
    env = np.sin(np.clip(env, 0, 1) * np.pi / 2) ** 2
    for m in ACORDES[k % 4]:
        fr = f(m)
        for d, pan in [(-0.12, 0.7), (0.0, 0.5), (0.12, 0.3)]:
            ph = rng.uniform(0, 2 * np.pi)
            s = np.sin(2 * np.pi * fr * (1 + d / 100) * tt + ph) + 0.18 * np.sin(2 * np.pi * 2 * fr * tt + ph)
            L[a:b] += 0.030 * env * s * (1 - pan) * 2
            R[a:b] += 0.030 * env * s * pan * 2

# ---- baixo: tônica uma oitava abaixo nos tempos 1 e 3
for k in range(int(DUR / BEAT)):
    if k % 2: continue
    ini = k * BEAT
    ac = ACORDES[int(ini // COMP) % 4]
    fr = f(ac[0] - 12)
    a, b = int(ini * SR), min(N, int((ini + 1.6) * SR))
    tt = t[a:b] - ini
    s = np.sin(2 * np.pi * fr * tt) * np.exp(-tt / 0.6) * np.minimum(1, tt / 0.02)
    L[a:b] += 0.09 * s; R[a:b] += 0.09 * s

# ---- arpejo discreto em colcheias (depois da abertura; some antes do fim)
PADRAO = [0, 2, 1, 3, 2, 1, 3, 2]
col = BEAT / 2
for k in range(int(DUR / col)):
    ini = k * col
    if ini < 4.4 or ini > DUR - 4.5: continue
    ac = ACORDES[int(ini // COMP) % 4]
    m = ac[PADRAO[k % 8]] + 24
    fr = f(m)
    a, b = int(ini * SR), min(N, int((ini + 1.2) * SR))
    tt = t[a:b] - ini
    s = (np.sin(2 * np.pi * fr * tt) + 0.25 * np.sin(2 * np.pi * 2 * fr * tt)) * np.exp(-tt / 0.32) * np.minimum(1, tt / 0.004)
    g = 0.022 * (0.85 + 0.15 * (k % 4 == 0))
    pan = 0.35 + 0.3 * ((k * 3) % 5) / 4
    L[a:b] += g * s * (1 - pan) * 2; R[a:b] += g * s * pan * 2

# ---- whoosh suave nas trocas de cena (ruído filtrado)
TROCAS = [4.4, 13.4, 20.2, 30.4, 40.2, 49.6, 59.0, 68.4, 76.4, 84.4, 92.2, 98.6]
for tc in TROCAS:
    a, b = max(0, int((tc - 0.7) * SR)), min(N, int((tc + 0.9) * SR))
    n = b - a
    ru = rng.standard_normal(n)
    F = np.fft.rfft(ru); fr_ = np.fft.rfftfreq(n, 1 / SR)
    F *= np.exp(-((fr_ - 1800) / 1400) ** 2)  # passa-faixa em volta de 1,8 kHz
    ru = np.fft.irfft(F, n)
    ru /= np.abs(ru).max() + 1e-9
    tt = np.arange(n) / SR
    env = np.where(tt < 0.7, (tt / 0.7) ** 2, np.exp(-(tt - 0.7) / 0.25))
    L[a:b] += 0.05 * ru * env; R[a:b] += 0.05 * ru * env[::-1] * 0 + 0.05 * ru * env

# ---- ambiência: reverb por convolução com ruído que decai
def reverb(x, seg=2.2, mix=0.28):
    n = int(seg * SR)
    ir = rng.standard_normal(n) * np.exp(-np.arange(n) / SR / 0.55)
    ir /= np.sqrt((ir ** 2).sum())
    m = len(x) + n
    tam = 1 << int(np.ceil(np.log2(m)))
    y = np.fft.irfft(np.fft.rfft(x, tam) * np.fft.rfft(ir, tam), tam)[:len(x)]
    return (1 - mix) * x + mix * y
L = reverb(L); R = reverb(R)

# ---- volume final: entrada e saída suaves, pico em -3 dBFS
fade = np.minimum(1, t / 1.5) * np.minimum(1, (DUR - t) / 3.0)
L *= fade; R *= fade
pico = max(np.abs(L).max(), np.abs(R).max())
g = 10 ** (-3 / 20) / pico
L *= g; R *= g
rms = np.sqrt(((L ** 2 + R ** 2) / 2).mean())
print('pico -3 dBFS, RMS %.1f dBFS' % (20 * np.log10(rms)))
st = np.stack([L, R], 1)
pcm = (np.clip(st, -1, 1) * 32767).astype('<i2')
w = wave.open(SAIDA, 'wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes()); w.close()
print('ok →', SAIDA)
