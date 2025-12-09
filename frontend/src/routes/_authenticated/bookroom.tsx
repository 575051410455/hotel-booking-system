import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/bookroom')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/_authenticated/bookroom"!</div>
}
