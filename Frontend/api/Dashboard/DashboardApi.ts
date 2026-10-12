import axiosInstance from "../interceptor"

export const getDashboardSummaryApi = async () => {
    const result = await axiosInstance.get("dashboard/summary")
    return result?.data
}

export const getDashboardActivitiesApi = async () => {
    const result = await axiosInstance.get("dashboard/activities")
    return result?.data?.activities || []
}
