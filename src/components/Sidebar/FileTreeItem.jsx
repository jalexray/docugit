import { useState } from 'react'

export default function FileTreeItem({ item, activeFilePath, onOpenFile, depth = 0 }) {
  const [expanded, setExpanded] = useState(true)
  const isActive = item.type === 'file' && item.path === activeFilePath

  if (item.type === 'directory') {
    return (
      <div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full text-left flex items-center gap-1 px-2 py-0.5 hover:bg-gray-200 rounded text-xs text-gray-600"
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
        >
          <span className="text-gray-400 w-3 text-center">{expanded ? '\u25BE' : '\u25B8'}</span>
          <span>{item.name}</span>
        </button>
        {expanded && item.children?.map((child) => (
          <FileTreeItem
            key={child.path}
            item={child}
            activeFilePath={activeFilePath}
            onOpenFile={onOpenFile}
            depth={depth + 1}
          />
        ))}
      </div>
    )
  }

  return (
    <button
      onClick={() => onOpenFile(item.path)}
      className={`w-full text-left flex items-center gap-1 px-2 py-0.5 rounded text-xs ${
        isActive
          ? 'bg-blue-100 text-blue-700 font-medium'
          : 'text-gray-700 hover:bg-gray-200'
      }`}
      style={{ paddingLeft: `${depth * 12 + 20}px` }}
      title={item.path}
    >
      <span>{item.name}</span>
    </button>
  )
}
