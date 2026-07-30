import axiosInstance from "../interceptor"

export const getSpecialAssessmentSummaryApi = async () => {
    const result = await axiosInstance.get(`special-assessments/summary`)
    return result?.data || null
}

export const getSpecialAssessmentDetailsApi = async (params?: { page_size?: number; page?: number }) => {
    const result = await axiosInstance.get(`special-assessments`, { params })
    return result?.data || { data: [] }
}

export const updateSpecialAssessmentApi = async (id: string | number, data: { status?: string; resolution_notes?: string }) => {
    const result = await axiosInstance.patch(`special-assessments/${id}`, data)
    return result?.data
}