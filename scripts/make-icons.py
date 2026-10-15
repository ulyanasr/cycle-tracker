#!/usr/bin/env python3
"""
Иконки приложения: индиго-фон и кольцо цикла, как на приветствии.
Коралл — месячные (дни 1–5), светлый индиго — фертильное окно (9–15),
лайм — овуляция (14-й день). Фон на всю площадь: iOS сам скругляет углы,
а для Android (maskable) кольцо целиком в безопасной зоне 80%.

Запуск из корня проекта:  python3 scripts/make-icons.py
"""
import math
import struct
import zlib

INDIGO = (0x4B, 0x4F, 0xD1)
CORAL = (0xF2, 0x46, 0x3A)
LAVENDER = (0xC9, 0xD0, 0xFA)
LIME = (0xDD, 0xF2, 0x47)
DAYS = 28


def blend(base, color, a):
    return tuple(base[i] * (1 - a) + color[i] * a for i in range(3))


def coverage(sd):
    """Доля пикселя внутри фигуры по расстоянию со знаком (сглаживание в 1px)."""
    return max(0.0, min(1.0, 0.5 - sd))


def render(size):
    c = size / 2
    r = size * 0.29  # радиус кольца по центру линии
    w = size * 0.10  # толщина линии
    half = w / 2

    def day_angle(day):
        return (day / DAYS) * 2 * math.pi  # 0 — сверху, по часовой

    def point(angle):
        return c + r * math.sin(angle), c - r * math.cos(angle)

    def arc_sd(x, y, d, theta, first, last):
        """Расстояние до дуги со скруглёнными концами (дни first…last)."""
        a0, a1 = day_angle(first - 1), day_angle(last)
        if a0 <= theta <= a1:
            return abs(d - r) - half
        ends = [point(a0), point(a1)]
        return min(math.hypot(x - ex, y - ey) for ex, ey in ends) - half

    ox, oy = point(day_angle(13.5))  # центр 14-го дня

    rows = []
    for py in range(size):
        row = bytearray([0])
        for px in range(size):
            x, y = px + 0.5, py + 0.5
            dx, dy = x - c, y - c
            d = math.hypot(dx, dy)
            theta = math.atan2(dx, -dy) % (2 * math.pi)

            col = INDIGO
            col = blend(col, (255, 255, 255), 0.18 * coverage(abs(d - r) - half))
            col = blend(col, LAVENDER, coverage(arc_sd(x, y, d, theta, 9, 15)))
            col = blend(col, CORAL, coverage(arc_sd(x, y, d, theta, 1, 5)))
            col = blend(col, LIME, coverage(math.hypot(x - ox, y - oy) - half * 1.05))
            row += bytes(int(round(v)) for v in col)
        rows.append(bytes(row))
    return b"".join(rows)


def write_png(path, size):
    raw = render(size)

    def chunk(tag, data):
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)

    png = b"\x89PNG\r\n\x1a\n"
    png += chunk(b"IHDR", struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0))
    png += chunk(b"IDAT", zlib.compress(raw, 9))
    png += chunk(b"IEND", b"")
    with open(path, "wb") as f:
        f.write(png)
    print(f"{path}: {size}×{size}")


if __name__ == "__main__":
    write_png("public/apple-touch-icon.png", 180)
    write_png("public/icon-192.png", 192)
    write_png("public/icon-512.png", 512)
