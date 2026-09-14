# Wetenschappelijke en Anatomische Validatie van het 3D-Koemodel in BarnSimulation: Morfologie, Biomechanica, Dracht en Fokwaarden

## 1. Systeemanalyse en Software-Architectuur van de Simulatie

Binnen het onderzoeksprogramma Next Level Animal Science van Wageningen University & Research is het softwareproject barnsimulation ontwikkeld om het gedrag en de fysieke interacties van melkvee in stal- en weideomgevingen in silico te visualiseren en analyseren. De centrale programmatuur voor het genereren en manipuleren van individuele dieren bevindt zich in de subdirectory cow, ondersteund door sturende interfaces en wiskundige hulpprogramma's in `js/ui/` en `js/utils/`.

De architectuur van het systeem rust op een ontkoppeling tussen de geometrische 3D-basisrepresentatie, procedurele rig-modificaties en animatiesturing. De visuele geometrie wordt gedefinieerd door de 3D-oppervlaktemodellen models/cow_melkkoe.glb en models/Cow_Y.FBX, die via CowMesh.js worden ingeladen, gecachet en van materialen worden voorzien. Het onderliggende skelet wordt geabstraheerd in CowRig.js, waarin bottransformaties en schaalvectoren worden aangestuurd via een modulaire inverse kinematics (IK) keten uit IKSolver.js en dynamische demping via PhysicsSpring.js.De dynamische variabiliteit van het fenotype wordt geregeld door gespecialiseerde componenten:

- **`BreedingValues.js`**:  Vertaalt lineaire exterieurkenmerken en fokwaarden (geschaald rond de stamboeknorm van 100 met een standaarddeviatie van 4) naar lokale schalingstransformaties van botstructuren.
- **`CowAnimator.js` en `GaitController.js`**:  Vermengen vooraf gedefinieerde motion-capture- en keyframe-clips (walk_slow.fbx, idle_stand_02.fbx, downer_cow.fbx, sitting_chew.fbx, look_left.fbx, look_right.fbx) met procedurele offsets voor kreupelheid en wervelkolomkromming.
- **`CowBehavior.js` en `HerdManager.js`**:  Reguleren de toestandsovergangen van het dier, variërend van stappen en vreten tot herkauwen en het neerkomen als zogeheten downer cow.
- **`ProceduralSkinGenerator.js`**:  Berekent procedurele vachttexturen en kleurpatronen (zoals Holstein-Friesian zwartbont, roodbont en Groninger Blaarkop).

Hoewel deze modulaire opzet technisch doordacht is voor realtime WebGL-simulaties, vertoont de biologische en biomechanische vertaalslag substantiële hiaten ten opzichte van de veterinaire werkelijkheid.

## Anatomische Evaluatie van het 3D-Basismodel

De visuele getrouwheid van een virtueel rund valt of staat met de getrouwe representatie van de osteologische referentiepunten en de weefselverdeling van het melktype. Het moderne melkras, met name de Holstein-Friesian (HF), bezit een uitgesproken functionele anatomie die scherp contrasteert met vlees- of dubbeldoelrassen.

### Morfologische Discrepanties in het Skelet en Wervelkolom

Bij inspectie van models/cow_melkkoe.glb en de corresponderende rig in CowRig.js valt direct op dat de lichaamsvorm te veel spiermassa en afronding vertoont rond de schouderpartij en ruglijn. Een hoogproductieve melkkoe kenmerkt zich door een wigvormig exterieur (dairy wedge): een scherpe, wigvormige voorhand met droge bespiering van de schouders (scapula), wijd uitlopend naar een diepe, open ribbenkast en een breed bekken. In het huidige 3D-model is de schoft (de dorsale uitsteeksels van de thoracale wervels $T_1$–$T_6$) te afgerond gemodelleerd. De musculus trapezius en musculus rhomboideus vertonen een convex verloop dat veeleer herinnert aan een Belgisch Witblauw- of vleestypisch karkas dan aan het hoekige, scherpe skeletprofiel van een melkkoe.

