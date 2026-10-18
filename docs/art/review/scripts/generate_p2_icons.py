"""Draw the Bitetown navigation, season, weather and skill icon family."""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[4]
INK = (37, 49, 59, 255)
GOLD = (223, 159, 67, 255)
GOLD_LIGHT = (248, 218, 154, 255)
PAPER = (242, 220, 177, 255)
TEAL = (77, 143, 152, 255)
BLUE = (73, 112, 145, 255)
SKY = (153, 207, 218, 255)
GREEN = (101, 143, 82, 255)
PINK = (208, 112, 122, 255)
RED = (178, 83, 66, 255)
WHITE = (255, 241, 207, 255)


def canvas(size: int) -> tuple[Image.Image, ImageDraw.ImageDraw]:
    image = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    return image, ImageDraw.Draw(image)


def rectangle(draw: ImageDraw.ImageDraw, box, fill, outline=None):
    draw.rectangle(box, fill=fill, outline=outline)


def polygon(draw: ImageDraw.ImageDraw, points, fill, outline=INK):
    draw.polygon(points, fill=fill, outline=outline)


def clock(size: int = 32) -> Image.Image:
    im, d = canvas(size)
    d.ellipse((2, 2, 29, 29), fill=INK)
    d.ellipse((4, 4, 27, 27), fill=GOLD)
    d.ellipse((6, 6, 25, 25), fill=PAPER)
    for p in ((15, 7), (23, 15), (15, 23), (7, 15)):
        d.rectangle((p[0], p[1], p[0] + 1, p[1] + 1), fill=INK)
    d.line((16, 16, 16, 10), fill=INK, width=2)
    d.line((16, 16, 21, 18), fill=INK, width=2)
    d.rectangle((15, 15, 17, 17), fill=RED)
    d.rectangle((11, 1, 20, 3), fill=GOLD, outline=INK)
    return im


def weather_clear() -> Image.Image:
    im, d = canvas(16)
    d.rectangle((6, 1, 9, 2), fill=GOLD_LIGHT)
    d.rectangle((6, 13, 9, 14), fill=GOLD)
    d.rectangle((1, 6, 2, 9), fill=GOLD)
    d.rectangle((13, 6, 14, 9), fill=GOLD)
    for p in ((3, 3), (11, 3), (3, 11), (11, 11)):
        d.rectangle((p[0], p[1], p[0] + 1, p[1] + 1), fill=GOLD)
    d.rectangle((5, 4, 10, 11), fill=GOLD, outline=INK)
    d.rectangle((6, 5, 9, 10), fill=GOLD_LIGHT)
    return im


def weather_rain() -> Image.Image:
    im, d = canvas(16)
    d.rectangle((4, 4, 11, 9), fill=BLUE, outline=INK)
    d.rectangle((2, 6, 13, 9), fill=BLUE, outline=INK)
    d.rectangle((4, 5, 10, 6), fill=SKY)
    for x in (4, 8, 12):
        d.line((x, 11, x - 1, 14), fill=SKY, width=2)
    return im


def weather_snow() -> Image.Image:
    im, d = canvas(16)
    d.rectangle((4, 3, 11, 8), fill=BLUE, outline=INK)
    d.rectangle((2, 5, 13, 8), fill=BLUE, outline=INK)
    d.rectangle((5, 4, 10, 5), fill=SKY)
    for x in (4, 8, 12):
        d.rectangle((x, 11, x + 1, 12), fill=WHITE)
        d.rectangle((x - 1, 10, x + 2, 13), outline=SKY)
    return im


def season_spring() -> Image.Image:
    im, d = canvas(16)
    d.line((8, 14, 8, 7), fill=GREEN, width=2)
    polygon(d, [(8, 10), (3, 7), (4, 5), (8, 8)], GREEN)
    polygon(d, [(8, 11), (12, 8), (13, 6), (9, 8)], TEAL)
    d.rectangle((7, 4, 9, 6), fill=PINK, outline=INK)
    d.rectangle((6, 5, 10, 5), fill=GOLD_LIGHT)
    d.rectangle((5, 14, 11, 15), fill=INK)
    return im


