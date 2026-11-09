export interface CustomFields {
  id: string;
  name: string;
  lore: string;
}

export interface Entity {
  id: string;
  iid: string;
  layer: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: number; // Ex: 12470831
  customFields: CustomFields;
}

export interface MapData {
  identifier: string;
  uniqueIdentifer: string;
  x: number;
  y: number;
  width: number;       
  height: number;      
  bgColor: string;
  neighbourLevels: any[];
  customFields: any;
  layers: string[];
  entities: Entity[];
}