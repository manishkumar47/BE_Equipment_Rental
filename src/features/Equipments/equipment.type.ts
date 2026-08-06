export interface CreateEquipmentType {
  name: string;
  description?: string | null;
  quantity?: number;
  price: number;
}

export interface UpdateEquipmentType {
  name?: string;
  description?: string | null;
  quantity?: number;
  price?: number;
}
