import { useEffect, useState, useMemo } from 'react';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  BarElement, 
  Title, 
  Tooltip, 
  Legend, 
  Filler
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { request } from '../utils/fetchUtils';
import { Loader2, Calendar, Filter } from 'lucide-react';

// Register ChartJS Components
ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement, 
  BarElement, Title, Tooltip, Legend, Filler
);

// ตั้งค่าฟอนต์เริ่มต้นให้รองรับภาษาไทยสวยงามขึ้น
ChartJS.defaults.font.family = "'Prompt', 'Inter', sans-serif";
ChartJS.defaults.color = '#71717a'; // text-zinc-500

export default function InventoryStats() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState(7); // Default 30 วัน

  // 1. Fetch Audit Logs ทั้งหมดเพื่อมาคำนวณ
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await request('/api/auditlogs'); // ดึงมาทั้งหมด
        setLogs(data || []);
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // 2. Process Data (ส่วนคำนวณที่สำคัญที่สุด)
  const chartData = useMemo(() => {
    if (!logs.length) return null;

    // ตัวแปรเก็บยอดรวม
    const dailyStats = {}; // { "13/02": { in: 5, out: 2 } }
    const itemStats = {};  // { "Mouse": { in: 10, out: 5 } }

    const now = new Date();
    const cutoffDate = new Date();
    cutoffDate.setDate(now.getDate() - timeRange);

    logs.forEach(log => {
      // 2.1 แปลงวันที่จาก string "13/02/2026 10:19:15" เป็น Date Object
      const [datePart] = log.createdAt.split(' ');
      const [day, month, year] = datePart.split('/');
      const logDate = new Date(`${year}-${month}-${day}`);

      // กรองเฉพาะช่วงวันที่เลือก
      if (logDate < cutoffDate) return;

      // 2.2 แปลงค่า Receive/Withdraw เป็นตัวเลข
      // ตัวอย่าง: "+5" -> 5, "+0" -> 0
      const rec = parseInt(log.receive.replace('+', '')) || 0;
      const wit = parseInt(log.withdraw.replace('+', '')) || 0;

      // 2.3 Group by Date (สำหรับกราฟเส้น)
      const dateKey = `${day}/${month}`;
      if (!dailyStats[dateKey]) dailyStats[dateKey] = { in: 0, out: 0 };
      dailyStats[dateKey].in += rec;
      dailyStats[dateKey].out += wit;

      // 2.4 Group by Item Code/Name (สำหรับกราฟแท่ง)
      const itemKey = log.recordId; 
      if (!itemStats[itemKey]) itemStats[itemKey] = { in: 0, out: 0 };
      itemStats[itemKey].in += rec;
      itemStats[itemKey].out += wit;
    });

    // 2.5 Prepare Data for Charts
    const dates = Object.keys(dailyStats).sort((a, b) => {
        const [d1, m1] = a.split('/');
        const [d2, m2] = b.split('/');
        return new Date(2026, m1-1, d1) - new Date(2026, m2-1, d2);
    }); // Sort วันที่

    const items = Object.keys(itemStats).sort((a, b) => itemStats[b].out - itemStats[a].out).slice(0, 10); // Top 10 Active Items

    return {
      line: {
        labels: dates,
        datasets: [
          {
            label: 'รับเข้าคลัง',
            data: dates.map(d => dailyStats[d].in),
            borderColor: '#10b981', // Emerald 500
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            tension: 0.4,
            fill: true,
            pointBackgroundColor: '#10b981',
            pointBorderWidth: 2,
            pointHoverRadius: 6,
          },
          {
            label: 'เบิกจ่าย',
            data: dates.map(d => dailyStats[d].out),
            borderColor: '#f59e0b', // Amber 500
            backgroundColor: 'rgba(245, 158, 11, 0.1)',
            tension: 0.4,
            fill: true,
            pointBackgroundColor: '#f59e0b',
            pointBorderWidth: 2,
            pointHoverRadius: 6,
          }
        ]
      },
      bar: {
        labels: items,
        datasets: [
          {
            label: 'รับเข้า',
            data: items.map(i => itemStats[i].in),
            backgroundColor: '#10b981',
            borderRadius: 4,
            barPercentage: 0.7,
          },
          {
            label: 'เบิกจ่าย',
            data: items.map(i => itemStats[i].out),
            backgroundColor: '#f59e0b',
            borderRadius: 4,
            barPercentage: 0.7,
          }
        ]
      }
    };
  }, [logs, timeRange]);

  if (loading) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-zinc-400"/></div>;
  if (!chartData) return <div className="p-10 text-center text-zinc-400">ไม่มีข้อมูลสำหรับการวิเคราะห์ในช่วงเวลานี้</div>;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* FILTER HEADER */}
      <div className="flex items-center justify-end gap-2 mb-4">
        <span className="text-sm text-zinc-500 flex items-center gap-1"><Calendar size={14}/> ระยะเวลา:</span>
        <select 
          value={timeRange} 
          onChange={(e) => setTimeRange(Number(e.target.value))}
          className="bg-white border border-zinc-200 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-zinc-100 cursor-pointer"
        >
          <option value={7}>7 วันที่ผ่านมา</option>
          <option value={30}>30 วันที่ผ่านมา</option>
          <option value={90}>3 เดือนที่ผ่านมา</option>
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* GRAPH 1: TIMELINE (LINE CHART) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-zinc-900">แนวโน้มการเคลื่อนไหว</h3>
            <p className="text-xs text-zinc-500">เปรียบเทียบยอดการรับเข้าและเบิกจ่ายอุปกรณ์ตามช่วงเวลา</p>
          </div>
          <div className="h-[300px] w-full">
            <Line 
              data={chartData.line} 
              options={{
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                  mode: 'index', // ช่วยให้โชว์ tooltip ของทั้ง 2 เส้นพร้อมกันเวลาเอาเมาส์ชี้แนวตั้ง
                  intersect: false,
                },
                plugins: { 
                  legend: { 
                    position: 'top', 
                    align: 'end',
                    labels: { usePointStyle: true, boxWidth: 8 } // ทำให้จุด Legend เป็นวงกลมแทนสี่เหลี่ยม
                  },
                  tooltip: {
                    padding: 12,
                    backgroundColor: 'rgba(24, 24, 27, 0.9)', // สอดคล้องกับธีม Zinc
                    titleFont: { size: 14, weight: 'bold' }
                  }
                },
                scales: { 
                  y: { 
                    beginAtZero: true, 
                    grid: { color: '#f4f4f5', drawBorder: false }, // ซ่อนขอบแกน ทำให้ดูสะอาดตา
                    ticks: { precision: 0 } // แสดงตัวเลขจำนวนเต็ม
                  }, 
                  x: { 
                    grid: { display: false, drawBorder: false } 
                  } 
                }
              }} 
            />
          </div>
        </div>

        {/* GRAPH 2: BY ITEM (BAR CHART) */}
        <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-zinc-900">อุปกรณ์ที่เคลื่อนไหวสูงสุด 10 อันดับ</h3>
            <p className="text-xs text-zinc-500">เรียงตามปริมาณการทำรายการ (รวมรับเข้าและเบิกจ่าย)</p>
          </div>
          <div className="h-[300px] w-full">
            <Bar 
              data={chartData.bar} 
              options={{
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y', // กราฟแนวนอน (อ่านชื่ออุปกรณ์ง่ายกว่า)
                interaction: {
                  mode: 'index',
                  intersect: false,
                },
                plugins: { 
                  legend: { 
                    position: 'bottom',
                    labels: { usePointStyle: true, boxWidth: 8 }
                  },
                  tooltip: {
                    padding: 12,
                    backgroundColor: 'rgba(24, 24, 27, 0.9)'
                  }
                },
                scales: { 
                  x: { 
                    beginAtZero: true, 
                    grid: { color: '#f4f4f5', drawBorder: false },
                    ticks: { precision: 0 }
                  }, 
                  y: { 
                    grid: { display: false, drawBorder: false },
                    ticks: { autoSkip: false } // ป้องกันไม่ให้ชื่ออุปกรณ์โดนซ่อนเมื่อพื้นที่แคบ
                  } 
                }
              }} 
            />
          </div>
        </div>

      </div>
    </div>
  );
}