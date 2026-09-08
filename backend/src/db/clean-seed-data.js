import 'dotenv/config';
import { query } from './client.js';

async function cleanSeedData() {
  console.log('🧹 Cleaning seeded sample records from PostgreSQL...');

  try {
    // 1. Clean seeded appointments
    const aptRes = await query(
      `DELETE FROM appointments 
       WHERE customer IN ('Arjun Rao', 'Priya Sharma', 'Daniel Okafor', 'Ananya Reddy', 'Rahul Verma', 'Sofia Marchetti')
       RETURNING id, customer`
    );
    console.log(`✅ Removed ${aptRes.rowCount} seeded appointment(s).`);

    // 2. Clean seeded products
    const prodRes = await query(
      `DELETE FROM products 
       WHERE sku IN ('SR-SWT-001', 'SR-THL-001', 'SR-STR-014', 'SR-MNS-022', 'SR-BEV-003', 'SR-DST-007', 'SR-BDL-100')
       RETURNING id, name`
    );
    console.log(`✅ Removed ${prodRes.rowCount} seeded product(s).`);

    // 3. Clean seeded API keys
    const keyRes = await query(
      `DELETE FROM api_keys 
       WHERE name IN ('Production server', 'Analytics reader', 'Local development')
       RETURNING id, name`
    );
    console.log(`✅ Removed ${keyRes.rowCount} seeded API key(s).`);

    // 4. Clean seeded developer data (tasks, activity, projects)
    const seedProjIds = ['prj_ecom', 'prj_data', 'prj_crm', 'prj_ai'];
    const taskRes = await query(
      `DELETE FROM ai_tasks 
       WHERE project_id = ANY($1)
       RETURNING id`,
      [seedProjIds]
    );
    console.log(`✅ Removed ${taskRes.rowCount} seeded AI task(s).`);

    const actRes = await query(
      `DELETE FROM dev_activity 
       WHERE project_id = ANY($1)
       RETURNING id`,
      [seedProjIds]
    );
    console.log(`✅ Removed ${actRes.rowCount} seeded dev activity record(s).`);

    const projRes = await query(
      `DELETE FROM developer_projects 
       WHERE id = ANY($1)
       RETURNING id, name`,
      [seedProjIds]
    );
    console.log(`✅ Removed ${projRes.rowCount} seeded developer project(s).`);

    // 5. Clean seeded demo agent
    const agentRes = await query(
      `DELETE FROM agents 
       WHERE name = 'Acme Support Bot'
       RETURNING id, name`
    );
    console.log(`✅ Removed ${agentRes.rowCount} seeded demo agent(s).`);

    // 6. Clean seeded notifications
    const notifRes = await query(
      `DELETE FROM notifications 
       WHERE title IN ('Agent activated', 'Low credits warning', 'New call completed')
       RETURNING id, title`
    );
    console.log(`✅ Removed ${notifRes.rowCount} seeded notification(s).`);

    console.log('\n✨ Database seed data cleanup complete! Real and user-created data preserved.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Failed to clean seed data:', err.message);
    process.exit(1);
  }
}

cleanSeedData();
