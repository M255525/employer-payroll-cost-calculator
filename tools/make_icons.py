# 產生 PWA 圖示：深海藍底＋冰山（水面上小、水面下大）＋金色錢幣
import os
from PIL import Image, ImageDraw

out = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'icons')


def draw(size, pad):
    s = 4 * size
    im = Image.new('RGB', (s, s), '#E9F3F9')
    d = ImageDraw.Draw(im)
    x0, x1 = pad * s, (1 - pad) * s
    w = x1 - x0
    wy = pad * s + w * .38
    d.rectangle([0, wy, s, s], fill='#0F2C4A')
    cx = s / 2
    # 水面上
    d.polygon([(cx - w * .02, pad * s + w * .06), (cx + w * .18, wy), (cx - w * .2, wy)], fill='#FFFFFF', outline='#9FB9CC')
    # 水面下
    d.polygon([(cx - w * .2, wy), (cx + w * .18, wy), (cx + w * .42, wy + w * .3), (cx + w * .2, (1 - pad) * s - w * .02), (cx - w * .28, (1 - pad) * s - w * .06), (cx - w * .44, wy + w * .26)], fill='#4F8CC4')
    d.line([(0, wy), (s, wy)], fill='#FFFFFF', width=int(s * .012))
    # 錢幣
    r = w * .12
    ccx, ccy = cx + w * .3, pad * s + w * .16
    d.ellipse([ccx - r, ccy - r, ccx + r, ccy + r], fill='#E3B04B', outline='#B7862A', width=int(s * .01))
    d.line([(ccx, ccy - r * .55), (ccx, ccy + r * .55)], fill='#8A5F12', width=int(s * .014))
    return im.resize((size, size), Image.LANCZOS)


draw(192, .1).save(os.path.join(out, 'icon-192.png'))
draw(512, .1).save(os.path.join(out, 'icon-512.png'))
draw(512, .2).save(os.path.join(out, 'icon-maskable-512.png'))
