const assert=require('node:assert/strict');
const {analyze,parse,validRecipe}=require('../core.js');
function grid(r){const a=analyze(r);assert.deepEqual(a.errors,[]);const covered=Array.from({length:a.leaves.length},()=>Array(a.columns).fill(0));for(const c of a.cells)for(let y=c.row;y<c.row+c.rowspan;y++)for(let x=c.col;x<c.col+c.colspan;x++)covered[y][x]++;assert(covered.flat().every(v=>v===1),'Every table slot must be covered exactly once');return a;}
const r={name:'Тест',ingredients:['Мука','Сахар','Яйцо','Молоко'],steps:[{id:'s0',text:'Смешать сухие',inputs:['i0','i1']},{id:'s1',text:'Взбить жидкие',inputs:['i2','i3']},{id:'s2',text:'Соединить',inputs:['s0','s1']},{id:'s3',text:'Выпечь',inputs:['s2']}]};
assert(validRecipe(r));assert.equal(grid(r).leaves.length,4);assert.equal(grid(r).unused.length,0);
const unequal=structuredClone(r);unequal.steps[1].inputs=['i2'];unequal.steps[2].inputs.push('i3');grid(unequal);
const duplicate=structuredClone(r);duplicate.steps[2].inputs.push('i0');assert(analyze(duplicate).errors.length>0);
const future=structuredClone(r);future.steps[0].inputs.push('s3');assert(analyze(future).errors.length>0);
const prep=structuredClone(r);prep.steps.unshift({id:'sprep',text:'Разогреть духовку',inputs:[]});prep.steps[1].inputs.push('sprep');assert.equal(grid(prep).emptySteps.length,1);
const unused=structuredClone(r);unused.ingredients.push('Соль');assert.deepEqual(grid(unused).unused,['Соль']);
const parsed=parse('Омлет\nИнгредиенты:\nЯйца — 2 шт.\nМолоко — 50 мл\nПриготовление:\n1. Взбейте яйца с молоком.\n2. Жарьте на сковороде.');assert.equal(parsed.ingredients.length,2);assert.equal(parsed.steps.length,2);assert.equal(grid(parsed).unused.length,0);
assert.throws(()=>parse('Что-то непонятное'));assert(!validRecipe({...r,ingredients:[null]}));
// Ingredients added late still occupy exactly one column; waiting is explicit.
const late={name:'Позднее добавление',ingredients:['Лук','Масло','Рис','Вода','Зелень'],steps:[{id:'s0',text:'Обжарить',inputs:['i0','i1']},{id:'s1',text:'Добавить рис',inputs:['s0','i2']},{id:'s2',text:'Тушить с водой',inputs:['s1','i3']},{id:'s3',text:'Посыпать зеленью',inputs:['s2','i4']}]};
const la=grid(late);assert(la.cells.filter(c=>c.id.startsWith('i')).every(c=>c.col===0&&c.colspan===1));assert(la.cells.some(c=>c.id==='carry-i4'&&c.colspan===3));
// Checkbox order must not move a late ingredient above the earlier mixture.
const shuffled=structuredClone(late);shuffled.steps[3].inputs.reverse();assert.deepEqual(grid(shuffled).leaves.map(c=>c.text),la.leaves.map(c=>c.text));
// Deterministic collection of varied trees, including very uneven branches.
let seed=65421;const random=n=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed%n;};
for(let test=0;test<250;test++){
 const count=2+random(28),ingredients=Array.from({length:count},(_,i)=>'Продукт '+i);let pool=ingredients.map((_,i)=>'i'+i),steps=[];
 while(pool.length>1){const take=2+random(Math.min(4,pool.length)-1),inputs=[];for(let i=0;i<take;i++)inputs.push(pool.splice(random(pool.length),1)[0]);const id='s'+steps.length;steps.push({id,text:'Действие '+steps.length,inputs});pool.push(id);}
 for(let k=0;k<random(5);k++){const id='s'+steps.length;steps.push({id,text:'Продолжение',inputs:[pool[0]]});pool=[id];}
 const result=grid({name:'Случай '+test,ingredients,steps});assert.equal(result.leaves.length,count);assert.equal(result.unused.length,0);
 assert(result.cells.every(c=>c.rowspan>0&&c.colspan>0&&Number.isFinite(c.col)));
 assert.equal(result.looseOutputs.length,1);
}
const disconnected={name:'Две заготовки',ingredients:['Мука','Яйцо'],steps:[{id:'s0',text:'Просеять',inputs:['i0']},{id:'s1',text:'Взбить',inputs:['i1']}]};assert.equal(grid(disconnected).looseOutputs.length,2);
console.log('Passed: 250 generated merge trees, complete grid coverage, unequal branches, late ingredients, stable ingredient order, disconnected mixtures, prep, invalid reuse, parsing and backup validation.');
