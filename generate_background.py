from PIL import Image, ImageDraw, ImageFilter

WIDTH = 1000
HEIGHT = 1000

BACKGROUND_COLOR = (0, 0, 0)
GRID_COLOR = (150, 150, 150)

GRID_SPACING = 50
LINE_WIDTH = 7
BLUR_RADIUS = 3

OUTPUT_FILE = "grid_background.png"

# Create background
image = Image.new("RGB", (WIDTH, HEIGHT), BACKGROUND_COLOR)
draw = ImageDraw.Draw(image)

# Draw grid
for x in range(0, WIDTH, GRID_SPACING):
    draw.line([(x, 0), (x, HEIGHT)], fill=GRID_COLOR, width=LINE_WIDTH)

for y in range(0, HEIGHT, GRID_SPACING):
    draw.line([(0, y), (WIDTH, y)], fill=GRID_COLOR, width=LINE_WIDTH)

# Apply blur
image = image.filter(ImageFilter.GaussianBlur(radius=BLUR_RADIUS))

# Save
image.save(OUTPUT_FILE)

print(f"Saved {OUTPUT_FILE}")