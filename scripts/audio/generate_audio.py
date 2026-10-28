#!/usr/bin/env python3
"""
Generates ESTEH's original audio: one cozy looping background track and the
sound effects. Everything is synthesised here (no samples, no third-party
material), so the output can be bundled freely.

    python3 scripts/audio/generate_audio.py

Requires numpy + scipy, and `lame` for the MP3 music file.
Writes to public/audio/ (served as-is by Vite in dev and in the build).

Music: "Teh Sore" — 84 BPM lo-fi in F major: electric piano, marimba,
nylon-ish plucked guitar, round bass and soft brushes, 24 bars. The file
holds the loop plus a short tail (decaying notes and reverb); the game
schedules each repeat exactly LOOP_SECONDS after the previous one, so the tail
overlaps the next start and the loop is seamless.
"""
import os
import subprocess

import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, fftconvolve, lfilter, sosfilt

SR = 44100
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUT = os.path.join(ROOT, 'public', 'audio')
rng = np.random.default_rng(20240817)

BPM = 84
BEAT = 60 / BPM
BAR = 4 * BEAT
BARS = 24
LOOP = BARS * BAR  # 68.571… s, mirrored in src/audio/audioConfig.ts
TAIL = 4.0


def midi(n):
    return 440.0 * 2 ** ((n - 69) / 12)


def env_adr(n, attack, decay, sr=SR):
    t = np.arange(n) / sr
    a = np.clip(t / max(attack, 1e-4), 0, 1)
    return a * np.exp(-t / decay)


def lowpass(x, hz, order=2):
    sos = butter(order, hz, 'low', fs=SR, output='sos')
    return sosfilt(sos, x)


def highpass(x, hz, order=2):
    sos = butter(order, hz, 'high', fs=SR, output='sos')
    return sosfilt(sos, x)


def bandpass(x, lo, hi, order=2):
    sos = butter(order, [lo, hi], 'band', fs=SR, output='sos')
    return sosfilt(sos, x)


# ------------------------------------------------------------------ instruments

def epiano(freq, dur, vel):
    """Soft electric piano: a few decaying partials, a tiny tine click, two slightly detuned voices."""
    n = int((dur + 2.2) * SR)
    t = np.arange(n) / SR
    out = np.zeros(n)
    for detune in (-2.5, 2.5):
        f = freq * 2 ** (detune / 1200)
        out += np.sin(2 * np.pi * f * t) * np.exp(-t / 1.7)
        out += 0.45 * vel * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t / 0.55)
        out += 0.10 * vel * np.sin(2 * np.pi * 3 * f * t) * np.exp(-t / 0.25)
        out += 0.05 * np.sin(2 * np.pi * 7.1 * f * t) * np.exp(-t / 0.025)
    att = np.clip(t / 0.006, 0, 1)
    rel = np.clip((dur + 0.4 - t) / 0.4, 0, 1)  # key released after `dur`
    return out * att * (0.35 + 0.65 * rel) * vel * 0.5


def marimba(freq, vel):
    n = int(1.6 * SR)
    t = np.arange(n) / SR
    x = np.sin(2 * np.pi * freq * t) * np.exp(-t / 0.42)
    x += 0.22 * np.sin(2 * np.pi * 3.93 * freq * t) * np.exp(-t / 0.07)
    x += 0.06 * np.sin(2 * np.pi * 9.2 * freq * t) * np.exp(-t / 0.02)
    return x * np.clip(t / 0.003, 0, 1) * vel


def pluck(freq, vel, length=1.8):
    """Karplus–Strong string with a soft (low-passed) excitation: warm nylon-ish pluck."""
    N = max(2, int(round(SR / freq - 0.5)))  # the 2-tap average adds half a sample of delay
    n = int(length * SR)
    exc = np.zeros(n)
    exc[:N] = lfilter([0.5, 0.5], [1], rng.uniform(-1, 1, N))
    d = 0.996
    a = np.zeros(N + 2)
    a[0] = 1.0
    a[N] = -d / 2
    a[N + 1] = -d / 2
    y = lfilter([1.0], a, exc)
    y = lowpass(y, 3200)
    return y / (np.max(np.abs(y)) + 1e-9) * vel