def season_summer() -> Image.Image:
    im, d = canvas(16)
    d.rectangle((5, 1, 10, 2), fill=GOLD)
    d.rectangle((6, 3, 9, 10), fill=GOLD, outline=INK)
    d.rectangle((1, 5, 3, 8), fill=GOLD)
    d.rectangle((12, 5, 14, 8), fill=GOLD)
    d.line((4, 14, 8, 8), fill=GREEN, width=2)
    polygon(d, [(5, 12), (2, 10), (3, 8), (7, 11)], GREEN)
    polygon(d, [(7, 11), (10, 8), (13, 9), (9, 13)], TEAL)
    return im


def season_autumn() -> Image.Image:
    im, d = canvas(16)
    polygon(d, [(8, 1), (10, 4), (14, 3), (13, 7), (15, 9), (11, 10), (10, 14), (7, 11), (3, 13), (4, 9), (1, 7), (5, 6), (5, 3)], RED)
    d.line((8, 4, 8, 14), fill=GOLD_LIGHT, width=1)
    d.line((8, 8, 4, 6), fill=GOLD_LIGHT, width=1)
    d.line((8, 9, 12, 6), fill=GOLD_LIGHT, width=1)
    return im


def season_winter() -> Image.Image:
    im, d = canvas(16)
    d.line((8, 1, 8, 14), fill=SKY, width=2)
    d.line((2, 4, 14, 11), fill=SKY, width=2)
    d.line((2, 11, 14, 4), fill=SKY, width=2)
    for x, y in ((8, 1), (8, 13), (2, 4), (14, 11), (2, 11), (14, 4)):
        d.rectangle((x - 1, y - 1, x + 1, y + 1), fill=WHITE)
    d.rectangle((7, 7, 9, 9), fill=GOLD_LIGHT)
    return im


def skill_card() -> Image.Image:
    im, d = canvas(32)
    rectangle(d, (6, 3, 25, 28), PAPER, INK)
    rectangle(d, (8, 5, 23, 7), GOLD)
    for y, xs in ((10, (10, 16, 22)), (14, (10, 13, 19, 22)), (18, (10, 16, 22)), (22, (10, 13, 19, 22))):
        for x in xs:
            d.rectangle((x, y, x + 1, y + 2), fill=INK)
    rectangle(d, (4, 8, 5, 24), GOLD)
    return im


