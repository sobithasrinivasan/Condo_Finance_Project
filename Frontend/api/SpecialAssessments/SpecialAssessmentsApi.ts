import axiosInstance from "../interceptor"

export const getSpecialAssessmentSummaryApi = async (params?: { association_id?: number | null }) => {
    const result = await axiosInstance.get(`special-assessments/summary`, { params })
    return result?.data || null
}

export const getSpecialAssessmentDetailsApi = async (params?: { page_size?: number; page?: number; association_id?: number | null }) => {
    const result = await axiosInstance.get(`special-assessments`, { params })
    return result?.data || { data: [] }
}

export const updateSpecialAssessmentApi = async (id: string | number, data: { status?: string; resolution_notes?: string }) => {
    const result = await axiosInstance.patch(`special-assessments/${id}`, data)
    return result?.data
}

export const createSpecialAssessmentApi = async (data: {
    association_id: number;
    title: string;
    description?: string;
    total_amount: number;
    due_date: string;
    status: string;
    allocations?: { unit_id: number; allocated_amount: number }[] | null;
}, created_by?: number | null) => {
    const result = await axiosInstance.post(`special-assessments`, data, {
        params: created_by !== undefined && created_by !== null ? { created_by } : {},
    })
    return result?.data
}

export const getSpecialAssessmentAllocationsApi = async (assessmentId: string | number) => {
    const result = await axiosInstance.get(`special-assessments/${assessmentId}/allocations`)
    return result?.data || { data: [] }
}

export const updateSpecialAssessmentAllocationApi = async (
    allocationId: string | number,
    data: { status?: string; paid_amount?: number }
) => {
    const result = await axiosInstance.patch(`special-assessments/allocations/${allocationId}`, data)
    return result?.data
}