def bass(freq, dur, vel):
    n = int((dur + 0.6) * SR)
    t = np.arange(n) / SR
    x = np.sin(2 * np.pi * freq * t) + 0.28 * np.sin(2 * np.pi * 2 * freq * t) + 0.08 * np.sin(2 * np.pi * 3 * freq * t)
    e = np.clip(t / 0.012, 0, 1) * np.exp(-t / 1.1) * np.clip((dur + 0.15 - t) / 0.15, 0, 1)
    return x * e * vel


def kick(vel):
    n = int(0.35 * SR)
    t = np.arange(n) / SR
    f = 46 + 70 * np.exp(-t / 0.03)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * np.exp(-t / 0.16) * vel


def brush(vel):
    n = int(0.25 * SR)
    t = np.arange(n) / SR
    x = bandpass(rng.normal(0, 1, n), 1400, 6000) * np.exp(-t / 0.09)
    return x * vel


def shaker(vel):
    n = int(0.08 * SR)
    t = np.arange(n) / SR
    x = highpass(rng.normal(0, 1, n), 6500) * np.clip(t / 0.006, 0, 1) * np.exp(-t / 0.025)
    return x * vel


# ------------------------------------------------------------------ arrangement

# Chords per bar of the 8-bar progression (F major): voicing (MIDI) and bass root.
PROG = [
    ([53, 57, 60, 64], 41),  # Fmaj7
    ([52, 55, 59, 62], 40),  # Em7
    ([50, 53, 57, 60], 38),  # Dm7
    ([55, 59, 60, 64], 36),  # Cmaj7
    ([53, 57, 58, 62], 34),  # Bbmaj7
    ([52, 55, 57, 60], 33),  # Am7
    ([53, 55, 58, 62], 31),  # Gm7
    ([53, 55, 58, 60], 36),  # C7sus4
]

# Marimba melody for bars 9–16: (bar, beat, midi, beats)
MELODY = [
    (8, 0, 81, 1), (8, 1.5, 84, 1), (8, 2.5, 81, 0.5), (8, 3, 79, 1),
    (9, 0, 79, 1.5), (9, 1.5, 76, 1), (9, 2.5, 74, 0.5), (9, 3, 76, 1),
    (10, 0, 77, 1), (10, 1, 81, 1), (10, 2, 84, 1.5), (10, 3.5, 81, 0.5),
    (11, 0, 79, 2), (11, 2, 76, 1), (11, 3, 79, 1),
    (12, 0, 77, 1), (12, 1, 74, 0.5), (12, 1.5, 77, 0.5), (12, 2, 81, 1.5), (12, 3.5, 79, 0.5),
    (13, 0, 76, 1.5), (13, 1.5, 72, 1), (13, 2.5, 76, 0.5), (13, 3, 79, 1),
    (14, 0, 77, 1), (14, 1, 74, 1), (14, 2, 77, 0.5), (14, 2.5, 79, 0.5), (14, 3, 81, 1),
    (15, 0, 79, 2), (15, 2.5, 77, 0.5), (15, 3, 76, 1),
]
# Sparser counter-melody for bars 17–24.
COUNTER = [
    (16, 0, 84, 2), (16, 2.5, 81, 1),
    (17, 0, 83, 2), (17, 2.5, 79, 1),
    (18, 0, 81, 2), (18, 2.5, 77, 1),
    (19, 0, 79, 2), (19, 2.5, 76, 1),
    (20, 0, 77, 1), (20, 1, 81, 1), (20, 2, 86, 2),
    (21, 0, 84, 2), (21, 2.5, 81, 0.5), (21, 3.5, 79, 0.5),
    (22, 0, 82, 1), (22, 1, 81, 1), (22, 2, 79, 1), (22, 3, 77, 1),
    (23, 0, 79, 3),
]


