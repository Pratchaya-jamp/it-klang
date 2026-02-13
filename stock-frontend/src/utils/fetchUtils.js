// src/utils/fetchUtils.js

/**
 * Custom Fetch Wrapper for handling HttpOnly Cookies & Global Errors
 */
export const request = async (endpoint, options = {}) => {
  // 1. Default Headers
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // 2. Configuration
  const config = {
    ...options,
    headers,
    // สำคัญมาก: 'include' บอกให้ Browser แนบ HttpOnly Cookie ไปกับ Request
    credentials: 'include', 
  };

  try {
    const response = await fetch(endpoint, config);

    // 3. Handle 401 Unauthorized (Token Expired / Invalid)
    if (response.status === 401) {
      // ถ้าไม่ใช่หน้า login/register ให้ Redirect ไป Login
      if (!window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/register')) {
        window.location.href = '/login';
      }
      throw new Error('Session expired. Please login again.');
    }

    // 4. Handle other non-OK statuses
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
    }

    // 5. Return JSON
    return await response.json();

  } catch (error) {
    throw error;
  }
};