import axiosInstance from "../interceptor"

export const LoginPostApi = async (payload: any) => {
    const result = await axiosInstance.post(`login/`, payload)
    return result?.data || { data: [] }
}