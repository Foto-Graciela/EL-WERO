# Genera las 600 cartas de EL WERO (deterministico, semilla fija)
import json, random, sys
R = random.Random(2026)

ARCH = {
 "guerreros": dict(name="Guerreros del Honor", color="#b3261e", icon="⚔️",
   arts=[("samurai","Samurái","Mantiene el equilibrio y desenvaina con honor."),
         ("caballero","Caballero","Protege su reino con armadura y valentía."),
         ("boxeador","Boxeador","Guardia arriba y golpe de campeón."),
         ("pirata","Pirata","Capitán de los mares que nunca suelta su botín."),
         ("vaquero","Vaquero","Lazo en mano, defiende su rancho al atardecer."),
         ("mago","Mago","Domina hechizos y convierte la estrategia en magia."),
         ("gym","Gym","Cada repetición lo hace más fuerte."),
         ("detective","Detective","Lupa en mano, ningún rival se le escapa.")],
   pool=["pierce","double","winGrow","shield","sumDebuff","aura"]),
 "gamers": dict(name="Gamers Pro", color="#7b2ff7", icon="🎮",
   arts=[("pc_gamer","PC Gamer","Teclado RGB encendido y partida lista."),
         ("programador","Programador","Escribe código hasta que todo compila."),
         ("ajedrecista","Ajedrecista","Piensa diez jugadas antes que su rival."),
         ("iphone","iPhone","Prueba las tres cámaras hasta el encuadre perfecto."),
         ("samsung_galaxy","Samsung Galaxy","Despliega su Fold y abre dos apps a la vez."),
         ("cientifico","Científico","Cada experimento es un nuevo power-up."),
         ("dj","DJ","Mezcla beats y prende la pista."),
         ("coleccionador_hot_wheels","Coleccionador","Busca la pieza que le falta en la vitrina.")],
   pool=["sumDraw","winDraw","sumSearch","synergy","deathDraw","sumDestroyST"]),
 "sabor": dict(name="Sabor Mexicano", color="#e07a1f", icon="🌮",
   arts=[("tacos_cantimpalo","Tacos Cantimpalo","Frente al comal, listo para el primer bocado."),
         ("chef","Chef","Sartén en mano, cocina con fuego y estilo."),
         ("barista","Barista","Espresso con crema en su taza favorita."),
         ("sushi_chef","Sushi Chef","Corte preciso y arroz en su punto."),
         ("parrillero","Parrillero","Carne asada al carbón para toda la banda."),
         ("panadero","Panadero","Pan recién horneado desde la madrugada."),
         ("pastelero","Pastelero","Decora cada pastel como obra de arte."),
         ("pizzero","Pizzero","Masa al aire y horno de leña."),
         ("chocolatero","Chocolatero","Cacao puro convertido en tentación."),
         ("heladero","Heladero","Una bola más nunca le cae mal a nadie."),
         ("catador_de_cerveza","Catador de Cerveza","De la más clara a la más oscura."),
         ("catador_de_mate","Catador de Mate","Ceba el mate y descubre el sabor de la yerba."),
         ("sommelier","Sommelier","Descorcha, huele y encuentra la cosecha perfecta.")],
   pool=["sumHeal","endHeal","deathRecruit","synergy","taunt","sumBuffTeam"]),
 "aventura": dict(name="Aventureros", color="#1f8a5b", icon="🧭",
   arts=[("explorador","Explorador","Mapa en mano rumbo a lo desconocido."),
         ("arqueologo","Arqueólogo","Revela secretos de civilizaciones perdidas."),
         ("alpinista","Alpinista","Cada cumbre es una nueva victoria."),
         ("buzo","Buzo","Explora arrecifes y barcos hundidos."),
         ("campista","Campista","Fogata, tienda y estrellas."),
         ("astronauta","Astronauta","Flota entre estrellas buscando nuevos mundos."),
         ("capitan_de_barco","Capitán de Barco","Timón firme contra cualquier tormenta."),
         ("piloto_de_avion","Piloto de Avión","Despega directo hacia las nubes."),
         ("pescador","Pescador","Paciencia, carnada y la pesca del día.")],
   pool=["sumSearch","sumRevive","deathRecruit","direct","sumDraw"]),
 "atletas": dict(name="Atletas Imparables", color="#0a7cc2", icon="🏆",
   arts=[("formula_1","Fórmula 1","Espera la recta para pisar a fondo."),
         ("motociclista","Motociclista","Se abrocha el casco y sale a buscar curvas."),
         ("ciclista","Ciclista","Pedalea por la sierra sin rendirse."),
         ("futbolista","Futbolista","Pide el balón y define al ángulo."),
         ("basquetbolista","Basquetbolista","Salta alto y clava el balón."),
         ("beisbolista","Beisbolista","Batazo directo a las gradas."),
         ("tenista","Tenista","Saque potente y revés letal."),
         ("nadador","Nadador","Cada brazada lo acerca a la meta."),
         ("skater","Skater","Trucos imposibles en la rampa."),
         ("esquiador","Esquiador","Desciende la montaña a toda velocidad."),
         ("surfista","Surfista","Cabalga la ola más grande.")],
   pool=["direct","double","endGrow","sumBuffTeam","winGrow","pierce"]),
 "artistas": dict(name="Artistas Estelares", color="#d6247a", icon="🎤",
   arts=[("cantante","Cantante","Toma el micrófono y la multitud enloquece."),
         ("guitarrista","Guitarrista","Un solo que hace vibrar el escenario."),
         ("baterista","Baterista","Marca el ritmo con fuerza."),
         ("pintor","Pintor","Cada pincelada cuenta una historia."),
         ("escultor","Escultor","Da forma a la piedra con paciencia."),
         ("escritor","Escritor","Sus palabras cambian el final de la historia."),
         ("fotografo","Fotógrafo","Captura el momento exacto."),
         ("camarografo","Camarógrafo","Graba cada toma sin perder detalle."),
         ("director_de_cine","Director de Cine","¡Luces, cámara, acción!"),
         ("modelo","Modelo","Recorre la pasarela bajo los reflectores.")],
   pool=["sumBurn","winBurn","sumDebuff","aura","sumDestroyLe"]),
 "rescate": dict(name="Héroes de Rescate", color="#c9302c", icon="🚑",
   arts=[("doctor","Doctor","Escucha con atención antes de diagnosticar."),
         ("paramedico","Paramédico","Siempre llega a tiempo."),
         ("bombero","Bombero","Entra donde nadie se atreve."),
         ("dentista","Dentista","Sonrisas perfectas garantizadas."),
         ("veterinario","Veterinario","Cuida a cada mascota como suya."),
         ("profesor","Profesor","Enseña con paciencia y ejemplo.")],
   pool=["sumRevive","shield","sumHeal","taunt","deathDraw"]),
 "oficios": dict(name="Maestros del Oficio", color="#8a6d3b", icon="🛠️",
   arts=[("ingeniero","Ingeniero","Planos listos y obra en marcha."),
         ("arquitecto","Arquitecto","Diseña estructuras que desafían al tiempo."),
         ("electricista","Electricista","Conecta todo sin un solo corto."),
         ("mecanico","Mecánico","Deja cualquier motor como nuevo."),
         ("carpintero","Carpintero","Madera, serrucho y precisión."),
         ("maquinista","Maquinista","Conduce la locomotora a todo vapor."),
         ("agricultor","Agricultor","Siembra hoy, cosecha mañana."),
         ("jardinero","Jardinero","Hace florecer cualquier rincón."),
         ("apicultor","Apicultor","Cuida la colmena y su miel dorada.")],
   pool=["sumDestroyST","taunt","endGrow","aura","sumDestroyLe"]),
}

