import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from '@tanstack/react-router';
import { useMutation, gql } from '@apollo/client';
import { Send, Sparkles, Cpu, Zap, ChevronRight } from 'lucide-react';

const GENERATE_DESIGN = gql`
  mutation GenerateDesign($description: String!, $projectId: ID) {
    generateDesign(description: $description, projectId: $projectId) {
      projectName
      subsystems {
        name
        description
        type
        keyComponents
        interfaces
      }
      requirements
      notes
    }
  }
`;

const GENERATE_CIRCUIT = gql`
  mutation GenerateCircuit($subsystem: String!, $requirements: JSON!) {
    generateCircuit(subsystem: $subsystem, requirements: $requirements) {
      subsystem
      components {
        name
        type
        value
        package
        quantity
        description
        partNumber
      }
      netlist
      notes
    }
  }
`;

const GENERATE_BOM = gql`
  mutation GenerateBom($design: JSON!, $budget: Float) {
    generateBom(design: $design, budget: $budget) {
      projectName
      entries {
        partName
        partNumber
        description
        quantity
        unitPriceUsd
        supplier
      }
      totalEstimatedCost
      notes
    }
  }
`;

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  data?: any;
  type?: 'design' | 'circuit' | 'bom';
}

export function AiDesign() {
  const { projectId } = useParams({ from: '/ai/$projectId' });
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [generateDesign] = useMutation(GENERATE_DESIGN);
  const [generateCircuit] = useMutation(GENERATE_CIRCUIT);
  const [generateBom] = useMutation(GENERATE_BOM);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const idRef = useRef(0);
  const addMessage = (role: 'user' | 'assistant', content: string, data?: any, type?: string) => {
    idRef.current += 1;
    const id = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${idRef.current}`;
    setMessages(prev => [...prev, {
      id,
      role,
      content,
      data,
      type: type as any,
    }]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    addMessage('user', userMessage);
    setLoading(true);

    try {
      // Detect intent - default to design since this is a design tool
      const lower = userMessage.toLowerCase();
      
      if (lower.includes('circuit') || lower.includes('schematic') || lower.includes('netlist')) {
        addMessage('assistant', '⚡ Generating circuit design...');
        
        const { data } = await generateCircuit({
          variables: {
            subsystem: userMessage,
            requirements: { description: userMessage },
          },
        });
        
        const circuit = data.generateCircuit;
        addMessage('assistant', `**Circuit: ${circuit.subsystem}**\n\n${circuit.notes || 'Circuit generated.'}`, circuit, 'circuit');
      } else if (lower.includes('bom') || lower.includes('parts list') || lower.includes('bill of materials') || lower.includes('components')) {
        addMessage('assistant', '📋 Generating Bill of Materials...');
        
        const { data } = await generateBom({
          variables: {
            design: { description: userMessage },
            budget: 100,
          },
        });
        
        const bom = data.generateBom;
        addMessage('assistant', `**BOM: ${bom.projectName}**\n\nEstimated cost: $${bom.totalEstimatedCost.toFixed(2)}\n\n${bom.notes || 'BOM generated.'}`, bom, 'bom');
      } else {
        // Default: treat as design request
        addMessage('assistant', '🔧 Analyzing your request and generating a design...');
        
        const { data } = await generateDesign({
          variables: { description: userMessage, projectId },
        });
        
        const design = data.generateDesign;
        addMessage('assistant', `**${design.projectName}**\n\n${design.notes || 'Design generated successfully.'}`, design, 'design');
      }
    } catch (error: any) {
      addMessage('assistant', `Error: ${error.message || 'Something went wrong'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate({ to: '/project/$projectId', params: { projectId } })}
            className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white"
          >
            <ChevronRight className="w-5 h-5 rotate-180" />
          </button>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-cyber-400" />
            <h1 className="text-lg font-semibold">AI Design Assistant</h1>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-cyber-600/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Cpu className="w-8 h-8 text-cyber-400" />
            </div>
            <h2 className="text-xl font-semibold mb-2">What do you want to build?</h2>
            <p className="text-gray-400 max-w-md mx-auto">
              Describe your hardware project and I'll help you design it, generate circuits, and create a parts list.
            </p>
            <div className="flex flex-wrap gap-2 justify-center mt-6">
              {[
                'Weather station with sensors',
                'Robot with obstacle avoidance',
                'LED cube display',
                'Motor controller circuit',
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => setInput(suggestion)}
                  className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-full text-sm text-gray-300 transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-xl p-4 ${
                msg.role === 'user'
                  ? 'bg-cyber-600 text-white'
                  : 'bg-gray-800 text-gray-100'
              }`}
            >
              {msg.role === 'assistant' && msg.type === 'design' && msg.data && (
                <div className="mb-3 pb-3 border-b border-gray-700">
                  <h3 className="font-semibold text-cyber-400 mb-2">Design Result</h3>
                  <div className="space-y-2">
                    {msg.data.subsystems?.map((sub: any, i: number) => (
                      <div key={i} className="bg-gray-900/50 rounded-lg p-2 text-sm">
                        <span className="font-medium">{sub.name}</span>
                        <span className="text-gray-400 ml-2">({sub.type})</span>
                        {sub.keyComponents?.length > 0 && (
                          <div className="text-xs text-gray-500 mt-1">
                            Components: {sub.keyComponents.join(', ')}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {msg.role === 'assistant' && msg.type === 'circuit' && msg.data && (
                <div className="mb-3 pb-3 border-b border-gray-700">
                  <h3 className="font-semibold text-cyber-400 mb-2">Circuit Components</h3>
                  <div className="space-y-1">
                    {msg.data.components?.map((comp: any, i: number) => (
                      <div key={i} className="bg-gray-900/50 rounded-lg p-2 text-sm flex justify-between">
                        <span>{comp.name}</span>
                        <span className="text-gray-400">{comp.value || comp.type}</span>
                        {comp.partNumber && <span className="text-cyber-400 text-xs">{comp.partNumber}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {msg.role === 'assistant' && msg.type === 'bom' && msg.data && (
                <div className="mb-3 pb-3 border-b border-gray-700">
                  <h3 className="font-semibold text-cyber-400 mb-2">
                    Bill of Materials - ${msg.data.totalEstimatedCost?.toFixed(2)}
                  </h3>
                  <div className="space-y-1">
                    {msg.data.entries?.map((entry: any, i: number) => (
                      <div key={i} className="bg-gray-900/50 rounded-lg p-2 text-sm flex justify-between">
                        <span>{entry.partName}</span>
                        <span className="text-gray-400">x{entry.quantity} @ ${entry.unitPriceUsd?.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="whitespace-pre-wrap text-sm">{msg.content}</div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-800 rounded-xl p-4">
              <div className="flex items-center gap-2 text-gray-400">
                <Zap className="w-4 h-4 animate-pulse" />
                <span className="text-sm">Generating...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-800">
        <form onSubmit={handleSubmit} className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Describe your hardware project..."
            className="input flex-1"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="btn-primary flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
