import axios from 'axios'

const api = axios.create({ baseURL: 'http://localhost:8000/api' })

export const getZones = () => api.get('/zones/')
export const getZoneDetail = (id) => api.get(`/zones/${id}/`)

export const getEvents = (params) => api.get('/events/', { params })
export const createEvent = (data) => api.post('/events/', data)
export const getEventCalendar = (months = 2) => api.get('/events/calendar/', { params: { months } })

export const getPredictions = (params) => api.get('/predictions/', { params })
export const generatePrediction = (data) => api.post('/predictions/generate/', data)
export const getHeatmap = () => api.get('/predictions/heatmap/')

export const runSimulator = (data) => api.post('/simulator/', data)

export const getFleet = () => api.get('/fleet/')
export const dispatchFleet = (data) => api.post('/fleet/dispatch/', data)

export const getDrivers = () => api.get('/drivers/')
export const getDriverReports = (driverId) => api.get(`/drivers/${driverId}/report/`)
export const submitReport = (driverId, data) => api.post(`/drivers/${driverId}/report/`, data)

export const getSummary = () => api.get('/reports/summary/')
export const getModelPerformance = () => api.get('/model/performance/')

export const getCurrentWeather = () => api.get('/weather/current/')
export const getWeatherForecast = () => api.get('/weather/forecast/')

export const getRoutes = () => api.get('/routes/')
export const getMyRoute = (driverId) => api.get('/routes/my/', { params: { driver_id: driverId } })
export const requestRoute = (data) => api.post('/routes/request/', data)
export const completeRoute = (id) => api.put(`/routes/${id}/complete/`)

export const importCsv = (formData) => api.post('/data/import/', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
