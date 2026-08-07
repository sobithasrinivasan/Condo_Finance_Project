import axiosInstance from "../interceptor"

export interface CondoUnitType {
    id?: number;
    unit_number: string;
    owner_name: string;
    owner_email?: string;
    owner_phone?: string;
    monthly_hoa_amount: number;
    status: "Active" | "Inactive";
    created_at?: string;
    updated_at?: string;
    address?: string;
}

export const getCondoUnitsApi = async (params?: {
    unit_number?: string;
    owner_name?: string;
    status?: string;
    is_active?: boolean;
    page?: number;
    page_size?: number;
}) => {
    const result = await axiosInstance.get(`condo-units`, { params })
    return result?.data || { data: [], pagination: {} }
}

export const createCondoUnitApi = async (data: CondoUnitType) => {
    const result = await axiosInstance.post(`condo-units`, data)
    return result?.data
}

export const updateCondoUnitApi = async (id: string | number, data: Partial<CondoUnitType>) => {
    const result = await axiosInstance.patch(`condo-units/${id}`, data)
    return result?.data
}

export const deleteCondoUnitApi = async (id: string | number) => {
    const result = await axiosInstance.delete(`condo-units/${id}`)
    return result?.data
}
