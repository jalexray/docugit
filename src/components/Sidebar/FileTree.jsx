import FileTreeItem from './FileTreeItem'

export default function FileTree({ files, activeFilePath, onOpenFile }) {
  if (!files || files.length === 0) {
    return (
      <div className="px-3 py-4 text-xs text-gray-400 text-center">
        No markdown files found
      </div>
    )
  }

  return (
    <div className="py-1">
      {files.map((item) => (
        <FileTreeItem
          key={item.path}
          item={item}
          activeFilePath={activeFilePath}
          onOpenFile={onOpenFile}
        />
      ))}
    </div>
  )
}
