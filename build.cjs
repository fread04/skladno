const fs=require('node:fs'),path=require('node:path');
require('./collection.js').validate(JSON.parse(fs.readFileSync(path.join(__dirname,'recipes.json'),'utf8')));
const out=path.join(__dirname,'dist');fs.mkdirSync(out,{recursive:true});
for(const file of ['index.html','style.css','core.js','collection.js','app.js','recipes.json'])fs.copyFileSync(path.join(__dirname,file),path.join(out,file));
fs.writeFileSync(path.join(out,'.nojekyll'),'');
console.log('Built 7 public files in dist/.');
