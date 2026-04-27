import axios from "axios";

export const TOKEN_KEY = "controlfin_token";
export const USER_KEY = "controlfin_user";

export const api = axios.create({
  baseURL: "/api",
  timeout: 30000
});

api.interceptors.request.use((config) => {
  const token = window.localStorage.getItem(TOKEN_KEY);

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const isLoginPage = window.location.pathname === "/login";

    if (status === 401 && !isLoginPage) {
      window.localStorage.removeItem(TOKEN_KEY);
      window.localStorage.removeItem(USER_KEY);
      window.location.assign("/login");
    }

    return Promise.reject(error);
  }
);

export function getErrorMessage(error, fallback = "Nao foi possivel concluir a solicitacao.") {
  return error?.response?.data?.message || error?.response?.data?.error || error?.message || fallback;
}
