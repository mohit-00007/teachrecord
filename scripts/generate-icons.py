import zlib
import struct
import math
import os

def create_png(width, height, draw_func, filename):
    raw_data = bytearray()
    for y in range(height):
        raw_data.append(0)  # filter type 0 (None)
        for x in range(width):
            r, g, b, a = draw_func(x, y, width, height)
            raw_data.extend((r, g, b, a))

    def make_chunk(chunk_type, data):
        length = len(data)
        chunk = bytearray()
        chunk.extend(struct.pack('>I', length))
        chunk.extend(chunk_type)
        chunk.extend(data)
        crc = zlib.crc32(chunk_type + data) & 0xffffffff
        chunk.extend(struct.pack('>I', crc))
        return chunk

    png_bytes = bytearray(b'\x89PNG\r\n\x1a\n')
    # IHDR
    ihdr_data = struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)
    png_bytes.extend(make_chunk(b'IHDR', ihdr_data))
    # IDAT
    compressed = zlib.compress(raw_data, level=9)
    png_bytes.extend(make_chunk(b'IDAT', compressed))
    # IEND
    png_bytes.extend(make_chunk(b'IEND', b''))

    os.makedirs(os.path.dirname(filename), exist_ok=True)
    with open(filename, 'wb') as f:
        f.write(png_bytes)
    print(f"Generated {filename} ({width}x{height})")

def icon_drawer(is_maskable=False):
    def draw(x, y, w, h):
        nx = x / w
        ny = y / h
        cx, cy = 0.5, 0.5

        # Distance from center
        dx = nx - cx
        dy = ny - cy
        dist = math.sqrt(dx*dx + dy*dy)

        # Background
        # Dark navy/slate background
        bg_r, bg_g, bg_b = 15, 23, 42
        if is_maskable:
            # Full bleed for maskable safe zone
            pass
        else:
            # Rounded rect check (radius 0.22)
            corner_r = 0.22
            in_x = abs(dx) > (0.5 - corner_r)
            in_y = abs(dy) > (0.5 - corner_r)
            if in_x and in_y:
                cdx = abs(dx) - (0.5 - corner_r)
                cdy = abs(dy) - (0.5 - corner_r)
                if math.sqrt(cdx*cdx + cdy*cdy) > corner_r:
                    return (0, 0, 0, 0)

        # Scale inner content: for maskable, scale to central 75%
        scale = 0.8 if is_maskable else 0.95
        sx = (nx - 0.5) / scale + 0.5
        sy = (ny - 0.5) / scale + 0.5

        # Screen Monitor outline: x: 0.18 to 0.82, y: 0.20 to 0.65
        if 0.18 <= sx <= 0.82 and 0.20 <= sy <= 0.65:
            # border or inner screen
            border_w = 0.03
            if (sx < 0.18 + border_w or sx > 0.82 - border_w or
                sy < 0.20 + border_w or sy > 0.65 - border_w):
                return (71, 85, 105, 255) # slate-600
            
            # Inside screen
            # Red camera PiP at bottom right of screen: sx: 0.60 to 0.78, sy: 0.42 to 0.60
            pip_cx = 0.68
            pip_cy = 0.50
            pip_r = 0.09
            pdx = sx - pip_cx
            pdy = sy - pip_cy
            if math.sqrt(pdx*pdx + pdy*pdy) <= pip_r:
                if math.sqrt(pdx*pdx + pdy*pdy) >= pip_r - 0.015:
                    return (244, 63, 94, 255) # rose border
                # PiP face
                if math.sqrt(pdx*pdx + (pdy + 0.02)*(pdy + 0.02)) <= 0.035:
                    return (226, 232, 240, 255)
                return (30, 41, 59, 255)

            # Presentation line chart inside screen
            # diagonal line from (0.24, 0.52) to (0.35, 0.36) to (0.46, 0.44) to (0.58, 0.32)
            # check distance to polyline
            points = [(0.24, 0.50), (0.36, 0.36), (0.46, 0.42), (0.58, 0.30)]
            for i in range(len(points)-1):
                p1 = points[i]
                p2 = points[i+1]
                # segment distance
                seg_dx = p2[0] - p1[0]
                seg_dy = p2[1] - p1[1]
                seg_len2 = seg_dx*seg_dx + seg_dy*seg_dy
                t = max(0, min(1, ((sx - p1[0])*seg_dx + (sy - p1[1])*seg_dy) / seg_len2))
                proj_x = p1[0] + t*seg_dx
                proj_y = p1[1] + t*seg_dy
                dline = math.sqrt((sx - proj_x)**2 + (sy - proj_y)**2)
                if dline < 0.012:
                    return (251, 113, 133, 255) # rose-400

            # Green indicator dot
            if math.sqrt((sx - 0.76)**2 + (sy - 0.25)**2) < 0.016:
                return (16, 185, 129, 255)

            # Screen background
            return (10, 15, 29, 255)

        # Stand under monitor: sx: 0.44 to 0.56, sy: 0.65 to 0.74
        if 0.46 <= sx <= 0.54 and 0.65 <= sy <= 0.74:
            return (71, 85, 105, 255)
        # Stand base
        if 0.38 <= sx <= 0.62 and 0.74 <= sy <= 0.78:
            return (100, 116, 139, 255)

        # Recording Pill at bottom: sx: 0.32 to 0.68, sy: 0.82 to 0.90
        if 0.32 <= sx <= 0.68 and 0.82 <= sy <= 0.91:
            # Red record badge
            pill_r = 0.045
            # Record circle dot at left of pill
            if math.sqrt((sx - 0.39)**2 + (sy - 0.865)**2) < 0.022:
                return (255, 255, 255, 255)
            return (225, 29, 72, 255)

        # Default dark navy
        return (bg_r, bg_g, bg_b, 255)

    return draw

create_png(192, 192, icon_drawer(False), 'public/pwa-192x192.png')
create_png(512, 512, icon_drawer(False), 'public/pwa-512x512.png')
create_png(512, 512, icon_drawer(True), 'public/pwa-maskable-512x512.png')
create_png(180, 180, icon_drawer(False), 'public/apple-touch-icon.png')
create_png(64, 64, icon_drawer(False), 'public/favicon.ico')
print("All PWA and desktop icons generated successfully.")
