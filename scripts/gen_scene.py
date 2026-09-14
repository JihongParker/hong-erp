"""Overview 장면용 이미지 레이어 생성 + 크로마키. 한 번 뽑아 public/scene 에 둔다.
토큰: ~/.grok/auth.json (Grok Build 로그인). 사용: python3 scripts/gen_scene.py [--only name] [--force] [--nokey]"""
import json, os, sys, base64, io, urllib.request
from PIL import Image
auth = json.load(open(os.path.expanduser("~/.grok/auth.json"))); key = list(auth.values())[0]["key"]
cfg = json.load(open("scripts/scene_prompts.json"))
only = sys.argv[sys.argv.index("--only") + 1] if "--only" in sys.argv else None
force = "--force" in sys.argv
os.makedirs("public/scene/raw", exist_ok=True)

def chroma_key(im: Image.Image) -> Image.Image:
    im = im.convert("RGB"); px = im.load(); w, h = im.size
    out = Image.new("RGBA", (w, h)); po = out.load()
    for y in range(h):
        for x in range(w):
            r, g, b = px[x, y]
            d = g - max(r, b)                       # 초록 우세도
            if d > 90: a = 0
            elif d < 25: a = 255
            else: a = int(255 * (1 - (d - 25) / 65))
            if a < 255 and a > 0:                   # 가장자리 초록 번짐 제거
                g = min(g, (r + b) // 2 + 10)
            elif a == 255 and g > max(r, b) + 60 and (r + b) < 200:
                g = min(g, max(r, b) + 40)
            po[x, y] = (r, g, b, a)
    return out

for L in cfg["layers"]:
    raw = f"public/scene/raw/{L['file']}.png"; out = f"public/scene/{L['file']}.webp"
    if only and L["file"] != only: continue
    if not os.path.exists(raw) or force:
        body = json.dumps({"model": cfg["model"], "prompt": f"{L['prompt']}. {cfg['style']}", "n": 1, "response_format": "b64_json"}).encode()
        req = urllib.request.Request("https://api.x.ai/v1/images/generations", data=body, headers={"Authorization": "Bearer " + key, "Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=180) as r: data = json.load(r)
        open(raw, "wb").write(base64.b64decode(data["data"][0]["b64_json"])); print("generated", raw)
    im = Image.open(raw)
    if "--nokey" not in sys.argv:
        im = chroma_key(im); bb = im.getbbox(); im = im.crop(bb) if bb else im
    w = L["width"]; im = im.resize((w, max(1, int(im.height * w / im.width))), Image.LANCZOS)
    im.save(out, "WEBP", quality=88, method=5)
    print("ok", out, im.size, os.path.getsize(out) // 1024, "KB")
