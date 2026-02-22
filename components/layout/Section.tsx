import { cn } from '@/lib/utils'
import { PageContainer } from './PageContainer'

type SectionProps = {
  children: React.ReactNode
  className?: string
  containerClassName?: string
} & React.ComponentProps<'section'>

export function Section({ children, className, containerClassName, ...props }: SectionProps) {
  return (
    <section className={cn('py-10 sm:py-12 lg:py-14', className)} {...props}>
      <PageContainer className={containerClassName}>{children}</PageContainer>
    </section>
  )
}