def swing(beat_pos):
    """Lazy 8th-note swing: off-beat 8ths land a little late."""
    whole = np.floor(beat_pos)
    frac = beat_pos - whole
    return whole + (0.58 if abs(frac - 0.5) < 1e-6 else frac)


def place(buf, start_s, sig, pan=0.0, gain=1.0):
    i = int(round(start_s * SR))
    if i >= buf.shape[1]:
        return
    sig = sig[: buf.shape[1] - i]
    left = np.cos((pan + 1) * np.pi / 4) * gain
    right = np.sin((pan + 1) * np.pi / 4) * gain
    buf[0, i : i + len(sig)] += sig * left
    buf[1, i : i + len(sig)] += sig * right


def render_music():
    n = int((LOOP + TAIL) * SR)
    dry = np.zeros((2, n))
    wet_send = np.zeros((2, n))  # instruments that get more reverb

    def at(bar, beat):
        return bar * BAR + swing(beat) * BEAT

    for bar in range(BARS):
        chord, root = PROG[bar % 8]
        section = bar // 8
        # Electric piano: beat 1, the "and" of 2, beat 4 (softer).
        for beat, vel, dur in ((0, 0.85, 1.6), (1.5, 0.42, 0.6), (3, 0.38, 0.9)):
            # The sus4 of each phrase's last bar resolves to C7 on beat 4.
            chord_now = [52, 55, 58, 60] if bar % 8 == 7 and beat == 3 else chord
            for k, m in enumerate(chord_now):
                sig = epiano(midi(m), dur * BEAT, vel * (0.9 if k else 1.0))
                place(dry, at(bar, beat) + k * 0.008, sig, pan=-0.15 + 0.1 * k, gain=0.15)
                place(wet_send, at(bar, beat) + k * 0.008, sig, pan=-0.15 + 0.1 * k, gain=0.10)
        # Bass: root on 1, fifth on 3, a passing note before the next bar sometimes.
        place(dry, at(bar, 0), bass(midi(root), 1.4 * BEAT, 0.9), gain=0.15)
        place(dry, at(bar, 2), bass(midi(root + 7), 1.2 * BEAT, 0.65), gain=0.15)
        if bar % 2 == 1:
            nxt = PROG[(bar + 1) % 8][1]
            place(dry, at(bar, 3.5), bass(midi(nxt + 1 if nxt + 1 != root else nxt - 1), 0.4 * BEAT, 0.45), gain=0.14)
        # Drums: brushes come in at bar 5, lighter on the final bar so the loop breathes.
        if bar >= 4:
            light = 0.6 if bar == BARS - 1 else 1.0
            place(dry, at(bar, 0), kick(0.9 * light), gain=0.2)
            place(dry, at(bar, 2.5), kick(0.55 * light), gain=0.2)
            for b in (1, 3):
                place(dry, at(bar, b), brush(0.7 * light), pan=0.2, gain=0.16)
                place(wet_send, at(bar, b), brush(0.7 * light), pan=0.2, gain=0.04)
            for e in range(8):
                beat = e * 0.5
                acc = 1.0 if e % 2 == 0 else 0.6
                place(dry, at(bar, beat), shaker(acc * light), pan=0.35, gain=0.12)
        # A soft bell on the off bars of the opening section, so it isn't only low chords.
        if section == 0 and bar % 2 == 1:
            sig = bell(midi(chord[-1] + 12), 1.4, 0.5)
            place(dry, at(bar, 2), sig, pan=0.25, gain=0.09)
            place(wet_send, at(bar, 2), sig, pan=0.25, gain=0.08)
        # Guitar arpeggio in the third section.
        if section == 2:
            notes = [m + 12 for m in chord]
            pattern = [0, 1, 2, 3, 2, 1, 3, 2]
            for e, idx in enumerate(pattern):
                sig = pluck(midi(notes[idx]), 0.55 if e % 2 == 0 else 0.4)
                place(dry, at(bar, e * 0.5), sig, pan=0.4, gain=0.16)
                place(wet_send, at(bar, e * 0.5), sig, pan=0.4, gain=0.06)

    for bar, beat, m, beats in MELODY + COUNTER:
        sig = marimba(midi(m), 0.8)
        place(dry, at(bar, beat), sig, pan=-0.3, gain=0.3)
        place(wet_send, at(bar, beat), sig, pan=-0.3, gain=0.10)

    # Reverb: decaying, low-passed noise impulse response (different per side for width).
    ir_len = int(2.4 * SR)
    t = np.arange(ir_len) / SR
    irs = [lowpass(rng.normal(0, 1, ir_len) * np.exp(-t / 0.55), 4500) for _ in range(2)]
    irs = [ir / np.sqrt(np.sum(ir**2)) for ir in irs]
    wet = np.stack([fftconvolve(wet_send[c] + 0.25 * dry[c], irs[c])[:n] for c in range(2)])
    mix = dry + 0.55 * wet

    # Warm master: gentle low-pass, soft saturation, normalise.
    mix = np.stack([lowpass(mix[c], 9000) for c in range(2)])
    mix = np.tanh(mix * 1.4) / 1.4
    mix /= np.max(np.abs(mix)) + 1e-9
    mix *= 10 ** (-1.5 / 20)
    return mix


