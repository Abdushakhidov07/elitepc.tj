export default function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="aspect-square skeleton" />
      <div className="p-4 space-y-3">
        <div className="h-3 w-16 skeleton" />
        <div className="h-4 w-full skeleton" />
        <div className="h-4 w-2/3 skeleton" />
        <div className="h-3 w-20 skeleton" />
        <div className="h-6 w-24 skeleton" />
        <div className="h-10 w-full skeleton mt-2" />
      </div>
    </div>
  );
}
