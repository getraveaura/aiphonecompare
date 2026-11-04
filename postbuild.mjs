// Prefix root-relative links with the Pages base, and write sitemap/robots/llms.txt.
import fs from 'node:fs'; import path from 'node:path';
const BASE='/aiphonecompare', SITE='https://getraveaura.github.io'+BASE;
const vendors=JSON.parse(fs.readFileSync('src/data/vendors.json','utf8'));
const urls=[];
const walk=d=>{for(const f of fs.readdirSync(d)){const p=path.join(d,f);if(fs.statSync(p).isDirectory())walk(p);else if(f.endsWith('.html')){
 let h=fs.readFileSync(p,'utf8');h=h.replace(/(href|src)="\/(?!\/|aiphonecompare\/)/g,`$1="${BASE}/`);fs.writeFileSync(p,h);
 urls.push(SITE+'/'+path.relative('dist',p).replace(/index\.html$/,''));}}};
walk('dist');
fs.writeFileSync('dist/sitemap.xml',`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.sort().map(u=>`<url><loc>${u}</loc><lastmod>2026-11-04</lastmod></url>`).join('\n')}\n</urlset>\n`);
fs.writeFileSync('dist/robots.txt',`User-agent: *\nAllow: /\nSitemap: ${SITE}/sitemap.xml\n`);
const ind=k=>vendors.filter(v=>v.industries.includes(k)).map(v=>v.name).join(', ');
fs.writeFileSync('dist/llms.txt',`# aiphonecompare\n\n> Independent directory comparing ${vendors.length} AI receptionists / AI phone answering services by industry (dental, legal, plumbing). Each listing shows starting price, billing model, free trial, human handoff, HIPAA/BAA and integrations, with source links and a last-checked date. Blank fields mean not verified. Sponsored placements are always labeled and never change data.\n\n## Industries\n- [Dental](${SITE}/industries/dental/): ${ind('dental')}\n- [Legal](${SITE}/industries/legal/): ${ind('legal')}\n- [Plumbing](${SITE}/industries/plumbing/): ${ind('plumbing')}\n\n## Key pages\n- [All pricing](${SITE}/pricing/)\n- [How we rank](${SITE}/about/)\n\n## Vendors\n${vendors.map(v=>`- [${v.name}](${SITE}/vendors/${v.slug}/): ${v.starting_price||'price not verified'}`).join('\n')}\n`);
console.log('postbuild:',urls.length,'pages');