# ------------------------------------------------------------------ sound effects

def sfx_click():
    """Soft, woody UI tick (~45 ms)."""
    n = int(0.045 * SR)
    t = np.arange(n) / SR
    x = 0.6 * np.sin(2 * np.pi * 1350 * t) * np.exp(-t / 0.009)
    x += 0.3 * np.sin(2 * np.pi * 2650 * t) * np.exp(-t / 0.005)
    x += 0.15 * bandpass(rng.normal(0, 1, n), 2000, 7000) * np.exp(-t / 0.002)
    return x * np.clip(t / 0.0008, 0, 1)


def bell(freq, dur, decay):
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = np.sin(2 * np.pi * freq * t) * np.exp(-t / decay)
    x += 0.45 * np.sin(2 * np.pi * freq * 2.76 * t) * np.exp(-t / (decay * 0.45))
    x += 0.2 * np.sin(2 * np.pi * freq * 5.4 * t) * np.exp(-t / (decay * 0.25))
    return x * np.clip(t / 0.002, 0, 1)


def mix_at(total_s, parts):
    out = np.zeros(int(total_s * SR))
    for start, sig, gain in parts:
        i = int(start * SR)
        seg = sig[: len(out) - i]
        out[i : i + len(seg)] += seg * gain
    return out


def sfx_cash():
    """'Cha-ching': a drawer rattle, two bright register bells and a few coins."""
    n = int(0.09 * SR)
    t = np.arange(n) / SR
    cha = bandpass(rng.normal(0, 1, n), 2500, 7500) * np.exp(-t / 0.025) * np.clip(t / 0.003, 0, 1)
    coins = []
    for k in range(4):
        f = rng.uniform(4200, 6200)
        coins.append((0.16 + k * 0.045 + rng.uniform(0, 0.02), bell(f, 0.25, 0.05), 0.18))
    return mix_at(0.95, [(0.0, cha, 0.5), (0.07, bell(2093, 0.85, 0.32), 0.5), (0.13, bell(2637, 0.8, 0.3), 0.42)] + coins)


def sfx_buy():
    """Soft two-note confirmation (supplies bought)."""
    return mix_at(0.45, [(0.0, marimba(midi(72), 0.9), 0.55), (0.08, marimba(midi(79), 0.9), 0.5)])


def sfx_coins():
    """Bigger spend (equipment, carts, staff, promotion): a short coin cascade."""
    parts = [(0.0, marimba(midi(60), 0.8), 0.35)]
    for k in range(7):
        f = rng.uniform(3600, 6400)
        parts.append((0.02 + k * 0.035 + rng.uniform(0, 0.015), bell(f, 0.3, 0.06), 0.16))
    parts.append((0.06, bell(1568, 0.6, 0.22), 0.25))
    return mix_at(0.7, parts)


