import axiosInstance from "../interceptor"

export const getBankStatementApi = async () => {
    const result = await axiosInstance.get(`bank-statements`)
    return result?.data || { data: [] }
}