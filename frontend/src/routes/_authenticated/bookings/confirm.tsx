import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/bookings/confirm')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/_authenticated/bookings/confirm"!</div>
}
