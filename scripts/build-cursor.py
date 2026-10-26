"""Render a native browser cursor, with a stable tip hotspot and no JS follower."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter
import io
import struct

root = Path(__file__).resolve().parents[1] / 'public' / 'assets'
root.mkdir(exist_ok=True)
scale = 4
points = [(13,10),(30,14),(31,16),(23,20),(21,30),(19,31),(12,13)]
points = [(x*scale,y*scale) for x,y in points]
for name, glow_alpha in [('cursor',135),('cursor-link',200)]:
    outline = Image.new('RGBA',(48*scale,48*scale))
    draw = ImageDraw.Draw(outline)
    draw.polygon(points,fill=(6,12,19,255))
    draw.line(points+[points[0]],fill=(230,246,255,255),width=2*scale,joint='curve')
    mask=outline.getchannel('A').filter(ImageFilter.GaussianBlur(3*scale))
    mask=mask.point(lambda a:int(a*glow_alpha/255))
    glow=Image.new('RGBA',outline.size,(83,174,255,0));glow.putalpha(mask)
    result=Image.alpha_composite(glow,outline).resize((48,48),Image.Resampling.LANCZOS)
    result.save(root/f'{name}.png')
    data=io.BytesIO();result.save(data,format='PNG');png=data.getvalue()
    # CUR directory entry: width, height, colors, reserved, hotspot x/y, size, offset.
    (root/f'{name}.cur').write_bytes(struct.pack('<HHH',0,2,1)+struct.pack('<BBBBHHII',48,48,0,0,13,10,len(png),22)+png)
print('Built 48px native cursors with hotspot (13,10).')
