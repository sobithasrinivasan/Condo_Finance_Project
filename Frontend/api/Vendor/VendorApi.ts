import axiosInstance from "../interceptor"

export const getVendorApi = async () => {
    const result = await axiosInstance.get(`vendors/`)
    return result?.data || { data: [] }
}

export const createVendorApi = async (data: {
    name: string;
    category: string;
    phone?: string;
    email?: string;
    address?: string;
}) => {
    const result = await axiosInstance.post(`vendors/`, data)
    return result?.data
}

export const updateVendorApi = async (id: string | number, data: {
    name?: string;
    category?: string;
    phone?: string;
    email?: string;
    address?: string;
    status?: string;
}) => {
    const result = await axiosInstance.put(`vendors/${id}`, data)
    return result?.data
}

export const deleteVendorApi = async (id: string | number) => {
    const result = await axiosInstance.delete(`vendors/${id}`)
    return result?.data
}