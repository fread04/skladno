const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const collection=require('../collection.js'),core=require('../core.js');
const data=JSON.parse(fs.readFileSync(path.join(__dirname,'../recipes.json'),'utf8'));
assert.equal(collection.validate(data),data);
for(const r of data.recipes){
 const a=core.analyze(r),grid=Array.from({length:a.leaves.length},()=>Array(a.columns).fill(0));
 for(const c of a.cells)for(let y=c.row;y<c.row+c.rowspan;y++)for(let x=c.col;x<c.col+c.colspan;x++)grid[y][x]++;
 assert(grid.flat().every(v=>v===1),r.name+': gap or overlap');
}
assert.throws(()=>collection.validate({...data,recipes:[data.recipes[0],data.recipes[0]]}));
const invalid=structuredClone(data);invalid.recipes[0].steps[0].inputs.push('s9999');assert.throws(()=>collection.validate(invalid));
const badServing=structuredClone(data);badServing.recipes[0].servings=-1;assert.throws(()=>collection.validate(badServing));
(async()=>{
 let requested;
 const result=await collection.load(async(url,options)=>{requested={url,options};return {ok:true,json:async()=>structuredClone(data)};});
 assert.equal(requested.url,'./recipes.json');assert.equal(requested.options.cache,'no-store');assert.equal(result.recipes.length,data.recipes.length);
 await assert.rejects(()=>collection.load(async()=>({ok:false})));
 console.log('Passed: all '+data.recipes.length+' published recipes, grid coverage, duplicate IDs, invalid graph rejection, unknown servings, relative loading and error handling.');
})().catch(e=>{console.error(e);process.exitCode=1;});
