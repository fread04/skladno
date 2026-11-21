(function(root){
'use strict';
const normalize=s=>String(s).toLowerCase().replace(/ё/g,'е');
const tokens=s=>normalize(s).match(/[а-яa-z]{3,}/g)||[];
function matches(a,b){return tokens(a).some(x=>tokens(b).some(y=>x.slice(0,Math.min(5,x.length))===y.slice(0,Math.min(5,y.length))));}
function parse(text){
 const lines=text.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);if(!lines.length)throw Error('Вставьте текст рецепта.');
 let name=lines[0].replace(/^#+\s*/,''), ingredients=[], actions=[],mode='ingredients';
 const ih=/^(ингредиенты|продукты|состав|ingredients)(?=\s|:|$)/i, sh=/^(приготовление|инструкция|способ приготовления|шаги|instructions|method|directions)(?=\s|:|$)/i;
 const verb=/^(наре[жз]|сме[шс]|взбей|взбить|разогре|добав|обжар|жар|выпек|запек|варить|отвар|растоп|влей|влить|соедин|переме|вылож|полож|пода|посол|очист|натри|whisk|mix|add|bake|heat|cook|stir|melt|combine|serve)/i;
 for(const line of lines.slice(1)){
  if(ih.test(line)){mode='ingredients';const tail=line.replace(/^[^:]+:\s*/,'');if(tail!==line&&tail)ingredients.push(tail);continue;}
  if(sh.test(line)){mode='steps';const tail=line.replace(/^[^:]+:\s*/,'');if(tail!==line&&tail)actions.push(tail);continue;}
  const clean=line.replace(/^(?:[-*•]\s*|\d+[.)]\s*)/,'');
  if(/^\d+[.)]\s/.test(line)&&verb.test(clean))mode='steps';
  if(verb.test(clean))mode='steps';
  if(mode==='ingredients')ingredients.push(clean);else actions.push(clean);
 }
 if(!ingredients.length||!actions.length)throw Error('Не удалось отделить ингредиенты от шагов. Добавьте заголовки «Ингредиенты» и «Приготовление» либо заполните поля ниже.');
 if(ingredients.length>100||actions.length>80)throw Error('Для одного рецепта поддерживается до 100 ингредиентов и 80 этапов.');
 const used=new Set();const steps=actions.map((text,i)=>{
  const inputs=[];ingredients.forEach((ing,j)=>{if(!used.has(j)&&matches(ing.replace(/[—–].*$/,''),text)){inputs.push('i'+j);used.add(j);}});
  if(i&&!/отдельн|другой миск|другой сковород|another bowl|separately/i.test(text))inputs.unshift('s'+(i-1));
  return {id:'s'+i,text,inputs};
 });
 return {name,ingredients,steps};
}
function analyze(recipe){
 const ingredients=recipe.ingredients;const steps=recipe.steps;const errors=[];
 if(!Array.isArray(ingredients)||!ingredients.length)throw Error('Добавьте ингредиенты.');
 if(!Array.isArray(steps)||!steps.length)throw Error('Добавьте хотя бы один этап.');
 const nodes=new Map(ingredients.map((text,i)=>['i'+i,{id:'i'+i,text,children:[],depth:0,rank:Infinity,sourceIndex:i}]));
 const consumed=new Set();
 steps.forEach((step,index)=>{
  if(!step||!/^s[\w-]+$/.test(step.id)||nodes.has(step.id))throw Error('Неверный или повторяющийся идентификатор этапа.');
  if(!step.text.trim())errors.push('Этап '+(index+1)+': заполните действие.');
  const children=[];for(const id of (step.inputs||[])){
   if(!nodes.has(id)){errors.push('Этап '+(index+1)+': выбран несуществующий или более поздний этап.');continue;}
   if(consumed.has(id)){errors.push('Этап '+(index+1)+': «'+nodes.get(id).text.slice(0,45)+'» уже входит в другой этап. Выберите результат того этапа.');continue;}
   consumed.add(id);const child=nodes.get(id);if(child.id.startsWith('i'))child.rank=index;
   if(child.id.startsWith('i')||child.children.length)children.push(child);
  }
  children.sort((a,b)=>a.rank-b.rank||(a.sourceIndex??0)-(b.sourceIndex??0));
  nodes.set(step.id,{id:step.id,text:step.text,children,depth:1+Math.max(0,...children.map(c=>c.depth)),rank:Math.min(...children.map(c=>c.rank)),index:index+1});
 });
 const roots=[...nodes.values()].filter(n=>!consumed.has(n.id));
 const unused=roots.filter(n=>n.id.startsWith('i'));
 const emptySteps=[...nodes.values()].filter(n=>n.id.startsWith('s')&&!n.children.length);
 const activeRoots=roots.filter(n=>n.children.length||n.id.startsWith('i')).sort((a,b)=>a.rank-b.rank||(a.sourceIndex??0)-(b.sourceIndex??0));
 const final={id:'final',text:'Готово · '+recipe.name,children:activeRoots,depth:1+Math.max(...activeRoots.map(c=>c.depth))};
 const leaves=[];function visit(n){n.start=leaves.length;if(!n.children.length){leaves.push(n);}else n.children.forEach(visit);n.span=leaves.length-n.start;}visit(final);
 const cells=[];function layout(n,parent){
  const width=parent?parent.depth-n.depth:1;
  cells.push({row:n.start,col:n.depth,rowspan:n.span,colspan:n.id.startsWith('i')?1:width,id:n.id,text:n.text,index:n.index});
  if(n.id.startsWith('i')&&width>1)cells.push({row:n.start,col:1,rowspan:1,colspan:width-1,id:'carry-'+n.id,text:''});
  n.children.forEach(c=>layout(c,n));
 }layout(final,null);
 return {errors,unused:unused.map(n=>n.text),emptySteps:emptySteps.map(n=>({text:n.text,index:n.index})),looseOutputs:activeRoots.filter(n=>n.id.startsWith('s')).map(n=>n.text),leaves,cells,columns:final.depth+1};
}
function validRecipe(r){return r&&typeof r.name==='string'&&r.name.trim()&&r.name.length<=160&&Array.isArray(r.ingredients)&&r.ingredients.length>0&&r.ingredients.length<=100&&r.ingredients.every(s=>typeof s==='string'&&s.length<=2000)&&Array.isArray(r.steps)&&r.steps.length>0&&r.steps.length<=80&&r.steps.every(s=>s&&typeof s.id==='string'&&typeof s.text==='string'&&s.text.length<=10000&&Array.isArray(s.inputs)&&s.inputs.every(v=>typeof v==='string'))&&(!r.category||typeof r.category==='string')&&(!r.notes||typeof r.notes==='string');}
const api={normalize,parse,analyze,validRecipe};if(typeof module!=='undefined')module.exports=api;else root.RecipeCore=api;
})(typeof globalThis==='undefined'?this:globalThis);
