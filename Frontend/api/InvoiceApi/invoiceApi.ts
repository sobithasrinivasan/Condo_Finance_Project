import axiosInstance from "../interceptor"

export const getInvoiceApi = async () => {
    const result = await axiosInstance.get(`invoices`)
    return result?.data || { data: [] }
}