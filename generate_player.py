from PIL import Image
import math
import os

# ============================================================
# IMAGE SETTINGS
# ============================================================

WIDTH = 64
HEIGHT = 64

CENTER_X = WIDTH / 2
CENTER_Y = HEIGHT / 2
RADIUS = 28

# ============================================================
# CREATE IMAGE
# ============================================================

image = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
pixels = image.load()

for y in range(HEIGHT):
    for x in range(WIDTH):

        dx = x - CENTER_X
        dy = y - CENTER_Y

        distance = math.sqrt(dx * dx + dy * dy)

        if distance <= RADIUS:

            # Normalize distance from center to edge
            t = distance / RADIUS

            # Black -> White -> Black
            if t <= 0.5:
                brightness = int(255 * (t * 2))
            else:
                brightness = int(255 * (2 - t * 2))

            pixels[x, y] = (
                255-brightness,
                255-brightness,
                255-brightness,
                255
            )

# ============================================================
# SAVE PNG
# ============================================================

output_path = os.path.join(
    os.path.dirname(__file__),
    "Player.png"
)

image.save(output_path)

print(f"PNG saved: {output_path}")