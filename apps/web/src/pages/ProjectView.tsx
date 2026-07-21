import { useState } from 'react';
import { useParams, useNavigate } from '@tanstack/react-router';
import { useQuery, useMutation, gql } from '@apollo/client';
import { ArrowLeft, Plus, Trash2, Package, FileText, Settings } from 'lucide-react';

const PROJECT_QUERY = gql`
  query Project($id: ID!) {
    project(id: $id) {
      id
      title
      description
      status
      version
      tags
      createdAt
      updatedAt
      owner {
        id
        name
      }
      bomEntries {
        id
        quantity
        referenceDesignator
        notes
        part {
          id
          partNumber
          name
          description
          category
          supplier {
            name
          }
        }
      }
      designFiles {
        id
        type
        name
        fileUrl
        createdAt
      }
    }
  }
`;

const UPDATE_PROJECT_MUTATION = gql`
  mutation UpdateProject($id: ID!, $input: UpdateProjectInput!) {
    updateProject(id: $id, input: $input) {
      id
      status
    }
  }
`;

const REMOVE_BOM_ENTRY_MUTATION = gql`
  mutation RemoveBomEntry($id: ID!) {
    removeBomEntry(id: $id)
  }
`;

export function ProjectView() {
  const { projectId } = useParams({ from: '/project/$projectId' });
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'bom' | 'files' | 'settings'>('bom');

  const { data, loading, refetch } = useQuery(PROJECT_QUERY, {
    variables: { id: projectId },
  });

  const [updateProject] = useMutation(UPDATE_PROJECT_MUTATION, {
    onCompleted: () => refetch(),
  });

  const [removeBomEntry] = useMutation(REMOVE_BOM_ENTRY_MUTATION, {
    onCompleted: () => refetch(),
  });

  const project = data?.project;

  const handleStatusChange = async (status: string) => {
    await updateProject({ variables: { id: projectId, input: { status } } });
  };

  const handleRemoveBomEntry = async (entryId: string) => {
    if (confirm('Remove this part from BOM?')) {
      await removeBomEntry({ variables: { id: entryId } });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-2 border-cyber-500/30 border-t-cyber-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-400">Project not found</p>
        <button onClick={() => navigate({ to: '/' })} className="btn-primary mt-4">
          Back to Projects
        </button>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate({ to: '/' })}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Projects
        </button>
        
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">{project.title}</h1>
            {project.description && (
              <p className="text-gray-400 mt-1">{project.description}</p>
            )}
          </div>
          <select
            value={project.status}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="input"
          >
            <option value="draft">Draft</option>
            <option value="in_progress">In Progress</option>
            <option value="review">Review</option>
            <option value="completed">Completed</option>
            <option value="archived">Archived</option>
          </select>
        </div>

        {project.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {project.tags.map((tag: string) => (
              <span key={tag} className="px-3 py-1 bg-gray-800 rounded-full text-sm text-gray-400">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-800 mb-6">
        {[
          { id: 'bom', label: 'Bill of Materials', icon: Package },
          { id: 'files', label: 'Design Files', icon: FileText },
          { id: 'settings', label: 'Settings', icon: Settings },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-cyber-500 text-cyber-400'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* BOM Tab */}
      {activeTab === 'bom' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">
              Parts ({project.bomEntries.length})
            </h2>
            <button
              onClick={() => navigate({ to: '/parts', search: { projectId } })}
              className="btn-primary flex items-center gap-2 text-sm"
            >
              <Plus className="w-4 h-4" />
              Add Part
            </button>
          </div>

          {project.bomEntries.length === 0 ? (
            <div className="card text-center py-8">
              <Package className="w-10 h-10 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">No parts in BOM yet</p>
              <p className="text-gray-500 text-sm mt-1">Search for parts and add them to your project</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-sm text-gray-400 border-b border-gray-800">
                    <th className="pb-3 font-medium">Part Number</th>
                    <th className="pb-3 font-medium">Name</th>
                    <th className="pb-3 font-medium">Qty</th>
                    <th className="pb-3 font-medium">Ref Des</th>
                    <th className="pb-3 font-medium">Supplier</th>
                    <th className="pb-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {project.bomEntries.map((entry: any) => (
                    <tr key={entry.id} className="hover:bg-gray-900/50">
                      <td className="py-3 font-mono text-sm text-cyber-400">{entry.part.partNumber}</td>
                      <td className="py-3">{entry.part.name}</td>
                      <td className="py-3 text-center">{entry.quantity}</td>
                      <td className="py-3 text-gray-400">{entry.referenceDesignator || '-'}</td>
                      <td className="py-3 text-gray-400">{entry.part.supplier?.name || '-'}</td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => handleRemoveBomEntry(entry.id)}
                          className="p-1 hover:bg-gray-800 rounded text-gray-400 hover:text-red-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Files Tab */}
      {activeTab === 'files' && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Design Files</h2>
          {project.designFiles.length === 0 ? (
            <div className="card text-center py-8">
              <FileText className="w-10 h-10 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">No design files yet</p>
              <p className="text-gray-500 text-sm mt-1">Upload schematics, CAD models, or documentation</p>
            </div>
          ) : (
            <div className="space-y-2">
              {project.designFiles.map((file: any) => (
                <div key={file.id} className="card flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="font-medium">{file.name}</p>
                      <p className="text-xs text-gray-500">{file.type} - {new Date(file.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <a
                    href={file.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-cyber-400 hover:text-cyber-300 text-sm"
                  >
                    Download
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Project Settings</h2>
          <div className="card space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Created</label>
              <p>{new Date(project.createdAt).toLocaleString()}</p>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Last Updated</label>
              <p>{new Date(project.updatedAt).toLocaleString()}</p>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Version</label>
              <p>v{project.version}</p>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Owner</label>
              <p>{project.owner.name}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
