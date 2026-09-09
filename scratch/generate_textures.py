import os
import math
from PIL import Image, ImageDraw

tex_dir = '/Users/bert/dev/barnsimulation/scratch/textures'
os.makedirs(tex_dir, exist_ok=True)

# 1. Wood Plank Texture (Swedish Falu Red)
w_img = Image.new('RGB', (512, 512), '#8c241c')
w_draw = ImageDraw.Draw(w_img)
plank_h = 32
for y in range(0, 512, plank_h):
    shade = int(140 + (y % 64) * 0.3)
    w_draw.rectangle([0, y, 512, y + plank_h - 2], fill=(shade, 36, 28))
    # Plank seam
    w_draw.line([(0, y + plank_h - 1), (512, y + plank_h - 1)], fill=(50, 15, 10), width=2)
    # Subtle wood grain stripes
    for k in range(4):
        gy = y + k * 7 + 3
        w_draw.line([(0, gy), (512, gy)], fill=(shade - 10, 30, 24), width=1)
w_img.save(f'{tex_dir}/barn_wood_diffuse.png')

# 2. Corrugated Metal Roof (Anthracite Ribbed)
r_img = Image.new('RGB', (512, 512), '#252930')
r_draw = ImageDraw.Draw(r_img)
rib_w = 16
for x in range(0, 512, rib_w):
    # Sinusoidal ribbing highlight and shadow
    r_draw.rectangle([x, 0, x + 8, 512], fill=(55, 60, 70))
    r_draw.rectangle([x + 8, 0, x + 16, 512], fill=(28, 32, 38))
    r_draw.line([(x + 4, 0), (x + 4, 512)], fill=(75, 82, 95), width=1)
r_img.save(f'{tex_dir}/roof_metal_diffuse.png')

# 3. Sandwich Panel (Off-white / Light Slate Panel)
p_img = Image.new('RGB', (512, 512), '#dbe1e6')
p_draw = ImageDraw.Draw(p_img)
panel_h = 64
for y in range(0, 512, panel_h):
    p_draw.line([(0, y), (512, y)], fill=(150, 160, 170), width=2)
    p_draw.line([(0, y+1), (512, y+1)], fill=(250, 252, 255), width=1)
p_img.save(f'{tex_dir}/sandwich_panel_diffuse.png')

# 4. Dutch Brick (Metselwerk)
b_img = Image.new('RGB', (512, 512), '#5c5855') # Mortar
b_draw = ImageDraw.Draw(b_img)
brick_h = 24
brick_w = 64
row = 0
for y in range(0, 512, brick_h):
    offset = (brick_w // 2) if (row % 2 == 1) else 0
    for x in range(-offset, 512 + brick_w, brick_w):
        # Slight variation in brick color
        col_var = (x * 17 + y * 23) % 25
        r = 150 + col_var
        g = 65 + col_var // 2
        b = 50 + col_var // 3
        b_draw.rectangle([x + 2, y + 2, x + brick_w - 2, y + brick_h - 2], fill=(r, g, b))
    row += 1
b_img.save(f'{tex_dir}/brick_diffuse.png')

# 5. Cobblestone / Paving Road
c_img = Image.new('RGB', (512, 512), '#45474a')
c_draw = ImageDraw.Draw(c_img)
stone_s = 32
for y in range(0, 512, stone_s):
    for x in range(0, 512, stone_s):
        v = ((x * 31 + y * 47) % 30) - 15
        base_c = 85 + v
        c_draw.rectangle([x + 2, y + 2, x + stone_s - 2, y + stone_s - 2], fill=(base_c, base_c + 2, base_c + 4))
c_img.save(f'{tex_dir}/paving_diffuse.png')

# 6. Silo Galvanized Corrugated Metal
s_img = Image.new('RGB', (512, 512), '#c8cdd4')
s_draw = ImageDraw.Draw(s_img)
for y in range(0, 512, 16):
    s_draw.rectangle([0, y, 512, y + 8], fill=(225, 230, 238))
    s_draw.rectangle([0, y + 8, 512, y + 16], fill=(175, 182, 192))
    s_draw.line([(0, y + 4), (512, y + 4)], fill=(245, 248, 255), width=1)
# 7. Meadow Grass (Lush Dutch Pasture)
g_img = Image.new('RGB', (512, 512), '#3a7d28')
g_draw = ImageDraw.Draw(g_img)
for y in range(0, 512, 4):
    for x in range(0, 512, 4):
        # Organic green variation
        noise = (x * 47 + y * 73 + (x ^ y) * 19) % 35
        gr = 42 + (noise // 3)
        gg = 110 + noise
        gb = 30 + (noise // 4)
        g_draw.rectangle([x, y, x + 4, y + 4], fill=(gr, gg, gb))
# Add subtle grassy tufts
for i in range(200):
    tx = (i * 137) % 500
    ty = (i * 211) % 500
    g_draw.line([(tx, ty), (tx + 2, ty - 6)], fill=(55, 145, 38), width=2)
    g_draw.line([(tx, ty), (tx - 2, ty - 5)], fill=(32, 95, 22), width=1)
g_img.save(f'{tex_dir}/grass_diffuse.png')

# 8. Water Ditch / Canal
w_can_img = Image.new('RGB', (512, 512), '#1a4968')
w_can_draw = ImageDraw.Draw(w_can_img)
for y in range(0, 512, 16):
    wave_offset = int(math.sin(y * 0.1) * 8)
    w_can_draw.rectangle([0, y, 512, y + 8], fill=(22, 75, 108))
    w_can_draw.rectangle([0, y + 8, 512, y + 16], fill=(16, 55, 82))
    w_can_draw.line([(0, y + wave_offset), (512, y + wave_offset)], fill=(40, 110, 150), width=1)
w_can_img.save(f'{tex_dir}/water_diffuse.png')

# 9. Clean Barn Concrete Floor
conc_img = Image.new('RGB', (512, 512), '#9a9ea3')
conc_draw = ImageDraw.Draw(conc_img)
slab_s = 64
for y in range(0, 512, slab_s):
    for x in range(0, 512, slab_s):
        v = ((x * 19 + y * 29) % 16) - 8
        c = 155 + v
        conc_draw.rectangle([x + 1, y + 1, x + slab_s - 1, y + slab_s - 1], fill=(c, c, c + 2))
        conc_draw.line([(x, y), (x + slab_s, y)], fill=(120, 122, 126), width=1)
        conc_draw.line([(x, y), (x, y + slab_s)], fill=(120, 122, 126), width=1)
conc_img.save(f'{tex_dir}/concrete_diffuse.png')

print("All textures created in", tex_dir)
