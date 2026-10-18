// furnitureIcon.ts — picks the Phosphor icon that stands for a piece of furniture, by its name
import {
  AppWindow, Archive, Armchair, Bathtub, Bed, Books, Chair, CookingPot, Couch, Cube, Desk, Door, Dresser, Fire, FlowerLotus,
  FrameCorners, Lamp, Laptop, Monitor, Plant, Rug, Shower, Table, Television, Toilet, WashingMachine, Drop,
} from 'phosphor-react-native';
import type { Icon } from 'phosphor-react-native';

// First match wins, so the specific words come before the general ones
const RULES: [RegExp, Icon][] = [
  [/bed|mattress|crib|cot\b/, Bed],
  [/sofa|couch|sectional|loveseat/, Couch],
  [/arm ?chair|recliner/, Armchair],
  [/desk|workstation/, Desk],
  [/tv|television|screen/, Television],
  [/monitor|computer|pc\b/, Monitor],
  [/laptop/, Laptop],
  [/dining|coffee|side|table|island|counter/, Table],
  [/chair|stool|bench|seat|ottoman/, Chair],
  [/shelf|shelves|book/, Books],
  [/wardrobe|closet|cabinet|cupboard|drawer|dresser|nightstand|bedside|sideboard|storage|chest/, Dresser],
  [/plant|tree|fern|flower|pot\b/, Plant],
  [/lotus|fountain/, FlowerLotus],
  [/lamp|light/, Lamp],
  [/mirror|picture|frame|art|painting/, FrameCorners],
  [/rug|carpet|mat\b/, Rug],
  [/bath|tub/, Bathtub],
  [/shower/, Shower],
  [/toilet|wc\b/, Toilet],
  [/sink|basin/, Drop],
  [/stove|oven|cooker|hob|microwave|fridge|refrigerator/, CookingPot],
  [/fireplace|heater|radiator/, Fire],
  [/washer|washing|dryer/, WashingMachine],
  [/box|bin|basket|suitcase|luggage|clutter|pile/, Archive],
];

export const openingIcon = (kind: 'door' | 'window'): Icon => (kind === 'door' ? Door : AppWindow);

export function furnitureIcon(name: string): Icon {
  const key = name.toLowerCase();
  return RULES.find(([pattern]) => pattern.test(key))?.[1] ?? Cube;
}
