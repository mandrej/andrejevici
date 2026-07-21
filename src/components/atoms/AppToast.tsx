import React from 'react'
import { useToastStore, type Toast } from '../../stores/toastStore'
import AppIcon from './AppIcon'

export const AppToast: React.FC = () => {
  const { toasts, dismiss } = useToastStore()

  const toastClass = (type: Toast['type']) => {
    const map: Record<string, string> = {
      positive: 'bg-emerald-600/95 text-white',
      negative: 'bg-red-600/95 text-white',
      warning: 'bg-amber-500/95 text-black',
      info: 'bg-sky-500/95 text-white',
      ongoing: 'bg-blue-600/95 text-white',
      external: 'bg-stone-600/95 text-white',
    }
    return map[type ?? 'info'] ?? 'bg-gray-800/95 text-white'
  }

  const defaultIcon = (type: Toast['type']) => {
    const map: Record<string, string> = {
      positive: 'check_circle',
      negative: 'error',
      warning: 'warning',
      info: 'info',
      ongoing: 'hourglass_empty',
      external: 'notifications',
    }
    return map[type ?? 'info'] ?? 'info'
  }

  const handleAction = (id: number, handler?: () => void) => {
    if (handler) handler()
    dismiss(id)
  }

  return (
    <div className="notifications-layer fixed bottom-4 right-4 flex flex-col gap-2 z-[10000000] pointer-events-none w-80 max-w-[calc(100vw-2rem)]">
      <div className="flex flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl pointer-events-auto cursor-pointer backdrop-blur-sm border border-white/10 transition-all duration-300 transform ${toastClass(
              toast.type,
            )}`}
            onClick={() => dismiss(toast.id)}
          >
            {/* Spinner or Icon */}
            <div className="shrink-0">
              {toast.spinner ? (
                <span className="inline-block w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <AppIcon
                  name={toast.icon || defaultIcon(toast.type)}
                  className="w-5 h-5 leading-none"
                />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              {toast.html ? (
                <div
                  className="text-sm font-medium leading-snug"
                  dangerouslySetInnerHTML={{ __html: toast.message || '' }}
                />
              ) : (
                <div className="text-sm font-medium leading-snug">{toast.message}</div>
              )}
              {toast.caption && (
                <div className="text-xs opacity-75 mt-0.5 truncate">{toast.caption}</div>
              )}

              {/* Actions */}
              {toast.actions && toast.actions.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {toast.actions.map((action, i) => (
                    <button
                      key={i}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleAction(toast.id, action.handler)
                      }}
                      className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors flex items-center gap-1 ${
                        toast.type === 'warning'
                          ? 'bg-black/10 hover:bg-black/20'
                          : 'bg-white/20 hover:bg-white/30'
                      }`}
                      style={action.color ? { color: action.color } : {}}
                    >
                      {action.icon && <AppIcon name={action.icon} className="w-4 h-4" />}
                      {action.label && <span>{action.label}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Close */}
            <button className="shrink-0 opacity-60 hover:opacity-100 transition-opacity">
              <AppIcon name="close" className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

export default AppToast
