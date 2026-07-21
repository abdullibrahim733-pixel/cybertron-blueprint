import { getDb, closeDb } from './pool.js';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

function genId(): string {
  return randomUUID();
}

function seed() {
  const db = getDb();
  
  console.log('Seeding database...');

  // Create demo user
  const passwordHash = bcrypt.hashSync('demo123', 10);
  const userId = genId();
  
  const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get('demo@cybertron.dev');
  
  if (!existingUser) {
    db.prepare('INSERT INTO users (id, email, name, password_hash, role) VALUES (?, ?, ?, ?, ?)').run(
      userId, 'demo@cybertron.dev', 'Demo User', passwordHash, 'admin'
    );
    
    // Create sample project
    const projectId = genId();
    db.prepare('INSERT INTO projects (id, owner_id, title, description, status, tags) VALUES (?, ?, ?, ?, ?, ?)').run(
      projectId, userId, 'Smart Robot Controller', 'Autonomous robot with obstacle avoidance using Arduino and ultrasonic sensors', 'in_progress', JSON.stringify(['robotics', 'arduino', 'sensors'])
    );
    
    console.log('Created demo user and sample project');
  } else {
    console.log('Demo user already exists');
  }

  // Create sample suppliers
  const supplierData = [
    ['Digi-Key', 'https://digikey.com', 'US'],
    ['Mouser', 'https://mouser.com', 'US'],
    ['LCSC', 'https://lcsc.com', 'CN'],
    ['Farnell', 'https://farnell.com', 'UK'],
  ];

  const existingSuppliers = db.prepare('SELECT COUNT(*) as cnt FROM suppliers').get() as any;
  
  if (existingSuppliers.cnt === 0) {
    for (const [name, website, country] of supplierData) {
      db.prepare('INSERT INTO suppliers (id, name, website, country) VALUES (?, ?, ?, ?)').run(genId(), name, website, country);
    }
    console.log('Created sample suppliers');
  }

  console.log('Seeding complete!');
  closeDb();
}

seed();