Aan de dorsolaterale zijde ontbreekt de karakteristieke holte van de lendensteekholte (*fossa paralumbalis*). Deze driehoekige uitholling tussen de laatste rib, de lendenwervels (processus transversi) en het heupbeen is bij herkauwers aan de linkerzijde een cruciaal klinisch en visueel herkenningspunt voor pensvulling en algehele conditie. In de huidige mesh is deze zone bilateraal opgevuld als een egale, afgeronde flank.

### Bekkenstructuur, Klauwen en Ondervoet

Het bekkencomplex vertoont ernstige vereenvoudigingen. Bij een biologisch correcte melkkoe zijn het haakbeen (tuber coxae), het zitbeen (tuber ischii) en de heiligbeenkam (crista sacralis) geprononceerde benige oriëntatiepunten die direct onder de huid zichtbaar zijn. In het model zijn deze structuren gladgestreken, waardoor de bekkenhelling en kruisvorm visueel vervagen.De ondervoet en klauwen zijn anatomisch onvolledig gemodelleerd. Runderen zijn evenhoevigen (artiodactyla) waarbij het gewicht primair wordt gedragen door twee functionele tenen: digitus III (binnenklauw vóór, buitenklauw achter) en digitus IV (buitenklauw vóór, binnenklauw achter), vergezeld van twee rudimentaire bijklauwen (afterclaws, digiti II en V) aan de palmaire/plantaire zijde van de koot. In het 3D-model ontbreekt de functionele interdigitale spleet (interdigital cleft) in de rig, en is de kootgewrichtshoek (articulatio metatarso- en metacarpophalangea) star gepositioneerd. Hierdoor rust de klauw als een massieve klomp op het grondvlak, wat realistische gewichtsoverdracht en klauwbelasting tijdens locomotie uitsluit.

| Anatomisch Element | Biologische Referentienorm (Holstein-Friesian) | Huidige Status in barnsimulation |
| :--- | :--- | :--- |
| **Voorhand en Schoft** | Scherpe processus spinosi, droge en wigvormige schouderaanhechting | Afgeronde, vleestypische bespiering zonder botaccentuering |
| **Fossa Paralumbalis** | Uitgesproken holle driehoekige flank links (pensholte) | Vlakke, uniforme welving van de laterale buikwand |
| **Bekkenbeenderen** | Scherpe projecties van tuber coxae en tuber ischii | Sterk afgevlakte botpunten zonder subcutane botdefinitie |
| **Ondervoet & Klauw** | Twee gescheiden functionele klauwen per been, koot- en kroongewricht | Monolithisch klauwelement; ontbrekende functionele interdigitale spleet |
| **Uierstructuur** | Vier gescheiden kwartieren met sulcus intermammaricus en melkaders | Eendelige, bolvormige geometrie zonder duidelijke mediaanbandgroef |

## 2. Biomechanica van Gangwerk en Kreupelheidssimulatie

De evaluatie van locomotie en kreupelheid dient getoetst te worden aan gevalideerde veterinaire meetsystemen. Binnen het melkveeonderzoek is de 5-punts numerieke schaal van Sprecher et al. (1997) de internationale standaard. Deze methode beoordeelt twee hoofdaspecten: de houding van de dorsale wervelkolom (vlak versus gekromd/kyfotisch) in stand en tijdens gang, en de wijze waarop de koe haar ledematen belast en afwikkelt.

| Locomotiescore | Klinische Status | Gedrags- en Gangkenmerken (Sprecher et al., 1997) | Kinematische Implementatie in Codebase |
| :---: | :--- | :--- | :--- |
| **Score 1** | Normaal | Rechte ruglijn in stand en gang; soepele, symmetrische passen; tracking-up | Lineaire motion-clip (walk_slow.fbx); symmetrische standfasen |
| **Score 2** | Licht kreupel | Vlakke rug in stand, maar lichte kyfose (gekromde rug) tijdens stappen; gelijke paslengte | Statische wervelrotatie continu actief, ongeacht stilstaan of lopen |
| **Score 3** | Matig kreupel | Zichtbare kyfose in stand én gang; verkorte paslengte op één of meer ledematen | Verhoogde krommingswaarde; geen asymmetrie in paslengte of grondcontact |
| **Score 4** | Kreupel | Uitgesproken kyfose; ontlasten van een aangedaan been; duidelijke kopknik (head bob) | Lineaire snelheidsvermindering; ontbreken van fase-gekoppelde kopknik |
| **Score 5** | Ernstig kreupel | Extreme kyfose; vrijwel onvermogen om te steunen op aangedane poot; weigert te bewegen | Directe overgang naar downer_cow.fbx zonder tussenliggend strompelpatroon |

