import { useEffect, useRef } from 'react'
import { Terminal as XTerm } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import '@xterm/xterm/css/xterm.css'

export default function Terminal() {
  const containerRef = useRef(null)
  const xtermRef = useRef(null)

  useEffect(() => {
    if (!containerRef.current) return

    const term = new XTerm({
      cursorBlink: true,
      fontSize: 13,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: '#1e1e1e',
        foreground: '#d4d4d4',
        cursor: '#d4d4d4',
        selectionBackground: '#264f78',
        black: '#000000',
        red: '#cd3131',
        green: '#0dbc79',
        yellow: '#e5e510',
        blue: '#2472c8',
        magenta: '#bc3fbc',
        cyan: '#11a8cd',
        white: '#e5e5e5',
        brightBlack: '#666666',
        brightRed: '#f14c4c',
        brightGreen: '#23d18b',
        brightYellow: '#f5f543',
        brightBlue: '#3b8eea',
        brightMagenta: '#d670d6',
        brightCyan: '#29b8db',
        brightWhite: '#ffffff',
      },
    })

    const fitAddon = new FitAddon()
    term.loadAddon(fitAddon)
    term.open(containerRef.current)
    xtermRef.current = term

    // Fit to container and send initial size
    requestAnimationFrame(() => {
      fitAddon.fit()
      invoke('pty_resize', { cols: term.cols, rows: term.rows }).catch(() => {})
    })

    // Spawn the PTY shell
    invoke('pty_spawn').catch((err) => {
      term.write(`\r\nFailed to start shell: ${err}\r\n`)
    })

    // Listen for PTY output
    const unlistenOutput = listen('pty-output', (event) => {
      term.write(event.payload)
    })

    // Listen for PTY exit
    const unlistenExit = listen('pty-exit', () => {
      term.write('\r\n[Process exited]\r\n')
    })

    // Send keystrokes to PTY
    const onDataDisposable = term.onData((data) => {
      invoke('pty_write', { data }).catch(() => {})
    })

    // Send resize events to PTY
    const onResizeDisposable = term.onResize(({ cols, rows }) => {
      invoke('pty_resize', { cols, rows }).catch(() => {})
    })

    // Auto-fit when container resizes
    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(() => fitAddon.fit())
    })
    resizeObserver.observe(containerRef.current)

    // Cleanup
    return () => {
      resizeObserver.disconnect()
      onDataDisposable.dispose()
      onResizeDisposable.dispose()
      unlistenOutput.then((fn) => fn())
      unlistenExit.then((fn) => fn())
      invoke('pty_kill').catch(() => {})
      term.dispose()
      xtermRef.current = null
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className="h-full w-full"
      style={{ padding: '4px 0 0 4px' }}
    />
  )
}
