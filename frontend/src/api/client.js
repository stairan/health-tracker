import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    // You can add auth tokens here if needed in the future
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export default apiClient;

// API functions

// User
export const getUser = () => apiClient.get('/user/me');
export const updateUser = (data) => apiClient.put('/user/me', data);
export const checkGarminConfigured = () => apiClient.get('/user/garmin-configured');

// Garmin
export const syncGarminData = (date = null, force = false) =>
  apiClient.post('/garmin/sync', { date, force });
export const getGarminData = (startDate, endDate) =>
  apiClient.get('/garmin/data', { params: { start_date: startDate, end_date: endDate } });
export const getActivities = (startDate, endDate) =>
  apiClient.get('/garmin/activities', { params: { start_date: startDate, end_date: endDate } });

// Food
export const createFoodEntry = (data) => apiClient.post('/food/', data);
export const getFoodEntries = (startDate, endDate, mealType = null) =>
  apiClient.get('/food/', { params: { start_date: startDate, end_date: endDate, meal_type: mealType } });
export const updateFoodEntry = (id, data) => apiClient.put(`/food/${id}`, data);
export const deleteFoodEntry = (id) => apiClient.delete(`/food/${id}`);

// Medications
export const createMedication = (data) => apiClient.post('/medications/', data);
export const getMedications = (startDate, endDate) =>
  apiClient.get('/medications/', { params: { start_date: startDate, end_date: endDate } });
export const updateMedication = (id, data) => apiClient.put(`/medications/${id}`, data);
export const deleteMedication = (id) => apiClient.delete(`/medications/${id}`);

// Medication Schedules
export const createMedicationSchedule = (data) => apiClient.post('/medications/schedules', data);
export const getMedicationSchedules = (activeOnly = true) =>
  apiClient.get('/medications/schedules', { params: { active_only: activeOnly } });
export const getMedicationSchedule = (id) => apiClient.get(`/medications/schedules/${id}`);
export const updateMedicationSchedule = (id, data) => apiClient.put(`/medications/schedules/${id}`, data);
export const deleteMedicationSchedule = (id) => apiClient.delete(`/medications/schedules/${id}`);

// Sickness
export const createSicknessEntry = (data) => apiClient.post('/sickness/', data);
export const getSicknessEntries = (startDate, endDate) =>
  apiClient.get('/sickness/', { params: { start_date: startDate, end_date: endDate } });
export const updateSicknessEntry = (id, data) => apiClient.put(`/sickness/${id}`, data);
export const deleteSicknessEntry = (id) => apiClient.delete(`/sickness/${id}`);

// Seizures
export const createSeizure = (data) => apiClient.post('/seizures/', data);
export const getSeizures = (startDate, endDate) =>
  apiClient.get('/seizures/', { params: { start_date: startDate, end_date: endDate } });
export const updateSeizure = (id, data) => apiClient.put(`/seizures/${id}`, data);
export const deleteSeizure = (id) => apiClient.delete(`/seizures/${id}`);

// Notes
export const createDailyNote = (data) => apiClient.post('/notes/', data);
export const getDailyNotes = (startDate, endDate) =>
  apiClient.get('/notes/', { params: { start_date: startDate, end_date: endDate } });
export const getDailyNoteByDate = (date) => apiClient.get(`/notes/${date}`);
export const updateDailyNote = (date, data) => apiClient.put(`/notes/${date}`, data);
export const deleteDailyNote = (date) => apiClient.delete(`/notes/${date}`);

// Water
export const createWaterIntake = (data) => apiClient.post('/water/', data);
export const getWaterIntake = (startDate, endDate) =>
  apiClient.get('/water/', { params: { start_date: startDate, end_date: endDate } });
export const getDailyWaterTotal = (date) => apiClient.get(`/water/daily-total/${date}`);
export const deleteWaterIntake = (id) => apiClient.delete(`/water/${id}`);

// Dashboard
export const getDailySummary = (date) => apiClient.get(`/dashboard/daily/${date}`);
export const getTodaySummary = () => apiClient.get('/dashboard/today');
export const getDateRangeSummary = (startDate, endDate) =>
  apiClient.get('/dashboard/range', { params: { start_date: startDate, end_date: endDate } });

// Export
export const exportData = (data) => apiClient.post('/export/', data);
export const getAIAnalysisPrompt = (startDate, endDate) =>
  apiClient.get('/export/ai-prompt', { params: { start_date: startDate, end_date: endDate } });
export const getAnalysisSummary = (startDate, endDate) =>
  apiClient.get('/export/summary', { params: { start_date: startDate, end_date: endDate } });