### Analyse van de Kinematische Parameters in de Code

Uit analyse van CowAnimator.js en GaitController.js blijkt dat de simulatie van kreupelheid berust op twee eenvoudige ingrepen: een lineaire reductie van de animatiesnelheid en een statische rotatie-offset rond de transversale as van de Spine- en Lumbar-bones. Biomechanisch leidt dit tot ernstige onvolkomenheden:

1. **Kyfose-differentiatie (Sprecher 1 vs 2)**: Ten eerste faalt het model in het onderscheid tussen Sprecher score 1 en score 2. Een score 2 koe staat met een kaarsrechte ruglijn en toont de kyfose pas op het moment dat de cyclus van de voortbeweging aanvangt. Doordat in de code de kyfose-offset gekoppeld is aan een statische sliderwaarde in plaats van een dynamische state-machine die controleert of het dier in beweging is (isMoving), staat een virtuele score 2 koe continu gekromd.

2. **Temporele Pasasymmetrie**: Ten tweede ontbreekt de temporele pasasymmetrie. In een gezonde viervoetige stap bedraagt de verhouding tussen de standfase ($T_{\text{stance}}$, waarin de klauw contact maakt met de bodem) en de zwaaifase ($T_{\text{swing}}$) circa $60:40$. Wanneer een koe kreupel is aan een been (bijvoorbeeld linksvoor, $L_1$), reageert het zenuwstelsel met een antalgische reactie:
$$T_{\text{stance}}(L_1) < T_{\text{stance}}(R_1)$$
De koe verkort de contacttijd op de pijnlijke klauw abrupt en compenseert dit door een verlengde standfase van het contralaterale been ($R_1$). Omdat CowAnimator.js een uniforme skeletanimatie afspeelt waarbij alle vier de benen synchroon dezelfde fasehoek doorlopen, vertoont het model geen kreupelheid, maar slechts een vertraagde, gezonde loopcyclus met een kromme rug.

3. **Fase-gekoppelde Kopbeweging (Head Bobbing)**: Ten derde ontbreekt de fase-gekoppelde verticale kopbeweging (head bobbing). Bij voorpootkreupelheid heft de koe haar kop en hals abrupt omhoog op het moment dat de pijnlijke voorpoot de grond raakt ($t_{\text{impact}}$). Deze hefboombeweging verplaatst het biomechanische zwaartepunt caudaal (naar achteren), waardoor tientallen kilo's aan neerwaartse druk van het pijnlijke been worden weggenomen. Zodra het gezonde been landt, valt de kop weer omlaag. Bij achterpootkreupelheid gebeurt het omgekeerde: de kop zakt omlaag wanneer de pijnlijke achterpoot landt om het gewicht naar de voorhand te hevelen. In het script is de hoofdbeweging puur cosmetisch via look_left.fbx en look_right.fbx geanimeerd, zonder enige kinematische koppeling aan de stapfase van de individuele poten.

4. **Tracking-Up en Abductie**: Ten vierde negeert het model het zogeheten tracking-up fenomeen. Een gezonde koe plaatst haar achterklauwen exact in of net vóór de afdruk van de voorgaande voorklauw aan dezelfde zijde. Bij kreupelheid treedt een negatieve tracking-afstand op (de achterpoot onderstapt en blijft centimeters achter de voorklauwafdruk) gecombineerd met abductie (de poot zwaait zijwaarts naar buiten uit om belasting van de pijnlijke binnenklauw te omzeilen). In IKSolver.js ontbreekt een dergelijk dynamisch trajectpad voor de klauw-effectoren.

## 3. Fysiologische en Visuele Modellering van Dracht

De toestand van drachtigheid (gestatie) brengt bij runderen een ingrijpende verbouwing van de inwendige en uitwendige topografie teweeg. In barnsimulation wordt dracht dynamisch gevisualiseerd via schuifregelaars die inwerken op de omvang van het centrale lichaam.

