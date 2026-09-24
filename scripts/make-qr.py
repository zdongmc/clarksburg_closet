"""Draw public/request-qr.png: the logo, a heading, a QR code for the request
form, and its address in text for anyone who cannot scan.

Rerun this whenever the form's address changes -- a printed code cannot be
updated, so a new domain means reprinting every sign.

    pip3 install qrcode pillow
    python3 scripts/make-qr.py [url]

The logo sits above the code rather than in its centre, so no part of the code
is covered and every phone reads it. Fonts are the macOS system Arial.
"""

import sys
from pathlib import Path

import qrcode
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
URL = sys.argv[1] if len(sys.argv) > 1 else "https://clarksburgcloset.vercel.app/request"
NAVY = (0x00, 0x46, 0x7F)
FONTS = Path("/System/Library/Fonts/Supplemental")

W, LOGO = 1200, 340
TITLE = "Clothing Request Form"
SHOWN_URL = URL.removeprefix("https://")

qr = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M, box_size=24, border=0)
qr.add_data(URL)
qr.make(fit=True)
code = qr.make_image(fill_color=NAVY, back_color="white").convert("RGB")

logo = Image.open(ROOT / "public/logo.png").convert("RGB").resize((LOGO, LOGO), Image.LANCZOS)
bold = ImageFont.truetype(str(FONTS / "Arial Bold.ttf"), 64)
reg = ImageFont.truetype(str(FONTS / "Arial.ttf"), 42)


def size(text, font):
    left, top, right, bottom = ImageDraw.Draw(Image.new("RGB", (1, 1))).textbbox((0, 0), text, font=font)
    return right - left, bottom - top


title_w, title_h = size(TITLE, bold)
url_w, url_h = size(SHOWN_URL, reg)

y = 60
height = y + LOGO + 30 + title_h + 60 + code.height + 60 + url_h + 90
img = Image.new("RGB", (W, height), "white")
draw = ImageDraw.Draw(img)

img.paste(logo, ((W - LOGO) // 2, y))
y += LOGO + 30
draw.text(((W - title_w) // 2, y), TITLE, font=bold, fill=NAVY)
y += title_h + 60
img.paste(code, ((W - code.width) // 2, y))
y += code.height + 60
draw.text(((W - url_w) // 2, y), SHOWN_URL, font=reg, fill=NAVY)

out = ROOT / "public/request-qr.png"
img.save(out)
print(f"{out.relative_to(ROOT)}  {img.width}x{img.height}  -> {URL}")
