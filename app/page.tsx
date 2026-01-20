import Navbar from '@/components/Navbar'

export default function Home() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 pt-16">
        <div className="container mx-auto px-4 py-16">
          {/* Header - Fade in animation */}
          <div className="text-center mb-16 animate-fade-in">
            <h1 className="text-5xl font-bold text-gray-900 mb-4 animate-slide-down">
              💧 WaterFlow Pro
            </h1>
            <p className="text-xl text-gray-600 animate-slide-up">
              Hệ thống quản lý nước hiện đại
            </p>
          </div>

          {/* Hero Section - Slide up with delay */}
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-2xl mx-auto animate-slide-up-delay hover:shadow-2xl transition-shadow duration-300">
            <h2 className="text-3xl font-bold text-gray-800 mb-4">
              Chào mừng đến với WaterFlow Pro! 🚀
            </h2>
            <p className="text-gray-600 mb-6">
              Webapp quản lý thu tiền nước được xây dựng với Next.js 14, 
              TypeScript, và Tailwind CSS.
            </p>
            
            {/* Features - Hover effects */}
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-blue-50 transition-colors duration-200 cursor-pointer">
                <span className="text-2xl">⚡</span>
                <span className="text-gray-700">Performance cao - Cold start {'<'}500ms</span>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-blue-50 transition-colors duration-200 cursor-pointer">
                <span className="text-2xl">🎨</span>
                <span className="text-gray-700">UI/UX hiện đại và đẹp mắt</span>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-blue-50 transition-colors duration-200 cursor-pointer">
                <span className="text-2xl">📱</span>
                <span className="text-gray-700">Responsive - Hoạt động trên mọi thiết bị</span>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-blue-50 transition-colors duration-200 cursor-pointer">
                <span className="text-2xl">🔒</span>
                <span className="text-gray-700">Bảo mật cao với Supabase Auth</span>
              </div>
            </div>

            {/* CTA Button - Scale on hover */}
            <div className="mt-8">
              <button className="w-full bg-blue-600 hover:bg-blue-700 hover:scale-105 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg">
                Bắt đầu ngay →
              </button>
            </div>
          </div>

          {/* Footer - Fade in */}
          <div className="text-center mt-16 text-gray-500 animate-fade-in-delay">
            <p>Built with ❤️ using Next.js 14 + TypeScript + Tailwind CSS</p>
          </div>
        </div>
      </main>
    </>
  )
}
