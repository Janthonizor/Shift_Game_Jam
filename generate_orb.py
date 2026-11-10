from PIL import Image
import math

# ============================================================
# SETTINGS
# ============================================================

SIZE = 64
OUTPUT_FILE = "orb.png"

RING_COUNT = 1

CENTER_BRIGHTNESS = 255
EDGE_BRIGHTNESS = 0

# ============================================================
# GENERATE ORB
# ============================================================

image = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
pixels = image.load()

center = (SIZE - 1) / 2
radius = SIZE / 2

for y in range(SIZE):
    for x in range(SIZE):

        dx = x - center
        dy = y - center

        distance = math.sqrt(dx * dx + dy * dy)
        normalized = distance / radius

        if normalized <= 1.0:

            # Full sine wave mapped along radius
            wave = math.sin(normalized * RING_COUNT * math.pi) ** 2

            brightness = int(
                EDGE_BRIGHTNESS
                + wave * (CENTER_BRIGHTNESS - EDGE_BRIGHTNESS)
            )

            # Grayscale
            value = int(brightness)

            pixels[x, y] = (
                value,
                value,
                value,
                255
            )

# ============================================================
# SAVE
# ============================================================

image.save(OUTPUT_FILE)

print(f"Created {OUTPUT_FILE}")