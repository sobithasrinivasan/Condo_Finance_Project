import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1/";

const axiosInstance = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        "Content-Type": "application/json",
    },
});

axiosInstance.interceptors.request.use(
    (config: AxiosRequestConfig | any) => {
        const token = localStorage.getItem("token");

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        if (config.data instanceof FormData) {
            delete config.headers["Content-Type"];
        }

        return config;
    },
    (error: AxiosError) => {
        return Promise.reject(error);
    }
);

axiosInstance.interceptors.response.use(
    (response: AxiosResponse) => {
        return response;
    },
    (error: AxiosError<any>) => {
        if (error.response) {
            switch (error.response.status) {
                case 401:
                    console.error("Unauthorized");

                    localStorage.removeItem("token");
                    window.location.href = "/login";
                    break;

                case 403:
                    console.error("Forbidden");
                    break;

                case 404:
                    console.error("Resource not found");
                    break;

                case 500:
                    console.error("Internal Server Error");
                    break;

                default:
                    console.error(error.response.data?.message || "Something went wrong");
            }
        } else {
            console.error("Network Error");
        }

        return Promise.reject(error);
    }
);

export default axiosInstance;