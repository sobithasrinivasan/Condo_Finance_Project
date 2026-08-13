import axiosInstance from "../interceptor"

export interface ReceivableBackendType {
    id: number;
    association_id: number;
    document_extraction_id?: number | null;
    unit_id?: number | null;
    unit_number?: string | null;
    from_payer: string;
    due_date: string;
    expected_amount: number;
    amount_received: number;
    balance_amount?: number | null;
    deposit_month: string;
    instrument: string;
    paid_date?: string | null;
    status: string;
    bank?: string | null;
    created_at?: string;
    updated_at?: string;
}

export const getReceivablesApi = async (params?: {
    association_id?: number;
    unit_id?: number;
    status?: string;
    page?: number;
    page_size?: number;
}) => {
    const result = await axiosInstance.get(`receivables`, { params })
    return result?.data || { data: [], pagination: {} }
}

export const updateReceivableApi = async (id: number | string, data: {
    status?: string;
    amount_received?: number;
    bank?: string | null;
    paid_date?: string | null;
    instrument?: string;
}) => {
    const result = await axiosInstance.patch(`receivables/${id}`, data)
    return result?.data
}

export const createReceivableApi = async (data: {
    association_id: number;
    unit_id?: number | null;
    from_payer: string;
    due_date: string;
    expected_amount: number;
    amount_received?: number;
    balance_amount?: number | null;
    deposit_month?: string | null;
    instrument?: string | null;
    paid_date?: string | null;
    status?: string;
    bank?: string | null;
}) => {
    const result = await axiosInstance.post(`receivables`, data)
    return result?.data
}

export const deleteReceivableApi = async (id: number | string) => {
    const result = await axiosInstance.delete(`receivables/${id}`)
    return result?.data
}

export const generateMonthlyReceivablesApi = async (data: {
    association_id: number;
    month: string;
}) => {
    const result = await axiosInstance.post(`receivables/generate-monthly`, data)
    return result?.data
}
