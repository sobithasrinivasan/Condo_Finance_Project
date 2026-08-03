import axiosInstance from "../interceptor"

export const getDepositSummaryApi = async (params?: { deposit_month?: number; deposit_year?: number }) => {
    const result = await axiosInstance.get(`deposits/summary`, { params })
    return result?.data || null
}

export const getDepositDetailsApi = async (params?: { deposit_month?: number; deposit_year?: number; page_size?: number; page?: number }) => {
    const result = await axiosInstance.get(`deposits`, { params })
    return result?.data || { data: [] }
}

export const updateDepositApi = async (id: string | number, data: { status?: string; resolution_notes?: string }) => {
    const result = await axiosInstance.patch(`deposits/${id}`, data)
    return result?.data
}