### Het Biologische Probleem van Symmetrische Expansie

In BreedingValues.js en CowRig.js wordt de toename in buikomvang gesimuleerd door een isotrope of bilateraal symmetrische radiële schaling van de wervels en buik-bones:
$$\mathbf{S}_{\text{belly}} = \begin{pmatrix} 1 + k_x \cdot d \\ 1 + k_y \cdot d \\ 1 + k_z \cdot d \end{pmatrix}$$
waarbij $d \in [0, 1]$ de drachtprogressie representeert en $k_x = k_z$.Dit druist in tegen de elementaire runderanatomie. Het spijsverteringsstelsel van de herkauwer wordt gedomineerd door het voormaagcomplex, waarbij de pens (rumen) met een volume van 150 tot 220 liter vrijwel de gehele linkerhelft van het abdomen vult. De baarmoeder (uterus) bevindt zich ventraal in het bekken en breidt zich tijdens de dracht uitsluitend uit in de rechterbuikwand, waarbij de dunne darmen en de lebmaag naar dorsokraniaal en rechts worden verdrongen. Visueel resulteert dit in een uitgesproken asymmetrie:

- **Rechterflank**: De rechterflank en rechteronderbuik puilen in het derde trimester (maand 7 tot 9) zwaar en peervormig uit naar lateraal en ventraal.
- **Linkerflank**: De linkerflank behoudt de vorm van de pens en vertoont bij drachtige koeien nauwelijks extra uitzetting; sterker nog, doordat de foetus op het maagdarmkanaal drukt, neemt de drogestofopname vóór het kalven af, waardoor de linker fossa paralumbalis (hongergroeve) dieper kan invallen.

| Drachtstadium | Veterinaire Realiteit (Morfologie en Anatomie) | Weergave in de Codebase |
| :--- | :--- | :--- |
| **0–5 maanden** | Geen waarneembare uitwendige volumeverandering | Soms lineair gekoppeld vanaf dag 1, wat onrealistisch vroeg zwelling toont |
| **6–8 maanden** | Duidelijke asymmetrische expansie van de rechteronderflank; lichte lordose | Bilateraal symmetrische bolling van de gehele romp (Spine-schaling) |
| **Laatste 48 uur** | Verslapping ligamenta sacrotuberale; diepe putten naast staart; uierzwelling | Geen bot- of vertexdeformatie rondom bekken en heiligbeen |
| **Uierstuwing (Partus naderend)** | Springing: toename van kwartieren, speendivergentie, oedeem van de buikader | Statische schaling van de totale uier-mesh; geen oedeemverloop |

### Bekkenligamenten en Partus-indicatoren

In de laatste 24 tot 48 uur voor de partus zorgt de endocriene cascade (afgifte van relaxine, oestrogeen en prostaglandines) voor een drastische verweking van het bekkenbindweefsel. De brede bekkenbanden (ligamenta sacrotuberale) verslappen volledig, waardoor het heiligbeen (os sacrum) kantelt en diepe, holle groeven ontstaan tussen de staartinplant en de zitbeenderen. Dit zogeheten 'afkruisen' is voor veehouders en dierenartsen het belangrijkste visuele signaal dat het afkalven binnen enkele uren aanvangt. Het virtuele model van barnsimulation bezit geen blendshapes of secundaire bekkengewrichten om deze dramatische verweking te visualiseren, waardoor een hoogdrachtige koe er net zo rigide uitziet als een maagdelijke vaars.

## 4. Implementatie van Fokwaarden en Lineaire Exterieurbeoordeling

Het stelsel van fokwaarden voor exterieur is internationaal geharmoniseerd door de World Holstein Friesian Federation (WHFF) en het International Committee for Animal Recording (ICAR). In Nederland vertaalt de Coöperatie Rundveeverbetering (CRV) deze kenmerken naar een lineaire schaal van 1 tot 9 bij keuringen, en fokwaarden met een gemiddelde van 100 en een genetische spreiding ($\sigma = 4$).In BreedingValues.js worden deze parameters omgezet naar grafische transformaties. De validatie van deze transformaties legt fundamentele structurele problemen bloot:

