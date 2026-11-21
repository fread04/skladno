(function(root){
'use strict';
const core=typeof module!=='undefined'?require('./core.js'):root.RecipeCore;
function validate(data){
 if(!data||data.format!=='skladno'||data.version!==1||!Array.isArray(data.recipes)||data.recipes.length>2000)throw Error('Неверный формат коллекции.');
 const ids=new Set();
 for(const r of data.recipes){
  if(!core.validRecipe(r)||typeof r.id!=='string'||!r.id||r.id.length>128||ids.has(r.id))throw Error('Неверный или повторяющийся рецепт.');
  ids.add(r.id);
  if(r.servings!=null&&(!Number.isFinite(r.servings)||r.servings<1||r.servings>1000))throw Error('Неверное количество порций.');
  if(r.time!=null&&(!Number.isFinite(r.time)||r.time<0||r.time>10000))throw Error('Неверное время приготовления.');
  const a=core.analyze(r);
  if(a.errors.length||a.unused.length||a.looseOutputs.length!==1)throw Error('Проверьте связи этапов: '+r.name);
 }
 return data;
}
async function load(fetcher){
 const response=await fetcher('./recipes.json',{cache:'no-store'});
 if(!response.ok)throw Error('Не удалось загрузить коллекцию.');
 return validate(await response.json());
}
const api={validate,load};if(typeof module!=='undefined')module.exports=api;else root.RecipeCollection=api;
})(globalThis);
