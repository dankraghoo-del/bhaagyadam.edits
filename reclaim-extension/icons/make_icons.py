#!/usr/bin/env python3
"""Generate Reclaim toolbar icons (no external deps).

Draws a rounded-square badge with a vertical gradient and a white "pause"
glyph — stop the scroll. Supersampled 4x then box-downsampled for smooth edges.
"""
import struct, zlib, os

SS = 4  # supersample factor

def lerp(a, b, t):
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))

def render(size):
    W = H = size * SS
    top = (0x6f, 0x9a, 0xff)     # gradient top
    bot = (0x36, 0x60, 0xe6)     # gradient bottom
    white = (255, 255, 255)
    px = [[(11, 18, 32, 0)] * W for _ in range(H)]  # transparent bg (RGBA)

    radius = W * 0.24
    # pause bars geometry
    bar_w = W * 0.16
    bar_h = H * 0.42
    gap = W * 0.12
    cx, cy = W / 2, H / 2
    left_x0 = cx - gap / 2 - bar_w
    left_x1 = cx - gap / 2
    right_x0 = cx + gap / 2
    right_x1 = cx + gap / 2 + bar_w
    bar_y0 = cy - bar_h / 2
    bar_y1 = cy + bar_h / 2
    bar_r = bar_w * 0.35

    def in_rounded(x, y, x0, y0, x1, y1, r):
        if x < x0 or x > x1 or y < y0 or y > y1:
            return False
        # Clamp the point into the inner rectangle, then measure distance to the
        # clamp — the classic rounded-rect signed-distance test.
        clx = min(max(x, x0 + r), x1 - r)
        cly = min(max(y, y0 + r), y1 - r)
        return (x - clx) ** 2 + (y - cly) ** 2 <= r * r

    for y in range(H):
        t = y / (H - 1)
        gcol = lerp(top, bot, t)
        for x in range(W):
            if in_rounded(x, y, 0, 0, W - 1, H - 1, radius):
                col = gcol
                # pause bars
                if in_rounded(x, y, left_x0, bar_y0, left_x1, bar_y1, bar_r) or \
                   in_rounded(x, y, right_x0, bar_y0, right_x1, bar_y1, bar_r):
                    col = white
                px[y][x] = (col[0], col[1], col[2], 255)

    # box downsample to target size
    out = []
    for oy in range(size):
        row = bytearray()
        row.append(0)  # PNG filter type 0
        for ox in range(size):
            r = g = b = a = 0
            for dy in range(SS):
                for dx in range(SS):
                    pr, pg, pb, pa = px[oy * SS + dy][ox * SS + dx]
                    r += pr; g += pg; b += pb; a += pa
            n = SS * SS
            row += bytes((r // n, g // n, b // n, a // n))
        out.append(bytes(row))
    return b"".join(out)

def write_png(path, size):
    raw = render(size)
    def chunk(tag, data):
        c = tag + data
        return struct.pack(">I", len(data)) + c + struct.pack(">I", zlib.crc32(c) & 0xffffffff)
    sig = b"\x89PNG\r\n\x1a\n"
    ihdr = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)  # RGBA
    idat = zlib.compress(raw, 9)
    with open(path, "wb") as f:
        f.write(sig + chunk(b"IHDR", ihdr) + chunk(b"IDAT", idat) + chunk(b"IEND", b""))
    print("wrote", path, size)

here = os.path.dirname(os.path.abspath(__file__))
for s in (16, 32, 48, 128):
    write_png(os.path.join(here, f"icon{s}.png"), s)
