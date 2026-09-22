import { buildings, researchName, resourceName } from "./data";
import { pay, unlocked } from "./engine";
import type { Cost, Resource } from "./types";
import type { ProgressionGameState, SettlementTierId } from "./progression";

export interface BuildingStage {
  fromLevel: number;
  toLevel: number;
  name: string;
  requiredSettlement: SettlementTierId;
  requiredResearch?: string[];
  baseCost: Cost;
  growth: number;
  durationMultiplier: number;
  description: string;
}

export interface BuildingDevelopment {
  buildingId: string;
  stages: BuildingStage[];
}

const stage = (
  fromLevel: number,
  toLevel: number,
  name: string,
  requiredSettlement: SettlementTierId,
  baseCost: Cost,
  description: string,
  requiredResearch: string[] = [],
  growth = 1.32,
  durationMultiplier = 1,
): BuildingStage => ({
  fromLevel,
  toLevel,
  name,
  requiredSettlement,
  requiredResearch,
  baseCost,
  growth,
  durationMultiplier,
  description,
});

const line = (buildingId: string, stages: BuildingStage[]): BuildingDevelopment => ({
  buildingId,
  stages,
});

export const buildingDevelopments: BuildingDevelopment[] = [
  line("gatherers", [
    stage(1, 3, "Punkt zbiórki", "camp", { wood: 12, stone: 6 }, "Prowizoryczne miejsce organizacji zbieraczy."),
    stage(4, 7, "Obóz zbieraczy", "settlement", { wood: 25, planks: 12, rope: 2 }, "Lepsze składowanie i organizacja pracy terenowej.", ["storage"]),
    stage(8, 11, "Skład terenowy", "large-village", { planks: 30, pottery: 8, cloth: 6 }, "Stały punkt zaopatrzeniowy dla ekip terenowych.", ["weaving", "pottery"]),
    stage(12, 15, "Punkt aprowizacyjny", "town", { hardplanks: 35, bricks: 30, tools: 2, knowledge: 8 }, "Zorganizowane zaopatrzenie i ewidencja zapasów.", ["organization", "ironwork"], 1.38, 1.15),
    stage(16, 20, "Urząd zaopatrzenia", "city", { nobleplanks: 30, bricks: 70, iron: 20, tools: 5, knowledge: 25 }, "Miejski system dystrybucji i rezerw.", ["architecture"], 1.42, 1.3),
  ]),
  line("fire", [
    stage(1, 3, "Ognisko", "camp", { wood: 25, stone: 14 }, "Centralne miejsce ciepła i spotkań."),
    stage(4, 7, "Palenisko", "small-settlement", { stone: 35, wood: 25, pottery: 4 }, "Trwalsze palenisko obsługujące większą społeczność.", ["shelters"]),
    stage(8, 11, "Miejsce zgromadzeń", "village", { planks: 30, stone: 45, cloth: 5 }, "Zadaszona przestrzeń wspólnoty."),
    stage(12, 15, "Plac osady", "small-town", { bricks: 65, hardplanks: 30, iron: 8, knowledge: 10 }, "Formalne centrum życia osady.", ["organization"], 1.38, 1.2),
    stage(16, 20, "Centrum wspólnoty", "city", { bricks: 120, nobleplanks: 35, iron: 20, gold: 30, knowledge: 25 }, "Reprezentacyjne centrum dużego miasta.", ["architecture"], 1.42, 1.35),
  ]),
  line("shelter", [
    stage(1, 3, "Prowizoryczne schronienia", "camp", { wood: 20, stone: 5 }, "Najprostsze zadaszenia i namioty."),
    stage(4, 7, "Szałasy", "small-settlement", { wood: 30, leather: 6, rope: 3 }, "Trwalsze schronienia z wiązaniami i skórami.", ["hunting"]),
    stage(8, 11, "Chaty", "settlement", { planks: 28, rope: 6, cloth: 5, stone: 20 }, "Proste budynki mieszkalne dla stałej osady.", ["sawing", "weaving"]),
    stage(12, 15, "Domostwa prowizoryczne", "village", { planks: 50, bricks: 25, cloth: 8, bronzeTools: 1 }, "Ostatni etap rozwoju lekkiej zabudowy.", ["masonry"], 1.36, 1.15),
    stage(16, 20, "Zabudowa tymczasowa", "small-town", { hardplanks: 55, bricks: 55, iron: 6, tools: 2 }, "Tania zabudowa dla napływowej ludności; docelowo zastępowana domami.", ["ironwork"], 1.4, 1.25),
  ]),
  line("house", [
    stage(1, 3, "Chata z bali", "small-settlement", { wood: 55, stone: 25 }, "Pierwsze trwałe domy z drewna."),
    stage(4, 7, "Dom z bali", "settlement", { wood: 70, planks: 18, stone: 30, rope: 4 }, "Większe, lepiej uszczelnione domostwa.", ["sawing"]),
    stage(8, 11, "Duży dom", "village", { hardwood: 35, planks: 45, bricks: 30, bronzeTools: 1 }, "Trwalsza zabudowa dla zamożniejszych rodzin.", ["forestry", "masonry"]),
    stage(12, 15, "Zabudowa wiejska", "large-village", { hardplanks: 60, bricks: 60, iron: 8, tools: 2 }, "Gęstsza, uporządkowana zabudowa mieszkalna.", ["housing", "ironwork"], 1.38, 1.2),
    stage(16, 20, "Kwartał drewniany", "small-town", { nobleplanks: 45, bricks: 100, iron: 18, tools: 4, knowledge: 15 }, "Zaawansowana drewniana zabudowa miejska.", ["architecture"], 1.42, 1.35),
  ]),
  line("boardhouse", [
    stage(1, 3, "Dom drewniany", "village", { planks: 38, stone: 25, rope: 5 }, "Domy z ciętego drewna zapewniają więcej miejsca."),
    stage(4, 7, "Dom piętrowy", "large-village", { planks: 55, bricks: 30, cloth: 5, bronzeTools: 1 }, "Zabudowa wykorzystująca lepsze łączenia i fundamenty."),
    stage(8, 11, "Kamienica drewniana", "small-town", { hardplanks: 55, bricks: 55, iron: 6, bronzeTools: 2 }, "Gęsta zabudowa dla rozwijającego się miasteczka.", ["forestry"]),
    stage(12, 15, "Zabudowa miejska", "town", { hardplanks: 80, bricks: 95, iron: 16, tools: 3, knowledge: 12 }, "Standaryzowane budownictwo miejskie.", ["ironwork", "organization"], 1.4, 1.25),
    stage(16, 20, "Kwartał czynszowy", "city", { nobleplanks: 60, bricks: 150, iron: 32, tools: 6, gold: 30 }, "Duże zespoły zabudowy mieszkalnej.", ["architecture"], 1.45, 1.4),
  ]),
  line("stonehouse", [
    stage(1, 3, "Dom kamienny", "large-village", { bricks: 55, hardplanks: 25, tools: 2 }, "Ciężka i trwała zabudowa mieszkalna."),
    stage(4, 7, "Kamienica", "small-town", { bricks: 80, hardplanks: 35, iron: 8, tools: 2 }, "Wielokondygnacyjne domy dla centrum miasteczka."),
    stage(8, 11, "Kamienica wielorodzinna", "town", { bricks: 120, hardplanks: 50, iron: 18, tools: 4 }, "Gęsta zabudowa dla rosnącej populacji.", ["ironwork"]),
    stage(12, 15, "Kwartał kamienny", "large-town", { bricks: 180, nobleplanks: 35, iron: 35, tools: 6, knowledge: 20 }, "Zorganizowane kwartały miejskie.", ["architecture"], 1.42, 1.3),
    stage(16, 20, "Zabudowa wielkomiejska", "city", { bricks: 260, nobleplanks: 55, iron: 60, tools: 10, gold: 60, knowledge: 35 }, "Masowa, trwała zabudowa dużego miasta.", ["architecture", "organization"], 1.48, 1.5),
  ]),
  line("logger", [
    stage(1, 3, "Chata drwala", "small-settlement", { wood: 25, stone: 15, stoneTools: 1 }, "Podstawowa organizacja wyrębu."),
    stage(4, 7, "Obóz drwali", "settlement", { planks: 25, stone: 22, rope: 4, stoneTools: 2 }, "Stały obóz z miejscem obróbki i składowania."),
    stage(8, 11, "Zakład leśny", "large-village", { planks: 45, bricks: 25, bronzeTools: 2, hardwood: 15 }, "Profesjonalne pozyskiwanie trudniejszych gatunków drewna.", ["forestry"]),
    stage(12, 15, "Leśnictwo", "town", { hardplanks: 55, bricks: 50, iron: 12, tools: 3, knowledge: 8 }, "Planowa gospodarka leśna i lepsze zaplecze.", ["ironwork"], 1.4, 1.25),
    stage(16, 20, "Przedsiębiorstwo drzewne", "city", { nobleplanks: 45, bricks: 90, iron: 28, tools: 6, knowledge: 22 }, "Duża organizacja leśna obsługująca miasto i region.", ["carpentry"], 1.45, 1.4),
  ]),
  line("quarry", [
    stage(1, 3, "Punkt wydobycia", "small-settlement", { wood: 28, stone: 18, stoneTools: 1 }, "Ręczne wydobycie i obróbka kamienia."),
    stage(4, 7, "Kamieniołom", "settlement", { planks: 24, rope: 4, stoneTools: 2, stone: 28 }, "Lepsze dojście do złoża i transport urobku."),
    stage(8, 11, "Zakład kamieniarski", "large-village", { planks: 35, bricks: 30, bronzeTools: 2 }, "Obróbka bloków i produkcja materiałów konstrukcyjnych.", ["masonry"]),
    stage(12, 15, "Duży kamieniołom", "town", { hardplanks: 40, bricks: 60, iron: 15, tools: 3 }, "Wydobycie na większą skalę.", ["ironwork"], 1.4, 1.25),
    stage(16, 20, "Przemysł kamieniarski", "city", { bricks: 120, iron: 35, tools: 7, knowledge: 20 }, "Zmechanizowane wydobycie dla dużych inwestycji.", ["architecture"], 1.45, 1.45),
  ]),
  line("well", [
    stage(1, 3, "Studnia", "settlement", { wood: 20, stone: 35, rope: 3 }, "Stały dostęp do czystszej wody."),
    stage(4, 7, "Studnia murowana", "village", { bricks: 35, planks: 18, rope: 5 }, "Trwalsza konstrukcja i lepszy mechanizm czerpania."),
    stage(8, 11, "Cysterna", "large-village", { bricks: 60, pottery: 15, bronze: 5, planks: 25 }, "Zapas wody na okresy zwiększonego zużycia."),
    stage(12, 15, "Sieć studni", "small-town", { bricks: 90, iron: 16, tools: 3, knowledge: 10 }, "Rozproszony system zaopatrzenia dzielnic.", ["ironwork", "organization"], 1.4, 1.25),
    stage(16, 20, "Wodociągi", "city", { bricks: 160, iron: 45, tools: 7, knowledge: 30, gold: 25 }, "Miejska infrastruktura wodna.", ["architecture"], 1.45, 1.5),
  ]),
  line("hunter", [
    stage(1, 3, "Obóz łowiecki", "small-settlement", { wood: 30, stoneTools: 2, leather: 2 }, "Podstawowe polowania i wyprawianie skór."),
    stage(4, 7, "Chata łowców", "settlement", { planks: 25, leather: 8, rope: 4, stoneTools: 2 }, "Stała baza dla ekip łowieckich."),
    stage(8, 11, "Gildia łowiecka", "large-village", { planks: 40, cloth: 8, packs: 2, bronzeTools: 1 }, "Lepsza organizacja dalekich polowań."),
    stage(12, 15, "Punkt zaopatrzenia", "town", { hardplanks: 35, iron: 10, packs: 4, medicine: 4, tools: 2 }, "Profesjonalne zaplecze wypraw leśnych.", ["ironwork", "herbalism"], 1.38, 1.2),
    stage(16, 20, "Służba leśna", "city", { bricks: 60, iron: 25, maps: 4, medicine: 8, knowledge: 18 }, "Regionalny nadzór terenów łowieckich i leśnych.", ["cartography"], 1.42, 1.35),
  ]),
  line("farm", [
    stage(1, 3, "Poletka", "settlement", { wood: 40, stone: 18, seeds: 2 }, "Pierwsze regularne uprawy."),
    stage(4, 7, "Gospodarstwo", "village", { planks: 28, rope: 5, seeds: 4, stoneTools: 2 }, "Stałe gospodarstwo z zabudowaniami pomocniczymi."),
    stage(8, 11, "Duże gospodarstwo", "large-village", { planks: 50, bricks: 30, bronzeTools: 2, seeds: 6 }, "Większy areał i lepsza organizacja zbiorów."),
    stage(12, 15, "Folwark", "town", { hardplanks: 55, bricks: 65, iron: 14, tools: 3, knowledge: 8 }, "Duży kompleks rolniczy obsługujący miasteczko.", ["ironwork", "organization"], 1.4, 1.25),
    stage(16, 20, "Kompleks rolniczy", "city", { bricks: 120, iron: 32, tools: 6, knowledge: 25, gold: 20 }, "Wysokowydajna produkcja żywności dla miasta.", ["architecture"], 1.45, 1.4),
  ]),
  line("mine", [
    stage(1, 3, "Szyb odkrywkowy", "village", { planks: 28, stone: 35, rope: 5, stoneTools: 2 }, "Płytkie wydobycie rud."),
    stage(4, 7, "Płytka kopalnia", "large-village", { planks: 45, rope: 8, bricks: 20, stoneTools: 3 }, "Wzmocnione chodniki i lepsza wentylacja."),
    stage(8, 11, "Kopalnia", "small-town", { hardplanks: 50, bricks: 45, bronzeTools: 3, rope: 12 }, "Stały zakład wydobywczy dla kilku złóż.", ["bronzework"]),
    stage(12, 15, "Głęboka kopalnia", "town", { hardplanks: 75, bricks: 80, iron: 22, tools: 4, coal: 20 }, "Głębsze chodniki wymagają żelaznych konstrukcji.", ["ironwork"], 1.42, 1.35),
    stage(16, 20, "Kompleks górniczy", "city", { bricks: 150, iron: 55, tools: 9, coal: 45, knowledge: 25 }, "Przemysłowe wydobycie na potrzeby regionu.", ["architecture"], 1.48, 1.55),
  ]),
  line("workshop", [
    stage(1, 3, "Prymitywny warsztat", "camp", { wood: 15, stone: 10 }, "Produkcja pierwszych narzędzi."),
    stage(4, 7, "Warsztat", "settlement", { planks: 22, stone: 20, stoneTools: 2 }, "Lepsze stanowiska i więcej miejsca dla rzemieślników."),
    stage(8, 11, "Zakład rzemieślniczy", "large-village", { planks: 38, bricks: 25, bronze: 6, bronzeTools: 1 }, "Rzemiosło metalowe i dokładniejsze narzędzia.", ["bronzework"]),
    stage(12, 15, "Manufaktura narzędzi", "town", { hardplanks: 45, bricks: 55, iron: 18, tools: 3 }, "Produkcja żelaznych narzędzi na większą skalę.", ["ironwork"], 1.4, 1.25),
    stage(16, 20, "Duży zakład narzędziowy", "city", { nobleplanks: 35, bricks: 100, iron: 40, tools: 7, knowledge: 22 }, "Zaawansowany zakład zaopatrujący całe miasto.", ["architecture"], 1.45, 1.4),
  ]),
  line("sawmill", [
    stage(1, 3, "Piła ręczna", "settlement", { wood: 35, stone: 20, stoneTools: 2 }, "Proste stanowiska do cięcia drewna."),
    stage(4, 7, "Tartak", "village", { planks: 35, stone: 28, rope: 5, stoneTools: 2 }, "Stały tartak produkujący deski."),
    stage(8, 11, "Duży tartak", "large-village", { hardplanks: 30, bricks: 35, bronzeTools: 2, bronze: 5 }, "Cięcie trudniejszych gatunków drewna.", ["forestry", "bronzework"]),
    stage(12, 15, "Tartak mechaniczny", "town", { hardplanks: 60, bricks: 70, iron: 20, tools: 3 }, "Żelazne mechanizmy zwiększają skalę produkcji.", ["ironwork"], 1.42, 1.3),
    stage(16, 20, "Kompleks drzewny", "city", { nobleplanks: 40, bricks: 120, iron: 40, tools: 6, knowledge: 25 }, "Miejski przemysł drzewny.", ["carpentry", "architecture"], 1.48, 1.5),
  ]),
  line("kiln", [
    stage(1, 3, "Paleniska", "settlement", { stone: 35, wood: 30 }, "Proste miejsca wypału."),
    stage(4, 7, "Piece", "village", { stone: 45, clay: 15, planks: 15 }, "Trwalsze piece do węgla i ceramiki."),
    stage(8, 11, "Smolarnia", "large-village", { bricks: 45, planks: 30, pottery: 10, bronze: 4 }, "Lepsza kontrola temperatury i wydajności."),
    stage(12, 15, "Zespół pieców", "town", { bricks: 80, iron: 12, coal: 15, tools: 2 }, "Stały kompleks wielu pieców.", ["ironwork"], 1.4, 1.25),
    stage(16, 20, "Zakład ceramiczno-węglowy", "city", { bricks: 140, iron: 30, coal: 35, tools: 5, knowledge: 18 }, "Przemysłowa produkcja materiałów wypalanych.", ["architecture"], 1.45, 1.45),
  ]),
  line("weaver", [
    stage(1, 3, "Krosno", "village", { wood: 18, flax: 12, rope: 2 }, "Ręczna produkcja tkanin i lin."),
    stage(4, 7, "Warsztat tkacki", "large-village", { planks: 25, flax: 20, rope: 5, cloth: 4 }, "Więcej krosien i lepsza organizacja pracy."),
    stage(8, 11, "Tkarnia", "small-town", { planks: 40, bricks: 22, cloth: 10, bronze: 4 }, "Stały zakład włókienniczy."),
    stage(12, 15, "Manufaktura", "town", { hardplanks: 42, bricks: 50, iron: 10, tools: 2, cloth: 15 }, "Produkcja na potrzeby dużej ludności.", ["ironwork"], 1.4, 1.25),
    stage(16, 20, "Zakład włókienniczy", "city", { bricks: 95, iron: 25, tools: 5, cloth: 30, knowledge: 16 }, "Miejski przemysł tekstylny.", ["architecture"], 1.45, 1.4),
  ]),
  line("mill", [
    stage(1, 3, "Żarna", "village", { stone: 35, wood: 20 }, "Ręczne przetwarzanie zboża."),
    stage(4, 7, "Młyn ręczny", "large-village", { planks: 30, stone: 45, rope: 4 }, "Większe żarna i lepsza organizacja pieczenia."),
    stage(8, 11, "Młyn", "small-town", { planks: 45, bricks: 40, bronze: 6, rope: 6 }, "Stały młyn dla całej okolicy."),
    stage(12, 15, "Duży młyn", "town", { hardplanks: 55, bricks: 70, iron: 15, tools: 3 }, "Duża przetwórnia zboża.", ["ironwork"], 1.4, 1.3),
    stage(16, 20, "Kompleks młynarski", "city", { bricks: 125, iron: 35, tools: 6, knowledge: 18 }, "Zmechanizowany przemiał dla miasta.", ["architecture"], 1.45, 1.45),
  ]),
  line("smelter", [
    stage(1, 3, "Piec hutniczy", "large-village", { bricks: 30, planks: 22, charcoal: 10 }, "Pierwsze kontrolowane wytopy metali."),
    stage(4, 7, "Mała huta", "small-town", { bricks: 48, charcoal: 20, copper: 8, bronzeTools: 1 }, "Stała produkcja miedzi i brązu."),
    stage(8, 11, "Huta", "town", { bricks: 75, hardplanks: 25, bronze: 12, coal: 15 }, "Rozbudowana metalurgia wielu stopów."),
    stage(12, 15, "Wielkie piece", "large-town", { bricks: 120, iron: 25, coal: 40, tools: 3, knowledge: 10 }, "Wysokotemperaturowe piece do żelaza.", ["ironwork"], 1.45, 1.4),
    stage(16, 20, "Kompleks hutniczy", "city", { bricks: 220, iron: 60, coal: 80, tools: 8, knowledge: 30 }, "Przemysłowa metalurgia dla całego regionu.", ["architecture"], 1.5, 1.65),
  ]),
  line("smith", [
    stage(1, 3, "Kowadło", "large-village", { bricks: 20, planks: 22, bronze: 6 }, "Podstawowe stanowisko kowalskie."),
    stage(4, 7, "Kuźnia", "small-town", { bricks: 38, planks: 30, bronze: 12, charcoal: 12 }, "Pełny warsztat do produkcji metalowych narzędzi."),
    stage(8, 11, "Duża kuźnia", "town", { bricks: 60, hardplanks: 30, iron: 12, bronzeTools: 2 }, "Większa liczba palenisk i stanowisk."),
    stage(12, 15, "Manufaktura metalowa", "large-town", { bricks: 100, iron: 30, coal: 25, tools: 4, knowledge: 8 }, "Produkcja narzędzi i części na większą skalę.", ["ironwork"], 1.43, 1.35),
    stage(16, 20, "Zakład metalowy", "city", { bricks: 180, iron: 65, coal: 55, tools: 9, knowledge: 28 }, "Miejski przemysł metalowy.", ["architecture"], 1.48, 1.55),
  ]),
  line("outfitter", [
    stage(1, 3, "Stół wyposażeniowy", "village", { planks: 20, leather: 8, cloth: 4 }, "Podstawowe wyposażenie podróżników."),
    stage(4, 7, "Warsztat podróżnika", "large-village", { planks: 30, leather: 14, cloth: 8, rope: 5 }, "Produkcja plecaków i ekwipunku."),
    stage(8, 11, "Kwatermistrz", "small-town", { planks: 45, bricks: 20, packs: 2, medicine: 3 }, "Stałe zaopatrzenie większych wypraw."),
    stage(12, 15, "Magazyn ekspedycyjny", "town", { hardplanks: 40, bricks: 48, iron: 8, packs: 4, medicine: 6 }, "Zaplecze dla wielu ekip terenowych.", ["ironwork"], 1.38, 1.2),
    stage(16, 20, "Centrum wypraw", "city", { bricks: 90, iron: 22, maps: 4, medicine: 12, knowledge: 20, gold: 20 }, "Miejski ośrodek ekspedycji i kartografii.", ["cartography"], 1.43, 1.4),
  ]),
  line("warehouse", [
    stage(1, 3, "Skład", "small-settlement", { wood: 40, stone: 22 }, "Prosty, zadaszony magazyn."),
    stage(4, 7, "Magazyn", "settlement", { planks: 30, rope: 4, stone: 28 }, "Lepsze regały, ewidencja i większa pojemność."),
    stage(8, 11, "Spichlerz", "large-village", { planks: 48, bricks: 35, pottery: 8, bronzeTools: 1 }, "Trwalsze przechowywanie żywności i materiałów."),
    stage(12, 15, "Magazyn centralny", "town", { hardplanks: 60, bricks: 75, iron: 14, tools: 3, knowledge: 10 }, "Centralny węzeł zaopatrzenia miasteczka.", ["ironwork", "organization"], 1.4, 1.3),
    stage(16, 20, "Centrum logistyczne", "city", { nobleplanks: 40, bricks: 140, iron: 38, tools: 7, knowledge: 28, gold: 30 }, "Magazynowanie i dystrybucja w skali miasta.", ["architecture"], 1.46, 1.5),
  ]),
  line("library", [
    stage(1, 3, "Stół skryby", "village", { planks: 25, cloth: 8 }, "Pierwsze miejsce zapisu i porządkowania wiedzy."),
    stage(4, 7, "Pracownia", "large-village", { planks: 35, cloth: 12, maps: 1 }, "Stała pracownia skrybów i kartografów."),
    stage(8, 11, "Archiwum", "small-town", { hardplanks: 35, bricks: 25, cloth: 18, knowledge: 8 }, "Bezpieczne przechowywanie dokumentów i map."),
    stage(12, 15, "Biblioteka", "town", { hardplanks: 55, bricks: 60, iron: 8, knowledge: 25, gold: 15 }, "Publiczne centrum nauki i administracji.", ["ironwork", "organization"], 1.4, 1.25),
    stage(16, 20, "Akademia", "city", { nobleplanks: 45, bricks: 120, iron: 20, knowledge: 60, relics: 2, gold: 40 }, "Zaawansowane badania i szkolenie specjalistów.", ["architecture", "cartography"], 1.45, 1.5),
  ]),
  line("camp", [
    stage(1, 3, "Punkt zwiadowczy", "settlement", { wood: 30, food: 18, leather: 3 }, "Baza pierwszych patroli poza osadą."),
    stage(4, 7, "Obóz zwiadowców", "village", { planks: 25, leather: 8, rope: 4, food: 25 }, "Stały obóz dla dalszych wypraw."),
    stage(8, 11, "Posterunek", "large-village", { planks: 42, bricks: 20, packs: 2, maps: 1 }, "Lepsze planowanie tras i magazynowanie sprzętu."),
    stage(12, 15, "Kwatera zwiadu", "town", { hardplanks: 40, bricks: 50, iron: 8, medicine: 5, maps: 2 }, "Profesjonalne zaplecze dla wielu patroli.", ["ironwork", "cartography"], 1.4, 1.25),
    stage(16, 20, "Centrum kartograficzne", "city", { bricks: 95, iron: 22, maps: 6, medicine: 10, knowledge: 28, gold: 20 }, "Regionalne centrum zwiadu, map i wypraw.", ["architecture", "cartography"], 1.45, 1.45),
  ]),
];

