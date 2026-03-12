export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="h-52 animate-pulse rounded-[2rem] bg-[#080B13]" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[...Array(4)].map((_, index) => (
          <div
            key={index}
            className="h-40 animate-pulse rounded-[2rem] bg-[#080B13]"
            style={{ animationDelay: `${index * 70}ms` }}
          />
        ))}
      </div>
      <div className="h-[34rem] animate-pulse rounded-[2rem] bg-[#080B13]" />
    </div>
  )
}