def skill_search() -> Image.Image:
    im, d = canvas(32)
    rectangle(d, (3, 4, 20, 22), INK)
    for y in range(6, 22, 4):
        for x in range(5, 20, 4):
            color = PAPER if ((x + y) // 4) % 2 else BLUE
            rectangle(d, (x, y, x + 3, y + 3), color)
    d.ellipse((15, 13, 26, 24), fill=GOLD_LIGHT, outline=INK, width=2)
    d.ellipse((18, 16, 23, 21), fill=TEAL, outline=INK)
    d.line((24, 23, 30, 29), fill=INK, width=4)
    d.line((25, 23, 29, 27), fill=GOLD, width=2)
    return im


def skill_machine_learning() -> Image.Image:
    im, d = canvas(32)
    polygon(d, [(5, 8), (22, 8), (27, 13), (27, 27), (5, 27)], PAPER)
    polygon(d, [(3, 5), (20, 5), (25, 10), (25, 24), (3, 24)], WHITE)
    rectangle(d, (2, 4, 19, 21), WHITE, INK)
    rectangle(d, (5, 7, 16, 8), BLUE)
    rectangle(d, (5, 11, 9, 15), RED)
    rectangle(d, (11, 11, 16, 12), GREEN)
    rectangle(d, (11, 14, 16, 15), GOLD)
    rectangle(d, (5, 17, 16, 18), TEAL)
    for x in (5, 11, 16):
        d.rectangle((x, 20, x + 1, 22), fill=GOLD)
    return im


def skill_deep_learning() -> Image.Image:
    im, d = canvas(32)
    layers = [[(5, 8), (5, 16), (5, 24)], [(13, 5), (13, 11), (13, 19), (13, 27)], [(22, 8), (22, 16), (22, 24)], [(28, 16)]]
    for a, b in zip(layers, layers[1:]):
        for x1, y1 in a:
            for x2, y2 in b:
                d.line((x1, y1, x2, y2), fill=BLUE, width=1)
    colors = (GOLD, TEAL, GREEN, RED)
    for layer_index, layer in enumerate(layers):
        for index, (x, y) in enumerate(layer):
            r = 2 if layer_index in (0, 3) else 2
            d.ellipse((x - r, y - r, x + r, y + r), fill=colors[(index + layer_index) % len(colors)], outline=INK)
            d.point((x, y), fill=WHITE)
    return im


def skill_generative() -> Image.Image:
    im, d = canvas(32)
    polygon(d, [(3, 5), (27, 5), (27, 22), (17, 22), (11, 29), (11, 22), (3, 22)], TEAL)
    rectangle(d, (6, 8, 24, 19), PAPER, INK)
    polygon(d, [(15, 9), (17, 13), (21, 14), (17, 16), (15, 20), (13, 16), (9, 14), (13, 13)], GOLD)
    d.rectangle((5, 7, 8, 8), fill=WHITE)
    d.rectangle((22, 18, 25, 20), fill=BLUE)
    return im


def skill_responsibility() -> Image.Image:
    im, d = canvas(32)
    polygon(d, [(15, 3), (27, 7), (26, 18), (22, 25), (15, 29), (8, 25), (4, 18), (3, 7)], BLUE)
    polygon(d, [(15, 6), (23, 9), (22, 18), (19, 23), (15, 26), (10, 23), (7, 18), (7, 9)], TEAL, INK)
    d.line((10, 16, 14, 20, 21, 12), fill=WHITE, width=2)
    d.ellipse((18, 17, 26, 25), fill=PAPER, outline=INK, width=2)
    d.ellipse((20, 19, 24, 23), outline=GOLD, width=1)
    d.line((24, 24, 30, 30), fill=INK, width=4)
    d.line((25, 25, 29, 29), fill=GOLD, width=2)
    return im


def save(image: Image.Image, relative: str) -> None:
    target = ROOT / "public/art/pixel" / relative
    source = ROOT / "docs/art/review/sources" / f"{target.stem}-source.png"
    target.parent.mkdir(parents=True, exist_ok=True)
    source.parent.mkdir(parents=True, exist_ok=True)
    image.save(target, optimize=True)
    image.save(source, optimize=True)


def main() -> None:
    ui = "ui/"
    icons = {
        "ui-clock.png": clock(32),
        "ui-clock-small.png": clock(32).resize((16, 16), Image.Resampling.NEAREST),
        "weather-clear.png": weather_clear(),
        "weather-rain.png": weather_rain(),
        "weather-snow.png": weather_snow(),
        "season-spring.png": season_spring(),
        "season-summer.png": season_summer(),
        "season-autumn.png": season_autumn(),
        "season-winter.png": season_winter(),
    }
    for name, image in icons.items():
        save(image, ui + name)

    skills = {
        "skill-ai-basics.png": skill_card(),
        "skill-search-reasoning.png": skill_search(),
        "skill-machine-learning.png": skill_machine_learning(),
        "skill-deep-learning.png": skill_deep_learning(),
        "skill-generative-ai.png": skill_generative(),
        "skill-ai-responsibility.png": skill_responsibility(),
    }
    for name, image in skills.items():
        save(image, "skills/" + name)

    all_icons = list(icons.items()) + list(skills.items())
    columns, cell = 5, 80
    rows = (len(all_icons) + columns - 1) // columns
    contact = Image.new("RGB", (columns * cell, rows * cell), (34, 39, 48))
    draw = ImageDraw.Draw(contact)
    for index, (name, icon) in enumerate(all_icons):
        x, y = (index % columns) * cell, (index // columns) * cell
        scale = 3 if icon.width == 32 else 5
        shown = icon.resize((icon.width * scale, icon.height * scale), Image.Resampling.NEAREST)
        contact.paste(shown, (x + (cell - shown.width) // 2, y + 5), shown)
        draw.text((x + 3, y + 62), name.replace(".png", ""), fill=(255, 255, 255))
    contact.save(ROOT / "docs/art/review/p2-icons-contact.png")


if __name__ == "__main__":
    main()
