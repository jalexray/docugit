import Terminal from './Terminal'

export default function TerminalPanel({ onClose }) {
  return (
    <div className="flex flex-col h-full bg-[#1e1e1e]">
      <div className="flex items-center justify-between px-3 py-1 bg-gray-800 border-b border-gray-700 shrink-0">
        <span className="text-xs font-medium text-gray-300">Terminal</span>
        <button
          onClick={onClose}
          className="text-xs text-gray-400 hover:text-gray-200"
        >
          &times;
        </button>
      </div>
      <div className="flex-1 min-h-0">
        <Terminal />
      </div>
    </div>
  )
}
