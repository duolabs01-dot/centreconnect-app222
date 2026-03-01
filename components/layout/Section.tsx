import { cn } from '@/lib/utils'
import { Container } from './container'

type SectionProps = {
  children: React.ReactNode
  className?: string
  containerClassName?: string
} & React.ComponentProps<'section'>

export function Section({ children, className, containerClassName, ...props }: SectionProps) {
  return (
    <section className={cn('py-10 sm:py-12 lg:py-14', className)} {...props}>
      <Container className={containerClassName}>{children}</Container>
    </section>
  )
}
