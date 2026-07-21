export interface DesignRequest {
  description: string;
  projectId?: string;
}

export interface Subsystem {
  name: string;
  description: string;
  type: 'electronic' | 'mechanical' | 'software';
  keyComponents: string[];
  interfaces: string[];
}

export interface DesignResponse {
  projectName: string;
  subsystems: Subsystem[];
  requirements: {
    power?: string;
    size?: string;
    cost?: string;
    performance?: string;
  };
  notes: string;
}

export interface CircuitComponent {
  name: string;
  type: string;
  value?: string;
  package?: string;
  quantity: number;
  description: string;
  partNumber?: string;
}

export interface CircuitResponse {
  subsystem: string;
  components: CircuitComponent[];
  connections: Array<{ from: string; to: string; netName: string }>;
  netlist: string;
  notes: string;
}

export interface BomEntry {
  partName: string;
  partNumber: string;
  description: string;
  quantity: number;
  unitPriceUsd: number;
  supplier: string;
  category: string;
  alternatives: string[];
}

export interface BomResponse {
  projectName: string;
  entries: BomEntry[];
  totalEstimatedCost: number;
  notes: string;
}

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

async function aiFetch<T>(path: string, body: any): Promise<T> {
  const response = await fetch(`${AI_SERVICE_URL}/api${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`AI service error: ${error}`);
  }

  return response.json();
}

export async function generateDesign(request: DesignRequest): Promise<DesignResponse> {
  return aiFetch<DesignResponse>('/design/generate', request);
}

export async function generateCircuit(subsystem: string, requirements: Record<string, any>): Promise<CircuitResponse> {
  return aiFetch<CircuitResponse>('/design/circuit', { subsystem, requirements });
}

export async function generateBom(design: Record<string, any>, budget?: number): Promise<BomResponse> {
  return aiFetch<BomResponse>('/design/bom', { design, budget });
}
