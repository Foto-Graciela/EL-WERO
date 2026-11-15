import sys, os, glob, re
from PIL import Image
src_zip, uploads, out = sys.argv[1], sys.argv[2], sys.argv[3]
up = {"c5cc0371":"BARISTA","dda4e287":"CATADOR_DE_CERVEZA","7dcdc90a":"SAMSUNG_GALAXY","d3a3dd49":"IPHONE",
 "fb0c7160":"COLECCIONADOR_HOT_WHEELS","23d345cc":"MODELO","8df24dcc":"GYM","7b84534e":"CICLISTA","d39612a8":"MOTOCICLISTA",
 "7f67b5d0":"CATADOR_DE_MATE","4eb47351":"DOCTOR","145ab9b9":"FORMULA_1","69decc70":"TACOS_CANTIMPALO","03fadc8b":"PC_GAMER"}
items=[]
for f in glob.glob(os.path.join(src_zip,"EL_WERO_*.png")):
    n=re.sub(r"_\d+$","",os.path.basename(f)[8:-4]); items.append((n,f))
for k,n in up.items():
    items.append((n,glob.glob(os.path.join(uploads,k+"-image.png"))[0]))
names=[]
for n,f in sorted(items):
    im=Image.open(f).convert("RGB"); w,h=im.size
    box=(int(w*.075),int(h*.166),int(w*.927),int(h*.664))
    a=im.crop(box); a=a.resize((480,int(480*a.size[1]/a.size[0])),Image.LANCZOS)
    a.save(os.path.join(out,n.lower()+".webp"),"WEBP",quality=80); names.append(n.lower())
b=Image.open(os.path.join(src_zip,"Reverso_El_Wero.png")).convert("RGB").resize((375,524),Image.LANCZOS)
b.save(os.path.join(out,"_reverso.webp"),"WEBP",quality=82)
print(len(names)); print(names)
