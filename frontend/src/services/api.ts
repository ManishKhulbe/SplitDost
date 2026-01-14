import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 errors (unauthorized)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  signup: async (
    name: string,
    email: string,
    password: string,
    defaultCurrency = "INR"
  ) => {
    const response = await api.post("/auth/signup", {
      name,
      email,
      password,
      defaultCurrency,
    });
    return response.data;
  },
  login: async (email: string, password: string) => {
    const response = await api.post("/auth/login", { email, password });
    return response.data;
  },
};

export const usersApi = {
  search: async (query: string) => {
    const response = await api.get(
      `/users/search?q=${encodeURIComponent(query)}`
    );
    return response.data;
  },
};

export const expensesApi = {
  getPersonal: async () => {
    const response = await api.get("/expenses/personal");
    return response.data;
  },
  createPersonal: async (
    title: string,
    amount: number,
    currency: string,
    date?: string
  ) => {
    const response = await api.post("/expenses/personal", {
      title,
      amount,
      currency,
      date,
    });
    return response.data;
  },
};

export const groupsApi = {
  getAll: async () => {
    const response = await api.get("/groups");
    return response.data;
  },
  create: async (name: string) => {
    const response = await api.post("/groups", { name });
    return response.data;
  },
  addMembers: async (groupId: string, userIds: string[]) => {
    const response = await api.post(`/groups/${groupId}/members`, { userIds });
    return response.data;
  },
  getExpenses: async (groupId: string) => {
    const response = await api.get(`/groups/${groupId}/expenses`);
    return response.data;
  },
  createExpense: async (
    groupId: string,
    title: string,
    amount: number,
    currency: string,
    paidBy?: string,
    splitType: "equal" | "exact" = "equal",
    splits?: Array<{ userId: string; amount: number }>,
    date?: string
  ) => {
    const response = await api.post(`/groups/${groupId}/expenses`, {
      title,
      amount,
      currency,
      paidBy,
      splitType,
      splits,
      date,
    });
    return response.data;
  },
};

export const balancesApi = {
  getGroupBalances: async (groupId: string) => {
    const response = await api.get(`/balances/groups/${groupId}/balances`);
    return response.data;
  },
  getSummary: async () => {
    const response = await api.get("/balances/summary");
    return response.data;
  },
};

export default api;
