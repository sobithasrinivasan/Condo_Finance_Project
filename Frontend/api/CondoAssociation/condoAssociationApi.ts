import axiosInstance from "../interceptor"

export interface CondoAssociationType {
    id?: number;
    name: string;
    address: string;
    established: string;
    status: "Active" | "Inactive";
}

export const getCondoAssociationApi = async (params?: {
    name?: string;
    status?: string;
    page?: number;
    page_size?: number;
}) => {
    const result = await axiosInstance.get(`condo-associations`, { params })
    return result?.data || { data: [], pagination: {} }
}

export const createCondoAssociationApi = async (data: CondoAssociationType) => {
    const result = await axiosInstance.post(`condo-associations`, data)
    return result?.data
}

export const updateCondoAssociationApi = async (id: string | number, data: Partial<CondoAssociationType>) => {
    const result = await axiosInstance.patch(`condo-associations/${id}`, data)
    return result?.data
}

export const deleteCondoAssociationApi = async (id: string | number) => {
    const result = await axiosInstance.delete(`condo-associations/${id}`)
    return result?.data
}