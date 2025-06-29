import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet'
import {
  LayoutDashboard,
  FolderOpen,
  Building2,
  FileText,
  CheckSquare,
  Users,
  Menu,
  LogOut,
  Settings,
  User
} from 'lucide-react'

const navigation = [
  { name: 'Tableau de bord', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Projets', href: '/projects', icon: FolderOpen },
  { name: 'Organisations', href: '/organizations', icon: Building2 },
  { name: 'Documents', href: '/documents', icon: FileText },
  { name: 'Tâches', href: '/tasks', icon: CheckSquare },
]

const adminNavigation = [
  { name: 'Utilisateurs', href: '/users', icon: Users },
]

function NavigationItem({ item, isMobile = false, onClick }) {
  const location = useLocation()
  const navigate = useNavigate()
  const isActive = location.pathname === item.href
  
  const handleClick = () => {
    navigate(item.href)
    if (onClick) onClick()
  }
  
  return (
    <Button
      variant={isActive ? "secondary" : "ghost"}
      className={`w-full justify-start ${isMobile ? 'text-base' : ''}`}
      onClick={handleClick}
    >
      <item.icon className="mr-2 h-4 w-4" />
      {item.name}
    </Button>
  )
}

function Sidebar({ className = "" }) {
  const { user } = useAuth()
  
  return (
    <div className={`pb-12 ${className}`}>
      <div className="space-y-4 py-4">
        <div className="px-3 py-2">
          <div className="mb-4">
            <h1 className="text-2xl font-bold text-primary">🔥 PrevHub</h1>
            <p className="text-sm text-muted-foreground">Prévéris ERP</p>
          </div>
          <div className="space-y-1">
            {navigation.map((item) => (
              <NavigationItem key={item.name} item={item} />
            ))}
            {(user?.role === 'admin' || user?.role === 'manager') && (
              <>
                <div className="pt-4">
                  <h3 className="mb-2 px-4 text-sm font-semibold text-muted-foreground">
                    Administration
                  </h3>
                  {adminNavigation.map((item) => (
                    <NavigationItem key={item.name} item={item} />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function UserMenu() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  
  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarFallback>
              {user?.first_name?.[0]}{user?.last_name?.[0]}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">
              {user?.first_name} {user?.last_name}
            </p>
            <p className="text-xs leading-none text-muted-foreground">
              {user?.email}
            </p>
            <p className="text-xs leading-none text-muted-foreground">
              {user?.role}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <User className="mr-2 h-4 w-4" />
          <span>Profil</span>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Settings className="mr-2 h-4 w-4" />
          <span>Paramètres</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Déconnexion</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user } = useAuth()

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar mobile */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <Sidebar />
        </SheetContent>
      </Sheet>

      {/* Sidebar desktop */}
      <div className="hidden md:fixed md:inset-y-0 md:flex md:w-64 md:flex-col">
        <div className="flex min-h-0 flex-1 flex-col border-r bg-card">
          <Sidebar />
        </div>
      </div>

      {/* Contenu principal */}
      <div className="md:pl-64">
        {/* Header */}
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b bg-background px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </Button>

          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <div className="flex flex-1"></div>
            <div className="flex items-center gap-x-4 lg:gap-x-6">
              <UserMenu />
            </div>
          </div>
        </div>

        {/* Contenu de la page */}
        <main className="py-6">
          <div className="px-4 sm:px-6 lg:px-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}