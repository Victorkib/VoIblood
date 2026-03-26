import { AlertCircle } from 'lucide-react'

export function FormError({ message, field }) {
  if (!message) return null

  return (
    <div className="flex items-start gap-2 mt-1">
      <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
      <span className="text-sm text-red-600">{message}</span>
    </div>
  )
}

export function FormField({ label, error, required, children, hint }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1">
        <label className="block text-sm font-medium text-foreground">
          {label}
        </label>
        {required && <span className="text-red-600">*</span>}
      </div>
      {children}
      {hint && <p className="text-xs text-foreground/50">{hint}</p>}
      {error && <FormError message={error} field={label} />}
    </div>
  )
}
