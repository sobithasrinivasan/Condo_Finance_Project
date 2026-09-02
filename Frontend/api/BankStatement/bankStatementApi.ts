import axiosInstance from "../interceptor"

export const getBankStatementApi = async () => {
    const result = await axiosInstance.get(`bank-statements`)
    return result?.data || { data: [] }
}

export const deleteBankStatementApi = async (id: string) => {
    const result = await axiosInstance.delete(`bank-statements/${id}`)
    return result?.data || []
}

export const uploadBankStatementApi = async (payload: any) => {
    const result = await axiosInstance.post(`extraction/upload`, payload, {
        headers: {
            'Content-Type': 'multipart/form-data'
        }
    })
    return result?.data || []
}

export const getSingleExtractionStatusApi = async (docId: string) => {
    const result = await axiosInstance.get(`extraction/${docId}`)
    return result?.data || []
}