import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useQuery, useMutation, gql } from '@apollo/client';
import { Plus, FolderOpen, Clock, CheckCircle, Archive } from 'lucide-react';

const PROJECTS_QUERY = gql`
  query Projects($status: String, $limit: Int) {
    projects(status: $status, limit: $limit) {
      id
      title
      description
      status
      tags
      createdAt
      updatedAt
      owner {
        name
      }
      bomEntries {
        id
      }
    }
  }
`;

const CREATE_PROJECT_MUTATION = gql`
  mutation CreateProject($input: CreateProjectInput!) {
    createProject(input: $input) {
      id
      title
    }
  }
`;

const statusColors: Record<string, string> = {
  draft: 'bg-gray-600 text-gray-200',
  in_progress: 'bg-blue-600 text-blue-100',
  review: 'bg-yellow-600 text-yellow-100',
  completed: 'bg-green-600 text-green-100',
  archived: 'bg-gray-700 text-gray-300',
};

const statusIcons: Record<string, any> = {
  draft: Clock,
  in_progress: FolderOpen,
  review: Clock,
  completed: CheckCircle,
  archived: Archive,
};

export function Dashboard() {
  const navigate = useNavigate();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');

  const { data, loading, refetch } = useQuery(PROJECTS_QUERY, {
    variables: { limit: 20 },
  });

  const [createProject, { loading: creating }] = useMutation(CREATE_PROJECT_MUTATION, {
    onCompleted: (data) => {
      navigate({ to: '/project/$projectId', params: { projectId: data.createProject.id } });
      setShowCreateModal(false);
      setNewTitle('');
      setNewDescription('');
    },
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await createProject({
      variables: {
        input: { title: newTitle, description: newDescription || undefined },
      },
    });
  };

  const projects = data?.projects || [];

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Projects</h1>
          <p className="text-gray-400 mt-1">Your hardware design projects</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Project
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-cyber-500/30 border-t-cyber-500 rounded-full animate-spin" />
        </div>
      ) : projects.length === 0 ? (
        <div className="card text-center py-12">
          <FolderOpen className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-300">No projects yet</h3>
          <p className="text-gray-500 mt-2">Create your first hardware design project</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary mt-4"
          >
            <Plus className="w-4 h-4 inline mr-2" />
            Create Project
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project: any) => {
            const StatusIcon = statusIcons[project.status] || Clock;
            return (
              <button
                key={project.id}
                onClick={() => navigate({ to: '/project/$projectId', params: { projectId: project.id } })}
                className="card text-left hover:border-cyber-600 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-lg line-clamp-1">{project.title}</h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[project.status]}`}>
                    <StatusIcon className="w-3 h-3 inline mr-1" />
                    {project.status.replace('_', ' ')}
                  </span>
                </div>
                
                {project.description && (
                  <p className="text-gray-400 text-sm line-clamp-2 mb-3">{project.description}</p>
                )}

                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>{project.bomEntries.length} parts in BOM</span>
                  <span>{new Date(project.updatedAt).toLocaleDateString()}</span>
                </div>

                {project.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {project.tags.slice(0, 3).map((tag: string) => (
                      <span key={tag} className="px-2 py-0.5 bg-gray-800 rounded text-xs text-gray-400">
                        {tag}
                      </span>
                    ))}
                    {project.tags.length > 3 && (
                      <span className="px-2 py-0.5 bg-gray-800 rounded text-xs text-gray-400">
                        +{project.tags.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Create Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">New Project</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Title</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="input w-full"
                  placeholder="My Hardware Project"
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="input w-full h-24 resize-none"
                  placeholder="Describe your project..."
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || !newTitle.trim()}
                  className="btn-primary"
                >
                  {creating ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
