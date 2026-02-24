import { db } from './src/config/database';
db.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'exams'").then(r => {
    console.log(r.rows);
    process.exit(0);
});
