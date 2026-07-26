import axiosInstance from "../interceptor"

export const getBankStatementApi = async () => {
    const result = await axiosInstance.get(`bank-statements`)
    return result?.data || { data: [] }
}

export const deleteBankStatementApi = async (id: string) => {
    const result = await axiosInstance.delete(`bank-statements/${id}`)
    return result?.data || []
}