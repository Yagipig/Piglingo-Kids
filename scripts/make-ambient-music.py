"""Sinh nhạc nền 'khu vườn' cho Piglingo Kids: pad hợp âm êm + giai điệu
ngũ cung chậm, vòng lặp liền mạch (~48 giây), âm lượng nhỏ.
Chạy: python3 make_ambient.py  -> ambient-garden.wav, rồi ffmpeg -> .mp3
"""
import math
import struct
import wave

SR = 22050
DURATION = 48.0  # giây, chia hết cho vòng hợp âm 4 x 12s? dùng 4 hợp âm x 12 giây
N = int(SR * DURATION)

# Hợp âm (Hz): Am7, Fmaj7, Cmaj7, G6 — mỗi hợp âm 12 giây, crossfade ở biên.
CHORDS = [
    [110.00, 164.81, 261.63, 493.88],  # A2 E3 C4 B4 (Am add)
    [87.31, 174.61, 220.00, 329.63],   # F2 F3 A3 E4
    [130.81, 196.00, 261.63, 493.88],  # C3 G3 C4 B4
    [98.00, 196.00, 246.94, 587.33],   # G2 G3 B3 D5
]
CHORD_LEN = DURATION / len(CHORDS)

# Giai điệu ngũ cung A minor pentatonic, thưa và chậm (nốt bắt đầu tại giây, tần số).
MELODY = [
    (1.0, 440.00), (4.0, 523.25), (7.0, 659.25), (10.0, 523.25),
    (13.0, 349.23), (16.0, 440.00), (19.0, 523.25), (22.0, 440.00),
    (25.0, 392.00), (28.0, 523.25), (31.0, 587.33), (34.0, 523.25),
    (37.0, 493.88), (40.0, 587.33), (43.0, 659.25), (46.0, 523.25),
]

samples = [0.0] * N

def add_tone(start, freq, dur, vol, attack=0.4, release=1.2, harmonic=0.3):
    s0 = int(start * SR)
    length = int(dur * SR)
    for i in range(length):
        idx = s0 + i
        if idx >= N:
            break
        t = i / SR
        env = min(1.0, t / attack) * min(1.0, max(0.0, (dur - t) / release))
        env = env * env * (3 - 2 * env)  # smoothstep
        v = math.sin(2 * math.pi * freq * t) + harmonic * math.sin(4 * math.pi * freq * t)
        samples[idx] += vol * env * v / (1 + harmonic)

# Pad: mỗi hợp âm phát toàn bộ đoạn của nó, fade in/out 2 giây ở hai đầu đoạn.
for ci, chord in enumerate(CHORDS):
    start = ci * CHORD_LEN
    for f in chord:
        add_tone(start, f, CHORD_LEN, 0.055, attack=2.0, release=2.0, harmonic=0.15)
    # nốt bass trầm riêng, êm hơn
    add_tone(start, chord[0] / 2, CHORD_LEN, 0.04, attack=2.0, release=2.0, harmonic=0.0)

# Giai điệu chính + tiếng vọng octave nhẹ.
for start, f in MELODY:
    add_tone(start, f, 2.8, 0.075, attack=0.05, release=1.6, harmonic=0.2)
    add_tone(start + 0.02, f * 2, 1.8, 0.018, attack=0.05, release=1.2, harmonic=0.0)

# Fade vòng lặp: 1.5 giây đầu/cuối để loop không bị "cộc".
fade = int(1.5 * SR)
for i in range(fade):
    g = i / fade
    samples[i] *= g
    samples[N - 1 - i] *= g

# Chuẩn hoá về biên độ nhỏ (nhạc nền).
peak = max(abs(s) for s in samples) or 1.0
scale = 0.5 / peak
frames = b"".join(
    struct.pack("<h", int(max(-1.0, min(1.0, s * scale)) * 32767)) for s in samples
)
with wave.open("/tmp/ambient-garden.wav", "wb") as w:
    w.setnchannels(1)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(frames)
print("wav ok", DURATION, "s")
