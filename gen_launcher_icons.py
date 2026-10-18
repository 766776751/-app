from PIL import Image, ImageDraw, ImageFont
import os

# 与 ScreenHeader 应用内 Logo 一致：深蓝圆角 + 白发票 + 金章 ¥
BG = (13, 27, 42, 255)
PAPER = (244, 252, 255, 255)
INK = (10, 22, 40, 255)
NEON = (56, 240, 255, 255)
GOLD = (240, 160, 75, 255)
GOLD_L = (255, 226, 154, 255)

def logo(size: int, round_mask: bool = False) -> Image.Image:
    s = size
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    pad = max(2, int(s * 0.06))
    if round_mask:
        d.ellipse([0, 0, s - 1, s - 1], fill=BG)
    else:
        d.rounded_rectangle(
            [pad, pad, s - pad, s - pad],
            radius=int(s * 0.22),
            fill=BG,
        )

    # 发票纸（与 ScreenHeader 同构图）
    x0, x1 = int(s * 0.30), int(s * 0.64)
    y0, y1 = int(s * 0.20), int(s * 0.74)
    notch = int((x1 - x0) * 0.18)
    zig = int(s * 0.035)
    paper = [
        (x0, y0), (x1, y0), (x1, y1 - zig),
        (x1 - notch, y1), (x1 - notch * 2, y1 - zig),
        (x1 - notch * 3, y1), (x0, y1),
    ]
    d.polygon(paper, fill=PAPER)
    # 装订线
    tw = max(1, int(s * 0.03))
    d.line([(x0 + int(s * 0.06), y0 + int(s * 0.06)), (x1 - int(s * 0.05), y0 + int(s * 0.06))],
           fill=INK, width=tw)
    # 明细
    d.line([(x0 + int(s * 0.06), y0 + int(s * 0.16)), (x1 - int(s * 0.08), y0 + int(s * 0.16))],
           fill=(63, 73, 69, 140), width=max(1, int(s * 0.022)))

    # 金色金额章
    cx, cy, r = int(s * 0.70), int(s * 0.70), int(s * 0.16)
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=GOLD, outline=INK, width=max(1, int(s * 0.02)))
    try:
        font = ImageFont.truetype("arial.ttf", int(s * 0.16))
    except Exception:
        font = ImageFont.load_default()
    text = "¥"
    bbox = d.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    d.text((cx - tw / 2, cy - th / 2 - bbox[1]), text, font=font, fill=INK)
    return img

SIZES = {
    "mipmap-mdpi": 48,
    "mipmap-hdpi": 72,
    "mipmap-xhdpi": 96,
    "mipmap-xxhdpi": 144,
    "mipmap-xxxhdpi": 192,
}
ROOTS = [
    r"D:\123pan\Downloads\报销统计神器0817_1\web\android\app\src\main\res",
    r"D:\123pan\Downloads\报销统计神器0817_1\note\app\src\main\res",
]

for root in ROOTS:
    for folder, px in SIZES.items():
        path = os.path.join(root, folder)
        os.makedirs(path, exist_ok=True)
        logo(px, False).save(os.path.join(path, "ic_launcher.webp"), "WEBP", quality=95)
        logo(px, True).save(os.path.join(path, "ic_launcher_round.webp"), "WEBP", quality=95)
    # 删掉会合成机器人图标的自适应 XML
    for sub in ("mipmap-anydpi-v26", "mipmap-anydpi"):
        for name in ("ic_launcher.xml", "ic_launcher_round.xml"):
            p = os.path.join(root, sub, name)
            if os.path.exists(p):
                os.remove(p)
                print("removed", p)

print("launcher icons ready (in-app logo style)")