| WHFF Kenmerk | Schaal (1 - 9) | Definitie conform ICAR / WHFF | Huidige Code-Transformatie in BreedingValues.js | Wetenschappelijke Beoordeling |
| :--- | :---: | :--- | :--- | :--- |
| **Hoogtemaat (Stature)** | 1=Klein, 9=Groot | Hoogte gemeten vanaf de grond tot het hoogste punt van het kruis | Uniforme schaling van het skelet op de Y-as: `root.scale.y` | Acceptabel, maar negeert dat groei niet-isometrisch is (poten groeien anders dan romp). |
| **Voorhand (Chest Width)** | 1=Smal, 9=Breed | Afstand tussen de binnenkanten van de voorbenen | Schaling van de afstand tussen Clavicle/Shoulder-bones | Matig: leidt bij hoge waarden tot holle schouders zonder compensatie van ribwelving. |
| **Inhoud (Body Depth)** | 1=Ondiep, 9=Diep | Afstand tussen ruglijn en de onderkant van de ribbenkast | Lokale Y-translatie van de borstkasbones | Onvoldoende: borstdiepte is gekoppeld aan ribwelving; model wordt platgedrukt i.p.v. ruim. |
| **Kruisligging (Rump Angle)** | 1=Vlak/oplopend, 9=Kappend | Hoogte van het zitbeen (ischii) t.o.v. het haakbeen (coxae) | Rotatie van de Pelvis-bone om de transversale X-as | Problematisch: kanteling trekt de achterpoten mee waardoor de hoeven loskomen van de vloer. |
| **Stand benen zijaanzicht** | 1=Steil, 9=Sabelbenig | Hoek van het spronggewricht (tarsus) in rust | Lokale rotatie van de Hock-bone | Foutief: sabelbenigheid verkort de functionele pootlengte; poot penetreert de bodem of zweeft. |
| **Klauwhoek (Foot Angle)** | 1=Laag, 9=Steil | Hoek van de voorwand van de achterklauw t.o.v. de vloer | Rotatie van het koot-/klauwbewustzijn | Onvolledig: verandert de klauwhoek zonder de kootgewrichtsflexie (metatarsophalangea) aan te passen. |
| **Ophangband (Udder Cleft)** | 1=Vlak, 9=Diep | Diepte van de centrale groef (sulcus intermammaricus) | Schaling van de centrale uier-bone | Onvoldoende: vereist morph targets; simpele bottranslatie trekt de uiercontour uit proportie. |

### Het Ontbreken van Kinematische Ketencorrecties

Het fundamentele wiskundige manco in BreedingValues.js is het isoleren van bottransformaties zonder biomechanische ketencompensatie. Wanneer in de biologie een koe 'sabelbenig' is (een scherpe spronggewrichtshoek $\theta_{\text{hock}} < 135^\circ$, score 8–9), compenseert het dier door de femur-tibia-hoek aan te passen en de koot meer te buigen om de zool evenwijdig aan de bodem te houden. In het script roteert de Hock-bone echter autonoom. Hierdoor verandert de effectieve afstand van het heupgewricht tot de grond:
$$L_{\text{eff}} = L_{\text{femur}} \cos(\theta_1) + L_{\text{tibia}} \cos(\theta_2) + L_{\text{metatarsus}} \cos(\theta_3)$$
Omdat $L_{\text{eff}}$ afneemt bij toegenomen hoeking, zakt de achterhand scheef omlaag tenzij een volledige IK-keten de heuppositie en wervelkolom herberekent. Aangezien dit niet gebeurt, ontstaat clipping met het vloeroppervlak of een onbedoelde verandering van de kruisligging.Bovendien negeert de huidige opzet de genetische covariantiematrix. In een levende populatie kan een koe niet beschikken over een fokwaarde van 120 voor inhoud en tegelijkertijd een fokwaarde van 80 voor voorhand zonder ernstige pathologische misvormingen. Het ontbreken van multivariate grenzen in ControlPanel.js stelt gebruikers in staat fenotypes te configureren die biologisch niet-levensvatbaar zijn.

## 5. Visuele Shading, Belichting en Vachtpatronen

