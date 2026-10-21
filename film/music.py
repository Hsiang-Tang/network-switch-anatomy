"""Original score for the film, synthesised from scratch (no samples, no third-party music).
usage: python3 -I film/music.py OUT.wav [seconds]
A slow A-minor pad (Am9 / Fmaj7 / Cmaj7 / G6, one chord per 2 bars at 96 bpm), a soft sub pulse, a plucked
arpeggio that thickens when the machine starts coming apart (~17 s), and quiet hat ticks from ~20 s."""
import math, random, struct, sys, wave
SR = 44100
out = sys.argv[1]; DUR = float(sys.argv[2]) if len(sys.argv) > 2 else 52.0
N = int(SR * DUR); L = [0.0] * N; R = [0.0] * N
BPM = 96; BEAT = 60 / BPM; BAR = 4 * BEAT
random.seed(7)
def hz(m): return 440.0 * 2 ** ((m - 69) / 12)
CH = [[57, 60, 64, 67, 71], [53, 57, 60, 64, 67], [48, 55, 59, 64, 67], [55, 59, 62, 64, 69]]  # Am9 Fmaj7 Cmaj7 G6
def add(buf_l, buf_r, start, samples, gl, gr):
    i0 = int(start * SR)
    for k, v in enumerate(samples):
        i = i0 + k
        if i >= N: break
        L[i] += v * gl; R[i] += v * gr
def env_pad(t, d): return min(1.0, t / 2.2) * min(1.0, max(0.0, (d - t) / 2.5))
def pad(m, d, det):
    f1, f2 = hz(m) * (1 + det), hz(m) * (1 - det)
    n = int(d * SR); o = []
    for k in range(n):
        t = k / SR
        s = math.sin(2 * math.pi * f1 * t) + math.sin(2 * math.pi * f2 * t) + 0.3 * math.sin(4 * math.pi * f1 * t)
        o.append(s * env_pad(t, d) * (0.85 + 0.15 * math.sin(2 * math.pi * 0.11 * t)))
    return o
def pluck(m, d=1.6):
    f = hz(m); n = int(d * SR); o = []
    for k in range(n):
        t = k / SR
        s = math.sin(2 * math.pi * f * t) + 0.35 * math.sin(4 * math.pi * f * t) * math.exp(-t * 6) + 0.12 * math.sin(6 * math.pi * f * t) * math.exp(-t * 9)
        o.append(s * math.exp(-t * 3.2) * min(1.0, t / 0.004))
    return o
def sub(m, d):
    f = hz(m); n = int(d * SR)
    return [math.sin(2 * math.pi * f * (k / SR)) * math.exp(-(k / SR) * 4.5) * min(1.0, (k / SR) / 0.01) for k in range(n)]
def tick(d=0.05):
    n = int(d * SR); return [(random.random() * 2 - 1) * math.exp(-(k / SR) * 90) for k in range(n)]
bars = int(DUR / BAR) + 1
for b in range(0, bars, 2):
    c = CH[(b // 2) % 4]; t0 = b * BAR
    for j, m in enumerate(c):
        p = pad(m + (12 if j == 0 else 0) if False else m, 2 * BAR + 2.5, 0.0012 * (j + 1))
        pan = 0.5 + 0.3 * math.sin(j * 1.7); add(L, R, t0, p, 0.045 * (1 - pan * 0.5), 0.045 * (0.5 + pan * 0.5))
for b in range(bars):
    c = CH[(b // 2) % 4]; t0 = b * BAR
    if t0 >= 1.0:
        for q in range(4):
            add(L, R, t0 + q * BEAT, sub(c[0] - 12, 0.7), 0.16 if q in (0, 2) else 0.09, 0.16 if q in (0, 2) else 0.09)
    # arpeggio: sparse early, eighth notes once the machine comes apart
    pat = [0, 2, 4, 2, 3, 1, 4, 2] if t0 >= 16 else [0, None, 4, None, 2, None, None, None]
    for q, idx in enumerate(pat):
        if idx is None or t0 + q * BEAT / 2 < 3.0: continue
        m = c[idx] + 12
        pan = 0.25 + 0.5 * ((q * 3) % 8) / 8
        add(L, R, t0 + q * BEAT / 2, pluck(m), 0.10 * (1 - pan), 0.10 * pan)
    if t0 >= 20:
        for q in range(8):
            g = 0.035 if q % 2 else 0.02
            add(L, R, t0 + q * BEAT / 2, tick(), g, g)
pk = max(max(abs(x) for x in L), max(abs(x) for x in R)) or 1
fade = int(2.5 * SR)
with wave.open(out, "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    fr = bytearray()
    for i in range(N):
        g = 0.8 / pk * min(1.0, i / (1.5 * SR)) * min(1.0, (N - i) / fade)
        fr += struct.pack("<hh", int(max(-1, min(1, L[i] * g)) * 32767), int(max(-1, min(1, R[i] * g)) * 32767))
    w.writeframes(bytes(fr))
