import axiosInstance from "../interceptor"

export const getReconciliationSummaryApi = async () => {
    const result = await axiosInstance.get(`bank-reconciliation/summary`)
    return result?.data || { data: [] }
}