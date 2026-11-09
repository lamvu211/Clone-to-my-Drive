import os
from PIL import Image, ImageFilter, ImageDraw

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sc_dir = os.path.join(root, 'Screenshots')
out_dir = os.path.join(sc_dir, 'store')
os.makedirs(out_dir, exist_ok=True)

def create_card_screenshot(window_file, out_file, title_text=None, drive_file=None):
    W, H = 1280, 800
    
    # Clean modern neutral background (Google-ish slate/gray tint)
    canvas = Image.new('RGB', (W, H), (243, 244, 246))
    
    # Subtle gradient or top header bar if desired
    # For now, let's create a beautiful soft backdrop
    draw = ImageDraw.Draw(canvas)
    for i in range(H):
        # subtle top-to-bottom tint from #f8fafc to #eef2f6
        r = int(248 - (248 - 238) * (i / H))
        g = int(250 - (250 - 242) * (i / H))
        b = int(252 - (252 - 246) * (i / H))
        draw.line([(0, i), (W, i)], fill=(r, g, b))

    if drive_file and os.path.exists(drive_file):
        drive_img = Image.open(drive_file).convert('RGBA')
        dw, dh = drive_img.size
        # scale to width ~ 1160
        target_w = 1160
        scale = target_w / dw
        target_h = int(dh * scale)
        drive_resized = drive_img.resize((target_w, target_h), Image.Resampling.LANCZOS)
        
        # Add shadow for drive background
        drive_x = (W - target_w) // 2
        drive_y = 60
        
        s_margin = 20
        d_shadow = Image.new('RGBA', (target_w + s_margin * 2, target_h + s_margin * 2), (0, 0, 0, 0))
        d_draw = ImageDraw.Draw(d_shadow)
        d_draw.rectangle([s_margin, s_margin + 3, s_margin + target_w, s_margin + target_h + 3], fill=(0, 0, 0, 40))
        d_shadow = d_shadow.filter(ImageFilter.GaussianBlur(10))
        
        canvas.paste(d_shadow, (drive_x - s_margin, drive_y - s_margin), d_shadow)
        canvas.paste(drive_resized, (drive_x, drive_y), drive_resized)

    # Load popup window
    win_path = os.path.join(sc_dir, window_file)
    win = Image.open(win_path).convert('RGBA')
    ww, wh = win.size

    x = (W - ww) // 2
    if drive_file:
        y = 220  # offset over the drive banner
    else:
        y = (H - wh) // 2

    # Window shadow
    shadow_pad = 40
    shadow = Image.new('RGBA', (ww + shadow_pad * 2, wh + shadow_pad * 2), (0, 0, 0, 0))
    sdraw = ImageDraw.Draw(shadow)
    sdraw.rectangle([shadow_pad, shadow_pad + 6, shadow_pad + ww, shadow_pad + wh + 6], fill=(0, 0, 0, 70))
    shadow = shadow.filter(ImageFilter.GaussianBlur(18))

    canvas.paste(shadow, (x - shadow_pad, y - shadow_pad), shadow)
    canvas.paste(win, (x, y), win)

    # Ensure 24-bit RGB (no alpha)
    final_img = canvas.convert('RGB')
    out_path = os.path.join(out_dir, out_file)
    final_img.save(out_path, format='PNG')
    print(f"Saved: {out_path} ({final_img.size[0]}x{final_img.size[1]}, mode={final_img.mode})")

if __name__ == '__main__':
    # 1. Main selection window centered
    create_card_screenshot('ChooseFiles.png', 'screenshot-1-select-1280x800.png')
    
    # 2. Completed copy with Drive result banner in background
    create_card_screenshot(
        '2026-11-07_144707_Screenshot.png',
        'screenshot-2-complete-1280x800.png',
        drive_file=os.path.join(sc_dir, '2026-11-07_144801_Screenshot.png')
    )