# (titulos, niveles, cuota). Sacrificios: 1-4 sin sacrificio, 5-7 uno, 8-10 dos.
TIERS = [
 (["Aprendiz","Novato","Junior"], [2,3,3], 10),
 (["", "Pro", "de Barrio", "Estelar"], [4,4,4], 12),
 (["Veterano","Experto","Élite"], [5,6,6], 10),
 (["Maestro","Campeón"], [7,7,7], 8),
 (["Leyenda","Titán"], [8,8,9], 6),
]
UL_TITLES = ["Supremo","Absoluto"]

def r50(x): return int(round(x/50.0))*50

def mon_effect(key, t):
    m = {
     "pierce": {"pierce":True},
     "double": {"double":True},
     "winGrow": {"winGrow":[200,300,300,400,500][t]},
     "shield": {"shield":True},
     "sumDebuff": {"onSummon":[{"op":"debuffStrongest","n":[300,400,500,700,900][t]}]},
     "aura": {"aura":[100,200,200,300,400][t]},
     "sumDraw": {"onSummon":[{"op":"draw","n":1 if t<4 else 2}]},
     "winDraw": {"winDraw":True},
     "sumSearch": {"onSummon":[{"op":"searchArch","maxLvl":4 if t<3 else 6}]},
     "synergy": {"synergy":[100,150,200,250,300][t]},
     "deathDraw": {"deathDraw":1 if t<4 else 2},
     "sumDestroyST": {"onSummon":[{"op":"destroyEnemyST","n":1 if t<4 else 2}]},
     "sumHeal": {"onSummon":[{"op":"heal","n":[500,600,800,1000,1500][t]}]},
     "endHeal": {"endHeal":[200,300,300,400,500][t]},
     "deathRecruit": {"deathRecruit":[3,4,4,4,6][t]},
     "taunt": {"taunt":True},
     "sumBuffTeam": {"onSummon":[{"op":"teamBuff","n":[200,300,400,500,700][t]}]},
     "sumRevive": {"onSummon":[{"op":"reviveBest","arch":True,"maxLvl":[3,4,4,5,6][t]}]},
     "direct": {"direct":True},
     "endGrow": {"endGrow":[100,100,200,200,300][t]},
     "sumBurn": {"onSummon":[{"op":"burn","n":[300,400,500,700,1000][t]}]},
     "winBurn": {"winBurn":[200,300,400,500,700][t]},
     "sumDestroyLe": {"onSummon":[{"op":"destroyStrongest","max":[1000,1300,1600,2000,2400][t]}]},
    }
    return dict(m[key])

