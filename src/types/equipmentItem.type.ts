export type EquipmentItemStatus =
  | "available"
  | "rented"
  | "under_repair"
  | "damaged"
  | "lost"
  | "retired";

export interface CreateEquipmentItemType {
  equipmentId: number;
  serialNumber: string;
  status?: EquipmentItemStatus;
  conditionNotes?: string | null;
}

export interface UpdateEquipmentItemType {
  serialNumber?: string;
  status?: EquipmentItemStatus;
  conditionNotes?: string | null;
}

export interface EquipmentItemCounts {
  totalItemCount: number;
  availableItemCount: number;
}
