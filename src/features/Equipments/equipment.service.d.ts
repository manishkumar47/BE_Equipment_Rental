import type { CreateEquipmentType, UpdateEquipmentType } from "./equipment.type.js";
export declare const createEquipment: (data: CreateEquipmentType) => Promise<{
    id: number;
    name: string;
    description: string | null;
    quantity: number;
    price: number;
    createdAt: Date;
    deletedAt: Date | null;
    isDeleted: boolean;
} | undefined>;
export declare const getEquipmentFromId: (equipmentId: number) => Promise<{
    id: number;
    name: string;
    description: string | null;
    quantity: number;
    price: number;
    createdAt: Date;
    deletedAt: Date | null;
    isDeleted: boolean;
} | undefined>;
export declare const updateEquipment: (equipmentId: number, data: UpdateEquipmentType) => Promise<{
    id: number;
    name: string;
    description: string | null;
    quantity: number;
    price: number;
    createdAt: Date;
    deletedAt: Date | null;
    isDeleted: boolean;
} | undefined>;
export declare const deleteEquipment: (equipmentId: number) => Promise<{
    id: number;
    name: string;
    description: string | null;
    quantity: number;
    price: number;
    createdAt: Date;
    deletedAt: Date | null;
    isDeleted: boolean;
} | undefined>;
export declare const getAllEquipments: () => Promise<{
    id: number;
    name: string;
    description: string | null;
    quantity: number;
    price: number;
    createdAt: Date;
    deletedAt: Date | null;
    isDeleted: boolean;
}[]>;
//# sourceMappingURL=equipment.service.d.ts.map