import { GraphQLDateTime, GraphQLJSON } from 'graphql-scalars';
import bcrypt from 'bcryptjs';
import { getDb, closeDb } from '../db/pool.js';
import { generateToken, type GraphQLContext } from './context.js';
import { randomUUID } from 'crypto';
import { generateDesign, generateCircuit, generateBom } from '../services/ai-bridge.js';

function genId(): string {
  return randomUUID();
}

export const resolvers = {
  DateTime: GraphQLDateTime,
  JSON: GraphQLJSON,

  Query: {
    me: async (_: any, __: any, ctx: GraphQLContext) => {
      if (!ctx.userId) return null;
      return ctx.user;
    },

    projects: async (_: any, args: { status?: string; limit?: number; offset?: number }, ctx: GraphQLContext) => {
      if (!ctx.userId) throw new Error('Not authenticated');
      
      const db = getDb();
      let sql = `
        SELECT p.* FROM projects p
        WHERE p.owner_id = ? OR p.id IN (
          SELECT project_id FROM project_users WHERE user_id = ?
        )
      `;
      const params: any[] = [ctx.userId, ctx.userId];
      
      if (args.status) {
        sql += ` AND p.status = ?`;
        params.push(args.status);
      }
      
      sql += ` ORDER BY p.updated_at DESC`;
      
      if (args.limit) {
        sql += ` LIMIT ?`;
        params.push(args.limit);
      }
      if (args.offset) {
        sql += ` OFFSET ?`;
        params.push(args.offset);
      }

      const rows = db.prepare(sql).all(...params);
      return rows.map(mapProject);
    },

    project: async (_: any, { id }: { id: string }, ctx: GraphQLContext) => {
      if (!ctx.userId) throw new Error('Not authenticated');
      
      const db = getDb();
      const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
      if (!row) return null;
      return mapProject(row);
    },

    parts: async (_: any, args: { category?: string; limit?: number; offset?: number }) => {
      const db = getDb();
      let sql = 'SELECT p.*, s.name as supplier_name, s.website as supplier_website, s.country as supplier_country FROM parts p LEFT JOIN suppliers s ON p.supplier_id = s.id';
      const params: any[] = [];
      
      if (args.category) {
        sql += ` WHERE p.category = ?`;
        params.push(args.category);
      }
      
      sql += ` ORDER BY p.name`;
      
      if (args.limit) {
        sql += ` LIMIT ?`;
        params.push(args.limit);
      }
      if (args.offset) {
        sql += ` OFFSET ?`;
        params.push(args.offset);
      }

      const rows = db.prepare(sql).all(...params);
      return rows.map(mapPart);
    },

    part: async (_: any, { id }: { id: string }) => {
      const db = getDb();
      const row = db.prepare(
        `SELECT p.*, s.name as supplier_name, s.website as supplier_website, s.country as supplier_country
         FROM parts p LEFT JOIN suppliers s ON p.supplier_id = s.id
         WHERE p.id = ?`
      ).get(id);
      if (!row) return null;
      return mapPart(row);
    },

    searchParts: async (_: any, { input }: { input: { query: string; category?: string; limit?: number; offset?: number } }) => {
      const db = getDb();
      const { query: searchQuery, category, limit = 20, offset = 0 } = input;
      
      let whereClause = `(p.name LIKE ? OR p.part_number LIKE ? OR p.description LIKE ?)`;
      const params: any[] = [`%${searchQuery}%`, `%${searchQuery}%`, `%${searchQuery}%`];
      
      if (category) {
        whereClause += ` AND p.category = ?`;
        params.push(category);
      }
      
      const countRow = db.prepare(`SELECT COUNT(*) as cnt FROM parts p WHERE ${whereClause}`).get(...params) as any;
      
      let sql = `
        SELECT p.*, s.name as supplier_name, s.website as supplier_website, s.country as supplier_country
        FROM parts p
        LEFT JOIN suppliers s ON p.supplier_id = s.id
        WHERE ${whereClause}
        ORDER BY p.name
        LIMIT ? OFFSET ?
      `;
      
      const rows = db.prepare(sql).all(...params, limit, offset);
      
      return {
        parts: rows.map(mapPart),
        totalCount: countRow.cnt,
      };
    },

    suppliers: async () => {
      const db = getDb();
      const rows = db.prepare('SELECT * FROM suppliers ORDER BY name').all();
      return rows.map(mapSupplier);
    },

    supplier: async (_: any, { id }: { id: string }) => {
      const db = getDb();
      const row = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(id);
      if (!row) return null;
      return mapSupplier(row);
    },

    bomEntries: async (_: any, { projectId }: { projectId: string }, ctx: GraphQLContext) => {
      if (!ctx.userId) throw new Error('Not authenticated');
      
      const db = getDb();
      const rows = db.prepare(
        `SELECT be.*, p.part_number, p.name as part_name, p.description as part_description, 
                p.category as part_category, p.spec_data as part_spec_data, p.image_url as part_image_url, 
                s.name as supplier_name
         FROM bom_entries be
         JOIN parts p ON be.part_id = p.id
         LEFT JOIN suppliers s ON p.supplier_id = s.id
         WHERE be.project_id = ?
         ORDER BY be.created_at`
      ).all(projectId);
      
      return rows.map(mapBomEntry);
    },

    aiCapabilities: async () => {
      return {
        capabilities: [
          { name: 'design_decomposition', description: 'Break down a project into subsystems' },
          { name: 'circuit_generation', description: 'Generate circuit designs' },
          { name: 'bom_generation', description: 'Generate a Bill of Materials' },
          { name: 'component_selection', description: 'Recommend components' },
          { name: 'design_review', description: 'Review designs for issues' },
        ],
        supportedDomains: ['electronics', 'embedded_systems', 'sensors', 'power_electronics', 'motor_control'],
      };
    },
  },

  Mutation: {
    register: async (_: any, { input }: { input: { email: string; name: string; password: string } }) => {
      const { email, name, password } = input;
      const db = getDb();
      
      const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
      if (existing) {
        throw new Error('Email already registered');
      }
      
      const passwordHash = await bcrypt.hash(password, 10);
      const id = genId();
      
      db.prepare('INSERT INTO users (id, email, name, password_hash) VALUES (?, ?, ?, ?)').run(id, email, name, passwordHash);
      
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
      const token = generateToken(id);
      
      return { token, user: mapUser(user) };
    },

    login: async (_: any, { input }: { input: { email: string; password: string } }) => {
      const { email, password } = input;
      const db = getDb();
      
      const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
      if (!user) throw new Error('Invalid credentials');
      
      const valid = await bcrypt.compare(password, (user as any).password_hash);
      if (!valid) throw new Error('Invalid credentials');
      
      const token = generateToken((user as any).id);
      return { token, user: mapUser(user) };
    },

    createProject: async (_: any, { input }: { input: { title: string; description?: string; tags?: string[] } }, ctx: GraphQLContext) => {
      if (!ctx.userId) throw new Error('Not authenticated');
      
      const { title, description, tags } = input;
      const db = getDb();
      const id = genId();
      
      db.prepare('INSERT INTO projects (id, owner_id, title, description, tags) VALUES (?, ?, ?, ?, ?)').run(
        id, ctx.userId, title, description || null, JSON.stringify(tags || [])
      );
      
      const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
      return mapProject(project);
    },

    updateProject: async (_: any, { id, input }: { id: string; input: any }, ctx: GraphQLContext) => {
      if (!ctx.userId) throw new Error('Not authenticated');
      
      const db = getDb();
      const updates: string[] = [];
      const params: any[] = [];
      
      if (input.title !== undefined) { updates.push('title = ?'); params.push(input.title); }
      if (input.description !== undefined) { updates.push('description = ?'); params.push(input.description); }
      if (input.status !== undefined) { updates.push('status = ?'); params.push(input.status); }
      if (input.tags !== undefined) { updates.push('tags = ?'); params.push(JSON.stringify(input.tags)); }
      
      if (updates.length === 0) throw new Error('No updates provided');
      
      updates.push("updated_at = datetime('now')");
      params.push(id);
      
      db.prepare(`UPDATE projects SET ${updates.join(', ')} WHERE id = ?`).run(...params);
      
      const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
      if (!project) throw new Error('Project not found');
      return mapProject(project);
    },

    deleteProject: async (_: any, { id }: { id: string }, ctx: GraphQLContext) => {
      if (!ctx.userId) throw new Error('Not authenticated');
      
      const db = getDb();
      const result = db.prepare('DELETE FROM projects WHERE id = ? AND owner_id = ?').run(id, ctx.userId);
      return result.changes > 0;
    },

    addCollaborator: async (_: any, { projectId, userId, permissionLevel }: any, ctx: GraphQLContext) => {
      if (!ctx.userId) throw new Error('Not authenticated');
      
      const db = getDb();
      db.prepare('INSERT OR REPLACE INTO project_users (project_id, user_id, permission_level) VALUES (?, ?, ?)').run(projectId, userId, permissionLevel);
      
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
      const pu = db.prepare('SELECT * FROM project_users WHERE project_id = ? AND user_id = ?').get(projectId, userId);
      
      return { user: mapUser(user), permissionLevel: (pu as any).permission_level, joinedAt: (pu as any).joined_at };
    },

    removeCollaborator: async (_: any, { projectId, userId }: any, ctx: GraphQLContext) => {
      if (!ctx.userId) throw new Error('Not authenticated');
      
      const db = getDb();
      const result = db.prepare('DELETE FROM project_users WHERE project_id = ? AND user_id = ?').run(projectId, userId);
      return result.changes > 0;
    },

    addBomEntry: async (_: any, { input }: { input: { projectId: string; partId: string; quantity: number; referenceDesignator?: string; notes?: string } }, ctx: GraphQLContext) => {
      if (!ctx.userId) throw new Error('Not authenticated');
      
      const { projectId, partId, quantity, referenceDesignator, notes } = input;
      const db = getDb();
      const id = genId();
      
      db.prepare('INSERT OR REPLACE INTO bom_entries (id, project_id, part_id, quantity, reference_designator, notes) VALUES (?, ?, ?, ?, ?, ?)').run(
        id, projectId, partId, quantity, referenceDesignator || null, notes || null
      );
      
      const entry = db.prepare(
        `SELECT be.*, p.part_number, p.name as part_name, p.description as part_description, p.category as part_category, p.spec_data as part_spec_data, p.image_url as part_image_url, s.name as supplier_name
         FROM bom_entries be
         JOIN parts p ON be.part_id = p.id
         LEFT JOIN suppliers s ON p.supplier_id = s.id
         WHERE be.id = ?`
      ).get(id);
      
      return mapBomEntry(entry);
    },

    updateBomEntry: async (_: any, { id, input }: { id: string; input: any }, ctx: GraphQLContext) => {
      if (!ctx.userId) throw new Error('Not authenticated');
      
      const db = getDb();
      const updates: string[] = [];
      const params: any[] = [];
      
      if (input.quantity !== undefined) { updates.push('quantity = ?'); params.push(input.quantity); }
      if (input.referenceDesignator !== undefined) { updates.push('reference_designator = ?'); params.push(input.referenceDesignator); }
      if (input.notes !== undefined) { updates.push('notes = ?'); params.push(input.notes); }
      
      if (updates.length === 0) throw new Error('No updates provided');
      
      updates.push("updated_at = datetime('now')");
      params.push(id);
      
      db.prepare(`UPDATE bom_entries SET ${updates.join(', ')} WHERE id = ?`).run(...params);
      
      const entry = db.prepare(
        `SELECT be.*, p.part_number, p.name as part_name, p.description as part_description, p.category as part_category, p.spec_data as part_spec_data, p.image_url as part_image_url, s.name as supplier_name
         FROM bom_entries be
         JOIN parts p ON be.part_id = p.id
         LEFT JOIN suppliers s ON p.supplier_id = s.id
         WHERE be.id = ?`
      ).get(id);
      
      if (!entry) throw new Error('BOM entry not found');
      return mapBomEntry(entry);
    },

    removeBomEntry: async (_: any, { id }: { id: string }, ctx: GraphQLContext) => {
      if (!ctx.userId) throw new Error('Not authenticated');
      
      const db = getDb();
      const result = db.prepare('DELETE FROM bom_entries WHERE id = ?').run(id);
      return result.changes > 0;
    },

    createPart: async (_: any, { data }: { data: any }) => {
      const db = getDb();
      const id = genId();
      
      db.prepare('INSERT INTO parts (id, external_id, supplier_id, part_number, name, description, category, spec_data, image_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
        id, data.externalId || null, data.supplierId || null, data.partNumber, data.name, data.description || null, data.category || null, JSON.stringify(data.specData || {}), data.imageUrl || null
      );
      
      const part = db.prepare('SELECT * FROM parts WHERE id = ?').get(id);
      return mapPart(part);
    },

    updatePart: async (_: any, { id, data }: { id: string; data: any }) => {
      const db = getDb();
      
      db.prepare(`UPDATE parts SET 
        external_id = COALESCE(?, external_id),
        supplier_id = COALESCE(?, supplier_id),
        part_number = ?,
        name = ?,
        description = COALESCE(?, description),
        category = COALESCE(?, category),
        spec_data = COALESCE(?, spec_data),
        image_url = COALESCE(?, image_url)
        WHERE id = ?`).run(
        data.externalId || null, data.supplierId || null, data.partNumber, data.name, data.description || null, data.category || null, data.specData ? JSON.stringify(data.specData) : null, data.imageUrl || null, id
      );
      
      const part = db.prepare('SELECT * FROM parts WHERE id = ?').get(id);
      if (!part) throw new Error('Part not found');
      return mapPart(part);
    },

    generateDesign: async (_: any, { description, projectId }: { description: string; projectId?: string }) => {
      const result = await generateDesign({ description, projectId });
      return {
        projectName: result.projectName,
        subsystems: result.subsystems.map((s: any) => ({
          name: s.name,
          description: s.description,
          type: s.type,
          keyComponents: s.keyComponents || s.key_components || [],
          interfaces: s.interfaces || [],
        })),
        requirements: result.requirements,
        notes: result.notes,
      };
    },

    generateCircuit: async (_: any, { subsystem, requirements }: { subsystem: string; requirements: any }) => {
      const result = await generateCircuit(subsystem, requirements);
      return {
        subsystem: result.subsystem,
        components: result.components.map((c: any) => ({
          name: c.name,
          type: c.type,
          value: c.value,
          package: c.package,
          quantity: c.quantity,
          description: c.description,
          partNumber: c.part_number || c.partNumber,
        })),
        connections: result.connections,
        netlist: result.netlist,
        notes: result.notes,
      };
    },

    generateBom: async (_: any, { design, budget }: { design: any; budget?: number }) => {
      const result = await generateBom(design, budget);
      return {
        projectName: result.projectName,
        entries: result.entries.map((e: any) => ({
          partName: e.part_name || e.partName,
          partNumber: e.part_number || e.partNumber,
          description: e.description,
          quantity: e.quantity,
          unitPriceUsd: e.unit_price_usd || e.unitPriceUsd || 0,
          supplier: e.supplier,
          category: e.category,
          alternatives: e.alternatives || [],
        })),
        totalEstimatedCost: result.totalEstimatedCost,
        notes: result.notes,
      };
    },
  },

  Project: {
    owner: async (project: any) => {
      const db = getDb();
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(project.ownerId);
      return mapUser(user);
    },
    bomEntries: async (project: any) => {
      const db = getDb();
      const rows = db.prepare(
        `SELECT be.*, p.part_number, p.name as part_name, p.description as part_description, p.category as part_category, p.spec_data as part_spec_data, p.image_url as part_image_url, s.name as supplier_name
         FROM bom_entries be
         JOIN parts p ON be.part_id = p.id
         LEFT JOIN suppliers s ON p.supplier_id = s.id
         WHERE be.project_id = ?`
      ).all(project.id);
      return rows.map(mapBomEntry);
    },
    designFiles: async (project: any) => {
      const db = getDb();
      const rows = db.prepare('SELECT * FROM design_files WHERE project_id = ? ORDER BY created_at DESC').all(project.id);
      return rows.map(mapDesignFile);
    },
    collaborators: async (project: any) => {
      const db = getDb();
      const rows = db.prepare(
        `SELECT pu.*, u.email, u.name, u.role, u.avatar_url, u.created_at as user_created_at
         FROM project_users pu
         JOIN users u ON pu.user_id = u.id
         WHERE pu.project_id = ?`
      ).all(project.id);
      
      return rows.map((row: any) => ({
        user: {
          id: row.user_id,
          email: row.email,
          name: row.name,
          role: row.role,
          avatarUrl: row.avatar_url,
          createdAt: row.user_created_at,
          updatedAt: row.user_created_at,
        },
        permissionLevel: row.permission_level,
        joinedAt: row.joined_at,
      }));
    },
  },
};

