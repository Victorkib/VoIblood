import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  actionLabel = 'Get Started',
  actionIcon: ActionIcon,
  secondaryAction,
  secondaryLabel = 'Learn More',
  variant = 'default',
}) {
  const variants = {
    default: 'bg-background',
    subtle: 'bg-secondary/5',
    warning: 'bg-yellow-500/5 border-yellow-500/20',
    error: 'bg-destructive/5 border-destructive/20',
  }

  const iconVariants = {
    default: 'text-foreground/40',
    subtle: 'text-primary/40',
    warning: 'text-yellow-600',
    error: 'text-destructive',
  }

  return (
    <Card className={`p-12 text-center border-dashed ${variants[variant]}`}>
      <div className="space-y-4">
        {Icon && (
          <div className="flex justify-center">
            <div className="p-4 rounded-lg bg-foreground/5">
              <Icon className={`w-12 h-12 ${iconVariants[variant]}`} />
            </div>
          </div>
        )}

        <div>
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          {description && (
            <p className="mt-1 text-sm text-foreground/60">{description}</p>
          )}
        </div>

        {action && (
          <div className="flex gap-2 justify-center pt-2">
            <Button onClick={action} className="gap-2">
              {ActionIcon && <ActionIcon className="w-4 h-4" />}
              {actionLabel}
            </Button>

            {secondaryAction && (
              <Button variant="outline" onClick={secondaryAction}>
                {secondaryLabel}
              </Button>
            )}
          </div>
        )}
      </div>
    </Card>
  )
}