Naast macro-morfologie en beweging wordt het realisme van het koemodel in hoge mate bepaald door de microstructuur van het oppervlak en de interactie met lichtbronnen in Three.js.

### Fysica van Runderhaarbewolking (PBR vs. Anisotropie)

De shaders in `CowMesh.js` maken gebruik van Three.js MeshStandardMaterial, een implementatie van een klassieke isotrope Cook-Torrance microfacet-verdeling gecombineerd met diffuse Lambert- of Oren-Nayar-reflectie. Dit materiaalmodel is toereikend voor homogene, gladde oppervlakken zoals plastic of gepolijst metaal, maar schiet tekort voor de complexe optische eigenschappen van een rundervacht:

- **Isotrope versus Anisotrope Reflectie**:  Runderharen liggen geordend in specifieke stroomrichtingen (hair tracts en kruinen). Hierdoor is de reflectie van zonlicht sterk anisotroop; de spiegelende highlight vormt geen cirkel, maar een uitgerekte strook die loodrecht op de richting van de haarschacht staat. Door het ontbreken van een tangent space hair direction map en een anisotrope shader (zoals het Kajiya-Kay of Marschner model) oogt de koe in de simulatie dof, stoffig of juist als zacht rubber, in plaats van de karakteristieke satijnachtige glans van gezond melkvee te tonen.
- **Subsurface Scattering (SSS)**:  Levend weefsel met een dunne opperhuid en hoge vascularisatie (doorbloeding)—zoals de oorschelpen, de neusspiegel (planum nasolabiale) en met name de spenen en uier—vertoont sterke subsurface scattering. Licht dringt het weefsel binnen, verstrooit intern en verlaat het weefsel op een andere plek met een karakteristieke rozerode tint. Zonder SSS-translucentie ogen de spenen in barnsimulation als massieve grijze of vale cilinders, wat afbreuk doet aan de visuele werkelijkheid.

### Genetische Validiteit van ProceduralSkinGenerator

De procedurele generator ProceduralSkinGenerator.js poogt fenotypische variaties (zwartbont, roodbont, Blaarkop) wiskundig te synthetiseren. Biologisch ontstaan zwart- en roodbontpatronen door de embryonale migratie van melanoblasten vanuit de neurale lijst langs het dorsoventrale traject. Dit proces gehoorzaamt aan strikte natuurwetten:

- **Leucisme en Witpatronen**:  Witte zones ontstaan op plekken waar melanocyten het laatst arriveren: de extremiteiten van de poten (witte sokken), de onderzijde van de buik en de staartpluim (switch).Tekortkoming in de Code: De procedurele generator maakt gebruik van ongefilterde Perlin- of Simplex-ruis over de UV-coördinaten. Dit resulteert regelmatig in biologisch onmogelijke patronen, zoals geïsoleerde zwarte vlekken op de ondervoet direct boven de klauw, pigmentatie op de staartpunt, of vlekken die abrupt afbreken op UV-seams.
- **Blaarkop-aftekening**:  De Blaarkop-textuur in textures/cow_f_blaarkop.jpg vangt het basiskenmerk (gepigmenteerde ringen rond de ogen op een witte kop), maar de randen tussen het witte kophaar en de gekleurde oogblaren zijn te diffuus overvloeiend weergegeven. In de werkelijkheid is deze grens scherp gedefinieerd op het niveau van individuele haarfollikels.

## 6. Vergelijkende Validatiematrix van de Module `cow`

Onderstaande matrix geeft een integraal overzicht van de wetenschappelijke en veterinaire validiteit van alle parameters en subsystemen in de geanalyseerde repository.