def merge(a,b):
    out=dict(a)
    for k,v in b.items():
        if k=="onSummon" and k in out: out[k]=out[k]+v
        else: out[k]=v
    return out

cards=[]
def add(c):
    c["id"]="W%03d"%(len(cards)+1); cards.append(c)

ARCHB = {"sabor":200,"gamers":100,"atletas":-150,"oficios":-100,"artistas":-50}
POW = {"direct":-700,"double":-550,"pierce":-150,"shield":-200,"taunt":+100}

for ak,a in ARCH.items():
    arts=a["arts"]; n=len(arts)
    for ti,(titles,lvls,quota) in enumerate(TIERS):
        for q in range(quota):
            art,prof,flav = arts[(q+ti*3)%n]
            title = titles[(q//n)%len(titles)]
            lvl=lvls[q%3]
            if ti==0: rar="N"
            elif ti==1: rar="R" if q%2==1 else "N"
            elif ti==2: rar="UR" if q%3==2 else "R"
            elif ti==3: rar="UR"
            else: rar="L"
            vanilla = (ti==0 and q%2==0) or (ti==1 and q%4==0)
            base = 300*lvl+300
            rb={"N":0,"R":100,"UR":200,"L":300,"UL":400}[rar]
            prof_def = R.random()<0.35
            atk = base+rb+R.choice([-200,-100,0,100,200])
            df = base-300+R.choice([-200,-100,0,100,200])
            if prof_def: atk,df = df,atk+100
            atk += ARCHB.get(ak,0)
            eff={}
            if not vanilla:
                pool=a["pool"]; key=pool[(q+ti)%len(pool)]
                eff=mon_effect(key,ti)
                atk += POW.get(key,0) - 150
                if rar=="L":
                    k2=pool[(q+ti+2)%len(pool)]
                    if k2!=key: eff=merge(eff,mon_effect(k2,ti)); atk-=100
            else:
                atk+=200; df+=100
            name="El Wero "+prof+(" "+title if title else "")
            add(dict(kind="monster",name=name,arch=ak,art=art,lvl=lvl,atk=max(0,r50(atk)),df=max(0,r50(df)),
                     rar=rar,flav=flav,eff=eff))
    ul_eff = {
     "guerreros":[{"onSummon":[{"op":"destroyAllEnemyMonsters"}],"pierce":True},{"double":True,"shield":True,"aura":300}],
     "gamers":[{"onSummon":[{"op":"draw","n":3}],"synergy":300},{"onSummon":[{"op":"destroyEnemyST","n":99},{"op":"draw","n":1}],"winDraw":True}],
     "sabor":[{"onSummon":[{"op":"heal","n":3000},{"op":"teamBuff","n":800}],"endHeal":500},{"taunt":True,"shield":True,"synergy":300}],
     "aventura":[{"onSummon":[{"op":"reviveBest","arch":True,"maxLvl":8},{"op":"searchArch","maxLvl":7}]},{"direct":True,"winGrow":500}],
     "atletas":[{"double":True,"pierce":True,"endGrow":300},{"onSummon":[{"op":"teamBuff","n":1000}],"direct":True}],
     "artistas":[{"onSummon":[{"op":"debuffAll","n":1000},{"op":"burn","n":1000}]},{"winBurn":1000,"aura":400}],
     "rescate":[{"onSummon":[{"op":"reviveBest","arch":False,"maxLvl":10}],"shield":True},{"onSummon":[{"op":"heal","n":2500}],"deathRecruit":8}],
     "oficios":[{"onSummon":[{"op":"destroyDefEnemies"},{"op":"destroyEnemyST","n":99}]},{"taunt":True,"aura":400,"endGrow":300}],
    }[ak]
    for i in range(2):
        art,prof,flav=arts[i]
        atk=[3300,3000][i] if "direct" not in ul_eff[i] else 2600
        add(dict(kind="monster",name="El Wero "+prof+" "+UL_TITLES[i],arch=ak,art=art,lvl=10,atk=atk,df=2800-i*300,
                 rar="UL",flav="La forma definitiva. "+flav,eff=ul_eff[i]))

SNAMES = {
 "guerreros":["Katana Afilada","Armadura Real","Estandarte del Honor","Llamado a las Armas","Grito de Guerra","Golpe de Campeón","Juramento del Caballero","Resurrección del Guerrero","Duelo al Amanecer","Botín Pirata","Atajo del Rancho","Furia del Dragón","Última Cruzada"],
 "gamers":["Teclado RGB","Audífonos Pro","Servidor Dedicado","Descarga Rápida","Overclock","Combo Perfecto","Código Limpio","Partida Guardada","Bug Fatal","Loot Box","Speedrun","Modo Dios","Reinicio del Sistema"],
 "sabor":["Salsa Secreta","Delantal de Chef","Fonda del Barrio","Pedido para Llevar","Hora de la Comida","Banquete Completo","Café de Olla","Receta de la Abuela","Picante Extremo","Menú del Día","Comal Caliente","Fiesta de Tacos","Gran Festín Mexicano"],
 "aventura":["Brújula Antigua","Mochila Equipada","Campamento Base","Mapa del Tesoro","Expedición","Descubrimiento","Bitácora de Viaje","Rescate en la Montaña","Avalancha","Señal de Bengala","Atajo Secreto","Tesoro Perdido","Más Allá del Horizonte"],
 "atletas":["Tenis de Velocidad","Uniforme Oficial","Estadio Lleno","Draft de Novatos","Calentamiento","Segundo Aire","Bebida Energética","Revancha","Tarjeta Roja","Fichaje Estelar","Arranque Explosivo","Récord Mundial","Final del Campeonato"],
 "artistas":["Micrófono Dorado","Traje de Gala","Escenario Principal","Casting","Ovación","Encore","Inspiración","Regreso a los Escenarios","Crítica Feroz","Contrato Discográfico","Toma Única","Obra Maestra","Gira Mundial"],
 "rescate":["Botiquín","Uniforme de Rescate","Hospital General","Llamada al 911","Primeros Auxilios","Turno Doble","Vitaminas","Reanimación","Cuarentena","Ambulancia","Código Azul","Milagro","Héroes Sin Capa"],
 "oficios":["Llave Inglesa","Casco de Obra","Taller del Barrio","Contratación","Turno Extra","Mantenimiento","Planos Maestros","Restauración","Demolición","Caja de Herramientas","Obra Negra","Cimientos Firmes","Gran Construcción"],
}
TNAMES = {
 "guerreros":["Parada Perfecta","Contraataque","Emboscada","Escudo Alzado","Golpe Bajo","Retirada Táctica","Espejo del Samurái","Duelo de Honor","Ira del Shogun"],
 "gamers":["Lag","Firewall","Ban Hammer","Guardado Automático","Virus","Pausa","Hackeo Inverso","Glitch","Pantalla Azul"],
 "sabor":["Cáscara de Plátano","Chile Toreado","Plato Roto","Sobremesa","Indigestión","Cerrado por Hoy","Salsa Reflejo","Comida Envenenada","Explosión de Habanero"],
 "aventura":["Arenas Movedizas","Trampa de Lianas","Derrumbe","Refugio","Tormenta","Neblina","Espejismo","Pozo Oculto","Erupción Volcánica"],
 "atletas":["Fuera de Lugar","Falta Técnica","Barrida","Tiempo Fuera","Doping","Silbatazo Final","Rebote","Lesión","Descalificación Total"],
 "artistas":["Abucheo","Corte Comercial","Escándalo","Bis del Público","Plagio","Cortina Final","Eco del Escenario","Paparazzi","Apagón del Teatro"],
 "rescate":["Camilla","Antídoto","Inyección","Recuperación","Sedante","Aislamiento","Desfibrilador","Cordón Sanitario","Alarma General"],
 "oficios":["Cable Pelado","Andamio Caído","Cortocircuito","Muro de Contención","Gotera","Huelga","Viga Rebotada","Zanja","Derrumbe Controlado"],
}
SPELL_SLOTS = [
 ("N", [{"op":"equip","atk":500,"def":0}]),
 ("R", [{"op":"equip","atk":700,"def":300}]),
 ("R", [{"op":"fieldAura","atk":300,"def":200}]),
 ("N", [{"op":"searchArch","maxLvl":4}]),
 ("N", [{"op":"teamBuff","n":500}]),
 ("R", 0), ("R", 1),
 ("UR",[{"op":"reviveBest","arch":True,"maxLvl":8}]),
 ("R", [{"op":"destroyStrongest","max":2000}]),
 ("UR",[{"op":"draw","n":2}]),
 ("UR",[{"op":"ssFromHand","arch":True,"maxLvl":7}]),
 ("L", 2), ("UL",3),
]
THEME = {
 "guerreros":[[{"op":"equip","atk":800,"def":0,"pierce":True}],[{"op":"debuffStrongest","n":800}],[{"op":"destroyStrongest"},{"op":"teamBuff","n":300}],[{"op":"destroyAllEnemyMonsters"}]],
 "gamers":[[{"op":"draw","n":1},{"op":"searchArch","maxLvl":4}],[{"op":"destroyEnemyST","n":1},{"op":"draw","n":1}],[{"op":"draw","n":3}],[{"op":"destroyEnemyST","n":99},{"op":"destroyStrongest"}]],
 "sabor":[[{"op":"heal","n":2000}],[{"op":"heal","n":800},{"op":"teamBuff","n":400}],[{"op":"reviveBest","arch":True,"maxLvl":10},{"op":"heal","n":1000}],[{"op":"heal","n":4000},{"op":"teamBuff","n":1000}]],
 "aventura":[[{"op":"searchArch","maxLvl":7}],[{"op":"reviveBest","arch":True,"maxLvl":4},{"op":"draw","n":1}],[{"op":"searchArch","maxLvl":10},{"op":"draw","n":1}],[{"op":"reviveBest","arch":False,"maxLvl":10},{"op":"reviveBest","arch":False,"maxLvl":10}]],
 "atletas":[[{"op":"teamBuff","n":800}],[{"op":"equip","atk":600,"def":0,"double":True}],[{"op":"teamBuff","n":1200}],[{"op":"teamBuff","n":1500},{"op":"draw","n":1}]],
 "artistas":[[{"op":"burn","n":800}],[{"op":"debuffAll","n":500}],[{"op":"burn","n":1500},{"op":"debuffStrongest","n":500}],[{"op":"burn","n":2000},{"op":"debuffAll","n":800}]],
 "rescate":[[{"op":"reviveBest","arch":True,"maxLvl":4},{"op":"heal","n":500}],[{"op":"equip","atk":200,"def":1000,"shield":True}],[{"op":"reviveBest","arch":False,"maxLvl":10}],[{"op":"heal","n":3000},{"op":"reviveBest","arch":False,"maxLvl":10}]],
 "oficios":[[{"op":"destroyEnemyST","n":2}],[{"op":"equip","atk":300,"def":1200}],[{"op":"destroyDefEnemies"}],[{"op":"destroyAllMonsters"},{"op":"draw","n":1}]],
}
TRAP_SLOTS = [
 ("N", "attack", [{"op":"negate"}]),
 ("N", "attack", [{"op":"debuffAttacker","n":700}]),
 ("R", "summon", [{"op":"destroySummoned","minAtk":1800}]),
 ("R", "attack", [{"op":"negate"},{"op":"heal","n":1000}]),
 ("UR","attack", [{"op":"destroyAttacker"}]),
 ("UR","attack", [{"op":"negateEnd"}]),
 ("L", "attack", [{"op":"negate"},{"op":"reflectHalf"}]),
 ("R", "summon", [{"op":"debuffSummoned","n":1000}]),
 ("UL","attack", [{"op":"destroyAllAtkEnemies"}]),
]
def sub_of(e): return "equipo" if e[0]["op"]=="equip" else ("campo" if e[0]["op"]=="fieldAura" else "normal")
for ak,a in ARCH.items():
    th=THEME[ak]
    for i,(rar,e) in enumerate(SPELL_SLOTS):
        eff = th[e] if isinstance(e,int) else e
        add(dict(kind="spell",sub=sub_of(eff),name=SNAMES[ak][i],arch=ak,rar=rar,eff=eff,flav="Magia de "+a["name"]+"."))
    for i,(rar,trig,eff) in enumerate(TRAP_SLOTS):
        add(dict(kind="trap",trig=trig,name=TNAMES[ak][i],arch=ak,rar=rar,eff=eff,flav="Trampa de "+a["name"]+"."))

NS=[("Sobre Sorpresa","N",[{"op":"draw","n":1}]),("Doble Turno","R",[{"op":"draw","n":2}]),("Torta de Jamón","N",[{"op":"heal","n":1000}]),
 ("Refresco Bien Frío","N",[{"op":"heal","n":600},{"op":"draw","n":1}]),("Chanclazo","R",[{"op":"destroyStrongest","max":1600}]),
 ("Tormenta de Granizo","UR",[{"op":"destroyEnemyST","n":99}]),("Terremoto","L",[{"op":"destroyAllMonsters"}]),
 ("Rayo del Cielo","UL",[{"op":"destroyAllEnemyMonsters"}]),("Remolino","R",[{"op":"destroyEnemyST","n":1}]),
 ("Cuetes de Feria","N",[{"op":"burn","n":500}]),("Pirotecnia","R",[{"op":"burn","n":1000}]),
 ("Segunda Oportunidad","UR",[{"op":"reviveBest","arch":False,"maxLvl":10}]),("Pase VIP","UR",[{"op":"ssFromHand","arch":False,"maxLvl":6}]),
 ("Lentes del Wero","N",[{"op":"equip","atk":400,"def":400}]),("Gorra de la Suerte","R",[{"op":"equip","atk":600,"def":0}]),
 ("Chamarra de Cuero","R",[{"op":"equip","atk":0,"def":900}]),("Cadena de Oro","UR",[{"op":"equip","atk":1000,"def":0}]),
 ("Porra del Estadio","N",[{"op":"teamBuff","n":400}]),("Mañanitas","R",[{"op":"teamBuff","n":700}]),
 ("Desvelada","N",[{"op":"debuffStrongest","n":600}]),("Lunes por la Mañana","UR",[{"op":"debuffAll","n":700}]),
 ("Corona del Wero","L",[{"op":"equip","atk":1500,"def":500,"pierce":True}]),("Feria del Pueblo","R",[{"op":"fieldAura","atk":200,"def":200,"all":True}]),
 ("Milagro del Pueblo","L",[{"op":"heal","n":3000},{"op":"draw","n":2}])]
NT=[("Bache","N","attack",[{"op":"negate"}]),("Tope","N","attack",[{"op":"debuffAttacker","n":500}]),
 ("Apagón","R","attack",[{"op":"negateEnd"}]),("Multa de Tránsito","R","summon",[{"op":"debuffSummoned","n":800}]),
 ("Trampa para Ratones","R","summon",[{"op":"destroySummoned","minAtk":1500}]),("Charco","N","attack",[{"op":"debuffAttacker","n":400},{"op":"heal","n":400}]),
 ("Espejo Retrovisor","UR","attack",[{"op":"negate"},{"op":"reflectHalf"}]),("Cáscara de Mango","UR","attack",[{"op":"destroyAttacker"}]),
 ("Granizada","L","attack",[{"op":"destroyAllAtkEnemies"}]),("Doble Fila","N","attack",[{"op":"negate"}]),
 ("Sirena de Patrulla","R","attack",[{"op":"negate"},{"op":"draw","n":1}]),("Mosquito","N","summon",[{"op":"debuffSummoned","n":500}]),
 ("Tianguis Cerrado","UR","summon",[{"op":"destroySummoned","minAtk":0}]),("Grito de la Abuela","R","attack",[{"op":"debuffAttacker","n":1000}]),
 ("Lluvia de Junio","N","attack",[{"op":"heal","n":800}]),("Eclipse Total","UL","attack",[{"op":"destroyAllAtkEnemies"},{"op":"heal","n":1000}])]
for n,r,e in NS:
    add(dict(kind="spell",sub=sub_of(e),name=n,arch="neutral",rar=r,eff=e,flav="Magia neutral: sirve en cualquier deck."))
for n,r,t,e in NT:
    add(dict(kind="trap",trig=t,name=n,arch="neutral",rar=r,eff=e,flav="Trampa neutral: sirve en cualquier deck."))

names=[c["name"] for c in cards]
dup=[n for n in set(names) if names.count(n)>1]
assert not dup, dup[:10]
from collections import Counter
print(len(cards), Counter(c["kind"] for c in cards), Counter(c["rar"] for c in cards))

def starter(ak):
    mons=[c for c in cards if c["arch"]==ak and c["kind"]=="monster"]
    sp=[c for c in cards if c["arch"]==ak and c["kind"]=="spell"]
    tr=[c for c in cards if c["arch"]==ak and c["kind"]=="trap"]
    neu={c["name"]:c["id"] for c in cards if c["arch"]=="neutral"}
    d=[m["id"] for m in mons if m["lvl"]<=4][:16]
    d+=[m["id"] for m in mons if 5<=m["lvl"]<=7][:5]
    d+=[m["id"] for m in mons if m["lvl"]>=8 and m["rar"]=="L"][:1]
    d+=[s["id"] for s in sp if s["rar"] in("N","R")][:7]
    d+=[t["id"] for t in tr if t["rar"] in("N","R")][:5]
    d+=[neu[x] for x in ("Doble Turno","Chanclazo","Torta de Jamón","Remolino","Bache","Tope")]
    assert len(d)==40, (ak,len(d))
    return d
starters = {
 "guerreros":dict(name="Guerreros del Honor",desc="Pegan duro: perforan defensas, atacan dos veces y crecen al ganar combates.",cards=starter("guerreros")),
 "gamers":dict(name="Gamers Pro",desc="Combos: roban cartas, buscan en el mazo y se potencian entre ellos.",cards=starter("gamers")),
 "sabor":dict(name="Sabor Mexicano",desc="Aguante: curan LP, protegen a sus aliados y se hacen fuertes en grupo.",cards=starter("sabor")),
}
archmeta={k:dict(name=v["name"],color=v["color"],icon=v["icon"]) for k,v in ARCH.items()}
archmeta["neutral"]=dict(name="Neutral",color="#5b6b7f",icon="⭐")
with open(sys.argv[1],"w",encoding="utf-8") as f:
    f.write("window.WERO_DATA="+json.dumps(dict(cards=cards,starters=starters,arch=archmeta),ensure_ascii=False,separators=(",",":"))+";")
