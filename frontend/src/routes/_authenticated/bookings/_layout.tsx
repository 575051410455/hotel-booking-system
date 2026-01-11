import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/bookings/_layout')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/_authenticated/bookings/_layout"!</div>
}