const tierOrder: SettlementTierId[] = [
  "camp",
  "small-settlement",
  "settlement",
  "village",
  "large-village",
  "small-town",
  "town",
  "large-town",
  "city",
  "large-city",
  "metropolis",
];

export const settlementTierRank = (tier: SettlementTierId) => tierOrder.indexOf(tier);

export function developmentFor(buildingId: string) {
  return buildingDevelopments.find((development) => development.buildingId === buildingId);
}

export function stageForLevel(buildingId: string, level: number) {
  const development = developmentFor(buildingId);
  return development?.stages.find((stage) => level >= stage.fromLevel && level <= stage.toLevel);
}

export function currentBuildingStage(s: ProgressionGameState, buildingId: string) {
  const level = Math.max(1, s.buildings[buildingId]?.level ?? 1);
  return stageForLevel(buildingId, level) ?? developmentFor(buildingId)?.stages[0];
}

export function nextBuildingStage(s: ProgressionGameState, buildingId: string) {
  const targetLevel = (s.buildings[buildingId]?.level ?? 0) + 1;
  return stageForLevel(buildingId, targetLevel);
}

export function stagedUpgradeCost(s: ProgressionGameState, buildingId: string): Cost {
  const targetLevel = (s.buildings[buildingId]?.level ?? 0) + 1;
  const stage = stageForLevel(buildingId, targetLevel);
  if (!stage) return {};
  const exponent = Math.max(0, targetLevel - stage.fromLevel);
  const scale = stage.growth ** exponent;
  return Object.fromEntries(
    Object.entries(stage.baseCost).map(([resource, amount]) => [
      resource,
      Math.max(1, Math.ceil(amount * scale)),
    ]),
  ) as Cost;
}