// Mapping helpers
function mapUser(row: any) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    avatarUrl: row.avatar_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapProject(row: any) {
  if (!row) return null;
  return {
    id: row.id,
    ownerId: row.owner_id,
    title: row.title,
    description: row.description,
    status: row.status,
    version: row.version,
    tags: typeof row.tags === 'string' ? JSON.parse(row.tags) : (row.tags || []),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapPart(row: any) {
  if (!row) return null;
  return {
    id: row.id,
    externalId: row.external_id,
    supplier: row.supplier_name ? {
      id: row.supplier_id,
      name: row.supplier_name,
      website: row.supplier_website,
      country: row.supplier_country,
    } : null,
    partNumber: row.part_number,
    name: row.name,
    description: row.description,
    category: row.category,
    specData: typeof row.spec_data === 'string' ? JSON.parse(row.spec_data) : (row.spec_data || {}),
    imageUrl: row.image_url,
    createdAt: row.created_at,
  };
}

function mapBomEntry(row: any) {
  if (!row) return null;
  return {
    id: row.id,
    projectId: row.project_id,
    partId: row.part_id,
    part: {
      id: row.part_id,
      partNumber: row.part_number,
      name: row.part_name,
      description: row.part_description,
      category: row.part_category,
      specData: typeof row.part_spec_data === 'string' ? JSON.parse(row.part_spec_data) : (row.part_spec_data || {}),
      imageUrl: row.part_image_url,
      supplier: row.supplier_name ? { name: row.supplier_name } : null,
    },
    quantity: row.quantity,
    referenceDesignator: row.reference_designator,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

function mapDesignFile(row: any) {
  if (!row) return null;
  return {
    id: row.id,
    projectId: row.project_id,
    type: row.type,
    name: row.name,
    fileUrl: row.file_url,
    fileSize: row.file_size,
    mimeType: row.mime_type,
    version: row.version,
    createdAt: row.created_at,
  };
}

function mapSupplier(row: any) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    website: row.website,
    country: row.country,
    contactInfo: typeof row.contact_info === 'string' ? JSON.parse(row.contact_info) : (row.contact_info || {}),
  };
}
