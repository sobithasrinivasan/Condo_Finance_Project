import axiosInstance from "../interceptor"

export const getReconciliationSummaryApi = async () => {
    const result = await axiosInstance.get(`bank-reconciliation/summary`)
    return result?.data || { data: [] }
}

export const getAllTransactionsApi = async (params: { page: number, page_size: number, bank_statement_id?: number, reconciled?: boolean }) => {
    const result = await axiosInstance.get(`bank-reconciliation/all-transactions`, { params })
    return result?.data
}


export const getTransactionAuditApi = async (transactionId: number) => {
    const result = await axiosInstance.get(`bank-reconciliation/${transactionId}/audit`)
    return result?.data
}

export const exportReconciliationApi = async (data: {
    format: string;
    sections: string[];
    bank_statement_id?: number;
    bank_statement_ids?: number[];
    include_audit?: boolean;
}) => {
    const result = await axiosInstance.post(`bank-reconciliation/export`, data, {
        responseType: "blob",
    })
    return result
}

export const reconcileStatementApi = async (data: {
    bank_statement_ids: number[];
}, params?: {
    matched_by?: number | null;
}) => {
    const result = await axiosInstance.post(`bank-reconciliation/reconcile-statement`, data, { params })
    return result?.data
}

