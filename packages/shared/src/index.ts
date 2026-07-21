export interface User {
  id: string;
  email: string;
  name: string;
  role: 'builder' | 'mentor' | 'admin';
  avatarUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Supplier {
  id: string;
  name: string;
  website?: string;
  country?: string;
  contactInfo?: Record<string, any>;
}

export interface Part {
  id: string;
  externalId?: string;
  supplier?: Supplier;
  partNumber: string;
  name: string;
  description?: string;
  category?: string;
  specData?: Record<string, any>;
  imageUrl?: string;
  createdAt: Date;
}

export interface Project {
  id: string;
  ownerId: string;
  owner?: User;
  title: string;
  description?: string;
  status: 'draft' | 'in_progress' | 'review' | 'completed' | 'archived';
  version: number;
  tags: string[];
  bomEntries?: BomEntry[];
  designFiles?: DesignFile[];
  collaborators?: ProjectUser[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectUser {
  user: User;
  permissionLevel: 'viewer' | 'editor' | 'admin';
  joinedAt: Date;
}

export interface BomEntry {
  id: string;
  projectId: string;
  partId: string;
  part?: Part;
  quantity: number;
  referenceDesignator?: string;
  notes?: string;
  createdAt: Date;
}

export interface DesignFile {
  id: string;
  projectId: string;
  type: 'schematic' | 'pcb_layout' | 'cad_model' | 'gerber' | 'bom_csv' | 'documentation' | 'other';
  name: string;
  fileUrl: string;
  fileSize?: number;
  mimeType?: string;
  version: number;
  createdAt: Date;
}

export interface AuthPayload {
  token: string;
  user: User;
}
