import axiosInstance from "../interceptor"

export const getUsersApi = async () => {
    const result = await axiosInstance.get(`users`)
    return result?.data || { data: [] }
}

export const createUserApi = async (userData: any) => {
    const result = await axiosInstance.post(`users`, userData)
    return result?.data
}

export const updateUserApi = async (userId: number | string, userData: any) => {
    const result = await axiosInstance.patch(`users/${userId}`, userData)
    return result?.data
}

export const deleteUserApi = async (userId: number | string) => {
    const result = await axiosInstance.delete(`users/${userId}`)
    return result?.data
}