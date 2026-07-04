import axios from 'axios';

const API_URL = '/api/v1/aadhaar';

export const aadhaarApi = {
    check: (aadhaar: string) => axios.post(`${API_URL}/check`, { aadhaar }),
    sendOtp: (mobile: string) => axios.post(`${API_URL}/send-otp`, { mobile }),
    verifyOtp: (payload: { mobile: string; otp: string; aadhaar: string }) =>
        axios.post(`${API_URL}/verify-otp`, payload),
    register: (data: any) => axios.post(`${API_URL}/register`, data),
};
