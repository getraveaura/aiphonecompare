// Write sitemap, robots, llms.txt, and the stories feed. Pages are served at the domain root.
import fs from 'node:fs'; import path from 'node:path';
import { renderFeed } from './src/lib/feed.mjs';
import { getLandings } from './src/lib/landings.mjs';
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
const stories=JSON.parse(fs.readFileSync('src/data/stories.json','utf8'));
const priceLog=JSON.parse(fs.readFileSync('src/data/price-changes.json','utf8'));
const updated=new Date().toISOString().slice(0,10);
fs.writeFileSync('dist/feed.xml',renderFeed({stories,changes:priceLog,site:SITE,updated}));
const ind=k=>vendors.filter(v=>v.industries.includes(k)).map(v=>v.name).join(', ');
const mdCell=md=>String(md??'').replace(/\|/g,'/').replace(/\s+/g,' ').trim();
const priceCell=v=>mdCell(v.starting_price)||'not published';
const baaCell=v=>mdCell(v.hipaa_baa)||'not stated';
fs.writeFileSync('dist/llms.txt',`# aiphonecompare\n\n> The independent, verified price comparison for AI receptionists. Compares ${vendors.length} AI receptionists / AI phone answering services by industry (dental, legal, plumbing, medical). Rankings are not for sale. Each listing shows starting price, billing model, free trial, human handoff, HIPAA/BAA and integrations, with source links and a last-checked date. Blank fields mean not verified. Sponsored placements are always labeled and never change data.\n\n## Industries\n- [Dental](${SITE}/industries/dental/): ${ind('dental')}\n- [Legal](${SITE}/industries/legal/): ${ind('legal')}\n- [Plumbing](${SITE}/industries/plumbing/): ${ind('plumbing')}\n- [Medical](${SITE}/industries/medical/): ${ind('medical')}\n\n## Key pages\n- [What it costs](${SITE}/cost/)\n- [All pricing](${SITE}/pricing/)\n- [AI answering service](${SITE}/ai-answering-service/)\n- [Small business](${SITE}/small-business/)\n- [Medical practices](${SITE}/industries/medical/)\n- [Call recording consent by state](${SITE}/call-recording-consent-by-state/)\n- [Missed-call calculator](${SITE}/missed-call-calculator/)\n- [Vendors](${SITE}/vendors/)\n- [Real stories](${SITE}/stories/)\n- [Price changes](${SITE}/price-changes/)\n- [Match a tool](${SITE}/match/)
${getLandings().map((page) => `- [${page.h1}](${SITE}${page.path})`).join('\n')}\n- [Stories and price feed](${SITE}/feed.xml)\n- [Full pricing table](${SITE}/llms-full.txt)\n- [Open dataset](${SITE}/data/) ([CSV](${SITE}/data/vendors.csv), [JSON](${SITE}/data/vendors.json), CC BY 4.0)\n- [How we rank](${SITE}/about/)\n- [Listed badge](${SITE}/badge/)\n\n## Vendors\n${vendors.map(v=>`- [${v.name}](${SITE}/vendors/${v.slug}/): ${v.starting_price||'price not verified'}`).join('\n')}\n`);
const tableRows=vendors.map(v=>`| ${mdCell(v.name)} | ${priceCell(v)} | ${mdCell(v.billing_model)||'not published'} | ${baaCell(v)} | ${mdCell((v.industries||[]).join(', '))} | ${mdCell(v.last_checked)} | ${mdCell((v.sources||[])[0])} |`).join('\n');
fs.writeFileSync('dist/llms-full.txt',`# aiphonecompare pricing table\n\n> Independent directory of ${vendors.length} AI receptionists. Rankings are not for sale. Sponsored spots are labeled on the site and do not change this table. A blank in the product data is written here as "not published" or "not stated". Every price is the text recorded from the vendor's own page or a cited source, with the source URL and the date it was checked. This file is generated from src/data/vendors.json.\n\nChecked through ${latest}.\n\n## Pages\n- ${SITE}/industries/medical/\n- ${SITE}/industries/dental/\n- ${SITE}/industries/legal/\n- ${SITE}/industries/plumbing/\n- ${SITE}/call-recording-consent-by-state/\n- ${SITE}/pricing/\n- ${SITE}/data/\n- ${SITE}/stories/\n- ${SITE}/price-changes/\n- ${SITE}/match/\n- ${SITE}/vendors/\n${getLandings().map((page) => `- ${SITE}${page.path}`).join('\n')}\n\n## Stories\n\nSourced accounts. A blank cost or catch in the product data is "not stated" on the page. Vendor-published pieces are labeled on the page.\n\n${stories.map(s=>`- [${s.title}](${SITE}/stories/${s.slug}/) (${(s.sources&&s.sources[0]&&s.sources[0].date)||s.added}): ${s.sourceLabel}`).join('\n')}\n\n## Price changes\n\nTracking started ${priceLog.trackingStarted}. ${priceLog.changes.length} logged change${priceLog.changes.length===1?'':'s'}.\n\n${priceLog.changes.map(c=>`- [${c.vendorSlug}](${SITE}/price-changes/${c.id}/) observed ${c.observed}`).join('\n')}\n\n## Verified pricing\n\n| Vendor | Starting price | Billing | HIPAA / BAA | Industries | Last checked | Source |\n| --- | --- | --- | --- | --- | --- | --- |\n${tableRows}\n`);
urls.push(SITE+'/data/vendors.csv',SITE+'/data/vendors.json',SITE+'/llms.txt',SITE+'/llms-full.txt',SITE+'/feed.xml');
fs.writeFileSync('dist/sitemap.xml',`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.sort().map(u=>`<url><loc>${u}</loc><lastmod>${latest}</lastmod></url>`).join('\n')}\n</urlset>\n`);
const bots=['GPTBot','OAI-SearchBot','ChatGPT-User','PerplexityBot','ClaudeBot','Google-Extended','Bingbot'];
fs.writeFileSync('dist/robots.txt',`User-agent: *\nAllow: /\n\n${bots.map(b=>`User-agent: ${b}\nAllow: /\n`).join('\n')}\nSitemap: ${SITE}/sitemap.xml\n`);
const keyFile=fs.readdirSync('public').find(f=>/^[a-f0-9]{16,128}\.txt$/.test(f));
if(keyFile){
  const key=fs.readFileSync(path.join('public',keyFile),'utf8').trim();
  fs.writeFileSync('indexnow-payload.json',JSON.stringify({host:'aiphonecompare.com',key,keyLocation:`${SITE}/${key}.txt`,urlList:urls},null,2)+'\n');
}
console.log('postbuild:',urls.length,'pages');
