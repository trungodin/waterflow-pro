// Dashboard Page
// File: app/dashboard/page.tsx

'use client'

import Navbar from '@/components/Navbar'

export default function DashboardPage() {
  // Mock data
  const stats = [
    { label: 'Tổng khách hàng', value: '1,234', change: '+12%', icon: '👥', color: 'blue' },
    { label: 'Doanh thu tháng', value: '₫45.2M', change: '+8%', icon: '💰', color: 'green' },
    { label: 'Hóa đơn chưa thu', value: '89', change: '-5%', icon: '📄', color: 'yellow' },
    { label: 'Tỷ lệ thu hồi', value: '94.5%', change: '+2%', icon: '📊', color: 'purple' },
  ]

  const recentActivities = [
    { id: 1, customer: 'Nguyễn Văn A', action: 'Thanh toán hóa đơn', amount: '₫250,000', time: '5 phút trước' },
    { id: 2, customer: 'Trần Thị B', action: 'Đăng ký mới', amount: '-', time: '15 phút trước' },
    { id: 3, customer: 'Lê Văn C', action: 'Thanh toán hóa đơn', amount: '₫180,000', time: '1 giờ trước' },
    { id: 4, customer: 'Phạm Thị D', action: 'Cập nhật thông tin', amount: '-', time: '2 giờ trước' },
  ]

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 pt-16">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8 animate-fade-in">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Dashboard</h1>
            <p className="text-gray-600">Tổng quan hệ thống quản lý nước</p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {stats.map((stat, index) => (
              <div
                key={index}
                className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow animate-slide-up"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-3xl">{stat.icon}</span>
                  <span className={`text-sm font-semibold ${
                    stat.change.startsWith('+') ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {stat.change}
                  </span>
                </div>
                <h3 className="text-gray-600 text-sm mb-1">{stat.label}</h3>
                <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Revenue Chart */}
            <div className="bg-white rounded-xl shadow-lg p-6 animate-slide-up">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Doanh thu 6 tháng</h2>
              <div className="h-64 flex items-end justify-between gap-2">
                {[65, 75, 80, 70, 85, 90].map((height, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2">
                    <div
                      className="w-full bg-gradient-to-t from-blue-600 to-blue-400 rounded-t-lg transition-all hover:from-blue-700 hover:to-blue-500 cursor-pointer"
                      style={{ height: `${height}%` }}
                    ></div>
                    <span className="text-xs text-gray-600">T{i + 1}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Customer Growth Chart */}
            <div className="bg-white rounded-xl shadow-lg p-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
              <h2 className="text-xl font-bold text-gray-900 mb-4">Tăng trưởng khách hàng</h2>
              <div className="h-64 flex items-end justify-between gap-2">
                {[50, 60, 55, 70, 75, 80].map((height, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2">
                    <div
                      className="w-full bg-gradient-to-t from-green-600 to-green-400 rounded-t-lg transition-all hover:from-green-700 hover:to-green-500 cursor-pointer"
                      style={{ height: `${height}%` }}
                    ></div>
                    <span className="text-xs text-gray-600">T{i + 1}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent Activities */}
          <div className="bg-white rounded-xl shadow-lg p-6 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Hoạt động gần đây</h2>
              <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                Xem tất cả →
              </button>
            </div>
            <div className="space-y-4">
              {recentActivities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-semibold">
                        {activity.customer.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{activity.customer}</p>
                      <p className="text-sm text-gray-600">{activity.action}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">{activity.amount}</p>
                    <p className="text-xs text-gray-500">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8 animate-fade-in-delay">
            <button className="bg-white hover:bg-blue-50 border-2 border-blue-200 rounded-xl p-6 text-left transition-all hover:shadow-lg group">
              <span className="text-3xl mb-3 block group-hover:scale-110 transition-transform">📝</span>
              <h3 className="font-bold text-gray-900 mb-1">Tạo hóa đơn mới</h3>
              <p className="text-sm text-gray-600">Lập hóa đơn cho khách hàng</p>
            </button>
            <button className="bg-white hover:bg-green-50 border-2 border-green-200 rounded-xl p-6 text-left transition-all hover:shadow-lg group">
              <span className="text-3xl mb-3 block group-hover:scale-110 transition-transform">👥</span>
              <h3 className="font-bold text-gray-900 mb-1">Quản lý khách hàng</h3>
              <p className="text-sm text-gray-600">Xem và cập nhật thông tin</p>
            </button>
            <button className="bg-white hover:bg-purple-50 border-2 border-purple-200 rounded-xl p-6 text-left transition-all hover:shadow-lg group">
              <span className="text-3xl mb-3 block group-hover:scale-110 transition-transform">📊</span>
              <h3 className="font-bold text-gray-900 mb-1">Báo cáo chi tiết</h3>
              <p className="text-sm text-gray-600">Xem thống kê và phân tích</p>
            </button>
          </div>
        </div>
      </main>
    </>
  )
}

/*
📖 GIẢI THÍCH:

1. STATS GRID:
   - grid-cols-1 md:grid-cols-2 lg:grid-cols-4: Responsive grid
   - 1 column mobile, 2 tablet, 4 desktop
   - Hover shadow effect

2. CHARTS:
   - Simple bar charts với gradient
   - Height based on percentage
   - Hover effects
   - Responsive 1 column mobile, 2 desktop

3. RECENT ACTIVITIES:
   - List với avatar circles
   - Hover background
   - Time stamps
   - Amount display

4. QUICK ACTIONS:
   - Card buttons với icons
   - Hover effects (background, shadow, scale)
   - Group hover cho icon scale

5. ANIMATIONS:
   - Staggered animations với animationDelay
   - Fade in, slide up effects
   - Smooth transitions

6. MOCK DATA:
   - Hardcoded data cho demo
   - Sẽ thay bằng API calls sau
*/
