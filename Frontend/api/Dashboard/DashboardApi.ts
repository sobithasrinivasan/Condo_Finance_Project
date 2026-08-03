import axiosInstance from "../interceptor"

export const getDashboardSummaryApi = async () => {
    const result = await axiosInstance.get("dashboard/summary")
    return result?.data
}
