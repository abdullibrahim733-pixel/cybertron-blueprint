import { useState } from 'react';
import { useQuery, useMutation, gql } from '@apollo/client';
import { Search, Plus, Check, ExternalLink } from 'lucide-react';

const SEARCH_PARTS_QUERY = gql`
  query SearchParts($input: SearchPartsInput!) {
    searchParts(input: $input) {
      parts {
        id
        partNumber
        name
        description
        category
        imageUrl
        supplier {
          name
          website
        }
        specData
      }
      totalCount
    }
  }
`;

const ADD_BOM_ENTRY_MUTATION = gql`
  mutation AddBomEntry($input: AddBomEntryInput!) {
    addBomEntry(input: $input) {
      id
      quantity
    }
  }
`;

export function PartsSearch() {
  const projectId = new URLSearchParams(window.location.search).get('projectId') || undefined;
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState('');
  const [addedParts, setAddedParts] = useState<Set<string>>(new Set());

  const { data, loading, refetch } = useQuery(SEARCH_PARTS_QUERY, {
    variables: {
      input: {
        query: searchQuery,
        category: category || undefined,
        limit: 20,
      },
    },
    skip: searchQuery.length < 2,
  });

  const [addBomEntry] = useMutation(ADD_BOM_ENTRY_MUTATION);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.length >= 2) {
      refetch();
    }
  };

  const handleAddToBom = async (partId: string) => {
    if (!projectId) {
      alert('No project selected. Open a project first, then add parts.');
      return;
    }

    try {
      await addBomEntry({
        variables: {
          input: {
            projectId,
            partId,
            quantity: 1,
          },
        },
      });
      setAddedParts(new Set([...addedParts, partId]));
    } catch (err: any) {
      alert(err.message || 'Failed to add part');
    }
  };

  const parts = data?.searchParts?.parts || [];
  const totalCount = data?.searchParts?.totalCount || 0;

  const categories = [
    'Microcontroller',
    'Sensor',
    'Motor',
    'Resistor',
    'Capacitor',
    'Inductor',
    'Connector',
    'Power Supply',
    'LED',
    'Transistor',
    'IC',
    'Other',
  ];

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Parts Search</h1>
        <p className="text-gray-400 mt-1">
          Search electronic components from supplier databases
          {projectId && <span className="text-cyber-400 ml-2">(Adding to project)</span>}
        </p>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="flex gap-3 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input w-full pl-10"
            placeholder="Search by name, part number, or description..."
          />
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="input"
        >
          <option value="">All Categories</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
        <button type="submit" className="btn-primary">
          Search
        </button>
      </form>

      {/* Results */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-cyber-500/30 border-t-cyber-500 rounded-full animate-spin" />
        </div>
      ) : parts.length === 0 ? (
        <div className="card text-center py-12">
          <Search className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-300">
            {searchQuery.length < 2 ? 'Start typing to search' : 'No parts found'}
          </h3>
          <p className="text-gray-500 mt-2">
            {searchQuery.length < 2
              ? 'Search for microcontrollers, sensors, resistors, and more'
              : 'Try a different search term or category'}
          </p>
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-400 mb-4">{totalCount} results found</p>
          <div className="space-y-3">
            {parts.map((part: any) => (
              <div key={part.id} className="card flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-mono text-cyber-400 text-sm">{part.partNumber}</span>
                    {part.category && (
                      <span className="px-2 py-0.5 bg-gray-800 rounded text-xs text-gray-400">
                        {part.category}
                      </span>
                    )}
                  </div>
                  <h3 className="font-medium">{part.name}</h3>
                  {part.description && (
                    <p className="text-sm text-gray-400 mt-1 line-clamp-2">{part.description}</p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                    {part.supplier && (
                      <span className="flex items-center gap-1">
                        {part.supplier.name}
                        {part.supplier.website && (
                          <a
                            href={part.supplier.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-cyber-400 hover:text-cyber-300"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </span>
                    )}
                  </div>
                </div>
                
                {projectId && (
                  <button
                    onClick={() => handleAddToBom(part.id)}
                    disabled={addedParts.has(part.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      addedParts.has(part.id)
                        ? 'bg-green-600/20 text-green-400'
                        : 'bg-cyber-600 hover:bg-cyber-700 text-white'
                    }`}
                  >
                    {addedParts.has(part.id) ? (
                      <>
                        <Check className="w-4 h-4" />
                        Added
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        Add to BOM
                      </>
                    )}
                  </button>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
