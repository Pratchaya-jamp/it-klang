/**
 * Custom Fetch Wrapper for handling HttpOnly Cookies & Global Errors
 */
export const request = async (endpoint, options = {}) => {
  const headers = { ...options.headers };

  // ✅ เพิ่มเงื่อนไข: ถ้าไม่ใช่ FormData และมีการส่ง body มา ให้แปลงเป็น JSON String
  if (!(options.body instanceof FormData) && options.body) {
    headers['Content-Type'] = 'application/json';
    
    // สำคัญ: ต้องแปลง Object ให้เป็น String ก่อนส่ง
    if (typeof options.body !== 'string') {
      options.body = JSON.stringify(options.body);
    }
  }

  // 2. Configuration
  const config = {
    ...options,
    headers,
    credentials: 'include', 
  };

  try {
    const response = await fetch(endpoint, config);

    // 3. Handle 401 Unauthorized
    if (response.status === 401) {
      const path = window.location.pathname;

      // ✅ แก้ไขตรงนี้: เพิ่ม !path.startsWith('/reset-password')
      // เพื่อบอกว่า "ถ้าอยู่หน้าเปลี่ยนรหัสผ่าน ไม่ต้องดีดไป Login นะ"
      if (
        !path.startsWith('/login') && 
        !path.startsWith('/register') && 
        !path.startsWith('/reset-password')
      ) {
        // ลบ flag การล็อกอินทิ้ง (ถ้ามี)
        localStorage.removeItem('isLoggedIn');
        window.location.href = '/login';
      }
      
      // ยังคง throw error เพื่อให้ catch ในหน้า component ทำงานต่อได้ (เช่น โชว์ว่า Token หมดอายุ)
      throw new Error('Session expired. Please login again.');
    }

    // 4. Handle other non-OK statuses
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
    }

    // 5. Return JSON (เผื่อกรณี API ส่งค่ากลับมาเป็น String เปล่าๆ ให้ดักไว้จะได้ไม่ Error)
    const text = await response.text();
    return text ? JSON.parse(text) : {};

  } catch (error) {
    throw error;
  }
};