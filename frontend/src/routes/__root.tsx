import { createRootRoute, Link, Outlet } from '@tanstack/react-router'

const RootLayout = () => (
    <div className='min-h-dvh'>
        <Link to="/about"> About</Link>
        <Outlet />
    </div>
)

export const Route = createRootRoute({ component: RootLayout })