export interface BuildingUpgradeRequirement {
  label: string;
  met: boolean;
}

export function buildingUpgradeRequirements(
  s: ProgressionGameState,
  buildingId: string,
): BuildingUpgradeRequirement[] {
  const targetLevel = (s.buildings[buildingId]?.level ?? 0) + 1;
  const stage = stageForLevel(buildingId, targetLevel);
  if (!stage) return [{ label: "Osiągnięto maksymalny poziom", met: false }];
  const rows: BuildingUpgradeRequirement[] = [
    {
      label: `Poziom osady: ${stage.requiredSettlement}`,
      met: settlementTierRank(s.settlementTier) >= settlementTierRank(stage.requiredSettlement),
    },
  ];
  for (const id of stage.requiredResearch ?? []) {
    rows.push({
      label: `Odkrycie: ${researchName(id)}`,
      met: s.researched.includes(id),
    });
  }
  return rows;
}

export function canQueueStagedUpgrade(s: ProgressionGameState, buildingId: string) {
  const building = buildings.find((item) => item.id === buildingId);
  const current = s.buildings[buildingId];
  const stage = nextBuildingStage(s, buildingId);
  if (
    !building ||
    !current ||
    !stage ||
    current.level >= 20 ||
    !unlocked(s, buildingId) ||
    s.buildQueue.some((task) => task.id === buildingId) ||
    s.buildQueue.length >= 5
  )
    return false;
  if (settlementTierRank(s.settlementTier) < settlementTierRank(stage.requiredSettlement))
    return false;
  if ((stage.requiredResearch ?? []).some((id) => !s.researched.includes(id)))
    return false;
  const cost = stagedUpgradeCost(s, buildingId);
  return Object.entries(cost).every(
    ([resource, amount]) => s.resources[resource as Resource] + 1e-8 >= amount,
  );
}

