import axiosInstance from "../interceptor"

export const getAvailableReportsApi = async () => {
    const result = await axiosInstance.get("reports/available")
    return result?.data || []
}

export const getReportPreviewApi = async (reportType: string, period: string) => {
    const result = await axiosInstance.get("reports/preview", {
        params: {
            report_type: reportType,
            period: period
        }
    })
    return result?.data
}

export const generatePdfReportApi = async (reportType: string, period: string, userId: number = 2) => {
    const response = await axiosInstance.post(
        `reports/generate/pdf?user_id=${userId}`,
        { report_type: reportType, period: period },
        { responseType: "blob" }
    )
    return response.data
}

export const generateCsvReportApi = async (reportType: string, period: string, userId: number = 2) => {
    const response = await axiosInstance.post(
        `reports/generate/csv?user_id=${userId}`,
        { report_type: reportType, period: period },
        { responseType: "blob" }
    )
    return response.data
}
