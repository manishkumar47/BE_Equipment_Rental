export interface CreateEquipmentType {
  name: string;
  description?: string | null;
  quantity?: number;
  price: number;
  imageUrl?: string | null;
  equipmentCategoryId: number;
}

export interface UpdateEquipmentType {
  name?: string;
  description?: string | null;
  quantity?: number;
  price?: number;
  imageUrl?: string | null;
  equipmentCategoryId?: number;
}
