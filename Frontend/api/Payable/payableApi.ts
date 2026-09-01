import axiosInstance from "../interceptor"

export interface PayableBackendType {
    id: number;
    association_id: number;
    vendor_id?: number | null;
    vendor_name?: string | null;
    document_extraction_id?: number | null;
    pay_to: string;
    invoice_reference_number?: string | null;
    payment_reference?: string | null;
    payment_reason?: string | null;
    date_of_payment: string;
    amount: number;
    due_date: string;
    instrument: string;
    status: string;
    created_at?: string;
    updated_at?: string;
}

export const getPayablesApi = async (params?: {
    association_id?: number;
    vendor_id?: number;
    status?: string;
    page?: number;
    page_size?: number;
}) => {
    const result = await axiosInstance.get(`payables`, { params })
    return result?.data || { data: [], pagination: {} }
}

export const createPayableApi = async (data: {
    association_id: number;
    vendor_id?: number | null;
    pay_to: string;
    invoice_reference_number?: string | null;
    payment_reference?: string | null;
    payment_reason?: string | null;
    date_of_payment: string;
    amount: number;
    due_date: string;
    instrument: string;
    status: string;
}) => {
    const result = await axiosInstance.post(`payables`, data)
    return result?.data
}

export const updatePayableApi = async (id: number | string, data: {
    vendor_id?: number | null;
    pay_to?: string;
    invoice_reference_number?: string | null;
    payment_reference?: string | null;
    payment_reason?: string | null;
    date_of_payment?: string;
    amount?: number;
    due_date?: string;
    instrument?: string;
    status?: string;
}) => {
    const result = await axiosInstance.patch(`payables/${id}`, data)
    return result?.data
}

export const deletePayableApi = async (id: number | string) => {
    const result = await axiosInstance.delete(`payables/${id}`)
    return result?.data
}
