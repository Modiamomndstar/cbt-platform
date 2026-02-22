const fs = require('fs');
const files = [
  '/usr/src/app/dist/src/routes/schedules.js',
  '/usr/src/app/dist/src/routes/results.js',
  '/usr/src/app/dist/src/routes/analytics.js'
];
files.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(/schedule_id/g, 'exam_schedule_id');
    fs.writeFileSync(file, content);
    console.log('Updated ' + file);
  } else {
    console.log('Could not find ' + file);
  }
});
