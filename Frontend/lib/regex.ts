export const emailRegex = (email: string) => {
    const test = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email);
    return test;

}