| Module / Subsysteem | Getoetste Parameter | Biologische / Wetenschappelijke Norm | Huidige Implementatie in Code | Wetenschappelijke Beoordeling |
| :--- | :--- | :--- | :--- | :---: |
| `CowMesh.js` | Osteologische detaillering | Zichtbare haak-/zitbeenderen, scherpe schoft, diepe linkerflank | Afgevlakte bekkencontour, bolle thoracale bespiering | **Onvoldoende** |
| `CowRig.js` | Distale pootstructuur | Twee functionele draagklauwen, buigzaam kootgewricht | Monolithisch klauwblok, ontbrekende interdigitale spleet | **Onvoldoende** |
| `CowAnimator.js` | Kyfose bij kreupelheid | Sprecher 2: vlak in stand, boog bij gang. Sprecher 3+: permanent | Statische spine-rotatieoffset; geen koppeling met bewegingsstatus | **Onvoldoende** |
| `GaitController.js` | Temporele pasdynamiek | Verkorte standfase ($T_{\text{stance}}$) aangedane poot, asymmetrie | Symmetrische loopcyclus; uitsluitend globale snelheidsvertraging | **Foutief** |
| `GaitController.js` | Head bobbing | Verticale kopversnelling gekoppeld aan landingsfase poot | Volledig ontkoppeld; kop beweegt uitsluitend via ambient animatie | **Ontbreekt** |
| `GaitController.js` | Tracking-up | Lame koe vertoont onderstappen en klauwabductie | Vaste voetplaatsingsvectoren zonder abductiecompensatie | **Matig** |
| `BreedingValues.js` | Dracht: Buikcontour | Asymmetrische expansie: primair rechterflank en onderbuik | Symmetrische isotrope/bilaterale vergroting van wervelkolom en buik | **Onvoldoende** |
| `BreedingValues.js` | Dracht: Bekkenbanden | Verslapping lig. sacrotuberale met diepe kuilen 24-48u a.p. | Bekkenregio blijft rigide; geen verweking van weefsel gemodelleerd | **Ontbreekt** |
| `BreedingValues.js` | Fokwaarde: Beenkromming | Spronggewrichtshoek compenseert pootlengte via IK-keten | Roteert uitsluitend spronggewricht; pootlengte clipt door vloer | **Foutief** |
| `BreedingValues.js` | Fokwaarde: Uierkenmerken | Morfologische welving conform WHFF 1-9 lineaire uierkenmerken | Eenvoudige schaling van uier-bones zonder weefselgroeven | **Matig** |
| `ProceduralSkinGenerator.js` | Pigmentpatronen | Melanoblastenmigratie; witte onderbenen, buik en staartpluim | Vrije Perlin-ruis; pigmentvlekken lopen willekeurig over klauw en staart | **Matig** |
| `CowMesh.js` | PBR & Vachtweergave | Anisotrope haarreflectie en subsurface scattering op dunne weefsels | Standaard isotroop Cook-Torrance model; rubberachtige uitstraling | **Matig** |

## 7. Aanbevelingen voor Ontwikkelaars

Om het koemodel in barnsimulation wetenschappelijk betrouwbaar te maken voor zoötechnisch onderwijs, onderzoek en validatie van computervisiemodellen, dienen ontwikkelaars de procedurele logica te herzien aan de hand van onderstaande stappen.

### 1. Kinematische Revisie van het Gangwerk en Kreupelheid

De overstap van statisch geschaalde loopclips naar een hybride procedureel animatiesysteem is noodzakelijk om de Sprecher-locomotiescore accuraat te reproduceren:

- **Snelheid-afhankelijke Kyfose**: Koppel de kyfose-berekening in CowAnimator.js aan de snelheidsvector van het dier. Voor een kreupelheidsscore van 2 moet de rotatie van de lumbale wervels uitsluitend plaatsvinden wanneer de snelheid groter is dan een drempelwaarde ($\Vert{}\vec{v}\Vert{} > 0.05 \text{ m/s}$), terwijl bij stilstand de ruglijn vlak getrokken wordt ($\theta_{\text{spine}} = 0$). Voor scores 3 en hoger moet de kyfose permanent actief blijven conform de klinische definities.
- **Asymmetrische Gangcyclus**: Introduceer een asymmetrische faseverschuiving in GaitController.js. Bij kreupelheid aan poot $k$ moet de genormaliseerde cyclusduur worden gesplitst in been-specifieke tijdschalen:
$$T_{\text{stance}, k} = T_{\text{base}} \cdot (1 - \alpha \cdot \text{Severity})$$$$T_{\text{stance}, \text{contra}} = T_{\text{base}} \cdot (1 + \beta \cdot \text{Severity})$$
waarbij $\alpha$ en $\beta$ empirisch worden afgesteld op basis van klinische gangdata.
- **Fase-gekoppelde Hoofdbeweging (Head Bobbing)**: Implementeer een fase-gekoppelde hals- en hoofdbeweging. Koppel een dempingsimpuls aan de Neck- en Head-bones zodra de aangedane voorpoot de vloer raakt, zodat het hoofd opwaarts versnelt ter ontlasting van de voorhand.

