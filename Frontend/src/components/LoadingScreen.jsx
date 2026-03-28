export default function LoadingScreen() {
  return (
    <div className="fixed inset-0 bg-dark flex items-center justify-center z-50">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-[#222] border-t-red-600 rounded-full mx-auto mb-4 animate-spin" />
        <p className="text-white/50 font-display text-sm tracking-widest uppercase animate-pulse">
          Loading...
        </p>
      </div>
    </div>
  )
}
