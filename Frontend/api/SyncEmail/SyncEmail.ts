import axiosInstance from "../interceptor";

export const SyncEmailApi = async () => {
    const result = await axiosInstance.post(`gmail-invoices/gmail/poll`)
    return result?.data
}

export const getGmailInvoicesApi = async () => {
    const result = await axiosInstance.get(`gmail-invoices/invoices/gmail`)
    return result?.data || []
}

export const uploadEmailDocumentsApi = async (data: {
    documents: Array<{
        doc_type: string;
        vendor_id?: number | null;
        vendor_name?: string | null;
        document: string;
    }>
}) => {
    const result = await axiosInstance.post(`extraction/email-upload`, data)
    return result?.data
}

export const getExtractionStatusApi = async (documentId: string) => {
    const result = await axiosInstance.get(`extraction/${documentId}/status`)
    return result?.data
}

export const getExtractionsApi = async () => {
    const result = await axiosInstance.get(`extraction/`)
    return result?.data || []
}

export const getExtractionDetailsApi = async (documentId: string) => {
    const result = await axiosInstance.get(`extraction/${documentId}`)
    return result?.data
}
