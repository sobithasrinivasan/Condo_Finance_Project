export const setUser = (result: any) => {
    localStorage.setItem("user", JSON.stringify(result))
}

export const getUser = () => {
    if (typeof window === "undefined") {
        return {};
    }

    return JSON.parse(localStorage.getItem("user") || "{}");
};

export const removeUser = () => {
    localStorage.removeItem("user");
}