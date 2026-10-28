export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}
export interface User {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  role: "admin" | "user";
}
