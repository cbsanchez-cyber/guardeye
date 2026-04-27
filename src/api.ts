// Mock API implementation
import axios from 'axios';

const USE_MOCK = true;
const DELAY = 800; // Simulated network delay

// Mock Storage
let mockSessions: any[] = [
  {
    id: 's1',
    name: 'Midterm Math',
    date: new Date().toISOString().split('T')[0],
    startTime: '10:00',
    endTime: '12:00',
    room: 'Room 101',
    timeLimit: 120,
    status: 'upcoming',
    alertsCount: 0,
  },
  {
    id: 's2',
    name: 'Final History',
    date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
    startTime: '14:00',
    endTime: '16:00',
    room: 'Room A',
    timeLimit: 120,
    status: 'completed',
    alertsCount: 5,
  }
];

let mockAlerts: Record<string, any[]> = {
  's2': [
    { id: 'a1', timestamp: new Date(Date.now() - 86000000).toISOString(), behaviorType: 'Looking Left', riskScore: 0.8, studentId: 'Student_1', acknowledged: true },
    { id: 'a2', timestamp: new Date(Date.now() - 85000000).toISOString(), behaviorType: 'Cellphone Detected', riskScore: 0.95, studentId: 'Student_2', acknowledged: false },
  ]
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const api = axios.create({
  baseURL: '/api'
});

// Create interceptors to intercept requests and return mock data if USE_MOCK is true
api.interceptors.request.use(async (config) => {
  if (USE_MOCK) {
    if (config.url === '/auth/login' || config.url === '/auth/register' || config.url === '/auth/google') {
        const user = { id: 'proctor1', email: 'proctor@example.com', name: 'Admin Proctor' };
        if (config.data?.email) user.email = config.data.email;
        if (config.data?.full_name) user.name = config.data.full_name;
        
        await delay(DELAY);
        config.adapter = async () => ({
            data: { token: 'mock-jwt-token', user },
            status: 200,
            statusText: 'OK',
            headers: {} as any,
            config
        });
    }

    if (config.url === '/user/me') {
        await delay(DELAY);
        config.adapter = async () => {
            const token = localStorage.getItem('token');
            if (!token) return { status: 401, data: null, statusText: 'Unauthorized', headers: {} as any, config };
            return {
                data: { id: 'proctor1', email: 'proctor@example.com', name: 'Admin Proctor' },
                status: 200, statusText: 'OK', headers: {} as any, config
            }
        };
    }

    const sessionMatch = config.url?.match(/^\/sessions\/([^\/]+)$/);
    if (sessionMatch && config.method === 'get') {
        const id = sessionMatch[1];
        await delay(300);
        const session = mockSessions.find(s => s.id === id);
        if (session) {
            config.adapter = async () => ({
                data: session,
                status: 200, statusText: 'OK', headers: {} as any, config
            });
        }
    }

    if (config.url === '/sessions' && config.method === 'get') {
        await delay(DELAY);
        config.adapter = async () => ({
            data: mockSessions,
            status: 200, statusText: 'OK', headers: {} as any, config
        });
    }

    if (config.url === '/sessions' && config.method === 'post') {
        await delay(DELAY);
        const newSession = {
            ...config.data,
            id: `s${Date.now()}`,
            status: 'upcoming',
            alertsCount: 0
        };
        mockSessions.push(newSession);
        config.adapter = async () => ({
            data: newSession,
            status: 200, statusText: 'OK', headers: {} as any, config
        });
    }
    
    // Pattern match endpoints like /sessions/{id}/start
    const startMatch = config.url?.match(/\/sessions\/(.*?)\/start/);
    if (startMatch && config.method === 'post') {
        await delay(DELAY);
        const id = startMatch[1];
        mockSessions = mockSessions.map(s => s.id === id ? { ...s, status: 'active' } : s);
        config.adapter = async () => ({
            data: { success: true },
            status: 200, statusText: 'OK', headers: {} as any, config
        });
    }

    const endMatch = config.url?.match(/\/sessions\/(.*?)\/end/);
    if (endMatch && config.method === 'post') {
        await delay(DELAY);
        const id = endMatch[1];
        mockSessions = mockSessions.map(s => s.id === id ? { ...s, status: 'completed' } : s);
        config.adapter = async () => ({
            data: { success: true },
            status: 200, statusText: 'OK', headers: {} as any, config
        });
    }

    if (config.url === '/pi/status') {
        await delay(1500); // slightly longer to simulate actual ping
        config.adapter = async () => ({
            // Simulate 90% chance of success
            data: { online: Math.random() > 0.1 },
            status: 200, statusText: 'OK', headers: {} as any, config
        });
    }

    const alertsMatch = config.url?.match(/\/sessions\/(.*?)\/alerts/);
    if (alertsMatch && config.method === 'get') {
        // Don't delay too much for polling
        const id = alertsMatch[1];
        config.adapter = async () => ({
            data: mockAlerts[id] || [],
            status: 200, statusText: 'OK', headers: {} as any, config
        });
    }

    const acknowledgeMatch = config.url?.match(/\/alerts\/(.*?)\/acknowledge/);
    if (acknowledgeMatch && config.method === 'post') {
        await delay(300);
        const alertId = acknowledgeMatch[1];
        Object.keys(mockAlerts).forEach(sessionId => {
            mockAlerts[sessionId] = mockAlerts[sessionId].map(a => a.id === alertId ? { ...a, acknowledged: true } : a);
        });
        config.adapter = async () => ({
            data: { success: true },
            status: 200, statusText: 'OK', headers: {} as any, config
        });
    }

    const reportMatch = config.url?.match(/\/sessions\/(.*?)\/report/);
    if (reportMatch && config.method === 'get') {
        await delay(DELAY);
        const id = reportMatch[1];
        const sessionAlerts = mockAlerts[id] || [];
        
        let csv = "student_id,behavior_type,risk_score,timestamp,acknowledged,image_url\n";
        sessionAlerts.forEach(alert => {
            const imageUrl = `https://i.pravatar.cc/150?u=${alert.studentId}`;
            csv += `${alert.studentId},${alert.behaviorType},${alert.riskScore},${alert.timestamp},${alert.acknowledged},${imageUrl}\n`;
        });
        
        // If no alerts, fallback to at least the header or a dummy row
        if (sessionAlerts.length === 0) {
           const imageUrl1 = `https://i.pravatar.cc/150?u=Student_1`;
           const imageUrl2 = `https://i.pravatar.cc/150?u=Student_2`;
           csv += `Student_1,Looking Left,0.8,2026-04-26T10:00:00Z,true,${imageUrl1}\n`;
           csv += `Student_2,Cellphone Detected,0.95,2026-04-26T10:05:00Z,false,${imageUrl2}\n`;
        }

        config.adapter = async () => ({
            data: csv,
            status: 200, statusText: 'OK', headers: {} as any, config
        });
    }
  }
  
  const token = localStorage.getItem('token');
  if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Mock simulation of Pi sending alerts continuously
export const simulatePiAlerts = (sessionId: string) => {
    if (!mockAlerts[sessionId]) mockAlerts[sessionId] = [];
    
    return setInterval(() => {
        const behaviors = ['Looking Left', 'Looking Right', 'Looking Down', 'Cellphone Detected', 'Multiple People'];
        const randomBehavior = behaviors[Math.floor(Math.random() * behaviors.length)];
        const newAlert = {
            id: `a${Date.now()}`,
            timestamp: new Date().toISOString(),
            behaviorType: randomBehavior,
            riskScore: randomBehavior === 'Cellphone Detected' ? 0.9 + Math.random()*0.1 : Math.random(),
            studentId: `Student_${Math.floor(Math.random() * 5) + 1}`,
            acknowledged: false
        };
        mockAlerts[sessionId] = [newAlert, ...mockAlerts[sessionId]]; // Prepend
    }, 4000);
};

export default api;
