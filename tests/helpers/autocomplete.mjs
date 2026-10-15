import {readFileSync} from 'node:fs';
export function loadAutocomplete(file='../../app.js'){
 const source=readFileSync(new URL(file,import.meta.url),'utf8');
 const start=source.indexOf('function cityNormalize(');
 const end=source.indexOf('function bindCity(',start);
 return new Function(source.slice(start,end)+';return {rankCities,cityNormalize,cityDistance,cityPrefixDistance,citySearchRecords}')();
}
export const cities=JSON.parse(readFileSync(new URL('../../cities.json',import.meta.url),'utf8'));
