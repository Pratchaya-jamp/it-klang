import axios from 'axios';

const apiClient = axios.create({
  baseURL: '',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const getDashboardItems = async (filters = {}) => {
  try {
    const response = await apiClient.get('/api/items/dashboard', {
      params: filters 
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching dashboard items:", error);
    throw error;
  }
};