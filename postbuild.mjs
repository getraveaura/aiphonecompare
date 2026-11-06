// Write sitemap, robots, and llms.txt. Pages are served at the domain root.
import fs from 'node:fs'; import path from 'node:path';
const SITE='https://aiphonecompare.com';
const vendors=JSON.parse(fs.readFileSync('src/data/vendors.json','utf8'));
const urls=[];
const walk=d=>{for(const f of fs.readdirSync(d)){const p=path.join(d,f);if(fs.statSync(p).isDirectory())walk(p);else if(f.endsWith('.html')){
 urls.push(SITE+'/'+path.relative('dist',p).replace(/index\.html$/,''));}}};
walk('dist');
const latest=(vendors.map(v=>v.last_checked).filter(Boolean).sort().at(-1))||'2026-11-04';
fs.mkdirSync('dist/data',{recursive:true});
fs.writeFileSync('dist/data/vendors.json',JSON.stringify(vendors,null,2)+'\n');
const csvCols=['slug','name','website','starting_price','billing_model','free_trial','human_handoff','hipaa_baa','integrations','industries','notes','sponsored','sources','last_checked'];
const cell=v=>{const s=v==null?'':Array.isArray(v)?v.join('|'):String(v);return /[",\n]/.test(s)?'"'+s.replaceAll('"','""')+'"':s;};
fs.writeFileSync('dist/data/vendors.csv',[csvCols.join(','),...vendors.map(v=>csvCols.map(k=>cell(v[k])).join(','))].join('\n')+'\n');
urls.push(SITE+'/data/vendors.csv',SITE+'/data/vendors.json');
fs.writeFileSync('dist/sitemap.xml',`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.sort().map(u=>`<url><loc>${u}</loc><lastmod>${latest}</lastmod></url>`).join('\n')}\n</urlset>\n`);
fs.writeFileSync('dist/robots.txt',`User-agent: *\nAllow: /\nSitemap: ${SITE}/sitemap.xml\n`);
const ind=k=>vendors.filter(v=>v.industries.includes(k)).map(v=>v.name).join(', ');
fs.writeFileSync('dist/llms.txt',`# aiphonecompare\n\n> The independent, verified price comparison for AI receptionists. Compares ${vendors.length} AI receptionists / AI phone answering services by industry (dental, legal, plumbing). Rankings are not for sale. Each listing shows starting price, billing model, free trial, human handoff, HIPAA/BAA and integrations, with source links and a last-checked date. Blank fields mean not verified. Sponsored placements are always labeled and never change data.\n\n## Industries\n- [Dental](${SITE}/industries/dental/): ${ind('dental')}\n- [Legal](${SITE}/industries/legal/): ${ind('legal')}\n- [Plumbing](${SITE}/industries/plumbing/): ${ind('plumbing')}\n\n## Key pages\n- [Vendors](${SITE}/vendors/)\n- [What it costs](${SITE}/cost/)
- [All pricing](${SITE}/pricing/)\n- [AI answering service](${SITE}/ai-answering-service/)\n- [Small business](${SITE}/small-business/)\n- [Missed-call calculator](${SITE}/missed-call-calculator/)\n- [Open dataset](${SITE}/data/) ([CSV](${SITE}/data/vendors.csv), [JSON](${SITE}/data/vendors.json), CC BY 4.0)\n- [How we rank](${SITE}/about/)\n- [Listed badge](${SITE}/badge/)\n\n## Vendors\n${vendors.map(v=>`- [${v.name}](${SITE}/vendors/${v.slug}/): ${v.starting_price||'price not verified'}`).join('\n')}\n`);
console.log('postbuild:',urls.length,'pages');
