export const mockCategories = [{ name: "Power Tools" }, { name: "Photography" }] as const;

export const mockEquipment = [
  {
    name: "E2E Drill",
    description: "Cordless drill seeded for automated tests",
    quantity: 10,
    price: 500,
    imageUrl: null,
    categoryName: "Power Tools",
  },
  {
    name: "E2E Camera",
    description: "DSLR camera seeded for automated tests (deliberately low stock)",
    quantity: 1,
    price: 2000,
    imageUrl: null,
    categoryName: "Photography",
  },
  {
    name: "E2E Ladder",
    description: "Step ladder seeded for automated tests",
    quantity: 5,
    price: 300,
    imageUrl: null,
    categoryName: "Power Tools",
  },
] as const;

export const mockUsers = {
  admin: {
    name: "E2E Admin",
    email: "e2e.admin@equipflow.test",
    password: "AdminPass123!",
    role: "ADMIN" as const,
  },
  user1: {
    name: "E2E User One",
    email: "e2e.user1@equipflow.test",
    password: "UserPass123!",
    role: "USER" as const,
  },
  user2: {
    name: "E2E User Two",
    email: "e2e.user2@equipflow.test",
    password: "UserPass123!",
    role: "USER" as const,
  },
};