export function queueStagedUpgrade(s: ProgressionGameState, buildingId: string) {
  const building = buildings.find((item) => item.id === buildingId);
  const current = s.buildings[buildingId];
  const stage = nextBuildingStage(s, buildingId);
  if (!building || !current || !stage || !canQueueStagedUpgrade(s, buildingId)) return false;
  const cost = stagedUpgradeCost(s, buildingId);
  if (!pay(s, cost)) return false;
  const targetLevel = current.level + 1;
  const duration = Math.ceil(
    building.duration *
      stage.durationMultiplier *
      (1 + Math.max(0, targetLevel - stage.fromLevel) * 0.18),
  );
  s.buildQueue.push({
    id: buildingId,
    level: targetLevel,
    remaining: duration,
    duration,
    cost,
  });
  return true;
}

export function stageMaterialSummary(stage: BuildingStage) {
  return Object.entries(stage.baseCost)
    .map(([resource, amount]) => `${amount} ${resourceName(resource)}`)
    .join(", ");
}

export function validateBuildingDevelopments() {
  const missing = buildings.filter((building) => !developmentFor(building.id)).map((building) => building.id);
  const malformed = buildingDevelopments.flatMap((development) => {
    const expected = [
      [1, 3],
      [4, 7],
      [8, 11],
      [12, 15],
      [16, 20],
    ];
    return expected.flatMap(([from, to], index) => {
      const stage = development.stages[index];
      return !stage || stage.fromLevel !== from || stage.toLevel !== to
        ? [`${development.buildingId}:${from}-${to}`]
        : [];
    });
  });
  return { missing, malformed };
}
