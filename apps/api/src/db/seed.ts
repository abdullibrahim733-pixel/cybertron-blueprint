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

  // Create sample parts
  const existingParts = db.prepare('SELECT COUNT(*) as cnt FROM parts').get() as any;

  if (existingParts.cnt === 0) {
    const digikey = db.prepare('SELECT id FROM suppliers WHERE name = ?').get('Digi-Key');
    const mouser = db.prepare('SELECT id FROM suppliers WHERE name = ?').get('Mouser');
    const lcsc = db.prepare('SELECT id FROM suppliers WHERE name = ?').get('LCSC');

    const parts = [
      {
        supplierId: digikey?.id,
        partNumber: 'ATMEGA328P-PU',
        name: 'ATmega328P Microcontroller',
        description: '8-bit AVR microcontroller, 32KB flash, 2KB SRAM, 28-pin DIP. Used in Arduino Uno.',
        category: 'Microcontroller',
        specData: { core: 'AVR 8-bit', clock: '20MHz', flash: '32KB', sram: '2KB', eeprom: '1KB', voltage: '1.8-5.5V' },
      },
      {
        supplierId: mouser?.id,
        partNumber: 'ESP32-WROOM-32',
        name: 'ESP32 WROOM-32 Module',
        description: 'Dual-core 240MHz WiFi + Bluetooth module with 4MB flash, 520KB SRAM.',
        category: 'Microcontroller',
        specData: { cores: 2, clock: '240MHz', wifi: '802.11 b/g/n', bluetooth: 'v4.2', flash: '4MB', voltage: '2.3-3.6V' },
      },
      {
        supplierId: digikey?.id,
        partNumber: 'HC-SR04',
        name: 'HC-SR04 Ultrasonic Sensor',
        description: 'Ultrasonic distance sensor, 2cm to 400cm range, 5V operation.',
        category: 'Sensor',
        specData: { range: '2-400cm', voltage: '5V', frequency: '40kHz', angle: '15 deg' },
      },
      {
        supplierId: lcsc?.id,
        partNumber: 'DS18B20',
        name: 'DS18B20 Temperature Sensor',
        description: 'Digital temperature sensor, 1-Wire interface, -55°C to +125°C, ±0.5°C accuracy.',
        category: 'Sensor',
        specData: { interface: '1-Wire', tempRange: '-55 to +125C', accuracy: '±0.5C', voltage: '3-5.5V' },
      },
      {
        supplierId: digikey?.id,
        partNumber: 'L298N',
        name: 'L298N Dual H-Bridge Motor Driver',
        description: 'Dual full-bridge motor driver, 2A per channel, 46V max.',
        category: 'Motor',
        specData: { channels: 2, currentPerChannel: '2A', maxVoltage: '46V', logicVoltage: '5V' },
      },
      {
        supplierId: mouser?.id,
        partNumber: 'NEMA17',
        name: 'NEMA 17 Stepper Motor',
        description: 'NEMA 17 bipolar stepper motor, 1.8° step angle, 42x42mm frame.',
        category: 'Motor',
        specData: { stepAngle: '1.8 deg', torque: '0.4 Nm', currentPerPhase: '1.7A', voltage: '12V' },
      },
      {
        supplierId: digikey?.id,
        partNumber: 'LM7805',
        name: 'LM7805 Voltage Regulator',
        description: '5V linear voltage regulator, 1.5A output, TO-220 package.',
        category: 'Power Supply',
        specData: { outputVoltage: '5V', maxCurrent: '1.5A', inputRange: '7-35V', package: 'TO-220' },
      },
      {
        supplierId: lcsc?.id,
        partNumber: 'AMS1117-3.3',
        name: 'AMS1117-3.3 LDO Regulator',
        description: '3.3V low dropout regulator, 1A output, SOT-223 package.',
        category: 'Power Supply',
        specData: { outputVoltage: '3.3V', maxCurrent: '1A', dropout: '1.1V', package: 'SOT-223' },
      },
      {
        supplierId: digikey?.id,
        partNumber: 'WS2812B',
        name: 'WS2812B RGB LED',
        description: 'Addressable RGB LED with built-in driver, 5050 package, individually addressable.',
        category: 'LED',
        specData: { color: 'RGB', voltage: '5V', package: '5050', interface: 'Single-wire' },
      },
      {
        supplierId: digikey?.id,
        partNumber: '1N4007',
        name: '1N4007 Diode',
        description: 'General purpose rectifier diode, 1A, 1000V, DO-41 package.',
        category: 'Other',
        specData: { maxCurrent: '1A', maxVoltage: '1000V', package: 'DO-41' },
      },
      {
        supplierId: mouser?.id,
        partNumber: '2N2222A',
        name: '2N2222A NPN Transistor',
        description: 'General purpose NPN bipolar transistor, 40V, 800mA, TO-92 package.',
        category: 'Transistor',
        specData: { type: 'NPN', maxVoltage: '40V', maxCurrent: '800mA', package: 'TO-92' },
      },
      {
        supplierId: digikey?.id,
        partNumber: 'USB-C-Connector',
        name: 'USB Type-C Connector',
        description: 'USB Type-C 16-pin connector, SMD, 5A rated.',
        category: 'Connector',
        specData: { type: 'USB-C', pins: 16, current: '5A', mounting: 'SMD' },
      },
    ];

    for (const part of parts) {
      db.prepare(
        'INSERT INTO parts (id, supplier_id, part_number, name, description, category, spec_data) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).run(genId(), part.supplierId || null, part.partNumber, part.name, part.description, part.category, JSON.stringify(part.specData));
    }
    console.log(`Created ${parts.length} sample parts`);
  }

  console.log('Seeding complete!');
  closeDb();
}

seed();
