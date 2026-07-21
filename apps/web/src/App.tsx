import { Outlet, useRouter } from '@tanstack/react-router';
import { useQuery, gql } from '@apollo/client';
import { Cpu, FolderOpen, Search, LogOut, User } from 'lucide-react';

const ME_QUERY = gql`
  query Me {
    me {
      id
      name
      email
      role
    }
  }
`;

export function App() {
  const router = useRouter();
  const { data, loading } = useQuery(ME_QUERY);
  const user = data?.me;

  const handleLogout = () => {
    localStorage.removeItem('cybertron-token');
    router.navigate({ to: '/login' });
  };

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col">
        <div className="p-6 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-cyber-600 rounded-lg flex items-center justify-center">
              <Cpu className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg">Cybertron</h1>
              <p className="text-xs text-gray-500">Hardware Design AI</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <button
            onClick={() => router.navigate({ to: '/' })}
            className="w-full flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-gray-800 text-gray-300 hover:text-white transition-colors"
          >
            <FolderOpen className="w-5 h-5" />
            Projects
          </button>
          <button
            onClick={() => router.navigate({ to: '/parts' })}
            className="w-full flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-gray-800 text-gray-300 hover:text-white transition-colors"
          >
            <Search className="w-5 h-5" />
            Parts Search
          </button>
        </nav>

        <div className="p-4 border-t border-gray-800">
          {user ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4" />
                </div>
                <div className="text-sm">
                  <p className="font-medium">{user.name}</p>
                  <p className="text-gray-500 text-xs">{user.email}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => router.navigate({ to: '/login' })}
              className="btn-primary w-full"
            >
              Sign In
            </button>
          )}
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
