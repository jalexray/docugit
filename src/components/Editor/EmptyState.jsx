export default function EmptyState() {
  return (
    <div className="flex items-center justify-center h-full text-gray-400">
      <div className="text-center">
        <p className="text-lg mb-2">No file open</p>
        <p className="text-sm">Select a markdown file from the sidebar to start editing</p>
      </div>
    </div>
  )
}