def sfx_error():
    """Low, soft two-tone 'nope' (not enough money, not allowed)."""
    def tone(f, dur):
        n = int(dur * SR)
        t = np.arange(n) / SR
        x = np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * 2 * f * t) + 0.12 * np.sin(2 * np.pi * 3 * f * t)
        return lowpass(x, 1800) * np.clip(t / 0.01, 0, 1) * np.exp(-t / 0.12)
    return mix_at(0.4, [(0.0, tone(330, 0.2), 0.45), (0.11, tone(262, 0.25), 0.45)])


def sfx_unlock():
    """Rising chime arpeggio (new location, cart, goal)."""
    notes = [72, 76, 79, 84]
    parts = [(i * 0.085, bell(midi(m), 1.1, 0.45), 0.32 - i * 0.02) for i, m in enumerate(notes)]
    parts.append((0.0, marimba(midi(60), 0.7), 0.25))
    return mix_at(1.3, parts)


def sfx_day_start():
    """Shop-door bell: ding-dong."""
    return mix_at(1.4, [(0.0, bell(midi(81), 1.2, 0.5), 0.38), (0.22, bell(midi(76), 1.2, 0.55), 0.38)])


def sfx_day_end():
    """Gentle descending cadence for the end-of-day summary."""
    parts = [(0.0, marimba(midi(79), 0.8), 0.5), (0.16, marimba(midi(76), 0.8), 0.5), (0.32, marimba(midi(72), 0.8), 0.5)]
    pad = sum(epiano(midi(m), 0.6, 0.6)[: int(1.4 * SR)] for m in (53, 57, 60, 64))
    parts.append((0.32, pad, 0.25))
    return mix_at(1.6, parts)


def sfx_low_stock():
    """Soft double beep (stock running low or out)."""
    def beep():
        n = int(0.11 * SR)
        t = np.arange(n) / SR
        return np.sin(2 * np.pi * 880 * t) * np.clip(t / 0.005, 0, 1) * np.exp(-t / 0.05)
    return mix_at(0.35, [(0.0, beep(), 0.35), (0.15, beep(), 0.35)])


# ------------------------------------------------------------------ output

def write_wav(path, x):
    x = np.asarray(x, dtype=np.float64)
    peak = np.max(np.abs(x)) + 1e-9
    if peak > 0.98:
        x = x / peak * 0.98
    data = (x * 32767).astype(np.int16)
    if data.ndim == 2:
        data = data.T
    wavfile.write(path, SR, data)


def main():
    os.makedirs(OUT, exist_ok=True)
    sfx = {
        'click': sfx_click(),
        'cash': sfx_cash(),
        'buy': sfx_buy(),
        'coins': sfx_coins(),
        'error': sfx_error(),
        'unlock': sfx_unlock(),
        'day-start': sfx_day_start(),
        'day-end': sfx_day_end(),
        'low-stock': sfx_low_stock(),
    }
    for name, x in sfx.items():
        # Each effect peaks at the same level; the game sets their relative loudness.
        x = x / (np.max(np.abs(x)) + 1e-9) * 0.9
        write_wav(os.path.join(OUT, f'{name}.wav'), x)
        print(f'sfx  {name:10s} {len(x) / SR:5.2f}s')

    music = render_music()
    tmp = os.path.join(OUT, '_music.wav')
    write_wav(tmp, music)
    mp3 = os.path.join(OUT, 'music-teh-sore.mp3')
    subprocess.run(['lame', '--quiet', '-b', '128', '-q', '2', tmp, mp3], check=True)
    os.remove(tmp)
    print(f'music {LOOP:.3f}s loop + {TAIL:.1f}s tail -> {os.path.getsize(mp3) / 1e6:.2f} MB')


if __name__ == '__main__':
    main()