### 2. Anatomische Revisie van Drachtmodelleringspijplijn

De huidige bot-schaling moet worden vervangen door asymmetrische blendshapes (morph targets):

- **Asymmetrische Flankexpansie**: Modelleer in een 3D-pakket (zoals Blender) een specifieke morph target pregnant_belly waarin de rechterflank en de ventrale buikwand rechts asymmetrisch uitzetten, terwijl de linkerflank de uitholling van de fossa paralumbalis behoudt. Koppel de drachtregelaar in de interface aan het gewicht van deze asymmetrische morph target.
- **Bekkenbandverslapping (Pre-parturient)**: Creëer een secundaire morph target `pre_parturient_pelvis` die specifiek de ligamentverslapping nabij de staartinplant aanstuurt. Activeer deze deformatie uitsluitend in de virtuele tijdstap die de laatste 48 uur voor het kalven representeert.
- **Gearticuleerde Uier met Speendivergentie**: Vervang de rigide uier door een mesh waarin de vier kwartieren en de centrale sulcus intermammaricus zijn gedefinieerd, inclusief een schaalfunctie die bij toegenomen dracht en melkproductie de spenen licht naar buiten doet wijken (divergentie) als gevolg van stuwing.

### 3. Kinematische Ketencompensatie voor Fokwaarden

In `BreedingValues.js` moeten botrotaties worden geïntegreerd met de `IKSolver.js`:

- **Gesloten Kinematische Keten**: Wanneer een fokwaarde voor de stand van de achterbenen (hoek van het spronggewricht) of de klauwhoek wordt gewijzigd, mag dit niet resulteren in een geïsoleerde botrotatie. De solver moet de totale pootlengte vectorieel herberekenen en de heuppositie via inverse kinematics corrigeren zodat de zool van de klauw vlak op het nulpunt van de Y-as ($y = 0$) verankerd blijft:
$$\vec{P}_{\text{hoof}} = \text{ForwardKinematics}(\theta_{\text{hip}}, \theta_{\text{stifle}}, \theta_{\text{hock}}, \theta_{\text{pastern}}) \quad \text{waarbij} \quad P_{\text{hoof}, y} \equiv 0$$

- **Multivariate Covariatiegrenzen**: Breng wiskundige correlatiegrenzen aan in ControlPanel.js om te voorkomen dat biologisch onverenigbare uitersten gelijktijdig worden geactiveerd.

### 4. Upgrade van Shaders en Procedurele Vachtverdeling

Voor een overtuigende visuele werkelijkheid moet de optische interactie van het model worden verbeterd:

- **Anisotrope Kajiya-Kay Reflectie**: Vervang het standaard Three.js materiaal door een custom ShaderMaterial met een benadering van het Kajiya-Kay reflectiemodel. Door een anisotrope highlight-richting te koppelen aan een flow map over het runderlichaam, ontstaat de natuurlijke glanslijn over de ribbenkast en flanken.
- **Subsurface Scattering (Translucentie)**: Voeg een subsurface scattering benadering (translucentie-map) toe aan de spenen, binnenzijde van de oorschelpen en de neusspiegel, zodat zonlicht zacht door deze dunne weefsels dringt en de typische rozige doorschijnendheid ontstaat.
- **Melanoblastenmigratie & Leucisme Masks**: Herprogrammeer de ruisfunctie in `ProceduralSkinGenerator.js` naar een embryonaal geïnspireerd reactie-diffusiemodel. Definieer binaire maskeringszones (clipping masks) op de UV-lay-out die de ondervoeten, de ventrale buiklijn en de staartpluim vrijwaren van pigmentvlekken bij Holstein-Friesian zwart- en roodbontpatronen, en verhoog de gradiëntsteilheid van de vlekcontouren bij de Groninger Blaarkop-textuur.
